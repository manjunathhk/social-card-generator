# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, or otherwise) working in this repository. If your tool looks for a different file (`CLAUDE.md`, `.cursorrules`, etc.) and doesn't find one, that's deliberate — this is the single entry point; read it first.

## What this is

A CLI (and optional self-hosted server) that renders a Markdown or JSON source file into a 1080 × 1350 PNG social card or a multi-page PDF carousel, using Shiki for syntax highlighting and Playwright/Chromium for layout and capture. The core idea: the card is an HTML page, rendered by a real browser, never a canvas/image library re-implementing text layout. See [docs/TECHNIQUES.md](docs/TECHNIQUES.md) for the full pipeline.

## Setup

```sh
npm ci
npm run browser:install   # downloads Chromium for Playwright; skip if CARD_BROWSER_PATH is set
```

Node 24+ required (`.nvmrc`).

## Before opening a PR / finishing a task

```sh
npm run format
npm run check       # tsc --noEmit
npm test             # src/*.test.ts — parser, validation, template; no browser
npm run test:render  # src/render/*.test.ts — needs Chromium
npm run test:server  # server/*.test.ts — HTTP routes; no browser
npm run samples      # only if the change affects rendering — regenerates sample/
```

CI (`.github/workflows/ci.yml`) runs the same steps on Ubuntu with Node 24, plus a Docker build/smoke-test job. If `npm run samples` changes any image under `sample/`, commit the new images — the README gallery is the visual regression record.

## Conventions (see [CONTRIBUTING.md](CONTRIBUTING.md) for the full list)

- **TypeScript, strict, no unused symbols.** The config enforces it; don't work around it.
- **Prettier decides formatting.** Run `npm run format`, don't hand-format.
- **One statement per line.** A reviewer should understand a module in a single pass.
- **Errors name the field** (`panels[1].underline`), not just "invalid input."
- **No network at render time.** Every asset (fonts, CSS) is inlined; tests assert no external URLs in the rendered document.
- **Tests without a browser stay fast.** Parser/validation/template tests must not launch Chromium — anything that needs it belongs in `src/render/`.
- Don't add abstractions, config flags, or "just in case" error handling beyond what the task needs. This is a small, deliberately simple pipeline.

## Where things live

| Path                               | What's there                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                             | Core pipeline: schema, markdown/JSON parsing, validation, Shiki highlighting, themes, HTML template, Playwright renderer, CLI                                           |
| `src/render/`                      | Browser-backed tests (the only tests allowed to launch Chromium)                                                                                                        |
| `src/themes/`                      | One file per theme (palette) plus `base.ts` (structure/layout CSS) and `index.ts` (registry)                                                                            |
| `server/`                          | The optional self-hosted HTTP server (branding endpoint, health, metrics — no history storage; that's browser-only) — Node built-ins only, no `node_modules` at runtime |
| `web/sandbox/`                     | The single-file browser sandbox: `entry.ts` (browser build of the core), `index.template.html` (UI + inline page script), `browser-highlight.ts`                        |
| `scripts/build-sandbox.ts`         | Bundles `web/sandbox/` into `out/sandbox.html`, injecting examples/fonts as virtual modules                                                                             |
| `examples/`                        | Source cards used by `npm run samples` and the sandbox's "Load from Example" picker                                                                                     |
| `sample/`                          | Generated output (PNGs, carousel PDF) — the README gallery; regenerate, don't hand-edit                                                                                 |
| `docs/TECHNIQUES.md`               | The real architecture reference — module map, fit loop, theme contract, Docker image, branding model                                                                    |
| `Dockerfile`, `docker-compose.yml` | Multi-stage build for the server; `.github/workflows/ci.yml`'s `publish` job pushes it to Docker Hub from `main`                                                        |

## Sandbox UI specifics

`web/sandbox/index.template.html` has an inline `<script>` at the bottom that wires up the whole UI (no framework). It's plain, imperative DOM code — match that style rather than introducing a component pattern. Two behaviors worth knowing before touching it:

- The `#example` `<select>` blanks itself on `mousedown` and is re-set to the loaded example's name after `change`, so picking the same example twice in a row still reloads it (a plain `<select>` won't fire `change` for a no-op re-selection otherwise). The **New** button resets both `example.value` and the `loadedExample` tracking variable — if you add another "start fresh" action, do the same or the picker will misreport what's loaded.
- Branding fields in the UI (`#b-author` etc.) are a per-browser override only; they never write back to the server's `CARD_*` env defaults. See [docs/TECHNIQUES.md](docs/TECHNIQUES.md#branding-one-server-default-read-only-from-the-ui) if that distinction matters to a change you're making.

## Adding a theme or layout

Documented step-by-step in [docs/TECHNIQUES.md](docs/TECHNIQUES.md) under "Adding a theme" / "Adding a layout." Also add an example under `examples/`, a sample under `sample/`, a row in the README gallery, and a case in `src/render/render.test.ts`.
