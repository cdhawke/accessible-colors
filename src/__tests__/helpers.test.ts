import {
  hslToHex,
  hexToHsl,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
} from '../helpers';

describe('helpers', () => {
  describe('rgb -> hex -> rgb', () => {
    it('should convert rgb to hex and back to rgb', () => {
      const rgb = { r: 255, g: 255, b: 255 };
      const hex = rgbToHex(rgb);
      const rgb2 = hexToRgb(hex);

      expect(rgb2).toEqual(rgb);
    });
  });

  describe('hex -> rgb -> hex', () => {
    it('should convert hex to rgb and back to hex', () => {
      const hex = '#ffffff';
      const rgb = hexToRgb(hex);
      const hex2 = rgbToHex(rgb);

      expect(hex2).toEqual(hex);
    });
  });

  describe('rgb -> hsl -> rgb', () => {
    it('should convert rgb to hsl and back to rgb', () => {
      const rgb = { r: 255, g: 255, b: 255 };
      const hsl = rgbToHsl(rgb);
      const rgb2 = hslToRgb(hsl);

      expect(rgb2).toEqual(rgb);
    });
  });

  describe('hsl -> rgb -> hsl', () => {
    it('should convert hsl to rgb and back to hsl', () => {
      const hsl = { h: 0.5, s: 0.1, l: 0.3 };
      const rgb = hslToRgb(hsl);
      const hsl2 = rgbToHsl(rgb);

      expect(hsl.h).toBeCloseTo(hsl2.h);
      expect(hsl.s).toBeCloseTo(hsl2.s);
      expect(hsl.l).toBeCloseTo(hsl2.l);
    });
  });

  describe('hex -> hsl -> hex', () => {
    it('should convert hex to hsl and back to hex', () => {
      const hex = '#fe30f1';
      const hsl = hexToHsl(hex);
      const hex2 = hslToHex(hsl);

      expect(hex2).toEqual(hex);
    });
  });

  describe('hsl -> hex -> hsl', () => {
    it('should convert hsl to hex and back to hsl', () => {
      const hsl = { h: 0.3, s: 0.3, l: 0.4 };
      const hex = hslToHex(hsl);
      const hsl2 = hexToHsl(hex);

      expect(hsl.h).toBeCloseTo(hsl2.h);
      expect(hsl.s).toBeCloseTo(hsl2.s);
      expect(hsl.l).toBeCloseTo(hsl2.l);
    });
  });
});
