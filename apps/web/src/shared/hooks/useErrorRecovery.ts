/**
 * @file useErrorRecovery Hook
 *
 * Comprehensive error handling and recovery hook for the web application.
 * Provides network failure recovery, validation error handling, concurrency
 * management, and optimistic UI updates with rollback capabilities.
 *
 * @remarks
 * This hook implements:
 * - Network failure recovery with exponential backoff
 * - Validation error display with field-level details
 * - Optimistic UI updates with rollback capability
 * - State refresh and conflict resolution
 * - Error reporting functionality
 * - Timeout handling and recovery
 */

import { useState, useCallback, useRef, useEffect, useReducer } from 'react';

/**
 * Web layer ValidationError interface (no dependency on application layer)
 * Property-based detection instead of instanceof checks
 */
interface ValidationError {
  name: string;
  message: string;
  validationContext: {
    field?: string;
    value?: unknown;
    context?: Record<string, unknown>;
    rule?: string;
    path?: string[];
  };
  timestamp?: Date;
}

/**
 * Options for retry behavior configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  backoffMultiplier?: number;
  initialDelay?: number;
}

/**
 * Options for timeout configuration
 */
export interface TimeoutOptions {
  timeout?: number;
}

/**
 * Context for error reporting
 */
export interface ErrorReportContext {
  userContext?: string;
  additionalInfo?: string;
  [key: string]: unknown;
}

/**
 * Error report data structure
 */
export interface ErrorReportData {
  error: Error;
  errorInfo?: unknown;
  context: ErrorReportContext & {
    timestamp: Date;
    errorType: string;
    attemptCount: number;
  };
}

/**
 * Recovery options available for different error types
 */
export interface RecoveryOptions {
  canRefresh: boolean;
  canRetry: boolean;
  canReset: boolean;
  canReport: boolean;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  resolvedState: string;
  conflicts: unknown[];
}

/**
 * State managed by the error recovery reducer
 */
export interface ErrorRecoveryState {
  error: Error | null;
  validationErrors: ValidationError[];
  isRetrying: boolean;
  attemptCount: number;
  maxAttempts: number;
  optimisticState: unknown;
  fallbackState: unknown;
  hasRolledBack: boolean;
  isCommitted: boolean;
  conflictResolution: ConflictResolution | null;
  errorReportId: string | null;
  preservedInput: unknown;
  restoredInput: unknown;
}

/**
 * Actions for the error recovery reducer
 */
export type ErrorRecoveryAction =
  | { type: 'SET_ERROR'; error: Error | null }
  | { type: 'SET_VALIDATION_ERRORS'; errors: ValidationError[] }
  | { type: 'START_RETRY'; maxAttempts: number }
  | { type: 'INCREMENT_ATTEMPT' }
  | { type: 'RETRY_SUCCESS' }
  | { type: 'RETRY_FAILED'; error: Error }
  | { type: 'SET_OPTIMISTIC_STATE'; state: unknown; fallbackState: unknown }
  | { type: 'ROLLBACK_OPTIMISTIC' }
  | { type: 'ROLLBACK_OPTIMISTIC_WITH_ERROR'; error: Error }
  | { type: 'COMMIT_OPTIMISTIC' }
  | { type: 'SET_CONFLICT_RESOLUTION'; resolution: ConflictResolution }
  | { type: 'SET_ERROR_REPORT_ID'; reportId: string }
  | { type: 'REFRESH_SUCCESS' }
  | { type: 'PRESERVE_INPUT'; input: unknown }
  | { type: 'RESTORE_INPUT' }
  | { type: 'RESET' };

/**
 * Error recovery hook return type
 */
export interface UseErrorRecoveryReturn {
  // Error state
  error: Error | null;
  errorType: string;
  userFriendlyMessage: string;

  // Validation errors
  validationErrors: ValidationError[];
  fieldErrors: Map<string, ValidationError[]>;

  // Retry state
  isRetrying: boolean;
  attemptCount: number;
  hasExceededMaxAttempts: boolean;
  canRetry: boolean;

