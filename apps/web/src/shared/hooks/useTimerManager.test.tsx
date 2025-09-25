import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { timerManager } from '../../timer-manager';

import { useTimerManager } from './useTimerManager';

describe('useTimerManager', () => {
  let mockSetTimeout: ReturnType<typeof vi.spyOn>;
  let mockClearTimeout: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();

    // Spy on timerManager methods
    mockSetTimeout = vi.spyOn(timerManager, 'setTimeout');
    mockClearTimeout = vi.spyOn(timerManager, 'clearTimeout');

    // Ensure clean state
    timerManager.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    timerManager.clearAllTimers();
  });

  describe('Component Timer Management', () => {
    it('should create timer manager with component-specific cleanup', () => {
      const { result } = renderHook(() => useTimerManager());

      expect(result.current).toHaveProperty('setTimeout');
      expect(result.current).toHaveProperty('clearTimeout');
      expect(result.current).toHaveProperty('clearAllTimers');

      expect(typeof result.current.setTimeout).toBe('function');
      expect(typeof result.current.clearTimeout).toBe('function');
      expect(typeof result.current.clearAllTimers).toBe('function');
    });

    it('should delegate setTimeout to global timer manager', () => {
      const { result } = renderHook(() => useTimerManager());
      const callback = vi.fn();

      mockSetTimeout.mockReturnValue(123);

      const timerId = result.current.setTimeout(callback, 1000);

      expect(mockSetTimeout).toHaveBeenCalledWith(callback, 1000);
      expect(timerId).toBe(123);
    });

    it('should delegate clearTimeout to global timer manager', () => {
      const { result } = renderHook(() => useTimerManager());

      result.current.clearTimeout(456);

      expect(mockClearTimeout).toHaveBeenCalledWith(456);
    });

    it('should track component timers internally', () => {
      const { result } = renderHook(() => useTimerManager());

      // Mock return values for timer IDs
      mockSetTimeout.mockReturnValueOnce(101).mockReturnValueOnce(102).mockReturnValueOnce(103);

      // Create multiple timers
      result.current.setTimeout(vi.fn(), 1000);
      result.current.setTimeout(vi.fn(), 2000);
      result.current.setTimeout(vi.fn(), 3000);

      expect(mockSetTimeout).toHaveBeenCalledTimes(3);

      // Clear specific timer
      act(() => {
        result.current.clearTimeout(102);
      });

      expect(mockClearTimeout).toHaveBeenCalledWith(102);
    });

    it('should clean up all component timers on unmount', () => {
      const { result, unmount } = renderHook(() => useTimerManager());

      // Mock return values for timer IDs
      mockSetTimeout.mockReturnValueOnce(201).mockReturnValueOnce(202).mockReturnValueOnce(203);

      // Create multiple timers
      result.current.setTimeout(vi.fn(), 1000);
      result.current.setTimeout(vi.fn(), 2000);
      result.current.setTimeout(vi.fn(), 3000);

      // Clear one timer manually
      act(() => {
        result.current.clearTimeout(202);
      });

      expect(mockClearTimeout).toHaveBeenCalledWith(202);
      expect(mockClearTimeout).toHaveBeenCalledTimes(1);

      // Unmount component - should cleanup remaining timers
      unmount();

      // Should have cleared remaining timers (201 and 203)
      expect(mockClearTimeout).toHaveBeenCalledWith(201);
      expect(mockClearTimeout).toHaveBeenCalledWith(203);
      expect(mockClearTimeout).toHaveBeenCalledTimes(3); // 202 + 201 + 203
    });

    it('should handle clearAllTimers method', () => {
      const { result } = renderHook(() => useTimerManager());

      // Mock return values
      mockSetTimeout.mockReturnValueOnce(301).mockReturnValueOnce(302);

      // Create timers
      result.current.setTimeout(vi.fn(), 1000);
      result.current.setTimeout(vi.fn(), 2000);

      // Clear all timers manually
      act(() => {
        result.current.clearAllTimers();
      });

      expect(mockClearTimeout).toHaveBeenCalledWith(301);
      expect(mockClearTimeout).toHaveBeenCalledWith(302);
      expect(mockClearTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple hook instances independently', () => {
      const { result: result1 } = renderHook(() => useTimerManager());
      const { result: result2, unmount: unmount2 } = renderHook(() => useTimerManager());

      mockSetTimeout
        .mockReturnValueOnce(401) // result1 first timer
        .mockReturnValueOnce(402) // result2 first timer
        .mockReturnValueOnce(403); // result1 second timer

      // Create timers on different hook instances
      result1.current.setTimeout(vi.fn(), 1000);
      result2.current.setTimeout(vi.fn(), 2000);
      result1.current.setTimeout(vi.fn(), 3000);

      expect(mockSetTimeout).toHaveBeenCalledTimes(3);

      // Unmount one instance
      unmount2();

      // Only result2's timer (402) should be cleared
      expect(mockClearTimeout).toHaveBeenCalledWith(402);
      expect(mockClearTimeout).toHaveBeenCalledTimes(1);

      // result1's timers should not be affected yet
      expect(mockClearTimeout).not.toHaveBeenCalledWith(401);
      expect(mockClearTimeout).not.toHaveBeenCalledWith(403);
    });
  });

  describe('Integration with Global Timer Manager', () => {
    it('should integrate with global timer cleanup events', () => {
      const { result } = renderHook(() => useTimerManager());

      // Create a timer through the hook
      const callback = vi.fn();
      mockSetTimeout.mockReturnValue(500);

      result.current.setTimeout(callback, 2000);

      expect(mockSetTimeout).toHaveBeenCalledWith(callback, 2000);

      // Verify the timer was registered in the global manager
      // (This would be tested through integration with actual timer-manager functionality)
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
    });
  });
});
