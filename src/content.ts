import { extname } from 'node:path';
import { parseMarkdown } from './markdown.js';
import { validateCard } from './validate.js';
import type { Card } from './schema.js';

export type SourceFormat = 'markdown' | 'json';

export function formatFromPath(path: string): SourceFormat {
  const extension = extname(path).toLowerCase();
  if (extension === '.md') return 'markdown';
  if (extension === '.json') return 'json';
  throw new Error(`Unsupported input "${path}": expected a .md or .json file.`);
}

/** Parses Markdown or JSON card source text into a validated `Card`. */
export function parseContent(text: string, format: SourceFormat): Card {
  const source = text.replace(/^﻿/, '');
  const raw: unknown = format === 'markdown' ? parseMarkdown(source) : JSON.parse(source);
  return validateCard(raw);
}
