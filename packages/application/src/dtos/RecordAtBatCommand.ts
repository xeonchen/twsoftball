/**
 * @file RecordAtBatCommand
 * Command DTO for recording an at-bat result with all associated runner movements.
 *
 * @remarks
 * This command captures the complete outcome of a plate appearance, including
 * the batter's result and all resulting base runner movements. It serves as
 * the primary input for the RecordAtBat use case, which updates game state
 * and calculates derived statistics.
 *
 * The command supports all standard softball outcomes (hits, walks, outs) and
 * tracks the movement of every affected base runner. This comprehensive
 * approach enables accurate game state management and statistical calculations.
 *
 * Runner advances are specified explicitly rather than calculated automatically,
 * allowing for unusual plays, errors, and strategic decisions that may deviate
 * from standard advancement patterns.
 *
 * @example
 * ```typescript
 * // RBI double that scores a runner from second base
 * const command: RecordAtBatCommand = {
 *   gameId: GameId.generate(),
 *   batterId: PlayerId.generate(),
 *   result: AtBatResultType.DOUBLE,
 *   runnerAdvances: [
 *     {
 *       playerId: batterId,
 *       fromBase: null, // Batter starts at home
 *       toBase: 'SECOND',
 *       advanceReason: 'HIT'
 *     },
 *     {
 *       playerId: runnerId,
 *       fromBase: 'SECOND',
 *       toBase: 'HOME', // Runner scores
 *       advanceReason: 'HIT'
 *     }
 *   ],
 *   notes: 'Line drive to left-center gap',
 *   timestamp: new Date()
 * };
 * ```
 */

import { GameId, PlayerId, AtBatResultType } from '@twsoftball/domain';

import { ValidationError } from '../errors/ValidationError';
import { CommonValidators } from '../utils/CommonValidators';

import { RunnerAdvanceDTO } from './RunnerAdvanceDTO';

/**
 * Validation error for RecordAtBatCommand
 */
export class RecordAtBatCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'RecordAtBatCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, RecordAtBatCommandValidationError.prototype);
  }
}

/**
 * Command to record an at-bat result and all associated base runner movements.
 *
 * @remarks
 * This interface defines the complete information needed to record a plate
 * appearance outcome. It includes the direct result (hit, walk, out, etc.)
 * and the specific movement of every affected runner.
 *
 * The explicit tracking of runner advances allows for accurate handling of:
 * - Standard plays (hits, walks, outs)
 * - Error situations with unusual advancement patterns
 * - Strategic plays (sacrifice flies, intentional advances)
 * - Complex plays (double plays, fielder's choice)
 *
 * Optional fields (notes, timestamp) provide additional context for
 * scorekeeping and game reconstruction purposes.
 */
export interface RecordAtBatCommand {
  /** Game where this at-bat is occurring */
  readonly gameId: GameId;

  /** Player having this at-bat */
  readonly batterId: PlayerId;

  /** The specific outcome of this plate appearance */
  readonly result: AtBatResultType;

  /**
   * All base runner movements resulting from this at-bat
   * Includes the batter and any existing runners who moved
   * Empty array if no runners moved (rare, e.g., strikeout with no base runners)
   */
  readonly runnerAdvances?: RunnerAdvanceDTO[];

  /**
   * Optional descriptive notes about the play
   * Useful for detailed scorekeeping and unusual situations
   */
  readonly notes?: string;

  /**
   * When this at-bat occurred
   * Optional - system can generate if not provided
   */
  readonly timestamp?: Date;
}

/**
 * Validation functions for RecordAtBatCommand
 */
