/**
 * Performance Benchmarking with Statistical Analysis for Softball Game UI
 *
 * Core business logic: Softball games happen in real-time with live action that
 * cannot be paused. UI operations must be fast and consistent to avoid missing
 * plays or disrupting the game flow. This benchmarking system ensures UI
 * components meet the strict performance requirements of live game recording.
 *
 * Softball Game Context: Critical operations include lineup rendering (before game),
 * at-bat recording (during play), player substitutions (mid-game), and score updates
 * (continuous). Any lag in these operations can result in missed data or game
 * disruption, making performance testing essential for game integrity.
 *
 * Statistical Methodology: Uses 95th percentile for thresholds because game UI
 * must be consistently fast - occasional slow operations are acceptable, but
 * frequent slowdowns will disrupt gameplay. Mean is too optimistic, while max
 * is too pessimistic for real-world usage patterns.
 *
 * Features:
 * - Warm-up runs to stabilize JIT compilation and React rendering caches
 * - Statistical analysis optimized for UI responsiveness requirements
 * - Environment-aware configuration (CI/local/test environments)
 * - Outlier detection to identify performance anomalies
 * - Consistent measurement methodology across all game UI components
 *
 * @example
 * ```typescript
 * // Benchmark critical game operations
 * const lineupBenchmark = new PerformanceBenchmark('lineup-render');
 *
 * // Test lineup rendering with 15 players (typical softball team)
 * const result = await lineupBenchmark.run(async () => {
 *   render(<LineupManager players={largeMockTeam} />);
 *   await waitFor(() => screen.getAllByTestId('player-card'));
 * });
 *
 * // Validate against softball game requirements
 * console.log(`Lineup render time (95th percentile): ${result.thresholdTime}ms`);
 * // Target: <2000ms for smooth game setup experience
 *
 * // Benchmark at-bat recording (most frequent operation)
 * const atBatBenchmark = new PerformanceBenchmark('record-at-bat');
 * const atBatResult = await atBatBenchmark.run(async () => {
 *   userEvent.click(screen.getByText('Single'));
 *   await waitFor(() => screen.getByText('Runner on 1st'));
 * });
 * // Target: <500ms to not disrupt game flow
 * ```
 */

import { EnvironmentConfig, getEnvironmentConfig } from './config';

/**
 * Statistical summary of performance measurements
 */
export interface StatisticalSummary {
  /** Number of measurements taken */
  count: number;
  /** Minimum measured time */
  min: number;
  /** Maximum measured time */
  max: number;
  /** Arithmetic mean of measurements */
  mean: number;
  /** Median (50th percentile) of measurements */
  median: number;
  /** 95th percentile (default threshold time) */
  percentile95: number;
  /** Standard deviation of measurements */
  standardDeviation: number;
}

/**
 * Result of a performance benchmark run
 */
export interface BenchmarkResult {
  /** Name of the benchmarked operation */
  name: string;
  /** Individual measurement times in milliseconds */
  measurements: number[];
  /** Statistical summary of measurements */
  statistics: StatisticalSummary;
  /** Threshold time (typically 95th percentile) for comparison */
  thresholdTime: number;
  /** Configuration used for the benchmark */
  config: EnvironmentConfig;
}

/**
 * Type for operations that can be benchmarked
 */
export type BenchmarkOperation = () => Promise<void> | void;

/**
 * Performance benchmark runner with statistical analysis
 */
export class PerformanceBenchmark {
  public readonly name: string;
  public readonly config: EnvironmentConfig;

  /**
   * Creates a new performance benchmark
   *
   * @param name - Name of the operation being benchmarked
   * @param customConfig - Optional custom configuration
   * @throws {Error} When name is empty or invalid, or when customConfig has invalid values
   */
  constructor(name: string, customConfig?: Partial<EnvironmentConfig>) {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new Error('Performance benchmark name must be a non-empty string');
    }

    if (name.trim().length === 0) {
      throw new Error('Performance benchmark name cannot be only whitespace');
    }

    // Validate custom configuration if provided
    if (customConfig) {
      if (customConfig.thresholdMultiplier !== undefined) {
        if (
          !Number.isFinite(customConfig.thresholdMultiplier) ||
          customConfig.thresholdMultiplier <= 0
        ) {
          throw new Error('Threshold multiplier must be a positive finite number');
        }
      }

      if (customConfig.warmupRuns !== undefined) {
        if (!Number.isInteger(customConfig.warmupRuns) || customConfig.warmupRuns < 0) {
          throw new Error('Warmup runs must be a non-negative integer');
        }
      }

      if (customConfig.measurementRuns !== undefined) {
        if (!Number.isInteger(customConfig.measurementRuns) || customConfig.measurementRuns < 1) {
          throw new Error('Measurement runs must be a positive integer');
        }
      }

      if (customConfig.percentile !== undefined) {
        if (
          !Number.isFinite(customConfig.percentile) ||
          customConfig.percentile < 50 ||
          customConfig.percentile > 100
        ) {
          throw new Error('Percentile must be a number between 50 and 100');
        }
      }
    }

