import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseContent, escapeHtml } from './content.js';
const sample = await readFile(new URL('../examples/redis-caching.json', import.meta.url), 'utf8');
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
