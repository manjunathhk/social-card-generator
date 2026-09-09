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

export type LayoutRule = {
  minPanels: number;
  maxPanels: number;
  /** Maximum code lines per panel for a given panel count. */
  maxLines: (panelCount: number) => number;
  /** Starting and minimum code font size in CSS pixels for the fit loop. */
  fontMax: number;
  fontMin: number;
};

export const LAYOUT_RULES: Record<Layout, LayoutRule> = {
  stack: {
    minPanels: 1,
    maxPanels: 2,
    maxLines: (count) => (count > 1 ? 14 : 22),
    fontMax: 20,
    fontMin: 16,
  },
  columns: {
    minPanels: 2,
    maxPanels: 2,
    maxLines: () => 18,
    fontMax: 18,
    fontMin: 13,
  },
  grid: {
    minPanels: 3,
    maxPanels: 4,
    maxLines: () => 12,
    fontMax: 16,
    fontMin: 12,
  },
};

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
