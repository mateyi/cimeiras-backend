// src/controllers/userController.js
// Controladores de autenticación y perfil de usuario.

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// ── Helper: genera un JWT firmado ───────────────────────────
const generateToken = (userId) =>
  jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );


// ════════════════════════════════════════════════════════════
//  POST /api/users/register
//  Body: { name, email, password, phone? }
//  Respuesta: { user, token }
// ════════════════════════════════════════════════════════════
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  // req.body ya viene validado y limpio por el middleware validate()

  try {
    // 1) Verificar que el email no esté en uso
    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // 2) Hashear la contraseña
    //    12 rondas de salt: buen balance seguridad/velocidad en producción
    const password_hash = await bcrypt.hash(password, 12);

    // 3) Insertar el usuario en la base de datos
const { rows } = await db.query(
  `INSERT INTO users (name, email, password_hash)
   VALUES ($1, $2, $3)
   RETURNING id, name, email, created_at`,
  [name, email, password_hash]
);

    const user  = rows[0];
    const token = generateToken(user.id);

    // 201 Created con el usuario (sin password_hash) y el token
    return res.status(201).json({ user, token });

  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// ════════════════════════════════════════════════════════════
//  POST /api/users/login
//  Body: { email, password }
//  Respuesta: { user, token }
// ════════════════════════════════════════════════════════════
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1) Buscar usuario por email (necesitamos el hash para comparar)
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      // Respuesta genérica: no revelamos si el email existe o no
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // 2) Comparar contraseña con el hash almacenado
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3) Generar token
    const token = generateToken(user.id);

    // 4) Responder con el usuario sin exponer el hash
    const { password_hash: _omit, ...safeUser } = user;

    return res.json({ user: safeUser, token });

  } catch (err) {
     console.error('[login] ERROR COMPLETO:', err); 
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// ════════════════════════════════════════════════════════════
//  GET /api/users/me
//  Requiere: Bearer token (middleware authenticate)
//  Respuesta: { user }
// ════════════════════════════════════════════════════════════
const getMe = async (req, res) => {
  // req.user ya fue adjuntado por el middleware authenticate.
  // Solo hacemos un SELECT fresco para devolver datos actualizados.
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, role, phone, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ user: rows[0] });

  } catch (err) {
    console.error('[getMe]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


module.exports = { register, login, getMe };