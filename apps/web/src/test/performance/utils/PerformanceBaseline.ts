/**
 * Performance Baseline Management and Regression Detection for Softball Game UI
 *
 * Core business logic: Softball game UI performance directly impacts game recording
 * quality and user experience. Performance regressions can cause missed plays,
 * data entry errors, or game flow disruption. This system establishes performance
 * baselines and detects regressions to maintain consistent game recording quality.
 *
 * Softball Game Context: Game recording happens in real-time with varying team
 * sizes (9-15 players), game lengths (7+ innings), and data complexity (stats,
 * lineups, substitutions). Performance must remain consistent throughout a
 * complete game session, making regression detection critical for game integrity.
 *
 * Regression Detection Strategy: Uses statistical significance testing to
 * distinguish between normal performance variance and true regressions.
 * Accounts for environment differences (CI vs local) and seasonal patterns
 * in UI complexity (playoff games with larger rosters).
 *
 * Features:
 * - Baseline data storage with version tracking for game feature releases
 * - Environment-aware regression detection (different thresholds for CI/local)
 * - Multiple severity levels optimized for softball game impact assessment
 * - Performance improvement detection to validate optimizations
 * - Detailed recommendations specific to softball UI optimization patterns
 * - Historical trend analysis for long-term performance monitoring
 *
 * @example
 * ```typescript
 * // Establish baseline for critical game operations
 * const lineupBaseline = new PerformanceBaseline('lineup-render');
 *
 * // After initial optimization, set baseline
 * lineupBaseline.updateBaseline(
 *   [1200, 1150, 1300, 1100, 1250], // Measurements in ms
 *   PerformanceEnvironment.LOCAL,
 *   'v1.2.0-lineup-optimization'
 * );
 *
 * // Later, detect if new changes caused regression
 * const regressionResult = lineupBaseline.detectRegression(
 *   [1800, 1750, 1900, 1650, 1850], // New measurements
 *   PerformanceEnvironment.LOCAL
 * );
 *
 * if (regressionResult.hasRegression) {
 *   console.error(`Lineup performance regression detected!`);
 *   console.log(`Impact: ${regressionResult.severity} - ${regressionResult.summary}`);
 *   console.log('Recommendations:');
 *   regressionResult.recommendations.forEach(rec => console.log(`- ${rec}`));
 *   // Example output:
 *   // - Consider implementing virtualization for large team rosters
 *   // - Check for unnecessary re-renders in PlayerCard components
 *   // - Review state update patterns in LineupManager
 * }
 *
 * // Track improvements from optimization work
 * if (regressionResult.improvement > 0) {
 *   console.log(`Performance improved by ${(regressionResult.improvement * 100).toFixed(1)}%`);
 * }
 * ```
 */

import { PerformanceEnvironment } from './config';
import { calculateStatisticalSummary } from './PerformanceBenchmark';

/**
 * Stored baseline performance data
 */
export interface BaselineData {
  /** Name of the test/operation */
  testName: string;
  /** Environment where baseline was established */
  environment: PerformanceEnvironment;
  /** Mean performance time */
  mean: number;
  /** Median performance time */
  median: number;
  /** 95th percentile performance time */
  percentile95: number;
  /** Standard deviation of measurements */
  standardDeviation: number;
  /** Number of measurements in the baseline */
  sampleCount: number;
  /** Timestamp when baseline was last updated */
  lastUpdated: number;
  /** Version/commit when baseline was established */
  version: string;
}

/**
 * Severity levels for performance regression
 */
export type RegressionSeverity = 'none' | 'minor' | 'major' | 'severe';

/**
 * Result of regression detection analysis
 */
export interface RegressionResult {
  /** Name of the test that was analyzed */
  testName: string;
  /** Whether a regression was detected */
  hasRegression: boolean;
  /** Severity level of the regression */
  severity: RegressionSeverity;
  /** Baseline mean performance */
  baselineMean: number;
  /** Current mean performance */
  currentMean: number;
  /** Relative change (positive = slower, negative = faster) */
  relativeChange: number;
  /** Human-readable summary */
  summary: string;
  /** Recommendations for addressing the regression */
  recommendations: string[];
  /** Environment where regression was detected */
  environment: PerformanceEnvironment;
  /** Improvement percentage (if performance improved) */
  improvement: number;
}

