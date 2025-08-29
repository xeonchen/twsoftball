import { DomainError } from '../errors/DomainError';

/**
 * Unique identifier for a team's lineup aggregate in the softball domain.
 *
 * @remarks
 * TeamLineupId serves as the aggregate root identifier for team lineup management,
 * encapsulating both the batting order and defensive positioning of players.
 * Uses UUID format for global uniqueness across all game instances.
 *
 * **Domain Context**: Each team in a softball game has exactly one lineup that
 * defines both batting order and defensive positions. This ID allows the system
 * to maintain lineup integrity across game events and state transitions.
 *
 * @example
 * ```typescript
 * // Generate new lineup ID for a team
 * const lineupId = TeamLineupId.generate();
 *
 * // Create from existing ID string
 * const existingId = new TeamLineupId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export class TeamLineupId {
  /**
   * Creates a new TeamLineupId from a string value.
   *
   * @param value - The unique identifier string (typically UUID format)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds 50 characters
   */
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('TeamLineupId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('TeamLineupId cannot exceed 50 characters');
    }
  }

  /**
   * Compares this TeamLineupId with another for equality.
   *
   * @param other - The TeamLineupId to compare against
   * @returns True if both IDs have the same string value, false otherwise
   */
  equals(other: TeamLineupId): boolean {
    if (!other || !(other instanceof TeamLineupId)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Returns the string representation of this TeamLineupId.
   *
   * @returns The underlying UUID string value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Generates a new unique TeamLineupId using cryptographically secure UUID.
   *
   * @returns A new TeamLineupId with a randomly generated UUID value
   */
  static generate(): TeamLineupId {
    return new TeamLineupId(crypto.randomUUID());
  }
}
