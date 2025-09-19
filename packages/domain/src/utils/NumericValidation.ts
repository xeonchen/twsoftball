import { DomainError } from '../errors/DomainError.js';

/**
 * Utility class for numeric validation operations across the domain layer.
 *
 * @remarks
 * Provides centralized validation methods for numeric inputs, eliminating code
 * duplication across domain entities, value objects, and services. All validation
 * methods throw DomainError with consistent error messages when validation fails.
 *
 * **Design Principles:**
 * - Static utility methods for framework-agnostic usage
 * - Consistent error message formats matching existing domain patterns
 * - Composed validation methods building on simpler primitives
 * - Clear business context in error messages (what field failed, why it's invalid)
 *
 * **Validation Categories:**
 * - Basic number validation (NaN, finite, type checking)
 * - Integer validation (whole numbers, positive values)
 * - Range validation (min/max boundaries)
 * - Domain-specific validation (scores, innings, player counts)
 *
 * @example
 * ```typescript
 * // Basic number validation
 * NumericValidation.validateNumber(score, 'score');
 *
 * // Positive integer validation
 * NumericValidation.validatePositiveInteger(playerId, 'player ID');
 *
 * // Range validation
 * NumericValidation.validateIntegerRange(inning, 1, 9, 'inning');
 *
 * // Domain-specific validation
 * NumericValidation.validateScore(15, 'HOME');
 * ```
 */
export class NumericValidation {
  /**
   * Validates that a value is a valid number (not NaN, null, undefined, or infinite).
   *
   * @param value - The numeric value to validate
   * @param fieldName - The field name for error messages (e.g., 'score', 'inning')
   * @throws {DomainError} When value is not a valid finite number
   *
   * @remarks
   * This is the foundation validation method used by all other numeric validators.
   * Ensures the value is actually a number and can be used in calculations.
   * Rejects NaN, Infinity, -Infinity, and non-numeric types.
   *
   * **Business Context:** All numeric fields in the softball domain must be
   * concrete, calculable values. NaN or infinite values indicate data corruption
   * or invalid input that could break game logic.
   *
   * @example
   * ```typescript
   * NumericValidation.validateNumber(42, 'score');     //  Valid
   * NumericValidation.validateNumber(NaN, 'score');    //  Throws DomainError
   * NumericValidation.validateNumber(Infinity, 'runs'); //  Throws DomainError
   * ```
   */
  public static validateNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DomainError(`${fieldName} must be a valid number`);
    }
  }

  /**
   * Validates that a value is a non-negative integer (0, 1, 2, 3, ...).
   *
   * @param value - The numeric value to validate
   * @param fieldName - The field name for error messages
   * @throws {DomainError} When value is not a valid number, not an integer, or negative
   *
   * @remarks
   * Builds on basic number validation and adds integer and non-negative constraints.
   * Most softball statistics and counts are non-negative integers (runs, outs,
   * innings, player counts, etc.). This validation ensures data integrity for
   * these fundamental domain concepts.
   *
   * **Business Context:** In softball, most countable things cannot be negative:
   * - Runs scored (minimum 0)
   * - Outs recorded (0, 1, or 2 in most contexts)
   * - Inning numbers (1, 2, 3, ...)
   * - Player jersey numbers (typically positive integers)
   * - Team sizes (positive counts)
   *
   * @example
   * ```typescript
   * NumericValidation.validatePositiveInteger(5, 'runs');    //  Valid
   * NumericValidation.validatePositiveInteger(0, 'outs');    //  Valid (0 is non-negative)
   * NumericValidation.validatePositiveInteger(-1, 'score');  //  Throws DomainError
   * NumericValidation.validatePositiveInteger(3.5, 'inning'); //  Throws DomainError
   * ```
   */
  public static validatePositiveInteger(value: number, fieldName: string): void {
    this.validateNumber(value, fieldName);

    if (!Number.isInteger(value)) {
      throw new DomainError(`${fieldName} must be an integer`);
    }

    if (value < 0) {
      throw new DomainError(`${fieldName} cannot be negative`);
    }
  }

  /**
   * Validates that an integer falls within a specified range (inclusive).
   *
   * @param value - The integer value to validate
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @param fieldName - The field name for error messages
   * @throws {DomainError} When value is not a valid integer or outside the specified range
   *
   * @remarks
   * Combines integer validation with range checking for domain constraints.
   * Many softball values have specific valid ranges based on business rules:
   * - Batting positions (1-20 typically)
   * - Inning numbers (1-9 for regulation, potentially higher for extras)
   * - Out counts (0-2 during an inning)
   * - Jersey numbers (league-specific ranges)
   *
   * **Error Message Pattern:** Provides clear feedback about both the expected
   * range and the actual invalid value, helping with debugging and user experience.
   *
   * @example
   * ```typescript
   * // Batting position validation
   * NumericValidation.validateIntegerRange(5, 1, 20, 'batting position');  //  Valid
   *
   * // Out count validation
   * NumericValidation.validateIntegerRange(2, 0, 2, 'outs');              //  Valid
   *
   * // Invalid cases
   * NumericValidation.validateIntegerRange(25, 1, 20, 'batting position'); //  Range error
   * NumericValidation.validateIntegerRange(-1, 0, 2, 'outs');             //  Range error
   * ```
   */
  public static validateIntegerRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    this.validateNumber(value, fieldName);

    if (!Number.isInteger(value)) {
      throw new DomainError(`${fieldName} must be an integer`);
    }

    if (value < min || value > max) {
      throw new DomainError(`${fieldName} must be between ${min} and ${max}, got ${value}`);
    }
  }

  /**
   * Validates a softball score value for a specific team.
   *
   * @param score - The score value to validate
   * @param teamName - The team name for error messages (e.g., 'HOME', 'AWAY')
   * @throws {DomainError} When score is not a valid non-negative integer
   *
   * @remarks
   * Specialized validation for team scores in softball games. Scores must be
   * non-negative integers representing runs scored. This method provides
   * domain-specific error messages that match existing patterns in the codebase.
   *
   * **Business Context:** Team scores represent the total runs scored by a team
   * during a game. These values:
   * - Must be whole numbers (you can't score partial runs)
   * - Cannot be negative (runs accumulate, never decrease)
   * - Are used for win/loss determination and mercy rule evaluation
   * - Are displayed to users and stored in game records
   *
   * **Error Message Compatibility:** Maintains exact backward compatibility
   * with existing error message format: "{teamName} score must be a valid number"
   *
   * @example
   * ```typescript
   * NumericValidation.validateScore(7, 'HOME');     //  Valid score
   * NumericValidation.validateScore(0, 'AWAY');     //  Valid (shutout scenario)
   * NumericValidation.validateScore(-2, 'HOME');    //  Throws: "HOME score must be a valid number"
   * NumericValidation.validateScore(5.5, 'AWAY');   //  Throws: "AWAY score must be a valid number"
   * ```
   */
  public static validateScore(score: number, teamName: string): void {
    try {
      this.validatePositiveInteger(score, 'score');
    } catch {
      // Transform generic error message to team-specific format for backward compatibility
      throw new DomainError(`${teamName} score must be a valid number`);
    }
  }
}
