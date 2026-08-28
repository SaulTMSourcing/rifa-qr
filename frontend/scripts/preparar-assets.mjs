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
  // Poster de premios
  // ----------------------------------------------------------
  // Llega en 2292x7083 y 1 MB. Se ve dentro de una ventana de unos
  // 380 px de ancho, asi que 760 cubre retina de sobra.
  //
  // Es una imagen MUY alta (relacion 1:3), asi que no se limita el
  // alto: recortarla partiria el poster a la mitad. Solo se acota el
  // ancho y el alto sale proporcional.
  //
  // Se busca por patron y se toma el archivo MAS RECIENTE, porque el
  // nombre cambia cada vez que diseño entrega una version nueva
  // ("Click - Mailing - Premios", "ASOFOM - Click Infografia final"...).
  // Ordenar por fecha de modificacion evita tener que tocar este
  // script en cada entrega.
  // ----------------------------------------------------------
  const DESCARGAS = 'C:/Users/TMSOURCING70/Downloads';
  const posterOrigen = fs.existsSync(DESCARGAS)
    ? fs.readdirSync(DESCARGAS)
        .filter((f) => /\.png$/i.test(f) && /(infograf|premios)/i.test(f))
        .map((f) => ({ f, t: fs.statSync(path.join(DESCARGAS, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .map((x) => x.f)[0]
    : null;

  if (posterOrigen) {
    const origen = path.join(DESCARGAS, posterOrigen);
    const destino = path.join(ASSETS, 'premios.webp');
    await sharp(origen)
      .resize({ width: 760, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(destino);
    console.log('  premios : ' + kb(origen) + ' KB -> ' + kb(destino) + ' KB  (760 px de ancho, webp)');
  } else {
    console.log('  premios : (no se encontro el original, se conserva el que ya exista)');
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

  // ----------------------------------------------------------
  // Logo para fondo oscuro
  // ----------------------------------------------------------
  // El logo original esta hecho para fondo claro: su texto va en el
  // gris de marca #54565a, que sobre el encabezado oscuro de la app
  // queda en 2.45:1 de contraste. WCAG pide 3:1 como minimo para
  // graficos, asi que "CLICK Seguridad Juridica" desaparece y solo
  // se distingue el isotipo naranja.
  //
  // Se genera una version invertida: el texto gris pasa a espuma
  // (15.97:1) y el naranja se conserva intacto, que es como se hace
  // cualquier logotipo en negativo.
  //
  // Los pixeles se separan por saturacion: el texto es practicamente
  // acromatico y el isotipo muy saturado, asi que un solo umbral
  // basta. Solo se cambia el RGB; el canal alfa se respeta, y con el
  // los bordes suavizados de las letras.
  //
  // NOTA: esto es un recoloreado mecanico. Si CLICK tiene un
  // logotipo oficial en negativo, conviene usar ese en su lugar.
  // ----------------------------------------------------------
  const ESPUMA = [245, 243, 238];
  const UMBRAL_SATURACION = 0.18;

  const { data, info } = await sharp(logoDestino)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let recoloreados = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 8) continue; // totalmente transparente
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < UMBRAL_SATURACION) {
      data[i] = ESPUMA[0];
      data[i + 1] = ESPUMA[1];
      data[i + 2] = ESPUMA[2];
      recoloreados++;
    }
  }

  const logoOscuro = path.join(ASSETS, 'click-logo-oscuro.webp');
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .webp({ quality: 92, alphaQuality: 95 })
    .toFile(logoOscuro);

  console.log('');
  console.log('[assets] Version para fondo oscuro: ' + kb(logoOscuro) + ' KB');
  console.log('           ' + recoloreados + ' pixeles del texto pasaron de gris a espuma');
  console.log('           contraste sobre el encabezado: 2.45:1 -> 15.97:1');
}

main().catch((e) => {
  console.error('[assets] Error:', e.message);
  process.exit(1);
});
