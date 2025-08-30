import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { TeamValidation } from '../utils/TeamValidation';
import { ScoreValidator } from '../validators/ScoreValidator';
import { EventDataValidator } from '../validators/EventDataValidator';

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
    EventDataValidator.validateEventMetadata(gameId);
    TeamValidation.validateTeamDesignation(scoringTeam, 'Scoring team');
    ScoreValidator.validateRunsAdded(runsAdded);
    ScoreValidator.validateScore(newScore);
    // Freeze the score object to prevent mutations using centralized utility
    this.newScore = EventDataValidator.freezeData(newScore);
  }
}