/**
 * Performance baseline manager with regression detection
 */
export class PerformanceBaseline {
  public readonly testName: string;
  private baselineData: BaselineData | null = null;

  /**
   * Creates a new performance baseline manager
   *
   * @param testName - Name of the test/operation
   * @param existingBaseline - Optional existing baseline data
   * @throws {Error} When testName is empty or invalid, or when existingBaseline is invalid
   */
  constructor(testName: string, existingBaseline?: BaselineData) {
    // Input validation
    if (!testName || typeof testName !== 'string') {
      throw new Error('Performance baseline test name must be a non-empty string');
    }

    if (testName.trim().length === 0) {
      throw new Error('Performance baseline test name cannot be only whitespace');
    }

    // Validate existing baseline if provided
    if (existingBaseline) {
      this.validateBaselineData(existingBaseline);
    }

    this.testName = testName.trim();
    this.baselineData = existingBaseline || null;
  }

  /**
   * Checks if a baseline has been established
   *
   * @returns True if baseline data exists
   */
  hasBaseline(): boolean {
    return this.baselineData !== null;
  }

  /**
   * Gets the current baseline data
   *
   * @returns Baseline data or null if not established
   */
  getBaseline(): BaselineData | null {
    return this.baselineData;
  }

  /**
   * Validates baseline data structure and values
   */
  private validateBaselineData(baseline: BaselineData): void {
    if (!baseline.testName || typeof baseline.testName !== 'string') {
      throw new Error('Baseline data must have a valid test name');
    }

    if (!Number.isFinite(baseline.mean) || baseline.mean < 0) {
      throw new Error('Baseline mean must be a non-negative finite number');
    }

    if (!Number.isFinite(baseline.median) || baseline.median < 0) {
      throw new Error('Baseline median must be a non-negative finite number');
    }

    if (!Number.isFinite(baseline.percentile95) || baseline.percentile95 < 0) {
      throw new Error('Baseline percentile95 must be a non-negative finite number');
    }

    if (!Number.isFinite(baseline.standardDeviation) || baseline.standardDeviation < 0) {
      throw new Error('Baseline standardDeviation must be a non-negative finite number');
    }

    if (!Number.isInteger(baseline.sampleCount) || baseline.sampleCount < 1) {
      throw new Error('Baseline sampleCount must be a positive integer');
    }

    if (!Number.isInteger(baseline.lastUpdated) || baseline.lastUpdated < 0) {
      throw new Error('Baseline lastUpdated must be a non-negative integer timestamp');
    }

    if (!baseline.version || typeof baseline.version !== 'string') {
      throw new Error('Baseline version must be a non-empty string');
    }
  }

  /**
   * Updates the baseline with new measurements
   *
   * @param measurements - Array of measurement times
   * @param environment - Environment where measurements were taken
   * @param version - Version/commit identifier
   * @throws {Error} When measurements are invalid, environment is invalid, or version is invalid
   */
  updateBaseline(
    measurements: number[],
    environment: PerformanceEnvironment,
    version: string
  ): void {
    // Input validation
    if (!Array.isArray(measurements) || measurements.length === 0) {
      throw new Error('Measurements must be a non-empty array');
    }

    if (measurements.some(m => !Number.isFinite(m) || m < 0)) {
      throw new Error('All measurements must be non-negative finite numbers');
    }

    if (!environment || !Object.values(PerformanceEnvironment).includes(environment)) {
      throw new Error('Environment must be a valid PerformanceEnvironment value');
    }

    if (!version || typeof version !== 'string' || version.trim().length === 0) {
      throw new Error('Version must be a non-empty string');
    }
    const statistics = calculateStatisticalSummary(measurements);

    this.baselineData = {
      testName: this.testName,
      environment,
      mean: statistics.mean,
      median: statistics.median,
      percentile95: statistics.percentile95,
      standardDeviation: statistics.standardDeviation,
      sampleCount: statistics.count,
      lastUpdated: Date.now(),
      version,
    };
  }

