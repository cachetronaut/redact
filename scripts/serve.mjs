import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};
const names = new Set([
  'index.html', 'style.css', 'review.mjs', 'redaction.mjs', 'sample.mjs', 'mapping.mjs',
  'detect.html', 'detect.mjs', 'firebase.mjs', 'firebase-config.json',
]);
const port = Number(process.argv[2] ?? '64904');
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  const name = path === '/' ? 'index.html' : path.slice(1);
  if (request.method !== 'GET' || !names.has(name)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL(`../public/${name}`, import.meta.url));
    response.writeHead(200, {
      'Content-Type': types[extname(name)],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`Redact at http://127.0.0.1:${port}/`));
