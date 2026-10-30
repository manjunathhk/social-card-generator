/**
 * Card schema: the validated, normalized shape every renderer consumes.
 * Input parsers (Markdown, JSON) produce raw objects; `validateCard` turns
 * them into a `Card`. Nothing downstream should need to re-check fields.
 */

export const LAYOUTS = ['stack', 'columns', 'grid'] as const;
export type Layout = (typeof LAYOUTS)[number];
export const DEFAULT_LAYOUT: Layout = 'stack';

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

export const CARD_KINDS = ['code', 'diagram'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** Fields every card kind shares: the chrome around the body. */
type CardBase = {
  title: string;
  highlight: string;
  subtitle: string;
  tags: string[];
  insight: string;
  /** Optional; blank means the card shows no issue number and no running head. */
  issue: string;
  theme: string;
};

export type CodeCard = CardBase & {
  kind: 'code';
  layout: Layout;
  panels: Panel[];
};

export type DiagramCard = CardBase & {
  kind: 'diagram';
  diagram: Diagram;
};

export type Card = CodeCard | DiagramCard;

/**
 * Diagram cards: nodes on a fixed column grid, orthogonal edges between
 * named anchors, and a legend the card declares. Colours are tones, which
 * the theme resolves, so a legend entry means one thing on every theme.
 */
export const TONES = ['info', 'accent', 'success', 'danger', 'muted'] as const;
export type Tone = (typeof TONES)[number];

export const SIDES = ['top', 'bottom', 'left', 'right'] as const;
export type Side = (typeof SIDES)[number];

export const LABEL_SIDES = ['above', 'below', 'left', 'right'] as const;
export type LabelSide = (typeof LABEL_SIDES)[number];

/** A point on a node's edge: `db.right@0.2` is 20% down the right side of `db`. */
export type Anchor = { node: string; side: Side; at: number };

export type DiagramNode = {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  eyebrow: string;
  badge: string;
  title: string;
  lines: string[];
  /** Lines in the monospace face and accent colour, for paths, keys and type names. */
  mono: boolean;
  /** `accent` or `danger` tint the border; `muted` makes a dashed note with no fill. */
  tone?: Tone;
};

export type DiagramGroup = {
  id: string;
  label: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
};

export type DiagramEdge = {
  /** One anchor each, or several on one end for a bus (fan-out or fan-in). */
  from: Anchor[];
  to: Anchor[];
  /** A legend entry id. */
  type: string;
  label: string;
  sublabel: string;
  labelSide?: LabelSide;
  /** Bus edges only: the bus line's distance in px from the many-ended side, instead of halfway. */
  busOffset?: number;
};

export type LegendEntry = { id: string; label: string; tone: Tone; dashed: boolean };

export type Diagram = {
  nodes: DiagramNode[];
  groups: DiagramGroup[];
  edges: DiagramEdge[];
  legend: LegendEntry[];
  /** Derived: the last row any node or group reaches. */
  rows: number;
};

export const DIAGRAM_COLUMNS = 3;
export const DIAGRAM_LIMITS = {
  nodes: 10,
  edges: 14,
  groups: 2,
  legend: 5,
  rows: 5,
  lines: 3,
  /** Ends on the many side of a bus edge. */
  busEnds: 4,
  /** A bus may sit at most this many px from its many-ended side. */
  busOffset: 160,
} as const;

/** Character limits for diagram text, alongside TEXT_LIMITS for the chrome. */
export const DIAGRAM_TEXT_LIMITS = {
  id: 24,
  nodeTitle: 26,
  eyebrow: 22,
  badge: 8,
  line: 60,
  groupLabel: 60,
  edgeLabel: 20,
  /** Labels on edges that run between two left/right anchors sit in a column gutter. */
  gutterLabel: 8,
  sublabel: 24,
  legendLabel: 24,
} as const;

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
  '--subtitle': '26px',
  '--intro-y': '28px',
  '--panel-gap': '22px',
  '--header-y': '16px',
  '--header-x': '28px',
  '--header-size': '20px',
  '--code-y': '24px',
  '--code-x': '28px',
  '--notes-size': '22px',
  '--notes-y': '16px',
  '--insight-y': '24px',
  '--insight-size': '26px',
};

const TWO_PANELS: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '59px',
  '--intro-y': '24px',
  '--header-y': '14px',
  '--code-y': '18px',
  '--insight-y': '20px',
  '--insight-size': '24px',
};

const COLUMNS: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '58px',
  '--subtitle': '25px',
  '--intro-y': '24px',
  '--header-y': '14px',
  '--header-x': '22px',
  '--header-size': '18px',
  '--code-y': '20px',
  '--code-x': '22px',
  '--notes-size': '20px',
  '--notes-y': '14px',
  '--insight-y': '20px',
  '--insight-size': '26px',
};

const GRID: LayoutTokens = {
  ...ONE_PANEL,
  '--h1': '54px',
  '--subtitle': '25px',
  '--intro-y': '22px',
  '--panel-gap': '20px',
  '--header-y': '12px',
  '--header-x': '20px',
  '--header-size': '17px',
  '--code-y': '16px',
  '--code-x': '20px',
  '--notes-size': '18px',
  '--notes-y': '10px',
  '--insight-y': '20px',
  '--insight-size': '25px',
};

export const LAYOUT_RULES: Record<Layout, LayoutRule> = {
  stack: {
    minPanels: 1,
    maxPanels: 2,
    maxLines: (count) => (count > 1 ? 9 : 18),
    fontMax: 28,
    fontMin: 18,
    tokens: (count) => (count > 1 ? TWO_PANELS : ONE_PANEL),
  },
  columns: {
    minPanels: 2,
    maxPanels: 2,
    maxLines: () => 16,
    fontMax: 22,
    fontMin: 15,
    tokens: () => COLUMNS,
  },
  grid: {
    minPanels: 3,
    maxPanels: 4,
    maxLines: () => 10,
    fontMax: 20,
    fontMin: 14,
    tokens: () => GRID,
  },
};

/** Diagram cards use the one-panel chrome sizes; the diagram fills the space panels would. */
export const DIAGRAM_TOKENS: LayoutTokens = ONE_PANEL;

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
