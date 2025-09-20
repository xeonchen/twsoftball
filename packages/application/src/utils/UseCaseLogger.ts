/**
 * @file UseCaseLogger
 * Centralized logging utilities for use cases to eliminate duplicate logging patterns.
 *
 * @remarks
 * This utility class provides standardized logging patterns that are common
 * across all use cases. It eliminates duplicate logging code and ensures
 * consistent log format, context, and structured data across the application.
 *
 * **Logging Categories**:
 * - **Operation Lifecycle**: Start, success, and failure logging with timing
 * - **Debug Tracing**: Detailed process flow and intermediate state logging
 * - **Performance Monitoring**: Duration tracking and operation metrics
 * - **Context Enrichment**: Structured context data for debugging and monitoring
 *
 * **Design Principles**:
 * - **Structured Logging**: Consistent log format with context objects
 * - **Performance Aware**: Minimal overhead with conditional debug logging
 * - **Context Rich**: Game ID, operation name, and relevant business context
 * - **Monitoring Friendly**: Metrics and timing data for operational monitoring
 *
 * @example
 * ```typescript
 * // In a use case
 * const startTime = UseCaseLogger.logOperationStart(
 *   'recordAtBat',
 *   { gameId, batterId, result },
 *   this.logger
 * );
 *
 * try {
 *   // ... operation logic
 *   UseCaseLogger.logOperationSuccess('recordAtBat', context, startTime, this.logger);
 * } catch (error) {
 *   UseCaseLogger.logOperationError('recordAtBat', error, context, this.logger);
 * }
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { Logger } from '../ports/out/Logger.js';

/**
 * Base context information for logging operations.
 */
export interface LogContext {
  /** The game being operated on */
  gameId: GameId;
  /** The specific operation being performed */
  operation: string;
  /** Additional context data for structured logging */
  [key: string]: unknown;
}

/**
 * Extended context for operation completion logging.
 */
export interface OperationContext extends LogContext {
  /** Operation start time for duration calculation */
  startTime: number;
  /** Additional success-specific context */
  successData?: Record<string, unknown>;
}

/**
 * Context for error logging with error details.
 */
export interface ErrorContext extends LogContext {
  /** The error that occurred */
  error: Error;
  /** Operation start time for duration calculation */
  startTime?: number;
  /** Additional error-specific context */
  errorData?: Record<string, unknown>;
}

/**
 * Performance metrics for operation monitoring.
 */
export interface PerformanceMetrics {
  /** Operation duration in milliseconds */
  duration: number;
  /** Whether operation completed successfully */
  success: boolean;
  /** Operation name for metrics grouping */
  operation: string;
  /** Additional performance context */
  metrics?: Record<string, number>;
}

/**
 * Centralized logging utilities for use case operations.
 *
 * @remarks
 * This class eliminates code duplication by providing standardized logging
 * patterns used across all use cases. It ensures consistency in log structure,
 * context enrichment, and performance monitoring.
 *
 * **Logging Strategy**:
 * - **Structured Context**: All logs include game ID and operation context
 * - **Performance Tracking**: Built-in timing and duration calculation
 * - **Error Enrichment**: Error logs include full context and stack traces
 * - **Debug Support**: Conditional debug logging with detailed process flow
 */
export class UseCaseLogger {
  /**
   * Logs the start of a use case operation with context.
   *
   * @remarks
   * Creates a debug log entry for operation start and returns the start time
   * for later duration calculation. Includes structured context for debugging
   * and monitoring.
   *
   * **Log Structure**:
   * - Level: Debug (conditional based on logger configuration)
   * - Message: Descriptive operation start message
   * - Context: Game ID, operation name, and provided context data
   *
   * @param operation - The name of the operation starting
   * @param context - Structured context data for the operation
   * @param logger - Logger instance for recording
   * @returns Start timestamp for duration calculation
   *
   * @example
   * ```typescript
   * const startTime = UseCaseLogger.logOperationStart(
   *   'recordAtBat',
   *   {
   *     gameId: command.gameId,
   *     batterId: command.batterId.value,
   *     result: command.result,
   *   },
   *   this.logger
   * );
   * ```
   */
  static logOperationStart(
    operation: string,
    context: Record<string, unknown>,
    logger: Logger
  ): number {
    const startTime = Date.now();

    logger.debug(`Starting ${operation} operation`, {
      operation,
      startTime,
      ...context,
    });

    return startTime;
  }

