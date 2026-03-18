// src/controllers/reservationController.js
// Sistema de reservas de stock con timer de 10 minutos.
// Cuando el usuario confirma el carrito, se reserva el stock.
// Si no paga en 10 minutos, el stock se libera automáticamente.

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ════════════════════════════════════════════════════════════
//  POST /api/reservations
//  Reserva el stock de los productos del carrito por 10 min.
//  Body: { items: [{ product_id, quantity, size? }] }
//  Devuelve: { session_id, expires_at, items }
//  El frontend guarda el session_id y lo usa al hacer checkout.
// ════════════════════════════════════════════════════════════
const createReservation = async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe enviar al menos un producto' });
  }

  const sessionId = uuidv4(); // ID único para esta sesión de compra
  const client    = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Primero liberar reservas vencidas de todos los usuarios
    // (aprovechamos cada request para hacer limpieza)
    await client.query(`
      UPDATE products p
      SET stock = stock + r.quantity
      FROM reservations r
      WHERE r.product_id = p.id
        AND r.expires_at < NOW()
    `);
    await client.query(`DELETE FROM reservations WHERE expires_at < NOW()`);

    const reservedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Datos de item inválidos' });
      }

      // Verificar stock disponible (con bloqueo)
      const { rows } = await client.query(
        `SELECT id, name, stock, price
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

      // Descontar stock temporalmente
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );

      // Crear la reserva con expiración en 10 minutos
      const { rows: resRows } = await client.query(
        `INSERT INTO reservations
           (product_id, quantity, size, session_id, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')
         RETURNING *`,
        [item.product_id, item.quantity, item.size || null, sessionId]
      );

      reservedItems.push({
        ...resRows[0],
        product_name:  product.name,
        unit_price:    product.price,
      });
    }

    await client.query('COMMIT');

    // Calcular cuándo expira (10 minutos desde ahora)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return res.status(201).json({
      session_id: sessionId,
      expires_at: expiresAt,
      message:    'Stock reservado por 10 minutos. Completá tu compra antes de que expire.',
      items:      reservedItems,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createReservation]', err.message);
    return res.status(500).json({ error: 'Error al crear la reserva' });
  } finally {
    client.release();
  }
};


// ════════════════════════════════════════════════════════════
//  DELETE /api/reservations/:sessionId
//  El usuario cancela la reserva (salió del checkout).
//  Devuelve el stock inmediatamente.
// ════════════════════════════════════════════════════════════
const cancelReservation = async (req, res) => {
  const { sessionId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Obtener las reservas de esta sesión
    const { rows: reservations } = await client.query(
      `SELECT product_id, quantity FROM reservations WHERE session_id = $1`,
      [sessionId]
    );

    if (!reservations.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reserva no encontrada o ya expiró' });
    }

    // Devolver el stock
    for (const r of reservations) {
      await client.query(
        `UPDATE products SET stock = stock + $1 WHERE id = $2`,
        [r.quantity, r.product_id]
      );
    }

    // Eliminar las reservas
    await client.query(
      `DELETE FROM reservations WHERE session_id = $1`,
      [sessionId]
    );

    await client.query('COMMIT');

    return res.json({ message: 'Reserva cancelada. Stock restituido.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[cancelReservation]', err.message);
    return res.status(500).json({ error: 'Error al cancelar la reserva' });
  } finally {
    client.release();
  }
};


// ════════════════════════════════════════════════════════════
//  GET /api/reservations/:sessionId
//  Verifica si una reserva sigue vigente y cuánto tiempo queda.
// ════════════════════════════════════════════════════════════
const getReservation = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT r.*, p.name AS product_name, p.price AS unit_price
       FROM   reservations r
       JOIN   products p ON p.id = r.product_id
       WHERE  r.session_id = $1
         AND  r.expires_at > NOW()`,
      [sessionId]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'La reserva expiró o no existe. Volvé al carrito para reiniciar.',
      });
    }

    const expiresAt      = new Date(rows[0].expires_at);
    const secondsLeft    = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

    return res.json({
      session_id:   sessionId,
      expires_at:   expiresAt,
      seconds_left: secondsLeft,
      items:        rows,
    });

  } catch (err) {
    console.error('[getReservation]', err.message);
    return res.status(500).json({ error: 'Error al verificar la reserva' });
  }
};


// ════════════════════════════════════════════════════════════
//  Job interno: liberar reservas vencidas
//  Se llama desde server.js con setInterval cada 60 segundos.
//  No es un endpoint HTTP.
// ════════════════════════════════════════════════════════════
const releaseExpiredReservations = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Devolver stock de reservas vencidas
    const { rowCount } = await client.query(`
      UPDATE products p
      SET stock = stock + r.quantity
      FROM reservations r
      WHERE r.product_id = p.id
        AND r.expires_at < NOW()
    `);

    // Eliminar las reservas vencidas
    await client.query(`DELETE FROM reservations WHERE expires_at < NOW()`);

    await client.query('COMMIT');

    if (rowCount > 0) {
      console.log(`[reservations] ${rowCount} reservas vencidas liberadas`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[releaseExpiredReservations]', err.message);
  } finally {
    client.release();
  }
};


module.exports = {
  createReservation,
  cancelReservation,
  getReservation,
  releaseExpiredReservations,
};