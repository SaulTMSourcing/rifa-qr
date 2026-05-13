// ============================================================
// backend/src/config/db.js
// ------------------------------------------------------------
// Configuracion del pool de conexiones a MySQL (Hostinger).
//
// Usamos mysql2/promise para tener una API basada en Promesas
// (compatible con async/await) en lugar de callbacks.
//
// Un POOL es preferible a una conexion unica porque:
//  - Reutiliza conexiones entre requests (mas eficiente).
//  - Maneja automaticamente reconexiones tras timeouts.
//  - Soporta concurrencia real (varias queries en paralelo).
// ============================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ------------------------------------------------------------
// Validacion de variables de entorno
// ------------------------------------------------------------
// Si falta alguna variable critica, fallamos rapido al arrancar
// en vez de descubrirlo en la primera query.
// ------------------------------------------------------------
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(
    '[DB] Faltan variables de entorno requeridas:',
    missingVars.join(', ')
  );
  console.error('[DB] Revisa el archivo backend/.env');
  process.exit(1);
}

// ------------------------------------------------------------
// Creacion del pool
// ------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Pool config
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,

  // Timeouts (importante para conexion remota a Hostinger)
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10000,

  // Manejo de tipos
  // Devuelve TINYINT(1) como boolean en vez de 0/1 numerico
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return field.string() === '1';
    }
    return next();
  },

  // Charset acorde al schema (utf8mb4 para soportar emojis y
  // caracteres latinos completos como acentos y enie)
  charset: 'utf8mb4',
});

// ------------------------------------------------------------
// testConnection()
// ------------------------------------------------------------
// Hace un ping a la base para verificar que las credenciales
// y la red funcionan. Se llama al arrancar el servidor para
// fallar temprano si hay problema de conexion.
// ------------------------------------------------------------
export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('[DB] Conexion exitosa a MySQL en', process.env.DB_HOST);
    console.log('[DB] Base de datos:', process.env.DB_NAME);
    return true;
  } catch (error) {
    console.error('[DB] Error al conectar a MySQL:');
    console.error('     ', error.code, '-', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('     Verifica DB_USER y DB_PASSWORD en .env');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('     Verifica DB_HOST y que tu IP este autorizada');
      console.error('     en el panel de Hostinger (MySQL Remoto).');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('     La base de datos', process.env.DB_NAME, 'no existe.');
    }
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// ------------------------------------------------------------
// Export por defecto: el pool listo para usarse con
// await pool.execute(sql, params)
// ------------------------------------------------------------
export default pool;
