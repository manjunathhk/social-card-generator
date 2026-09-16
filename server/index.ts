import { createServer, type RequestListener, type ServerResponse } from 'node:http';
import { brandingFromEnv } from '../src/branding.js';
import { PROM_CONTENT_TYPE, recordRequest, renderMetrics } from './metrics.js';

/**
 * Serves the sandbox at `/` (never as a `.html` path) plus a small JSON API
 * for branding, health, and metrics. The server never launches a browser,
 * parses a card, or renders or stores anything itself — every card a
 * visitor exports lives only in that visitor's own browser storage, so
 * there is nothing here for one visitor to read that another created.
 */

export type ServerOptions = {
  html: string;
};

export function createRequestListener({ html }: ServerOptions): RequestListener {
  // Read once at server start: the container's branding env vars (set when it was
  // created, e.g. via `docker run -e CARD_AUTHOR=...` or compose's `environment:`)
  // become the sandbox's default branding fields for every visitor.
  const branding = brandingFromEnv(process.env);

  return async (req, res) => {
    let route = 'unmatched';
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      recordRequest({ method: req.method ?? 'GET', route, status: res.statusCode, durationSeconds });
    });

    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const { pathname } = url;

      if (req.method === 'GET' && pathname === '/') {
        route = '/';
        return sendHtml(res, html);
      }
      if (req.method === 'GET' && pathname === '/api/health') {
        route = '/api/health';
        return sendJson(res, 200, { ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/metrics') {
        route = '/api/metrics';
        return sendMetrics(res);
      }
      if (req.method === 'GET' && pathname === '/api/branding') {
        route = '/api/branding';
        return sendJson(res, 200, { branding });
      }

      route = 'not_found';
      return sendJson(res, 404, { error: 'Not found.' });
    } catch (error) {
      console.error(error);
      if (route === 'unmatched') route = 'error';
      return sendJson(res, 500, { error: 'Internal error.' });
    }
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function sendMetrics(res: ServerResponse): void {
  const text = renderMetrics();
  res.writeHead(200, { 'Content-Type': PROM_CONTENT_TYPE, 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) });
  res.end(html);
}

/* c8 ignore start -- exercised by running the server, not by unit tests */
async function main() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const port = Number(process.env.PORT) || 8787;
  const htmlPath = resolve(process.env.SANDBOX_HTML_PATH || './out/sandbox.html');
  const html = await readFile(htmlPath, 'utf8');

  const server = createServer(createRequestListener({ html }));
  server.listen(port, () => {
    console.log(`Social Card Sandbox listening on http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
}
/* c8 ignore stop */
