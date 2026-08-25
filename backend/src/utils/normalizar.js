// ============================================================
// backend/src/utils/normalizar.js
// ------------------------------------------------------------
// Normalizacion y validacion de datos del formulario de
// registro. Centralizar esto aqui hace que el controller
// quede limpio y los reglas de negocio sean auditables.
//
// Cada funcion es pura (no efectos secundarios) y testeable.
// ============================================================

import validator from 'validator';
import { etiquetaMonto, calcularDiagnostico } from './tiburometro.js';

// ------------------------------------------------------------
// Particulas que en apellidos compuestos del espanol van en
// minuscula cuando NO son la primera palabra del campo.
// Referencia: Manual de estilo del espanol; uso comun en
// documentos oficiales mexicanos.
// ------------------------------------------------------------
const PARTICULAS_MINUSCULA = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e', // "Garcia e Iturbide"
  'da', // apellidos lusos comunes en MX
  'do',
  'dos',
]);

// ------------------------------------------------------------
// trim(): elimina espacios al inicio/final y colapsa multiples
// espacios internos a uno solo.
//   "  Irving   Alejandro  " -> "Irving Alejandro"
// ------------------------------------------------------------
function trim(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
}

// ------------------------------------------------------------
// capitalizarPalabra(): primera letra mayuscula, resto minuscula.
// Respeta acentos y enie. Maneja palabras con apostrofe (O'Connor)
// y guion (Saint-Pierre) capitalizando despues de cada separador.
// ------------------------------------------------------------
function capitalizarPalabra(palabra) {
  if (!palabra) return '';

  // Maneja guiones y apostrofes: divide, capitaliza cada parte,
  // y rejunta con el mismo separador.
  return palabra
    .split(/([-'])/g)
    .map((parte) => {
      if (parte === '-' || parte === "'") return parte;
      if (parte.length === 0) return parte;
      return parte.charAt(0).toLocaleUpperCase('es-MX')
        + parte.slice(1).toLocaleLowerCase('es-MX');
    })
    .join('');
}

// ------------------------------------------------------------
// tieneMayusculasInternas(): detecta si una palabra lleva alguna
// mayuscula despues de su primera letra.
//
// Sirve para reconocer capitalizacion deliberada, que no se debe
// pisar. Cubre dos casos con una sola prueba:
//   - Siglas y marcas en caja alta: CLICK, BBVA, HSBC, SOFOM
//   - Nombres en caja camello:      TMSourcing, McAllister
// ------------------------------------------------------------
function tieneMayusculasInternas(palabra) {
  const desdeLaSegunda = palabra.slice(1);
  return desdeLaSegunda !== desdeLaSegunda.toLocaleLowerCase('es-MX');
}

// ------------------------------------------------------------
// titleCaseEspanol(): aplica title case respetando particulas.
// Regla:
//   - La primera palabra SIEMPRE va capitalizada (aunque sea
//     particula): "De la Vega" si es el primer apellido.
//   - Las particulas en cualquier otra posicion van en minuscula:
//     "Pena de la Torre", "Ruiz del Castillo".
//   - El resto de palabras van capitalizadas normalmente.
//
// EXCEPCION: capitalizacion deliberada.
//   Si el campo mezcla mayusculas y minusculas, las palabras con
//   mayusculas internas se dejan intactas. Sin esto, los nombres de
//   empresa se degradan: "TMSourcing" terminaba como "Tmsourcing" y
//   "CLICK" como "Click", que es justo el dato que despues se usa
//   como lista de contactos del evento.
//
//   Si el campo viene COMPLETO en mayusculas se normaliza igual, sin
//   excepciones: casi siempre es Bloq Mayus encendido, no una
//   decision ("JUAN PEREZ" debe quedar "Juan Perez").
//
//   Limitacion conocida y aceptada: una marca de una sola palabra
//   escrita sola y en caja alta ("CLICK" como empresa completa) cae
//   en el caso de Bloq Mayus y queda "Click". No hay forma de
//   distinguirla de un nombre mal escrito, y equivocarse hacia el
//   lado de normalizar molesta menos.
//
// OPCION respetarSiglas
//   Solo tiene sentido en campos donde de verdad aparecen siglas y
//   marcas, es decir empresa. En el nombre de una persona hay que
//   apagarla: quien escribe "María FERNANDA de la Torre" trae el
//   Bloq Mayus a medias, no una sigla, y preservar esa palabra deja
//   el nombre gritando en la pantalla del ganador y en el correo.
//
//   Apagarla no rompe "O'Connor" ni "Saint-Pierre": esos los arma
//   capitalizarPalabra por sus separadores, no esta regla. Lo unico
//   que se pierde son apellidos tipo "McAllister", mucho menos
//   frecuentes que el Bloq Mayus a medias.
// ------------------------------------------------------------
function titleCaseEspanol(texto, { respetarSiglas = true } = {}) {
  const limpio = trim(texto);
  if (!limpio) return '';

  const todoEnMayusculas = limpio === limpio.toLocaleUpperCase('es-MX');

  const palabras = limpio.split(' ');

  return palabras
    .map((palabra, index) => {
      const palabraLower = palabra.toLocaleLowerCase('es-MX');

      // Capitalizacion deliberada: respetarla tal cual
      if (respetarSiglas && !todoEnMayusculas && tieneMayusculasInternas(palabra)) {
        return palabra;
      }

      // Primera palabra siempre capitalizada
      if (index === 0) {
        return capitalizarPalabra(palabra);
      }

      // Particulas en minuscula si no son la primera
      if (PARTICULAS_MINUSCULA.has(palabraLower)) {
        return palabraLower;
      }

      return capitalizarPalabra(palabra);
    })
    .join(' ');
}

// ------------------------------------------------------------
// normalizarCorreo(): trim + minusculas + validacion de formato.
// Lanza error con mensaje claro si el correo no es valido.
// ------------------------------------------------------------
function normalizarCorreo(correo) {
  const limpio = trim(correo).toLowerCase();

  if (!limpio) {
    throw { campo: 'correo', mensaje: 'El correo es obligatorio.' };
  }

  if (!validator.isEmail(limpio)) {
    throw { campo: 'correo', mensaje: 'El formato del correo no es valido.' };
  }

  if (limpio.length > 180) {
    throw { campo: 'correo', mensaje: 'El correo excede 180 caracteres.' };
  }

  return limpio;
}

// ------------------------------------------------------------
// normalizarTelefono(): elimina todo lo que no sea digito.
// Acepta variantes comunes y normaliza a 10 digitos mexicanos:
//   "55 1234-5678"        -> "5512345678"
//   "+52 55 1234 5678"    -> "5512345678" (quita lada 52)
//   "(55) 1234-5678"      -> "5512345678"
// Rechaza si tras la limpieza no quedan exactamente 10 digitos.
// ------------------------------------------------------------
function normalizarTelefono(telefono) {
  const limpio = trim(telefono);

  if (!limpio) {
    throw { campo: 'telefono', mensaje: 'El telefono es obligatorio.' };
  }

  // Quitar todo lo que no sea digito
  let soloDigitos = limpio.replace(/\D/g, '');

  // Si vienen 12 digitos y empiezan con 52 (lada Mexico), recortar
  if (soloDigitos.length === 12 && soloDigitos.startsWith('52')) {
    soloDigitos = soloDigitos.slice(2);
  }

  // Si vienen 11 digitos y empiezan con 1 (formato antiguo), recortar
  if (soloDigitos.length === 11 && soloDigitos.startsWith('1')) {
    soloDigitos = soloDigitos.slice(1);
  }

  if (soloDigitos.length !== 10) {
    throw {
      campo: 'telefono',
      mensaje: 'El telefono debe tener 10 digitos (formato Mexico).',
    };
  }

  return soloDigitos;
}

// ------------------------------------------------------------
// normalizarMonto(): valida la clave del monto elegido y devuelve
// la etiqueta legible que se guarda en la base.
//
// Es validacion por LISTA BLANCA, no limpieza de texto libre: la
// columna solo puede terminar con uno de los cuatro valores del
// catalogo, aunque alguien llame al endpoint por su cuenta. Si se
// aceptara texto arbitrario, el export que usa el equipo comercial
// quedaria con basura imposible de agrupar.
// ------------------------------------------------------------
function normalizarMonto(valor) {
  const etiqueta = etiquetaMonto(trim(valor));

  if (!etiqueta) {
    throw {
      campo: 'monto_promedio',
      mensaje: 'Selecciona el monto promedio de tus créditos.',
    };
  }

  return etiqueta;
}

// ------------------------------------------------------------
// normalizarTextoConTitleCase(): wrapper que valida obligatoriedad
// y aplica title case en espanol. Se usa para nombre, apellidos,
// empresa y puesto.
// ------------------------------------------------------------
function normalizarTextoConTitleCase(valor, campo, maxLength = 150, opciones = {}) {
  const limpio = trim(valor);

  if (!limpio) {
    throw { campo, mensaje: `El campo ${campo} es obligatorio.` };
  }

  if (limpio.length > maxLength) {
    throw {
      campo,
      mensaje: `El campo ${campo} excede ${maxLength} caracteres.`,
    };
  }

  return titleCaseEspanol(limpio, opciones);
}

// ------------------------------------------------------------
// normalizarRespuestaQuiz(): valida una respuesta del Tiburometro.
//
// Cada respuesta es la POSICION de la opcion elegida, del 1 al 4,
// y esa posicion es tambien su puntaje.
//
// Se acepta tanto numero como cadena numerica ("3"), porque un
// formulario puede mandar cualquiera de los dos y rechazar el
// segundo seria pedanteria sin beneficio. Lo que si se exige es
// que el resultado sea un entero dentro del rango: cualquier otra
// cosa corrompe el diagnostico.
// ------------------------------------------------------------
function normalizarRespuestaQuiz(valor, campo) {
  if (valor === null || valor === undefined || valor === '') {
    throw { campo, mensaje: 'Falta responder una pregunta del diagnóstico.' };
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 1 || numero > 4) {
    throw { campo, mensaje: 'Respuesta no válida en el diagnóstico.' };
  }

  return numero;
}

// ============================================================
// normalizarRegistro(): funcion publica principal.
//
// Recibe el objeto crudo del body del request. Devuelve un
// objeto con todos los campos normalizados y validados, listos
// para insertarse en la base.
//
// Lanza un objeto { campo, mensaje } si algun campo falla.
// El controller captura ese error y lo devuelve como 400.
//
// El orden de validacion sigue el orden de la pantalla, para que
// el primer error que vea la persona sea el del campo que tiene
// mas arriba y no uno de mas abajo.
// ============================================================
export function normalizarRegistro(datosCrudos) {
  if (!datosCrudos || typeof datosCrudos !== 'object') {
    throw { campo: 'body', mensaje: 'Los datos enviados no son validos.' };
  }

  const normalizado = {
    // El formulario captura el nombre en un solo campo. Se permite
    // hasta 300 caracteres porque aqui caben nombre y dos apellidos
    // juntos, a diferencia de los 150 de un campo suelto.
    //
    // respetarSiglas apagado: en un nombre, una palabra en caja alta
    // es Bloq Mayus a medias, no una sigla. Ver la nota larga en
    // titleCaseEspanol.
    nombre_completo: normalizarTextoConTitleCase(
      datosCrudos.nombre_completo,
      'nombre_completo',
      300,
      { respetarSiglas: false }
    ),
    empresa: normalizarTextoConTitleCase(datosCrudos.empresa, 'empresa'),
    telefono: normalizarTelefono(datosCrudos.telefono),
    correo: normalizarCorreo(datosCrudos.correo),
    monto_promedio: normalizarMonto(datosCrudos.monto_promedio),
  };

  // ----------------------------------------------------------
  // Respuestas del Tiburometro
  // ----------------------------------------------------------
  // Vienen de las pantallas anteriores al formulario. Si faltan,
  // es que alguien salto el flujo o llamo al endpoint directo.
  // ----------------------------------------------------------
  const respuestas = {
    q1_garantia: normalizarRespuestaQuiz(datosCrudos.q1_garantia, 'q1_garantia'),
    q2_cartera_vencida: normalizarRespuestaQuiz(
      datosCrudos.q2_cartera_vencida,
      'q2_cartera_vencida'
    ),
    q3_recuperacion: normalizarRespuestaQuiz(
      datosCrudos.q3_recuperacion,
      'q3_recuperacion'
    ),
  };

  Object.assign(normalizado, respuestas);

  // ----------------------------------------------------------
  // Puntaje y nivel: SIEMPRE se recalculan aqui.
  // ----------------------------------------------------------
  // Aunque el navegador los mande, se ignoran. El diagnostico se
  // guarda como dato comercial y se envia por correo, asi que no
  // puede depender de lo que diga el cliente.
  // ----------------------------------------------------------
  const diagnostico = calcularDiagnostico(respuestas);
  normalizado.puntaje_total = diagnostico.puntaje;
  normalizado.nivel_exposicion = diagnostico.nivel;

  // ----------------------------------------------------------
  // Consentimiento del aviso de privacidad
  // ----------------------------------------------------------
  // Se exige explicitamente true. Un checkbox desmarcado llega como
  // false o ausente, y ninguno de los dos vale como consentimiento.
  //
  // Se valida al final para no alterar el orden de los mensajes de
  // los campos del formulario, que es el orden en que aparecen en
  // pantalla.
  //
  // La validacion del navegador no basta: cualquiera puede enviar
  // un POST directo al endpoint saltandose el formulario.
  // ----------------------------------------------------------
  if (datosCrudos.acepto_privacidad !== true) {
    throw {
      campo: 'acepto_privacidad',
      mensaje: 'Debes aceptar el aviso de privacidad para registrarte.',
    };
  }
  normalizado.acepto_privacidad = true;

  return normalizado;
}

// Export auxiliar para tests futuros
export const _internos = {
  trim,
  titleCaseEspanol,
  normalizarCorreo,
  normalizarTelefono,
  normalizarMonto,
  normalizarRespuestaQuiz,
};
