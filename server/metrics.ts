/**
 * Hand-rolled Prometheus exposition (text format 0.0.4), deliberately
 * dependency-free: the runtime image ships no `node_modules` (see the
 * Dockerfile), and pulling in `prom-client` for a handful of counters and
 * one histogram would be the only thing to break that. Route labels are a
 * fixed, low-cardinality set assigned by the caller (e.g. `/api/cards/:id`,
 * never the literal id) — an unbounded label value is how a metrics
 * endpoint quietly becomes a memory leak.
 */

const HISTOGRAM_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

type LabelValues = Record<string, string | number>;

function formatLabels(labels: LabelValues): string {
  const entries = Object.entries(labels);
  if (!entries.length) return '';
  return '{' + entries.map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`).join(',') + '}';
}

class Counter {
  #values = new Map<string, number>();
  constructor(
    readonly name: string,
    readonly help: string,
  ) {}

  inc(labels: LabelValues = {}, by = 1): void {
    const key = formatLabels(labels);
    this.#values.set(key, (this.#values.get(key) ?? 0) + by);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, value] of this.#values) lines.push(`${this.name}${key} ${value}`);
    return lines.join('\n');
  }
}

class Gauge {
  constructor(
    readonly name: string,
    readonly help: string,
    private readonly getValue: () => number,
  ) {}

  render(): string {
    return [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`, `${this.name} ${this.getValue()}`].join(
      '\n',
    );
  }
}

class Histogram {
  #buckets = new Map<string, number[]>(); // labels -> per-bucket cumulative counts, same order as HISTOGRAM_BUCKETS_SECONDS
  #sums = new Map<string, number>();
  #counts = new Map<string, number>();

  constructor(
    readonly name: string,
    readonly help: string,
  ) {}

  observe(labels: LabelValues, value: number): void {
    const key = formatLabels(labels);
    const counts = this.#buckets.get(key) ?? HISTOGRAM_BUCKETS_SECONDS.map(() => 0);
    HISTOGRAM_BUCKETS_SECONDS.forEach((bound, i) => {
      if (value <= bound) counts[i] += 1;
    });
    this.#buckets.set(key, counts);
    this.#sums.set(key, (this.#sums.get(key) ?? 0) + value);
    this.#counts.set(key, (this.#counts.get(key) ?? 0) + 1);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [key, counts] of this.#buckets) {
      const baseLabels = key ? key.slice(1, -1) + ',' : '';
      HISTOGRAM_BUCKETS_SECONDS.forEach((bound, i) => {
        lines.push(`${this.name}_bucket{${baseLabels}le="${bound}"} ${counts[i]}`);
      });
      lines.push(`${this.name}_bucket{${baseLabels}le="+Inf"} ${this.#counts.get(key)}`);
      lines.push(`${this.name}_sum${key} ${this.#sums.get(key)}`);
      lines.push(`${this.name}_count${key} ${this.#counts.get(key)}`);
    }
    return lines.join('\n');
  }
}

export const PROM_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

const httpRequestsTotal = new Counter('http_requests_total', 'Total HTTP requests by route, method, and status.');
const httpRequestDuration = new Histogram(
  'http_request_duration_seconds',
  'HTTP request duration in seconds by route and method.',
);
const cardsCreatedTotal = new Counter('social_card_cards_created_total', 'Cards saved to the shared history.');
const cardsDeletedTotal = new Counter('social_card_cards_deleted_total', 'Cards removed from the shared history.');
const processStartedAt = Date.now();

export function recordRequest(opts: { method: string; route: string; status: number; durationSeconds: number }) {
  const labels = { method: opts.method, route: opts.route, status: opts.status };
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe({ method: opts.method, route: opts.route }, opts.durationSeconds);
}

export function recordCardCreated(): void {
  cardsCreatedTotal.inc();
}

export function recordCardDeleted(): void {
  cardsDeletedTotal.inc();
}

const uptimeGauge = new Gauge(
  'process_uptime_seconds',
  'Time since the server process started, in seconds.',
  () => (Date.now() - processStartedAt) / 1000,
);
const heapUsedGauge = new Gauge(
  'nodejs_heap_used_bytes',
  "Node's reported heap usage, in bytes.",
  () => process.memoryUsage().heapUsed,
);

export function renderMetrics(): string {
  return (
    [httpRequestsTotal, httpRequestDuration, cardsCreatedTotal, cardsDeletedTotal, uptimeGauge, heapUsedGauge]
      .map((metric) => metric.render())
      .join('\n') + '\n'
  );
}
