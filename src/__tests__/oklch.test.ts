import {
  deltaEOK,
  gamutMapChroma,
  isInGamut,
  oklabToOklch,
  oklabToRgb,
  oklchToOklab,
  rgbToOklab,
  MAX_OKLCH_CHROMA,
} from '../oklch';
import { hexToRgb, rgbToHex, randomColor } from '..';

describe('oklch', () => {
  describe('round trips', () => {
    it('should round trip RGB -> OKLab -> RGB for boundary colors', () => {
      const boundaries = [
        '#000000',
        '#ffffff',
        '#808080',
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ffff00',
        '#00ffff',
        '#ff00ff',
      ];
      for (const hex of boundaries) {
        const rgb = hexToRgb(hex)!;
        const roundTripped = oklabToRgb(rgbToOklab(rgb));
        // 8-bit rounding through a cube-root/matrix transform can be off by a
        // fraction of a unit; allow +/-1 per channel rather than exact equality.
        expect(Math.abs(roundTripped.r - rgb.r)).toBeLessThanOrEqual(1);
        expect(Math.abs(roundTripped.g - rgb.g)).toBeLessThanOrEqual(1);
        expect(Math.abs(roundTripped.b - rgb.b)).toBeLessThanOrEqual(1);
      }
    });

    it('should round trip RGB -> OKLab -> OKLCH -> OKLab -> RGB for arbitrary colors', () => {
      for (let i = 0; i < 500; i++) {
        const hex = randomColor();
        const rgb = hexToRgb(hex)!;
        const lch = oklabToOklch(rgbToOklab(rgb));
        const back = oklabToRgb(oklchToOklab(lch));
        expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
        expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
        expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
      }
    });

    it('should keep hue in [0, 1) even at the atan2 branch cut', () => {
      // Colors whose a/b land near the negative-a axis exercise atan2's
      // wraparound from +pi to -pi.
      for (const hex of ['#ff0080', '#800000', '#400020']) {
        const { H } = oklabToOklch(rgbToOklab(hexToRgb(hex)!));
        expect(H).toBeGreaterThanOrEqual(0);
        expect(H).toBeLessThan(1);
      }
    });
  });

  describe('isInGamut / gamutMapChroma', () => {
    it('should consider achromatic colors always in gamut', () => {
      for (const L of [0, 0.25, 0.5, 0.75, 1]) {
        expect(isInGamut({ L, a: 0, b: 0 })).toBe(true);
      }
    });

    it('should consider very high chroma out of gamut', () => {
      expect(isInGamut(oklchToOklab({ L: 0.5, C: 1, H: 0 }))).toBe(false);
    });

    it('should leave in-gamut colors unchanged', () => {
      const lab = rgbToOklab(hexToRgb('#336699')!);
      const lch = oklabToOklch(lab);
      const mapped = gamutMapChroma(lch.L, lch.C, lch.H);
      expect(mapped.a).toBeCloseTo(lab.a, 4);
      expect(mapped.b).toBeCloseTo(lab.b, 4);
    });

    it('should reduce out-of-gamut chroma to something renderable', () => {
      for (let i = 0; i < 300; i++) {
        const L = Math.random();
        const H = Math.random();
        const mapped = gamutMapChroma(L, MAX_OKLCH_CHROMA, H);
        expect(isInGamut(mapped)).toBe(true);
      }
    });

    it('should never increase chroma', () => {
      for (let i = 0; i < 300; i++) {
        const L = Math.random();
        const H = Math.random();
        const C = Math.random() * MAX_OKLCH_CHROMA;
        const mapped = gamutMapChroma(L, C, H);
        const mappedC = Math.sqrt(mapped.a ** 2 + mapped.b ** 2);
        expect(mappedC).toBeLessThanOrEqual(C + 1e-6);
      }
    });
  });

  describe('deltaEOK', () => {
    it('should be zero for identical points', () => {
      const lab = rgbToOklab(hexToRgb('#663399')!);
      expect(deltaEOK(lab, lab)).toBe(0);
    });

    it('should be symmetric', () => {
      const a = rgbToOklab(hexToRgb('#663399')!);
      const b = rgbToOklab(hexToRgb('#99cc33')!);
      expect(deltaEOK(a, b)).toBeCloseTo(deltaEOK(b, a), 10);
    });

    it('should rank a closer color as closer', () => {
      const origin = rgbToOklab(hexToRgb('#808080')!);
      const near = rgbToOklab(hexToRgb('#828282')!);
      const far = rgbToOklab(hexToRgb('#ffffff')!);
      expect(deltaEOK(origin, near)).toBeLessThan(deltaEOK(origin, far));
    });
  });

  describe('rgbToHex composition', () => {
    it('should produce valid hex from any OKLab point after gamut mapping', () => {
      for (let i = 0; i < 300; i++) {
        const rgb = oklabToRgb(
          gamutMapChroma(Math.random(), Math.random() * MAX_OKLCH_CHROMA, Math.random())
        );
        const hex = rgbToHex(rgb);
        expect(hexToRgb(hex)).toEqual(rgb);
      }
    });
  });
});
