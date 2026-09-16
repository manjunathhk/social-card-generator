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

CI runs the same steps on Ubuntu with Node 24. If `npm run samples` changed any image in `sample/`, commit the new images; the gallery in the README is the visual regression record.

CI also runs a `version-check` job on every PR (see "Releasing" below) and the PR description is expected to follow `.github/pull_request_template.md`.

## Commit messages

No tooling parses these — write clear, conventional messages (`fix:`, `feat:`, `chore:`, ...) because they're what a human reads in `git log` and PR titles, not because anything derives a version from them.

## Releasing

There is no automated version _inference_ — nothing reads commit messages or diffs to decide the bump size or writes it for you. `version` in `package.json` and `CHANGELOG.md` stay hand-edited, by you, in the PR itself. (This project tried commit-driven auto-versioning once, via semantic-release; it mis-fired twice and got reverted — see the 2.1.0/2.1.1 entries in `CHANGELOG.md`. What follows is deliberately simpler: a human or agent decides the bump, CI only checks that one happened.)

1. Bump `version` in `package.json` yourself in the same PR (semver: patch for fixes, minor for features, major for breaking changes) whenever the change warrants a release.
2. Add a `CHANGELOG.md` entry for it.
3. CI's `version-check` job fails the PR if `package.json`'s version is unchanged from `main`. If the PR genuinely ships nothing release-worthy (docs, CI config, test-only changes), apply the `no-version-bump` label instead of bumping — don't bump just to satisfy the check.
4. Once the PR merges to `main`, the `publish` job in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) reads `package.json`'s version and tags the Docker image with it (plus `:latest` and `:<git-sha>`, always). A merge under the `no-version-bump` label just republishes `:latest`/`:<git-sha>` under the previous version tag.
5. Optionally tag the release commit for a GitHub Release: `git tag vX.Y.Z && git push origin vX.Y.Z`.

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
