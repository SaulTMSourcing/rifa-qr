// ============================================================
// backend/src/routes/registro.routes.js
// ------------------------------------------------------------
// Router del endpoint de registro.
//
// Aplica rate limiting ESPECIFICAMENTE a este endpoint, no a
// toda la app, porque:
//   - /api/health debe responder sin restriccion.
//   - El unico endpoint sensible a spam es /registrar.
//
// La ventana y el limite se leen de .env, asi se pueden ajustar
// para el dia del evento sin redeploy.
// ============================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registrarParticipante } from '../controllers/registroController.js';

const router = Router();

// ------------------------------------------------------------
// Rate limiter para POST /api/registrar
// ------------------------------------------------------------
// Defaults razonables para un evento:
//   - Ventana: 15 minutos
//   - Maximo: 20 requests por IP por ventana
// Esto permite que en una sala con WiFi compartido varias
// personas registren sin chocar, pero bloquea ataques automatizados.
// ------------------------------------------------------------
const registroLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 20,
  standardHeaders: true,  // devuelve RateLimit-* headers (estandar)
  legacyHeaders: false,   // omite X-RateLimit-* (deprecados)
  message: {
    ok: false,
    error: 'rate_limit_exceeded',
    mensaje:
      'Demasiados intentos desde esta IP. Espera unos minutos e intenta de nuevo.',
  },
});

// ------------------------------------------------------------
// POST /api/registrar
// ------------------------------------------------------------
router.post('/registrar', registroLimiter, registrarParticipante);

export default router;
