/* eslint-env node -- Required for process.env access in performance test configuration */
declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Performance Test Configuration
 *
 * Provides environment-aware configuration for performance tests,
 * allowing adaptive thresholds and measurement parameters based on
 * the execution environment (CI, local development, test).
 *
 * Features:
 * - Environment detection (CI/local/test)
 * - Configurable threshold multipliers
 * - Statistical measurement configuration
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
 * Environment-specific configuration for performance tests
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
  /** Percentile to use for threshold comparison (e.g., 95 = 95th percentile) */
  percentile: number;
}

/**
 * Default configurations for each environment
 */
const DEFAULT_CONFIGS: Record<PerformanceEnvironment, EnvironmentConfig> = {
  [PerformanceEnvironment.CI]: {
    environment: PerformanceEnvironment.CI,
    thresholdMultiplier: 2.5, // CI environments are typically slower
    warmupRuns: 2,
    measurementRuns: 5,
    percentile: 95,
  },
  [PerformanceEnvironment.LOCAL]: {
    environment: PerformanceEnvironment.LOCAL,
    thresholdMultiplier: 1.5, // Local development, moderate variance
    warmupRuns: 1,
    measurementRuns: 3,
    percentile: 95,
  },
  [PerformanceEnvironment.TEST]: {
    environment: PerformanceEnvironment.TEST,
    thresholdMultiplier: 3.0, // Test environments may have highest variance
    warmupRuns: 3,
    measurementRuns: 7,
    percentile: 95,
  },
};

/**
 * Detects the current execution environment based on environment variables
 *
 * @returns The detected performance environment
 */
export function detectEnvironment(): PerformanceEnvironment {
  // Check for CI indicators first (highest priority)
  if (process.env.CI === 'true' || process.env.NODE_ENV === 'ci') {
    return PerformanceEnvironment.CI;
  }

  // Check for local development indicators (VITEST indicates local testing)
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'development') {
    return PerformanceEnvironment.LOCAL;
  }

  // Check for explicit test environment (lowest priority for NODE_ENV=test)
  if (process.env.NODE_ENV === 'test') {
    return PerformanceEnvironment.TEST;
  }

  // Default to local
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
 * Validates and normalizes configuration values
 *
 * @param config - Configuration to validate
 * @returns Validated configuration with fallbacks applied
 */
function validateConfig(config: EnvironmentConfig): EnvironmentConfig {
  return {
    ...config,
    thresholdMultiplier: Math.max(0.1, config.thresholdMultiplier),
    warmupRuns: Math.max(1, Math.floor(config.warmupRuns)),
    measurementRuns: Math.max(1, Math.floor(config.measurementRuns)),
    percentile: Math.min(100, Math.max(50, config.percentile)),
  };
}

/**
 * Parses environment variable overrides
 *
 * @param baseConfig - Base configuration to override
 * @returns Configuration with environment variable overrides applied
 */
function applyEnvironmentOverrides(baseConfig: EnvironmentConfig): EnvironmentConfig {
  const config = { ...baseConfig };

  // Parse threshold multiplier override
  const thresholdOverride = process.env.PERF_THRESHOLD_MULTIPLIER;
  if (thresholdOverride) {
    const parsed = parseFloat(thresholdOverride);
    if (!isNaN(parsed) && parsed > 0) {
      config.thresholdMultiplier = parsed;
    }
  }

  // Parse warmup runs override
  const warmupOverride = process.env.PERF_WARMUP_RUNS;
  if (warmupOverride) {
    const parsed = parseInt(warmupOverride, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.warmupRuns = parsed;
    }
  }

  // Parse measurement runs override
  const measurementOverride = process.env.PERF_MEASUREMENT_RUNS;
  if (measurementOverride) {
    const parsed = parseInt(measurementOverride, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.measurementRuns = parsed;
    }
  }

  // Parse percentile override
  const percentileOverride = process.env.PERF_PERCENTILE;
  if (percentileOverride) {
    const parsed = parseFloat(percentileOverride);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) {
      config.percentile = parsed;
    }
  }

  return config;
}

/**
 * Gets the environment-aware configuration for performance tests
 *
 * @param customConfig - Optional custom configuration overrides
 * @returns Complete environment configuration
 *
 * @example
 * ```typescript
 * // Get default configuration for current environment
 * const config = getEnvironmentConfig();
 *
 * // Override specific settings
 * const customConfig = getEnvironmentConfig({
 *   warmupRuns: 5,
 *   measurementRuns: 10
 * });
 * ```
 */
export function getEnvironmentConfig(customConfig?: Partial<EnvironmentConfig>): EnvironmentConfig {
  const environment = detectEnvironment();
  const baseConfig = DEFAULT_CONFIGS[environment];

  // Merge with custom overrides
  const mergedConfig = {
    ...baseConfig,
    ...customConfig,
  };

  // Apply environment variable overrides
  const configWithEnvOverrides = applyEnvironmentOverrides(mergedConfig);

  // Validate and return
  return validateConfig(configWithEnvOverrides);
}
