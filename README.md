# 🎟️ Sistema de Registro y Rifa QR (Sequential Logic)

Aplicación web full-stack para eventos. Los asistentes se registran escaneando un código QR, capturan sus datos profesionales y reciben un número de registro secuencial único (el `AUTO_INCREMENT` de la base de datos) que determina si son ganadores de una rifa pre-configurada.

## 🚀 Características

*   **Registro rápido:** Formulario optimizado para dispositivos móviles (vía QR), con validación en el cliente usando `react-hook-form` y pantalla de resumen antes de enviar.
*   **Asignación secuencial:** Los números se asignan estrictamente por orden de registro mediante ID autoincremental en MySQL.
*   **Lógica de ganadores "server-side":** La lista de números ganadores vive únicamente en el backend; el navegador solo recibe su propio resultado.
*   **Transacción atómica con `SELECT ... FOR UPDATE`:** El reclamo de premio bloquea la fila del número ganador dentro de una transacción, evitando doble reclamo bajo registros concurrentes. Si algo falla, `ROLLBACK`.
*   **Rate limiting:** `express-rate-limit` protege `POST /api/registrar` (ventana y máximo configurables por `.env`); `/api/health` queda libre.
*   **Anti doble registro:** El resultado se persiste en `localStorage`; al reabrir la app en el mismo dispositivo se muestra el registro existente, con escape "No soy yo" para registrar a otra persona.
*   **Health check:** `GET /api/health` verifica servidor y conexión a la base; el frontend lo consulta al iniciar y muestra un aviso si el backend no responde.
*   **Normalización de datos:** Title case en español (partículas como "de", "del", "la" en minúscula), correo en minúsculas validado con `validator`, teléfono normalizado a 10 dígitos (formato México). Respeta la capitalización deliberada de marcas y siglas: `TMSourcing` y `CLICK` no se degradan.
*   **Consentimiento de datos personales:** Checkbox obligatorio del aviso de privacidad (LFPDPPP), exigido también en el backend y guardado como constancia en la base.
*   **Interfaz moderna:** React + Tailwind CSS, máquina de estados de vistas, loader animado y confetti para ganadores.

## 🛠️ Stack Tecnológico

**Frontend:**
*   React 19 + Vite
*   Tailwind CSS
*   react-hook-form (validación de formulario)
*   Lucide React (iconos)
*   canvas-confetti (celebración de ganadores)
*   Vitest (tests)

**Backend:**
*   Node.js + Express 5
*   MySQL vía `mysql2` (pool de conexiones con promesas)
*   express-rate-limit (limitación de peticiones)
*   validator (validación de correo)
*   CORS y dotenv
*   Vitest (tests)

## 📂 Estructura del Proyecto

```text
rifa-qr/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                      # Pool MySQL + testConnection (fail-fast)
│   │   ├── controllers/
│   │   │   ├── registroController.js      # Lógica de registro y rifa (transacción)
│   │   │   └── registroController.test.js # Tests del controller
│   │   ├── routes/
│   │   │   └── registro.routes.js         # Router + rate limiter de /registrar
│   │   ├── utils/
│   │   │   └── normalizar.js              # Normalización y validación de datos
│   │   └── server.js                      # Express, CORS, /api/health, arranque
│   ├── scripts/
│   │   ├── sandbox-setup.js               # Monta la BD local de pruebas
│   │   ├── sandbox-check-admin.js         # Valida las consultas de admin.sql
│   │   └── sandbox-check-vacio.js         # Valida el caso de BD vacia
│   ├── .env.example                       # Plantilla de variables de entorno
│   ├── package.json
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FormularioRegistro.jsx     # Formulario con react-hook-form
│   │   │   ├── CampoInput.jsx             # Input reutilizable
│   │   │   ├── ResumenDatos.jsx           # Confirmación antes de enviar
│   │   │   ├── ResultadoGanador.jsx       # Pantalla de ganador (confetti)
│   │   │   ├── ResultadoParticipante.jsx  # Pantalla de participante
│   │   │   ├── ResultadoError.jsx         # Pantalla de error tipado
│   │   │   └── OrganicLoader.jsx          # Loader animado
│   │   ├── services/
│   │   │   ├── api.js                     # Cliente del backend (errores tipados)
│   │   │   └── api.test.js                # Tests del cliente
│   │   ├── App.jsx                        # Orquestador / máquina de estados
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example                       # Plantilla de variables de entorno (Vite)
│   ├── package.json
│   └── vite.config.js
├── migrations/
│   └── 001-aviso-privacidad.sql           # Cambios sobre una BD ya creada
├── schema.sql                             # Estructura de la BD + instrucciones Hostinger
├── admin.sql                              # Consultas de administracion del evento
└── README.md
```

