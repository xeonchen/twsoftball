/**
 * Performance Test Helper - Complete Performance Testing Solution
 *
 * Provides a comprehensive, easy-to-use interface that combines all performance
 * testing utilities into a single cohesive solution. Handles benchmarking,
 * threshold validation, regression detection, and baseline management.
 *
 * Features:
 * - Complete performance test workflow
 * - Automatic threshold adaptation
 * - Regression detection with baselines
 * - Detailed reporting and recommendations
 * - Environment-aware configuration
 * - Baseline management and updates
 *
 * @example
 * ```typescript
 * // Simple performance test
 * const result = await runPerformanceTest('api-call', 1000, async () => {
 *   await fetch('/api/data');
 * });
 *
 * if (!result.passed) {
 *   console.error(result.summary);
 *   console.log('Recommendations:', result.recommendations);
 * }
 *
 * // Advanced usage with baseline and configuration
 * const helper = createPerformanceTestHelper('render-component', 500, existingBaseline);
 * const result = await helper.runTest(renderOperation, {
 *   updateBaseline: true,
 *   version: '1.2.0'
 * });
 * ```
 */

import { EnvironmentConfig, PerformanceEnvironment, getEnvironmentConfig } from './config';
import { PerformanceBaseline, BaselineData, RegressionResult } from './PerformanceBaseline';
import { PerformanceBenchmark, BenchmarkResult, BenchmarkOperation } from './PerformanceBenchmark';
import { PerformanceThreshold, ThresholdValidationResult } from './PerformanceThreshold';

/**
 * Options for running a performance test
 */
export interface PerformanceTestOptions {
  /** Whether to update the baseline with current results */
  updateBaseline?: boolean;
  /** Version identifier for baseline updates */
  version?: string;
}

/**
 * Complete result of a performance test
 */
export interface PerformanceTestResult {
  /** Name of the test that was executed */
  testName: string;
  /** Overall pass/fail status */
  passed: boolean;
  /** Detailed benchmark results */
  benchmarkResult: BenchmarkResult;
  /** Threshold validation results */
  thresholdResult: ThresholdValidationResult;
  /** Regression detection results */
  regressionResult: RegressionResult;
  /** Human-readable summary of all results */
  summary: string;
  /** Combined recommendations from all analyses */
  recommendations: string[];
  /** Whether the baseline was updated */
  baselineUpdated: boolean;
  /** Configuration used for the test */
  config: EnvironmentConfig;
}

/**
 * Complete performance testing helper that integrates all utilities
 */
export class PerformanceTestHelper {
  public readonly testName: string;
  public readonly config: EnvironmentConfig;
  public readonly benchmark: PerformanceBenchmark;
  public readonly threshold: PerformanceThreshold;
  public readonly baseline: PerformanceBaseline;

  /**
   * Creates a new performance test helper
   *
   * @param testName - Name of the test/operation
   * @param baseThreshold - Base threshold in milliseconds
   * @param existingBaseline - Optional existing baseline data
   * @param customConfig - Optional custom configuration
   * @throws {Error} When testName is invalid or baseThreshold is invalid
   */
  constructor(
    testName: string,
    baseThreshold?: number,
    existingBaseline?: BaselineData,
    customConfig?: Partial<EnvironmentConfig>
  ) {
    // Input validation
    if (!testName || typeof testName !== 'string') {
      throw new Error('Performance test helper name must be a non-empty string');
    }

    if (testName.trim().length === 0) {
      throw new Error('Performance test helper name cannot be only whitespace');
    }

    if (baseThreshold !== undefined && (!Number.isFinite(baseThreshold) || baseThreshold <= 0)) {
      throw new Error('Base threshold must be a positive finite number');
    }

    this.testName = testName.trim();
    this.config = getEnvironmentConfig(customConfig);

    // Initialize all utility components (validation is handled by their constructors)
    this.benchmark = new PerformanceBenchmark(this.testName, this.config);
    this.threshold = baseThreshold
      ? new PerformanceThreshold(this.testName, baseThreshold, this.config)
      : new PerformanceThreshold(this.testName, 1000, this.config); // Default 1000ms
    this.baseline = new PerformanceBaseline(this.testName, existingBaseline);
  }

