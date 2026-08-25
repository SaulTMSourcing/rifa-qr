-- =====================================================================
-- Migracion 002: Tiburometro y nuevo formulario
-- =====================================================================
-- QUE HACE
--   1. Agrega las columnas del nuevo formulario (nombre completo en un
--      solo campo, monto promedio de creditos).
--   2. Agrega las columnas del diagnostico del Tiburometro.
--   3. Afloja las columnas viejas que el formulario ya no captura.
--
-- POR QUE LAS VIEJAS SE AFLOJAN EN VEZ DE BORRARSE
--   nombre, apellido_pat, apellido_mat y puesto pasan a aceptar NULL,
--   pero NO se eliminan. Asi:
--     - no se pierde ningun dato ya capturado,
--     - si hubiera que revertir el backend a la version anterior, las
--       columnas siguen ahi y la app vieja funciona,
--     - el cambio es reversible durante el evento, que es cuando no
--       hay margen para equivocarse.
--   Se pueden borrar despues del evento, con calma.
--
-- CUANDO EJECUTARLA
--   ANTES de subir el backend nuevo. Su INSERT ya escribe en las
--   columnas nuevas: si el backend nuevo corre contra una base sin
--   migrar, TODOS los registros fallaran con "Unknown column".
--
-- COMO EJECUTARLA
--   Son CUATRO pasos y se corren por separado, no de un jalon.
--   phpMyAdmin -> selecciona la base del evento -> pestana "SQL".
--
--   No se usa information_schema para detectar que falta: en el
--   hosting compartido de Hostinger ese acceso esta denegado
--   (error #1044). Ver la nota al final de migrations/001.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1 de 4: ver que columnas existen hoy
-- ---------------------------------------------------------------------
-- Copia y ejecuta SOLO esta consulta. Sirve para saber en que estado
-- esta la tabla antes de tocarla.
--
--   Si YA aparecen nombre_completo y monto_promedio -> la migracion
--   ya se aplico. No ejecutes los pasos 2 y 3.
-- ---------------------------------------------------------------------

SHOW COLUMNS FROM participantes;


-- ---------------------------------------------------------------------
-- PASO 2 de 4: agregar las columnas nuevas
-- ---------------------------------------------------------------------
-- Copia y ejecuta SOLO esta instruccion.
--
-- Si por error la ejecutas cuando las columnas ya existen, MySQL
-- responde:
--
--     #1060 - Duplicate column name 'nombre_completo'
--
-- Ese error es inofensivo: significa que el trabajo ya estaba hecho y
-- no se modifico nada.
--
-- Se dejan como NULL a proposito: las filas que ya existen no tienen
-- estos datos, y una columna NOT NULL sin valor por defecto haria
-- fallar el ALTER. El paso 3 rellena nombre_completo.
-- ---------------------------------------------------------------------

ALTER TABLE participantes
  ADD COLUMN nombre_completo    VARCHAR(300)     NULL AFTER id,
  ADD COLUMN monto_promedio     VARCHAR(40)      NULL AFTER empresa,
  ADD COLUMN q1_garantia        TINYINT UNSIGNED NULL,
  ADD COLUMN q2_cartera_vencida TINYINT UNSIGNED NULL,
  ADD COLUMN q3_recuperacion    TINYINT UNSIGNED NULL,
  ADD COLUMN puntaje_total      TINYINT UNSIGNED NULL,
  ADD COLUMN nivel_exposicion   VARCHAR(20)      NULL;


-- ---------------------------------------------------------------------
-- PASO 3 de 4: rellenar nombre_completo y aflojar las columnas viejas
-- ---------------------------------------------------------------------
-- Copia y ejecuta las DOS instrucciones de este bloque.
--
-- La primera arma nombre_completo juntando los campos que ya existian,
-- para no perder los registros previos. CONCAT_WS ignora los NULL, asi
-- que funciona aunque alguna fila tenga apellidos vacios.
--
-- La segunda permite NULL en las columnas que el formulario nuevo ya
-- no captura. Es lo que hace que el INSERT del backend nuevo, que ya
-- no las menciona, no reviente contra la restriccion NOT NULL.
-- ---------------------------------------------------------------------

UPDATE participantes
   SET nombre_completo = TRIM(CONCAT_WS(' ', nombre, apellido_pat, apellido_mat))
 WHERE nombre_completo IS NULL;

ALTER TABLE participantes
  MODIFY nombre       VARCHAR(150) NULL,
  MODIFY apellido_pat VARCHAR(150) NULL,
  MODIFY apellido_mat VARCHAR(150) NULL,
  MODIFY puesto       VARCHAR(150) NULL;


-- ---------------------------------------------------------------------
-- PASO 4 de 4: verificar
-- ---------------------------------------------------------------------
-- Copia y ejecuta esta consulta. Debe mostrar:
--
--   nombre_completo    varchar(300)  YES  (o NO, ambos estan bien)
--   monto_promedio     varchar(40)   YES
--   q1_garantia        tinyint...    YES
--   q2_cartera_vencida tinyint...    YES
--   q3_recuperacion    tinyint...    YES
--   puntaje_total      tinyint...    YES
--   nivel_exposicion   varchar(20)   YES
--   nombre             varchar(150)  YES   <- antes era NO
--   apellido_pat       varchar(150)  YES   <- antes era NO
--   apellido_mat       varchar(150)  YES   <- antes era NO
--   puesto             varchar(150)  YES   <- antes era NO
--
-- La columna "Null" en YES significa que acepta nulos.
-- ---------------------------------------------------------------------

SHOW COLUMNS FROM participantes;
