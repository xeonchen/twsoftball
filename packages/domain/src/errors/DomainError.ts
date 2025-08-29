/**
 * Base error class for all domain-specific business rule violations.
 *
 * @remarks
 * DomainError represents violations of business rules and domain constraints
 * within the softball application. It extends the standard Error class with
 * proper prototype chain maintenance and stack trace handling.
 *
 * **Domain Context**: Used throughout the domain layer to signal when:
 * - Value object constraints are violated (e.g., negative scores, invalid jersey numbers)
 * - Business rule violations occur (e.g., recording at-bat for completed game)
 * - Entity invariants are broken (e.g., duplicate players in lineup)
 *
 * **Error Handling Strategy**: Domain errors should bubble up to the application
 * layer where they can be properly handled and converted to appropriate
 * user-facing messages or API responses.
 *
 * @example
 * ```typescript
 * // Typical usage in value objects
 * if (runs < 0) {
 *   throw new DomainError('Score must be non-negative');
 * }
 *
 * // Catching domain errors at application boundaries
 * try {
 *   const score = new Score(-1);
 * } catch (error) {
 *   if (error instanceof DomainError) {
 *     // Handle business rule violation
 *     console.log('Business rule violation:', error.message);
 *   }
 * }
 * ```
 */
export class DomainError extends Error {
  /**
   * Creates a new DomainError with the specified message.
   *
   * @param message - Descriptive error message explaining the business rule violation
   */
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }

    // Ensure the prototype chain is maintained
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
