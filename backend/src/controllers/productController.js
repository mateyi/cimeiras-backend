// src/controllers/productController.js

const db = require('../config/db');

// ════════════════════════════════════════════════════════════
//  GET /api/products
//  Público. Soporta filtros por query params:
//  ?category=leggings&featured=true&search=pro&minPrice=1000
//  &maxPrice=9000&page=1&limit=12
// ════════════════════════════════════════════════════════════
const getAllProducts = async (req, res) => {
  const {
    category,
    featured,
    search,
    minPrice,
    maxPrice,
    page  = '1',
    limit = '12',
  } = req.query;

  // Construimos WHERE dinámicamente para evitar SQL injection
  const conditions = ['active = TRUE'];
  const params     = [];
  let   idx        = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category.toLowerCase());
  }
  if (featured === 'true') {
    conditions.push(`featured = $${idx++}`);
    params.push(true);
  }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (minPrice) {
    conditions.push(`price >= $${idx++}`);
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    conditions.push(`price <= $${idx++}`);
    params.push(parseFloat(maxPrice));
  }

  const where  = `WHERE ${conditions.join(' AND ')}`;
  const pageN  = Math.max(1, parseInt(page));
  const limitN = Math.min(50, parseInt(limit));
  const offset = (pageN - 1) * limitN;

  try {
    // Conteo total para la paginación
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM products ${where}`,
      params
    );
    const total = parseInt(countRows[0].count);

    // Productos de la página actual
    const { rows: products } = await db.query(
      `SELECT id, name, description, price, category,
              stock, image_url, sizes, featured, created_at
       FROM   products
       ${where}
       ORDER  BY created_at DESC
       LIMIT  $${idx} OFFSET $${idx + 1}`,
      [...params, limitN, offset]
    );

    return res.json({
      products,
      pagination: {
        page:  pageN,
        limit: limitN,
        total,
        pages: Math.ceil(total / limitN),
      },
    });

  } catch (err) {
    console.error('[getAllProducts]', err.message);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};


// ════════════════════════════════════════════════════════════
//  GET /api/products/:id
//  Público.
// ════════════════════════════════════════════════════════════
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT id, name, description, price, category,
              stock, image_url, sizes, featured, active, created_at
       FROM   products
       WHERE  id = $1 AND active = TRUE`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error('[getProductById]', err.message);
    return res.status(500).json({ error: 'Error al obtener el producto' });
  }
};


// ════════════════════════════════════════════════════════════
//  POST /api/products
//  Solo admin. Body: { name, description, price, category,
//                      stock, sizes?, featured?, image_url? }
// ════════════════════════════════════════════════════════════
const createProduct = async (req, res) => {
  const {
    name, description, price, category,
    stock, sizes, featured, image_url,
  } = req.body;

  // Validación manual básica (en el siguiente paso agregaremos Joi)
  if (!name || !price || !category || stock === undefined) {
    return res.status(400).json({
      error: 'Faltan campos requeridos: name, price, category, stock',
    });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO products
         (name, description, price, category, stock, sizes, featured, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        description   || null,
        parseFloat(price),
        category.toLowerCase(),
        parseInt(stock),
        sizes         || [],
        featured      || false,
        image_url     || null,
      ]
    );

    return res.status(201).json(rows[0]);

  } catch (err) {
    console.error('[createProduct]', err.message);
    return res.status(500).json({ error: 'Error al crear el producto' });
  }
};


// ════════════════════════════════════════════════════════════
//  PATCH /api/products/:id
//  Solo admin. Solo actualiza los campos que se envíen.
// ════════════════════════════════════════════════════════════
const updateProduct = async (req, res) => {
  const { id } = req.params;

  // Campos que se pueden actualizar
  const allowed = [
    'name', 'description', 'price', 'category',
    'stock', 'sizes', 'featured', 'active', 'image_url',
  ];

  const updates = [];
  const values  = [];
  let   idx     = 1;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      // Normalizar categoría a minúsculas
      values.push(field === 'category'
        ? req.body[field].toLowerCase()
        : req.body[field]
      );
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
  }

  values.push(id); // último parámetro para el WHERE

  try {
    const { rows } = await db.query(
      `UPDATE products
       SET    ${updates.join(', ')}
       WHERE  id = $${idx}
       RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error('[updateProduct]', err.message);
    return res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};


// ════════════════════════════════════════════════════════════
//  DELETE /api/products/:id
//  Solo admin. Soft delete: pone active = FALSE.
//  No borra físicamente para no romper el historial de órdenes.
// ════════════════════════════════════════════════════════════
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      `UPDATE products
       SET    active = FALSE
       WHERE  id = $1
       RETURNING id, name`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({
      message: `Producto "${rows[0].name}" desactivado correctamente`,
    });

  } catch (err) {
    console.error('[deleteProduct]', err.message);
    return res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};

  // ════════════════════════════════════════════════════════════
//  PATCH /api/products/:id/image
//  Solo admin. Recibe multipart/form-data con campo "image".
//  Guarda el archivo en /uploads y actualiza image_url en la DB.
// ════════════════════════════════════════════════════════════
const uploadProductImage = async (req, res) => {
  const { id } = req.params;

  // Multer ya procesó el archivo y lo guardó en /uploads
  // req.file contiene la info del archivo subido
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  // Construimos la URL pública de la imagen
  // Ejemplo: http://localhost:3000/uploads/1710000000000-a3f8c2d1.jpg
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  try {
    const { rows } = await db.query(
      `UPDATE products
       SET    image_url = $1
       WHERE  id = $2
       RETURNING id, name, image_url`,
      [imageUrl, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({
      message:   'Imagen subida correctamente',
      product:   rows[0],
    });

  } catch (err) {
    console.error('[uploadProductImage]', err.message);
    return res.status(500).json({ error: 'Error al actualizar la imagen' });
  }
};

// ════════════════════════════════════════════════════════════
//  PATCH /api/products/:id/stock
//  Solo admin. Actualiza el stock de un producto.
//  Body: { stock: 100 }
//  Si stock llega a 0, el producto sigue activo pero
//  el frontend puede mostrar "SIN STOCK".
// ════════════════════════════════════════════════════════════
const updateStock = async (req, res) => {
  const { id }    = req.params;
  const { stock } = req.body;

  // Validación
  if (stock === undefined || stock === null) {
    return res.status(400).json({ error: 'El campo stock es requerido' });
  }

  const stockNum = parseInt(stock);

  if (isNaN(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'El stock debe ser un número mayor o igual a 0' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE products
       SET stock = $1
       WHERE id = $2
       RETURNING id, name, stock, active`,
      [stockNum, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const product = rows[0];

    // Mensaje informativo según el stock resultante
    const message = stockNum === 0
      ? `Stock de "${product.name}" actualizado. El producto aparecerá como SIN STOCK.`
      : `Stock de "${product.name}" actualizado a ${stockNum} unidades.`;

    return res.json({ message, product });

  } catch (err) {
    console.error('[updateStock]', err.message);
    return res.status(500).json({ error: 'Error al actualizar el stock' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  updateStock,
};