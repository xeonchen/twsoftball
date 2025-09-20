/* eslint-env node -- Required for process.env access in performance tests */
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PerformanceEnvironment } from './config';
import {
  PerformanceBenchmark,
  BenchmarkResult as _BenchmarkResult,
  StatisticalSummary as _StatisticalSummary,
  createPerformanceBenchmark,
  calculatePercentile,
  calculateStatisticalSummary,
  runBenchmark,
} from './PerformanceBenchmark';

describe('PerformanceBenchmark', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PerformanceBenchmark class', () => {
    it('should create benchmark with default configuration', () => {
      const benchmark = new PerformanceBenchmark('test-operation');

      expect(benchmark.name).toBe('test-operation');
      expect(benchmark.config.warmupRuns).toBeGreaterThan(0);
      expect(benchmark.config.measurementRuns).toBeGreaterThan(0);
      expect(benchmark.config.percentile).toBeGreaterThanOrEqual(50);
    });

    it('should create benchmark with custom configuration', () => {
      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 2.0,
        warmupRuns: 3,
        measurementRuns: 7,
        percentile: 90,
      };

      const benchmark = new PerformanceBenchmark('ci-test', customConfig);

      expect(benchmark.name).toBe('ci-test');
      expect(benchmark.config.environment).toBe(PerformanceEnvironment.CI);
      expect(benchmark.config.warmupRuns).toBe(3);
      expect(benchmark.config.measurementRuns).toBe(7);
      expect(benchmark.config.percentile).toBe(90);
    });

    it('should run warm-up operations without measurement', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const benchmark = new PerformanceBenchmark('warmup-test', {
        warmupRuns: 2,
        measurementRuns: 1,
        percentile: 95,
        thresholdMultiplier: 1.5,
        environment: PerformanceEnvironment.LOCAL,
      });

      await benchmark.run(mockOperation);

      // Should call operation warmupRuns + measurementRuns times
      expect(mockOperation).toHaveBeenCalledTimes(3); // 2 + 1
    });

    it('should measure performance and return statistical summary', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const benchmark = new PerformanceBenchmark('stats-test', {
        warmupRuns: 1,
        measurementRuns: 5,
        percentile: 95,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      });

      const result = await benchmark.run(mockOperation);

      expect(result.name).toBe('stats-test');
      expect(result.measurements.length).toBe(5);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.mean).toBeGreaterThanOrEqual(0);
      expect(result.statistics.median).toBeGreaterThanOrEqual(0);
      expect(result.statistics.percentile95).toBeGreaterThanOrEqual(0);
      expect(result.statistics.min).toBeLessThanOrEqual(result.statistics.max);
      expect(result.thresholdTime).toBe(result.statistics.percentile95);
    });

    it('should handle operation failures gracefully', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const benchmark = new PerformanceBenchmark('error-test', {
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      });

      await expect(benchmark.run(mockOperation)).rejects.toThrow('Operation failed');
    });

    it('should handle mixed success/failure during warmup', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Warmup failure'))
        .mockResolvedValue(undefined);

      const benchmark = new PerformanceBenchmark('mixed-test', {
        warmupRuns: 2,
        measurementRuns: 1,
        percentile: 95,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      });

      // Should throw during warmup
      await expect(benchmark.run(mockOperation)).rejects.toThrow('Warmup failure');
    });

    it('should provide accurate timing measurements', async () => {
      const delay = 50; // 50ms delay
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, delay)));

      const benchmark = new PerformanceBenchmark('timing-test', {
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      });

      const result = await benchmark.run(mockOperation);

      // Measurements should be close to the delay (allowing for some variance)
      result.measurements.forEach(measurement => {
        expect(measurement).toBeGreaterThan(delay * 0.8); // At least 80% of expected
        expect(measurement).toBeLessThan(delay * 3); // Less than 3x expected (generous for test environments)
      });

      expect(result.statistics.mean).toBeGreaterThan(delay * 0.8);
    });
  });

  describe('createPerformanceBenchmark helper', () => {
    it('should create benchmark with current environment config', () => {
      const benchmark = createPerformanceBenchmark('helper-test');

      expect(benchmark).toBeInstanceOf(PerformanceBenchmark);
      expect(benchmark.name).toBe('helper-test');
    });

    it('should create benchmark with custom config', () => {
      const customConfig = {
        warmupRuns: 5,
        measurementRuns: 10,
      };

      const benchmark = createPerformanceBenchmark('custom-test', customConfig);

      expect(benchmark.config.warmupRuns).toBe(5);
      expect(benchmark.config.measurementRuns).toBe(10);
    });
  });

  describe('calculatePercentile utility', () => {
    it('should calculate percentiles correctly for sorted data', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      expect(calculatePercentile(data, 50)).toBe(55); // Median of 50,60
      expect(calculatePercentile(data, 90)).toBe(91); // 90th percentile
      expect(calculatePercentile(data, 95)).toBe(95.5); // 95th percentile
      expect(calculatePercentile(data, 100)).toBe(100); // Maximum
    });

    it('should calculate percentiles correctly for unsorted data', () => {
      const data = [90, 10, 50, 30, 70, 20, 80, 40, 100, 60];

      expect(calculatePercentile(data, 50)).toBe(55); // Should sort first
      expect(calculatePercentile(data, 95)).toBe(95.5);
    });

    it('should handle edge cases', () => {
      // Single value
      expect(calculatePercentile([42], 50)).toBe(42);
      expect(calculatePercentile([42], 95)).toBe(42);

      // Two values
      expect(calculatePercentile([10, 20], 50)).toBe(15);
      expect(calculatePercentile([10, 20], 95)).toBe(19.5);

      // Empty array should throw
      expect(() => calculatePercentile([], 50)).toThrow();
    });

    it('should validate percentile values', () => {
      const data = [1, 2, 3, 4, 5];

      expect(() => calculatePercentile(data, -1)).toThrow();
      expect(() => calculatePercentile(data, 101)).toThrow();
      expect(() => calculatePercentile(data, 0)).toThrow();
    });
  });

  describe('calculateStatisticalSummary utility', () => {
    it('should calculate all statistics correctly', () => {
      const measurements = [10, 20, 30, 40, 50];
      const summary = calculateStatisticalSummary(measurements);

      expect(summary.count).toBe(5);
      expect(summary.min).toBe(10);
      expect(summary.max).toBe(50);
      expect(summary.mean).toBe(30);
      expect(summary.median).toBe(30);
      expect(summary.percentile95).toBe(48); // 95th percentile for [10,20,30,40,50]
      expect(summary.standardDeviation).toBeGreaterThan(0);
    });

    it('should handle single measurement', () => {
      const measurements = [42];
      const summary = calculateStatisticalSummary(measurements);

      expect(summary.count).toBe(1);
      expect(summary.min).toBe(42);
      expect(summary.max).toBe(42);
      expect(summary.mean).toBe(42);
      expect(summary.median).toBe(42);
      expect(summary.percentile95).toBe(42);
      expect(summary.standardDeviation).toBe(0);
    });

    it('should calculate standard deviation correctly', () => {
      const measurements = [10, 10, 10, 10, 10]; // No variance
      const summary = calculateStatisticalSummary(measurements);

      expect(summary.standardDeviation).toBe(0);

      const measurements2 = [1, 2, 3, 4, 5];
      const summary2 = calculateStatisticalSummary(measurements2);

      expect(summary2.standardDeviation).toBeGreaterThan(0);
      expect(summary2.standardDeviation).toBeCloseTo(1.414, 1); // √2 ≈ 1.414
    });

    it('should handle empty array gracefully', () => {
      expect(() => calculateStatisticalSummary([])).toThrow();
    });
  });

  describe('runBenchmark utility function', () => {
    it('should run benchmark with default configuration', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);

      const result = await runBenchmark('utility-test', mockOperation);

      expect(result.name).toBe('utility-test');
      expect(result.measurements.length).toBeGreaterThan(0);
      expect(result.statistics).toBeDefined();
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should run benchmark with custom configuration', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const customConfig = {
        warmupRuns: 2,
        measurementRuns: 4,
        percentile: 90,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      };

      const result = await runBenchmark('custom-utility-test', mockOperation, customConfig);

      expect(result.name).toBe('custom-utility-test');
      expect(result.measurements.length).toBe(4);
      expect(mockOperation).toHaveBeenCalledTimes(6); // 2 warmup + 4 measurement
    });

    it('should propagate operation errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Utility test error'));

      await expect(runBenchmark('error-utility-test', mockOperation)).rejects.toThrow(
        'Utility test error'
      );
    });
  });

  describe('environment configuration integration', () => {
    it('should adapt benchmark runs based on environment', () => {
      // CI environment should have more runs
      const ciBenchmark = new PerformanceBenchmark('ci-benchmark', {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 2.5,
        warmupRuns: 2,
        measurementRuns: 5,
        percentile: 95,
      });

      expect(ciBenchmark.config.measurementRuns).toBe(5);

      // Local environment should have fewer runs
      const localBenchmark = new PerformanceBenchmark('local-benchmark', {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 1.5,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      expect(localBenchmark.config.measurementRuns).toBe(3);
    });

    it('should respect environment variable overrides', () => {
      process.env.PERF_MEASUREMENT_RUNS = '8';
      process.env.PERF_PERCENTILE = '99';

      const benchmark = createPerformanceBenchmark('env-override-test');

      expect(benchmark.config.measurementRuns).toBe(8);
      expect(benchmark.config.percentile).toBe(99);
    });
  });

  describe('performance regression detection', () => {
    it('should identify performance characteristics consistently', async () => {
      const predictableOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)));

      const benchmark = new PerformanceBenchmark('regression-test', {
        warmupRuns: 1,
        measurementRuns: 5,
        percentile: 95,
        thresholdMultiplier: 1.0,
        environment: PerformanceEnvironment.LOCAL,
      });

      const result1 = await benchmark.run(predictableOperation);
      const result2 = await benchmark.run(predictableOperation);

      // Results should be similar (allowing for some variance)
      const diff = Math.abs(result1.thresholdTime - result2.thresholdTime);
      const average = (result1.thresholdTime + result2.thresholdTime) / 2;
      const relativeVariance = diff / average;

      expect(relativeVariance).toBeLessThan(0.5); // Less than 50% variance
    });
  });
});
