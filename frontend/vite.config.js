/// <reference types="vitest" />
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // ----------------------------------------------------------
    // Ruta base
    // ----------------------------------------------------------
    // Solo se aplica al compilar para produccion (`vite build`):
    // en desarrollo (`vite dev`) siempre sirve desde la raiz, para
    // no tener que escribir /rifa-qr/ cada vez que se abre
    // localhost.
    //
    // Sirve para publicar el sitio como subcarpeta de un dominio
    // existente (ej. clickseguridad.com/rifa-qr) en vez de un
    // subdominio dedicado. Vite reescribe automaticamente los
    // href/src de index.html y las rutas de los assets con este
    // prefijo; no hace falta tocar el codigo fuente porque no hay
    // ninguna ruta absoluta hardcodeada fuera de index.html.
    //
    // Sin VITE_BASE_PATH en el .env, el build se comporta igual
    // que antes (raiz), para no cambiar el default de nadie que no
    // haya decidido usar subcarpeta.
    // ----------------------------------------------------------
    base: command === 'build' ? (env.VITE_BASE_PATH || '/') : '/',

    // ----------------------------------------------------------
    // Vitest
    // ----------------------------------------------------------
    // environment: 'node' basta porque los tests actuales cubren
    // la capa de servicios (src/services/api.js), que solo usa
    // fetch y no toca el DOM. Si mas adelante se agregan tests de
    // componentes React, cambiar a 'jsdom' e instalar
    // @testing-library/react.
    // ----------------------------------------------------------
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
      globals: false,
    },
  }
})
