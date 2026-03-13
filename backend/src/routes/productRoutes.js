// src/routes/productRoutes.js

const express = require('express');
const router  = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  updateStock,
} = require('../controllers/productController');

const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Rutas públicas ───────────────────────────────────────────

// GET /api/products
router.get('/', getAllProducts);

// GET /api/products/:id
router.get('/:id', getProductById);

// ── Rutas solo admin ─────────────────────────────────────────

// POST /api/products
router.post('/',
  authenticate,
  requireAdmin,
  createProduct
);

// PATCH /api/products/:id
router.patch('/:id',
  authenticate,
  requireAdmin,
  updateProduct
);

// PATCH /api/products/:id/image
router.patch('/:id/image',
  authenticate,
  requireAdmin,
  upload.single('image'),
  uploadProductImage
);

// PATCH /api/products/:id/stock
router.patch('/:id/stock',
  authenticate,
  requireAdmin,
  updateStock
);

// DELETE /api/products/:id (soft delete)
router.delete('/:id',
  authenticate,
  requireAdmin,
  deleteProduct
);

module.exports = router;