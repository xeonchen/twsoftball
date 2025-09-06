/**
 * @file UseCaseErrorHandler
 * Centralized error handling utilities for use cases to eliminate duplication.
 *
 * @remarks
 * This utility class provides standardized error handling patterns that are common
 * across all use cases. It categorizes different types of errors, formats user-friendly
 * error messages, and provides consistent error result building.
 *
 * **Error Categories Handled**:
 * - **Domain Errors**: Business rule violations with user-friendly messages
 * - **Infrastructure Errors**: Database, repository, and event store failures
 * - **System Errors**: Unexpected failures and unknown error types
 *
 * **Key Features**:
 * - Consistent error message formatting
 * - Infrastructure error categorization and translation
 * - Game state loading for error context
 * - Standardized error result building
 *
 * @example
 * ```typescript
 * // In a use case catch block
 * } catch (error) {
 *   return UseCaseErrorHandler.handleError(
 *     error,
 *     gameId,
 *     this.gameRepository,
 *     this.logger,
 *     'recordAtBat',
 *     (game, errors) => this.buildErrorResult(game, errors)
 *   );
 * }
 * ```
 */

import { GameId, Game, DomainError } from '@twsoftball/domain';

import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';

/**
 * Context information for error handling operations.
 */
export interface ErrorContext {
  /** The operation that failed */
  operation: string;
  /** The game ID being operated on */
  gameId: GameId;
  /** Additional context data for logging */
  additionalData?: Record<string, unknown>;
}

/**
 * Function type for building error results with game context.
 *
 * @template TResult - The result type to return
 * @param game - Game aggregate for context (may be null if not loadable)
 * @param errors - Array of error messages
 * @returns Formatted error result
 */
export type ErrorResultBuilder<TResult> = (game: Game | null, errors: string[]) => TResult;

/**
 * Centralized error handling utilities for use cases.
 *
 * @remarks
 * This class eliminates code duplication by providing standardized error handling
 * patterns used across all use cases. It handles different error types consistently
 * and provides context-aware error results.
 *
 * **Design Principles**:
 * - **Single Responsibility**: Only handles error processing and categorization
 * - **Dependency Injection**: Uses repository and logger through parameters
 * - **Generic Results**: Works with any result type through builder functions
 * - **Context Awareness**: Loads game state for meaningful error context
 */
export class UseCaseErrorHandler {
  /**
   * Handles errors with standardized categorization and game context loading.
   *
   * @remarks
   * This method provides the complete error handling pipeline:
   * 1. Categorizes the error type (Domain/Infrastructure/System)
   * 2. Formats user-friendly error messages
   * 3. Attempts to load game state for context
   * 4. Builds the appropriate error result using the provided builder
   *
   * **Error Categorization**:
   * - **DomainError**: Business rule violations - preserves original message
   * - **Infrastructure Errors**: Database, repository, event store issues
   * - **System Errors**: Unexpected failures with generic messages
   *
   * @template TResult - The result type to return
   * @param error - The error that occurred
   * @param gameId - Game identifier for context loading
   * @param gameRepository - Repository for loading game context
   * @param logger - Logger for error recording
   * @param operation - The operation that failed
   * @param resultBuilder - Function to build the final error result
   * @param additionalData - Optional additional context for logging
   * @returns Promise resolving to formatted error result
   */
  static async handleError<TResult>(
    error: unknown,
    gameId: GameId,
    gameRepository: GameRepository,
    logger: Logger,
    operation: string,
    resultBuilder: ErrorResultBuilder<TResult>,
    additionalData?: Record<string, unknown>
  ): Promise<TResult> {
    const errors = this.categorizeError(error);
    const game = await this.loadGameForContext(gameId, gameRepository, logger, operation);

    // Log the error with full context
    const errorContext: ErrorContext = { gameId, operation };
    if (additionalData) {
      errorContext.additionalData = additionalData;
    }
    this.logError(error, errorContext, logger);

    return resultBuilder(game, errors);
  }

