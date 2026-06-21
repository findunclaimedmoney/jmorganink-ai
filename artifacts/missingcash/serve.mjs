import { createServer } from 'node:http';
import { readFile, stat, open } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const port = Number(process.env.PORT) || 3000;
const basePath = (process.env.BASE_PATH || '/missingcash/').replace(/\/$/, '');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function resolvePath(reqUrl) {
  let p = decodeURIComponent(new URL(reqUrl, 'http://x').pathname);
  if (p === basePath || p === basePath + '/') {
    p = '/index.html';
  } else if (p.startsWith(basePath + '/')) {
    p = p.slice(basePath.length);
  } else if (p === '/') {
    p = '/index.html';
  }
  if (p.endsWith('/')) p += 'index.html';
  return p;
}

createServer(async (req, res) => {
  try {
    const p = resolvePath(req.url);
    const file = join(root, normalize(p));
    if (!file.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }

    const ext = extname(file).toLowerCase();
    const contentType = types[ext] || 'application/octet-stream';

    // Range request support (required for HTML5 video)
    if (ext === '.mp4') {
      let fileStat;
      try {
        fileStat = await stat(file);
      } catch {
        const htmlFile = file + '.html';
        const body = await readFile(htmlFile);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
        res.end(body);
        return;
      }

      const fileSize = fileStat.size;
      const rangeHeader = req.headers['range'];

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
          const chunkSize = end - start + 1;

          res.writeHead(206, {
            'content-range': `bytes ${start}-${end}/${fileSize}`,
            'accept-ranges': 'bytes',
            'content-length': chunkSize,
            'content-type': contentType,
            'cache-control': 'no-cache',
          });

          const fh = await open(file, 'r');
          try {
            const buf = Buffer.allocUnsafe(chunkSize);
            await fh.read(buf, 0, chunkSize, start);
            res.end(buf);
          } finally {
            await fh.close();
          }
          return;
        }
      }

      // No range — send full file
      res.writeHead(200, {
        'content-length': fileSize,
        'content-type': contentType,
        'accept-ranges': 'bytes',
        'cache-control': 'no-cache',
      });
      res.end(await readFile(file));
      return;
    }

    // Non-video files
    let body;
    try {
      body = await readFile(file);
    } catch {
      const htmlFile = file + '.html';
      body = await readFile(htmlFile);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(body);
      return;
    }

    res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-cache' });
    res.end(body);

  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404 not found');
  }
}).listen(port, '0.0.0.0', () =>
  console.log(`missingcash serving on http://localhost:${port}${basePath}/`)
);
