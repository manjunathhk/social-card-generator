import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const FONT_FILES = [
  { family: 'Inter', weight: 400, file: '@fontsource/inter/files/inter-latin-400-normal.woff2' },
  { family: 'Inter', weight: 700, file: '@fontsource/inter/files/inter-latin-700-normal.woff2' },
  { family: 'Inter', weight: 800, file: '@fontsource/inter/files/inter-latin-800-normal.woff2' },
  { family: 'Mono', weight: 400, file: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2' },
];

let cssPromise: Promise<string> | undefined;

/**
 * Builds `@font-face` rules with the WOFF2 files inlined as base64 so the
 * rendered HTML is self-contained and the browser never needs the network.
 */
export function fontFaceCss(): Promise<string> {
  cssPromise ??= Promise.all(
    FONT_FILES.map(async ({ family, weight, file }) => {
      const data = (await readFile(require.resolve(file))).toString('base64');
      return `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2")}`;
    }),
  ).then((rules) => rules.join('\n'));
  return cssPromise;
}
