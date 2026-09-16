import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import test from 'node:test';
import { createRequestListener } from './index.js';

/**
 * End-to-end route tests against a real server on an ephemeral port, using
 * the platform's own `fetch`. No mocking of the HTTP layer.
 */

const HTML = '<!doctype html><title>t</title><body>sandbox</body>';

async function withServer(work: (base: string) => Promise<void>) {
  const server: Server = createServer(createRequestListener({ html: HTML }));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('expected a network address');
  try {
    await work(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

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

test('serves branding read from the environment, blank fields included', async () => {
  // createRequestListener reads process.env once, at server creation, so the
  // container's branding vars must be set before withServer builds the listener.
  const previous = { author: process.env.CARD_AUTHOR, website: process.env.CARD_WEBSITE };
  process.env.CARD_AUTHOR = 'Env Author';
  delete process.env.CARD_WEBSITE;
  try {
    await withServer(async (base) => {
      const res = await fetch(base + '/api/branding');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.branding.author, 'Env Author');
      assert.equal(body.branding.website, '');
      assert.equal(body.branding.monogram, 'EA');
    });
  } finally {
    if (previous.author === undefined) delete process.env.CARD_AUTHOR;
    else process.env.CARD_AUTHOR = previous.author;
    if (previous.website === undefined) delete process.env.CARD_WEBSITE;
    else process.env.CARD_WEBSITE = previous.website;
  }
});

test('exposes Prometheus metrics reflecting request activity', () =>
  withServer(async (base) => {
    // The metrics registry is a process-wide singleton (like prom-client's default
    // registry), so counts only ever go up across tests sharing this process —
    // assert thresholds and shapes here, not exact values.
    await fetch(base + '/api/health');

    const res = await fetch(base + '/api/metrics');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
    const text = await res.text();

    assert.match(text, /^# TYPE http_requests_total counter$/m);
    assert.match(text, /http_requests_total\{method="GET",route="\/api\/health",status="200"\} \d+/);
    assert.match(text, /^# TYPE http_request_duration_seconds histogram$/m);
    assert.match(text, /http_request_duration_seconds_bucket\{.*route="\/api\/health".*le="\+Inf"\} \d+/);
    assert.match(text, /^process_uptime_seconds \d/m);
  }));

test('answers unmatched routes with 404', () =>
  withServer(async (base) => {
    assert.equal((await fetch(base + '/api/cards')).status, 404);
    assert.equal((await fetch(base + '/does-not-exist')).status, 404);
  }));
