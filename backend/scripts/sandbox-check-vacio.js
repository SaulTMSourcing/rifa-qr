// ============================================================
// backend/scripts/sandbox-check-vacio.js
// ------------------------------------------------------------
// Prueba el caso limite "todavia no hay ningun registro", que es
// justo como estara la base al abrir el evento.
//
// Interesa sobre todo la consulta 7 (huecos en la secuencia): usa un
// CTE recursivo cuya rama base es SELECT 1, asi que sin la guarda
// correcta reportaria el numero 1 como hueco en una tabla vacia.
//
// Para no tocar los datos del sandbox, todo corre dentro de una
// transaccion que se revierte al final. Se evita cualquier DDL
// (ALTER, TRUNCATE) porque provocaria un commit implicito.
//
// Uso:
//   node scripts/sandbox-check-vacio.js
// ============================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizBackend = path.resolve(aqui, '..');
const raizProyecto = path.resolve(raizBackend, '..');

dotenv.config({ path: path.join(raizBackend, '.env.sandbox'), quiet: true });

const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

if (!['127.0.0.1', 'localhost', '::1'].includes(String(cfg.host).toLowerCase())) {
  console.error('[vacio] ABORTADO: solo corre contra el MySQL local.');
  process.exit(1);
}

// Reutiliza el mismo troceador que el otro script
function extraerBloques(sql) {
  const lineas = sql.split(/\r?\n/);
  const bloques = [];
  let actual = null;
  for (const linea of lineas) {
    const cab = linea.match(/^--\s*(\d+)\.\s+(.+?)\s*$/);
    if (cab) {
      if (actual) bloques.push(actual);
      actual = { numero: Number(cab[1]), titulo: cab[2].trim(), sql: [] };
      continue;
    }
    if (!actual) continue;
    if (/^\s*--/.test(linea) || /^\s*$/.test(linea)) continue;
    actual.sql.push(linea);
  }
  if (actual) bloques.push(actual);
  return bloques.map((b) => ({ ...b, sql: b.sql.join('\n').trim() })).filter((b) => b.sql);
}

const fallos = [];
function verificar(desc, cond, detalle) {
  console.log((cond ? '   OK   ' : '   FALLA ') + desc + (cond || !detalle ? '' : '  -> ' + detalle));
  if (!cond) fallos.push(desc);
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  const bloques = extraerBloques(fs.readFileSync(path.join(raizProyecto, 'admin.sql'), 'utf8'));
  const porNumero = Object.fromEntries(bloques.map((b) => [b.numero, b]));

  const [[antes]] = await conn.query('SELECT COUNT(*) AS n FROM participantes');
  console.log('[vacio] Participantes antes de la prueba: ' + antes.n);

  await conn.beginTransaction();
  console.log('[vacio] Transaccion abierta. Vaciando participantes temporalmente...');

  await conn.query(
    'UPDATE numeros_ganadores SET reclamado = FALSE, participante_id = NULL, fecha_reclamo = NULL'
  );
  await conn.query('DELETE FROM participantes');

  const [[chk]] = await conn.query('SELECT COUNT(*) AS n FROM participantes');
  console.log('[vacio] Participantes durante la prueba: ' + chk.n);
  console.log('');
  console.log('============================================================');
  console.log('CONSULTAS CON LA BASE VACIA');
  console.log('============================================================');

  const res = {};
  for (const n of [1, 2, 3, 5, 6, 7, 8, 9]) {
    try {
      const [filas] = await conn.query(porNumero[n].sql);
      res[n] = filas;
      console.log('   bloque ' + String(n).padStart(2) + ': ejecuta, ' + filas.length + ' fila(s)');
    } catch (e) {
      console.log('   bloque ' + String(n).padStart(2) + ': ERROR ' + e.code + ' - ' + e.message);
      fallos.push('Bloque ' + n + ' truena con la base vacia');
    }
  }

  console.log('');
  console.log('[1] Panorama');
  verificar('registrados = 0', Number(res[1]?.[0]?.registrados) === 0, String(res[1]?.[0]?.registrados));
  verificar('ultimo_numero_asignado = 0', Number(res[1]?.[0]?.ultimo_numero_asignado) === 0);
  verificar('numeros_quemados = 0 (sin desbordar)', Number(res[1]?.[0]?.numeros_quemados) === 0,
    String(res[1]?.[0]?.numeros_quemados));

  console.log('\n[2] Estado de los premios');
  const est = (res[2] || []).map((f) => f.estado);
  verificar('los 5 premios salen como PENDIENTE',
    est.length === 5 && est.every((e) => e === 'PENDIENTE'), JSON.stringify(est));
  const falt = (res[2] || []).map((f) => Number(f.registros_faltantes));
  verificar('registros_faltantes coincide con el numero premiado',
    JSON.stringify(falt) === JSON.stringify([5, 12, 25, 50, 100]), JSON.stringify(falt));

  console.log('\n[7] Huecos en la secuencia  <-- el caso limite que importa');
  verificar('NO reporta ningun hueco con la tabla vacia', (res[7]?.length || 0) === 0,
    JSON.stringify((res[7] || []).map((f) => f.numero_no_asignado)));

  console.log('\n[3] [6] [9] Listados');
  verificar('ganadores: 0 filas', (res[3]?.length || 0) === 0);
  verificar('export: 0 filas', (res[6]?.length || 0) === 0);
  verificar('empresas: 0 filas', (res[9]?.length || 0) === 0);

  console.log('\n[8] Revision previa (sigue siendo util sin datos)');
  verificar('devuelve los 5 premios configurados', (res[8]?.length || 0) === 5);

  // ----------------------------------------------------------
  await conn.rollback();
  console.log('\n[vacio] Rollback ejecutado.');

  const [[despues]] = await conn.query('SELECT COUNT(*) AS n FROM participantes');
  const [[prem]] = await conn.query(
    'SELECT COUNT(*) AS n FROM numeros_ganadores WHERE reclamado = TRUE'
  );
  console.log('[vacio] Participantes despues del rollback: ' + despues.n);
  console.log('');
  console.log('============================================================');
  verificar('los ' + antes.n + ' participantes se restauraron intactos', despues.n === antes.n,
    'quedaron ' + despues.n);
  verificar('los 2 premios reclamados se restauraron', prem.n === 2, 'quedaron ' + prem.n);

  if (fallos.length === 0) {
    console.log('TODO CORRECTO: el caso de base vacia se comporta bien y no se perdio nada.');
  } else {
    console.log('FALLARON ' + fallos.length + ':');
    for (const f of fallos) console.log('  - ' + f);
  }
  console.log('============================================================');

  await conn.end();
  process.exit(fallos.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[vacio] Error inesperado:', e.message);
  process.exit(1);
});
