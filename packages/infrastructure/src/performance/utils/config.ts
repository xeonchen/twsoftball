/* eslint-env node -- Required for process.env access in performance test configuration */
declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Performance Test Configuration for Infrastructure Package
 *
 * Provides environment-aware configuration for infrastructure performance tests,
 * allowing adaptive thresholds and measurement parameters based on
 * the execution environment (CI, local development, test).
 *
 * Features:
 * - Environment detection (CI/local/test)
 * - Configurable threshold multipliers
 * - Snapshot performance configuration
 * - Environment variable overrides
 * - Validation and fallback values
 *
 * @example
 * ```typescript
 * const config = getEnvironmentConfig();
 * console.log(`Running in ${config.environment} with ${config.thresholdMultiplier}x multiplier`);
 * ```
 */

/**
 * Performance test execution environments
 */
export enum PerformanceEnvironment {
  /** Continuous Integration environment (GitHub Actions, etc.) */
  CI = 'ci',
  /** Local development environment */
  LOCAL = 'local',
  /** Test environment (usually slower, more thorough) */
  TEST = 'test',
}

/**
 * Environment-specific configuration for infrastructure performance tests
 */
export interface EnvironmentConfig {
  /** Current execution environment */
  environment: PerformanceEnvironment;
  /** Multiplier for performance thresholds (accounts for environment variance) */
  thresholdMultiplier: number;
  /** Number of warm-up runs before measurement */
  warmupRuns: number;
  /** Number of measurement runs for statistical analysis */
  measurementRuns: number;
  /** Base improvement percentage threshold */
  baseImprovementThreshold: number;
}

/**
 * Default configurations for each environment
 */
const DEFAULT_CONFIGS: Record<PerformanceEnvironment, EnvironmentConfig> = {
  [PerformanceEnvironment.CI]: {
    environment: PerformanceEnvironment.CI,
    thresholdMultiplier: 0.8, // CI environments - more lenient thresholds
    warmupRuns: 2,
    measurementRuns: 5,
    baseImprovementThreshold: 60, // 60% improvement required in CI
  },
  [PerformanceEnvironment.LOCAL]: {
    environment: PerformanceEnvironment.LOCAL,
    thresholdMultiplier: 1.0, // Local development - standard thresholds
    warmupRuns: 3,
    measurementRuns: 10,
    baseImprovementThreshold: 70, // 70% improvement required locally
  },
  [PerformanceEnvironment.TEST]: {
    environment: PerformanceEnvironment.TEST,
    thresholdMultiplier: 0.7, // Test environments - most lenient
    warmupRuns: 1,
    measurementRuns: 3,
    baseImprovementThreshold: 50, // 50% improvement required in test
  },
};

/**
 * Detects the current execution environment based on environment variables
 *
 * @returns The detected performance environment
 */
export function detectEnvironment(): PerformanceEnvironment {
  // Check for CI indicators first (highest priority)
  if (process.env['CI'] === 'true' || process.env['NODE_ENV'] === 'ci') {
    return PerformanceEnvironment.CI;
  }

  // Check for local development indicators (VITEST indicates local testing)
  if (process.env['VITEST'] === 'true' || process.env['NODE_ENV'] === 'development') {
    return PerformanceEnvironment.LOCAL;
  }

  // Check for explicit test environment (lowest priority for NODE_ENV=test)
  if (process.env['NODE_ENV'] === 'test') {
    return PerformanceEnvironment.TEST;
  }

  // Default to local development if no specific indicators found
  return PerformanceEnvironment.LOCAL;
}

/**
 * Gets the threshold multiplier for a specific environment
 *
 * @param environment - The performance environment
 * @returns The threshold multiplier for the environment
 */
export function getEnvironmentMultiplier(environment: PerformanceEnvironment): number {
  return DEFAULT_CONFIGS[environment].thresholdMultiplier;
}

/**
 * Gets environment-specific configuration for performance tests
 *
 * @param overrides - Optional configuration overrides
 * @returns Complete environment configuration
 */
export function getEnvironmentConfig(overrides?: Partial<EnvironmentConfig>): EnvironmentConfig {
  const environment = detectEnvironment();
  const baseConfig = DEFAULT_CONFIGS[environment];

  // Apply environment variable overrides
  const envOverrides: Partial<EnvironmentConfig> = {};

  if (process.env['PERF_THRESHOLD_MULTIPLIER']) {
    const multiplier = parseFloat(process.env['PERF_THRESHOLD_MULTIPLIER']);
    if (!isNaN(multiplier) && multiplier > 0) {
      envOverrides.thresholdMultiplier = multiplier;
    }
  }

  if (process.env['PERF_IMPROVEMENT_THRESHOLD']) {
    const threshold = parseInt(process.env['PERF_IMPROVEMENT_THRESHOLD'], 10);
    if (!isNaN(threshold) && threshold > 0 && threshold <= 100) {
      envOverrides.baseImprovementThreshold = threshold;
    }
  }

  // Merge configurations: base -> env overrides -> user overrides
  const config = {
    ...baseConfig,
    ...envOverrides,
    ...overrides,
  };

  // Validate and sanitize configuration
  return {
    ...config,
    thresholdMultiplier: Math.max(0.1, config.thresholdMultiplier),
    warmupRuns: Math.max(0, config.warmupRuns),
    measurementRuns: Math.max(1, config.measurementRuns),
    baseImprovementThreshold: Math.max(0, Math.min(100, config.baseImprovementThreshold)),
  };
}

/**
 * Calculates the effective improvement threshold based on environment
 *
 * @param baseThreshold - The base improvement threshold percentage
 * @param environment - Optional environment (auto-detected if not provided)
 * @returns The effective threshold percentage for the current environment
 */
export function getEffectiveImprovementThreshold(
  baseThreshold: number = 70,
  environment?: PerformanceEnvironment
): number {
  const env = environment || detectEnvironment();
  const config = getEnvironmentConfig();

  if (env === PerformanceEnvironment.CI) {
    return config.baseImprovementThreshold;
  }

  return baseThreshold;
}