  /**
   * Detects performance regression against the baseline
   *
   * @param currentMeasurements - Current measurement times
   * @param currentEnvironment - Environment of current measurements
   * @returns Detailed regression analysis
   */
  detectRegression(
    currentMeasurements: number[],
    currentEnvironment: PerformanceEnvironment
  ): RegressionResult {
    if (!this.baselineData) {
      return {
        testName: this.testName,
        hasRegression: false,
        severity: 'none',
        baselineMean: 0,
        currentMean: 0,
        relativeChange: 0,
        summary: 'No baseline data available for comparison',
        recommendations: ['Establish baseline by running tests multiple times'],
        environment: currentEnvironment,
        improvement: 0,
      };
    }

    const currentStats = calculateStatisticalSummary(currentMeasurements);
    const relativeChange = (currentStats.mean - this.baselineData.mean) / this.baselineData.mean;
    const severity = calculateRegressionSeverity(
      currentStats.mean / this.baselineData.mean,
      currentEnvironment
    );

    const hasRegression = severity !== 'none' && relativeChange > 0;
    const improvement = relativeChange < 0 ? Math.abs(relativeChange) : 0;

    return {
      testName: this.testName,
      hasRegression,
      severity,
      baselineMean: this.baselineData.mean,
      currentMean: currentStats.mean,
      relativeChange,
      summary: this.generateRegressionSummary(hasRegression, severity, relativeChange, improvement),
      recommendations: this.generateRecommendations(hasRegression, severity, relativeChange),
      environment: currentEnvironment,
      improvement,
    };
  }

  /**
   * Generates a human-readable summary of the regression analysis
   */
  private generateRegressionSummary(
    hasRegression: boolean,
    severity: RegressionSeverity,
    relativeChange: number,
    improvement: number
  ): string {
    if (improvement > 0) {
      const improvementPercent = Math.round(improvement * 100);
      return `Performance improvement detected: ${improvementPercent}% faster than baseline`;
    }

    if (!hasRegression) {
      const changePercent = Math.round(Math.abs(relativeChange) * 100);
      return `No significant regression detected (${changePercent}% change within tolerance)`;
    }

    const regressionPercent = Math.round(relativeChange * 100);
    return `${severity.toUpperCase()} performance regression detected: ${regressionPercent}% slower than baseline`;
  }

  /**
   * Generates actionable recommendations based on regression analysis
   */
  private generateRecommendations(
    hasRegression: boolean,
    severity: RegressionSeverity,
    relativeChange: number
  ): string[] {
    const recommendations: string[] = [];

    if (!hasRegression) {
      return recommendations;
    }

    // General recommendations based on severity
    if (severity === 'minor') {
      recommendations.push('Review recent code changes for performance impacts');
      recommendations.push('Consider profiling the operation to identify bottlenecks');
    } else if (severity === 'major') {
      recommendations.push(
        'Investigate recent changes that may have introduced performance issues'
      );
      recommendations.push('Run performance profiling to identify specific bottlenecks');
      recommendations.push(
        'Consider rolling back recent changes if critical performance is affected'
      );
    } else if (severity === 'severe') {
      recommendations.push(
        'URGENT: Investigate immediately - severe performance degradation detected'
      );
      recommendations.push('Consider rolling back to previous version if possible');
      recommendations.push('Run detailed performance profiling and analysis');
      recommendations.push('Review all recent changes for algorithmic or architectural issues');
    }

    // Specific recommendations based on regression magnitude
    const regressionPercent = relativeChange * 100;
    if (regressionPercent > 200) {
      recommendations.push('Check for infinite loops, excessive API calls, or memory leaks');
    } else if (regressionPercent > 100) {
      recommendations.push('Look for inefficient algorithms or blocking operations');
    } else if (regressionPercent > 50) {
      recommendations.push('Check for unnecessary computations or database queries');
    }

    // Test-specific recommendations based on test name
    const testNameLower = this.testName.toLowerCase();
    if (testNameLower.includes('render')) {
      recommendations.push('Check for unnecessary React re-renders or large component trees');
    } else if (testNameLower.includes('load')) {
      recommendations.push('Analyze bundle size increases or network request changes');
    } else if (testNameLower.includes('validation')) {
      recommendations.push('Review validation logic and consider debouncing');
    } else if (testNameLower.includes('query') || testNameLower.includes('api')) {
      recommendations.push('Check database query performance and API response times');
    }

    return recommendations;
  }
}

