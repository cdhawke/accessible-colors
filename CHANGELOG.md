# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0]

### Changed

- **`suggestAAColorVariant` and `suggestAAAColorVariant` now search in OKLCH
  instead of HSL.** HSL lightness is not perceptually uniform - holding hue and
  saturation fixed in HSL while adjusting lightness does not hold *perceived*
  hue and saturation fixed, so a compliant suggestion could read as a
  noticeably different color from the one it started from. OKLCH is designed
  so that equal steps in lightness correspond to roughly equal perceived
  change.

  Measured rather than assumed: across 5,000 random pairs, mean perceptual
  distance (delta E OK) between the original color and its suggestion fell
  about 1.7%, with the new algorithm picking a strictly closer-looking
  candidate in 68% of pairs where the two disagree. On saturated inputs
  specifically - the scenario motivating this change - mean hue drift across a
  sample of vivid hues dropped from 0.7 degrees to 0.1 degrees.

  The nearest-candidate tie-break (choosing between a lighter and a darker
  compliant variant) now uses delta E OK, a real perceptual distance, in place
  of raw HSL lightness difference.

  Public signatures are unchanged. Output hex values will differ from 1.2.0 in
  many cases - this is an intentional quality improvement, not a regression;
  snapshot tests capturing exact suggestion output will need updating.

- Bundle size is now ~3.0 KB gzip, up from ~2.3 KB, for the OKLab/OKLCH
  conversion and gamut-mapping math. The size budget was raised from 2560 to
  3200 B; the reasoning is recorded in `scripts/size.js`. This gives up the
  size lead over color2k (2.9 KB) - deliberate, since no competitor in this
  size class suggests a fix at all, and that remains the differentiator worth
  protecting.

### Notes

`getRandomAAColor` / `getRandomAAAColor` also moved to the same OKLCH search
internally, for the same reason and to avoid maintaining two divergent
implementations of the same algorithm. Their documented behavior - always
return a compliant color when one exists, `null` only when provably
impossible - is unchanged and re-verified.

## [1.2.0]

### Added

- **`rgb()` and `hsl()` input.** Every function that takes a color now accepts
  `rgb()`/`rgba()` and `hsl()`/`hsla()` alongside hex, in both the legacy comma
  syntax and the modern space syntax, with percentage or numeric channels and
  all four CSS angle units. Hex-only input was the largest barrier to using this
  library: `getComputedStyle` returns `rgb()` regardless of how a color was
  authored, so checking contrast against what a browser actually rendered
  previously required writing a converter first.

  ```ts
  const styles = getComputedStyle(element);
  getContrastLevel(styles.color, styles.backgroundColor); // 'AA'
  ```

- `parseColor(color)` — exported for callers who want RGB channels directly.

### Changed

- Bundle size is now ~2.3 KB gzip, up from ~1.7 KB, for the parsing above. The
  size budget was raised from 2048 to 2560 B deliberately; the reasoning is
  recorded in `scripts/size.js`.
- Package description updated to mention the supported formats.

### Notes

Purely additive — hex behaves exactly as before and no public signature
changed. Formats that are still unsupported (named colors, `oklch()`, `lab()`,
`color()`, `currentColor`) return `null` rather than a guess.

## [1.1.0]

This release fixes three defects that caused the library to report **false WCAG
compliance** — returning `true` for color pairs that do not meet the standard.
If you are using any version at or below 1.0.9 to make accessibility decisions,
upgrade.

### Fixed

- **Invalid input reported as compliant.** `hexToRgb` performed no validation,
  so any unparseable value became pure black via `NaN` coercion — and black
  contrasts well against most colors. `isAAContrast('#gggggg', '#ffffff')`
  returned `true`. Unparseable input now yields `null` everywhere.
