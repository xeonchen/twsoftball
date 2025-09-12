/**
 * @file EventStoreErrorHandler Tests
 * Comprehensive test suite for the EventStoreErrorHandler utility class.
 *
 * @remarks
 * This test suite validates all error handling functionality including:
 * - Error categorization and wrapping
 * - Specific error type handlers (connection, transaction, concurrency, etc.)
 * - Safe operation execution with error handling
 * - Retry logic and error classification
 * - Edge cases and boundary conditions
 *
 * Tests are organized by functionality and cover both happy paths and error scenarios
 * to ensure robust error handling across all EventStore implementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  EventStoreErrorHandler,
  EventStoreError,
  EventStoreErrorType,
} from './EventStoreErrorHandler';

describe('EventStoreErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EventStoreError Class', () => {
    it('should create error with all properties', () => {
      const originalError = new Error('Original message');
      const context = { key: 'value' };
      const error = new EventStoreError(
        'Test message',
        EventStoreErrorType.CONNECTION_ERROR,
        originalError,
        context
      );

      expect(error.name).toBe('EventStoreError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });

    it('should create error without optional parameters', () => {
      const error = new EventStoreError('Test message', EventStoreErrorType.UNKNOWN_ERROR);

      expect(error.name).toBe('EventStoreError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });

  describe('Error Categorization', () => {
    describe('Concurrency Conflicts (Priority 1)', () => {
      it('should categorize concurrency errors from message', () => {
        const error = new Error('Concurrency conflict detected');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
      });

      it('should categorize version conflict errors', () => {
        const error = new Error('Version mismatch occurred');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
      });

      it('should categorize conflict errors', () => {
        const error = new Error('Data conflict detected');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
      });

      it('should categorize constraint errors (non-validation)', () => {
        const error = new Error('Constraint violation occurred');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
      });

      it('should categorize constraint errors by name', () => {
        const error = new Error('Database error');
        error.name = 'ConstraintError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
      });
    });

    describe('Validation Errors (Priority 2)', () => {
      it('should categorize validation errors from message', () => {
        const error = new Error('Validation failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.VALIDATION_ERROR);
      });

      it('should categorize invalid input errors (non-transaction)', () => {
        const error = new Error('Invalid data provided');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.VALIDATION_ERROR);
      });

      it('should categorize required field errors', () => {
        const error = new Error('Required field missing');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.VALIDATION_ERROR);
      });

      it('should categorize validation errors by name', () => {
        const error = new Error('Input error');
        error.name = 'ValidationError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.VALIDATION_ERROR);
      });

      it('should prioritize validation over transaction for validation constraint', () => {
        const error = new Error('Validation constraint violated');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.VALIDATION_ERROR);
      });
    });

    describe('Serialization Errors (Priority 3)', () => {
      it('should categorize JSON errors', () => {
        const error = new Error('JSON parse error');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
      });

      it('should categorize parse errors', () => {
        const error = new Error('Parse failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
      });

      it('should categorize serialize errors', () => {
        const error = new Error('Serialize operation failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
      });

      it('should categorize stringify errors', () => {
        const error = new Error('Stringify failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
      });

      it('should categorize syntax errors by name', () => {
        const error = new Error('Malformed data');
        error.name = 'SyntaxError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
      });
    });

    describe('Storage Quota Errors (Priority 4)', () => {
      it('should categorize quota exceeded errors', () => {
        const error = new Error('Quota exceeded');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
      });

      it('should categorize storage errors (non-transaction)', () => {
        const error = new Error('Storage full');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
      });

      it('should categorize disk space errors', () => {
        const error = new Error('Disk space insufficient');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
      });

      it('should categorize space errors', () => {
        const error = new Error('Not enough space');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
      });

      it('should categorize quota errors by name', () => {
        const error = new Error('Storage error');
        error.name = 'QuotaExceededError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
      });

      it('should prioritize transaction over storage when both keywords present', () => {
        // When both "storage" and "transaction" are present, transaction takes priority (higher precedence)
        const error = new Error('Storage transaction failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });
    });

    describe('Transaction Errors (Priority 5)', () => {
      it('should categorize transaction errors', () => {
        const error = new Error('Transaction failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });

      it('should categorize inactive transaction errors', () => {
        const error = new Error('Transaction inactive');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });

      it('should categorize aborted transaction errors', () => {
        const error = new Error('Transaction aborted');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });

      it('should categorize transaction errors by name', () => {
        const error = new Error('Database error');
        error.name = 'TransactionInactiveError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });

      it('should categorize abort errors by name', () => {
        const error = new Error('Operation failed');
        error.name = 'AbortError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });

      it('should prioritize transaction over invalid for invalid transaction', () => {
        const error = new Error('Invalid transaction state');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      });
    });

    describe('Connection Errors (Priority 6)', () => {
      it('should categorize connection errors', () => {
        const error = new Error('Connection failed');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });

      it('should categorize network errors', () => {
        const error = new Error('Network unavailable');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });

      it('should categorize offline errors', () => {
        const error = new Error('System offline');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });

      it('should categorize network errors by name', () => {
        const error = new Error('Request failed');
        error.name = 'NetworkError';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });
    });

    describe('Unknown Errors (Priority 7 - Fallback)', () => {
      it('should categorize unrecognized errors as unknown', () => {
        const error = new Error('Some random error message');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
      });

      it('should categorize empty message errors as unknown', () => {
        const error = new Error('');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
      });
    });

    describe('Case Insensitivity', () => {
      it('should handle uppercase error messages', () => {
        const error = new Error('CONNECTION FAILED');
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });

      it('should handle mixed case error names', () => {
        const error = new Error('Error occurred');
        error.name = 'NetworkERROR';
        const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
        expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      });
    });
  });

  describe('wrapError', () => {
    it('should wrap Error objects correctly', () => {
      const originalError = new Error('Original message');
      const context = { operation: 'test' };
      const wrapped = EventStoreErrorHandler.wrapError(originalError, 'save', context);

      expect(wrapped).toBeInstanceOf(EventStoreError);
      expect(wrapped.message).toContain('EventStore save failed');
      expect(wrapped.message).toContain('Original message');
      expect(wrapped.originalError).toBe(originalError);
      expect(wrapped.context).toBe(context);
    });

    it('should wrap non-Error values as Error objects', () => {
      const wrapped = EventStoreErrorHandler.wrapError('string error', 'load');

      expect(wrapped).toBeInstanceOf(EventStoreError);
      expect(wrapped.originalError).toBeInstanceOf(Error);
      expect(wrapped.originalError?.message).toBe('string error');
    });

    it('should wrap null/undefined values', () => {
      const wrappedNull = EventStoreErrorHandler.wrapError(null, 'test');
      const wrappedUndefined = EventStoreErrorHandler.wrapError(undefined, 'test');

      expect(wrappedNull.originalError?.message).toBe('null');
      expect(wrappedUndefined.originalError?.message).toBe('undefined');
    });

    it('should wrap objects as Error objects', () => {
      const errorObj = { code: 500, message: 'Server error' };
      const wrapped = EventStoreErrorHandler.wrapError(errorObj, 'fetch');

      expect(wrapped.originalError?.message).toBe('[object Object]');
    });
  });

  describe('Specific Error Handlers', () => {
    describe('handleConnectionError', () => {
      it('should throw CONNECTION_ERROR with correct message', () => {
        const originalError = new Error('Network timeout');
        const context = { host: 'localhost' };

        expect(() => {
          EventStoreErrorHandler.handleConnectionError(originalError, 'connect', context);
        }).toThrow(EventStoreError);

        try {
          EventStoreErrorHandler.handleConnectionError(originalError, 'connect', context);
        } catch (error) {
          const eventStoreError = error as EventStoreError;
          expect(eventStoreError.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
          expect(eventStoreError.message).toBe(
            'EventStore connect failed due to connection error: Network timeout'
          );
          expect(eventStoreError.originalError).toBe(originalError);
          expect(eventStoreError.context).toBe(context);
        }
      });

      it('should handle non-Error values', () => {
        expect(() => {
          EventStoreErrorHandler.handleConnectionError('connection failed', 'connect');
        }).toThrow(EventStoreError);
      });
    });

    describe('handleTransactionError', () => {
      it('should throw TRANSACTION_ERROR with correct message', () => {
        const originalError = new Error('Transaction rolled back');
        const context = { transactionId: '123' };

        expect(() => {
          EventStoreErrorHandler.handleTransactionError(originalError, 'commit', context);
        }).toThrow(EventStoreError);

        try {
          EventStoreErrorHandler.handleTransactionError(originalError, 'commit', context);
        } catch (error) {
          const eventStoreError = error as EventStoreError;
          expect(eventStoreError.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
          expect(eventStoreError.message).toBe(
            'EventStore commit failed due to transaction error: Transaction rolled back'
          );
          expect(eventStoreError.originalError).toBe(originalError);
          expect(eventStoreError.context).toBe(context);
        }
      });
    });

    describe('handleConcurrencyConflict', () => {
      it('should throw CONCURRENCY_CONFLICT with version information', () => {
        const context = { userId: 'user123' };

        expect(() => {
          EventStoreErrorHandler.handleConcurrencyConflict(5, 7, 'stream-123', context);
        }).toThrow(EventStoreError);

        try {
          EventStoreErrorHandler.handleConcurrencyConflict(5, 7, 'stream-123', context);
        } catch (error) {
          const eventStoreError = error as EventStoreError;
          expect(eventStoreError.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
          expect(eventStoreError.message).toBe(
            'Concurrency conflict on stream stream-123: expected version 5, actual version 7'
          );
          expect(eventStoreError.originalError).toBeUndefined();
          expect(eventStoreError.context).toEqual({
            expectedVersion: 5,
            actualVersion: 7,
            streamId: 'stream-123',
            userId: 'user123',
          });
        }
      });

      it('should handle zero versions', () => {
        expect(() => {
          EventStoreErrorHandler.handleConcurrencyConflict(0, 1, 'new-stream');
        }).toThrow(EventStoreError);
      });
    });

    describe('handleSerializationError', () => {
      it('should throw SERIALIZATION_ERROR with event data', () => {
        const originalError = new Error('JSON.stringify failed');
        const eventData = { type: 'GameCreated', invalidProperty: undefined };
        const context = { operation: 'append' };

        expect(() => {
          EventStoreErrorHandler.handleSerializationError(originalError, eventData, context);
        }).toThrow(EventStoreError);

        try {
          EventStoreErrorHandler.handleSerializationError(originalError, eventData, context);
        } catch (error) {
          const eventStoreError = error as EventStoreError;
          expect(eventStoreError.type).toBe(EventStoreErrorType.SERIALIZATION_ERROR);
          expect(eventStoreError.message).toBe(
            'EventStore serialization failed due to serialization error: JSON.stringify failed'
          );
          expect(eventStoreError.originalError).toBe(originalError);
          expect(eventStoreError.context).toEqual({
            eventData,
            operation: 'append',
          });
        }
      });
    });

    describe('handleQuotaExceededError', () => {
      it('should throw STORAGE_QUOTA_EXCEEDED with correct message', () => {
        const originalError = new Error('QuotaExceededError: Storage quota exceeded');
        const context = { storageUsed: '95%' };

        expect(() => {
          EventStoreErrorHandler.handleQuotaExceededError(originalError, 'append', context);
        }).toThrow(EventStoreError);

        try {
          EventStoreErrorHandler.handleQuotaExceededError(originalError, 'append', context);
        } catch (error) {
          const eventStoreError = error as EventStoreError;
          expect(eventStoreError.type).toBe(EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
          expect(eventStoreError.message).toBe(
            'EventStore append failed due to storage quota exceeded: QuotaExceededError: Storage quota exceeded'
          );
          expect(eventStoreError.originalError).toBe(originalError);
          expect(eventStoreError.context).toBe(context);
        }
      });
    });
  });

  describe('safeExecute', () => {
    it('should execute operation successfully and return result', async () => {
      const operation = vi.fn().mockResolvedValue('success result');
      const result = await EventStoreErrorHandler.safeExecute(operation, 'test-operation');

      expect(result).toBe('success result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should wrap errors thrown by operation', async () => {
      const originalError = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(originalError);
      const context = { key: 'value' };

      await expect(
        EventStoreErrorHandler.safeExecute(operation, 'test-operation', context)
      ).rejects.toThrow(EventStoreError);

      try {
        await EventStoreErrorHandler.safeExecute(operation, 'test-operation', context);
      } catch (error) {
        const eventStoreError = error as EventStoreError;
        expect(eventStoreError.originalError).toBe(originalError);
        expect(eventStoreError.context).toBe(context);
      }
    });

    it('should handle operation that throws non-Error values', async () => {
      const operation = vi.fn().mockRejectedValue('string error');

      await expect(EventStoreErrorHandler.safeExecute(operation, 'test-operation')).rejects.toThrow(
        EventStoreError
      );
    });

    it('should handle synchronous errors in operation', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(EventStoreErrorHandler.safeExecute(operation, 'test-operation')).rejects.toThrow(
        EventStoreError
      );
    });
  });

  describe('Error Classification Methods', () => {
    describe('isRetryableError', () => {
      it('should identify CONNECTION_ERROR as retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(true);
      });

      it('should identify TRANSACTION_ERROR as retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.TRANSACTION_ERROR);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(true);
      });

      it('should identify CONCURRENCY_CONFLICT as non-retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.CONCURRENCY_CONFLICT);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(false);
      });

      it('should identify SERIALIZATION_ERROR as non-retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.SERIALIZATION_ERROR);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(false);
      });

      it('should identify VALIDATION_ERROR as non-retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.VALIDATION_ERROR);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(false);
      });

      it('should identify STORAGE_QUOTA_EXCEEDED as non-retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.STORAGE_QUOTA_EXCEEDED);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(false);
      });

      it('should identify UNKNOWN_ERROR as non-retryable', () => {
        const error = new EventStoreError('test', EventStoreErrorType.UNKNOWN_ERROR);
        expect(EventStoreErrorHandler.isRetryableError(error)).toBe(false);
      });
    });

    describe('isConcurrencyConflict', () => {
      it('should identify CONCURRENCY_CONFLICT correctly', () => {
        const error = new EventStoreError('test', EventStoreErrorType.CONCURRENCY_CONFLICT);
        expect(EventStoreErrorHandler.isConcurrencyConflict(error)).toBe(true);
      });

      it('should not identify other error types as concurrency conflict', () => {
        const errorTypes = [
          EventStoreErrorType.CONNECTION_ERROR,
          EventStoreErrorType.TRANSACTION_ERROR,
          EventStoreErrorType.SERIALIZATION_ERROR,
          EventStoreErrorType.VALIDATION_ERROR,
          EventStoreErrorType.STORAGE_QUOTA_EXCEEDED,
          EventStoreErrorType.UNKNOWN_ERROR,
        ];

        for (const errorType of errorTypes) {
          const error = new EventStoreError('test', errorType);
          expect(EventStoreErrorHandler.isConcurrencyConflict(error)).toBe(false);
        }
      });
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff for attempt 0', () => {
      const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
      const delay = EventStoreErrorHandler.getRetryDelay(error, 0);

      // Base delay is 1000ms, attempt 0: 1000 * 2^0 = 1000ms + jitter
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1100); // 1000 + 10% jitter
    });

    it('should calculate exponential backoff for attempt 1', () => {
      const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
      const delay = EventStoreErrorHandler.getRetryDelay(error, 1);

      // Base delay is 1000ms, attempt 1: 1000 * 2^1 = 2000ms + jitter
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2200); // 2000 + 10% jitter
    });

    it('should respect maximum delay cap', () => {
      const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
      const delay = EventStoreErrorHandler.getRetryDelay(error, 10); // Large attempt number

      // Should be capped at 30000ms + jitter
      expect(delay).toBeGreaterThanOrEqual(30000);
      expect(delay).toBeLessThanOrEqual(33000); // 30000 + 10% jitter
    });

    it('should handle attempt 2', () => {
      const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
      const delay = EventStoreErrorHandler.getRetryDelay(error, 2);

      // Base delay is 1000ms, attempt 2: 1000 * 2^2 = 4000ms + jitter
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(4400); // 4000 + 10% jitter
    });

    it('should add different jitter on multiple calls', () => {
      const error = new EventStoreError('test', EventStoreErrorType.CONNECTION_ERROR);
      const delay1 = EventStoreErrorHandler.getRetryDelay(error, 0);
      const delay2 = EventStoreErrorHandler.getRetryDelay(error, 0);

      // With random jitter, delays should be different (very high probability)
      // This test may occasionally fail due to randomness, but it's highly unlikely
      expect(delay1).not.toBe(delay2);
    });

    it('should work with any error type (error parameter reserved for future use)', () => {
      const errorTypes = [
        EventStoreErrorType.CONNECTION_ERROR,
        EventStoreErrorType.TRANSACTION_ERROR,
        EventStoreErrorType.CONCURRENCY_CONFLICT,
        EventStoreErrorType.SERIALIZATION_ERROR,
        EventStoreErrorType.VALIDATION_ERROR,
        EventStoreErrorType.STORAGE_QUOTA_EXCEEDED,
        EventStoreErrorType.UNKNOWN_ERROR,
      ];

      for (const errorType of errorTypes) {
        const error = new EventStoreError('test', errorType);
        const delay = EventStoreErrorHandler.getRetryDelay(error, 0);
        expect(delay).toBeGreaterThanOrEqual(1000);
        expect(delay).toBeLessThanOrEqual(1100);
      }
    });
  });

  describe('Error Message Creation', () => {
    it('should create well-formatted error messages', () => {
      const error = new Error('Original error message');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'save');

      expect(wrapped.message).toContain('EventStore save failed');
      expect(wrapped.message).toContain('Original error message');
    });

    it('should format CONNECTION_ERROR messages correctly', () => {
      const error = new Error('Connection timeout');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'connect');

      // This will be categorized as CONNECTION_ERROR due to "connection" keyword
      expect(wrapped.type).toBe(EventStoreErrorType.CONNECTION_ERROR);
      expect(wrapped.message).toBe(
        'EventStore connect failed due to connection error: Connection timeout'
      );
    });

    it('should format TRANSACTION_ERROR messages correctly', () => {
      const error = new Error('Transaction rolled back');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'save');

      expect(wrapped.type).toBe(EventStoreErrorType.TRANSACTION_ERROR);
      expect(wrapped.message).toBe(
        'EventStore save failed due to transaction error: Transaction rolled back'
      );
    });

    it('should format UNKNOWN_ERROR messages correctly', () => {
      const error = new Error('Mysterious failure');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'save');

      expect(wrapped.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
      expect(wrapped.message).toBe('EventStore save failed: Mysterious failure');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle errors with empty messages', () => {
      const error = new Error('');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test');

      expect(wrapped).toBeInstanceOf(EventStoreError);
      expect(wrapped.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
    });

    it('should handle errors with only whitespace messages', () => {
      const error = new Error('   \n\t   ');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test');

      expect(wrapped).toBeInstanceOf(EventStoreError);
      expect(wrapped.type).toBe(EventStoreErrorType.UNKNOWN_ERROR);
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new Error(longMessage);
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test');

      expect(wrapped.originalError?.message).toBe(longMessage);
    });

    it('should handle errors with special characters in messages', () => {
      const specialMessage = 'Error with unicode: 🔥 and symbols: @#$%^&*()';
      const error = new Error(specialMessage);
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test');

      expect(wrapped.originalError?.message).toBe(specialMessage);
    });

    it('should handle circular object references in context', () => {
      const circularObj: { prop?: unknown } = {};
      circularObj.prop = circularObj;

      const error = new Error('test');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test', circularObj);

      expect(wrapped.context).toBe(circularObj);
    });

    it('should handle multiple keyword matches (priority order)', () => {
      // This should be categorized as CONCURRENCY_CONFLICT (priority 1) even though it contains "transaction" (priority 5)
      const error = new Error('Concurrency conflict in transaction');
      const wrapped = EventStoreErrorHandler.wrapError(error, 'test');
      expect(wrapped.type).toBe(EventStoreErrorType.CONCURRENCY_CONFLICT);
    });
  });
});
