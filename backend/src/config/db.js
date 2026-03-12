// src/config/db.js
// Pool de conexiones a PostgreSQL.
// Todo el proyecto importa este objeto para hacer queries.

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'cimeiras',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Límites del pool de conexiones
  max:                    10,
  idleTimeoutMillis:      30_000,
  connectionTimeoutMillis: 5_000,
});

// Verificamos la conexión al arrancar el servidor
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Error al conectar a PostgreSQL:', err.message);
    process.exit(1);   // no tiene sentido seguir sin DB
  }
  console.log('✅  PostgreSQL conectado');
  release();
});

// Exportamos un objeto con el método query listo para usar:
//   const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id])
const db = {
  query: (text, params) => pool.query(text, params),
  pool,  // exportamos el pool también para usar transacciones manuales
};

module.exports = db;