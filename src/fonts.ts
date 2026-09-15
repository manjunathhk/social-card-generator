import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { FontFile } from './themes/types.js';

const require = createRequire(import.meta.url);
const cache = new Map<string, Promise<string>>();

function fontFaceRule(font: FontFile): Promise<string> {
  let rule = cache.get(font.file);
  if (!rule) {
    rule = readFile(require.resolve(font.file)).then(
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
