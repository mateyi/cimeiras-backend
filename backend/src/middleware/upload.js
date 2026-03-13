// src/middleware/upload.js
// Configuración de Multer para subida de imágenes de productos.
// Guarda los archivos en /uploads con un nombre único.

const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');  // módulo nativo de Node, no necesita instalación

// ── Dónde y cómo guardar los archivos ───────────────────────
const storage = multer.diskStorage({

  // Carpeta destino: /uploads en la raíz del proyecto
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },

  // Nombre del archivo: timestamp + 8 bytes random + extensión original
  // Ejemplo: 1710000000000-a3f8c2d1.jpg
  // Nunca dos archivos van a tener el mismo nombre
  filename: (_req, file, cb) => {
    const randomPart = crypto.randomBytes(8).toString('hex');
    const ext        = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomPart}${ext}`);
  },
});

// ── Filtro: solo imágenes ────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);   // aceptar el archivo
  } else {
    cb(new Error('Formato no permitido. Solo se aceptan JPEG, PNG y WebP'), false);
  }
};

// ── Instancia de Multer ──────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // máximo 5MB por archivo
  },
});

module.exports = upload;