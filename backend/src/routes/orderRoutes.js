// src/routes/orderRoutes.js

const express = require('express');
const router  = express.Router();

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');

const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// POST /api/orders (auth opcional)
router.post('/',
  optionalAuth,
  createOrder
);

// GET /api/orders/my-orders
// IMPORTANTE: tiene que ir ANTES de /:id
router.get('/my-orders',
  authenticate,
  getMyOrders
);

// GET /api/orders (admin)
router.get('/',
  authenticate,
  requireAdmin,
  getAllOrders
);

// GET /api/orders/:id
router.get('/:id',
  authenticate,
  getOrderById
);

// PATCH /api/orders/:id/status (admin)
router.patch('/:id/status',
  authenticate,
  requireAdmin,
  updateOrderStatus
);

// PATCH /api/orders/:id/cancel (usuario dueño o admin)
router.patch('/:id/cancel',
  authenticate,
  cancelOrder
);

module.exports = router;