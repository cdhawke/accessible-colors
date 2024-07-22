import {
  getContrast,
  getLuminance,
  suggestAAColorVariant,
  isAAContrast,
  randomColor,
  getRandomAAAColor,
} from '..';

describe('accessible-colors', () => {
  describe('getLuminance', () => {
    it('should return 0 for an empty string', () => {
      expect(getLuminance('')).toBe(null);
    });

    it('should calculate luminance', () => {
      expect(getLuminance('#000000')).toBe(0);
      expect(getLuminance('#ffffff')).toBe(1);
      expect(getLuminance('#ff0000')).toBe(0.2126);
      expect(getLuminance('#00ff00')).toBe(0.7152);
      expect(getLuminance('#0000ff')).toBe(0.0722);
      expect(getLuminance('#ff00ff')).toBe(0.2848);
      expect(getLuminance('#00ffff')).toBe(0.7874);
      expect(getLuminance('#ffff00')).toBe(0.9278);
    });
  });

  describe('getRandomAAAColor', () => {
    it('should return a valid color', () => {
      expect(getRandomAAAColor('#888888', true)).not.toBe(null);
    });
    it('should return null if unable to find a color', () => {
      expect(getRandomAAAColor('#888888', false)).toBe(null);
    });
  });

  describe('getContrast', () => {
    it('should return null if bad colors are provided', () => {
      expect(getContrast('', '')).toBe(null);
    });
    it('should calculate contrast', () => {
      expect(getContrast('#000000', '#ffffff')).toBe(21);
      expect(getContrast('#000000', '#000000')).toBe(1);
      expect(getContrast('#ff0000', '#00ff00')).toBe(2.914);
      expect(getContrast('#ff0000', '#0000ff')).toBe(2.149);
      expect(getContrast('#ff00ff', '#00ffff')).toBe(2.501);
      expect(getContrast('#ffff00', '#000000')).toBe(19.556);
      expect(getContrast('#ff', '#ff')).toBe(1);
      expect(getContrast('#ff0000', '#ff')).toBe(2.149);
    });
  });

  describe('isAAContrast', () => {
    it('should calculate AA contrast', () => {
      expect(isAAContrast('#000000', '#ffffff')).toBe(true);
      expect(isAAContrast('#000000', '#000000')).toBe(false);
      expect(isAAContrast('#000000', '#EABDBD')).toBe(true);
      expect(isAAContrast('#8B6F6F', '#EABDBD')).toBe(false);
      expect(isAAContrast('#6A4D4D', '#EABDBD')).toBe(false);
      expect(isAAContrast('#684B4B', '#EABDBD')).toBe(true);
    });
  });
  describe('suggestAAColor', () => {
    it('should return a color that has a contrast ratio of at least 4.5', () => {
      for (let i = 0; i < 100; i++) {
        const color = randomColor();
        const alternate = randomColor();
        const suggested = suggestAAColorVariant(color, alternate);
        const secondSuggestion = suggestAAColorVariant(alternate, color);
        const contrast = getContrast(suggested, alternate);
        const secondContrast = getContrast(secondSuggestion, color);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
        expect(contrast).toBeLessThanOrEqual(21);
        expect(secondContrast).toBeGreaterThanOrEqual(4.5);
        expect(secondContrast).toBeLessThanOrEqual(21);
      }
    });

    it('should return a color that has a contrast ratio of at least 3 for large text', () => {
      for (let i = 0; i < 100; i++) {
        const color = randomColor();
        const alternate = randomColor();
        const suggested = suggestAAColorVariant(color, alternate, true);
        const secondSuggestion = suggestAAColorVariant(alternate, color, true);
        const contrast = getContrast(suggested, alternate);
        const secondContrast = getContrast(secondSuggestion, color);
        expect(contrast).toBeGreaterThanOrEqual(3);
        expect(contrast).toBeLessThanOrEqual(21);
        expect(secondContrast).toBeGreaterThanOrEqual(3);
        expect(secondContrast).toBeLessThanOrEqual(21);
      }
    });
  });
});
