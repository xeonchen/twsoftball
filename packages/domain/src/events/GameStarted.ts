import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';

/**
 * Domain event representing the start of active gameplay in a softball game.
 *
 * @remarks
 * This event marks the transition from game setup phase to active gameplay phase.
 * Once a game is started, certain operations become available (recording at-bats,
 * scoring runs) while others become restricted (modifying lineups, changing teams).
 *
 * **State Transition:**
 * - Game status changes from NOT_STARTED to IN_PROGRESS
 * - Enables recording of gameplay events (at-bats, runs, etc.)
 * - Locks team information and initial lineup configurations
 *
 * **Business Rules:**
 * - Can only start a game that is in NOT_STARTED status
 * - Once started, game cannot return to NOT_STARTED status
 * - Starting timestamp provides official game start time for records
 *
 * **Event Sourcing Context:**
 * - Enables/disables various command validations in the aggregate
 * - Provides audit trail of when official gameplay began
 * - Critical for determining game duration and scheduling
 *
 * @example
 * ```typescript
 * // Start an official game
 * const gameStarted = new GameStarted(gameId);
 *
 * // Event captures when game officially began
 * console.log(gameStarted.timestamp); // Official start time
 * console.log(gameStarted.type);      // 'GameStarted'
 * ```
 */
export class GameStarted extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'GameStarted';

  /**
   * Creates a new GameStarted domain event.
   *
   * @param gameId - Unique identifier for the game that is starting
   */
  constructor(readonly gameId: GameId) {
    super();
  }
}
