-- =====================================================================
-- Sistema de Registro y Rifa QR  --  Consultas de administracion
-- Proyecto: rifa-qr
-- =====================================================================
-- COMO USAR ESTE ARCHIVO
--
--   NO lo ejecutes completo. Cada bloque numerado es independiente:
--   copia SOLO el bloque que necesitas, pegalo en la pestana "SQL" de
--   phpMyAdmin (con la base del evento seleccionada) y ejecuta.
--
--   Todas las consultas activas son de SOLO LECTURA. No hay ningun
--   INSERT, UPDATE o DELETE habilitado. Lo unico destructivo esta al
--   final, comentado y con advertencia.
--
-- INDICE
--   1. Panorama general (el vistazo rapido)
--   2. Estado de cada premio  <-- EL MAS IMPORTANTE
--   3. Lista de ganadores con datos de contacto
--   4. Verificar un numero puntual (para el stand)
--   5. Ritmo de registro por hora
--   6. Export completo para respaldo y seguimiento
--   7. Huecos en la secuencia de numeros
--   8. Revision previa al evento
--   9. Registros por empresa
--  10. Diagnostico del Tiburometro (lectura comercial)
--  11. Limpiar datos de prueba (COMENTADO)
--
-- CONTEXTO QUE EXPLICA POR QUE ESTAS CONSULTAS IMPORTAN
--
--   El numero de rifa es el AUTO_INCREMENT de participantes.id. MySQL
--   NO reutiliza un ID cuando un INSERT falla: si alguien intenta
--   registrarse con un correo ya usado, ese numero se quema y nadie
--   lo tendra nunca.
--
--   Consecuencia: un numero premiado puede desaparecer sin que nadie
--   se entere, y el premio jamas se entrega. La consulta 2 existe
--   precisamente para detectar eso a tiempo.
-- =====================================================================


-- =====================================================================
-- 1. PANORAMA GENERAL
-- ---------------------------------------------------------------------
-- Una sola fila con el estado del evento. Es la consulta para revisar
-- cada tanto durante la convencion.
--
-- Como leerla: si "registrados" y "ultimo_numero_asignado" NO coinciden,
-- la diferencia son numeros quemados por registros fallidos. Un hueco
-- pequeno es normal; uno grande merece revisarse con la consulta 7.
-- =====================================================================
SELECT
  (SELECT COUNT(*)                  FROM participantes)                     AS registrados,
  (SELECT COALESCE(MAX(id), 0)      FROM participantes)                     AS ultimo_numero_asignado,
  -- Mismo motivo que en la consulta 2: se castea a SIGNED para que la
  -- resta nunca se evalue en aritmetica sin signo.
  CAST((SELECT COALESCE(MAX(id), 0) FROM participantes) AS SIGNED)
    - CAST((SELECT COUNT(*)         FROM participantes) AS SIGNED)          AS numeros_quemados,
  (SELECT COUNT(*)                  FROM numeros_ganadores)                 AS premios_configurados,
  (SELECT COUNT(*)                  FROM numeros_ganadores
                                    WHERE reclamado = TRUE)                 AS premios_entregados,
  (SELECT COUNT(*)                  FROM numeros_ganadores
                                    WHERE reclamado = FALSE)                AS premios_sin_entregar,
  (SELECT MIN(fecha_registro)       FROM participantes)                     AS primer_registro,
  (SELECT MAX(fecha_registro)       FROM participantes)                     AS ultimo_registro;


