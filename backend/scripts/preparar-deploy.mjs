// ============================================================
// backend/scripts/preparar-deploy.mjs
// ------------------------------------------------------------
// Arma el ZIP del backend listo para subir a Hostinger.
//
// Uso:
//   npm run deploy:zip
//
// Que hace:
//   1. Copia a una carpeta temporal SOLO los archivos permitidos
//      (lista blanca, no lista negra: si algo no esta declarado,
//      no viaja)
//   2. Verifica que ninguna credencial real quedo dentro
//   3. Comprime con 7-Zip dejando package.json en la RAIZ del ZIP
//
// Decisiones deliberadas:
//
//   package.json en la raiz del ZIP, no dentro de backend/.
//   Hostinger busca el manifiesto en el primer nivel; si va
//   anidado no reconoce el proyecto.
//
//   node_modules fuera. Hostinger instala las dependencias con
//   package-lock.json. Incluirlas hace el ZIP enorme y arrastra
//   binarios compilados para Windows que no sirven en Linux.
//
//   scripts/ fuera. Son herramientas de desarrollo, y una de
//   ellas (sandbox-setup.js) hace DELETE FROM participantes.
//   Tiene una guarda que aborta si la base no es local, pero un
//   script destructivo no tiene por que existir en produccion.
//
//   Los *.test.js fuera. No aportan nada en el servidor.
//
//   Los .env reales fuera, obviamente. Las variables se cargan
//   desde el panel de Hostinger, no desde un archivo del ZIP.
//   Si .env viajara, ademas PISARIA la configuracion del panel.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '..');

const DESTINO = path.join(os.tmpdir(), 'rifa-qr-backend-deploy');
const ZIP = path.join(os.tmpdir(), 'rifa-qr-backend.zip');

// ------------------------------------------------------------
// Lista blanca de lo que SI se sube
// ------------------------------------------------------------
const ARCHIVOS = ['package.json', 'package-lock.json', '.env.example'];
const CARPETAS = ['src'];

// Dentro de las carpetas permitidas, esto igual se descarta
const excluir = (rel) => rel.endsWith('.test.js');

// ------------------------------------------------------------
function copiarCarpeta(desde, hacia, relBase = '') {
  fs.mkdirSync(hacia, { recursive: true });
  let copiados = 0;
  for (const entrada of fs.readdirSync(desde, { withFileTypes: true })) {
    const rel = path.join(relBase, entrada.name);
    const origen = path.join(desde, entrada.name);
    const dest = path.join(hacia, entrada.name);
    if (entrada.isDirectory()) {
      copiados += copiarCarpeta(origen, dest, rel);
    } else if (!excluir(rel)) {
      fs.copyFileSync(origen, dest);
      copiados++;
    }
  }
  return copiados;
}

function listarArchivos(dir, base = dir) {
  const salida = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...listarArchivos(p, base));
    else salida.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return salida;
}

// ------------------------------------------------------------
// Verificacion de secretos
// ------------------------------------------------------------
// En vez de buscar patrones genericos, se leen los .env REALES
// que existen en la maquina y se comprueba que ninguno de sus
// valores aparezca en lo que se va a comprimir.
//
// Asi la comprobacion sigue siendo valida aunque cambien las
// credenciales, y este script nunca contiene un secreto escrito.
//
// Solo se miran las claves que de verdad son credenciales. Una
// primera version comparaba TODOS los valores de mas de 8
// caracteres y daba falsas alarmas con cosas que no son secretas
// y que ademas es normal que aparezcan en el codigo, como
// CORS_ORIGIN=http://localhost:5173 o NODE_ENV=development.
//
// Los valores de localhost se ignoran aunque vengan de una clave
// sensible: DB_HOST=127.0.0.1 en el entorno local no es un dato
// que haya que proteger.
// ------------------------------------------------------------
const CLAVES_SENSIBLES = ['DB_PASSWORD', 'DB_USER', 'DB_NAME', 'DB_HOST'];
const NO_SECRETOS = /^(localhost|127\.0\.0\.1|::1|root)$/i;

