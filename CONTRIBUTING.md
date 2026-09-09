# Contributing

Thanks for taking a look. This is a small, focused tool; the bar for changes is "keeps the pipeline simple and the output deterministic".

## Setup

```sh
npm ci
npm run browser:install   # or export CARD_BROWSER_PATH=/path/to/chromium
```

## Before you open a pull request

```sh
npm run format
npm run check
npm test
npm run test:render
npm run samples           # if your change affects rendering
```

CI runs the same steps on Ubuntu with Node 22. If `npm run samples` changed any image in `sample/`, commit the new images; the gallery in the README is the visual regression record.

## Conventions

- **TypeScript, strict, no unused symbols.** The config enforces it.
- **Prettier decides formatting.** Do not argue with it in review.
- **One statement per line.** Readability over cleverness; a reviewer should understand a module in a single pass.
- **Errors name the field.** Anything that rejects user input must say which field (`panels[1].underline`) and what was expected.
- **No network at render time.** Every asset is inlined. Tests assert there are no external URLs in the document.
- **Tests without a browser stay fast.** Parser, validation and template tests must not launch Chromium. Anything that needs Chromium goes in `src/render/`.

## Adding a theme or layout

The steps are documented in [docs/TECHNIQUES.md](docs/TECHNIQUES.md) under "Adding a theme" and "Adding a layout". Add an example card under `examples/`, a sample under `sample/`, a row in the README gallery, and a case in `src/render/render.test.ts`.

## Reporting a card that will not fit

Run with `--html`, open the HTML next to the PNG in a browser at 1080 px wide, and include it with the issue along with the source file. The overflow message names the panel; the HTML shows why.