- **Shorthand hex silently mis-parsed.** `#fff` was read as the integer `0xfff`
  rather than white, giving a luminance of 0.0756 instead of 1. As a result
  `isAAContrast('#fff', '#000')` returned `false` — the library rejected black
  on white. Shorthand (`#abc`), shorthand with alpha (`#abcd`), and 8-digit
  (`#aabbccdd`) forms now parse correctly.
- **Sub-threshold ratios rounded up into a pass.** Threshold checks compared the
  3-decimal-rounded ratio, so a pair at 4.4996 rounded to 4.5 and was reported
  as meeting AA. Measured 27 such pairs in 300,000 random samples. Comparisons
  now use the exact ratio; rounding applies only to `getContrast`'s display
  output.
- **`suggestAAColorVariant` and `suggestAAAColorVariant` returned non-compliant
  colors.** The same rounding fault reached the suggestion search, which
  terminated as soon as the rounded ratio hit the threshold — so it would accept
  a candidate at 4.4996 as meeting 4.5. Measured against the published 1.0.9
  build across 20,000 random pairs, **2.19% of AA suggestions and 1.43% of AAA
  suggestions were actually below their threshold**. Since the whole point of
  these functions is to hand back a color that passes, this was the most
  consequential form of the defect. Now zero.
- **`getRandomAAColor` failed when valid colors existed.** Uniform rejection
  sampling capped at 1000 attempts returned `null` roughly 76% of the time for
  `#777777`, where only 0.04% of RGB space meets AA. Both generators now solve
  for the admissible luminance band directly — a compliant color is always found
  when one exists, and impossible cases return `null` immediately rather than
  after exhausting the sample budget.
- **Broken `bin` field.** `package.json` declared `scripts/bin.js`, which did
  not exist and was excluded from the tarball regardless, producing a dangling
  executable link on install. Removed until a real CLI ships.

### Added

- `isNonTextContrast` — WCAG 2.1 SC 1.4.11, the 3:1 requirement for UI component
  boundaries, focus indicators and graphical objects.
- `getContrastLevel(a, b, content?)` — the highest level a pair achieves
  (`'AAA' | 'AA' | 'fail'`) for `'normal'`, `'large'` or `'non-text'` content.
- `getContrastReport(a, b, precision?)` — every WCAG 2.1 verdict for a pair in
  one call, for audit tooling, linters and dashboards.
- The six conversion helpers are now exported: `hexToRgb`, `rgbToHex`,
  `hexToHsl`, `hslToHex`, `rgbToHsl`, `hslToRgb`, along with the `RGB` and `HSL`
  types. They were already implemented and bundled, just unreachable.
- Optional `random` injection on `getRandomAAColor` / `getRandomAAAColor`, so
  output can be seeded for snapshot tests and SSR.
- `sideEffects: false` for reliable tree-shaking, `engines.node >= 18`, and a CI
  size budget.

### Changed

- `hexToRgb` and `hexToHsl` now return `T | null` instead of a non-nullable type
  that never reflected reality.
- Contrast against the same pair may now differ from 1.0.9 where the old result
  was wrong. Shorthand hex, previously mis-parsed, now produces correct values.

### Migration

Public signatures are unchanged apart from widened return types, but **results
change where they were previously incorrect**:

- Code passing shorthand hex (`#fff`) receives correct values now. Snapshot
  tests capturing the old wrong numbers will need updating.
- Code that relied on invalid input silently behaving as black now receives
  `null`. Check for `null` before treating a result as a pass — a `null` means
  "unknown", never "accessible".
- `hexToRgb` / `hexToHsl` consumers under `strict` will need a null check.

## [1.0.9]

See git history for releases at or before 1.0.9; this changelog begins at 1.1.0.

[Unreleased]: https://github.com/cdhawke/accessible-colors/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/cdhawke/accessible-colors/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/cdhawke/accessible-colors/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/cdhawke/accessible-colors/compare/v1.0.9...v1.1.0
[1.0.9]: https://github.com/cdhawke/accessible-colors/releases/tag/v1.0.9
