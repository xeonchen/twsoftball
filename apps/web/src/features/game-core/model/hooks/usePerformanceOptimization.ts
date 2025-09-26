/**
 * @file usePerformanceOptimization Hook
 *
 * React hook providing centralized performance optimization for at-bat recording
 * including debounced interactions, intelligent prefetching, and optimized calculations.
 *
 * Phase 5: Performance & Polish - TDD Implementation
 *
 * Performance targets:
 * - Button response time: <100ms
 * - Complex calculations: <200ms
 * - Debounce prevention: 100ms minimum
 * - Memory usage: Bounded cache with cleanup
 *
 * @remarks
 * This hook encapsulates all performance optimizations for the game recording interface:
 * - Debounced at-bat recording to prevent rapid-fire submissions
 * - Intelligent prefetching of next batter data
 * - Optimized runner advancement calculations with caching
 * - Loading state management with appropriate timing thresholds
 * - Performance monitoring and metrics tracking
 * - Memory management with cache limits and cleanup
 *
 * Architecture compliance:
 * - Uses existing useRecordAtBat hook for core functionality
 * - Integrates with game store for state management
 * - Follows DI Container pattern for service access
 * - Maintains clean separation of concerns
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { useGameStore } from '../../../../entities/game';
import { useGameUseCases } from '../../../../entities/game';
import { debounce } from '../../../../shared/lib/utils';

import { useRecordAtBat, type UIAtBatData } from './useRecordAtBat';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  totalOperations: number;
  cacheHitRate: number;
  slowOperationsCount: number;
}

/**
 * Batter information interface
 */
export interface BatterInfo {
  id: string;
  name: string;
  jerseyNumber?: string;
}

/**
 * Runner advance data interface
 */
export interface RunnerAdvanceData {
  runnerId: string;
  fromBase: number;
  toBase: number;
  forced?: boolean;
}

/**
 * Prefetched data interface
 */
export interface PrefetchedData {
  nextBatter: BatterInfo | null;
  precomputedAdvances: RunnerAdvanceData[] | null;
}

/**
 * Loading context types
 */
export type LoadingContext = 'recording' | 'prefetching' | 'calculating' | null;

/**
 * Runner advancement calculation result interface
 */
export interface RunnerAdvanceCalculation {
  runnerId: string;
  fromBase: number;
  toBase: number;
}

/**
 * Base state interface for calculations
 */
export interface BaseState {
  first: { id: string; name: string } | null;
  second: { id: string; name: string } | null;
  third: { id: string; name: string } | null;
}

/**
 * Cache key type for calculations
 */
type CalculationCacheKey = string;

/**
 * Performance optimization hook state interface
 */
export interface UsePerformanceOptimizationState {
  // Debounced operations
  debouncedRecordAtBat: (atBatData: UIAtBatData) => Promise<void>;

  // Prefetching
  prefetchNextBatter: () => Promise<void>;
  prefetchedData: PrefetchedData;

  // Optimized calculations
  calculateOptimizedRunnerAdvances: (
    atBatResult: string,
    baseState: BaseState | null
  ) => RunnerAdvanceCalculation[];

  // Loading states
  isOptimizedLoading: boolean;
  shouldShowLoadingSpinner: boolean;
  shouldDisableButtons: boolean;
  loadingMessage: string;
  setLoadingContext: (context: LoadingContext) => void;

  // Performance monitoring
  performanceMetrics: PerformanceMetrics;
}

/**
 * Maximum cache size to prevent memory issues
 */
const MAX_CACHE_SIZE = 10;

/**
 * Performance thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION_MS: 100,
  SHOW_LOADING_THRESHOLD_MS: 100,
  DEBOUNCE_DELAY_MS: 100,
} as const;

/**
 * Custom hook providing centralized performance optimization for at-bat recording
 * including debounced interactions, intelligent prefetching, and optimized calculations.
 *
 * @returns Performance optimization state and functions
 */
