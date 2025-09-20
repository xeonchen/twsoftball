/**
 * Performance Threshold Management with Environment Adaptation
 *
 * Core business logic: Different environments (CI, local, test) have different
 * performance characteristics for softball game UI. This class adapts thresholds
 * automatically based on environment detection to prevent false positives in CI
 * while maintaining strict standards for local development.
 *
 * Softball Game Context: UI responsiveness is critical for game recording workflow.
 * Slow responses during lineup entry, player switching, or at-bat recording disrupts
 * the natural flow of the game and can lead to data entry errors or missed plays.
 *
 * Features:
 * - Environment-aware threshold adaptation (CI: 2.5x, Local: 1.5x, Test: 3.0x)
 * - Detailed validation results with game-specific context
 * - Actionable performance suggestions for softball UI optimization
 * - Configurable multipliers for different deployment environments
 * - Graceful error handling with fallback to sensible defaults
 *
 * @example
 * ```typescript
 * // Create threshold for lineup rendering (critical for game setup)
 * const lineupThreshold = new PerformanceThreshold('lineup-render', 2000);
 *
 * // Validate lineup rendering performance
 * const result = lineupThreshold.validate(2500);
 * if (!result.passed) {
 *   console.error(`Lineup rendering too slow: ${result.message}`);
 *   console.log('Optimization suggestions:', result.suggestions);
 *   // Suggests virtualization, memoization, or component splitting
 * }
 *
 * // Environment adaptation example
 * // Local: 2000ms * 1.5 = 3000ms threshold
 * // CI: 2000ms * 2.5 = 5000ms threshold
 * // Test: 2000ms * 3.0 = 6000ms threshold
 * ```
 */

import {
  PerformanceEnvironment,
  EnvironmentConfig,
  getEnvironmentConfig,
  getEnvironmentMultiplier,
} from './config';

/**
 * Result of performance threshold validation
 */
export interface ThresholdValidationResult {
  /** Whether the performance test passed the threshold */
  passed: boolean;
  /** Actual measured time in milliseconds */
  actualTime: number;
  /** Adaptive threshold that was applied (base * multiplier) */
  threshold: number;
  /** Original base threshold before environment adaptation */
  baseThreshold: number;
  /** Environment multiplier that was applied */
  multiplier: number;
  /** Performance environment where test was executed */
  environment: PerformanceEnvironment;
  /** Human-readable validation message */
  message: string;
  /** Test/operation name for context */
  name: string;
  /** Actionable suggestions for performance improvement */
  suggestions: string[];
}

/**
 * Performance threshold management with environment adaptation
 */
export class PerformanceThreshold {
  public readonly name: string;
  public readonly baseThreshold: number;
  public readonly adaptiveThreshold: number;
  public readonly environment: PerformanceEnvironment;
  public readonly multiplier: number;
  private readonly config: EnvironmentConfig;

  /**
   * Creates a new performance threshold
   *
   * @param name - Name of the test/operation
   * @param baseThreshold - Base threshold in milliseconds (for ideal conditions)
   * @param customConfig - Optional custom environment configuration
   * @throws {Error} When name is empty or invalid, or when baseThreshold is invalid
   */
  constructor(name: string, baseThreshold: number, customConfig?: Partial<EnvironmentConfig>) {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new Error('Performance threshold name must be a non-empty string');
    }

    if (name.trim().length === 0) {
      throw new Error('Performance threshold name cannot be only whitespace');
    }

    if (!Number.isFinite(baseThreshold) || baseThreshold <= 0) {
      throw new Error('Base threshold must be a positive finite number');
    }

