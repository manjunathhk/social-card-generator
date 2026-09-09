import { chromium, type Browser, type Page } from 'playwright';
import { FIT_SCRIPT } from './fit-script.js';
import { CARD_HEIGHT, CARD_WIDTH } from './schema.js';

/**
 * Playwright side of the pipeline: open Chromium, load the HTML, run the
 * in-page fit loop, then capture a PNG or a multi-page PDF.
 */

export type FitResult = { ok: boolean; fontSize: number; reason?: string };

export type BrowserOptions = {
  /** Explicit Chromium binary; falls back to the Playwright-managed download. */
  executablePath?: string;
};

export async function withBrowser<T>(options: BrowserOptions, work: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ executablePath: options.executablePath || undefined });
  try {
    return await work(browser);
  } finally {
    await browser.close();
  }
}

export async function openPage(browser: Browser, scale: number): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
    deviceScaleFactor: scale,
  });
  // Everything is inlined; refuse any request so output never depends on the network.
  await page.route('**/*', (route) => route.abort());
  return page;
}

/** Loads the document, waits for embedded fonts, and fits every card's code. */
export async function layoutDocument(page: Page, html: string): Promise<FitResult[]> {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate<FitResult[]>(FIT_SCRIPT);
}

export async function capturePng(page: Page): Promise<Buffer> {
  return page.screenshot({ type: 'png', fullPage: false });
}

export async function capturePdf(page: Page): Promise<Buffer> {
  await page.emulateMedia({ media: 'screen' });
  return page.pdf({
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    printBackground: true,
    preferCSSPageSize: true,
  });
}
