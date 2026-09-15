import type { Theme } from './types.js';

/**
 * Vesper: near-black ground, one peach accent that appears only where it
 * means something (highlight lines, the note rule), no chrome on panels, a
 * large light issue numeral instead of a masthead box, Geist throughout.
 */
export const vesper: Theme = {
  name: 'vesper',
  description: 'Near-black minimalism with a single peach accent and Geist type.',
  shikiTheme: 'vesper',
  fonts: [
    { family: 'Geist Sans', weight: 300, file: '@fontsource/geist-sans/files/geist-sans-latin-300-normal.woff2' },
    { family: 'Geist Sans', weight: 400, file: '@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2' },
    { family: 'Geist Sans', weight: 600, file: '@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2' },
    { family: 'Geist Mono', weight: 400, file: '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2' },
    { family: 'Geist Mono', weight: 500, file: '@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2' },
  ],
  css: /* css */ `
.theme-vesper {
  --bg: #101010; --fg: #f5f5f5; --muted: #a0a0a0; --muted-2: #5c5c5c;
  --accent: #ffc799; --accent-title: #8a8a8a; --rule: #262626;
  --panel: #161616; --panel-border: #262626; --panel-shadow: none;
  --panel-header-bg: transparent; --panel-header-fg: #8a8a8a; --panel-rule: #232323;
  --line-highlight: color-mix(in srgb, #ffc799 12%, #161616); --underline: #ff8080; --notes-fg: #d4d4d4;
  --good: #99ffe4; --bad: #ff8080; --badge-fg: #101010;
  --font-display: "Geist Sans"; --font-sans: "Geist Sans"; --font-mono: "Geist Mono";
  --h1-weight: 600; --h1-tracking: -2.6px; --panel-radius: 10px;
}
.theme-vesper .mark, .theme-vesper .issue-label, .theme-vesper .issue-sep, .theme-vesper .insight-label { display: none; }
.theme-vesper .masthead { align-items: baseline; padding-bottom: 14px; }
.theme-vesper .issue-no { font: 300 36px/1 var(--font-sans); letter-spacing: -1px; color: var(--fg); }
.theme-vesper .eyebrow { color: var(--muted); }
.theme-vesper .insight p { border-left: 2px solid var(--accent); padding-left: 20px; }
.theme-vesper .verdict-good .panel-header, .theme-vesper .verdict-bad .panel-header { background: transparent; }
.theme-vesper .verdict-good .panel-header { border-bottom-color: color-mix(in srgb, var(--good) 35%, var(--panel-rule)); }
.theme-vesper .verdict-bad .panel-header { border-bottom-color: color-mix(in srgb, var(--bad) 35%, var(--panel-rule)); }
`,
};