  /**
   * Logs successful completion of a use case operation with metrics.
   *
   * @remarks
   * Records successful operation completion with duration metrics and
   * context data. This enables performance monitoring and success tracking
   * across all use case operations.
   *
   * **Log Structure**:
   * - Level: Info (always recorded for success tracking)
   * - Message: Success message with operation name
   * - Context: Duration, operation metrics, and success data
   *
   * @param operation - The name of the completed operation
   * @param context - Operation context with success data
   * @param startTime - Operation start time for duration calculation
   * @param logger - Logger instance for recording
   * @param successData - Additional success-specific data to log
   *
   * @example
   * ```typescript
   * UseCaseLogger.logOperationSuccess(
   *   'recordAtBat',
   *   { gameId: command.gameId, batterId: command.batterId.value },
   *   startTime,
   *   this.logger,
   *   { newScore: gameScore, inningEnded: false }
   * );
   * ```
   */
  static logOperationSuccess(
    operation: string,
    context: Record<string, unknown>,
    startTime: number,
    logger: Logger,
    successData?: Record<string, unknown>
  ): void {
    const duration = Date.now() - startTime;

    logger.info(`${operation} completed successfully`, {
      operation,
      duration,
      success: true,
      ...context,
      ...successData,
    });

    // Log performance metrics for monitoring
    const performanceData: PerformanceMetrics = {
      duration,
      success: true,
      operation,
    };
    if (successData && this.isNumericMetrics(successData)) {
      performanceData.metrics = successData;
    }
    this.logPerformanceMetrics(performanceData, logger);
  }

  /**
   * Logs operation failure with error details and context.
   *
   * @remarks
   * Records operation failures with complete error information, context,
   * and timing data. This enables comprehensive error tracking and debugging
   * support for production issues.
   *
   * **Log Structure**:
   * - Level: Error (always recorded for failure tracking)
   * - Message: Failure message with operation name
   * - Error: Complete error object with stack trace
   * - Context: Duration, error context, and failure data
   *
   * @param operation - The name of the failed operation
   * @param error - The error that caused the failure
   * @param context - Operation context with error data
   * @param logger - Logger instance for recording
   * @param startTime - Optional start time for duration calculation
   * @param errorData - Additional error-specific data to log
   *
   * @example
   * ```typescript
   * UseCaseLogger.logOperationError(
   *   'recordAtBat',
   *   error,
   *   {
   *     gameId: command.gameId,
   *     batterId: command.batterId.value,
   *     attemptedResult: command.result,
   *   },
   *   this.logger,
   *   startTime,
   *   { validationErrors: validationResult.errors }
   * );
   * ```
   */
  static logOperationError(
    operation: string,
    error: Error,
    context: Record<string, unknown>,
    logger: Logger,
    startTime?: number,
    errorData?: Record<string, unknown>
  ): void {
    const duration = startTime ? Date.now() - startTime : undefined;

    logger.error(`${operation} failed`, error, {
      operation,
      duration,
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
      ...errorData,
    });

    // Log performance metrics for failure tracking
    if (startTime) {
      const performanceData: PerformanceMetrics = {
        duration: duration!,
        success: false,
        operation,
      };
      if (errorData && this.isNumericMetrics(errorData)) {
        performanceData.metrics = errorData;
      }
      this.logPerformanceMetrics(performanceData, logger);
    }
  }

