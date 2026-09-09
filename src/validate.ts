import { bundledLanguagesInfo } from 'shiki';
import {
  LAYOUTS,
  LAYOUT_RULES,
  MAX_NOTES,
  MAX_TAGS,
  MAX_UNDERLINES,
  TEXT_LIMITS,
  type Card,
  type Layout,
  type Panel,
  type Verdict,
} from './schema.js';
import { DEFAULT_THEME, THEME_NAMES } from './themes/index.js';

/**
 * Turns an untrusted raw object (from JSON or Markdown) into a `Card`.
 * Every error names the offending field so authors can fix the source quickly.
 */
export function validateCard(raw: unknown): Card {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Card content must be an object.');
  }
  const value = raw as Record<string, unknown>;
  rejectLegacyFields(value);

  const layout = readLayout(value.layout);
  const theme = readTheme(value.theme);
  const panels = readPanels(value.panels, layout);

  return {
    title: readText(value, 'title', { required: true }),
    highlight: readText(value, 'highlight'),
    subtitle: readText(value, 'subtitle', { required: true }),
    tags: readTags(value.tags),
    insight: readText(value, 'insight'),
    issue: readText(value, 'issue', { required: true, fallback: '01' }),
    layout,
    theme,
    panels,
  };
}

function rejectLegacyFields(value: Record<string, unknown>) {
  const legacy = ['code', 'language', 'filename', 'after'].filter((key) => key in value);
  if (legacy.length) {
    throw new Error(
      `Top-level ${legacy.map((k) => `"${k}"`).join(', ')} is no longer supported. Describe every code block in the "panels" array instead.`,
    );
  }
}

type TextOptions = { required?: boolean; fallback?: string };

function readText(value: Record<string, unknown>, key: keyof typeof TEXT_LIMITS, options: TextOptions = {}): string {
  const limit = TEXT_LIMITS[key];
  const text = coerceScalar(value[key], key) ?? options.fallback ?? '';
  if (options.required && !text.trim()) {
    throw new Error(`"${key}" is required.`);
  }
  if (text.length > limit) {
    throw new Error(`"${key}" must be at most ${limit} characters (got ${text.length}).`);
  }
  return text;
}

/** YAML turns `issue: 03` into a number; accept scalars but nothing structured. */
function coerceScalar(input: unknown, field: string): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);
  throw new Error(`"${field}" must be text.`);
}

function readTags(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new Error('"tags" must be an array of short strings.');
  if (input.length > MAX_TAGS) throw new Error(`"tags" allows at most ${MAX_TAGS} entries.`);
  return input.map((tag, index) => {
    const text = coerceScalar(tag, `tags[${index}]`) ?? '';
    if (!text.trim() || text.length > TEXT_LIMITS.tag) {
      throw new Error(`tags[${index}] must be 1–${TEXT_LIMITS.tag} characters.`);
    }
    return text;
  });
}

function readLayout(input: unknown): Layout {
  if (input === undefined) return 'stack';
  if (typeof input !== 'string' || !(LAYOUTS as readonly string[]).includes(input)) {
    throw new Error(`"layout" must be one of: ${LAYOUTS.join(', ')}.`);
  }
  return input as Layout;
}

function readTheme(input: unknown): string {
  if (input === undefined) return DEFAULT_THEME;
  if (typeof input !== 'string' || !THEME_NAMES.includes(input)) {
    throw new Error(`"theme" must be one of: ${THEME_NAMES.join(', ')}.`);
  }
  return input;
}

function readPanels(input: unknown, layout: Layout): Panel[] {
  const rule = LAYOUT_RULES[layout];
  if (!Array.isArray(input)) throw new Error('"panels" must be an array of code panels.');
  if (input.length < rule.minPanels || input.length > rule.maxPanels) {
    const range =
      rule.minPanels === rule.maxPanels ? `exactly ${rule.minPanels}` : `${rule.minPanels}–${rule.maxPanels}`;
    throw new Error(`Layout "${layout}" needs ${range} panels (got ${input.length}).`);
  }
  const maxLines = rule.maxLines(input.length);
  return input.map((panel, index) => readPanel(panel, `panels[${index}]`, maxLines));
}

