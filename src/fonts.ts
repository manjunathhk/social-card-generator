import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { FontFile } from './themes/types.js';

const require = createRequire(import.meta.url);
const cache = new Map<string, Promise<string>>();

/**
 * Resolves `<package>/<path inside it>` to a file on disk. `@fontsource`
 * packages export their font files; `@manjunathhk/design-tokens` does not
 * (its exports map lists stylesheets and data only), so for a path the
 * package doesn't export, the file is found next to its `package.json`.
 */
function resolveFontFile(file: string): string {
  try {
    return require.resolve(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    const segments = file.split('/');
    const nameLength = file.startsWith('@') ? 2 : 1;
    const packageJson = require.resolve(`${segments.slice(0, nameLength).join('/')}/package.json`);
    return join(dirname(packageJson), ...segments.slice(nameLength));
  }
}

function fontFaceRule(font: FontFile): Promise<string> {
  let rule = cache.get(font.file);
  if (!rule) {
    rule = readFile(resolveFontFile(font.file)).then(
      (data) =>
        `@font-face{font-family:"${font.family}";font-weight:${font.weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format("woff2")}`,
    );
    cache.set(font.file, rule);
  }
  return rule;
}

/**
 * Builds `@font-face` rules with the WOFF2 files inlined as base64 so the
 * rendered HTML is self-contained and the browser never needs the network.
 * Duplicate files (two themes sharing a face) are embedded once.
 */
export async function fontFaceCss(fonts: FontFile[]): Promise<string> {
  const unique = [...new Map(fonts.map((font) => [font.file, font])).values()];
  return (await Promise.all(unique.map(fontFaceRule))).join('\n');
}
