import { parseColor } from './parse';
import { rgbToHex } from './helpers';
import {
  deltaEOK,
  gamutMapChroma,
  oklabToOklch,
  oklabToRgb,
  rgbToOklab,
  type OKLCH,
} from './oklch';

/**
 * Suggestion search: given a color that fails a contrast requirement, find the
 * nearest variant that passes.
 *
 * Kept separate from the raw conversions in `helpers.ts` so the module graph
 * stays acyclic — this layer depends on parsing, and parsing depends on the
 * conversions.
 *
 * The search walks OKLCH lightness rather than HSL lightness. HSL lightness is
 * not perceptually uniform: darkening a saturated yellow by a fixed HSL step
 * shifts it toward olive/brown, and pushing lightness toward either extreme
 * compresses achievable chroma, washing the color out. OKLCH is designed so
 * that equal steps in `L` correspond to roughly equal perceived change, which
 * keeps hue and saturation visually stable across the search.
 */

/**
 * binarySearchContrast finds the nearest lightness, in OKLCH, at which `change`
 * meets `contrastFn` against `fixed`, holding chroma and hue fixed except for
 * gamut mapping.
 *
 * @param change - the OKLCH color to change, with `L` set to the starting point.
 * @param fixed - the fixed color to hold contrast against, as a color string in
 *   any supported format — passed through to `contrastFn` unmodified.
 * @param direction - the direction to search in, either 'lighten' or 'darken'.
 * @param contrastFn - the contrast function used to determine compliance.
 * @param large - whether to use the large-text contrast requirement.
 * @returns the nearest compliant OKLCH color, or `null` if the extreme in
 *   `direction` does not comply either.
 */
export const binarySearchContrast = (
  change: OKLCH,
  fixed: string,
  direction: 'lighten' | 'darken',
  contrastFn: (c: string, f: string, l?: boolean) => boolean | null,
  large?: boolean
): OKLCH | null => {
  const { C, H } = change;

  let max = direction === 'lighten' ? 1 : change.L;
  let min = direction === 'lighten' ? change.L : 0;

  const toHex = (L: number) => rgbToHex(oklabToRgb(gamutMapChroma(L, C, H)));

  let minColor = toHex(min);
  let maxColor = toHex(max);

  // If the contrast at the minimum or maximum is unacceptable, then it's not
  // worth the time to search.
  if (!contrastFn(direction === 'lighten' ? maxColor : minColor, fixed, large)) {
    return null;
  }

  let prevMin: string | null = null;
  let prevMax: string | null = null;

  while (minColor !== prevMin || maxColor !== prevMax) {
    prevMin = minColor;
    prevMax = maxColor;

    const adjusted = (min + max) / 2;
    const stringified = toHex(adjusted);
    const contrasts = !!contrastFn(stringified, fixed, large);

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

  return { L: direction === 'lighten' ? max : min, C, H };
};

/**
 * suggestColorVariant will suggest a color variant that is accessible against a fixed color.
 * @param colorToChange - the color to change.
 * @param colorToKeep - the color to keep.
 * @param compareFn - the contrast function to use to determine if a color is accessible.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirements.
 * @returns the suggested color variant, `colorToChange` unmodified if it already
 *   complies, or `null` if no compliant variant exists in either direction.
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
): string | null => {
  const rgbChange = parseColor(colorToChange);
  const rgbKeep = parseColor(colorToKeep);
  if (rgbChange === null || rgbKeep === null) {
    return null;
  }
  if (compareFn(colorToChange, colorToKeep, large)) {
    return colorToChange;
  }

  const oklabChange = rgbToOklab(rgbChange);
  const oklchChange = oklabToOklch(oklabChange);

  const darker = binarySearchContrast(
    oklchChange,
    colorToKeep,
    'darken',
    compareFn,
    large
  );
  const lighter = binarySearchContrast(
    oklchChange,
    colorToKeep,
    'lighten',
    compareFn,
    large
  );

  // Must gamut-map the same way the search loop did (gamutMapChroma), not a
  // raw OKLCH->OKLab conversion. The loop verifies compliance against
  // gamut-mapped candidates; converting the un-mapped {L, C, H} here would
  // return a different, unverified color whenever the original chroma was
  // out of gamut at the found lightness.
  const toOklab = (found: OKLCH) => gamutMapChroma(found.L, found.C, found.H);
  const toHex = (found: OKLCH) => rgbToHex(oklabToRgb(toOklab(found)));

  if (darker !== null && lighter !== null) {
    // ΔE OK — Euclidean distance in OKLab — approximates perceived difference.
    // Unlike the HSL lightness gap this replaces, it accounts for hue and
    // chroma shift as well as lightness, so "nearest" means "closest looking".
    const darkerDist = deltaEOK(oklabChange, toOklab(darker));
    const lighterDist = deltaEOK(oklabChange, toOklab(lighter));
    return toHex(darkerDist < lighterDist ? darker : lighter);
  }
  if (darker === null && lighter !== null) {
    return toHex(lighter);
  }
  if (lighter === null && darker !== null) {
    return toHex(darker);
  }
  return null;
};
