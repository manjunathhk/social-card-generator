/**
 * Structure shared by every theme and layout.
 *
 * Three kinds of custom property meet here:
 * - Layout tokens (sizes and spacing) are written inline on `.card` by the
 *   template from `LAYOUT_RULES[layout].tokens(...)`. This file only reads
 *   them: --h1 --subtitle --intro-y --panel-gap --header-y --header-x
 *   --header-size --code-y --code-x --notes-size --notes-y --insight-y
 *   --insight-size.
 * - Theme tokens are set by each theme under `.theme-<name>`:
 *     palette  --bg --fg --muted --muted-2 --accent --accent-title --rule
 *              --panel --panel-border --panel-shadow --panel-header-bg
 *              --panel-header-fg --panel-rule --line-highlight --underline
 *              --notes-fg --good --bad --badge-fg
 *     type     --font-display --font-sans --font-mono --h1-weight --h1-tracking
 *     shape    --panel-radius
 * - Nothing else is a literal here except the card's fixed geometry.
 */
export const baseCss = /* css */ `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #000; }
@page { size: 1080px 1350px; margin: 0; }

.card {
  width: 1080px; height: 1350px; overflow: hidden;
  padding: 48px 64px 44px;
  display: flex; flex-direction: column;
  background: var(--bg); color: var(--fg);
  font-family: var(--font-sans);
  position: relative;
  break-after: page; page-break-after: always;
}
.card:last-child { break-after: auto; page-break-after: auto; }

/* Running head */
.masthead {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 18px; border-bottom: 1px solid var(--rule);
  font: 500 13px/1 var(--font-mono); letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted);
}
.series { display: flex; align-items: center; gap: 14px; }
.mark {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 34px; height: 28px; padding: 0 8px; border-radius: 3px;
  background: var(--fg); color: var(--bg);
  font: 700 13px var(--font-sans); letter-spacing: .5px;
}
.issue { display: flex; align-items: center; gap: 10px; }
.issue-sep { color: var(--muted-2); }

/* Intro */
.intro { padding: var(--intro-y) 0; }
.eyebrow { font: 500 13px var(--font-mono); letter-spacing: 1.6px; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }
.eyebrow span { color: var(--muted-2); margin: 0 10px; }
h1 {
  margin: 0; font: var(--h1-weight) var(--h1) / 1.05 var(--font-display);
  letter-spacing: var(--h1-tracking); overflow-wrap: anywhere;
}
h1 > span { display: block; color: var(--accent-title); }
.subtitle { font-size: var(--subtitle); line-height: 1.45; color: var(--muted); margin: 16px 0 0; max-width: 880px; overflow-wrap: anywhere; }

/* Panels */
.panels { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: var(--panel-gap); }
.panel {
  background: var(--panel); border: 1px solid var(--panel-border); border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow); overflow: hidden;
  flex: 1; min-height: 0; display: flex; flex-direction: column;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: var(--header-y) var(--header-x); border-bottom: 1px solid var(--panel-rule);
  background: var(--panel-header-bg); color: var(--panel-header-fg);
  font: 500 var(--header-size) var(--font-mono);
}
.panel-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel-meta { display: flex; align-items: center; gap: 12px; white-space: nowrap; letter-spacing: 1px; text-transform: uppercase; }
.badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font: 700 12px var(--font-sans); color: var(--badge-fg);
}
.verdict-good .badge { background: var(--good); }
.verdict-bad .badge { background: var(--bad); }
.verdict-good .panel-header { background: color-mix(in srgb, var(--good) 10%, var(--panel-header-bg)); }
.verdict-bad .panel-header { background: color-mix(in srgb, var(--bad) 10%, var(--panel-header-bg)); }
.panel-code { padding: var(--code-y) var(--code-x); flex: 1; min-height: 0; overflow: hidden; }
pre.shiki { background: transparent !important; margin: 0; font: 20px/1.55 var(--font-mono); tab-size: 2; }
pre.shiki code { font: inherit; }
.line[data-highlight] { display: inline-block; width: 100%; background: var(--line-highlight); box-shadow: -10px 0 var(--line-highlight), 10px 0 var(--line-highlight); }
.underline { text-decoration: underline; text-decoration-color: var(--underline); text-decoration-thickness: 2.5px; text-underline-offset: 5px; }
.panel-notes {
  list-style: none; margin: 0; padding: var(--notes-y) var(--header-x) calc(var(--notes-y) + 4px);
  border-top: 1px solid var(--panel-rule);
  display: flex; flex-direction: column; gap: 8px;
  color: var(--notes-fg); font-size: var(--notes-size); line-height: 1.3;
}
.panel-notes li { display: flex; align-items: center; gap: 12px; }
.panel-notes li::before {
  content: ''; flex: none; width: 1.1em; height: 1.1em; border-radius: 50%; background: var(--muted-2);
  font: 700 .7em/1.6 var(--font-sans); text-align: center; color: var(--badge-fg);
}
.verdict-good .panel-notes li::before { content: '✓'; background: var(--good); }
.verdict-bad .panel-notes li::before { content: '✕'; background: var(--bad); }

/* Layout arrangement (sizes come from tokens) */
.layout-columns .panels { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0, 1fr); }
.layout-grid .panels { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(0, 1fr); }
.layout-grid .panel:nth-child(3):last-child { grid-column: 1 / -1; }

/* Insight */
.insight { padding: var(--insight-y) 0 calc(var(--insight-y) - 2px); }
.insight-label { font: 500 12px var(--font-mono); letter-spacing: 1.6px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
.insight p { margin: 0; font-size: var(--insight-size); line-height: 1.45; letter-spacing: -.2px; max-width: 900px; overflow-wrap: anywhere; }
.spacer { height: 24px; flex: none; }

/* Colophon */
footer { border-top: 1px solid var(--rule); padding-top: 22px; display: flex; align-items: center; justify-content: space-between; }
footer strong { font: 600 16px var(--font-sans); letter-spacing: -.2px; }
footer strong span { color: var(--muted-2); padding: 0 6px; font-weight: 400; }
.website { display: block; margin-top: 6px; font: 400 13px var(--font-mono); color: var(--muted); letter-spacing: .4px; }
.footer-mark { font: 700 28px var(--font-display); letter-spacing: -1px; }
.footer-mark span { color: var(--accent); margin-left: 4px; font-size: 22px; }
`;
