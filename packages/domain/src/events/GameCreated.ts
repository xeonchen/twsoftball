import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Domain event representing the creation of a new softball game.
 *
 * @remarks
 * This event marks the beginning of a game's lifecycle in the event sourcing system.
 * It captures the foundational information needed to initialize a game aggregate,
 * including team identification and initial game state.
 *
 * **Event Sourcing Context:**
 * - This is typically the first event in any game's event stream
 * - Contains all data needed to reconstruct the initial game state
 * - Immutable once created, ensuring reliable event replay
 *
 * **Business Context:**
 * - Represents the moment a game is officially registered in the system
 * - Establishes team identities that remain constant throughout the game
 * - Triggers initialization of game state tracking (score, innings, etc.)
 *
 * @example
 * ```typescript
 * const gameCreated = new GameCreated(
 *   new GameId('game-123'),
 *   'Springfield Tigers',
 *   'Shelbyville Lions'
 * );
 *
 * // Event contains all data for game reconstruction
 * console.log(gameCreated.homeTeamName); // 'Springfield Tigers'
 * console.log(gameCreated.awayTeamName); // 'Shelbyville Lions'
 * ```
 */
export class GameCreated extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'GameCreated';

  /**
   * Creates a new GameCreated domain event.
   *
   * @param gameId - Unique identifier for the game aggregate
   * @param homeTeamName - Name of the home team (cannot be empty or same as away team)
   * @param awayTeamName - Name of the away team (cannot be empty or same as home team)
   * @throws {DomainError} When team names are invalid or identical
   */
  constructor(
    readonly gameId: GameId,
    readonly homeTeamName: string,
    readonly awayTeamName: string
  ) {
    super();
    GameCreated.validateTeamNames(homeTeamName, awayTeamName);
  }

  /**
   * Validates team names according to business rules.
   *
   * @param homeTeamName - Home team name to validate
   * @param awayTeamName - Away team name to validate
   * @throws {DomainError} When validation fails
   */
  private static validateTeamNames(homeTeamName: string, awayTeamName: string): void {
    if (!homeTeamName?.trim()) {
      throw new DomainError('Home team name cannot be empty or whitespace');
    }
    if (!awayTeamName?.trim()) {
      throw new DomainError('Away team name cannot be empty or whitespace');
    }
    if (homeTeamName.trim() === awayTeamName.trim()) {
      throw new DomainError('Home and away team names must be different');
    }
  }
}
