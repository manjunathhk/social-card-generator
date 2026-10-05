import { darkTheme, lightTheme } from './design-tokens.js';
import type { Theme } from './types.js';

export type { FontFile, Theme } from './types.js';
export { baseCss } from './base.js';

export const THEMES: Record<string, Theme> = Object.fromEntries(
  [lightTheme, darkTheme].map((theme) => [theme.name, theme]),
);
export const THEME_NAMES = Object.keys(THEMES);
export const DEFAULT_THEME = lightTheme.name;

export function getTheme(name: string): Theme {
  const theme = THEMES[name];
  if (!theme) throw new Error(`Unknown theme "${name}". Available: ${THEME_NAMES.join(', ')}.`);
  return theme;
}
