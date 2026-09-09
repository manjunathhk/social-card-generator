import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseContent, escapeHtml } from './content.js';
import { brandingFromEnv, loadBranding } from './branding.js';
import { renderHtml } from './template.js';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const sample = await readFile(new URL('../examples/redis-caching.json', import.meta.url), 'utf8');
test('branding defaults and blank values', () => {
  assert.equal(brandingFromEnv({}).author, 'Manjunath HK');
  assert.equal(brandingFromEnv({}).monogram, 'MK');
  assert.equal(brandingFromEnv({}).footerMark, '');
  assert.equal(brandingFromEnv({ CARD_FOOTER_MARK: ' ' }).footerMark, '');
  assert.equal(brandingFromEnv({ CARD_WEBSITE: ' ' }).website, 'manjunathhk.in');
  assert.equal(brandingFromEnv({ CARD_AUTHOR: 'Custom Author' }).author, 'Custom Author');
});
test('footer mark HTML is optional and escaped when supplied', async () => {
  const card = parseContent(sample);
  const without = await renderHtml(card, brandingFromEnv({}));
  assert.ok(!without.includes('<div class="footer-mark">'));
  assert.ok(without.includes('class="mark">MK<span>'));
  const withMark = await renderHtml(card, brandingFromEnv({ CARD_FOOTER_MARK: '<MK>' }));
  assert.ok(withMark.includes('<div class="footer-mark">&lt;MK&gt;<span>↗</span></div>'));
});
test('env file loads and shell values take precedence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-branding-'));
  const file = join(dir, '.env');
  const previousAuthor = process.env.CARD_AUTHOR;
  const previousWebsite = process.env.CARD_WEBSITE;
  try {
    await writeFile(file, 'CARD_AUTHOR="File Author"\nCARD_WEBSITE="example.test"\n');
    process.env.CARD_AUTHOR = 'Shell Author';
    delete process.env.CARD_WEBSITE;
    const branding = loadBranding(file);
    assert.equal(branding.author, 'Shell Author');
    assert.equal(branding.website, 'example.test');
    assert.doesNotThrow(() => loadBranding(join(dir, 'missing.env')));
  } finally {
    if (previousAuthor === undefined) delete process.env.CARD_AUTHOR; else process.env.CARD_AUTHOR = previousAuthor;
    if (previousWebsite === undefined) delete process.env.CARD_WEBSITE; else process.env.CARD_WEBSITE = previousWebsite;
    await unlink(file);
    await rmdir(dir);
  }
});
test('JSON supports a BOM and normalizes code', () => {
  assert.equal(parseContent(sample).language, 'csharp');
  assert.equal(parseContent('\uFEFF' + sample.replace(/^\uFEFF/, '')).title, 'Redis caching in .NET');
});
test('Markdown and JSON produce identical cards', async () => {
  assert.deepEqual(parseContent(await readFile(new URL('../examples/redis-caching.md', import.meta.url), 'utf8'), true), parseContent(sample));
});
test('rejects oversized content and malformed Markdown', () => {
  const card = JSON.parse(sample.replace(/^\uFEFF/, ''));
  assert.throws(() => parseContent(JSON.stringify({ ...card, code: 'x\n'.repeat(24) })), /22 lines/);
  assert.throws(() => parseContent(JSON.stringify({ ...card, title: 123 })), /title/);
  assert.throws(() => parseContent('```js\nx\n```', true), /front matter/);
});
test('escapes markup in user text', () => {
  assert.equal(escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});
test('comparison validates highlight lines and code', async () => {
  const text = await readFile(new URL('../examples/before-after.json', import.meta.url), 'utf8');
  const card = JSON.parse(text.replace(/^\uFEFF/, ''));
  assert.deepEqual(card.after?.highlightLines, [5, 6]);
  assert.throws(() => parseContent(JSON.stringify({ ...card, after: { ...card.after, highlightLines: [99] } })), /line numbers/);
  assert.throws(() => parseContent(JSON.stringify({ ...card, after: { ...card.after, code: '' } })), /requires code/);
});
test('independent Markdown panels and optional insight', async () => {
  const card = parseContent(await readFile(new URL('../examples/typescript-javascript.md', import.meta.url), 'utf8'), true);
  assert.deepEqual(card.panels.map(p => p.language), ['typescript', 'javascript']);
  assert.deepEqual(card.panels.map(p => p.label), ['TypeScript', 'JavaScript']);
  assert.equal(card.insight, '');
  assert.throws(() => parseContent(JSON.stringify({ ...card, panels: [...card.panels, card.panels[0]] })), /1 or 2/);
});
