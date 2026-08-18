import type { HSL } from './types';
import { hslToHex, rgbToHsl } from './helpers';
import { parseColor } from './parse';

/**
 * Suggestion search: given a color that fails a contrast requirement, find the
 * nearest variant that passes.
 *
 * Kept separate from the raw conversions in `helpers.ts` so the module graph
 * stays acyclic — this layer depends on parsing, and parsing depends on the
 * conversions.
 */

/**
 * Parse any supported color format into HSL.
 * @param color - a CSS color string
 * @returns the HSL representation, or `null` if the input is not a supported color
 */
export const toHsl = (color: string): HSL | null => {
  const rgb = parseColor(color);
  return rgb === null ? null : rgbToHsl(rgb);
};

/**
 * binarySearchContrast will run a binary search to find the closest accessible color provided a fixed color,
 * a starting color, and a direction to search in.
 * @param change - the color to change, with the lightness value set to the starting point.
 * @param fixed - the fixed color to use for the contrast ratio calculation.
 * @param direction - the direction to search in, either 'lighten' or 'darken'.
 * @param contrastFn - the contrast function to use to determine if a color is accessible.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 3:1.
 * @returns the closest accessible color to the starting point.
 */
export const binarySearchContrast = (
  change: HSL,
  fixed: HSL,
  direction: 'lighten' | 'darken',
  contrastFn: (c: string, f: string, l?: boolean) => boolean | null,
  large?: boolean
) => {
  const { l, ...hs } = change;

  let max = direction === 'lighten' ? 1 : l;
  let min = direction === 'lighten' ? l : 0;

  let minColor: string = hslToHex({ ...hs, l: min });
  let maxColor: string = hslToHex({ ...hs, l: max });
  const fixedHex = hslToHex(fixed);

  // If the contrast at the minimum or maximum is unacceptable, then it's not worth
  // the time to check.
  if (
    !contrastFn(direction === 'lighten' ? maxColor : minColor, fixedHex, large)
  ) {
    return null;
  }

  let prevMin: string | null = null;
  let prevMax: string | null = null;

  while (minColor !== prevMin || maxColor !== prevMax) {
    prevMin = minColor;
    prevMax = maxColor;

    const adjusted = (min + max) / 2;

    const stringified = hslToHex({ ...hs, l: adjusted });
    const contrasts = !!contrastFn(stringified, fixedHex, large);

    // Lightening walks `min` up toward the first compliant lightness; darkening
    // walks `max` down toward it. Either way the compliant bound keeps the
    // candidate we just built, so there is no need to recompute it.
    if ((direction === 'lighten') === contrasts) {
      max = adjusted;
      maxColor = stringified;
    } else {
      min = adjusted;
      minColor = stringified;
    }
  }

  return toHsl(direction === 'lighten' ? maxColor : minColor);
};

/**
 * suggestColorVariant will suggest a color variant that is accessible against a fixed color.
 * @param colorToChange - the color to change.
 * @param colorToKeep - the color to keep.
 * @param compareFn - the contrast function to use to determine if a color is accessible.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirements.
 * @returns the suggested color variant.
 */
export const suggestColorVariant = (
  colorToChange: string,
  colorToKeep: string,
  compareFn: (
    color1: string,
    color2: string,
    large?: boolean
  ) => boolean | null,
  large?: boolean
) => {
  const hslChange = toHsl(colorToChange);
  const hslKeep = toHsl(colorToKeep);
  if (!hslKeep || !hslChange) {
    return null;
  }
  if (compareFn(colorToChange, colorToKeep, large)) {
    return colorToChange;
  }
  const darker = binarySearchContrast(
    hslChange,
    hslKeep,
    'darken',
    compareFn,
    large
  );
  const lighter = binarySearchContrast(
    hslChange,
    hslKeep,
    'lighten',
    compareFn,
    large
  );
  if (darker !== null && lighter !== null) {
    const darkerDiff = Math.abs(hslChange.l - darker.l);
    const lighterDiff = Math.abs(hslChange.l - lighter.l);
    return hslToHex(darkerDiff < lighterDiff ? darker : lighter);
  }
  if (darker === null && lighter !== null) {
    return hslToHex(lighter);
  }
  if (lighter === null && darker !== null) {
    return hslToHex(darker);
  }
  return null;
};
