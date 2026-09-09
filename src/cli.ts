import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, basename } from 'node:path';
import { chromium } from 'playwright';
import { parseContent } from './content.js';
import { renderHtml } from './template.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || !args.length) {
    console.log('Usage: npm run card -- <content.json|content.md> [output.png]\nDefault output: dist/<content-name>.png (plus self-contained HTML)');
    return;
  }
  if (args.length > 2) throw new Error('Expected input file and optional output PNG.');
  const input = resolve(args[0]);
  if (!['.json', '.md'].includes(extname(input).toLowerCase())) throw new Error('Input must be .json or .md');
  const output = resolve(args[1] ?? `dist/${basename(input, extname(input))}.png`);
  if (extname(output).toLowerCase() !== '.png') throw new Error('Output must end in .png');
  const card = parseContent(await readFile(input, 'utf8'), extname(input).toLowerCase() === '.md');
  const html = await renderHtml(card);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width:1080, height:1350 }, deviceScaleFactor:1 });
    await page.route('**/*', route => route.abort());
    await page.setContent(html, { waitUntil:'load' });
    await page.evaluate(() => document.fonts.ready);
    const fit = await page.evaluate(() => {
      let size = 20;
      let ok = true;
      for (const pre of document.querySelectorAll('pre')) {
        const box = pre.parentElement!;
        const style = getComputedStyle(box);
        const width = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        let fontSize = 20;
        while ((pre.scrollWidth > width || pre.getBoundingClientRect().height > height) && fontSize > 16) { fontSize -= .5; pre.style.fontSize = `${fontSize}px`; }
        size = Math.min(size, fontSize);
        ok = ok && pre.scrollWidth <= width && pre.getBoundingClientRect().height <= height;
      }
      for (const pre of document.querySelectorAll('pre')) pre.style.fontSize = `${size}px`;
      const root = document.querySelector('.card')!;
      const footer = document.querySelector('footer')!;
      return { ok: ok && root.scrollHeight <= 1350 && footer.getBoundingClientRect().bottom <= 1306, size };
    });
    if (!fit.ok) throw new Error('Content overflows the card. Shorten the headline, prose, code lines or line lengths. Minimum code size is 16px.');
    await mkdir(dirname(output), { recursive:true });
    await writeFile(output.replace(/\.png$/i, '.html'), await page.content());
    await page.screenshot({ path:output, type:'png' });
    console.log(`Rendered ${output} (1080 × 1350; code ${fit.size}px)`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(`Card generation failed: ${error.message}`); process.exitCode = 1; });