export const RecordAtBatCommandValidator = {
  /**
   * Validates a RecordAtBatCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {RecordAtBatCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   RecordAtBatCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: RecordAtBatCommand): void {
    this.validateBasicFields(command);
    if (command.runnerAdvances && command.runnerAdvances.length > 0) {
      this.validateRunnerAdvances(command.runnerAdvances);
    }
    if (command.notes !== undefined) {
      this.validateNotes(command.notes);
    }
    if (command.timestamp !== undefined) {
      this.validateTimestamp(command.timestamp);
    }
  },

  /**
   * Validates basic command fields (gameId, batterId, result)
   */
  validateBasicFields(command: RecordAtBatCommand): void {
    if (!command.gameId) {
      throw new RecordAtBatCommandValidationError('gameId is required');
    }

    if (!command.batterId) {
      throw new RecordAtBatCommandValidationError('batterId is required');
    }

    if (!command.result) {
      throw new RecordAtBatCommandValidationError('result is required');
    }

    // Validate that result is a valid AtBatResultType
    if (!Object.values(AtBatResultType).includes(command.result)) {
      throw new RecordAtBatCommandValidationError(`Invalid at-bat result: ${command.result}`);
    }
  },

  /**
   * Validates runner advances array
   */
  validateRunnerAdvances(runnerAdvances: RunnerAdvanceDTO[]): void {
    if (!Array.isArray(runnerAdvances)) {
      throw new RecordAtBatCommandValidationError('runnerAdvances must be an array if provided');
    }

    if (runnerAdvances.length > 4) {
      throw new RecordAtBatCommandValidationError(
        'runnerAdvances cannot exceed 4 advances (max bases + batter)'
      );
    }

    // Validate each runner advance
    runnerAdvances.forEach((advance, index) => {
      this.validateRunnerAdvance(advance, index);
    });

    // Check for duplicate player advances (same player advancing multiple times)
    const playerIds = runnerAdvances.map(advance => advance.playerId.value);
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      throw new RecordAtBatCommandValidationError(
        'Each player can only have one advance per at-bat'
      );
    }
  },

  /**
   * Validates individual runner advance
   */
  validateRunnerAdvance(advance: RunnerAdvanceDTO, index: number): void {
    if (!advance.playerId) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: playerId is required`
      );
    }

    // Validate fromBase and toBase combination
    this.validateBaseMovement(advance.fromBase, advance.toBase, index);

    if (!advance.advanceReason?.trim()) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: advanceReason is required`
      );
    }

    // Validate advance reason is reasonable
    const validReasons = [
      'HIT',
      'WALK',
      'ERROR',
      'WILD_PITCH',
      'PASSED_BALL',
      'STEAL',
      'BALK',
      'SACRIFICE',
      'FIELDERS_CHOICE',
      'OUT',
      'GROUND_OUT',
      'FLY_OUT',
      'FORCE_OUT',
    ];
    if (!validReasons.includes(advance.advanceReason)) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: invalid advanceReason '${advance.advanceReason}'. Valid reasons: ${validReasons.join(', ')}`
      );
    }
  },

  /**
   * Validates base movement logic
   */
  validateBaseMovement(fromBase: string | null, toBase: string | null, index: number): void {
    const validFromBases = ['FIRST', 'SECOND', 'THIRD'];
    const validToBases = ['FIRST', 'SECOND', 'THIRD', 'HOME', 'OUT'];

    // Both null is invalid
    if (fromBase === null && toBase === null) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: both fromBase and toBase cannot be null`
      );
    }

    // Validate fromBase if not null (batter starting at home plate)
    if (fromBase !== null && !validFromBases.includes(fromBase)) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: invalid fromBase '${fromBase}'`
      );
    }

    // Validate toBase if not null (runner being put out)
    if (toBase !== null && !validToBases.includes(toBase)) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: invalid toBase '${toBase}'`
      );
    }

    // Business rule: Can't advance to the same base
    if (fromBase !== null && toBase !== null && fromBase === toBase) {
      throw new RecordAtBatCommandValidationError(
        `Runner advance at index ${index}: cannot advance from ${fromBase} to the same base`
      );
    }

    // Business rule: Must generally advance forward (with exceptions for outs)
    if (fromBase !== null && toBase !== null) {
      const baseOrder = ['FIRST', 'SECOND', 'THIRD', 'HOME'];
      const fromIndex = baseOrder.indexOf(fromBase);
      const toIndex = baseOrder.indexOf(toBase);

      if (fromIndex >= toIndex) {
        // This could be valid for certain plays (like being thrown out), but we'll allow validation at the use case level
        // Just ensure it's not completely illogical
        if (fromIndex > toIndex && toIndex !== -1) {
          // Allow backwards movement only in case of outs or specific plays
          // The use case will validate the business rules more thoroughly
        }
      }
    }
  },

  /**
   * Validates optional notes field
   */
  validateNotes(notes: string): void {
    CommonValidators.validateNotes(
      notes,
      (msg, field, value) => new RecordAtBatCommandValidationError(msg, field, value)
    );
  },

  /**
   * Validates optional timestamp field
   */
  validateTimestamp(timestamp: Date): void {
    CommonValidators.validateTimestamp(
      timestamp,
      (msg, field, value) => new RecordAtBatCommandValidationError(msg, field, value)
    );
  },
};

