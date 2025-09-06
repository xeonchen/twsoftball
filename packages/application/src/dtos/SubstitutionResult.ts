/**
 * @file SubstitutionResult
 * Result DTO returned after attempting to substitute a player in a softball game.
 *
 * @remarks
 * This result encapsulates the outcome of the SubstitutePlayer use case, providing
 * either a successful substitution with updated game state, or detailed error
 * information explaining why the substitution could not be completed.
 *
 * The result follows the standard pattern where success indicates whether the
 * operation completed successfully, with additional fields providing either
 * the successful outcome data or comprehensive error details.
 *
 * For successful substitutions, the result includes:
 * - Updated game state with new lineup configuration
 * - Substitution details for confirmation and audit purposes
 * - Generated domain events for downstream processing
 * - Complete lineup state for UI updates
 *
 * For failed substitutions, detailed errors explain:
 * - Rule violations (re-entry limits, timing constraints)
 * - Player eligibility issues (not in lineup, already active)
 * - Game state problems (game not in progress, invalid inning)
 * - Data validation failures (invalid positions, duplicate jerseys)
 *
 * @example
 * ```typescript
 * // Successful regular substitution
 * const successResult: SubstitutionResult = {
 *   success: true,
 *   gameState: updatedGameStateDTO,
 *   substitutionDetails: {
 *     battingSlot: 1,
 *     outgoingPlayerName: 'John Starter',
 *     incomingPlayerName: 'Relief Johnson',
 *     newFieldPosition: FieldPosition.PITCHER,
 *     inning: 5,
 *     wasReentry: false,
 *     timestamp: new Date()
 *   },
 *   positionChanged: true,
 *   reentryUsed: false,
 *   errors: undefined
 * };
 *
 * // Failed substitution due to re-entry rule violation
 * const errorResult: SubstitutionResult = {
 *   success: false,
 *   gameState: currentGameStateDTO, // Current state for context
 *   substitutionDetails: undefined,
 *   positionChanged: false,
 *   reentryUsed: false,
 *   errors: [
 *     'Starter can only re-enter once per game',
 *     'Player has already used their re-entry opportunity in inning 6'
 *   ]
 * };
 * ```
 */

import { FieldPosition } from '@twsoftball/domain';

import { GameStateDTO } from './GameStateDTO';

/**
 * Result DTO returned after attempting to substitute a player in a game.
 *
 * @remarks
 * This interface provides the outcome of player substitution attempts, including
 * either the updated game state for successful substitutions, or detailed error
 * information for failed attempts.
 *
 * **Success Scenarios Include**:
 * - Valid regular substitutions with eligible players
 * - Successful starter re-entry within rule constraints
 * - Valid field position changes and assignments
 * - Proper timing and game state conditions
 * - Successful domain aggregate updates and event generation
 *
 * **Error Scenarios Include**:
 * - Re-entry rule violations (non-starter attempting re-entry, multiple re-entries)
 * - Timing constraints (substitution in same inning player entered)
 * - Player eligibility issues (player not in lineup, already active elsewhere)
 * - Game state violations (game not in progress, invalid inning)
 * - Data validation failures (duplicate jersey numbers, invalid positions)
 * - Business rule violations (lineup size limits, position coverage)
 *
 * The substitutionDetails field provides comprehensive information about
 * successful substitutions for confirmation, audit logging, and UI updates.
 * This includes both the change details and timing information.
 */
export interface SubstitutionResult {
  /** Whether the substitution was successfully completed */
  readonly success: boolean;

  /**
   * Updated game state after successful substitution or current state for failed attempts
   *
   * @remarks
   * For successful substitutions, contains the complete updated game state with:
   * - Modified team lineup with new player assignments
   * - Updated field position mappings
   * - Current batting order and active players
   * - Complete game context for UI state updates
   *
   * For failed substitutions, provides current game state for context,
   * enabling UI to maintain accurate display even during error conditions.
   */
  readonly gameState: GameStateDTO;

  /**
   * Detailed information about the successful substitution
   * Undefined for failed substitution attempts
   *
   * @remarks
   * Contains comprehensive substitution details for:
   * - User confirmation and feedback
   * - Audit logging and game history
   * - Statistical tracking and analysis
   * - UI state updates and display
   */
  readonly substitutionDetails?: SubstitutionDetailsDTO;

  /**
   * Whether this substitution involved a field position change
   *
   * @remarks
   * Indicates if the incoming player is playing a different defensive position
   * than the outgoing player. This affects:
   * - Strategic analysis and coaching decisions
   * - Defensive capability assessment
   * - Position-specific statistics tracking
   * - Fielding arrangement displays
   */
  readonly positionChanged: boolean;

  /**
   * Whether this substitution used a starter's re-entry opportunity
   *
   * @remarks
   * Tracks when a starter has used their single allowed re-entry, which affects:
   * - Future substitution eligibility for this player
   * - Strategic planning for remaining game
   * - Rule compliance and official scorekeeping
   * - Coach decision-making for player management
   */
  readonly reentryUsed: boolean;

  /**
   * Detailed error messages for failed substitution attempts
   * Undefined for successful substitutions
   *
   * @remarks
   * Provides user-friendly error messages explaining why substitution failed:
   * - 'Player is not eligible for re-entry: not an original starter'
   * - 'Starter can only re-enter once per game'
   * - 'Cannot substitute in the same inning player entered'
   * - 'Player is not currently in batting slot 3'
   * - 'Game must be in progress to make substitutions'
   * - 'Jersey number 12 is already assigned to another player'
   * - 'Invalid field position for current game rules'
   */
  readonly errors?: string[];
}

/**
 * Detailed information about a successful player substitution.
 *
 * @remarks
 * This interface captures all relevant details about a completed substitution
 * for confirmation, audit purposes, and downstream processing. It provides
 * both the transaction details (what changed) and contextual information
 * (when, where, why) needed for comprehensive game tracking.
 *
 * **Information Categories**:
 * - **Position Details**: Batting slot and field position information
 * - **Player Details**: Names and identification for confirmation
 * - **Timing Information**: When substitution occurred in game flow
 * - **Rule Context**: Re-entry status and rule compliance
 * - **Metadata**: Timestamps and optional notes for record-keeping
 *
 * This comprehensive record enables:
 * - User confirmation displays
 * - Official scorekeeping and statistics
 * - Game replay and analysis
 * - Rule compliance auditing
 * - Strategic analysis and coaching evaluation
 */
export interface SubstitutionDetailsDTO {
  /**
   * Batting order position where substitution occurred (1-30)
   * Indicates which slot in the lineup was affected
   */
  readonly battingSlot: number;

  /** Display name of player who was substituted out */
  readonly outgoingPlayerName: string;

  /** Display name of player who was substituted in */
  readonly incomingPlayerName: string;

  /**
   * Field position where incoming player will play defensively
   * May be different from outgoing player's position
   */
  readonly newFieldPosition: FieldPosition;

  /**
   * Field position that outgoing player was playing
   * Enables position change analysis and strategic evaluation
   */
  readonly previousFieldPosition?: FieldPosition;

  /**
   * Inning when substitution occurred (1-based)
   * Critical for rule validation and game flow tracking
   */
  readonly inning: number;

  /**
   * True if this substitution was a starter re-entering the game
   * Important for rule compliance and strategic tracking
   */
  readonly wasReentry: boolean;

  /**
   * Optional notes about the substitution context
   * Preserves coaching decisions and strategic reasoning
   */
  readonly notes?: string;

  /**
   * When this substitution was completed
   * System timestamp for audit and synchronization purposes
   */
  readonly timestamp: Date;
}
