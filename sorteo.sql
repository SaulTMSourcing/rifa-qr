-- =====================================================================
-- Sorteo de los 3 premios  --  Tiburometro ASOFOM 2026
-- =====================================================================
-- Se ejecuta el VIERNES, despues de cerrar los registros.
--
-- LOS 3 PREMIOS
--   1. Beca 100% - Diplomado Gestion de SOFOMES
--   2. Beca 50%  - Diplomado de Administracion y Manejo de Fideicomisos
--   3. Bono 100% - Fideicomiso Sin Escalas (honorarios de aceptacion)
--
-- COMO SE CIERRA EL REGISTRO
--   En el panel de Hostinger, en las variables de la app Node:
--       REGISTRO_ABIERTO=false
--   y se reinicia la aplicacion. La app pasa a mostrar "El registro
--   ya cerro" y el endpoint rechaza cualquier intento. Al arrancar,
--   el servidor imprime si quedo abierto o cerrado.
--
-- POR QUE ESTE ORDEN IMPORTA
--   El sorteo se hace sobre la lista REAL de participantes. Si
--   alguien se registrara despues, no estaria en la lista de la que
--   salieron los ganadores. Cerrar primero, sortear despues.
--
-- LA VENTAJA DE SORTEAR AL FINAL
--   Se elige entre los IDs que EXISTEN, no entre un rango de numeros.
--   Los numeros que se queman en registros fallidos (por correo
--   repetido) dejan de importar, y los 3 premios se entregan siempre.
--
-- PASOS
--   1. Confirmar cuanta gente se registro
--   2. Sortear y guardar (una sola instruccion)
--   3. Ver quien gano
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1: cuanta gente se registro
-- ---------------------------------------------------------------------
-- Confirma que el numero cuadra con lo esperado y que ya nadie mas
-- esta entrando. Si "participantes" fuera menor que 3, no hay a quien
-- darle los premios: revisa antes de continuar.
-- ---------------------------------------------------------------------

SELECT
  COUNT(*)             AS participantes,
  MIN(id)              AS primer_numero,
  MAX(id)              AS ultimo_numero,
  MAX(fecha_registro)  AS ultimo_registro
FROM participantes;


-- ---------------------------------------------------------------------
-- PASO 2: sortear y guardar
-- ---------------------------------------------------------------------
-- Copia y ejecuta las CUATRO instrucciones de este bloque, en orden.
-- Puedes pegarlas todas juntas: phpMyAdmin las ejecuta en secuencia.
--
-- Con solo 3 premios el sorteo se resuelve dentro del propio INSERT:
-- no hay que copiar numeros a mano de una consulta a otra, que es
-- justo donde se cometen errores con prisa.
--
-- ORDER BY RAND() LIMIT 3 elige tres participantes al azar, y
-- ROW_NUMBER() los numera 1, 2 y 3 para asignarles su premio.
--
-- NOTA TECNICA: la numeracion NO puede hacerse con una variable de
-- usuario (@fila := @fila + 1). Se probo y falla: MySQL 8 incrementa
-- la variable por cada fila que ESCANEA, no por cada fila que
-- devuelve tras el LIMIT, asi que con 58 participantes salian
-- valores como 45, 39 y 12. El CASE no encontraba coincidencia y los
-- tres premios quedaban en NULL. ROW_NUMBER() numera las filas que
-- realmente salen.
--
-- SOLO SE EJECUTA UNA VEZ. Cada corrida da un resultado distinto y
-- pisa el anterior: el sorteo bueno es el primero que corras.
-- ---------------------------------------------------------------------

-- Limpia cualquier ensayo previo
UPDATE participantes SET es_ganador = FALSE;
DELETE FROM numeros_ganadores;

-- Sortea 3 participantes y les asigna un premio a cada uno
INSERT INTO numeros_ganadores (numero, premio, reclamado, participante_id, fecha_reclamo)
SELECT
  s.id,
  CASE s.orden
    WHEN 1 THEN 'Beca 100% — Diplomado Gestión de SOFOMES'
    WHEN 2 THEN 'Beca 50% — Diplomado de Administración y Manejo de Fideicomisos'
    WHEN 3 THEN '100% de descuento — Fideicomiso Sin Escalas'
  END,
  TRUE,
  s.id,
  NOW()
FROM (
  SELECT id, ROW_NUMBER() OVER () AS orden
  FROM (
    SELECT id FROM participantes ORDER BY RAND() LIMIT 3
  ) AS elegidos
) AS s;

-- Marca a esas tres personas como ganadoras en su propio registro
UPDATE participantes
   SET es_ganador = TRUE
 WHERE id IN (SELECT participante_id FROM numeros_ganadores);


-- ---------------------------------------------------------------------
-- PASO 3: quien gano
-- ---------------------------------------------------------------------
-- Esta es la lista para el stand. Imprimela o dejala abierta en el
-- celular: sirve para entregar los premios y para verificar a quien
-- llegue diciendo que gano.
-- ---------------------------------------------------------------------

SELECT
  g.numero          AS numero_ganador,
  g.premio,
  p.nombre_completo,
  p.empresa,
  p.telefono,
  p.correo
FROM numeros_ganadores g
JOIN participantes p ON p.id = g.participante_id
ORDER BY g.premio;


-- ---------------------------------------------------------------------
-- VERIFICACION
-- ---------------------------------------------------------------------
-- Debe devolver: 3 premios, 3 personas distintas, 0 sin asignar y
-- 0 sin premio. Si "personas_distintas" fuera menor que 3, alguien
-- salio repetido y hay que volver a correr el paso 2.
-- ---------------------------------------------------------------------

SELECT
  COUNT(*)                          AS premios,
  COUNT(DISTINCT participante_id)   AS personas_distintas,
  SUM(participante_id IS NULL)      AS sin_asignar,
  SUM(premio IS NULL)               AS sin_premio
FROM numeros_ganadores;


-- =====================================================================
-- SI ALGUIEN NO SE PRESENTA A RECOGER SU PREMIO
-- =====================================================================
-- Para sacar un suplente al azar, excluyendo a quienes ya ganaron:
--
--   SELECT id, nombre_completo, empresa, telefono
--   FROM participantes
--   WHERE es_ganador = FALSE
--   ORDER BY RAND()
--   LIMIT 1;
--
-- Si lo usas, acuerdate de actualizar numeros_ganadores (numero y
-- participante_id) y participantes.es_ganador, para que la lista del
-- stand siga cuadrando.
-- =====================================================================
