import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Domain event representing the advancement of the batting position in a team lineup.
 *
 * @remarks
 * This event is emitted when a team's current batting position advances to the next
 * slot in the batting order. This typically occurs after an at-bat is completed and
 * the next batter steps up to the plate.
 *
 * **Business Rules:**
 * - Batting position advances sequentially through the lineup (1, 2, 3, ..., N)
 * - When reaching the last slot in the lineup, it cycles back to slot 1 (leadoff)
 * - Each team maintains its own independent batting position
 * - Batting position persists across half-innings (doesn't reset between innings)
 *
 * **Key Information Captured:**
 * - Previous batting slot number (where the team was batting)
 * - New batting slot number (where the team will bat next)
 * - Team identification (HOME or AWAY)
 * - Game and lineup context for event sourcing reconstruction
 *
 * **Event Sourcing Usage:**
 * - Enables reconstruction of current batting position by replaying events
 * - Provides complete audit trail of batting order progression
 * - Supports undo/redo functionality for game management
 * - Maintains consistency with at-bat completion events
 *
 * @example
 * ```typescript
 * // Advance from slot 3 to slot 4
 * const event = new BatterAdvancedInLineup(
 *   gameId,
 *   teamLineupId,
 *   3,  // previousSlot
 *   4,  // newSlot
 *   'HOME'
 * );
 *
 * // Cycle from slot 9 back to leadoff
 * const cycleEvent = new BatterAdvancedInLineup(
 *   gameId,
 *   teamLineupId,
 *   9,  // previousSlot
 *   1,  // newSlot (back to leadoff)
 *   'AWAY'
 * );
 * ```
 */
export class BatterAdvancedInLineup extends DomainEvent {
  readonly type = 'BatterAdvancedInLineup';

  constructor(
    /** The unique identifier of the game where batting position advanced */
    readonly gameId: GameId,
    /** The unique identifier of the team lineup being modified */
    readonly teamLineupId: TeamLineupId,
    /** The batting slot the team was in before advancement (1-20) */
    readonly previousSlot: number,
    /** The new batting slot the team is now in (1-20) */
    readonly newSlot: number,
    /** Which team's batting position is advancing (HOME or AWAY) */
    readonly teamSide: 'HOME' | 'AWAY'
  ) {
    super();
    BatterAdvancedInLineup.validateBattingSlot(previousSlot, 'Previous slot');
    BatterAdvancedInLineup.validateBattingSlot(newSlot, 'New slot');
    BatterAdvancedInLineup.validateTeamSide(teamSide);
  }

  /**
   * Validates that the batting slot is within the allowed range.
   *
   * @param battingSlot - The batting slot to validate
   * @param fieldName - Name of the field being validated (for error messages)
   * @throws {DomainError} When batting slot is not between 1 and 20
   */
  private static validateBattingSlot(battingSlot: number, fieldName: string): void {
    if (battingSlot < 1 || battingSlot > 20) {
      throw new DomainError(`${fieldName} must be between 1 and 20`);
    }
  }

  /**
   * Validates that the team side is either HOME or AWAY.
   *
   * @param teamSide - The team side to validate
   * @throws {DomainError} When team side is not HOME or AWAY
   */
  private static validateTeamSide(teamSide: string): void {
    if (teamSide !== 'HOME' && teamSide !== 'AWAY') {
      throw new DomainError('Team side must be either HOME or AWAY');
    }
  }
}
