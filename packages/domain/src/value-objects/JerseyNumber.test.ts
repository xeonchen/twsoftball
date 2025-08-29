import { describe, it, expect } from 'vitest';
import { JerseyNumber } from './JerseyNumber';
import { DomainError } from '../errors/DomainError';

describe('JerseyNumber', () => {
  describe('Construction', () => {
    it('should create JerseyNumber with valid string value', () => {
      const jerseyNumber = new JerseyNumber('15');

      expect(jerseyNumber.value).toBe('15');
    });

    it('should accept single digit numbers', () => {
      const jerseyNumber = new JerseyNumber('5');

      expect(jerseyNumber.value).toBe('5');
    });

    it('should accept two digit numbers', () => {
      const jerseyNumber = new JerseyNumber('99');

      expect(jerseyNumber.value).toBe('99');
    });

    it('should accept leading zeros', () => {
      const jerseyNumber = new JerseyNumber('05');

      expect(jerseyNumber.value).toBe('05');
    });

    it('should reject empty string', () => {
      expect(() => new JerseyNumber('')).toThrow(DomainError);
      expect(() => new JerseyNumber('')).toThrow('Jersey number cannot be empty or whitespace');
    });

    it('should reject whitespace-only string', () => {
      expect(() => new JerseyNumber('   ')).toThrow(DomainError);
      expect(() => new JerseyNumber('   ')).toThrow('Jersey number cannot be empty or whitespace');
    });

    it('should reject numbers greater than 99', () => {
      expect(() => new JerseyNumber('100')).toThrow(DomainError);
      expect(() => new JerseyNumber('100')).toThrow('Jersey number must be between 1 and 99');
    });

    it('should reject zero', () => {
      expect(() => new JerseyNumber('0')).toThrow(DomainError);
      expect(() => new JerseyNumber('0')).toThrow('Jersey number must be between 1 and 99');
    });

    it('should reject non-numeric strings', () => {
      expect(() => new JerseyNumber('AB')).toThrow(DomainError);
      expect(() => new JerseyNumber('AB')).toThrow('Jersey number must be numeric');
    });

    it('should reject mixed alphanumeric strings', () => {
      expect(() => new JerseyNumber('1A')).toThrow(DomainError);
      expect(() => new JerseyNumber('1A')).toThrow('Jersey number must be numeric');
    });

    it('should reject decimal numbers', () => {
      expect(() => new JerseyNumber('12.5')).toThrow(DomainError);
      expect(() => new JerseyNumber('12.5')).toThrow('Jersey number must be numeric');
    });

    it('should reject negative numbers', () => {
      expect(() => new JerseyNumber('-5')).toThrow(DomainError);
      expect(() => new JerseyNumber('-5')).toThrow('Jersey number must be numeric');
    });

    it('should handle string numbers with leading/trailing whitespace', () => {
      expect(() => new JerseyNumber(' 15 ')).toThrow(DomainError);
      expect(() => new JerseyNumber(' 15 ')).toThrow('Jersey number must be numeric');
    });
  });

  describe('Validation', () => {
    it('should accept all valid jersey numbers from 1 to 99', () => {
      // Test boundary values and some middle values
      const validNumbers = ['1', '2', '9', '10', '50', '98', '99'];

      validNumbers.forEach(number => {
        expect(() => new JerseyNumber(number)).not.toThrow();
        const jersey = new JerseyNumber(number);
        expect(jersey.value).toBe(number);
      });
    });

    it('should preserve original string format', () => {
      const jersey1 = new JerseyNumber('01');
      const jersey2 = new JerseyNumber('1');

      expect(jersey1.value).toBe('01');
      expect(jersey2.value).toBe('1');
      expect(jersey1.equals(jersey2)).toBe(false); // Different string representations
    });
  });

  describe('Equality', () => {
    it('should be equal when values are the same', () => {
      const jersey1 = new JerseyNumber('42');
      const jersey2 = new JerseyNumber('42');

      expect(jersey1.equals(jersey2)).toBe(true);
      expect(jersey2.equals(jersey1)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const jersey1 = new JerseyNumber('12');
      const jersey2 = new JerseyNumber('21');

      expect(jersey1.equals(jersey2)).toBe(false);
      expect(jersey2.equals(jersey1)).toBe(false);
    });

    it('should not be equal for different string formats of same number', () => {
      const jersey1 = new JerseyNumber('01');
      const jersey2 = new JerseyNumber('1');

      expect(jersey1.equals(jersey2)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const jerseyNumber = new JerseyNumber('23');

      expect(jerseyNumber.equals(null as unknown as JerseyNumber)).toBe(false);
      expect(jerseyNumber.equals(undefined as unknown as JerseyNumber)).toBe(false);
    });
  });

  describe('Numeric operations', () => {
    it('should return numeric value', () => {
      const jersey1 = new JerseyNumber('15');
      const jersey2 = new JerseyNumber('05');

      expect(jersey1.toNumber()).toBe(15);
      expect(jersey2.toNumber()).toBe(5);
    });

    it('should support numeric comparison while preserving string format', () => {
      const jersey1 = new JerseyNumber('05');
      const jersey2 = new JerseyNumber('5');

      expect(jersey1.toNumber()).toBe(jersey2.toNumber());
      expect(jersey1.equals(jersey2)).toBe(false); // String format preserved
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const jerseyNumber = new JerseyNumber('77');

      // Value should be readonly (TypeScript enforced)
      expect(jerseyNumber.value).toBe('77');

      // Should not have any methods that mutate state
      const keys = Object.getOwnPropertyNames(JerseyNumber.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should support JSON serialization', () => {
      const jerseyNumber = new JerseyNumber('33');

      const serialized = JSON.stringify(jerseyNumber);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBe('33');
    });

    it('should have meaningful string representation', () => {
      const jerseyNumber = new JerseyNumber('88');

      expect(jerseyNumber.toString()).toBe('88');
    });
  });

  describe('Static factory methods', () => {
    it('should create from number', () => {
      const jersey = JerseyNumber.fromNumber(42);

      expect(jersey.value).toBe('42');
      expect(jersey.toNumber()).toBe(42);
    });

    it('should validate number in factory method', () => {
      expect(() => JerseyNumber.fromNumber(0)).toThrow(DomainError);
      expect(() => JerseyNumber.fromNumber(100)).toThrow(DomainError);
      expect(() => JerseyNumber.fromNumber(-5)).toThrow(DomainError);
      expect(() => JerseyNumber.fromNumber(3.14)).toThrow(DomainError);
    });

    it('should handle single digit numbers in factory', () => {
      const jersey = JerseyNumber.fromNumber(7);

      expect(jersey.value).toBe('7');
      expect(jersey.toNumber()).toBe(7);
    });
  });
});
