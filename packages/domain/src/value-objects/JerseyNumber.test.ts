import { describe, it, expect } from 'vitest';
import { JerseyNumber } from './JerseyNumber';
import { ValueObjectTestHelper } from '../test-utils';
import { DomainError } from '../errors/DomainError';

describe('JerseyNumber', () => {
  describe('Construction', () => {
    // Test data for valid and invalid values
    const validValues = [
      { input: '15', description: 'two-digit number' },
      { input: '5', description: 'single digit number' },
      { input: '99', description: 'maximum valid number' },
      { input: '1', description: 'minimum valid number' },
      { input: '05', description: 'number with leading zero' },
    ];

    const invalidValues = [
      {
        input: '',
        error: 'Jersey number cannot be empty or whitespace',
        description: 'empty string',
      },
      {
        input: '   ',
        error: 'Jersey number cannot be empty or whitespace',
        description: 'whitespace-only string',
      },
      {
        input: '100',
        error: 'Jersey number must be between 1 and 99',
        description: 'number greater than 99',
      },
      { input: '0', error: 'Jersey number must be between 1 and 99', description: 'zero' },
      { input: 'AB', error: 'Jersey number must be numeric', description: 'non-numeric string' },
      {
        input: '1A',
        error: 'Jersey number must be numeric',
        description: 'mixed alphanumeric string',
      },
      { input: '12.5', error: 'Jersey number must be numeric', description: 'decimal number' },
      { input: '-5', error: 'Jersey number must be numeric', description: 'negative number' },
      {
        input: ' 15 ',
        error: 'Jersey number must be numeric',
        description: 'number with whitespace',
      },
    ];

    it('should create JerseyNumber with valid values', () => {
      validValues.forEach(({ input }) => {
        const jersey = ValueObjectTestHelper.assertValidConstructor(JerseyNumber, input);
        expect(jersey.value).toBe(input);
      });
    });

    it('should reject invalid values with appropriate error messages', () => {
      invalidValues.forEach(({ input, error }) => {
        ValueObjectTestHelper.assertInvalidConstructor(JerseyNumber, input, error);
      });
    });
  });

  describe('Validation', () => {
    it('should accept all valid jersey numbers from 1 to 99', () => {
      const validNumbers = ['1', '2', '9', '10', '50', '98', '99'];
      const invalidScenarios = [
        { value: '', error: 'Jersey number cannot be empty or whitespace' },
        { value: '   ', error: 'Jersey number cannot be empty or whitespace' },
        { value: '100', error: 'Jersey number must be between 1 and 99' },
        { value: '0', error: 'Jersey number must be between 1 and 99' },
        { value: 'AB', error: 'Jersey number must be numeric' },
        { value: '1A', error: 'Jersey number must be numeric' },
        { value: '12.5', error: 'Jersey number must be numeric' },
        { value: '-5', error: 'Jersey number must be numeric' },
        { value: ' 15 ', error: 'Jersey number must be numeric' },
      ];

      const scenarios = ValueObjectTestHelper.createValidationScenarios(
        validNumbers,
        invalidScenarios
      );

      scenarios.valid.forEach(number => {
        const jersey = ValueObjectTestHelper.assertValidConstructor(JerseyNumber, number);
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
    const equalityTestData = [
      {
        description: 'should be equal when values are the same',
        jersey1: '42',
        jersey2: '42',
        expected: true,
        bidirectional: true,
      },
      {
        description: 'should not be equal when values are different',
        jersey1: '12',
        jersey2: '21',
        expected: false,
        bidirectional: true,
      },
      {
        description: 'should not be equal for different string formats of same number',
        jersey1: '01',
        jersey2: '1',
        expected: false,
        bidirectional: false,
      },
    ];

    equalityTestData.forEach(({ description, jersey1, jersey2, expected, bidirectional }) => {
      it(description, () => {
        const j1 = new JerseyNumber(jersey1);
        const j2 = new JerseyNumber(jersey2);

        expect(j1.equals(j2)).toBe(expected);
        if (bidirectional) {
          expect(j2.equals(j1)).toBe(expected);
        }
      });
    });

    it('should not be equal when compared to different type', () => {
      const jerseyNumber = new JerseyNumber('23');

      expect(jerseyNumber.equals(null as unknown as JerseyNumber)).toBe(false);
      expect(jerseyNumber.equals(undefined as unknown as JerseyNumber)).toBe(false);
    });
  });

  describe('Numeric operations', () => {
    const numericTestData = [
      { input: '15', expected: 15, description: 'regular two-digit number' },
      { input: '05', expected: 5, description: 'number with leading zero' },
      { input: '1', expected: 1, description: 'single digit number' },
      { input: '99', expected: 99, description: 'maximum valid number' },
    ];

    it('should return correct numeric values', () => {
      numericTestData.forEach(({ input, expected }) => {
        const jersey = new JerseyNumber(input);
        expect(jersey.toNumber()).toBe(expected);
      });
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
    const validFactoryInputs = [
      { input: 42, expectedString: '42', description: 'two-digit number' },
      { input: 7, expectedString: '7', description: 'single digit number' },
      { input: 1, expectedString: '1', description: 'minimum valid number' },
      { input: 99, expectedString: '99', description: 'maximum valid number' },
    ];

    const invalidFactoryInputs = [
      { input: 0, description: 'zero' },
      { input: 100, description: 'number greater than 99' },
      { input: -5, description: 'negative number' },
      { input: 3.14, description: 'decimal number' },
    ];

    it('should create from valid numbers', () => {
      validFactoryInputs.forEach(({ input, expectedString }) => {
        const jersey = JerseyNumber.fromNumber(input);
        expect(jersey.value).toBe(expectedString);
        expect(jersey.toNumber()).toBe(input);
      });
    });

    it('should reject invalid numbers in factory method', () => {
      invalidFactoryInputs.forEach(({ input }) => {
        expect(() => JerseyNumber.fromNumber(input)).toThrow(DomainError);
      });
    });
  });
});
