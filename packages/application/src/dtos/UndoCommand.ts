/**
 * @file UndoCommand
 * Command DTO for undoing the last action performed in a softball game.
 *
 * @remarks
 * This command encapsulates the information needed to undo the most recent
 * action in a softball game using event sourcing patterns. It supports
 * rolling back various types of actions including at-bats, substitutions,
 * inning endings, and other game state modifications.
 *
 * The undo operation works by analyzing recent domain events and creating
 * compensating events that logically reverse the effects of the last action.
 * This preserves the complete audit trail while functionally restoring the
 * previous game state.
 *
 * **Undo Strategy**:
 * - Compensating events rather than event deletion
 * - Maintains complete audit trail and event ordering
 * - Supports multiple levels of undo/redo operations
 * - Coordinates across multiple aggregates (Game, TeamLineup, InningState)
 * - Handles complex scenarios like mid-inning undo operations
 *
 * **Supported Action Types for Undo**:
 * - At-bat results (hits, walks, outs with all runner movements)
 * - Player substitutions (restore original lineup positions)
 * - Inning endings (return to active play state)
 * - Game status changes (restart from previous state)
 *
 * @example
 * ```typescript
 * // Undo last at-bat in current game
 * const command: UndoCommand = {
 *   gameId: GameId.create('game-123'),
 *   actionLimit: 1, // Only undo last action
 *   timestamp: new Date()
 * };
 *
 * // Undo last 3 actions with confirmation notes
 * const multiCommand: UndoCommand = {
 *   gameId: GameId.create('game-123'),
 *   actionLimit: 3, // Undo last 3 actions
 *   notes: 'Correcting scoring error from previous plays',
 *   confirmDangerous: true,
 *   timestamp: new Date()
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { ValidationError } from '../errors/ValidationError';
import { CommonValidators } from '../utils/CommonValidators';

/**
 * Validation error for UndoCommand
 */
export class UndoCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'UndoCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, UndoCommandValidationError.prototype);
  }
}

/**
 * Command to undo the last action(s) performed in a softball game.
 *
 * @remarks
 * This interface defines the complete information needed to safely undo
 * recent actions in a game using event sourcing compensation patterns.
 * It includes safety mechanisms and context information to prevent
 * accidental data loss.
 *
 * **Undo Mechanics**:
 * - Analyzes recent events to determine what to undo
 * - Creates compensating events rather than deleting history
 * - Maintains referential integrity across aggregates
 * - Preserves complete audit trail for legal/regulatory compliance
 *
 * **Safety Features**:
 * - Optional confirmation for dangerous operations
 * - Limited scope to prevent accidental large-scale changes
 * - Detailed notes for audit purposes
 * - Timestamp tracking for operation sequencing
 *
 * **Action Categories**:
 * - **Simple**: Single event undo (most at-bats, substitutions)
 * - **Complex**: Multi-event undo (inning endings, scoring plays)
 * - **Dangerous**: Game state changes, multiple action rollbacks
 *
 * The command supports both single action undo (most common) and
 * multi-action undo for correcting sequences of errors.
 */
export interface UndoCommand {
  /** Game where the undo operation should be performed */
  readonly gameId: GameId;

  /**
   * Maximum number of recent actions to undo
   * Defaults to 1 if not specified
   *
   * @remarks
   * This limit prevents accidental large-scale undo operations that could
   * destabilize game state. Values above 3 are considered dangerous and
   * may require additional confirmation.
   *
   * Common values:
   * - 1: Undo last action (default, safest)
   * - 2-3: Correct recent sequence of errors
   * - 4+: Dangerous, requires confirmDangerous = true
   */
  readonly actionLimit?: number;

