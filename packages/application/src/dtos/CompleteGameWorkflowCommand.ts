/**
 * @file CompleteGameWorkflowCommand
 * Command DTO for complete game workflow execution from start to finish.
 *
 * @remarks
 * This command represents the highest-level orchestration operation in the
 * GameApplicationService, enabling complete game execution from initial setup
 * through final completion. It coordinates all game-related use cases in a
 * structured workflow with comprehensive error handling and recovery.
 *
 * **Workflow Phases**:
 * 1. Game initialization and setup
 * 2. Sequential at-bat processing
 * 3. Substitution and strategy execution
 * 4. Game completion and finalization
 * 5. Notification and audit logging
 *
 * **Business Context**:
 * This command enables automated game execution for testing, simulation,
 * and batch processing scenarios. It can also be used for demo purposes
 * or system integration testing where complete games need to be executed
 * in a controlled manner.
 *
 * **Error Handling**:
 * The workflow includes comprehensive error recovery, with the ability to
 * continue execution despite individual operation failures, or halt and
 * rollback on critical failures.
 *
 * @example
 * ```typescript
 * // Execute a complete game workflow
 * const command: CompleteGameWorkflowCommand = {
 *   startGameCommand: {
 *     gameId: GameId.generate(),
 *     homeTeamName: 'Tigers',
 *     awayTeamName: 'Lions',
 *     initialLineup: [...],
 *     gameRules: standardRules
 *   },
 *   atBatSequences: [
 *     // First inning at-bats
 *     { batterId: player1, result: AtBatResultType.SINGLE },
 *     { batterId: player2, result: AtBatResultType.HOME_RUN },
 *     // ... more at-bats
 *   ],
 *   substitutions: [
 *     // Mid-game substitutions
 *     { playerId: benchPlayer, position: 'FIRST_BASE', inning: 5 }
 *   ],
 *   endGameNaturally: true,
 *   maxAttempts: 10
 * };
 *
 * const result = await gameApplicationService.completeGameWorkflow(command);
 * if (result.success) {
 *   console.log(`Game completed: ${result.totalRuns} runs, ${result.totalAtBats} at-bats`);
 * }
 * ```
 */

import { ValidationError } from '../errors/ValidationError';

import { RecordAtBatCommand } from './RecordAtBatCommand';
import { StartNewGameCommand } from './StartNewGameCommand';
import { SubstitutePlayerCommand } from './SubstitutePlayerCommand';

/**
 * Validation error for CompleteGameWorkflowCommand
 */
export class CompleteGameWorkflowCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'CompleteGameWorkflowCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, CompleteGameWorkflowCommandValidationError.prototype);
  }
}

/**
 * Command for executing a complete game workflow from start to finish.
 *
 * @remarks
 * This command enables high-level game orchestration that coordinates all
 * major game operations in a single, managed workflow. It provides extensive
 * control over execution parameters, error handling, and recovery strategies.
 *
 * **Workflow Control**:
 * - Sequential execution of all game phases
 * - Configurable error handling and retry logic
 * - Optional early termination conditions
 * - Comprehensive progress tracking and reporting
 * - Automatic cleanup and state management
 *
 * **Use Cases**:
 * - Automated testing of complete game scenarios
 * - Game simulation for analysis and planning
 * - Demonstration and training environments
 * - Bulk game processing for statistics
 * - Integration testing across all use cases
 */
export interface CompleteGameWorkflowCommand {
  /** Command for initializing the new game */
  readonly startGameCommand: StartNewGameCommand;

  /**
   * Sequential list of at-bat commands to execute during the game.
   *
   * @remarks
   * These at-bats will be executed in order, with automatic inning
   * management and score tracking. The workflow will handle inning
   * changes, team switches, and game ending conditions automatically.
   *
   * If fewer at-bats are provided than needed to complete a game,
   * the workflow will end early unless endGameNaturally is false.
   */
  readonly atBatSequences: RecordAtBatCommand[];

  /**
   * Substitutions to execute at specific points during the game.
   *
   * @remarks
   * These substitutions will be processed at appropriate times based
   * on the inning and team context. The workflow will coordinate
   * substitution timing with at-bat execution automatically.
   */
  readonly substitutions: SubstitutePlayerCommand[];

