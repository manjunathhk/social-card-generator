# Social Card Generator

Generate 1080 × 1350 technical social cards from Markdown or JSON using TypeScript, Shiki, and Playwright. Includes an original off-white editorial layout with dark code panels and Manjunath HK branding.

## Quick start

Requires Node.js 22 or newer.

```sh
npm ci
npm run browser:install
npm run card -- examples/typescript-javascript.md
```

The command writes `dist/typescript-javascript.png` and a self-contained HTML preview. An optional second argument selects the output PNG path. Existing outputs are replaced only after input validation and layout checks pass.

On Linux, install Chromium system dependencies with `npx playwright install --with-deps chromium` if needed. Dependency and browser installation require internet access. Rendering then runs locally with embedded fonts and blocked network requests.

## Branding with .env

Copy `.env.sample` to `.env` in the project root and edit the values. In PowerShell:

```powershell
Copy-Item .env.sample .env
```

On macOS/Linux: `cp .env.sample .env`. Run the generator from the project root; it loads `.env` from the current working directory using Node's built-in environment-file support. No extra dependencies are required.

`CARD_AUTHOR`, `CARD_WEBSITE`, `CARD_SERIES`, `CARD_MONOGRAM`, `CARD_FOOTER_MARK`, and `CARD_ISSUE_LABEL` control the footer and header branding. The sample contains Manjunath HK's defaults. Missing or blank values fall back to those defaults; an absent `.env` is fine. Existing shell environment variables take precedence. Keep branding short enough to fit the fixed card layout. `.env` and local variants are ignored by Git; `.env.sample` is committed. Changes apply to newly generated cards, not existing PNG/HTML files.

Branding defaults use `MK` for `CARD_MONOGRAM`. `CARD_FOOTER_MARK` is optional: omitted, empty, or whitespace-only values omit the entire footer mark and its arrow. Set a nonblank value to display it. Existing `.env` values override defaults; update your local file if it still sets `MHK` or `M`.

## Independent panels

Markdown starts with YAML front matter, followed by one or two fenced code blocks. An optional `## Heading` before each fence supplies its panel label. Each fence supplies its own Shiki language ID, such as `typescript`, `javascript`, `csharp`, or `yaml`.

See [the TypeScript / JavaScript example](examples/typescript-javascript.md). Labels are arbitrary: use languages, implementation names, request/response, configuration/usage, or before/after. Neither panel is emphasized unless highlight lines are specified.

JSON can supply a `panels` array:

```json
{
  "title": "Same behaviour",
  "subtitle": "Type annotations disappear at runtime.",
  "tags": ["TypeScript", "JavaScript"],
  "panels": [
    { "label": "TypeScript", "language": "typescript", "code": "const count: number = 1;" },
    { "label": "JavaScript", "language": "javascript", "code": "const count = 1;", "highlightLines": [1] }
  ]
}
```

`highlightLines` is optional and uses one-based line numbers. For full control over line highlights, use JSON. Markdown derives panels from its headings and fences.

## Header fields

| Field | Required | Default / limit |
| --- | --- | --- |
| title | Yes | 70 characters |
| subtitle | Yes | 150 characters |
| tags | Yes | Up to 3 strings, 22 characters each; empty array allowed |
| highlight | No | Empty; 70 characters |
| insight | No | Empty; its space is reclaimed; 220 characters |
| issue | No | String `01`; 12 characters |
| filename | No | `Example`; fallback label for an unheaded fence |

Missing required fields, unsupported languages, invalid fences, and oversized content fail with an error and nonzero exit code. Previous files remain on failure. YAML values must have the expected types; quote numeric-looking issue values. Text is escaped and rendered literally, without inline Markdown or HTML interpretation.

## Compatibility

The original `language`, `code`, and `filename` JSON fields still produce one panel. The legacy `after` object still adds a second panel in the same language. Do not mix `after` and `panels`. The Redis and before/after examples demonstrate these older formats.

```sh
npm run card -- examples/redis-caching.json
npm run card -- examples/before-after.json
```

## Layout and customization

One panel supports up to 22 code lines; two panels support up to 14 lines each, subject to actual available space. Code starts at 20px and fits down to 16px. Both panels use the same final font size. The renderer fails instead of silently clipping oversized content. Character limits are ceilings, not guarantees that content fits.

- `src/styles.css`: palette, typography, spacing, and panel layout.
- `src/template.ts`: author, website, monogram, and HTML.
- `src/content.ts`: input formats and validation.
- `src/cli.ts`: rendering, font readiness, and overflow detection.

Inter and JetBrains Mono fonts are embedded from the installed packages. Their OFL licenses are included in those packages. Generated sample HTML contains embedded font assets; see `THIRD_PARTY_NOTICES.md`.

## Validation

```sh
npm run check
npm test
```

Tests cover JSON/Markdown compatibility, BOM handling, escaping, field limits, independent panel languages, optional insight, and highlight validation. All three supplied card examples were rendered and visually checked. Browser binaries and `node_modules` are not committed.

## Sample scope

The Redis snippets illustrate cache policies, not a standalone .NET app. They assume a Redis-backed `IDistributedCache`, application-provided data access, cancellation token, and relevant imports. TTL does not replace write invalidation or coordination of concurrent misses. Configure failure handling and serialization policy in the host application.

## License

MIT. See [LICENSE](LICENSE). Branding is editable; replace the author and website when generating cards for yourself.

## References

- [Shiki](https://shiki.style/guide/install)
- [Playwright screenshots](https://playwright.dev/docs/screenshots)
