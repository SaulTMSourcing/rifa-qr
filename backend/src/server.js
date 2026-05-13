// ============================================================
// backend/src/server.js
// ------------------------------------------------------------
// Servidor Express. En esta version inicial (Paso 2b) solo:
//  - Carga variables de entorno
//  - Configura middlewares basicos (CORS, JSON parser)
//  - Expone GET /api/health para verificar conectividad
//  - Verifica la conexion a MySQL antes de aceptar requests
// La logica de /api/registrar se agrega en el Paso 3.
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ------------------------------------------------------------
// Middlewares
// ------------------------------------------------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: false,
  })
);

app.use(express.json({ limit: '10kb' })); // Limite chico: el form es pequeno
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ------------------------------------------------------------
// Confianza en proxy
// ------------------------------------------------------------
// Necesario para que req.ip devuelva la IP real del cliente
// cuando el backend este detras del proxy de Hostinger.
// En desarrollo local no afecta.
// ------------------------------------------------------------
app.set('trust proxy', 1);

// ------------------------------------------------------------
// Rutas
// ------------------------------------------------------------

// GET /api/health
// Health check. Verifica que el servidor responde y que la
// base de datos esta accesible.
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      server: 'up',
      database: rows[0].ok === 1 ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/health] Error:', error.message);
    res.status(503).json({
      status: 'degraded',
      server: 'up',
      database: 'down',
      error: error.code || 'UNKNOWN',
    });
  }
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('[Error no manejado]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ------------------------------------------------------------
// Arranque del servidor
// ------------------------------------------------------------
async function start() {
  console.log('[Server] Verificando conexion a base de datos...');
  const dbOk = await testConnection();

  if (!dbOk) {
    console.error('[Server] No se pudo conectar a MySQL. Abortando.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Backend escuchando en http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
