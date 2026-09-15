# Techniques

A developer reference for how the generator works and why it is built this way. Read this before changing the renderer, adding a theme or layout, or debugging a card that will not fit.

## Contents

1. [The one idea](#the-one-idea)
2. [Pipeline and module map](#pipeline-and-module-map)
3. [Input: a deliberately small Markdown dialect](#input-a-deliberately-small-markdown-dialect)
4. [Validation that coerces and names the field](#validation-that-coerces-and-names-the-field)
5. [Syntax highlighting with Shiki](#syntax-highlighting-with-shiki)
6. [Self-contained HTML: embedded fonts, blocked network](#self-contained-html-embedded-fonts-blocked-network)
7. [Layout, theme and decoration as separate axes](#layout-theme-and-decoration-as-separate-axes)
8. [The fit loop: measure, don't guess](#the-fit-loop-measure-dont-guess)
9. [PDF carousels from one document](#pdf-carousels-from-one-document)
10. [Playwright details that matter](#playwright-details-that-matter)
11. [Testing strategy](#testing-strategy)
12. [Packaging: tsx in development, compiled JS in the binary](#packaging-tsx-in-development-compiled-js-in-the-binary)
13. [Running the core in the browser](#running-the-core-in-the-browser)
14. [History: a dumb store behind two backends](#history-a-dumb-store-behind-two-backends)
15. [The Docker image](#the-docker-image)
16. [Branding: one server default, read-only from the UI](#branding-one-server-default-read-only-from-the-ui)
17. [Adding a theme](#adding-a-theme)
18. [Adding a layout](#adding-a-layout)
19. [Gotchas](#gotchas)

## The one idea

The card is an HTML page. Chromium lays it out, and Playwright screenshots it. Everything else exists to produce good HTML or to check the result.

Drawing the card with a canvas or image library would mean re-implementing text wrapping, font fallback, flexbox, shadows and rounded corners. A browser already does all of that, at production quality, from CSS anyone can read. The cost is a Chromium download and about a second of launch time per run, which is acceptable for a publishing tool.

## Pipeline and module map

```mermaid
flowchart LR
  A[".md / .json"] --> B["markdown.ts<br>parseMarkdown"]
  A --> C["JSON.parse"]
  B --> D["validate.ts<br>validateCard → Card"]
  C --> D
  D --> E["highlight.ts<br>Shiki → HTML per panel"]
  E --> F["template.ts<br>document with fonts + theme CSS"]
  F --> G["renderer.ts<br>Chromium: load, fonts.ready"]
  G --> H["fit-script.ts<br>shrink code or report overflow"]
  H --> I["PNG screenshot"]
  H --> J["PDF print"]
```

| Module              | Responsibility                                                                                      | Depends on                              |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `src/schema.ts`     | The `Card` and `Panel` types, text limits, per-layout rules (panel counts, line limits, font range) | nothing                                 |
| `src/markdown.ts`   | Front matter plus fences, headings, highlight specs and note bullets, into a raw object             | `yaml`                                  |
| `src/validate.ts`   | Raw object into a `Card`; coercion, defaults, limits, language alias resolution                     | `schema`, `themes`, Shiki language list |
| `src/content.ts`    | Picks the parser by file extension and strips a BOM                                                 | `markdown`, `validate`                  |
| `src/highlight.ts`  | One cached Shiki highlighter; line highlights and underline decorations                             | `shiki`                                 |
| `src/fonts.ts`      | `@font-face` rules with WOFF2 files inlined as base64                                               | `@fontsource/*`                         |
| `src/themes/`       | `base.ts` (structure and layout CSS), one file per theme (palette variables), `index.ts` registry   | nothing                                 |
| `src/template.ts`   | Cards into one HTML document                                                                        | all of the above                        |
| `src/fit-script.ts` | The in-browser fit loop as a JavaScript string                                                      | `schema`                                |
| `src/renderer.ts`   | Playwright: launch, route blocking, layout, PNG, PDF                                                | `playwright`, `fit-script`              |
| `src/branding.ts`   | `.env` loading and neutral defaults                                                                 | `node:process`                          |
| `src/cli.ts`        | Argument parsing, input expansion, orchestration, output                                            | everything                              |

Data flows one way. Nothing after `validate.ts` re-checks input, and nothing before `template.ts` knows about HTML.

## Input: a deliberately small Markdown dialect

`parseMarkdown` is a line walker, not a Markdown parser. It accepts exactly this grammar:

```
front matter
( "## " label )? fence ( "- " note )*   repeated
```

Three reasons for not using remark or markdown-it:

- A card source is not a document. Prose between panels has no place on the card, so accepting it would only hide mistakes.
- A line walker gives errors with line numbers ("Line 12: heading is not followed by a code fence"). A generic AST does not know what a "panel" is.
- Zero parsing dependencies beyond `yaml`.

The fence info string carries the language and an optional highlight spec: ` ```csharp {2,4-6} `. Heading prefixes ✅ and ❌ set the verdict and are stripped from the label. Bullets directly after a fence become notes. Token underlines are JSON-only because encoding arbitrary substrings in a fence info string would need an escaping scheme nobody would remember.

## Validation that coerces and names the field

`validateCard` is the only place that inspects raw input. Some choices worth knowing:

- **Scalars are coerced.** YAML turns `issue: 03` into the number 3. Rejecting that with "must be 1–12 characters" is a bad error; the validator accepts numbers and booleans as text and only rejects objects and arrays.
- **Languages are resolved early.** Shiki ships `bundledLanguagesInfo`, a static list of ids, display names and aliases. The validator builds a lookup from it, so `cs` becomes `csharp`, the display name becomes the default label, and an unknown language fails before a browser is launched.
- **Every error names the path.** `panels[1].underline "Lock" does not appear in the code` tells the author exactly where to look.
- **Legacy fields are rejected with a hint.** Version 1 had top-level `code`, `language` and `after`. The validator recognises them and prints the migration message rather than a generic "panels is required".

## Syntax highlighting with Shiki

Shiki runs TextMate grammars, the same ones VS Code uses, in Node. It emits `<span style="color:#…">` per token, so the output needs no stylesheet and no JavaScript in the page. That is exactly what a screenshot pipeline wants.

Three details in `highlight.ts`:

**One highlighter, lazy loading.** `createHighlighter` is expensive because it initialises the regex engine. The module creates it once, with no languages or themes, and calls `loadLanguage` and `loadTheme` on first use. A carousel with six C# cards loads the C# grammar once.

**Line highlights via a transformer.** Shiki calls the `line(node, lineNumber)` hook for every line; the transformer sets `data-highlight="true"` on the lines listed in `highlightLines`, and CSS paints the background. Doing this at the token level rather than post-processing HTML keeps the markup valid.

**Token underlines via decorations.** Shiki's `decorations` option wraps a character range in an element with the given properties. `underlineDecorations` finds every occurrence of each requested substring, converts them to `{ start, end }` character offsets, sorts them, and drops any that overlap an earlier one, because Shiki throws on overlapping decorations. The CSS class `underline` draws a thick coloured `text-decoration`.

## Self-contained HTML: embedded fonts, blocked network

The document must render identically on every machine and never wait on a network. Two mechanisms enforce that:

- `fonts.ts` reads the WOFF2 files each used theme lists from its `@fontsource` package and inlines them as base64 `@font-face` rules. Only the fonts of the themes present in the document are embedded, and a file shared by two themes is embedded once. The document grows by roughly 100–150 KB and is completely portable.
- `renderer.ts` registers `page.route('**/*', route => route.abort())` before loading content. If anyone ever adds an `<img src="https://…">` to a template, the request fails immediately and visibly rather than sometimes working.

The renderer also awaits `document.fonts.ready` before measuring. Without that, the first measurement can happen with a fallback font and the fit loop makes decisions on the wrong metrics.

## Layout, theme and decoration as separate axes

A card's appearance is the product of three independent choices, and the code keeps them in separate places so a new one of any kind touches one file.

| Axis        | Chosen by        | Lives in                                 | Mechanism                                                         |
| ----------- | ---------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Layout      | `layout` field   | `schema.ts` rules + `themes/base.ts` CSS | `.layout-<name>` class on the card; flex or grid on `.panels`     |
| Theme       | `theme` field    | `themes/<name>.ts`                       | `.theme-<name>` class sets CSS custom properties                  |
| Decorations | per-panel fields | `template.ts` markup + `base.ts` CSS     | `.verdict-good`, `.panel-notes`, `[data-highlight]`, `.underline` |

Two token sets meet in `base.ts`, and it contains almost no literal numbers of its own:

**Layout tokens** are sizes and spacing. They live in `LAYOUT_RULES[layout].tokens(panelCount)` in `schema.ts` and the template writes them inline on the card element (`style="--h1:58px;--intro-y:26px;…"`). `base.ts` only reads them, so adding a layout means adding a row of numbers, not a block of CSS. The set is `--h1 --subtitle --intro-y --panel-gap --header-y --header-x --header-size --code-y --code-x --notes-size --notes-y --insight-y --insight-size`.

**Theme tokens** are set by each theme under `.theme-<name>`. A theme must define all of them:

```
palette  --bg --fg --muted --muted-2 --accent --accent-title --rule
         --panel --panel-border --panel-shadow --panel-header-bg --panel-header-fg --panel-rule
         --line-highlight --underline --notes-fg --good --bad --badge-fg
type     --font-display --font-sans --font-mono --h1-weight --h1-tracking
shape    --panel-radius
```

A theme also lists the font files it needs (`fonts`) and names the Shiki theme for code tokens, and may add small overrides scoped under its class: `vesper` hides the monogram and the issue label and enlarges the issue numeral; `print` puts a heavy rule under the running head.

Why custom properties rather than a preprocessor: the values need to be live at render time (a layout override in the sandbox, a custom theme built from four colours), Chromium is the only consumer, and one build tool fewer across the CLI, the compiled binary and the browser bundle is worth more than Sass nesting. Layouts never set colours and themes never move boxes. If you find yourself writing `.theme-x .panels { grid-template-columns … }`, the change belongs in a layout instead.

## The fit loop: measure, don't guess

Character limits cannot guarantee that code fits: a line of `WWWW` is twice as wide as a line of `iiii`. So the renderer measures.

`fit-script.ts` runs inside the page after fonts are ready. For each `.card`:

1. Read the layout's font range from `data-font-max` and `data-font-min` on the card. `stack` runs 20 → 16 px, `columns` 18 → 13 px, `grid` 16 → 12 px.
2. For each `pre.shiki`, start at the maximum and step down by 0.5 px until `scrollWidth` fits the parent's inner width and the rendered height fits the parent's inner height, or the minimum is reached.
3. Apply the smallest size found to every panel on that card. Two panels at different sizes look like a mistake even when both fit.
4. Re-check every panel at that unified size, then check that the card itself does not scroll and the footer's bottom edge sits above the card's bottom margin.
5. Return `{ ok, fontSize, reason }`. The reason names the panel that does not fit, or says the prose is pushing the footer off.

The CLI turns `ok: false` into a non-zero exit and never writes the file. A clipped card that gets posted is worse than no card.

Why a step loop and not a binary search: the range has at most sixteen steps, each is one synchronous layout pass, and monotonicity is not guaranteed once text wrapping interacts with panel heights. Simple and correct beats fast here.

**Why the script is a string.** Playwright serialises a function passed to `page.evaluate` with `Function.prototype.toString`. tsx (and esbuild generally) rewrites functions to preserve their names through a `__name(...)` helper that exists only in the Node bundle, so the serialised source throws `ReferenceError: __name is not defined` inside Chromium. Compiled output from `tsc` does not have this problem, which makes it a bug that appears only in development. Keeping the script as a JavaScript string removes the failure mode in both environments at the cost of type checking on forty lines.

## PDF carousels from one document

LinkedIn carousels are multi-page PDFs. Rather than rendering N single-page PDFs and merging them (which needs a PDF library), the template puts every card into one HTML document and lets Chromium paginate:

- `@page { size: 1080px 1350px; margin: 0 }` makes each PDF page exactly one card.
- `.card { break-after: page }` (with the legacy `page-break-after` alias) forces one card per page. The last card resets it so there is no trailing blank page.
- `page.pdf({ width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true })` prints backgrounds, which Chromium omits by default.
- `page.emulateMedia({ media: 'screen' })` first, so the print run uses the same stylesheet the fit loop measured. Without it, `print` media could change metrics after the fit decision.

The fit loop runs once over all cards before printing and reports per card, so the CLI can say which file in a batch overflowed.

## Playwright details that matter

- `deviceScaleFactor` on the page controls PNG resolution without touching CSS. `--scale 2` gives a 2160 × 2700 image with identical layout, which survives platform recompression noticeably better.
- The viewport is fixed at 1080 × 1350 and the screenshot is not full-page. The card is `overflow: hidden` at that exact size, so anything that escapes is a bug the fit check should have caught, not something to capture.
- One browser and one page are reused across a batch. Launch is the expensive part; `setContent` per card is cheap.
- `CARD_BROWSER_PATH` maps to `executablePath`. Playwright pins a specific Chromium revision per version, and containers or CI images often carry a different one. The override lets you use what is installed rather than downloading another 150 MB.

## Testing strategy

Two tiers, split by whether a browser is needed:

| Tier   | Command               | Covers                                                                                                                                                               | Runtime        |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Unit   | `npm test`            | Markdown grammar and error lines, validation and coercion, template markup, decorations, theme inclusion                                                             | under a second |
| Render | `npm run test:render` | Every example layout produces a 1080 × 1350 PNG (2160 × 2700 at 2x); the fit loop shrinks long code and refuses impossible code; three cards become a three-page PDF | a few seconds  |

The render tests check outputs structurally rather than by pixel comparison: the PNG header's IHDR width and height, the `%PDF-` magic bytes, and a count of `/Type /Page` objects. Pixel snapshots would break on every font hinting change across Chromium versions and would not tell you what went wrong. The committed `sample/` images are the visual regression record; a reviewer looks at the diff.

Both tiers use Node's built-in `node:test` runner. No test framework dependency.

## Packaging: tsx in development, compiled JS in the binary

- `npm run card` runs `tsx src/cli.ts` so development needs no build step.
- `npm run build` compiles `src/` to `dist/` with `tsconfig.build.json`, which excludes tests. The `bin` entry points at `dist/cli.js`, and the shebang on the first line of `cli.ts` survives compilation.
- Themes are TypeScript modules exporting CSS strings rather than `.css` or `.scss` files, so the build is a plain `tsc` with no asset copy or preprocessor step, and the compiled package resolves them the same way the source does. If a web app with its own bundler arrives, moving them to `.css` files is mechanical.
- `files` in `package.json` limits the published tarball to `dist/`, the README, and the licence notices. `prepublishOnly` guarantees a fresh build.
- Card output defaults to `out/` precisely because `dist/` is the compiled CLI.

## Running the core in the browser

`npm run sandbox` bundles the core into a single HTML page (`web/sandbox/`, built by `scripts/build-sandbox.ts`). It exists to prove that the pipeline is a rendering core with two hosts, and to give authors a fast preview. The build shows exactly where the core still leans on Node:

| Node dependency                                              | In the browser build                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `fonts.ts` reads WOFF2 files from disk                       | A virtual module carries the same `@font-face` CSS, generated at build time                                   |
| `highlight.ts` uses Shiki's full bundle and WASM             | `browser-highlight.ts` uses `createHighlighterCore` with the JavaScript regex engine and a fixed grammar list |
| `shiki`'s language and theme tables                          | Their dynamic imports are marked external so 200 grammars are not inlined                                     |
| `node:path` in `content.ts`, `node:process` in `branding.ts` | Two-line shims; these imports should move out of the core in a later refactor                                 |

In the page, the preview is the real card element, not a screenshot: `renderCard` produces the markup, the page installs the base and theme CSS, and the same `FIT_SCRIPT` string runs against the document. The card is scaled for display with a CSS transform, which is removed for the instant the fit loop measures so that `getBoundingClientRect` and `clientHeight` agree. Export uses `html-to-image` to rasterise the card element at 1x or 2x; it is handed the embedded font CSS directly so it does not scan cross-origin stylesheets. The page-level rules in `base.ts` (`body`, `@page`) are stripped before the card CSS joins a host page, which is a sign they belong in the document wrapper rather than the shared stylesheet.

A theme built in the sandbox's palette editor is expanded into the full variable contract with `color-mix` and can be copied out as a `src/themes/<name>.ts` module, so the path from experiment to committed theme is paste, rename, register.

## History: a dumb store behind two backends

The History panel needs the same behaviour whether the page is opened as a file, viewed as a claude.ai artifact, or served by `server/`. It gets that from one rule: **the server never renders or validates anything.** The browser has already produced a `Card`, highlighted it, and rasterised the PNG by the time anything is saved; the server's only job is to remember bytes it's handed.

That rule is what keeps the server dependency-free. `server/store.ts` writes one `<id>.json` (everything `openHistory` needs to restore the editor: source, format, layout and theme overrides, the custom palette if any, and the branding fields as typed — not the resolved `Branding`, so a blank field stays blank on reopen) and one `<id>.png` per entry under `<dataDir>/cards/`. `server/index.ts` is a hand-rolled router over `node:http`: a handful of routes don't need a framework, and it keeps the server free of any dependency the CLI doesn't already have.

The client (`web/sandbox/index.template.html`) doesn't know which backend it's talking to. `HistoryStore` pings `/api/health` once at startup; if that succeeds, `list`/`save`/`get`/`remove` call the JSON API and `imageUrl` points at `/api/cards/<id>/image`. If it fails — no server, e.g. a plain file open or the claude.ai artifact mirror — the same four functions read and write this browser's IndexedDB instead, and `imageUrl` returns an object URL for the stored `Blob`. Every call site above `HistoryStore` is identical either way. This is the same shape as `claude.use(name)` resolving `null` when a capability isn't available: detect once, branch inside the abstraction, never inside the UI code.

History is **append-only** by design: `openHistory` loads a record's source back into the editor, but exporting again always creates a new entry rather than updating the one that was opened. A feature called "history" that can silently overwrite itself is a footgun; if you want in-place revisions later, that's a deliberate new operation (`PUT /api/cards/:id`), not a change to what Export does.

## The Docker image

The image has two stages, and the split matters more than usual here: the **build** stage needs the full dependency tree (`shiki`, `@fontsource/*`, `esbuild`, `typescript`) to produce `out/sandbox.html` and compile the server, but the **runtime** stage needs neither those dependencies nor Playwright's browser — rendering happens in the visitor's browser, and the server only stores what it's sent. So the runtime stage copies exactly two things out of the build stage, `out/sandbox.html` and `dist-server/`, into a fresh `node:24-slim`, with no `npm ci` and no `node_modules` at all. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the build stage stops Playwright's postinstall from downloading Chromium for an image that will never launch a browser.

`SANDBOX_DATA_DIR` (default `/data`, declared as a `VOLUME`) is where cards live; mount it or history doesn't survive `docker rm`. `SANDBOX_HTML_PATH` and `PORT` are the other two knobs `server/index.ts` reads from the environment. The `HEALTHCHECK` calls `/api/health` with Node's own `fetch` rather than installing `curl`, so the final image stays exactly as minimal as the two-file copy above implies.

## Branding: one server default, read-only from the UI

`GET /api/branding` (`server/index.ts`) reads `CARD_*` env vars once, at server start, and hands the resolved `Branding` back to the client. That's the server's one shared default, and it's read-only by design: nothing the client does changes it.

Editing the Branding fields in the sandbox UI only ever writes to that browser's own `localStorage` (`scs:branding`). It's a personal override, invisible to every other visitor, and it disappears the moment that browser's storage is cleared. If you didn't set `CARD_*` env vars when the container was created, every visitor who wants their own branding has to fill in the form themselves; the server's default stays whatever it was (blank, if nothing was set) until the container is recreated with new env vars.

A UI action cannot make its values "part of the environment": a process's env vars are fixed at the moment it starts, nothing outside can mutate them afterward, and even if something could, the change wouldn't survive a restart. The equivalent that _would_ work — a `POST /api/branding` that writes a `branding.json` next to the cards on the `/data` volume, with `GET /api/branding` preferring that file over the env vars — was considered and deliberately not built. This server already has no authentication and no per-visitor isolation (see History, above); adding a write path here would mean any visitor can silently overwrite the shared default that every other visitor sees, with no way to tell who changed it or revert it short of editing the volume by hand. That's a bigger step than the read-only default it would replace, so it's parked until someone actually wants shared, UI-editable branding defaults badly enough to also want the access-control question that comes with it.

## Adding a theme

1. Create `src/themes/<name>.ts` exporting a `Theme`: `name`, `description`, `shikiTheme` (any Shiki bundled theme id), `fonts` (the `@fontsource` WOFF2 files the theme's `--font-*` families need) and `css` defining every token in the contract under `.theme-<name>`. The sandbox's custom palette editor can draft the CSS for you.
2. Register it in the array in `src/themes/index.ts`. `THEME_NAMES` and validation pick it up automatically.
3. Add an example under `examples/` that sets `theme: <name>`, run `npm run samples`, and add the image to the README gallery.
4. Add the name to the theme table in the README.

If the theme needs a structural tweak (hide the dot, show the traffic lights, change a font weight), scope it under `.theme-<name>` in the same file. If it needs a different arrangement of panels, that is a layout.

## Adding a layout

1. Add the name to `LAYOUTS` in `src/schema.ts` and a `LAYOUT_RULES` entry: panel count range, lines per panel, the font range the fit loop may use, and a `tokens` table with the layout's sizes. Lower the font range as panels get narrower.
2. If the panels are arranged differently from a vertical stack, add a `.layout-<name> .panels` rule to `src/themes/base.ts` (flex or grid). Sizes come from the tokens; keep colours and numbers out.
3. Add an example, regenerate samples, and extend the layout table in the README.
4. Add the example to the list in `src/render/render.test.ts` so CI proves it renders and fits.

A layout that needs new markup (a caption row, an output pane) also touches `renderCard` in `template.ts`. Keep the markup generic and let the layout class decide visibility.

## Gotchas

- **`__name is not defined` in `page.evaluate`.** See the fit loop section. Do not pass TypeScript functions that contain inner functions to `page.evaluate` under tsx; use a string or hoist to a file that is only ever run compiled.
- **Executable doesn't exist at …/chromium_headless_shell-NNNN.** Playwright and the installed Chromium revision disagree. Either `npm run browser:install` or set `CARD_BROWSER_PATH`.
- **`.env` is read from the current directory**, not the project root. Pass `--env <file>` when running from elsewhere.
- **Two inputs with the same base name** (`caching.md` and `caching.json`) would write the same PNG. The CLI refuses; render them separately or use `--out`.
- **Notes reduce code space.** Three bullets under a panel cost roughly 110 px, which is about four lines of code at 20 px. The fit loop will shrink the code to compensate and fail if it cannot.
- **Highlight lines and underlines are validated against the normalised code** (CRLF converted, trailing whitespace removed). Line numbers count from the first line of the fence, not the file.
