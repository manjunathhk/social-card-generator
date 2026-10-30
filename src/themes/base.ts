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
 *              --notes-fg --good --bad --badge-fg --info
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
  padding: 40px 64px 44px;
  display: flex; flex-direction: column;
  background: var(--bg); color: var(--fg);
  font-family: var(--font-sans);
  position: relative;
  break-after: page; page-break-after: always;
}
.card:last-child { break-after: auto; page-break-after: auto; }

/* Running head */
.masthead {
  display: flex; justify-content: flex-end; align-items: center;
  padding-bottom: 18px; border-bottom: 1px solid var(--rule);
  font: 500 20px/1 var(--font-mono); letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted);
}
.issue { display: flex; align-items: center; gap: 10px; }
.issue-sep { color: var(--muted-2); }

/* Intro */
.intro { padding: var(--intro-y) 0; }
.eyebrow { font: 500 20px var(--font-mono); letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }
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
/* A stack divides its height by content, so a short panel does not hold empty space the longer one needs. */
.layout-stack .panel { flex: var(--weight) 1 0; }
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
  width: 30px; height: 30px; border-radius: 50%;
  font: 700 17px var(--font-sans); color: var(--badge-fg);
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

/*
 * Diagram cards (kind: diagram). Nodes sit on a three-column grid whose rows
 * spread out to fill the space panels would take; DIAGRAM_SCRIPT draws the
 * edges into .dg-edges. Every colour is a tone, mapped to theme tokens here.
 */
.diagram { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; padding-top: 6px; }
.dg-stage {
  position: relative; flex: 1; min-height: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 92px; row-gap: 70px;
  align-content: space-evenly;
}
.tone-info { --tone: var(--info); }
.tone-accent { --tone: var(--accent); }
.tone-success { --tone: var(--good); }
.tone-danger { --tone: var(--bad); }
.tone-muted { --tone: var(--muted); }
.dg-node {
  position: relative; z-index: 2; min-width: 0;
  display: flex; flex-direction: column; gap: 6px; padding: 12px 18px 14px;
  background: var(--panel); border: 1px solid var(--panel-border); border-radius: var(--panel-radius);
}
.dg-node.tone-accent, .dg-node.tone-danger, .dg-node.tone-info, .dg-node.tone-success { border-color: color-mix(in srgb, var(--tone) 60%, var(--panel-border)); }
.dg-node.tone-muted { background: transparent; border-style: dashed; border-color: var(--muted-2); }
.dg-eyebrow { font: 500 14px var(--font-mono); letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); }
.dg-title { display: flex; align-items: center; gap: 10px; font: 600 25px/1.15 var(--font-display); letter-spacing: -.3px; overflow-wrap: anywhere; }
.dg-badge { flex: none; padding: 4px 7px; border-radius: 5px; font: 600 13px var(--font-mono); background: var(--line-highlight); color: var(--accent); }
.dg-lines { list-style: none; margin: 2px 0 0; padding: 0; font-size: 18px; line-height: 1.35; color: var(--notes-fg); overflow-wrap: anywhere; }
.dg-lines.mono { font: 17px/1.45 var(--font-mono); color: var(--accent); }
.dg-group {
  position: relative; z-index: 1; margin: -16px -18px -44px; padding: 10px 16px;
  display: flex; align-items: flex-end;
  border: 1.5px dashed var(--muted-2); border-radius: 14px;
  font: 500 15px var(--font-mono); letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted);
}
.dg-edges { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; z-index: 3; pointer-events: none; }
.dg-line { fill: none; stroke: var(--tone); stroke-width: 2.5; stroke-linejoin: round; }
.dashed .dg-line, .dg-key.dashed line { stroke-dasharray: 7 6; }
.dg-head { fill: var(--tone); }
.dg-label-main { font: 500 18px var(--font-mono); fill: var(--tone); }
.dg-label-sub { font: 400 15px var(--font-sans); fill: var(--muted); }
.dg-plate { fill: var(--bg); }
.dg-legend { display: flex; flex-wrap: wrap; gap: 6px 28px; font: 400 17px var(--font-mono); color: var(--muted); }
.dg-key { display: inline-flex; align-items: center; gap: 8px; }
.dg-key svg { width: 34px; height: 8px; }
.dg-key line { stroke: var(--tone); stroke-width: 2.5; }

/* Insight */
.insight { padding: var(--insight-y) 0 calc(var(--insight-y) - 2px); }
.insight-label { font: 500 18px var(--font-mono); letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
.insight p { margin: 0; font-size: var(--insight-size); line-height: 1.45; letter-spacing: -.2px; max-width: 900px; overflow-wrap: anywhere; }
.spacer { height: 24px; flex: none; }

/* Colophon: author on the left, everything else on the right */
footer { border-top: 1px solid var(--rule); padding-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
footer .author { font: 600 26px var(--font-sans); letter-spacing: -.3px; white-space: nowrap; }
.footer-end { display: flex; align-items: center; justify-content: flex-end; gap: 24px; margin-left: auto; min-width: 0; }
.footer-items { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font: 400 20px/1.2 var(--font-mono); color: var(--muted); }
.footer-row { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 0 28px; }
.footer-row > span { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.footer-items .series-name { color: var(--fg); font-weight: 500; }
.footer-items .credit { font-size: 16px; opacity: .8; }
.social-logo { width: 22px; height: 22px; flex: none; }
.footer-mark { font: 700 28px var(--font-display); letter-spacing: -1px; }
.footer-mark span { color: var(--accent); margin-left: 4px; font-size: 22px; }
`;
