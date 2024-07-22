import { hexToRgb, suggestColorVariant } from './helpers';

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
 * @param color1 - first color to compare in hex format (e.g. #000000)
 * @param color2 - second color to compare in hex format (e.g. #ffffff)
 * @param precision - number of decimal places to round to
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
) => {
  const contrast = getContrast(color1, color2);
  if (!contrast) {
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
 * getRandomAAColor will return a random color that is accessible based on the
 * WCAG 2.0 AA standard, which requires a contrast ratio of at least 4.5:1.
 * @param background - the background color to use for the contrast ratio calculation.
 * @param large - whether the text should be considered large, adjusting the contrast ratio requirement to 3:1.
 * @returns a random color that is accessible based on the WCAG 2.0 AA standard.
 */
export const getRandomAAColor = (
  background: string,
  large = false
): string | null => {
  let color = randomColor();
  let attempts = 0;
  while (!isAAContrast(background, color, large)) {
    if (attempts++ > 1000) {
      return null; // could not find a color that meets the contrast ratio within a reasonable number of tries
    }
    color = randomColor();
  }
  return color;
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
  large = false
): string | null => {
  let color = randomColor();
  let attempts = 0;
  while (!isAAAContrast(background, color, large)) {
    if (attempts++ > 1000) {
      return null; // could not find a color that meets the contrast ratio within a reasonable number of tries
    }
    color = randomColor();
  }

  return color;
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
