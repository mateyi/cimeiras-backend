// server.js
require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTE' : 'NO EXISTE');
console.log('NODE_ENV:', process.env.NODE_ENV);

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan    = require('morgan');
const winston   = require('winston');
const path      = require('path');
const fs        = require('fs');
const cookieParser = require('cookie-parser');

const userRoutes        = require('./routes/userRoutes');
const productRoutes     = require('./routes/productRoutes');
const orderRoutes       = require('./routes/orderRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

const { releaseExpiredReservations } = require('./controllers/reservationController');

const app  = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════
//  LOGGER — Winston
// ════════════════════════════════════════════════════════════
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
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize:  5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level:    'error',
      maxsize:  5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

app.locals.logger = logger;

// ════════════════════════════════════════════════════════════
//  SEGURIDAD
// ════════════════════════════════════════════════════════════
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Demasiadas solicitudes, intentá más tarde.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Demasiados intentos de login, esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ════════════════════════════════════════════════════════════
//  PARSING
// ════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// ════════════════════════════════════════════════════════════
//  LOGGING HTTP
// ════════════════════════════════════════════════════════════
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.http(message.trim()) },
  skip:   (req) => req.url === '/api/health',
}));

// ════════════════════════════════════════════════════════════
//  RUTAS
// ════════════════════════════════════════════════════════════
app.use('/api/users',        authLimiter, userRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/reservations', reservationRoutes);

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
// ════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
  logger.error({
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    url:     req.originalUrl,
    ip:      req.ip,
  });
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

  // Job: liberar reservas vencidas cada 60 segundos
  setInterval(releaseExpiredReservations, 60 * 1000);
  logger.info('⏱️  Job de reservas iniciado (cada 60 segundos)');
});