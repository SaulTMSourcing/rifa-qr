// ============================================================
// backend/src/controllers/registroController.test.js
// ------------------------------------------------------------
// Suite de tests del controller de registro (POST /api/registrar).
//
// Estrategia:
//   - Se mockea el pool de MySQL (config/db.js) con vi.mock para
//     no depender de una base real. La conexion falsa registra
//     cada llamada (beginTransaction, execute, commit, rollback,
//     release) y permite simular resultados y errores de BD.
//   - NO se mockea utils/normalizar.js: los tests pasan bodies
//     crudos reales y verifican que la normalizacion real fluye
//     hasta el INSERT (test de integracion parcial).
//
// Cobertura:
//   1. Registro exitoso NO ganador (201, commit, release)
//   2. Registro exitoso GANADOR (premio, dos UPDATEs, commit)
//   3. Body invalido (400, pool nunca tocado)
//   4. ER_DUP_ENTRY en INSERT (409, rollback, release)
//   5. Error inesperado de BD (500, rollback, release)
//   6. release() se llama SIEMPRE que hubo conexion
//   7. Garantia de concurrencia ADR-003: el SELECT de ganadores
//      usa FOR UPDATE y filtra reclamado = FALSE
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ------------------------------------------------------------
// Mock del modulo de BD.
// El controller hace `import pool from '../config/db.js'` y usa
// pool.getConnection(). Reemplazamos el modulo completo por un
// pool falso; asi tampoco corre la validacion de variables de
// entorno de db.js (que haria process.exit en el runner).
// ------------------------------------------------------------
vi.mock('../config/db.js', () => ({
  default: {
    getConnection: vi.fn(),
  },
  testConnection: vi.fn(),
}));

import pool from '../config/db.js';
import { registrarParticipante } from './registroController.js';

// ------------------------------------------------------------
// Helpers de dobles de prueba
// ------------------------------------------------------------

// Conexion falsa con la API que usa el controller. Por defecto
// todo resuelve; cada test ajusta execute segun el escenario.
function crearConexionFalsa() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue([[]]),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
}

// Request falso de Express: solo body e ip, que es lo que lee
// el controller.
function crearReqFalso(body, ip = '10.0.0.5') {
  return { body, ip };
}

// Response falso encadenable: res.status(...).json(...) registra
// lo llamado para poder asertar codigo y payload.
function crearResFalso() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

// Body crudo VALIDO tal como llegaria del formulario: con
// espacios extra, mayusculas inconsistentes y telefono con lada.
// La normalizacion real debe limpiarlo.
function bodyValido(extras = {}) {
  return {
    nombre: '  irving   alejandro ',
    apellido_pat: 'DE LA VEGA',
    apellido_mat: 'garcía',
    empresa: 'tmsourcing',
    puesto: 'desarrollador senior',
    telefono: '+52 (55) 1234-5678',
    correo: '  Irving.Vega@Example.COM ',
    acepto_privacidad: true,
    ...extras,
  };
}

// Configura execute para un flujo transaccional tipico:
//   INSERT participantes  -> resultadoInsert
//   SELECT numeros_ganadores -> filasGanador
//   UPDATEs -> ok generico
function programarExecute(conexion, { insertId = 42, filasGanador = [] } = {}) {
  conexion.execute.mockImplementation(async (sql) => {
    if (sql.includes('INSERT INTO participantes')) {
      return [{ insertId, affectedRows: 1 }];
    }
    if (sql.includes('FROM numeros_ganadores')) {
      return [filasGanador];
    }
    // UPDATEs y cualquier otra query
    return [{ affectedRows: 1 }];
  });
}

// Extrae las llamadas a execute cuyo SQL contiene el fragmento dado
function llamadasConSql(conexion, fragmento) {
  return conexion.execute.mock.calls.filter(([sql]) => sql.includes(fragmento));
}

// ------------------------------------------------------------
// Setup / teardown comun
// ------------------------------------------------------------
let conexion;

