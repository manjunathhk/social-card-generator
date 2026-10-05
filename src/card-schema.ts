import {
  DEFAULT_LAYOUT,
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
      'A JSON card, or the YAML front matter plus panels of a Markdown card. Character and count limits are enforced here; per-panel line limits are listed as x-maxLines per layout. A card that passes this schema can still fail to fit at the minimum code font size, which only a real render detects.',
    type: 'object',
    required: ['title', 'subtitle', 'panels'],
    properties: {
      $schema: {
        type: 'string',
        description: 'Optional URL of this schema, for editor autocomplete. Ignored by the renderer.',
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
        description: 'Code panels, in order. How many depends on the layout.',
        items: { $ref: '#/$defs/panel' },
      },
    },
    allOf: LAYOUTS.map(layoutCondition),
    $defs: {
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
