// ============================================================
// frontend/src/tiburometro.js
// ------------------------------------------------------------
// Catalogo y logica del Tiburometro para la PANTALLA.
//
// IMPORTANTE: esto es un espejo de backend/src/utils/tiburometro.js
// y sirve solo para pintar. El puntaje y el nivel que se GUARDAN
// los recalcula siempre el servidor a partir de las tres
// respuestas; lo que se envie desde aqui se ignora.
//
// Existe esta copia porque el diagnostico se muestra ANTES de
// enviar el formulario, asi que no hay a quien preguntarle todavia.
// Si algun texto se desincroniza, la consecuencia es cosmetica:
// nunca puede cambiar lo que queda en la base.
// ============================================================

// ------------------------------------------------------------
// Preguntas. La POSICION de cada opcion es su puntaje (1 a 4),
// de menor a mayor exposicion.
// ------------------------------------------------------------
export const PREGUNTAS = [
  {
    clave: 'q1_garantia',
    titulo: '¿Qué garantía usas hoy en tus créditos?',
    opciones: [
      'Fideicomiso de garantía',
      'Garantía hipotecaria tradicional',
      'Aval u obligado solidario',
      'Ninguna garantía real',
    ],
  },
  {
    clave: 'q2_cartera_vencida',
    titulo: '¿Cuál es tu % de cartera vencida actual?',
    opciones: ['Menos de 3%', '3% - 7%', '7% - 15%', 'Más de 15%'],
  },
  {
    clave: 'q3_recuperacion',
    titulo: 'Ante un incumplimiento, ¿cuánto tardas en recuperar?',
    opciones: [
      '4 meses o menos',
      '4 - 6 meses',
      '6 - 12 meses',
      'Más de 12 meses / no recuperamos',
    ],
  },
];

// ------------------------------------------------------------
// Montos. La clave es lo que viaja al backend; la etiqueta es
// lo que se ve. El backend valida la clave contra su propia lista
// blanca y guarda la etiqueta.
// ------------------------------------------------------------
export const MONTOS = [
  { clave: 'menos_500k', etiqueta: 'Menos de $500 mil' },
  { clave: '500k_2m', etiqueta: '$500 mil - $2 millones' },
  { clave: '2m_10m', etiqueta: '$2 - $10 millones' },
  { clave: 'mas_10m', etiqueta: 'Más de $10 millones' },
];

// ------------------------------------------------------------
// Niveles. Cortes del documento de la dinamica:
// 3-4 segura, 5-7 turbias, 8-10 abiertas, 11-12 tiburones.
//
// `ancla` es la posicion del tiburon en la pista, en porcentaje.
// ------------------------------------------------------------
const NIVELES = [
  {
    hasta: 4,
    clave: 'safe',
    nombre: 'Zona Segura',
    ancla: 12,
    titular: 'En agua clara no hay tiburón… pero siempre vigila.',
    mensaje:
      'Enhorabuena, vas bien. Sin embargo, con el Fideicomiso de Garantía puedes blindar aún más tu cartera y reducir los tiempos de ejecución, si algo cambia. Hablemos.',
  },
  {
    hasta: 7,
    clave: 'turbias',
    nombre: 'Aguas Turbias',
    ancla: 40,
    titular: 'Tan… tan… El tiburón te merodea y puede morderte.',
    mensaje:
      'Tienes protección parcial, pero hay grietas. Un Fideicomiso de Garantía puede cerrar los puntos donde hoy dependes de procesos judiciales lentos. Hablemos.',
  },
  {
    hasta: 10,
    clave: 'abiertas',
    nombre: 'Aguas Abiertas',
    ancla: 66,
    titular: 'TAN… TAN… ahí viene el tiburón. ¡CUIDADO!',
    mensaje:
      'Tu cartera está más expuesta de lo que parece. Cada crédito sin garantía estructurada, es tiempo y dinero que podrías no recuperar oportunamente. Hablemos pronto.',
  },
  {
    hasta: Infinity,
    clave: 'sharks',
    nombre: 'Zona de Tiburones',
    ancla: 86,
    titular: 'TARARÁAAAAN… ¡PELIGRO INMINENTE de mordida!',
    mensaje:
      'Estás nadando sin protección. Sin una garantía real, cada incumplimiento puede tomarte años en tribunales. Hablemos hoy mismo.',
  },
];

export function nivelPorPuntaje(puntaje) {
  return NIVELES.find((n) => puntaje <= n.hasta);
}

// ------------------------------------------------------------
// nivelPorClave(): recupera un nivel a partir de su clave.
//
// Lo usa la pantalla final, que lee el diagnostico guardado en
// localStorage. Ahi solo se guarda la clave, no el objeto entero:
// asi, si algun texto cambia, los registros ya guardados muestran
// la version nueva en vez de una copia vieja congelada.
//
// Devuelve null si la clave no existe, para que un registro
// guardado por una version anterior no rompa la pantalla.
// ------------------------------------------------------------
export function nivelPorClave(clave) {
  return NIVELES.find((n) => n.clave === clave) || null;
}

// ------------------------------------------------------------
// posicionParcial(): donde va el tiburon mientras se contesta.
//
// Se normaliza sobre las preguntas YA respondidas, no sobre las
// tres, para que el tiburon avance de forma legible desde la
// primera respuesta en vez de quedarse pegado al inicio.
// ------------------------------------------------------------
export function posicionParcial(respuestas) {
  const dadas = Object.values(respuestas).filter((v) => v > 0);
  if (dadas.length === 0) return 6;
  const suma = dadas.reduce((a, b) => a + b, 0);
  const proporcion = (suma - dadas.length) / (dadas.length * 3);
  return 6 + proporcion * 80;
}
