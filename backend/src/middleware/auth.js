// src/middleware/auth.js
// Middlewares de autenticación y autorización por roles.

const jwt = require('jsonwebtoken');
const db  = require('../config/db');


// ════════════════════════════════════════════════════════════
//  authenticate
//  Verifica el JWT del header Authorization.
//  Si es válido, adjunta req.user con los datos del usuario.
//  Uso: router.get('/ruta-protegida', authenticate, controlador)
// ════════════════════════════════════════════════════════════
const authenticate = async (req, res, next) => {
  // El header debe tener el formato: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifica firma y expiración del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca el usuario en la base de datos para tener datos frescos
    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = rows[0];  // disponible en el controlador como req.user
    next();

  } catch (err) {
    // JsonWebTokenError = token malformado
    // TokenExpiredError = token vencido
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token expiró, volvé a iniciar sesión' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};


// ════════════════════════════════════════════════════════════
//  requireAdmin
//  Se usa DESPUÉS de authenticate.
//  Bloquea el acceso si el usuario no tiene rol 'admin'.
//  Uso: router.post('/admin-only', authenticate, requireAdmin, controlador)
// ════════════════════════════════════════════════════════════
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado: se requiere rol administrador',
    });
  }
  next();
};


// ════════════════════════════════════════════════════════════
//  optionalAuth
//  Intenta autenticar pero NO falla si no hay token.
//  Útil para rutas públicas que se comportan diferente
//  cuando el usuario está logueado (ej: carrito de compras).
//  Uso: router.post('/orders', optionalAuth, controlador)
// ════════════════════════════════════════════════════════════
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();  // sin token → continúa sin req.user
  }

  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length > 0) {
      req.user = rows[0];
    }
  } catch {
    // Token inválido o expirado → ignoramos silenciosamente
  }

  next();
};


module.exports = { authenticate, requireAdmin, optionalAuth };