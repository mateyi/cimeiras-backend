// server.js
// Punto de entrada del servidor. Registra middlewares globales y rutas.

require("dotenv").config();   // carga .env ANTES que cualquier otra cosa

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const userRoutes = require('./routes/userRoutes');
// Próximos pasos — descomentaremos estas líneas cuando estén listas:
// const productRoutes = require('./src/routes/productRoutes');
// const orderRoutes   = require('./src/routes/orderRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet());   // agrega headers de seguridad HTTP

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting: máximo 100 requests cada 15 minutos por IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Demasiadas solicitudes, intentá más tarde.' },
}));

// Rate limiting más estricto para autenticación (evita fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Demasiados intentos, esperá 15 minutos.' },
});

// ── Parsing ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/users', authLimiter, userRoutes);
// app.use('/api/products', productRoutes);  // próximo paso
// app.use('/api/orders',   orderRoutes);    // próximo paso

// Health check — útil para verificar que el servidor responde
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date() })
);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ error: 'Endpoint no encontrado' })
);

// ── Manejo global de errores ─────────────────────────────────
// Captura cualquier error que se pase con next(err)
app.use((err, _req, res, _next) => {
  console.error('[ERROR GLOBAL]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

// ── Arranque ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏔️  Cimeiras API corriendo en http://localhost:${PORT}`);
  console.log(`   Modo: ${process.env.NODE_ENV || 'development'}\n`);
  console.log("JWT_SECRET: preta2014", process.env.JWT_SECRET);
});