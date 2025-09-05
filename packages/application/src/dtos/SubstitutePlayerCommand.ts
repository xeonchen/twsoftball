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
 * Validation error for SubstitutePlayerCommand
 */
export class SubstitutePlayerCommandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubstitutePlayerCommandValidationError';
  }
}

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

/**
 * Validation functions for SubstitutePlayerCommand
 */
export const SubstitutePlayerCommandValidator = {
  /**
   * Validates a SubstitutePlayerCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {SubstitutePlayerCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   SubstitutePlayerCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: SubstitutePlayerCommand): void {
    this.validateBasicFields(command);
    this.validatePlayerFields(command);
    this.validatePositionAndTiming(command);
    if (command.notes !== undefined) {
      this.validateNotes(command.notes);
    }
    if (command.timestamp !== undefined) {
      this.validateTimestamp(command.timestamp);
    }
  },

  /**
   * Validates basic command fields (gameId, teamLineupId, etc.)
   */
  validateBasicFields(command: SubstitutePlayerCommand): void {
    if (!command.gameId) {
      throw new SubstitutePlayerCommandValidationError('gameId is required');
    }

    if (!command.teamLineupId) {
      throw new SubstitutePlayerCommandValidationError('teamLineupId is required');
    }

    if (
      !Number.isInteger(command.battingSlot) ||
      command.battingSlot < 1 ||
      command.battingSlot > 20
    ) {
      throw new SubstitutePlayerCommandValidationError(
        'battingSlot must be an integer between 1 and 20'
      );
    }

    if (!Number.isInteger(command.inning) || command.inning < 1) {
      throw new SubstitutePlayerCommandValidationError(
        'inning must be a positive integer (1 or greater)'
      );
    }

    if (command.inning > 15) {
      throw new SubstitutePlayerCommandValidationError('inning cannot exceed 15 for safety limits');
    }

    if (typeof command.isReentry !== 'boolean') {
      throw new SubstitutePlayerCommandValidationError('isReentry must be a boolean');
    }
  },

  /**
   * Validates player-related fields
   */
  validatePlayerFields(command: SubstitutePlayerCommand): void {
    if (!command.outgoingPlayerId) {
      throw new SubstitutePlayerCommandValidationError('outgoingPlayerId is required');
    }

    if (!command.incomingPlayerId) {
      throw new SubstitutePlayerCommandValidationError('incomingPlayerId is required');
    }

    if (command.outgoingPlayerId.value === command.incomingPlayerId.value) {
      throw new SubstitutePlayerCommandValidationError(
        'outgoingPlayerId and incomingPlayerId cannot be the same player'
      );
    }

    if (!command.incomingPlayerName?.trim()) {
      throw new SubstitutePlayerCommandValidationError(
        'incomingPlayerName is required and cannot be empty'
      );
    }

    if (command.incomingPlayerName.length > 50) {
      throw new SubstitutePlayerCommandValidationError(
        'incomingPlayerName cannot exceed 50 characters'
      );
    }

    if (!command.incomingJerseyNumber) {
      throw new SubstitutePlayerCommandValidationError('incomingJerseyNumber is required');
    }
  },

  /**
   * Validates position and timing constraints
   */
  validatePositionAndTiming(command: SubstitutePlayerCommand): void {
    if (!Object.values(FieldPosition).includes(command.newFieldPosition)) {
      throw new SubstitutePlayerCommandValidationError(
        `newFieldPosition must be a valid FieldPosition: ${command.newFieldPosition}`
      );
    }

    // Business rule: Cannot substitute in the same inning a player entered (need at least 1 inning between)
    // This would be validated more thoroughly by the use case, but we can check basic constraints
  },

  /**
   * Validates optional notes field
   */
  validateNotes(notes: string): void {
    if (notes.length > 500) {
      throw new SubstitutePlayerCommandValidationError('notes cannot exceed 500 characters');
    }

    // Allow empty string as valid (means no notes)
    // But trim and check for meaningful content if provided
    if (notes.trim().length === 0 && notes.length > 0) {
      throw new SubstitutePlayerCommandValidationError('notes cannot be only whitespace');
    }
  },

  /**
   * Validates optional timestamp field
   */
  validateTimestamp(timestamp: Date): void {
    if (!(timestamp instanceof Date)) {
      throw new SubstitutePlayerCommandValidationError('timestamp must be a valid Date object');
    }

    if (isNaN(timestamp.getTime())) {
      throw new SubstitutePlayerCommandValidationError('timestamp must be a valid Date');
    }

    // Business rule: timestamp cannot be too far in the future
    const now = new Date();
    const maxFutureMinutes = 60; // Allow up to 1 hour in future for time zone differences
    const maxFutureTime = new Date(now.getTime() + maxFutureMinutes * 60 * 1000);

    if (timestamp > maxFutureTime) {
      throw new SubstitutePlayerCommandValidationError(
        'timestamp cannot be more than 1 hour in the future'
      );
    }

    // Business rule: timestamp cannot be too far in the past (e.g., more than 1 year ago)
    const minPastTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (timestamp < minPastTime) {
      throw new SubstitutePlayerCommandValidationError(
        'timestamp cannot be more than 1 year in the past'
      );
    }
  },
};

/**
 * Factory functions for creating SubstitutePlayerCommand instances
 */
export const SubstitutePlayerCommandFactory = {
  /**
   * Creates a regular SubstitutePlayerCommand (non-reentry)
   */
  createRegular(
    gameId: GameId,
    teamLineupId: TeamLineupId,
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayerId: PlayerId,
    incomingPlayerName: string,
    incomingJerseyNumber: JerseyNumber,
    newFieldPosition: FieldPosition,
    inning: number,
    notes?: string
  ): SubstitutePlayerCommand {
    const command: SubstitutePlayerCommand = {
      gameId,
      teamLineupId,
      battingSlot,
      outgoingPlayerId,
      incomingPlayerId,
      incomingPlayerName,
      incomingJerseyNumber,
      newFieldPosition,
      inning,
      isReentry: false,
      ...(notes !== undefined && { notes }),
      timestamp: new Date(),
    };

    SubstitutePlayerCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a reentry SubstitutePlayerCommand (starter returning)
   */
  createReentry(
    gameId: GameId,
    teamLineupId: TeamLineupId,
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    returningPlayerId: PlayerId,
    returningPlayerName: string,
    returningJerseyNumber: JerseyNumber,
    newFieldPosition: FieldPosition,
    inning: number,
    notes?: string
  ): SubstitutePlayerCommand {
    const command: SubstitutePlayerCommand = {
      gameId,
      teamLineupId,
      battingSlot,
      outgoingPlayerId,
      incomingPlayerId: returningPlayerId,
      incomingPlayerName: returningPlayerName,
      incomingJerseyNumber: returningJerseyNumber,
      newFieldPosition,
      inning,
      isReentry: true,
      notes: notes || 'Starter re-entry',
      timestamp: new Date(),
    };

    SubstitutePlayerCommandValidator.validate(command);
    return command;
  },
};
