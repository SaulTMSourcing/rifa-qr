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
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,

  -- ---------------------------------------------------------------
  -- Datos del formulario
  -- ---------------------------------------------------------------
  -- El nombre se captura en UN solo campo, no separado en nombre y
  -- dos apellidos: por eso 300 y no 150 de ancho.
  nombre_completo VARCHAR(300)  NOT NULL,
  empresa         VARCHAR(150)  NOT NULL,
  -- Texto legible ya resuelto por el backend a partir de una lista
  -- blanca de 4 claves. Nunca texto libre del cliente.
  monto_promedio  VARCHAR(40)   NOT NULL,
  telefono        VARCHAR(20)   NOT NULL,
  correo          VARCHAR(180)  NOT NULL,

  -- ---------------------------------------------------------------
  -- Diagnostico del Tiburometro
  -- ---------------------------------------------------------------
  -- Cada respuesta es la posicion de la opcion elegida (1 a 4), que
  -- es tambien su puntaje. Se guardan una por una, y no solo el
  -- total, porque son la calificacion comercial del prospecto.
  --
  -- puntaje_total y nivel_exposicion los recalcula SIEMPRE el
  -- servidor a partir de las tres respuestas; lo que mande el
  -- navegador se ignora.
  q1_garantia        TINYINT UNSIGNED NULL,
  q2_cartera_vencida TINYINT UNSIGNED NULL,
  q3_recuperacion    TINYINT UNSIGNED NULL,
  puntaje_total      TINYINT UNSIGNED NULL,
  -- safe | turbias | abiertas | sharks
  nivel_exposicion   VARCHAR(20)      NULL,

  -- ---------------------------------------------------------------
  -- Control
  -- ---------------------------------------------------------------
  es_ganador      BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_registro  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_origen       VARCHAR(45)   NULL,
  -- Constancia del consentimiento del aviso de privacidad (LFPDPPP).
  -- El backend rechaza el registro si no viene aceptado, asi que en
  -- la practica siempre es TRUE; se guarda como evidencia y su marca
  -- de tiempo es fecha_registro.
  acepto_privacidad BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_participantes_correo (correo),
  INDEX idx_participantes_fecha (fecha_registro),
  INDEX idx_participantes_ganador (es_ganador),
  -- El equipo comercial agrupa por nivel de exposicion al dar
  -- seguimiento despues del evento.
  INDEX idx_participantes_nivel (nivel_exposicion)
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
