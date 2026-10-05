import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { FontFile, FontStylesheet } from './themes/types.js';

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

const toRule = (family: string, weight: string, data: Buffer): string =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format("woff2")}`;

function fontFaceRule(font: FontFile): Promise<string> {
  let rule = cache.get(font.file);
  if (!rule) {
    rule = readFile(resolveFontFile(font.file)).then((data) => toRule(font.family, String(font.weight), data));
    cache.set(font.file, rule);
  }
  return rule;
}

/** Reads `<property>: value` out of one `@font-face` block, with quotes stripped. */
function declaration(block: string, property: string): string | undefined {
  return block.match(new RegExp(String.raw`${property}\s*:\s*["']?([^;"']+)["']?\s*;`))?.[1]?.trim();
}

async function stylesheetRules({ stylesheet, families }: FontStylesheet): Promise<string[]> {
  const cssPath = resolveFontFile(stylesheet);
  const css = await readFile(cssPath, 'utf8');
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '');
  const faces = blocks.flatMap((block) => {
    const family = declaration(block, 'font-family');
    const weight = declaration(block, 'font-weight') ?? '400';
    const url = block.match(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/)?.[1];
    const style = declaration(block, 'font-style') ?? 'normal';
    return family && url && style === 'normal' && families.includes(family) ? [{ family, weight, url }] : [];
  });
  for (const family of families) {
    if (!faces.some((face) => face.family === family)) {
      throw new Error(`${stylesheet} has no normal-style woff2 face for font family "${family}".`);
    }
  }
  return Promise.all(
    faces.map(async ({ family, weight, url }) => toRule(family, weight, await readFile(join(dirname(cssPath), url)))),
  );
}

/**
 * Builds `@font-face` rules with the WOFF2 files inlined as base64 so the
 * rendered HTML is self-contained and the browser never needs the network.
 * Duplicate faces (two themes sharing one) are embedded once.
 */
export async function fontFaceCss(fonts: (FontFile | FontStylesheet)[]): Promise<string> {
  const rules = await Promise.all(
    fonts.map((font) => ('stylesheet' in font ? stylesheetRules(font) : fontFaceRule(font).then((rule) => [rule]))),
  );
  return [...new Set(rules.flat())].join('\n');
}