function readPanel(input: unknown, path: string, maxLines: number): Panel {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${path} must be an object with language and code.`);
  }
  const value = input as Record<string, unknown>;

  const language = resolveLanguage(value.language, path);
  const code = readCode(value.code, path, maxLines);
  const lineCount = code.split('\n').length;

  const label = coerceScalar(value.label, `${path}.label`) ?? language.name;
  if (!label.trim() || label.length > TEXT_LIMITS.label) {
    throw new Error(`${path}.label must be 1–${TEXT_LIMITS.label} characters.`);
  }

  return {
    label,
    language: language.id,
    code,
    highlightLines: readHighlightLines(value.highlightLines, path, lineCount),
    underline: readUnderline(value.underline, path, code),
    verdict: readVerdict(value.verdict, path),
    notes: readNotes(value.notes, path),
  };
}

type LanguageInfo = { id: string; name: string };

const LANGUAGE_INDEX: Map<string, LanguageInfo> = new Map();
for (const info of bundledLanguagesInfo) {
  const entry = { id: info.id, name: info.name };
  LANGUAGE_INDEX.set(info.id, entry);
  for (const alias of info.aliases ?? []) LANGUAGE_INDEX.set(alias, entry);
}

/** Accepts ids and aliases ("cs", "ts") and returns the canonical Shiki id. */
function resolveLanguage(input: unknown, path: string): LanguageInfo {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`${path}.language is required (a Shiki language id such as "csharp").`);
  }
  const info = LANGUAGE_INDEX.get(input.trim().toLowerCase());
  if (!info) {
    throw new Error(`${path}.language "${input}" is not a known Shiki language id.`);
  }
  return info;
}

function readCode(input: unknown, path: string, maxLines: number): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`${path}.code is required.`);
  }
  if (input.length > TEXT_LIMITS.code) {
    throw new Error(`${path}.code must be at most ${TEXT_LIMITS.code} characters.`);
  }
  const code = input.replace(/\r\n/g, '\n').replace(/\s+$/, '');
  const lineCount = code.split('\n').length;
  if (lineCount > maxLines) {
    throw new Error(`${path}.code has ${lineCount} lines; this layout allows at most ${maxLines} per panel.`);
  }
  return code;
}

function readHighlightLines(input: unknown, path: string, lineCount: number): number[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || !input.every((n) => Number.isInteger(n) && n >= 1 && n <= lineCount)) {
    throw new Error(`${path}.highlightLines must contain one-based line numbers between 1 and ${lineCount}.`);
  }
  return [...new Set(input as number[])].sort((a, b) => a - b);
}

function readUnderline(input: unknown, path: string, code: string): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_UNDERLINES || !input.every((term) => typeof term === 'string')) {
    throw new Error(`${path}.underline must be an array of up to ${MAX_UNDERLINES} strings.`);
  }
  for (const term of input as string[]) {
    if (!term || term.includes('\n')) {
      throw new Error(`${path}.underline entries must be non-empty single-line strings.`);
    }
    if (!code.includes(term)) {
      throw new Error(`${path}.underline "${term}" does not appear in the code.`);
    }
  }
  return input as string[];
}

function readVerdict(input: unknown, path: string): Verdict | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (input !== 'good' && input !== 'bad') {
    throw new Error(`${path}.verdict must be "good" or "bad".`);
  }
  return input;
}

function readNotes(input: unknown, path: string): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_NOTES) {
    throw new Error(`${path}.notes must be an array of at most ${MAX_NOTES} short strings.`);
  }
  return input.map((note, index) => {
    const text = coerceScalar(note, `${path}.notes[${index}]`) ?? '';
    if (!text.trim() || text.length > TEXT_LIMITS.note) {
      throw new Error(`${path}.notes[${index}] must be 1–${TEXT_LIMITS.note} characters.`);
    }
    return text;
  });
}
