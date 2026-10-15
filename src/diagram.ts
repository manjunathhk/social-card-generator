import {
  DIAGRAM_COLUMNS,
  DIAGRAM_LIMITS,
  DIAGRAM_TEXT_LIMITS,
  LABEL_SIDES,
  SIDES,
  TONES,
  type Anchor,
  type Diagram,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramNode,
  type LabelSide,
  type LegendEntry,
  type Side,
  type Tone,
} from './schema.js';

/**
 * Validates the `diagram` object of a diagram card. Geometry that only a
 * browser can measure (text that overflows a node, a diagram taller than the
 * card) is checked at render time by the fit script; everything else is here,
 * and every error names the field.
 */
export function readDiagram(input: unknown): Diagram {
  const value = readObject(input, 'diagram', 'an object with nodes, edges and legend');

  const legend = readList(value.legend, 'diagram.legend', 1, DIAGRAM_LIMITS.legend).map((entry, index) =>
    readLegendEntry(entry, `diagram.legend[${index}]`),
  );
  assertUnique(legend, 'diagram.legend');

  const nodes = readList(value.nodes, 'diagram.nodes', 1, DIAGRAM_LIMITS.nodes).map((node, index) =>
    readNode(node, `diagram.nodes[${index}]`),
  );
  const groups =
    value.groups === undefined
      ? []
      : readList(value.groups, 'diagram.groups', 0, DIAGRAM_LIMITS.groups).map((group, index) =>
          readGroup(group, `diagram.groups[${index}]`),
        );
  assertUnique([...nodes, ...groups], 'diagram.nodes and diagram.groups');
  assertNoOverlap(nodes);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const legendIds = new Set(legend.map((entry) => entry.id));
  const edges = readList(value.edges, 'diagram.edges', 0, DIAGRAM_LIMITS.edges).map((edge, index) =>
    readEdge(edge, `diagram.edges[${index}]`, nodeIds, legendIds),
  );

  const rows = Math.max(...[...nodes, ...groups].map((box) => box.row + box.rowSpan - 1));
  return { nodes, groups, edges, legend, rows };
}

function readLegendEntry(input: unknown, path: string): LegendEntry {
  const value = readObject(input, path, 'an object with id, label and tone');
  return {
    id: readId(value.id, `${path}.id`),
    label: readText(value.label, `${path}.label`, DIAGRAM_TEXT_LIMITS.legendLabel, true),
    tone: readEnum(value.tone, `${path}.tone`, TONES) as Tone,
    dashed: readBoolean(value.dashed, `${path}.dashed`),
  };
}

function readNode(input: unknown, path: string): DiagramNode {
  const value = readObject(input, path, 'an object with id, col, row and title');
  const placement = readPlacement(value, path);
  const lines =
    value.lines === undefined
      ? []
      : readList(value.lines, `${path}.lines`, 0, DIAGRAM_LIMITS.lines).map((line, index) =>
          readText(line, `${path}.lines[${index}]`, DIAGRAM_TEXT_LIMITS.line, true),
        );
  const tone = value.tone === undefined ? undefined : (readEnum(value.tone, `${path}.tone`, TONES) as Tone);
  return {
    id: readId(value.id, `${path}.id`),
    ...placement,
    eyebrow: readText(value.eyebrow, `${path}.eyebrow`, DIAGRAM_TEXT_LIMITS.eyebrow),
    badge: readText(value.badge, `${path}.badge`, DIAGRAM_TEXT_LIMITS.badge),
    title: readText(value.title, `${path}.title`, DIAGRAM_TEXT_LIMITS.nodeTitle, true),
    lines,
    mono: readBoolean(value.mono, `${path}.mono`),
    ...(tone ? { tone } : {}),
  };
}

function readGroup(input: unknown, path: string): DiagramGroup {
  const value = readObject(input, path, 'an object with id, label, col, row and colSpan');
  return {
    id: readId(value.id, `${path}.id`),
    label: readText(value.label, `${path}.label`, DIAGRAM_TEXT_LIMITS.groupLabel, true),
    ...readPlacement(value, path),
  };
}

type Placement = Pick<DiagramNode, 'col' | 'row' | 'colSpan' | 'rowSpan'>;

