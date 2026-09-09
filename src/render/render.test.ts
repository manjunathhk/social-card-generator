import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { brandingFromEnv } from '../branding.js';
import { formatFromPath, parseContent } from '../content.js';
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
    ['redis-caching.md', 'span-columns.md', 'concurrency-grid.json', 'dependency-injection.md'].map(loadExample),
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
        code: Array(22)
          .fill(longLine + longLine)
          .join('\n'),
      },
    ],
  });
  await withBrowser(browserOptions, async (browser) => {
    const page = await openPage(browser, 1);
    const [fit] = await layoutDocument(page, await renderDocument([shrinks], branding));
    assert.ok(fit.ok);
    assert.ok(fit.fontSize < 20 && fit.fontSize >= 16, `shrunk to ${fit.fontSize}`);
    const [bad] = await layoutDocument(page, await renderDocument([overflows], branding));
    assert.equal(bad.ok, false);
    assert.match(bad.reason ?? '', /does not fit at the minimum 16px/);
  });
});

test('several cards become a multi-page PDF', async () => {
  const cards = await Promise.all(
    ['before-after.json', 'span-columns.md', 'typescript-javascript.md'].map(loadExample),
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
