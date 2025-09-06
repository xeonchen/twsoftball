import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';

import { DomainEvent } from './DomainEvent';

/**
 * Domain event representing advancement to the next batter in the batting order.
 *
 * @remarks
 * This event captures the progression of the batting order within an inning,
 * tracking when the offensive team moves from one batter to the next. This is
 * essential for maintaining proper batting sequence and enabling accurate
 * event sourcing reconstruction of game state.
 *
 * **Batting Order Mechanics:**
 * - Softball teams have 1-20 possible batting slots (10 starters + up to 10 EP)
 * - Order advances sequentially: 1 → 2 → 3 → ... → 10 → 1 (standard) or up to 20
 * - Advancement occurs after each at-bat completion (regardless of outcome)
 * - Order persists across half-innings but resets batting slot position
 * - Substitutions may change which player occupies a batting slot
 *
 * **Event Sourcing Value:**
 * - Enables precise replay of batting order progression
 * - Critical for reconstructing "who bats next" state at any point
 * - Supports undo/redo operations that maintain batting sequence
 * - Provides audit trail for lineup management and statistical tracking
 *
 * **Strategic Context:**
 * - Affects defensive positioning (teams position based on upcoming batters)
 * - Influences substitution timing (coaches may pinch-hit for specific slots)
 * - Critical for statistical attribution (RBI opportunities, clutch situations)
 * - May trigger automatic substitution rules or courtesy runner opportunities
 *
 * **Integration Points:**
 * - Coordinates with TeamLineup aggregates for player-to-slot mapping
 * - Used by Game aggregate to track overall offensive progression
 * - Triggers UI updates for batting order displays and next-batter notifications
 * - Essential for scorekeeping systems and live game statistics
 *
 * @example
 * ```typescript
 * // Advance from leadoff hitter to #2 batter
 * const batterChanged = new CurrentBatterChanged(
 *   gameId,
 *   1,       // Previous batting slot (leadoff)
 *   2,       // New current batting slot (#2 hitter)
 *   3,       // 3rd inning
 *   false    // Bottom half (home team batting)
 * );
 *
 * // Batting order cycles from #9 back to #1
 * const orderCycles = new CurrentBatterChanged(
 *   gameId,
 *   9,       // Previous slot (#9 hitter just batted)
 *   1,       // Back to leadoff
 *   5,       // 5th inning
 *   true     // Top half (away team batting)
 * );
 *
 * // Event sourcing reconstruction
 * if (event.type === 'CurrentBatterChanged') {
 *   const { newBattingSlot } = event;
 *   return inningState.withCurrentBattingSlot(newBattingSlot);
 * }
 * ```
 */
export class CurrentBatterChanged extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'CurrentBatterChanged';

  /**
   * Creates a new CurrentBatterChanged domain event.
   *
   * @param gameId - Unique identifier for the game where batting order advanced
   * @param previousBattingSlot - The batting slot that just completed their at-bat (1-20)
   * @param newBattingSlot - The batting slot now coming up to bat (1-20)
   * @param inning - The current inning number when this change occurred (1 or greater)
   * @param isTopHalf - True if top half (away team batting), false if bottom half (home team batting)
   * @throws {DomainError} When parameters violate batting order business rules
   *
   * @remarks
   * **Parameter Validation:**
   * - Batting slots must be within valid range (1-20) for softball rules
   * - Previous and new slots should follow logical progression patterns
   * - Inning must be valid (1 or greater, no upper limit for extra innings)
   * - Game ID must reference an active, valid game
   *
   * **Business Logic:**
   * - Normal progression: slot N → slot N+1 (with wraparound from max to 1)
   * - Allows for non-sequential changes due to substitutions or corrections
   * - Tracks inning and half for proper game state context
   * - Maintains link to parent game for aggregate coordination
   *
   * **Event Ordering:**
   * - Typically follows AtBatCompleted events
   * - May be followed by substitution events if lineup changes occur
   * - Should precede next AtBatCompleted event in the sequence
   */
  constructor(
    readonly gameId: GameId,
    readonly previousBattingSlot: number,
    readonly newBattingSlot: number,
    readonly inning: number,
    readonly isTopHalf: boolean
  ) {
    super();
    CurrentBatterChanged.validateParameters(gameId, previousBattingSlot, newBattingSlot, inning);
  }

  /**
   * Validates the parameters for a batter change event.
   *
   * @param gameId - The game ID to validate
   * @param previousBattingSlot - The previous batting slot to validate
   * @param newBattingSlot - The new batting slot to validate
   * @param inning - The inning number to validate
   * @throws {DomainError} When parameters violate business rules
   *
   * @remarks
   * **Validation Rules:**
   * - GameId cannot be null (must reference valid game)
   * - Batting slots must be within 1-20 range (softball rules)
   * - Inning must be positive integer (games start at inning 1)
   * - Previous and new slots should be different (actual change occurred)
   *
   * **Business Context:**
   * - 1-9: Standard starting lineup positions
   * - 10-20: Extra Players (EP) in some leagues
   * - Slot changes typically sequential but may skip due to substitutions
   * - Validation ensures data integrity for batting order tracking
   */
  private static validateParameters(
    gameId: GameId,
    previousBattingSlot: number,
    newBattingSlot: number,
    inning: number
  ): void {
    if (!gameId) {
      throw new DomainError('GameId cannot be null or undefined');
    }

    if (
      typeof previousBattingSlot !== 'number' ||
      Number.isNaN(previousBattingSlot) ||
      !Number.isInteger(previousBattingSlot) ||
      previousBattingSlot < 1 ||
      previousBattingSlot > 20
    ) {
      throw new DomainError('Previous batting slot must be an integer between 1 and 20');
    }

    if (
      typeof newBattingSlot !== 'number' ||
      Number.isNaN(newBattingSlot) ||
      !Number.isInteger(newBattingSlot) ||
      newBattingSlot < 1 ||
      newBattingSlot > 20
    ) {
      throw new DomainError('New batting slot must be an integer between 1 and 20');
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

    // Optional: Validate that a change actually occurred
    if (previousBattingSlot === newBattingSlot) {
      throw new DomainError(
        'Previous and new batting slots cannot be the same - no change occurred'
      );
    }
  }
}
