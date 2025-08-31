/**
 * @file Logger
 * Outbound port interface for application logging and observability.
 *
 * @remarks
 * This interface defines the driven port for logging operations in the hexagonal
 * architecture. It abstracts all logging concerns from the application core,
 * enabling different logging implementations without affecting business logic.
 *
 * The logging port provides structured, contextual logging capabilities that
 * support modern observability practices including:
 * - Structured logging with rich context information
 * - Multiple log levels for appropriate categorization
 * - Error logging with stack trace preservation
 * - Business domain context integration
 * - Performance monitoring and audit trails
 *
 * Design principles:
 * - Domain-aware: Supports softball game terminology and context
 * - Structured: All logs include contextual metadata for analysis
 * - Level-based: Hierarchical levels enable appropriate log filtering
 * - Type-safe: Strong TypeScript typing prevents logging errors
 * - Infrastructure-agnostic: No dependencies on specific logging libraries
 *
 * The interface supports common logging patterns needed for enterprise applications:
 * - Request/response correlation tracking
 * - User action audit trails
 * - Performance monitoring and alerting
 * - Error tracking and debugging
 * - Business process monitoring
 *
 * All logging operations are synchronous (void) to avoid blocking application
 * flow. Infrastructure implementations should handle asynchronous operations
 * (file writes, network calls) internally without exposing promises to the
 * application layer.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class ConsoleLogger implements Logger {
 *   debug(message: string, context?: LogContext): void {
 *     if (this.isLevelEnabled('debug')) {
 *       console.debug(this.formatMessage('DEBUG', message, context));
 *     }
 *   }
 *
 *   error(message: string, error?: Error, context?: LogContext): void {
 *     const logEntry = this.createLogEntry('error', message, context, error);
 *     console.error(this.formatMessage('ERROR', message, context, error));
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage in application service
 * class GameApplicationService {
 *   constructor(private logger: Logger) {}
 *
 *   async recordAtBat(command: RecordAtBatCommand): Promise<void> {
 *     this.logger.info('Recording at-bat', {
 *       gameId: command.gameId,
 *       playerId: command.playerId,
 *       result: command.result,
 *       operation: 'recordAtBat'
 *     });
 *
 *     try {
 *       // Business logic here
 *       this.logger.debug('At-bat processed successfully', {
 *         gameId: command.gameId,
 *         eventId: 'evt-123',
 *         duration: 45
 *       });
 *     } catch (error) {
 *       this.logger.error('Failed to record at-bat', error as Error, {
 *         gameId: command.gameId,
 *         playerId: command.playerId,
 *         operation: 'recordAtBat',
 *         stage: 'domain_validation'
 *       });
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */

/**
 * Log level enumeration for categorizing log entries by severity and purpose.
 *
 * @remarks
 * Hierarchical logging levels that enable appropriate filtering and routing
 * of log messages. Each level serves specific purposes in application monitoring:
 *
 * - **debug**: Detailed diagnostic information for development and troubleshooting
 * - **info**: General application flow and significant business events
 * - **warn**: Potentially problematic situations that don't halt execution
 * - **error**: Error conditions that may affect application functionality
 *
 * The hierarchy allows for level-based filtering where setting a minimum level
 * (e.g., 'info') will include that level and all higher levels ('warn', 'error')
 * while excluding lower levels ('debug').
 *
 * Level selection guidelines:
 * - Production environments typically use 'info' or 'warn' minimum levels
 * - Development environments often use 'debug' for comprehensive visibility
 * - Error monitoring systems focus on 'error' and 'warn' levels
 * - Performance-sensitive applications may restrict to 'warn' and 'error'
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured context information attached to log entries for enhanced observability.
 *
 * @remarks
 * LogContext provides a flexible, type-safe container for contextual information
 * that enhances log entries with business domain knowledge and operational metadata.
 *
 * Context supports multiple data types and nested structures to accommodate
 * various logging scenarios:
 * - Business identifiers (gameId, playerId, userId)
 * - Operational metadata (requestId, correlationId, sessionId)
 * - Performance metrics (duration, memory usage, operation counts)
 * - Domain-specific data (scores, innings, player positions)
 *
 * The flexible structure allows for evolution without breaking interface contracts,
 * supporting both current and future logging requirements.
 *
 * @example
 * ```typescript
 * // Business operation context
 * const gameContext: LogContext = {
 *   gameId: 'game-abc123',
 *   operation: 'recordAtBat',
 *   playerId: 'player-456',
 *   inning: 7,
 *   outs: 2,
 *   result: 'SINGLE'
 * };
 *
 * // Performance monitoring context
 * const perfContext: LogContext = {
 *   operation: 'calculateStatistics',
 *   duration: 1250,
 *   playersProcessed: 18,
 *   memoryUsage: 'high',
 *   cacheHitRate: 0.85
 * };
 *
 * // Error handling context
 * const errorContext: LogContext = {
 *   operation: 'validateAtBat',
 *   validation: 'failed',
 *   reason: 'invalid_batting_order',
 *   gameId: 'game-123',
 *   attemptedSlot: 10,
 *   actualSlot: 3
 * };
 * ```
 */
