# Contributing

Thanks for your interest in the project. This is a small, dependency-free
library and the bar for changes is correspondingly specific — please read the
constraints below before opening a PR.

## Setup

```sh
npm ci
npm test
```

There is no build step required for development. `npm run build-production`
produces the published artifacts.

## Scripts

| Script | Purpose |
|---|---|
| `npm test` | Run the test suite |
| `npm test -- --coverage` | Run with coverage; thresholds are enforced |
| `npm run lint` | ESLint with `--fix` |
| `npm run lint:ci` | ESLint without `--fix` — what CI runs |
| `npm run format` | Prettier |
| `npm run build` | Development build |
| `npm run build-production` | Minified build with source maps |
| `npm run size` | Bundle size budget and tree-shaking check |
| `npm run check-manifest` | Assert the tarball contains what we expect |

## Constraints

These are not style preferences; they are the product.

**Zero runtime dependencies.** The package has none and will not gain any. Dev
dependencies are fine.

**The bundle size budget is enforced.** `npm run size` fails the build above
2560 B gzip. Size is a core part of the pitch — roughly 2.3 KB against colord's
2.1 KB, color2k's 2.9 KB and chroma-js's 16.5 KB, with zero dependencies. If a
change needs the budget raised, say so explicitly in the PR and explain what the
extra bytes buy. Do not raise it quietly. The budget has been raised once, in
1.2.0, to accept CSS color format parsing; the reasoning is recorded in
`scripts/size.js`.

**Never report a false pass.** This is the one rule that matters most. A
function that cannot determine an answer must return `null`, never `true`. The
library's entire value is that its verdicts can be trusted, and a wrong `true`
ships an inaccessible interface with a clean bill of health. Every code path
that produces a boolean verdict needs a test proving it returns `null` rather
than a verdict for input it did not understand.

**Threshold comparisons use exact ratios.** Rounding is for display only.
Comparing a rounded ratio against a threshold lets a pair at 4.4996 pass as AA.

**Document standards precisely.** When adding a check tied to a WCAG success
criterion, name the criterion and link the specification. Do not imply coverage
the implementation does not have.

## Testing

Coverage thresholds are enforced in CI (90% branches, 95% lines, 100%
functions). They ratchet upward — raise them when coverage rises, never lower
them to make a change pass.

New behavior needs tests. Bug fixes need a regression test that fails before the
fix and passes after; where a defect was measured, put the measurement in the
test as a comment so the next reader knows what the number means.

README examples are verified by `src/__tests__/readme.test.ts`. If you change
documented output, update that test — it exists because two README sections
once documented the wrong function entirely.

## Releases

Releases are automated and run from CI, not from a developer machine.

1. Update `CHANGELOG.md` under a new version heading.
2. Bump the version in `package.json`.
3. Commit, then tag `vX.Y.Z` and push the tag.

The release workflow reruns lint, tests, build, size and manifest checks,
verifies the tag matches `package.json`, and publishes with npm provenance.
Do not run `npm publish` locally.

## Dependency updates

Dependabot opens one grouped PR per week for dev dependencies, majors included.
This package has zero runtime dependencies, so the whole tree is tooling and it
is easier to review and land as a single change.

There is one `overrides` entry, for `esbuild`. tsup 8.5.1 depends on
`esbuild: ^0.27.0`, but GHSA-g7r4-m6w7-qqqr affects 0.27.3-0.28.0 and is only
fixed in 0.28.1+, which is outside that range. The override forces 0.28.2. It is
verified working — build succeeds, bundle output is byte-identical, and the
linked consumer in `../accessible-colors-test` passes — but it does sit outside
tsup's declared range, so remove it once tsup bumps its esbuild dependency.

Note the distinction from the three overrides removed in 1.1.0: those pinned
*backwards* to versions that had themselves become vulnerable and were never
revisited. This one pins *forwards* to a patched version and carries a stated
removal condition.

TypeScript major updates are ignored in `.github/dependabot.yml`. This is a hard
block rather than a preference: `typescript-eslint` 8.x declares
`typescript: >=4.8.4 <6.1.0`, so installing TS 6 or 7 breaks linting. Remove the
ignore entry once typescript-eslint ships TS 7 support.

## Decisions on record

**Source maps ship in the tarball.** They account for roughly two thirds of the
unpacked package. This was considered and kept deliberately: for a library whose
correctness is the entire product, letting a consumer step into readable source
while debugging a contrast result is worth more than the disk space. The
compressed tarball is small enough that install time is not a real constraint.
Revisit only if there is evidence anyone is affected by the size.

**HSL channels use the 0-1 range.** All three channels, not the CSS convention
of 0-360 and 0-100%. Changing this would be a breaking change to every
conversion helper; it is documented prominently instead.
