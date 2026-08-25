// ============================================================
// backend/src/utils/tiburometro.js
// ------------------------------------------------------------
// Reglas de negocio del Tiburometro: catalogo de respuestas,
// puntaje y nivel de exposicion.
//
// Este modulo es la UNICA fuente de verdad de esa logica.
//
// Decision importante: el puntaje y el nivel se calculan AQUI, en
// el servidor, a partir de las tres respuestas. El navegador
// tambien los calcula para pintar la pantalla, pero lo que mande
// se ignora por completo.
//
// El motivo: el diagnostico se guarda como dato comercial y se
// envia por correo. Si el cliente pudiera mandar el nivel ya
// resuelto, cualquiera podria inventarse el suyo con un POST
// directo, y la base quedaria con informacion inservible para el
// equipo de ventas.
//
// Lo unico que se acepta del cliente son las tres respuestas, y
// solo si son enteros del 1 al 4.
// ============================================================

// ------------------------------------------------------------
// Catalogo de montos
// ------------------------------------------------------------
// El cliente manda la CLAVE (estable, sin acentos ni simbolos) y
// aqui se traduce a la etiqueta legible que se guarda en la base.
//
// Se hace asi por dos razones:
//   - La clave se puede validar contra una lista blanca, asi que
//     nadie puede escribir texto arbitrario en esa columna.
//   - La base guarda texto legible, para que el export que use el
//     equipo comercial se entienda sin traducir nada.
// ------------------------------------------------------------
export const MONTOS = Object.freeze({
  menos_500k: 'Menos de $500 mil',
  '500k_2m': '$500 mil - $2 millones',
  '2m_10m': '$2 - $10 millones',
  mas_10m: 'Más de $10 millones',
});

// ------------------------------------------------------------
// Catalogo de preguntas
// ------------------------------------------------------------
// El orden de las opciones importa: su posicion (1..4) ES el
// puntaje. 1 = menor exposicion, 4 = mayor exposicion.
//
// Se guardan las etiquetas porque el correo del diagnostico
// necesita decir que respondio la persona, no solo el numero.
// ------------------------------------------------------------
export const PREGUNTAS = Object.freeze({
  q1_garantia: Object.freeze({
    titulo: '¿Qué garantía usas hoy en tus créditos?',
    opciones: Object.freeze([
      'Fideicomiso de garantía',
      'Garantía hipotecaria tradicional',
      'Aval u obligado solidario',
      'Ninguna garantía real',
    ]),
  }),
  q2_cartera_vencida: Object.freeze({
    titulo: '¿Cuál es tu % de cartera vencida actual?',
    opciones: Object.freeze([
      'Menos de 3%',
      '3% - 7%',
      '7% - 15%',
      'Más de 15%',
    ]),
  }),
  q3_recuperacion: Object.freeze({
    titulo: 'Ante un incumplimiento, ¿cuánto tardas en recuperar?',
    opciones: Object.freeze([
      // NOTA: el documento de la dinamica dice "Menos de 4 meses" y el
      // prototipo HTML dice "4 meses o menos". Manda el prototipo
      // (decision de Saul, 25 ago 26). Son buckets casi iguales, pero
      // no identicos: con exactamente 4 meses, este incluye.
      '4 meses o menos',
      '4 - 6 meses',
      '6 - 12 meses',
      'Más de 12 meses / no recuperamos',
    ]),
  }),
});

export const CLAVES_PREGUNTAS = Object.freeze(Object.keys(PREGUNTAS));

// ------------------------------------------------------------
// Niveles de exposicion
// ------------------------------------------------------------
// Los cortes vienen del prototipo aprobado. El puntaje va de 3
// (las tres respuestas en 1) a 12 (las tres en 4).
//
// `anclaTiburon` es la posicion en porcentaje donde se detiene el
// tiburon en la escala; se manda al frontend para que la
// animacion coincida con el nivel que decidio el servidor.
// ------------------------------------------------------------
const NIVELES = Object.freeze([
  Object.freeze({
    hasta: 4,
    clave: 'safe',
    nombre: 'Zona Segura',
    anclaTiburon: 12,
    titular: 'En agua clara no hay tiburón… pero siempre vigila.',
    mensaje:
      'Enhorabuena, vas bien. Sin embargo, con el Fideicomiso de Garantía puedes blindar aún más tu cartera y reducir los tiempos de ejecución, si algo cambia. Hablemos.',
  }),
  Object.freeze({
    hasta: 7,
    clave: 'turbias',
    nombre: 'Aguas Turbias',
    anclaTiburon: 40,
    titular: 'Tan… tan… El tiburón te merodea y puede morderte.',
    mensaje:
      'Tienes protección parcial, pero hay grietas. Un Fideicomiso de Garantía puede cerrar los puntos donde hoy dependes de procesos judiciales lentos. Hablemos.',
  }),
  Object.freeze({
    hasta: 10,
    clave: 'abiertas',
    nombre: 'Aguas Abiertas',
    anclaTiburon: 68,
    titular: 'TAN… TAN… ahí viene el tiburón. ¡CUIDADO!',
    mensaje:
      'Tu cartera está más expuesta de lo que parece. Cada crédito sin garantía estructurada, es tiempo y dinero que podrías no recuperar oportunamente. Hablemos pronto.',
  }),
  Object.freeze({
    hasta: Infinity,
    clave: 'sharks',
    nombre: 'Zona de Tiburones',
    anclaTiburon: 88,
    titular: 'TARARÁAAAAN… ¡PELIGRO INMINENTE de mordida!',
    mensaje:
      'Estás nadando sin protección. Sin una garantía real, cada incumplimiento puede tomarte años en tribunales. Hablemos hoy mismo.',
  }),
]);

// ------------------------------------------------------------
// nivelPorPuntaje(): traduce un puntaje 3..12 a su nivel.
// ------------------------------------------------------------
export function nivelPorPuntaje(puntaje) {
  return NIVELES.find((n) => puntaje <= n.hasta);
}

// ------------------------------------------------------------
// etiquetaMonto(): traduce la clave del monto a texto legible.
// Devuelve null si la clave no esta en el catalogo, para que
// quien llame decida como reportar el error.
// ------------------------------------------------------------
export function etiquetaMonto(clave) {
  if (typeof clave !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(MONTOS, clave)
    ? MONTOS[clave]
    : null;
}

// ------------------------------------------------------------
// calcularDiagnostico(): a partir de las tres respuestas, devuelve
// el puntaje, el nivel y las etiquetas de lo que respondio.
//
// Asume que las respuestas ya fueron validadas (enteros 1..4).
// La validacion vive en normalizar.js, junto al resto.
// ------------------------------------------------------------
export function calcularDiagnostico({ q1_garantia, q2_cartera_vencida, q3_recuperacion }) {
  const puntaje = q1_garantia + q2_cartera_vencida + q3_recuperacion;
  const nivel = nivelPorPuntaje(puntaje);

  return {
    puntaje,
    nivel: nivel.clave,
    nivelNombre: nivel.nombre,
    titular: nivel.titular,
    mensaje: nivel.mensaje,
    anclaTiburon: nivel.anclaTiburon,
    // Lo que respondio, en texto. Lo usa el correo del diagnostico.
    respuestas: {
      q1_garantia: PREGUNTAS.q1_garantia.opciones[q1_garantia - 1],
      q2_cartera_vencida: PREGUNTAS.q2_cartera_vencida.opciones[q2_cartera_vencida - 1],
      q3_recuperacion: PREGUNTAS.q3_recuperacion.opciones[q3_recuperacion - 1],
    },
  };
}
