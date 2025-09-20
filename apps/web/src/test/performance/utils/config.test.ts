/* eslint-env node -- Required for process.env access in performance tests */
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  PerformanceEnvironment,
  EnvironmentConfig,
  getEnvironmentConfig,
  detectEnvironment,
  getEnvironmentMultiplier,
} from './config';

describe('Performance Test Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectEnvironment', () => {
    it('should detect CI environment when CI=true', () => {
      process.env.CI = 'true';
      expect(detectEnvironment()).toBe(PerformanceEnvironment.CI);
    });

    it('should detect CI environment when NODE_ENV=ci', () => {
      process.env.NODE_ENV = 'ci';
      expect(detectEnvironment()).toBe(PerformanceEnvironment.CI);
    });

    it('should detect test environment when NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.VITEST;
      delete process.env.CI;
      expect(detectEnvironment()).toBe(PerformanceEnvironment.TEST);
    });

    it('should detect local environment when VITEST=true and no CI', () => {
      process.env.VITEST = 'true';
      delete process.env.CI;
      delete process.env.NODE_ENV;
      expect(detectEnvironment()).toBe(PerformanceEnvironment.LOCAL);
    });

    it('should default to local environment when no indicators present', () => {
      delete process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      expect(detectEnvironment()).toBe(PerformanceEnvironment.LOCAL);
    });
  });

  describe('getEnvironmentMultiplier', () => {
    it('should return CI multiplier for CI environment', () => {
      expect(getEnvironmentMultiplier(PerformanceEnvironment.CI)).toBe(2.5);
    });

    it('should return local multiplier for local environment', () => {
      expect(getEnvironmentMultiplier(PerformanceEnvironment.LOCAL)).toBe(1.5);
    });

    it('should return test multiplier for test environment', () => {
      expect(getEnvironmentMultiplier(PerformanceEnvironment.TEST)).toBe(3.0);
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return default configuration for CI environment', () => {
      process.env.CI = 'true';
      const config = getEnvironmentConfig();

      expect(config.environment).toBe(PerformanceEnvironment.CI);
      expect(config.thresholdMultiplier).toBe(2.5);
      expect(config.warmupRuns).toBe(2);
      expect(config.measurementRuns).toBe(5);
      expect(config.percentile).toBe(95);
    });

    it('should return default configuration for local environment', () => {
      process.env.VITEST = 'true';
      delete process.env.CI;
      delete process.env.NODE_ENV;
      const config = getEnvironmentConfig();

      expect(config.environment).toBe(PerformanceEnvironment.LOCAL);
      expect(config.thresholdMultiplier).toBe(1.5);
      expect(config.warmupRuns).toBe(1);
      expect(config.measurementRuns).toBe(3);
      expect(config.percentile).toBe(95);
    });

    it('should return default configuration for test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.VITEST;
      delete process.env.CI;
      const config = getEnvironmentConfig();

      expect(config.environment).toBe(PerformanceEnvironment.TEST);
      expect(config.thresholdMultiplier).toBe(3.0);
      expect(config.warmupRuns).toBe(3);
      expect(config.measurementRuns).toBe(7);
      expect(config.percentile).toBe(95);
    });

    it('should allow custom configuration override', () => {
      const customConfig: Partial<EnvironmentConfig> = {
        warmupRuns: 5,
        measurementRuns: 10,
        percentile: 90,
      };

      const config = getEnvironmentConfig(customConfig);

      expect(config.warmupRuns).toBe(5);
      expect(config.measurementRuns).toBe(10);
      expect(config.percentile).toBe(90);
      // Should preserve other defaults
      expect(config.thresholdMultiplier).toBeGreaterThan(0);
    });

    it('should respect environment variable overrides', () => {
      process.env.PERF_THRESHOLD_MULTIPLIER = '2.0';
      process.env.PERF_WARMUP_RUNS = '4';
      process.env.PERF_MEASUREMENT_RUNS = '6';
      process.env.PERF_PERCENTILE = '99';

      const config = getEnvironmentConfig();

      expect(config.thresholdMultiplier).toBe(2.0);
      expect(config.warmupRuns).toBe(4);
      expect(config.measurementRuns).toBe(6);
      expect(config.percentile).toBe(99);
    });

    it('should ignore invalid environment variable values', () => {
      process.env.PERF_THRESHOLD_MULTIPLIER = 'invalid';
      process.env.PERF_WARMUP_RUNS = 'not-a-number';
      process.env.PERF_PERCENTILE = '150'; // Invalid percentile

      const config = getEnvironmentConfig();

      // Should fall back to defaults when invalid values provided
      expect(config.thresholdMultiplier).toBeGreaterThan(0);
      expect(config.warmupRuns).toBeGreaterThan(0);
      expect(config.percentile).toBeLessThanOrEqual(100);
      expect(config.percentile).toBeGreaterThanOrEqual(50);
    });
  });

  describe('EnvironmentConfig validation', () => {
    it('should validate percentile is within valid range', () => {
      const config = getEnvironmentConfig({ percentile: 120 });
      expect(config.percentile).toBeLessThanOrEqual(100);

      const config2 = getEnvironmentConfig({ percentile: 0 });
      expect(config2.percentile).toBeGreaterThanOrEqual(50);
    });

    it('should validate run counts are positive', () => {
      const config = getEnvironmentConfig({
        warmupRuns: -1,
        measurementRuns: 0,
      });

      expect(config.warmupRuns).toBeGreaterThan(0);
      expect(config.measurementRuns).toBeGreaterThan(0);
    });

    it('should validate threshold multiplier is positive', () => {
      const config = getEnvironmentConfig({ thresholdMultiplier: -1 });
      expect(config.thresholdMultiplier).toBeGreaterThan(0);
    });
  });
});
