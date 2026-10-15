import { dark, light } from '@manjunathhk/design-tokens';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { brandingFromEnv } from './branding.js';
import { parseContent } from './content.js';
import type { DiagramCard } from './schema.js';
import { renderDocument } from './template.js';
import { validateCard } from './validate.js';

/** Diagram cards (kind: diagram): validation and markup. Routing needs a browser; see src/render/. */

const node = (id: string, col: number, row: number, extra: Record<string, unknown> = {}) => ({
  id,
  col,
  row,
  title: id.toUpperCase(),
  ...extra,
});

const minimal = () => ({
  kind: 'diagram',
  title: 'T',
  subtitle: 'S',
  diagram: {
    legend: [
      { id: 'http', label: 'HTTP', tone: 'info' },
      { id: 'fail', label: 'Failure', tone: 'danger', dashed: true },
    ],
    nodes: [node('a', 1, 1), node('b', 2, 1), node('c', 3, 2)],
    edges: [{ from: 'a.right', to: 'b.left', type: 'http', label: 'GET' }],
  },
});

type Raw = ReturnType<typeof minimal>;
const withDiagram = (change: (diagram: Raw['diagram'] & Record<string, unknown>) => void) => {
  const raw = minimal();
  change(raw.diagram as Raw['diagram'] & Record<string, unknown>);
  return raw;
};

const diagramCard = (raw: unknown) => {
  const card = validateCard(raw);
  assert.equal(card.kind, 'diagram');
  return card as DiagramCard;
};

test('a diagram card normalizes anchors, defaults and derived rows', () => {
  const card = diagramCard(
    withDiagram((d) => {
      d.edges.push({ from: 'b.bottom@0.25', to: 'c.top', type: 'fail' } as never);
    }),
  );
  assert.equal(card.theme, 'light');
  assert.equal(card.diagram.rows, 2);
  assert.deepEqual(card.diagram.nodes[0], {
    id: 'a',
    col: 1,
    row: 1,
    colSpan: 1,
    rowSpan: 1,
    eyebrow: '',
    badge: '',
    title: 'A',
    lines: [],
    mono: false,
  });
  assert.deepEqual(card.diagram.edges[1].from, [{ node: 'b', side: 'bottom', at: 0.25 }]);
  assert.deepEqual(card.diagram.edges[0].to, [{ node: 'b', side: 'left', at: 0.5 }]);
  assert.equal(card.diagram.legend[0].dashed, false);
});

test('kind defaults to code and rejects unknown kinds and mixed fields', () => {
  assert.equal(validateCard({ title: 'T', subtitle: 'S', panels: [{ language: 'ts', code: 'x' }] }).kind, 'code');
  assert.throws(() => validateCard({ ...minimal(), kind: 'chart' }), /"kind" must be one of: code, diagram/);
  assert.throws(() => validateCard({ ...minimal(), layout: 'stack' }), /"layout" apply to code cards only/);
  assert.throws(() => validateCard({ ...minimal(), panels: [] }), /"panels" apply to code cards only/);
  const { kind: _kind, ...withoutKind } = minimal();
  assert.throws(() => validateCard({ ...withoutKind, panels: [] }), /"diagram" needs "kind": "diagram"/);
});

test('edges must name existing nodes and well-formed anchors (AC 3)', () => {
  const edge = (from: unknown, to: unknown) =>
    withDiagram((d) => {
      d.edges = [{ from, to, type: 'http' } as never];
    });
  assert.throws(() => validateCard(edge('a.right', 'zz.left')), /diagram\.edges\[0\]\.to names node "zz"/);
  assert.throws(() => validateCard(edge('a.middle', 'b.left')), /diagram\.edges\[0\]\.from side "middle"/);
  assert.throws(() => validateCard(edge('a', 'b.left')), /diagram\.edges\[0\]\.from must look like "node\.side"/);
  assert.throws(() => validateCard(edge('a.right@1.5', 'b.left')), /between 0 and 1/);
  assert.throws(
    () => validateCard(edge('a.bottom', ['b.top', 'zz.top'])),
    /diagram\.edges\[0\]\.to\[1\] names node "zz"/,
  );
});

