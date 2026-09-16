import { createServer, type IncomingMessage, type RequestListener, type ServerResponse } from 'node:http';
import { brandingFromEnv } from '../src/branding.js';
import {
  PROM_CONTENT_TYPE,
  recordCardCreated,
  recordCardDeleted,
  recordCardsPruned,
  recordRequest,
  renderMetrics,
} from './metrics.js';
import {
  createCard,
  deleteCard,
  getCard,
  getCardImage,
  isValidId,
  listCards,
  pruneExpiredCards,
  type NewCard,
} from './store.js';

/**
 * Serves the sandbox at `/` (never as a `.html` path) plus a small JSON API
 * that stores what the browser already rendered. The server never launches
 * a browser, parses a card, or renders anything itself — it is a dumb,
 * dependency-free store for blobs the client already produced, which is
 * why the Docker image needs no Chromium.
 *
 * No authentication, no per-user isolation: everyone who can reach this
 * server shares one history. Fine for a personal, self-hosted instance on
 * a private network; put a reverse proxy with auth in front before
 * exposing it more widely.
 */

const MAX_BODY_BYTES = 20 * 1024 * 1024; // a 2x PNG as base64 comfortably fits well under this

export type ServerOptions = {
  dataDir: string;
  html: string;
};

export function createRequestListener({ dataDir, html }: ServerOptions): RequestListener {
  // Read once at server start: the container's branding env vars (set when it was
  // created, e.g. via `docker run -e CARD_AUTHOR=...` or compose's `environment:`)
  // become the sandbox's default branding fields for every visitor.
  const branding = brandingFromEnv(process.env);

  return async (req, res) => {
    // Route label for metrics: a fixed template (`/api/cards/:id`), never the
    // literal path, so a flood of card ids can't blow up label cardinality.
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

      if (pathname === '/api/cards') {
        route = '/api/cards';
        if (req.method === 'GET') return sendJson(res, 200, { cards: await listCards(dataDir) });
        if (req.method === 'POST') return handleCreate(req, res, dataDir);
        return methodNotAllowed(res);
      }

      const card = pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (card) {
        route = '/api/cards/:id';
        const [, id] = card;
        if (!isValidId(id)) return sendJson(res, 400, { error: 'Invalid card id.' });
        if (req.method === 'GET') {
          const record = await getCard(dataDir, id);
          return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: 'Card not found.' });
        }
        if (req.method === 'DELETE') {
          const existed = await deleteCard(dataDir, id);
          if (existed) recordCardDeleted();
          return existed ? sendJson(res, 200, { ok: true }) : sendJson(res, 404, { error: 'Card not found.' });
        }
        return methodNotAllowed(res);
      }

      const image = pathname.match(/^\/api\/cards\/([^/]+)\/image$/);
      if (image) {
        route = '/api/cards/:id/image';
        const [, id] = image;
        if (!isValidId(id)) return sendJson(res, 400, { error: 'Invalid card id.' });
        if (req.method !== 'GET') return methodNotAllowed(res);
        const png = await getCardImage(dataDir, id);
        if (!png) return sendJson(res, 404, { error: 'Image not found.' });
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length, 'Cache-Control': 'no-store' });
        return res.end(png);
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

async function handleCreate(req: IncomingMessage, res: ServerResponse, dataDir: string): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, error instanceof BodyTooLarge ? 413 : 400, { error: (error as Error).message });
  }
  const parsed = parseNewCard(body);
  if ('error' in parsed) return sendJson(res, 400, { error: parsed.error });
  const record = await createCard(dataDir, parsed.card, parsed.png);
  recordCardCreated();
  return sendJson(res, 201, record);
}

class BodyTooLarge extends Error {
  constructor() {
    super(`Request body exceeds ${MAX_BODY_BYTES} bytes.`);
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new BodyTooLarge());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const TEXT_FIELDS = ['title', 'format', 'source', 'layout', 'theme'] as const;

/** `{}` if every value is a string, otherwise `undefined` — rejects null, arrays, and mixed-type objects. */
function asStringRecord(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const entries = Object.entries(input);
  return entries.every(([, v]) => typeof v === 'string') ? Object.fromEntries(entries) : undefined;
}

/** Validates the untrusted POST body into a NewCard, or names what's wrong. */
function parseNewCard(body: unknown): { card: NewCard; png: Buffer } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Body must be an object.' };
  const value = body as Record<string, unknown>;

  for (const field of TEXT_FIELDS) {
    if (typeof value[field] !== 'string') return { error: `"${field}" must be a string.` };
  }
  if (value.format !== 'markdown' && value.format !== 'json')
    return { error: '"format" must be "markdown" or "json".' };
  const branding = asStringRecord(value.branding);
  if (!branding) return { error: '"branding" must be an object of strings.' };

  if (typeof value.scale !== 'number' || typeof value.width !== 'number' || typeof value.height !== 'number') {
    return { error: '"scale", "width" and "height" must be numbers.' };
  }
  if (typeof value.pngBase64 !== 'string' || !value.pngBase64) return { error: '"pngBase64" is required.' };

  let customPalette: Record<string, string> | undefined;
  if (value.customPalette !== undefined) {
    customPalette = asStringRecord(value.customPalette);
    if (!customPalette) return { error: '"customPalette" must be an object of strings.' };
  }

  let png: Buffer;
  try {
    png = Buffer.from(value.pngBase64 as string, 'base64');
  } catch {
    return { error: '"pngBase64" is not valid base64.' };
  }
  if (!png.length) return { error: '"pngBase64" decoded to no data.' };

  return {
    card: {
      title: (value.title as string).slice(0, 200),
      format: value.format,
      source: value.source as string,
      layout: value.layout as string,
      theme: value.theme as string,
      customPalette,
      branding,
      scale: value.scale as number,
      width: value.width as number,
      height: value.height as number,
    },
    png,
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

function methodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method not allowed.' });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Deletes cards older than `retentionDays` on a fixed interval. Public,
 * unauthenticated deployments have no other bound on `/data`'s growth, so
 * this is the retention policy, not just tidying — see CARD_RETENTION_DAYS.
 */
function scheduleCardPruning(dataDir: string, retentionDays: number): void {
  const maxAgeMs = retentionDays * DAY_MS;
  const sweep = async () => {
    try {
      const removed = await pruneExpiredCards(dataDir, maxAgeMs);
      recordCardsPruned(removed);
      if (removed) console.log(`Pruned ${removed} card(s) older than ${retentionDays}d.`);
    } catch (error) {
      console.error('Card retention sweep failed:', error);
    }
  };
  sweep();
  setInterval(sweep, PRUNE_INTERVAL_MS);
}

/* c8 ignore start -- exercised by running the server, not by unit tests */
async function main() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const dataDir = resolve(process.env.SANDBOX_DATA_DIR || './data');
  const port = Number(process.env.PORT) || 8787;
  const htmlPath = resolve(process.env.SANDBOX_HTML_PATH || './out/sandbox.html');
  const html = await readFile(htmlPath, 'utf8');
  const retentionDays = Number(process.env.CARD_RETENTION_DAYS) || 30;

  const server = createServer(createRequestListener({ dataDir, html }));
  server.listen(port, () => {
    console.log(`Social Card Sandbox listening on http://localhost:${port} (data: ${dataDir})`);
  });
  scheduleCardPruning(dataDir, retentionDays);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
}
/* c8 ignore stop */
