import { editorial } from './editorial.js';
import { midnight } from './midnight.js';
import type { Theme } from './types.js';

export type { Theme } from './types.js';
export { baseCss } from './base.js';

export const THEMES: Record<string, Theme> = Object.fromEntries(
  [editorial, midnight].map((theme) => [theme.name, theme]),
);
export const THEME_NAMES = Object.keys(THEMES);
export const DEFAULT_THEME = editorial.name;

export function getTheme(name: string): Theme {
  const theme = THEMES[name];
  if (!theme) throw new Error(`Unknown theme "${name}". Available: ${THEME_NAMES.join(', ')}.`);
  return theme;
}
