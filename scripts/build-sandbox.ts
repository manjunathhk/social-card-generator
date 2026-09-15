/**
 * Builds the browser sandbox: one self-contained HTML file at out/sandbox.html
 * that runs the card core (parser, validator, templates, themes, fit loop) in
 * a browser with a live editor and PNG export.
 *
 *   npm run sandbox          # writes out/sandbox.html; open it in a browser
 *
 * How the Node-only pieces are handled:
 * - src/fonts.ts reads WOFF2 files from disk → replaced by a virtual module
 *   whose CSS is generated here at build time.
 * - src/highlight.ts uses Shiki's full bundle and WASM engine → replaced by
 *   web/sandbox/browser-highlight.ts (JavaScript regex engine, fixed grammars).
 * - The `shiki` package's language and theme tables reference every grammar
 *   through dynamic imports; those are marked external so they are not
 *   inlined (they are never called in the sandbox).
 * - `node:path` and `node:process` get tiny shims for the two functions the
 *   core touches.
 */
import { build, type Plugin } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = resolve(ROOT, 'web/sandbox');
const OUT = resolve(ROOT, 'out/sandbox.html');
const require = createRequire(import.meta.url);

const FONT_FILES = [
  ['Inter', 400, '@fontsource/inter/files/inter-latin-400-normal.woff2'],
  ['Inter', 700, '@fontsource/inter/files/inter-latin-700-normal.woff2'],
  ['Inter', 800, '@fontsource/inter/files/inter-latin-800-normal.woff2'],
  ['Mono', 400, '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'],
] as const;

async function fontCss(): Promise<string> {
  const rules = await Promise.all(
    FONT_FILES.map(async ([family, weight, file]) => {
      const data = (await readFile(require.resolve(file))).toString('base64');
      return `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2")}`;
    }),
  );
  return rules.join('\n');
}

async function exampleSources(): Promise<Record<string, string>> {
  const dir = resolve(ROOT, 'examples');
  const names = (await readdir(dir)).filter((name) => /\.(md|json)$/.test(name)).sort();
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(resolve(dir, name), 'utf8')]));
  return Object.fromEntries(entries);
}

function browserPlugin(fonts: string, examples: Record<string, string>): Plugin {
  return {
    name: 'sandbox-browser',
    setup(b) {
      b.onResolve({ filter: /^virtual:(fonts|examples)$/ }, (args) => ({ path: args.path, namespace: 'virtual' }));
      b.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => ({
        contents:
          args.path === 'virtual:fonts'
            ? `export const FONT_CSS = ${JSON.stringify(fonts)}; export async function fontFaceCss() { return FONT_CSS; }`
            : `export default ${JSON.stringify(examples)};`,
        loader: 'js',
      }));

      b.onResolve({ filter: /^\.\/(highlight|fonts)\.js$/ }, (args) => {
        if (!args.importer.startsWith(resolve(ROOT, 'src'))) return undefined;
        return args.path.includes('highlight')
          ? { path: resolve(WEB, 'browser-highlight.ts') }
          : { path: 'virtual:fonts', namespace: 'virtual' };
      });

      b.onResolve({ filter: /^node:(process|path)$/ }, (args) => ({ path: args.path, namespace: 'node-shim' }));
      b.onLoad({ filter: /.*/, namespace: 'node-shim' }, (args) => ({
        contents:
          args.path === 'node:path'
            ? 'export function extname(p){const m=/\\.[^./\\\\]+$/.exec(p);return m?m[0]:"";}'
            : 'export function loadEnvFile(){throw new Error("loadEnvFile is not available in the browser");}',
        loader: 'js',
      }));

      b.onResolve({ filter: /^@shikijs\/(langs|themes)\// }, (args) =>
        args.kind === 'dynamic-import' ? { path: args.path, external: true } : undefined,
      );
    },
  };
}

function buildTag(): string {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim();
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    return `core from ${branch} @ ${sha}`;
  } catch {
    return 'core from working tree';
  }
}

const [fonts, examples] = await Promise.all([fontCss(), exampleSources()]);
const result = await build({
  entryPoints: [resolve(WEB, 'entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  write: false,
  plugins: [browserPlugin(fonts, examples)],
  logLevel: 'warning',
});

const bundle = result.outputFiles[0].text;
const template = await readFile(resolve(WEB, 'index.template.html'), 'utf8');
const page = template.replace('/*__BUNDLE__*/', () => bundle).replace('/*__BUILD_TAG__*/', buildTag());
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, page);
console.log(`Built ${OUT} (${(page.length / 1024).toFixed(0)} KB). Open it in a browser.`);
