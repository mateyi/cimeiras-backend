// server.js
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan    = require('morgan');
const winston   = require('winston');
const path      = require('path');
const fs        = require('fs');

const userRoutes    = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes   = require('./routes/orderRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════
//  LOGGER — Winston
//  Escribe logs en consola Y en archivos en /logs
// ════════════════════════════════════════════════════════════

// Crear carpeta /logs si no existe
const logsDir = path.join(__dirname, '..', 'logs'); 
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Todos los logs en combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize:  5 * 1024 * 1024,  // 5MB máximo por archivo
      maxFiles: 5,                 // guarda los últimos 5 archivos
    }),
    // Solo errores en error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level:    'error',
      maxsize:  5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// En desarrollo también mostramos en consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Exportamos el logger para usarlo en controllers si hace falta
app.locals.logger = logger;

// ════════════════════════════════════════════════════════════
//  SEGURIDAD
// ════════════════════════════════════════════════════════════

// Helmet: agrega headers de seguridad HTTP y oculta que usamos Express
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // necesario para servir imágenes
}));

// CORS: solo acepta requests del frontend configurado
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Rate limiting global
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Demasiadas solicitudes, intentá más tarde.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// Rate limiting estricto para autenticación (evita fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Demasiados intentos de login, esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ════════════════════════════════════════════════════════════
//  PARSING Y LÍMITES
// ════════════════════════════════════════════════════════════

// Limitar el tamaño del body a 10kb (evita payloads gigantes)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Servir imágenes estáticas
app.use('/uploads', express.static('uploads'));

// ════════════════════════════════════════════════════════════
//  HTTP REQUEST LOGGING — Morgan + Winston
//  Registra cada request con método, URL, status y tiempo
// ════════════════════════════════════════════════════════════
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    // Redirige los logs de Morgan a Winston
    write: (message) => logger.http(message.trim()),
  },
  // No loguear el health check para no ensuciar los logs
  skip: (req) => req.url === '/api/health',
}));

// ════════════════════════════════════════════════════════════
//  RUTAS
// ════════════════════════════════════════════════════════════
app.use('/api/users',    authLimiter, userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date() })
);

// ════════════════════════════════════════════════════════════
//  404
// ════════════════════════════════════════════════════════════
app.use((req, res) => {
  logger.warn(`404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ════════════════════════════════════════════════════════════
//  MANEJO GLOBAL DE ERRORES
//  Captura cualquier error que se pase con next(err)
// ════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
  // Log completo del error con stack trace
  logger.error({
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    url:     req.originalUrl,
    ip:      req.ip,
  });

  // En producción no exponemos detalles internos
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(err.status || 500).json({ error: message });
});

// ════════════════════════════════════════════════════════════
//  ARRANQUE
// ════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  logger.info(`🏔️  Cimeiras API corriendo en http://localhost:${PORT}`);
  logger.info(`   Modo: ${process.env.NODE_ENV || 'development'}`);
});