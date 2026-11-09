#!/usr/bin/env node
/**
 * Genera los iconos de la app en OPACO sobre #1a1a2e (el theme-color).
 *
 * Los iconos originales venían con el logo recortado y todo lo demás alfa 0:
 * Android pintaba un círculo blanco detrás del PWA, iOS lo ponía negro y en la
 * pestaña el "INNS" blanco se perdía. Aquí se regeneran con fondo sólido.
 *
 *   pnpm gen-icons
 *
 * Salidas (public/assets/images/favicon/):
 *   favicon-96x96.png, apple-touch-icon.png, web-app-manifest-192x192.png,
 *   web-app-manifest-512x512.png              → propósito "any"
 *   web-app-manifest-{192,512}x{192,512}-maskable.png → zona segura (logo al 56%)
 *   favicon.ico (48/32/16), favicon.svg (se le pinta el fondo)
 *   site.webmanifest → iconos any + maskable
 */
import { readFileSync, writeFileSync } from 'fs';
import { deflateSync, inflateSync } from 'zlib';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'public/assets/images/LogoNovaInns.png');
const OUT = resolve(ROOT, 'public/assets/images/favicon');
const BG = [0x1a, 0x1a, 0x2e]; // #1a1a2e

const RATIO_ANY = 0.78; // logo normal (pestaña, pantalla de inicio iOS/Android)
const RATIO_MASKABLE = 0.56; // zona segura del recorte circular de Android

// ── PNG (solo lectura: RGBA 8 bits sin entrelazar) ──────────────────────
function decodePNG(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} no es PNG`);
  let off = 8, w, h, bitDepth, colorType, interlace;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`${file}: se esperaba RGBA 8 bits sin entrelazar (bd=${bitDepth} ct=${colorType} il=${interlace})`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0;
      const bb = prev ? prev[x] : 0;
      const c = prev && x >= 4 ? prev[x - 4] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += bb;
      else if (filter === 3) v += (a + bb) >> 1;
      else if (filter === 4) {
        const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, data: out };
}

// ── PNG (escritura) ─────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filtro None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Escala (filtro de área con alfa premultiplicado, sin halos) ─────────
function resize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor((y * sh) / dh), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor((x * sw) / dw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / dw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4;
          const al = src[i + 3];
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; n++;
        }
      }
      const o = (y * dw + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / n);
      }
    }
  }
  return out;
}

function composite(size, logoW, logoH, logo) {
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255;
  }
  const ox = Math.round((size - logoW) / 2), oy = Math.round((size - logoH) / 2);
  for (let y = 0; y < logoH; y++) {
    for (let x = 0; x < logoW; x++) {
      const s = (y * logoW + x) * 4;
      const al = logo[s + 3] / 255;
      if (!al) continue;
      const d = ((y + oy) * size + x + ox) * 4;
      out[d] = Math.round(logo[s] * al + out[d] * (1 - al));
      out[d + 1] = Math.round(logo[s + 1] * al + out[d + 1] * (1 - al));
      out[d + 2] = Math.round(logo[s + 2] * al + out[d + 2] * (1 - al));
    }
  }
  return out;
}

function makeIcon(size, ratio, logo) {
  const h = Math.round(size * ratio);
  const w = Math.max(1, Math.round((logo.w / logo.h) * h));
  const scaled = resize(logo.data, logo.w, logo.h, w, h);
  return { size, rgba: composite(size, w, h, scaled) };
}

// ── ICO (32 bpp + máscara AND, el mismo formato del archivo original) ───
function encodeICO(images) {
  const dir = Buffer.alloc(6 + images.length * 16);
  dir.writeUInt16LE(1, 2); dir.writeUInt16LE(images.length, 4);
  const bodies = [];
  let offset = dir.length;
  images.forEach(({ size, rgba }, i) => {
    const stride = size * 4;
    const maskStride = Math.ceil(size / 32) * 4;
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8); // alto = XOR + AND
    header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14);
    header.writeUInt32LE(stride * size, 20);
    const xor = Buffer.alloc(stride * size);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * stride; // de abajo hacia arriba
      for (let x = 0; x < size; x++) {
        const s = src + x * 4, d = y * stride + x * 4;
        xor[d] = rgba[s + 2]; xor[d + 1] = rgba[s + 1]; xor[d + 2] = rgba[s]; xor[d + 3] = rgba[s + 3];
      }
    }
    const and = Buffer.alloc(maskStride * size); // 0 = opaco
    const body = Buffer.concat([header, xor, and]);
    const o = 6 + i * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir[o + 2] = 0; dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(body.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    bodies.push(body); offset += body.length;
  });
  return Buffer.concat([dir, ...bodies]);
}

// ── Generación ──────────────────────────────────────────────────────────
const logo = decodePNG(SRC);
console.log(`logo: ${logo.w}x${logo.h} (RGBA)`);

const pngs = [
  ['favicon-96x96.png', makeIcon(96, RATIO_ANY, logo)],
  ['apple-touch-icon.png', makeIcon(180, RATIO_ANY, logo)],
  ['web-app-manifest-192x192.png', makeIcon(192, RATIO_ANY, logo)],
  ['web-app-manifest-512x512.png', makeIcon(512, RATIO_ANY, logo)],
  ['web-app-manifest-192x192-maskable.png', makeIcon(192, RATIO_MASKABLE, logo)],
  ['web-app-manifest-512x512-maskable.png', makeIcon(512, RATIO_MASKABLE, logo)],
];
for (const [name, { size, rgba }] of pngs) {
  writeFileSync(resolve(OUT, name), encodePNG(size, size, rgba));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

const ico = encodeICO([48, 32, 16].map((s) => makeIcon(s, s <= 16 ? 0.9 : RATIO_ANY, logo)));
writeFileSync(resolve(OUT, 'favicon.ico'), ico);
console.log('  ✓ favicon.ico (48/32/16)');

// favicon.svg: es el logo embebido en base64, solo se le pinta el fondo
const svgPath = resolve(OUT, 'favicon.svg');
const svg = readFileSync(svgPath, 'utf8');
if (svg.includes(`fill="#1a1a2e"`)) {
  console.log('  ✓ favicon.svg ya tiene fondo');
} else {
  const withBg = svg.replace(
    /(<svg[^>]*>)/,
    `$1<rect width="498" height="613" fill="#1a1a2e"/>`,
  );
  if (withBg === svg) throw new Error('no se encontró la etiqueta <svg> en favicon.svg');
  writeFileSync(svgPath, withBg);
  console.log('  ✓ favicon.svg (fondo #1a1a2e)');
}

// site.webmanifest: icono normal + maskable
const manifestPath = resolve(OUT, 'site.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.icons = [
  { src: '/assets/images/favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/assets/images/favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/assets/images/favicon/web-app-manifest-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/assets/images/favicon/web-app-manifest-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('  ✓ site.webmanifest (any + maskable)');
