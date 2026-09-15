import { parse as parseYaml } from 'yaml';
import type { Verdict } from './schema.js';

/**
 * Markdown card source:
 *
 *   ---
 *   title: ...            # YAML front matter becomes the card fields
 *   ---
 *   ## ✅ Label            # optional heading; ✅/❌ prefix sets the verdict
 *   ```csharp {2,4-5}     # fence with language and optional highlight lines
 *   code
 *   ```
 *   - note one            # optional bullets become panel notes
 *
 * The parser is a small line walker rather than a regex so that errors can
 * point at a line number. It deliberately supports only this shape: a card
 * source is not a general Markdown document.
 */

export type RawPanel = {
  label?: string;
  language: string;
  code: string;
  highlightLines: number[];
  verdict?: Verdict;
  notes: string[];
};

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const HEADING = /^##\s+(.+?)\s*$/;
const FENCE_OPEN = /^```([^\s{`]+)\s*(\{[^}]*\})?\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const BULLET = /^[-*]\s+(.+?)\s*$/;
const GOOD_PREFIX = /^(?:✅|✔️|✔)\s*/u;
const BAD_PREFIX = /^(?:❌|✖|✗)\s*/u;

export function parseMarkdown(text: string): Record<string, unknown> {
  const normalized = text.replace(/\r\n/g, '\n');
  const match = normalized.match(FRONT_MATTER);
  if (!match) {
    throw new Error('Markdown must start with YAML front matter (--- ... ---) followed by fenced code blocks.');
  }
  const metadata: unknown = parseYaml(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Front matter must be a YAML mapping of card fields.');
  }
  const bodyStartLine = match[1].split('\n').length + 3;
  const panels = parsePanels(match[2].split('\n'), bodyStartLine);
  return { ...(metadata as Record<string, unknown>), panels };
}

function parsePanels(lines: string[], firstLineNumber: number): RawPanel[] {
  const panels: RawPanel[] = [];
  let pendingHeading: { label: string; verdict?: Verdict } | undefined;
  let index = 0;

  const lineNumber = () => firstLineNumber + index;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      if (pendingHeading) {
        throw new Error(`Line ${lineNumber()}: heading "${pendingHeading.label}" is not followed by a code fence.`);
      }
      pendingHeading = parseHeading(heading[1]);
      index += 1;
      continue;
    }

    const fence = line.match(FENCE_OPEN);
    if (fence) {
      const openLine = lineNumber();
      const closeIndex = lines.findIndex((candidate, at) => at > index && FENCE_CLOSE.test(candidate));
      if (closeIndex === -1) {
        throw new Error(`Line ${openLine}: code fence is never closed.`);
      }
      const code = lines.slice(index + 1, closeIndex).join('\n');
      index = closeIndex + 1;
      const notes = collectNotes();
      panels.push({
        label: pendingHeading?.label,
        verdict: pendingHeading?.verdict,
        language: fence[1],
        code,
        highlightLines: parseHighlightSpec(fence[2], openLine),
        notes,
      });
      pendingHeading = undefined;
      continue;
    }

    throw new Error(
      `Line ${lineNumber()}: expected "## Label", a \`\`\`language fence, or "- note" bullets after a fence, but found "${line.trim().slice(0, 40)}".`,
    );
  }

  if (pendingHeading) {
    throw new Error(`Heading "${pendingHeading.label}" is not followed by a code fence.`);
  }
  if (!panels.length) {
    throw new Error('At least one fenced code block is required.');
  }
  return panels;

  function collectNotes(): string[] {
    while (index < lines.length && !lines[index].trim()) index += 1;
    const notes: string[] = [];
    while (index < lines.length) {
      const bullet = lines[index].match(BULLET);
      if (!bullet) break;
      notes.push(bullet[1]);
      index += 1;
    }
    return notes;
  }
}

function parseHeading(text: string): { label: string; verdict?: Verdict } {
  if (GOOD_PREFIX.test(text)) return { label: text.replace(GOOD_PREFIX, '').trim(), verdict: 'good' };
  if (BAD_PREFIX.test(text)) return { label: text.replace(BAD_PREFIX, '').trim(), verdict: 'bad' };
  return { label: text };
}

/** Parses `{1,3-5}` into `[1, 3, 4, 5]`. */
export function parseHighlightSpec(spec: string | undefined, lineNumber: number): number[] {
  if (!spec) return [];
  const inner = spec.slice(1, -1).trim();
  if (!inner) return [];
  const numbers: number[] = [];
  for (const part of inner.split(',')) {
    const range = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!range) {
      throw new Error(`Line ${lineNumber}: highlight spec ${spec} must look like {1,3-5}.`);
    }
    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : from;
    if (to < from) {
      throw new Error(`Line ${lineNumber}: highlight range ${part.trim()} is reversed.`);
    }
    for (let n = from; n <= to; n += 1) numbers.push(n);
  }
  return numbers;
}
