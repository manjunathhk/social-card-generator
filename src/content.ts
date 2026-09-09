import { parse } from 'yaml';

export type Card = {
  panels: { label: string; language: string; code: string; highlightLines: number[] }[];
  title: string; highlight: string; subtitle: string; language: string;
  code: string; insight: string; tags: string[]; filename: string; issue: string;
  after?: { code: string; label: string; highlightLines: number[] };
};
export function parseContent(text: string, markdown = false): Card {
  text = text.replace(/^\uFEFF/, '');
  let raw: unknown;
  if (markdown) {
    const normalized = text.replace(/\r\n/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error('Markdown requires YAML front matter followed by fenced code blocks.');
    const metadata = parse(match[1]);
    const body = match[2];
    const pattern = /\s*(?:## ([^\n]+)\n)?\s*```([\w#+-]+)\n([\s\S]*?)\n```\s*/gy;
    const panels = [];
    let offset = 0;
    while (offset < body.length) {
      pattern.lastIndex = offset;
      const block = pattern.exec(body);
      if (!block) throw new Error('Each panel must be an optional ## label followed by a fenced code block.');
      panels.push({ label: block[1] ?? metadata.filename ?? 'Example', language: block[2], code: block[3] });
      offset = pattern.lastIndex;
    }
    if (!panels.length) throw new Error('At least one code panel is required.');
    raw = panels.length === 1 && !body.trimStart().startsWith('## ') ? { ...metadata, language: panels[0].language, code: panels[0].code } : { ...metadata, panels };
  } else raw = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Content must be an object.');
  const value = raw as Record<string, unknown>;
  const limits: Record<string, number> = { title: 70, highlight: 70, subtitle: 150, language: 40, code: 4000, insight: 220, filename: 45, issue: 12 };
  if (value.panels !== undefined) {
    if (!Array.isArray(value.panels) || value.panels.length < 1 || value.panels.length > 2) throw new Error('panels must contain 1 or 2 panels.');
    if (value.after !== undefined) throw new Error('Use panels or after, not both.');
    const first = value.panels[0];
    value.code = first?.code; value.language = first?.language; value.filename = first?.label;
  }
  const defaults = { highlight: '', insight: '', filename: 'Example', issue: '01' };
  const result: Record<string, unknown> = { ...defaults, ...value };
  for (const [key, max] of Object.entries(limits)) {
    if (typeof result[key] !== 'string' || (!['highlight', 'insight'].includes(key) && !(result[key] as string).trim()) || (result[key] as string).length > max)
      throw new Error(`${key} must be ${key === 'highlight' ? '0' : '1'}–${max} characters.`);
  }
  if (!Array.isArray(result.tags) || result.tags.length > 3 || !result.tags.every(t => typeof t === 'string' && t.length > 0 && t.length <= 22))
    throw new Error('tags must be an array of up to 3 strings, each 1–22 characters.');
  result.code = (result.code as string).replace(/\r\n/g, '\n').trimEnd();
  if ((result.code as string).split('\n').length > 22) throw new Error('Keep code to at most 22 lines.');
  if (result.after !== undefined) {
    const after = result.after as Card['after'];
    if (!after || typeof after.code !== 'string' || !after.code.trim() || after.code.length > 4000 || typeof after.label !== 'string' || !after.label.trim() || after.label.length > 45)
      throw new Error('after requires code and a label of 1–45 characters.');
    after.code = after.code.replace(/\r\n/g, '\n').trimEnd();
    if (after.code.split('\n').length > 14 || (result.code as string).split('\n').length > 14) throw new Error('Before/after panels support at most 14 lines each.');
    after.highlightLines ??= [];
    if (!Array.isArray(after.highlightLines) || !after.highlightLines.every(n => Number.isInteger(n) && n >= 1 && n <= after.code.split('\n').length))
      throw new Error('after.highlightLines must contain valid one-based line numbers.');
  }
  const panels = result.panels ?? [{ label: result.filename, language: result.language, code: result.code }, ...(result.after ? [{ ...(result.after as object), language: result.language }] : [])];
  result.panels = (panels as Card['panels']).map(panel => {
    if (!panel || typeof panel.label !== 'string' || !panel.label.trim() || panel.label.length > 45 || typeof panel.language !== 'string' || !panel.language.trim() || panel.language.length > 40 || typeof panel.code !== 'string' || !panel.code.trim() || panel.code.length > 4000) throw new Error('Each panel requires label, language and code.');
    const code = panel.code.replace(/\r\n/g, '\n').trimEnd();
    if (code.split('\n').length > ((panels as unknown[]).length > 1 ? 14 : 22)) throw new Error('Panel exceeds the code line limit.');
    const highlightLines = panel.highlightLines ?? [];
    if (!Array.isArray(highlightLines) || !highlightLines.every(n => Number.isInteger(n) && n >= 1 && n <= code.split('\n').length)) throw new Error('Invalid panel highlight line numbers.');
    return { label: panel.label, language: panel.language, code, highlightLines };
  });
  return result as Card;
}
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
