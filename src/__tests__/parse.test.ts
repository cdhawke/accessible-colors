import { parseColor } from '../parse';
import { getContrast, getLuminance, isAAContrast } from '..';

const RED = { r: 255, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

describe('parseColor', () => {
  describe('hex', () => {
    it('should parse every hex form', () => {
      expect(parseColor('#f00')).toEqual(RED);
      expect(parseColor('#ff0000')).toEqual(RED);
      expect(parseColor('#ff0000ff')).toEqual(RED);
      expect(parseColor('#f00f')).toEqual(RED);
      expect(parseColor('ff0000')).toEqual(RED);
    });
  });

  describe('rgb()', () => {
    it('should parse legacy comma syntax', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual(RED);
      expect(parseColor('rgb(255,0,0)')).toEqual(RED);
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual(RED);
      expect(parseColor('rgba(255, 0, 0, 50%)')).toEqual(RED);
    });

    it('should parse modern space syntax', () => {
      expect(parseColor('rgb(255 0 0)')).toEqual(RED);
      expect(parseColor('rgb(255 0 0 / 0.5)')).toEqual(RED);
      expect(parseColor('rgb(255 0 0 / 50%)')).toEqual(RED);
      expect(parseColor('rgb(  255   0   0  )')).toEqual(RED);
    });

    it('should parse percentage channels', () => {
      expect(parseColor('rgb(100%, 0%, 0%)')).toEqual(RED);
      expect(parseColor('rgb(100% 0% 0%)')).toEqual(RED);
      expect(parseColor('rgb(0%, 0%, 0%)')).toEqual(BLACK);
    });

    it('should clamp out-of-range channels the way CSS does', () => {
      expect(parseColor('rgb(300, -20, 0)')).toEqual(RED);
      expect(parseColor('rgb(999% 0% 0%)')).toEqual(RED);
    });

    it('should round fractional channels', () => {
      expect(parseColor('rgb(255.4, 0.5, 0)')).toEqual({ r: 255, g: 1, b: 0 });
    });

    it('should be case insensitive', () => {
      expect(parseColor('RGB(255, 0, 0)')).toEqual(RED);
      expect(parseColor('RGBA(255 0 0 / 1)')).toEqual(RED);
    });

    it('should reject malformed input', () => {
      expect(parseColor('rgb(255, 0)')).toBe(null);
      expect(parseColor('rgb(255, 0, 0, 0, 0)')).toBe(null);
      expect(parseColor('rgb()')).toBe(null);
      expect(parseColor('rgb(a, b, c)')).toBe(null);
      expect(parseColor('rgb(255 0 0')).toBe(null);
      expect(parseColor('rgb 255 0 0')).toBe(null);
      // Mixing legacy commas with a slash alpha is not valid CSS.
      expect(parseColor('rgb(255, 0, 0 / 0.5)')).toBe(null);
    });
  });

  describe('hsl()', () => {
    it('should parse legacy comma syntax', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toEqual(RED);
      expect(parseColor('hsla(0, 100%, 50%, 0.5)')).toEqual(RED);
    });

    it('should parse modern space syntax', () => {
      expect(parseColor('hsl(0 100% 50%)')).toEqual(RED);
      expect(parseColor('hsl(0 100% 50% / 0.5)')).toEqual(RED);
    });

    it('should parse every angle unit', () => {
      expect(parseColor('hsl(120deg, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(parseColor('hsl(0.3333333turn, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(parseColor('hsl(133.3333grad, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(parseColor('hsl(2.0943951rad, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
    });

    it('should wrap hues rather than clamp them', () => {
      // -90deg and 270deg are the same hue.
      expect(parseColor('hsl(-90, 100%, 50%)')).toEqual(
        parseColor('hsl(270, 100%, 50%)')
      );
      expect(parseColor('hsl(480, 100%, 50%)')).toEqual(
        parseColor('hsl(120, 100%, 50%)')
      );
    });

    it('should clamp saturation and lightness', () => {
      expect(parseColor('hsl(0, 200%, 50%)')).toEqual(RED);
      expect(parseColor('hsl(0, 100%, 150%)')).toEqual(WHITE);
      expect(parseColor('hsl(0, 100%, -50%)')).toEqual(BLACK);
    });

    it('should require percentages for saturation and lightness', () => {
      // CSS requires the percent sign here; bare numbers are invalid.
      expect(parseColor('hsl(0, 100, 50)')).toBe(null);
    });

    it('should reject malformed input', () => {
      expect(parseColor('hsl(0, 100%)')).toBe(null);
      expect(parseColor('hsl(deg, 100%, 50%)')).toBe(null);
      expect(parseColor('hsl(0, 100%, 50%, 0.5, 1)')).toBe(null);
    });
  });

  describe('unsupported and invalid input', () => {
    it('should return null for formats that are not yet supported', () => {
      // Documented as unsupported — must return null, never a guess.
      expect(parseColor('red')).toBe(null);
      expect(parseColor('rebeccapurple')).toBe(null);
      expect(parseColor('oklch(0.7 0.15 250)')).toBe(null);
      expect(parseColor('lab(50% 40 59)')).toBe(null);
      expect(parseColor('color(display-p3 1 0 0)')).toBe(null);
      expect(parseColor('currentColor')).toBe(null);
      expect(parseColor('transparent')).toBe(null);
    });

    it('should return null for garbage', () => {
      for (const bad of ['', '   ', 'nope', '#gggggg', '()', 'rgb']) {
        expect(parseColor(bad)).toBe(null);
      }
    });

    it('should accept hex without a leading hash, as it always has', () => {
      // Inherited from 1.0.9, which stripped an optional `#` before parsing.
      // A consequence is that a bare digit string like '123' is a valid color
      // (#112233) even though CSS itself would require the hash. Kept for
      // backwards compatibility and documented rather than silently changed.
      expect(parseColor('123')).toEqual({ r: 17, g: 34, b: 51 });
      expect(parseColor('ffffff')).toEqual(WHITE);
      expect(parseColor('fff')).toEqual(WHITE);
    });

    it('should not throw on non-string input', () => {
      for (const bad of [null, undefined, 42, {}, []]) {
        expect(parseColor(bad as unknown as string)).toBe(null);
      }
    });
  });

  describe('equivalence across formats', () => {
    it('should give identical results for the same color in any notation', () => {
      const forms = [
        '#ff0000',
        '#f00',
        'rgb(255, 0, 0)',
        'rgb(255 0 0)',
        'rgb(100%, 0%, 0%)',
        'hsl(0, 100%, 50%)',
        'hsl(0deg 100% 50%)',
      ];
      const expected = getLuminance('#ff0000');
      for (const form of forms) {
        expect(parseColor(form)).toEqual(RED);
        expect(getLuminance(form)).toBe(expected);
      }
    });
  });

  describe('integration with the public API', () => {
    it('should accept CSS formats everywhere a color is taken', () => {
      expect(getContrast('rgb(255 255 255)', 'rgb(0 0 0)')).toBe(21);
      expect(getContrast('hsl(0 0% 100%)', 'hsl(0 0% 0%)')).toBe(21);
      expect(isAAContrast('rgb(0,0,0)', '#fff')).toBe(true);
      expect(getContrast('rgb(255 255 255)', '#000')).toBe(21);
    });

    it('should still return null rather than a verdict for bad input', () => {
      expect(isAAContrast('rgb(a,b,c)', '#ffffff')).toBe(null);
      expect(getContrast('oklch(0.7 0.15 250)', '#ffffff')).toBe(null);
    });
  });
});
