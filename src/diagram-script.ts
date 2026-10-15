/**
 * The in-browser edge router for diagram cards, kept as a plain JavaScript
 * string for the same reason as FIT_SCRIPT (see fit-script.ts), which embeds
 * it and calls `routeDiagram(card)` for every diagram card before checking fit.
 *
 * Nodes are laid out by CSS grid; this script only measures them and draws.
 * Each edge reads its anchors (`{ node, side, at }`) from the stage's
 * `data-edges`, turns them into points on the measured node boxes, and draws
 * an orthogonal path with at most two bends into the stage's <svg>:
 *
 * - vertical to vertical: out, across at the midpoint, in
 * - left/right to left/right: out, down or up at the midpoint, in
 * - one of each: one bend
 * - two anchors on the same side: step out 34px and come back
 * - several anchors on one end (a bus): trunk, horizontal bus, one branch each
 *
 * There is no obstacle avoidance; anchors are the author's routing decision.
 * Colours are never set here: each edge group gets a `tone-*` class and the
 * theme's CSS decides. Returns a reason string when the diagram does not fit,
 * otherwise undefined: a label that leaves the stage (see `label`), a node
 * wider than its column, or a grid taller than its space. Safe to run again on the same card (the sandbox does).
 */
export const DIAGRAM_SCRIPT = /* js */ `
const routeDiagram = (card) => {
  const NS = 'http://www.w3.org/2000/svg';
  const STEP_OUT = 34;
  const HEAD = 11;
  const TOLERANCE = 1;
  const stage = card.querySelector('.dg-stage');
  const svg = stage.querySelector('.dg-edges');
  svg.replaceChildren();
  const origin = stage.getBoundingClientRect();
  const edges = JSON.parse(stage.dataset.edges);

  const make = (tag, attributes, parent) => {
    const element = document.createElementNS(NS, tag);
    for (const name of Object.keys(attributes)) element.setAttribute(name, attributes[name]);
    parent.appendChild(element);
    return element;
  };

  const point = (anchor) => {
    const box = stage.querySelector('[data-node="' + anchor.node + '"]').getBoundingClientRect();
    const left = box.left - origin.left;
    const top = box.top - origin.top;
    const vertical = anchor.side === 'top' || anchor.side === 'bottom';
    const x = anchor.side === 'left' ? left : anchor.side === 'right' ? left + box.width : left + box.width * anchor.at;
    const y = anchor.side === 'top' ? top : anchor.side === 'bottom' ? top + box.height : top + box.height * anchor.at;
    return { x, y, side: anchor.side, vertical };
  };

  const same = (a, b) => Math.abs(a - b) < TOLERANCE;

  const route = (a, b) => {
    if (a.vertical && b.vertical) {
      if (same(a.x, b.x) && a.side !== b.side) return [[a.x, a.y], [b.x, b.y]];
      const y = a.side === b.side
        ? (a.side === 'bottom' ? Math.max(a.y, b.y) + STEP_OUT : Math.min(a.y, b.y) - STEP_OUT)
        : (a.y + b.y) / 2;
      return [[a.x, a.y], [a.x, y], [b.x, y], [b.x, b.y]];
    }
    if (!a.vertical && !b.vertical) {
      if (same(a.y, b.y) && a.side !== b.side) return [[a.x, a.y], [b.x, b.y]];
      const x = a.side === b.side
        ? (a.side === 'right' ? Math.max(a.x, b.x) + STEP_OUT : Math.min(a.x, b.x) - STEP_OUT)
        : (a.x + b.x) / 2;
      return [[a.x, a.y], [x, a.y], [x, b.y], [b.x, b.y]];
    }
    return a.vertical ? [[a.x, a.y], [a.x, b.y], [b.x, b.y]] : [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  };

  /** A stroke, plus an arrowhead at the last point; the stroke stops at the head's base. */
  const draw = (points, group, arrow) => {
    const line = points.map((p) => p.slice());
    if (arrow) {
      const [x1, y1] = line[line.length - 2];
      const [x2, y2] = line[line.length - 1];
      const length = Math.hypot(x2 - x1, y2 - y1) || 1;
      const dx = (x2 - x1) / length;
      const dy = (y2 - y1) / length;
      line[line.length - 1] = [x2 - dx * (HEAD - 2), y2 - dy * (HEAD - 2)];
      const bx = x2 - dx * HEAD;
      const by = y2 - dy * HEAD;
      const head = [[x2, y2], [bx - dy * 7, by + dx * 7], [bx + dy * 7, by - dx * 7]];
      make('path', { class: 'dg-head', d: 'M' + head.map((p) => p.join(',')).join(' L') + ' Z' }, group);
    }
    make('path', { class: 'dg-line', d: 'M' + line.map((p) => p.join(',')).join(' L') }, group);
  };

  /**
   * Label on a segment: above or below a horizontal one, left or right of a
   * vertical one. A label placed by default flips sides rather than leave the
   * stage; one the author placed is reported instead, naming the edge.
   */
  const label = (edge, group, p, q) => {
    if (!edge.label) return undefined;
    const horizontal = same(p[1], q[1]);
    const fallback = horizontal ? 'above' : 'right';
    const drawn = place(edge, group, p, q, edge.labelSide || fallback);
    if (fits(drawn)) return undefined;
    if (edge.labelSide) return 'leaves the diagram; try labelSide "' + opposite[edge.labelSide] + '" or a shorter label';
    drawn.remove();
    return fits(place(edge, group, p, q, opposite[fallback])) ? undefined : 'leaves the diagram on both sides; shorten it';
  };

  const opposite = { above: 'below', below: 'above', left: 'right', right: 'left' };
  const fits = (element) => {
    const box = element.getBBox();
    return box.x >= -TOLERANCE && box.x + box.width <= stage.clientWidth + TOLERANCE;
  };

  const place = (edge, group, p, q, side) => {
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const anchor = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
    const x = side === 'left' ? mx - 12 : side === 'right' ? mx + 12 : mx;
    const lines = edge.sublabel ? 2 : 1;
    const y = side === 'above' ? my - 12 - (lines - 1) * 20 : side === 'below' ? my + 26 : my + 6 - (lines - 1) * 10;
    const text = make('g', { class: 'dg-label' }, group);
    make('text', { x, y, 'text-anchor': anchor, class: 'dg-label-main' }, text).textContent = edge.label;
    if (edge.sublabel) make('text', { x, y: y + 20, 'text-anchor': anchor, class: 'dg-label-sub' }, text).textContent = edge.sublabel;
    const box = text.getBBox();
    const plate = document.createElementNS(NS, 'rect');
    for (const [name, value] of Object.entries({ class: 'dg-plate', x: box.x - 6, y: box.y - 2, width: box.width + 12, height: box.height + 4, rx: 4 })) plate.setAttribute(name, value);
    text.insertBefore(plate, text.firstChild);
    return text;
  };

  const longest = (points) => {
    let best = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const length = (k) => Math.hypot(points[k + 1][0] - points[k][0], points[k + 1][1] - points[k][1]);
      if (length(i) > length(best)) best = i;
    }
    return [points[best], points[best + 1]];
  };

  const problems = [];
  edges.forEach((edge, index) => {
    const group = make('g', { class: 'dg-edge tone-' + edge.tone + (edge.dashed ? ' dashed' : '') }, svg);
    const from = edge.from.map(point);
    const to = edge.to.map(point);
    if (from.length > 1 || to.length > 1) {
      const fanOut = to.length > 1;
      const one = fanOut ? from[0] : to[0];
      const many = fanOut ? to : from;
      const near = fanOut ? Math.min(...many.map((p) => p.y)) : Math.max(...many.map((p) => p.y));
      const towardOne = one.y < near ? -1 : 1;
      const busY = edge.busOffset === undefined ? (one.y + near) / 2 : near + towardOne * edge.busOffset;
      const xs = [one.x, ...many.map((p) => p.x)];
      const bus = [[Math.min(...xs), busY], [Math.max(...xs), busY]];
      draw(bus, group, false);
      if (fanOut) {
        draw([[one.x, one.y], [one.x, busY]], group, false);
        for (const p of many) draw([[p.x, busY], [p.x, p.y]], group, true);
      } else {
        for (const p of many) draw([[p.x, p.y], [p.x, busY]], group, false);
        draw([[one.x, busY], [one.x, one.y]], group, true);
      }
      const problem = label(edge, group, [one.x, one.y], [one.x, busY]);
      if (problem) problems.push('the label of diagram.edges[' + index + '] ' + problem);
      return;
    }
    const points = route(from[0], to[0]);
    draw(points, group, true);
    const [p, q] = longest(points);
    const problem = label(edge, group, p, q);
    if (problem) problems.push('the label of diagram.edges[' + index + '] ' + problem);
  });

  if (problems.length) return problems[0];

  const wide = [...stage.querySelectorAll('.dg-node')].find((node) => node.scrollWidth > node.clientWidth + TOLERANCE);
  if (wide) return 'diagram node "' + wide.dataset.node + '" is wider than its column; shorten its longest word or line';
  const over = stage.scrollHeight - stage.clientHeight;
  if (over > TOLERANCE) return 'diagram overflows by ' + Math.ceil(over) + 'px; remove a row, shorten node text, or shorten the subtitle';
  return undefined;
};
`;
