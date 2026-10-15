---
name: social-card-source
description: Write valid Markdown or JSON source for Social Card Studio (github.com/manjunathhk/social-card-generator), which renders 1080 x 1350 technical social cards and LinkedIn carousel PDFs from code snippets or architecture diagrams. Use when asked to write, fix or shorten a social card, code card, diagram card, LinkedIn card or carousel page, or a .md/.json file for social-card.apps.manjunathhk.in.
---

# Social card source

A card is one source file: YAML front matter plus fenced code blocks (`.md`), or one JSON object (`.json`). A card's body is either code panels (the default) or, with `"kind": "diagram"` in JSON, an architecture diagram (see [Diagram cards](#diagram-cards-json-only)). The generator validates it, highlights the code with Shiki and renders it in Chromium. It refuses to emit a card that would clip, so the limits below are hard limits, not style advice.

## Markdown format

````markdown
---
title: Await the task, not .Result
highlight: .Result can deadlock
subtitle: Blocking on async code under a synchronization context can deadlock the calling thread.
tags: [C#, Async]
issue: '07'
layout: stack
theme: dark
insight: Go async all the way down. If a caller must stay synchronous, fix the caller instead of blocking on the task.
---

## ❌ Blocking

```csharp {3}
public string Get()
{
    return LoadAsync().Result;
}
```

- Holds a thread while it waits
- Deadlocks when the context is single-threaded

## ✅ Awaiting

```csharp {1,3}
public async Task<string> Get()
{
    return await LoadAsync();
}
```

- Frees the thread until the result arrives
````

Rules the parser enforces:

- The file starts with `---` YAML front matter holding the card fields. Quote values YAML would change: zero-padded issue values such as `issue: "03"` (unquoted `03` becomes the number 3; the example above uses `issue: '07'`), and any text containing `: ` or starting with `[`, `{`, `&`, `*` or `#`.
- Each panel is an optional `## Label` heading (exactly two `#`, then a space), then one fenced code block. Any other heading level is an error.
- A `✅` heading prefix sets `verdict: good`, `❌` sets `verdict: bad`. The prefix is stripped from the label.
- `{1,3-5}` after the fence language highlights those one-based lines.
- `- ` bullets directly after a fence become that panel's notes.
- Nothing else is allowed in the body: no paragraphs, no other lists, no blank headings.
- `underline` has no Markdown syntax. Use JSON when you need it.

## JSON format

JSON exposes every field, including `underline`. `$schema` is optional and gives editors autocomplete.

```json
{
  "$schema": "https://raw.githubusercontent.com/manjunathhk/social-card-generator/main/schema/card.schema.json",
  "title": "Healthy doesn't mean started",
  "subtitle": "depends_on waits for a running container unless you ask for service_healthy.",
  "tags": ["Docker", "Compose"],
  "issue": "06",
  "panels": [
    {
      "label": "docker-compose.yml",
      "language": "yaml",
      "verdict": "good",
      "highlightLines": [5],
      "underline": ["service_healthy"],
      "code": "api:\n  build: .\n  depends_on:\n    postgres:\n      condition: service_healthy",
      "notes": ["Starts the API only after pg_isready passes"]
    }
  ]
}
```

## Limits

### Card fields

| Field       | Required | Default | Limit                                 |
| ----------- | -------- | ------- | ------------------------------------- |
| `kind`      | no       | `code`  | `code`, `diagram`                     |
| `title`     | yes      |         | 70 characters                         |
| `highlight` | no       | empty   | 70 characters                         |
| `subtitle`  | yes      |         | 150 characters                        |
| `tags`      | no       | `[]`    | up to 3 tags, 22 characters each      |
| `insight`   | no       | empty   | 220 characters                        |
| `issue`     | no       | empty   | 12 characters; blank shows no number  |
| `layout`    | no       | `stack` | `stack`, `columns`, `grid`            |
| `theme`     | no       | `light` | `light`, `dark`                       |
| `panels`    | code     |         | count and lines per layout, see below |
| `diagram`   | diagram  |         | nodes, edges and legend, see below    |

`highlight` is a second title line in the accent colour. `insight` is the design note under the panels. A code card needs `panels`; a diagram card needs `diagram` and may not have `layout` or `panels`.

### Panel fields

| Field            | Required | Limit                             | Markdown syntax              |
| ---------------- | -------- | --------------------------------- | ---------------------------- |
| `language`       | yes      | a Shiki language id or alias      | the fence language           |
| `code`           | yes      | 4000 characters                   | the fenced block             |
| `label`          | no       | 45 characters                     | `## Label` heading           |
| `highlightLines` | no       | one-based lines within the code   | `{1,3-5}` after the language |
| `verdict`        | no       | `good` or `bad`                   | `✅` or `❌` heading prefix  |
| `notes`          | no       | up to 3 notes, 70 characters each | `- ` bullets after the fence |
| `underline`      | no       | up to 6 exact substrings          | none; JSON only              |

`label` defaults to the language name. Every `underline` entry must appear verbatim in the code and fit on one line.

### Layouts

| Layout    | Panels | Max lines per panel           | Code font   | Use for                           |
| --------- | ------ | ----------------------------- | ----------- | --------------------------------- |
| `stack`   | 1 to 2 | 18 with one panel, 9 with two | 28 to 18 px | one snippet, or before and after  |
| `columns` | 2      | 16                            | 22 to 15 px | side-by-side comparison, verdicts |
| `grid`    | 3 to 4 | 10                            | 20 to 14 px | three or four short variants      |

The renderer starts at the larger font and shrinks toward the smaller one until the card fits. Code never wraps. A card within every limit can still fail if a panel's longest line is too wide, or its code too tall, at the minimum font; the error names the panel to shorten.

## Authoring lessons

- Two-panel `stack` holds at most 9 lines per panel, and fewer with a long subtitle, a long insight or notes. Cut the code to the lines that make the point; a shorter snippet is also rendered larger, which is what stays readable in a LinkedIn feed.
- Set `issue` only when the card is part of a numbered series. Without it the card has no running head and no number.
- `columns` panels stretch to equal height, so aim for 8 to 14 lines in each. A 4-line panel next to a 16-line one leaves a large empty box.
- Keep `columns` code lines under about 32 characters. Code never wraps, and a line wider than the half-width panel at the minimum font fails the card.
- Use `jsonc`, not `json`, when a panel contains comments. Strict JSON has no comments, and the language id shows in every panel header.

## Diagram cards (JSON only)

A diagram card swaps the code panels for nodes on a 3-column grid, edges routed between named anchors, and a legend. Use it for a flow or an architecture, not for code. Markdown cannot declare one.

```json
{
  "kind": "diagram",
  "title": "Return 202,",
  "highlight": "work in the background.",
  "subtitle": "The API saves the job and an event in one transaction; a worker does the rest.",
  "theme": "dark",
  "diagram": {
    "legend": [
      { "id": "http", "label": "HTTP", "tone": "info" },
      { "id": "work", "label": "Durable work", "tone": "accent" },
      { "id": "fail", "label": "Failure", "tone": "danger", "dashed": true }
    ],
    "nodes": [
      { "id": "client", "col": 1, "row": 1, "eyebrow": "Caller", "title": "Client" },
      {
        "id": "api",
        "col": 2,
        "row": 1,
        "badge": ".NET",
        "title": "Report API",
        "lines": ["POST /reports"],
        "mono": true
      },
      {
        "id": "db",
        "col": 2,
        "row": 2,
        "title": "PostgreSQL",
        "lines": ["jobs + outbox"],
        "mono": true,
        "tone": "accent"
      },
      { "id": "worker", "col": 3, "row": 2, "badge": ".NET", "title": "Worker" },
      { "id": "dlq", "col": 3, "row": 3, "title": "Dead letters", "tone": "danger" }
    ],
    "edges": [
      { "from": "client.right", "to": "api.left", "type": "http", "label": "POST" },
      { "from": "api.bottom", "to": "db.top", "type": "work", "label": "job + event", "sublabel": "one transaction" },
      { "from": "db.right", "to": "worker.left", "type": "work", "label": "relay" },
      { "from": "worker.bottom", "to": "dlq.top", "type": "fail", "label": "after N retries" }
    ]
  }
}
```

### Diagram fields

| Field              | Limit                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `diagram.legend`   | 1 to 5 entries: `id`, `label` (24 characters), `tone`, `dashed`             |
| `diagram.nodes`    | 1 to 10 nodes on 3 columns and up to 5 rows                                 |
| `diagram.groups`   | up to 2 dashed frames: `id`, `label` (60 characters), placement             |
| `diagram.edges`    | up to 14: `from`, `to`, `type`, `label`, `sublabel`, `labelSide`            |
| node `title`       | required, 26 characters                                                     |
| node `eyebrow`     | 22 characters, small caps above the title                                   |
| node `badge`       | 8 characters, a tag before the title such as `.NET`                         |
| node `lines`       | up to 3 lines, 60 characters each; `mono: true` sets them in code type      |
| edge `label`       | 20 characters, or 8 between two left/right anchors (it sits in a gutter)    |
| edge `sublabel`    | 24 characters, needs a `label`                                              |
| bus `from` or `to` | an array of up to 4 anchors on one end, top or bottom sides; `busOffset` px |

- **Placement:** `col` 1 to 3 and `row` 1 to 5, with optional `colSpan` and `rowSpan`. Two nodes may not share a cell. Groups may overlap nodes; that is what they frame.
- **Anchors:** `"node.side"` or `"node.side@0.3"`, where side is `top`, `bottom`, `left` or `right` and the fraction (default `0.5`) runs left to right or top to bottom along that side. Edges are orthogonal with at most two bends and never avoid obstacles: the anchors you pick are the route.
- **Tones:** `info`, `accent`, `success`, `danger`, `muted`. Each edge `type` names a legend `id`, and the legend's tone colours it. A node's `tone` tints its border; `muted` makes a dashed note with no fill.
- **Ids:** letters, digits, `-` or `_`, starting with a letter, unique across nodes and groups.

### Diagram lessons

- Give each tone one meaning per card (blue requests, amber durable work, red failure) and say it in the legend.
- Keep left/right edge labels to a word (`POST`, `202`, `event`). Put detail on vertical edges, which allow 20 characters and a sublabel, or in a node line.
- Run horizontal edges between nodes in the same row, and vertical ones between nodes in the same column. Edges never avoid obstacles, so a route that crosses a node draws through it; move the node or the anchor instead.
- Two edges between the same pair of nodes need different fractions, such as `@0.3` and `@0.74`, or they draw on top of each other.
- A bus (`"to": ["w1.top", "w2.top", "w3.top"]`) is the clearest way to show competing consumers. Frame the workers in a group; its caption sits on the frame's bottom edge, where edges rarely enter.
- Four rows with two lines per node is about the most a card holds. The renderer fails with "diagram overflows by N px" rather than clipping.

## Themes

| Theme   | Look                                       |
| ------- | ------------------------------------------ |
| `light` | Shared design tokens, light, drafting grid |
| `dark`  | Shared design tokens, dark, drafting grid  |

Only these two exist. `print`, `vesper`, `denim` and `denim-dark` are rejected.

Any theme works with any layout.

## Branding is not part of the source

Author, website, series, social handles and the issue label come from `CARD_*` environment variables (a `.env` file for the CLI, container env on a server) or from the Branding fields in the sandbox UI. Never put them in card source. Unknown keys are ignored, so an `author` field does nothing and hides the mistake.

## Verify before handing over

With a shell, validate text limits, panel counts and line counts without launching a browser:

```sh
npx @manjunathhk/social-card-generator --check card.md
```

`--check` needs no browser. A full render does: run `npx -p @manjunathhk/social-card-generator playwright install chromium` once (a bare `npx playwright` may fetch a Playwright whose Chromium build does not match), or set `CARD_BROWSER_PATH` to an existing Chromium. `--check` exits non-zero and names the failing field, such as `panels[1].notes[0]` or `diagram.edges[3].to`. It cannot tell whether the code fits at the minimum font size, or a diagram fits its space; only a real render (the same command without `--check`) measures that.

Without a shell, paste the source into the hosted sandbox at https://social-card.apps.manjunathhk.in, which renders a live preview and shows the same errors. The sandbox bundles these languages only: `csharp`, `typescript`, `javascript`, `json`, `jsonc`, `yaml`, `sql`, `shellscript`, `powershell`, `python`, `go`, `java`, `html`, `css`, `xml`, `docker`, `nginx`. Any other language needs the CLI. Diagram cards need no language and work in the sandbox.

## Authoritative limits

This file can lag a release. The limits the validator enforces are published as a JSON Schema (draft 2020-12):

- With a shell: `npx @manjunathhk/social-card-generator --schema`.
- Without one: https://raw.githubusercontent.com/manjunathhk/social-card-generator/main/schema/card.schema.json

Lines per panel and the code font range cannot be expressed in JSON Schema; each layout rule in the schema carries them as `x-maxLines` (keyed by panel count) and `x-fontRange`.