## ✅ Requisitos Previos

*   Node.js 18 o superior
*   MySQL (local o remoto, por ejemplo el de Hostinger)

## ⚙️ Instalación y Arranque

**1. Base de datos.** Ejecuta `schema.sql` sobre tu base MySQL. Para Hostinger: crea la base desde el panel, abre phpMyAdmin, selecciona la base, pega el contenido del archivo en la pestaña "SQL" y ejecuta (el script es idempotente; las instrucciones detalladas están comentadas dentro del propio `schema.sql`). Crea las tablas `participantes` y `numeros_ganadores`, e inserta números ganadores de ejemplo que debes ajustar antes del evento real.

**2. Variables de entorno.** Copia las plantillas y rellena los valores reales:

```bash
# Backend (credenciales de MySQL, puerto, CORS, rate limit)
cd backend
cp .env.example .env

# Frontend (URL del backend, aviso de privacidad)
cd ../frontend
cp .env.example .env
```

Hay tres archivos de entorno en el backend y conviene no confundirlos:

| Archivo | Para que sirve |
| --- | --- |
| `.env` | Desarrollo local. Debe apuntar a la base local, nunca a produccion. |
| `.env.sandbox` | Conexion a la base local de pruebas. Lo usan los scripts de `scripts/`. |
| `.env.production` | Credenciales reales. Se sube al servidor renombrado a `.env`. |

Ninguno de los tres se versiona: los bloquea el `.gitignore`. Solo se suben las plantillas `.env.example`.

> **Importante:** no desarrolles apuntando a la base de produccion. Cada prueba escribe una fila real y adelanta el contador de numeros de rifa, que es justo el que decide los premios.

**3. Dependencias.** Instala en cada carpeta:

```bash
cd backend && npm install
cd ../frontend && npm install
```

**4. Arranque en desarrollo.** Usa dos terminales:

```bash
# Terminal 1: backend (nodemon)
cd backend
npm run dev
# -> http://localhost:3001

# Terminal 2: frontend (Vite)
cd frontend
npm run dev
# -> http://localhost:5173
```

El backend verifica la conexión a MySQL antes de aceptar peticiones; si las variables `DB_*` faltan o la base no responde, aborta el arranque (fail-fast).

## 🔌 API

### `GET /api/health`

Health check. No tiene rate limit.

```json
{
  "status": "ok",
  "server": "up",
  "database": "up",
  "timestamp": "2026-07-27T12:00:00.000Z"
}
```

Si la base de datos no responde, devuelve `503` con `"status": "degraded"`.

### `POST /api/registrar`

Registra un participante y resuelve la rifa en una sola operación transaccional.

**Request:**

```json
{
  "nombre": "Irving Alejandro",
  "apellido_pat": "García",
  "apellido_mat": "de la Torre",
  "empresa": "TMSourcing",
  "puesto": "Analista",
  "telefono": "55 1234 5678",
  "correo": "irving@ejemplo.com",
  "acepto_privacidad": true
}
```

`acepto_privacidad` debe ser el booleano `true`. Se exige de forma estricta: `"true"` como texto, `1` o `"on"` se rechazan con `400`. El backend no confia en la validacion del navegador, porque el endpoint se puede llamar directo.

**Response `201`:**

```json
{
  "ok": true,
  "numeroRegistro": 42,
  "esGanador": false,
  "premio": null,
  "mensaje": "Registro exitoso. Gracias por participar."
}
```

Si `numeroRegistro` está en la lista de ganadores (y no fue reclamado), `esGanador` es `true` y `premio` trae la descripción del premio.

**Errores:**

| Código | `error` | Descripción |
| --- | --- | --- |
| `400` | `datos_invalidos` | Falla de validación; incluye `campo` y `mensaje` |
| `409` | `correo_duplicado` | El correo ya está registrado (UNIQUE en BD) |
| `429` | `rate_limit_exceeded` | Demasiados intentos desde la misma IP |
| `500` | `error_servidor` | Error interno; el detalle solo se loguea en el servidor |

Todas las respuestas de error usan el envelope `{ "ok": false, "error": "...", "mensaje": "..." }`.

## 🧪 Tests

Ambos lados usan Vitest.

```bash
# Backend
cd backend
npm test              # una corrida
npm run test:watch    # modo watch
npm run test:coverage # con cobertura (v8)

# Frontend
cd frontend
npm test              # una corrida
npm run test:watch    # modo watch
```

### Base de datos local de pruebas

Para no depender de la base de produccion, el backend puede montar una base local con datos de ejemplo. Requiere un MySQL 8 en esta maquina y un `backend/.env.sandbox` con sus credenciales.

