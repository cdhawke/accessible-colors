import type { RGB } from './types';
import { hexToRgb, hslToRgb } from './helpers';

/**
 * Parsing for the CSS color formats a real codebase actually holds.
 *
 * Hex-only input was the single largest barrier to using this library: design
 * tokens are increasingly `hsl()` or `oklch()`, and `getComputedStyle` returns
 * `rgb()` regardless of how a color was authored — so checking contrast against
 * what a browser actually rendered was impossible without a converter.
 *
 * Every function here returns `null` rather than throwing or guessing. An
 * accessibility library that misreads its input reports false compliance, which
 * is worse than reporting nothing.
 */

/**
 * Read a CSS `<number>` or `<percentage>` token.
 *
 * @param token - the raw token
 * @param scale - what 100% corresponds to (255 for rgb channels, 1 for hsl)
 * @param requirePercent - whether a bare number should be rejected, as `hsl()`
 *   requires for saturation and lightness
 * @returns the value clamped to [0, scale], or `null` if unreadable
 */
const parseNumeric = (
  token: string,
  scale: number,
  requirePercent = false
): number | null => {
  const trimmed = token.trim();
  const isPercent = trimmed.endsWith('%');
  if (trimmed === '' || (requirePercent && !isPercent)) return null;

  const numeric = Number(isPercent ? trimmed.slice(0, -1) : trimmed);
  if (!Number.isFinite(numeric)) return null;

  const value = isPercent ? (numeric / 100) * scale : numeric;
  return Math.min(scale, Math.max(0, value));
};

/** Conversion factors from each CSS angle unit into turns. */
const ANGLE_UNITS: Record<string, number> = {
  deg: 1 / 360,
  grad: 1 / 400,
  rad: 1 / (2 * Math.PI),
  turn: 1,
};

/**
 * Parse a CSS `<angle>` into a 0-1 hue fraction, normalised so that negative
 * and over-rotated values wrap rather than clamp — `hsl(-90deg ...)` is the
 * same hue as `hsl(270deg ...)`.
 */
const parseHue = (token: string): number | null => {
  const trimmed = token.trim().toLowerCase();
  if (trimmed === '') return null;

  const match = /^(-?[\d.e+]+)(deg|grad|rad|turn)?$/.exec(trimmed);
  const value = match?.[1];
  if (value === undefined) return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const factor = ANGLE_UNITS[match?.[2] ?? 'deg'];
  if (factor === undefined) return null;

  const turns = numeric * factor;
  return turns - Math.floor(turns); // wrap into [0, 1)
};

/**
 * Split the interior of a CSS color function into its component tokens.
 *
 * Handles both the legacy comma syntax (`rgb(1, 2, 3)`) and the modern
 * space syntax with a slash-separated alpha (`rgb(1 2 3 / 50%)`). Returns
 * `null` if the two syntaxes are mixed, which CSS does not permit.
 */
const splitArguments = (body: string): string[] | null => {
  const trimmed = body.trim();
  if (trimmed === '') return null;

  if (trimmed.includes(',')) {
    // Legacy syntax must not also carry a slash-separated alpha.
    if (trimmed.includes('/')) return null;
    return trimmed.split(',').map((part) => part.trim());
  }

  const [components, alpha, ...rest] = trimmed.split('/');
  if (rest.length > 0 || components === undefined) return null;

  const parts = components.trim().split(/\s+/).filter(Boolean);
  if (alpha !== undefined) {
    const alphaToken = alpha.trim();
    if (alphaToken === '') return null;
    parts.push(alphaToken);
  }
  return parts;
};

/**
 * Parse `rgb()` / `rgba()` in either syntax.
 *
 * Alpha is validated for well-formedness and then discarded: WCAG contrast is
 * undefined for a translucent color without a known backdrop, so silently
 * treating a 10%-opacity color as opaque would produce a confidently wrong
 * verdict.
 */
const parseRgbFunction = (args: string[]): RGB | null => {
  if (args.length !== 3 && args.length !== 4) return null;

  const [rToken, gToken, bToken] = args;
  if (rToken === undefined || gToken === undefined || bToken === undefined) {
    return null;
  }

  const r = parseNumeric(rToken, 255);
  const g = parseNumeric(gToken, 255);
  const b = parseNumeric(bToken, 255);
  if (r === null || g === null || b === null) return null;

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
};

/** Parse `hsl()` / `hsla()` in either syntax, reusing the existing HSL math. */
const parseHslFunction = (args: string[]): RGB | null => {
  if (args.length !== 3 && args.length !== 4) return null;

  const [hToken, sToken, lToken] = args;
  if (hToken === undefined || sToken === undefined || lToken === undefined) {
    return null;
  }

  const h = parseHue(hToken);
  const s = parseNumeric(sToken, 1, true);
  const l = parseNumeric(lToken, 1, true);
  if (h === null || s === null || l === null) return null;

  return hslToRgb({ h, s, l });
};

/** Matches `name(...)`, capturing the function name and its interior. */
const FUNCTION_PATTERN = /^([a-z]+)\((.*)\)$/i;

/**
 * parseColor converts any supported CSS color string into RGB channels.
 *
 * Supported: hex (`#abc`, `#abcd`, `#aabbcc`, `#aabbccdd`), `rgb()`/`rgba()`,
 * and `hsl()`/`hsla()`, each in both legacy comma and modern space syntax.
 *
 * @param color - a CSS color string
 * @returns the RGB channels, or `null` if the input is not a supported color
 */
export const parseColor = (color: string): RGB | null => {
  if (typeof color !== 'string') return null;

  const trimmed = color.trim();
  if (trimmed === '') return null;

  // Hex is by far the most common input; try it before the function forms.
  const hex = hexToRgb(trimmed);
  if (hex !== null) return hex;

  const match = FUNCTION_PATTERN.exec(trimmed);
  const name = match?.[1]?.toLowerCase();
  const body = match?.[2];
  if (name === undefined || body === undefined) return null;

  const args = splitArguments(body);
  if (args === null) return null;

  switch (name) {
    case 'rgb':
    case 'rgba':
      return parseRgbFunction(args);
    case 'hsl':
    case 'hsla':
      return parseHslFunction(args);
    default:
      return null;
  }
};
