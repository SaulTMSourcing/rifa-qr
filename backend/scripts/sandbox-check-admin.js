// ============================================================
// backend/scripts/sandbox-check-admin.js
// ------------------------------------------------------------
// Ejecuta las consultas de admin.sql contra la base de pruebas y
// verifica que devuelvan lo esperado.
//
// Lee admin.sql del disco y lo parte en bloques por los separadores
// "-- N. TITULO", asi que valida el archivo REAL: si alguien edita
// admin.sql y rompe una consulta, este script lo detecta.
//
// Uso:
//   node scripts/sandbox-check-admin.js
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
  console.error('[check] ABORTADO: solo corre contra el MySQL local.');
  process.exit(1);
}

// ------------------------------------------------------------
// Partir admin.sql en bloques ejecutables
// ------------------------------------------------------------
// Cada bloque empieza con una cabecera "-- N. TITULO" dentro de una
// banda de signos "=". Nos quedamos con el SQL que va despues de la
// cabecera, ignorando comentarios y el bloque 10 (destructivo).
// ------------------------------------------------------------
function extraerBloques(sql) {
  const lineas = sql.split(/\r?\n/);
  const bloques = [];
  let actual = null;

  for (const linea of lineas) {
    const cabecera = linea.match(/^--\s*(\d+)\.\s+(.+?)\s*$/);
    if (cabecera) {
      if (actual) bloques.push(actual);
      actual = { numero: Number(cabecera[1]), titulo: cabecera[2].trim(), sql: [] };
      continue;
    }
    if (!actual) continue;
    // Descartar comentarios y separadores
    if (/^\s*--/.test(linea) || /^\s*$/.test(linea)) continue;
    actual.sql.push(linea);
  }
  if (actual) bloques.push(actual);

  return bloques
    .map((b) => ({ ...b, sql: b.sql.join('\n').trim() }))
    .filter((b) => b.sql.length > 0);
}

// ------------------------------------------------------------
// Aserciones: que esperamos de los datos sembrados
// ------------------------------------------------------------
// Numero del bloque destructivo de admin.sql. Se declara aqui para
// que si el archivo crece y ese bloque cambia de numero, solo haya
// que tocar esta linea.
const BLOQUE_DESTRUCTIVO = 11;

