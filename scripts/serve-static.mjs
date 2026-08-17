import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const publicDirectory = join(process.cwd(), 'dist', 'front', 'browser');
const port = Number(process.env.PORT) || 3000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const filePath = normalize(join(publicDirectory, decodeURIComponent(url.pathname)));

  try {
    let fileToServe = filePath;
    if (!fileToServe.startsWith(publicDirectory) || (await statOrNull(fileToServe)) === null) {
      fileToServe = join(publicDirectory, 'index.html');
    }

    const content = await readFile(fileToServe);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(fileToServe)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(content);
  } catch {
    response.writeHead(500);
    response.end('Internal Server Error');
  }
}).listen(port, () => {
  console.log(`Nova Inns front serving ${publicDirectory} on port ${port}`);
});

async function statOrNull(filePath) {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
