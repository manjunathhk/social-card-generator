# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-09-09

### Added

- `columns` layout: two panels side by side, for comparisons.
- `grid` layout: three or four panels in a two-column grid.
- `midnight` theme, and a documented CSS variable contract for themes.
- Panel decorations: `verdict` (✓ / ✕ badge and header tint), `notes` (bullets under the code) and `underline` (token underlines via Shiki decorations).
- Markdown shorthands: `{1,3-5}` highlight lines on the fence, ✅ / ❌ heading prefixes for verdicts, `- ` bullets after a fence for notes.
- `--pdf` writes every input, in order, as a multi-page PDF carousel; `--pdf-only` skips the PNGs.
- `--scale` for 2x and 3x PNG output, `--out-dir`, `--html`, `--env`, directory inputs, `--help`, `--version`.
- `CARD_BROWSER_PATH` to use an existing Chromium binary.
- `social-card` binary (`npm run build`), GitHub Actions CI, Prettier, browser-backed render tests, `npm run samples`.
- `docs/TECHNIQUES.md` developer reference, `CONTRIBUTING.md`, this changelog.

### Changed

- Branding defaults are neutral placeholders; personal values live in `.env` (see `.env.sample`). The monogram defaults to the author's initials.
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
