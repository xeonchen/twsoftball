/**
 * @file EventStore Error Handler
 * Centralized error handling for EventStore implementations
 * Provides consistent error wrapping and logging
 */

/**
 * EventStore error types
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
 * Custom EventStore error class
 */
export class EventStoreError extends Error {
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
 * Centralized error handler for EventStore operations
 */
export class EventStoreErrorHandler {
  /**
   * Wraps and categorizes errors from EventStore operations
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
   * Handles connection-related errors
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
   * Handles transaction-related errors
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
   * Handles concurrency conflict errors
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
   * Handles serialization errors
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
   * Handles storage quota exceeded errors
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
   * Safely executes an operation with error handling
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
   * Categorizes errors based on their properties
   * Priority order: Most specific to least specific
   * 1. Concurrency conflicts (business-level conflicts)
   * 2. Validation errors (input validation)
   * 3. Serialization errors (data format issues)
   * 4. Storage quota errors (resource constraints)
   * 5. Transaction errors (database transaction issues)
   * 6. Connection errors (network/connectivity issues)
   * 7. Unknown errors (fallback)
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
   * Creates a descriptive error message
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
   * Checks if an error is retryable
   */
  static isRetryableError(error: EventStoreError): boolean {
    return (
      error.type === EventStoreErrorType.CONNECTION_ERROR ||
      error.type === EventStoreErrorType.TRANSACTION_ERROR
    );
  }

  /**
   * Checks if an error is a concurrency conflict
   */
  static isConcurrencyConflict(error: EventStoreError): boolean {
    return error.type === EventStoreErrorType.CONCURRENCY_CONFLICT;
  }

  /**
   * Extracts retry delay from error context
   */
  static getRetryDelay(_error: EventStoreError, attempt: number): number {
    // Exponential backoff with jitter
    // Note: error parameter reserved for future use (error-specific retry logic)
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }
}
