/**
 * @file EndInningCommand
 * Command DTO for ending a half-inning or full inning during a softball game.
 *
 * @remarks
 * This command encapsulates the information needed to transition between innings
 * or half-innings in a softball game. It captures the circumstances that caused
 * the inning to end (typically 3 outs recorded) and provides context for proper
 * state transitions and event generation.
 *
 * The command supports both automatic inning ending (when 3rd out is recorded
 * during normal play) and manual inning ending (for special situations like
 * forfeits, time limits, or administrative needs).
 *
 * **Inning Transition Logic:**
 * - Top half ends → Switch to bottom half (same inning number)
 * - Bottom half ends → Advance to next inning (top half)
 * - Always clear bases, reset outs to 0, return to leadoff batter
 * - May trigger game ending conditions (regulation, mercy rule, etc.)
 *
 * @example
 * ```typescript
 * // Normal 3rd out ending top of 5th inning
 * const command: EndInningCommand = {
 *   gameId: GameId.create('game-123'),
 *   inning: 5,
 *   isTopHalf: true,
 *   endingReason: 'THREE_OUTS',
 *   finalOuts: 3,
 *   timestamp: new Date()
 * };
 *
 * // Mercy rule ending game early
 * const mercyCommand: EndInningCommand = {
 *   gameId: GameId.create('game-123'),
 *   inning: 5,
 *   isTopHalf: false,
 *   endingReason: 'MERCY_RULE',
 *   finalOuts: 1, // Game ended mid-inning
 *   gameEnding: true,
 *   notes: 'Mercy rule invoked after 15-run lead'
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

/**
 * Command to end a half-inning or complete inning in a softball game.
 *
 * @remarks
 * This interface defines the complete information needed to transition between
 * innings or half-innings. It includes the game context, inning details, and
 * the specific circumstances that caused the inning to end.
 *
 * **Ending Reasons:**
 * - THREE_OUTS: Standard ending when 3rd out is recorded
 * - MERCY_RULE: Game ends early due to large run differential
 * - TIME_LIMIT: Inning/game ends due to time restrictions
 * - FORFEIT: Game awarded to opponent due to forfeit
 * - WALKOFF: Game ends immediately when home team takes the lead
 * - MANUAL: Administrative or special circumstance ending
 *
 * **Game Ending Context:**
 * The optional gameEnding flag indicates whether this inning ending also
 * completes the entire game. This is critical for proper event generation
 * and final state management.
 */
export interface EndInningCommand {
  /** Game where this inning is ending */
  readonly gameId: GameId;

  /** The inning number that is ending (1 or greater) */
  readonly inning: number;

  /**
   * True if top half is ending (away team finished batting)
   * False if bottom half is ending (home team finished batting)
   */
  readonly isTopHalf: boolean;

  /**
   * The reason why this inning/half-inning is ending
   * Determines appropriate event generation and rule application
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
   * Must be 0-3 for regulation play
   */
  readonly finalOuts: number;

  /**
   * Whether this inning ending also ends the entire game
   * True for regulation completion, mercy rule, forfeit, etc.
   * False for normal inning transitions during ongoing games
   */
  readonly gameEnding?: boolean;

  /**
   * Optional descriptive notes about the inning ending
   * Useful for unusual circumstances, mercy rule details, etc.
   */
  readonly notes?: string;

  /**
   * When this inning ending occurred
   * Optional - system can generate if not provided
   */
  readonly timestamp?: Date;
}
