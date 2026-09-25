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
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFaceCss } from '../src/fonts.js';
import { parseMarkdown } from '../src/markdown.js';
import { plexFont } from '../src/themes/denim.js';
import { THEMES } from '../src/themes/index.js';
import { validateCard } from '../src/validate.js';
import { SANDBOX_LANGUAGES, SANDBOX_SHIKI_THEMES } from '../web/sandbox/browser-highlight.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = resolve(ROOT, 'web/sandbox');
const OUT = resolve(ROOT, 'out/sandbox.html');

/**
 * The browser highlighter bundles a fixed set of Shiki themes, like its
 * fixed grammar set; a card theme whose Shiki theme is missing would throw
 * when picked in the sandbox, so the build fails here instead.
 */
function checkShikiThemes(): void {
  for (const theme of Object.values(THEMES)) {
    if (!SANDBOX_SHIKI_THEMES.includes(theme.shikiTheme)) {
      throw new Error(
        `Theme "${theme.name}" uses Shiki theme "${theme.shikiTheme}", which isn't bundled in the sandbox ` +
          `(bundled: ${SANDBOX_SHIKI_THEMES.join(', ')}). Add it to web/sandbox/browser-highlight.ts.`,
      );
    }
  }
}

/** The faces the sandbox's own UI uses: the design system's sans and mono. */
const UI_FONTS = [
  plexFont('IBM Plex Sans', 400, 'IBMPlexSans-Regular-Latin1'),
  plexFont('IBM Plex Sans', 500, 'IBMPlexSans-Medium-Latin1'),
  plexFont('IBM Plex Sans', 600, 'IBMPlexSans-SemiBold-Latin1'),
  plexFont('IBM Plex Mono', 400, 'IBMPlexMono-Regular-Latin1'),
  plexFont('IBM Plex Mono', 500, 'IBMPlexMono-Medium-Latin1'),
];

/**
 * Every theme's fonts plus the UI's, embedded once each, so the sandbox can
 * switch themes without reloading and never fetches a font.
 */
async function fontCss(): Promise<string> {
  const fonts = [...Object.values(THEMES).flatMap((theme) => theme.fonts), ...UI_FONTS];
  return fontFaceCss(fonts);
}

type SandboxExample = { label: string; content: string };

/**
 * The dropdown label a card source declares for itself, e.g. "stack · print".
 * Also checks every panel against SANDBOX_LANGUAGES: an example that only
 * the CLI's full Shiki bundle can render would throw at pick-time in the
 * sandbox dropdown instead of failing loudly here at build time.
 */
function sandboxLabel(name: string, content: string): string {
  const raw = name.endsWith('.md') ? parseMarkdown(content) : JSON.parse(content);
  const label = (raw as Record<string, unknown>).sandboxLabel;
  if (typeof label !== 'string' || !label) {
    throw new Error(`examples/${name} is missing a "sandboxLabel" field for the sandbox dropdown.`);
  }
  const card = validateCard(raw);
  for (const panel of card.panels) {
    if (!SANDBOX_LANGUAGES.includes(panel.language)) {
      throw new Error(
        `examples/${name} uses language "${panel.language}", which isn't bundled in the sandbox ` +
          `(bundled: ${SANDBOX_LANGUAGES.join(', ')}). Add it to web/sandbox/browser-highlight.ts or change the example.`,
      );
    }
  }
  return label;
}

async function exampleSources(): Promise<Record<string, SandboxExample>> {
  const dir = resolve(ROOT, 'examples');
  const names = (await readdir(dir)).filter((name) => /\.(md|json)$/.test(name)).sort();
  const entries = await Promise.all(
    names.map(async (name) => {
      const content = await readFile(resolve(dir, name), 'utf8');
      return [name, { label: sandboxLabel(name, content), content }] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function browserPlugin(fonts: string, examples: Record<string, SandboxExample>): Plugin {
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

checkShikiThemes();
const [fonts, examples] = await Promise.all([fontCss(), exampleSources()]);
const { version } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')) as { version: string };
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
const designTokens = await readFile(
  createRequire(import.meta.url).resolve('@manjunathhk/design-tokens/tokens.css'),
  'utf8',
);
const page = template
  .replace('/*__DESIGN_TOKENS__*/', () => designTokens)
  .replace('/*__BUNDLE__*/', () => bundle)
  .replace('/*__VERSION__*/', `v${version}`);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, page);
console.log(`Built ${OUT} (${(page.length / 1024).toFixed(0)} KB). Open it in a browser.`);
