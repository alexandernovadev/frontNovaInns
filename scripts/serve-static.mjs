import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'dist', 'front', 'browser');
const port = Number(process.env.PORT) || 3000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

// Angular con outputHashing: "all" → chunk-XXXX.js, main-XXXX.js,
// styles-XXXX.css y media/*-XXXX.woff2. Son inmutables: se pueden cachear un año.
const HASHED = /(^|\/)(?:chunk|main|styles)-[A-Za-z0-9_-]{6,}\.(?:js|css)$|^media\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:woff2|woff|ttf)$/;

const accepts = (header, kind) =>
  (header ?? '').split(',').some((v) => v.trim().split(';')[0].toLowerCase() === kind);

// Elije la versión pre-comprimida por precompress.mjs, si existe
const variantFor = async (file, request) => {
  const ae = request.headers['accept-encoding'] ?? '';
  const candidates = [];
  if (accepts(ae, 'br')) candidates.push([file + '.br', 'br']);
  if (accepts(ae, 'gzip')) candidates.push([file + '.gz', 'gzip']);
  for (const [candidate, encoding] of candidates) {
    try {
      const s = await stat(candidate);
      if (s.isFile()) return { file: candidate, encoding, size: s.size, mtime: s.mtime };
    } catch {
      /* no hay sidecar para esa codificación */
    }
  }
  try {
    const s = await stat(file);
    if (s.isFile()) return { file, encoding: null, size: s.size, mtime: s.mtime };
  } catch {
    /* no existe */
  }
  return null;
};

const send = (response, status, headers, body) => {
  response.writeHead(status, headers);
  response.end(body);
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const requested = path.join(root, path.normalize(pathname));
  const isInside = requested === root || requested.startsWith(root + path.sep);
  let target = isInside ? requested : path.join(root, 'index.html');

  let variant = await variantFor(target, request);
  let isFallback = false;

  // SPA: sin extensión y sin archivo → index.html. Con extensión (.js/.json…) → 404 real,
  // para no cachear una página como si fuera un asset.
  if (!variant) {
    if (path.extname(pathname)) {
      return send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    }
    target = path.join(root, 'index.html');
    variant = await variantFor(target, request);
    isFallback = true;
    if (!variant) return send(response, 500, { 'Content-Type': 'text/plain' }, 'Build ausente');
  }

  const ext = path.extname(target);
  const immutable = !isFallback && HASHED.test(path.relative(root, target).replace(/\\/g, '/'));
  const etag = `W/"${variant.mtime.getTime().toString(36)}-${variant.size.toString(36)}"`;

  const headers = {
    'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable
      ? 'public, max-age=31536000, immutable'
      : ext === '.html'
        ? 'public, no-cache'
        : 'public, max-age=86400',
    ETag: etag,
    'Last-Modified': variant.mtime.toUTCString(),
    'Content-Length': variant.size,
  };
  if (variant.encoding) {
    headers.Vary = 'Accept-Encoding';
    headers['Content-Encoding'] = variant.encoding;
  }

  // 304: el navegador conserva su copia y no baja nada
  const inm = request.headers['if-none-match'];
  const ims = request.headers['if-modified-since'];
  if (inm === etag || (!inm && ims && new Date(ims) >= variant.mtime)) {
    delete headers['Content-Length'];
    delete headers['Content-Encoding'];
    return send(response, 304, headers);
  }

  if (request.method === 'HEAD') return send(response, 200, headers);

  response.writeHead(200, headers);
  createReadStream(variant.file).pipe(response);
});

server.listen(port, () => {
  console.log(`Nova Inns front sirviendo ${root} en :${port} (brotli/gzip + cache + 304)`);
});
