# [2.2.0](https://github.com/manjunathhk/social-card-generator/compare/v2.1.1...v2.2.0) (2026-09-16)


### Features

* **server:** add Prometheus metrics, card retention, and subpath-safe API paths ([f47406c](https://github.com/manjunathhk/social-card-generator/commit/f47406c42c8e45174ccb372ab7c5058a6716180c))

# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.3.1] - 2026-09-16

### Added

- `docs/PORTAL_NAVIGATION_GUIDE.md`: a screenshot-driven walkthrough of the sandbox for non-technical visitors. Linked from the sandbox header as "Guide", alongside Repository and Techniques.

## [2.3.0] - 2026-09-16

### Changed

- Sandbox page renamed "Social Card Generator" (was "Social Card Sandbox"). The header now shows the package version instead of the git branch/sha build tag.

### Fixed

- Markdown parser: a heading written with the wrong number of `#`'s (or with no label yet, mid-typing) always reports the line's actual text — never a hard-coded `"## "` that could imply a character was dropped.
- Sandbox source editor: disabled font ligatures, so two consecutive `#` characters can no longer render as a single merged glyph on fonts/platforms that apply a ligature there.
- Sandbox highlighter: bundled the `nginx` grammar. `examples/nginx-rate-limit.md` — one of the shipped "Load from Example" entries — threw a runtime error when picked, since the browser highlighter's fixed grammar set didn't include it. The sandbox build now also validates every shipped example's panel languages against the bundled set, failing the build if one is missing instead of surfacing only when a visitor picks that example.

## [2.1.1] - 2026-09-15

### Fixed

- Two consecutive semantic-release runs (see the 2.1.0 entry below) mis-anchored again because the bad `v1.0.0`/`v1.0.1` tags they created were still the highest tags in the repo. Deleted those tags and their GitHub Releases, and hand-corrected `version` to `2.1.1` — `2.1.0` plus the one `fix:` commit since (#7). Seeded `v2.0.0`/`v2.1.0`/`v2.1.1` tags so future runs anchor correctly.

## [2.1.0] - 2026-09-15

### Added

- CI now bumps `version` here and in `package.json` automatically via [semantic-release](https://semantic-release.gitbook.io/), driven by [Conventional Commits](https://www.conventionalcommits.org/) on `main`. See `CONTRIBUTING.md` for the commit format.

### Fixed

- semantic-release's first run on this repo had no prior `v2.0.0` git tag to anchor to, so it treated the project as unreleased and reset `version` to `1.0.0` (and published a `:1.0.0`-tagged, `:latest` image to Docker Hub). This restores `2.1.0` — the correct next version given the one `feat:` commit since `2.0.0` — and seeds a `v2.0.0`/`v2.1.0` git tag so future releases compute correctly.

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
