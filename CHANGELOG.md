# 1.0.0 (2026-09-15)


### Features

* **ci:** auto-bump version and changelog with semantic-release ([#6](https://github.com/manjunathhk/social-card-generator/issues/6)) ([e2a79ff](https://github.com/manjunathhk/social-card-generator/commit/e2a79ffc0676616da639068acc9696a4007b7b38))

# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-09-09

### Added

- `columns` layout: two panels side by side, for comparisons.
- `grid` layout: three or four panels in a two-column grid.
- Themes `print` (Flexoki paper and ink, light code panels, Bricolage Grotesque, Inter, Commit Mono) and `vesper` (near-black, peach accent, Geist Sans and Mono). Each theme declares its own fonts; only the fonts of the themes in use are embedded.
- Layout sizes are tokens in `LAYOUT_RULES`, written inline on the card by the template; the base stylesheet reads tokens and contains no per-layout numbers.
- Panel decorations: `verdict` (✓ / ✕ badge and header tint), `notes` (bullets under the code) and `underline` (token underlines via Shiki decorations).
- Markdown shorthands: `{1,3-5}` highlight lines on the fence, ✅ / ❌ heading prefixes for verdicts, `- ` bullets after a fence for notes.
- `--pdf` writes every input, in order, as a multi-page PDF carousel; `--pdf-only` skips the PNGs.
- `--scale` for 2x and 3x PNG output, `--out-dir`, `--html`, `--env`, directory inputs, `--help`, `--version`.
- `CARD_BROWSER_PATH` to use an existing Chromium binary.
- `social-card` binary (`npm run build`), GitHub Actions CI, Prettier, browser-backed render tests, `npm run samples`.
- `docs/TECHNIQUES.md` developer reference, `CONTRIBUTING.md`, this changelog.
- `npm run sandbox`: a single-file browser sandbox built from the same core, with a live editor, layout and theme pickers, a custom palette editor that exports a theme module, and PNG export.
- A **New** button and a **History** panel in the sandbox: every export is kept (source, settings and the PNG) and can be reopened for further editing. History is append-only — reopening and exporting again adds a new entry.
- `server/`: a dependency-free `node:http` server that serves the sandbox at `/` (never at a `.html` path) and a small JSON API backing the History panel with plain files on disk. Opened without a server (a file, or the claude.ai artifact), history falls back to the browser's own IndexedDB automatically.
- A two-stage `Dockerfile` and `docker-compose.yml` for self-hosting: `docker compose up --build`, then `http://localhost:8787`. The runtime image needs no `node_modules` and no browser, since rendering still happens client-side. No authentication — see the README for the caveat.
- `npm run serve`, `npm run build:server`, `npm run test:server`.

### Changed

- Branding defaults are neutral placeholders; personal values live in `.env` (see `.env.sample`). The monogram defaults to the author's initials.
- The original `editorial` and `midnight` looks are replaced by `print` and `vesper`; the default theme is `print`. JetBrains Mono is no longer embedded.
- Default PNG output directory is `out/` (was `dist/`, which is now the compiled CLI). HTML previews are opt-in with `--html`.
- Language ids accept Shiki aliases (`cs`, `ts`) and are normalised to the canonical id; unknown languages fail at validation, before a browser starts.
- Numeric YAML scalars such as `issue: 03` are accepted as text instead of failing with a length error.
- Markdown parse errors report the line number and what was found.
- Overflow errors name the panel that does not fit.
- Source split into focused modules (`markdown`, `validate`, `highlight`, `template`, `renderer`, `themes/`).

### Removed

- **Breaking:** top-level `code`, `language`, `filename` and `after` fields. Every card describes its code in `panels`; the validator prints a migration hint if it sees the old fields.
- Committed sample HTML files (each embedded 100 KB of fonts). PNGs and the carousel PDF remain.

## [1.0.0]

- Initial release: single and before / after cards from Markdown or JSON, editorial theme, fit-or-fail rendering.
