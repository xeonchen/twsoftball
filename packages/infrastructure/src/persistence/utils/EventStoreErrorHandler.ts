/**
 * @file EventStore Error Handler
 * Centralized error handling for EventStore implementations
 * Provides consistent error wrapping and logging
 */

/**
 * Categorized error types for EventStore operations in TW Softball application.
 *
 * Each error type represents a specific failure mode that requires different
 * handling strategies - from user-facing messages to retry logic.
 *
 * @remarks
 * Error types are ordered by specificity to ensure accurate categorization
 * when multiple patterns could match the same error condition.
 */
export enum EventStoreErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Specialized error class for EventStore operations in the TW Softball event sourcing system.
 *
 * Provides structured error information including categorization, original error context,
 * and additional metadata to support proper error handling and user experience.
 *
 * @example
 * ```typescript
 * try {
 *   await eventStore.append(gameId, 'Game', events);
 * } catch (error) {
 *   if (error instanceof EventStoreError && error.type === EventStoreErrorType.CONCURRENCY_CONFLICT) {
 *     // Handle optimistic concurrency conflict
 *     console.log('Version conflict:', error.context);
 *   }
 * }
 * ```
 */
export class EventStoreError extends Error {
  /**
   * Creates a new EventStoreError with categorized error information.
   *
   * @param message - Human-readable error description
   * @param type - Categorized error type for handling logic
   * @param originalError - The underlying error that triggered this EventStore error
   * @param context - Additional context data (stream IDs, versions, operation details)
   */
  constructor(
    message: string,
    public readonly type: EventStoreErrorType,
    public readonly originalError?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EventStoreError';
  }
}

/**
 * Centralized error handling and categorization service for EventStore operations.
 *
 * Provides consistent error wrapping, categorization, and retry logic across all
 * EventStore implementations in the TW Softball application. Ensures uniform
 * error handling whether using IndexedDB, SQLite, or other persistence adapters.
 *
 * @remarks
 * This class follows the Fail-Fast principle - errors are categorized immediately
 * and wrapped with relevant context. The categorization logic uses a priority-based
 * approach to handle overlapping error patterns correctly.
 *
 * All methods are static to enable usage without instantiation, following the
 * utility class pattern for cross-cutting concerns.
 *
 * @example
 * ```typescript
 * // Basic error wrapping
 * try {
 *   await indexedDBOperation();
 * } catch (error) {
 *   throw EventStoreErrorHandler.wrapError(error, 'append', { gameId: game.id });
 * }
 *
 * // Safe execution with automatic error handling
 * const result = await EventStoreErrorHandler.safeExecute(
 *   () => complexEventStoreOperation(),
 *   'batch-append',
 *   { eventCount: events.length }
 * );
 * ```
 */