  // Optimistic updates
  optimisticState: unknown;
  hasRolledBack: boolean;
  isCommitted: boolean;

  // Concurrency handling
  conflictResolution: ConflictResolution | null;

  // Error reporting
  errorReportId: string | null;

  // User input preservation
  preservedInput: unknown;
  hasPreservedInput: boolean;
  restoredInput: unknown;

  // Recovery options
  recoveryOptions: RecoveryOptions;

  // Methods
  executeWithRetry: (operation: () => Promise<unknown>, options?: RetryOptions) => Promise<void>;
  executeWithTimeout: (
    operation: () => Promise<unknown>,
    options?: TimeoutOptions
  ) => Promise<void>;
  executeWithConcurrencyHandling: (
    operation: () => Promise<unknown>,
    refreshState: () => Promise<unknown>
  ) => Promise<void>;
  executeWithConflictResolution: (
    operation: () => Promise<unknown>,
    resolveConflict: () => Promise<ConflictResolution>
  ) => Promise<void>;
  executeWithOptimisticUpdate: (operation: () => Promise<unknown>) => Promise<void>;

  setError: (error: Error) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setOptimisticState: (state: unknown, fallbackState: unknown) => void;

  retry: () => Promise<void>;
  refresh: (operation: () => Promise<unknown>) => Promise<void>;
  reset: () => void;

  reportError: (
    reportFunction: (data: ErrorReportData) => Promise<{ reportId: string }>,
    context?: ErrorReportContext
  ) => Promise<void>;

  preserveUserInput: (input: unknown) => void;
  restoreUserInput: () => void;

  hasFieldError: (fieldName: string) => boolean;
}

/**
 * Initial state for the error recovery reducer
 */
const initialErrorRecoveryState: ErrorRecoveryState = {
  error: null,
  validationErrors: [],
  isRetrying: false,
  attemptCount: 0,
  maxAttempts: 3,
  optimisticState: null,
  fallbackState: null,
  hasRolledBack: false,
  isCommitted: false,
  conflictResolution: null,
  errorReportId: null,
  preservedInput: null,
  restoredInput: null,
};

/**
 * Error recovery reducer function
 */
function errorRecoveryReducer(
  state: ErrorRecoveryState,
  action: ErrorRecoveryAction
): ErrorRecoveryState {
  switch (action.type) {
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        attemptCount: action.error ? state.attemptCount : 0,
        isRetrying: action.error ? state.isRetrying : false,
      };

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.errors,
      };

    case 'START_RETRY':
      return {
        ...state,
        isRetrying: true,
        attemptCount: 1,
        maxAttempts: action.maxAttempts,
        error: null,
      };

    case 'INCREMENT_ATTEMPT':
      return {
        ...state,
        attemptCount: state.attemptCount + 1,
      };

    case 'RETRY_SUCCESS':
      return {
        ...state,
        error: null,
        isRetrying: false,
      };

    case 'RETRY_FAILED':
      return {
        ...state,
        error: action.error,
        isRetrying: false,
      };

    case 'SET_OPTIMISTIC_STATE':
      return {
        ...state,
        optimisticState: action.state,
        fallbackState: action.fallbackState,
        hasRolledBack: false,
        isCommitted: false,
      };

    case 'ROLLBACK_OPTIMISTIC':
      return {
        ...state,
        optimisticState: state.fallbackState !== null ? state.fallbackState : state.optimisticState,
        hasRolledBack: true,
        isCommitted: false,
      };

    case 'ROLLBACK_OPTIMISTIC_WITH_ERROR':
      return {
        ...state,
        optimisticState: state.fallbackState !== null ? state.fallbackState : state.optimisticState,
        hasRolledBack: true,
        isCommitted: false,
        error: action.error,
      };

    case 'COMMIT_OPTIMISTIC':
      return {
        ...state,
        hasRolledBack: false,
        isCommitted: true,
        error: null,
      };

    case 'SET_CONFLICT_RESOLUTION':
      return {
        ...state,
        conflictResolution: action.resolution,
      };

    case 'SET_ERROR_REPORT_ID':
      return {
        ...state,
        errorReportId: action.reportId,
      };

    case 'REFRESH_SUCCESS':
      return {
        ...state,
        error: null,
        attemptCount: 0,
      };

    case 'PRESERVE_INPUT':
      return {
        ...state,
        preservedInput: action.input,
      };

    case 'RESTORE_INPUT':
      return {
        ...state,
        restoredInput: state.preservedInput,
      };

    case 'RESET':
      return {
        ...initialErrorRecoveryState,
      };

    default:
      return state;
  }
}

