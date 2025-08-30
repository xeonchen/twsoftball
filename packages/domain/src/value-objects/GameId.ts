import { DomainError } from '../errors/DomainError';

/**
 * Unique identifier for a softball game aggregate root.
 *
 * @remarks
 * GameId serves as the primary aggregate root identifier in the softball domain,
 * ensuring all game events, states, and related entities can be properly associated
 * with a specific game instance. Uses UUID format for global uniqueness.
 *
 * **Domain Context**: Every softball game requires a unique identifier that persists
 * throughout the game lifecycle (from creation to completion). This ID is referenced
 * by all domain events and enables proper event sourcing and state reconstruction.
 *
 * **Event Sourcing**: This ID is embedded in all domain events related to the game,
 * allowing the system to rebuild game state by replaying events for a specific GameId.
 *
 * @example
 * ```typescript
 * // Generate new game ID when starting a game
 * const gameId = GameId.generate();
 *
 * // Recreate from persisted ID string
 * const existingGame = new GameId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export class GameId {
  /**
   * Creates a new GameId from a string value.
   *
   * @param value - The unique identifier string (typically UUID format)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds 50 characters
   */
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('GameId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('GameId cannot exceed 50 characters');
    }
  }

  /**
   * Compares this GameId with another for equality.
   *
   * @param other - The GameId to compare against
   * @returns True if both IDs have the same string value, false otherwise
   */
  equals(other: GameId): boolean {
    if (!other || !(other instanceof GameId)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Returns the string representation of this GameId.
   *
   * @returns The underlying UUID string value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Generates a new unique GameId using cryptographically secure UUID.
   *
   * @returns A new GameId with a randomly generated UUID value
   */
  static generate(): GameId {
    return new GameId(crypto.randomUUID());
  }
}
