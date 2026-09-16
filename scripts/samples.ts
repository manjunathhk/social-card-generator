/**
 * Regenerates the committed showcase images in ./sample from ./examples.
 *
 *   npm run samples            # runs the TypeScript source through tsx
 *   npm run samples -- --built # runs the compiled dist/cli.js (used by CI)
 *
 * Uses examples/branding.env so the output is reproducible regardless of the
 * local .env. The list is explicit because rabbitmq-idempotency exists as
 * both .md and .json to demonstrate the two formats, and both would render
 * to the same file name.
 */
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SAMPLES = [
  'rabbitmq-idempotency.md',
  'ef-core-n-plus-one.json',
  'dto-validation.md',
  'nginx-rate-limit.md',
  'compose-healthchecks.json',
  'angular-inject.md',
];

const root = fileURLToPath(new URL('..', import.meta.url));
const built = process.argv.includes('--built');
await rm(new URL('../sample', import.meta.url), { recursive: true, force: true });

const command = built ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const entry = built ? ['dist/cli.js'] : ['tsx', 'src/cli.ts'];
const args = [
  ...entry,
  ...SAMPLES.map((name) => `examples/${name}`),
  '--out-dir',
  'sample',
  '--pdf',
  'sample/carousel.pdf',
  '--env',
  'examples/branding.env',
];

const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 1));