beforeEach(() => {
  vi.clearAllMocks();
  conexion = crearConexionFalsa();
  pool.getConnection.mockResolvedValue(conexion);
  // Silenciar los console.error del controller en escenarios de
  // error para no ensuciar la salida del runner.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// 1. Registro exitoso NO ganador
// ============================================================
describe('registrarParticipante - registro exitoso NO ganador', () => {
  it('responde 201 con ok:true, esGanador:false y premio:null', async () => {
    programarExecute(conexion, { insertId: 42, filasGanador: [] });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        numeroRegistro: 42,
        esGanador: false,
        premio: null,
      })
    );
  });

  it('abre transaccion, hace commit y NUNCA rollback', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(conexion.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conexion.commit).toHaveBeenCalledTimes(1);
    expect(conexion.rollback).not.toHaveBeenCalled();
  });

  it('libera la conexion (release) al terminar', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  it('NO ejecuta ningun UPDATE cuando el numero no es ganador', async () => {
    programarExecute(conexion, { filasGanador: [] });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    // Nota: no se puede buscar solo 'UPDATE' porque el SELECT de
    // ganadores contiene 'FOR UPDATE'; se buscan las dos tablas.
    expect(llamadasConSql(conexion, 'UPDATE numeros_ganadores')).toHaveLength(0);
    expect(llamadasConSql(conexion, 'UPDATE participantes')).toHaveLength(0);
  });

  it('inserta los datos NORMALIZADOS por normalizar.js real', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido(), '187.190.1.1'), res);

    const [llamadaInsert] = llamadasConSql(conexion, 'INSERT INTO participantes');
    expect(llamadaInsert).toBeDefined();

    const params = llamadaInsert[1];
    // Orden de columnas: nombre, apellido_pat, apellido_mat,
    // empresa, puesto, telefono, correo, ip_origen, acepto_privacidad
    expect(params).toEqual([
      'Irving Alejandro',      // trim + colapso de espacios + title case
      'De la Vega',            // particulas en minuscula salvo la primera
      'García',                // respeta acentos
      'Tmsourcing',            // todo en minusculas: no hay caja que respetar
      'Desarrollador Senior',
      '5512345678',            // solo digitos, sin lada 52
      'irving.vega@example.com', // minusculas y sin espacios
      '187.190.1.1',           // ip del request para auditoria
      true,                    // constancia del aviso de privacidad
    ]);
  });

  it('respeta la caja de marcas y siglas en empresa', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    await registrarParticipante(
      crearReqFalso(bodyValido({ empresa: 'TMSourcing', puesto: 'Director CLICK' })),
      res
    );

    const [llamadaInsert] = llamadasConSql(conexion, 'INSERT INTO participantes');
    const params = llamadaInsert[1];
    // Sin esto, la lista de contactos del evento llegaba degradada:
    // "TMSourcing" se guardaba como "Tmsourcing".
    expect(params[3]).toBe('TMSourcing');
    expect(params[4]).toBe('Director CLICK');
  });

  it('guarda ip_origen como null si el request no trae ip', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    // Request construido a mano SIN propiedad ip
    await registrarParticipante({ body: bodyValido() }, res);

    const [llamadaInsert] = llamadasConSql(conexion, 'INSERT INTO participantes');
    expect(llamadaInsert[1][7]).toBeNull();
  });
});

