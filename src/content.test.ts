import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { formatFromPath, parseContent } from './content.js';
import { parseHighlightSpec, parseMarkdown } from './markdown.js';
import { validateCard } from './validate.js';

const example = (name: string) => readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8');

const minimal = () => ({
  title: 'Title',
  subtitle: 'Subtitle',
  panels: [{ language: 'csharp', code: 'var x = 1;' }],
});

test('Markdown and JSON sources produce identical cards', async () => {
  const fromMarkdown = parseContent(await example('rabbitmq-idempotency.md'), 'markdown');
  const fromJson = parseContent(await example('rabbitmq-idempotency.json'), 'json');
  assert.deepEqual(fromMarkdown, fromJson);
  assert.equal(fromMarkdown.layout, 'stack');
  assert.equal(fromMarkdown.theme, 'print');
});

test('strips a UTF-8 BOM before parsing JSON', () => {
  const card = parseContent('﻿' + JSON.stringify(minimal()), 'json');
  assert.equal(card.title, 'Title');
});

test('formatFromPath recognises .md and .json only', () => {
  assert.equal(formatFromPath('card.MD'), 'markdown');
  assert.equal(formatFromPath('card.json'), 'json');
  assert.throws(() => formatFromPath('card.txt'), /\.md or \.json/);
});

test('Markdown: headings, verdict prefixes, highlight specs and notes', () => {
  const source = [
    '---',
    'title: T',
    'subtitle: S',
    'layout: columns',
    '---',
    '',
    '## ❌ Before',
    '```csharp {1,3-4}',
    'a',
    'b',
    'c',
    'd',
    '```',
    '- slow',
    '- allocates',
    '',
    '## ✅ After',
    '```cs',
    'e',
    '```',
  ].join('\n');
  const card = parseContent(source, 'markdown');
  assert.equal(card.layout, 'columns');
  assert.deepEqual(
    card.panels.map((p) => [p.label, p.verdict, p.language, p.highlightLines, p.notes]),
    [
      ['Before', 'bad', 'csharp', [1, 3, 4], ['slow', 'allocates']],
      ['After', 'good', 'csharp', [], []],
    ],
  );
});

test('Markdown: a fence without a heading is labelled with the language name', () => {
  const card = parseContent('---\ntitle: T\nsubtitle: S\n---\n```ts\nconst a = 1;\n```\n', 'markdown');
  assert.equal(card.panels[0].label, 'TypeScript');
  assert.equal(card.panels[0].language, 'typescript');
});

test('Markdown: errors point at the offending line', () => {
  assert.throws(() => parseMarkdown('```js\nx\n```'), /front matter/);
  assert.throws(() => parseMarkdown('---\ntitle: T\n---\nSome prose\n```js\nx\n```'), /Line 4: expected/);
  assert.throws(() => parseMarkdown('---\ntitle: T\n---\n## Only a heading\n'), /not followed by a code fence/);
  assert.throws(() => parseMarkdown('---\ntitle: T\n---\n```js\nnever closed'), /Line 4: code fence is never closed/);
  assert.throws(() => parseMarkdown('---\ntitle: T\n---\n```js {x}\na\n```'), /must look like \{1,3-5\}/);
  assert.throws(
    () => parseMarkdown('---\ntitle: T\n---\n## First\n```js\na\n```\n\n#### Second\n```js\nb\n```'),
    /Line 9: panel headings must use exactly "## Label"/,
  );
});

test('parseHighlightSpec expands ranges', () => {
  assert.deepEqual(parseHighlightSpec(undefined, 1), []);
  assert.deepEqual(parseHighlightSpec('{}', 1), []);
  assert.deepEqual(parseHighlightSpec('{2, 5-7}', 1), [2, 5, 6, 7]);
  assert.throws(() => parseHighlightSpec('{5-2}', 9), /Line 9: .*reversed/);
});

test('validation: numeric YAML scalars are accepted as text', () => {
  const card = validateCard({ ...minimal(), issue: 7, tags: [2024] });
  assert.equal(card.issue, '07'.slice(1));
  assert.deepEqual(card.tags, ['2024']);
});

