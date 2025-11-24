/**
 * @file useSyncStatus Hook Tests
 * Tests for the sync status tracking hook.
 */

import { renderHook, act } from '@testing-library/react';
import type { OfflineQueuePort } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useSyncStatus } from './useSyncStatus';

// Mock offline queue implementation
function createMockOfflineQueue(initialCount = 0): OfflineQueuePort & {
  _setCount: (count: number) => void;
} {
  let count = initialCount;

  return {
    _setCount: (newCount: number): void => {
      count = newCount;
    },
    enqueue: vi.fn().mockResolvedValue('test-id'),
    getPendingItems: vi.fn().mockResolvedValue([]),
    markSynced: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    getPendingCount: vi.fn().mockImplementation(() => Promise.resolve(count)),
    clear: vi.fn().mockResolvedValue(undefined),
    markSyncing: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('online/offline status', () => {
    it('should reflect initial online status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });

      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.isOnline).toBe(true);
    });

    it('should reflect initial offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.isOnline).toBe(false);
    });

    it('should update when going offline', () => {
      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update when coming online', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('pending count', () => {
    it('should start with 0 pending count', () => {
      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.pendingCount).toBe(0);
    });

    it('should fetch pending count from offline queue', async () => {
      const mockQueue = createMockOfflineQueue(5);

      const { result } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000 })
      );

      // Wait for initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.pendingCount).toBe(5);
      expect(mockQueue.getPendingCount).toHaveBeenCalled();
    });

    it('should poll for pending count updates', async () => {
      const mockQueue = createMockOfflineQueue(2);

      const { result } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000 })
      );

      // Initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockQueue.getPendingCount).toHaveBeenCalledTimes(1);

      // Update count
      mockQueue._setCount(5);

      // Advance to next poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockQueue.getPendingCount).toHaveBeenCalledTimes(2);
      expect(result.current.pendingCount).toBe(5);
    });

    it('should not poll when autoPoll is false', async () => {
      const mockQueue = createMockOfflineQueue(3);

      renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000, autoPoll: false })
      );

      // Advance time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should not have been called since autoPoll is false
      expect(mockQueue.getPendingCount).not.toHaveBeenCalled();
    });

    it('should allow manual refresh of pending count', async () => {
      const mockQueue = createMockOfflineQueue(1);

      const { result } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, autoPoll: false })
      );

      expect(result.current.pendingCount).toBe(0);

      // Manual refresh
      mockQueue._setCount(10);
      await act(async () => {
        await result.current.refreshPendingCount();
      });

      expect(result.current.pendingCount).toBe(10);
    });
  });

  describe('syncing state', () => {
    it('should start with isSyncing false', () => {
      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.isSyncing).toBe(false);
    });

    it('should allow setting syncing state', () => {
      const { result } = renderHook(() => useSyncStatus());

      act(() => {
        result.current.setSyncing(true);
      });

      expect(result.current.isSyncing).toBe(true);

      act(() => {
        result.current.setSyncing(false);
      });

      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle errors from getPendingCount', async () => {
      const mockQueue = createMockOfflineQueue(0);
      const testError = new Error('Queue error');
      vi.mocked(mockQueue.getPendingCount).mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000 })
      );

      // Wait for initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should clear error on successful refresh', async () => {
      const mockQueue = createMockOfflineQueue(5);
      const testError = new Error('Queue error');

      // First call fails
      vi.mocked(mockQueue.getPendingCount).mockRejectedValueOnce(testError);

      const { result } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000 })
      );

      // Wait for initial fetch (fails)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.error).toEqual(testError);

      // Next call succeeds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.pendingCount).toBe(5);
    });
  });

  describe('cleanup', () => {
    it('should cleanup interval on unmount', async () => {
      const mockQueue = createMockOfflineQueue(0);

      const { unmount } = renderHook(() =>
        useSyncStatus({ offlineQueue: mockQueue, pollInterval: 1000 })
      );

      // Initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const callCountBeforeUnmount = vi.mocked(mockQueue.getPendingCount).mock.calls.length;

      unmount();

      // Advance time after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should not have been called after unmount
      expect(vi.mocked(mockQueue.getPendingCount).mock.calls.length).toBe(callCountBeforeUnmount);
    });

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useSyncStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('refresh on online', () => {
    it('should refresh pending count when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      const mockQueue = createMockOfflineQueue(3);

      renderHook(() => useSyncStatus({ offlineQueue: mockQueue, autoPoll: false }));

      // Initially offline, no fetch
      expect(mockQueue.getPendingCount).not.toHaveBeenCalled();

      // Come online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
        // Wait for the effect to run
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockQueue.getPendingCount).toHaveBeenCalled();
    });
  });
});
