import { hslToHex } from './helpers';
import { parseColor } from './parse';
import { binarySearchContrast, suggestColorVariant, toHsl } from './suggest';
import type { HSL } from './types';

/**
 * Color shape types. Note that `HSL` uses the 0-1 range for all three channels,
 * not the CSS convention of 0-360 for hue and 0-100% for saturation/lightness.
 */
export type { RGB, HSL } from './types';

/**
 * Conversion helpers. `hexToRgb` and `hexToHsl` return `null` for input that is
 * not a valid hex color rather than throwing or producing a garbage result.
 */
export { parseColor } from './parse';
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
  const rgb = parseColor(color);
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
 * isNonTextContrast returns true if two colors satisfy WCAG 2.1 SC 1.4.11
 * Non-text Contrast, which requires 3:1 for the visual boundaries of UI
 * components, focus indicators, and graphical objects needed to understand
 * content.
 *
 * This is the same 3:1 threshold as large text, but naming it separately
 * matters: checking a button border by claiming it is "large text" obscures
 * which success criterion is actually being satisfied.
 *
 * @link https://www.w3.org/TR/WCAG21/#non-text-contrast
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @returns true if the contrast ratio is at least 3:1, or `null` if either color is invalid
 */
export const isNonTextContrast = (
  color1: string,
  color2: string
): boolean | null => {
  return isContrasting(color1, color2, 3);
};

/**
 * The kind of content a color pair is being used for, which determines the
 * required contrast ratio.
 *
 * - `normal` — body text: 4.5:1 for AA, 7:1 for AAA (SC 1.4.3, 1.4.6)
 * - `large` — at least 18.66px bold or 24px regular: 3:1 for AA, 4.5:1 for AAA
 * - `non-text` — UI boundaries, focus indicators, graphics: 3:1 (SC 1.4.11)
 */
export type ContentType = 'normal' | 'large' | 'non-text';

/**
 * The highest WCAG 2.1 conformance level a color pair achieves.
 * SC 1.4.11 defines no enhanced level, so `non-text` content returns
 * `'AA'` or `'fail'` only.
 */
export type ContrastLevel = 'AAA' | 'AA' | 'fail';

/** Required contrast ratios by content type and conformance level. */
const THRESHOLDS: Record<ContentType, { AA: number; AAA: number }> = {
  normal: { AA: 4.5, AAA: 7 },
  large: { AA: 3, AAA: 4.5 },
  'non-text': { AA: 3, AAA: Infinity },
};

/**
 * getContrastLevel returns the highest WCAG 2.1 level a color pair achieves for
 * the given content type, rather than a bare pass/fail against one threshold.
 *
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param content - the kind of content the pair is used for, defaulting to `normal`
 * @returns `'AAA'`, `'AA'`, or `'fail'`, or `null` if either color is invalid
 */
export const getContrastLevel = (
  color1: string,
  color2: string,
  content: ContentType = 'normal'
): ContrastLevel | null => {
  const ratio = rawContrast(color1, color2);
  if (ratio === null) {
    return null;
  }
  const { AA, AAA } = THRESHOLDS[content];
  if (ratio >= AAA) return 'AAA';
  if (ratio >= AA) return 'AA';
  return 'fail';
};

/**
 * A complete account of how a color pair performs against WCAG 2.1, suitable
 * for audit tooling, linters, CI gates and design-system dashboards that would
 * otherwise call several predicates and reassemble the result themselves.
 */
export interface ContrastReport {
  /** The exact contrast ratio, rounded to the requested precision. */
  ratio: number;
  /** Body text — SC 1.4.3 (AA, 4.5:1) and SC 1.4.6 (AAA, 7:1). */
  normal: { aa: boolean; aaa: boolean };
  /** Large text — at least 18.66px bold or 24px regular. */
  large: { aa: boolean; aaa: boolean };
  /** UI components and graphical objects — SC 1.4.11 (3:1). */
  nonText: { passes: boolean };
  /** Highest level achieved for body text, the most common question. */
  level: ContrastLevel;
}

/**
 * getContrastReport returns every WCAG 2.1 verdict for a color pair in one
 * call.
 *
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param precision - number of decimal places to round the reported ratio to
 * @returns a full report, or `null` if either color is invalid
 */
export const getContrastReport = (
  color1: string,
  color2: string,
  precision = 3
): ContrastReport | null => {
  const ratio = rawContrast(color1, color2);
  if (ratio === null) {
    return null;
  }

  return {
    ratio: Math.round(ratio * 10 ** precision) / 10 ** precision,
    normal: { aa: ratio >= 4.5, aaa: ratio >= 7 },
    large: { aa: ratio >= 3, aaa: ratio >= 4.5 },
    nonText: { passes: ratio >= 3 },
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail',
  };
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
  const backgroundHsl = toHsl(background);
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