export class EventStoreErrorHandler {
  /**
   * Wraps unknown errors in EventStoreError with proper categorization and context.
   *
   * This is the primary error handling entry point that converts any thrown error
   * into a properly categorized EventStoreError with relevant context information.
   *
   * @param error - The caught error (any type) to be wrapped
   * @param operation - Name of the EventStore operation that failed (e.g., 'append', 'getEvents')
   * @param context - Additional context information (stream IDs, versions, batch size, etc.)
   * @returns Properly categorized EventStoreError with full context
   *
   * @example
   * ```typescript
   * try {
   *   await transaction.objectStore('events').add(eventData);
   * } catch (error) {
   *   throw EventStoreErrorHandler.wrapError(error, 'append', {
   *     streamId: gameId.value,
   *     eventCount: events.length
   *   });
   * }
   * ```
   */
  static wrapError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): EventStoreError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorType = this.categorizeError(originalError);
    const message = this.createErrorMessage(errorType, operation, originalError.message);

    return new EventStoreError(message, errorType, originalError, context);
  }

  /**
   * Handles database connection and network-related errors by throwing EventStoreError.
   *
   * Used for IndexedDB database opening failures, network connectivity issues,
   * or any connectivity-related problems in the softball game event persistence.
   *
   * @param error - The connection error to handle
   * @param operation - Name of the operation that encountered connection issues
   * @param context - Additional context (database name, retry attempt, etc.)
   * @throws EventStoreError with CONNECTION_ERROR type
   *
   * @example
   * ```typescript
   * try {
   *   const db = await indexedDB.open('tw-softball-events');
   * } catch (error) {
   *   EventStoreErrorHandler.handleConnectionError(error, 'database-open', {
   *     databaseName: 'tw-softball-events',
   *     attempt: retryCount
   *   });
   * }
   * ```
   */
  static handleConnectionError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): never {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const message = this.createErrorMessage(
      EventStoreErrorType.CONNECTION_ERROR,
      operation,
      originalError.message
    );
    throw new EventStoreError(
      message,
      EventStoreErrorType.CONNECTION_ERROR,
      originalError,
      context
    );
  }

  /**
   * Handles IndexedDB transaction lifecycle and state errors by throwing EventStoreError.
   *
   * Used for transaction inactive errors, transaction abort failures, or any
   * transaction state management issues when persisting softball game events.
   *
   * @param error - The transaction error to handle
   * @param operation - Name of the operation within the failed transaction
   * @param context - Transaction context (mode, object stores, operation sequence)
   * @throws EventStoreError with TRANSACTION_ERROR type
   *
   * @example
   * ```typescript
   * try {
   *   await transaction.objectStore('events').put(eventData);
   * } catch (error) {
   *   EventStoreErrorHandler.handleTransactionError(error, 'event-store', {
   *     transactionMode: 'readwrite',
   *     objectStores: ['events'],
   *     eventId: event.eventId
   *   });
   * }
   * ```
   */
  static handleTransactionError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): never {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const message = this.createErrorMessage(
      EventStoreErrorType.TRANSACTION_ERROR,
      operation,
      originalError.message
    );
    throw new EventStoreError(
      message,
      EventStoreErrorType.TRANSACTION_ERROR,
      originalError,
      context
    );
  }

  /**
   * Handles optimistic concurrency control violations by throwing EventStoreError.
   *
   * Critical for event sourcing - when multiple operations attempt to append events
   * to the same stream with conflicting version expectations. Essential for maintaining
   * softball game state consistency across concurrent operations.
   *
   * @param expectedVersion - The version number the operation expected to find
   * @param actualVersion - The actual current version in the event stream
   * @param streamId - The aggregate stream ID where the conflict occurred
   * @param context - Additional conflict context (operation type, user ID, etc.)
   * @throws EventStoreError with CONCURRENCY_CONFLICT type and detailed version info
   *
   * @example
   * ```typescript
   * const currentVersion = await getStreamVersion(gameId);
   * if (expectedVersion !== currentVersion) {
   *   EventStoreErrorHandler.handleConcurrencyConflict(
   *     expectedVersion,
   *     currentVersion,
   *     gameId.value,
   *     { operation: 'append-at-bat', userId: currentUser.id }
   *   );
   * }
   * ```
   */
  static handleConcurrencyConflict(
    expectedVersion: number,
    actualVersion: number,
    streamId: string,
    context?: Record<string, unknown>
  ): never {
    const message = `Concurrency conflict on stream ${streamId}: expected version ${expectedVersion}, actual version ${actualVersion}`;
    const error = new EventStoreError(
      message,
      EventStoreErrorType.CONCURRENCY_CONFLICT,
      undefined,
      { expectedVersion, actualVersion, streamId, ...context }
    );
    throw error;
  }

  /**
   * Handles JSON serialization/deserialization errors for domain events by throwing EventStoreError.
   *
   * Events in the softball application must be serialized to JSON for storage.
   * This handles cases where domain events contain non-serializable data or
   * when stored JSON cannot be parsed back to domain objects.
   *
   * @param error - The serialization error (JSON.stringify/parse failure)
   * @param eventData - The event data that failed to serialize/deserialize
   * @param context - Serialization context (event type, direction, etc.)
   * @throws EventStoreError with SERIALIZATION_ERROR type and event data context
   *
   * @example
   * ```typescript
   * try {
   *   const serialized = JSON.stringify(domainEvent);
   * } catch (error) {
   *   EventStoreErrorHandler.handleSerializationError(error, domainEvent, {
   *     eventType: domainEvent.type,
   *     direction: 'serialize',
   *     aggregateId: domainEvent.gameId.value
   *   });
   * }
   * ```
   */
  static handleSerializationError(
    error: unknown,
    eventData: unknown,
    context?: Record<string, unknown>
  ): never {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const message = this.createErrorMessage(
      EventStoreErrorType.SERIALIZATION_ERROR,
      'serialization',
      originalError.message
    );
    throw new EventStoreError(message, EventStoreErrorType.SERIALIZATION_ERROR, originalError, {
      eventData,
      ...context,
    });
  }

  /**
   * Handles browser storage quota exceeded errors by throwing EventStoreError.
   *
   * Critical for PWA functionality - when IndexedDB storage limit is reached,
   * the softball application cannot persist new game events. Requires user
   * intervention or automatic cleanup strategies.
   *
   * @param error - The quota exceeded error from IndexedDB
   * @param operation - The storage operation that exceeded quota
   * @param context - Storage context (database size, event count, cleanup suggestions)
   * @throws EventStoreError with STORAGE_QUOTA_EXCEEDED type
   *
   * @example
   * ```typescript
   * try {
   *   await transaction.objectStore('events').add(largeEventBatch);
   * } catch (error) {
   *   if (error.name === 'QuotaExceededError') {
   *     EventStoreErrorHandler.handleQuotaExceededError(error, 'batch-append', {
   *       eventCount: largeEventBatch.length,
   *       estimatedSize: calculateEventBatchSize(largeEventBatch),
   *       suggestedAction: 'archive-old-games'
   *     });
   *   }
   * }
   * ```
   */
  static handleQuotaExceededError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): never {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const message = this.createErrorMessage(
      EventStoreErrorType.STORAGE_QUOTA_EXCEEDED,
      operation,
      originalError.message
    );
    throw new EventStoreError(
      message,
      EventStoreErrorType.STORAGE_QUOTA_EXCEEDED,
      originalError,
      context
    );
  }

  /**
   * Executes EventStore operations with automatic error wrapping and categorization.
   *
   * Provides a higher-level abstraction that automatically catches and categorizes
   * any errors thrown during EventStore operations, ensuring consistent error
   * handling across the softball application.
   *
   * @template T - The return type of the operation function
   * @param operation - The async operation to execute safely
   * @param operationName - Descriptive name for error context
   * @param context - Additional context to include in any resulting errors
   * @returns Promise resolving to the operation result
   * @throws EventStoreError with proper categorization if operation fails
   *
   * @example
   * ```typescript
   * const gameEvents = await EventStoreErrorHandler.safeExecute(
   *   () => indexedDBStore.getGameEvents(gameId),
   *   'get-game-events',
   *   { gameId: gameId.value, aggregateTypes: ['Game', 'TeamLineup'] }
   * );
   * ```
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.wrapError(error, operationName, context);
    }
  }

  /**
   * Categorizes errors into EventStoreErrorType based on error message and name patterns.
   *
   * Uses a priority-based classification system to handle overlapping error patterns.
   * More specific business errors (concurrency conflicts) take precedence over
   * generic infrastructure errors (connection issues).
   *
   * @param error - The error object to categorize
   * @returns The most appropriate EventStoreErrorType for the error
   *
   * @remarks
   * Priority order (most specific to least specific):
   * 1. Concurrency conflicts - business-level optimistic locking failures
   * 2. Validation errors - input validation and constraint violations
   * 3. Serialization errors - JSON parsing and data format issues
   * 4. Storage quota errors - browser storage limit exceeded
   * 5. Transaction errors - IndexedDB transaction lifecycle issues
   * 6. Connection errors - database connectivity and network problems
   * 7. Unknown errors - unrecognized error patterns (fallback)
   *
   * This ordering ensures that constraint violations are treated as concurrency
   * conflicts rather than generic validation errors, which is correct for event
   * sourcing where constraints typically indicate version conflicts.
   */
  private static categorizeError(error: Error): EventStoreErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // 1. Concurrency conflicts - most specific business error
    if (
      message.includes('concurrency') ||
      message.includes('version') ||
      message.includes('conflict') ||
      (message.includes('constraint') && !message.includes('validation')) ||
      name.includes('constrainterror')
    ) {
      return EventStoreErrorType.CONCURRENCY_CONFLICT;
    }

    // 2. Validation errors - input validation issues
    if (
      message.includes('validation') ||
      (message.includes('invalid') && !message.includes('transaction')) ||
      message.includes('required') ||
      name.includes('validationerror')
    ) {
      return EventStoreErrorType.VALIDATION_ERROR;
    }

    // 3. Serialization errors - data format issues
    if (
      message.includes('json') ||
      message.includes('parse') ||
      message.includes('serialize') ||
      message.includes('stringify') ||
      name.includes('syntaxerror')
    ) {
      return EventStoreErrorType.SERIALIZATION_ERROR;
    }

    // 4. Storage quota errors - resource constraint issues
    if (
      message.includes('quota') ||
      (message.includes('storage') && !message.includes('transaction')) ||
      message.includes('disk') ||
      message.includes('space') ||
      name.includes('quotaexceedederror')
    ) {
      return EventStoreErrorType.STORAGE_QUOTA_EXCEEDED;
    }

    // 5. Transaction errors - database transaction issues
    if (
      message.includes('transaction') ||
      message.includes('inactive') ||
      message.includes('aborted') ||
      name.includes('transactioninactiveerror') ||
      name.includes('aborterror')
    ) {
      return EventStoreErrorType.TRANSACTION_ERROR;
    }

    // 6. Connection errors - network/connectivity issues
    if (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('offline') ||
      name.includes('networkerror')
    ) {
      return EventStoreErrorType.CONNECTION_ERROR;
    }

    // 7. Fallback for unrecognized errors
    return EventStoreErrorType.UNKNOWN_ERROR;
  }

  /**
   * Creates standardized, descriptive error messages for EventStore failures.
   *
   * Generates consistent error message format across all EventStore error types,
   * making it easier for developers and users to understand what went wrong
   * during softball game event persistence operations.
   *
   * @param errorType - The categorized error type
   * @param operation - The EventStore operation that failed
   * @param originalMessage - The original error message from the underlying system
   * @returns Formatted error message with context and cause
   *
   * @example
   * // Input: CONNECTION_ERROR, 'database-open', 'Network request failed'
   * // Output: 'EventStore database-open failed due to connection error: Network request failed'
   */
  private static createErrorMessage(
    errorType: EventStoreErrorType,
    operation: string,
    originalMessage: string
  ): string {
    const prefix = `EventStore ${operation} failed`;

    switch (errorType) {
      case EventStoreErrorType.CONNECTION_ERROR:
        return `${prefix} due to connection error: ${originalMessage}`;
      case EventStoreErrorType.TRANSACTION_ERROR:
        return `${prefix} due to transaction error: ${originalMessage}`;
      case EventStoreErrorType.CONCURRENCY_CONFLICT:
        return `${prefix} due to concurrency conflict: ${originalMessage}`;
      case EventStoreErrorType.SERIALIZATION_ERROR:
        return `${prefix} due to serialization error: ${originalMessage}`;
      case EventStoreErrorType.VALIDATION_ERROR:
        return `${prefix} due to validation error: ${originalMessage}`;
      case EventStoreErrorType.STORAGE_QUOTA_EXCEEDED:
        return `${prefix} due to storage quota exceeded: ${originalMessage}`;
      default:
        return `${prefix}: ${originalMessage}`;
    }
  }

  /**
   * Determines if an EventStore error represents a transient condition that may succeed on retry.
   *
   * Critical for building resilient softball game persistence - distinguishes between
   * temporary issues (network timeouts, transaction conflicts) and permanent failures
   * (validation errors, storage quota exceeded).
   *
   * @param error - The EventStoreError to evaluate for retry potential
   * @returns true if the error condition might be resolved by retrying the operation
   *
   * @remarks
   * Only connection and transaction errors are considered retryable because:
   * - Connection errors may resolve when network conditions improve
   * - Transaction errors may resolve when concurrent operations complete
   * - Concurrency conflicts require application-level resolution (reload and retry)
   * - Validation and serialization errors are permanent code/data issues
   * - Storage quota requires user intervention or cleanup
   *
   * @example
   * ```typescript
   * if (EventStoreErrorHandler.isRetryableError(error)) {
   *   const delay = EventStoreErrorHandler.getRetryDelay(error, attemptCount);
   *   await new Promise(resolve => setTimeout(resolve, delay));
   *   return retryOperation();
   * }
   * ```
   */
  static isRetryableError(error: EventStoreError): boolean {
    return (
      error.type === EventStoreErrorType.CONNECTION_ERROR ||
      error.type === EventStoreErrorType.TRANSACTION_ERROR
    );
  }

  /**
   * Determines if an EventStore error represents an optimistic concurrency control violation.
   *
   * Essential for event sourcing in the softball application - concurrency conflicts
   * require special handling such as reloading current state and allowing user
   * to retry with updated information.
   *
   * @param error - The EventStoreError to check for concurrency conflict
   * @returns true if the error indicates a version/concurrency conflict
   *
   * @example
   * ```typescript
   * try {
   *   await eventStore.append(gameId, 'Game', events, expectedVersion);
   * } catch (error) {
   *   if (EventStoreErrorHandler.isConcurrencyConflict(error)) {
   *     // Reload game state and prompt user to retry
   *     const currentGame = await gameRepository.getById(gameId);
   *     showConcurrencyConflictDialog(currentGame);
   *   }
   * }
   * ```
   */
  static isConcurrencyConflict(error: EventStoreError): boolean {
    return error.type === EventStoreErrorType.CONCURRENCY_CONFLICT;
  }

  /**
   * Calculates appropriate retry delay using exponential backoff with jitter.
   *
   * Implements a robust retry strategy for transient EventStore failures,
   * preventing thundering herd problems while ensuring reasonable retry timing
   * for softball game event persistence operations.
   *
   * @param _error - The EventStoreError (reserved for future error-specific retry logic)
   * @param attempt - The current retry attempt number (0-based)
   * @returns Delay in milliseconds before next retry attempt
   *
   * @remarks
   * Algorithm: min(baseDelay * 2^attempt, maxDelay) + randomJitter
   * - Base delay: 1 second
   * - Max delay: 30 seconds (prevents excessive wait times)
   * - Jitter: ±10% randomization to prevent synchronized retries
   *
   * The error parameter is currently unused but reserved for future
   * enhancements where different error types might require different
   * retry intervals (e.g., shorter delays for transaction conflicts).
   *
   * @example
   * ```typescript
   * let attempt = 0;
   * while (attempt < MAX_RETRIES) {
   *   try {
   *     return await eventStoreOperation();
   *   } catch (error) {
   *     if (!EventStoreErrorHandler.isRetryableError(error)) throw error;
   *
   *     const delay = EventStoreErrorHandler.getRetryDelay(error, attempt);
   *     await new Promise(resolve => setTimeout(resolve, delay));
   *     attempt++;
   *   }
   * }
   * ```
   */
  static getRetryDelay(_error: EventStoreError, attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
    // Jitter: randomization to prevent synchronized retry attempts
    // Error parameter reserved for future error-specific retry strategies
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }
}
