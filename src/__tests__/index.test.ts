import {
  getContrast,
  getLuminance,
  suggestAAColorVariant,
  suggestAAAColorVariant,
  isAAContrast,
  isAAAContrast,
  isContrasting,
  randomColor,
  getRandomAAColor,
  getRandomAAAColor,
  isNonTextContrast,
  getContrastLevel,
  getContrastReport,
} from '..';

describe('accessible-colors', () => {
  describe('getLuminance', () => {
    it('should return null for an empty string', () => {
      expect(getLuminance('')).toBe(null);
    });

    it('should return null for anything that is not a hex color', () => {
      // Regression: these used to parse to NaN, collapse to 0 via the bitwise
      // ops, and report as pure black — which then passed contrast checks.
      for (const bad of [
        'notacolor',
        '#gggggg',
        '#ff',
        '#12345',
        '#1234567',
        '#',
        'ffffff!',
        '   ',
      ]) {
        expect(getLuminance(bad)).toBe(null);
      }
    });

    it('should accept shorthand, alpha, and untrimmed hex', () => {
      expect(getLuminance('#fff')).toBe(getLuminance('#ffffff'));
      expect(getLuminance('#abc')).toBe(getLuminance('#aabbcc'));
      expect(getLuminance('#fffa')).toBe(getLuminance('#ffffff'));
      expect(getLuminance('#123456ff')).toBe(getLuminance('#123456'));
      expect(getLuminance('  #ffffff  ')).toBe(getLuminance('#ffffff'));
      expect(getLuminance('FFFFFF')).toBe(getLuminance('#ffffff'));
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

  describe('random accessible colors', () => {
    it('should return a valid color', () => {
      expect(getRandomAAAColor('#888888', true)).not.toBe(null);
    });

    it('should return null only when no color can satisfy the ratio', () => {
      // AAA against a mid grey is genuinely unsatisfiable: 7:1 needs a
      // luminance above 1 or below 0.
      expect(getRandomAAAColor('#888888', false)).toBe(null);
      expect(getRandomAAAColor('#808080', false)).toBe(null);
    });

    it('should never return null when a compliant color exists', () => {
      // Regression: uniform rejection sampling failed ~76% of the time for
      // `#777777`, where only 0.04% of RGB space meets AA.
      for (const background of [
        '#777777',
        '#808080',
        '#888888',
        '#ffffff',
        '#000000',
        '#4a90d9',
      ]) {
        for (let i = 0; i < 200; i++) {
          expect(getRandomAAColor(background)).not.toBe(null);
        }
      }
    });

    it('should only return colors that actually meet the standard', () => {
      for (let i = 0; i < 500; i++) {
        const background = randomColor();
        for (const large of [false, true]) {
          const aa = getRandomAAColor(background, large);
          if (aa !== null) {
            expect(isAAContrast(background, aa, large)).toBe(true);
          }
          const aaa = getRandomAAAColor(background, large);
          if (aaa !== null) {
            expect(isAAAContrast(background, aaa, large)).toBe(true);
          }
        }
      }
    });

    it('should return null for an invalid background', () => {
      expect(getRandomAAColor('nope')).toBe(null);
      expect(getRandomAAAColor('#ff')).toBe(null);
    });

    it('should be reproducible when given a seeded generator', () => {
      const seeded = () => {
        let state = 42;
        return () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
      };
      expect(getRandomAAColor('#ffffff', false, { random: seeded() })).toBe(
        getRandomAAColor('#ffffff', false, { random: seeded() })
      );
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
    });

    it('should return null when either color is invalid', () => {
      // Regression: `#ff` is not a color. These previously returned confident
      // numbers (1 and 2.149) derived from garbage.
      expect(getContrast('#ff', '#ff')).toBe(null);
      expect(getContrast('#ff0000', '#ff')).toBe(null);
      expect(getContrast('#gggggg', '#ffffff')).toBe(null);
      expect(getContrast(null, '#ffffff')).toBe(null);
    });

    it('should treat shorthand hex as its expanded form', () => {
      // Regression: `#fff` parsed as the integer 0xfff, giving 2.512 here.
      expect(getContrast('#fff', '#000')).toBe(21);
      expect(getContrast('#f00', '#0f0')).toBe(
        getContrast('#ff0000', '#00ff00')
      );
    });
  });

  describe('threshold comparisons', () => {
    it('should not round a sub-threshold ratio up into a pass', () => {
      // Regression: these pairs sit just under their threshold but round to
      // exactly it at 3dp, and were reported as compliant.
      expect(getContrast('#8c2177', '#9bc7e5')).toBe(4.5);
      expect(isAAContrast('#8c2177', '#9bc7e5')).toBe(false);

      expect(getContrast('#c3dfc2', '#7442bd')).toBe(4.5);
      expect(isAAContrast('#c3dfc2', '#7442bd')).toBe(false);

      expect(getContrast('#bf24ca', '#5a0103')).toBe(3);
      expect(isAAContrast('#bf24ca', '#5a0103', true)).toBe(false);
    });

    it('should return null rather than a verdict for invalid input', () => {
      // The critical property: never report `true` for input we did not parse.
      expect(isAAContrast('#gggggg', '#ffffff')).toBe(null);
      expect(isAAAContrast('notacolor', '#ffffff')).toBe(null);
      expect(isContrasting('#ff', '#ffffff', 4.5)).toBe(null);
    });

    it('should agree with the exact ratio at every threshold', () => {
      for (let i = 0; i < 5000; i++) {
        const a = randomColor();
        const b = randomColor();
        const l1 = getLuminance(a) as number;
        const l2 = getLuminance(b) as number;
        const exact = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        for (const threshold of [3, 4.5, 7]) {
          expect(isContrasting(a, b, threshold)).toBe(exact >= threshold);
        }
      }
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

  describe('WCAG 2.1 coverage', () => {
    describe('isNonTextContrast', () => {
      it('should apply the 3:1 threshold from SC 1.4.11', () => {
        expect(isNonTextContrast('#767676', '#ffffff')).toBe(true); // 4.54
        expect(isNonTextContrast('#949494', '#ffffff')).toBe(true); // 3.03
        expect(isNonTextContrast('#a0a0a0', '#ffffff')).toBe(false); // 2.66
        expect(isNonTextContrast('nope', '#ffffff')).toBe(null);
      });
    });

    describe('getContrastLevel', () => {
      it('should report the highest level achieved per content type', () => {
        expect(getContrastLevel('#000000', '#ffffff')).toBe('AAA'); // 21
        expect(getContrastLevel('#767676', '#ffffff')).toBe('AA'); // 4.54
        expect(getContrastLevel('#949494', '#ffffff')).toBe('fail'); // 3.03
        expect(getContrastLevel('#949494', '#ffffff', 'large')).toBe('AA');
        expect(getContrastLevel('#767676', '#ffffff', 'large')).toBe('AAA');
      });

      it('should never report AAA for non-text, which defines no enhanced level', () => {
        expect(getContrastLevel('#000000', '#ffffff', 'non-text')).toBe('AA');
        expect(getContrastLevel('#949494', '#ffffff', 'non-text')).toBe('AA');
        expect(getContrastLevel('#a0a0a0', '#ffffff', 'non-text')).toBe('fail');
      });

      it('should return null for invalid input', () => {
        expect(getContrastLevel('#gg', '#ffffff')).toBe(null);
      });
    });

    describe('getContrastReport', () => {
      it('should agree with every individual predicate', () => {
        for (let i = 0; i < 2000; i++) {
          const a = randomColor();
          const b = randomColor();
          const report = getContrastReport(a, b)!;

          expect(report.ratio).toBe(getContrast(a, b));
          expect(report.normal.aa).toBe(isAAContrast(a, b));
          expect(report.normal.aaa).toBe(isAAAContrast(a, b));
          expect(report.large.aa).toBe(isAAContrast(a, b, true));
          expect(report.large.aaa).toBe(isAAAContrast(a, b, true));
          expect(report.nonText.passes).toBe(isNonTextContrast(a, b));
          expect(report.level).toBe(getContrastLevel(a, b));
        }
      });

      it('should return null for invalid input', () => {
        expect(getContrastReport('nope', '#ffffff')).toBe(null);
      });
    });
  });

  describe('suggestion compliance', () => {
    // Regression: in 1.0.9 the binary search terminated using the 3dp-rounded
    // contrast, so it accepted a candidate at 4.4996 as meeting 4.5. Measured
    // against the published 1.0.9 build, 2.19% of AA suggestions and 1.43% of
    // AAA suggestions were actually below their threshold — the differentiating
    // feature was emitting non-compliant colors.
    const exactRatio = (c1: string, c2: string) => {
      const l1 = getLuminance(c1) as number;
      const l2 = getLuminance(c2) as number;
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    it('should never suggest a color below the exact AA threshold', () => {
      for (let i = 0; i < 3000; i++) {
        const change = randomColor();
        const keep = randomColor();
        for (const [large, threshold] of [
          [false, 4.5],
          [true, 3],
        ] as const) {
          const suggestion = suggestAAColorVariant(change, keep, large);
          if (suggestion !== null) {
            expect(exactRatio(suggestion, keep)).toBeGreaterThanOrEqual(
              threshold
            );
          }
        }
      }
    });

    it('should never suggest a color below the exact AAA threshold', () => {
      for (let i = 0; i < 3000; i++) {
        const change = randomColor();
        const keep = randomColor();
        for (const [large, threshold] of [
          [false, 7],
          [true, 4.5],
        ] as const) {
          const suggestion = suggestAAAColorVariant(change, keep, large);
          if (suggestion !== null) {
            expect(exactRatio(suggestion, keep)).toBeGreaterThanOrEqual(
              threshold
            );
          }
        }
      }
    });

    it('should suggest compliant colors for the measured 1.0.9 failures', () => {
      // Pairs where 1.0.9 returned a suggestion at 4.4996-4.4999.
      const cases: Array<[string, string]> = [
        ['#283b66', '#bda44e'],
        ['#ddf3cf', '#a035d4'],
        ['#1d0441', '#6e8726'],
        ['#5e0261', '#6daa38'],
      ];
      for (const [change, keep] of cases) {
        const suggestion = suggestAAColorVariant(change, keep);
        expect(suggestion).not.toBe(null);
        expect(exactRatio(suggestion as string, keep)).toBeGreaterThanOrEqual(
          4.5
        );
      }
    });
  });
});