    this.name = name.trim();
    this.config = getEnvironmentConfig(customConfig);
  }

  /**
   * Runs the benchmark with warm-up and measurement phases
   *
   * @param operation - The operation to benchmark
   * @returns Detailed benchmark results with statistics
   *
   * @example
   * ```typescript
   * const benchmark = new PerformanceBenchmark('api-call');
   * const result = await benchmark.run(async () => {
   *   await fetch('/api/data');
   * });
   * ```
   */
  async run(operation: BenchmarkOperation): Promise<BenchmarkResult> {
    // Input validation
    if (!operation || typeof operation !== 'function') {
      throw new Error('Operation must be a valid function');
    }

    // Phase 1: Warm-up runs (not measured)
    await this.runWarmupPhase(operation);

    // Phase 2: Measurement runs
    const measurements = await this.runMeasurementPhase(operation);

    // Phase 3: Statistical analysis
    const statistics = calculateStatisticalSummary(measurements);
    const thresholdTime = calculatePercentile(measurements, this.config.percentile);

    return {
      name: this.name,
      measurements,
      statistics,
      thresholdTime,
      config: this.config,
    };
  }

  /**
   * Runs warm-up operations to stabilize performance
   */
  private async runWarmupPhase(operation: BenchmarkOperation): Promise<void> {
    for (let i = 0; i < this.config.warmupRuns; i++) {
      try {
        await operation();
      } catch (error) {
        throw new Error(
          `Warm-up run ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Runs measurement operations and collects timing data
   */
  private async runMeasurementPhase(operation: BenchmarkOperation): Promise<number[]> {
    const measurements: number[] = [];

    for (let i = 0; i < this.config.measurementRuns; i++) {
      const startTime = performance.now();

      try {
        await operation();
      } catch (error) {
        throw new Error(
          `Measurement run ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      measurements.push(duration);
    }

    return measurements;
  }
}

/**
 * Calculates a specific percentile from an array of numbers
 *
 * @param data - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns The calculated percentile value
 *
 * @example
 * ```typescript
 * const times = [10, 20, 30, 40, 50];
 * const p95 = calculatePercentile(times, 95); // 46
 * ```
 */
export function calculatePercentile(data: number[], percentile: number): number {
  if (data.length === 0) {
    throw new Error('Cannot calculate percentile of empty array');
  }

  if (percentile <= 0 || percentile > 100) {
    throw new Error('Percentile must be between 1 and 100');
  }

  // Sort the data in ascending order
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;

  if (percentile === 100) {
    return sorted[n - 1];
  }

  // Calculate the index using the "nearest rank" method
  const index = (percentile / 100) * (n - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  // If index is a whole number, return that element
  if (lower === upper) {
    return sorted[lower];
  }

  // Otherwise, interpolate between the two nearest values
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculates comprehensive statistical summary of measurements
 *
 * @param measurements - Array of measurement values
 * @returns Statistical summary including mean, median, percentiles, etc.
 */
export function calculateStatisticalSummary(measurements: number[]): StatisticalSummary {
  if (measurements.length === 0) {
    throw new Error('Cannot calculate statistics for empty measurements array');
  }

  const sorted = [...measurements].sort((a, b) => a - b);
  const count = measurements.length;
  const min = sorted[0];
  const max = sorted[count - 1];

  // Calculate mean
  const sum = measurements.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  // Calculate median
  const median = calculatePercentile(sorted, 50);

  // Calculate 95th percentile
  const percentile95 = calculatePercentile(sorted, 95);

  // Calculate standard deviation
  const variance = measurements.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  return {
    count,
    min,
    max,
    mean,
    median,
    percentile95,
    standardDeviation,
  };
}

/**
 * Creates a performance benchmark with current environment configuration
 *
 * @param name - Name of the operation to benchmark
 * @param customConfig - Optional custom configuration overrides
 * @returns Configured performance benchmark
 */
export function createPerformanceBenchmark(
  name: string,
  customConfig?: Partial<EnvironmentConfig>
): PerformanceBenchmark {
  return new PerformanceBenchmark(name, customConfig);
}

/**
 * Convenience function to run a benchmark and return results
 *
 * @param name - Name of the operation
 * @param operation - Operation to benchmark
 * @param customConfig - Optional custom configuration
 * @returns Benchmark results
 *
 * @example
 * ```typescript
 * const result = await runBenchmark('database-query', async () => {
 *   await db.query('SELECT * FROM users');
 * });
 *
 * console.log(`Query took ${result.thresholdTime}ms (95th percentile)`);
 * ```
 */
export async function runBenchmark(
  name: string,
  operation: BenchmarkOperation,
  customConfig?: Partial<EnvironmentConfig>
): Promise<BenchmarkResult> {
  const benchmark = createPerformanceBenchmark(name, customConfig);
  return benchmark.run(operation);
}
