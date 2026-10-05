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

/** The running head carries the issue label and number; with neither there is no head. */
function renderMasthead(card: Card, branding: Branding): string {
  if (!card.issue && !branding.issueLabel) return '';
  const label = branding.issueLabel ? `<span class="issue-label">${e(branding.issueLabel)}</span>` : '';
  const separator = branding.issueLabel && card.issue ? '<span class="issue-sep">/</span>' : '';
  const number = card.issue ? `<span class="issue-no">${e(card.issue)}</span>` : '';
  return `<header class="masthead">
  <span class="issue">${label}${separator}${number}</span>
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

  const weight = panel.code.split('\n').length + 3 + panel.notes.length;
  return `<section class="panel${verdictClass}" style="--weight:${weight}">
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

/** LinkedIn's "in" mark (Simple Icons, CC0), drawn in the current text colour. */
const LINKEDIN_LOGO =
  '<svg class="social-logo" viewBox="0 0 24 24" aria-label="LinkedIn" role="img"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

/** "https://www.linkedin.com/in/jane/", "linkedin.com/in/jane", "@jane" and "jane" all become "/jane". */
function linkedinHandle(value: string): string {
  const handle = value
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?linkedin\.com\//i, '')
    .replace(/^in\//i, '')
    .replace(/^[@/]+|\/+$/g, '');
  return `/${handle}`;
}

/** Author on the left; series, website, LinkedIn, X and the optional mark on the right. */
function renderFooter(branding: Branding): string {
  const author = branding.author ? `<strong class="author">${e(branding.author)}</strong>` : '';
  const items = [
    branding.series ? `<span class="series-name">${e(branding.series)}</span>` : '',
    branding.website ? `<span>${e(branding.website)}</span>` : '',
    branding.linkedin ? `<span class="social">${LINKEDIN_LOGO}${e(linkedinHandle(branding.linkedin))}</span>` : '',
    branding.twitter ? `<span>${e(branding.twitter)}</span>` : '',
  ].filter(Boolean);
  const links = items.length ? `<div class="footer-items">${items.join('')}</div>` : '';
  const mark = branding.footerMark ? `<div class="footer-mark">${e(branding.footerMark)}<span>↗</span></div>` : '';
  return `<footer>
  ${author}
  <div class="footer-end">${links}${mark}</div>
</footer>`;
}
