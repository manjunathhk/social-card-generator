import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

test('built sandbox loads an example offline and exports a 1x PNG', async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/build-sandbox.ts'], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
  });
  const browser = await chromium.launch({ executablePath: process.env.CARD_BROWSER_PATH });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(pathToFileURL(fileURLToPath(new URL('../../out/sandbox.html', import.meta.url))).href);
    await page.locator('#example').selectOption({ index: 1 });
    await page.waitForFunction(() => document.querySelector('#s-fit')?.textContent?.includes('fits'));
    assert.equal(await page.locator('#overflow').isHidden(), true);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-1').click();
    const download = await downloadPromise;
    const png = await readFile(await download.path());
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), 1080);
    assert.equal(png.readUInt32BE(20), 1350);
  } finally {
    await browser.close();
  }
});
