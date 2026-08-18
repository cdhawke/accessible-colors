import {
  binarySearchContrast,
  hexToHsl,
  hexToRgb,
  hslToHex,
  suggestColorVariant,
} from './helpers';
import { HSL } from './types';

/**
 * Color shape types. Note that `HSL` uses the 0-1 range for all three channels,
 * not the CSS convention of 0-360 for hue and 0-100% for saturation/lightness.
 */
export type { RGB, HSL } from './types';

/**
 * Conversion helpers. `hexToRgb` and `hexToHsl` return `null` for input that is
 * not a valid hex color rather than throwing or producing a garbage result.
 */
export {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  rgbToHsl,
  hslToRgb,
} from './helpers';

/**
 * Original luminance function (used here, WCAG2.0 standard):
 * @link https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * @param color (r, g, b) color
 * @returns a number between 0 and 1 representing the linear luminance of the color
 */
export const getLuminance = (color: string): number | null => {
  const rgb = hexToRgb(color);
  if (rgb === null) {
    return null;
  }

  const channel = (v: number) => {
    const value = v / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
};

/**
 * The exact, unrounded contrast ratio between two colors. Kept internal so that
 * threshold comparisons never operate on a rounded value — a pair at 4.4996
 * rounds to 4.5 and would otherwise be reported as meeting AA when it does not.
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @returns the contrast ratio between 1 and 21, or `null` if either color is invalid
 */
const rawContrast = (
  color1: string | null,
  color2: string | null
): number | null => {
  if (color1 === null || color2 === null) {
    return null;
  }
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  if (luminance1 === null || luminance2 === null) {
    return null;
  }
  const light = luminance1 > luminance2 ? luminance1 : luminance2;
  const dark = luminance1 > luminance2 ? luminance2 : luminance1;

  return (light + 0.05) / (dark + 0.05);
};

/**
 * @link https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 * Produces a contrast ratio between two colors between 1 and 21. This
 * is expressed as 1:1 - 21:1, where contrast of 4.5:1 is considered
 * to be the minimum for normal text and 3:1 for large text.
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param precision - number of decimal places to round to
 * @returns
 */
export const getContrast = (
  color1: string | null,
  color2: string | null,
  precision = 3
): number | null => {
  const ratio = rawContrast(color1, color2);
  if (ratio === null) {
    return null;
  }
  return Math.round(ratio * 10 ** precision) / 10 ** precision;
};

/**
 * isContrasting returns true if the constrast ratio between two specified colors is at least the specified ratio.
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param ratio - the contrast ratio to compare against. Should be between 1 and 21
 * @returns - true if the contrast ratio is at least the specified ratio
 */
export const isContrasting = (
  color1: string,
  color2: string,
  ratio: number
): boolean | null => {
  const contrast = rawContrast(color1, color2);
  if (contrast === null) {
    return null;
  }
  return contrast >= ratio;
};

/**
 * isAAContrast returns true if the constrast ratio between two specified colors satisfies the WCAG 2.0 AA standard
 * @link https://www.w3.org/WAI/GL/UNDERSTANDING-WCAG20/visual-audio-contrast7.html
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param large Large text is defined as at least 14 point (18.66px) + bold, or 18 point (24px) without bold. @link https://www.w3.org/WAI/GL/UNDERSTANDING-WCAG20/visual-audio-contrast7.html#larger-scaledef
 * @returns - true if the contrast ratio is at least 4.5:1 (normal text) or 3:1 (large text)
 */
export const isAAContrast = (color1: string, color2: string, large = false) => {
  return isContrasting(color1, color2, large ? 3 : 4.5);
};

/**
 * isAAAContrast returns true if the constrast ratio between two specified colors satisfies the WCAG 2.0 AAA standard
 * @link https://www.w3.org/WAI/GL/UNDERSTANDING-WCAG20/visual-audio-contrast7.html
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param large Large text is defined as at least 14 point (18.66px) + bold, or 18 point (24px) without bold. @link https://www.w3.org/WAI/GL/UNDERSTANDING-WCAG20/visual-audio-contrast7.html#larger-scaledef
 * @returns - true if the contrast ratio is at least 7:1 (normal text) or 4.5:1 (large text)
 */
export const isAAAContrast = (
  color1: string,
  color2: string,
  large = false
) => {
  return isContrasting(color1, color2, large ? 4.5 : 7);
};

/**
 * randomColor will return a random color in hex format (e.g. `'#000000'`)
 * @returns a random color in hex format (e.g. `'#000000'`)
 */
export const randomColor = () => {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return `#${hex.padStart(6, '0')}`;
};

/**
 * Options accepted by the random accessible color generators.
 */
export interface RandomColorOptions {
  /**
   * Source of randomness, defaulting to `Math.random`. Inject a seeded
   * generator to make output reproducible for snapshot tests or SSR.
   */
  random?: () => number;
}

/**
 * Returns a random color meeting `ratio` against `background`.
 *
 * Rather than sampling the RGB cube and hoping to land in the compliant region,
 * this solves for the admissible luminance bands directly. That matters: only
 * 0.04% of RGB space meets AA against `#777777`, so uniform rejection sampling
 * capped at 1000 tries failed roughly 76% of the time despite valid colors
 * being plentiful.
 *
 * Given a background luminance `Lbg`, a color meets `ratio` when it is either
 * lighter than `ratio * (Lbg + 0.05) - 0.05` or darker than
 * `(Lbg + 0.05) / ratio - 0.05`. If both bands fall outside [0, 1] no color can
 * satisfy the ratio and we can say so immediately instead of exhausting a loop.
 *
 * @param background - the background color to contrast against
 * @param ratio - the contrast ratio to meet
 * @param options - optional randomness injection
 * @returns a compliant color in hex format, or `null` if none exists
 */
const randomColorAtRatio = (
  background: string,
  ratio: number,
  { random = Math.random }: RandomColorOptions = {}
): string | null => {
  const backgroundLuminance = getLuminance(background);
  if (backgroundLuminance === null) {
    return null;
  }

  const lighterThan = ratio * (backgroundLuminance + 0.05) - 0.05;
  const darkerThan = (backgroundLuminance + 0.05) / ratio - 0.05;

  const canLighten = lighterThan <= 1;
  const canDarken = darkerThan >= 0;
  if (!canLighten && !canDarken) {
    return null; // provably unsatisfiable — no search required
  }

  // Prefer whichever band exists; pick at random when both are available.
  const lighten = canLighten && canDarken ? random() < 0.5 : canLighten;

  // Hue and saturation are free choices; only lightness is constrained. Binary
  // search converges on the nearest compliant lightness for the chosen hue.
  const meetsRatio = (c1: string, c2: string) => isContrasting(c1, c2, ratio);
  const backgroundHsl = hexToHsl(background);
  if (backgroundHsl === null) {
    return null;
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const seed: HSL = {
      h: random(),
      s: random(),
      l: lighten ? 0 : 1,
    };
    const found = binarySearchContrast(
      seed,
      backgroundHsl,
      lighten ? 'lighten' : 'darken',
      meetsRatio
    );
    if (found !== null) {
      return hslToHex(found);
    }
  }

  // A compliant luminance exists but this hue/saturation could not reach it
  // within the sRGB gamut. Fall back to the achromatic extreme, which always
  // attains the band when the band is non-empty.
  const extreme = lighten ? '#ffffff' : '#000000';
  return meetsRatio(extreme, background) ? extreme : null;
};

/**
 * getRandomAAColor will return a random color that is accessible based on the
 * WCAG 2.0 AA standard, which requires a contrast ratio of at least 4.5:1.
 * @param background - the background color to use for the contrast ratio calculation.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 3:1.
 * @returns a random color that is accessible based on the WCAG 2.0 AA standard.
 */
export const getRandomAAColor = (
  background: string,
  large = false,
  options: RandomColorOptions = {}
): string | null => {
  return randomColorAtRatio(background, large ? 3 : 4.5, options);
};

/**
 * getRandomAAAColor will return a random color that is accessible based on the
 * WCAG 2.0 AAA standard, which requires a contrast ratio of at least 7:1. It will
 * take into account the luminance of the background color (hash).
 * @param background - the background color to use for the contrast ratio calculation.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 4.5:1.
 * @returns a random color that is accessible based on the WCAG 2.0 AAA standard.
 */
export const getRandomAAAColor = (
  background: string,
  large = false,
  options: RandomColorOptions = {}
): string | null => {
  return randomColorAtRatio(background, large ? 4.5 : 7, options);
};

/**
 * suggestAAColor will return a close accessible color to the specified color with WCAG AA compatibility.
 * @param colorToChange - the color we want to find a close accessible color for.
 * @param colorToKeep - the color we want to keep the contrast ratio with.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 3:1.
 * @returns a close accessible color to the specified `colorToChange` relative to the `colorToKeep`, or `null` if no accessible color can be found.
 */
export const suggestAAColorVariant = (
  colorToChange: string,
  colorToKeep: string,
  large?: boolean
): string | null => {
  return suggestColorVariant(colorToChange, colorToKeep, isAAContrast, large);
};

/**
 * suggestAAAColor will return a close accessible color to the specified color with WCAG AAA compatibility.
 * @param colorToChange - the color we want to find a close accessible color for.
 * @param colorToKeep - the color we want to keep the contrast ratio with.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 4.5:1.
 * @returns a close accessible color to the specified `colorToChange` relative to the `colorToKeep`, or `null` if no accessible color can be found.
 */
export const suggestAAAColorVariant = (
  colorToChange: string,
  colorToKeep: string,
  large?: boolean
): string | null => {
  return suggestColorVariant(colorToChange, colorToKeep, isAAAContrast, large);
};
