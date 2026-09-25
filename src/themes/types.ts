import type { BundledTheme } from 'shiki';

/** One WOFF2 file from an installed package (`@fontsource/*`, `@manjunathhk/design-tokens`). */
export type FontFile = {
  /** The `font-family` name the theme's CSS refers to. */
  family: string;
  weight: number;
  /** `<package>/<path inside it>`, e.g. an `@fontsource` WOFF2 file. */
  file: string;
};

export type Theme = {
  name: string;
  description: string;
  /** Shiki theme used for the code tokens inside panels. */
  shikiTheme: BundledTheme;
  /** Only these files are embedded when the theme is used. */
  fonts: FontFile[];
  /**
   * CSS scoped under `.theme-<name>`. Must set every token in the contract
   * documented in base.ts; may add small scoped overrides.
   */
  css: string;
};