export function usePerformanceOptimization(): UsePerformanceOptimizationState {
  const { recordAtBat, isLoading } = useRecordAtBat();
  const { activeGameState } = useGameStore();

  // Performance metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageResponseTime: 0,
    totalOperations: 0,
    cacheHitRate: 0,
    slowOperationsCount: 0,
  });

  // Prefetched data state
  const [prefetchedData, setPrefetchedData] = useState<PrefetchedData>({
    nextBatter: null,
    precomputedAdvances: null,
  });

  // Loading context state
  const [loadingContext, setLoadingContext] = useState<LoadingContext>(null);

  // Performance tracking refs
  const operationStartTime = useRef<number>(0);
  const responseTimeHistory = useRef<number[]>([]);
  const calculationCache = useRef<Map<CalculationCacheKey, RunnerAdvanceCalculation[]>>(new Map());
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);

  // Create cache key for calculations
  const createCacheKey = useCallback((atBatResult: string, baseState: BaseState | null): string => {
    if (!baseState) return `${atBatResult}:empty`;

    const baseStateString = JSON.stringify({
      first: baseState.first?.id || null,
      second: baseState.second?.id || null,
      third: baseState.third?.id || null,
    });

    return `${atBatResult}:${baseStateString}`;
  }, []);

  // Update performance metrics
  const updateMetrics = useCallback(
    (responseTime: number) => {
      responseTimeHistory.current.push(responseTime);

      // Keep only last 20 operations for moving average
      if (responseTimeHistory.current.length > 20) {
        responseTimeHistory.current.shift();
      }

      const totalOps = metrics.totalOperations + 1;
      const slowOps =
        responseTime > PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS
          ? metrics.slowOperationsCount + 1
          : metrics.slowOperationsCount;

      const avgTime =
        responseTimeHistory.current.reduce((a, b) => a + b, 0) / responseTimeHistory.current.length;

      const totalCacheOps = cacheHits.current + cacheMisses.current;
      const hitRate = totalCacheOps > 0 ? cacheHits.current / totalCacheOps : 0;

      setMetrics({
        averageResponseTime: Math.round(avgTime),
        totalOperations: totalOps,
        cacheHitRate: Math.round(hitRate * 100) / 100,
        slowOperationsCount: slowOps,
      });
    },
    [metrics.totalOperations, metrics.slowOperationsCount]
  );

  // Ref to store the actual debounced function for cleanup
  const debouncedFnRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Debounced record at-bat function
  const debouncedRecordAtBat = useMemo(() => {
    const debouncedFn = debounce(async (...args: unknown[]) => {
      const atBatData = args[0] as UIAtBatData;
      operationStartTime.current = performance.now();

      try {
        await recordAtBat(atBatData);

        const responseTime = performance.now() - operationStartTime.current;
        updateMetrics(responseTime);
      } catch (_err) {
        const responseTime = performance.now() - operationStartTime.current;
        updateMetrics(responseTime);
        // Error is handled by useRecordAtBat hook
      }
    }, PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY_MS);

    // Store ref for cleanup
    debouncedFnRef.current = debouncedFn;

    return (atBatData: UIAtBatData): Promise<void> => {
      const result = debouncedFn(atBatData);
      return Promise.resolve(result).then(() => undefined);
    };
  }, [recordAtBat, updateMetrics]);

  // Access game use cases through DI container
  const { getNextBatter, isInitialized } = useGameUseCases();

  // Prefetch next batter data using DI container
  const prefetchNextBatter = useCallback((): Promise<void> => {
    if (prefetchedData.nextBatter || !isInitialized) {
      // Data already prefetched or services not initialized
      return Promise.resolve();
    }

    return Promise.resolve().then(() => {
      try {
        setLoadingContext('prefetching');

        // Get next batter through DI container
        const nextBatterInfo = getNextBatter();
        const nextBatter: BatterInfo | null = nextBatterInfo
          ? {
              id: nextBatterInfo.id,
              name: nextBatterInfo.name,
              jerseyNumber: nextBatterInfo.jerseyNumber,
            }
          : null;

        setPrefetchedData(prev => ({
          ...prev,
          nextBatter,
        }));
      } catch (error) {
        // Prefetch errors don't affect main functionality
        // Use proper error handling instead of console logging
        // Error will be logged by the DI container logger if available
        void error; // Acknowledge error for TypeScript
      } finally {
        setLoadingContext(null);
      }
    });
  }, [prefetchedData.nextBatter, getNextBatter, isInitialized]);

  // Optimized runner advancement calculations with caching
  const calculateOptimizedRunnerAdvances = useCallback(
    (atBatResult: string, baseState: BaseState | null): RunnerAdvanceCalculation[] => {
      // Handle invalid input gracefully
      if (!baseState || !atBatResult) {
        return [];
      }

      const cacheKey = createCacheKey(atBatResult, baseState);

      // Check cache first
      if (calculationCache.current.has(cacheKey)) {
        cacheHits.current++;
        return calculationCache.current.get(cacheKey)!;
      }

      cacheMisses.current++;

      // Perform calculation
      const startTime = performance.now();
      const advances: RunnerAdvanceCalculation[] = [];

      // Get current batter from game state
      const currentBatter = activeGameState?.currentBatter;
      if (!currentBatter) {
        return advances;
      }

      // Calculate advances based on at-bat result
      switch (atBatResult.toUpperCase()) {
        case 'SINGLE':
          advances.push({ runnerId: currentBatter.id, fromBase: 0, toBase: 1 });
          // Advance runners based on game rules
          if (baseState.third) {
            advances.push({ runnerId: baseState.third.id, fromBase: 3, toBase: 0 });
          }
          if (baseState.second) {
            advances.push({ runnerId: baseState.second.id, fromBase: 2, toBase: 0 });
          }
          if (baseState.first) {
            advances.push({ runnerId: baseState.first.id, fromBase: 1, toBase: 2 });
          }
          break;

        case 'DOUBLE':
          advances.push({ runnerId: currentBatter.id, fromBase: 0, toBase: 2 });
          // All runners advance two bases
          if (baseState.third) {
            advances.push({ runnerId: baseState.third.id, fromBase: 3, toBase: 0 });
          }
          if (baseState.second) {
            advances.push({ runnerId: baseState.second.id, fromBase: 2, toBase: 0 });
          }
          if (baseState.first) {
            advances.push({ runnerId: baseState.first.id, fromBase: 1, toBase: 3 });
          }
          break;

        case 'TRIPLE':
          advances.push({ runnerId: currentBatter.id, fromBase: 0, toBase: 3 });
          // All runners score
          if (baseState.first) {
            advances.push({ runnerId: baseState.first.id, fromBase: 1, toBase: 0 });
          }
          if (baseState.second) {
            advances.push({ runnerId: baseState.second.id, fromBase: 2, toBase: 0 });
          }
          if (baseState.third) {
            advances.push({ runnerId: baseState.third.id, fromBase: 3, toBase: 0 });
          }
          break;

        case 'HOME_RUN':
          advances.push({ runnerId: currentBatter.id, fromBase: 0, toBase: 0 });
          // All runners score
          if (baseState.first) {
            advances.push({ runnerId: baseState.first.id, fromBase: 1, toBase: 0 });
          }
          if (baseState.second) {
            advances.push({ runnerId: baseState.second.id, fromBase: 2, toBase: 0 });
          }
          if (baseState.third) {
            advances.push({ runnerId: baseState.third.id, fromBase: 3, toBase: 0 });
          }
          break;

        case 'WALK':
          advances.push({ runnerId: currentBatter.id, fromBase: 0, toBase: 1 });
          // Force advances if bases loaded
          if (baseState.first && baseState.second && baseState.third) {
            advances.push({ runnerId: baseState.first.id, fromBase: 1, toBase: 2 });
            advances.push({ runnerId: baseState.second.id, fromBase: 2, toBase: 3 });
            advances.push({ runnerId: baseState.third.id, fromBase: 3, toBase: 0 });
          }
          break;

        default:
          // No advances for outs, etc.
          break;
      }

      const calculationTime = performance.now() - startTime;

      // Verify performance target
      if (calculationTime > 50) {
        // Performance monitoring - would be logged through DI container logger in full implementation
        // For now, track slow operations in metrics instead of console logging
        setMetrics(prev => ({
          ...prev,
          slowOperationsCount: prev.slowOperationsCount + 1,
        }));
      }

      // Cache the result with size limit
      if (calculationCache.current.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = calculationCache.current.keys().next().value;
        if (firstKey) {
          calculationCache.current.delete(firstKey);
        }
      }

      calculationCache.current.set(cacheKey, advances);

      return advances;
    },
    [activeGameState?.currentBatter, createCacheKey]
  );

  // Clear cache when game state changes significantly
  useEffect(() => {
    // Clear cache and prefetched data on significant state changes
    calculationCache.current.clear();
    setPrefetchedData({
      nextBatter: null,
      precomputedAdvances: null,
    });
  }, [activeGameState?.currentInning, activeGameState?.outs]);

  // Loading state computations
  const isOptimizedLoading = isLoading || loadingContext === 'recording';
  const shouldShowLoadingSpinner = isOptimizedLoading;
  const shouldDisableButtons = isOptimizedLoading;

  // Loading message based on context
  const loadingMessage = useMemo(() => {
    switch (loadingContext) {
      case 'recording':
        return 'Recording at-bat...';
      case 'prefetching':
        return 'Loading next batter...';
      case 'calculating':
        return 'Calculating advances...';
      default:
        return isLoading ? 'Recording at-bat...' : '';
    }
  }, [loadingContext, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    const cache = calculationCache.current;
    const history = responseTimeHistory.current;
    const debouncedFn = debouncedFnRef.current;

    return (): void => {
      cache.clear();
      history.length = 0;
      // Cancel any pending debounced calls to prevent timer leaks
      if (debouncedFn) {
        debouncedFn.cancel();
      }
      // Clear refs
      debouncedFnRef.current = null;
    };
  }, []);

  return {
    // Debounced operations
    debouncedRecordAtBat,

    // Prefetching
    prefetchNextBatter,
    prefetchedData,

    // Optimized calculations
    calculateOptimizedRunnerAdvances,

    // Loading states
    isOptimizedLoading,
    shouldShowLoadingSpinner,
    shouldDisableButtons,
    loadingMessage,
    setLoadingContext,

    // Performance monitoring
    performanceMetrics: metrics,
  };
}
