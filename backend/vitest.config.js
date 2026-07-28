// ============================================================
// backend/vitest.config.js
// ------------------------------------------------------------
// Configuracion de Vitest para el backend.
//
// Se eligio Vitest sobre el runner nativo de Node (`node --test`)
// porque el mockeo de modulos ESM (necesario para aislar el pool
// de MySQL en los tests del controller) es estable en Vitest,
// mientras que en Node sigue detras de un flag experimental.
//
// environment: 'node' -> no cargamos jsdom; no hay tests de DOM
// aqui, solo logica pura y handlers de Express.
// ============================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],

    // globals: false (default) nos obliga a importar describe/it/
    // expect explicitamente. Es mas verboso pero deja claro de
    // donde viene cada cosa y evita choques con globals de Node.
    globals: false,

    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // server.js solo cablea Express y arranca el listener;
      // db.js es configuracion de infraestructura. Ninguno aporta
      // logica de negocio testeable de forma aislada.
      exclude: ['src/server.js', 'src/config/db.js'],
    },
  },
});
