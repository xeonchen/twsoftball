/**
 * @file GameStartResult
 * Result DTO returned after attempting to start a new softball game.
 *
 * @remarks
 * This result encapsulates the outcome of the StartNewGame use case, providing
 * either a successful game initialization with complete initial state, or
 * detailed error information explaining why the game could not be started.
 *
 * The result follows a common pattern where success indicates whether the
 * operation completed successfully, and additional fields provide either
 * the successful outcome data or error details.
 *
 * For successful game starts, the initialState contains the complete game
 * state ready for play, including empty bases, 0-0 score, first inning,
 * and the away team as the first batter.
 *
 * @example
 * ```typescript
 * // Successful game start
 * const successResult: GameStartResult = {
 *   success: true,
 *   gameId: GameId.generate(),
 *   initialState: completeGameState, // Full GameStateDTO
 *   errors: undefined
 * };
 *
 * // Failed game start due to validation errors
 * const errorResult: GameStartResult = {
 *   success: false,
 *   gameId: GameId.generate(), // May still be provided for reference
 *   initialState: undefined,
 *   errors: [
 *     'Duplicate jersey numbers: #5 assigned to multiple players',
 *     'Missing required field position: PITCHER'
 *   ]
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { GameStateDTO } from './GameStateDTO';

/**
 * Result DTO returned after attempting to start a new game.
 *
 * @remarks
 * This interface provides the outcome of game initialization, including
 * either the complete initial game state for successful starts, or
 * detailed error information for failed attempts.
 *
 * Success scenarios include:
 * - Valid team names and lineup configuration
 * - All required field positions assigned
 * - Unique jersey numbers within team
 * - Valid game rules configuration
 * - Successful domain entity creation
 *
 * Error scenarios include:
 * - Invalid or duplicate player information
 * - Missing required field positions
 * - Invalid game rules or configuration
 * - Business rule violations (lineup size, etc.)
 * - Domain validation failures
 *
 * The gameId is provided in both success and error cases to maintain
 * traceability and enable proper error handling and logging.
 */
export interface GameStartResult {
  /** Whether the game was successfully started */
  readonly success: boolean;

  /**
   * Unique identifier for the game
   * Provided for both successful and failed attempts
   */
  readonly gameId: GameId;

  /**
   * Complete initial game state after successful start
   * Undefined for failed game start attempts
   *
   * Contains:
   * - Empty bases (no runners)
   * - 0-0 score (tied game)
   * - Top of 1st inning (away team batting first)
   * - Complete lineups for both teams
   * - First batter ready to bat
   */
  readonly initialState?: GameStateDTO;

  /**
   * Detailed error messages for failed game starts
   * Undefined for successful attempts
   *
   * Common error types:
   * - 'Duplicate jersey numbers: #X assigned to multiple players'
   * - 'Missing required field position: POSITION_NAME'
   * - 'Invalid lineup size: Must have 9-30 players'
   * - 'Team name cannot be empty'
   * - 'Game date cannot be in the past'
   */
  readonly errors?: string[];
}