function valoresSensibles() {
  const valores = new Set();
  for (const archivo of ['.env', '.env.production', '.env.sandbox']) {
    const ruta = path.join(RAIZ, archivo);
    if (!fs.existsSync(ruta)) continue;
    for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
      const t = linea.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const clave = t.slice(0, t.indexOf('=')).trim();
      const valor = t.slice(t.indexOf('=') + 1).trim();
      if (!CLAVES_SENSIBLES.includes(clave)) continue;
      if (valor.length < 5 || NO_SECRETOS.test(valor)) continue;
      valores.add(valor);
    }
  }
  return [...valores];
}

// ============================================================
console.log('[deploy] Preparando ZIP del backend...\n');

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.rmSync(ZIP, { force: true });
fs.mkdirSync(DESTINO, { recursive: true });

let total = 0;
for (const f of ARCHIVOS) {
  const origen = path.join(RAIZ, f);
  if (!fs.existsSync(origen)) {
    console.error('[deploy] FALTA el archivo requerido: ' + f);
    process.exit(1);
  }
  fs.copyFileSync(origen, path.join(DESTINO, f));
  total++;
}
for (const c of CARPETAS) {
  total += copiarCarpeta(path.join(RAIZ, c), path.join(DESTINO, c));
}

const incluidos = listarArchivos(DESTINO);
console.log('[deploy] Archivos incluidos (' + incluidos.length + '):');
for (const f of incluidos) console.log('           ' + f);

// --- Verificacion de secretos ---
console.log('\n[deploy] Verificando que no viajen credenciales...');
const secretos = valoresSensibles();
if (secretos.length === 0) {
  console.warn('[deploy] AVISO: no se hallo ningun .env local con el cual comparar.');
} else {
  const filtrados = [];
  for (const rel of incluidos) {
    const contenido = fs.readFileSync(path.join(DESTINO, rel), 'utf8');
    for (const s of secretos) {
      if (contenido.includes(s)) filtrados.push({ archivo: rel, longitud: s.length });
    }
  }
  if (filtrados.length > 0) {
    console.error('\n[deploy] ABORTADO: se encontraron credenciales dentro del paquete.');
    for (const f of filtrados) {
      console.error('           ' + f.archivo + ' contiene un valor de ' + f.longitud + ' caracteres');
    }
    process.exit(1);
  }
  console.log('[deploy] OK: ninguno de los ' + secretos.length +
    ' valores sensibles aparece en el paquete.');
}

// --- Comprimir ---
const CANDIDATOS_7Z = [
  'C:\\Program Files\\7-Zip\\7z.exe',
  'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  '7z',
];
const exe = CANDIDATOS_7Z.find((c) => c === '7z' || fs.existsSync(c));

console.log('\n[deploy] Comprimiendo con 7-Zip...');
try {
  execFileSync(exe, ['a', '-tzip', ZIP, path.join(DESTINO, '*'), '-bso0', '-bsp0']);
} catch (e) {
  console.error('[deploy] Fallo al comprimir:', e.message);
  process.exit(1);
}

// --- Confirmar que package.json quedo en la raiz del ZIP ---
const listado = execFileSync(exe, ['l', '-ba', '-slt', ZIP], { encoding: 'utf8' });
const enElZip = [...listado.matchAll(/^Path = (.+)$/gm)].map((m) => m[1].replace(/\\/g, '/'));
const raizOk = enElZip.includes('package.json');

console.log('[deploy] Entradas en el ZIP: ' + enElZip.length);
console.log('[deploy] package.json en la raiz del ZIP: ' + (raizOk ? 'SI' : 'NO'));
if (!raizOk) {
  console.error('[deploy] ABORTADO: Hostinger no reconocera el proyecto.');
  process.exit(1);
}

const kb = (fs.statSync(ZIP).size / 1024).toFixed(0);
console.log('\n============================================================');
console.log('LISTO. ZIP generado:');
console.log('  ' + ZIP);
console.log('  ' + kb + ' KB, ' + enElZip.length + ' entradas');
console.log('============================================================');