export interface LogContext {
  /** Flexible context data supporting various types and nested structures */
  [key: string]: unknown;
}

/**
 * Complete log entry structure for internal processing and storage.
 *
 * @remarks
 * LogEntry represents the complete structure of a log message after processing
 * by the Logger interface. It combines the original message and context with
 * metadata required for proper log management and analysis.
 *
 * The structure preserves:
 * - Original message intent and severity level
 * - Complete contextual information for analysis
 * - Timing information for chronological ordering
 * - Error details including stack traces
 * - Source identification for debugging
 *
 * This interface is primarily used by infrastructure implementations for:
 * - Log formatting and serialization
 * - Storage and indexing operations
 * - Log analysis and aggregation
 * - Debugging and troubleshooting support
 */
export interface LogEntry {
  /** Severity level of this log entry */
  readonly level: LogLevel;

  /** Human-readable log message */
  readonly message: string;

  /** When this log entry was created */
  readonly timestamp: Date;

  /** Structured context data for enhanced analysis */
  readonly context: LogContext;

  /** Error object if this entry represents an error condition */
  readonly error?: Error;

  /** Source component or system that generated this entry */
  readonly source: string;
}

/**
 * Logger interface for application-wide logging and observability.
 *
 * @remarks
 * This interface provides comprehensive logging capabilities for the application
 * layer, supporting structured logging, multiple severity levels, and rich
 * contextual information. It serves as the abstraction layer between business
 * logic and logging infrastructure.
 *
 * Design principles:
 * - **Structured logging**: All entries support contextual metadata
 * - **Level-based filtering**: Hierarchical levels enable appropriate categorization
 * - **Domain integration**: Context supports softball-specific business data
 * - **Type safety**: Strong typing prevents common logging mistakes
 * - **Performance awareness**: Synchronous interface with level checking
 *
 * The interface supports enterprise logging patterns including:
 * - Request/response correlation through context
 * - User action audit trails with business context
 * - Performance monitoring with timing and metrics
 * - Error tracking with complete context and stack traces
 * - Business process monitoring and analysis
 *
 * Method categories:
 * - **Level-specific methods**: debug(), info(), warn(), error() for common cases
 * - **Generic method**: log() for dynamic level selection
 * - **Level management**: isLevelEnabled() for performance optimization
 *
 * All logging methods are synchronous (void return) to avoid blocking application
 * execution. Infrastructure implementations handle any asynchronous operations
 * (file I/O, network calls) internally.
 *
 * Context guidelines:
 * - Include business identifiers (gameId, playerId) for correlation
 * - Add operational metadata (requestId, userId) for audit trails
 * - Provide performance metrics (duration, counts) for monitoring
 * - Include domain-specific data (innings, scores) for business analysis
 */
