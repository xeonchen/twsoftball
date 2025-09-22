/**
 * @file InningEndResult
 * Result DTO returned after attempting to end an inning or half-inning in a softball game.
 *
 * @remarks
 * This result encapsulates the complete outcome of the EndInning use case, providing
 * either successful inning transition details with updated game state, or detailed
 * error information explaining why the inning could not be ended.
 *
 * The result includes comprehensive information about the inning transition:
 * - Whether it was a half-inning transition or full inning advancement
 * - Updated game state reflecting all changes from the transition
 * - Game ending detection and final game status
 * - Event information for audit trails and UI updates
 *
 * Success scenarios provide complete game state and transition details to enable
 * proper UI updates, statistical tracking, and continued gameplay. Error scenarios
 * provide detailed validation failures and business rule violations.
 *
 * @example
 * ```typescript
 * // Successful half-inning transition (top → bottom)
 * const halfInningResult: InningEndResult = {
 *   success: true,
 *   gameState: updatedGameStateDTO,
 *   transitionType: 'HALF_INNING',
 *   previousHalf: { inning: 3, isTopHalf: true },
 *   newHalf: { inning: 3, isTopHalf: false },
 *   gameEnded: false,
 *   endingReason: 'THREE_OUTS',
 *   eventsGenerated: ['HalfInningEnded']
 * };
 *
 * // Successful full inning advancement (bottom → next top)
 * const fullInningResult: InningEndResult = {
 *   success: true,
 *   gameState: updatedGameStateDTO,
 *   transitionType: 'FULL_INNING',
 *   previousHalf: { inning: 5, isTopHalf: false },
 *   newHalf: { inning: 6, isTopHalf: true },
 *   gameEnded: false,
 *   endingReason: 'THREE_OUTS',
 *   eventsGenerated: ['HalfInningEnded', 'InningAdvanced']
 * };
 *
 * // Game ending due to regulation completion
 * const gameEndResult: InningEndResult = {
 *   success: true,
 *   gameState: finalGameStateDTO,
 *   transitionType: 'GAME_END',
 *   previousHalf: { inning: 7, isTopHalf: false },
 *   newHalf: null, // No new half - game over
 *   gameEnded: true,
 *   endingReason: 'THREE_OUTS',
 *   finalScore: { home: 8, away: 5 },
 *   gameEndingType: 'REGULATION',
 *   eventsGenerated: ['HalfInningEnded', 'GameCompleted']
 * };
 *
 * // Failed inning ending due to validation error
 * const errorResult: InningEndResult = {
 *   success: false,
 *   gameState: currentGameStateDTO, // Unchanged state for context
 *   transitionType: 'FAILED',
 *   previousHalf: { inning: 4, isTopHalf: true },
 *   newHalf: null,
 *   gameEnded: false,
 *   endingReason: 'THREE_OUTS',
 *   errors: ['Cannot end inning: Game is not in progress']
 * };
 * ```
 */

import { GameStateDTO } from './GameStateDTO.js';

/**
 * Represents the inning/half-inning state before and after transition.
 *
 * @remarks
 * This interface captures the specific inning and half-inning information
 * needed to understand the game state transition. It provides clear
 * before/after context for the inning ending operation.
 */
export interface InningHalfState {
  /** The inning number (1 or greater) */
  readonly inning: number;

  /** True if top half (away team), false if bottom half (home team) */
  readonly isTopHalf: boolean;
}

/**
 * Result DTO returned after attempting to end an inning or half-inning.
 *
 * @remarks
 * This interface provides the complete outcome of inning transition processing,
 * including either successful state transitions with updated game information,
 * or detailed error information for failed attempts.
 *
 * **Transition Types:**
 * - HALF_INNING: Top half ended, switched to bottom half (same inning)
 * - FULL_INNING: Bottom half ended, advanced to next inning (top half)
 * - GAME_END: Inning ending also ended the entire game
 * - FAILED: Operation failed due to validation or business rule violations
 *
 * **Success Scenarios:**
 * - Valid game state and inning transition
 * - Proper bases clearing and out count reset
 * - Correct batting order reset to leadoff position
 * - Appropriate domain event generation
 * - Game ending condition detection (regulation, mercy rule, etc.)
 *
 * **Error Scenarios:**
 * - Game not found or not in progress
 * - Invalid inning state for transition
 * - Business rule violations
 * - Infrastructure failures during state persistence
 */
export interface InningEndResult {
  /** Whether the inning ending was successful */
  readonly success: boolean;

  /**
   * Complete game state after the inning transition
   * For successful operations: updated state reflecting all changes
   * For failed operations: current state for context
   */
  readonly gameState: GameStateDTO;

  /**
   * Type of transition that occurred (or was attempted)
   * Indicates the scope and nature of the inning transition
   */
  readonly transitionType:
    | 'HALF_INNING' // Top → Bottom (same inning)
    | 'FULL_INNING' // Bottom → Top (next inning)
    | 'GAME_END' // Inning ending also ended the game
    | 'FAILED'; // Operation failed

  /**
   * Inning and half-inning state before the transition
   * Provides context about what state was being transitioned from
   */
  readonly previousHalf: InningHalfState;

  /**
   * Inning and half-inning state after the transition
   * Null when game ends (no next half to transition to)
   * Null when operation fails (no transition occurred)
   */
  readonly newHalf: InningHalfState | null;

  /**
   * Whether this inning ending also ended the entire game
   * True for regulation completion, mercy rule, walkoff, forfeit, etc.
   */
  readonly gameEnded: boolean;

  /**
   * The reason why the inning/half-inning ended
   * Same as provided in the command, preserved for audit and display
   */
  readonly endingReason:
    | 'THREE_OUTS'
    | 'MERCY_RULE'
    | 'TIME_LIMIT'
    | 'FORFEIT'
    | 'WALKOFF'
    | 'MANUAL';

  /**
   * Number of outs when the inning ended
   * Typically 3 for normal play, may be less for special endings
   * Same as provided in the command, preserved for audit and display
   */
  readonly finalOuts: number;

  /**
   * Final score when game ended
   * Only present when gameEnded is true
   * Used for final game results and statistics
   */
  readonly finalScore?: { home: number; away: number };

  /**
   * How the game ended (when gameEnded is true)
   * Categorizes the type of game completion for proper handling
   */
  readonly gameEndingType?:
    | 'REGULATION' // Completed regulation 7 innings
    | 'MERCY_RULE' // Ended early due to run differential
    | 'TIME_LIMIT' // Ended due to time restrictions
    | 'FORFEIT' // Awarded due to opponent forfeit
    | 'WALKOFF'; // Ended with walkoff hit

  /**
   * List of domain event types generated during processing
   * Useful for audit trails, debugging, and integration systems
   * Common events: HalfInningEnded, InningAdvanced, GameCompleted
   */
  readonly eventsGenerated: string[];

  /**
   * Detailed error messages for failed inning endings
   * Undefined for successful operations
   *
   * Common error types:
   * - 'Game not found: [gameId]'
   * - 'Cannot end inning: Game is not in progress'
   * - 'Invalid inning state: Expected inning X but found Y'
   * - 'Cannot end inning: Already at final out count'
   * - 'Infrastructure failure: Unable to save game state'
   */
  readonly errors?: string[];
}
