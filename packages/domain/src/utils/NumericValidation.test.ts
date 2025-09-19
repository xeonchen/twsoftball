import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';

import { NumericValidation } from './NumericValidation.js';

describe('NumericValidation', () => {
  describe('validateNumber', () => {
    it('should accept valid finite numbers', () => {
      expect(() => NumericValidation.validateNumber(0, 'test')).not.toThrow();
      expect(() => NumericValidation.validateNumber(42, 'test')).not.toThrow();
      expect(() => NumericValidation.validateNumber(-5, 'test')).not.toThrow();
      expect(() => NumericValidation.validateNumber(3.14, 'test')).not.toThrow();
      expect(() => NumericValidation.validateNumber(Number.MAX_SAFE_INTEGER, 'test')).not.toThrow();
      expect(() => NumericValidation.validateNumber(Number.MIN_SAFE_INTEGER, 'test')).not.toThrow();
    });

    it('should reject NaN', () => {
      expect(() => NumericValidation.validateNumber(NaN, 'score')).toThrow(
        new DomainError('score must be a valid number')
      );
    });

    it('should reject positive infinity', () => {
      expect(() => NumericValidation.validateNumber(Infinity, 'runs')).toThrow(
        new DomainError('runs must be a valid number')
      );
    });

    it('should reject negative infinity', () => {
      expect(() => NumericValidation.validateNumber(-Infinity, 'outs')).toThrow(
        new DomainError('outs must be a valid number')
      );
    });

    it('should reject non-number types', () => {
      expect(() => NumericValidation.validateNumber('42' as unknown as number, 'inning')).toThrow(
        new DomainError('inning must be a valid number')
      );

      expect(() => NumericValidation.validateNumber(null as unknown as number, 'position')).toThrow(
        new DomainError('position must be a valid number')
      );

      expect(() =>
        NumericValidation.validateNumber(undefined as unknown as number, 'jersey')
      ).toThrow(
        expect.objectContaining({
          message: 'jersey must be a valid number',
          name: 'DomainError',
        }) as Error
      );

      expect(() => NumericValidation.validateNumber([] as unknown as number, 'count')).toThrow(
        new DomainError('count must be a valid number')
      );

      expect(() => NumericValidation.validateNumber({} as unknown as number, 'value')).toThrow(
        new DomainError('value must be a valid number')
      );
    });

    it('should include field name in error message', () => {
      expect(() => NumericValidation.validateNumber(NaN, 'batting average')).toThrow(
        new DomainError('batting average must be a valid number')
      );

      expect(() => NumericValidation.validateNumber(Infinity, 'player count')).toThrow(
        new DomainError('player count must be a valid number')
      );
    });
  });

  describe('validatePositiveInteger', () => {
    it('should accept zero and positive integers', () => {
      expect(() => NumericValidation.validatePositiveInteger(0, 'outs')).not.toThrow();
      expect(() => NumericValidation.validatePositiveInteger(1, 'runs')).not.toThrow();
      expect(() => NumericValidation.validatePositiveInteger(42, 'jersey')).not.toThrow();
      expect(() => NumericValidation.validatePositiveInteger(999, 'score')).not.toThrow();
    });

    it('should reject negative numbers', () => {
      expect(() => NumericValidation.validatePositiveInteger(-1, 'runs')).toThrow(
        new DomainError('runs cannot be negative')
      );

      expect(() => NumericValidation.validatePositiveInteger(-42, 'score')).toThrow(
        new DomainError('score cannot be negative')
      );
    });

    it('should reject decimal numbers', () => {
      expect(() => NumericValidation.validatePositiveInteger(3.5, 'inning')).toThrow(
        new DomainError('inning must be an integer')
      );

      expect(() => NumericValidation.validatePositiveInteger(0.1, 'outs')).toThrow(
        new DomainError('outs must be an integer')
      );

      expect(() => NumericValidation.validatePositiveInteger(99.99, 'jersey')).toThrow(
        new DomainError('jersey must be an integer')
      );
    });

    it('should reject invalid numbers (inherits from validateNumber)', () => {
      expect(() => NumericValidation.validatePositiveInteger(NaN, 'count')).toThrow(
        new DomainError('count must be a valid number')
      );

      expect(() => NumericValidation.validatePositiveInteger(Infinity, 'position')).toThrow(
        new DomainError('position must be a valid number')
      );
    });

    it('should include field name in error messages', () => {
      expect(() => NumericValidation.validatePositiveInteger(-5, 'player count')).toThrow(
        new DomainError('player count cannot be negative')
      );

      expect(() => NumericValidation.validatePositiveInteger(2.5, 'batting slot')).toThrow(
        new DomainError('batting slot must be an integer')
      );
    });
  });

  describe('validateIntegerRange', () => {
    it('should accept integers within range (inclusive)', () => {
      expect(() => NumericValidation.validateIntegerRange(5, 1, 10, 'position')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(1, 1, 10, 'minimum')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(10, 1, 10, 'maximum')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(0, 0, 2, 'outs')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(2, 0, 2, 'outs')).not.toThrow();
    });

    it('should reject values below minimum', () => {
      expect(() => NumericValidation.validateIntegerRange(0, 1, 20, 'batting slot')).toThrow(
        new DomainError('batting slot must be between 1 and 20, got 0')
      );

      expect(() => NumericValidation.validateIntegerRange(-1, 0, 2, 'outs')).toThrow(
        new DomainError('outs must be between 0 and 2, got -1')
      );
    });

    it('should reject values above maximum', () => {
      expect(() => NumericValidation.validateIntegerRange(21, 1, 20, 'batting slot')).toThrow(
        new DomainError('batting slot must be between 1 and 20, got 21')
      );

      expect(() => NumericValidation.validateIntegerRange(3, 0, 2, 'outs')).toThrow(
        new DomainError('outs must be between 0 and 2, got 3')
      );
    });

    it('should reject non-integers (inherits from validatePositiveInteger)', () => {
      expect(() => NumericValidation.validateIntegerRange(3.5, 1, 10, 'inning')).toThrow(
        new DomainError('inning must be an integer')
      );
    });

    it('should accept negative values when range allows it', () => {
      expect(() => NumericValidation.validateIntegerRange(-5, -10, 10, 'value')).not.toThrow();

      expect(() => NumericValidation.validateIntegerRange(-15, -10, 10, 'value')).toThrow(
        new DomainError('value must be between -10 and 10, got -15')
      );
    });

    it('should reject invalid numbers (inherits from validateNumber)', () => {
      expect(() => NumericValidation.validateIntegerRange(NaN, 1, 10, 'position')).toThrow(
        new DomainError('position must be a valid number')
      );
    });

    it('should include actual value in range error message', () => {
      expect(() => NumericValidation.validateIntegerRange(50, 1, 20, 'batting position')).toThrow(
        new DomainError('batting position must be between 1 and 20, got 50')
      );
    });

    it('should work with different ranges', () => {
      // Single value range
      expect(() => NumericValidation.validateIntegerRange(5, 5, 5, 'exact')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(4, 5, 5, 'exact')).toThrow(
        new DomainError('exact must be between 5 and 5, got 4')
      );

      // Large range
      expect(() => NumericValidation.validateIntegerRange(500, 1, 1000, 'large')).not.toThrow();
    });
  });

  describe('validateScore', () => {
    it('should accept valid team scores', () => {
      expect(() => NumericValidation.validateScore(0, 'HOME')).not.toThrow();
      expect(() => NumericValidation.validateScore(7, 'AWAY')).not.toThrow();
      expect(() => NumericValidation.validateScore(15, 'HOME')).not.toThrow();
      expect(() => NumericValidation.validateScore(1, 'AWAY')).not.toThrow();
    });

    it('should reject negative scores with team-specific error message', () => {
      expect(() => NumericValidation.validateScore(-1, 'HOME')).toThrow(
        new DomainError('HOME score must be a valid number')
      );

      expect(() => NumericValidation.validateScore(-5, 'AWAY')).toThrow(
        new DomainError('AWAY score must be a valid number')
      );
    });

    it('should reject decimal scores with team-specific error message', () => {
      expect(() => NumericValidation.validateScore(3.5, 'HOME')).toThrow(
        new DomainError('HOME score must be a valid number')
      );

      expect(() => NumericValidation.validateScore(0.1, 'AWAY')).toThrow(
        new DomainError('AWAY score must be a valid number')
      );
    });

    it('should reject invalid numbers with team-specific error message', () => {
      expect(() => NumericValidation.validateScore(NaN, 'HOME')).toThrow(
        new DomainError('HOME score must be a valid number')
      );

      expect(() => NumericValidation.validateScore(Infinity, 'AWAY')).toThrow(
        new DomainError('AWAY score must be a valid number')
      );
    });

    it('should maintain backward compatibility with exact error message format', () => {
      // This test ensures the error message format exactly matches existing patterns
      expect(() => NumericValidation.validateScore(-1, 'HOME')).toThrow(
        new DomainError('HOME score must be a valid number')
      );

      expect(() => NumericValidation.validateScore(3.14, 'AWAY')).toThrow(
        new DomainError('AWAY score must be a valid number')
      );
    });

    it('should work with different team names', () => {
      expect(() => NumericValidation.validateScore(5, 'VISITORS')).not.toThrow();
      expect(() => NumericValidation.validateScore(10, 'Team A')).not.toThrow();

      expect(() => NumericValidation.validateScore(-1, 'VISITORS')).toThrow(
        new DomainError('VISITORS score must be a valid number')
      );

      expect(() => NumericValidation.validateScore(2.5, 'Team A')).toThrow(
        new DomainError('Team A score must be a valid number')
      );
    });
  });

  describe('edge cases and integration', () => {
    it('should handle very large valid integers', () => {
      expect(() =>
        NumericValidation.validatePositiveInteger(Number.MAX_SAFE_INTEGER, 'large')
      ).not.toThrow();

      expect(() =>
        NumericValidation.validateIntegerRange(1000000, 1, 2000000, 'huge')
      ).not.toThrow();
    });

    it('should maintain consistent behavior across validation methods', () => {
      const invalidNumber = NaN;
      const fieldName = 'test';

      // All methods should reject NaN with appropriate error messages
      expect(() => NumericValidation.validateNumber(invalidNumber, fieldName)).toThrow(DomainError);

      expect(() => NumericValidation.validatePositiveInteger(invalidNumber, fieldName)).toThrow(
        DomainError
      );

      expect(() => NumericValidation.validateIntegerRange(invalidNumber, 1, 10, fieldName)).toThrow(
        DomainError
      );

      expect(() => NumericValidation.validateScore(invalidNumber, 'HOME')).toThrow(DomainError);
    });

    it('should validate zero appropriately in different contexts', () => {
      // Zero is valid for scores, outs, etc.
      expect(() => NumericValidation.validateNumber(0, 'zero')).not.toThrow();
      expect(() => NumericValidation.validatePositiveInteger(0, 'zero')).not.toThrow();
      expect(() => NumericValidation.validateIntegerRange(0, 0, 10, 'zero')).not.toThrow();
      expect(() => NumericValidation.validateScore(0, 'HOME')).not.toThrow();

      // But zero may be invalid for 1-based ranges
      expect(() => NumericValidation.validateIntegerRange(0, 1, 10, 'one-based')).toThrow(
        new DomainError('one-based must be between 1 and 10, got 0')
      );
    });
  });
});
