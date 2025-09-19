/**
 * @file CompleteAtBatSequenceCommand
 * Command DTO for orchestrated at-bat sequence operations in GameApplicationService.
 *
 * @remarks
 * This command encapsulates the complete at-bat workflow, including the core
 * at-bat recording, optional inning end handling, substitution processing,
 * and notification management. It enables complex business operations that
 * span multiple use cases while maintaining consistency and proper error handling.
 *
 * **Workflow Coordination**:
 * - Core at-bat recording with full validation
 * - Automatic inning end detection and processing
 * - Post-at-bat substitution handling
 * - Score change notifications to external systems
 * - Error recovery and rollback capabilities
 *
 * **Business Context**:
 * An at-bat sequence represents the complete business process from when a
 * batter steps into the box until all resulting actions are completed,
 * including scoring, base running, inning changes, and team adjustments.
 *
 * @example
 * ```typescript
 * // Simple at-bat with automatic inning handling
 * const command: CompleteAtBatSequenceCommand = {
 *   gameId: GameId.create('game-123'),
 *   atBatCommand: {
 *     gameId: GameId.create('game-123'),
 *     batterId: PlayerId.create('player-456'),
 *     result: AtBatResultType.SINGLE,
 *     runnerAdvances: [...]
 *   },
 *   checkInningEnd: true,
 *   handleSubstitutions: true,
 *   notifyScoreChanges: true
 * };
 *
 * const result = await gameApplicationService.completeAtBatSequence(command);
 * if (result.success && result.inningEndResult?.success) {
 *   // Handle new inning state
 * }
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { ValidationError } from '../errors/ValidationError.js';

import { RecordAtBatCommand } from './RecordAtBatCommand.js';
import { SubstitutePlayerCommand } from './SubstitutePlayerCommand.js';

/**
 * Validation error for CompleteAtBatSequenceCommand
 */
export class CompleteAtBatSequenceCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'CompleteAtBatSequenceCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, CompleteAtBatSequenceCommandValidationError.prototype);
  }
}

/**
 * Command for executing a complete at-bat sequence with orchestrated follow-up actions.
 *
 * @remarks
 * This command enables complex business workflows that coordinate multiple
 * use cases in a single transaction-like operation. It provides fine-grained
 * control over which follow-up actions should be executed and how errors
 * should be handled.
 *
 * **Orchestration Features**:
 * - Automatic inning end detection and handling
 * - Post-at-bat substitution processing
 * - Real-time score change notifications
 * - Error recovery with partial success handling
 * - Audit logging for complete operation trail
 *
 * **Transaction Boundaries**:
 * The sequence maintains consistency across all operations, ensuring that
 * partial failures don't leave the game in an inconsistent state. Failed
 * operations can trigger compensating actions to restore proper game state.
 */
export interface CompleteAtBatSequenceCommand {
  /** Unique identifier for the game this sequence applies to */
  readonly gameId: GameId;

  /** Core at-bat command with all batting details */
  readonly atBatCommand: RecordAtBatCommand;

  /**
   * Whether to automatically check and handle inning end conditions.
   *
   * @remarks
   * When true, the service will detect if the at-bat ended the inning
   * and automatically execute the EndInning use case to advance the
   * game to the next half-inning or inning.
   *
   * @default true
   */
  readonly checkInningEnd?: boolean;

  /**
   * Whether to process any substitutions queued for after this at-bat.
   *
   * @remarks
   * Some substitutions are planned to occur after specific at-bats
   * (e.g., pinch hitter, defensive changes). When true, the service
   * will execute any pending substitutions for this timing.
   *
   * @default false
   */
  readonly handleSubstitutions?: boolean;

  /**
   * Optional substitutions to execute after the at-bat.
   *
   * @remarks
   * These substitutions will be executed only if the at-bat is successful
   * and the handleSubstitutions flag is true. They are processed in order
   * and any failure will trigger appropriate error handling.
   */
  readonly queuedSubstitutions?: SubstitutePlayerCommand[];

  /**
   * Whether to send score change notifications to external systems.
   *
   * @remarks
   * When true and the at-bat results in score changes, the service
   * will notify external systems (scoreboards, mobile apps, etc.)
   * of the updated game state.
   *
   * @default false
   */
  readonly notifyScoreChanges?: boolean;

  /**
   * Maximum number of retry attempts for failed operations.
   *
   * @remarks
   * If any part of the sequence fails due to transient issues,
   * the service will retry up to this number of times before
   * giving up and returning an error.
   *
   * @default 1
   */
  readonly maxRetryAttempts?: number;
}

/**
 * Validation functions for CompleteAtBatSequenceCommand
 */