  /**
   * Runs a complete performance test with all analyses
   *
   * @param operation - The operation to test
   * @param options - Optional test configuration
   * @returns Complete performance test results
   *
   * @example
   * ```typescript
   * const helper = new PerformanceTestHelper('database-query', 500);
   * const result = await helper.runTest(async () => {
   *   await db.query('SELECT * FROM users');
   * });
   *
   * if (!result.passed) {
   *   throw new Error(result.summary);
   * }
   * ```
   */
  async runTest(
    operation: BenchmarkOperation,
    options: PerformanceTestOptions = {}
  ): Promise<PerformanceTestResult> {
    // Step 1: Run benchmark to get performance measurements
    const benchmarkResult = await this.benchmark.run(operation);

    // Step 2: Validate against threshold
    const thresholdResult = this.threshold.validate(benchmarkResult.thresholdTime);

    // Step 3: Detect regression against baseline
    const regressionResult = this.baseline.detectRegression(
      benchmarkResult.measurements,
      this.config.environment
    );

    // Step 4: Update baseline if requested and test passed
    let baselineUpdated = false;
    if (options.updateBaseline && thresholdResult.passed) {
      this.baseline.updateBaseline(
        benchmarkResult.measurements,
        this.config.environment,
        options.version || 'unknown'
      );
      baselineUpdated = true;
    }

    // Step 5: Generate comprehensive summary and recommendations
    const summary = this.generateSummary(benchmarkResult, thresholdResult, regressionResult);
    const recommendations = this.generateRecommendations(
      thresholdResult,
      regressionResult,
      benchmarkResult
    );

    // Step 6: Determine overall pass/fail status
    const passed = thresholdResult.passed && !regressionResult.hasRegression;

    return {
      testName: this.testName,
      passed,
      benchmarkResult,
      thresholdResult,
      regressionResult,
      summary,
      recommendations,
      baselineUpdated,
      config: this.config,
    };
  }

  /**
   * Generates a comprehensive summary of all test results
   */
  private generateSummary(
    benchmarkResult: BenchmarkResult,
    thresholdResult: ThresholdValidationResult,
    regressionResult: RegressionResult
  ): string {
    const { statistics, thresholdTime } = benchmarkResult;
    const { passed, threshold, environment, multiplier } = thresholdResult;

    let summary = `Performance Test: ${this.testName}\n`;
    summary += `${'='.repeat(40)}\n`;

    // Overall status
    const status = passed && !regressionResult.hasRegression ? '✅ PASSED' : '❌ FAILED';
    summary += `Status: ${status}\n\n`;

    // Performance metrics
    summary += `Performance Metrics:\n`;
    summary += `  Mean Time:        ${statistics.mean.toFixed(2)}ms\n`;
    summary += `  Median Time:      ${statistics.median.toFixed(2)}ms\n`;
    summary += `  95th Percentile:  ${statistics.percentile95.toFixed(2)}ms\n`;
    summary += `  Standard Dev:     ${statistics.standardDeviation.toFixed(2)}ms\n`;
    summary += `  Sample Count:     ${statistics.count}\n\n`;

    // Threshold analysis
    summary += `Threshold Analysis:\n`;
    summary += `  Base Threshold:   ${thresholdResult.baseThreshold}ms\n`;
    summary += `  Adaptive Threshold: ${threshold.toFixed(2)}ms (${environment} × ${multiplier})\n`;
    summary += `  Threshold Time:   ${thresholdTime.toFixed(2)}ms\n`;
    summary += `  Status:           ${passed ? 'PASSED' : 'EXCEEDED'}\n\n`;

    // Regression analysis
    if (regressionResult.hasRegression) {
      summary += `Regression Analysis:\n`;
      summary += `  Severity:         ${regressionResult.severity.toUpperCase()}\n`;
      summary += `  Baseline Mean:    ${regressionResult.baselineMean.toFixed(2)}ms\n`;
      summary += `  Current Mean:     ${regressionResult.currentMean.toFixed(2)}ms\n`;
      summary += `  Change:           ${(regressionResult.relativeChange * 100).toFixed(1)}%\n\n`;
    } else if (regressionResult.improvement > 0) {
      summary += `Performance Improvement:\n`;
      summary += `  Improvement:      ${(regressionResult.improvement * 100).toFixed(1)}% faster\n`;
      summary += `  Baseline Mean:    ${regressionResult.baselineMean.toFixed(2)}ms\n`;
      summary += `  Current Mean:     ${regressionResult.currentMean.toFixed(2)}ms\n\n`;
    }

    return summary;
  }

