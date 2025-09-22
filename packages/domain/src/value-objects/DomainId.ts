import { StringValidation } from '../utils/StringValidation.js';

/**
 * Abstract base class for all domain identifier value objects.
 *
 * @remarks
 * DomainId provides a common foundation for all domain identifier value objects,
 * eliminating code duplication across GameId, PlayerId, TeamLineupId, and InningStateId.
 * This base class enforces consistent validation rules, error messages, and behavior
 * patterns for all domain identifiers.
 *
 * **Common Validation Patterns:**
 * - Non-empty/whitespace validation using StringValidation utility
 * - Configurable length limits (default 50 characters for compatibility)
 * - Consistent error message formats matching existing domain error patterns
 *
 * **Design Philosophy:**
 * - Abstract base class prevents direct instantiation
 * - Protected constructor ensures only concrete ID classes can instantiate
 * - Generic type parameter ensures type safety in equals() methods
 * - Maintains exact backward compatibility with existing error messages
 *
 * **Inheritance Pattern:**
 * Each concrete ID class must:
 * 1. Call super(value, idTypeName, maxLength) in constructor
 * 2. Implement type-safe equals() method with proper instanceof checks
 * 3. Provide static generate() method for UUID generation
 *
 * @example
 * ```typescript
 * // Concrete implementation pattern
 * class GameId extends DomainId<GameId> {
 *   constructor(value: string) {
 *     super(value, 'GameId', 50);
 *   }
 *
 *   equals(other: GameId): boolean {
 *     return this.equalsImpl(other, GameId);
 *   }
 *
 *   static generate(): GameId {
 *     return new GameId(crypto.randomUUID());
 *   }
 * }
 * ```
 */
export abstract class DomainId<T extends DomainId<T>> {
  /**
   * The underlying string value of this domain identifier.
   *
   * @remarks
   * This value is validated at construction time and guaranteed to be:
   * - Non-empty and not whitespace-only
   * - Within specified length limits
   * - Immutable after construction (readonly)
   */
  readonly value: string;

  /**
   * Creates a new domain identifier with validation.
   *
   * @remarks
   * Protected constructor prevents direct instantiation of the base class
   * while allowing concrete ID classes to initialize properly. Uses the
   * StringValidation utility to ensure consistent validation behavior
   * across all domain identifiers.
   *
   * **Validation Sequence:**
   * 1. Non-empty/whitespace validation (throws if empty or whitespace-only)
   * 2. Length validation (throws if exceeds maxLength)
   * 3. Value assignment (guaranteed valid at this point)
   *
   * **Error Message Compatibility:**
   * Error messages exactly match the existing pattern:
   * - "{IdTypeName} cannot be empty or whitespace"
   * - "{IdTypeName} cannot exceed {maxLength} characters"
   *
   * @param value - The unique identifier string (typically UUID format)
   * @param idTypeName - The concrete ID type name for error messages (e.g., 'GameId')
   * @param maxLength - Maximum allowed string length (default 50 for backward compatibility)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds maxLength
   *
   * @example
   * ```typescript
   * // Concrete class constructor
   * constructor(value: string) {
   *   super(value, 'GameId', 50); // Validates and stores value
   * }
   * ```
   */
  protected constructor(value: string, idTypeName: string, maxLength: number = 50) {
    StringValidation.validateNonEmptyStringWithLength(value, maxLength, idTypeName);
    this.value = value;
  }

  /**
   * Returns the string representation of this domain identifier.
   *
   * @remarks
   * This method provides a consistent way to convert any domain ID
   * to its string representation, typically for serialization,
   * logging, or display purposes.
   *
   * @returns The underlying string value of this identifier
   *
   * @example
   * ```typescript
   * const gameId = new GameId('550e8400-e29b-41d4-a716-446655440000');
   * console.log(gameId.toString()); // '550e8400-e29b-41d4-a716-446655440000'
   * ```
   */
  toString(): string {
    return this.value;
  }

  /**
   * Helper method for implementing type-safe equals comparison.
   *
   * @remarks
   * This protected method provides a consistent implementation pattern
   * for equals() methods in concrete ID classes. It ensures proper
   * type checking and value comparison while maintaining type safety.
   *
   * **Type Safety:**
   * - Checks for null/undefined
   * - Verifies correct concrete type using instanceof
   * - Compares string values only after type validation
   *
   * **Usage Pattern:**
   * Concrete classes should implement their equals() method by calling
   * this helper with the appropriate constructor function:
   *
   * @param other - The object to compare against
   * @param Constructor - The constructor function for type checking
   * @returns True if both IDs are of same type and have same value
   *
   * @example
   * ```typescript
   * // In concrete class
   * equals(other: GameId): boolean {
   *   return this.equalsImpl(other, GameId);
   * }
   * ```
   */
  protected equalsImpl(other: unknown, Constructor: new (value: string) => T): boolean {
    if (!other || !(other instanceof Constructor)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Abstract method for type-safe equality comparison.
   *
   * @remarks
   * Each concrete ID class must implement this method to provide
   * type-safe equality comparison. The implementation should use
   * the equalsImpl helper method for consistency.
   *
   * **Implementation Requirement:**
   * Concrete classes must implement this with proper type annotation:
   * ```typescript
   * equals(other: GameId): boolean {
   *   return this.equalsImpl(other, GameId);
   * }
   * ```
   *
   * @param other - The ID object to compare against
   * @returns True if both IDs have the same type and value
   */
  abstract equals(other: T): boolean;
}
