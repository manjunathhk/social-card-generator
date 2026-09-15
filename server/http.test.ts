import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequestListener } from './index.js';

/**
 * End-to-end route tests against a real server on an ephemeral port, using
 * the platform's own `fetch`. No mocking of the HTTP layer.
 */

const HTML = '<!doctype html><title>t</title><body>sandbox</body>';

async function withServer(work: (base: string) => Promise<void>) {
  const dataDir = await mkdtemp(join(tmpdir(), 'sandbox-http-'));
  const server: Server = createServer(createRequestListener({ dataDir, html: HTML }));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('expected a network address');
  try {
    await work(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
}

const validCard = {
  title: 'T',
  format: 'markdown',
  source: 'x',
  layout: '',
  theme: '',
  branding: {},
  scale: 1,
  width: 1080,
  height: 1350,
  pngBase64: Buffer.from('fake-png').toString('base64'),
};

test('serves the sandbox at / with no .html in the path, and answers health checks', () =>
  withServer(async (base) => {
    const page = await fetch(base + '/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
    assert.equal(await page.text(), HTML);

    const missing = await fetch(base + '/sandbox.html');
    assert.equal(missing.status, 404);

    const health = await fetch(base + '/api/health');
    assert.deepEqual(await health.json(), { ok: true });
  }));

test('creates, lists, fetches, serves the image for, and deletes a card', () =>
  withServer(async (base) => {
    const created = await fetch(base + '/api/cards', { method: 'POST', body: JSON.stringify(validCard) });
    assert.equal(created.status, 201);
    const record = await created.json();
    assert.equal(record.title, 'T');

    const list = await fetch(base + '/api/cards');
    assert.equal((await list.json()).cards.length, 1);

    const image = await fetch(`${base}/api/cards/${record.id}/image`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(Buffer.from(await image.arrayBuffer()).toString(), 'fake-png');

    const deleted = await fetch(`${base}/api/cards/${record.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);
    assert.equal((await fetch(`${base}/api/cards/${record.id}`)).status, 404);
  }));

test('rejects malformed input and path traversal attempts', () =>
  withServer(async (base) => {
    const missingField = await fetch(base + '/api/cards', {
      method: 'POST',
      body: JSON.stringify({ ...validCard, title: undefined }),
    });
    assert.equal(missingField.status, 400);

    const badFormat = await fetch(base + '/api/cards', {
      method: 'POST',
      body: JSON.stringify({ ...validCard, format: 'yaml' }),
    });
    assert.equal(badFormat.status, 400);

    const traversal = await fetch(base + '/api/cards/..%2f..%2fetc%2fpasswd');
    assert.equal(traversal.status, 400);

    assert.equal((await fetch(base + '/api/cards/00000000-0000-0000-0000-000000000000')).status, 404);
    assert.equal((await fetch(base + '/api/cards', { method: 'PATCH' })).status, 405);
  }));