const fallos = [];
function verificar(descripcion, condicion, detalle) {
  if (condicion) {
    console.log('   OK   ' + descripcion);
  } else {
    console.log('   FALLA ' + descripcion + (detalle ? '  -> ' + detalle : ''));
    fallos.push(descripcion);
  }
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  const sql = fs.readFileSync(path.join(raizProyecto, 'admin.sql'), 'utf8');
  const bloques = extraerBloques(sql);

  console.log('[check] Bloques encontrados en admin.sql: ' +
    bloques.map((b) => b.numero).join(', '));
  console.log('');

  const resultados = {};

  for (const b of bloques) {
    if (b.numero === BLOQUE_DESTRUCTIVO) {
      console.log('-- Bloque ' + b.numero + ' (' + b.titulo +
        '): omitido, es destructivo y esta comentado.');
      continue;
    }
    process.stdout.write('-- Bloque ' + b.numero + ': ' + b.titulo + '\n');
    try {
      const [filas] = await conn.query(b.sql);
      resultados[b.numero] = filas;
      console.log('   ejecuta correctamente, ' + filas.length + ' fila(s).');
    } catch (e) {
      console.log('   ERROR SQL: ' + e.code + ' - ' + e.message);
      fallos.push('Bloque ' + b.numero + ' no ejecuta');
    }
    console.log('');
  }

  // ==========================================================
  // Verificaciones de logica
  // ==========================================================
  console.log('============================================================');
  console.log('VERIFICACIONES');
  console.log('============================================================');

  // --- Bloque 1: panorama ---
  const p = resultados[1]?.[0];
  console.log('\n[1] Panorama general');
  verificar('registrados = 58', p?.registrados === 58, 'devolvio ' + p?.registrados);
  verificar('ultimo_numero_asignado = 60', p?.ultimo_numero_asignado === 60, 'devolvio ' + p?.ultimo_numero_asignado);
  verificar('numeros_quemados = 2 (IDs 25 y 37)', Number(p?.numeros_quemados) === 2, 'devolvio ' + p?.numeros_quemados);
  verificar('premios_configurados = 5', p?.premios_configurados === 5, 'devolvio ' + p?.premios_configurados);
  verificar('premios_entregados = 2', p?.premios_entregados === 2, 'devolvio ' + p?.premios_entregados);

  // --- Bloque 2: estado de cada premio (el critico) ---
  const estados = {};
  for (const f of resultados[2] || []) estados[f.numero] = f;
  console.log('\n[2] Estado de cada premio  <-- el critico');
  for (const f of resultados[2] || []) {
    console.log('     numero ' + String(f.numero).padStart(3) + ' -> ' +
      f.estado + (f.ganador ? '  (' + f.ganador + ')' : ''));
  }
  verificar('numero 5 = ENTREGADO', estados[5]?.estado === 'ENTREGADO', estados[5]?.estado);
  verificar('numero 5 trae el nombre del ganador', !!estados[5]?.ganador, String(estados[5]?.ganador));
  verificar('numero 12 = REVISAR (participante existe, premio sin marcar)',
    String(estados[12]?.estado).startsWith('REVISAR'), estados[12]?.estado);
  verificar('numero 25 = PERDIDO (ID quemado)',
    String(estados[25]?.estado).startsWith('PERDIDO'), estados[25]?.estado);
  verificar('numero 50 = ENTREGADO', estados[50]?.estado === 'ENTREGADO', estados[50]?.estado);
  verificar('numero 100 = PENDIENTE', estados[100]?.estado === 'PENDIENTE', estados[100]?.estado);
  verificar('numero 100 indica 40 registros faltantes',
    Number(estados[100]?.registros_faltantes) === 40, String(estados[100]?.registros_faltantes));
  verificar('los ya resueltos muestran 0 faltantes',
    Number(estados[5]?.registros_faltantes) === 0, String(estados[5]?.registros_faltantes));

  // --- Bloque 3: ganadores ---
  console.log('\n[3] Lista de ganadores');
  verificar('devuelve exactamente 2 ganadores', resultados[3]?.length === 2, 'devolvio ' + resultados[3]?.length);
  verificar('todos traen premio y contacto',
    (resultados[3] || []).every((f) => f.premio && f.correo && f.telefono));
  // Tras la migracion 002 las columnas viejas quedan en NULL: si
  // alguna consulta las siguiera usando, el nombre saldria vacio
  // justo cuando se entrega un premio en el stand.
  verificar('el nombre NO viene vacio',
    (resultados[3] || []).every((f) => f.nombre_completo && f.nombre_completo.trim()),
    JSON.stringify((resultados[3] || []).map((f) => f.nombre_completo)));

  // --- Bloque 4: verificacion puntual (el WHERE fijo es id = 42) ---
  console.log('\n[4] Verificar un numero puntual (id = 42 en el archivo)');
  verificar('devuelve exactamente 1 fila', resultados[4]?.length === 1, 'devolvio ' + resultados[4]?.length);
  verificar('el 42 no es premiado, dice "NO gano"',
    resultados[4]?.[0]?.resultado === 'NO gano', resultados[4]?.[0]?.resultado);

  // --- Bloque 5: ritmo ---
  console.log('\n[5] Ritmo por hora');
  const suma = (resultados[5] || []).reduce((a, f) => a + Number(f.registros), 0);
  verificar('la suma de todas las horas da 58', suma === 58, 'sumo ' + suma);
  verificar('hay mas de una hora representada', (resultados[5]?.length || 0) > 1,
    (resultados[5]?.length || 0) + ' hora(s)');

  // --- Bloque 6: export ---
  console.log('\n[6] Export completo');
  verificar('devuelve 58 filas, una por participante', resultados[6]?.length === 58, 'devolvio ' + resultados[6]?.length);
  const ganadoresExport = (resultados[6] || []).filter((f) => f.gano === 'SI');
  verificar('marca 2 como ganadores', ganadoresExport.length === 2, 'marco ' + ganadoresExport.length);
  verificar('los ganadores traen premio', ganadoresExport.every((f) => !!f.premio));

  // --- Bloque 7: huecos ---
  console.log('\n[7] Huecos en la secuencia');
  const huecos = (resultados[7] || []).map((f) => Number(f.numero_no_asignado));
  console.log('     huecos detectados: ' + JSON.stringify(huecos));
  verificar('detecta exactamente los huecos 25 y 37',
    JSON.stringify(huecos) === JSON.stringify([25, 37]), JSON.stringify(huecos));
  const nota25 = (resultados[7] || []).find((f) => Number(f.numero_no_asignado) === 25)?.nota;
  verificar('avisa que el hueco 25 era premiado', /GRAVE/.test(String(nota25)), String(nota25));
  const nota37 = (resultados[7] || []).find((f) => Number(f.numero_no_asignado) === 37)?.nota;
  verificar('no marca el hueco 37 como grave (no era premiado)', !/GRAVE/.test(String(nota37)), String(nota37));

  // --- Bloque 8: revision previa ---
  console.log('\n[8] Revision previa al evento (asistencia esperada = 150 en el archivo)');
  const dg = {};
  for (const f of resultados[8] || []) dg[f.numero] = f.diagnostico;
  verificar('con 150 esperados, ningun numero da RIESGO',
    !Object.values(dg).some((d) => String(d).startsWith('RIESGO')), JSON.stringify(dg));

  // --- Bloque 9: empresas ---
  console.log('\n[9] Registros por empresa');
  const totalEmp = (resultados[9] || []).reduce((a, f) => a + Number(f.registrados), 0);
  verificar('la suma por empresa da 58', totalEmp === 58, 'sumo ' + totalEmp);
  verificar('la suma de ganadores por empresa da 2',
    (resultados[9] || []).reduce((a, f) => a + Number(f.ganadores), 0) === 2);

  // --- Bloque 10: diagnostico del Tiburometro ---
  console.log('\n[10] Diagnostico del Tiburometro');
  for (const f of resultados[10] || []) {
    console.log('     ' + String(f.nivel).padEnd(24) + f.personas +
      ' personas (' + f.porcentaje + '%), puntajes ' + f.puntaje_min + '-' + f.puntaje_max +
      ', ' + f.con_creditos_altos + ' con creditos altos');
  }
  const totalNiveles = (resultados[10] || []).reduce((a, f) => a + Number(f.personas), 0);
  verificar('la suma por nivel da 58', totalNiveles === 58, 'sumo ' + totalNiveles);
  verificar('los porcentajes suman ~100',
    Math.abs((resultados[10] || []).reduce((a, f) => a + Number(f.porcentaje), 0) - 100) < 0.5);
  verificar('los cuatro niveles aparecen en los datos de prueba',
    (resultados[10] || []).length === 4, (resultados[10] || []).length + ' niveles');
  verificar('ningun nivel sale sin traducir',
    (resultados[10] || []).every((f) => /^\d\. /.test(f.nivel)),
    JSON.stringify((resultados[10] || []).map((f) => f.nivel)));

  // --- Ninguna consulta debe arrastrar columnas viejas ---
  // Es la comprobacion que motivo este cambio: la migracion 002 dejo
  // nombre, apellidos y puesto en NULL, y cualquier consulta que
  // siguiera usandolas mostraria campos vacios el dia del evento.
  console.log('\n[*] Rastros de columnas viejas');
  const sqlCompleto = bloques.map((b) => b.sql).join('\n');
  for (const vieja of ['apellido_pat', 'apellido_mat', 'p.puesto', 'w.nombre,']) {
    verificar('ninguna consulta usa ' + vieja, !sqlCompleto.includes(vieja));
  }
  const exportado = resultados[6]?.[0] || {};
  verificar('el export trae nombre_completo con contenido',
    !!exportado.nombre_completo, JSON.stringify(exportado.nombre_completo));
  verificar('el export trae el diagnostico traducido',
    !!exportado.nivel_exposicion && !!exportado.garantia_que_usa,
    JSON.stringify([exportado.nivel_exposicion, exportado.garantia_que_usa]));

  // ==========================================================
  console.log('\n============================================================');
  if (fallos.length === 0) {
    console.log('TODO CORRECTO: ' + (bloques.length - 1) + ' bloques ejecutan y la logica da lo esperado.');
  } else {
    console.log('FALLARON ' + fallos.length + ' verificacion(es):');
    for (const f of fallos) console.log('  - ' + f);
  }
  console.log('============================================================');

  await conn.end();
  process.exit(fallos.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[check] Error inesperado:', e.message);
  process.exit(1);
});
