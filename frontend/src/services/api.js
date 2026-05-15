// ============================================================
// frontend/src/services/api.js
// ------------------------------------------------------------
// Capa de comunicacion con el backend.
//
// Razones para tener este modulo aislado:
//   - Un solo lugar donde se construyen URLs y headers.
//   - Manejo unificado de errores de red vs errores de negocio.
//   - Facil de mockear si en el futuro agregamos tests.
//   - Si cambia el backend (URL, autenticacion), un solo cambio.
//
// Tipos de error que esta capa diferencia:
//   - NetworkError: fetch fallo (sin internet, backend caido).
//   - ApiError: backend respondio pero con error de negocio.
//     Lleva propiedades { tipo, campo, mensaje, status }.
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ------------------------------------------------------------
// Clases de error tipadas
// ------------------------------------------------------------
// Distinguir entre fallo de red y error de negocio permite que
// la UI muestre mensajes y acciones distintas:
//   - NetworkError -> "Sin conexion. Reintentar."
//   - ApiError(correo_duplicado) -> highlight rojo en campo correo
//   - ApiError(rate_limit_exceeded) -> mensaje de "demasiados intentos"
// ------------------------------------------------------------
export class NetworkError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  constructor({ tipo, campo, mensaje, status }) {
    super(mensaje);
    this.name = 'ApiError';
    this.tipo = tipo;        // 'datos_invalidos' | 'correo_duplicado' | 'rate_limit_exceeded' | 'error_servidor'
    this.campo = campo;      // nombre del campo que fallo, si aplica
    this.status = status;    // HTTP status code
  }
}

// ============================================================
// registrarParticipante(datos)
// ------------------------------------------------------------
// Envia el registro al backend.
//
// Recibe: { nombre, apellido_pat, apellido_mat, empresa,
//           puesto, telefono, correo }
//
// Devuelve (caso exito): {
//   numeroRegistro: number,
//   esGanador: boolean,
//   premio: string | null,
//   mensaje: string
// }
//
// Lanza:
//   - NetworkError si no se pudo contactar al backend
//   - ApiError con detalles si el backend respondio con error
// ============================================================
export async function registrarParticipante(datos) {
  let response;

  // ------------------------------------------------------
  // Paso 1: intentar el fetch.
  // Capturar errores de red (sin internet, backend caido, CORS).
  // ------------------------------------------------------
  try {
    response = await fetch(`${API_URL}/api/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    });
  } catch (error) {
    // fetch() solo lanza en errores de red puros (TypeError).
    // No lanza en 400/500: para esos, response.ok es false pero
    // la promesa resuelve normalmente.
    throw new NetworkError(
      'No se pudo contactar al servidor. Verifica tu conexion.'
    );
  }

  // ------------------------------------------------------
  // Paso 2: parsear el body como JSON.
  // Si el backend respondio sin JSON valido (raro pero posible
  // si hay un crash que devuelve HTML), tratarlo como error.
  // ------------------------------------------------------
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError({
      tipo: 'respuesta_invalida',
      mensaje: 'El servidor devolvio una respuesta no valida.',
      status: response.status,
    });
  }

  // ------------------------------------------------------
  // Paso 3: distinguir exito vs error de negocio.
  // El backend siempre devuelve { ok: true/false, ... }
  // ------------------------------------------------------
  if (response.ok && body.ok === true) {
    return {
      numeroRegistro: body.numeroRegistro,
      esGanador: body.esGanador,
      premio: body.premio,
      mensaje: body.mensaje,
    };
  }

  // ------------------------------------------------------
  // Paso 4: error de negocio. Traducir a ApiError tipado.
  // ------------------------------------------------------
  throw new ApiError({
    tipo: body.error || 'error_desconocido',
    campo: body.campo || null,
    mensaje: body.mensaje || 'Ocurrio un error al procesar el registro.',
    status: response.status,
  });
}

// ============================================================
// healthCheck()
// ------------------------------------------------------------
// Util para verificar conectividad antes de mostrar el form.
// Si el backend esta caido, podemos avisar al usuario antes
// de que llene todo el formulario y se frustre.
// ============================================================
export async function healthCheck() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) return false;
    const body = await response.json();
    return body.status === 'ok' && body.database === 'up';
  } catch {
    return false;
  }
}
