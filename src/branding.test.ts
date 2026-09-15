import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { brandingFromEnv, initials, loadBranding } from './branding.js';

test('neutral defaults when nothing is configured', () => {
  const branding = brandingFromEnv({});
  assert.equal(branding.author, 'Your Name');
  assert.equal(branding.website, 'example.com');
  assert.equal(branding.monogram, 'YN');
  assert.equal(branding.footerMark, '');
});

test('blank values fall back and the monogram derives from the author', () => {
  assert.equal(brandingFromEnv({ CARD_WEBSITE: ' ' }).website, 'example.com');
  assert.equal(brandingFromEnv({ CARD_AUTHOR: 'Manjunath HK' }).monogram, 'MH');
  assert.equal(brandingFromEnv({ CARD_AUTHOR: 'Manjunath HK', CARD_MONOGRAM: 'MK' }).monogram, 'MK');
  assert.equal(brandingFromEnv({ CARD_FOOTER_MARK: ' ' }).footerMark, '');
});

test('initials', () => {
  assert.equal(initials('Ada Lovelace'), 'AL');
  assert.equal(initials('Ada Byron Lovelace'), 'AL');
  assert.equal(initials('plato'), 'PL');
});

test('env file loads and shell values take precedence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-branding-'));
  const file = join(dir, '.env');
  const previous = { author: process.env.CARD_AUTHOR, website: process.env.CARD_WEBSITE };
  try {
    await writeFile(file, 'CARD_AUTHOR="File Author"\nCARD_WEBSITE="example.test"\n');
    process.env.CARD_AUTHOR = 'Shell Author';
    delete process.env.CARD_WEBSITE;
    const branding = loadBranding(file);
    assert.equal(branding.author, 'Shell Author');
    assert.equal(branding.website, 'example.test');
    assert.doesNotThrow(() => loadBranding(join(dir, 'missing.env')));
  } finally {
    for (const [key, value] of [
      ['CARD_AUTHOR', previous.author],
      ['CARD_WEBSITE', previous.website],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
