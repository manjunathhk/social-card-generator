# Social Card Generator

[![CI](https://github.com/manjunathhk/social-card-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/manjunathhk/social-card-generator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 24+](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](.nvmrc)

Turn a Markdown file into a polished 1080 × 1350 technical social card, or a whole folder of them into a LinkedIn carousel PDF. Syntax highlighting comes from [Shiki](https://shiki.style) (the same grammars VS Code uses); layout and capture come from headless Chromium via [Playwright](https://playwright.dev). Nothing touches the network at render time, and a card that would overflow fails loudly instead of clipping.

<p align="center">
  <img src="sample/redis-caching.png" alt="Single-panel card in the print theme" width="420">
  <img src="sample/span-columns.png" alt="Side-by-side comparison card in the vesper theme" width="420">
</p>

## Why

Posting code on LinkedIn or X means screenshots, and screenshots from an editor are inconsistent, unbranded, and hard to reproduce. This tool treats a card as source: a small Markdown or JSON file you can diff, review, and regenerate whenever the brand or theme changes.

## Features

- **Three layouts.** `stack` (one or two panels), `columns` (side-by-side comparison), `grid` (up to four panels).
- **Two themes.** `print`, a paper-and-ink journal page with light code panels, and `vesper`, near-black minimalism with one peach accent. Each theme owns its palette, typefaces and shape through a documented token contract.
- **Panel decorations.** Line highlights, token underlines, ✓ / ✕ verdict badges, and short bullet notes per panel.
- **Carousel PDF.** Several cards in one command become a multi-page PDF, the format LinkedIn uses for swipeable posts.
- **Fit or fail.** Code shrinks within a per-layout range until it fits; if it still cannot fit, the run fails with the panel name and the reason.
- **Deterministic and offline.** Fonts are embedded, external requests are blocked, and the same source always yields the same pixels.
- **Brandable.** Author, series, monogram and website come from a `.env` file, never from code.

## Gallery

| `stack` · print                                                            | `stack` · print, verdicts                                  | `stack` · vesper, notes                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| [![](sample/redis-caching.png)](examples/redis-caching.md)                 | [![](sample/before-after.png)](examples/before-after.json) | [![](sample/dependency-injection.png)](examples/dependency-injection.md) |
| `stack` · two languages                                                    | `columns` · vesper, notes + verdicts                       | `grid` · vesper, underlines                                              |
| [![](sample/typescript-javascript.png)](examples/typescript-javascript.md) | [![](sample/span-columns.png)](examples/span-columns.md)   | [![](sample/concurrency-grid.png)](examples/concurrency-grid.json)       |

All six, in order, as one carousel: [sample/carousel.pdf](sample/carousel.pdf). Regenerate everything with `npm run samples`.

## Quick start

Requires Node.js 24 or newer.

```sh
git clone https://github.com/manjunathhk/social-card-generator.git
cd social-card-generator
npm ci
npm run browser:install          # downloads Chromium for Playwright (once)
npm run card -- examples/span-columns.md
```

The card is written to `out/span-columns.png`. On Linux, add system libraries with `npx playwright install --with-deps chromium` if the launch complains. To use a Chromium you already have, set `CARD_BROWSER_PATH=/path/to/chromium` instead of downloading one.

Once published to npm the same tool runs without cloning:

```sh
npx @manjunathhk/social-card-generator my-card.md
```

## Writing a card

A card is YAML front matter followed by one fenced code block per panel. Headings label panels, a ✅ or ❌ prefix sets the verdict, `{2,4-6}` after the language highlights lines, and bullets after a fence become notes.

````markdown
---
title: Slice, don't copy.
highlight: Span<T> in hot paths
subtitle: The same parsing logic, with and without a new string per call.
tags: [.NET, Performance, Span]
issue: '04'
layout: columns
theme: vesper
insight: Substring allocates a new string every call. Slicing reuses memory the caller owns.
---

## ❌ Substring

```csharp
var id = line.Substring(4, 6);
```

- Allocates a new string per call

## ✅ Span

```csharp {1}
var id = line.Slice(4, 6);
```

- Works over the caller's memory
````

The same card as JSON gives you every option explicitly, including `underline`:

```json
{
  "title": "Slice, don't copy.",
  "subtitle": "The same parsing logic, with and without a new string per call.",
  "layout": "columns",
  "theme": "vesper",
  "panels": [
    { "label": "Substring", "language": "csharp", "verdict": "bad", "code": "var id = line.Substring(4, 6);" },
    {
      "label": "Span",
      "language": "csharp",
      "verdict": "good",
      "highlightLines": [1],
      "underline": ["Slice"],
      "code": "var id = line.Slice(4, 6);"
    }
  ]
}
```

### Card fields

| Field       | Required | Default     | Limit                                                 |
| ----------- | -------- | ----------- | ----------------------------------------------------- |
| `title`     | yes      |             | 70 characters                                         |
| `subtitle`  | yes      |             | 150 characters                                        |
| `highlight` | no       | empty       | 70 characters; second title line in the accent colour |
| `tags`      | no       | `[]`        | up to 3, 22 characters each                           |
| `insight`   | no       | empty       | 220 characters; the "design note" under the panels    |
| `issue`     | no       | `01`        | 12 characters                                         |
| `layout`    | no       | `stack`     | `stack`, `columns`, `grid`                            |
| `theme`     | no       | `editorial` | `editorial`, `midnight`                               |
| `panels`    | yes      |             | count depends on the layout                           |

### Panel fields

| Field            | Required | Notes                                                                      |
| ---------------- | -------- | -------------------------------------------------------------------------- |
| `language`       | yes      | Any Shiki language id or alias (`csharp`, `cs`, `ts`, `yaml`, `sql`)       |
| `code`           | yes      | Up to 4000 characters; line limit depends on the layout                    |
| `label`          | no       | Header text; defaults to the language name                                 |
| `highlightLines` | no       | One-based line numbers; Markdown uses `{1,3-5}` on the fence               |
| `underline`      | no       | Exact substrings to underline; JSON only                                   |
| `verdict`        | no       | `good` or `bad`; Markdown uses a ✅ / ❌ heading prefix                    |
| `notes`          | no       | Up to 3 bullets of 70 characters; Markdown uses `- ` lines after the fence |

### Themes

| Theme    | Ground and ink                     | Code panels                             | Type                                    |
| -------- | ---------------------------------- | --------------------------------------- | --------------------------------------- |
| `print`  | Flexoki paper and ink, blue accent | Light, `vitesse-light`, hairline border | Bricolage Grotesque, Inter, Commit Mono |
| `vesper` | Near-black, one peach accent       | `#161616`, `vesper`, no chrome          | Geist Sans, Geist Mono                  |

A theme sets colours, typefaces and panel shape through custom properties; layouts set sizes and spacing through their own tokens. The two never overlap, so any theme works with any layout. Only the fonts of the themes a document uses are embedded.

### Layouts

| Layout    | Panels | Max lines per panel | Code font range | Best for                              |
| --------- | ------ | ------------------- | --------------- | ------------------------------------- |
| `stack`   | 1–2    | 22 (one) / 14 (two) | 20 → 16 px      | A single snippet, or before / after   |
| `columns` | 2      | 18                  | 18 → 13 px      | Side-by-side comparison with verdicts |
| `grid`    | 3–4    | 12                  | 16 → 12 px      | Four short variants of the same idea  |

Character limits are ceilings, not guarantees. The renderer measures the real layout and refuses to emit a card whose code or footer would be clipped; the error names the panel and what to shorten.

## Command line

```
social-card <input.md|input.json|directory>... [options]

  --out-dir <dir>   Directory for PNG output (default: out)
  --out <file.png>  Explicit PNG path; allowed with exactly one input
  --pdf <file.pdf>  Also write every card, in order, as one multi-page PDF
  --pdf-only        Write the PDF but skip the PNGs
  --scale <1|2|3>   Device scale factor for PNGs (2 gives crisper text after platform compression)
  --html            Also write the rendered HTML next to each PNG for debugging
  --env <file>      Branding env file (default: .env in the current directory)
```

During development run it as `npm run card -- <args>`. A directory input renders every `.md` and `.json` inside it in name order, which is how a carousel is assembled:

```sh
npm run card -- posts/2026-09-caching --pdf out/caching-carousel.pdf --scale 2
```

## Branding

Copy `.env.sample` to `.env` and fill in your details. Every field is optional: leave a variable blank or unset and the card simply omits it, instead of falling back to placeholder text like `example.com`.

| Variable            | Default                                | Purpose                                          |
| ------------------- | -------------------------------------- | ------------------------------------------------ |
| `CARD_AUTHOR`       | blank                                  | Footer author                                    |
| `CARD_WEBSITE`      | blank                                  | Footer website                                   |
| `CARD_SERIES`       | blank                                  | Masthead series name and footer prefix           |
| `CARD_MONOGRAM`     | author's initials (blank if no author) | Small boxed mark in the masthead                 |
| `CARD_FOOTER_MARK`  | blank                                  | Optional large mark bottom-right; blank hides it |
| `CARD_ISSUE_LABEL`  | blank                                  | Prefix before the issue number                   |
| `CARD_LINKEDIN`     | blank                                  | LinkedIn link/handle, added to the footer        |
| `CARD_TWITTER`      | blank                                  | Twitter/X link/handle, added to the footer       |
| `CARD_BROWSER_PATH` | Playwright's build                     | Use an existing Chromium binary                  |

`CARD_WEBSITE`, `CARD_LINKEDIN` and `CARD_TWITTER` are rendered as one contact line in the footer, separated by `·`, in that order — each appears only when set.

Shell variables override the file. The committed samples use `examples/branding.env`. When [running as a server](#running-it-as-a-server-docker), these same variables set on the container become the sandbox's default branding fields for every visitor — but that default is read-only from the browser. Editing the Branding fields in the sandbox UI only saves to that browser's own storage; it's a personal override, not a way to change what other visitors see or to update the container's environment. To change the shared default, recreate the container with new `CARD_*` values. See [docs/TECHNIQUES.md](docs/TECHNIQUES.md#branding-one-server-default-read-only-from-the-ui) for why a UI-editable shared default isn't implemented.

## Browser sandbox

The same core runs in a browser for quick experiments: a Markdown or JSON editor with live preview, layout and theme pickers, a custom palette editor that can be copied out as a theme file, and PNG export.

```sh
npm run sandbox        # writes out/sandbox.html
```

Open `out/sandbox.html` directly in a browser. It has no server, no build watcher and no network dependency beyond the UI font. The PNGs it exports are rasterised by the browser and are close to the CLI's output but not byte-identical; PDF carousels and the full Shiki language list remain CLI features. The sandbox is a development aid and a prototype for a future hosted editor; see the section on running the core in the browser in [docs/TECHNIQUES.md](docs/TECHNIQUES.md).

It also has a **New** button to start a blank card, and a **History** panel: every PNG you export is kept — source, layout, theme and branding included — so you can reopen it later and pick up editing where you left off. History is append-only: reopening and exporting again adds a new entry rather than overwriting the old one. Where that history lives depends on how the page is served, which is what the next section is about.

## Running it as a server (Docker)

`npm run sandbox` on its own produces a file with nowhere to keep history between visits. Serving the same bundle from a small server gives it one: a shared history, backed by plain files on disk, that survives closing the browser.

```sh
docker compose up --build
# → http://localhost:8787
```

Or without Compose:

```sh
docker build -t social-card-sandbox .
docker run -p 8787:8787 -v sandbox-data:/data social-card-sandbox
```

Pass the [branding variables](#branding) as environment variables when creating the container, and they become the sandbox's default branding fields for every visitor (still editable per-browser, and still all optional):

```sh
docker run -p 8787:8787 -v sandbox-data:/data \
  -e CARD_AUTHOR="Your Name" -e CARD_WEBSITE="example.com" -e CARD_SERIES="Field Notes" \
  social-card-sandbox
```

The page is served at `/`, never at a `.html` path. The container needs no Chromium: rendering still happens in the visitor's browser, and the server only stores the PNG and source it already produced, as one JSON file and one PNG per card under `/data/cards` — mount `/data` as a volume or history is lost when the container is removed. There is **no authentication and no per-visitor isolation**: everyone who can reach the server shares one history. That's the right tradeoff for a personal, self-hosted instance on a private network or behind your own reverse proxy; put an auth layer in front before exposing it more widely.

Opened without a server behind it (a plain `file://` open, or this page viewed as a claude.ai artifact), the sandbox falls back to keeping history in that browser's own storage instead — same UI, just not shared across devices. The **Saved here:** line under the History panel says which one is active.

| Command                     | What it does                                                         |
| --------------------------- | -------------------------------------------------------------------- |
| `npm run serve`             | Runs the server from source (`tsx`), for local development           |
| `npm run build:server`      | Compiles the server to `dist-server/`                                |
| `npm run test:server`       | Runs the server's tests (storage and HTTP routes; no browser needed) |
| `docker compose up --build` | Builds the image and runs it with a persistent named volume          |

### Deploying a prebuilt image (VPS)

CI publishes the image built from `main` to Docker Hub (`linux/amd64` and `linux/arm64`), so a VPS can pull it directly instead of building from source:

```sh
docker run -d --name social-card-sandbox -p 8787:8787 -v sandbox-data:/data \
  --restart unless-stopped manjunathhk/social-card-generator:latest
```

Point a reverse proxy (nginx, Caddy, Traefik) at port 8787 for TLS and a domain; the container itself only speaks plain HTTP. Every push publishes `:latest` and the exact commit `:<git-sha>`; a push whose commits warrant a release (see below) also gets `:<version>` (the bumped `version` field in `package.json`, e.g. `:2.1.0`). Pin to `:<version>` or `:<git-sha>` instead of `:latest` if you want deploys to be explicit.

`version` in `package.json` and `CHANGELOG.md` are no longer hand-edited: the `release` job runs [semantic-release](https://semantic-release.gitbook.io/) on every push to `main`, deriving a patch/minor/major bump from [Conventional Commits](https://www.conventionalcommits.org/) since the last release (`fix:`/`perf:` → patch, `feat:` → minor, a `BREAKING CHANGE:` footer → major; `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `build:`, `ci:` publish `:latest`/`:<git-sha>` but cut no version). It commits the bumped `package.json`/`package-lock.json` and a generated `CHANGELOG.md` entry back to `main` (`chore(release): ... [skip ci]`, which does not retrigger CI) and creates a GitHub Release. See [CONTRIBUTING.md](CONTRIBUTING.md) for the commit message format this depends on.

#### Publishing to Docker Hub

The `publish` job in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) builds and pushes the image after `verify` and `docker` pass on `main`, or on a manual `workflow_dispatch` run. It needs two repo secrets, and silently skips publishing without them (CI still stays green):

| Setting (Settings → Secrets and variables → Actions) | Value                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Secret `DOCKERHUB_USERNAME`                          | Your Docker Hub username                                                                              |
| Secret `DOCKERHUB_TOKEN`                             | A Docker Hub [access token](https://hub.docker.com/settings/security) (not your password)             |
| Variable `DOCKERHUB_IMAGE` (optional)                | Target image, e.g. `yourname/social-card-generator` — defaults to `manjunathhk/social-card-generator` |

## How it works

Source → parse and validate → Shiki highlights each panel → an HTML document with embedded fonts and the theme's CSS → Chromium lays it out → an in-page script shrinks code to fit or reports overflow → screenshot (PNG) or print (PDF).

The techniques behind each stage, including the fit loop, the theme contract, Shiki decorations, the PDF pagination trick, and how to add a layout or theme, are written up in [docs/TECHNIQUES.md](docs/TECHNIQUES.md).

## Development

| Command               | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `npm run check`       | Type-check with `tsc`                                        |
| `npm test`            | Unit tests (parser, validation, template); no browser needed |
| `npm run test:render` | Browser tests: PNG size, fit loop, PDF page count            |
| `npm run lint`        | Prettier check                                               |
| `npm run format`      | Prettier write                                               |
| `npm run build`       | Compile to `dist/` (what the `social-card` binary runs)      |
| `npm run samples`     | Regenerate `sample/` from `examples/`                        |

CI runs all of the above on every push and uploads the rendered gallery as an artifact. See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions.

## Roadmap

- Size presets: 1080 × 1080 square and 1200 × 630 Open Graph.
- A `terminal` panel style for showing program output under code.
- A text-only `list` layout for numbered rules and checklists.
- Publish to npm.

## Prior art

Other tools turn code into a shareable image. None combine a diffable source file, a deterministic offline render, and a carousel export the way this one does:

| Tool                                                      | Form                          | Self-hostable                            | Carousel / multi-panel              | Source-controlled                                   |
| --------------------------------------------------------- | ----------------------------- | ---------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| [Carbon](https://carbon.now.sh)                           | Web only                      | No                                       | No                                  | No — paste and screenshot                           |
| [Ray.so](https://ray.so)                                  | Web only (Raycast)            | No                                       | No                                  | No                                                  |
| [Snappify](https://snappify.com)                          | Paid SaaS + API               | No                                       | Yes (slides) — closest on this axis | No                                                  |
| [Chalk.ist](https://chalk.ist)                            | Web, has an API               | No                                       | No                                  | No                                                  |
| [CodeImage](https://codeimage.dev)                        | Web, open source              | Yes                                      | No                                  | No                                                  |
| [Silicon](https://github.com/Aloxaf/silicon)              | CLI (Rust)                    | N/A — local binary                       | No                                  | Yes, but no card/branding concept                   |
| [freeze](https://github.com/charmbracelet/freeze)         | CLI (Go)                      | N/A — local binary                       | No                                  | Yes (a config file)                                 |
| [carbon-now-cli](https://github.com/mixn/carbon-now-cli)  | CLI wrapper around Carbon     | No — drives the live site via Playwright | No                                  | Partial                                             |
| [Satori](https://github.com/vercel/satori) / `@vercel/og` | Programmatic OG-image library | Yes — you own the runtime                | No                                  | Yes, but each image is React/JSX, not a card format |

Snappify is the nearest match on carousels, but it's closed SaaS with no self-host option. Silicon and freeze are the nearest on "local, scriptable, CLI-first," but neither has the layout/theme/branding contract a repeatable social card needs. This project sits at the intersection: a Markdown or JSON file you can diff and review, rendered the same way every time, self-hosted as a Docker image when you want a shared history.

## License

MIT. See [LICENSE](LICENSE). Embedded typefaces (Inter, Bricolage Grotesque, Commit Mono, Geist Sans, Geist Mono) are under the SIL Open Font License; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