  /**
   * Generates combined recommendations from all analyses
   */
  private generateRecommendations(
    thresholdResult: ThresholdValidationResult,
    regressionResult: RegressionResult,
    benchmarkResult: BenchmarkResult
  ): string[] {
    const recommendations = new Set<string>();

    // Add threshold-based recommendations
    if (!thresholdResult.passed) {
      thresholdResult.suggestions.forEach(suggestion => recommendations.add(suggestion));
    }

    // Add regression-based recommendations
    if (regressionResult.hasRegression) {
      regressionResult.recommendations.forEach(rec => recommendations.add(rec));
    }

    // Add statistical analysis recommendations
    const { statistics } = benchmarkResult;
    if (statistics.standardDeviation > statistics.mean * 0.3) {
      recommendations.add(
        'High performance variance detected - consider investigating inconsistent execution paths'
      );
    }

    if (statistics.count < 5) {
      recommendations.add('Consider increasing measurement runs for more reliable statistics');
    }

    // Environment-specific recommendations
    if (this.config.environment === PerformanceEnvironment.CI) {
      recommendations.add('CI environment detected - consider local testing for faster iteration');
    }

    return Array.from(recommendations);
  }
}

/**
 * Creates a performance test helper with the specified configuration
 *
 * @param testName - Name of the test/operation
 * @param baseThreshold - Base threshold in milliseconds
 * @param existingBaseline - Optional existing baseline data
 * @param customConfig - Optional custom configuration
 * @returns Configured performance test helper
 */
export function createPerformanceTestHelper(
  testName: string,
  baseThreshold?: number,
  existingBaseline?: BaselineData,
  customConfig?: Partial<EnvironmentConfig>
): PerformanceTestHelper {
  return new PerformanceTestHelper(testName, baseThreshold, existingBaseline, customConfig);
}

/**
 * Runs a complete performance test with minimal setup
 *
 * @param testName - Name of the test/operation
 * @param baseThreshold - Base threshold in milliseconds
 * @param operation - Operation to test
 * @param existingBaseline - Optional existing baseline data
 * @param customConfig - Optional custom configuration
 * @param options - Optional test options
 * @returns Complete performance test results
 *
 * @example
 * ```typescript
 * // Simple usage
 * const result = await runPerformanceTest('api-call', 1000, async () => {
 *   await fetchData();
 * });
 *
 * // Advanced usage
 * const result = await runPerformanceTest(
 *   'complex-operation',
 *   500,
 *   operationFunction,
 *   existingBaseline,
 *   { environment: 'ci', warmupRuns: 3 },
 *   { updateBaseline: true, version: '1.2.0' }
 * );
 * ```
 */
export async function runPerformanceTest(
  testName: string,
  baseThreshold: number,
  operation: BenchmarkOperation,
  existingBaseline?: BaselineData,
  customConfig?: Partial<EnvironmentConfig>,
  options?: PerformanceTestOptions
): Promise<PerformanceTestResult> {
  const helper = createPerformanceTestHelper(
    testName,
    baseThreshold,
    existingBaseline,
    customConfig
  );

  return helper.runTest(operation, options);
}
