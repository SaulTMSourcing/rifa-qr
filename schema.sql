-- =====================================================================
-- Sistema de Registro y Rifa por QR
-- Base de datos: rifa_qr
-- =====================================================================

-- =====================================================================
-- Sistema de Registro y Rifa por QR
-- Proyecto: rifa-qr
-- =====================================================================
-- INSTRUCCIONES DE USO EN HOSTINGER:
--
-- 1. En el panel de Hostinger, ir a "Bases de datos" -> "Administración
--    de bases de datos MySQL".
-- 2. Crear una nueva base de datos. Hostinger asignara un nombre con
--    prefijo, ejemplo: u123456789_rifa_qr.
-- 3. Anotar el nombre completo de la base, el usuario, la contrasena
--    y el host (generalmente "localhost" para el conector interno o
--    una IP especifica para conexion remota).
-- 4. Abrir phpMyAdmin desde el panel de Hostinger.
-- 5. Seleccionar la base recien creada en la barra lateral izquierda.
-- 6. Ir a la pestana "SQL" y pegar el contenido de este archivo.
-- 7. Ejecutar. El script es idempotente: puede correrse varias veces
--    sin romper datos existentes.
--
-- NOTA: Este script NO crea la base de datos. Asume que ya esta creada
--       y seleccionada desde el panel de Hostinger.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tabla: participantes
-- El campo `id` es la FUENTE DE VERDAD del numero de rifa.
-- AUTO_INCREMENT garantiza unicidad y secuencialidad atomica
-- incluso bajo registros concurrentes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participantes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(150)  NOT NULL,
  apellido_pat    VARCHAR(150)  NOT NULL,
  apellido_mat    VARCHAR(150)  NOT NULL,
  empresa         VARCHAR(150)  NOT NULL,
  puesto          VARCHAR(150)  NOT NULL,
  telefono        VARCHAR(20)   NOT NULL,
  correo          VARCHAR(180)  NOT NULL,
  es_ganador      BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_registro  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_origen       VARCHAR(45)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_participantes_correo (correo),
  INDEX idx_participantes_fecha (fecha_registro),
  INDEX idx_participantes_ganador (es_ganador)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- Tabla: numeros_ganadores
-- Lista predefinida de IDs que activan premio.
-- `reclamado` se marca cuando un participante con ese ID se registra.
-- `participante_id` enlaza al ganador efectivo (NULL si aun no se ha
-- registrado nadie con ese numero).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS numeros_ganadores (
  numero            INT UNSIGNED NOT NULL,
  premio            VARCHAR(200) NULL,
  reclamado         BOOLEAN      NOT NULL DEFAULT FALSE,
  participante_id   INT UNSIGNED NULL,
  fecha_reclamo     TIMESTAMP    NULL,
  fecha_alta        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (numero),
  CONSTRAINT fk_ganadores_participante
    FOREIGN KEY (participante_id) REFERENCES participantes(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- Datos semilla: numeros ganadores de ejemplo.
-- Ajustar antes del evento real.
-- ON DUPLICATE KEY UPDATE permite reejecutar el script sin error y
-- actualiza la descripcion del premio si se modifica.
-- ---------------------------------------------------------------------
INSERT INTO numeros_ganadores (numero, premio) VALUES
  (5,   'Premio 1'),
  (12,  'Premio 2'),
  (25,  'Premio 3'),
  (50,  'Premio 4'),
  (100, 'Premio Mayor')
ON DUPLICATE KEY UPDATE premio = VALUES(premio);
