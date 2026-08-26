-- =====================================================================
-- Sorteo de los 23 premios  --  Tiburometro ASOFOM 2026
-- =====================================================================
-- Se ejecuta el VIERNES, despues de cerrar los registros.
--
-- COMO SE CIERRA EL REGISTRO
--   En el panel de Hostinger, en las variables de la app Node:
--       REGISTRO_ABIERTO=false
--   y se reinicia la aplicacion. A partir de ese momento la app
--   muestra "El registro ya cerro" y el endpoint rechaza cualquier
--   intento. Al arrancar, el servidor imprime si esta abierto o
--   cerrado, para poder confirmarlo de un vistazo.
--
-- POR QUE ESTE ORDEN IMPORTA
--   El sorteo se hace sobre la lista REAL de participantes. Si
--   alguien se registrara despues de sortear, no estaria en la lista
--   de la que salieron los ganadores y no podria ganar nada.
--   Cerrar primero, sortear despues.
--
-- LA GRAN VENTAJA DE SORTEAR AL FINAL
--   Se elige entre los IDs que EXISTEN, no entre un rango de
--   numeros. Los numeros quemados por registros fallidos ya no
--   importan, y los 23 premios se entregan siempre. Eso no era
--   posible con premios fijados de antemano.
--
-- PASOS
--   1. Confirmar que el registro cerro y cuanta gente entro
--   2. Sortear los 23 ganadores
--   3. Guardar el resultado
--   4. Imprimir la lista para el stand
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1: cuanta gente se registro
-- ---------------------------------------------------------------------
-- Antes de sortear, confirma que el numero cuadra con lo que
-- esperabas y que ya nadie mas esta entrando.
-- ---------------------------------------------------------------------

SELECT
  COUNT(*)                AS participantes,
  MIN(id)                 AS primer_numero,
  MAX(id)                 AS ultimo_numero,
  MAX(fecha_registro)     AS ultimo_registro
FROM participantes;


-- ---------------------------------------------------------------------
-- PASO 2: sortear los 23 ganadores
-- ---------------------------------------------------------------------
-- Elige 23 participantes al azar de entre los que SI existen.
--
-- Ejecuta esta consulta y REVISA el resultado antes de continuar.
-- Cada vez que se corre da un resultado distinto: el sorteo bueno es
-- el que decidas conservar, asi que no la vuelvas a correr despues
-- de haber guardado.
--
-- El orden de los premios en la lista es el orden en que se asignan:
-- primero las tres becas del 100%, luego las seis del 50%, luego los
-- ocho bonos Sin Escalas y al final los seis de Garantia.
-- ---------------------------------------------------------------------

SELECT
  ROW_NUMBER() OVER ()    AS orden,
  id                      AS numero_ganador,
  nombre_completo,
  empresa,
  correo
FROM (
  SELECT id, nombre_completo, empresa, correo
  FROM participantes
  ORDER BY RAND()
  LIMIT 23
) AS sorteo
ORDER BY orden;


-- ---------------------------------------------------------------------
-- PASO 3: guardar el resultado
-- ---------------------------------------------------------------------
-- Toma los 23 numeros del paso 2 y sustituyelos abajo, en el mismo
-- orden en que salieron. Los textos de los premios ya estan puestos.
--
-- Guardar el sorteo sirve para dos cosas: que el personal del stand
-- pueda verificar a un ganador con la consulta del paso 4, y que
-- quede constancia de quien gano que.
--
-- El UPDATE final marca a esas personas como ganadoras en su propio
-- registro, para que el export de admin.sql las muestre.
-- ---------------------------------------------------------------------

-- Limpia cualquier sorteo previo (por si se ensayo antes)
UPDATE participantes SET es_ganador = FALSE;
DELETE FROM numeros_ganadores;

