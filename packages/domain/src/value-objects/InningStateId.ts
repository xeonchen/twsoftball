import { DomainError } from '../errors/DomainError';

/**
 * Unique identifier for an inning state aggregate in the softball domain.
 *
 * @remarks
 * InningStateId serves as the aggregate root identifier for tracking the state
 * of a specific inning, including outs, current batter, and inning progression.
 * Uses UUID format for global uniqueness across all game instances.
 *
 * **Domain Context**: Each inning in a softball game has distinct state that must
 * be tracked independently (home/away, outs count, batting position). This ID
 * ensures proper state isolation and enables accurate game progression tracking.
 *
 * @example
 * ```typescript
 * // Generate new inning state ID
 * const inningId = InningStateId.generate();
 *
 * // Create from existing ID string
 * const existingId = new InningStateId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export class InningStateId {
  /**
   * Creates a new InningStateId from a string value.
   *
   * @param value - The unique identifier string (typically UUID format)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds 50 characters
   */
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('InningStateId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('InningStateId cannot exceed 50 characters');
    }
  }

  /**
   * Compares this InningStateId with another for equality.
   *
   * @param other - The InningStateId to compare against
   * @returns True if both IDs have the same string value, false otherwise
   */
  equals(other: InningStateId): boolean {
    if (!other || !(other instanceof InningStateId)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Returns the string representation of this InningStateId.
   *
   * @returns The underlying UUID string value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Generates a new unique InningStateId using cryptographically secure UUID.
   *
   * @returns A new InningStateId with a randomly generated UUID value
   */
  static generate(): InningStateId {
    return new InningStateId(crypto.randomUUID());
  }
}
