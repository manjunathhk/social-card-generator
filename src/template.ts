import type { Branding } from './branding.js';
import { fontFaceCss } from './fonts.js';
import { highlightPanel } from './highlight.js';
import { escapeHtml as e } from './html.js';
import { LAYOUT_RULES, type Card, type Panel } from './schema.js';
import { baseCss, getTheme } from './themes/index.js';

/**
 * Builds one self-contained HTML document containing one or more cards.
 * A single card becomes a PNG; several cards become the pages of a PDF.
 * Only the fonts of the themes in use are embedded, and no external URL is
 * referenced, so the browser can render with the network blocked.
 */
export async function renderDocument(cards: Card[], branding: Branding): Promise<string> {
  const themes = [...new Set(cards.map((card) => card.theme))].map(getTheme);
  const [fonts, ...bodies] = await Promise.all([
    fontFaceCss(themes.flatMap((theme) => theme.fonts)),
    ...cards.map((card) => renderCard(card, branding)),
  ]);
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
${themes.map((theme) => theme.css).join('\n')}
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
  const tokens = Object.entries(rule.tokens(card.panels.length))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');

  return `<main class="${classes.join(' ')}" style="${tokens}" data-font-max="${rule.fontMax}" data-font-min="${rule.fontMin}">
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
  const mark = branding.monogram ? `<span class="mark">${e(branding.monogram)}</span>` : '';
  const seriesName = branding.series ? `<span class="series-name">${e(branding.series)}</span>` : '';
  const issueLabel = branding.issueLabel
    ? `<span class="issue-label">${e(branding.issueLabel)}</span><span class="issue-sep">/</span>`
    : '';
  return `<header class="masthead">
  <div class="series">${mark}${seriesName}</div>
  <span class="issue">${issueLabel}<span class="issue-no">${e(card.issue)}</span></span>
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
    <span class="panel-title">${e(panel.label)}</span>
    <span class="panel-meta">${e(panel.language)}${badge}</span>
  </div>
  <div class="panel-code">${code}</div>
  ${notes}
</section>`;
}

function renderInsight(card: Card): string {
  if (!card.insight) return '<div class="spacer"></div>';
  return `<section class="insight">
  <div class="insight-label">Note</div>
  <p>${e(card.insight)}</p>
</section>`;
}

function renderFooter(branding: Branding): string {
  const mark = branding.footerMark ? `<div class="footer-mark">${e(branding.footerMark)}<span>↗</span></div>` : '';
  const name = [branding.series, branding.author].filter(Boolean);
  const nameLine = name.length ? `<strong>${name.map(e).join(' <span>·</span> ')}</strong>` : '';
  const website = branding.website ? `<span class="website">${e(branding.website)}</span>` : '';
  return `<footer>
  <div>${nameLine}${website}</div>
  ${mark}
</footer>`;
}
