import type { Branding } from './branding.js';
import { fontFaceCss } from './fonts.js';
import { highlightPanel } from './highlight.js';
import { escapeHtml as e } from './html.js';
import { LAYOUT_RULES, type Card, type Panel } from './schema.js';
import { baseCss, getTheme } from './themes/index.js';

/**
 * Builds one self-contained HTML document containing one or more cards.
 * A single card becomes a PNG; several cards become the pages of a PDF.
 * Fonts are embedded and no external URL is referenced, so the browser
 * can render with the network blocked.
 */
export async function renderDocument(cards: Card[], branding: Branding): Promise<string> {
  const themeNames = [...new Set(cards.map((card) => card.theme))];
  const themeCss = themeNames.map((name) => getTheme(name).css).join('\n');
  const [fonts, ...bodies] = await Promise.all([fontFaceCss(), ...cards.map((card) => renderCard(card, branding))]);
  const title = cards.length === 1 ? cards[0].title : `${cards.length} cards`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080">
<title>${e(title)}</title>
<style>
${fonts}
${baseCss}
${themeCss}
</style>
</head>
<body>
${bodies.join('\n')}
</body>
</html>`;
}

export async function renderCard(card: Card, branding: Branding): Promise<string> {
  const theme = getTheme(card.theme);
  const rule = LAYOUT_RULES[card.layout];
  const panels = await Promise.all(card.panels.map((panel) => renderPanel(panel, theme.shikiTheme)));
  const classes = ['card', `layout-${card.layout}`, `theme-${card.theme}`, `panels-${card.panels.length}`];

  return `<main class="${classes.join(' ')}" data-font-max="${rule.fontMax}" data-font-min="${rule.fontMin}">
${renderMasthead(card, branding)}
${renderIntro(card)}
<div class="panels">
${panels.join('\n')}
</div>
${renderInsight(card)}
${renderFooter(branding)}
</main>`;
}

function renderMasthead(card: Card, branding: Branding): string {
  const seriesLines = e(branding.series.toUpperCase()).replace(/ /g, '<br>');
  return `<header class="masthead">
  <div class="series"><span class="mark">${e(branding.monogram)}<span></span></span><span>${seriesLines}</span></div>
  <span class="issue">${e(branding.issueLabel.toUpperCase())} / ${e(card.issue)}</span>
</header>`;
}

function renderIntro(card: Card): string {
  const tags = card.tags.map(e).join(' <span>/</span> ');
  const highlight = card.highlight ? `<span>${e(card.highlight)}</span>` : '';
  return `<section class="intro">
  ${card.tags.length ? `<div class="eyebrow">${tags}</div>` : ''}
  <h1>${e(card.title)}${highlight}</h1>
  <p class="subtitle">${e(card.subtitle)}</p>
</section>`;
}

async function renderPanel(panel: Panel, shikiTheme: Parameters<typeof highlightPanel>[1]): Promise<string> {
  const code = await highlightPanel(panel, shikiTheme);
  const verdictClass = panel.verdict ? ` verdict-${panel.verdict}` : '';
  const badge = panel.verdict ? `<span class="badge">${panel.verdict === 'good' ? '✓' : '✕'}</span>` : '';
  const notes = panel.notes.length
    ? `<ul class="panel-notes">${panel.notes.map((note) => `<li>${e(note)}</li>`).join('')}</ul>`
    : '';

  return `<section class="panel${verdictClass}">
  <div class="panel-header">
    <span class="panel-title"><span class="dots"><i></i><i></i><i></i></span><i class="dot"></i>${e(panel.label)}</span>
    <span class="panel-meta">${e(panel.language.toUpperCase())}${badge}</span>
  </div>
  <div class="panel-code">${code}</div>
  ${notes}
</section>`;
}

function renderInsight(card: Card): string {
  if (!card.insight) return '<div class="spacer"></div>';
  return `<section class="insight">
  <div class="insight-label"><span>↳</span> DESIGN NOTE</div>
  <p>${e(card.insight)}</p>
</section>`;
}

function renderFooter(branding: Branding): string {
  const mark = branding.footerMark ? `<div class="footer-mark">${e(branding.footerMark)}<span>↗</span></div>` : '';
  return `<footer>
  <div><strong>${e(branding.series)} <span>•</span> ${e(branding.author)}</strong><span class="website">${e(branding.website)}</span></div>
  ${mark}
</footer>`;
}
