import {
  hslToHex,
  hexToHsl,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
} from '../helpers';
import { binarySearchContrast, suggestColorVariant } from '../suggest';
import { rgbToOklab, oklabToOklch, oklabToRgb, gamutMapChroma } from '../oklch';
import { getContrast, isAAContrast, randomColor } from '..';

const toOklch = (hex: string) => oklabToOklch(rgbToOklab(hexToRgb(hex)!));
const oklchToHex = (found: { L: number; C: number; H: number }) =>
  rgbToHex(oklabToRgb(gamutMapChroma(found.L, found.C, found.H)));

describe('helpers', () => {
  describe('hexToRgb', () => {
    it('should parse every accepted hex form', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
      expect(hexToRgb('#abcd')).toEqual({ r: 170, g: 187, b: 204 });
      expect(hexToRgb('#123456')).toEqual({ r: 18, g: 52, b: 86 });
      expect(hexToRgb('#12345678')).toEqual({ r: 18, g: 52, b: 86 });
      expect(hexToRgb('#ABCDEF')).toEqual(hexToRgb('#abcdef'));
      expect(hexToRgb('  #abcdef ')).toEqual(hexToRgb('#abcdef'));
    });

    it('should return null for anything else', () => {
      for (const bad of [
        '',
        '#',
        '#f',
        '#ff',
        '#fffff',
        '#fffffff',
        '#fffffffff',
        '#gggggg',
        'rgb(0,0,0)',
        'white',
        'notacolor',
        '   ',
        '#ff ff ff',
      ]) {
        expect(hexToRgb(bad)).toBe(null);
      }
    });

    it('should not throw on non-string input', () => {
      const cases = [null, undefined, 123, {}, []];
      for (const bad of cases) {
        expect(hexToRgb(bad as unknown as string)).toBe(null);
      }
    });
  });

  describe('round trips', () => {
    it('should convert rgb to hex and back to rgb', () => {
      const rgb = { r: 255, g: 255, b: 255 };
      expect(hexToRgb(rgbToHex(rgb))).toEqual(rgb);
    });

    it('should convert hex to rgb and back to hex', () => {
      const hex = '#ffffff';
      expect(rgbToHex(hexToRgb(hex)!)).toEqual(hex);
    });

    it('should convert rgb to hsl and back to rgb', () => {
      const rgb = { r: 255, g: 255, b: 255 };
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
    });

    it('should convert hsl to rgb and back to hsl', () => {
      const hsl = { h: 0.5, s: 0.1, l: 0.3 };
      const hsl2 = rgbToHsl(hslToRgb(hsl));

      expect(hsl.h).toBeCloseTo(hsl2.h);
      expect(hsl.s).toBeCloseTo(hsl2.s);
      expect(hsl.l).toBeCloseTo(hsl2.l);
    });

    it('should convert hex to hsl and back to hex', () => {
      const hex = '#fe30f1';
      expect(hslToHex(hexToHsl(hex)!)).toEqual(hex);
    });

    it('should convert hsl to hex and back to hsl', () => {
      const hsl = { h: 0.3, s: 0.3, l: 0.4 };
      const hsl2 = hexToHsl(hslToHex(hsl))!;

      expect(hsl.h).toBeCloseTo(hsl2.h);
      expect(hsl.s).toBeCloseTo(hsl2.s);
      expect(hsl.l).toBeCloseTo(hsl2.l);
    });

    it('should round trip every boundary color', () => {
      // Achromatic extremes, all primaries and secondaries, and mid grey — the
      // branches where hslToRgb/rgbToHsl diverge.
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
        expect(hslToHex(hexToHsl(hex)!)).toEqual(hex);
      }
    });

    it('should round trip arbitrary colors', () => {
      for (let i = 0; i < 2000; i++) {
        const hex = randomColor();
        expect(hslToHex(hexToHsl(hex)!)).toEqual(hex);
        expect(rgbToHex(hexToRgb(hex)!)).toEqual(hex);
      }
    });
  });

  describe('hexToHsl', () => {
    it('should return null for invalid hex', () => {
      expect(hexToHsl('nope')).toBe(null);
      expect(hexToHsl('#ff')).toBe(null);
    });
  });

  describe('binarySearchContrast', () => {
    const white = '#ffffff';
    const black = '#000000';
    const green = toOklch('#00ff33');

    it('should find a compliant color when lightening is possible', () => {
      const result = binarySearchContrast(green, black, 'lighten', isAAContrast);
      expect(result).not.toBe(null);
      expect(isAAContrast(oklchToHex(result!), black)).toBe(true);
    });

    it('should find a compliant color when darkening is possible', () => {
      const result = binarySearchContrast(green, white, 'darken', isAAContrast);
      expect(result).not.toBe(null);
      expect(isAAContrast(oklchToHex(result!), white)).toBe(true);
    });

    it('should return null when the extreme is already non-compliant', () => {
      // Darkening toward black can never make a color contrast with black.
      expect(binarySearchContrast(green, black, 'darken', isAAContrast)).toBe(
        null
      );
      // Lightening toward white can never make a color contrast with white.
      expect(binarySearchContrast(green, white, 'lighten', isAAContrast)).toBe(
        null
      );
    });

    it('should terminate for every direction and fixed color, and only return verified-compliant colors', () => {
      for (let i = 0; i < 200; i++) {
        const change = toOklch(randomColor());
        const fixed = randomColor();
        for (const direction of ['lighten', 'darken'] as const) {
          const result = binarySearchContrast(
            change,
            fixed,
            direction,
            isAAContrast
          );
          if (result !== null) {
            expect(isAAContrast(oklchToHex(result), fixed)).toBe(true);
          }
        }
      }
    });

    it('should accept a fixed color in any supported CSS format', () => {
      // The fixed color is passed straight through to contrastFn, so it must
      // work for every format parseColor supports, not just hex.
      const result = binarySearchContrast(
        green,
        'rgb(0, 0, 0)',
        'lighten',
        isAAContrast
      );
      expect(result).not.toBe(null);
      expect(isAAContrast(oklchToHex(result!), '#000000')).toBe(true);
    });
  });

  describe('suggestColorVariant', () => {
    it('should return the original color when it already complies', () => {
      expect(suggestColorVariant('#000000', '#ffffff', isAAContrast)).toBe(
        '#000000'
      );
    });

    it('should return null for invalid input', () => {
      expect(suggestColorVariant('nope', '#ffffff', isAAContrast)).toBe(null);
      expect(suggestColorVariant('#ffffff', 'nope', isAAContrast)).toBe(null);
    });

    it('should pick the candidate closest to the original lightness', () => {
      // Near-white input against white: darkening is the only option.
      const suggestion = suggestColorVariant(
        '#fafafa',
        '#ffffff',
        isAAContrast
      );
      expect(suggestion).not.toBe(null);
      expect(getContrast(suggestion, '#ffffff')!).toBeGreaterThanOrEqual(4.5);
    });
  });
});
