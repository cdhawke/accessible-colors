import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as api from '..';

/**
 * The README previously documented two sections with copy-pasted examples that
 * called the wrong function and reported the wrong values — an AA result shown
 * as AAA, which is the exact failure mode this library exists to prevent.
 *
 * These tests pin every numeric claim in the README to real output so the docs
 * cannot drift from the implementation again.
 */
describe('README', () => {
  const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');

  describe('documented values', () => {
    it('should match the contrast examples', () => {
      expect(api.getContrast('#00FF33', '#FFFFFF')).toBe(1.368);
      expect(api.getContrast('#00FF33', '#616161')).toBe(4.528);
      expect(api.getContrast('#00FF33', '#000000', 4)).toBe(15.3518);
      expect(api.getContrast('#00FF33', 'not-a-color')).toBe(null);
      expect(api.getContrast('#00FF33', '#617765')).toBe(3.541);
      expect(api.getContrast('#00FF33', '#613365')).toBe(7.075);
      expect(api.getContrast('#949494', '#FFFFFF')).toBe(3.033);
      expect(api.getContrast('#a0a0a0', '#FFFFFF')).toBe(2.615);
      expect(api.getContrast('#767676', '#FFFFFF')).toBe(4.542);
    });

    it('should match the luminance examples', () => {
      expect(api.getLuminance('#00FF33')!.toFixed(6)).toBe('0.717590');
      expect(api.getLuminance('#fff')).toBe(1);
      expect(api.getLuminance('#gggggg')).toBe(null);
    });

    it('should match the predicate examples', () => {
      expect(api.isContrasting('#00FF33', '#FFFFFF', 1.3)).toBe(true);
      expect(api.isContrasting('#00FF33', '#FFFFFF', 4.5)).toBe(false);
      expect(api.isAAContrast('#00FF33', '#FFFFFF')).toBe(false);
      expect(api.isAAContrast('#00FF33', '#616161')).toBe(true);
      expect(api.isAAContrast('#00FF33', '#617765', true)).toBe(true);
      expect(api.isAAAContrast('#00FF33', '#613365')).toBe(true);
      expect(api.isAAAContrast('#00FF33', '#616161')).toBe(false);
      expect(api.isAAAContrast('#00FF33', '#616161', true)).toBe(true);
      expect(api.isNonTextContrast('#949494', '#FFFFFF')).toBe(true);
      expect(api.isNonTextContrast('#a0a0a0', '#FFFFFF')).toBe(false);
    });

    it('should match the level and report examples', () => {
      expect(api.getContrastLevel('#000000', '#FFFFFF')).toBe('AAA');
      expect(api.getContrastLevel('#767676', '#FFFFFF')).toBe('AA');
      expect(api.getContrastLevel('#949494', '#FFFFFF')).toBe('fail');
      expect(api.getContrastLevel('#949494', '#FFFFFF', 'large')).toBe('AA');
      expect(api.getContrastReport('#767676', '#FFFFFF')).toEqual({
        ratio: 4.542,
        normal: { aa: true, aaa: false },
        large: { aa: true, aaa: true },
        nonText: { passes: true },
        level: 'AA',
      });
    });

    it('should match the suggestion examples', () => {
      expect(api.suggestAAColorVariant('#00FF33', '#FFFFFF')).toBe('#008a17');
      expect(api.getContrast('#008a17', '#FFFFFF')).toBe(4.518);
      expect(api.suggestAAColorVariant('#00FF33', '#FFFFFF', true)).toBe(
        '#00ad1f'
      );
      expect(api.getContrast('#00ad1f', '#FFFFFF')).toBe(3.001);

      expect(api.suggestAAAColorVariant('#00FF33', '#FFFFFF')).toBe('#00680e');
      expect(api.getContrast('#00680e', '#FFFFFF')).toBe(7.032);
      expect(api.suggestAAAColorVariant('#00FF33', '#FFFFFF', true)).toBe(
        '#008a17'
      );
    });

    it('should match the conversion examples', () => {
      expect(api.hexToRgb('#aabbcc')).toEqual({ r: 170, g: 187, b: 204 });
      expect(api.hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
      expect(api.hexToRgb('nope')).toBe(null);
      expect(api.rgbToHex({ r: 170, g: 187, b: 204 })).toBe('#aabbcc');

      const hsl = api.hexToHsl('#aabbcc')!;
      expect(hsl.h).toBeCloseTo(0.5833, 4);
      expect(hsl.s).toBeCloseTo(0.25, 4);
      expect(hsl.l).toBeCloseTo(0.7333, 4);
    });
  });

  describe('completeness', () => {
    it('should document every exported function', () => {
      const undocumented = Object.keys(api)
        .filter((name) => typeof (api as never)[name] === 'function')
        .filter((name) => !readme.includes(`\`${name}\``));

      expect(undocumented).toEqual([]);
    });

    it('should state the accepted hex forms', () => {
      for (const form of ['#abc', '#abcd', '#aabbcc', '#aabbccdd']) {
        expect(readme).toContain(form);
      }
    });
  });
});
