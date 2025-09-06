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

import { ValidationError } from '../errors/ValidationError';

import { GameStateDTO } from './GameStateDTO';

/**
 * Validation error for AtBatResult
 */
export class AtBatResultValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'AtBatResultValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, AtBatResultValidationError.prototype);
  }
}

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

/**
 * Validation functions for AtBatResult
 */
export const AtBatResultValidator = {
  /**
   * Validates an AtBatResult for consistency and business rules.
   *
   * @param result - The result to validate
   * @throws {AtBatResultValidationError} When validation fails
   */
  validate(result: AtBatResult): void {
    this.validateBasicStructure(result);
    this.validateStatisticalConsistency(result);
    this.validateGameStateConsistency(result);

    if (!result.success && result.errors) {
      this.validateErrorStructure(result.errors);
    }
  },

  /**
   * Validates basic result structure
   */
  validateBasicStructure(result: AtBatResult): void {
    if (typeof result.success !== 'boolean') {
      throw new AtBatResultValidationError('success field must be a boolean');
    }

    if (!result.gameState) {
      throw new AtBatResultValidationError('gameState is required');
    }

    if (typeof result.runsScored !== 'number' || result.runsScored < 0) {
      throw new AtBatResultValidationError('runsScored must be a non-negative number');
    }

    if (typeof result.rbiAwarded !== 'number' || result.rbiAwarded < 0) {
      throw new AtBatResultValidationError('rbiAwarded must be a non-negative number');
    }

    if (typeof result.inningEnded !== 'boolean') {
      throw new AtBatResultValidationError('inningEnded must be a boolean');
    }

    if (typeof result.gameEnded !== 'boolean') {
      throw new AtBatResultValidationError('gameEnded must be a boolean');
    }

    // Business rule: max reasonable runs in single at-bat is 4 (grand slam)
    if (result.runsScored > 4) {
      throw new AtBatResultValidationError(
        'runsScored cannot exceed 4 (maximum possible in single at-bat)'
      );
    }

    // Business rule: max reasonable RBI is 4 (grand slam)
    if (result.rbiAwarded > 4) {
      throw new AtBatResultValidationError(
        'rbiAwarded cannot exceed 4 (maximum possible in single at-bat)'
      );
    }
  },

  /**
   * Validates statistical consistency between runs and RBI
   */
  validateStatisticalConsistency(result: AtBatResult): void {
    // Business rule: RBI should generally not exceed runs scored + 1 (for the batter scoring)
    // Exception: sacrifice flies can award RBI without scoring a run for the batter
    if (result.rbiAwarded > result.runsScored + 1) {
      // This can be valid in some scenarios, but let's flag extreme cases
      if (result.rbiAwarded > result.runsScored + 2) {
        throw new AtBatResultValidationError(
          'rbiAwarded significantly exceeds runsScored, check for data consistency'
        );
      }
    }

    // Business rule: if no runs scored, RBI should be 0 unless it's a sacrifice fly scenario
    if (result.runsScored === 0 && result.rbiAwarded > 1) {
      throw new AtBatResultValidationError('Cannot award more than 1 RBI when no runs are scored');
    }
  },

  /**
   * Validates game state consistency
   */
  validateGameStateConsistency(result: AtBatResult): void {
    // Business rule: if game ended, inning should also be ended
    if (result.gameEnded && !result.inningEnded) {
      throw new AtBatResultValidationError('If game ended, inning must also be ended');
    }

    // Validate game state structure (basic check)
    if (!result.gameState.gameId) {
      throw new AtBatResultValidationError('gameState must have a valid gameId');
    }

    if (typeof result.gameState.currentInning !== 'number' || result.gameState.currentInning < 1) {
      throw new AtBatResultValidationError('gameState currentInning must be a positive number');
    }

    if (
      typeof result.gameState.outs !== 'number' ||
      result.gameState.outs < 0 ||
      result.gameState.outs > 3
    ) {
      throw new AtBatResultValidationError('gameState outs must be between 0 and 3');
    }
  },

  /**
   * Validates error structure for failed results
   */
  validateErrorStructure(errors: string[]): void {
    if (!Array.isArray(errors)) {
      throw new AtBatResultValidationError(
        'errors must be an array when provided',
        'errors',
        errors
      );
    }

    if (errors.length === 0) {
      throw new AtBatResultValidationError('errors array cannot be empty if provided');
    }

    if (errors.length > 10) {
      throw new AtBatResultValidationError('errors array cannot exceed 10 items', 'errors', errors);
    }

    errors.forEach((error, index) => {
      if (typeof error !== 'string' || !error.trim()) {
        throw new AtBatResultValidationError(
          `Error at index ${index} must be a non-empty string`,
          `errors[${index}]`,
          error
        );
      }

      if (error.length > 200) {
        throw new AtBatResultValidationError(
          `Error at index ${index} cannot exceed 200 characters`
        );
      }
    });
  },
};

/**
 * Factory functions for creating AtBatResult instances
 */
export const AtBatResultFactory = {
  /**
   * Creates a successful AtBatResult
   */
  createSuccess(
    gameState: GameStateDTO,
    runsScored: number = 0,
    rbiAwarded: number = 0,
    inningEnded: boolean = false,
    gameEnded: boolean = false
  ): AtBatResult {
    const result: AtBatResult = {
      success: true,
      gameState,
      runsScored,
      rbiAwarded,
      inningEnded,
      gameEnded,
    };

    AtBatResultValidator.validate(result);
    return result;
  },

  /**
   * Creates a failed AtBatResult with errors
   */
  createFailure(gameState: GameStateDTO, errors: string[]): AtBatResult {
    const result: AtBatResult = {
      success: false,
      gameState,
      runsScored: 0,
      rbiAwarded: 0,
      inningEnded: false,
      gameEnded: false,
      errors,
    };

    AtBatResultValidator.validate(result);
    return result;
  },

  /**
   * Creates result for a home run
   */
  createHomeRun(
    gameState: GameStateDTO,
    runnersScored: number = 1,
    gameEnded: boolean = false
  ): AtBatResult {
    return this.createSuccess(
      gameState,
      runnersScored, // Number of runners (including batter) who scored
      runnersScored, // All runs on home run count as RBI
      false, // Home runs don't end innings
      gameEnded
    );
  },

  /**
   * Creates result for an out that ends the inning
   */
  createInningEndingOut(gameState: GameStateDTO, gameEnded: boolean = false): AtBatResult {
    return this.createSuccess(
      gameState,
      0, // No runs on out
      0, // No RBI on out
      true, // Third out ends inning
      gameEnded
    );
  },

  /**
   * Creates result for RBI hit with runs scored
   */
  createRBIHit(
    gameState: GameStateDTO,
    runsScored: number,
    rbiAwarded: number,
    gameEnded: boolean = false
  ): AtBatResult {
    return this.createSuccess(
      gameState,
      runsScored,
      rbiAwarded,
      false, // Hits generally don't end innings
      gameEnded
    );
  },
};
