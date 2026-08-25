// ============================================================
// frontend/src/services/api.test.js
// ------------------------------------------------------------
// Tests de la capa de comunicacion con el backend (api.js).
//
// Estrategia:
//   - Se mockea fetch global con vi.stubGlobal para no depender
//     de red ni de un backend corriendo.
//   - Helpers fabrican objetos Response falsos con la forma
//     minima que api.js consume: { ok, status, json() }.
//   - vi.unstubAllGlobals() en afterEach restaura el fetch real
//     y evita que un test contamine al siguiente.
//
// Cobertura:
//   - registrarParticipante: exito, errores de red, body no-JSON,
//     errores de negocio tipados, defaults del envelope y
//     contrato exacto de la llamada a fetch.
//   - healthCheck: true solo con status ok + database up; false
//     en cualquier otro caso, sin propagar excepciones.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registrarParticipante,
  healthCheck,
  NetworkError,
  ApiError,
} from './api.js';

// ------------------------------------------------------------
// Helpers para fabricar respuestas falsas
// ------------------------------------------------------------
// respuestaJson: simula una respuesta con body JSON valido.
// respuestaNoJson: simula una respuesta cuyo body no parsea
// como JSON (ej. HTML de un crash del servidor).
// ------------------------------------------------------------
function respuestaJson({ ok, status, body }) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function respuestaNoJson({ ok, status }) {
  return {
    ok,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
  };
}

// ------------------------------------------------------------
// capturarError: espera que la promesa rechace y devuelve el
// error lanzado, para poder hacer asserts sobre sus propiedades.
// Si la promesa resuelve, el test falla explicitamente.
// ------------------------------------------------------------
async function capturarError(promesa) {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba que la promesa rechazara, pero resolvio.');
}

// ------------------------------------------------------------
// Datos de registro de ejemplo (los strings de datos si pueden
// llevar acentos)
// ------------------------------------------------------------
const DATOS_VALIDOS = {
  nombre: 'María',
  apellido_pat: 'Pérez',
  apellido_mat: 'de la Torre',
  empresa: 'TMSourcing',
  puesto: 'Analista',
  telefono: '5512345678',
  correo: 'maria.perez@example.com',
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================
// registrarParticipante
// ============================================================
describe('registrarParticipante', () => {
  // ----------------------------------------------------------
  // Caso exito
  // ----------------------------------------------------------
  it('devuelve los campos exactos del contrato en exito 201', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 201,
        body: {
          ok: true,
          numeroRegistro: 42,
          nombreCompleto: 'Ana Sofía del Valle',
          esGanador: true,
          premio: 'Taza edición especial',
          mensaje: '¡Felicidades, ganaste!',
          // campo extra del backend que la capa NO debe propagar
          debugInterno: 'no-debe-salir',
        },
      })
    );

    const resultado = await registrarParticipante(DATOS_VALIDOS);

    // toEqual es estricto: verifica que solo salgan los campos del
    // contrato y con los valores exactos.
    expect(resultado).toEqual({
      numeroRegistro: 42,
      nombreCompleto: 'Ana Sofía del Valle',
      esGanador: true,
      premio: 'Taza edición especial',
      mensaje: '¡Felicidades, ganaste!',
    });
  });

  it('propaga el nombre YA NORMALIZADO por el backend', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 201,
        body: {
          ok: true,
          numeroRegistro: 7,
          nombreCompleto: 'Ana Sofía del Valle Ibarra',
          esGanador: false,
          premio: null,
          mensaje: 'Registro exitoso.',
        },
      })
    );

    // Lo que se escribio en el formulario, sin normalizar
    const resultado = await registrarParticipante({
      ...DATOS_VALIDOS,
      nombre_completo: 'ana sofía DEL VALLE ibarra',
    });

    // Manda el del servidor: es el que quedo en la base y el que va
    // a leer el personal del stand al entregar el premio.
    expect(resultado.nombreCompleto).toBe('Ana Sofía del Valle Ibarra');
  });

  it('propaga premio null cuando el participante no es ganador', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 201,
        body: {
          ok: true,
          numeroRegistro: 7,
          esGanador: false,
          premio: null,
          mensaje: 'Registro exitoso.',
        },
      })
    );

    const resultado = await registrarParticipante(DATOS_VALIDOS);

    expect(resultado.esGanador).toBe(false);
    expect(resultado.premio).toBeNull();
  });

  // ----------------------------------------------------------
  // Errores de red
  // ----------------------------------------------------------
  it('lanza NetworkError cuando fetch falla con TypeError de red', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe(
      'No se pudo contactar al servidor. Verifica tu conexion.'
    );
  });

  // ----------------------------------------------------------
  // Body no-JSON
  // ----------------------------------------------------------
  it('lanza ApiError tipo respuesta_invalida si el body no es JSON valido', async () => {
    fetch.mockResolvedValueOnce(respuestaNoJson({ ok: false, status: 500 }));

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.tipo).toBe('respuesta_invalida');
    expect(error.status).toBe(500);
    expect(error.message).toBe('El servidor devolvio una respuesta no valida.');
  });

  it('lanza respuesta_invalida incluso con status 200 si el body no parsea', async () => {
    // Caso raro: un proxy devuelve 200 con HTML en lugar de JSON
    fetch.mockResolvedValueOnce(respuestaNoJson({ ok: true, status: 200 }));

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('respuesta_invalida');
    expect(error.status).toBe(200);
  });

  // ----------------------------------------------------------
  // Errores de negocio tipados
  // ----------------------------------------------------------
  it('traduce 409 correo_duplicado a ApiError con tipo, campo y status', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: false,
        status: 409,
        body: {
          ok: false,
          error: 'correo_duplicado',
          campo: 'correo',
          mensaje: 'Este correo ya está registrado.',
        },
      })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('correo_duplicado');
    expect(error.campo).toBe('correo');
    expect(error.status).toBe(409);
    expect(error.message).toBe('Este correo ya está registrado.');
  });

  it('propaga el campo en un 400 datos_invalidos', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: false,
        status: 400,
        body: {
          ok: false,
          error: 'datos_invalidos',
          campo: 'telefono',
          mensaje: 'El telefono debe tener 10 digitos (formato Mexico).',
        },
      })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('datos_invalidos');
    expect(error.campo).toBe('telefono');
    expect(error.status).toBe(400);
  });

  it('traduce 429 rate_limit_exceeded a ApiError tipado', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: false,
        status: 429,
        body: {
          ok: false,
          error: 'rate_limit_exceeded',
          mensaje: 'Demasiados intentos. Espera un momento.',
        },
      })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('rate_limit_exceeded');
    expect(error.campo).toBeNull();
    expect(error.status).toBe(429);
  });

  // ----------------------------------------------------------
  // Edge cases del envelope { ok: ... }
  // ----------------------------------------------------------
  it('trata como error un response.ok true con body.ok false', async () => {
    // El exito exige AMBOS: HTTP ok y envelope ok === true
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 200,
        body: {
          ok: false,
          error: 'error_servidor',
          mensaje: 'Fallo interno al asignar numero.',
        },
      })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('error_servidor');
    expect(error.status).toBe(200);
  });

  it('trata como error un body exitoso sin la propiedad ok (envelope roto)', async () => {
    // body.ok === true es comparacion estricta: undefined no pasa
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 200,
        body: { numeroRegistro: 99, esGanador: false },
      })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    // Sin body.error ni body.mensaje aplican los defaults
    expect(error.tipo).toBe('error_desconocido');
    expect(error.status).toBe(200);
  });

  it('aplica defaults cuando el body de error no trae error/campo/mensaje', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({ ok: false, status: 500, body: { ok: false } })
    );

    const error = await capturarError(registrarParticipante(DATOS_VALIDOS));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.tipo).toBe('error_desconocido');
    expect(error.campo).toBeNull();
    expect(error.message).toBe('Ocurrio un error al procesar el registro.');
    expect(error.status).toBe(500);
  });

  // ----------------------------------------------------------
  // Contrato de la llamada a fetch
  // ----------------------------------------------------------
  it('llama a fetch con URL /api/registrar, POST, JSON header y body serializado', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 201,
        body: {
          ok: true,
          numeroRegistro: 1,
          esGanador: false,
          premio: null,
          mensaje: 'Registro exitoso.',
        },
      })
    );

    await registrarParticipante(DATOS_VALIDOS);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, opciones] = fetch.mock.calls[0];

    // No fijamos el host completo porque API_URL depende de
    // import.meta.env.VITE_API_URL; el contrato es el path.
    expect(url.endsWith('/api/registrar')).toBe(true);
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(opciones.body).toBe(JSON.stringify(DATOS_VALIDOS));
  });
});

