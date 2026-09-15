import type { BundledTheme } from 'shiki';

/** One WOFF2 file from an installed @fontsource package. */
export type FontFile = {
  /** The `font-family` name the theme's CSS refers to. */
  family: string;
  weight: number;
  /** Module path resolvable with `require.resolve`. */
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
