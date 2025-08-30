import { describe, it, expect } from 'vitest';
import { ValueObjectTestHelper } from './ValueObjectTestHelper';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { Score } from '../value-objects/Score';

describe('ValueObjectTestHelper', () => {
  describe('createValidationScenarios', () => {
    it('should create validation scenarios with valid and invalid values', () => {
      const validValues = ['10', '99', '1'];
      const invalidValues = [
        { value: '', error: 'Jersey number cannot be empty' },
        { value: 'abc', error: 'Jersey number must be numeric' },
        { value: null, error: 'Jersey number is required' },
      ];

      const scenarios = ValueObjectTestHelper.createValidationScenarios(validValues, invalidValues);

      expect(scenarios.valid).toEqual(validValues);
      expect(scenarios.invalid).toEqual(invalidValues);
      expect(scenarios.invalid[0]!.value).toBe('');
      expect(scenarios.invalid[0]!.error).toBe('Jersey number cannot be empty');
    });

    it('should handle empty valid values array', () => {
      const validValues: string[] = [];
      const invalidValues = [{ value: 'bad', error: 'Bad value' }];

      const scenarios = ValueObjectTestHelper.createValidationScenarios(validValues, invalidValues);

      expect(scenarios.valid).toEqual([]);
      expect(scenarios.invalid).toHaveLength(1);
    });

    it('should handle empty invalid values array', () => {
      const validValues = ['good1', 'good2'];
      const invalidValues: Array<{ value: unknown; error: string }> = [];

      const scenarios = ValueObjectTestHelper.createValidationScenarios(validValues, invalidValues);

      expect(scenarios.valid).toEqual(validValues);
      expect(scenarios.invalid).toEqual([]);
    });
  });

  describe('assertValidConstructor', () => {
    it('should not throw when constructor is valid', () => {
      expect(() => ValueObjectTestHelper.assertValidConstructor(JerseyNumber, '10')).not.toThrow();
    });

    it('should create and verify instance properties', () => {
      const result = ValueObjectTestHelper.assertValidConstructor(JerseyNumber, '25');

      expect(result).toBeInstanceOf(JerseyNumber);
      expect(result.value).toBe('25');
    });

    it('should work with numeric value objects', () => {
      const result = ValueObjectTestHelper.assertValidConstructor(Score, 10);

      expect(result).toBeInstanceOf(Score);
      expect(result.runs).toBe(10);
    });

    it('should return the created instance for further testing', () => {
      const instance = ValueObjectTestHelper.assertValidConstructor(Score, 5);

      // Can use returned instance for additional assertions
      expect(instance.runs).toBe(5);
      expect(typeof instance.runs).toBe('number');
    });
  });

  describe('assertInvalidConstructor', () => {
    it('should not throw when expected error is thrown', () => {
      expect(() =>
        ValueObjectTestHelper.assertInvalidConstructor(
          JerseyNumber,
          '',
          'Jersey number cannot be empty or whitespace'
        )
      ).not.toThrow();
    });

    it('should throw when constructor does not throw expected error', () => {
      expect(() =>
        ValueObjectTestHelper.assertInvalidConstructor(
          JerseyNumber,
          '10', // This is valid, should not throw
          'Expected error message'
        )
      ).toThrow('Expected constructor to throw error with message: "Expected error message"');
    });

    it('should throw when wrong error message is thrown', () => {
      expect(() =>
        ValueObjectTestHelper.assertInvalidConstructor(
          JerseyNumber,
          '', // This throws "Jersey number cannot be empty or whitespace"
          'Different expected error'
        )
      ).toThrow(
        'Expected error message: "Different expected error", but got: "Jersey number cannot be empty or whitespace"'
      );
    });

    it('should throw when non-DomainError is thrown', () => {
      class ThrowsRegularError {
        constructor() {
          throw new Error('Regular error');
        }
      }

      expect(() =>
        ValueObjectTestHelper.assertInvalidConstructor(
          ThrowsRegularError as new (value: unknown) => unknown,
          'anything',
          'Expected domain error'
        )
      ).toThrow('Expected DomainError, but got: Error');
    });

    it('should work with numeric value validation', () => {
      expect(() =>
        ValueObjectTestHelper.assertInvalidConstructor(
          Score,
          -1,
          'Score must be a non-negative integer'
        )
      ).not.toThrow();
    });
  });

  describe('integration with value object testing patterns', () => {
    it('should work with complete value object test scenarios', () => {
      // Example of how this helper would be used in actual value object tests
      const jerseyScenarios = ValueObjectTestHelper.createValidationScenarios(
        ['1', '10', '99'],
        [
          { value: '', error: 'Jersey number cannot be empty or whitespace' },
          { value: 'abc', error: 'Jersey number must be numeric' },
          { value: null, error: 'Jersey number cannot be empty or whitespace' },
          { value: undefined, error: 'Jersey number cannot be empty or whitespace' },
        ]
      );

      // Test all valid scenarios
      jerseyScenarios.valid.forEach(validValue => {
        const instance = ValueObjectTestHelper.assertValidConstructor(JerseyNumber, validValue);
        expect(instance.value).toBe(validValue);
      });

      // Test all invalid scenarios
      jerseyScenarios.invalid.forEach(invalidScenario => {
        ValueObjectTestHelper.assertInvalidConstructor<JerseyNumber, string>(
          JerseyNumber,
          invalidScenario.value as string,
          invalidScenario.error
        );
      });
    });

    it('should simplify score validation testing', () => {
      const scoreScenarios = ValueObjectTestHelper.createValidationScenarios(
        [0, 1, 10, 25],
        [
          { value: -1, error: 'Score must be a non-negative integer' },
          { value: 1.5, error: 'Score must be a non-negative integer' },
          { value: 'text', error: 'Score must be a non-negative integer' },
          { value: null, error: 'Score must be a non-negative integer' },
        ]
      );

      // All valid scores should work
      scoreScenarios.valid.forEach(validScore => {
        const score = ValueObjectTestHelper.assertValidConstructor(Score, validScore);
        expect(score.runs).toBe(validScore);
      });

      // All invalid scores should fail with expected messages
      scoreScenarios.invalid.forEach(invalidScenario => {
        ValueObjectTestHelper.assertInvalidConstructor<Score, number>(
          Score,
          invalidScenario.value as number,
          invalidScenario.error
        );
      });
    });
  });
});
