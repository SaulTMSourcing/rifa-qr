## 🎟️ Sistema de Registro y Rifa QR (Sequential Logic)

Este proyecto es una aplicación web full-stack diseñada para eventos. Permite que los asistentes se registren escaneando un código QR, capturando sus datos profesionales y asignándoles un número de registro secuencial único que determina si son ganadores de una rifa pre-configurada.

## 🚀 Características

*   **Registro Rápido:** Formulario optimizado para dispositivos móviles (vía QR).
*   **Asignación Secuencial:** Los números se asignan estrictamente por orden de registro mediante ID autoincrementales en Base de Datos en MySQL.
*   **Lógica de Ganadores "Server-Side":** La lista de números ganadores está protegida en el backend, evitando cualquier manipulación desde el navegador.
*   **Normalización de Datos:** Limpieza automática de entradas (trimming, formato de correo, etc.).
*   **Interfaz Moderna:** Construida con React y Tailwind CSS para una experiencia de usuario fluida.

## 🛠️ Stack Tecnológico

**Frontend:**
*   React.js (Vite)
*   Tailwind CSS
*   Lucide React (Iconos)

**Backend:**
*   Node.js & Express
*   MySQL (Gestión de base de datos relacional)
*   CORS & Dotenv

## 📂 Estructura del Proyecto
{
```text
proyecto-rifa/
├── backend/
│   ├── .env                # Variables de entorno (DB_HOST, DB_USER, etc.)
│   ├── index.js            # Servidor Express y Lógica de rifa
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes del formulario y resultados
│   │   └── App.jsx
│   └── package.json
└── schema.sql              # Estructura de la base de datos

"Por definir"
}
