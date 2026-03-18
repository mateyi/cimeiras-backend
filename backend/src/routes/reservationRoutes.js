// src/routes/reservationRoutes.js

const express = require('express');
const router  = express.Router();

const {
  createReservation,
  cancelReservation,
  getReservation,
} = require('../controllers/reservationController');

// POST /api/reservations — crear reserva
router.post('/', createReservation);

// GET /api/reservations/:sessionId — verificar estado
router.get('/:sessionId', getReservation);

// DELETE /api/reservations/:sessionId — cancelar reserva
router.delete('/:sessionId', cancelReservation);

module.exports = router;