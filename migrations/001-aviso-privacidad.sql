-- =====================================================================
-- Migracion 001: constancia del aviso de privacidad
-- =====================================================================
-- QUE HACE
--   Agrega la columna `acepto_privacidad` a la tabla participantes.
--
-- POR QUE
--   La LFPDPPP obliga a recabar el consentimiento del titular antes
--   de tratar sus datos personales. El formulario ya lo pide con un
--   checkbox obligatorio; esta columna deja la constancia en la base.
--
-- CUANDO EJECUTARLA
--   ANTES de subir la version del backend que incluye el checkbox.
--   El INSERT de esa version ya escribe en esta columna: si el
--   backend nuevo corre contra una base sin migrar, TODOS los
--   registros fallaran con "Unknown column".
--
--   Las bases creadas desde cero con schema.sql ya traen la columna
--   y NO necesitan esta migracion (correrla igual no hace dano).
--
-- COMO EJECUTARLA
--   phpMyAdmin -> selecciona la base del evento -> pestana "SQL" ->
--   pega este archivo completo -> Continuar.
--
-- ES SEGURA DE REPETIR
--   Comprueba primero si la columna existe. Si ya esta, no hace nada
--   y devuelve un mensaje. Se puede correr las veces que sea.
-- =====================================================================

SET @existe := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'participantes'
    AND COLUMN_NAME  = 'acepto_privacidad'
);

SET @sql := IF(
  @existe = 0,
  'ALTER TABLE participantes
     ADD COLUMN acepto_privacidad BOOLEAN NOT NULL DEFAULT FALSE
     AFTER ip_origen',
  'SELECT ''La columna acepto_privacidad ya existe. No se hizo ningun cambio.'' AS resultado'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Verificacion: confirma como quedo la columna.
-- ---------------------------------------------------------------------
SELECT
  COLUMN_NAME    AS columna,
  COLUMN_TYPE    AS tipo,
  IS_NULLABLE    AS acepta_nulos,
  COLUMN_DEFAULT AS valor_por_defecto
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'participantes'
  AND COLUMN_NAME  = 'acepto_privacidad';
