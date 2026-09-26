import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCardSchema } from './card-schema.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Runs the CLI source through tsx; none of these flags launch Chromium. */
function cli(...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], { cwd: root, encoding: 'utf8' });
}

test('--schema prints the generated schema', () => {
  const result = cli('--schema');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), buildCardSchema());
});

test('--check accepts every shipped example', () => {
  const result = cli('--check', 'examples');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid .*nginx-rate-limit\.md \(columns, 2 panels\)/);
});

test('--check exits non-zero and names the field of every invalid input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-check-'));
  const tooLong = join(dir, 'too-long.json');
  const tooMany = join(dir, 'too-many.json');
  const panel = { language: 'ts', code: 'let x = 1;' };
  await writeFile(
    tooLong,
    JSON.stringify({ title: 'T', subtitle: 'S', panels: [{ ...panel, notes: ['x'.repeat(71)] }] }),
  );
  await writeFile(tooMany, JSON.stringify({ title: 'T', subtitle: 'S', layout: 'columns', panels: [panel] }));

  const result = cli('--check', tooLong, tooMany);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /too-long\.json: panels\[0\]\.notes\[0\] must be 1–70 characters/);
  assert.match(result.stderr, /too-many\.json: Layout "columns" needs exactly 2 panels/);
});