  /**
   * Logs detailed debug information for operation tracing.
   *
   * @remarks
   * Provides detailed debug logging for complex operations that require
   * step-by-step tracing. This is useful for debugging complex business
   * logic and understanding operation flow.
   *
   * **Usage Guidelines**:
   * - Use for intermediate steps in complex operations
   * - Include relevant state and decision points
   * - Avoid logging sensitive data
   * - Keep debug messages concise but informative
   *
   * @param operation - The operation being traced
   * @param step - The specific step or checkpoint being logged
   * @param context - Context data for the debug trace
   * @param logger - Logger instance for recording
   *
   * @example
   * ```typescript
   * UseCaseLogger.logDebugTrace(
   *   'recordAtBat',
   *   'lineup-validation-complete',
   *   {
   *     gameId: command.gameId,
   *     validationResult: 'passed',
   *     batterPosition: currentPosition,
   *   },
   *   this.logger
   * );
   * ```
   */
  static logDebugTrace(
    operation: string,
    step: string,
    context: Record<string, unknown>,
    logger: Logger
  ): void {
    logger.debug(`${operation}: ${step}`, {
      operation,
      step,
      timestamp: Date.now(),
      ...context,
    });
  }

  /**
   * Logs operation warnings with context.
   *
   * @remarks
   * Records non-fatal issues that occurred during operation execution.
   * Warnings indicate potential problems that didn't prevent operation
   * completion but may require attention.
   *
   * @param operation - The operation that generated the warning
   * @param message - The warning message
   * @param context - Context data for the warning
   * @param logger - Logger instance for recording
   *
   * @example
   * ```typescript
   * UseCaseLogger.logOperationWarning(
   *   'startNewGame',
   *   'Player jersey number conflict resolved automatically',
   *   {
   *     gameId: command.gameId,
   *     conflictedJersey: 15,
   *     reassignedTo: 25,
   *   },
   *   this.logger
   * );
   * ```
   */
  static logOperationWarning(
    operation: string,
    message: string,
    context: Record<string, unknown>,
    logger: Logger
  ): void {
    logger.warn(`${operation}: ${message}`, {
      operation,
      warning: message,
      timestamp: Date.now(),
      ...context,
    });
  }

  /**
   * Type guard to check if a data object contains only numeric values.
   *
   * @param data - Data object to check
   * @returns True if all values are numbers
   */
  private static isNumericMetrics(data: Record<string, unknown>): data is Record<string, number> {
    return Object.values(data).every(value => typeof value === 'number');
  }

  /**
   * Logs performance metrics for monitoring and analysis.
   *
   * @remarks
   * Records operation performance metrics in a structured format suitable
   * for monitoring systems and performance analysis tools. This enables
   * tracking of operation performance over time.
   *
   * @param metrics - Performance metrics to log
   * @param logger - Logger instance for recording
   */
  private static logPerformanceMetrics(metrics: PerformanceMetrics, logger: Logger): void {
    logger.debug('Operation performance metrics', {
      type: 'performance-metrics',
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
      timestamp: Date.now(),
      ...metrics.metrics,
    });
  }

  /**
   * Creates standardized log context from common use case parameters.
   *
   * @remarks
   * Helper method to create consistent log context objects from common
   * use case parameters. This ensures standardized context structure
   * across all use cases.
   *
   * @param gameId - Game identifier
   * @param operation - Operation name
   * @param additionalContext - Additional context data
   * @returns Standardized log context object
   */
  static createLogContext(
    gameId: GameId,
    operation: string,
    additionalContext?: Record<string, unknown>
  ): LogContext {
    return {
      gameId,
      operation,
      gameIdValue: gameId.value,
      timestamp: Date.now(),
      ...additionalContext,
    };
  }

  /**
   * Logs aggregate operation metrics for batch operations.
   *
   * @remarks
   * Records metrics for operations that process multiple items or perform
   * batch operations. This is useful for understanding the performance
   * characteristics of bulk operations.
   *
   * @param operation - The batch operation name
   * @param totalItems - Total number of items processed
   * @param successCount - Number of successful items
   * @param duration - Total operation duration
   * @param context - Additional context data
   * @param logger - Logger instance for recording
   */
  static logBatchOperationMetrics(
    operation: string,
    totalItems: number,
    successCount: number,
    duration: number,
    context: Record<string, unknown>,
    logger: Logger
  ): void {
    const failureCount = totalItems - successCount;
    const successRate = totalItems > 0 ? successCount / totalItems : 0;

    logger.info(`Batch ${operation} completed`, {
      operation: `batch-${operation}`,
      totalItems,
      successCount,
      failureCount,
      successRate,
      duration,
      averageItemDuration: totalItems > 0 ? duration / totalItems : 0,
      ...context,
    });
  }
}
