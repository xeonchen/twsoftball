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

import { ValidationError } from '../errors/ValidationError.js';
import { CommonValidators } from '../utils/CommonValidators.js';

/**
 * Validation error for EndInningCommand
 */
export class EndInningCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'EndInningCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, EndInningCommandValidationError.prototype);
  }
}

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

/**
 * Validation functions for EndInningCommand
 */
export const EndInningCommandValidator = {
  /**
   * Validates an EndInningCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {EndInningCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   EndInningCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: EndInningCommand): void {
    this.validateBasicFields(command);
    this.validateGameState(command);
    if (command.notes !== undefined) {
      this.validateNotes(command.notes);
    }
    if (command.timestamp !== undefined) {
      this.validateTimestamp(command.timestamp);
    }
  },

  /**
   * Validates basic command fields
   */
  validateBasicFields(command: EndInningCommand): void {
    CommonValidators.validateGameId(
      command.gameId,
      (msg, field, value) => new EndInningCommandValidationError(msg, field, value)
    );

    CommonValidators.validateInning(
      command.inning,
      (msg, field, value) => new EndInningCommandValidationError(msg, field, value)
    );

    if (typeof command.isTopHalf !== 'boolean') {
      throw new EndInningCommandValidationError(
        'isTopHalf must be a boolean',
        'isTopHalf',
        command.isTopHalf
      );
    }

    if (!command.endingReason) {
      throw new EndInningCommandValidationError(
        'endingReason is required',
        'endingReason',
        command.endingReason
      );
    }

    const validReasons = ['THREE_OUTS', 'MERCY_RULE', 'TIME_LIMIT', 'FORFEIT', 'WALKOFF', 'MANUAL'];
    if (!validReasons.includes(command.endingReason)) {
      throw new EndInningCommandValidationError(
        `endingReason must be one of: ${validReasons.join(', ')}`,
        'endingReason',
        command.endingReason
      );
    }
  },

  /**
   * Validates game state fields
   */
  validateGameState(command: EndInningCommand): void {
    CommonValidators.validateOuts(
      command.finalOuts,
      'finalOuts',
      (msg, field, value) => new EndInningCommandValidationError(msg, field, value)
    );

    if (command.gameEnding !== undefined && typeof command.gameEnding !== 'boolean') {
      throw new EndInningCommandValidationError(
        'gameEnding must be a boolean if provided',
        'gameEnding',
        command.gameEnding
      );
    }

    // Business rule: For regulation ending, finalOuts should be 3 (unless special circumstances)
    if (command.endingReason === 'THREE_OUTS' && command.finalOuts !== 3) {
      throw new EndInningCommandValidationError(
        'finalOuts must be 3 when endingReason is THREE_OUTS',
        'finalOuts',
        command.finalOuts
      );
    }

    // Business rule: For walkoff, game must be ending
    if (command.endingReason === 'WALKOFF' && !command.gameEnding) {
      throw new EndInningCommandValidationError(
        'gameEnding must be true when endingReason is WALKOFF',
        'gameEnding',
        command.gameEnding
      );
    }
  },

  /**
   * Validates optional notes field
   */
  validateNotes(notes: string): void {
    CommonValidators.validateNotes(
      notes,
      (msg, field, value) => new EndInningCommandValidationError(msg, field, value)
    );
  },

  /**
   * Validates optional timestamp field
   */
  validateTimestamp(timestamp: Date): void {
    CommonValidators.validateTimestamp(
      timestamp,
      (msg, field, value) => new EndInningCommandValidationError(msg, field, value)
    );
  },
};

/**
 * Factory functions for creating EndInningCommand instances
 */
export const EndInningCommandFactory = {
  /**
   * Creates a standard three-outs EndInningCommand
   */
  createThreeOuts(
    gameId: GameId,
    inning: number,
    isTopHalf: boolean,
    gameEnding = false,
    notes?: string
  ): EndInningCommand {
    const command: EndInningCommand = {
      gameId,
      inning,
      isTopHalf,
      endingReason: 'THREE_OUTS',
      finalOuts: 3,
      gameEnding,
      ...(notes !== undefined && { notes }),
      timestamp: new Date(),
    };

    EndInningCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a walkoff EndInningCommand
   */
  createWalkoff(
    gameId: GameId,
    inning: number,
    finalOuts: number,
    notes?: string
  ): EndInningCommand {
    const command: EndInningCommand = {
      gameId,
      inning,
      isTopHalf: false, // Walkoffs happen in bottom half
      endingReason: 'WALKOFF',
      finalOuts,
      gameEnding: true, // Walkoffs always end the game
      notes: notes || 'Game-winning run scored',
      timestamp: new Date(),
    };

    EndInningCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a mercy rule EndInningCommand
   */
  createMercyRule(
    gameId: GameId,
    inning: number,
    isTopHalf: boolean,
    finalOuts: number,
    notes?: string
  ): EndInningCommand {
    const command: EndInningCommand = {
      gameId,
      inning,
      isTopHalf,
      endingReason: 'MERCY_RULE',
      finalOuts,
      gameEnding: true, // Mercy rule always ends the game
      notes: notes || `Mercy rule applied after ${inning} innings`,
      timestamp: new Date(),
    };

    EndInningCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a forfeit EndInningCommand
   */
  createForfeit(
    gameId: GameId,
    inning: number,
    isTopHalf: boolean,
    finalOuts: number,
    notes?: string
  ): EndInningCommand {
    const command: EndInningCommand = {
      gameId,
      inning,
      isTopHalf,
      endingReason: 'FORFEIT',
      finalOuts,
      gameEnding: true, // Forfeit always ends the game
      notes: notes || 'Game ended due to forfeit',
      timestamp: new Date(),
    };

    EndInningCommandValidator.validate(command);
    return command;
  },
};
