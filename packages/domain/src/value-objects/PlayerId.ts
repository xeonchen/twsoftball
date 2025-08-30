import { DomainId } from './DomainId';

/**
 * Unique identifier for a player entity in the softball domain.
 *
 * @remarks
 * PlayerId provides stable identity for players across different games, seasons,
 * and team associations. Uses UUID format to ensure global uniqueness and avoid
 * conflicts when players move between teams or leagues.
 *
 * **Domain Context**: Players are persistent entities that maintain their identity
 * across multiple games and team lineups. This ID enables tracking of player
 * statistics, performance history, and roster management across the softball domain.
 *
 * **Immutability**: Player identity never changes once established, ensuring data
 * integrity and enabling proper relationship management between players and games.
 *
 * @example
 * ```typescript
 * // Generate new player ID during registration
 * const playerId = PlayerId.generate();
 *
 * // Reference existing player
 * const existingPlayer = new PlayerId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export class PlayerId extends DomainId<PlayerId> {
  /**
   * Creates a new PlayerId from a string value.
   *
   * @param value - The unique identifier string (typically UUID format)
   * @throws {DomainError} When value is empty, whitespace-only, or exceeds 50 characters
   */
  constructor(value: string) {
    super(value, 'PlayerId', 50);
  }

  /**
   * Compares this PlayerId with another for equality.
   *
   * @param other - The PlayerId to compare against
   * @returns True if both IDs have the same string value, false otherwise
   */
  equals(other: PlayerId): boolean {
    return this.equalsImpl(other, PlayerId);
  }

  /**
   * Generates a new unique PlayerId using cryptographically secure UUID.
   *
   * @returns A new PlayerId with a randomly generated UUID value
   */
  static generate(): PlayerId {
    return new PlayerId(crypto.randomUUID());
  }
}