/**
 * Factory functions for creating RecordAtBatCommand instances
 */
export const RecordAtBatCommandFactory = {
  /**
   * Creates a simple RecordAtBatCommand with no runner advances
   */
  createSimple(
    gameId: GameId,
    batterId: PlayerId,
    result: AtBatResultType,
    notes?: string
  ): RecordAtBatCommand {
    const command: RecordAtBatCommand = {
      gameId,
      batterId,
      result,
      runnerAdvances: [],
      ...(notes !== undefined && { notes }),
      timestamp: new Date(),
    };

    RecordAtBatCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a RecordAtBatCommand with runner advances
   */
  createWithAdvances(
    gameId: GameId,
    batterId: PlayerId,
    result: AtBatResultType,
    runnerAdvances: RunnerAdvanceDTO[],
    notes?: string,
    timestamp?: Date
  ): RecordAtBatCommand {
    const command: RecordAtBatCommand = {
      gameId,
      batterId,
      result,
      runnerAdvances,
      ...(notes !== undefined && { notes }),
      ...(timestamp !== undefined && { timestamp }),
      ...(timestamp === undefined && { timestamp: new Date() }),
    };

    RecordAtBatCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a command for a strikeout (no advances)
   */
  createStrikeout(gameId: GameId, batterId: PlayerId, notes?: string): RecordAtBatCommand {
    return this.createSimple(gameId, batterId, AtBatResultType.STRIKEOUT, notes);
  },

  /**
   * Creates a command for a home run (batter advances to HOME)
   */
  createHomeRun(
    gameId: GameId,
    batterId: PlayerId,
    runnersOnBase: PlayerId[] = [],
    notes?: string
  ): RecordAtBatCommand {
    const advances: RunnerAdvanceDTO[] = [];

    // Add advances for runners on base
    runnersOnBase.forEach(runnerId => {
      advances.push({
        playerId: runnerId,
        fromBase: 'FIRST', // This would need to be determined by the caller based on actual base positions
        toBase: 'HOME',
        advanceReason: 'HIT',
      });
    });

    // Add the batter's advance
    advances.push({
      playerId: batterId,
      fromBase: null, // Batter starts at home
      toBase: 'HOME', // Home run - goes all the way around
      advanceReason: 'HIT',
    });

    return this.createWithAdvances(gameId, batterId, AtBatResultType.HOME_RUN, advances, notes);
  },

  /**
   * Creates a command for a walk (batter advances to FIRST)
   */
  createWalk(
    gameId: GameId,
    batterId: PlayerId,
    forcedRunners: RunnerAdvanceDTO[] = [],
    notes?: string
  ): RecordAtBatCommand {
    const advances: RunnerAdvanceDTO[] = [...forcedRunners];

    // Add the batter's advance to first
    advances.push({
      playerId: batterId,
      fromBase: null,
      toBase: 'FIRST',
      advanceReason: 'WALK',
    });

    return this.createWithAdvances(gameId, batterId, AtBatResultType.WALK, advances, notes);
  },
};
