import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamValidation } from '../utils/TeamValidation';
import { ScoreValidator } from '../validators/ScoreValidator';
import { EventDataValidator } from '../validators/EventDataValidator';

/**
 * Domain event representing a run being scored during a softball game.
 *
 * This event is part of the fine-grained event sourcing design, capturing each individual
 * run scored with proper RBI attribution according to softball rules. This granular approach
 * enables accurate run tracking, statistical calculation, and complete undo/redo functionality.
 *
 * @remarks
 * **RBI Attribution Rules:**
 * - RBI is awarded when a batter's action directly causes a run to score
 * - Normal hits that drive in runs earn RBIs (except during double/triple plays)
 * - Sacrifice flies earn RBIs (except with 2 outs where the out negates the RBI)
 * - Walks or hit-by-pitch with bases loaded earn RBIs
 * - Force plays at home may or may not earn RBIs depending on circumstances
 *
 * **No RBI Scenarios:**
 * - Runs scored during double plays or triple plays
 * - Runs scored due to fielding errors
 * - Runs scored on fielder's choice when the batter reaches safely
 * - Wild pitches or passed balls (though these are rare in slow-pitch)
 *
 * **Event Sourcing Context:**
 * This event is replayed during game state reconstruction and can be reversed
 * during undo operations. The complete score state is included to ensure
 * event ordering independence and facilitate efficient state rebuilding.
 *
 * @example
 * ```typescript
 * // Normal RBI scenario - single drives in runner from second base
 * const rbiEvent = new RunScored(
 *   gameId,
 *   runnerId,        // Player who scored from second base
 *   'HOME',          // Home team is batting
 *   batterId,        // Batter gets RBI credit
 *   { home: 3, away: 2 }  // New score after this run
 * );
 *
 * // Sacrifice fly scenario - batter out but runner tags up and scores
 * const sacrificeEvent = new RunScored(
 *   gameId,
 *   runnerId,        // Player who tagged up from third
 *   'AWAY',          // Away team batting
 *   batterId,        // Batter gets RBI despite being out
 *   { home: 2, away: 4 }  // New score
 * );
 *
 * // Error scenario - no RBI awarded
 * const errorEvent = new RunScored(
 *   gameId,
 *   runnerId,        // Player who scored due to error
 *   'HOME',          // Home team batting
 *   null,            // No RBI credit - error caused the run
 *   { home: 5, away: 3 }  // New score
 * );
 *
 * // Double play scenario - runner scores but no RBI due to double play
 * const doublePlayEvent = new RunScored(
 *   gameId,
 *   runnerId,        // Player who scored from third
 *   'AWAY',          // Away team batting
 *   null,            // No RBI - double play negates RBI credit
 *   { home: 1, away: 1 }  // New score
 * );
 * ```
 */
export class RunScored extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'RunScored';

  /**
   * Creates a new RunScored domain event with proper RBI attribution.
   *
   * This constructor validates all inputs according to softball business rules
   * and freezes the score object to maintain immutability for event sourcing.
   *
   * @param gameId - Event sourcing aggregate root identifier for the game
   * @param scorerId - PlayerId of the runner who crossed home plate to score
   * @param battingTeam - Which team is currently at bat ('HOME' | 'AWAY')
   * @param rbiCreditedTo - PlayerId of the batter who gets RBI credit, or null if no RBI
   * @param newScore - Complete game score after this run: { home: number, away: number }
   *
   * @remarks
   * **Parameter Business Logic:**
   *
   * - `gameId`: Links this event to the specific game aggregate for event sourcing
   *
   * - `scorerId`: The actual player who scored the run. This is always required
   *   as every run must be attributed to a specific player for statistical tracking
   *
   * - `battingTeam`: Indicates which team is at bat when this run scores. This is
   *   crucial for determining which team's score increases and for RBI attribution
   *
   * - `rbiCreditedTo`: The batter who gets RBI credit, following these rules:
   *   - Normal hits that drive in runs = RBI awarded
   *   - Sacrifice flies (except with 2 outs) = RBI awarded
   *   - Walks with bases loaded = RBI awarded
   *   - Double/triple plays = null (no RBI)
   *   - Fielding errors = null (no RBI)
   *   - Fielder's choice = null (usually no RBI)
   *
   * - `newScore`: Complete score state after this run is added. Including both
   *   team scores ensures event ordering independence and enables efficient
   *   state reconstruction during event replay
   *
   * @throws {DomainError} When battingTeam is not 'HOME' or 'AWAY'
   * @throws {DomainError} When either score is negative, non-integer, or invalid
   *
   * @example
   * ```typescript
   * // Bases loaded walk - batter gets RBI for forcing in run
   * const walkRBI = new RunScored(
   *   new GameId('game-123'),
   *   new PlayerId('runner-456'),  // Runner forced home from third
   *   'HOME',                      // Home team batting
   *   new PlayerId('batter-789'),  // Batter gets RBI for walk
   *   { home: 4, away: 2 }         // Score after run
   * );
   * ```
   */
  constructor(
    readonly gameId: GameId,
    readonly scorerId: PlayerId,
    readonly battingTeam: 'HOME' | 'AWAY',
    readonly rbiCreditedTo: PlayerId | null,
    readonly newScore: { home: number; away: number }
  ) {
    super();
    EventDataValidator.validateEventMetadata(gameId);
    TeamValidation.validateTeamDesignation(battingTeam, 'battingTeam');
    ScoreValidator.validateScore(newScore);
    // Freeze the score object to prevent mutations using centralized utility
    this.newScore = EventDataValidator.freezeData(newScore);
  }
}
