/**
 * @file useErrorRecovery Hook Tests
 *
 * Comprehensive tests for error handling and recovery functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { DomainError, ValidationError } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the application module to provide error classes
vi.mock('@twsoftball/application', async importOriginal => {
  const actual = await importOriginal();

  // Mock error classes for testing
  class DomainError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DomainError';
    }
  }

  class ValidationError extends Error {
    public readonly validationContext: {
      field?: string;
      value?: unknown;
    };

    constructor(
      message: string,
      errorType: string = 'ValidationError',
      field?: string,
      value?: unknown
    ) {
      super(message);
      this.name = errorType;
      this.validationContext = {
        ...(field !== undefined && { field }),
        ...(value !== undefined && { value }),
      };
    }
  }

  return {
    ...(actual as object),
    DomainError,
    ValidationError,
  };
});

import { useErrorRecovery } from './useErrorRecovery';

describe('useErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Error State Management', () => {
    it('should manage error state correctly', () => {
      const { result } = renderHook(() => useErrorRecovery());

      expect(result.current.error).toBeNull();
      expect(result.current.errorType).toBe('');

      const testError = new Error('Test error');
      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.errorType).toBe('unknown');
    });

    it('should detect domain errors correctly', () => {
      const { result } = renderHook(() => useErrorRecovery());

      const domainError = new DomainError('Cannot record at-bat for completed game');
      act(() => {
        result.current.setError(domainError);
      });

      expect(result.current.error).toBe(domainError);
      expect(result.current.errorType).toBe('domain');
      expect(result.current.userFriendlyMessage).toBe(
        'This action cannot be completed due to game rules. Cannot record at-bat for completed game'
      );
    });

    it('should detect validation errors correctly', () => {
      const { result } = renderHook(() => useErrorRecovery());

      const validationError = new ValidationError(
        'Invalid batter selection',
        'BatterValidationError',
        'batterId',
        'invalid-player-id'
      );

      act(() => {
        result.current.setError(validationError);
      });

      expect(result.current.error).toBe(validationError);
      expect(result.current.errorType).toBe('validation');
    });

    it('should reset error state properly', () => {
      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.setError(new Error('Test error'));
        result.current.setValidationErrors([
          new ValidationError('Test validation', 'ValidationError', 'field', 'value'),
        ]);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.validationErrors).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toHaveLength(0);
      expect(result.current.fieldErrors.size).toBe(0);
      expect(result.current.attemptCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('Validation Error Handling', () => {
    it('should provide field-level error information', () => {
      const errors = [
        new ValidationError('Required field', 'ValidationError', 'batterId', undefined),
        new ValidationError('Invalid format', 'ValidationError', 'batterId', 'invalid'),
        new ValidationError('Out of range', 'ValidationError', 'inning', 15),
      ];

      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.setValidationErrors(errors);
      });

      expect(result.current.fieldErrors.get('batterId')).toHaveLength(2);
      expect(result.current.fieldErrors.get('inning')).toHaveLength(1);
      expect(result.current.hasFieldError('batterId')).toBe(true);
      expect(result.current.hasFieldError('nonexistent')).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should handle successful retry operations', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useErrorRecovery());

      await act(async () => {
        await result.current.executeWithRetry(mockOperation, {
          maxAttempts: 2,
          initialDelay: 1, // Very short delay for testing
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeNull();
      expect(result.current.isRetrying).toBe(false);
    });

    it('should stop retrying after max attempts', async () => {
      const networkError = new Error('Persistent network error');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const { result } = renderHook(() => useErrorRecovery());

      let thrownError: unknown = null;
      await act(async () => {
        try {
          await result.current.executeWithRetry(mockOperation, {
            maxAttempts: 2,
            initialDelay: 1,
          });
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBe(networkError);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBe(networkError);
      expect(result.current.hasExceededMaxAttempts).toBe(true);
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('Concurrency Error Handling', () => {
    it('should handle concurrent game modifications', async () => {
      const concurrencyError = new Error('Game has been modified by another user');
      concurrencyError.name = 'ConcurrencyError';

      const mockRefreshState = vi.fn().mockResolvedValue({ gameVersion: 2 });
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(concurrencyError)
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useErrorRecovery());

      await result.current.executeWithConcurrencyHandling(mockOperation, mockRefreshState);

      expect(mockRefreshState).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeNull();
    });

    it('should handle version conflicts with automatic resolution', async () => {
      const versionError = new Error('Version conflict detected');
      versionError.name = 'VersionConflictError';

      const mockResolveConflict = vi.fn().mockResolvedValue({
        resolvedState: 'merged',
        conflicts: [],
      });
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(versionError)
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useErrorRecovery());

      await act(async () => {
        await result.current.executeWithConflictResolution(mockOperation, mockResolveConflict);
      });

      expect(mockResolveConflict).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.conflictResolution).toEqual({
        resolvedState: 'merged',
        conflicts: [],
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('Optimistic UI Updates', () => {
    it('should provide optimistic UI updates with rollback capability', async () => {
      const initialState = { score: { home: 5, away: 3 } };
      const optimisticState = { score: { home: 6, away: 3 } };

      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.setOptimisticState(optimisticState, initialState);
      });

      expect(result.current.optimisticState).toEqual(optimisticState);

      let thrownError: unknown = null;
      await act(async () => {
        try {
          await result.current.executeWithOptimisticUpdate(mockOperation);
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBeTruthy();
      expect(result.current.optimisticState).toEqual(initialState);
      expect(result.current.hasRolledBack).toBe(true);
    });

    it('should commit optimistic updates on success', async () => {
      const optimisticState = { score: { home: 6, away: 3 } };
      const successResult = { success: true, newState: optimisticState };

      const mockOperation = vi.fn().mockResolvedValue(successResult);

      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.setOptimisticState(optimisticState, { score: { home: 5, away: 3 } });
      });

      await act(async () => {
        await result.current.executeWithOptimisticUpdate(mockOperation);
      });

      expect(result.current.optimisticState).toEqual(optimisticState);
      expect(result.current.hasRolledBack).toBe(false);
      expect(result.current.isCommitted).toBe(true);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should provide comprehensive error recovery options', async () => {
      const { result } = renderHook(() => useErrorRecovery());

      const mockRefreshOperation = vi.fn().mockResolvedValue({ refreshed: true });

      // Create a network error which allows refresh
      const networkError = new Error('Test error');
      networkError.name = 'NetworkError';

      act(() => {
        result.current.setError(networkError);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.recoveryOptions).toEqual({
        canRefresh: true,
        canRetry: true,
        canReset: true,
        canReport: true,
      });

      await act(async () => {
        await result.current.refresh(mockRefreshOperation);
      });

      expect(mockRefreshOperation).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle error reporting functionality', async () => {
      const mockReportError = vi.fn().mockResolvedValue({ reportId: 'ERR-123' });
      const testError = new Error('Test error for reporting');

      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.setError(testError);
      });

      await act(async () => {
        await result.current.reportError(mockReportError, {
          userContext: 'Recording at-bat',
          additionalInfo: 'Phase 4 testing',
        });
      });

      expect(mockReportError).toHaveBeenCalledWith({
        error: testError,
        context: {
          userContext: 'Recording at-bat',
          additionalInfo: 'Phase 4 testing',
          timestamp: expect.any(Date),
          errorType: 'unknown',
          attemptCount: 0,
        },
      });
      expect(result.current.errorReportId).toBe('ERR-123');
    });
  });

  describe('User Input Preservation', () => {
    it('should preserve user input during error states', () => {
      const userInput = {
        batterId: 'player-1',
        result: 'SINGLE',
        runnerAdvances: [],
      };

      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.preserveUserInput(userInput);
        result.current.setError(new Error('Network error'));
      });

      expect(result.current.preservedInput).toEqual(userInput);
      expect(result.current.hasPreservedInput).toBe(true);

      act(() => {
        result.current.restoreUserInput();
      });

      expect(result.current.restoredInput).toEqual(userInput);
    });
  });

  describe('Timeout Handling', () => {
    it('should provide timeout recovery with user feedback', () => {
      const { result } = renderHook(() => useErrorRecovery());

      const timeoutError = new Error('Operation timed out after 5000ms');
      timeoutError.name = 'TimeoutError';

      act(() => {
        result.current.setError(timeoutError);
      });

      expect(result.current.errorType).toBe('timeout');
      expect(result.current.userFriendlyMessage).toContain('operation took too long');
      expect(result.current.recoveryOptions.canRetry).toBe(true);
    });
  });
});
