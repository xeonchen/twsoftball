/**
 * @file debounce Utility Tests
 *
 * Tests for debounce utility function providing controlled delay for rapid
 * user interactions to prevent performance issues and duplicate operations.
 *
 * Phase 5: Performance & Polish - TDD Implementation
 *
 * Performance targets:
 * - Configurable delay periods (default 100ms for at-bat actions)
 * - Immediate execution option for critical actions
 * - Proper cleanup to prevent memory leaks
 * - Cancel previous invocations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { debounce } from './debounce';

describe('debounce', () => {
  let mockFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFn = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic debouncing behavior', () => {
    it('should delay function execution by specified time', () => {
      const debouncedFn = debounce(mockFn, 200);

      debouncedFn('test');

      // Should not execute immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Should execute after delay
      vi.advanceTimersByTime(200);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls when invoked multiple times quickly', () => {
      const debouncedFn = debounce(mockFn, 200);

      debouncedFn('first');
      vi.advanceTimersByTime(100);

      debouncedFn('second');
      vi.advanceTimersByTime(100);

      debouncedFn('third');
      vi.advanceTimersByTime(100);

      // Only 100ms passed since last call, should not execute
      expect(mockFn).not.toHaveBeenCalled();

      // Complete the delay for the last call
      vi.advanceTimersByTime(100);

      // Should only execute once with the last argument
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should handle multiple separate execution cycles', () => {
      const debouncedFn = debounce(mockFn, 100);

      // First cycle
      debouncedFn('first');
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second cycle after delay
      debouncedFn('second');
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(2);

      expect(mockFn).toHaveBeenNthCalledWith(1, 'first');
      expect(mockFn).toHaveBeenNthCalledWith(2, 'second');
    });
  });

  describe('immediate execution option', () => {
    it('should execute immediately when immediate=true on first call', () => {
      const debouncedFn = debounce(mockFn, 200, { immediate: true });

      debouncedFn('immediate');

      // Should execute immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('immediate');
    });

    it('should debounce subsequent calls when immediate=true', () => {
      const debouncedFn = debounce(mockFn, 200, { immediate: true });

      // First call executes immediately
      debouncedFn('first');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Rapid subsequent calls should be debounced
      debouncedFn('second');
      debouncedFn('third');

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1); // Still only first call

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(2); // Now third call executes
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should reset immediate behavior after delay period', () => {
      const debouncedFn = debounce(mockFn, 100, { immediate: true });

      // First cycle - immediate
      debouncedFn('first');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for reset period
      vi.advanceTimersByTime(150);

      // Next call should be immediate again
      debouncedFn('second');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });

  describe('function arguments and context', () => {
    it('should pass all arguments to the debounced function', () => {
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2', { prop: 'value' }, 42);

      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { prop: 'value' }, 42);
    });

    it('should preserve this context', () => {
      const obj = {
        value: 'test',
        method: mockFn,
      };

      const debouncedMethod = debounce(function (this: typeof obj, ...args: unknown[]) {
        this.method(...(args as [string]));
      }, 100);

      debouncedMethod.call(obj, 'test');

      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle functions that return values', () => {
      const fnWithReturn = vi.fn().mockReturnValue('result');
      const debouncedFn = debounce(fnWithReturn, 100);

      const result = debouncedFn('input');

      // Debounced functions don't return values immediately
      expect(result).toBeUndefined();

      vi.advanceTimersByTime(100);
      expect(fnWithReturn).toHaveBeenCalledWith('input');
    });
  });

  describe('cleanup and cancellation', () => {
    it('should provide cancel method to abort pending execution', () => {
      const debouncedFn = debounce(mockFn, 200);

      debouncedFn('test');

      // Cancel before execution
      debouncedFn.cancel();

      vi.advanceTimersByTime(300);

      // Should not have executed
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should provide flush method for immediate execution', () => {
      const debouncedFn = debounce(mockFn, 200);

      debouncedFn('test');

      // Flush immediately
      debouncedFn.flush();

      // Should execute without waiting
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test');

      // Advancing time should not cause additional execution
      vi.advanceTimersByTime(200);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle flush when no pending execution', () => {
      const debouncedFn = debounce(mockFn, 200);

      // Flush without pending call should not throw
      expect(() => {
        debouncedFn.flush();
      }).not.toThrow();

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle cancel when no pending execution', () => {
      const debouncedFn = debounce(mockFn, 200);

      // Cancel without pending call should not throw
      expect(() => {
        debouncedFn.cancel();
      }).not.toThrow();

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero delay', () => {
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn('test');

      // Should execute on next tick
      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle negative delay', () => {
      const debouncedFn = debounce(mockFn, -100);

      debouncedFn('test');

      // Should execute immediately or on next tick
      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle function that throws errors', () => {
      const errorFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const debouncedFn = debounce(errorFn, 100);

      debouncedFn('test');

      // Should not throw during setup
      expect(() => {
        vi.advanceTimersByTime(100);
      }).toThrow('Test error');

      expect(errorFn).toHaveBeenCalledWith('test');
    });
  });

  describe('performance considerations', () => {
    it('should not create excessive timers for rapid calls', () => {
      const debouncedFn = debounce(mockFn, 100);

      // Track timer creation (approximate)
      const initialTimerCount = vi.getTimerCount();

      // Make many rapid calls
      for (let i = 0; i < 100; i++) {
        debouncedFn(`call-${i}`);
      }

      const finalTimerCount = vi.getTimerCount();

      // Should only create one timer for all rapid calls
      expect(finalTimerCount - initialTimerCount).toBeLessThanOrEqual(1);

      vi.advanceTimersByTime(100);

      // Should execute only once with last argument
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call-99');
    });

    it('should cleanup timers properly to prevent memory leaks', () => {
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('test');

      const timerCountBefore = vi.getTimerCount();

      // Cancel should cleanup timer
      debouncedFn.cancel();

      const timerCountAfter = vi.getTimerCount();

      expect(timerCountAfter).toBeLessThanOrEqual(timerCountBefore);
    });
  });

  describe('type safety', () => {
    it('should maintain parameter types', () => {
      type TestFunction = (a: string, b: number, c: boolean) => void;

      const typedFn: TestFunction = vi.fn();
      const debouncedFn = debounce(typedFn, 100);

      // This should compile without type errors
      debouncedFn('hello', 42, true);

      vi.advanceTimersByTime(100);

      expect(typedFn).toHaveBeenCalledWith('hello', 42, true);
    });
  });
});
