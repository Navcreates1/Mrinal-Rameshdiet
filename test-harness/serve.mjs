/* A static server for the browser harnesses.
 *
 * It exists because the ad-hoc one inside each harness served sw.js as
 * text/plain, and a browser refuses to register a service worker with a
 * non-JavaScript MIME type. The offline test failed for a reason that had
 * nothing to do with the app. Content types are shared now so all three
 * harnesses see the same server the real host provides.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

export async function serve(port, root = '.') {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.includes('..')) { res.writeHead(400); return res.end('no'); }
    const file = `${root}/${path === '/' ? 'index.html' : path.slice(1)}`;
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      /* A service worker must not be cached by the browser's HTTP cache, or a
         new build cannot replace the old one. */
      'cache-control': file.endsWith('sw.js') ? 'no-cache' : 'no-store',
    });
    res.end(readFileSync(file));
  });
  await new Promise(r => server.listen(port, r));
  return { url: `http://localhost:${port}/`, close: () => server.close() };
}