test('validation: defaults and limits', () => {
  const card = validateCard(minimal());
  assert.equal(card.issue, '01');
  assert.equal(card.highlight, '');
  assert.deepEqual(card.tags, []);
  assert.throws(() => validateCard({ ...minimal(), title: '' }), /"title" is required/);
  assert.throws(() => validateCard({ ...minimal(), title: 'x'.repeat(71) }), /"title" must be at most 70/);
  assert.throws(() => validateCard({ ...minimal(), tags: ['a', 'b', 'c', 'd'] }), /at most 3/);
  assert.throws(() => validateCard({ ...minimal(), title: { nested: true } }), /"title" must be text/);
});

test('validation: legacy single-panel fields are rejected with a migration hint', () => {
  assert.throws(
    () => validateCard({ title: 'T', subtitle: 'S', language: 'csharp', code: 'x' }),
    /"code", "language".*panels/,
  );
  assert.throws(() => validateCard({ ...minimal(), after: {} }), /"after"/);
});

test('validation: layouts constrain panel counts and line counts', () => {
  const panel = { language: 'csharp', code: 'x' };
  assert.throws(() => validateCard({ ...minimal(), panels: [] }), /needs 1–2 panels/);
  assert.throws(() => validateCard({ ...minimal(), layout: 'columns', panels: [panel] }), /needs exactly 2 panels/);
  assert.throws(() => validateCard({ ...minimal(), layout: 'grid', panels: [panel, panel] }), /needs 3–4 panels/);
  assert.throws(() => validateCard({ ...minimal(), layout: 'sideways' }), /"layout" must be one of/);
  const tall = { language: 'csharp', code: Array.from({ length: 23 }, (_, i) => `line ${i}`).join('\n') };
  assert.throws(() => validateCard({ ...minimal(), panels: [tall] }), /23 lines; this layout allows at most 22/);
  const grid = validateCard({ ...minimal(), layout: 'grid', panels: [panel, panel, panel] });
  assert.equal(grid.panels.length, 3);
});

test('validation: languages resolve aliases and reject unknown ids', () => {
  assert.equal(validateCard({ ...minimal(), panels: [{ language: 'cs', code: 'x' }] }).panels[0].language, 'csharp');
  assert.throws(
    () => validateCard({ ...minimal(), panels: [{ language: 'brainfuckx', code: 'x' }] }),
    /not a known Shiki language/,
  );
  assert.throws(() => validateCard({ ...minimal(), panels: [{ code: 'x' }] }), /language is required/);
});

test('validation: panel decorations', () => {
  const panel = { language: 'csharp', code: 'var a = 1;\nvar b = 2;' };
  const ok = validateCard({
    ...minimal(),
    panels: [{ ...panel, highlightLines: [2, 1, 2], underline: ['var b'], verdict: 'good', notes: ['fine'] }],
  });
  assert.deepEqual(ok.panels[0].highlightLines, [1, 2]);
  assert.deepEqual(ok.panels[0].underline, ['var b']);
  assert.equal(ok.panels[0].verdict, 'good');
  assert.throws(() => validateCard({ ...minimal(), panels: [{ ...panel, highlightLines: [3] }] }), /between 1 and 2/);
  assert.throws(
    () => validateCard({ ...minimal(), panels: [{ ...panel, underline: ['missing'] }] }),
    /does not appear/,
  );
  assert.throws(() => validateCard({ ...minimal(), panels: [{ ...panel, verdict: 'meh' }] }), /"good" or "bad"/);
  assert.throws(() => validateCard({ ...minimal(), panels: [{ ...panel, notes: ['a', 'b', 'c', 'd'] }] }), /at most 3/);
});

test('validation: themes must exist', () => {
  assert.equal(validateCard({ ...minimal(), theme: 'vesper' }).theme, 'vesper');
  assert.throws(() => validateCard({ ...minimal(), theme: 'neon' }), /"theme" must be one of/);
});

test('every shipped example parses', async () => {
  for (const name of [
    'rabbitmq-idempotency.md',
    'rabbitmq-idempotency.json',
    'dto-validation.md',
    'ef-core-n-plus-one.json',
    'nginx-rate-limit.md',
    'compose-healthchecks.json',
    'angular-inject.md',
  ]) {
    const card = parseContent(await example(name), formatFromPath(name));
    assert.ok(card.panels.length >= 1, name);
  }
});
