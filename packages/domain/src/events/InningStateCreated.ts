import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { InningStateId } from '../value-objects/InningStateId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Domain event representing the creation of a new inning state aggregate.
 *
 * @remarks
 * This event marks the establishment of detailed inning tracking for a softball game,
 * capturing the initial state that will track play-by-play progression, baserunner
 * movements, and batting order advancement throughout the inning.
 *
 * **Event Sourcing Context:**
 * - Establishes the aggregate root identity for InningState
 * - Captures initial inning state values for accurate reconstruction
 * - Enables proper aggregate lifecycle tracking in event store
 * - First event in the InningState aggregate's event stream
 *
 * **Business Context:**
 * - Triggered when detailed inning tracking begins (typically at game start)
 * - Establishes baseline state for all subsequent inning operations
 * - Links inning state to parent game for proper relationship tracking
 * - Sets up initial conditions for play-by-play event sourcing
 *
 * **Integration Points:**
 * - Coordinates with Game aggregate for overall game state management
 * - May trigger UI updates to display inning state tracking
 * - Used by application services to manage inning state lifecycle
 *
 * @example
 * ```typescript
 * // Create new inning state for game start
 * const inningCreated = new InningStateCreated(
 *   InningStateId.generate(),
 *   gameId,
 *   1,      // Start with 1st inning
 *   true    // Begin with top half (away team bats)
 * );
 *
 * // Event sourcing reconstruction
 * if (event.type === 'InningStateCreated') {
 *   const { inningStateId, gameId, inning, isTopHalf } = event;
 *   return InningState.fromSnapshot(inningStateId, gameId, inning, isTopHalf);
 * }
 * ```
 */
export class InningStateCreated extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'InningStateCreated';

  /**
   * Creates a new InningStateCreated domain event.
   *
   * @param inningStateId - Unique identifier for the new inning state aggregate
   * @param gameId - Unique identifier for the parent game this inning belongs to
   * @param inning - Initial inning number (must be 1 or greater)
   * @param isTopHalf - Whether starting with top half (away team bats) or bottom half (home team bats)
   * @throws {DomainError} When parameters violate business rules
   *
   * @remarks
   * **Validation Rules:**
   * - InningStateId and GameId must be valid (non-null, proper format)
   * - Inning must be positive integer (games start at inning 1)
   * - Boolean flag for half-inning tracking must be explicit
   *
   * **Event Ordering:**
   * - This is typically the first event in an InningState aggregate
   * - Must occur before any at-bat or runner advancement events
   * - Establishes the baseline for all subsequent state reconstruction
   */
  constructor(
    readonly inningStateId: InningStateId,
    readonly gameId: GameId,
    readonly inning: number,
    readonly isTopHalf: boolean
  ) {
    super();
    InningStateCreated.validateParameters(inningStateId, gameId, inning);
  }

  /**
   * Validates the parameters for creating a new inning state.
   *
   * @param inningStateId - The inning state ID to validate
   * @param gameId - The game ID to validate
   * @param inning - The inning number to validate
   * @throws {DomainError} When parameters are invalid
   *
   * @remarks
   * **Business Rules:**
   * - InningStateId cannot be null (aggregate identity requirement)
   * - GameId cannot be null (parent relationship requirement)
   * - Inning must be positive integer (softball starts at inning 1)
   * - No upper bound on inning (extra innings are allowed)
   */
  private static validateParameters(
    inningStateId: InningStateId,
    gameId: GameId,
    inning: number
  ): void {
    if (!inningStateId) {
      throw new DomainError('InningStateId cannot be null or undefined');
    }
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
  }
}
