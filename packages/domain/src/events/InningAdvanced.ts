import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';

import { DomainEvent } from './DomainEvent';

/**
 * Domain event representing advancement to the next half-inning or full inning.
 *
 * @remarks
 * This event captures the progression of game flow through innings, tracking
 * both the current inning number and which half (top/bottom) is about to begin.
 * It's critical for maintaining proper game state and enabling accurate event
 * sourcing reconstruction.
 *
 * **Inning Progression Rules:**
 * - Top half: Away team bats, home team fields
 * - Bottom half: Home team bats, away team fields
 * - After bottom half completes, advance to next inning's top half
 * - Outs reset to 0 at the start of each half-inning
 *
 * **Game Flow Context:**
 * - Triggered when 3 outs are recorded or inning is manually advanced
 * - Enables proper tracking of which team is batting
 * - Critical for determining game completion conditions
 * - Supports regulation and extra-inning game scenarios
 *
 * **Event Sourcing Value:**
 * - Captures complete inning state for accurate reconstruction
 * - Enables undo/redo of inning changes
 * - Provides audit trail of game progression timing
 *
 * @example
 * ```typescript
 * // Advance to bottom of 1st inning
 * const bottomFirst = new InningAdvanced(
 *   gameId,
 *   1,      // Still in 1st inning
 *   false   // Now bottom half (home team bats)
 * );
 *
 * // Advance to top of 2nd inning
 * const topSecond = new InningAdvanced(
 *   gameId,
 *   2,      // Now in 2nd inning
 *   true    // Back to top half (away team bats)
 * );
 * ```
 */
export class InningAdvanced extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'InningAdvanced';

  /**
   * Creates a new InningAdvanced domain event.
   *
   * @param gameId - Unique identifier for the game where inning advanced
   * @param newInning - The inning number now active (1 or greater)
   * @param isTopHalf - True if starting top half (away team bats), false for bottom half (home team bats)
   * @throws {DomainError} When inning number is invalid
   */
  constructor(
    readonly gameId: GameId,
    readonly newInning: number,
    readonly isTopHalf: boolean
  ) {
    super();
    InningAdvanced.validateInning(newInning);
  }

  /**
   * Validates the inning number according to softball rules.
   *
   * @param inning - Inning number to validate
   * @throws {DomainError} When inning is invalid
   *
   * @remarks
   * **Validation Rules:**
   * - Must be a positive integer (innings start at 1)
   * - No upper bound validation (extra innings are allowed)
   * - Must be a finite number (no infinity values)
   *
   * **Business Context:**
   * - Regulation games typically go 7 innings
   * - Extra innings continue until there's a winner
   * - Tournament games may have different inning rules
   */
  private static validateInning(inning: number): void {
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
  }
}
