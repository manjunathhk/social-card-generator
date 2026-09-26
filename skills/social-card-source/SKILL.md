---
name: social-card-source
description: Write valid Markdown or JSON source for the Social Card Generator (github.com/manjunathhk/social-card-generator), which renders 1080 x 1350 technical social cards and LinkedIn carousel PDFs from code snippets. Use when asked to write, fix or shorten a social card, code card, LinkedIn card or carousel page, or a .md/.json file for social-card.manjunathhk.in.
---

# Social card source

A card is one source file: YAML front matter plus fenced code blocks (`.md`), or one JSON object (`.json`). The generator validates it, highlights the code with Shiki and renders it in Chromium. It refuses to emit a card that would clip, so the limits below are hard limits, not style advice.

## Markdown format

````markdown
---
title: Await the task, not .Result
highlight: .Result can deadlock
subtitle: Blocking on async code under a synchronization context can deadlock the calling thread.
tags: [C#, Async]
issue: '07'
layout: stack
theme: vesper
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

- The file starts with `---` YAML front matter holding the card fields. Quote values YAML would change: `issue: '07'` (unquoted `07` becomes the number 7) and any text containing `: ` or starting with `[`, `{`, `&`, `*` or `#`.
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

| Field       | Required | Default | Limit                                    |
| ----------- | -------- | ------- | ---------------------------------------- |
| `title`     | yes      |         | 70 characters                            |
| `highlight` | no       | empty   | 70 characters                            |
| `subtitle`  | yes      |         | 150 characters                           |
| `tags`      | no       | `[]`    | up to 3 tags, 22 characters each         |
| `insight`   | no       | empty   | 220 characters                           |
| `issue`     | no       | `01`    | 12 characters                            |
| `layout`    | no       | `stack` | `stack`, `columns`, `grid`               |
| `theme`     | no       | `print` | `print`, `vesper`, `denim`, `denim-dark` |
| `panels`    | yes      |         | count and lines per layout, see below    |

`highlight` is a second title line in the accent colour. `insight` is the design note under the panels.

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

| Layout    | Panels | Max lines per panel            | Code font   | Use for                           |
| --------- | ------ | ------------------------------ | ----------- | --------------------------------- |
| `stack`   | 1 to 2 | 22 with one panel, 14 with two | 20 to 16 px | one snippet, or before and after  |
| `columns` | 2      | 18                             | 18 to 13 px | side-by-side comparison, verdicts |
| `grid`    | 3 to 4 | 12                             | 16 to 12 px | three or four short variants      |

The renderer starts at the larger font and shrinks toward the smaller one until the card fits. Code never wraps. A card within every limit can still fail if a panel's longest line is too wide, or its code too tall, at the minimum font; the error names the panel to shorten.

## Authoring lessons

- Two-panel `stack` holds at most 14 lines per panel. Cut the code to the lines that make the point.
- `columns` panels stretch to equal height, so aim for 10 to 16 lines in each. A 4-line panel next to a 16-line one leaves a large empty box.
- Keep `columns` code lines under about 32 characters. Code never wraps, and a line wider than the half-width panel at the minimum font fails the card.
- Use `jsonc`, not `json`, when a panel contains comments. Strict JSON has no comments, and the language id shows in every panel header.

## Themes

| Theme        | Look                                                |
| ------------ | --------------------------------------------------- |
| `print`      | Paper and ink, light code panels, blue accent       |
| `vesper`     | Near-black, one peach accent                        |
| `denim`      | Paper and Denim design tokens, light, drafting grid |
| `denim-dark` | Paper and Denim design tokens, dark, drafting grid  |

Any theme works with any layout.

## Branding is not part of the source

Author, website, series, monogram, social handles and the issue prefix come from `CARD_*` environment variables (a `.env` file for the CLI, container env on a server) or from the Branding fields in the sandbox UI. Never put them in card source. Unknown keys are ignored, so an `author` field does nothing and hides the mistake.

## Verify before handing over

With a shell, validate text limits, panel counts and line counts without launching a browser:

```sh
npx @manjunathhk/social-card-generator --check card.md
```

If the npm package is not available, clone the repository and run `npm ci` then `npm run card -- --check card.md`. `--check` exits non-zero and names the failing field, such as `panels[1].notes[0]`. It cannot tell whether the code fits at the minimum font size; only a real render (the same command without `--check`) measures that.

Without a shell, paste the source into the hosted sandbox at https://social-card.manjunathhk.in, which renders a live preview and shows the same errors. The sandbox bundles these languages only: `csharp`, `typescript`, `javascript`, `json`, `yaml`, `sql`, `shellscript`, `powershell`, `python`, `go`, `java`, `html`, `css`, `xml`, `docker`, `nginx`. Any other language, `jsonc` included, needs the CLI.

## Authoritative limits

This file can lag a release. The limits the validator enforces are published as a JSON Schema (draft 2020-12):

- With a shell: `npx @manjunathhk/social-card-generator --schema`.
- Without one: https://raw.githubusercontent.com/manjunathhk/social-card-generator/main/schema/card.schema.json

Lines per panel and the code font range cannot be expressed in JSON Schema; each layout rule in the schema carries them as `x-maxLines` (keyed by panel count) and `x-fontRange`.
