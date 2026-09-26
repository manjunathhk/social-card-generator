import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildCardSchema } from './card-schema.js';
import { validateCard } from './validate.js';

test('committed schema/card.schema.json matches a fresh generation (run npm run schema)', async () => {
  const committed: unknown = JSON.parse(await readFile(new URL('../schema/card.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(committed, buildCardSchema());
});

test('a JSON card may name its schema with $schema', () => {
  const card = validateCard({
    $schema: 'https://raw.githubusercontent.com/manjunathhk/social-card-generator/main/schema/card.schema.json',
    title: 'Title',
    subtitle: 'Subtitle',
    panels: [{ language: 'ts', code: 'let x = 1;' }],
  });
  assert.equal(card.title, 'Title');
});
