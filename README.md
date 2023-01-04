# accessible-colors

Utility functions for generating and interacting with colors based on WCAG 2.1 [minimum](https://www.w3.org/TR/WCAG21/#contrast-minimum) and [enhanced](https://www.w3.org/TR/WCAG21/#contrast-enhanced) contrast guidelines.

- [accessible-colors](#accessible-colors)
  - [Installation](#installation)
  - [Usage](#usage)
    - [`randomColor`](#randomcolor)
    - [`getLuminance`](#getluminance)
    - [`getContrast`](#getcontrast)
    - [`isContrasting`](#iscontrasting)
    - [`getRandomAAColor`](#getrandomaacolor)
    - [`getRandomAAAColor`](#getrandomaaacolor)
    - [`isAAContrast`](#isaacontrast)
    - [`isAAAContrast`](#isaaacontrast)
    - [`suggestAAColorVariant`](#suggestaacolorvariant)
    - [`suggestAAAColorVariant`](#suggestaaacolorvariant)

## Installation

```sh
npm i accessible-colors
```

Or

```sh
yarn add accessible-colors
```

## Usage

### `randomColor`

Generates a random color string in hex format e.g. `'#000000'`.

```ts
const color: string = randomColor();
```

### `getLuminance`

Retrieve the [luminance](https://www.w3.org/TR/WCAG20/#relativeluminancedef) of a specified hex color.

```ts
const luminance: number = getLuminance('#00FF33');
// 0.717590...
```

### `getContrast`

Retrieve the [contrast ratio](https://www.w3.org/TR/WCAG20/#contrast-ratiodef) between two colors with optional precision.

```ts
const contrastRatio: number = getContrast('#00FF33', '#FFFFFF'); // 1.368 contrast ratio
getContrast('#00FF33', '#616161'); // 4.528 contrast ratio
getContrast('#00FF33', '#000000', 4); // 15.3518 contrast ratio
```

### `isContrasting`

Determine if the provided colors are within the specified contrast ratio.

```ts
const isContrasting: boolean = isContrasting('#00FF33', '#FFFFFF', 1.3); // true - 1.368 contrast ratio
isContrasting('#00FF33', '#FFFFFF', 4.5); // false - 1.368 contrast ratio
```

### `getRandomAAColor`

Provided a color, randomly retrieves a color string in hex format that is at least WCAG AA compliant. This means a contrast ratio of at least 4.5 (or 3 for large text).

```ts
const color: string = getRandomAAColor('#00FF11');

// For large text (contrast ratio > 3)
getRandomAAColor('#00FF11', true);
```

### `getRandomAAAColor`

Provided a color, randomly retrieves a color string in hex format that is at least WCAG AA compliant. This means a contrast ratio of at least 7 (or 4.5 for large text).

```ts
const color: string = getRandomAAColor('#00FF11');

// For large text (contrast ratio > 4.5)
getRandomAAColor('#00FF11', true);
```

### `isAAContrast`

Provided two colors, and an optional `large` boolean, will determine if the provided colors satisfy the WCAG AA compliance contrast ratio.

```ts
const isCompliant: boolean = isAAContrast('#00FF33', '#FFFFFF'); // false - 1.368 contrast ratio
isAAContrast('#00FF33', '#616161'); // true - 4.528 contrast ratio
isAAContrast('#00FF33', '#617765', true); // true - 3.541 contrast ratio with large text
```

### `isAAAContrast`

Provided two colors, and an optional `large` boolean, will determine if the provided colors satisfy the WCAG AAA compliance contrast ratio.

```ts
const isCompliant: boolean = isAAAContrast('#00FF33', '#613365'); // true - 7.075 contrast ratio
isAAAContrast('#00FF33', '#616161'); // false - 4.528 contrast ratio
isAAAContrast('#00FF33', '#616161', true); // true - 4.528 contrast ratio with large text
```

### `suggestAAColorVariant`

Given two color variants: one to change `colorToChange`, and one to keep `colorToKeep`, the function will suggest the nearest WCAG AA compliant variant to the `colorToChange`, with respect to the `colorToKeep`.

It does this by lightening and darkening the `colorToChange` via binary searching relative contrasting lightness, and then taking either the lighter or darker value based on whichever is closer to the original.

```ts
const suggestion: string = suggestAAColorVariant('#00FF33', '#FFFFFF'); // #008a1c
getContrast('#FFFFFF', '#008a1c'); // 4.514
suggestAAColorVariant('#00FF33', '#FFFFFF', true); // large text - #00ac22
getContrast('#FFFFFF', '#00ac22'); // 3.033
```

### `suggestAAAColorVariant`

Similar to [suggestAAColorVariant](#suggestaacolorvariant), but using WCAG AAA standards of >= 7 contrast ratio (or >= 4.5 contrast ratio for large text).

```ts
const suggestion: string = suggestAAColorVariant('#00FF33', '#FFFFFF'); // #008a1c
getContrast('#FFFFFF', '#008a1c'); // 4.514
suggestAAColorVariant('#00FF33', '#FFFFFF', true); // large text - #00ac22
getContrast('#FFFFFF', '#00ac22'); // 3.033
```
