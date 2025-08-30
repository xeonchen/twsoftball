import { DomainId } from './DomainId';

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
export class InningStateId extends DomainId<InningStateId> {
  /**
   * Creates a new InningStateId from a string value.
   *
   * @param value - The unique identifier string (typically UUID format)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds 50 characters
   */
  constructor(value: string) {
    super(value, 'InningStateId', 50);
  }

  /**
   * Compares this InningStateId with another for equality.
   *
   * @param other - The InningStateId to compare against
   * @returns True if both IDs have the same string value, false otherwise
   */
  equals(other: InningStateId): boolean {
    return this.equalsImpl(other, InningStateId);
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
