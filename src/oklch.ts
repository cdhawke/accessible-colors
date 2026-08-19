import type { RGB } from './types';

/**
 * OKLab / OKLCH color space conversion, following Björn Ottosson's reference
 * implementation (https://bottosson.github.io/posts/oklab/).
 *
 * Used only by the perceptual suggestion search in `suggest.ts`. WCAG relative
 * luminance (`index.ts`) is a deliberately separate calculation with its own
 * linearization constants — the two are never shared, so a change to one can
 * never silently perturb the other.
 *
 * OKLab is designed so that equal Euclidean steps correspond to roughly equal
 * perceived differences, which HSL is not: darkening a saturated yellow by a
 * fixed HSL lightness step shifts it toward olive, while an equivalent OKLCH
 * lightness step keeps it reading as "a darker yellow". That property is what
 * the suggestion search is actually built to exploit.
 */

export interface OKLab {
  L: number;
  a: number;
  b: number;
}

export interface OKLCH {
  L: number;
  C: number;
  /** Hue as a 0-1 turn fraction, matching this package's HSL convention. */
  H: number;
}

/**
 * A comfortable upper bound on OKLCH chroma for colors that can appear in
 * sRGB. The true maximum varies by hue and lightness (up to roughly 0.32); a
 * fixed ceiling of 0.4 is sampled from and then gamut-mapped down as needed,
 * rather than trying to compute the exact per-hue maximum up front.
 */
export const MAX_OKLCH_CHROMA = 0.4;

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const rgbToOklab = ({ r, g, b }: RGB): OKLab => {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

/**
 * Linear-light (not gamma-encoded, not gamut-clamped) RGB for an OKLab point.
 * Channels outside [0, 1] mean the color is outside the sRGB gamut — exactly
 * the signal `isInGamut` and the chroma-reduction search need, so this stops
 * short of clamping rather than hiding that information.
 */
const oklabToLinearRgb = ({ L, a, b }: OKLab): RGB => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
};

/** Whether an OKLab point maps to an in-gamut sRGB color, before clamping. */
export const isInGamut = (lab: OKLab): boolean => {
  const { r, g, b } = oklabToLinearRgb(lab);
  const EPS = 1e-4;
  return (
    r >= -EPS &&
    r <= 1 + EPS &&
    g >= -EPS &&
    g <= 1 + EPS &&
    b >= -EPS &&
    b <= 1 + EPS
  );
};

/** Converts an OKLab point to 8-bit sRGB, clamping any residual gamut error. */
export const oklabToRgb = (lab: OKLab): RGB => {
  const { r, g, b } = oklabToLinearRgb(lab);
  return {
    r: Math.round(clamp01(linearToSrgb(r)) * 255),
    g: Math.round(clamp01(linearToSrgb(g)) * 255),
    b: Math.round(clamp01(linearToSrgb(b)) * 255),
  };
};

export const oklabToOklch = ({ L, a, b }: OKLab): OKLCH => {
  const C = Math.sqrt(a * a + b * b);
  const turns = Math.atan2(b, a) / (2 * Math.PI);
  return { L, C, H: ((turns % 1) + 1) % 1 };
};

export const oklchToOklab = ({ L, C, H }: OKLCH): OKLab => {
  const radians = H * 2 * Math.PI;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
};

/**
 * Reduces chroma at a fixed lightness and hue until the color is representable
 * in sRGB, via binary search on `C`. This is a simplified gamut mapping — it
 * does not implement the full CSS Color 4 algorithm (which also nudges
 * lightness), but chroma reduction alone is sufficient here: the caller is
 * already searching lightness for a contrast target, so pulling lightness
 * toward mid-grey to preserve chroma would fight that search directly.
 */
export const gamutMapChroma = (L: number, C: number, H: number): OKLab => {
  const candidate = oklchToOklab({ L, C, H });
  if (isInGamut(candidate)) {
    return candidate;
  }

  let lo = 0;
  let hi = C;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (isInGamut(oklchToOklab({ L, C: mid, H }))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return oklchToOklab({ L, C: lo, H });
};

/**
 * Perceptual distance between two OKLab points. Euclidean distance in OKLab
 * approximates perceived color difference (ΔE OK) — unlike the HSL lightness
 * distance it replaces, this accounts for hue and chroma shift, not only
 * lightness.
 */
export const deltaEOK = (a: OKLab, b: OKLab): number =>
  Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
