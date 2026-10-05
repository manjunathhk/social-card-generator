import type { BundledTheme } from 'shiki';

/** One WOFF2 file from an installed package (`@fontsource/*`, `@manjunathhk/design-tokens`). */
export type FontFile = {
  /** The `font-family` name the theme's CSS refers to. */
  family: string;
  weight: number;
  /** `<package>/<path inside it>`, e.g. an `@fontsource` WOFF2 file. */
  file: string;
};

/**
 * Every normal-style face of the named families in a package's `@font-face`
 * stylesheet, so the package decides which files exist and a font change in
 * it needs no change here. A named family with no face in it is an error.
 */
export type FontStylesheet = {
  /** `<package>/<stylesheet>`, e.g. `@manjunathhk/design-tokens/fonts.css`. */
  stylesheet: string;
  families: string[];
};

export type Theme = {
  name: string;
  description: string;
  /** Shiki theme used for the code tokens inside panels. */
  shikiTheme: BundledTheme;
  /** Only these files are embedded when the theme is used. */
  fonts: (FontFile | FontStylesheet)[];
  /**
   * CSS scoped under `.theme-<name>`. Must set every token in the contract
   * documented in base.ts; may add small scoped overrides.
   */
  css: string;
};
