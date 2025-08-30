/// <reference types="vitest/globals" />
import { DomainError } from '../errors/DomainError';

/**
 * Test helper for value object validation testing.
 *
 * @remarks
 * This utility reduces code duplication in value object test files by providing
 * generic validation patterns and assertion helpers. Designed to work with any
 * value object that follows the domain's constructor validation patterns.
 *
 * **Key Benefits:**
 * - Eliminates duplicated validation test code across value object tests
 * - Provides standardized test scenarios for valid/invalid value testing
 * - Offers generic assertion helpers that work with any constructor pattern
 * - Ensures consistent error handling validation across all value objects
 *
 * **Common Use Cases:**
 * - Creating comprehensive validation test scenarios for value objects
 * - Testing constructor validation with both valid and invalid inputs
 * - Asserting proper error messages are thrown for invalid values
 * - Verifying successful construction with valid inputs
 *
 * @example
 * ```typescript
 * // Create validation scenarios for a value object
 * const scenarios = ValueObjectTestHelper.createValidationScenarios(
 *   ['1', '10', '99'], // valid values
 *   [
 *     { value: '', error: 'Cannot be empty' },
 *     { value: null, error: 'Cannot be null' }
 *   ] // invalid values with expected errors
 * );
 *
 * // Test valid construction
 * scenarios.valid.forEach(validValue => {
 *   ValueObjectTestHelper.assertValidConstructor(JerseyNumber, validValue);
 * });
 *
 * // Test invalid construction with expected errors
 * scenarios.invalid.forEach(scenario => {
 *   ValueObjectTestHelper.assertInvalidConstructor(
 *     JerseyNumber,
 *     scenario.value,
 *     scenario.error
 *   );
 * });
 * ```
 */
export class ValueObjectTestHelper {
  /**
   * Creates structured validation scenarios for comprehensive value object testing.
   *
   * @template T - The type of valid values
   * @param validValues - Array of values that should construct successfully
   * @param invalidValues - Array of objects with invalid values and expected error messages
   * @returns Object containing valid and invalid test scenarios
   *
   * @example
   * ```typescript
   * const scenarios = ValueObjectTestHelper.createValidationScenarios(
   *   [1, 5, 10], // valid scores
   *   [
   *     { value: -1, error: 'Score cannot be negative' },
   *     { value: 1.5, error: 'Score must be whole number' },
   *     { value: 'text', error: 'Score must be numeric' }
   *   ]
   * );
   *
   * expect(scenarios.valid).toEqual([1, 5, 10]);
   * expect(scenarios.invalid[0].value).toBe(-1);
   * expect(scenarios.invalid[0].error).toBe('Score cannot be negative');
   * ```
   *
   * @remarks
   * This method standardizes the way validation scenarios are structured across
   * all value object tests. It separates valid inputs from invalid inputs with
   * their expected error messages, making test code more readable and maintainable.
   *
   * The returned structure can be easily iterated over in tests to verify both
   * positive and negative validation cases systematically.
   */
  public static createValidationScenarios<T>(
    validValues: T[],
    invalidValues: Array<{ value: unknown; error: string }>
  ): { valid: T[]; invalid: Array<{ value: unknown; error: string }> } {
    return {
      valid: validValues,
      invalid: invalidValues,
    };
  }

  /**
   * Asserts that a constructor successfully creates an instance with a valid value.
   *
   * @template T - The type of the value object being constructed
   * @param constructor - Constructor function for the value object
   * @param value - Valid value that should construct successfully
   * @returns The created instance for further assertions
   * @throws {Error} If the constructor throws an unexpected error
   *
   * @example
   * ```typescript
   * // Test valid construction
   * const score = ValueObjectTestHelper.assertValidConstructor(Score, 10);
   * expect(score.value).toBe(10);
   *
   * // Test valid string value object
   * const jersey = ValueObjectTestHelper.assertValidConstructor(JerseyNumber, '25');
   * expect(jersey.value).toBe('25');
   *
   * // Can chain additional assertions
   * const playerId = ValueObjectTestHelper.assertValidConstructor(PlayerId, 'player-1');
   * expect(playerId.toString()).toContain('player-1');
   * ```
   *
   * @remarks
   * This method encapsulates the common pattern of testing that a value object
   * constructor works correctly with valid input. It returns the created instance
   * so that additional specific assertions can be performed on the constructed object.
   *
   * If the constructor throws an error when it shouldn't, this method will let the
   * error propagate, causing the test to fail with clear error information.
   */
  public static assertValidConstructor<T, V = unknown>(
    constructor: new (value: V) => T,
    value: V
  ): T {
    // This should not throw for valid values
    const instance = new constructor(value);

    // Verify basic instance properties
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(constructor);

    return instance;
  }

  /**
   * Asserts that a constructor throws a DomainError with the expected message.
   *
   * @template T - The type of the value object being constructed
   * @param constructor - Constructor function for the value object
   * @param value - Invalid value that should cause constructor to throw
   * @param expectedError - Expected error message
   * @throws {Error} If constructor doesn't throw expected DomainError with correct message
   *
   * @example
   * ```typescript
   * // Test invalid score validation
   * ValueObjectTestHelper.assertInvalidConstructor(
   *   Score,
   *   -5,
   *   'Score cannot be negative'
   * );
   *
   * // Test invalid jersey number validation
   * ValueObjectTestHelper.assertInvalidConstructor(
   *   JerseyNumber,
   *   '',
   *   'Jersey number cannot be empty or whitespace'
   * );
   *
   * // Test null value validation
   * ValueObjectTestHelper.assertInvalidConstructor(
   *   PlayerId,
   *   null,
   *   'Player ID cannot be empty or whitespace'
   * );
   * ```
   *
   * @remarks
   * This method standardizes the testing of value object validation logic.
   * It ensures that:
   * 1. The constructor throws an error for invalid input
   * 2. The error is specifically a DomainError (not a generic Error)
   * 3. The error message matches exactly what is expected
   *
   * This helps maintain consistent error handling across all value objects
   * and ensures error messages are user-friendly and descriptive.
   */
  public static assertInvalidConstructor<T, V = unknown>(
    constructor: new (value: V) => T,
    value: V,
    expectedError: string
  ): void {
    let thrownError: Error | null = null;

    try {
      // eslint-disable-next-line no-new
      new constructor(value);
    } catch (error) {
      thrownError = error as Error;
    }

    if (!thrownError) {
      throw new Error(`Expected constructor to throw error with message: "${expectedError}"`);
    }

    if (!(thrownError instanceof DomainError)) {
      throw new Error(`Expected DomainError, but got: ${thrownError.constructor.name}`);
    }

    if (thrownError.message !== expectedError) {
      throw new Error(
        `Expected error message: "${expectedError}", but got: "${thrownError.message}"`
      );
    }
  }
}
