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
// titleCaseEspanol(): aplica title case respetando particulas.
// Regla:
//   - La primera palabra SIEMPRE va capitalizada (aunque sea
//     particula): "De la Vega" si es el primer apellido.
//   - Las particulas en cualquier otra posicion van en minuscula:
//     "Pena de la Torre", "Ruiz del Castillo".
//   - El resto de palabras van capitalizadas normalmente.
// ------------------------------------------------------------
function titleCaseEspanol(texto) {
  const limpio = trim(texto);
  if (!limpio) return '';

  const palabras = limpio.split(' ');

  return palabras
    .map((palabra, index) => {
      const palabraLower = palabra.toLocaleLowerCase('es-MX');

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
// normalizarTextoConTitleCase(): wrapper que valida obligatoriedad
// y aplica title case en espanol. Se usa para nombre, apellidos,
// empresa y puesto.
// ------------------------------------------------------------
function normalizarTextoConTitleCase(valor, campo, maxLength = 150) {
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

  return titleCaseEspanol(limpio);
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
// ============================================================
export function normalizarRegistro(datosCrudos) {
  if (!datosCrudos || typeof datosCrudos !== 'object') {
    throw { campo: 'body', mensaje: 'Los datos enviados no son validos.' };
  }

  const normalizado = {
    nombre: normalizarTextoConTitleCase(datosCrudos.nombre, 'nombre'),
    apellido_pat: normalizarTextoConTitleCase(
      datosCrudos.apellido_pat,
      'apellido_pat'
    ),
    apellido_mat: normalizarTextoConTitleCase(
      datosCrudos.apellido_mat,
      'apellido_mat'
    ),
    empresa: normalizarTextoConTitleCase(datosCrudos.empresa, 'empresa'),
    puesto: normalizarTextoConTitleCase(datosCrudos.puesto, 'puesto'),
    telefono: normalizarTelefono(datosCrudos.telefono),
    correo: normalizarCorreo(datosCrudos.correo),
  };

  return normalizado;
}

// Export auxiliar para tests futuros
export const _internos = {
  trim,
  titleCaseEspanol,
  normalizarCorreo,
  normalizarTelefono,
};
