// ============================================================
// backend/scripts/sandbox-setup.js
// ------------------------------------------------------------
// Monta una base de datos LOCAL de pruebas (sandbox), separada de
// la de produccion en Hostinger.
//
// Que hace:
//   1. Se conecta al MySQL local usando backend/.env.sandbox
//   2. Crea la base si no existe
//   3. Carga schema.sql (es idempotente)
//   4. Siembra datos de prueba que cubren TODOS los estados que
//      las consultas de admin.sql deben saber distinguir
//
// Uso:
//   node scripts/sandbox-setup.js
//
// Es idempotente: se puede correr las veces que haga falta. Cada
// corrida deja la base en el mismo estado conocido.
//
// IMPORTANTE: este script NUNCA imprime credenciales.
// ============================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONTOS, calcularDiagnostico } from '../src/utils/tiburometro.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizBackend = path.resolve(aqui, '..');
const raizProyecto = path.resolve(raizBackend, '..');

// ------------------------------------------------------------
// Configuracion: se lee de .env.sandbox, NO del .env normal.
// Asi es imposible apuntar a produccion por accidente.
// ------------------------------------------------------------
const rutaEnv = path.join(raizBackend, '.env.sandbox');
if (!fs.existsSync(rutaEnv)) {
  console.error('[sandbox] No existe backend/.env.sandbox');
  process.exit(1);
}
dotenv.config({ path: rutaEnv, quiet: true });

const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// ------------------------------------------------------------
// Guarda de seguridad: si esto no apunta a la maquina local,
// abortamos. Evita que un copy-paste desafortunado del .env de
// produccion termine sembrando datos falsos en el evento real.
// ------------------------------------------------------------
const ESTE_EQUIPO = ['127.0.0.1', 'localhost', '::1'];
if (!ESTE_EQUIPO.includes(String(cfg.host).toLowerCase())) {
  console.error('[sandbox] ABORTADO: DB_HOST no es local, es "' + cfg.host + '".');
  console.error('[sandbox] Este script solo puede correr contra el MySQL de esta maquina.');
  process.exit(1);
}
if (!cfg.password) {
  console.error('[sandbox] Falta DB_PASSWORD en backend/.env.sandbox.');
  console.error('[sandbox] Escribe ahi la contrasena de root de tu MySQL local.');
  process.exit(1);
}

// ============================================================
// Datos de prueba
// ------------------------------------------------------------
// Se disenan a proposito para producir los CUATRO estados que la
// consulta 2 de admin.sql debe distinguir. Numeros premiados que
// trae schema.sql: 5, 12, 25, 50, 100.
//
//   numero 5   -> participante existe y premio reclamado  = ENTREGADO
//   numero 12  -> participante existe, premio SIN marcar  = REVISAR
//   numero 25  -> ID quemado (nadie lo tiene)             = PERDIDO
//   numero 50  -> participante existe y premio reclamado  = ENTREGADO
//   numero 100 -> por encima del ultimo registro          = PENDIENTE
//
// Los IDs 25 y 37 se saltan a proposito: simulan registros que
// fallaron (por ejemplo, correo duplicado) y quemaron su numero.
// ============================================================
const TOTAL = 60;
const IDS_QUEMADOS = [25, 37];
const GANADORES_RECLAMADOS = [5, 50];

const NOMBRES = ['Irving Alejandro', 'Maria Fernanda', 'Jose Luis', 'Ana Sofia', 'Carlos Eduardo',
  'Gabriela', 'Ricardo', 'Diana Laura', 'Miguel Angel', 'Paulina', 'Fernando', 'Alejandra'];
const PATERNOS = ['Garcia', 'Hernandez', 'Lopez', 'Martinez', 'Gonzalez', 'de la Torre',
  'Ramirez', 'Sanchez', 'del Valle', 'Torres', 'Flores', 'Rivera'];
const MATERNOS = ['Pena', 'Vargas', 'Mendoza', 'Castillo', 'Ortiz', 'Guerrero',
  'Navarro', 'Rojas', 'Campos', 'Delgado', 'Ibarra', 'Solis'];
const EMPRESAS = ['TMSourcing', 'Lextech', 'CLICK Seguridad Juridica', 'Financiera del Norte',
  'SOFOM Progreso', 'Credito Regional', 'Grupo Aval', 'Fintech MX'];

const CLAVES_MONTO = Object.keys(MONTOS);

// Fecha base fija: los datos deben ser reproducibles entre corridas.
const INICIO = new Date('2026-07-27T09:00:00Z');

