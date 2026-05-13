-- =====================================================================
-- Sistema de Registro y Rifa por QR
-- Base de datos: rifa_qr
-- =====================================================================

CREATE DATABASE IF NOT EXISTS rifa_qr
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rifa_qr;

-- ---------------------------------------------------------------------
-- Tabla: participantes
-- El campo `id` es la FUENTE DE VERDAD del número de rifa.
-- AUTO_INCREMENT garantiza unicidad y secuencialidad atómica
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
-- `participante_id` enlaza al ganador efectivo (NULL si aún no se ha
-- registrado nadie con ese número).
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
-- Datos semilla: números ganadores de ejemplo.
-- Ajustar antes del evento real.
-- ---------------------------------------------------------------------
INSERT INTO numeros_ganadores (numero, premio) VALUES
  (5,   'Premio 1'),
  (12,  'Premio 2'),
  (25,  'Premio 3'),
  (50,  'Premio 4'),
  (100, 'Premio Mayor')
ON DUPLICATE KEY UPDATE premio = VALUES(premio);
