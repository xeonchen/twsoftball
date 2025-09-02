import { describe, it, expect } from 'vitest';

import { AtBatResultType } from './AtBatResultType';

describe('AtBatResultType', () => {
  describe('Hits', () => {
    it('should have correct hit values', () => {
      expect(AtBatResultType.SINGLE).toBe('1B');
      expect(AtBatResultType.DOUBLE).toBe('2B');
      expect(AtBatResultType.TRIPLE).toBe('3B');
      expect(AtBatResultType.HOME_RUN).toBe('HR');
    });
  });

  describe('On base (not hits)', () => {
    it('should have correct on-base values', () => {
      expect(AtBatResultType.WALK).toBe('BB');
      expect(AtBatResultType.ERROR).toBe('E');
      expect(AtBatResultType.FIELDERS_CHOICE).toBe('FC');
    });
  });

  describe('Outs', () => {
    it('should have correct out values', () => {
      expect(AtBatResultType.STRIKEOUT).toBe('SO');
      expect(AtBatResultType.GROUND_OUT).toBe('GO');
      expect(AtBatResultType.FLY_OUT).toBe('FO');
      expect(AtBatResultType.DOUBLE_PLAY).toBe('DP');
      expect(AtBatResultType.TRIPLE_PLAY).toBe('TP');
    });
  });

  describe('Sacrifice', () => {
    it('should have correct sacrifice values', () => {
      expect(AtBatResultType.SACRIFICE_FLY).toBe('SF');
    });
  });

  describe('Type validation', () => {
    it('should have all expected values', () => {
      const allValues = Object.values(AtBatResultType);
      const expectedValues = [
        '1B',
        '2B',
        '3B',
        'HR', // Hits
        'BB',
        'E',
        'FC', // On base (not hits)
        'SO',
        'GO',
        'FO',
        'DP',
        'TP', // Outs
        'SF', // Sacrifice
      ];

      expect(allValues).toHaveLength(expectedValues.length);
      expectedValues.forEach(value => {
        expect(allValues).toContain(value);
      });
    });

    it('should be properly typed', () => {
      // Type test - should compile without error
      const single: AtBatResultType = AtBatResultType.SINGLE;
      const walk: AtBatResultType = AtBatResultType.WALK;
      const out: AtBatResultType = AtBatResultType.STRIKEOUT;

      expect(single).toBeDefined();
      expect(walk).toBeDefined();
      expect(out).toBeDefined();
    });
  });
});