export interface Logger {
  /**
   * Logs detailed diagnostic information for development and troubleshooting.
   *
   * @remarks
   * Debug messages provide comprehensive diagnostic information useful during
   * development, testing, and production troubleshooting. These messages are
   * typically filtered out in production environments for performance reasons.
   *
   * Use debug logging for:
   * - Method entry/exit tracing with parameters and results
   * - Detailed state information during complex operations
   * - Step-by-step execution flow for debugging
   * - Internal calculations and intermediate results
   * - Infrastructure interaction details
   *
   * Debug messages should include sufficient context to understand the
   * application state when debugging issues without access to debuggers.
   *
   * @param message - Descriptive message explaining the debug information
   * @param context - Optional structured context for enhanced analysis
   *
   * @example
   * ```typescript
   * logger.debug('Starting game state calculation', {
   *   gameId: 'game-123',
   *   operation: 'calculateGameState',
   *   inputEvents: 47,
   *   startTime: Date.now()
   * });
   *
   * logger.debug('Player validation completed', {
   *   playerId: 'player-456',
   *   position: 'SS',
   *   battingSlot: 3,
   *   isEligible: true,
   *   validationRules: ['batting_order', 'substitution', 'position']
   * });
   * ```
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Logs general application flow and significant business events.
   *
   * @remarks
   * Info messages capture normal application operation and significant business
   * events that provide visibility into system behavior. These messages form
   * the primary audit trail for business operations in production environments.
   *
   * Use info logging for:
   * - Successful completion of business operations
   * - User actions and their outcomes
   * - Significant state changes in the application
   * - Integration points with external systems
   * - Configuration changes and system startup/shutdown
   *
   * Info messages should provide sufficient detail to understand business
   * flow and user interactions without overwhelming log analysis.
   *
   * @param message - Clear description of the event or operation
   * @param context - Optional business context for correlation and analysis
   *
   * @example
   * ```typescript
   * logger.info('At-bat recorded successfully', {
   *   gameId: 'game-123',
   *   playerId: 'player-456',
   *   result: 'SINGLE',
   *   inning: 7,
   *   outs: 1,
   *   rbiCount: 1
   * });
   *
   * logger.info('Game started', {
   *   gameId: 'game-789',
   *   homeTeam: 'Dragons',
   *   awayTeam: 'Tigers',
   *   scheduledStart: '2024-06-15T19:00:00Z',
   *   actualStart: new Date(),
   *   venue: 'Municipal Stadium'
   * });
   * ```
   */
  info(message: string, context?: LogContext): void;

  /**
   * Logs potentially problematic situations that don't halt execution.
   *
   * @remarks
   * Warning messages indicate conditions that may lead to errors or unexpected
   * behavior but don't prevent the application from continuing. These messages
   * help identify potential issues before they become critical problems.
   *
   * Use warning logging for:
   * - Recoverable errors or fallback scenarios
   * - Performance issues or resource constraints
   * - Deprecated functionality usage
   * - Business rule violations that are handled gracefully
   * - Configuration issues that have default handling
   *
   * Warnings should include sufficient context to understand the impact
   * and potential remediation steps.
   *
   * @param message - Description of the warning condition
   * @param context - Contextual information for analysis and remediation
   *
   * @example
   * ```typescript
   * logger.warn('Player substitution limit approaching', {
   *   gameId: 'game-123',
   *   teamId: 'team-home',
   *   currentSubstitutions: 8,
   *   maximumAllowed: 10,
   *   inning: 6,
   *   recommendation: 'consider_strategic_substitutions'
   * });
   *
   * logger.warn('Operation took longer than expected', {
   *   operation: 'calculateStatistics',
   *   duration: 2500,
   *   expectedMax: 1000,
   *   gameId: 'game-456',
   *   playersProcessed: 22,
   *   possibleCause: 'large_event_history'
   * });
   * ```
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Logs error conditions that may affect application functionality.
   *
   * @remarks
   * Error messages capture exceptional conditions, failures, and other problems
   * that require attention. These messages are critical for monitoring system
   * health and diagnosing issues that affect user experience or data integrity.
   *
   * Use error logging for:
   * - Unhandled exceptions and system errors
   * - Business rule violations that cannot be resolved
   * - Infrastructure failures (database, network, file system)
   * - Data validation failures and inconsistencies
   * - Security-related issues and access violations
   *
   * Error logs should include complete context for root cause analysis,
   * including error details, stack traces, and relevant business state.
   *
   * @param message - Clear description of the error condition
   * @param error - Optional Error object with stack trace and details
   * @param context - Business and operational context for debugging
   *
   * @example
   * ```typescript
   * logger.error('At-bat validation failed', validationError, {
   *   gameId: 'game-123',
   *   playerId: 'player-456',
   *   operation: 'recordAtBat',
   *   validation: 'failed',
   *   reason: 'player_already_out',
   *   gameState: {
   *     inning: 3,
   *     outs: 2,
   *     currentBatter: 'player-456'
   *   }
   * });
   *
   * logger.error('Database connection failed', dbError, {
   *   operation: 'saveGame',
   *   gameId: 'game-789',
   *   retryAttempt: 3,
   *   maxRetries: 5,
   *   errorCode: 'CONNECTION_TIMEOUT',
   *   infrastructure: 'indexeddb'
   * });
   * ```
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Logs a message with a dynamically specified level.
   *
   * @remarks
   * Generic logging method that accepts the log level as a parameter, enabling
   * dynamic level selection based on runtime conditions. This method provides
   * flexibility for scenarios where the appropriate log level is determined
   * programmatically rather than statically.
   *
   * Use the generic log method for:
   * - Configurable logging where level is determined by settings
   * - Wrapper functions that need to preserve original log levels
   * - Dynamic error handling where severity depends on context
   * - Library code that accepts log level as a parameter
   *
   * This method provides the same functionality as level-specific methods
   * (debug, info, warn, error) but with runtime level selection.
   *
   * @param level - Log level for this message
   * @param message - Descriptive message for the log entry
   * @param context - Optional structured context information
   * @param error - Optional Error object for error-level messages
   *
   * @example
   * ```typescript
   * // Dynamic level based on configuration
   * const logLevel: LogLevel = config.performanceLogging ? 'info' : 'debug';
   * logger.log(logLevel, 'Operation completed', {
   *   operation: 'processGame',
   *   duration: 150,
   *   success: true
   * });
   *
   * // Wrapper function preserving original level
   * function logBusinessEvent(level: LogLevel, event: string, context: LogContext) {
   *   logger.log(level, `Business event: ${event}`, {
   *     ...context,
   *     eventType: 'business',
   *     timestamp: new Date()
   *   });
   * }
   *
   * // Error handling with context-dependent severity
   * const severity: LogLevel = isRetryableError(error) ? 'warn' : 'error';
   * logger.log(severity, 'Operation failed', { retryable: isRetryableError(error) }, error);
   * ```
   */
  log(level: LogLevel, message: string, context?: LogContext, error?: Error): void;

