import { DomainError } from '../errors/DomainError.js';

/**
 * Value object representing a player's jersey number in softball.
 *
 * @remarks
 * JerseyNumber enforces softball-specific business rules for player identification:
 * - Must be numeric (1-99 range)
 * - No leading zeros or non-numeric characters
 * - Stored as string to preserve exact display format
 * - Each number must be unique within a team's lineup
 *
 * **Softball Rules Context**: Traditional softball allows jersey numbers 1-99,
 * with some leagues having additional restrictions. The numeric validation ensures
 * compatibility with official scorekeeping and roster management systems.
 *
 * **Business Logic**: Jersey numbers are used for player identification on
 * scorecards, official statistics, and game management. Proper validation
 * prevents data entry errors that could cause confusion during games.
 *
 * @example
 * ```typescript
 * // Create from string (typical user input)
 * const jersey1 = new JerseyNumber('23');
 *
 * // Create from number (programmatic creation)
 * const jersey2 = JerseyNumber.fromNumber(42);
 *
 * // Invalid examples that throw DomainError:
 * // new JerseyNumber('0');   // Below minimum
 * // new JerseyNumber('100'); // Above maximum
 * // new JerseyNumber('3a');  // Non-numeric
 * ```
 */
export class JerseyNumber {
  /**
   * Creates a new JerseyNumber from a string value.
   *
   * @param value - The jersey number as a string (must be numeric 1-99)
   * @throws {DomainError} When value is empty, whitespace, non-numeric, or outside 1-99 range
   */
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('Jersey number cannot be empty or whitespace');
    }

    // Check if string is numeric
    if (!/^\d+$/.test(value)) {
      throw new DomainError('Jersey number must be numeric');
    }

    const numericValue = parseInt(value, 10);
    if (numericValue < 1 || numericValue > 99) {
      throw new DomainError('Jersey number must be between 1 and 99');
    }
  }

  /**
   * Compares this JerseyNumber with another for equality.
   *
   * @param other - The JerseyNumber to compare against
   * @returns True if both jersey numbers have the same string value, false otherwise
   */
  equals(other: JerseyNumber): boolean {
    if (!other || !(other instanceof JerseyNumber)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Converts the jersey number to its numeric representation.
   *
   * @returns The jersey number as an integer (1-99)
   */
  toNumber(): number {
    return parseInt(this.value, 10);
  }

  /**
   * Returns the string representation of this jersey number.
   *
   * @returns The jersey number as originally entered (preserves format)
   */
  toString(): string {
    return this.value;
  }

  /**
   * Creates a JerseyNumber from a numeric value.
   *
   * @param num - The jersey number as an integer
   * @returns New JerseyNumber instance
   * @throws {DomainError} When num is not an integer or outside valid range
   */
  static fromNumber(num: number): JerseyNumber {
    if (!Number.isInteger(num)) {
      throw new DomainError('Jersey number must be an integer');
    }
    return new JerseyNumber(num.toString());
  }
}