// ============================================================
// 2. Registro exitoso GANADOR
// ============================================================
describe('registrarParticipante - registro exitoso GANADOR', () => {
  const filaGanadora = { numero: 7, premio: 'Pantalla 50"', reclamado: false };

  it('responde 201 con esGanador:true y el premio', async () => {
    programarExecute(conexion, { insertId: 7, filasGanador: [filaGanadora] });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        numeroRegistro: 7,
        esGanador: true,
        premio: 'Pantalla 50"',
      })
    );
  });

  it('ejecuta DOS updates: numeros_ganadores y participantes', async () => {
    programarExecute(conexion, { insertId: 7, filasGanador: [filaGanadora] });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    const updateGanadores = llamadasConSql(conexion, 'UPDATE numeros_ganadores');
    const updateParticipantes = llamadasConSql(conexion, 'UPDATE participantes');

    expect(updateGanadores).toHaveLength(1);
    expect(updateParticipantes).toHaveLength(1);

    // El UPDATE de ganadores marca reclamado y liga al participante
    expect(updateGanadores[0][0]).toContain('reclamado = TRUE');
    expect(updateGanadores[0][1]).toEqual([7, 7]);

    // El UPDATE de participantes marca es_ganador para ese id
    expect(updateParticipantes[0][0]).toContain('es_ganador = TRUE');
    expect(updateParticipantes[0][1]).toEqual([7]);
  });

  it('hace commit tras marcar el premio y libera la conexion', async () => {
    programarExecute(conexion, { insertId: 7, filasGanador: [filaGanadora] });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(conexion.commit).toHaveBeenCalledTimes(1);
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 3. Body invalido -> 400 sin tocar la BD
// ============================================================
describe('registrarParticipante - validacion de entrada', () => {
  it('responde 400 datos_invalidos con correo malformado', async () => {
    const res = crearResFalso();
    const req = crearReqFalso(bodyValido({ correo: 'no-es-un-correo' }));

    await registrarParticipante(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'datos_invalidos',
        campo: 'correo',
        mensaje: expect.any(String),
      })
    );
  });

  it('NUNCA toca el pool cuando la validacion falla', async () => {
    const res = crearResFalso();
    const req = crearReqFalso(bodyValido({ correo: 'no-es-un-correo' }));

    await registrarParticipante(req, res);

    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('responde 400 si no se acepto el aviso de privacidad', async () => {
    const res = crearResFalso();
    const req = crearReqFalso(bodyValido({ acepto_privacidad: false }));

    await registrarParticipante(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'datos_invalidos',
        campo: 'acepto_privacidad',
      })
    );
  });

  it('no registra a nadie que no haya dado su consentimiento', async () => {
    const res = crearResFalso();
    // Un POST directo al endpoint, saltandose el formulario
    const req = crearReqFalso(bodyValido({ acepto_privacidad: undefined }));

    await registrarParticipante(req, res);

    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('responde 400 con campo telefono si el telefono no tiene 10 digitos', async () => {
    const res = crearResFalso();
    const req = crearReqFalso(bodyValido({ telefono: '12345' }));

    await registrarParticipante(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'datos_invalidos',
        campo: 'telefono',
      })
    );
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('responde 400 con campo nombre si falta el nombre', async () => {
    const res = crearResFalso();
    const req = crearReqFalso(bodyValido({ nombre: '   ' }));

    await registrarParticipante(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'datos_invalidos',
        campo: 'nombre',
      })
    );
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('responde 400 si el body no es un objeto', async () => {
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(null), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'datos_invalidos',
        campo: 'body',
      })
    );
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});

// ============================================================
// 4. Correo duplicado (ER_DUP_ENTRY) -> 409
// ============================================================
describe('registrarParticipante - correo duplicado', () => {
  it('responde 409 correo_duplicado, hace rollback y release', async () => {
    const errorDup = new Error('Duplicate entry');
    errorDup.code = 'ER_DUP_ENTRY';
    conexion.execute.mockRejectedValue(errorDup);
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'correo_duplicado',
        campo: 'correo',
      })
    );
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 5. Error inesperado de BD -> 500
// ============================================================
describe('registrarParticipante - error inesperado de BD', () => {
  it('responde 500 error_servidor, hace rollback y release', async () => {
    conexion.execute.mockRejectedValue(new Error('ECONNRESET'));
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: 'error_servidor',
      })
    );
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  it('responde 500 sin exponer detalles internos del error', async () => {
    conexion.execute.mockRejectedValue(
      new Error('Access denied for user rifa@10.0.0.1')
    );
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    const payload = res.json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('Access denied');
  });

  it('responde 500 aunque el propio rollback tambien falle', async () => {
    conexion.execute.mockRejectedValue(new Error('deadlock'));
    conexion.rollback.mockRejectedValue(new Error('conexion perdida'));
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  it('responde 500 si falla el commit (rollback y release incluidos)', async () => {
    programarExecute(conexion);
    conexion.commit.mockRejectedValue(new Error('commit fallido'));
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  it('responde 500 si getConnection falla y no intenta release', async () => {
    pool.getConnection.mockRejectedValue(new Error('pool agotado'));
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: 'error_servidor' })
    );
    // No hubo conexion: no hay nada que liberar ni revertir
    expect(conexion.release).not.toHaveBeenCalled();
    expect(conexion.rollback).not.toHaveBeenCalled();
  });
});

// ============================================================
// 7. Garantia de concurrencia (ADR-003)
// ============================================================
describe('registrarParticipante - garantia de concurrencia ADR-003', () => {
  it('el SELECT de ganadores usa FOR UPDATE y filtra reclamado = FALSE', async () => {
    programarExecute(conexion);
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    const [llamadaSelect] = llamadasConSql(conexion, 'FROM numeros_ganadores');
    expect(llamadaSelect).toBeDefined();

    const sql = llamadaSelect[0];
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('reclamado = FALSE');
  });

  it('consulta el numero recien insertado (insertId) como parametro', async () => {
    programarExecute(conexion, { insertId: 123 });
    const res = crearResFalso();

    await registrarParticipante(crearReqFalso(bodyValido()), res);

    const [llamadaSelect] = llamadasConSql(conexion, 'FROM numeros_ganadores');
    expect(llamadaSelect[1]).toEqual([123]);
  });
});