/**
 * Comprehensive error handling and recovery hook
 */
export const useErrorRecovery = (): UseErrorRecoveryReturn => {
  // Use reducer for atomic state management
  const [state, dispatch] = useReducer(errorRecoveryReducer, initialErrorRecoveryState);

  // Refs for operations
  const lastOperationRef = useRef<() => Promise<unknown>>();
  const retryOptionsRef = useRef<RetryOptions>();

  /**
   * Determine error type from error instance
   */
  const getErrorType = useCallback((err: Error): string => {
    if (err.name === 'TimeoutError') return 'timeout';
    if (err.name === 'NetworkError') return 'network';
    if (err.name === 'ConcurrencyError') return 'concurrency';
    if (err.name === 'VersionConflictError') return 'concurrency';
    if (err.name === 'ValidationError' || err.name.includes('ValidationError')) return 'validation';
    if (err.name === 'DomainError') return 'domain';
    return 'unknown';
  }, []);

  /**
   * Generate user-friendly error message
   */
  const getUserFriendlyMessage = useCallback(
    (err: Error): string => {
      const errorType = getErrorType(err);

      switch (errorType) {
        case 'timeout':
          return 'The operation took too long to complete. Please try again.';
        case 'network':
          if (err.message.includes('CONN_REFUSED') || err.message.includes('Connection refused')) {
            return 'Unable to connect to the server. Please check your internet connection.';
          }
          return 'Unable to connect to the server. Please check your internet connection.';
        case 'concurrency':
          return 'This game has been modified by another user. Please refresh the page to get the latest changes.';
        case 'validation':
          return `Validation error: ${err.message}. Please check your input and try again.`;
        case 'domain':
          if (err.message.includes('jersey number')) {
            return `${err.message}. Please contact your team administrator for assistance.`;
          }
          return `This action cannot be completed due to game rules. ${err.message}`;
        default:
          return `An unexpected error occurred: ${err.message}`;
      }
    },
    [getErrorType]
  );

  /**
   * Generate field-level error map
   */
  const fieldErrors = useState(() => new Map<string, ValidationError[]>())[0];

  useEffect(() => {
    fieldErrors.clear();
    state.validationErrors.forEach(error => {
      const field = error.validationContext.field || 'unknown';
      const existing = fieldErrors.get(field) || [];
      existing.push(error);
      fieldErrors.set(field, existing);
    });
  }, [state.validationErrors, fieldErrors]);

  /**
   * Get recovery options based on error type
   */
  const getRecoveryOptions = useCallback(
    (err: Error | null): RecoveryOptions => {
      if (!err) {
        return { canRefresh: false, canRetry: false, canReset: false, canReport: false };
      }

      const errorType = getErrorType(err);

      return {
        canRefresh: errorType === 'concurrency' || errorType === 'network',
        canRetry: errorType !== 'domain' && state.attemptCount < state.maxAttempts,
        canReset: true,
        canReport: true,
      };
    },
    [getErrorType, state.attemptCount, state.maxAttempts]
  );

  /**
   * Execute operation with retry logic and exponential backoff
   */
  const executeWithRetry = useCallback(
    async (operation: () => Promise<unknown>, options: RetryOptions = {}): Promise<void> => {
      const {
        maxAttempts: maxAttemptOptions = 3,
        backoffMultiplier = 2,
        initialDelay = 100,
      } = options;

      lastOperationRef.current = operation;
      retryOptionsRef.current = options;

      dispatch({ type: 'START_RETRY', maxAttempts: maxAttemptOptions });

      for (let currentAttempt = 1; currentAttempt <= maxAttemptOptions; currentAttempt++) {
        try {
          await operation();
          dispatch({ type: 'RETRY_SUCCESS' });
          return;
        } catch (error) {
          const errorInstance = error as Error;

          if (currentAttempt >= maxAttemptOptions) {
            dispatch({ type: 'RETRY_FAILED', error: errorInstance });
            throw error;
          }

          // Update attempt count in state to match local counter
          if (currentAttempt < maxAttemptOptions) {
            dispatch({ type: 'INCREMENT_ATTEMPT' });
          }

          // Exponential backoff delay - avoid fake timer issues
          const delay = initialDelay * Math.pow(backoffMultiplier, currentAttempt - 1);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    },
    []
  );

  /**
   * Execute operation with timeout
   */
  const executeWithTimeout = useCallback(
    async (operation: () => Promise<unknown>, options: TimeoutOptions = {}): Promise<void> => {
      const { timeout = 5000 } = options;

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error(`Operation timed out after ${timeout}ms`);
          timeoutError.name = 'TimeoutError';
          reject(timeoutError);
        }, timeout);
      });

      try {
        await Promise.race([operation(), timeoutPromise]);
        dispatch({ type: 'SET_ERROR', error: null });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: error as Error });
        throw error;
      }
    },
    []
  );

  /**
   * Execute operation with concurrency handling
   */
  const executeWithConcurrencyHandling = useCallback(
    async (
      operation: () => Promise<unknown>,
      refreshState: () => Promise<unknown>
    ): Promise<void> => {
      try {
        await operation();
        dispatch({ type: 'SET_ERROR', error: null });
      } catch (error) {
        const err = error as Error;
        if (err.name === 'ConcurrencyError') {
          await refreshState();
          await operation(); // Retry after refreshing state
          dispatch({ type: 'SET_ERROR', error: null });
        } else {
          dispatch({ type: 'SET_ERROR', error: err });
          throw error;
        }
      }
    },
    []
  );

  /**
   * Execute operation with conflict resolution
   */
  const executeWithConflictResolution = useCallback(
    async (
      operation: () => Promise<unknown>,
      resolveConflict: () => Promise<ConflictResolution>
    ): Promise<void> => {
      try {
        await operation();
        dispatch({ type: 'SET_ERROR', error: null });
      } catch (error) {
        const err = error as Error;
        if (err.name === 'VersionConflictError') {
          const resolution = await resolveConflict();
          dispatch({ type: 'SET_CONFLICT_RESOLUTION', resolution });
          await operation(); // Retry after conflict resolution
          dispatch({ type: 'SET_ERROR', error: null });
        } else {
          dispatch({ type: 'SET_ERROR', error: err });
          throw error;
        }
      }
    },
    []
  );

  /**
   * Execute operation with optimistic UI updates
   */
  const executeWithOptimisticUpdate = useCallback(
    async (operation: () => Promise<unknown>): Promise<void> => {
      try {
        await operation();
        dispatch({ type: 'COMMIT_OPTIMISTIC' });
      } catch (error) {
        // Rollback to fallback state with error in single atomic action
        dispatch({ type: 'ROLLBACK_OPTIMISTIC_WITH_ERROR', error: error as Error });
        throw error;
      }
    },
    []
  );

  /**
   * Set error manually
   */
  const setError = useCallback((err: Error) => {
    dispatch({ type: 'SET_ERROR', error: err });
  }, []);

  /**
   * Set validation errors
   */
  const setValidationErrors = useCallback((errors: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_ERRORS', errors });
  }, []);

  /**
   * Set optimistic state with fallback
   */
  const setOptimisticState = useCallback((optimisticState: unknown, fallback: unknown) => {
    dispatch({ type: 'SET_OPTIMISTIC_STATE', state: optimisticState, fallbackState: fallback });
  }, []);

  /**
   * Retry the last operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (lastOperationRef.current && retryOptionsRef.current) {
      await executeWithRetry(lastOperationRef.current, retryOptionsRef.current);
    }
  }, [executeWithRetry]);

  /**
   * Refresh with provided operation
   */
  const refresh = useCallback(async (operation: () => Promise<unknown>): Promise<void> => {
    await operation();
    dispatch({ type: 'REFRESH_SUCCESS' });
  }, []);

  /**
   * Reset all error state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    fieldErrors.clear();
  }, [fieldErrors]);

  /**
   * Report error with context
   */
  const reportError = useCallback(
    async (
      reportFunction: (data: ErrorReportData) => Promise<{ reportId: string }>,
      context: ErrorReportContext = {}
    ): Promise<void> => {
      if (!state.error) return;

      try {
        const reportData: ErrorReportData = {
          error: state.error,
          context: {
            ...context,
            timestamp: new Date(),
            errorType: getErrorType(state.error),
            attemptCount: state.attemptCount,
          },
        };

        const result = await reportFunction(reportData);
        dispatch({ type: 'SET_ERROR_REPORT_ID', reportId: result.reportId });
      } catch (reportError) {
        // Silently fail error reporting - don't cascade errors
        // eslint-disable-next-line no-console -- Error reporting fallback requires console for reliability
        console.warn('Failed to report error:', reportError);
      }
    },
    [state.error, getErrorType, state.attemptCount]
  );

  /**
   * Preserve user input
   */
  const preserveUserInput = useCallback((input: unknown) => {
    // Validate input before preserving
    if (input === null || input === undefined) {
      return; // Don't preserve null/undefined
    }

    // Ensure input is serializable
    try {
      JSON.stringify(input);
    } catch {
      // eslint-disable-next-line no-console -- Error recovery logging requires console for reliability
      console.warn('Cannot preserve non-serializable input');
      return;
    }

    dispatch({ type: 'PRESERVE_INPUT', input });
  }, []);

  /**
   * Restore user input
   */
  const restoreUserInput = useCallback(() => {
    dispatch({ type: 'RESTORE_INPUT' });
  }, []);

  /**
   * Check if field has error
   */
  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return fieldErrors.has(fieldName) && fieldErrors.get(fieldName)!.length > 0;
    },
    [fieldErrors]
  );

  return {
    // Error state
    error: state.error,
    errorType: state.error ? getErrorType(state.error) : '',
    userFriendlyMessage: state.error ? getUserFriendlyMessage(state.error) : '',

    // Validation errors
    validationErrors: state.validationErrors,
    fieldErrors,

    // Retry state
    isRetrying: state.isRetrying,
    attemptCount: state.attemptCount,
    hasExceededMaxAttempts: state.attemptCount >= state.maxAttempts,
    canRetry: state.error ? getRecoveryOptions(state.error).canRetry : false,

    // Optimistic updates
    optimisticState: state.optimisticState,
    hasRolledBack: state.hasRolledBack,
    isCommitted: state.isCommitted,

    // Concurrency handling
    conflictResolution: state.conflictResolution,

    // Error reporting
    errorReportId: state.errorReportId,

    // User input preservation
    preservedInput: state.preservedInput,
    hasPreservedInput: state.preservedInput !== null,
    restoredInput: state.restoredInput,

    // Recovery options
    recoveryOptions: getRecoveryOptions(state.error),

    // Methods
    executeWithRetry,
    executeWithTimeout,
    executeWithConcurrencyHandling,
    executeWithConflictResolution,
    executeWithOptimisticUpdate,

    setError,
    setValidationErrors,
    setOptimisticState,

    retry,
    refresh,
    reset,

    reportError,

    preserveUserInput,
    restoreUserInput,

    hasFieldError,
  };
};
