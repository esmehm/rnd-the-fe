#!/usr/bin/env node
/**
 * Static server for the production build that mirrors the dev server's behaviour so
 * perf numbers are apples-to-apples:
 *   - serves dist/ with correct MIME types
 *   - gzips text assets on the fly (so transferKB reflects a real compressed CDN, not raw bytes)
 *   - proxies /graphql -> localhost:8000 (same as the rspack devServer)
 *   - SPA fallback to index.html for client routes (/stocktake/:id)
 *
 * Usage:
 *   node scripts/serve-prod.mjs [port]                 # serve ./dist (this app) on port (default 3200)
 *   node scripts/serve-prod.mjs --dir <path> --port N  # serve any built dist (e.g. the old FE)
 *   node scripts/serve-prod.mjs --dir <path> --backend host:port
 *
 * Use it for BOTH the old FE and this app so serving (gzip + /graphql proxy + SPA fallback)
 * is identical on both sides of the bake-off — one less variable.
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i !== -1 && argv[i + 1] ? argv[i + 1] : def; };
const positionalPort = argv[0] && !argv[0].startsWith('--') ? Number(argv[0]) : null;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = resolve(flag('--dir', join(ROOT, 'dist')));
const PORT = Number(flag('--port', positionalPort || 3200));
const [bhost, bport] = flag('--backend', 'localhost:8000').split(':');
const BACKEND = { host: bhost, port: Number(bport) };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};
const GZIP = new Set(['.html', '.js', '.css', '.json', '.svg', '.map']);

const server = createServer(async (req, res) => {
  // Proxy GraphQL to the backend (same-origin like the dev server)
  if (req.url.startsWith('/graphql')) {
    const proxy = httpRequest(
      { host: BACKEND.host, port: BACKEND.port, path: req.url, method: req.method, headers: { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` } },
      (br) => { res.writeHead(br.statusCode || 502, br.headers); br.pipe(res); },
    );
    proxy.on('error', () => { res.writeHead(502); res.end('proxy error'); });
    req.pipe(proxy);
    return;
  }

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const candidate = join(DIST, urlPath);
  let filePath = candidate;
  try {
    const s = await stat(candidate);
    if (s.isDirectory()) throw new Error('dir');
  } catch {
    filePath = join(DIST, 'index.html'); // SPA fallback
  }

  try {
    const buf = await readFile(filePath);
    const ext = extname(filePath);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
    if (acceptsGzip && GZIP.has(ext)) {
      const gz = gzipSync(buf);
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = gz.length;
      res.writeHead(200, headers);
      res.end(gz);
    } else {
      headers['Content-Length'] = buf.length;
      res.writeHead(200, headers);
      res.end(buf);
    }
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () =>
  console.log(`serving ${DIST}\n  on   http://localhost:${PORT}\n  proxy /graphql -> http://${BACKEND.host}:${BACKEND.port}  (gzip + SPA fallback)`),
);
