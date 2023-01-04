import { HSL, RGB } from './types';

/**
 * hslToHex will return the hex representation of an hsl color.
 * @param hsl - hue, saturation, and lightness values of a color represented as numbers between 0 and 1 {h, s, l}
 * @returns the hex representation of a color (e.g. #000000)
 */
export const hslToHex = (hsl: HSL): string => {
  const rgb = hslToRgb(hsl);

  return rgbToHex(rgb);
};

/**
 * hexToHsl will return the HSL representation of a hex color.
 * @param str - hex representation of a color (e.g. #000000)
 * @returns the HSL representation of a color {h, s, l}
 */
export const hexToHsl = (str: string): HSL => {
  const rgb = hexToRgb(str);

  return rgbToHsl(rgb);
};

/**
 * rgbToHex will return the hex representation of an rgb color.
 * @param rgb - red, green, and blue values of a color represented as numbers between 0 and 255 {r, g, b}
 * @returns the hex representation of a color (e.g. #000000)
 */
export const rgbToHex = (rgb: RGB): string => {
  const { r, g, b } = rgb;
  const hex = ((r << 16) | (g << 8) | b).toString(16);
  return `#${hex.padStart(6, '0')}`;
};

/**
 * hexToRgb will return the red, green, and blue values of a color represented as numbers between 0 and 255.
 * @param hex - hex representation of a color (e.g. #000000)
 * @returns red, green, and blue values of a color represented as numbers between 0 and 255 {r, g, b}
 */
export const hexToRgb = (hex: string): RGB => {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * Shamelessly copied from https://stackoverflow.com/a/9493060/
 * with attributions to the original author.
 *
 * @param h - the hue
 * @param s - the saturation
 * @param l - the lightness
 * @returns the RGB representation
 */
export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  let r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 *
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * Shamelessly copied from https://stackoverflow.com/a/9493060/
 * with attributions to the original author.
 *
 * @param r - the red color value
 * @param g - the green color value
 * @param b - the blue color value
 * @returns the HSL representation
 */
export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  (r /= 255), (g /= 255), (b /= 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    // @ts-ignore
    h /= 6;
  }

  // @ts-ignore
  return { h, s, l };
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
  const hslChange = hexToHsl(colorToChange);
  const hslKeep = hexToHsl(colorToKeep);
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