  /**
   * Whether the game should end naturally when conditions are met.
   *
   * @remarks
   * When true, the workflow will end the game when natural ending
   * conditions are reached (e.g., 9 innings completed with a winner).
   * When false, the workflow will continue until all provided at-bats
   * are executed regardless of score or innings.
   *
   * @default true
   */
  readonly endGameNaturally?: boolean;

  /**
   * Maximum number of retry attempts for failed operations.
   *
   * @remarks
   * If any individual operation (at-bat, substitution, etc.) fails,
   * the workflow will retry up to this number of times before either
   * continuing with the next operation or failing the entire workflow.
   *
   * @default 3
   */
  readonly maxAttempts?: number;

  /**
   * Whether to continue execution after non-critical failures.
   *
   * @remarks
   * When true, the workflow will attempt to continue execution even
   * if individual operations fail, logging errors but not stopping
   * the overall workflow. When false, any failure will halt execution.
   *
   * @default false
   */
  readonly continueOnFailure?: boolean;

  /**
   * Whether to send notifications for all major game events.
   *
   * @remarks
   * Controls whether the workflow will send notifications for game
   * start, score changes, substitutions, inning changes, and game end.
   * Useful for disabling notifications during testing or batch processing.
   *
   * @default true
   */
  readonly enableNotifications?: boolean;

  /**
   * Time delay between operations in milliseconds.
   *
   * @remarks
   * Adds artificial delays between operations to simulate realistic
   * game timing or to avoid overwhelming external systems during
   * rapid workflow execution. Primarily used in testing and demo scenarios.
   *
   * @default 0
   */
  readonly operationDelay?: number;
}

/**
 * Validation functions for CompleteGameWorkflowCommand
 */
export const CompleteGameWorkflowCommandValidator = {
  /**
   * Validates a CompleteGameWorkflowCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {CompleteGameWorkflowCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   CompleteGameWorkflowCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: CompleteGameWorkflowCommand): void {
    this.validateBasicFields(command);
    this.validateAtBatSequences(command.atBatSequences);
    this.validateSubstitutions(command.substitutions);
    this.validateOptions(command);
  },

  /**
   * Validates basic command fields
   */
  validateBasicFields(command: CompleteGameWorkflowCommand): void {
    if (!command.startGameCommand) {
      throw new CompleteGameWorkflowCommandValidationError('startGameCommand is required');
    }

    // The StartNewGameCommand validation will be handled by its own validator
    // We just need to ensure consistency at this level
  },

  /**
   * Validates at-bat sequences
   */
  validateAtBatSequences(atBatSequences: RecordAtBatCommand[]): void {
    if (!Array.isArray(atBatSequences)) {
      throw new CompleteGameWorkflowCommandValidationError('atBatSequences must be an array');
    }

    if (atBatSequences.length > 200) {
      throw new CompleteGameWorkflowCommandValidationError(
        'atBatSequences cannot exceed 200 at-bats for safety limits'
      );
    }

    // Each at-bat command will be validated by its own validator
  },

  /**
   * Validates substitutions
   */
  validateSubstitutions(substitutions: SubstitutePlayerCommand[]): void {
    if (!Array.isArray(substitutions)) {
      throw new CompleteGameWorkflowCommandValidationError('substitutions must be an array');
    }

    if (substitutions.length > 50) {
      throw new CompleteGameWorkflowCommandValidationError(
        'substitutions cannot exceed 50 substitutions for safety limits'
      );
    }

    // Each substitution command will be validated by its own validator
  },

  /**
   * Validates workflow options
   */
  validateOptions(command: CompleteGameWorkflowCommand): void {
    if (command.endGameNaturally !== undefined && typeof command.endGameNaturally !== 'boolean') {
      throw new CompleteGameWorkflowCommandValidationError(
        'endGameNaturally must be a boolean if provided'
      );
    }

    if (command.maxAttempts !== undefined) {
      if (!Number.isInteger(command.maxAttempts) || command.maxAttempts < 1) {
        throw new CompleteGameWorkflowCommandValidationError(
          'maxAttempts must be a positive integer if provided'
        );
      }

      if (command.maxAttempts > 20) {
        throw new CompleteGameWorkflowCommandValidationError(
          'maxAttempts cannot exceed 20 for safety limits'
        );
      }
    }

    if (command.continueOnFailure !== undefined && typeof command.continueOnFailure !== 'boolean') {
      throw new CompleteGameWorkflowCommandValidationError(
        'continueOnFailure must be a boolean if provided'
      );
    }

    if (
      command.enableNotifications !== undefined &&
      typeof command.enableNotifications !== 'boolean'
    ) {
      throw new CompleteGameWorkflowCommandValidationError(
        'enableNotifications must be a boolean if provided'
      );
    }

    if (command.operationDelay !== undefined) {
      if (!Number.isInteger(command.operationDelay) || command.operationDelay < 0) {
        throw new CompleteGameWorkflowCommandValidationError(
          'operationDelay must be a non-negative integer if provided'
        );
      }

      if (command.operationDelay > 30000) {
        throw new CompleteGameWorkflowCommandValidationError(
          'operationDelay cannot exceed 30000ms (30 seconds) for reasonable performance'
        );
      }
    }
  },
};

