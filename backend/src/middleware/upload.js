// src/middleware/upload.js
const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const randomPart = crypto.randomBytes(8).toString('hex');
    const ext        = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomPart}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts  = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan imágenes JPEG, PNG y WebP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;