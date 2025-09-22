/**
 * @file Console Logger Implementation
 * Concrete implementation of the Logger interface for the Web layer.
 *
 * @remarks
 * This logger provides a browser-compatible implementation of the Logger interface
 * from the Application layer. It uses the browser's console API for output while
 * maintaining structured logging capabilities and level-based filtering.
 *
 * Key Features:
 * - Browser console API integration
 * - Structured logging with context serialization
 * - Level-based filtering for performance
 * - Error handling with stack trace preservation
 * - Development-friendly formatting
 *
 * Design Principles:
 * - Infrastructure adapter following Hexagonal Architecture
 * - Synchronous operation to avoid blocking application flow
 * - Graceful degradation when console is not available
 * - Type-safe implementation of Logger interface
 * - Performance-conscious with level checking
 *
 * The implementation formats log entries with consistent structure:
 * - Timestamp for chronological ordering
 * - Level indicator for quick visual scanning
 * - Structured context for debugging analysis
 * - Error details with stack traces when applicable
 *
 * @example
 * ```typescript
 * // Create logger instance
 * const logger = new ConsoleLogger('info');
 *
 * // Basic logging
 * logger.info('Game started', { gameId: 'game-123' });
 *
 * // Error logging with context
 * logger.error('Validation failed', error, {
 *   gameId: 'game-123',
 *   operation: 'recordAtBat',
 *   playerId: 'player-456'
 * });
 *
 * // Performance-conscious debug logging
 * if (logger.isLevelEnabled('debug')) {
 *   logger.debug('Complex state', calculateExpensiveDebugInfo());
 * }
 * ```
 */

import type { Logger, LogLevel, LogContext } from '@twsoftball/application/ports/out/Logger';

/**
 * Log level hierarchy for filtering and priority comparison.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

/**
 * Console logging methods corresponding to log levels.
 */
const CONSOLE_METHODS: Record<LogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;

/**
 * Browser-compatible logger implementation using the console API.
 *
 * @remarks
 * ConsoleLogger provides a production-ready implementation of the Logger interface
 * specifically designed for browser environments. It leverages the browser's
 * console API while adding structured logging capabilities and consistent formatting.
 *
 * The implementation supports:
 * - **Level-based filtering**: Only logs messages at or above the minimum level
 * - **Structured context**: Serializes context objects for analysis
 * - **Error handling**: Preserves stack traces and error details
 * - **Performance optimization**: Level checking to avoid expensive operations
 * - **Browser compatibility**: Graceful degradation when console is unavailable
 *
 * Formatting Strategy:
 * - Uses console's native level methods (debug, info, warn, error)
 * - Includes timestamp for chronological ordering
 * - Separates message from context for readability
 * - Preserves error stack traces in error logs
 * - Uses consistent formatting across all log levels
 *
 * The logger is designed to be lightweight and performant, making it suitable
 * for both development and production use. Level filtering prevents debug
 * messages from impacting production performance.
 */
export class ConsoleLogger implements Logger {
  private readonly minimumLevel: number;
  private readonly source: string;

  /**
   * Creates a new console logger with the specified minimum level and source.
   *
   * @param minimumLevel - Minimum log level to process (default: 'info')
   * @param source - Source identifier for log entries (default: 'web-app')
   *
   * @example
   * ```typescript
   * // Development logger with debug level
   * const devLogger = new ConsoleLogger('debug', 'game-service');
   *
   * // Production logger with info level
   * const prodLogger = new ConsoleLogger('info', 'twsoftball-web');
   * ```
   */
  constructor(minimumLevel: LogLevel = 'info', source: string = 'twsoftball-web') {
    this.minimumLevel = LOG_LEVELS[minimumLevel] ?? 1; // Default to info level
    this.source = source;
  }

  /**
   * {@inheritDoc Logger.debug}
   */
  debug(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('debug')) {
      this.writeLog('debug', message, context);
    }
  }

  /**
   * {@inheritDoc Logger.info}
   */
  info(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('info')) {
      this.writeLog('info', message, context);
    }
  }

  /**
   * {@inheritDoc Logger.warn}
   */
  warn(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('warn')) {
      this.writeLog('warn', message, context);
    }
  }

  /**
   * {@inheritDoc Logger.error}
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.isLevelEnabled('error')) {
      this.writeLog('error', message, context, error);
    }
  }

  /**
   * {@inheritDoc Logger.log}
   */
  log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (this.isLevelEnabled(level)) {
      this.writeLog(level, message, context, error);
    }
  }

  /**
   * {@inheritDoc Logger.isLevelEnabled}
   */
  isLevelEnabled(level: LogLevel): boolean {
    return (LOG_LEVELS[level] ?? 0) >= this.minimumLevel;
  }

  /**
   * Writes a log entry to the console with proper formatting.
   *
   * @remarks
   * Internal method that handles the actual console output with consistent
   * formatting across all log levels. It creates a structured log entry
   * and outputs it using the appropriate console method.
   *
   * The formatting includes:
   * - ISO timestamp for precise timing
   * - Source identification for debugging
   * - Structured context serialization
   * - Error stack traces when applicable
   *
   * @param level - Log level for this entry
   * @param message - Human-readable message
   * @param context - Optional structured context
   * @param error - Optional error object
   */
  private writeLog(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    try {
      const timestamp = new Date().toISOString();

      // Get appropriate console method
      const consoleMethod = CONSOLE_METHODS[level];
      // eslint-disable-next-line no-console -- Logger implementation requires console access
      const consoleFn = console[consoleMethod]
        ? // eslint-disable-next-line no-console -- Logger implementation requires console access
          (console[consoleMethod] as (...args: unknown[]) => void)
        : // eslint-disable-next-line no-console -- Fallback console method for logger
          console.log;

      // Format the main log message
      const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.source}] ${message}`;

      if (error) {
        // For errors, log message, context, and error separately for better console display
        consoleFn(formattedMessage);
        if (context && Object.keys(context).length > 0) {
          consoleFn('Context:', context);
        }
        consoleFn('Error:', error);
      } else if (context && Object.keys(context).length > 0) {
        // For messages with context, log them together
        consoleFn(formattedMessage, context);
      } else {
        // Simple message without context
        consoleFn(formattedMessage);
      }
    } catch (logError) {
      // Fallback to basic console.log if formatting fails
      // eslint-disable-next-line no-console -- Error fallback in logger requires console access
      console.log(`[LOG ERROR] Failed to format log entry: ${message}`, logError);
    }
  }
}

/**
 * Creates a logger instance with environment-appropriate configuration.
 *
 * @remarks
 * Factory function that creates a logger with sensible defaults based on
 * the runtime environment. It automatically selects appropriate log levels
 * and configuration for development vs production scenarios.
 *
 * Environment Detection:
 * - Development: Enables debug logging for comprehensive visibility
 * - Production: Uses info level for performance and noise reduction
 * - Testing: Configurable via environment variables
 *
 * @param environment - Runtime environment ('development' | 'production')
 * @param source - Optional source identifier override
 * @returns Configured logger instance
 *
 * @example
 * ```typescript
 * // Environment-based logger creation
 * const logger = createLogger('development'); // Debug level enabled
 * const prodLogger = createLogger('production'); // Info level only
 *
 * // Custom source identifier
 * const serviceLogger = createLogger('production', 'game-service');
 * ```
 */
export function createLogger(environment: 'development' | 'production', source?: string): Logger {
  const logLevel: LogLevel = environment === 'development' ? 'debug' : 'info';
  return new ConsoleLogger(logLevel, source);
}
