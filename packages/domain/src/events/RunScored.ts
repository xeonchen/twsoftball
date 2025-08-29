import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';
import { DomainError } from '../errors/DomainError';

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
    RunScored.validateBattingTeam(battingTeam);
    RunScored.validateNewScore(newScore);
    // Freeze the score object to prevent mutations
    Object.freeze(this.newScore);
  }

  /**
   * Validates that the batting team is either 'HOME' or 'AWAY'.
   *
   * This validation ensures that run scoring events are properly attributed
   * to the correct team. In softball, only the batting team can score runs,
   * and this must be clearly identified for accurate scorekeeping and RBI attribution.
   *
   * @param battingTeam - The team designation to validate
   * @throws {DomainError} When battingTeam is not exactly 'HOME' or 'AWAY'
   *
   * @remarks
   * **Business Reasoning:**
   * - Runs can only be scored by the team currently at bat
   * - Clear team identification is essential for determining which score to increment
   * - RBI attribution depends on knowing which team the batter belongs to
   * - Game state consistency requires unambiguous team designation
   */
  private static validateBattingTeam(battingTeam: string): void {
    if (battingTeam !== 'HOME' && battingTeam !== 'AWAY') {
      throw new DomainError('battingTeam must be either HOME or AWAY');
    }
  }

  /**
   * Validates the complete score object after a run is scored.
   *
   * This method ensures both home and away scores meet business requirements
   * for valid softball game scoring. The score object represents the complete
   * game state after this run event and must maintain data integrity for
   * proper event sourcing and state reconstruction.
   *
   * @param newScore - Score object containing both team scores to validate
   * @throws {DomainError} When either home or away score is invalid
   *
   * @remarks
   * **Score Validation Requirements:**
   * - Both scores must be valid finite numbers (no NaN, Infinity)
   * - Both scores must be non-negative integers (runs cannot be negative)
   * - Scores must be whole numbers (fractional runs don't exist)
   *
   * **Business Context:**
   * - Complete score state enables event ordering independence
   * - Validates game state consistency after run scoring
   * - Ensures proper data types for statistical calculations
   * - Maintains audit trail integrity for undo/redo operations
   */
  private static validateNewScore(newScore: { home: number; away: number }): void {
    RunScored.validateScoreValue(newScore.home, 'Home');
    RunScored.validateScoreValue(newScore.away, 'Away');
  }

  /**
   * Validates an individual team's score value according to softball business rules.
   *
   * This method performs comprehensive validation to ensure score values are
   * mathematically and business-logically valid for softball scoring. Each validation
   * check corresponds to a specific business requirement for maintaining game integrity.
   *
   * @param score - The numeric score value to validate
   * @param teamName - Team name for error messages ('Home' or 'Away')
   * @throws {DomainError} When score fails any validation check
   *
   * @remarks
   * **Validation Logic & Business Reasoning:**
   *
   * 1. **Type & NaN Check**: Ensures the score is actually a number
   *    - Prevents runtime errors in score calculations
   *    - Guards against undefined/null/string values
   *
   * 2. **Finite Number Check**: Rejects Infinity and -Infinity values
   *    - Infinite scores are impossible in real softball games
   *    - Ensures mathematical operations remain bounded
   *
   * 3. **Non-Negative Check**: Prevents negative run totals
   *    - Teams cannot have negative runs in softball
   *    - Maintains logical consistency of scoring system
   *
   * 4. **Integer Check**: Ensures scores are whole numbers
   *    - Fractional runs don't exist in softball rules
   *    - Prevents decimal scoring inconsistencies
   *
   * **Game State Integrity:**
   * - Valid scores are essential for proper game state reconstruction
   * - Score validation ensures event sourcing replay accuracy
   * - Prevents corrupted game data from breaking statistics
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
