import type { BundledTheme } from 'shiki';

export type Theme = {
  name: string;
  description: string;
  /** Shiki theme used for the code tokens inside panels. */
  shikiTheme: BundledTheme;
  /** CSS scoped under `.theme-<name>`; sets the palette variables and any overrides. */
  css: string;
};
