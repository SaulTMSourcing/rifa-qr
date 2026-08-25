// ============================================================
// backend/src/utils/tiburometro.test.js
// ------------------------------------------------------------
// Fija la logica del Tiburometro tal como viene en el documento
// de la dinamica.
//
// Los cortes de puntaje son lo mas delicado del modulo: un error
// de uno cambia el diagnostico de una persona, y ese diagnostico
// se guarda como dato comercial y se envia por correo. Por eso se
// prueban los limites exactos de cada nivel, no solo un valor
// representativo en medio de cada rango.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  MONTOS,
  PREGUNTAS,
  nivelPorPuntaje,
  etiquetaMonto,
  calcularDiagnostico,
} from './tiburometro.js';

// ------------------------------------------------------------
// Cortes del diagnostico
// ------------------------------------------------------------
describe('nivelPorPuntaje - limites exactos de cada nivel', () => {
  // Documento: Zona Segura 3-4, Aguas Turbias 5-7,
  //            Aguas Abiertas 8-10, Zona de Tiburones 11-12
  const esperado = [
    [3, 'safe'],
    [4, 'safe'],
    [5, 'turbias'],
    [7, 'turbias'],
    [8, 'abiertas'],
    [10, 'abiertas'],
    [11, 'sharks'],
    [12, 'sharks'],
  ];

  for (const [puntaje, clave] of esperado) {
    it(`puntaje ${puntaje} cae en "${clave}"`, () => {
      expect(nivelPorPuntaje(puntaje).clave).toBe(clave);
    });
  }

  it('todo puntaje posible (3 a 12) tiene nivel', () => {
    for (let p = 3; p <= 12; p++) {
      expect(nivelPorPuntaje(p)).toBeDefined();
    }
  });

  it('los nombres visibles coinciden con el documento', () => {
    expect(nivelPorPuntaje(3).nombre).toBe('Zona Segura');
    expect(nivelPorPuntaje(6).nombre).toBe('Aguas Turbias');
    expect(nivelPorPuntaje(9).nombre).toBe('Aguas Abiertas');
    expect(nivelPorPuntaje(12).nombre).toBe('Zona de Tiburones');
  });
});

// ------------------------------------------------------------
// Catalogo de preguntas
// ------------------------------------------------------------
describe('PREGUNTAS', () => {
  it('son 3 preguntas con 4 opciones cada una', () => {
    const claves = Object.keys(PREGUNTAS);
    expect(claves).toEqual(['q1_garantia', 'q2_cartera_vencida', 'q3_recuperacion']);
    for (const c of claves) {
      expect(PREGUNTAS[c].opciones).toHaveLength(4);
    }
  });

  it('la posicion de la opcion ES su puntaje: la 1a es la de menor exposicion', () => {
    expect(PREGUNTAS.q1_garantia.opciones[0]).toBe('Fideicomiso de garantía');
    expect(PREGUNTAS.q1_garantia.opciones[3]).toBe('Ninguna garantía real');
    expect(PREGUNTAS.q2_cartera_vencida.opciones[0]).toBe('Menos de 3%');
    expect(PREGUNTAS.q2_cartera_vencida.opciones[3]).toBe('Más de 15%');
    // Manda el prototipo, no el documento de la dinamica: ver la nota
    // en tiburometro.js
    expect(PREGUNTAS.q3_recuperacion.opciones[0]).toBe('4 meses o menos');
  });
});

// ------------------------------------------------------------
// Montos
// ------------------------------------------------------------
describe('etiquetaMonto', () => {
  it('traduce las 4 claves validas', () => {
    expect(etiquetaMonto('menos_500k')).toBe('Menos de $500 mil');
    expect(etiquetaMonto('500k_2m')).toBe('$500 mil - $2 millones');
    expect(etiquetaMonto('2m_10m')).toBe('$2 - $10 millones');
    expect(etiquetaMonto('mas_10m')).toBe('Más de $10 millones');
  });

  it('el catalogo tiene exactamente 4 opciones', () => {
    expect(Object.keys(MONTOS)).toHaveLength(4);
  });

  it('devuelve null para cualquier clave fuera del catalogo', () => {
    for (const basura of ['otro', '', 'MENOS_500K', null, undefined, 5, {}]) {
      expect(etiquetaMonto(basura)).toBeNull();
    }
  });

  it('no se deja enganar por propiedades heredadas de Object', () => {
    // Sin el hasOwnProperty, 'constructor' o 'toString' devolverian
    // una funcion en vez de null.
    expect(etiquetaMonto('constructor')).toBeNull();
    expect(etiquetaMonto('toString')).toBeNull();
    expect(etiquetaMonto('__proto__')).toBeNull();
  });
});

// ------------------------------------------------------------
// Diagnostico completo
// ------------------------------------------------------------
describe('calcularDiagnostico', () => {
  it('el mejor caso posible da Zona Segura', () => {
    const d = calcularDiagnostico({
      q1_garantia: 1,
      q2_cartera_vencida: 1,
      q3_recuperacion: 1,
    });
    expect(d.puntaje).toBe(3);
    expect(d.nivel).toBe('safe');
    expect(d.nivelNombre).toBe('Zona Segura');
  });

  it('el peor caso posible da Zona de Tiburones', () => {
    const d = calcularDiagnostico({
      q1_garantia: 4,
      q2_cartera_vencida: 4,
      q3_recuperacion: 4,
    });
    expect(d.puntaje).toBe(12);
    expect(d.nivel).toBe('sharks');
  });

  it('devuelve las respuestas en texto, para el correo del diagnostico', () => {
    const d = calcularDiagnostico({
      q1_garantia: 2,
      q2_cartera_vencida: 3,
      q3_recuperacion: 4,
    });
    expect(d.puntaje).toBe(9);
    expect(d.respuestas).toEqual({
      q1_garantia: 'Garantía hipotecaria tradicional',
      q2_cartera_vencida: '7% - 15%',
      q3_recuperacion: 'Más de 12 meses / no recuperamos',
    });
  });

  it('trae titular, mensaje y ancla del tiburon para pintar la pantalla', () => {
    const d = calcularDiagnostico({
      q1_garantia: 1,
      q2_cartera_vencida: 2,
      q3_recuperacion: 2,
    });
    expect(d.titular).toContain('tiburón te merodea');
    expect(d.mensaje).toContain('Fideicomiso de Garantía');
    expect(typeof d.anclaTiburon).toBe('number');
  });

  it('las 64 combinaciones posibles producen un diagnostico completo', () => {
    for (let a = 1; a <= 4; a++) {
      for (let b = 1; b <= 4; b++) {
        for (let c = 1; c <= 4; c++) {
          const d = calcularDiagnostico({
            q1_garantia: a,
            q2_cartera_vencida: b,
            q3_recuperacion: c,
          });
          expect(d.puntaje).toBe(a + b + c);
          expect(['safe', 'turbias', 'abiertas', 'sharks']).toContain(d.nivel);
          expect(d.nivelNombre).toBeTruthy();
          expect(d.titular).toBeTruthy();
          expect(d.mensaje).toBeTruthy();
        }
      }
    }
  });
});
