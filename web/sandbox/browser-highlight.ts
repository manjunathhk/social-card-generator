// Browser variant of src/highlight.ts: core engine, JS regex engine (no WASM), fixed grammar set.
import { createHighlighterCore, type DecorationItem, type HighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import csharp from '@shikijs/langs/csharp';
import typescript from '@shikijs/langs/typescript';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import yaml from '@shikijs/langs/yaml';
import sql from '@shikijs/langs/sql';
import shellscript from '@shikijs/langs/shellscript';
import powershell from '@shikijs/langs/powershell';
import python from '@shikijs/langs/python';
import go from '@shikijs/langs/go';
import java from '@shikijs/langs/java';
import html from '@shikijs/langs/html';
import css from '@shikijs/langs/css';
import xml from '@shikijs/langs/xml';
import docker from '@shikijs/langs/docker';
import githubDark from '@shikijs/themes/github-dark';
import oneDarkPro from '@shikijs/themes/one-dark-pro';
import type { Panel } from '../../src/schema.js';

const LANGS = [
  csharp,
  typescript,
  javascript,
  json,
  yaml,
  sql,
  shellscript,
  powershell,
  python,
  go,
  java,
  html,
  css,
  xml,
  docker,
];
export const SANDBOX_LANGUAGES = [
  'csharp',
  'typescript',
  'javascript',
  'json',
  'yaml',
  'sql',
  'shellscript',
  'powershell',
  'python',
  'go',
  'java',
  'html',
  'css',
  'xml',
  'docker',
];

let highlighterPromise: Promise<HighlighterCore> | undefined;
function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    langs: LANGS,
    themes: [githubDark, oneDarkPro],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}

export async function highlightPanel(panel: Panel, theme: string): Promise<string> {
  const highlighter = await getHighlighter();
  if (!highlighter.getLoadedLanguages().includes(panel.language)) {
    throw new Error(
      `"${panel.language}" is not bundled in this sandbox. Available here: ${SANDBOX_LANGUAGES.join(', ')}. The CLI supports every Shiki language.`,
    );
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
  const out: DecorationItem[] = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start < lastEnd) continue;
    out.push({ start: r.start, end: r.end, properties: { class: 'underline' } });
    lastEnd = r.end;
  }
  return out;
}
