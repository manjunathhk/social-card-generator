/**
 * Layout CSS shared by every theme. Themes only set the custom properties
 * declared here (and may add small overrides); layouts only move boxes.
 */
export const baseCss = /* css */ `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #000; }
@page { size: 1080px 1350px; margin: 0; }

.card {
  --font-sans: Inter, system-ui, sans-serif;
  --font-mono: Mono, ui-monospace, monospace;
  width: 1080px; height: 1350px; overflow: hidden;
  padding: 48px 64px 44px;
  display: flex; flex-direction: column;
  background: var(--bg); color: var(--fg);
  font-family: var(--font-sans);
  break-after: page; page-break-after: always;
  position: relative;
}
.card:last-child { break-after: auto; page-break-after: auto; }

/* Masthead */
.masthead { display: flex; align-items: center; justify-content: space-between; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
.series { display: flex; gap: 18px; align-items: center; font-size: 15px; font-weight: 700; line-height: 1.35; letter-spacing: 2.4px; }
.mark { width: 66px; height: 52px; display: flex; align-items: center; position: relative; font-size: 19px; letter-spacing: -1px; border: 1px solid var(--mark-border); padding-left: 9px; }
.mark span { position: absolute; width: 15px; height: 5px; background: var(--accent); bottom: -3px; right: 8px; }
.issue { font-family: var(--font-mono); font-size: 14px; letter-spacing: 1px; color: var(--muted); }

/* Intro */
.intro { padding: 30px 0 28px; }
.eyebrow { font-size: 15px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: var(--accent); margin-bottom: 19px; }
.eyebrow span { color: var(--muted-2); margin: 0 12px; }
h1 { margin: 0; font-size: 65px; line-height: 1.07; letter-spacing: -3px; font-weight: 700; overflow-wrap: anywhere; }
h1 > span { display: block; color: var(--accent); }
.subtitle { font-size: 23px; line-height: 1.45; color: var(--muted); margin: 18px 0 0; overflow-wrap: anywhere; }

/* Panels */
.panels { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 22px; }
.panel { background: var(--panel); border-radius: 15px; overflow: hidden; box-shadow: var(--panel-shadow); border: 1px solid var(--panel-border); flex: 1; min-height: 0; display: flex; flex-direction: column; }
.panel-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 28px; border-bottom: 1px solid var(--panel-rule); color: var(--panel-header-fg); background: var(--panel-header-bg); font: 14px var(--font-mono); }
.panel-title { display: flex; align-items: center; gap: 12px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel-meta { display: flex; align-items: center; gap: 12px; white-space: nowrap; letter-spacing: 1px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--panel-dot); flex: none; }
.dots { display: none; gap: 7px; flex: none; }
.dots i { width: 11px; height: 11px; border-radius: 50%; display: block; }
.dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
.badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font: 700 14px var(--font-sans); color: #fff; }
.verdict-good .badge { background: var(--good); }
.verdict-bad .badge { background: var(--bad); }
.verdict-good .panel-header { border-bottom-color: color-mix(in srgb, var(--good) 45%, var(--panel-rule)); }
.verdict-bad .panel-header { border-bottom-color: color-mix(in srgb, var(--bad) 45%, var(--panel-rule)); }
.panel-code { padding: 24px 28px; flex: 1; min-height: 0; overflow: hidden; }
pre.shiki { background: transparent !important; margin: 0; font: 20px/1.55 var(--font-mono); tab-size: 2; }
pre.shiki code { font: inherit; }
.line[data-highlight] { display: inline-block; width: 100%; background: var(--line-highlight); box-shadow: -10px 0 var(--line-highlight), 10px 0 var(--line-highlight); }
.underline { text-decoration: underline; text-decoration-color: var(--underline); text-decoration-thickness: 3px; text-underline-offset: 5px; }
.panel-notes { list-style: none; margin: 0; padding: 18px 28px 22px; border-top: 1px solid var(--panel-rule); display: flex; flex-direction: column; gap: 9px; color: var(--notes-fg); font-size: 17px; line-height: 1.3; }
.panel-notes li { display: flex; align-items: center; gap: 12px; }
.panel-notes li::before { content: ''; flex: none; width: 20px; height: 20px; border-radius: 50%; background: var(--muted-2); }
.verdict-good .panel-notes li::before { content: '✓'; background: var(--good); color: #fff; font: 700 13px/20px var(--font-sans); text-align: center; }
.verdict-bad .panel-notes li::before { content: '✕'; background: var(--bad); color: #fff; font: 700 12px/20px var(--font-sans); text-align: center; }

/* Layout: columns */
.layout-columns .panels { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0, 1fr); gap: 22px; }
.layout-columns h1 { font-size: 58px; }
.layout-columns .intro { padding: 26px 0 26px; }
.layout-columns .panel-header { padding: 15px 22px; font-size: 13px; }
.layout-columns .panel-code { padding: 20px 22px; }
.layout-columns .panel-notes { padding: 14px 22px 18px; font-size: 15px; gap: 7px; }
.layout-columns .panel-notes li::before { width: 18px; height: 18px; line-height: 18px; }

/* Layout: grid */
.layout-grid .panels { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(0, 1fr); gap: 20px; }
.layout-grid .panel:nth-child(3):last-child { grid-column: 1 / -1; }
.layout-grid h1 { font-size: 54px; letter-spacing: -2.4px; }
.layout-grid .intro { padding: 24px 0 24px; }
.layout-grid .subtitle { font-size: 21px; margin-top: 14px; }
.layout-grid .panel-header { padding: 12px 20px; font-size: 12px; }
.layout-grid .panel-code { padding: 16px 20px; }
.layout-grid .panel-notes { padding: 10px 20px 14px; font-size: 14px; gap: 5px; }
.layout-grid .panel-notes li::before { width: 16px; height: 16px; line-height: 16px; font-size: 11px; }

/* Stack tweaks for two panels */
.layout-stack.panels-2 h1 { font-size: 59px; }
.layout-stack.panels-2 .intro { padding: 25px 0; }
.layout-stack.panels-2 .panel-header { padding: 16px 28px; }
.layout-stack.panels-2 .panel-code { padding: 20px 28px; }

/* Insight */
.insight { padding: 28px 0 26px; }
.layout-stack.panels-2 .insight, .layout-columns .insight, .layout-grid .insight { padding: 22px 0; }
.insight-label { color: var(--accent); font: 14px var(--font-mono); letter-spacing: 2px; display: flex; align-items: center; gap: 12px; }
.insight-label span { font-size: 26px; letter-spacing: 0; }
.insight p { margin: 10px 0 0; font-size: 24px; line-height: 1.45; letter-spacing: -.4px; max-width: 910px; overflow-wrap: anywhere; }
.layout-stack.panels-2 .insight p, .layout-columns .insight p, .layout-grid .insight p { font-size: 22px; }
.spacer { height: 24px; flex: none; }

/* Footer */
footer { border-top: 1px solid var(--rule); padding-top: 24px; display: flex; align-items: center; justify-content: space-between; }
footer strong { font-size: 17px; letter-spacing: -.3px; }
footer strong span { color: var(--accent); padding: 0 5px; }
.website { display: block; color: var(--muted); font-size: 15px; margin-top: 8px; }
.footer-mark { font-size: 30px; letter-spacing: -2px; font-weight: 700; }
.footer-mark span { font-size: 24px; color: var(--accent); margin-left: 6px; }
`;