INSERT INTO numeros_ganadores (numero, premio, reclamado, participante_id, fecha_reclamo) VALUES
  -- Becas 100% (3)
  ( /*1*/ 0, 'Beca 100% — Diplomado Gestión de SOFOMES',                        TRUE, /*1*/ 0, NOW()),
  ( /*2*/ 0, 'Beca 100% — Diplomado Administración y Manejo de Fideicomisos',   TRUE, /*2*/ 0, NOW()),
  ( /*3*/ 0, 'Beca 100% — Diplomado Family Office',                             TRUE, /*3*/ 0, NOW()),
  -- Becas 50% (6)
  ( /*4*/ 0, 'Beca 50% — Diplomado Gestión de SOFOMES',                         TRUE, /*4*/ 0, NOW()),
  ( /*5*/ 0, 'Beca 50% — Diplomado Gestión de SOFOMES',                         TRUE, /*5*/ 0, NOW()),
  ( /*6*/ 0, 'Beca 50% — Diplomado Administración y Manejo de Fideicomisos',    TRUE, /*6*/ 0, NOW()),
  ( /*7*/ 0, 'Beca 50% — Diplomado Administración y Manejo de Fideicomisos',    TRUE, /*7*/ 0, NOW()),
  ( /*8*/ 0, 'Beca 50% — Diplomado Family Office',                              TRUE, /*8*/ 0, NOW()),
  ( /*9*/ 0, 'Beca 50% — Diplomado Family Office',                              TRUE, /*9*/ 0, NOW()),
  -- Fideicomiso Sin Escalas, 100% de descuento (8)
  (/*10*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*10*/ 0, NOW()),
  (/*11*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*11*/ 0, NOW()),
  (/*12*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*12*/ 0, NOW()),
  (/*13*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*13*/ 0, NOW()),
  (/*14*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*14*/ 0, NOW()),
  (/*15*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*15*/ 0, NOW()),
  (/*16*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*16*/ 0, NOW()),
  (/*17*/ 0, '100% de descuento — Fideicomiso Sin Escalas',                     TRUE,/*17*/ 0, NOW()),
  -- Fideicomiso de Garantia, 50% de descuento (6)
  (/*18*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*18*/ 0, NOW()),
  (/*19*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*19*/ 0, NOW()),
  (/*20*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*20*/ 0, NOW()),
  (/*21*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*21*/ 0, NOW()),
  (/*22*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*22*/ 0, NOW()),
  (/*23*/ 0, '50% de descuento — Fideicomiso de Garantía',                      TRUE,/*23*/ 0, NOW());

-- Marca a los ganadores en su propio registro
UPDATE participantes
   SET es_ganador = TRUE
 WHERE id IN (SELECT participante_id FROM numeros_ganadores);


-- ---------------------------------------------------------------------
-- PASO 4: la lista para el stand
-- ---------------------------------------------------------------------
-- Imprime esto o dejalo abierto en el celular. Es lo que se usa para
-- entregar los premios y para verificar a quien llegue diciendo que
-- gano.
-- ---------------------------------------------------------------------

SELECT
  g.numero                AS numero,
  p.nombre_completo,
  p.empresa,
  p.telefono,
  g.premio
FROM numeros_ganadores g
JOIN participantes p ON p.id = g.participante_id
ORDER BY g.premio, g.numero;


-- ---------------------------------------------------------------------
-- VERIFICACION: que el sorteo quedo bien
-- ---------------------------------------------------------------------
-- Debe devolver: 23 premios, 23 personas distintas, 0 sin asignar.
-- Si "personas_distintas" fuera menor que 23, alguien salio repetido
-- y hay que revisar los numeros que se pegaron en el paso 3.
-- ---------------------------------------------------------------------

SELECT
  COUNT(*)                                AS premios,
  COUNT(DISTINCT participante_id)         AS personas_distintas,
  SUM(participante_id IS NULL)            AS sin_asignar,
  SUM(numero <> participante_id)          AS numero_no_coincide
FROM numeros_ganadores;


-- =====================================================================
-- SI ALGUIEN NO SE PRESENTA A RECOGER SU PREMIO
-- =====================================================================
-- Para sacar un suplente, excluyendo a quienes ya ganaron:
--
--   SELECT id, nombre_completo, empresa, telefono
--   FROM participantes
--   WHERE es_ganador = FALSE
--   ORDER BY RAND()
--   LIMIT 1;
--
-- Si lo usas, acuerdate de actualizar numeros_ganadores y
-- participantes.es_ganador para que la lista del stand siga
-- cuadrando.
-- =====================================================================