test('edge types must be legend ids (AC 4)', () => {
  const raw = withDiagram((d) => {
    d.edges[0].type = 'grpc';
  });
  assert.throws(() => validateCard(raw), /diagram\.edges\[0\]\.type "grpc" is not a diagram\.legend id/);
});

test('nodes may not share a cell or leave the grid (AC 5)', () => {
  const overlap = withDiagram((d) => {
    d.nodes.push(node('d', 1, 1, { colSpan: 1 }) as never);
  });
  assert.throws(() => validateCard(overlap), /nodes "a" and "d" both occupy column 1, row 1/);
  const spanned = withDiagram((d) => {
    d.nodes.push(node('d', 1, 2, { colSpan: 2 }) as never);
    d.nodes.push(node('e', 2, 2) as never);
  });
  assert.throws(() => validateCard(spanned), /nodes "d" and "e" both occupy column 2, row 2/);
  const wide = withDiagram((d) => {
    d.nodes[2] = node('c', 3, 2, { colSpan: 2 }) as never;
  });
  assert.throws(() => validateCard(wide), /diagram\.nodes\[2\] runs past the grid: .* ends at column 4/);
  const outside = withDiagram((d) => {
    d.nodes[2] = node('c', 4, 2) as never;
  });
  assert.throws(() => validateCard(outside), /diagram\.nodes\[2\]\.col must be a whole number from 1 to 3/);
  const groupOverNodes = withDiagram((d) => {
    d.groups = [{ id: 'g', label: 'Pool', col: 1, row: 1, colSpan: 3 }];
  });
  assert.equal(diagramCard(groupOverNodes).diagram.groups.length, 1, 'groups frame nodes, so they may overlap');
});

test('labels on left/right edges are capped at the gutter width (AC 6)', () => {
  const long = withDiagram((d) => {
    d.edges[0].label = 'too long!';
  });
  assert.throws(() => validateCard(long), /diagram\.edges\[0\]\.label must be at most 8 characters \(got 9\)/);
  const vertical = withDiagram((d) => {
    d.edges = [{ from: 'b.bottom', to: 'c.top', type: 'http', label: 'longer label, fine' }];
  });
  assert.equal(diagramCard(vertical).diagram.edges[0].label, 'longer label, fine');
});

test('bus edges fan from one anchor, use top and bottom sides, and take busOffset', () => {
  const bus = (from: unknown, to: unknown, extra: Record<string, unknown> = {}) =>
    withDiagram((d) => {
      d.edges = [{ from, to, type: 'http', ...extra } as never];
    });
  const ok = diagramCard(bus('c.bottom', ['a.top', 'b.top'], { busOffset: 30 }));
  assert.equal(ok.diagram.edges[0].to.length, 2);
  assert.equal(ok.diagram.edges[0].busOffset, 30);
  assert.throws(() => validateCard(bus(['a.top', 'b.top'], ['c.top', 'a.top'])), /several anchors on both ends/);
  assert.throws(() => validateCard(bus('c.left', ['a.top', 'b.top'])), /every anchor must be on a top or bottom side/);
  assert.throws(() => validateCard(bus('a.right', 'b.left', { busOffset: 10 })), /busOffset applies only to bus edges/);
});

