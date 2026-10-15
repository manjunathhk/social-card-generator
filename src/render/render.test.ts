import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { brandingFromEnv } from '../branding.js';
import { formatFromPath, parseContent } from '../content.js';
import { FIT_SCRIPT } from '../fit-script.js';
import { capturePdf, capturePng, layoutDocument, openPage, withBrowser } from '../renderer.js';
import { validateCard } from '../validate.js';
import { renderDocument } from '../template.js';

/**
 * Browser-backed tests. They need a Chromium that Playwright can launch:
 * `npm run browser:install`, or point CARD_BROWSER_PATH at an existing binary.
 */

const branding = brandingFromEnv({ CARD_AUTHOR: 'Test Author' });
const browserOptions = { executablePath: process.env.CARD_BROWSER_PATH };

const loadExample = async (name: string) =>
  parseContent(await readFile(new URL(`../../examples/${name}`, import.meta.url), 'utf8'), formatFromPath(name));

function pngSize(png: Buffer): { width: number; height: number } {
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('renders every example layout to a 1080 × 1350 PNG, at 2x when asked', async () => {
  const cards = await Promise.all(
    [
      'rabbitmq-idempotency.md',
      'nginx-rate-limit.md',
      'compose-healthchecks.json',
      'angular-inject.md',
      'semantic-tokens.md',
      'theme-switch.json',
    ].map(loadExample),
  );
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    for (const card of cards) {
      const [fit] = await layoutDocument(page, await renderDocument([card], branding));
      assert.ok(fit.ok, `${card.title}: ${fit.reason}`);
      assert.deepEqual(pngSize(await capturePng(page)), { width: 1080, height: 1350 });
    }
    const retina = await openPage(browser, 2);
    await layoutDocument(retina, await renderDocument([cards[0]], branding));
    assert.deepEqual(pngSize(await capturePng(retina)), { width: 2160, height: 2700 });
  });
});

test('fit loop shrinks long code and reports overflow instead of clipping', async () => {
  const longLine = 'var result = someService.CallSomething(argumentOne, argumentTwo, argumentThree);';
  const shrinks = validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'csharp', code: longLine }] });
  const overflows = validateCard({
    title: 'T',
    subtitle: 'S',
    panels: [
      {
        language: 'csharp',
        code: Array(18)
          .fill(longLine + longLine)
          .join('\n'),
      },
    ],
  });
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    const [fit] = await layoutDocument(page, await renderDocument([shrinks], branding));
    assert.ok(fit.ok);
    assert.ok(fit.fontSize < 28 && fit.fontSize >= 18, `shrunk to ${fit.fontSize}`);
    const [bad] = await layoutDocument(page, await renderDocument([overflows], branding));
    assert.equal(bad.ok, false);
    assert.match(bad.reason ?? '', /does not fit at the minimum 18px/);
  });
});

test('several cards become a multi-page PDF', async () => {
  const cards = await Promise.all(
    ['ef-core-n-plus-one.json', 'nginx-rate-limit.md', 'dto-validation.md'].map(loadExample),
  );
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    const fits = await layoutDocument(page, await renderDocument(cards, branding));
    assert.ok(fits.every((fit) => fit.ok));
    const pdf = await capturePdf(page);
    assert.equal(pdf.toString('ascii', 0, 5), '%PDF-');
    assert.equal(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length, 3);
  });
});

test('diagram cards route their edges and render to a 1080 × 1350 PNG', async () => {
  const cards = await Promise.all(['background-workers.json', 'cache-aside.json'].map(loadExample));
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    for (const card of cards) {
      assert.equal(card.kind, 'diagram');
      if (card.kind !== 'diagram') continue;
      const [fit] = await layoutDocument(page, await renderDocument([card], branding));
      assert.ok(fit.ok, `${card.title}: ${fit.reason}`);
      assert.deepEqual(pngSize(await capturePng(page)), { width: 1080, height: 1350 });
      const drawn = await page.evaluate(() => ({
        edges: document.querySelectorAll('.dg-edge').length,
        heads: document.querySelectorAll('.dg-head').length,
        labels: [...document.querySelectorAll('.dg-label-main')].map((text) => text.textContent),
        keys: document.querySelectorAll('.dg-key').length,
      }));
      const { edges, legend } = card.diagram;
      assert.equal(drawn.edges, edges.length);
      assert.equal(
        drawn.heads,
        edges.reduce((sum, edge) => sum + edge.to.length, 0),
      );
      assert.deepEqual(drawn.labels, edges.map((edge) => edge.label).filter(Boolean));
      assert.equal(drawn.keys, legend.length);
    }
    // The sandbox re-runs the fit script on the same card; edges must not double up.
    const last = cards.at(-1)!;
    assert.equal(last.kind, 'diagram');
    await page.evaluate(FIT_SCRIPT);
    assert.equal(await page.locator('.dg-edge').count(), last.kind === 'diagram' ? last.diagram.edges.length : -1);
  });
});

test('a diagram that does not fit fails instead of clipping (AC 7)', async () => {
  const line = 'A long line of explanation that wraps onto several rows inside the node';
  const nodes = Array.from({ length: 10 }, (_, index) => ({
    id: `n${index}`,
    col: (index % 3) + 1,
    row: Math.floor(index / 3) + 1,
    eyebrow: 'Eyebrow',
    title: `Node ${index}`,
    lines: [line.slice(0, 60), line.slice(0, 60), line.slice(0, 60)],
  }));
  const card = validateCard({
    kind: 'diagram',
    title: 'T',
    subtitle: 'S',
    diagram: { legend: [{ id: 'x', label: 'X', tone: 'info' }], nodes, edges: [] },
  });
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    const [fit] = await layoutDocument(page, await renderDocument([card], branding));
    assert.equal(fit.ok, false);
    assert.match(fit.reason ?? '', /^diagram overflows by \d+px/);

    const edgeLabel = (labelSide?: string) =>
      validateCard({
        kind: 'diagram',
        title: 'T',
        subtitle: 'S',
        diagram: {
          legend: [{ id: 'x', label: 'X', tone: 'info' }],
          nodes: [nodes[2], { ...nodes[5], lines: [] }],
          edges: [{ from: 'n2.bottom', to: 'n5.top', type: 'x', label: 'after five retries', labelSide }],
        },
      });
    const [flipped] = await layoutDocument(page, await renderDocument([edgeLabel()], branding));
    assert.ok(flipped.ok, `a default label flips inward: ${flipped.reason}`);
    const [placed] = await layoutDocument(page, await renderDocument([edgeLabel('right')], branding));
    assert.match(placed.reason ?? '', /the label of diagram\.edges\[0\] leaves the diagram; try labelSide "left"/);
  });
});
