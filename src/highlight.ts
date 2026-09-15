import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
  type DecorationItem,
  type Highlighter,
} from 'shiki';
import type { Panel } from './schema.js';

/**
 * Shiki wrapper. One highlighter instance is created lazily and reused for
 * every panel; languages and themes are loaded on demand so a run only pays
 * for the grammars it actually uses.
 */

let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({ themes: [], langs: [] });
  return highlighterPromise;
}

export async function highlightPanel(panel: Panel, theme: BundledTheme): Promise<string> {
  const highlighter = await getHighlighter();
  if (!highlighter.getLoadedLanguages().includes(panel.language)) {
    await highlighter.loadLanguage(panel.language as BundledLanguage);
  }
  if (!highlighter.getLoadedThemes().includes(theme)) {
    await highlighter.loadTheme(theme);
  }
  return highlighter.codeToHtml(panel.code, {
    lang: panel.language,
    theme,
    decorations: underlineDecorations(panel.code, panel.underline),
    transformers: [
      {
        line(node, line) {
          if (panel.highlightLines.includes(line)) node.properties['data-highlight'] = 'true';
        },
      },
    ],
  });
}

/**
 * Converts substrings into Shiki decorations (character offsets). Overlapping
 * matches are dropped because Shiki rejects overlapping decorations.
 */
export function underlineDecorations(code: string, terms: string[]): DecorationItem[] {
  const ranges: { start: number; end: number }[] = [];
  for (const term of terms) {
    let from = code.indexOf(term);
    while (from !== -1) {
      ranges.push({ start: from, end: from + term.length });
      from = code.indexOf(term, from + term.length);
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const decorations: DecorationItem[] = [];
  let lastEnd = -1;
  for (const range of ranges) {
    if (range.start < lastEnd) continue;
    decorations.push({ start: range.start, end: range.end, properties: { class: 'underline' } });
    lastEnd = range.end;
  }
  return decorations;
}
