// Genera copias .br (Brotli) y .gz (gzip) de los archivos de texto del build.
// Lo hace serve-static.mjs al servir para no comprimir en cada request.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.join(process.cwd(), 'dist', 'front', 'browser');
// Solo texto: imágenes y fuentes ya vienen comprimidas (Brotli no les gana)
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);

const brotli = (buf) =>
  zlib.brotliCompressSync(buf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  });

const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (COMPRESSIBLE.has(path.extname(entry.name))) files.push(full);
  }
}

let raw = 0;
let best = 0;
await walk(root);

for (const file of files) {
  const content = await fs.readFile(file);
  const variants = [
    { ext: '.br', data: brotli(content) },
    { ext: '.gz', data: zlib.gzipSync(content, { level: 9 }) },
  ];
  let smallest = content.length;
  for (const v of variants) {
    // Si no ahorra un 5%, mejor no escribir el sidecar
    if (v.data.length < content.length * 0.95) {
      await fs.writeFile(file + v.ext, v.data);
      smallest = Math.min(smallest, v.data.length);
    } else {
      await fs.rm(file + v.ext, { force: true });
    }
  }
  raw += content.length;
  best += smallest;
}

const kb = (n) => (n / 1024).toFixed(0);
console.log(
  `✅ Brotli/gzip: ${files.length} archivos, ${kb(raw)} KB → ${kb(best)} KB (${Math.round((best / raw) * 100)}%)`,
);