  /**
   * Force confirmation for potentially dangerous undo operations
   * Required for actionLimit > 3 or certain action types
   *
   * @remarks
   * Some undo operations are considered dangerous because they can
   * significantly impact game state or statistics. This flag provides
   * explicit confirmation that the user understands the consequences.
   *
   * Dangerous scenarios include:
   * - Undoing multiple actions (actionLimit > 3)
   * - Undoing inning endings (affects multiple innings)
   * - Undoing game completions (changes final scores)
   * - Undoing critical plays (walk-off hits, game winners)
   */
  readonly confirmDangerous?: boolean;

  /**
   * Optional descriptive notes about why this undo is being performed
   * Important for audit trails and understanding decision context
   *
   * @remarks
   * These notes become part of the compensating events and provide
   * valuable context for future analysis. They help explain unusual
   * undo operations and support regulatory/legal requirements.
   *
   * Examples:
   * - "Scorer incorrectly recorded hit as error"
   * - "Wrong player substituted, correcting lineup"
   * - "Umpire overturned call after video review"
   * - "Administrative correction per league rules"
   */
  readonly notes?: string;

  /**
   * When this undo command was issued
   * Optional - system can generate if not provided
   *
   * @remarks
   * Timestamp helps with event ordering and understanding the sequence
   * of actions. It's particularly important when multiple undo operations
   * might be performed in rapid succession.
   */
  readonly timestamp?: Date;
}

/**
 * Validation functions for UndoCommand
 */
export const UndoCommandValidator = {
  /**
   * Validates an UndoCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {UndoCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   UndoCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: UndoCommand): void {
    this.validateBasicFields(command);
    if (command.actionLimit !== undefined) {
      this.validateActionLimit(command.actionLimit, command.confirmDangerous);
    }
    if (command.notes !== undefined) {
      this.validateNotes(command.notes);
    }
    if (command.timestamp !== undefined) {
      this.validateTimestamp(command.timestamp);
    }
  },

  /**
   * Validates basic command fields (gameId)
   */
  validateBasicFields(command: UndoCommand): void {
    if (!command.gameId) {
      throw new UndoCommandValidationError('gameId is required');
    }
  },

  /**
   * Validates action limit and dangerous operation confirmation
   */
  validateActionLimit(actionLimit: number, confirmDangerous?: boolean): void {
    if (!Number.isInteger(actionLimit) || actionLimit < 1) {
      throw new UndoCommandValidationError('actionLimit must be a positive integer');
    }

    if (actionLimit > 10) {
      throw new UndoCommandValidationError('actionLimit cannot exceed 10 actions for safety');
    }

    if (actionLimit > 3 && !confirmDangerous) {
      throw new UndoCommandValidationError(
        'confirmDangerous must be true for actionLimit greater than 3'
      );
    }
  },

  /**
   * Validates optional notes field
   */
  validateNotes(notes: string): void {
    CommonValidators.validateNotes(
      notes,
      (msg, field, value) => new UndoCommandValidationError(msg, field, value)
    );
  },

  /**
   * Validates optional timestamp field
   */
  validateTimestamp(timestamp: Date): void {
    CommonValidators.validateTimestamp(
      timestamp,
      (msg, field, value) => new UndoCommandValidationError(msg, field, value)
    );
  },
};

/**
 * Factory functions for creating UndoCommand instances
 */
export const UndoCommandFactory = {
  /**
   * Creates a simple UndoCommand for the last action
   */
  createSimple(gameId: GameId, notes?: string): UndoCommand {
    const command: UndoCommand = {
      gameId,
      actionLimit: 1,
      ...(notes !== undefined && { notes }),
      timestamp: new Date(),
    };

    UndoCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates an UndoCommand for multiple actions (dangerous operation)
   */
  createMultiple(
    gameId: GameId,
    actionLimit: number,
    notes: string,
    confirmDangerous = true
  ): UndoCommand {
    const command: UndoCommand = {
      gameId,
      actionLimit,
      confirmDangerous,
      notes,
      timestamp: new Date(),
    };

    UndoCommandValidator.validate(command);
    return command;
  },
};
