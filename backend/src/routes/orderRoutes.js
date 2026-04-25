// src/routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const Joi     = require('joi');

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');

const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const orderSchema = Joi.object({
  customer_name:     Joi.string().min(2).max(150).required(),
  customer_email:    Joi.string().email().required(),
  shipping_street:   Joi.string().max(200).required(),
  shipping_city:     Joi.string().max(100).required(),
  shipping_province: Joi.string().max(100).required(),
  shipping_postal:   Joi.string().max(20).required(),
  shipping_country:  Joi.string().max(100).default('Argentina'),
  notes:             Joi.string().max(500).optional().allow('', null),
  payment_method:    Joi.string().valid('mercadopago','transferencia','efectivo').optional(),
  items: Joi.array().items(Joi.object({
    product_id: Joi.string().required(),
    quantity:   Joi.number().integer().min(1).max(99).required(),
    size:       Joi.string().max(10).optional().allow(null, ''),
  })).min(1).required(),
});

router.post('/',     optionalAuth, validate(orderSchema), createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.get('/',          authenticate, requireAdmin, getAllOrders);
router.get('/:id',       authenticate, getOrderById);
router.patch('/:id/status',  authenticate, requireAdmin, updateOrderStatus);
router.patch('/:id/cancel',  authenticate, cancelOrder);

module.exports = router;