// ============================================================
// healthCheck
// ============================================================
describe('healthCheck', () => {
  it('devuelve true con 200 y { status: ok, database: up }', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 200,
        body: { status: 'ok', database: 'up' },
      })
    );

    await expect(healthCheck()).resolves.toBe(true);
  });

  it('devuelve false con 200 pero database down', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 200,
        body: { status: 'ok', database: 'down' },
      })
    );

    await expect(healthCheck()).resolves.toBe(false);
  });

  it('devuelve false con body sin los campos esperados', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({ ok: true, status: 200, body: {} })
    );

    await expect(healthCheck()).resolves.toBe(false);
  });

  it('devuelve false si response.ok es false, sin intentar parsear el body', async () => {
    // json() lanzaria si se llamara: probamos que el corto
    // circuito de !response.ok evita tocar el body
    fetch.mockResolvedValueOnce(respuestaNoJson({ ok: false, status: 503 }));

    await expect(healthCheck()).resolves.toBe(false);
  });

  it('devuelve false si fetch lanza, sin propagar la excepcion', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(healthCheck()).resolves.toBe(false);
  });

  it('devuelve false si el body no es JSON valido', async () => {
    fetch.mockResolvedValueOnce(respuestaNoJson({ ok: true, status: 200 }));

    await expect(healthCheck()).resolves.toBe(false);
  });

  it('llama a fetch con URL terminada en /api/health y sin opciones', async () => {
    fetch.mockResolvedValueOnce(
      respuestaJson({
        ok: true,
        status: 200,
        body: { status: 'ok', database: 'up' },
      })
    );

    await healthCheck();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetch.mock.calls[0];
    expect(url.endsWith('/api/health')).toBe(true);
    // GET implicito: healthCheck no pasa segundo argumento
    expect(opciones).toBeUndefined();
  });
});