export const CompleteAtBatSequenceCommandValidator = {
  /**
   * Validates a CompleteAtBatSequenceCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {CompleteAtBatSequenceCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   CompleteAtBatSequenceCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: CompleteAtBatSequenceCommand): void {
    this.validateBasicFields(command);
    this.validateAtBatCommand(command);
    this.validateOptions(command);
    if (command.queuedSubstitutions && command.queuedSubstitutions.length > 0) {
      this.validateQueuedSubstitutions(command.queuedSubstitutions);
    }
  },

  /**
   * Validates basic command fields
   */
  validateBasicFields(command: CompleteAtBatSequenceCommand): void {
    if (!command.gameId) {
      throw new CompleteAtBatSequenceCommandValidationError('gameId is required');
    }

    if (!command.atBatCommand) {
      throw new CompleteAtBatSequenceCommandValidationError('atBatCommand is required');
    }
  },

  /**
   * Validates the at-bat command
   */
  validateAtBatCommand(command: CompleteAtBatSequenceCommand): void {
    // Check that the gameId matches
    if (command.atBatCommand.gameId.value !== command.gameId.value) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'atBatCommand.gameId must match the command gameId'
      );
    }

    // The RecordAtBatCommand validation will be handled by its own validator
    // We just need to ensure consistency at this level
  },

  /**
   * Validates configuration options
   */
  validateOptions(command: CompleteAtBatSequenceCommand): void {
    if (command.checkInningEnd !== undefined && typeof command.checkInningEnd !== 'boolean') {
      throw new CompleteAtBatSequenceCommandValidationError(
        'checkInningEnd must be a boolean if provided'
      );
    }

    if (
      command.handleSubstitutions !== undefined &&
      typeof command.handleSubstitutions !== 'boolean'
    ) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'handleSubstitutions must be a boolean if provided'
      );
    }

    if (
      command.notifyScoreChanges !== undefined &&
      typeof command.notifyScoreChanges !== 'boolean'
    ) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'notifyScoreChanges must be a boolean if provided'
      );
    }

    if (command.maxRetryAttempts !== undefined) {
      if (!Number.isInteger(command.maxRetryAttempts) || command.maxRetryAttempts < 0) {
        throw new CompleteAtBatSequenceCommandValidationError(
          'maxRetryAttempts must be a non-negative integer'
        );
      }

      if (command.maxRetryAttempts > 10) {
        throw new CompleteAtBatSequenceCommandValidationError(
          'maxRetryAttempts cannot exceed 10 for safety limits'
        );
      }
    }
  },

  /**
   * Validates queued substitutions
   */
  validateQueuedSubstitutions(substitutions: SubstitutePlayerCommand[]): void {
    if (!Array.isArray(substitutions)) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'queuedSubstitutions must be an array if provided'
      );
    }

    if (substitutions.length > 5) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'queuedSubstitutions cannot exceed 5 substitutions per at-bat'
      );
    }

    // Check for duplicate batting slots (can't substitute same slot multiple times)
    const battingSlots = substitutions.map(sub => sub.battingSlot);
    const uniqueSlots = new Set(battingSlots);
    if (uniqueSlots.size !== battingSlots.length) {
      throw new CompleteAtBatSequenceCommandValidationError(
        'queuedSubstitutions cannot have duplicate battingSlot values'
      );
    }

    // Each substitution command will be validated by its own validator
  },
};

/**
 * Factory functions for creating CompleteAtBatSequenceCommand instances
 */
export const CompleteAtBatSequenceCommandFactory = {
  /**
   * Creates a simple CompleteAtBatSequenceCommand with default settings
   */
  createSimple(gameId: GameId, atBatCommand: RecordAtBatCommand): CompleteAtBatSequenceCommand {
    const command: CompleteAtBatSequenceCommand = {
      gameId,
      atBatCommand,
      checkInningEnd: true,
      handleSubstitutions: false,
      notifyScoreChanges: false,
      maxRetryAttempts: 1,
    };

    CompleteAtBatSequenceCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a full CompleteAtBatSequenceCommand with all options
   */
  createFull(
    gameId: GameId,
    atBatCommand: RecordAtBatCommand,
    options: {
      checkInningEnd?: boolean;
      handleSubstitutions?: boolean;
      queuedSubstitutions?: SubstitutePlayerCommand[];
      notifyScoreChanges?: boolean;
      maxRetryAttempts?: number;
    } = {}
  ): CompleteAtBatSequenceCommand {
    const command: CompleteAtBatSequenceCommand = {
      gameId,
      atBatCommand,
      checkInningEnd: options.checkInningEnd ?? true,
      handleSubstitutions: options.handleSubstitutions ?? false,
      ...(options.queuedSubstitutions && { queuedSubstitutions: options.queuedSubstitutions }),
      notifyScoreChanges: options.notifyScoreChanges ?? false,
      maxRetryAttempts: options.maxRetryAttempts ?? 1,
    };

    CompleteAtBatSequenceCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a command with substitutions
   */
  createWithSubstitutions(
    gameId: GameId,
    atBatCommand: RecordAtBatCommand,
    queuedSubstitutions: SubstitutePlayerCommand[],
    enableNotifications = false
  ): CompleteAtBatSequenceCommand {
    const command: CompleteAtBatSequenceCommand = {
      gameId,
      atBatCommand,
      checkInningEnd: true,
      handleSubstitutions: true,
      queuedSubstitutions,
      notifyScoreChanges: enableNotifications,
      maxRetryAttempts: 2, // Higher retry for complex operations
    };

    CompleteAtBatSequenceCommandValidator.validate(command);
    return command;
  },
};
