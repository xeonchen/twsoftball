import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Domain event representing a player's field position change during the game.
 *
 * @remarks
 * This event captures when a player moves from one defensive position to another
 * without being substituted out of the game. This is different from substitution
 * because the same player remains in the game but changes their defensive responsibilities.
 *
 * Common scenarios include:
 * - Pitcher moving to first base and first baseman taking the mound
 * - Outfielders rotating positions based on batter tendencies
 * - Infielders shifting positions for defensive strategy
 * - Players moving between Extra Player (EP) and active field positions
 *
 * Key business rules:
 * - Player must remain in the game (not a substitution)
 * - Position change affects only defensive assignments, not batting order
 * - Timing is important for statistical and strategic tracking
 * - Both old and new positions must be valid field positions
 *
 * @example
 * ```typescript
 * // Player moves from right field to first base
 * const positionChange = new FieldPositionChanged(
 *   gameId,
 *   teamLineupId,
 *   new PlayerId('versatile-player'),
 *   FieldPosition.RIGHT_FIELD,
 *   FieldPosition.FIRST_BASE,
 *   5 // inning when change occurs
 * );
 * ```
 */
export class FieldPositionChanged extends DomainEvent {
  readonly type = 'FieldPositionChanged';

  constructor(
    /** The unique identifier of the game where the position change occurs */
    readonly gameId: GameId,
    /** The unique identifier of the team lineup being modified */
    readonly teamLineupId: TeamLineupId,
    /** The unique identifier of the player changing positions */
    readonly playerId: PlayerId,
    /** The field position the player was previously playing */
    readonly fromPosition: FieldPosition,
    /** The field position the player will now play */
    readonly toPosition: FieldPosition,
    /** The inning number when this position change occurs (1 or greater) */
    readonly inning: number
  ) {
    super();
    FieldPositionChanged.validateInning(inning);
    FieldPositionChanged.validatePositionsDifferent(fromPosition, toPosition);
  }

  /**
   * Validates that the inning is a positive number.
   *
   * @param inning - The inning to validate
   * @throws {DomainError} When inning is less than 1
   *
   * @remarks
   * Position changes can occur at any inning during the game. While most
   * changes happen between innings or during timeouts, they can also occur
   * during play (though this is less common and may affect strategy).
   */
  private static validateInning(inning: number): void {
    if (inning < 1) {
      throw new DomainError('Inning must be 1 or greater');
    }
  }

  /**
   * Validates that the from and to positions are different.
   *
   * @param fromPosition - The original field position
   * @param toPosition - The new field position
   * @throws {DomainError} When both positions are the same
   *
   * @remarks
   * A position change must involve two different positions. If a player
   * remains in the same position, no position change event should be created.
   * This validation prevents meaningless events and ensures data integrity.
   */
  private static validatePositionsDifferent(
    fromPosition: FieldPosition,
    toPosition: FieldPosition
  ): void {
    if (fromPosition === toPosition) {
      throw new DomainError('From and to positions must be different');
    }
  }
}