function readPlacement(value: Record<string, unknown>, path: string): Placement {
  const col = readInteger(value.col, `${path}.col`, 1, DIAGRAM_COLUMNS);
  const row = readInteger(value.row, `${path}.row`, 1, DIAGRAM_LIMITS.rows);
  const colSpan = value.colSpan === undefined ? 1 : readInteger(value.colSpan, `${path}.colSpan`, 1, DIAGRAM_COLUMNS);
  const rowSpan =
    value.rowSpan === undefined ? 1 : readInteger(value.rowSpan, `${path}.rowSpan`, 1, DIAGRAM_LIMITS.rows);
  if (col + colSpan - 1 > DIAGRAM_COLUMNS) {
    throw new Error(
      `${path} runs past the grid: col ${col} with colSpan ${colSpan} ends at column ${col + colSpan - 1}, but the grid has ${DIAGRAM_COLUMNS}.`,
    );
  }
  if (row + rowSpan - 1 > DIAGRAM_LIMITS.rows) {
    throw new Error(
      `${path} runs past the grid: row ${row} with rowSpan ${rowSpan} ends at row ${row + rowSpan - 1}, but a diagram has at most ${DIAGRAM_LIMITS.rows}.`,
    );
  }
  return { col, row, colSpan, rowSpan };
}

/** Two nodes may not share a cell. Groups are frames around nodes, so they are exempt. */
function assertNoOverlap(nodes: DiagramNode[]) {
  const owners = new Map<string, DiagramNode>();
  for (const node of nodes) {
    for (let row = node.row; row < node.row + node.rowSpan; row += 1) {
      for (let col = node.col; col < node.col + node.colSpan; col += 1) {
        const cell = `${col},${row}`;
        const owner = owners.get(cell);
        if (owner) {
          throw new Error(`Diagram nodes "${owner.id}" and "${node.id}" both occupy column ${col}, row ${row}.`);
        }
        owners.set(cell, node);
      }
    }
  }
}

function readEdge(input: unknown, path: string, nodeIds: Set<string>, legendIds: Set<string>): DiagramEdge {
  const value = readObject(input, path, 'an object with from, to and type');
  const from = readEnds(value.from, `${path}.from`, nodeIds);
  const to = readEnds(value.to, `${path}.to`, nodeIds);
  const bus = from.length > 1 || to.length > 1;
  if (from.length > 1 && to.length > 1) {
    throw new Error(`${path} has several anchors on both ends; a bus fans out from one anchor or into one anchor.`);
  }
  if (bus) {
    const vertical = (anchor: Anchor) => anchor.side === 'top' || anchor.side === 'bottom';
    if (![...from, ...to].every(vertical)) {
      throw new Error(`${path} is a bus edge, so every anchor must be on a top or bottom side.`);
    }
  }

  const type = readId(value.type, `${path}.type`);
  if (!legendIds.has(type)) {
    throw new Error(`${path}.type "${type}" is not a diagram.legend id (have: ${[...legendIds].join(', ')}).`);
  }

  const label = readText(value.label, `${path}.label`, DIAGRAM_TEXT_LIMITS.edgeLabel);
  const gutter = !bus && isSideways(from[0]) && isSideways(to[0]);
  if (gutter && label.length > DIAGRAM_TEXT_LIMITS.gutterLabel) {
    throw new Error(
      `${path}.label must be at most ${DIAGRAM_TEXT_LIMITS.gutterLabel} characters (got ${label.length}): an edge between two left/right anchors is labelled inside a column gutter. Shorten it, or move the detail into a node.`,
    );
  }
  const sublabel = readText(value.sublabel, `${path}.sublabel`, DIAGRAM_TEXT_LIMITS.sublabel);
  if (sublabel && !label) {
    throw new Error(`${path}.sublabel needs a label above it.`);
  }
  const labelSide =
    value.labelSide === undefined
      ? undefined
      : (readEnum(value.labelSide, `${path}.labelSide`, LABEL_SIDES) as LabelSide);

  let busOffset: number | undefined;
  if (value.busOffset !== undefined) {
    if (!bus) throw new Error(`${path}.busOffset applies only to bus edges (several anchors on one end).`);
    busOffset = readInteger(value.busOffset, `${path}.busOffset`, 0, DIAGRAM_LIMITS.busOffset);
  }

  return {
    from,
    to,
    type,
    label,
    sublabel,
    ...(labelSide ? { labelSide } : {}),
    ...(busOffset === undefined ? {} : { busOffset }),
  };
}

