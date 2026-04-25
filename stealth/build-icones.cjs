// Build PNGs from SVG sources for stealth disguises.
// Usage: node stealth/build-icones.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, 'icones-src');
const OUT = path.join(__dirname, 'icones');
const DISGUISES = ['calculadora', 'notes', 'meteo', 'receptes'];
const SIZES = [
  { name: '192', size: 192 },
  { name: '512', size: 512 },
  { name: '180', size: 180 },
  { name: 'maskable', size: 512, padding: 0.1 },
];

async function build() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  for (const d of DISGUISES) {
    const svgPath = path.join(SRC, `${d}.svg`);
    if (!fs.existsSync(svgPath)) {
      console.warn(`SKIP ${d} (no SVG)`);
      continue;
    }
    const svg = fs.readFileSync(svgPath);
    for (const s of SIZES) {
      const outFile = path.join(OUT, `${d}-${s.name}.png`);
      let pipeline = sharp(svg, { density: 384 }).resize(s.size, s.size);
      if (s.padding) {
        const inner = Math.round(s.size * (1 - s.padding * 2));
        const margin = Math.round((s.size - inner) / 2);
        pipeline = sharp({
          create: {
            width: s.size, height: s.size, channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite([{
          input: await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer(),
          top: margin, left: margin,
        }]).png();
      }
      await pipeline.toFile(outFile);
      console.log(`OK ${path.basename(outFile)}`);
    }
  }
}

build().catch(e => { console.error(e); process.exit(1); });
