/**
 * @file SubstitutePlayerCommand
 * Command DTO for substituting a player in a softball game with complete substitution information.
 *
 * @remarks
 * This command encapsulates all information needed to perform a player substitution
 * in a softball game, including batting lineup and field position changes. It serves
 * as the input for the SubstitutePlayer use case, which coordinates substitution
 * across multiple domain aggregates.
 *
 * The command supports complex softball substitution scenarios including:
 * - Regular substitutions (replacing active players)
 * - Starter re-entry (original starters returning to the game)
 * - Field position changes (moving players to different defensive roles)
 * - Batting order changes (adjusting slot assignments)
 *
 * Substitution validation is handled by the use case using domain services,
 * ensuring all softball re-entry rules and timing constraints are enforced.
 *
 * @example
 * ```typescript
 * // Regular substitution - relief pitcher replaces starter
 * const substitution: SubstitutePlayerCommand = {
 *   gameId: GameId.generate(),
 *   teamLineupId: TeamLineupId.generate(),
 *   battingSlot: 1,
 *   outgoingPlayerId: PlayerId.generate(), // starter pitcher
 *   incomingPlayerId: PlayerId.generate(), // relief pitcher
 *   incomingPlayerName: 'Relief Johnson',
 *   incomingJerseyNumber: JerseyNumber.fromNumber(99),
 *   newFieldPosition: FieldPosition.PITCHER,
 *   inning: 5,
 *   isReentry: false,
 *   notes: 'Starter reached pitch limit'
 * };
 *
 * // Starter re-entry - original player returns to game
 * const reentry: SubstitutePlayerCommand = {
 *   gameId: GameId.generate(),
 *   teamLineupId: TeamLineupId.generate(),
 *   battingSlot: 3,
 *   outgoingPlayerId: substitutePitcherId,
 *   incomingPlayerId: originalStarterId,
 *   incomingPlayerName: 'John Starter',
 *   incomingJerseyNumber: JerseyNumber.fromNumber(12),
 *   newFieldPosition: FieldPosition.FIRST_BASE, // Can return to different position
 *   inning: 8,
 *   isReentry: true,
 *   notes: 'Starter returning for final innings'
 * };
 * ```
 */

import { GameId, PlayerId, TeamLineupId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

/**
 * Command to substitute a player in a softball game lineup and field positions.
 *
 * @remarks
 * This interface defines the complete information needed to execute a player
 * substitution in a softball game. It includes both the outgoing and incoming
 * player details, positioning information, and contextual data needed for
 * proper substitution validation and execution.
 *
 * **Core Information**:
 * - Game and team context (gameId, teamLineupId)
 * - Player identifiers (outgoing and incoming players)
 * - Position assignments (batting slot, field position)
 * - Timing information (inning when substitution occurs)
 * - Re-entry status (for starter re-entry scenarios)
 *
 * **Substitution Types Supported**:
 * - **Regular Substitution**: Non-starter replaces active player
 * - **Starter Re-entry**: Original starter returns to game (once per starter)
 * - **Position Change**: Player moves to different field position
 * - **Strategic Substitution**: Specialized players for specific situations
 *
 * **Validation Requirements**: The use case validates all substitution rules:
 * - Timing constraints (cannot substitute in same inning player entered)
 * - Re-entry eligibility (only starters, once per game)
 * - Jersey number uniqueness within team
 * - Field position coverage and assignments
 * - Game state requirements (game must be in progress)
 */
export interface SubstitutePlayerCommand {
  /** Game where this substitution is occurring */
  readonly gameId: GameId;

  /** Team lineup being modified by this substitution */
  readonly teamLineupId: TeamLineupId;

  /**
   * Batting slot position where substitution occurs (1-20)
   * Determines batting order position for incoming player
   */
  readonly battingSlot: number;

  /** Player currently in the batting slot who will be substituted out */
  readonly outgoingPlayerId: PlayerId;

  /** Player who will be substituted into the batting slot */
  readonly incomingPlayerId: PlayerId;

  /** Display name for the incoming player */
  readonly incomingPlayerName: string;

  /**
   * Jersey number for the incoming player
   * Must be unique within the team lineup
   */
  readonly incomingJerseyNumber: JerseyNumber;

  /**
   * Field position where incoming player will play defensively
   * Can be any valid field position including EXTRA_PLAYER
   */
  readonly newFieldPosition: FieldPosition;

  /**
   * Inning when this substitution occurs (1-based)
   * Must be later than when current player entered the slot
   */
  readonly inning: number;

  /**
   * True if this substitution represents a starter re-entering the game
   *
   * @remarks
   * In softball, only original starters can re-enter, and only once per game.
   * This flag indicates the substitution should be validated against re-entry
   * rules rather than regular substitution rules.
   *
   * Re-entry validation includes:
   * - Player must have been an original starter in this batting slot
   * - Player must not have already used their single re-entry opportunity
   * - Player must have been previously substituted out
   */
  readonly isReentry: boolean;

  /**
   * Optional notes describing the substitution context
   * Useful for scorekeeping and strategic documentation
   */
  readonly notes?: string;

  /**
   * When this substitution was requested
   * Optional - system can generate if not provided
   */
  readonly timestamp?: Date;
}
