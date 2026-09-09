import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { codeToHtml } from 'shiki';
import { type Card, escapeHtml as e } from './content.js';
import { brandingFromEnv } from './branding.js';
const require = createRequire(import.meta.url);
export async function renderHtml(card: Card, branding = brandingFromEnv(process.env)): Promise<string> {
  const font = async (path: string) => (await readFile(require.resolve(path))).toString('base64');
  const [regular, bold, mono, css] = await Promise.all([
    font('@fontsource/inter/files/inter-latin-400-normal.woff2'),
    font('@fontsource/inter/files/inter-latin-700-normal.woff2'),
    font('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8')
  ]);
  const panels = await Promise.all(card.panels.map(async panel => {
  const code = await codeToHtml(panel.code, {
    lang: panel.language, theme: 'github-dark',
    transformers: [{ line(node, line) {
      if (panel.highlightLines.includes(line)) node.properties['data-highlight'] = 'true';
    } }]
  });
  return `<section class="code-panel"><div class="code-header"><span><i></i>${e(panel.label)}</span><span>${e(panel.language.toUpperCase())}</span></div><div class="code-body">${code}</div></section>`;
  }));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>${e(card.title)}</title><style>
  @font-face{font-family:Inter;src:url(data:font/woff2;base64,${regular})} 
  @font-face{font-family:Inter;src:url(data:font/woff2;base64,${bold});font-weight:700}
  @font-face{font-family:Mono;src:url(data:font/woff2;base64,${mono})}
  ${css}</style></head><body><main class="card ${card.panels.length > 1 ? 'comparison' : ''}">
  <header><div class="series"><span class="mark">${e(branding.monogram)}<span></span></span><span>${e(branding.series.toUpperCase()).replace(/ /g, '<br>')}</span></div><span class="issue">${e(branding.issueLabel.toUpperCase())} / ${e(card.issue)}</span></header>
  <section class="intro"><div class="eyebrow">${card.tags.map(e).join(' <span>/</span> ')}</div><h1>${e(card.title)}${card.highlight ? `<span>${e(card.highlight)}</span>` : ''}</h1><p class="subtitle">${e(card.subtitle)}</p></section>
  <div class="panels">${panels.join('')}</div>
  ${card.insight ? `<section class="insight"><div class="insight-label"><span>↳</span> DESIGN NOTE</div><p>${e(card.insight)}</p></section>` : '<div style="height:24px"></div>'}
  <footer><div><strong>${e(branding.series)} <span>•</span> ${e(branding.author)}</strong><span class="website">${e(branding.website)}</span></div><div class="footer-mark">${e(branding.footerMark)}<span>↗</span></div></footer>
  </main></body></html>`;
}
