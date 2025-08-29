import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { DomainError } from '../errors/DomainError';

/**
 * Domain event representing an update to the game score.
 *
 * @remarks
 * This event captures changes to either team's score, providing a complete
 * audit trail of scoring changes throughout the game. It includes both the
 * runs added and the new total score to support various event sourcing patterns.
 *
 * **Event Sourcing Patterns:**
 * - Contains incremental change (runsAdded) for applying updates
 * - Contains complete new state (newScore) for rebuilding from this point
 * - Enables both forward replay and snapshot-based reconstruction
 *
 * **Business Context:**
 * - Triggered when runs are scored by either team
 * - May result from single runs, multiple runs, or bulk score corrections
 * - Critical for maintaining accurate score tracking and game progression
 * - Supports undo/redo functionality for score management
 *
 * **Immutability:**
 * - Score objects are frozen to prevent post-creation modifications
 * - Ensures event integrity throughout the game lifecycle
 *
 * @example
 * ```typescript
 * // Home team scores 2 runs
 * const homeScore = new ScoreUpdated(
 *   gameId,
 *   'HOME',
 *   2,                           // Runs added this update
 *   { home: 5, away: 3 }         // New total score
 * );
 *
 * // Away team scores 1 run
 * const awayScore = new ScoreUpdated(
 *   gameId,
 *   'AWAY',
 *   1,                           // Runs added this update
 *   { home: 5, away: 4 }         // New total score
 * );
 * ```
 */
export class ScoreUpdated extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'ScoreUpdated';

  /**
   * Creates a new ScoreUpdated domain event.
   *
   * @param gameId - Unique identifier for the game where score changed
   * @param scoringTeam - Which team scored ('HOME' | 'AWAY')
   * @param runsAdded - Number of runs added in this update (must be positive)
   * @param newScore - Complete score state after this update
   * @throws {DomainError} When parameters are invalid
   */
  constructor(
    readonly gameId: GameId,
    readonly scoringTeam: 'HOME' | 'AWAY',
    readonly runsAdded: number,
    readonly newScore: { home: number; away: number }
  ) {
    super();
    ScoreUpdated.validateScoringTeam(scoringTeam);
    ScoreUpdated.validateRunsAdded(runsAdded);
    ScoreUpdated.validateNewScore(newScore);
    // Freeze the score object to prevent mutations
    Object.freeze(this.newScore);
  }

  /**
   * Validates the scoring team designation.
   *
   * @param scoringTeam - Team designation to validate
   * @throws {DomainError} When team is not 'HOME' or 'AWAY'
   */
  private static validateScoringTeam(scoringTeam: string): void {
    if (scoringTeam !== 'HOME' && scoringTeam !== 'AWAY') {
      throw new DomainError('Scoring team must be either HOME or AWAY');
    }
  }

  /**
   * Validates the number of runs added in this update.
   *
   * @param runsAdded - Number of runs to validate
   * @throws {DomainError} When runs added is invalid
   */
  private static validateRunsAdded(runsAdded: number): void {
    if (typeof runsAdded !== 'number' || Number.isNaN(runsAdded)) {
      throw new DomainError('Runs added must be a valid number');
    }
    if (!Number.isFinite(runsAdded)) {
      throw new DomainError('Runs added must be a finite number');
    }
    if (runsAdded <= 0) {
      throw new DomainError('Runs added must be greater than zero');
    }
    if (!Number.isInteger(runsAdded)) {
      throw new DomainError('Runs added must be an integer');
    }
  }

  /**
   * Validates the complete score object after the update.
   *
   * @param newScore - Score object to validate
   * @throws {DomainError} When scores are invalid
   */
  private static validateNewScore(newScore: { home: number; away: number }): void {
    ScoreUpdated.validateScoreValue(newScore.home, 'Home');
    ScoreUpdated.validateScoreValue(newScore.away, 'Away');
  }

  /**
   * Validates an individual score value.
   *
   * @param score - Score value to validate
   * @param teamName - Team name for error messages
   * @throws {DomainError} When score is invalid
   */
  private static validateScoreValue(score: number, teamName: string): void {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new DomainError(`${teamName} score must be a valid number`);
    }
    if (!Number.isFinite(score)) {
      throw new DomainError(`${teamName} score must be a finite number`);
    }
    if (score < 0) {
      throw new DomainError(`${teamName} score cannot be negative`);
    }
    if (!Number.isInteger(score)) {
      throw new DomainError(`${teamName} score must be an integer`);
    }
  }
}
