// Build PNGs from SVG sources for stealth disguises.
// Usage: node stealth/build-icones.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, 'icones-src');
const OUT = path.join(__dirname, 'icones');
// Color de fons per a la versió maskable (que el SO retalla amb un mask).
// Cal un fons sòlid que ocupi tota la imatge per evitar marges blancs quan
// el SO afegeix la safe zone de padding.
const DISGUISES = {
  calculadora: { bg: '#2c3e50' },
  notes:       { bg: '#fbbf24' },
  meteo:       { bg: '#3b82f6' },
  receptes:    { bg: '#ea580c' },
};
const SIZES = [
  { name: '192', size: 192 },
  { name: '512', size: 512 },
  { name: '180', size: 180 },
  { name: 'maskable', size: 512, padding: 0.1, useDisguiseBg: true },
];

async function build() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  for (const d of Object.keys(DISGUISES)) {
    const disguiseInfo = DISGUISES[d];
    // Accepta SVG o PNG com a font
    const svgPath = path.join(SRC, `${d}.svg`);
    const pngPath = path.join(SRC, `${d}.png`);
    let srcBuf, srcIsSvg;
    if (fs.existsSync(svgPath)) {
      srcBuf = fs.readFileSync(svgPath);
      srcIsSvg = true;
    } else if (fs.existsSync(pngPath)) {
      srcBuf = fs.readFileSync(pngPath);
      srcIsSvg = false;
    } else {
      console.warn(`SKIP ${d} (no SVG ni PNG)`);
      continue;
    }
    function loadSrc() {
      // PNG: trim del marge blanc (threshold tolerant per blancs lleugerament
      // diferents). SVG: no cal, controlem el viewBox a la font.
      return srcIsSvg
        ? sharp(srcBuf, { density: 384 })
        : sharp(srcBuf).trim({ background: '#ffffff', threshold: 20 });
    }
    for (const s of SIZES) {
      const outFile = path.join(OUT, `${d}-${s.name}.png`);
      let pipeline = loadSrc().resize(s.size, s.size);
      if (s.padding) {
        const inner = Math.round(s.size * (1 - s.padding * 2));
        const margin = Math.round((s.size - inner) / 2);
        // Maskable: fons sòlid del color de la disfressa (ocupant tot el quadre)
        // amb la icona retallada centrada amb padding del 10%. Així el SO no
        // afegeix marges blancs per la safe zone.
        const bg = s.useDisguiseBg
          ? disguiseInfo.bg
          : { r: 0, g: 0, b: 0, alpha: 0 };
        pipeline = sharp({
          create: {
            width: s.size, height: s.size, channels: 4,
            background: bg,
          },
        }).composite([{
          input: await loadSrc().resize(inner, inner).png().toBuffer(),
          top: margin, left: margin,
        }]).png();
      }
      await pipeline.toFile(outFile);
      console.log(`OK ${path.basename(outFile)} (from ${srcIsSvg ? 'SVG' : 'PNG'})`);
    }
  }
}

build().catch(e => { console.error(e); process.exit(1); });