/**
 * Factory functions for creating CompleteGameWorkflowCommand instances
 */
export const CompleteGameWorkflowCommandFactory = {
  /**
   * Creates a simple CompleteGameWorkflowCommand for testing
   */
  createSimple(
    startGameCommand: StartNewGameCommand,
    atBatSequences: RecordAtBatCommand[]
  ): CompleteGameWorkflowCommand {
    const command: CompleteGameWorkflowCommand = {
      startGameCommand,
      atBatSequences,
      substitutions: [],
      endGameNaturally: true,
      maxAttempts: 3,
      continueOnFailure: false,
      enableNotifications: false,
      operationDelay: 0,
    };

    CompleteGameWorkflowCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a full CompleteGameWorkflowCommand with all options
   */
  createFull(
    startGameCommand: StartNewGameCommand,
    atBatSequences: RecordAtBatCommand[],
    substitutions: SubstitutePlayerCommand[],
    options: {
      endGameNaturally?: boolean;
      maxAttempts?: number;
      continueOnFailure?: boolean;
      enableNotifications?: boolean;
      operationDelay?: number;
    } = {}
  ): CompleteGameWorkflowCommand {
    const command: CompleteGameWorkflowCommand = {
      startGameCommand,
      atBatSequences,
      substitutions,
      endGameNaturally: options.endGameNaturally ?? true,
      maxAttempts: options.maxAttempts ?? 3,
      continueOnFailure: options.continueOnFailure ?? false,
      enableNotifications: options.enableNotifications ?? false,
      operationDelay: options.operationDelay ?? 0,
    };

    CompleteGameWorkflowCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a demo workflow for demonstration purposes
   */
  createDemo(
    startGameCommand: StartNewGameCommand,
    atBatSequences: RecordAtBatCommand[],
    substitutions: SubstitutePlayerCommand[] = []
  ): CompleteGameWorkflowCommand {
    const command: CompleteGameWorkflowCommand = {
      startGameCommand,
      atBatSequences,
      substitutions,
      endGameNaturally: true,
      maxAttempts: 2,
      continueOnFailure: true, // Demo should continue despite errors
      enableNotifications: true,
      operationDelay: 1000, // 1 second delay for demo pacing
    };

    CompleteGameWorkflowCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a testing workflow for automated testing
   */
  createTesting(
    startGameCommand: StartNewGameCommand,
    atBatSequences: RecordAtBatCommand[],
    substitutions: SubstitutePlayerCommand[] = []
  ): CompleteGameWorkflowCommand {
    const command: CompleteGameWorkflowCommand = {
      startGameCommand,
      atBatSequences,
      substitutions,
      endGameNaturally: false, // Testing may want specific scenarios
      maxAttempts: 1, // Fail fast in testing
      continueOnFailure: false,
      enableNotifications: false, // No notifications during testing
      operationDelay: 0, // No delay for fast testing
    };

    CompleteGameWorkflowCommandValidator.validate(command);
    return command;
  },
};
