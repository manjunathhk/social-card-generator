import type { Theme } from './types.js';

/**
 * Print: a journal page. Flexoki's paper and ink, light code panels with a
 * hairline border instead of a dark box, a heavy rule under the running
 * head, Bricolage Grotesque for headlines and Commit Mono for code.
 */
export const print: Theme = {
  name: 'print',
  description: 'Paper and ink with light code panels, like a printed journal page.',
  shikiTheme: 'vitesse-light',
  fonts: [
    {
      family: 'Bricolage Grotesque',
      weight: 700,
      file: '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2',
    },
    { family: 'Inter', weight: 400, file: '@fontsource/inter/files/inter-latin-400-normal.woff2' },
    { family: 'Inter', weight: 600, file: '@fontsource/inter/files/inter-latin-600-normal.woff2' },
    { family: 'Commit Mono', weight: 400, file: '@fontsource/commit-mono/files/commit-mono-latin-400-normal.woff2' },
    { family: 'Commit Mono', weight: 500, file: '@fontsource/commit-mono/files/commit-mono-latin-500-normal.woff2' },
  ],
  css: /* css */ `
.theme-print {
  --bg: #fffcf0; --fg: #100f0f; --muted: #6f6e69; --muted-2: #b7b5ac;
  --accent: #205ea6; --accent-title: #205ea6; --rule: #dad8ce;
  --panel: #f2f0e5; --panel-border: #e6e4d9; --panel-shadow: none;
  --panel-header-bg: #e6e4d9; --panel-header-fg: #575653; --panel-rule: #dad8ce;
  --line-highlight: color-mix(in srgb, #205ea6 16%, #f2f0e5); --underline: #af3029; --notes-fg: #403e3c;
  --good: #66800b; --bad: #af3029; --badge-fg: #fffcf0;
  --font-display: "Bricolage Grotesque"; --font-sans: "Inter"; --font-mono: "Commit Mono";
  --h1-weight: 700; --h1-tracking: -1.4px; --panel-radius: 6px;
}
.theme-print .masthead { border-bottom: 2px solid var(--fg); color: var(--fg); }
.theme-print .verdict-good .panel-header { background: color-mix(in srgb, var(--good) 14%, var(--panel-header-bg)); }
.theme-print .verdict-bad .panel-header { background: color-mix(in srgb, var(--bad) 12%, var(--panel-header-bg)); }
`,
};