const isSideways = (anchor: Anchor) => anchor.side === 'left' || anchor.side === 'right';

function readEnds(input: unknown, path: string, nodeIds: Set<string>): Anchor[] {
  if (Array.isArray(input)) {
    if (input.length < 1 || input.length > DIAGRAM_LIMITS.busEnds) {
      throw new Error(`${path} must be an anchor or an array of 1–${DIAGRAM_LIMITS.busEnds} anchors.`);
    }
    return input.map((anchor, index) => readAnchor(anchor, `${path}[${index}]`, nodeIds));
  }
  return [readAnchor(input, path, nodeIds)];
}

const ANCHOR = /^([A-Za-z][\w-]*)\.(\w+)(?:@(\d*\.?\d+))?$/;

/** Parses `db.right@0.2`; the fraction defaults to the middle of the side. */
export function readAnchor(input: unknown, path: string, nodeIds: Set<string>): Anchor {
  const match = typeof input === 'string' ? input.trim().match(ANCHOR) : null;
  if (!match) {
    throw new Error(`${path} must look like "node.side" or "node.side@0.3" (side: ${SIDES.join(', ')}).`);
  }
  const [, node, side, at] = match;
  if (!nodeIds.has(node)) {
    throw new Error(`${path} names node "${node}", which is not in diagram.nodes.`);
  }
  if (!(SIDES as readonly string[]).includes(side)) {
    throw new Error(`${path} side "${side}" must be one of: ${SIDES.join(', ')}.`);
  }
  const fraction = at === undefined ? 0.5 : Number(at);
  if (fraction > 1) {
    throw new Error(`${path} position @${at} must be between 0 and 1.`);
  }
  return { node, side: side as Side, at: fraction };
}

function readObject(input: unknown, path: string, shape: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${path} must be ${shape}.`);
  }
  return input as Record<string, unknown>;
}

function readList(input: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(input) || input.length < min || input.length > max) {
    throw new Error(`${path} must be an array of ${min}–${max} entries.`);
  }
  return input;
}

const ID = /^[A-Za-z][\w-]*$/;

function readId(input: unknown, path: string): string {
  if (typeof input !== 'string' || !ID.test(input) || input.length > DIAGRAM_TEXT_LIMITS.id) {
    throw new Error(
      `${path} must be an id of letters, digits, "-" or "_", starting with a letter, at most ${DIAGRAM_TEXT_LIMITS.id} characters.`,
    );
  }
  return input;
}

function readText(input: unknown, path: string, limit: number, required = false): string {
  if (input === undefined || input === null) {
    if (required) throw new Error(`${path} is required.`);
    return '';
  }
  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new Error(`${path} must be text.`);
  }
  const text = String(input);
  if (required && !text.trim()) throw new Error(`${path} is required.`);
  if (text.length > limit) {
    throw new Error(`${path} must be at most ${limit} characters (got ${text.length}).`);
  }
  return text;
}

function readInteger(input: unknown, path: string, min: number, max: number): number {
  if (!Number.isInteger(input) || (input as number) < min || (input as number) > max) {
    throw new Error(`${path} must be a whole number from ${min} to ${max}.`);
  }
  return input as number;
}

function readBoolean(input: unknown, path: string): boolean {
  if (input === undefined) return false;
  if (typeof input !== 'boolean') throw new Error(`${path} must be true or false.`);
  return input;
}

function readEnum(input: unknown, path: string, options: readonly string[]): string {
  if (typeof input !== 'string' || !options.includes(input)) {
    throw new Error(`${path} must be one of: ${options.join(', ')}.`);
  }
  return input;
}

function assertUnique(items: { id: string }[], path: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`${path} use the id "${item.id}" more than once.`);
    seen.add(item.id);
  }
}
