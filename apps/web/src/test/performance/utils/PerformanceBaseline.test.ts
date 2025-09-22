/* eslint-env node -- Required for process.env access in performance tests */
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PerformanceEnvironment } from './config';
import {
  PerformanceBaseline,
  BaselineData,
  RegressionResult,
  createPerformanceBaseline,
  detectPerformanceRegression,
  calculateRegressionSeverity,
  formatRegressionReport,
} from './PerformanceBaseline';

describe('PerformanceBaseline', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PerformanceBaseline class', () => {
    it('should create baseline without existing data', () => {
      const baseline = new PerformanceBaseline('new-test');

      expect(baseline.testName).toBe('new-test');
      expect(baseline.hasBaseline()).toBe(false);
      expect(baseline.getBaseline()).toBeNull();
    });

    it('should create baseline with existing data', () => {
      const existingData: BaselineData = {
        testName: 'existing-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 95,
        percentile95: 120,
        standardDeviation: 15,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('existing-test', existingData);

      expect(baseline.testName).toBe('existing-test');
      expect(baseline.hasBaseline()).toBe(true);
      expect(baseline.getBaseline()).toEqual(existingData);
    });

    it('should update baseline with new measurements', () => {
      const baseline = new PerformanceBaseline('update-test');

      const measurements = [80, 90, 100, 110, 120];
      baseline.updateBaseline(measurements, PerformanceEnvironment.LOCAL, '1.0.1');

      expect(baseline.hasBaseline()).toBe(true);
      const data = baseline.getBaseline();
      expect(data?.testName).toBe('update-test');
      expect(data?.mean).toBe(100); // Average of measurements
      expect(data?.sampleCount).toBe(5);
      expect(data?.environment).toBe(PerformanceEnvironment.LOCAL);
      expect(data?.version).toBe('1.0.1');
    });

    it('should detect no regression for similar performance', () => {
      const baselineData: BaselineData = {
        testName: 'regression-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('regression-test', baselineData);
      const currentMeasurements = [95, 100, 105, 110, 115]; // Similar performance

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result.hasRegression).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.summary).toContain('No significant regression');
    });

    it('should detect minor regression', () => {
      const baselineData: BaselineData = {
        testName: 'minor-regression',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('minor-regression', baselineData);
      const currentMeasurements = [110, 115, 120, 125, 130]; // 15-25% slower

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result.hasRegression).toBe(true);
      expect(result.severity).toBe('minor');
      expect(result.currentMean).toBeGreaterThan(baselineData.mean);
    });

    it('should detect major regression', () => {
      const baselineData: BaselineData = {
        testName: 'major-regression',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('major-regression', baselineData);
      const currentMeasurements = [180, 190, 200, 210, 220]; // 80%+ slower

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result.hasRegression).toBe(true);
      expect(result.severity).toBe('major');
      expect(result.currentMean).toBeGreaterThan(baselineData.mean * 1.5);
    });

    it('should detect severe regression', () => {
      const baselineData: BaselineData = {
        testName: 'severe-regression',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('severe-regression', baselineData);
      const currentMeasurements = [350, 400, 450, 500, 550]; // 3x+ slower

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result.hasRegression).toBe(true);
      expect(result.severity).toBe('severe');
      expect(result.currentMean).toBeGreaterThan(baselineData.mean * 3);
    });

    it('should handle performance improvements', () => {
      const baselineData: BaselineData = {
        testName: 'improvement-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 200,
        median: 200,
        percentile95: 240,
        standardDeviation: 20,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('improvement-test', baselineData);
      const currentMeasurements = [80, 90, 100, 110, 120]; // 50% faster

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result.hasRegression).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.improvement).toBeDefined();
      expect(result.improvement).toBeGreaterThan(0);
    });

    it('should account for environment differences', () => {
      const baselineData: BaselineData = {
        testName: 'env-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('env-test', baselineData);
      const currentMeasurements = [120, 130, 140, 150, 160]; // 20-60% slower (mean=140, 40% slower)

      // Same measurements should have different regression detection in CI vs LOCAL
      const localResult = baseline.detectRegression(
        currentMeasurements,
        PerformanceEnvironment.LOCAL
      );
      const ciResult = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.CI);

      expect(localResult.hasRegression).toBe(true);
      expect(ciResult.hasRegression).toBe(false); // More tolerance for CI
    });

    it('should provide detailed regression analysis', () => {
      const baselineData: BaselineData = {
        testName: 'detailed-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const baseline = new PerformanceBaseline('detailed-test', baselineData);
      const currentMeasurements = [130, 140, 150, 160, 170];

      const result = baseline.detectRegression(currentMeasurements, PerformanceEnvironment.LOCAL);

      expect(result).toHaveProperty('testName');
      expect(result).toHaveProperty('hasRegression');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('baselineMean');
      expect(result).toHaveProperty('currentMean');
      expect(result).toHaveProperty('relativeChange');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('createPerformanceBaseline helper', () => {
    it('should create baseline without existing data', () => {
      const baseline = createPerformanceBaseline('helper-test');

      expect(baseline).toBeInstanceOf(PerformanceBaseline);
      expect(baseline.testName).toBe('helper-test');
      expect(baseline.hasBaseline()).toBe(false);
    });

    it('should create baseline with existing data', () => {
      const data: BaselineData = {
        testName: 'helper-with-data',
        environment: PerformanceEnvironment.CI,
        mean: 150,
        median: 145,
        percentile95: 180,
        standardDeviation: 20,
        sampleCount: 8,
        lastUpdated: Date.now(),
        version: '2.0.0',
      };

      const baseline = createPerformanceBaseline('helper-with-data', data);

      expect(baseline.hasBaseline()).toBe(true);
      expect(baseline.getBaseline()).toEqual(data);
    });
  });

  describe('detectPerformanceRegression utility', () => {
    it('should detect regression using baseline data', () => {
      const baselineData: BaselineData = {
        testName: 'utility-test',
        environment: PerformanceEnvironment.LOCAL,
        mean: 100,
        median: 100,
        percentile95: 120,
        standardDeviation: 10,
        sampleCount: 10,
        lastUpdated: Date.now(),
        version: '1.0.0',
      };

      const currentMeasurements = [150, 160, 170, 180, 190];

      const result = detectPerformanceRegression(
        'utility-test',
        baselineData,
        currentMeasurements,
        PerformanceEnvironment.LOCAL
      );

      expect(result.hasRegression).toBe(true);
      expect(result.testName).toBe('utility-test');
    });

    it('should handle missing baseline gracefully', () => {
      const currentMeasurements = [100, 110, 120, 130, 140];

      const result = detectPerformanceRegression(
        'no-baseline-test',
        null,
        currentMeasurements,
        PerformanceEnvironment.LOCAL
      );

      expect(result.hasRegression).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.summary).toContain('No baseline');
    });
  });

  describe('calculateRegressionSeverity utility', () => {
    it('should calculate severity levels correctly', () => {
      expect(calculateRegressionSeverity(1.05, PerformanceEnvironment.LOCAL)).toBe('none'); // 5% increase
      expect(calculateRegressionSeverity(1.25, PerformanceEnvironment.LOCAL)).toBe('minor'); // 25% increase
      expect(calculateRegressionSeverity(1.75, PerformanceEnvironment.LOCAL)).toBe('major'); // 75% increase
      expect(calculateRegressionSeverity(3.5, PerformanceEnvironment.LOCAL)).toBe('severe'); // 250% increase
    });

    it('should adjust thresholds for CI environment', () => {
      // CI should be more tolerant
      expect(calculateRegressionSeverity(1.4, PerformanceEnvironment.CI)).toBe('none');
      expect(calculateRegressionSeverity(1.6, PerformanceEnvironment.CI)).toBe('minor');
      expect(calculateRegressionSeverity(2.5, PerformanceEnvironment.CI)).toBe('major');
    });

    it('should adjust thresholds for test environment', () => {
      // Test environment should be most tolerant
      expect(calculateRegressionSeverity(1.6, PerformanceEnvironment.TEST)).toBe('none');
      expect(calculateRegressionSeverity(2.0, PerformanceEnvironment.TEST)).toBe('minor');
      expect(calculateRegressionSeverity(3.5, PerformanceEnvironment.TEST)).toBe('major');
    });
  });

  describe('formatRegressionReport utility', () => {
    it('should format regression report with details', () => {
      const regressionResult: RegressionResult = {
        testName: 'format-test',
        hasRegression: true,
        severity: 'major',
        baselineMean: 100,
        currentMean: 175,
        relativeChange: 0.75,
        summary: 'Performance regression detected',
        recommendations: ['Optimize algorithm', 'Review recent changes'],
        environment: PerformanceEnvironment.LOCAL,
        improvement: 0,
      };

      const report = formatRegressionReport(regressionResult);

      expect(report).toContain('format-test');
      expect(report).toContain('MAJOR'); // Check for uppercase version
      expect(report).toContain('75%');
      expect(report).toContain('100.00ms'); // Check for formatted version
      expect(report).toContain('175.00ms'); // Check for formatted version
      expect(report).toContain('Optimize algorithm');
      expect(report).toContain('Review recent changes');
    });

    it('should format improvement report', () => {
      const improvementResult: RegressionResult = {
        testName: 'improvement-test',
        hasRegression: false,
        severity: 'none',
        baselineMean: 200,
        currentMean: 120,
        relativeChange: -0.4,
        summary: 'Performance improvement detected',
        recommendations: [],
        environment: PerformanceEnvironment.LOCAL,
        improvement: 0.4,
      };

      const report = formatRegressionReport(improvementResult);

      expect(report).toContain('improvement-test');
      expect(report).toContain('improvement');
      expect(report).toContain('40%');
      expect(report).toContain('200.00ms'); // Check for formatted version
      expect(report).toContain('120.00ms'); // Check for formatted version
    });

    it('should format no-regression report', () => {
      const noRegressionResult: RegressionResult = {
        testName: 'stable-test',
        hasRegression: false,
        severity: 'none',
        baselineMean: 100,
        currentMean: 105,
        relativeChange: 0.05,
        summary: 'No significant regression detected',
        recommendations: [],
        environment: PerformanceEnvironment.LOCAL,
        improvement: 0,
      };

      const report = formatRegressionReport(noRegressionResult);

      expect(report).toContain('stable-test');
      expect(report).toContain('No significant regression');
      expect(report).toContain('5%');
    });
  });

  describe('baseline data persistence simulation', () => {
    it('should handle baseline update workflow', () => {
      // Start without baseline
      const baseline = new PerformanceBaseline('persistence-test');
      expect(baseline.hasBaseline()).toBe(false);

      // Update with initial measurements
      const initialMeasurements = [90, 100, 110, 120, 130];
      baseline.updateBaseline(initialMeasurements, PerformanceEnvironment.LOCAL, '1.0.0');
      expect(baseline.hasBaseline()).toBe(true);

      // Simulate regression detection
      const newMeasurements = [140, 150, 160, 170, 180];
      const result = baseline.detectRegression(newMeasurements, PerformanceEnvironment.LOCAL);
      expect(result.hasRegression).toBe(true);

      // Update baseline with new measurements (accepting the regression)
      baseline.updateBaseline(newMeasurements, PerformanceEnvironment.LOCAL, '1.1.0');
      const updatedBaseline = baseline.getBaseline();
      expect(updatedBaseline?.version).toBe('1.1.0');
      expect(updatedBaseline?.mean).toBe(160); // New baseline mean
    });
  });
});