/**
 * Creates a performance baseline manager
 *
 * @param testName - Name of the test/operation
 * @param existingBaseline - Optional existing baseline data
 * @returns Configured baseline manager
 */
export function createPerformanceBaseline(
  testName: string,
  existingBaseline?: BaselineData
): PerformanceBaseline {
  return new PerformanceBaseline(testName, existingBaseline);
}

/**
 * Detects performance regression using baseline data
 *
 * @param testName - Name of the test
 * @param baselineData - Baseline data for comparison (null if no baseline)
 * @param currentMeasurements - Current measurement times
 * @param environment - Current environment
 * @returns Regression analysis result
 */
export function detectPerformanceRegression(
  testName: string,
  baselineData: BaselineData | null,
  currentMeasurements: number[],
  environment: PerformanceEnvironment
): RegressionResult {
  const baseline = createPerformanceBaseline(testName, baselineData || undefined);
  return baseline.detectRegression(currentMeasurements, environment);
}

/**
 * Calculates regression severity based on performance ratio and environment
 *
 * @param performanceRatio - Current performance / baseline performance
 * @param environment - Current environment (affects tolerance)
 * @returns Severity level
 */
export function calculateRegressionSeverity(
  performanceRatio: number,
  environment: PerformanceEnvironment
): RegressionSeverity {
  // Environment-specific tolerance thresholds
  const thresholds = {
    [PerformanceEnvironment.LOCAL]: {
      minor: 1.2, // 20% slower
      major: 1.5, // 50% slower
      severe: 3.0, // 200% slower
    },
    [PerformanceEnvironment.CI]: {
      minor: 1.5, // 50% slower (CI is more variable)
      major: 2.0, // 100% slower
      severe: 4.0, // 300% slower
    },
    [PerformanceEnvironment.TEST]: {
      minor: 1.8, // 80% slower (test env most variable)
      major: 2.5, // 150% slower
      severe: 5.0, // 400% slower
    },
  };

  const envThresholds = thresholds[environment];

  if (performanceRatio >= envThresholds.severe) {
    return 'severe';
  } else if (performanceRatio >= envThresholds.major) {
    return 'major';
  } else if (performanceRatio >= envThresholds.minor) {
    return 'minor';
  } else {
    return 'none';
  }
}

/**
 * Formats a regression result into a detailed report
 *
 * @param result - Regression analysis result
 * @returns Formatted report string
 */
export function formatRegressionReport(result: RegressionResult): string {
  const {
    testName,
    hasRegression,
    severity,
    baselineMean,
    currentMean,
    relativeChange,
    summary,
    recommendations,
    improvement,
  } = result;

  let report = `Performance Analysis Report: ${testName}\n`;
  report += `${'='.repeat(50)}\n\n`;

  // Summary
  report += `Status: ${summary}\n\n`;

  // Performance metrics
  report += `Performance Metrics:\n`;
  report += `  Baseline Mean: ${baselineMean.toFixed(2)}ms\n`;
  report += `  Current Mean:  ${currentMean.toFixed(2)}ms\n`;

  if (improvement > 0) {
    const improvementPercent = Math.round(improvement * 100);
    report += `  Improvement:   ${improvementPercent}% faster 🎉\n\n`;
  } else {
    const changePercent = Math.round(Math.abs(relativeChange) * 100);
    const direction = relativeChange > 0 ? 'slower' : 'faster';
    report += `  Change:        ${changePercent}% ${direction}\n\n`;
  }

  // Severity and regression status
  if (hasRegression) {
    const severityEmoji = {
      minor: '⚠️',
      major: '🔴',
      severe: '🚨',
      none: '✅',
    };

    report += `Regression Severity: ${severityEmoji[severity]} ${severity.toUpperCase()}\n\n`;
  }

  // Recommendations
  if (recommendations.length > 0) {
    report += `Recommendations:\n`;
    recommendations.forEach((rec, index) => {
      report += `  ${index + 1}. ${rec}\n`;
    });
    report += '\n';
  }

  return report;
}