-- =====================================================================
-- 2. ESTADO DE CADA PREMIO   <-- LA CONSULTA MAS IMPORTANTE
-- ---------------------------------------------------------------------
-- Clasifica cada numero premiado en uno de cuatro estados:
--
--   ENTREGADO  El premio ya se reclamo. Muestra a quien.
--   PENDIENTE  El contador aun no llega a ese numero. Todavia puede
--              salir; "registros_faltantes" dice cuantos faltan.
--   PERDIDO    El contador ya paso ese numero y nadie lo obtuvo: el ID
--              se quemo en un registro fallido. Ese premio ya no puede
--              salir por si solo. Hay que decidir que hacer con el.
--   REVISAR    El numero SI se asigno a una persona, pero el premio no
--              quedo marcado como reclamado. Indica que una transaccion
--              fallo a medias. Requiere revision manual.
--
-- Al cierre del evento, cualquier fila en PERDIDO o REVISAR es un
-- premio que quedo sin dueno y necesita decision.
-- =====================================================================
SELECT
  g.numero,
  g.premio,
  CASE
    WHEN g.reclamado = TRUE   THEN 'ENTREGADO'
    WHEN p.id IS NOT NULL     THEN 'REVISAR: numero asignado pero premio sin marcar'
    WHEN g.numero <= m.ultimo THEN 'PERDIDO: el ID se quemo, ya nadie lo obtendra'
    ELSE                           'PENDIENTE'
  END                                                        AS estado,
  -- El CAST es obligatorio: ambas columnas son INT UNSIGNED, y restar
  -- sin signo cuando el numero ya quedo atras (5 - 60) desborda y
  -- aborta la consulta antes de que GREATEST pueda acotarla a cero.
  GREATEST(CAST(g.numero AS SIGNED) - CAST(m.ultimo AS SIGNED), 0)
                                                             AS registros_faltantes,
  w.nombre_completo                                          AS ganador,
  w.empresa                                                  AS ganador_empresa,
  w.telefono                                                 AS ganador_telefono,
  w.correo                                                   AS ganador_correo,
  g.fecha_reclamo
FROM numeros_ganadores g
-- p: sirve para saber si ese numero llego a asignarse a alguien
LEFT JOIN participantes p ON p.id = g.numero
-- w: el ganador efectivo, segun lo que registro el backend
LEFT JOIN participantes w ON w.id = g.participante_id
-- m: ultimo numero asignado, calculado una sola vez
CROSS JOIN (SELECT COALESCE(MAX(id), 0) AS ultimo FROM participantes) m
ORDER BY g.numero;


-- =====================================================================
-- 3. LISTA DE GANADORES CON DATOS DE CONTACTO
-- ---------------------------------------------------------------------
-- Para entregar premios y para dar seguimiento despues del evento.
-- Ordenada por reclamo mas reciente primero.
-- =====================================================================
SELECT
  g.numero                                       AS numero_ganador,
  g.premio,
  p.nombre_completo,
  p.empresa,
  p.monto_promedio,
  p.telefono,
  p.correo,
  g.fecha_reclamo
FROM numeros_ganadores g
JOIN participantes p ON p.id = g.participante_id
WHERE g.reclamado = TRUE
ORDER BY g.fecha_reclamo DESC;


-- =====================================================================
-- 4. VERIFICAR UN NUMERO PUNTUAL   (uso en el stand)
-- ---------------------------------------------------------------------
-- Cuando alguien llega diciendo "gane el premio X", esta consulta
-- confirma si es cierto. Importa porque la pantalla que muestra el
-- asistente viene de su localStorage y no es prueba de nada.
--
-- CAMBIA EL 42 DE LA ULTIMA LINEA por el numero que quieres verificar.
-- =====================================================================
SELECT
  p.id                                           AS numero,
  p.nombre_completo,
  p.empresa,
  p.telefono,
  p.correo,
  p.fecha_registro,
  CASE
    WHEN g.numero IS NULL     THEN 'NO gano'
    WHEN g.reclamado = TRUE   THEN CONCAT('GANO: ', g.premio)
    ELSE                           CONCAT('REVISAR: numero premiado (', g.premio,
                                          ') pero sin marcar como reclamado')
  END                                            AS resultado
FROM participantes p
LEFT JOIN numeros_ganadores g ON g.numero = p.id
WHERE p.id = 42;   -- <<<<<< CAMBIA ESTE NUMERO


-- =====================================================================
-- 5. RITMO DE REGISTRO POR HORA
-- ---------------------------------------------------------------------
-- Sirve para notar si el flujo se detuvo. Una hora con cero registros
-- en pleno evento suele significar que algo se cayo: el backend, la
-- base, o el rate limit bloqueando la IP compartida del lugar.
-- =====================================================================
SELECT
  DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:00')  AS hora,
  COUNT(*)                                       AS registros,
  MIN(id)                                        AS primer_numero,
  MAX(id)                                        AS ultimo_numero
