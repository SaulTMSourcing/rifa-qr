// ============================================================
// frontend/scripts/preparar-assets.mjs
// ------------------------------------------------------------
// Genera las versiones optimizadas de las imagenes de marca.
//
// Uso:
//   npm run assets
//
// Por que existe:
//   Los originales que entrega diseño vienen enormes. El tiburon
//   llega en 3328x1504 y 3.4 MB, y en pantalla se ve a unos 150 px
//   de ancho. Servirlo tal cual seria descargar 3.4 MB por persona
//   en el WiFi compartido de una convencion, con la pagina abierta
//   desde un QR y sin cache previa: el peor escenario posible.
//
//   Se generan a 2x del tamano de uso, que basta para pantallas
//   retina sin desperdiciar bytes.
// ============================================================

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '..');
const PUBLIC = path.join(RAIZ, 'public');
const ASSETS = path.join(RAIZ, 'src', 'assets');

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);

// ------------------------------------------------------------
// Muestrea el color mas saturado de una imagen.
// Sirve para tomar el naranja EXACTO del logo en vez de confiar
// en el hex que trae el prototipo.
// ------------------------------------------------------------
async function colorDominante(archivo) {
  const { data, info } = await sharp(archivo)
    .resize(80, 80, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let mejor = null;
  let mejorSat = -1;

  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue; // ignora transparencia
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Descarta grises y casi-blancos: busca el acento cromatico
    if (sat > mejorSat && max > 90) {
      mejorSat = sat;
      mejor = [r, g, b];
    }
  }
  return mejor;
}

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// ============================================================
async function main() {
  console.log('[assets] Preparando imagenes...\n');

  // ----------------------------------------------------------
  // Tiburon
  // ----------------------------------------------------------
  // Se usa a ~150 px de ancho, asi que 400 cubre retina de sobra.
  // WebP con transparencia pesa una fraccion del PNG.
  const tiburonOrigen = path.join(PUBLIC, 'Tiburon.png');
  if (fs.existsSync(tiburonOrigen)) {
    const destino = path.join(ASSETS, 'tiburon.webp');
    await sharp(tiburonOrigen)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 90 })
      .toFile(destino);
    console.log('  tiburon : ' + kb(tiburonOrigen) + ' KB -> ' + kb(destino) + ' KB  (400 px, webp)');
  }

  // ----------------------------------------------------------
  // Logo CLICK
  // ----------------------------------------------------------
  // El original viene a 6402 px. En el encabezado se ve a ~180 px.
  const logoOrigen = fs.existsSync(path.join(PUBLIC, 'ClickLogo.png'))
    ? path.join(PUBLIC, 'ClickLogo.png')
    : path.join(ASSETS, 'click-logo.png');

  const logoDestino = path.join(ASSETS, 'click-logo.webp');
  await sharp(logoOrigen)
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 95 })
    .toFile(logoDestino);
  console.log('  logo    : ' + kb(logoOrigen) + ' KB -> ' + kb(logoDestino) + ' KB  (480 px, webp)');

  // ----------------------------------------------------------
  // Color de marca
  // ----------------------------------------------------------
  const naranja = await colorDominante(logoOrigen);
  console.log('');
  console.log('[assets] Naranja muestreado del logo oficial: ' + hex(naranja) +
    '  rgb(' + naranja.join(', ') + ')');
  console.log('           prototipo usa #e8590c, app anterior usa #ff6b00');
}

main().catch((e) => {
  console.error('[assets] Error:', e.message);
  process.exit(1);
});