  /**
   * Handles errors synchronously without game context loading.
   *
   * @remarks
   * This method is useful for scenarios where:
   * - Game context is not needed
   * - Synchronous error handling is required
   * - The game repository is not available
   *
   * @template TResult - The result type to return
   * @param error - The error that occurred
   * @param gameId - Game identifier for logging context
   * @param logger - Logger for error recording
   * @param operation - The operation that failed
   * @param resultBuilder - Function to build the final error result
   * @param additionalData - Optional additional context for logging
   * @returns Formatted error result
   */
  static handleErrorSync<TResult>(
    error: unknown,
    gameId: GameId,
    logger: Logger,
    operation: string,
    resultBuilder: ErrorResultBuilder<TResult>,
    additionalData?: Record<string, unknown>
  ): TResult {
    const errors = this.categorizeError(error);

    // Log the error with context
    const errorContext: ErrorContext = { gameId, operation };
    if (additionalData) {
      errorContext.additionalData = additionalData;
    }
    this.logError(error, errorContext, logger);

    return resultBuilder(null, errors);
  }

  /**
   * Categorizes errors into appropriate user-friendly messages.
   *
   * @remarks
   * This method translates technical errors into user-friendly messages
   * while preserving domain error messages that are already user-friendly.
   *
   * **Error Processing**:
   * - **Domain Errors**: Preserved as-is (already user-friendly)
   * - **Database Errors**: Translated to "Failed to save/load game state"
   * - **Event Store Errors**: Translated to "Failed to store events"
   * - **Generic Errors**: Translated to "An unexpected error occurred"
   *
   * @param error - The error to categorize
   * @returns Array of user-friendly error messages
   */
  private static categorizeError(error: unknown): string[] {
    if (error instanceof DomainError) {
      // Domain validation errors - already user-friendly
      return [error.message];
    }

    if (error instanceof Error) {
      // Infrastructure or system errors - categorize by message content
      const message = error.message.toLowerCase();

      if (message.includes('load') || message.includes('find')) {
        return [`Failed to load game data: ${error.message}`];
      }

      if (message.includes('database') || message.includes('save')) {
        return [`Failed to save game state: ${error.message}`];
      }

      if (message.includes('event store') || message.includes('store')) {
        return [`Failed to store events: ${error.message}`];
      }

      // Generic error with message
      return [`An unexpected error occurred: ${error.message}`];
    }

    // Unknown error types
    return ['An unexpected error occurred during operation'];
  }

  /**
   * Attempts to load game state for error result context.
   *
   * @remarks
   * Loading game context for error results helps provide meaningful
   * information to users about the current state. If loading fails,
   * we log the failure but continue with null context rather than
   * escalating the error.
   *
   * @param gameId - Game identifier to load
   * @param gameRepository - Repository for loading
   * @param logger - Logger for warnings if load fails
   * @param operation - Original operation for logging context
   * @returns Promise resolving to Game aggregate or null if load fails
   */
  private static async loadGameForContext(
    gameId: GameId,
    gameRepository: GameRepository,
    logger: Logger,
    operation: string
  ): Promise<Game | null> {
    try {
      return await gameRepository.findById(gameId);
    } catch (loadError) {
      // If we can't load the game, log but don't escalate
      logger.warn('Failed to load game state for error result context', {
        gameId: gameId.value,
        operation,
        loadError,
      });
      return null;
    }
  }

  /**
   * Logs errors with standardized format and context.
   *
   * @remarks
   * Provides consistent error logging across all use cases with
   * structured context information for debugging and monitoring.
   *
   * @param error - The error that occurred
   * @param context - Context information for the error
   * @param logger - Logger instance for recording
   */
  private static logError(error: unknown, context: ErrorContext, logger: Logger): void {
    const logContext = {
      gameId: context.gameId.value,
      operation: context.operation,
      ...context.additionalData,
    };

    if (error instanceof Error) {
      logger.error(`Failed to execute ${context.operation}`, error, logContext);
    } else {
      logger.error(`Failed to execute ${context.operation}`, new Error(String(error)), logContext);
    }
  }
}