    this.name = name.trim();
    this.baseThreshold = baseThreshold;
    this.config = getEnvironmentConfig(customConfig);
    this.environment = this.config.environment;
    this.multiplier = this.config.thresholdMultiplier;
    this.adaptiveThreshold = this.baseThreshold * this.multiplier;
  }

  /**
   * Validates actual performance against the adaptive threshold
   *
   * @param actualTime - Actual measured time in milliseconds
   * @returns Detailed validation result
   */
  validate(actualTime: number): ThresholdValidationResult {
    // Input validation
    if (!Number.isFinite(actualTime) || actualTime < 0) {
      throw new Error('Actual time must be a non-negative finite number');
    }

    const passed = actualTime <= this.adaptiveThreshold;
    const suggestions = this.generateSuggestions(actualTime, passed);
    const message = formatThresholdMessage({
      passed,
      actualTime,
      threshold: this.adaptiveThreshold,
      baseThreshold: this.baseThreshold,
      multiplier: this.multiplier,
      environment: this.environment,
      name: this.name,
      suggestions,
    });

    return {
      passed,
      actualTime,
      threshold: this.adaptiveThreshold,
      baseThreshold: this.baseThreshold,
      multiplier: this.multiplier,
      environment: this.environment,
      message,
      name: this.name,
      suggestions,
    };
  }

  /**
   * Generates performance improvement suggestions
   *
   * @param actualTime - Actual measured time
   * @param passed - Whether the threshold was met
   * @returns Array of actionable suggestions
   */
  private generateSuggestions(actualTime: number, passed: boolean): string[] {
    const suggestions: string[] = [];

    if (!passed) {
      const overageRatio = actualTime / this.adaptiveThreshold;

      // General suggestions based on overage severity
      if (overageRatio > 2) {
        suggestions.push('Consider major algorithmic optimizations or caching strategies');
        suggestions.push('Profile the operation to identify primary bottlenecks');
      } else if (overageRatio > 1.5) {
        suggestions.push('Look for opportunities to optimize expensive operations');
        suggestions.push('Consider reducing the scope or complexity of the operation');
      } else {
        suggestions.push('Minor optimizations may be sufficient to meet threshold');
      }

      // Environment-specific suggestions
      if (this.environment === PerformanceEnvironment.CI) {
        suggestions.push('CI environments are typically slower - this may pass in local testing');
        suggestions.push('Consider if this test requires the full CI performance threshold');
      } else if (this.environment === PerformanceEnvironment.TEST) {
        suggestions.push(
          'Test environments have high variance - try running the test multiple times'
        );
      }

      // Operation-specific suggestions based on name patterns
      if (this.name.toLowerCase().includes('render')) {
        suggestions.push('Consider using React.memo() or useMemo() for expensive renders');
        suggestions.push('Check for unnecessary re-renders with React DevTools');
      } else if (this.name.toLowerCase().includes('validation')) {
        suggestions.push('Consider debouncing validation requests');
        suggestions.push('Cache validation results when possible');
      } else if (this.name.toLowerCase().includes('load')) {
        suggestions.push('Implement lazy loading or code splitting');
        suggestions.push('Optimize bundle size and reduce initial JavaScript');
      }
    } else if (actualTime > this.baseThreshold) {
      // Passed adaptive threshold but exceeded base threshold
      suggestions.push(
        `Performance is within ${this.environment} environment limits but slower than base threshold`
      );
      suggestions.push('Consider optimizations for better consistency across environments');
    }

    return suggestions;
  }
}

/**
 * Creates a performance threshold with current environment configuration
 *
 * @param name - Name of the test/operation
 * @param baseThreshold - Base threshold in milliseconds
 * @param customConfig - Optional custom configuration
 * @returns Configured performance threshold
 */
export function createPerformanceThreshold(
  name: string,
  baseThreshold: number,
  customConfig?: Partial<EnvironmentConfig>
): PerformanceThreshold {
  return new PerformanceThreshold(name, baseThreshold, customConfig);
}

/**
 * Adapts a threshold for a specific environment
 *
 * @param baseThreshold - Base threshold in milliseconds
 * @param environment - Target environment
 * @param customMultiplier - Optional custom multiplier (overrides environment default)
 * @returns Adaptive threshold
 */
export function adaptThresholdForEnvironment(
  baseThreshold: number,
  environment: PerformanceEnvironment,
  customMultiplier?: number
): number {
  const multiplier = customMultiplier ?? getEnvironmentMultiplier(environment);
  return baseThreshold * multiplier;
}

/**
 * Validates performance against an adaptive threshold
 *
 * @param actualTime - Actual measured time in milliseconds
 * @param name - Name of the test/operation
 * @param baseThreshold - Base threshold in milliseconds
 * @param customConfig - Optional custom configuration
 * @returns Validation result
 */
export function validateThreshold(
  actualTime: number,
  name: string,
  baseThreshold: number,
  customConfig?: Partial<EnvironmentConfig>
): ThresholdValidationResult {
  const threshold = createPerformanceThreshold(name, baseThreshold, customConfig);
  return threshold.validate(actualTime);
}

/**
 * Formats a threshold validation result into a human-readable message
 *
 * @param result - Validation result to format
 * @returns Formatted message string
 */
export function formatThresholdMessage(result: ThresholdValidationResult): string {
  const {
    passed,
    actualTime,
    threshold,
    baseThreshold,
    multiplier,
    environment,
    name,
    suggestions,
  } = result;

  const status = passed ? 'passed' : 'exceeded';
  const baseMessage =
    `Performance test '${name}' ${status}: ${actualTime}ms (threshold: ${threshold}ms, ` +
    `base: ${baseThreshold}ms, ${environment} multiplier: ${multiplier}x)`;

  if (passed) {
    return baseMessage;
  }

  // Add suggestions for failing tests
  let message = baseMessage;
  if (suggestions.length > 0) {
    message += '\n\nSuggestions for improvement:';
    suggestions.forEach((suggestion, index) => {
      message += `\n  ${index + 1}. ${suggestion}`;
    });
  }

  return message;
}
