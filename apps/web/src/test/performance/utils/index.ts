/**
 * Performance Testing Utilities - Main Export
 *
 * This module provides a comprehensive suite of performance testing utilities
 * designed for stable, environment-aware performance testing with statistical
 * analysis and regression detection.
 *
 * @example
 * ```typescript
 * import { runPerformanceTest } from './test/performance/utils';
 *
 * // Simple performance test
 * const result = await runPerformanceTest('api-call', 1000, async () => {
 *   await fetch('/api/data');
 * });
 *
 * if (!result.passed) {
 *   throw new Error(result.summary);
 * }
 * ```
 */

// Configuration and Environment Detection
export {
  PerformanceEnvironment,
  type EnvironmentConfig,
  getEnvironmentConfig,
  detectEnvironment,
  getEnvironmentMultiplier,
} from './config';

// Benchmarking and Statistical Analysis
export {
  PerformanceBenchmark,
  type BenchmarkResult,
  type StatisticalSummary,
  type BenchmarkOperation,
  createPerformanceBenchmark,
  calculatePercentile,
  calculateStatisticalSummary,
  runBenchmark,
} from './PerformanceBenchmark';

// Threshold Management and Validation
export {
  PerformanceThreshold,
  type ThresholdValidationResult,
  createPerformanceThreshold,
  adaptThresholdForEnvironment,
  validateThreshold,
  formatThresholdMessage,
} from './PerformanceThreshold';

// Baseline Management and Regression Detection
export {
  PerformanceBaseline,
  type BaselineData,
  type RegressionResult,
  type RegressionSeverity,
  createPerformanceBaseline,
  detectPerformanceRegression,
  calculateRegressionSeverity,
  formatRegressionReport,
} from './PerformanceBaseline';

// Complete Performance Testing Solution
export {
  PerformanceTestHelper,
  type PerformanceTestResult,
  type PerformanceTestOptions,
  createPerformanceTestHelper,
  runPerformanceTest,
} from './PerformanceTestHelper';

/**
 * Quick Start Guide
 *
 * For most use cases, you can use the `runPerformanceTest` function:
 *
 * ```typescript
 * import { runPerformanceTest } from './test/performance/utils';
 *
 * // Basic usage
 * const result = await runPerformanceTest('operation-name', 1000, async () => {
 *   // Your operation here
 * });
 *
 * if (!result.passed) {
 *   console.error(result.summary);
 *   console.log('Recommendations:', result.recommendations);
 * }
 *
 * // Advanced usage with baseline and configuration
 * const result = await runPerformanceTest(
 *   'complex-operation',
 *   500,
 *   operationFunction,
 *   existingBaseline,
 *   { environment: 'ci', warmupRuns: 3 },
 *   { updateBaseline: true, version: '1.2.0' }
 * );
 * ```
 *
 * For more control, use the `PerformanceTestHelper` class:
 *
 * ```typescript
 * import { createPerformanceTestHelper } from './test/performance/utils';
 *
 * const helper = createPerformanceTestHelper('test-name', 1000, baseline);
 * const result = await helper.runTest(operation, { updateBaseline: true });
 * ```
 */
