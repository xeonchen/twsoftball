import { describe, it, expect } from 'vitest';
import { FieldPosition } from './FieldPosition';

describe('FieldPosition', () => {
  describe('Infield positions', () => {
    it('should have correct infield values', () => {
      expect(FieldPosition.PITCHER).toBe('P');
      expect(FieldPosition.CATCHER).toBe('C');
      expect(FieldPosition.FIRST_BASE).toBe('1B');
      expect(FieldPosition.SECOND_BASE).toBe('2B');
      expect(FieldPosition.THIRD_BASE).toBe('3B');
      expect(FieldPosition.SHORTSTOP).toBe('SS');
    });
  });

  describe('Outfield positions', () => {
    it('should have correct outfield values', () => {
      expect(FieldPosition.LEFT_FIELD).toBe('LF');
      expect(FieldPosition.CENTER_FIELD).toBe('CF');
      expect(FieldPosition.RIGHT_FIELD).toBe('RF');
    });
  });

  describe('Special positions', () => {
    it('should have correct special values', () => {
      expect(FieldPosition.SHORT_FIELDER).toBe('SF');
      expect(FieldPosition.EXTRA_PLAYER).toBe('EP');
    });
  });

  describe('Type validation', () => {
    it('should have all expected values', () => {
      const allValues = Object.values(FieldPosition);
      const expectedValues = [
        'P',
        'C',
        '1B',
        '2B',
        '3B',
        'SS', // Infield
        'LF',
        'CF',
        'RF', // Outfield
        'SF',
        'EP', // Special
      ];

      expect(allValues).toHaveLength(expectedValues.length);
      expectedValues.forEach(value => {
        expect(allValues).toContain(value);
      });
    });

    it('should be properly typed', () => {
      // Type test - should compile without error
      const pitcher: FieldPosition = FieldPosition.PITCHER;
      const outfield: FieldPosition = FieldPosition.LEFT_FIELD;
      const special: FieldPosition = FieldPosition.EXTRA_PLAYER;

      expect(pitcher).toBeDefined();
      expect(outfield).toBeDefined();
      expect(special).toBeDefined();
    });
  });
});
