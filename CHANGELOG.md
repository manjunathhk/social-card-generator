# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [3.2.0] - 2026-10-05

### Added

- Opt-in credit line: `CARD_CREDIT=true` (or the sandbox's Branding → "Credit line" dropdown) adds a small "make yours: social-card.apps.manjunathhk.in" row at the bottom of the card footer. It is off by default, so existing cards render unchanged.
- The sandbox has a footer: "Crafted with TypeScript, Shiki and Playwright".

## [3.1.1] - 2026-10-05

### Changed

- `@manjunathhk/design-tokens` updated to 1.3.0, whose light palette has a distinct accent colour. `sample/*` and `docs/images/guide/*` are regenerated (the guide screenshots now use the dark app theme).
- The sandbox wordmark's "Studio" is back to the heading weight: the lighter weight added in 3.1.0 compensated for a light accent that matched the text colour, which 1.3.0 no longer does.

## [3.1.0] - 2026-10-05

### Added

- The sandbox header has a sun/moon icon button that switches the app chrome between light and dark by setting `data-theme` on `<html>`. It follows the OS setting until it is used, and the choice is remembered in the browser (`scs:app-theme`). It does not affect the card, which keeps its own Theme picker. The "Studio" half of the wordmark is now set in a lighter weight: the design system's light palette uses one colour for accent and text, so the accent colour alone showed only in dark. (#36)

### Fixed

- The Layout and Theme pickers no longer split across two lines on a phone: each label sits above its select and the two share the row. (#36)

## [3.0.1] - 2026-10-05

### Changed

- `docs/images/guide/*` screenshots regenerated from the 3.0 sandbox (they still showed v2.4.0, IBM Plex and the retired themes).
- The sandbox's "custom…" palette starts from the `light` theme's colours and the `github-light` code palette instead of the old `print` colours.
- The two examples that were both labelled "stack · light, verdicts" in the picker are now distinguishable (the JSON one reads "stack · light, verdicts (JSON)"). A stale `print` example in a `build-sandbox.ts` comment is corrected.

## [3.0.0] - 2026-10-05

Feedback from first readers: card text was unreadable at feed size on LinkedIn, and the card carried duplicated and default-filled chrome.

### Changed

- **Breaking: two themes, `light` and `dark`.** The Paper & Denim themes `denim` and `denim-dark` are renamed `light` and `dark`, and `light` is the default theme (it was `print`). The sandbox's custom palette editor is unchanged, minus its typeface picker, since one typeface set remains. The examples and samples use the new names.
- **Readable at feed size.** LinkedIn shows the 1080 × 1350 image about 550 px wide on desktop, less on a phone. Panel headers, tags, notes, the insight label and the footer grow to 17–26 px, the subtitle and insight to 24–26 px, and the code font range rises to `stack` 28 → 18 px, `columns` 22 → 15 px and `grid` 20 → 14 px (was 20 → 16, 18 → 13 and 16 → 12). Stack panels share the height by line count, so a short panel no longer holds empty space the longer one needs and short snippets render large.
- **Breaking: lower line ceilings**, because the floors are higher: `stack` 18 lines with one panel and 9 with two (was 22 and 14), `columns` 16 (was 18), `grid` 10 (was 12). A card that was valid can now fail `--check`.
- **Breaking: `issue` is optional with no default.** It used to default to `01`, so every card showed a number. Now a card shows an issue number only when its source sets `issue`. The running head holding the number and the `CARD_ISSUE_LABEL` text appears when either is set, and the label shows on its own when the card has no number.
- The footer puts the author on the left and the series, website, LinkedIn, X handle and optional mark on the right. The series appears only in the footer (it was also in the running head).
- LinkedIn renders as its logo and `/handle`, and X as its logo and `@handle`. `CARD_LINKEDIN` and `CARD_TWITTER` accept a profile URL, a path, an `@handle` or the bare handle. The right of the footer is two lines, the series on its own and then the website and social handles, spaced apart rather than joined by dots, so a full footer no longer wraps in the middle of a list.
- The app is renamed "Social Card Studio" in the sandbox header and tab title ("Studio" in the accent colour), the README title, the server's startup message and the card-author skill. The repository, npm package and Docker image names are unchanged. Sandbox: larger type throughout the page, and a new card no longer starts with `issue: '01'`.

### Removed

- **Breaking: the `print` and `vesper` themes**, and the Bricolage Grotesque, Commit Mono and Geist faces and `@fontsource/*` dependencies they needed. A card that names either is rejected, as is a card that names the old `denim` or `denim-dark`.
- **Breaking: the author-initials monogram.** `CARD_MONOGRAM`, the Monogram field in the sandbox and the `monogram` field of `/api/branding` are gone.

## [2.6.0] - 2026-10-05

### Changed

- `@manjunathhk/design-tokens` is now `^1.2.0`, which replaced IBM Plex with Inter and JetBrains Mono. The `denim` and `denim-dark` themes and the sandbox UI therefore render in those typefaces, and the `denim` samples are regenerated.
- The denim themes and the sandbox no longer list the package's font files. Their families come from the tokens' display, sans and mono stacks, and `fonts.ts` embeds every normal-style face of those families declared in the package's `fonts.css`, so a future typeface change in the design system needs only a dependency bump. The build fails with a message naming the family if the stylesheet has no face for one. Italic faces are not embedded.

### Fixed

- `npm run sandbox` failed with ENOENT on the removed `IBMPlex*.woff2` files after the design-tokens bump (#31).

## [2.5.3] - 2026-09-26

### Added

- CI: an `npm` job publishes the package to npm after a verified push to `main`, from a clean checkout, whenever `package.json`'s version is not on npm yet. It uses npm trusted publishing (GitHub OIDC), so no token is stored, and `publishConfig` sets `access: public` and `provenance: true`, which also makes a manual `npm publish` fail outside CI. It then creates the `vX.Y.Z` tag and a GitHub Release with that version's CHANGELOG section as its notes, and fails before publishing if the section is missing.
- CI: a `pages` job deploys the browser sandbox to GitHub Pages on every push to `main`.
- CI: an `actionlint` job checks the workflow files on every PR and push.

### Fixed

- The npm package now ships only `dist/**/*.js` rather than the whole `dist/` folder. 2.5.2, published by hand, also contained two rendered draft cards (PNG and HTML) that happened to be in the local `dist/`.
- README and the card-author skill no longer describe the package as unpublished, and say that rendering needs Chromium once, installed with the package's own Playwright (`npx -p @manjunathhk/social-card-generator playwright install chromium`), while `--check` and `--schema` do not. "Publish to npm" is off the roadmap.
- CI's Docker smoke test no longer declares an unused loop variable (shellcheck SC2034, now enforced by `actionlint`).

## [2.5.2] - 2026-09-26

### Added

- Sandbox highlighter: bundled the `jsonc` grammar (17 languages). A panel with `language: jsonc`, the right choice for JSON with comments, threw "not bundled in this sandbox" in the browser even though the CLI rendered it. The card-author skill's sandbox language list is updated to match.

## [2.5.1] - 2026-09-26

### Added

- `skills/social-card-source/SKILL.md`: an [Agent Skill](https://agentskills.io) for card authors, installable with `npx skills add manjunathhk/social-card-generator`. Covers the Markdown and JSON formats, card and panel fields, per-layout limits, themes, authoring lessons, why branding never goes in the source, and how to verify a card (`--check`, or the hosted sandbox). `src/skill.test.ts` fails if its limits, layout, theme or sandbox language tables drift from `src/schema.ts` and the registries, or if its examples stop validating.
- README "Use with AI agents" section; `AGENTS.md` points card authors to `skills/`.

## [2.5.0] - 2026-09-26

### Added

- `schema/card.schema.json`: a JSON Schema (draft 2020-12) for card source, generated by `npm run schema` (`scripts/build-schema.ts`) from the limits in `src/schema.ts` and the theme registry, never hand-written. Per-layout panel counts are `if`/`then` rules on `layout`; lines per panel and the code font range, which JSON Schema cannot express, are `x-maxLines` / `x-fontRange` on each layout and in its description. The file ships in the npm package and a test fails if the committed copy differs from a fresh generation. JSON cards may carry a `$schema` property pointing at it for editor autocomplete.
- CLI `--schema`: prints the schema to stdout and exits.
- CLI `--check`: parses and validates every input (text limits, panel counts, line counts) without launching Chromium, reports each invalid input with the field that failed, and exits non-zero if any failed. Whether the code fits at the minimum font size still needs a real render.

## [2.4.0] - 2026-09-26

### Added

- Themes `denim` and `denim-dark`: the Paper & Denim palette and IBM Plex type from the shared design system [`@manjunathhk/design-tokens`](https://github.com/manjunathhk/design-tokens) (new dependency, `^1.1.0`), with the design system's drafting grid on the card. Every colour, font family, weight and radius is read from the package at build time and inlined, so a palette release reaches these themes with a dependency bump, and cards still render with no network. Code uses Shiki's `github-light` / `github-dark`. `print` stays the default theme.
- Examples `semantic-tokens.md` (`denim`) and `theme-switch.json` (`denim-dark`), with samples and README gallery entries.
- Sandbox build: fails if a card theme's Shiki theme isn't bundled in the browser highlighter, the same way it already fails for a missing grammar.

### Changed

- Sandbox UI restyled with the same design system: its colours come from the package's `tokens.css` (inlined; follows the OS light/dark setting and honours `data-theme` on `<html>`), its type is IBM Plex, and the two coloured background glows are replaced by the drafting grid. The Google Fonts request for Inter and JetBrains Mono is gone, so the sandbox page makes no network request at all. The palette editor offers the new Shiki themes and "Denim faces". `docs/images/guide/*` screenshots regenerated.

### Fixed

- Sandbox page declares `<meta charset="utf-8">`. Opened as a local file (or served without a charset header), its curly quotes, `×` and ✅/❌ were decoded as Windows-1252 and showed as mojibake.

## [2.3.3] - 2026-09-26

### Fixed

- `npm run serve` (and `node dist-server/server/index.js`) exited immediately with code 0 on Windows without listening. The entry-point check compared `import.meta.url` with a hand-built `` `file://${process.argv[1]}` ``, which never matches a Windows path (`D:\...` vs `file:///D:/...`); it now uses `pathToFileURL(process.argv[1])`. The Docker image was unaffected, since Linux paths happened to line up.

## [2.3.2] - 2026-09-16

### Added

- CI: a `version-check` job fails a PR to `main` if `package.json`'s version is unchanged from `main`; a `no-version-bump` label is the explicit opt-out for changes that ship nothing release-worthy. Never auto-commits a bump — see `CONTRIBUTING.md` ("Releasing").
- `AGENTS.md`: a "Reviewing docs for staleness" checklist for any AI coding agent (or contributor) to follow on request.
- `.github/pull_request_template.md`: Summary / Test plan / Checklist, including the two items above.

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

## [2.2.0] - 2026-09-16

### Added

- **server:** Prometheus metrics, card retention, and subpath-safe API paths ([f47406c](https://github.com/manjunathhk/social-card-generator/commit/f47406c42c8e45174ccb372ab7c5058a6716180c))

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