test('diagram field limits name the field', () => {
  const tooMany = withDiagram((d) => {
    d.nodes = Array.from({ length: 11 }, (_, i) => node(`n${i}`, (i % 3) + 1, Math.floor(i / 3) + 1)) as never;
  });
  assert.throws(() => validateCard(tooMany), /diagram\.nodes must be an array of 1–10 entries/);
  const dupe = withDiagram((d) => {
    d.nodes[1] = node('a', 2, 1) as never;
  });
  assert.throws(() => validateCard(dupe), /use the id "a" more than once/);
  const tone = withDiagram((d) => {
    d.legend[0].tone = 'purple';
  });
  assert.throws(
    () => validateCard(tone),
    /diagram\.legend\[0\]\.tone must be one of: info, accent, success, danger, muted/,
  );
  const title = withDiagram((d) => {
    d.nodes[0].title = 'x'.repeat(27);
  });
  assert.throws(() => validateCard(title), /diagram\.nodes\[0\]\.title must be at most 26 characters/);
  const sub = withDiagram((d) => {
    d.edges[0] = { from: 'a.right', to: 'b.left', type: 'http', sublabel: 'orphan' } as never;
  });
  assert.throws(() => validateCard(sub), /diagram\.edges\[0\]\.sublabel needs a label/);
});

test('Markdown source cannot declare a diagram (AC 9)', () => {
  assert.throws(
    () => parseContent('---\nkind: diagram\ntitle: T\nsubtitle: S\n---\n', 'markdown'),
    /Diagram cards are JSON only/,
  );
});

test('diagram markup carries the grid, tones and resolved edges, with no external URLs', async () => {
  const card = diagramCard(
    withDiagram((d) => {
      d.nodes[0] = node('a', 1, 1, { badge: '.NET', lines: ['GET /x<y>'], mono: true, tone: 'accent' }) as never;
      d.groups = [{ id: 'g', label: 'Pool & co', col: 1, row: 2, colSpan: 3 }];
    }),
  );
  const html = await renderDocument([card], brandingFromEnv({}));
  assert.ok(!/https?:\/\//.test(html.replace(/<title>.*<\/title>/, '')), 'no external URLs');
  assert.ok(html.includes('class="card kind-diagram theme-light" style="--h1:65px;'));
  assert.ok(html.includes('data-kind="diagram"'));
  assert.ok(!html.includes('data-font-max'), 'no fit loop range on a diagram card');
  assert.ok(
    html.includes('<div class="dg-node tone-accent" data-node="a" style="grid-column:1 / span 1;grid-row:1 / span 1">'),
  );
  assert.ok(html.includes('<span class="dg-badge">.NET</span>'));
  assert.ok(html.includes('<ul class="dg-lines mono"><li>GET /x&lt;y&gt;</li></ul>'));
  assert.ok(html.includes('<span>Pool &amp; co</span>'));
  assert.ok(html.includes('grid-template-rows:repeat(2, auto)'));
  assert.ok(html.includes('<span class="dg-key tone-danger dashed">'));
  const edges = JSON.parse(
    html
      .match(/data-edges="([^"]*)"/)![1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&'),
  );
  assert.deepEqual(edges[0], {
    from: [{ node: 'a', side: 'right', at: 0.5 }],
    to: [{ node: 'b', side: 'left', at: 0.5 }],
    type: 'http',
    label: 'GET',
    sublabel: '',
    tone: 'info',
    dashed: false,
  });
});

test('every tone maps to a theme token, and --info comes from the design tokens (AC 8)', async () => {
  const card = diagramCard(minimal());
  const html = await renderDocument([{ ...card, theme: 'dark' }, card], brandingFromEnv({}));
  for (const [tone, token] of Object.entries({
    info: '--info',
    accent: '--accent',
    success: '--good',
    danger: '--bad',
    muted: '--muted',
  })) {
    assert.ok(html.includes(`.tone-${tone} { --tone: var(${token}); }`), tone);
  }
  assert.ok(html.includes(`--info: ${light['color.info']};`));
  assert.ok(html.includes(`--info: ${dark['color.info']};`));
});

test('the example diagrams are valid', async () => {
  for (const name of ['background-workers.json', 'cache-aside.json']) {
    const text = await readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8');
    assert.equal(parseContent(text, 'json').kind, 'diagram', name);
  }
});
