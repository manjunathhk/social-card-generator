import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { brandingFromEnv, loadBranding } from './branding.js';

test('every field is blank when nothing is configured', () => {
  const branding = brandingFromEnv({});
  assert.equal(branding.author, '');
  assert.equal(branding.website, '');
  assert.equal(branding.series, '');
  assert.equal(branding.footerMark, '');
  assert.equal(branding.issueLabel, '');
  assert.equal(branding.linkedin, '');
  assert.equal(branding.twitter, '');
  assert.equal(branding.credit, false);
});

test('blank values stay blank', () => {
  assert.equal(brandingFromEnv({ CARD_WEBSITE: ' ' }).website, '');
  assert.equal(brandingFromEnv({ CARD_FOOTER_MARK: ' ' }).footerMark, '');
  assert.equal(brandingFromEnv({ CARD_LINKEDIN: ' ' }).linkedin, '');
});

test('social links are read verbatim from the environment', () => {
  const branding = brandingFromEnv({ CARD_LINKEDIN: 'linkedin.com/in/example', CARD_TWITTER: '@example' });
  assert.equal(branding.linkedin, 'linkedin.com/in/example');
  assert.equal(branding.twitter, '@example');
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

test('explicitly missing env file throws with its filename', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-branding-'));
  try {
    assert.throws(() => loadBranding(join(dir, 'missing.env')), /missing\.env/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('missing default .env is optional and leaves branding blank', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-branding-'));
  const cwd = process.cwd();
  const keys = [
    'CARD_AUTHOR',
    'CARD_WEBSITE',
    'CARD_SERIES',
    'CARD_FOOTER_MARK',
    'CARD_ISSUE_LABEL',
    'CARD_LINKEDIN',
    'CARD_TWITTER',
    'CARD_CREDIT',
  ] as const;
  const previous = keys.map((key) => [key, process.env[key]] as const);
  try {
    process.chdir(dir);
    for (const key of keys) delete process.env[key];
    assert.deepEqual(loadBranding(), brandingFromEnv({}));
  } finally {
    process.chdir(cwd);
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
