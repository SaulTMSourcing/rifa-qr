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
--   y NO necesitan esta migracion.
--
-- COMO EJECUTARLA
--   Son DOS pasos y se corren por separado, no de un jalon.
--   phpMyAdmin -> selecciona la base del evento -> pestana "SQL".
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1 de 2: comprobar si la columna ya existe
-- ---------------------------------------------------------------------
-- Copia y ejecuta SOLO esta consulta.
--
--   Si devuelve UNA fila  -> la columna ya existe. YA TERMINASTE,
--                            no ejecutes el paso 2.
--   Si devuelve CERO filas -> continua con el paso 2.
-- ---------------------------------------------------------------------

SHOW COLUMNS FROM participantes LIKE 'acepto_privacidad';


-- ---------------------------------------------------------------------
-- PASO 2 de 2: agregar la columna
-- ---------------------------------------------------------------------
-- Copia y ejecuta SOLO esta instruccion, y solo si el paso 1 no
-- devolvio ninguna fila.
--
-- Si por error la ejecutas cuando la columna ya existe, MySQL
-- responde:
--
--     #1060 - Duplicate column name 'acepto_privacidad'
--
-- Ese error es inofensivo: significa que el trabajo ya estaba hecho
-- y no se modifico nada.
-- ---------------------------------------------------------------------

ALTER TABLE participantes
  ADD COLUMN acepto_privacidad BOOLEAN NOT NULL DEFAULT FALSE
  AFTER ip_origen;


-- ---------------------------------------------------------------------
-- VERIFICACION (opcional)
-- ---------------------------------------------------------------------
-- Repite el paso 1. Debe devolver una fila describiendo la columna:
--   Field   -> acepto_privacidad
--   Type    -> tinyint(1)
--   Null    -> NO
--   Default -> 0
-- ---------------------------------------------------------------------


-- =====================================================================
-- NOTA SOBRE POR QUE ESTA MIGRACION ES MANUAL Y EN DOS PASOS
-- =====================================================================
-- La version anterior detectaba sola si la columna existia, con una
-- consulta a information_schema dentro de un PREPARE. Fallaba en el
-- hosting de Hostinger:
--
--   #1044 - Acceso denegado para usuario '..._saul_tm'@'127.0.0.1'
--           a la base de datos 'information_schema'
--
-- En hosting compartido el usuario tiene control total sobre SU base
-- pero no puede consultar information_schema, que es global.
--
-- La alternativa obvia, ALTER TABLE ... ADD COLUMN IF NOT EXISTS, no
-- sirve: esa sintaxis existe en MariaDB pero NO en MySQL, en ninguna
-- version (5.x ni 8.x).
--
-- SHOW COLUMNS si funciona con permisos de usuario normal, pero su
-- resultado no se puede usar para ramificar dentro de SQL plano sin
-- un procedimiento almacenado, que en hosting compartido tambien
-- suele estar restringido.
--
-- Por eso se separo en dos pasos con la decision a cargo de quien lo
-- ejecuta. Es menos elegante, pero funciona en cualquier hosting y
-- deja claro en todo momento que se esta cambiando.
-- =====================================================================
