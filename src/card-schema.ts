import {
  CARD_KINDS,
  DEFAULT_LAYOUT,
  DIAGRAM_COLUMNS,
  DIAGRAM_LIMITS,
  DIAGRAM_TEXT_LIMITS,
  LABEL_SIDES,
  SIDES,
  TONES,
  LAYOUTS,
  LAYOUT_RULES,
  MAX_NOTES,
  MAX_TAGS,
  MAX_UNDERLINES,
  TEXT_LIMITS,
  type Layout,
} from './schema.js';
import { DEFAULT_THEME, THEME_NAMES } from './themes/index.js';

/**
 * JSON Schema (draft 2020-12) for card source, derived from the constants in
 * schema.ts and the theme registry so it cannot drift from `validateCard`.
 * `npm run schema` writes it to schema/card.schema.json; `social-card --schema`
 * prints it. Line counts per panel and the code font range have no JSON Schema
 * keyword, so each layout carries them as `x-maxLines` / `x-fontRange` and in
 * its description.
 */

export const SCHEMA_URL =
  'https://raw.githubusercontent.com/manjunathhk/social-card-generator/main/schema/card.schema.json';

/** Matches text with at least one non-whitespace character, as the validator requires. */
const NOT_BLANK = '\\S';

type JsonSchema = Record<string, unknown>;

export function buildCardSchema(): JsonSchema {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_URL,
    title: 'Social card source',
    description:
      'A JSON card, or the YAML front matter plus panels of a Markdown card. A code card (the default) has panels; a diagram card ("kind": "diagram", JSON only) has a diagram. Character and count limits are enforced here; per-panel line limits are listed as x-maxLines per layout. A card that passes this schema can still fail to fit (code at the minimum font size, a diagram taller than its space), which only a real render detects. Rules that span fields (anchors naming real nodes, edge types naming legend ids, nodes not sharing a cell, 8-character labels on left/right edges) are checked by the renderer, not here.',
    type: 'object',
    required: ['title', 'subtitle'],
    properties: {
      $schema: {
        type: 'string',
        description: 'Optional URL of this schema, for editor autocomplete. Ignored by the renderer.',
      },
      kind: {
        description: 'What the card body is: "code" panels, or a "diagram" of nodes and edges (JSON only).',
        enum: [...CARD_KINDS],
        default: 'code',
      },
      title: text('title', 'First title line.', { required: true }),
      highlight: text('highlight', 'Second title line, in the accent colour.'),
      subtitle: text('subtitle', 'One or two sentences under the title.', { required: true }),
      tags: {
        type: 'array',
        description: `Up to ${MAX_TAGS} short tags.`,
        maxItems: MAX_TAGS,
        items: text('tag', 'A tag.', { required: true }),
        default: [],
      },
      insight: text('insight', 'The "design note" under the panels.'),
      issue: text(
        'issue',
        'Issue number shown in a running head at the top. Omit it and the card shows no issue number.',
      ),
      layout: {
        description: `Panel arrangement. ${LAYOUTS.map(describeLayout).join(' ')}`,
        enum: [...LAYOUTS],
        default: DEFAULT_LAYOUT,
      },
      theme: {
        description: 'Palette, typefaces and panel shape.',
        enum: THEME_NAMES,
        default: DEFAULT_THEME,
      },
      panels: {
        type: 'array',
        description: 'Code panels, in order. How many depends on the layout. Code cards only.',
        items: { $ref: '#/$defs/panel' },
      },
      diagram: { $ref: '#/$defs/diagram' },
    },
    allOf: [kindCondition(), ...LAYOUTS.map(layoutCondition)],
    $defs: {
      ...diagramDefs(),
      panel: {
        type: 'object',
        required: ['language', 'code'],
        properties: {
          label: text('label', 'Panel header text. Defaults to the language name.', { required: true }),
          language: {
            type: 'string',
            description: 'A Shiki language id or alias, e.g. "csharp", "cs", "ts", "yaml", "jsonc".',
            pattern: NOT_BLANK,
          },
          code: text('code', 'The code. Line limit per panel depends on the layout (see x-maxLines).', {
            required: true,
          }),
          highlightLines: {
            type: 'array',
            description: 'One-based line numbers to highlight; each must be within the code.',
            items: { type: 'integer', minimum: 1 },
          },
          underline: {
            type: 'array',
            description: `Up to ${MAX_UNDERLINES} exact single-line substrings of the code to underline.`,
            maxItems: MAX_UNDERLINES,
            items: { type: 'string', minLength: 1, pattern: '^[^\\n]*$' },
          },
          verdict: {
            description: 'Tick or cross badge and header tint.',
            enum: ['good', 'bad'],
          },
          notes: {
            type: 'array',
            description: `Up to ${MAX_NOTES} short bullet points under the code.`,
            maxItems: MAX_NOTES,
            items: text('note', 'A note.', { required: true }),
          },
        },
      },
    },
  };
}