function participante(id, indice) {
  // El formulario captura el nombre en un solo campo; aqui se arma
  // igual, a partir de las listas, para que parezca real.
  const nombreCompleto = [
    NOMBRES[indice % NOMBRES.length],
    PATERNOS[indice % PATERNOS.length],
    MATERNOS[(indice * 3) % MATERNOS.length],
  ].join(' ');

  // Registros repartidos a lo largo de ~4 horas, para que la
  // consulta de ritmo por hora tenga algo que mostrar.
  const fecha = new Date(INICIO.getTime() + indice * 4 * 60 * 1000);

  // Las tres respuestas avanzan como los digitos de un contador en
  // base 4: q1 cambia en cada registro, q2 cada 4, q3 cada 16. Asi
  // los primeros 64 participantes recorren TODAS las combinaciones
  // posibles sin repetir, y los cuatro niveles del Tiburometro
  // quedan representados en los datos de prueba.
  //
  // Un intento previo usaba multiplicadores (indice*3, indice*7) y
  // fallaba: 7 y 3 son congruentes modulo 4, asi que q3 salia
  // siempre igual a q2 y solo se generaban 4 combinaciones, dejando
  // dos niveles sin ningun caso.
  const respuestas = {
    q1_garantia: (indice % 4) + 1,
    q2_cartera_vencida: (Math.floor(indice / 4) % 4) + 1,
    q3_recuperacion: (Math.floor(indice / 16) % 4) + 1,
  };

  // Se usa la MISMA funcion que el backend en produccion, para que
  // los datos sembrados no puedan contradecir la logica real.
  const diagnostico = calcularDiagnostico(respuestas);

  return [
    id,
    nombreCompleto,
    EMPRESAS[indice % EMPRESAS.length],
    MONTOS[CLAVES_MONTO[indice % CLAVES_MONTO.length]],
    // Telefono de 10 digitos, formato Mexico
    '55' + String(10000000 + indice * 137).slice(0, 8),
    'prueba' + id + '@ejemplo-sandbox.mx',
    respuestas.q1_garantia,
    respuestas.q2_cartera_vencida,
    respuestas.q3_recuperacion,
    diagnostico.puntaje,
    diagnostico.nivel,
    GANADORES_RECLAMADOS.includes(id) ? 1 : 0,
    fecha.toISOString().slice(0, 19).replace('T', ' '),
    '187.190.0.' + (indice % 250 + 1),
    // Todo registro real pasa por el checkbox obligatorio del
    // aviso de privacidad, asi que los datos de prueba lo reflejan.
    1,
  ];
}

// ============================================================
async function main() {
  console.log('[sandbox] Conectando a MySQL local (' + cfg.host + ':' + cfg.port + ')...');

  // Primera conexion SIN base seleccionada: aun podria no existir.
  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true,
    });
  } catch (e) {
    console.error('[sandbox] No se pudo conectar:', e.code, '-', e.message);
    if (e.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[sandbox] Revisa DB_USER y DB_PASSWORD en backend/.env.sandbox.');
    }
    process.exit(1);
  }
  console.log('[sandbox] Conexion establecida.');

  // --- 1. Crear la base ---
  await conn.query(
    'CREATE DATABASE IF NOT EXISTS `' + cfg.database + '` ' +
    'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await conn.changeUser({ database: cfg.database });
  console.log('[sandbox] Base "' + cfg.database + '" lista.');

  // --- 2. Cargar el esquema real del proyecto ---
  const schema = fs.readFileSync(path.join(raizProyecto, 'schema.sql'), 'utf8');
  await conn.query(schema);
  console.log('[sandbox] schema.sql cargado (tablas + numeros ganadores semilla).');

  // --- 3. Limpiar para dejar un estado conocido ---
  // El orden importa: primero se sueltan las referencias de
  // numeros_ganadores, luego se borran los participantes.
  await conn.query(
    'UPDATE numeros_ganadores SET reclamado = FALSE, participante_id = NULL, fecha_reclamo = NULL'
  );
  await conn.query('DELETE FROM participantes');
  await conn.query('ALTER TABLE participantes AUTO_INCREMENT = 1');

  // --- 4. Sembrar participantes, saltando los IDs quemados ---
  const filas = [];
  let indice = 0;
  for (let id = 1; id <= TOTAL; id++) {
    if (IDS_QUEMADOS.includes(id)) continue;
    filas.push(participante(id, indice));
    indice++;
  }
  await conn.query(
    'INSERT INTO participantes (id, nombre_completo, empresa, monto_promedio,' +
    ' telefono, correo, q1_garantia, q2_cartera_vencida, q3_recuperacion,' +
    ' puntaje_total, nivel_exposicion, es_ganador, fecha_registro, ip_origen,' +
    ' acepto_privacidad) VALUES ?',
    [filas]
  );
  console.log('[sandbox] ' + filas.length + ' participantes sembrados (IDs ' +
    IDS_QUEMADOS.join(' y ') + ' omitidos a proposito).');

  // El contador debe quedar justo despues del ultimo ID usado,
  // como si el evento siguiera en curso.
  await conn.query('ALTER TABLE participantes AUTO_INCREMENT = ' + (TOTAL + 1));

  // --- 5. Marcar los premios efectivamente reclamados ---
  for (const numero of GANADORES_RECLAMADOS) {
    await conn.query(
      'UPDATE numeros_ganadores SET reclamado = TRUE, participante_id = ?,' +
      ' fecha_reclamo = (SELECT fecha_registro FROM participantes WHERE id = ?)' +
      ' WHERE numero = ?',
      [numero, numero, numero]
    );
  }
  console.log('[sandbox] Premios reclamados marcados: numeros ' + GANADORES_RECLAMADOS.join(', ') + '.');

  // --- 6. Resumen de lo que quedo montado ---
  const [[r]] = await conn.query(
    'SELECT COUNT(*) AS registrados, MAX(id) AS ultimo FROM participantes'
  );
  console.log('');
  console.log('[sandbox] LISTO. Registrados: ' + r.registrados + ', ultimo numero: ' + r.ultimo + '.');
  console.log('[sandbox] Escenarios esperados en admin.sql consulta 2:');
  console.log('           numero 5   -> ENTREGADO');
  console.log('           numero 12  -> REVISAR   (participante existe, premio sin marcar)');
  console.log('           numero 25  -> PERDIDO   (ID quemado)');
  console.log('           numero 50  -> ENTREGADO');
  console.log('           numero 100 -> PENDIENTE (faltan ' + (100 - r.ultimo) + ' registros)');

  await conn.end();
}

main().catch((e) => {
  console.error('[sandbox] Error inesperado:', e.message);
  process.exit(1);
});
