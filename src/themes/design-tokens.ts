import { dark, light, shared, type ColorTokens } from '@manjunathhk/design-tokens';
import type { BundledTheme } from 'shiki';
import type { FontStylesheet, Theme } from './types.js';

/** Primary family of a CSS font stack token, e.g. `Inter, system-ui, sans-serif` gives `Inter`. */
const primaryFamily = (stack: string): string => (stack.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');

/**
 * The faces of the families the tokens name, read from the package's own
 * `fonts.css`, so a typeface change in the design system needs no edit here.
 */
export const DESIGN_TOKEN_FONTS: FontStylesheet = {
  stylesheet: '@manjunathhk/design-tokens/fonts.css',
  families: [
    ...new Set([
      primaryFamily(shared['font.family.display']),
      primaryFamily(shared['font.family.sans']),
      primaryFamily(shared['font.family.mono']),
    ]),
  ],
};

/**
 * The `light` and `dark` themes: the shared personal design system
 * (@manjunathhk/design-tokens, palette "Paper & Denim") applied to a card.
 * Every value comes from the package's resolved tokens, so a palette release
 * reaches these themes with a dependency bump. A card is a fixed image, so light and dark
 * are two themes rather than one following the viewer's OS.
 *
 * The card contract has roles the design system doesn't name; each maps to
 * the nearest token: --muted-2 to border-strong (decorative separators),
 * --panel-header-bg to bg-subtle, --notes-fg to text-secondary, --underline
 * to danger, --badge-fg to on-accent. The drafting grid is the tokens'
 * .mk-grid-bg pattern, drawn on the card.
 */
function fromTokens(name: string, description: string, color: ColorTokens, shikiTheme: BundledTheme): Theme {
  return {
    name,
    description,
    shikiTheme,
    fonts: [DESIGN_TOKEN_FONTS],
    css: /* css */ `
.theme-${name} {
  --bg: ${color['color.bg']}; --fg: ${color['color.text']}; --muted: ${color['color.text-muted']}; --muted-2: ${color['color.border-strong']};
  --accent: ${color['color.accent']}; --accent-title: ${color['color.accent']}; --rule: ${color['color.border']};
  --panel: ${color['color.surface']}; --panel-border: ${color['color.border']}; --panel-shadow: none;
  --panel-header-bg: ${color['color.bg-subtle']}; --panel-header-fg: ${color['color.text-muted']}; --panel-rule: ${color['color.border']};
  --line-highlight: ${color['color.accent-subtle']}; --underline: ${color['color.danger']}; --notes-fg: ${color['color.text-secondary']};
  --good: ${color['color.success']}; --bad: ${color['color.danger']}; --badge-fg: ${color['color.on-accent']};
  --font-display: ${shared['font.family.display']}; --font-sans: ${shared['font.family.sans']}; --font-mono: ${shared['font.family.mono']};
  --h1-weight: ${shared['font.weight.semibold']}; --h1-tracking: ${shared['font.letter-spacing.display']}; --panel-radius: ${shared['radius.md']};
  background-image:
    linear-gradient(${color['color.grid-line']} 1px, transparent 1px),
    linear-gradient(90deg, ${color['color.grid-line']} 1px, transparent 1px);
  background-size: ${shared['layout.grid-size']} ${shared['layout.grid-size']};
}
`,
  };
}

export const lightTheme = fromTokens(
  'light',
  'Paper and denim from the shared design tokens, light.',
  light,
  'github-light',
);

export const darkTheme = fromTokens(
  'dark',
  'Paper and denim from the shared design tokens, dark.',
  dark,
  'github-dark',
);