function text(key: keyof typeof TEXT_LIMITS, description: string, options: { required?: boolean } = {}): JsonSchema {
  const limit = TEXT_LIMITS[key];
  return {
    type: 'string',
    description: `${description} At most ${limit} characters.`,
    ...(options.required ? { pattern: NOT_BLANK } : {}),
    maxLength: limit,
  };
}

function panelCounts(layout: Layout): number[] {
  const rule = LAYOUT_RULES[layout];
  const counts: number[] = [];
  for (let count = rule.minPanels; count <= rule.maxPanels; count += 1) counts.push(count);
  return counts;
}

function describeLayout(layout: Layout): string {
  const rule = LAYOUT_RULES[layout];
  const counts = panelCounts(layout);
  const panels = counts.length === 1 ? `${counts[0]}` : `${rule.minPanels} to ${rule.maxPanels}`;
  const limits = counts.map((count) => rule.maxLines(count));
  const lines =
    new Set(limits).size === 1
      ? `${limits[0]} code lines per panel`
      : counts.map((count, index) => `${limits[index]} lines per panel with ${plural(count, 'panel')}`).join(', ');
  return `"${layout}": ${panels} panels; at most ${lines}; code font ${rule.fontMax} to ${rule.fontMin} px.`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** The default layout's condition also matches cards that omit `layout`. */
function layoutCondition(layout: Layout): JsonSchema {
  const rule = LAYOUT_RULES[layout];
  const match = { properties: { layout: { const: layout } } };
  return {
    if: layout === DEFAULT_LAYOUT ? match : { required: ['layout'], ...match },
    then: {
      description: describeLayout(layout),
      'x-maxLines': Object.fromEntries(panelCounts(layout).map((count) => [String(count), rule.maxLines(count)])),
      'x-fontRange': { max: rule.fontMax, min: rule.fontMin },
      properties: { panels: { minItems: rule.minPanels, maxItems: rule.maxPanels } },
    },
  };
}

/** A diagram card needs `diagram` and has no layout or panels; any other card needs `panels`. */
function kindCondition(): JsonSchema {
  return {
    if: { required: ['kind'], properties: { kind: { const: 'diagram' } } },
    then: { required: ['diagram'], not: { anyOf: [{ required: ['layout'] }, { required: ['panels'] }] } },
    else: { required: ['panels'], not: { required: ['diagram'] } },
  };
}

function diagramText(key: keyof typeof DIAGRAM_TEXT_LIMITS, description: string, required = false): JsonSchema {
  const limit = DIAGRAM_TEXT_LIMITS[key];
  return {
    type: 'string',
    description: `${description} At most ${limit} characters.`,
    ...(required ? { pattern: NOT_BLANK } : {}),
    maxLength: limit,
  };
}

function placement(): JsonSchema {
  return {
    col: {
      type: 'integer',
      minimum: 1,
      maximum: DIAGRAM_COLUMNS,
      description: `Grid column, 1 to ${DIAGRAM_COLUMNS}.`,
    },
    row: {
      type: 'integer',
      minimum: 1,
      maximum: DIAGRAM_LIMITS.rows,
      description: `Grid row, 1 to ${DIAGRAM_LIMITS.rows}.`,
    },
    colSpan: { type: 'integer', minimum: 1, maximum: DIAGRAM_COLUMNS, default: 1 },
    rowSpan: { type: 'integer', minimum: 1, maximum: DIAGRAM_LIMITS.rows, default: 1 },
  };
}

function diagramDefs(): Record<string, JsonSchema> {
  const id = {
    type: 'string',
    pattern: `^[A-Za-z][\\w-]*$`,
    maxLength: DIAGRAM_TEXT_LIMITS.id,
    description: 'Letters, digits, "-" or "_", starting with a letter.',
  };
  const ends = {
    oneOf: [
      { $ref: '#/$defs/anchor' },
      { type: 'array', minItems: 1, maxItems: DIAGRAM_LIMITS.busEnds, items: { $ref: '#/$defs/anchor' } },
    ],
  };
  return {
    anchor: {
      type: 'string',
      description: `A point on a node: "node.side" or "node.side@0.3", where side is ${SIDES.join(', ')} and the fraction (default 0.5) runs left to right or top to bottom.`,
      pattern: `^[A-Za-z][\\w-]*\\.(${SIDES.join('|')})(@(0(\\.\\d+)?|1(\\.0+)?|\\.\\d+))?$`,
    },
    diagram: {
      type: 'object',
      description: `Diagram cards only. Nodes on a ${DIAGRAM_COLUMNS}-column grid, edges between anchors, and a legend each edge type refers to.`,
      required: ['legend', 'nodes', 'edges'],
      properties: {
        legend: {
          type: 'array',
          minItems: 1,
          maxItems: DIAGRAM_LIMITS.legend,
          items: { $ref: '#/$defs/legendEntry' },
        },
        nodes: { type: 'array', minItems: 1, maxItems: DIAGRAM_LIMITS.nodes, items: { $ref: '#/$defs/node' } },
        groups: { type: 'array', maxItems: DIAGRAM_LIMITS.groups, items: { $ref: '#/$defs/group' }, default: [] },
        edges: { type: 'array', maxItems: DIAGRAM_LIMITS.edges, items: { $ref: '#/$defs/edge' } },
      },
    },
    legendEntry: {
      type: 'object',
      required: ['id', 'label', 'tone'],
      properties: {
        id,
        label: diagramText('legendLabel', 'Legend text.', true),
        tone: { enum: [...TONES], description: 'Colour role; the theme decides the colour.' },
        dashed: { type: 'boolean', default: false },
      },
    },
    node: {
      type: 'object',
      required: ['id', 'col', 'row', 'title'],
      properties: {
        id,
        ...placement(),
        eyebrow: diagramText('eyebrow', 'Small caps line above the title.'),
        badge: diagramText('badge', 'Short tag before the title, e.g. ".NET".'),
        title: diagramText('nodeTitle', 'Node title.', true),
        lines: {
          type: 'array',
          maxItems: DIAGRAM_LIMITS.lines,
          items: diagramText('line', 'A line under the title.', true),
        },
        mono: { type: 'boolean', default: false, description: 'Lines in the monospace face, for paths and names.' },
        tone: {
          enum: [...TONES],
          description: 'accent, danger, info or success tint the border; muted is a dashed note.',
        },
      },
    },
    group: {
      type: 'object',
      required: ['id', 'label', 'col', 'row', 'colSpan'],
      properties: { id, label: diagramText('groupLabel', 'Caption on the frame.', true), ...placement() },
    },
    edge: {
      type: 'object',
      required: ['from', 'to', 'type'],
      properties: {
        from: ends,
        to: ends,
        type: { ...id, description: 'A legend id.' },
        label: diagramText(
          'edgeLabel',
          `Edge label. An edge between two left/right anchors sits in a column gutter and allows ${DIAGRAM_TEXT_LIMITS.gutterLabel} characters.`,
        ),
        sublabel: diagramText('sublabel', 'Smaller second line; needs a label.'),
        labelSide: { enum: [...LABEL_SIDES] },
        busOffset: {
          type: 'integer',
          minimum: 0,
          maximum: DIAGRAM_LIMITS.busOffset,
          description: 'Bus edges only: px from the many-ended side to the bus line.',
        },
      },
    },
  };
}
