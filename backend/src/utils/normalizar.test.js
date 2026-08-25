// ============================================================
// backend/src/utils/normalizar.test.js
// ------------------------------------------------------------
// Suite de tests (Vitest) para el modulo de normalizacion.
//
// Cubre las cuatro funciones internas (trim, titleCaseEspanol,
// normalizarCorreo, normalizarTelefono) y la funcion publica
// normalizarRegistro, incluyendo el orden de validacion.
//
// IMPORTANTE: las validaciones lanzan OBJETOS PLANOS con la
// forma { campo, mensaje }, NO instancias de Error. Por eso se
// usa el helper capturar() con try/catch en lugar de toThrow
// con matchers de mensaje.
// ============================================================

import { describe, it, expect } from 'vitest';
import { normalizarRegistro, _internos } from './normalizar.js';

const { trim, titleCaseEspanol, normalizarCorreo, normalizarTelefono } =
  _internos;

// ------------------------------------------------------------
// Helper: ejecuta fn y devuelve el valor lanzado (o undefined
// si no lanzo nada). Permite hacer asserts sobre objetos planos.
// ------------------------------------------------------------
function capturar(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

// ------------------------------------------------------------
// trim()
// ------------------------------------------------------------
describe('trim', () => {
  it('elimina espacios al inicio y al final', () => {
    expect(trim('  hola  ')).toBe('hola');
  });

  it('colapsa multiples espacios internos a uno solo', () => {
    expect(trim('  Irving   Alejandro  ')).toBe('Irving Alejandro');
  });

  it('colapsa tabs y saltos de linea internos como espacios', () => {
    expect(trim('Irving\t\nAlejandro')).toBe('Irving Alejandro');
  });

  it('devuelve cadena vacia para null', () => {
    expect(trim(null)).toBe('');
  });

  it('devuelve cadena vacia para undefined', () => {
    expect(trim(undefined)).toBe('');
  });

  it('devuelve cadena vacia para un numero', () => {
    expect(trim(42)).toBe('');
  });

  it('devuelve cadena vacia para un string de solo espacios', () => {
    expect(trim('     ')).toBe('');
  });
});

// ------------------------------------------------------------
// titleCaseEspanol()
// ------------------------------------------------------------
describe('titleCaseEspanol', () => {
  it('capitaliza un nombre simple', () => {
    expect(titleCaseEspanol('irving alejandro')).toBe('Irving Alejandro');
  });

  it('convierte mayusculas completas a title case', () => {
    expect(titleCaseEspanol('IRVING ALEJANDRO')).toBe('Irving Alejandro');
  });

  it('deja particulas en minuscula cuando van en posicion media', () => {
    expect(titleCaseEspanol('PEÑA DE LA TORRE')).toBe('Peña de la Torre');
  });

  it('capitaliza la particula cuando es la PRIMERA palabra', () => {
    expect(titleCaseEspanol('de la vega')).toBe('De la Vega');
  });

  it('maneja la particula "del" en posicion media', () => {
    expect(titleCaseEspanol('ruiz del castillo')).toBe('Ruiz del Castillo');
  });

  it('maneja la conjuncion "e" como particula media', () => {
    expect(titleCaseEspanol('garcía e iturbide')).toBe('García e Iturbide');
  });

  it('capitaliza despues de guiones', () => {
    expect(titleCaseEspanol('saint-pierre')).toBe('Saint-Pierre');
  });

  it('capitaliza despues de apostrofes', () => {
    expect(titleCaseEspanol("o'connor")).toBe("O'Connor");
  });

  it('respeta acentos y enie con locale es-MX', () => {
    expect(titleCaseEspanol('josé maría muñoz')).toBe('José María Muñoz');
    expect(titleCaseEspanol('ÁNGEL NUÑEZ')).toBe('Ángel Nuñez');
  });

  it('devuelve cadena vacia para string vacio', () => {
    expect(titleCaseEspanol('')).toBe('');
  });

  it('devuelve cadena vacia para entradas no-string', () => {
    expect(titleCaseEspanol(null)).toBe('');
    expect(titleCaseEspanol(undefined)).toBe('');
  });

  it('normaliza espacios extra antes de capitalizar', () => {
    expect(titleCaseEspanol('  pedro   paramo  ')).toBe('Pedro Paramo');
  });

  // ----------------------------------------------------------
  // Capitalizacion deliberada: siglas y marcas
  // ----------------------------------------------------------
  // Estos casos son datos comerciales del evento (empresa y puesto).
  // Degradarlos ensucia la lista de contactos que queda al cierre.
  // ----------------------------------------------------------
  describe('capitalizacion deliberada', () => {
    it('respeta caja camello en nombres de marca', () => {
      expect(titleCaseEspanol('TMSourcing')).toBe('TMSourcing');
      expect(titleCaseEspanol('TMSourcing Consultores')).toBe('TMSourcing Consultores');
    });

    it('respeta siglas en caja alta cuando conviven con minusculas', () => {
      expect(titleCaseEspanol('CLICK Seguridad Juridica')).toBe('CLICK Seguridad Juridica');
      expect(titleCaseEspanol('Banco BBVA')).toBe('Banco BBVA');
      expect(titleCaseEspanol('Grupo HSBC Mexico')).toBe('Grupo HSBC Mexico');
    });

    it('respeta apellidos con mayuscula interna', () => {
      expect(titleCaseEspanol('Juan McAllister')).toBe('Juan McAllister');
    });

    it('sigue capitalizando palabras normales alrededor de una sigla', () => {
      expect(titleCaseEspanol('consultoria CLICK del bajio'))
        .toBe('Consultoria CLICK del Bajio');
    });

    it('normaliza igual cuando TODO el campo viene en mayusculas (Bloq Mayus)', () => {
      expect(titleCaseEspanol('GRUPO FINANCIERO DEL NORTE'))
        .toBe('Grupo Financiero del Norte');
      expect(titleCaseEspanol('JUAN PEREZ')).toBe('Juan Perez');
    });

    // NOTA: limitacion aceptada a proposito. Una marca de una sola
    // palabra escrita sola y en caja alta es indistinguible de un
    // nombre con Bloq Mayus, y se normaliza.
    it('no puede distinguir una marca de una palabra escrita sola en caja alta', () => {
      expect(titleCaseEspanol('CLICK')).toBe('Click');
    });
  });
});

// ------------------------------------------------------------
// normalizarCorreo()
// ------------------------------------------------------------
describe('normalizarCorreo', () => {
  it('convierte a minusculas y hace trim', () => {
    expect(normalizarCorreo('  Sistemas@TMSourcing.COM  ')).toBe(
      'sistemas@tmsourcing.com'
    );
  });

  it('acepta un correo valido ya normalizado sin cambios', () => {
    expect(normalizarCorreo('a.b+c@dominio.mx')).toBe('a.b+c@dominio.mx');
  });

  it('lanza { campo: correo } si el formato es invalido', () => {
    const err = capturar(() => normalizarCorreo('no-es-un-correo'));
    expect(err).toBeDefined();
    expect(err).toMatchObject({ campo: 'correo' });
    expect(err.mensaje).toBe('El formato del correo no es valido.');
  });

  it('lanza { campo: correo } si esta vacio', () => {
    const err = capturar(() => normalizarCorreo(''));
    expect(err).toBeDefined();
    expect(err).toMatchObject({
      campo: 'correo',
      mensaje: 'El correo es obligatorio.',
    });
  });

  it('lanza si solo contiene espacios (trim lo deja vacio)', () => {
    const err = capturar(() => normalizarCorreo('    '));
    expect(err).toMatchObject({ campo: 'correo' });
    expect(err.mensaje).toBe('El correo es obligatorio.');
  });

  it('lanza si es null o undefined', () => {
    expect(capturar(() => normalizarCorreo(null))).toMatchObject({
      campo: 'correo',
    });
    expect(capturar(() => normalizarCorreo(undefined))).toMatchObject({
      campo: 'correo',
    });
  });

  it('lanza { campo: correo } si excede 180 caracteres', () => {
    // Correo de 190 chars que SI pasa validator.isEmail
    // (local <= 64, labels de dominio <= 63, total <= 254)
    const local = 'a'.repeat(64);
    const dominio = `${'b'.repeat(60)}.${'c'.repeat(60)}.com`;
    const correoLargo = `${local}@${dominio}`; // 64 + 1 + 125 = 190

    const err = capturar(() => normalizarCorreo(correoLargo));
    expect(err).toBeDefined();
    expect(err).toMatchObject({
      campo: 'correo',
      mensaje: 'El correo excede 180 caracteres.',
    });
  });

  it('acepta un correo de exactamente 180 caracteres (limite)', () => {
    const local = 'a'.repeat(64);
    const dominio = `${'b'.repeat(55)}.${'c'.repeat(55)}.com`;
    const correoLimite = `${local}@${dominio}`; // 64 + 1 + 115 = 180

    expect(correoLimite.length).toBe(180);
    expect(normalizarCorreo(correoLimite)).toBe(correoLimite);
  });

  it('el objeto lanzado NO es instancia de Error (diseno del modulo)', () => {
    const err = capturar(() => normalizarCorreo('invalido'));
    expect(err instanceof Error).toBe(false);
  });
});

// ------------------------------------------------------------
// normalizarTelefono()
// ------------------------------------------------------------
describe('normalizarTelefono', () => {
  it('acepta 10 digitos limpios tal cual', () => {
    expect(normalizarTelefono('5512345678')).toBe('5512345678');
  });

  it('limpia espacios y guiones', () => {
    expect(normalizarTelefono('55 1234-5678')).toBe('5512345678');
  });

  it('limpia parentesis', () => {
    expect(normalizarTelefono('(55) 1234-5678')).toBe('5512345678');
  });

  it('quita la lada +52 de Mexico (12 digitos)', () => {
    expect(normalizarTelefono('+52 55 1234 5678')).toBe('5512345678');
  });

  it('recorta el 1 inicial del formato antiguo (11 digitos)', () => {
    expect(normalizarTelefono('1 55 1234 5678')).toBe('5512345678');
  });

  it('lanza { campo: telefono } con menos de 10 digitos', () => {
    const err = capturar(() => normalizarTelefono('12345'));
    expect(err).toBeDefined();
    expect(err).toMatchObject({
      campo: 'telefono',
      mensaje: 'El telefono debe tener 10 digitos (formato Mexico).',
    });
  });

  it('lanza con 11 digitos que NO empiezan con 1', () => {
    const err = capturar(() => normalizarTelefono('25512345678'));
    expect(err).toMatchObject({ campo: 'telefono' });
  });

  it('lanza con 12 digitos que NO empiezan con 52', () => {
    const err = capturar(() => normalizarTelefono('995512345678'));
    expect(err).toMatchObject({ campo: 'telefono' });
  });

  // NOTA: el formato movil antiguo "+52 1 55 ..." (13 digitos con
  // prefijo 521) NO esta soportado: el codigo solo recorta 12->10
  // (lada 52) y 11->10 (1 inicial), asi que 13 digitos lanzan.
  // Este test documenta el comportamiento REAL actual.
  it('lanza con el formato movil antiguo +52 1 (13 digitos)', () => {
    const err = capturar(() => normalizarTelefono('+52 1 55 1234 5678'));
    expect(err).toMatchObject({ campo: 'telefono' });
  });

  it('lanza si esta vacio', () => {
    const err = capturar(() => normalizarTelefono(''));
    expect(err).toMatchObject({
      campo: 'telefono',
      mensaje: 'El telefono es obligatorio.',
    });
  });

  it('lanza si es null, undefined o solo espacios', () => {
    expect(capturar(() => normalizarTelefono(null))).toMatchObject({
      campo: 'telefono',
    });
    expect(capturar(() => normalizarTelefono(undefined))).toMatchObject({
      campo: 'telefono',
    });
    expect(capturar(() => normalizarTelefono('   '))).toMatchObject({
      campo: 'telefono',
    });
  });

  it('lanza si tras limpiar no quedan digitos (solo letras)', () => {
    const err = capturar(() => normalizarTelefono('abcdefghij'));
    expect(err).toMatchObject({
      campo: 'telefono',
      mensaje: 'El telefono debe tener 10 digitos (formato Mexico).',
    });
  });
});

// ------------------------------------------------------------
// normalizarRegistro()
// ------------------------------------------------------------
describe('normalizarRegistro', () => {
  // Fixture valido reutilizable: cada test hace copia con spread
  const registroValido = {
    nombre_completo: '  irving   alejandro peña de la torre ',
    empresa: 'tm sourcing',
    telefono: '+52 (55) 1234-5678',
    correo: ' Sistemas@TMSourcing.COM ',
    monto_promedio: '2m_10m',
    q1_garantia: 1,
    q2_cartera_vencida: 2,
    q3_recuperacion: 2,
    acepto_privacidad: true,
  };

  it('devuelve todos los campos normalizados con un body valido', () => {
    const resultado = normalizarRegistro({ ...registroValido });

    expect(resultado).toEqual({
      nombre_completo: 'Irving Alejandro Peña de la Torre',
      empresa: 'Tm Sourcing',
      telefono: '5512345678',
      correo: 'sistemas@tmsourcing.com',
      // La clave 2m_10m se resuelve a su etiqueta legible
      monto_promedio: '$2 - $10 millones',
      q1_garantia: 1,
      q2_cartera_vencida: 2,
      q3_recuperacion: 2,
      // 1 + 2 + 2 = 5 -> Aguas Turbias
      puntaje_total: 5,
      nivel_exposicion: 'turbias',
      acepto_privacidad: true,
    });
  });

  it('recalcula el puntaje aunque el cliente mande otro', () => {
    const resultado = normalizarRegistro({
      ...registroValido,
      puntaje_total: 99,
      nivel_exposicion: 'safe',
    });

    expect(resultado.puntaje_total).toBe(5);
    expect(resultado.nivel_exposicion).toBe('turbias');
  });

  // ----------------------------------------------------------
  // Consentimiento del aviso de privacidad
  // ----------------------------------------------------------
  // La validacion del navegador no basta: se puede enviar un POST
  // directo al endpoint sin pasar por el formulario. Estas pruebas
  // fijan que el backend exija el consentimiento de forma estricta.
  // ----------------------------------------------------------
  describe('consentimiento del aviso de privacidad', () => {
    const sinConsentimiento = { ...registroValido };
    delete sinConsentimiento.acepto_privacidad;

    it('lanza si el campo viene ausente', () => {
      const err = capturar(() => normalizarRegistro({ ...sinConsentimiento }));
      expect(err).toMatchObject({
        campo: 'acepto_privacidad',
        mensaje: 'Debes aceptar el aviso de privacidad para registrarte.',
      });
    });

    it('lanza si viene en false', () => {
      const err = capturar(() =>
        normalizarRegistro({ ...registroValido, acepto_privacidad: false })
      );
      expect(err).toMatchObject({ campo: 'acepto_privacidad' });
    });

    it('exige el booleano true, no un valor que solo parezca verdadero', () => {
      for (const valor of ['true', 'si', 1, 'on', {}, []]) {
        const err = capturar(() =>
          normalizarRegistro({ ...registroValido, acepto_privacidad: valor })
        );
        expect(err).toMatchObject({ campo: 'acepto_privacidad' });
      }
    });

    it('acepta cuando viene el booleano true', () => {
      const resultado = normalizarRegistro({ ...registroValido });
      expect(resultado.acepto_privacidad).toBe(true);
    });

    it('se valida al final, para no tapar los errores de los campos visibles', () => {
      // Con el telefono mal Y sin consentimiento, el usuario debe ver
      // primero el error del campo que tiene delante en pantalla.
      const err = capturar(() =>
        normalizarRegistro({
          ...sinConsentimiento,
          telefono: '123',
        })
      );
      expect(err).toMatchObject({ campo: 'telefono' });
    });
  });

  it('lanza { campo: body } con null', () => {
    const err = capturar(() => normalizarRegistro(null));
    expect(err).toMatchObject({
      campo: 'body',
      mensaje: 'Los datos enviados no son validos.',
    });
  });

  it('lanza { campo: body } con undefined', () => {
    const err = capturar(() => normalizarRegistro(undefined));
    expect(err).toMatchObject({ campo: 'body' });
  });

  it('lanza { campo: body } con un string', () => {
    const err = capturar(() => normalizarRegistro('hola'));
    expect(err).toMatchObject({ campo: 'body' });
  });

  it('lanza { campo: body } con un numero', () => {
    const err = capturar(() => normalizarRegistro(42));
    expect(err).toMatchObject({ campo: 'body' });
  });

  // NOTA: un array pasa el filtro de body (typeof [] === 'object')
  // y falla despues en el primer campo. Este test documenta el
  // comportamiento REAL actual, no el ideal.
  it('un array NO lanza body: cae hasta el primer campo del formulario', () => {
    const err = capturar(() => normalizarRegistro([]));
    expect(err).toMatchObject({ campo: 'nombre_completo' });
  });

  it('lanza con el campo correcto cuando falta un campo intermedio', () => {
    const sinTelefono = { ...registroValido };
    delete sinTelefono.telefono;

    const err = capturar(() => normalizarRegistro(sinTelefono));
    expect(err).toMatchObject({
      campo: 'telefono',
      mensaje: 'El telefono es obligatorio.',
    });
  });

  it('lanza con campo empresa si solo falta la empresa', () => {
    const sinEmpresa = { ...registroValido };
    delete sinEmpresa.empresa;

    const err = capturar(() => normalizarRegistro(sinEmpresa));
    expect(err).toMatchObject({ campo: 'empresa' });
  });

  it('reporta el PRIMER campo que falla segun el orden de la pantalla', () => {
    // Orden: nombre_completo -> empresa -> telefono -> correo
    //        -> monto_promedio -> respuestas del quiz -> privacidad
    const err = capturar(() => normalizarRegistro({}));
    expect(err).toMatchObject({ campo: 'nombre_completo' });
  });

  it('con nombre valido pero el resto vacio, reporta empresa', () => {
    const err = capturar(() =>
      normalizarRegistro({ nombre_completo: 'Irving Alejandro' })
    );
    expect(err).toMatchObject({ campo: 'empresa' });
  });

  it('el monto se valida despues del correo y antes del quiz', () => {
    const sinMonto = { ...registroValido };
    delete sinMonto.monto_promedio;
    delete sinMonto.q1_garantia;

    const err = capturar(() => normalizarRegistro(sinMonto));
    expect(err).toMatchObject({ campo: 'monto_promedio' });
  });

  it('con telefono y correo invalidos a la vez, reporta telefono primero', () => {
    const ambosMal = {
      ...registroValido,
      telefono: '123',
      correo: 'no-valido',
    };

    const err = capturar(() => normalizarRegistro(ambosMal));
    expect(err).toMatchObject({ campo: 'telefono' });
  });

  it('empresa lanza si excede 150 caracteres', () => {
    const empresaLarga = { ...registroValido, empresa: 'a'.repeat(151) };

    const err = capturar(() => normalizarRegistro(empresaLarga));
    expect(err).toMatchObject({
      campo: 'empresa',
      mensaje: 'El campo empresa excede 150 caracteres.',
    });
  });

  it('empresa acepta exactamente 150 caracteres', () => {
    const empresa150 = { ...registroValido, empresa: 'a'.repeat(150) };

    const resultado = normalizarRegistro(empresa150);
    expect(resultado.empresa).toBe('A' + 'a'.repeat(149));
  });

  // El nombre va en un solo campo, asi que su limite es mayor que el
  // de un campo suelto: caben nombre y dos apellidos juntos.
  it('nombre_completo acepta hasta 300 caracteres', () => {
    const nombre300 = { ...registroValido, nombre_completo: 'a'.repeat(300) };

    const resultado = normalizarRegistro(nombre300);
    expect(resultado.nombre_completo).toBe('A' + 'a'.repeat(299));
  });

  it('nombre_completo lanza si excede 300 caracteres', () => {
    const nombreLargo = { ...registroValido, nombre_completo: 'a'.repeat(301) };

    const err = capturar(() => normalizarRegistro(nombreLargo));
    expect(err).toMatchObject({
      campo: 'nombre_completo',
      mensaje: 'El campo nombre_completo excede 300 caracteres.',
    });
  });

  it('lanza campo nombre_completo si el valor es un numero (trim lo vacia)', () => {
    const nombreNumero = { ...registroValido, nombre_completo: 123 };

    const err = capturar(() => normalizarRegistro(nombreNumero));
    expect(err).toMatchObject({
      campo: 'nombre_completo',
      mensaje: 'El campo nombre_completo es obligatorio.',
    });
  });
});
