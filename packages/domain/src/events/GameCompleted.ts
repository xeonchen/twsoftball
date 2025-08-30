import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { DomainError } from '../errors/DomainError';

/**
 * Domain event representing the completion of a softball game.
 *
 * @remarks
 * This event marks the end of a game's lifecycle, capturing how the game ended
 * and the final state. Once a game is completed, no further gameplay modifications
 * are permitted, making this event crucial for maintaining game integrity.
 *
 * **Ending Types:**
 * - REGULATION: Game completed after regulation innings (typically 7)
 * - MERCY_RULE: Game ended early due to large run differential
 * - FORFEIT: Game awarded to one team due to forfeit by other team
 * - TIME_LIMIT: Game ended due to time restrictions
 *
 * **Business Impact:**
 * - Finalizes game statistics and standings calculations
 * - Prevents any further modifications to game state
 * - Triggers post-game processing (statistics, reports, etc.)
 * - Establishes official game result for league records
 *
 * **Event Sourcing Context:**
 * - Final event in most game event streams
 * - Contains complete final state for game reconstruction
 * - Enables proper game state validation in future operations
 *
 * @example
 * ```typescript
 * // Regulation game completion
 * const completed = new GameCompleted(
 *   gameId,
 *   'REGULATION',
 *   { home: 8, away: 5 },
 *   7  // Completed after 7 innings
 * );
 *
 * // Mercy rule completion
 * const mercyRule = new GameCompleted(
 *   gameId,
 *   'MERCY_RULE',
 *   { home: 15, away: 0 },
 *   5  // Ended early in 5th inning
 * );
 * ```
 */
export class GameCompleted extends DomainEvent {
  /** Event type identifier for event sourcing deserialization */
  readonly type = 'GameCompleted';

  /**
   * Creates a new GameCompleted domain event.
   *
   * @param gameId - Unique identifier for the completed game
   * @param endingType - How the game ended (regulation, mercy rule, etc.)
   * @param finalScore - Final score when game ended
   * @param completedInning - Inning when game was completed
   * @throws {DomainError} When ending type is invalid or scores are invalid
   */
  constructor(
    readonly gameId: GameId,
    readonly endingType: 'REGULATION' | 'MERCY_RULE' | 'FORFEIT' | 'TIME_LIMIT',
    readonly finalScore: { home: number; away: number },
    readonly completedInning: number
  ) {
    super();
    GameCompleted.validateEndingType(endingType);
    GameCompleted.validateFinalScore(finalScore);
    GameCompleted.validateCompletedInning(completedInning);
    // Freeze the score object to prevent mutations
    Object.freeze(this.finalScore);
  }

  /**
   * Validates the ending type is a recognized game completion reason.
   *
   * @param endingType - The ending type to validate
   * @throws {DomainError} When ending type is not recognized
   */
  private static validateEndingType(endingType: string): void {
    const validTypes = ['REGULATION', 'MERCY_RULE', 'FORFEIT', 'TIME_LIMIT'];
    if (!validTypes.includes(endingType)) {
      throw new DomainError(
        `Invalid ending type: ${endingType}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  /**
   * Validates the final score object contains valid scores.
   *
   * @param finalScore - Score object to validate
   * @throws {DomainError} When scores are invalid
   */
  private static validateFinalScore(finalScore: { home: number; away: number }): void {
    GameCompleted.validateScoreValue(finalScore.home, 'Home');
    GameCompleted.validateScoreValue(finalScore.away, 'Away');
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

  /**
   * Validates the completed inning number.
   *
   * @param completedInning - Inning number to validate
   * @throws {DomainError} When inning is invalid
   */
  private static validateCompletedInning(completedInning: number): void {
    if (typeof completedInning !== 'number' || Number.isNaN(completedInning)) {
      throw new DomainError('Completed inning must be a valid number');
    }
    if (completedInning < 1) {
      throw new DomainError('Completed inning must be 1 or greater');
    }
    if (!Number.isInteger(completedInning)) {
      throw new DomainError('Completed inning must be an integer');
    }
  }
}
