// ============================================================
// backend/src/controllers/registroController.js
// ------------------------------------------------------------
// Logica del endpoint POST /api/registrar.
//
// Responsabilidades:
//   1. Normalizar y validar datos (delega a utils/normalizar.js)
//   2. Insertar participante (AUTO_INCREMENT da el numero de rifa)
//   3. Verificar si ese numero es ganador (consulta a BD)
//   4. Si es ganador: marcar reclamado en transaccion atomica
//   5. Responder al frontend con resultado estructurado
//
// Concurrencia:
//   - SELECT FOR UPDATE bloquea la fila del premio mientras
//     decidimos. Previene doble reclamo en eventos simultaneos.
//   - Todo dentro de una transaccion: si algo falla, ROLLBACK.
//
// Seguridad:
//   - La lista completa de numeros ganadores NUNCA sale del backend.
//   - El frontend solo recibe SU resultado (gano o no).
//   - El premio solo viaja en la respuesta si ese registro especifico
//     es ganador.
// ============================================================

import pool from '../config/db.js';
import { normalizarRegistro } from '../utils/normalizar.js';

// ------------------------------------------------------------
// registrarParticipante: handler de POST /api/registrar
// ------------------------------------------------------------
export async function registrarParticipante(req, res) {
  // ----------------------------------------------------------
  // 1. Normalizacion y validacion
  // ----------------------------------------------------------
  let datos;
  try {
    datos = normalizarRegistro(req.body);
  } catch (errorValidacion) {
    // El modulo normalizar lanza { campo, mensaje }
    return res.status(400).json({
      ok: false,
      error: 'datos_invalidos',
      campo: errorValidacion.campo,
      mensaje: errorValidacion.mensaje,
    });
  }

  // IP del cliente para auditoria (req.ip respeta trust proxy)
  const ipOrigen = req.ip || null;

  // ----------------------------------------------------------
  // 2. Operacion transaccional
  // ----------------------------------------------------------
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ------------------------------------------------------
    // 2a. INSERT del participante.
    // AUTO_INCREMENT asigna el ID atomicamente.
    // ------------------------------------------------------
    const [resultadoInsert] = await connection.execute(
      `INSERT INTO participantes
         (nombre, apellido_pat, apellido_mat, empresa, puesto,
          telefono, correo, ip_origen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.nombre,
        datos.apellido_pat,
        datos.apellido_mat,
        datos.empresa,
        datos.puesto,
        datos.telefono,
        datos.correo,
        ipOrigen,
      ]
    );

    const numeroRegistro = resultadoInsert.insertId;

    // ------------------------------------------------------
    // 2b. Verificar si el numero es ganador.
    // SELECT ... FOR UPDATE bloquea la fila si existe, para
    // evitar que otro request reclame el mismo premio en paralelo.
    // Solo consideramos ganador si reclamado = FALSE.
    // ------------------------------------------------------
    const [filasGanador] = await connection.execute(
      `SELECT numero, premio, reclamado
         FROM numeros_ganadores
        WHERE numero = ? AND reclamado = FALSE
        FOR UPDATE`,
      [numeroRegistro]
    );

    let esGanador = false;
    let premio = null;

    if (filasGanador.length > 0) {
      // ----------------------------------------------------
      // 2c. Marcar premio como reclamado y flag en participante
      // ----------------------------------------------------
      esGanador = true;
      premio = filasGanador[0].premio;

      await connection.execute(
        `UPDATE numeros_ganadores
            SET reclamado = TRUE,
                participante_id = ?,
                fecha_reclamo = CURRENT_TIMESTAMP
          WHERE numero = ?`,
        [numeroRegistro, numeroRegistro]
      );

      await connection.execute(
        `UPDATE participantes
            SET es_ganador = TRUE
          WHERE id = ?`,
        [numeroRegistro]
      );
    }

    // ------------------------------------------------------
    // 2d. Commit: confirmamos toda la operacion
    // ------------------------------------------------------
    await connection.commit();

    // ------------------------------------------------------
    // 3. Respuesta al frontend
    // ------------------------------------------------------
    // Nota: solo enviamos el premio si ESTE registro lo gano.
    // Nunca exponemos la lista completa ni cuales numeros faltan.
    // ------------------------------------------------------
    return res.status(201).json({
      ok: true,
      numeroRegistro,
      esGanador,
      premio: esGanador ? premio : null,
      mensaje: esGanador
        ? 'Felicidades, has ganado un premio.'
        : 'Registro exitoso. Gracias por participar.',
    });
  } catch (error) {
    // Rollback si algo fallo dentro de la transaccion
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[registrar] Error en rollback:', rollbackError.message);
      }
    }

    // ------------------------------------------------------
    // Manejo de error: correo duplicado
    // MySQL devuelve ER_DUP_ENTRY (codigo 1062) cuando viola
    // el UNIQUE de correo.
    // ------------------------------------------------------
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        error: 'correo_duplicado',
        campo: 'correo',
        mensaje: 'Este correo ya esta registrado.',
      });
    }

    // ------------------------------------------------------
    // Error inesperado: log detallado en servidor, mensaje
    // generico al cliente (no exponer interna de la BD).
    // ------------------------------------------------------
    console.error('[registrar] Error inesperado:');
    console.error('     code:', error.code);
    console.error('     message:', error.message);
    console.error('     stack:', error.stack);

    return res.status(500).json({
      ok: false,
      error: 'error_servidor',
      mensaje: 'Ocurrio un error al procesar el registro. Intenta de nuevo.',
    });
  } finally {
    if (connection) connection.release();
  }
}
