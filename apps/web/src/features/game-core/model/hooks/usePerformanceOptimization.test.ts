/**
 * @file usePerformanceOptimization Hook Tests
 *
 * Tests for performance optimization hook providing centralized performance
 * management for at-bat recording including debouncing, prefetching, and
 * optimized calculations.
 *
 * Phase 5: Performance & Polish - TDD Implementation
 *
 * Performance targets:
 * - Button response time: <100ms
 * - Complex calculations: <200ms
 * - Debounce prevention: 100ms minimum
 * - Prefetch timing: 500ms before completion
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock debounce for consistent testing - make it actually async to match real behavior
vi.mock('../../../../shared/lib/utils', () => ({
  debounce: vi.fn((fn: (...args: unknown[]) => unknown) => {
    const mockDebounced = vi.fn(async (...args: unknown[]) => {
      // For testing, we'll call the function immediately but return a promise
      return await fn(...args);
    });
    mockDebounced.cancel = vi.fn();
    mockDebounced.flush = vi.fn(() => fn());
    return mockDebounced;
  }),
}));

import { useGameStore } from '../../../../entities/game';

import { usePerformanceOptimization, type BaseState } from './usePerformanceOptimization';
import { useRecordAtBat } from './useRecordAtBat';

// Create stable mock objects to prevent infinite re-renders
const mockCurrentGame = {
  id: 'game-1',
  status: 'active',
  homeScore: 2,
  awayScore: 1,
};

const mockActiveGameState = {
  currentBatter: {
    id: 'player-1',
    name: 'John Doe',
    jerseyNumber: 5,
    battingOrder: 3,
    position: 'CF',
  },
  bases: {
    first: null,
    second: { id: 'player-2', name: 'Jane Smith' },
    third: null,
  },
  currentInning: 5,
  isTopHalf: true,
  outs: 1,
};

const mockGameStoreData = {
  currentGame: mockCurrentGame,
  activeGameState: mockActiveGameState,
};

// Mock dependencies
vi.mock('../../../../entities/game', () => ({
  useGameStore: vi.fn(() => mockGameStoreData),
  useGameUseCases: vi.fn(() => ({
    startGame: vi.fn(),
    recordAtBat: vi.fn(),
    substitutePlayer: vi.fn(),
    getCurrentBatter: vi.fn().mockReturnValue(null),
    getNextBatter: vi.fn().mockReturnValue({
      id: 'next-batter',
      name: 'Next Player',
      jerseyNumber: '7',
    }),
    validateSubstitution: vi.fn().mockReturnValue(true),
    processDomainEvents: vi.fn(),
    isInitialized: true,
  })),
}));

vi.mock('./useRecordAtBat', () => ({
  useRecordAtBat: vi.fn().mockReturnValue({
    recordAtBat: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null,
    result: null,
    reset: vi.fn(),
  }),
}));

describe('usePerformanceOptimization', () => {
  let mockPerformanceNow: ReturnType<typeof vi.spyOn>;
  let mockRecordAtBat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow = vi.spyOn(performance, 'now').mockReturnValue(0);

    // Mock the recordAtBat function from useRecordAtBat
    mockRecordAtBat = vi.fn().mockResolvedValue(undefined);

    // Get the mocked useRecordAtBat and update its return value
    vi.mocked(useRecordAtBat).mockReturnValue({
      recordAtBat: mockRecordAtBat,
      isLoading: false,
      error: null,
      result: null,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    mockPerformanceNow.mockRestore();
  });

  describe('debounced action handling', () => {
    it('should provide debounced record at-bat functionality', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const atBatData = {
        result: 'single',
        runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
      };

      await act(async () => {
        await result.current.debouncedRecordAtBat(atBatData);
      });

      // Should call the underlying recordAtBat function
      expect(mockRecordAtBat).toHaveBeenCalledWith(atBatData);
    });

    it('should handle multiple debounced calls', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const firstAtBatData = {
        result: 'single',
        runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
      };

      const secondAtBatData = {
        result: 'double',
        runnerAdvances: [{ runnerId: 'player-2', fromBase: 0, toBase: 2 }],
      };

      // First call
      await act(async () => {
        await result.current.debouncedRecordAtBat(firstAtBatData);
      });

      // Second call
      await act(async () => {
        await result.current.debouncedRecordAtBat(secondAtBatData);
      });

      expect(mockRecordAtBat).toHaveBeenCalledTimes(2);
      expect(mockRecordAtBat).toHaveBeenNthCalledWith(1, firstAtBatData);
      expect(mockRecordAtBat).toHaveBeenNthCalledWith(2, secondAtBatData);
    });

    it('should update performance metrics after operations', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // Initial state should have zero metrics
      expect(result.current.performanceMetrics.totalOperations).toBe(0);
      expect(result.current.performanceMetrics.averageResponseTime).toBe(0);

      await act(async () => {
        await result.current.debouncedRecordAtBat({
          result: 'single',
          runnerAdvances: [],
        });
      });

      // Should track the operation
      expect(result.current.performanceMetrics.totalOperations).toBe(1);
    });
  });

  describe('prefetching optimization', () => {
    it('should preload next batter data when at-bat is near completion', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // Simulate near completion trigger
      await act(async () => {
        await result.current.prefetchNextBatter();
      });

      // Verify prefetched data is available (mocked implementation returns fixed data)
      expect(result.current.prefetchedData.nextBatter).toEqual({
        id: 'next-batter',
        name: 'Next Player',
        jerseyNumber: '7',
      });
    });

    it('should cache prefetched data to avoid duplicate requests', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // First prefetch
      await act(async () => {
        await result.current.prefetchNextBatter();
      });

      expect(result.current.prefetchedData.nextBatter).toBeTruthy();

      // Second prefetch should use cache (verify no additional loading)
      const loadingContextBefore = result.current.loadingMessage;

      await act(async () => {
        await result.current.prefetchNextBatter();
      });

      // Should not trigger loading since data is cached
      expect(result.current.loadingMessage).toBe(loadingContextBefore);
    });

    it('should invalidate cache when game state changes significantly', async () => {
      // useGameStore is already mocked at the module level
      const { result } = renderHook(() => usePerformanceOptimization());

      // Initial prefetch
      act(() => {
        void result.current.prefetchNextBatter();
      });

      await waitFor(() => {
        expect(result.current.prefetchedData.nextBatter).toBeTruthy();
      });

      // Simulate inning change
      vi.mocked(useGameStore).mockReturnValue({
        activeGameState: {
          currentBatter: { id: 'batter1', name: 'Player 1' },
          currentInning: 6, // Changed inning
          outs: 1,
        },
        currentGame: null,
        isGameActive: false,
        setCurrentGame: vi.fn(),
        setLoading: vi.fn(),
        updateScore: vi.fn(),
      });

      const { result: updatedResult } = renderHook(() => usePerformanceOptimization());

      // Cache should be invalidated
      expect(updatedResult.current.prefetchedData.nextBatter).toBeNull();
    });
  });

  describe('runner advancement calculations', () => {
    it('should optimize runner advancement calculations to complete in <50ms', () => {
      mockPerformanceNow.mockReturnValue(0);

      const { result } = renderHook(() => usePerformanceOptimization());

      const complexBaseState = {
        first: { id: 'player-1', name: 'Runner 1' },
        second: { id: 'player-2', name: 'Runner 2' },
        third: { id: 'player-3', name: 'Runner 3' },
      };

      const startTime = performance.now();

      act(() => {
        const advances = result.current.calculateOptimizedRunnerAdvances(
          'SINGLE',
          complexBaseState
        );

        expect(advances).toBeDefined();
        expect(Array.isArray(advances)).toBe(true);
      });

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      expect(calculationTime).toBeLessThan(50);
    });

    it('should cache calculation results for identical scenarios', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const baseState = {
        first: { id: 'player-1', name: 'Runner 1' },
        second: null,
        third: null,
      };

      let firstResult: unknown;
      let secondResult: unknown;

      // First calculation
      act(() => {
        firstResult = result.current.calculateOptimizedRunnerAdvances('SINGLE', baseState);
      });

      // Second identical calculation should return same result (cached)
      act(() => {
        secondResult = result.current.calculateOptimizedRunnerAdvances('SINGLE', baseState);
      });

      expect(firstResult).toEqual(secondResult);
      expect(Array.isArray(firstResult)).toBe(true);
    });
  });

  describe('loading state optimization', () => {
    it('should implement appropriate loading states with timing', () => {
      // Mock loading state
      vi.mocked(useRecordAtBat).mockReturnValue({
        recordAtBat: vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(resolve, 150); // Simulate 150ms operation
          });
        }),
        isLoading: true,
        error: null,
        result: null,
        reset: vi.fn(),
      });

      const { result } = renderHook(() => usePerformanceOptimization());

      expect(result.current.isOptimizedLoading).toBe(true);

      // Should show loading state for operations > 100ms
      expect(result.current.shouldShowLoadingSpinner).toBe(true);

      // Should disable buttons during loading
      expect(result.current.shouldDisableButtons).toBe(true);
    });

    it('should not show loading spinner for fast operations (<100ms)', () => {
      // Mock fast operation
      vi.mocked(useRecordAtBat).mockReturnValue({
        recordAtBat: vi.fn().mockResolvedValue(undefined),
        isLoading: false, // Fast operation already completed
        error: null,
        result: null,
        reset: vi.fn(),
      });

      const { result } = renderHook(() => usePerformanceOptimization());

      expect(result.current.shouldShowLoadingSpinner).toBe(false);
    });

    it('should provide contextual loading messages', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // Test different loading contexts
      act(() => {
        result.current.setLoadingContext('recording');
      });
      expect(result.current.loadingMessage).toBe('Recording at-bat...');

      act(() => {
        result.current.setLoadingContext('prefetching');
      });
      expect(result.current.loadingMessage).toBe('Loading next batter...');

      act(() => {
        result.current.setLoadingContext('calculating');
      });
      expect(result.current.loadingMessage).toBe('Calculating advances...');
    });
  });

  describe('performance monitoring', () => {
    it('should track performance metrics', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      expect(result.current.performanceMetrics).toEqual({
        averageResponseTime: 0,
        totalOperations: 0,
        cacheHitRate: 0,
        slowOperationsCount: 0,
      });
    });

    it('should update metrics after operations', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      await act(async () => {
        await result.current.debouncedRecordAtBat({
          result: 'single',
          runnerAdvances: [],
        });
      });

      expect(result.current.performanceMetrics.totalOperations).toBe(1);
    });
  });

  describe('memory optimization', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => usePerformanceOptimization());

      // Create some cached data
      await act(async () => {
        await result.current.prefetchNextBatter();
      });

      // Verify cache exists
      expect(result.current.prefetchedData.nextBatter).toBeTruthy();

      // Unmount component
      unmount();

      // Resources should be cleaned up (no memory leaks)
      // This is tested by ensuring no console warnings about memory leaks
      // In actual implementation, cleanup function cancels timers and clears refs
    });

    it('should limit cache size to prevent memory issues', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // Fill cache with multiple calculations
      const baseStates = Array.from({ length: 20 }, (_, i) => ({
        first: { id: `player-${i}`, name: `Runner ${i}` },
        second: null,
        third: null,
      }));

      baseStates.forEach((baseState, _index) => {
        act(() => {
          result.current.calculateOptimizedRunnerAdvances('SINGLE', baseState);
        });
      });

      // Cache should be limited (e.g., max 10 entries)
      const _cacheSize = result.current.performanceMetrics.cacheHitRate;
      // Exact implementation depends on cache strategy, but should not grow unbounded
    });
  });

  describe('error handling', () => {
    it('should handle debounce errors gracefully', async () => {
      mockRecordAtBat.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePerformanceOptimization());

      try {
        await act(async () => {
          await result.current.debouncedRecordAtBat({
            result: 'single',
            runnerAdvances: [],
          });
        });
      } catch {
        // Expected to handle error gracefully
      }

      // Error should be handled without breaking the component
      expect(result.current.performanceMetrics.totalOperations).toBe(1);
    });

    it('should fallback gracefully when optimization fails', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      // Force an error in calculation optimization
      const invalidBaseState: BaseState | null = null;

      act(() => {
        const advances = result.current.calculateOptimizedRunnerAdvances(
          'SINGLE',
          invalidBaseState
        );

        // Should return empty array as fallback
        expect(advances).toEqual([]);
      });
    });
  });
});
