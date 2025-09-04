/**
 * @file AtBatResult
 * Result DTO returned after recording an at-bat during a softball game.
 *
 * @remarks
 * This result encapsulates the complete outcome of recording a single at-bat,
 * including the updated game state, statistical impact (runs scored, RBI),
 * and any significant game events (inning ended, game ended).
 *
 * The result provides comprehensive information for both successful at-bat
 * recordings and error scenarios. For successful recordings, it includes
 * the updated game state that reflects all changes from the at-bat.
 *
 * Game flow indicators (inningEnded, gameEnded) help the presentation layer
 * understand when significant transitions occur and may need special handling
 * like inning summary displays or game completion ceremonies.
 *
 * @example
 * ```typescript
 * // Successful RBI double that scores one run
 * const successResult: AtBatResult = {
 *   success: true,
 *   gameState: updatedGameState, // Complete updated state
 *   runsScored: 1,
 *   rbiAwarded: 1,
 *   inningEnded: false,
 *   gameEnded: false,
 *   errors: undefined
 * };
 *
 * // Game-ending walkoff home run
 * const walkoffResult: AtBatResult = {
 *   success: true,
 *   gameState: finalGameState,
 *   runsScored: 2,
 *   rbiAwarded: 2,
 *   inningEnded: true,
 *   gameEnded: true, // Game ends immediately
 *   errors: undefined
 * };
 *
 * // Failed at-bat due to validation error
 * const errorResult: AtBatResult = {
 *   success: false,
 *   gameState: currentGameState, // Unchanged state
 *   runsScored: 0,
 *   rbiAwarded: 0,
 *   inningEnded: false,
 *   gameEnded: false,
 *   errors: ['Invalid batter: Player not in current lineup']
 * };
 * ```
 */

import { GameStateDTO } from './GameStateDTO';

/**
 * Result DTO returned after attempting to record an at-bat.
 *
 * @remarks
 * This interface provides the complete outcome of recording a plate appearance,
 * including the updated game state and statistical impact. It enables the
 * presentation layer to understand both the immediate effects and broader
 * game flow implications.
 *
 * Statistical tracking includes:
 * - Runs scored: Players who crossed home plate due to this at-bat
 * - RBI awarded: Runs batted in credited to the batter per scoring rules
 *
 * Game flow tracking includes:
 * - Inning ended: Third out recorded, inning switches sides
 * - Game ended: Game completed due to regulation, mercy rule, or walkoff
 *
 * The game state is always provided (even for errors) to maintain consistency
 * and enable proper error handling with context.
 */
export interface AtBatResult {
  /** Whether the at-bat was successfully recorded */
  readonly success: boolean;

  /**
   * Complete game state after the at-bat
   * For successful recordings: updated with all changes
   * For errors: current state for context
   */
  readonly gameState: GameStateDTO;

  /**
   * Number of runs scored as a result of this at-bat
   * Includes all runners who crossed home plate due to this play
   * Zero for most outs, strikeouts, and non-scoring hits
   */
  readonly runsScored: number;

  /**
   * RBI (Runs Batted In) awarded to the batter
   * Follows official softball RBI rules:
   * - Credited for runs scored on hits, sacrifice flies, bases-loaded walks
   * - Not credited for runs scored on errors or fielder's choice
   * - Batter gets RBI for their own home run
   */
  readonly rbiAwarded: number;

  /**
   * Whether this at-bat caused the inning to end
   * True when:
   * - Third out is recorded (ground out, fly out, strikeout, etc.)
   * - Game ends mid-inning (walkoff, mercy rule)
   */
  readonly inningEnded: boolean;

  /**
   * Whether this at-bat caused the game to end
   * True when:
   * - Mercy rule triggered (large lead after minimum innings)
   * - Walkoff hit gives home team the win
   * - Final out of regulation game
   * - Time limit reached (if applicable)
   */
  readonly gameEnded: boolean;

  /**
   * Detailed error messages for failed at-bat recordings
   * Undefined for successful recordings
   *
   * Common error types:
   * - 'Invalid batter: Player not found in current lineup'
   * - 'Invalid runner movement: Cannot advance from X to Y'
   * - 'Game state error: Cannot record at-bat when game is completed'
   * - 'Business rule violation: At-bat result inconsistent with game state'
   */
  readonly errors?: string[];
}
