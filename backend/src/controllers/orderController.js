// src/controllers/orderController.js

const db = require('../config/db');

// ════════════════════════════════════════════════════════════
//  POST /api/orders
//  Auth: opcional (si está logueado se asocia la orden al usuario)
//  Body: {
//    customer_name, customer_email,
//    shipping_street, shipping_city, shipping_province,
//    shipping_postal, shipping_country?,
//    notes?,
//    items: [{ product_id, quantity, size? }]
//  }
// ════════════════════════════════════════════════════════════
const createOrder = async (req, res) => {
  const {
    customer_name, customer_email,
    shipping_street, shipping_city, shipping_province,
    shipping_postal, shipping_country,
    notes, items,
  } = req.body;

  // Validación básica
  if (!customer_name || !customer_email || !shipping_street ||
      !shipping_city || !shipping_province || !shipping_postal) {
    return res.status(400).json({ error: 'Faltan datos del cliente o del envío' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La orden debe tener al menos un producto' });
  }

  // Obtenemos una conexión dedicada del pool para usar transacción
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Verificar stock y calcular total ──────────────────
    let totalPrice = 0;
    const itemsConPrecio = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Cada item debe tener product_id y quantity mayor a 0',
        });
      }

      // FOR UPDATE bloquea la fila para evitar que otro request
      // compre el mismo stock al mismo tiempo (race condition)
      const { rows } = await client.query(
        `SELECT id, name, price, stock
         FROM   products
         WHERE  id = $1 AND active = TRUE
         FOR UPDATE`,
        [item.product_id]
      );

      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: `Producto no encontrado: ${item.product_id}`,
        });
      }

      const product = rows[0];

      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
        });
      }

      totalPrice += parseFloat(product.price) * item.quantity;
      itemsConPrecio.push({
        product_id: item.product_id,
        quantity:   item.quantity,
        size:       item.size || null,
        unit_price: product.price,
      });
    }

    // ── 2. Insertar la orden ─────────────────────────────────
    const userId = req.user?.id || null;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (user_id, total_price, customer_name, customer_email,
          shipping_street, shipping_city, shipping_province,
          shipping_postal, shipping_country, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        totalPrice,
        customer_name,
        customer_email,
        shipping_street,
        shipping_city,
        shipping_province,
        shipping_postal,
        shipping_country || 'Argentina',
        notes || null,
      ]
    );

    const order = orderRows[0];

    // ── 3. Insertar items y descontar stock ──────────────────
    const insertedItems = [];

    for (const item of itemsConPrecio) {
      // Insertar el item
      const { rows: itemRows } = await client.query(
        `INSERT INTO order_items
           (order_id, product_id, quantity, unit_price, size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.size]
      );

      insertedItems.push(itemRows[0]);

      // Descontar el stock del producto
      await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Si llegamos acá sin errores, confirmamos todo
    await client.query('COMMIT');

    return res.status(201).json({
      ...order,
      items: insertedItems,
    });

} catch (err) {
  await client.query('ROLLBACK');
  console.error('[createOrder]', err.message);
  return res.status(500).json({ error: err.message });  // ← muestra el error real
}
};


// ════════════════════════════════════════════════════════════
//  GET /api/orders/my-orders
//  Órdenes del usuario autenticado, con cantidad de items
// ════════════════════════════════════════════════════════════
const getMyOrders = async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  || '1'));
  const limit  = Math.min(50, parseInt(req.query.limit || '10'));
  const offset = (page - 1) * limit;

  try {
    const { rows } = await db.query(
      `SELECT o.id, o.status, o.total_price,
              o.customer_name, o.created_at,
              COUNT(oi.id) AS item_count
       FROM   orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE  o.user_id = $1
       GROUP  BY o.id
       ORDER  BY o.created_at DESC
       LIMIT  $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countRows[0].count);

    return res.json({
      orders: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('[getMyOrders]', err.message);
    return res.status(500).json({ error: 'Error al obtener tus órdenes' });
  }
};


// ════════════════════════════════════════════════════════════
//  GET /api/orders/:id
//  Detalle completo con items. Solo el dueño o un admin.
// ════════════════════════════════════════════════════════════
const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: orderRows } = await db.query(
      `SELECT o.*
       FROM   orders o
       WHERE  o.id = $1`,
      [id]
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = orderRows[0];

    // Solo el dueño de la orden o un admin puede verla
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Traer los items con nombre e imagen del producto
    const { rows: items } = await db.query(
      `SELECT oi.id, oi.quantity, oi.unit_price, oi.size,
              p.id AS product_id, p.name AS product_name, p.image_url
       FROM   order_items oi
       JOIN   products p ON p.id = oi.product_id
       WHERE  oi.order_id = $1`,
      [id]
    );

    return res.json({ ...order, items });

  } catch (err) {
    console.error('[getOrderById]', err.message);
    return res.status(500).json({ error: 'Error al obtener la orden' });
  }
};