FROM participantes
GROUP BY hora
ORDER BY hora;


-- =====================================================================
-- 6. EXPORT COMPLETO
-- ---------------------------------------------------------------------
-- Respaldo del evento y base para seguimiento comercial.
-- Para bajarlo como archivo: ejecuta la consulta y usa el boton
-- "Exportar" que aparece debajo de los resultados en phpMyAdmin.
--
-- Incluye el diagnostico del Tiburometro traducido a texto. Es lo
-- que convierte esta lista de contactos en una lista de prospectos
-- calificados: por cada persona se sabe que garantia usa, cuanta
-- cartera vencida carga y cuanto tarda en recuperar.
-- =====================================================================
SELECT
  p.id                                          AS numero_registro,
  p.nombre_completo,
  p.empresa,
  p.monto_promedio,
  p.telefono,
  p.correo,

  -- Diagnostico, en texto legible
  CASE p.nivel_exposicion
    WHEN 'safe'     THEN 'Zona Segura'
    WHEN 'turbias'  THEN 'Aguas Turbias'
    WHEN 'abiertas' THEN 'Aguas Abiertas'
    WHEN 'sharks'   THEN 'Zona de Tiburones'
    ELSE p.nivel_exposicion
  END                                           AS nivel_exposicion,
  p.puntaje_total,

  -- Las respuestas se guardan como la POSICION de la opcion (1 a 4),
  -- que es tambien su puntaje. Aqui se traducen para que el export
  -- se lea sin tener que consultar el catalogo.
  CASE p.q1_garantia
    WHEN 1 THEN 'Fideicomiso de garantia'
    WHEN 2 THEN 'Garantia hipotecaria tradicional'
    WHEN 3 THEN 'Aval u obligado solidario'
    WHEN 4 THEN 'Ninguna garantia real'
  END                                           AS garantia_que_usa,
  CASE p.q2_cartera_vencida
    WHEN 1 THEN 'Menos de 3%'
    WHEN 2 THEN '3% - 7%'
    WHEN 3 THEN '7% - 15%'
    WHEN 4 THEN 'Mas de 15%'
  END                                           AS cartera_vencida,
  CASE p.q3_recuperacion
    WHEN 1 THEN '4 meses o menos'
    WHEN 2 THEN '4 - 6 meses'
    WHEN 3 THEN '6 - 12 meses'
    WHEN 4 THEN 'Mas de 12 meses / no recuperamos'
  END                                           AS tiempo_recuperacion,

  CASE WHEN p.es_ganador = TRUE THEN 'SI' ELSE 'NO' END AS gano,
  g.premio,
  p.fecha_registro
FROM participantes p
LEFT JOIN numeros_ganadores g ON g.participante_id = p.id
ORDER BY p.id;


-- =====================================================================
-- 7. HUECOS EN LA SECUENCIA DE NUMEROS
-- ---------------------------------------------------------------------
-- Lista los numeros que nunca se asignaron a nadie, y avisa si alguno
-- de ellos era premiado (que es el escenario grave).
--
-- NOTA TECNICA: usa un CTE recursivo, que por defecto se detiene a las
-- 1000 iteraciones. Si el evento supera los 1000 registros, ejecuta
-- primero esta linea, en la misma pestana:
--     SET SESSION cte_max_recursion_depth = 100000;
-- =====================================================================
WITH RECURSIVE serie AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1
  FROM serie
  WHERE n < (SELECT COALESCE(MAX(id), 0) FROM participantes)
)
SELECT
  s.n                                            AS numero_no_asignado,
  CASE
    WHEN g.numero IS NOT NULL
      THEN CONCAT('GRAVE: este numero era premiado -> ', g.premio)
    ELSE ''
  END                                            AS nota
FROM serie s
LEFT JOIN participantes    p ON p.id     = s.n
LEFT JOIN numeros_ganadores g ON g.numero = s.n
WHERE p.id IS NULL
  -- Evita reportar el numero 1 cuando la tabla esta vacia
  AND s.n <= (SELECT COALESCE(MAX(id), 0) FROM participantes)
ORDER BY s.n;