```bash
cd backend
npm run sandbox:setup        # crea la BD y siembra datos de prueba
npm run sandbox:check        # ejecuta admin.sql y verifica los resultados
npm run sandbox:check-vacio  # prueba el caso de BD vacia (usa rollback)
```

Los datos sembrados cubren a proposito los cuatro estados que distingue `admin.sql`: premio entregado, pendiente, perdido por un ID quemado, y un caso que requiere revision manual.

## 🚀 Despliegue a Produccion

**1. Migraciones.** Si la base ya existe, aplica los archivos de `migrations/` **antes** de subir el codigo nuevo. Son idempotentes: correrlos dos veces no hace dano.

```
migrations/001-aviso-privacidad.sql   -> agrega la columna acepto_privacidad
```

El backend actual escribe en esa columna. Si subes el codigo sin migrar, **todos los registros fallaran**. Las bases creadas desde cero con `schema.sql` ya la traen y no necesitan la migracion.

**2. Variables del servidor.** Sube `backend/.env.production` renombrado a `.env`, y ajusta:

- `CORS_ORIGIN` -> el dominio real del frontend
- `NODE_ENV=production`
- `RATE_LIMIT_MAX` -> ver la advertencia de abajo

**3. Frontend.** Antes de `npm run build`, define en su `.env`:

- `VITE_API_URL` -> la URL publica del backend
- `VITE_AVISO_PRIVACIDAD_URL` -> la URL del aviso de privacidad
- `VITE_BASE_PATH` -> solo si va en subcarpeta (ver abajo)

Luego sube el contenido de `dist/` al hosting estatico. El frontend es HTML y JS ya compilados: **no necesita la funcion de Node.js Web App**, ni consume el cupo de apps Node del plan.

### Publicar en subcarpeta de un sitio existente

La app puede vivir dentro del sitio que ya existe, sin subdominio propio:

| Destino | `VITE_BASE_PATH` | Donde se suben los archivos |
| --- | --- | --- |
| `rifa.clickseguridad.com` | vacio | raiz del subdominio |
| `clickseguridad.com/rifa-qr` | `/rifa-qr/` | carpeta `rifa-qr/` dentro de `public_html` |

Las diagonales del inicio y del final son obligatorias. Vite reescribe con ese prefijo los `href`/`src` de `index.html` y las rutas de los assets; el codigo fuente no se toca porque no hay rutas absolutas fuera de `index.html`.

Convive sin problema con un WordPress en la raiz: son archivos estaticos en una carpeta aparte, y WordPress no intercepta peticiones a rutas que existen en disco. La app tampoco usa router de cliente, asi que no hace falta ninguna regla de reescritura en el servidor.

La variable solo afecta al build. En desarrollo la app se sigue sirviendo desde la raiz.

**4. Antes de abrir el registro.** Ejecuta el bloque 8 de `admin.sql` con la asistencia que esperas: avisa si algun premio quedo configurado en un numero que probablemente no se alcance.

### ⚠️ El rate limit en un evento presencial

El limite es **por IP**, y en una convencion toda la sala sale por la misma IP publica del WiFi. No se reparte por persona: se consume entre todas juntas.

Regla practica: **al menos el doble de la asistencia esperada**. Con 150 asistentes, `RATE_LIMIT_MAX=300`.

Si el dia del evento el proxy no reenvia la IP real del cliente y todo el trafico se ve como una sola IP, cualquier limite bloquea a todos por igual. En ese caso `RATE_LIMIT_MAX=0` lo desactiva por completo. El valor efectivo se imprime al arrancar el servidor.

## 🔒 Notas de Seguridad

*   **La lista de ganadores nunca sale del backend.** El frontend solo recibe el resultado de SU registro; el premio viaja en la respuesta únicamente si ese registro específico ganó.
*   **Validación autoritativa en el servidor.** La validación de `react-hook-form` es solo UX; la que decide es la de `utils/normalizar.js` en el backend (400 si algo no pasa).
*   **Rate limit en el endpoint sensible.** Solo `POST /api/registrar` está limitado; ajusta `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX` en el `.env` según el WiFi compartido del evento.
*   **Concurrencia controlada.** `SELECT ... FOR UPDATE` + transacción impiden que dos registros reclamen el mismo premio en paralelo.
*   **Sin secretos en el cliente.** Las variables `VITE_*` terminan en el bundle del navegador; las credenciales de MySQL viven solo en el `.env` del backend (bloqueado por `.gitignore`).
*   **Errores opacos al cliente.** Los detalles de errores de BD se loguean en el servidor; el cliente recibe mensajes genéricos.
