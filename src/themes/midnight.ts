import type { Theme } from './types.js';

/** Deep navy gradient, electric blue accent, glassy panels with macOS dots. */
export const midnight: Theme = {
  name: 'midnight',
  description: 'Dark navy gradient with an electric blue accent and glassy panels.',
  shikiTheme: 'one-dark-pro',
  css: /* css */ `
.theme-midnight {
  --bg: radial-gradient(120% 90% at 20% 0%, #0f2440 0%, #0a1526 55%, #070d18 100%);
  --fg: #f4f7fb; --muted: #97a6bb; --muted-2: #56657a;
  --accent: #38bdf8; --rule: #1f2d44; --mark-border: #35507a;
  --panel: #0c1424; --panel-border: #1c2b44; --panel-shadow: 0 18px 40px #00000066;
  --panel-header-bg: #0f1a2e; --panel-header-fg: #a9b8cd; --panel-rule: #1c2b44; --panel-dot: #38bdf8;
  --line-highlight: #17304a; --underline: #f43f5e; --notes-fg: #dbe4f0;
  --good: #22c55e; --bad: #ef4444;
}
.theme-midnight h1 { font-weight: 800; letter-spacing: -2.6px; }
.theme-midnight .dots { display: flex; }
.theme-midnight .dot { display: none; }
.theme-midnight .verdict-good .panel-header { background: color-mix(in srgb, var(--good) 16%, var(--panel-header-bg)); }
.theme-midnight .verdict-bad .panel-header { background: color-mix(in srgb, var(--bad) 16%, var(--panel-header-bg)); }
.theme-midnight .mark { background: #0f1a2e; }
`,
};
