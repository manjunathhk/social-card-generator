import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SANDBOX_LANGUAGES } from '../web/sandbox/browser-highlight.js';
import { parseContent } from './content.js';
import { DEFAULT_LAYOUT, LAYOUTS, LAYOUT_RULES, MAX_NOTES, MAX_TAGS, MAX_UNDERLINES, TEXT_LIMITS } from './schema.js';
import { DEFAULT_THEME, THEME_NAMES } from './themes/index.js';

/**
 * skills/social-card-source/SKILL.md is read by agents that never see this
 * repo, so its tables must match the validator. These tests parse them.
 */

const skill = await readFile(new URL('../skills/social-card-source/SKILL.md', import.meta.url), 'utf8');

/** Rows of the first Markdown table after `heading`, keyed by the first cell with backticks stripped. */
function table(heading: string): Map<string, string[]> {
  const lines = skill.split('\n');
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `SKILL.md has no "${heading}" section`);
  const rows = new Map<string, string[]>();
  let index = start + 1;
  while (index < lines.length && !lines[index].startsWith('|')) index += 1;
  for (index += 2; index < lines.length && lines[index].startsWith('|'); index += 1) {
    const cells = lines[index]
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    rows.set(cells[0].replace(/`/g, ''), cells.slice(1));
  }
  return rows;
}

const numbers = (text: string) => (text.match(/\d+/g) ?? []).map(Number);
const codeNames = (text: string) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

test('SKILL.md front matter follows the Agent Skills spec', () => {
  const frontMatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  assert.match(frontMatter, /^name: social-card-source$/m, 'name must match the directory');
  const description = frontMatter.match(/^description: (.+)$/m)?.[1] ?? '';
  assert.ok(description.length > 0 && description.length <= 1024, 'description must be 1 to 1024 characters');
});

test('SKILL.md card fields table matches src/schema.ts', () => {
  const rows = table('### Card fields');
  const limit = (field: string) => numbers(rows.get(field)?.[2] ?? '');
  assert.deepEqual(
    [...rows.keys()],
    ['title', 'highlight', 'subtitle', 'tags', 'insight', 'issue', 'layout', 'theme', 'panels'],
  );
  for (const field of ['title', 'highlight', 'subtitle', 'insight', 'issue'] as const) {
    assert.deepEqual(limit(field), [TEXT_LIMITS[field]], field);
  }
  assert.deepEqual(limit('tags'), [MAX_TAGS, TEXT_LIMITS.tag]);
  assert.deepEqual(codeNames(rows.get('layout')![2]), [...LAYOUTS]);
  assert.deepEqual(codeNames(rows.get('layout')![1]), [DEFAULT_LAYOUT]);
  assert.deepEqual(codeNames(rows.get('theme')![2]), THEME_NAMES);
  assert.deepEqual(codeNames(rows.get('theme')![1]), [DEFAULT_THEME]);
});

test('SKILL.md panel fields table matches src/schema.ts', () => {
  const rows = table('### Panel fields');
  const limit = (field: string) => numbers(rows.get(field)?.[1] ?? '');
  assert.deepEqual(limit('label'), [TEXT_LIMITS.label]);
  assert.deepEqual(limit('code'), [TEXT_LIMITS.code]);
  assert.deepEqual(limit('notes'), [MAX_NOTES, TEXT_LIMITS.note]);
  assert.deepEqual(limit('underline'), [MAX_UNDERLINES]);
});

test('SKILL.md layouts table matches LAYOUT_RULES', () => {
  const rows = table('### Layouts');
  assert.deepEqual([...rows.keys()], [...LAYOUTS]);
  for (const layout of LAYOUTS) {
    const rule = LAYOUT_RULES[layout];
    const [panels, lines, font] = rows.get(layout)!;
    const counts = Array.from({ length: rule.maxPanels - rule.minPanels + 1 }, (_, i) => rule.minPanels + i);
    const limits = counts.map((count) => rule.maxLines(count));
    assert.deepEqual(numbers(panels), [...new Set([rule.minPanels, rule.maxPanels])], `${layout} panels`);
    assert.deepEqual(numbers(lines), new Set(limits).size === 1 ? [limits[0]] : limits, `${layout} lines`);
    assert.deepEqual(numbers(font), [rule.fontMax, rule.fontMin], `${layout} font`);
  }
});

test('SKILL.md themes and sandbox languages match the registries', () => {
  assert.deepEqual([...table('## Themes').keys()], THEME_NAMES);
  const line = skill.split('\n').find((text) => text.includes('The sandbox bundles these languages only')) ?? '';
  assert.deepEqual(codeNames(line.slice(line.indexOf('only'), line.indexOf('Any other'))), SANDBOX_LANGUAGES);
});

test('SKILL.md examples are valid cards', () => {
  const markdown = skill.match(/````markdown\n([\s\S]*?)\n````/)?.[1];
  const json = skill.match(/```json\n([\s\S]*?)\n```/)?.[1];
  assert.ok(markdown && json, 'SKILL.md needs a Markdown and a JSON example');
  assert.equal(parseContent(markdown, 'markdown').panels.length, 2);
  assert.equal(parseContent(json, 'json').panels.length, 1);
});

test('SKILL.md has no em dashes', () => {
  assert.ok(!skill.includes('—'));
});
