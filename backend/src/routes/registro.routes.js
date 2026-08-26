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
// Configuracion del limite
// ------------------------------------------------------------
// SOBRE EL VALOR POR DEFECTO
//
// El limite es POR IP, y en una convencion todos los asistentes
// salen a internet por la misma IP publica del WiFi del recinto
// (NAT). Es decir: el limite no se reparte por persona, se consume
// entre TODAS juntas.
//
// Con el limite anterior de 20, el asistente numero 21 recibia 429
// y quedaba bloqueado 15 minutos, y de ahi en adelante nadie mas
// podia registrarse. Se verifico en pruebas: el bloqueo cae exacto
// en la peticion 21.
//
// Por eso el default es holgado. Frenar un bot importa menos que
// dejar fuera a la mitad de la sala: cada registro necesita ademas
// un correo unico, asi que el abuso masivo tampoco es trivial.
//
// Ajusta RATE_LIMIT_MAX en el .env segun la asistencia esperada.
// Una regla practica: al menos 2 veces el numero de asistentes.
// ------------------------------------------------------------
const MAX_POR_DEFECTO = 300;

function leerLimite() {
  const crudo = process.env.RATE_LIMIT_MAX;
  if (crudo === undefined || String(crudo).trim() === '') return MAX_POR_DEFECTO;
  const valor = Number(crudo);
  if (!Number.isFinite(valor) || valor < 0) {
    console.warn(
      '[RateLimit] RATE_LIMIT_MAX="' + crudo + '" no es un numero valido. ' +
      'Se usa el default de ' + MAX_POR_DEFECTO + '.'
    );
    return MAX_POR_DEFECTO;
  }
  return valor;
}

const MAX = leerLimite();
const VENTANA_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// RATE_LIMIT_MAX=0 desactiva el limite por completo.
// Es la salida de emergencia si el dia del evento resulta que el
// proxy no reenvia la IP real del cliente y TODO el trafico se ve
// como una sola IP: en ese escenario cualquier limite bloquea a
// todos por igual, y es preferible quedarse sin proteccion que sin
// registros.
const habilitado = MAX > 0;

// ------------------------------------------------------------
// Configuracion efectiva, para que server.js la muestre al
// arrancar. Conviene poder confirmarla de un vistazo el dia del
// evento, sin abrir el .env.
// ------------------------------------------------------------
export const configRateLimit = {
  habilitado,
  max: MAX,
  ventanaMinutos: Math.round(VENTANA_MS / 60000),
};

// ------------------------------------------------------------
// Ventana de registro
// ------------------------------------------------------------
// El sorteo se hace DESPUES de cerrar los registros, sobre la lista
// real de participantes. Por eso hace falta poder cerrar la puerta
// en un momento concreto: un registro que entre despues del sorteo
// no podria ganar nada y tampoco estaria en la lista de la que se
// sacaron los ganadores.
//
// Se cierra poniendo REGISTRO_ABIERTO=false en el panel y
// reiniciando la app. Se eligio un interruptor manual y no una
// fecha limite porque la hora de cierre es aproximada ("entre 2 y
// 4"), y conviene decidirla en el momento y no de antemano.
//
// Por defecto ABIERTO: si la variable no existe, la app funciona.
// Cerrar tiene que ser un acto deliberado.
// ------------------------------------------------------------
export const registroAbierto = () =>
  String(process.env.REGISTRO_ABIERTO ?? 'true').toLowerCase() !== 'false';

function exigirRegistroAbierto(req, res, next) {
  if (registroAbierto()) return next();

  return res.status(403).json({
    ok: false,
    error: 'registro_cerrado',
    mensaje:
      'El registro ya cerró. Los ganadores se anuncian en el stand 25.',
  });
}

const registroLimiter = habilitado
  ? rateLimit({
      windowMs: VENTANA_MS,
      max: MAX,
      standardHeaders: true, // devuelve RateLimit-* headers (estandar)
      legacyHeaders: false, // omite X-RateLimit-* (deprecados)
      message: {
        ok: false,
        error: 'rate_limit_exceeded',
        mensaje:
          'Demasiados intentos desde esta IP. Espera unos minutos e intenta de nuevo.',
      },
    })
  : (req, res, next) => next();

// ------------------------------------------------------------
// POST /api/registrar
// ------------------------------------------------------------
// El cierre se comprueba ANTES del rate limit: un intento cuando ya
// cerro no debe gastar cupo de nadie.
router.post('/registrar', exigirRegistroAbierto, registroLimiter, registrarParticipante);

export default router;
