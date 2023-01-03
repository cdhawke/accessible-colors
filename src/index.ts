import { hexToHsl, hexToRgb, hslToHex } from './helpers';
import { HSL } from './types';

/**
 * Original luminance function (used here, WCAG2.0 standard):
 * @link https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * @param color (r, g, b) color
 * @returns a number between 0 and 1 representing the linear luminance of the color
 */
export const getLuminance = (color: string) => {
  if (!color) {
    return null;
  }
  const rgb = hexToRgb(color);
  if (!rgb) {
    return null;
  }
  const [r, g, b] = Object.values(rgb).map((v) => {
    const value = v / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * @link https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 * Produces a contrast ratio between two colors between 1 and 21. This
 * is expressed as 1:1 - 21:1, where contrast of 4.5:1 is considered
 * to be the minimum for normal text and 3:1 for large text.
 * @param color1
 * @param color2
 * @returns
 */
export const getContrast = (
  color1: string | null,
  color2: string | null,
  precision = 3
) => {
  if (color1 === null || color2 === null) {
    return null;
  }
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  if (luminance1 === null || luminance2 === null) {
    return null;
  }
  const [light, dark] = [luminance1, luminance2].sort((a, b) => b - a);
  return (
    Math.round(((light + 0.05) / (dark + 0.05)) * 10 ** precision) /
    10 ** precision
  );
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
  const contrast = getContrast(color1, color2);
  if (!contrast) {
    return null;
  }
  return contrast >= (large ? 3 : 4.5);
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
  const contrast = getContrast(color1, color2);
  return contrast && contrast >= (large ? 4.5 : 7.5);
};

export const randomColor = () => {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return `#${hex.padStart(6, '0')}`;
};

/**
 * getRandomAAColor will return a random color that is accessible based on the
 * WCAG 2.0 AA standard, which requires a contrast ratio of at least 4.5:1.
 * @param background - The background color to use for the contrast ratio calculation.
 * @param large - Whether the text should be considered large, adjusting the contrast ratio requirement to 3:1.
 * @returns A random color that is accessible based on the WCAG 2.0 AA standard.
 */
export const getRandomAAColor = (background: string, large = false): string => {
  let color = randomColor();
  while (!isAAContrast(background, color, large)) {
    color = randomColor();
  }

  return color;
};

/**
 * getRandomAAAColor will return a random color that is accessible based on the
 * WCAG 2.0 AAA standard, which requires a contrast ratio of at least 7:1. It will
 * take into account the luminance of the background color (hash).
 * @param background - The background color to use for the contrast ratio calculation.
 * @param large - Whether the text should be considered large, adjusting the contrast ratio requirement to 4.5:1.
 * @returns A random color that is accessible based on the WCAG 2.0 AAA standard.
 */
export const getRandomAAAColor = (
  background: string,
  large = false
): string => {
  let color = randomColor();
  while (!isAAAContrast(background, color, large)) {
    color = randomColor();
  }

  return color;
};

const getFontSize = (el: HTMLElement) => {
  const style = window.getComputedStyle(el);
  return parseFloat(style.fontSize);
};

const getBackgroundColor = (el: HTMLElement) => {
  const style = window.getComputedStyle(el);
  return style.backgroundColor;
};

const getTextColor = (el: HTMLElement) => {
  const style = window.getComputedStyle(el);
  return style.color;
};

/**
 * binarySearchContrast will run a binary search to find the closest accessible color
 * @param change
 * @param fixed
 */
const binarySearchContrast = (
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
    if (direction === 'lighten') {
      if (!contrastFn(stringified, fixedHex, large)) {
        min = adjusted;
        minColor = hslToHex({ ...hs, l: adjusted });
      } else {
        max = adjusted;
        maxColor = hslToHex({ ...hs, l: adjusted });
      }
    }
    if (direction === 'darken') {
      if (!contrastFn(stringified, fixedHex, large)) {
        max = adjusted;
        maxColor = hslToHex({ ...hs, l: adjusted });
      } else {
        min = adjusted;
        minColor = hslToHex({ ...hs, l: adjusted });
      }
    }
  }

  return hexToHsl(direction === 'lighten' ? maxColor : minColor);
};

/**
 * suggestAAColor will return a close accessible color to the specified colors.
 * @param colorToChange - the color we want to find a close accessible color for
 * @param colorToKeep - the color we want to keep the contrast ratio with
 * @returns - a close accessible color to the specified color to change relative to the color to keep,
 * or null if no accessible color can be found.
 */
export const suggestAAColorVariant = (
  colorToChange: string,
  colorToKeep: string,
  large?: boolean
): string | null => {
  const hslChange = hexToHsl(colorToChange);
  const hslKeep = hexToHsl(colorToKeep);
  if (!hslKeep || !hslChange) {
    return null;
  }
  if (isAAContrast(colorToChange, colorToKeep, large)) {
    return colorToChange;
  }
  const darker = binarySearchContrast(
    hslChange,
    hslKeep,
    'darken',
    isAAContrast,
    large
  );
  const lighter = binarySearchContrast(
    hslChange,
    hslKeep,
    'lighten',
    isAAContrast,
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
