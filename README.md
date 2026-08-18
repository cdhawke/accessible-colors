# accessible-colors

[![npm version](https://img.shields.io/npm/v/accessible-colors.svg)](https://www.npmjs.com/package/accessible-colors)
[![downloads](https://img.shields.io/npm/dm/accessible-colors.svg)](https://www.npmjs.com/package/accessible-colors)
[![bundle size](https://img.shields.io/bundlephobia/minzip/accessible-colors)](https://bundlephobia.com/package/accessible-colors)
[![CI](https://github.com/cdhawke/accessible-colors/actions/workflows/ci.yml/badge.svg)](https://github.com/cdhawke/accessible-colors/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/accessible-colors.svg)](./LICENSE)

**Most contrast libraries tell you a color pair fails. This one tells you what to use instead.**

Utility functions for generating and interacting with colors based on WCAG 2.1
[minimum](https://www.w3.org/TR/WCAG21/#contrast-minimum),
[enhanced](https://www.w3.org/TR/WCAG21/#contrast-enhanced), and
[non-text](https://www.w3.org/TR/WCAG21/#non-text-contrast) contrast guidelines.

- **~1.7 KB gzipped**, zero runtime dependencies, fully tree-shakeable
- **Suggests the nearest compliant color**, not just a pass/fail verdict
- **Returns `null` for input it cannot parse** — never a false "accessible"

```ts
import { suggestAAColorVariant, getContrast } from 'accessible-colors';

suggestAAColorVariant('#00FF33', '#FFFFFF'); // '#008a1c'
getContrast('#008a1c', '#FFFFFF'); // 4.514 — now AA compliant
```

## Contents

- [Installation](#installation)
- [Checking contrast](#checking-contrast)
  - [`getContrast`](#getcontrast)
  - [`getLuminance`](#getluminance)
  - [`isContrasting`](#iscontrasting)
  - [`isAAContrast`](#isaacontrast)
  - [`isAAAContrast`](#isaaacontrast)
  - [`isNonTextContrast`](#isnontextcontrast)
  - [`getContrastLevel`](#getcontrastlevel)
  - [`getContrastReport`](#getcontrastreport)
- [Fixing contrast](#fixing-contrast)
  - [`suggestAAColorVariant`](#suggestaacolorvariant)
  - [`suggestAAAColorVariant`](#suggestaaacolorvariant)
- [Generating colors](#generating-colors)
  - [`randomColor`](#randomcolor)
  - [`getRandomAAColor`](#getrandomaacolor)
  - [`getRandomAAAColor`](#getrandomaaacolor)
- [Conversions](#conversions)
- [WCAG 2.1 coverage](#wcag-21-coverage)
- [Accepted color formats](#accepted-color-formats)

## Installation

```sh
npm i accessible-colors
```

Or

```sh
yarn add accessible-colors
```

## Checking contrast

> Every function in this section returns `null` when a color cannot be parsed.
> A `null` means "unknown", never "accessible" — check for it before treating a
> result as a pass.

### `getContrast`

Retrieve the [contrast ratio](https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio)
between two colors, with optional precision.

```ts
const contrastRatio: number | null = getContrast('#00FF33', '#FFFFFF'); // 1.368
getContrast('#00FF33', '#616161'); // 4.528
getContrast('#00FF33', '#000000', 4); // 15.3518
getContrast('#00FF33', 'not-a-color'); // null
```

Note that the rounding applied here is for display only. Threshold checks such
as `isAAContrast` compare against the exact ratio, so a pair at 4.4996 is
correctly reported as failing AA even though `getContrast` renders it as `4.5`.

### `getLuminance`

Retrieve the [relative luminance](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)
of a color, between 0 and 1.

```ts
const luminance: number | null = getLuminance('#00FF33'); // 0.717590...
getLuminance('#fff'); // 1
getLuminance('#gggggg'); // null
```

### `isContrasting`

Determine whether two colors meet an arbitrary contrast ratio.

```ts
const result: boolean | null = isContrasting('#00FF33', '#FFFFFF', 1.3); // true
isContrasting('#00FF33', '#FFFFFF', 4.5); // false — 1.368 ratio
```

### `isAAContrast`

Whether two colors satisfy WCAG AA: 4.5:1 for normal text, or 3:1 when `large`
is `true`. Large text is at least 18.66px bold or 24px regular.

```ts
const isCompliant: boolean | null = isAAContrast('#00FF33', '#FFFFFF'); // false — 1.368
isAAContrast('#00FF33', '#616161'); // true — 4.528
isAAContrast('#00FF33', '#617765', true); // true — 3.541 as large text
```

### `isAAAContrast`

Whether two colors satisfy WCAG AAA: 7:1 for normal text, or 4.5:1 when `large`
is `true`.

```ts
const isCompliant: boolean | null = isAAAContrast('#00FF33', '#613365'); // true — 7.075
isAAAContrast('#00FF33', '#616161'); // false — 4.528
isAAAContrast('#00FF33', '#616161', true); // true — 4.528 as large text
```

### `isNonTextContrast`

Whether two colors satisfy [WCAG 2.1 SC 1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG21/#non-text-contrast),
which requires 3:1 for UI component boundaries, focus indicators, and graphical
objects needed to understand content.

```ts
const ok: boolean | null = isNonTextContrast('#949494', '#FFFFFF'); // true — 3.033
isNonTextContrast('#a0a0a0', '#FFFFFF'); // false — 2.615
```

This is the same threshold as large text, but naming it separately keeps it
clear which success criterion a check is actually satisfying.

### `getContrastLevel`

The highest level a pair achieves, rather than a pass/fail against one
threshold. Accepts a content type of `'normal'` (default), `'large'`, or
`'non-text'`.

```ts
const level: 'AAA' | 'AA' | 'fail' | null = getContrastLevel('#000000', '#FFFFFF'); // 'AAA'
getContrastLevel('#767676', '#FFFFFF'); // 'AA'   — 4.542
getContrastLevel('#949494', '#FFFFFF'); // 'fail' — 3.033
getContrastLevel('#949494', '#FFFFFF', 'large'); // 'AA'
```

SC 1.4.11 defines no enhanced level, so `'non-text'` returns `'AA'` or
`'fail'` only.

### `getContrastReport`

Every WCAG 2.1 verdict for a pair in one call — the integration point for
linters, CI gates and design-system dashboards.

```ts
getContrastReport('#767676', '#FFFFFF');
// {
//   ratio: 4.542,
//   normal:  { aa: true,  aaa: false },
//   large:   { aa: true,  aaa: true  },
//   nonText: { passes: true },
//   level: 'AA'
// }
```

## Fixing contrast

### `suggestAAColorVariant`

Given a color to change and a color to keep, returns the nearest WCAG AA
compliant variant of the first, relative to the second.

It lightens and darkens `colorToChange` by binary-searching for the contrasting
lightness in each direction, then returns whichever result is closer to the
original. If the color already complies, it is returned unchanged.

```ts
const suggestion: string | null = suggestAAColorVariant('#00FF33', '#FFFFFF'); // '#008a1c'
getContrast('#008a1c', '#FFFFFF'); // 4.514

suggestAAColorVariant('#00FF33', '#FFFFFF', true); // large text — '#00ac22'
getContrast('#00ac22', '#FFFFFF'); // 3.033
```

### `suggestAAAColorVariant`

The same, against WCAG AAA thresholds — 7:1, or 4.5:1 for large text.

```ts
const suggestion: string | null = suggestAAAColorVariant('#00FF33', '#FFFFFF'); // '#006815'
getContrast('#006815', '#FFFFFF'); // 7.021

suggestAAAColorVariant('#00FF33', '#FFFFFF', true); // large text — '#008a1c'
getContrast('#008a1c', '#FFFFFF'); // 4.514
```

Returns `null` when no compliant variant exists in either direction.

## Generating colors

### `randomColor`

A random color in hex format.

```ts
const color: string = randomColor(); // '#3f8ab2'
```

### `getRandomAAColor`

A random color meeting WCAG AA against the given background — 4.5:1, or 3:1
when `large` is `true`.

```ts
const color: string | null = getRandomAAColor('#00FF11');
getRandomAAColor('#00FF11', true); // large text
```

Pass a `random` function to make the result reproducible:

```ts
getRandomAAColor('#FFFFFF', false, { random: seededRng });
```

Returns `null` only when no color can satisfy the ratio — for example AAA
against a mid grey, which would require a luminance above 1 or below 0. This is
determined arithmetically, not by sampling.

### `getRandomAAAColor`

A random color meeting WCAG AAA against the given background — 7:1, or 4.5:1
when `large` is `true`.

```ts
const color: string | null = getRandomAAAColor('#00FF11');
getRandomAAAColor('#00FF11', true); // large text — 4.5:1
```

## Conversions

The conversion helpers used internally are exported for direct use:

```ts
import { hexToRgb, rgbToHex, hexToHsl, hslToHex, rgbToHsl, hslToRgb } from 'accessible-colors';

hexToRgb('#aabbcc'); // { r: 170, g: 187, b: 204 }
hexToRgb('#abc'); // { r: 170, g: 187, b: 204 }
hexToRgb('nope'); // null

rgbToHex({ r: 170, g: 187, b: 204 }); // '#aabbcc'
hexToHsl('#aabbcc'); // { h: 0.5833..., s: 0.25, l: 0.7333... }
```

| Function | Signature |
|---|---|
| `hexToRgb` | `(hex: string) => RGB \| null` |
| `rgbToHex` | `(rgb: RGB) => string` |
| `hexToHsl` | `(hex: string) => HSL \| null` |
| `hslToHex` | `(hsl: HSL) => string` |
| `rgbToHsl` | `(rgb: RGB) => HSL` |
| `hslToRgb` | `(hsl: HSL) => RGB` |

> **HSL channels are 0–1, not CSS units.** `h`, `s` and `l` are all in the range
> `[0, 1]` — not `0–360` for hue and `0–100%` for saturation and lightness. Divide
> CSS values before passing them in.

`hexToRgb` and `hexToHsl` return `null` for input that is not a valid hex color.
The `RGB` and `HSL` types are exported for use in your own signatures.

## WCAG 2.1 coverage

| Success criterion | Requirement | API |
|---|---|---|
| [1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum) | 4.5:1 text, 3:1 large | `isAAContrast` |
| [1.4.6 Contrast (Enhanced)](https://www.w3.org/TR/WCAG21/#contrast-enhanced) | 7:1 text, 4.5:1 large | `isAAAContrast` |
| [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG21/#non-text-contrast) | 3:1 UI and graphics | `isNonTextContrast` |
| [1.4.1 Use of Color](https://www.w3.org/TR/WCAG21/#use-of-color) | not colour alone | not covered |

Contrast ratios follow the [WCAG relative luminance definition](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
APCA / WCAG 3 is not currently supported.

## Accepted color formats

Colors are supplied as hex strings, with or without a leading `#`, in any of:

| Form | Example | Notes |
|---|---|---|
| `RGB` | `#abc` | Expanded to `#aabbcc` |
| `RGBA` | `#abcd` | Alpha parsed, then discarded |
| `RRGGBB` | `#aabbcc` | |
| `RRGGBBAA` | `#aabbccdd` | Alpha parsed, then discarded |

Input is case-insensitive and surrounding whitespace is trimmed.

Alpha is validated but not applied: WCAG contrast is undefined for a
translucent color without a known backdrop, so composite before measuring
rather than relying on the library to guess. Other CSS formats — `rgb()`,
`hsl()`, `oklch()`, named colors — are not yet supported and return `null`.

## License

[MIT](./LICENSE)