-- =====================================================================
-- 8. REVISION PREVIA AL EVENTO
-- ---------------------------------------------------------------------
-- Ejecutar ANTES de abrir el registro. Detecta premios configurados en
-- numeros que probablemente nunca se alcancen.
--
-- CAMBIA EL 150 por la asistencia que esperas.
-- =====================================================================
SELECT
  g.numero,
  g.premio,
  CASE
    WHEN g.numero > 150 THEN 'RIESGO: por encima de la asistencia esperada, puede no salir'
    WHEN g.numero > 150 * 0.8 THEN 'AJUSTADO: solo sale si la asistencia llega casi al tope'
    ELSE 'OK'
  END AS diagnostico,
  g.reclamado,
  g.participante_id
FROM numeros_ganadores g
ORDER BY g.numero;


-- =====================================================================
-- 9. REGISTROS POR EMPRESA
-- ---------------------------------------------------------------------
-- Util para el seguimiento comercial posterior: que empresas tuvieron
-- mas presencia en el evento.
-- =====================================================================
SELECT
  p.empresa,
  COUNT(*)                                       AS registrados,
  SUM(p.es_ganador = TRUE)                       AS ganadores
FROM participantes p
GROUP BY p.empresa
ORDER BY registrados DESC, p.empresa ASC;


-- =====================================================================
-- 10. DIAGNOSTICO DEL TIBUROMETRO
-- ---------------------------------------------------------------------
-- Como quedo repartida la sala por nivel de exposicion, y cuanto pesa
-- cada nivel sobre el total.
--
-- Es la lectura comercial del evento: dice cuantos prospectos estan en
-- riesgo alto y por donde entrarles. Un asistente en Zona de Tiburones
-- con creditos de mas de $10 millones es una conversacion muy distinta
-- a uno en Zona Segura.
-- =====================================================================
SELECT
  CASE p.nivel_exposicion
    WHEN 'safe'     THEN '1. Zona Segura'
    WHEN 'turbias'  THEN '2. Aguas Turbias'
    WHEN 'abiertas' THEN '3. Aguas Abiertas'
    WHEN 'sharks'   THEN '4. Zona de Tiburones'
    ELSE COALESCE(p.nivel_exposicion, '(sin diagnostico)')
  END                                            AS nivel,
  COUNT(*)                                       AS personas,
  ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje,
  MIN(p.puntaje_total)                           AS puntaje_min,
  MAX(p.puntaje_total)                           AS puntaje_max,
  -- Cuantos de este nivel manejan los montos mas altos: son los
  -- prospectos donde el riesgo pesa mas dinero.
  SUM(p.monto_promedio IN ('$2 - $10 millones', 'Más de $10 millones'))
                                                 AS con_creditos_altos
FROM participantes p
GROUP BY nivel
ORDER BY nivel;


-- =====================================================================
-- 11. LIMPIAR DATOS DE PRUEBA   ***  DESTRUCTIVO  ***
-- =====================================================================
-- TODO ESTE BLOQUE ESTA COMENTADO A PROPOSITO. Borra participantes y
-- reinicia el contador de numeros.
--
-- Ejecutalo UNICAMENTE antes del evento, para dejar la base limpia
-- despues de las pruebas. Si lo corres durante o despues del evento,
-- pierdes los registros reales y no hay forma de recuperarlos.
--
-- Haz un respaldo antes (consulta 6 + boton Exportar de phpMyAdmin).
--
-- El orden importa:
--   1) Se limpia numeros_ganadores. La llave foranea pone
--      participante_id en NULL sola al borrar, pero el campo
--      "reclamado" NO se revierte por si mismo.
--   2) Se borran los participantes. Tiene que ser DELETE y no
--      TRUNCATE, porque la llave foranea impide truncar la tabla.
--   3) Se reinicia el AUTO_INCREMENT para que la rifa vuelva a
--      empezar en 1.
--
-- Para usarlo: quita los guiones de las tres lineas siguientes.
-- ---------------------------------------------------------------------
-- UPDATE numeros_ganadores SET reclamado = FALSE, participante_id = NULL, fecha_reclamo = NULL;
-- DELETE FROM participantes;
-- ALTER TABLE participantes AUTO_INCREMENT = 1;
