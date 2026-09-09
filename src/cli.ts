#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadBranding } from './branding.js';
import { formatFromPath, parseContent } from './content.js';
import { capturePdf, capturePng, layoutDocument, openPage, withBrowser } from './renderer.js';
import type { Card } from './schema.js';
import { renderDocument } from './template.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const USAGE = `social-card ${version}
Render 1080 × 1350 technical social cards from Markdown or JSON.

Usage
  social-card <input.md|input.json|directory>... [options]

Options
  --out-dir <dir>   Directory for PNG output (default: out)
  --out <file.png>  Explicit PNG path; allowed with exactly one input
  --pdf <file.pdf>  Also write every card, in order, as one multi-page PDF (a LinkedIn carousel)
  --pdf-only        Write the PDF but skip the PNGs
  --scale <1|2|3>   Device scale factor for PNGs (default: 1; use 2 for crisper text)
  --html            Also write the rendered HTML next to each PNG for debugging
  --env <file>      Branding env file (default: .env in the current directory)
  --help            Show this help
  --version         Print the version

Environment
  CARD_BROWSER_PATH  Path to a Chromium binary, if you do not want Playwright's managed download.

Existing output files are replaced only after validation and the layout fit check pass.`;

type Options = {
  outDir: string;
  out?: string;
  pdf?: string;
  pdfOnly: boolean;
  scale: number;
  html: boolean;
  env?: string;
};

type LoadedCard = { file: string; card: Card };

export async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'out-dir': { type: 'string', default: 'out' },
      out: { type: 'string' },
      pdf: { type: 'string' },
      'pdf-only': { type: 'boolean', default: false },
      scale: { type: 'string', default: '1' },
      html: { type: 'boolean', default: false },
      env: { type: 'string' },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
  });

  if (values.version) {
    console.log(version);
    return;
  }
  if (values.help || !positionals.length) {
    console.log(USAGE);
    return;
  }

  const options = readOptions(values, positionals.length);
  const inputs = await expandInputs(positionals);
  if (!options.out && !options.pdfOnly) rejectDuplicateStems(inputs);
  const branding = loadBranding(options.env);
  const cards = await loadCards(inputs);

  await withBrowser({ executablePath: process.env.CARD_BROWSER_PATH }, async (browser) => {
    const page = await openPage(browser, options.scale);

    if (!options.pdfOnly) {
      for (const loaded of cards) {
        const html = await renderDocument([loaded.card], branding);
        const [fit] = await layoutDocument(page, html);
        if (!fit.ok) throw new Error(`${loaded.file}: ${fit.reason}.`);

        const png = await capturePng(page);
        const target = options.out ? resolve(options.out) : resolve(options.outDir, `${stem(loaded.file)}.png`);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, png);
        if (options.html) await writeFile(target.replace(/\.png$/i, '.html'), html);
        console.log(`Rendered ${target} (code ${fit.fontSize}px, scale ${options.scale}x)`);
      }
    }

    if (options.pdf) {
      const html = await renderDocument(
        cards.map((loaded) => loaded.card),
        branding,
      );
      const fits = await layoutDocument(page, html);
      const failed = fits.findIndex((fit) => !fit.ok);
      if (failed !== -1) throw new Error(`${cards[failed].file}: ${fits[failed].reason}.`);

      const pdf = await capturePdf(page);
      const target = resolve(options.pdf);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, pdf);
      console.log(`Rendered ${target} (${cards.length} page${cards.length === 1 ? '' : 's'})`);
    }
  });
}

function readOptions(values: Record<string, unknown>, inputCount: number): Options {
  const scale = Number(values.scale);
  if (![1, 2, 3].includes(scale)) throw new Error('--scale must be 1, 2 or 3.');

  const out = values.out as string | undefined;
  if (out && extname(out).toLowerCase() !== '.png') throw new Error('--out must end in .png.');
  if (out && inputCount !== 1) throw new Error('--out works with exactly one input; use --out-dir for several.');

  const pdf = values.pdf as string | undefined;
  if (pdf && extname(pdf).toLowerCase() !== '.pdf') throw new Error('--pdf must end in .pdf.');
  const pdfOnly = Boolean(values['pdf-only']);
  if (pdfOnly && !pdf) throw new Error('--pdf-only requires --pdf <file.pdf>.');

  return {
    outDir: values['out-dir'] as string,
    out,
    pdf,
    pdfOnly,
    scale,
    html: Boolean(values.html),
    env: values.env as string | undefined,
  };
}

/** Files are taken as given; directories contribute their .md and .json files in name order. */
async function expandInputs(paths: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const path of paths) {
    const full = resolve(path);
    const info = await stat(full).catch(() => {
      throw new Error(`Input not found: ${path}`);
    });
    if (info.isDirectory()) {
      const entries = (await readdir(full))
        .filter((name) => ['.md', '.json'].includes(extname(name).toLowerCase()))
        .sort();
      if (!entries.length) throw new Error(`No .md or .json files in ${path}`);
      files.push(...entries.map((name) => join(full, name)));
    } else {
      formatFromPath(full);
      files.push(full);
    }
  }
  return files;
}

async function loadCards(files: string[]): Promise<LoadedCard[]> {
  return Promise.all(
    files.map(async (file) => {
      try {
        const card = parseContent(await readFile(file, 'utf8'), formatFromPath(file));
        return { file, card };
      } catch (error) {
        throw new Error(`${file}: ${(error as Error).message}`);
      }
    }),
  );
}

/** Two inputs with the same base name would silently overwrite each other's PNG. */
function rejectDuplicateStems(files: string[]) {
  const seen = new Map<string, string>();
  for (const file of files) {
    const previous = seen.get(stem(file));
    if (previous) {
      throw new Error(
        `${basename(previous)} and ${basename(file)} would both write ${stem(file)}.png; rename one or render them separately.`,
      );
    }
    seen.set(stem(file), file);
  }
}

function stem(file: string): string {
  return basename(file, extname(file));
}

main(process.argv.slice(2)).catch((error: Error) => {
  console.error(`Card generation failed: ${error.message}`);
  process.exitCode = 1;
});
