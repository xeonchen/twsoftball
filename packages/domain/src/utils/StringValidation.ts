import { DomainError } from '../errors/DomainError.js';

/**
 * Utility class for string validation operations.
 *
 * @remarks
 * Provides reusable validation methods for string inputs across the domain layer.
 * All validation methods throw DomainError with consistent error messages when
 * validation fails, ensuring uniform error handling across domain objects.
 */
export class StringValidation {
  /**
   * Validates that a string is not empty or whitespace and doesn't exceed max length.
   *
   * @param value - String value to validate
   * @param maxLength - Maximum allowed length
   * @param typeName - Type name for error messages (e.g., 'GameId', 'PlayerId')
   *
   * @throws {DomainError} If string is empty, whitespace-only, or exceeds max length
   */
  public static validateNonEmptyStringWithLength(
    value: string,
    maxLength: number,
    typeName: string
  ): void {
    if (!value?.trim()) {
      throw new DomainError(`${typeName} cannot be empty or whitespace`);
    }

    if (value.length > maxLength) {
      throw new DomainError(`${typeName} cannot exceed ${maxLength} characters`);
    }
  }

  /**
   * Validates that a string is not empty or whitespace.
   *
   * @param value - String value to validate
   * @param typeName - Type name for error messages
   *
   * @throws {DomainError} If string is empty or whitespace-only
   */
  public static validateNonEmptyString(value: string, typeName: string): void {
    if (!value?.trim()) {
      throw new DomainError(`${typeName} cannot be empty or whitespace`);
    }
  }
}
