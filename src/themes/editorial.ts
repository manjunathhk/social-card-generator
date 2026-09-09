import type { Theme } from './types.js';

/** Off-white paper, teal accent, dark code panels. The original look. */
export const editorial: Theme = {
  name: 'editorial',
  description: 'Off-white paper with a teal accent and dark code panels.',
  shikiTheme: 'github-dark',
  css: /* css */ `
.theme-editorial {
  --bg: #f5f3ee; --fg: #162b35; --muted: #617078; --muted-2: #a0b0b1;
  --accent: #007b80; --rule: #cbd3d1; --mark-border: #78979b;
  --panel: #111e29; --panel-border: transparent; --panel-shadow: 0 10px 24px #16334112;
  --panel-header-bg: transparent; --panel-header-fg: #b6c8d3; --panel-rule: #31414d; --panel-dot: #42c3b4;
  --line-highlight: #164339; --underline: #ff6b6b; --notes-fg: #d5dee5;
  --good: #1f9d6b; --bad: #d9534f;
}
`,
};
