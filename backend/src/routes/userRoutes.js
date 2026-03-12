// src/routes/userRoutes.js
// Define todos los endpoints del recurso /api/users.

console.log("userRoutes cargado");
const express = require('express');
const router  = express.Router();

const { register, login, getMe }       = require('../controllers/userController');
const { authenticate }                 = require('../middleware/auth');
const { validate, registerSchema,
        loginSchema }                  = require('../middleware/validate');

// ── Rutas públicas (no requieren token) ─────────────────────

// POST /api/users/register
// 1. validate() limpia y valida el body
// 2. register() crea el usuario y devuelve el JWT
router.post('/register',
  validate(registerSchema),
  register
);

// POST /api/users/login
router.post('/login',
  validate(loginSchema),
  login
);

// ── Rutas protegidas (requieren token) ──────────────────────

// GET /api/users/me
// 1. authenticate() verifica el JWT y adjunta req.user
// 2. getMe() devuelve los datos del usuario autenticado
router.get('/me',
  authenticate,
  getMe
);

module.exports = router;