// ════════════════════════════════════════════════════════════
//  GET /api/orders
//  Solo admin. Lista todas con filtro de estado y paginación.
// ════════════════════════════════════════════════════════════
const getAllOrders = async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const pageN  = Math.max(1, parseInt(page));
  const limitN = Math.min(100, parseInt(limit));
  const offset = (pageN - 1) * limitN;

  const conditions = [];
  const params     = [];
  let   idx        = 1;

  if (status) {
    conditions.push(`o.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await db.query(
      `SELECT o.id, o.status, o.total_price,
              o.customer_name, o.customer_email,
              o.created_at, COUNT(oi.id) AS item_count
       FROM   orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP  BY o.id
       ORDER  BY o.created_at DESC
       LIMIT  $${idx} OFFSET $${idx + 1}`,
      [...params, limitN, offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM orders o ${where}`,
      params
    );
    const total = parseInt(countRows[0].count);

    return res.json({
      orders: rows,
      pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) },
    });

  } catch (err) {
    console.error('[getAllOrders]', err.message);
    return res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
};


// ════════════════════════════════════════════════════════════
//  PATCH /api/orders/:id/status
//  Solo admin. Cambia el estado de una orden.
//  Estados válidos: pending → paid → processing → shipped → delivered
//                   cualquiera → cancelled
// ════════════════════════════════════════════════════════════
const updateOrderStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}`,
    });
  }

  try {
    const { rows } = await db.query(
      `UPDATE orders
       SET    status = $1
       WHERE  id = $2
       RETURNING id, status, customer_name, customer_email, updated_at`,
      [status, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error('[updateOrderStatus]', err.message);
    return res.status(500).json({ error: 'Error al actualizar el estado' });
  }
};

// ════════════════════════════════════════════════════════════
//  PATCH /api/orders/:id/cancel
//  El usuario cancela su propia orden.
//  Solo se puede cancelar si el estado es 'pending'.
//  Al cancelar se devuelve el stock a los productos.
// ════════════════════════════════════════════════════════════
const cancelOrder = async (req, res) => {
  const { id } = req.params;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscar la orden y bloquearla
    const { rows: orderRows } = await client.query(
      `SELECT id, user_id, status
       FROM   orders
       WHERE  id = $1
       FOR UPDATE`,
      [id]
    );

    if (!orderRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = orderRows[0];

    // 2. Verificar que el usuario sea el dueño de la orden
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tenés permiso para cancelar esta orden' });
    }

    // 3. Solo se puede cancelar si está en estado 'pending'
    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `No se puede cancelar una orden en estado "${order.status}". Solo se pueden cancelar órdenes pendientes.`,
      });
    }

    // 4. Obtener los items para devolver el stock
    const { rows: items } = await client.query(
      `SELECT product_id, quantity
       FROM   order_items
       WHERE  order_id = $1`,
      [id]
    );

    // 5. Devolver el stock a cada producto
    for (const item of items) {
      await client.query(
        `UPDATE products
         SET stock = stock + $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // 6. Cambiar el estado de la orden a 'cancelled'
    const { rows: updatedOrder } = await client.query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING id, status, customer_name, total_price, updated_at`,
      [id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Orden cancelada correctamente. El stock fue restituido.',
      order:   updatedOrder[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[cancelOrder]', err.message);
    return res.status(500).json({ error: 'Error al cancelar la orden' });

  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,   
  cancelOrder,   
};