  /**
   * Determines if logging is enabled for the specified level.
   *
   * @remarks
   * Performance optimization method that allows applications to avoid expensive
   * operations (like complex object serialization) when the target log level
   * is not enabled. This is particularly important for debug logging in
   * production environments.
   *
   * The method should consider the logger's current minimum level configuration
   * and return true if messages at the specified level would be processed.
   *
   * Use level checking for:
   * - Expensive context object construction
   * - Complex calculations needed only for logging
   * - String formatting operations with significant overhead
   * - Performance-sensitive code paths
   *
   * Level checking follows the hierarchical model where higher levels include
   * all lower levels (e.g., if 'info' is enabled, 'warn' and 'error' are also enabled).
   *
   * @param level - Log level to check for enablement
   * @returns True if the level is enabled and messages would be processed
   *
   * @example
   * ```typescript
   * // Avoid expensive object serialization when debug is disabled
   * if (logger.isLevelEnabled('debug')) {
   *   logger.debug('Complex game state', {
   *     gameId: 'game-123',
   *     fullState: game.toDetailedSnapshot(), // Expensive operation
   *     playerStats: calculateAllPlayerStats(), // Expensive operation
   *     eventHistory: getAllEvents() // Large data structure
   *   });
   * }
   *
   * // Conditional performance monitoring
   * if (logger.isLevelEnabled('info')) {
   *   const startTime = performance.now();
   *   processGameEvents();
   *   const duration = performance.now() - startTime;
   *
   *   logger.info('Game processing completed', {
   *     gameId: 'game-456',
   *     duration,
   *     eventsProcessed: events.length
   *   });
   * }
   *
   * // Dynamic message construction
   * const shouldLogDetails = logger.isLevelEnabled('debug');
   * const context = shouldLogDetails
   *   ? { ...baseContext, detailedMetrics: calculateMetrics() }
   *   : baseContext;
   * logger.info('Operation completed', context);
   * ```
   */
  isLevelEnabled(level: LogLevel): boolean;
}
