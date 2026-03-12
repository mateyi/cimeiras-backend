// src/middleware/validate.js
// Wrapper genérico que valida req.body contra un schema Joi.
// Si hay error devuelve 400 con la lista de problemas.
// Si pasa, reemplaza req.body con el valor limpio (sin campos extra).

const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly:   false,  // reporta TODOS los errores, no solo el primero
    stripUnknown: true,   // elimina campos que no están en el schema
  });

  if (error) {
    return res.status(400).json({
      error:   'Error de validación',
      details: error.details.map((d) => d.message),
    });
  }

  req.body = value;  // req.body queda limpio y tipado
  next();
};

// ── Schemas ─────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string()
    .min(2).max(100)
    .required()
    .messages({
      'string.min':   'El nombre debe tener al menos 2 caracteres',
      'any.required': 'El nombre es requerido',
    }),

  email: Joi.string()
    .email()
    .lowercase()   // normaliza a minúsculas antes de guardar
    .required()
    .messages({ 'any.required': 'El email es requerido' }),

  password: Joi.string()
    .min(6).max(100)
    .required()
    .messages({
      'string.min':   'La contraseña debe tener al menos 6 caracteres',
      'any.required': 'La contraseña es requerida',
    }),

  phone: Joi.string().max(30).optional().allow('', null),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
};