import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Domain event representing the completion of a half-inning in softball.
 *
 * @remarks
 * This event captures the transition between offensive and defensive phases within
 * an inning, marking when one team completes their at-bat opportunity and the
 * other team prepares to bat. This is a critical moment in game flow that affects
 * multiple aspects of game state management.
 *
 * **Half-Inning Mechanics:**
 * - Top Half: Away team bats, home team fields
 * - Bottom Half: Home team bats, away team fields
 * - Each half ends when 3 outs are recorded
 * - Bases are cleared and outs reset to 0 for the next half
 * - Batting order continues from where it left off
 *
 * **Event Sourcing Context:**
 * - Marks completion of one phase of the inning
 * - Triggers state reset for bases, outs, and defensive alignment
 * - Enables accurate replay of game progression timing
 * - Critical for proper state reconstruction during event replay
 *
 * **Game Flow Impact:**
 * - Triggers team role switching (batting ↔ fielding)
 * - Resets tactical state (bases cleared, outs to 0)
 * - May trigger inning advancement if bottom half just ended
 * - Affects statistical tracking and game completion checks
 *
 * **Integration Points:**
 * - Coordinates with Game aggregate for overall game progression
 * - May trigger lineup changes or substitution opportunities
 * - Used by UI to update game state displays and team notifications
 * - Critical for scorekeeping and statistical systems
 *
 * @example
 * ```typescript
 * // Away team completes top half of 3rd inning
 * const topHalfEnded = new HalfInningEnded(
 *   gameId,
 *   3,       // 3rd inning
 *   true,    // Was top half (away team just batted)
 *   2        // Final out count (should be 3)
 * );
 *
 * // Home team completes bottom half of 7th inning
 * const bottomHalfEnded = new HalfInningEnded(
 *   gameId,
 *   7,       // 7th inning
 *   false,   // Was bottom half (home team just batted)
 *   3        // Three outs recorded
 * );
 *
 * // Event sourcing handling
 * if (event.type === 'HalfInningEnded') {
 *   const { wasTopHalf } = event;
 *   if (wasTopHalf) {
 *     // Switch to bottom half, same inning
 *     return inningState.transitionToBottomHalf();
 *   } else {
 *     // Advance to next inning, top half
 *     return inningState.advanceToNextInning();
 *   }
 * }
 * ```
 */
