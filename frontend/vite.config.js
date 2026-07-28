/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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
})
