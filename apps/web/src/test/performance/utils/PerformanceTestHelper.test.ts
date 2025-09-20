/* eslint-env node -- Required for process.env access in performance tests */
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PerformanceEnvironment } from './config';
import {
  PerformanceTestHelper,
  PerformanceTestResult as _PerformanceTestResult,
  createPerformanceTestHelper,
  runPerformanceTest,
} from './PerformanceTestHelper';

describe('PerformanceTestHelper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PerformanceTestHelper class', () => {
    it('should create helper with default configuration', () => {
      const helper = new PerformanceTestHelper('test-operation');

      expect(helper.testName).toBe('test-operation');
      expect(helper.config).toBeDefined();
      expect(helper.config.warmupRuns).toBeGreaterThan(0);
      expect(helper.config.measurementRuns).toBeGreaterThan(0);
    });

    it('should create helper with custom configuration', () => {
      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 2.0,
        warmupRuns: 3,
        measurementRuns: 7,
        percentile: 90,
      };

      const helper = new PerformanceTestHelper('ci-test', 1000, undefined, customConfig);

      expect(helper.testName).toBe('ci-test');
      expect(helper.config.environment).toBe(PerformanceEnvironment.CI);
      expect(helper.config.warmupRuns).toBe(3);
      expect(helper.config.measurementRuns).toBe(7);
    });

    it('should run complete performance test with threshold validation', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const helper = new PerformanceTestHelper('complete-test', 200, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(mockOperation);

      expect(result.testName).toBe('complete-test');
      expect(result.passed).toBeDefined();
      expect(result.benchmarkResult).toBeDefined();
      expect(result.thresholdResult).toBeDefined();
      expect(result.regressionResult).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Should have run warmup + measurement runs
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 warmup + 3 measurement
    });

    it('should detect passing performance', async () => {
      const fastOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10)) // 10ms operation
      );

      const helper = new PerformanceTestHelper('fast-test', 100, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(fastOperation);

      expect(result.passed).toBe(true);
      expect(result.thresholdResult.passed).toBe(true);
      expect(result.summary).toContain('PASSED');
    });

    it('should detect failing performance', async () => {
      const slowOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 150)) // 150ms operation
      );

      const helper = new PerformanceTestHelper('slow-test', 50, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 1.5,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(slowOperation);

      expect(result.passed).toBe(false);
      expect(result.thresholdResult.passed).toBe(false);
      expect(result.summary).toContain('EXCEEDED');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should integrate with baseline for regression detection', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 30)));

      // Create helper with existing baseline
      const baselineData = {
        testName: 'baseline-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 20,
        median: 20,
        percentile95: 25,
        standardDeviation: 5,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const helper = new PerformanceTestHelper('baseline-test', 100, baselineData, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(mockOperation);

      expect(result.regressionResult.hasRegression).toBe(true); // 30ms vs 20ms baseline = 50% increase
      expect(result.regressionResult.severity).toBe('major'); // 50% is major regression in local environment
      expect(result.summary).toContain('Regression Analysis');
    });

    it('should handle operation failures gracefully', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const helper = new PerformanceTestHelper('failing-test', 100);

      await expect(helper.runTest(failingOperation)).rejects.toThrow('Operation failed');
    });

    it('should provide comprehensive summary', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 25)));

      const helper = new PerformanceTestHelper('summary-test', 100, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(mockOperation);

      expect(result.summary).toContain('summary-test');
      expect(result.summary).toContain('PASSED');
      expect(result.summary).toContain('ms');
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(50); // Detailed summary
    });

    it('should update baseline after successful test', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 15)));

      const helper = new PerformanceTestHelper('update-baseline-test', 100, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(mockOperation, {
        updateBaseline: true,
        version: '1.1.0',
      });

      expect(result.baselineUpdated).toBe(true);
      expect(helper.baseline.hasBaseline()).toBe(true);
      const baseline = helper.baseline.getBaseline();
      expect(baseline?.version).toBe('1.1.0');
    });

    it('should provide detailed recommendations', async () => {
      const slowRenderOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      const helper = new PerformanceTestHelper('slow-render-test', 50, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 1.5,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(slowRenderOperation);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some(r => r.includes('render') || r.includes('optimization'))
      ).toBe(true);
    });
  });

  describe('createPerformanceTestHelper helper', () => {
    it('should create helper with default settings', () => {
      const helper = createPerformanceTestHelper('helper-test', 1000);

      expect(helper).toBeInstanceOf(PerformanceTestHelper);
      expect(helper.testName).toBe('helper-test');
    });

    it('should create helper with all parameters', () => {
      const baselineData = {
        testName: 'full-helper-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 150,
        median: 145,
        percentile95: 180,
        standardDeviation: 20,
        sampleCount: 8,
        lastUpdated: Date.now(),
        version: '2.0.0',
      };

      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 3.0,
        warmupRuns: 2,
        measurementRuns: 5,
        percentile: 90,
      };

      const helper = createPerformanceTestHelper(
        'full-helper-test',
        500,
        baselineData,
        customConfig
      );

      expect(helper.testName).toBe('full-helper-test');
      expect(helper.baseline.hasBaseline()).toBe(true);
      expect(helper.config.environment).toBe(PerformanceEnvironment.CI);
    });
  });

  describe('runPerformanceTest utility function', () => {
    it('should run complete performance test', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 20)));

      const result = await runPerformanceTest('utility-test', 100, mockOperation);

      expect(result.testName).toBe('utility-test');
      expect(result.passed).toBeDefined();
      expect(result.benchmarkResult).toBeDefined();
      expect(result.thresholdResult).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should run test with custom configuration', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 25)));

      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 2.5,
        warmupRuns: 2,
        measurementRuns: 4,
        percentile: 90,
      };

      const result = await runPerformanceTest(
        'custom-utility-test',
        200,
        mockOperation,
        undefined,
        customConfig
      );

      expect(result.testName).toBe('custom-utility-test');
      expect(mockOperation).toHaveBeenCalledTimes(6); // 2 warmup + 4 measurement
    });

    it('should run test with baseline and options', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 18)));

      const baselineData = {
        testName: 'baseline-utility-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 15,
        median: 15,
        percentile95: 18,
        standardDeviation: 3,
        sampleCount: 5,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const result = await runPerformanceTest(
        'baseline-utility-test',
        50,
        mockOperation,
        baselineData,
        undefined,
        { updateBaseline: true, version: '1.1.0' }
      );

      expect(result.testName).toBe('baseline-utility-test');
      expect(result.baselineUpdated).toBe(true);
    });
  });

  describe('integration with all utilities', () => {
    it('should provide complete performance analysis', async () => {
      const testOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 40)));

      // Start with a baseline
      const originalBaseline = {
        testName: 'integration-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 30,
        median: 30,
        percentile95: 35,
        standardDeviation: 5,
        sampleCount: 10,
        lastUpdated: Date.now() - 86400000, // 1 day ago
        version: '1.0.0',
      };

      const helper = new PerformanceTestHelper('integration-test', 100, originalBaseline, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 5,
        percentile: 95,
      });

      const result = await helper.runTest(testOperation, {
        updateBaseline: false, // Don't update baseline
        version: '1.1.0',
      });

      // Should pass threshold (40ms < 200ms threshold)
      expect(result.thresholdResult.passed).toBe(true);

      // Should detect minor regression (40ms vs 30ms baseline)
      expect(result.regressionResult.hasRegression).toBe(true);
      expect(result.regressionResult.severity).toBe('minor');

      // Should provide comprehensive analysis
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.benchmarkResult.statistics).toBeDefined();

      // Should not update baseline
      expect(result.baselineUpdated).toBe(false);
    });

    it('should handle edge case of no baseline with performance failure', async () => {
      const verySlowOperation = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 300)));

      const helper = new PerformanceTestHelper('no-baseline-failure', 50, undefined, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 1.5,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      const result = await helper.runTest(verySlowOperation);

      // Should fail threshold
      expect(result.passed).toBe(false);
      expect(result.thresholdResult.passed).toBe(false);

      // Should not detect regression (no baseline)
      expect(result.regressionResult.hasRegression).toBe(false);

      // Should provide helpful summary and recommendations
      expect(result.summary).toContain('EXCEEDED');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('environment variable integration', () => {
    it('should respect environment variable overrides', async () => {
      process.env.PERF_THRESHOLD_MULTIPLIER = '3.0';
      process.env.PERF_MEASUREMENT_RUNS = '7';

      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const helper = createPerformanceTestHelper('env-override-test', 100);

      await helper.runTest(mockOperation);

      expect(helper.config.thresholdMultiplier).toBe(3.0);
      expect(helper.config.measurementRuns).toBe(7);
      expect(mockOperation).toHaveBeenCalledTimes(8); // 1 warmup + 7 measurement (default warmup)
    });
  });
});