export class HalfInningEnded extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'HalfInningEnded';

  /**
   * Creates a new HalfInningEnded domain event.
   *
   * @param gameId - Unique identifier for the game where the half-inning ended
   * @param inning - The inning number that just completed a half (1 or greater)
   * @param wasTopHalf - True if top half just ended (away team finished batting), false if bottom half ended (home team finished)
   * @param finalOuts - Number of outs recorded when the half-inning ended (typically 3, but could be less in certain scenarios)
   * @param awayTeamBatterSlot - Away team's current batting slot position to preserve (1-20)
   * @param homeTeamBatterSlot - Home team's current batting slot position to preserve (1-20)
   * @throws {DomainError} When parameters violate softball business rules
   *
   * @remarks
   * **Parameter Semantics:**
   * - `wasTopHalf`: Indicates which team just finished batting (critical for state transitions)
   * - `finalOuts`: Usually 3, but may be less in walkoff scenarios or forfeit situations
   * - `inning`: Must be positive, no upper limit (extra innings allowed)
   * - `awayTeamBatterSlot`: Preserved for event sourcing reconstruction
   * - `homeTeamBatterSlot`: Preserved for event sourcing reconstruction
   *
   * **Business Rules:**
   * - Inning must be valid (1 or greater)
   * - Out count should be reasonable (0-3, though edge cases may exist)
   * - Game ID must reference valid, active game
   * - Both batting slots must be between 1 and 20
   *
   * **State Transition Logic:**
   * - If wasTopHalf=true → transition to bottom half of same inning
   * - If wasTopHalf=false → advance to top half of next inning
   * - Always reset outs to 0 and clear bases for next half-inning
   * - Batting slots are preserved for both teams
   */
  constructor(
    readonly gameId: GameId,
    readonly inning: number,
    readonly wasTopHalf: boolean,
    readonly finalOuts: number,
    readonly awayTeamBatterSlot: number,
    readonly homeTeamBatterSlot: number
  ) {
    super();
    HalfInningEnded.validateParameters(
      gameId,
      inning,
      finalOuts,
      awayTeamBatterSlot,
      homeTeamBatterSlot
    );
  }

  /**
   * Validates the parameters for a half-inning ending event.
   *
   * @param gameId - The game ID to validate
   * @param inning - The inning number to validate
   * @param finalOuts - The final out count to validate
   * @param awayTeamBatterSlot - The away team's batting slot to validate
   * @param homeTeamBatterSlot - The home team's batting slot to validate
   * @throws {DomainError} When parameters are invalid
   *
   * @remarks
   * **Validation Rules:**
   * - GameId cannot be null (must reference valid game)
   * - Inning must be positive integer (softball starts at inning 1)
   * - Final outs typically 3, but allowing 0-5 for edge cases
   * - Both batting slots must be between 1 and 20
   *
   * **Edge Cases Considered:**
   * - Walkoff scenarios may end with fewer than 3 outs
   * - Forfeit situations may have unusual out counts
   * - Extra-long innings due to errors or special rules
   */
  private static validateParameters(
    gameId: GameId,
    inning: number,
    finalOuts: number,
    awayTeamBatterSlot: number,
    homeTeamBatterSlot: number
  ): void {
    if (!gameId) {
      throw new DomainError('GameId cannot be null or undefined');
    }

    if (typeof inning !== 'number' || Number.isNaN(inning)) {
      throw new DomainError('Inning must be a valid number');
    }
    if (!Number.isFinite(inning)) {
      throw new DomainError('Inning must be a finite number');
    }
    if (inning < 1) {
      throw new DomainError('Inning must be 1 or greater');
    }
    if (!Number.isInteger(inning)) {
      throw new DomainError('Inning must be an integer');
    }

    if (typeof finalOuts !== 'number' || Number.isNaN(finalOuts)) {
      throw new DomainError('Final outs must be a valid number');
    }
    if (!Number.isFinite(finalOuts)) {
      throw new DomainError('Final outs must be a finite number');
    }
    if (finalOuts < 0 || finalOuts > 5) {
      throw new DomainError('Final outs must be between 0 and 5');
    }
    if (!Number.isInteger(finalOuts)) {
      throw new DomainError('Final outs must be an integer');
    }

    // Validate away team batting slot
    if (typeof awayTeamBatterSlot !== 'number' || Number.isNaN(awayTeamBatterSlot)) {
      throw new DomainError('Away team batter slot must be a valid number');
    }
    if (!Number.isFinite(awayTeamBatterSlot)) {
      throw new DomainError('Away team batter slot must be a finite number');
    }
    if (awayTeamBatterSlot < 1 || awayTeamBatterSlot > 20) {
      throw new DomainError('Away team batter slot must be between 1 and 20');
    }
    if (!Number.isInteger(awayTeamBatterSlot)) {
      throw new DomainError('Away team batter slot must be an integer');
    }

    // Validate home team batting slot
    if (typeof homeTeamBatterSlot !== 'number' || Number.isNaN(homeTeamBatterSlot)) {
      throw new DomainError('Home team batter slot must be a valid number');
    }
    if (!Number.isFinite(homeTeamBatterSlot)) {
      throw new DomainError('Home team batter slot must be a finite number');
    }
    if (homeTeamBatterSlot < 1 || homeTeamBatterSlot > 20) {
      throw new DomainError('Home team batter slot must be between 1 and 20');
    }
    if (!Number.isInteger(homeTeamBatterSlot)) {
      throw new DomainError('Home team batter slot must be an integer');
    }
  }
}
