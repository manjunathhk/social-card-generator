/**
 * Card schema: the validated, normalized shape every renderer consumes.
 * Input parsers (Markdown, JSON) produce raw objects; `validateCard` turns
 * them into a `Card`. Nothing downstream should need to re-check fields.
 */

export const LAYOUTS = ['stack', 'columns', 'grid'] as const;
export type Layout = (typeof LAYOUTS)[number];

export type Verdict = 'good' | 'bad';

export type Panel = {
  /** Text shown in the panel header, e.g. "Before" or "ProductCache.cs". */
  label: string;
  /** Canonical Shiki language id, e.g. "csharp" (aliases are resolved). */
  language: string;
  /** Code with normalized line endings and no trailing whitespace. */
  code: string;
  /** One-based line numbers to highlight. Sorted, unique. */
  highlightLines: number[];
  /** Exact substrings in `code` to underline. */
  underline: string[];
  /** Optional tick/cross badge and header tint. */
  verdict?: Verdict;
  /** Short bullet points rendered under the code. */
  notes: string[];
};

export type Card = {
  title: string;
  highlight: string;
  subtitle: string;
  tags: string[];
  insight: string;
  issue: string;
  layout: Layout;
  theme: string;
  panels: Panel[];
};

export const TEXT_LIMITS = {
  title: 70,
  highlight: 70,
  subtitle: 150,
  insight: 220,
  issue: 12,
  label: 45,
  code: 4000,
  tag: 22,
  note: 70,
} as const;

export const MAX_TAGS = 3;
export const MAX_NOTES = 3;
export const MAX_UNDERLINES = 6;

/**
 * Sizes a layout decides, as CSS custom properties. The template writes them
 * inline on the card, so themes/base.ts never repeats a number per layout and
 * this table is the only place a layout's proportions live.
 */
export type LayoutTokens = Record<`--${string}`, string>;

export type LayoutRule = {
  minPanels: number;
  maxPanels: number;
  /** Maximum code lines per panel for a given panel count. */
  maxLines: (panelCount: number) => number;
  /** Starting and minimum code font size in CSS pixels for the fit loop. */
  fontMax: number;
  fontMin: number;
  /** Type scale and spacing for a given panel count. */
  tokens: (panelCount: number) => LayoutTokens;
};

const ONE_PANEL: LayoutTokens = {
  '--h1': '65px',
  '--subtitle': '23px',
  '--intro-y': '30px',
  '--panel-gap': '22px',
  '--header-y': '18px',
  '--header-x': '28px',
  '--header-size': '14px',
  '--code-y': '24px',
  '--code-x': '28px',
  '--notes-size': '17px',
  '--notes-y': '18px',
  '--insight-y': '28px',
  '--insight-size': '24px',
};

const TWO_PANELS: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '59px',
  '--intro-y': '25px',
  '--header-y': '16px',
  '--code-y': '20px',
  '--insight-y': '22px',
  '--insight-size': '22px',
};

const COLUMNS: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '58px',
  '--intro-y': '26px',
  '--header-y': '15px',
  '--header-x': '22px',
  '--header-size': '13px',
  '--code-y': '20px',
  '--code-x': '22px',
  '--notes-size': '15px',
  '--notes-y': '14px',
  '--insight-y': '22px',
  '--insight-size': '22px',
};

const GRID: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '54px',
  '--subtitle': '21px',
  '--intro-y': '24px',
  '--panel-gap': '20px',
  '--header-y': '12px',
  '--header-x': '20px',
  '--header-size': '12px',
  '--code-y': '16px',
  '--code-x': '20px',
  '--notes-size': '14px',
  '--notes-y': '10px',
  '--insight-y': '22px',
  '--insight-size': '22px',
};

export const LAYOUT_RULES: Record<Layout, LayoutRule> = {
  stack: {
    minPanels: 1,
    maxPanels: 2,
    maxLines: (count) => (count > 1 ? 14 : 22),
    fontMax: 20,
    fontMin: 16,
    tokens: (count) => (count > 1 ? TWO_PANELS : ONE_PANEL),
  },
  columns: {
    minPanels: 2,
    maxPanels: 2,
    maxLines: () => 18,
    fontMax: 18,
    fontMin: 13,
    tokens: () => COLUMNS,
  },
  grid: {
    minPanels: 3,
    maxPanels: 4,
    maxLines: () => 12,
    fontMax: 16,
    fontMin: 12,
    tokens: () => GRID,
  },
};

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
