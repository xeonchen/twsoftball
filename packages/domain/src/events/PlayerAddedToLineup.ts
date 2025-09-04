import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

import { DomainEvent } from './DomainEvent';

/**
 * Domain event representing the addition of a player to the team lineup.
 *
 * @remarks
 * This event is emitted when a player is added to a specific batting slot in the
 * team lineup. It captures the complete player information including their name,
 * jersey number, batting position, and initial field position.
 *
 * This event is typically used during initial lineup construction before the game
 * starts. Players added through this event are considered "starters" and have
 * re-entry privileges according to softball rules.
 *
 * Key information captured:
 * - Player identity and display information
 * - Batting order position (1-20)
 * - Initial defensive field position
 * - Jersey number for player identification
 *
 * @example
 * ```typescript
 * const event = new PlayerAddedToLineup(
 *   gameId,
 *   teamLineupId,
 *   new PlayerId('player-123'),
 *   new JerseyNumber(42),
 *   'John Smith',
 *   1, // batting first
 *   FieldPosition.PITCHER
 * );
 * ```
 */
export class PlayerAddedToLineup extends DomainEvent {
  readonly type = 'PlayerAddedToLineup';

  constructor(
    /** The unique identifier of the game where the player is added */
    readonly gameId: GameId,
    /** The unique identifier of the team lineup being modified */
    readonly teamLineupId: TeamLineupId,
    /** The unique identifier of the player being added */
    readonly playerId: PlayerId,
    /** The jersey number assigned to the player */
    readonly jerseyNumber: JerseyNumber,
    /** The display name of the player */
    readonly playerName: string,
    /** The batting slot position (1-20) */
    readonly battingSlot: number,
    /** The initial field position for the player */
    readonly fieldPosition: FieldPosition
  ) {
    super();
    PlayerAddedToLineup.validateBattingSlot(battingSlot);
    PlayerAddedToLineup.validatePlayerName(playerName);
  }

  /**
   * Validates that the batting slot is within the allowed range.
   *
   * @param battingSlot - The batting slot to validate
   * @throws {DomainError} When batting slot is not between 1 and 20
   */
  private static validateBattingSlot(battingSlot: number): void {
    if (battingSlot < 1 || battingSlot > 20) {
      throw new DomainError('Batting slot must be between 1 and 20');
    }
  }

  /**
   * Validates that the player name is not empty and within reasonable length.
   *
   * @param playerName - The player name to validate
   * @throws {DomainError} When player name is invalid
   */
  private static validatePlayerName(playerName: string): void {
    if (!playerName?.trim()) {
      throw new DomainError('Player name cannot be empty or whitespace');
    }
    if (playerName.length > 100) {
      throw new DomainError('Player name cannot exceed 100 characters');
    }
  }
}
