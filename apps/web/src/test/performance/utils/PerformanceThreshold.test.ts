/* eslint-env node -- Required for process.env access in performance tests */
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PerformanceEnvironment } from './config';
import {
  PerformanceThreshold,
  createPerformanceThreshold,
  adaptThresholdForEnvironment,
  validateThreshold,
  formatThresholdMessage,
} from './PerformanceThreshold';

describe('PerformanceThreshold', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PerformanceThreshold class', () => {
    it('should create threshold with basic parameters', () => {
      const threshold = new PerformanceThreshold('render', 1000);

      expect(threshold.name).toBe('render');
      expect(threshold.baseThreshold).toBe(1000);
      expect(threshold.adaptiveThreshold).toBeGreaterThan(1000);
      expect(threshold.environment).toBeDefined();
      expect(threshold.multiplier).toBeGreaterThan(1);
    });

    it('should create threshold with custom config', () => {
      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 2.0,
        warmupRuns: 3,
        measurementRuns: 5,
        percentile: 90,
      };

      const threshold = new PerformanceThreshold('validation', 500, customConfig);

      expect(threshold.name).toBe('validation');
      expect(threshold.baseThreshold).toBe(500);
      expect(threshold.environment).toBe(PerformanceEnvironment.CI);
      expect(threshold.multiplier).toBe(2.0);
      expect(threshold.adaptiveThreshold).toBe(1000); // 500 * 2.0
    });

    it('should validate performance against adaptive threshold', () => {
      const threshold = new PerformanceThreshold('test', 100, {
        environment: PerformanceEnvironment.LOCAL,
        thresholdMultiplier: 2.0,
        warmupRuns: 1,
        measurementRuns: 3,
        percentile: 95,
      });

      // Should pass when under threshold
      const passingResult = threshold.validate(150); // Under 200 (100 * 2.0)
      expect(passingResult.passed).toBe(true);
      expect(passingResult.actualTime).toBe(150);
      expect(passingResult.threshold).toBe(200);
      expect(passingResult.message).toContain('passed');

      // Should fail when over threshold
      const failingResult = threshold.validate(250); // Over 200
      expect(failingResult.passed).toBe(false);
      expect(failingResult.actualTime).toBe(250);
      expect(failingResult.threshold).toBe(200);
      expect(failingResult.message).toContain('exceeded');
    });

    it('should provide detailed validation results', () => {
      const threshold = new PerformanceThreshold('load-test', 1000);
      const result = threshold.validate(1500);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('actualTime');
      expect(result).toHaveProperty('threshold');
      expect(result).toHaveProperty('baseThreshold');
      expect(result).toHaveProperty('multiplier');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('suggestions');

      expect(result.baseThreshold).toBe(1000);
      expect(typeof result.message).toBe('string');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should provide helpful suggestions when threshold exceeded', () => {
      const threshold = new PerformanceThreshold('slow-operation', 100);
      const result = threshold.validate(500);

      expect(result.passed).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      // Check for algorithm or optimization suggestions instead
      expect(
        result.suggestions.some(s => s.includes('optimization') || s.includes('environment'))
      ).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      const threshold = new PerformanceThreshold('edge-case', 1);

      // Zero time should pass
      const zeroResult = threshold.validate(0);
      expect(zeroResult.passed).toBe(true);

      // Negative time should throw an error due to validation
      expect(() => {
        threshold.validate(-10);
      }).toThrow('Actual time must be a non-negative finite number');
    });
  });

  describe('createPerformanceThreshold helper', () => {
    it('should create threshold with default environment config', () => {
      const threshold = createPerformanceThreshold('helper-test', 1000);

      expect(threshold).toBeInstanceOf(PerformanceThreshold);
      expect(threshold.name).toBe('helper-test');
      expect(threshold.baseThreshold).toBe(1000);
    });

    it('should create threshold with custom config', () => {
      const customConfig = {
        environment: PerformanceEnvironment.CI,
        thresholdMultiplier: 3.0,
        warmupRuns: 2,
        measurementRuns: 4,
        percentile: 90,
      };

      const threshold = createPerformanceThreshold('ci-test', 800, customConfig);

      expect(threshold.environment).toBe(PerformanceEnvironment.CI);
      expect(threshold.multiplier).toBe(3.0);
      expect(threshold.adaptiveThreshold).toBe(2400); // 800 * 3.0
    });
  });

  describe('adaptThresholdForEnvironment utility', () => {
    it('should adapt threshold for CI environment', () => {
      const adapted = adaptThresholdForEnvironment(1000, PerformanceEnvironment.CI);
      expect(adapted).toBe(2500); // 1000 * 2.5 (default CI multiplier)
    });

    it('should adapt threshold for local environment', () => {
      const adapted = adaptThresholdForEnvironment(1000, PerformanceEnvironment.LOCAL);
      expect(adapted).toBe(1500); // 1000 * 1.5 (default local multiplier)
    });

    it('should adapt threshold for test environment', () => {
      const adapted = adaptThresholdForEnvironment(1000, PerformanceEnvironment.TEST);
      expect(adapted).toBe(3000); // 1000 * 3.0 (default test multiplier)
    });

    it('should handle custom multiplier', () => {
      const adapted = adaptThresholdForEnvironment(500, PerformanceEnvironment.LOCAL, 2.0);
      expect(adapted).toBe(1000); // 500 * 2.0
    });
  });

  describe('validateThreshold utility', () => {
    it('should validate passing performance', () => {
      const result = validateThreshold(100, 'fast-test', 150);

      expect(result.passed).toBe(true);
      expect(result.actualTime).toBe(100);
      expect(result.threshold).toBeGreaterThan(150); // Should be adapted
      expect(result.message).toContain('passed');
    });

    it('should validate failing performance', () => {
      const result = validateThreshold(2000, 'slow-test', 500);

      expect(result.passed).toBe(false);
      expect(result.actualTime).toBe(2000);
      expect(result.threshold).toBeGreaterThan(500); // Should be adapted
      expect(result.message).toContain('exceeded');
    });

    it('should include environment context in result', () => {
      const result = validateThreshold(100, 'context-test', 200);

      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('multiplier');
      expect(result).toHaveProperty('baseThreshold');
      expect(result.baseThreshold).toBe(200);
    });
  });

  describe('formatThresholdMessage utility', () => {
    it('should format passing message correctly', () => {
      const message = formatThresholdMessage({
        passed: true,
        actualTime: 150,
        threshold: 200,
        baseThreshold: 100,
        multiplier: 2.0,
        environment: PerformanceEnvironment.LOCAL,
        name: 'test-operation',
        suggestions: [],
      });

      expect(message).toContain('test-operation');
      expect(message).toContain('passed');
      expect(message).toContain('150ms');
      expect(message).toContain('200ms');
      expect(message).toContain('local');
    });

    it('should format failing message with suggestions', () => {
      const suggestions = ['Optimize algorithm', 'Reduce memory usage'];
      const message = formatThresholdMessage({
        passed: false,
        actualTime: 500,
        threshold: 300,
        baseThreshold: 200,
        multiplier: 1.5,
        environment: PerformanceEnvironment.LOCAL,
        name: 'slow-operation',
        suggestions,
      });

      expect(message).toContain('slow-operation');
      expect(message).toContain('exceeded');
      expect(message).toContain('500ms');
      expect(message).toContain('300ms');
      expect(message).toContain('Optimize algorithm');
      expect(message).toContain('Reduce memory usage');
    });

    it('should handle missing suggestions gracefully', () => {
      const message = formatThresholdMessage({
        passed: false,
        actualTime: 500,
        threshold: 300,
        baseThreshold: 200,
        multiplier: 1.5,
        environment: PerformanceEnvironment.CI,
        name: 'no-suggestions',
        suggestions: [],
      });

      expect(message).toContain('no-suggestions');
      expect(message).toContain('exceeded');
      expect(message).not.toContain('Suggestions:');
    });
  });

  describe('environment variable overrides', () => {
    it('should respect PERF_THRESHOLD_MULTIPLIER override', () => {
      process.env.PERF_THRESHOLD_MULTIPLIER = '4.0';

      const threshold = createPerformanceThreshold('override-test', 100);
      expect(threshold.multiplier).toBe(4.0);
      expect(threshold.adaptiveThreshold).toBe(400);
    });

    it('should ignore invalid environment overrides', () => {
      process.env.PERF_THRESHOLD_MULTIPLIER = 'invalid';

      const threshold = createPerformanceThreshold('invalid-test', 100);
      expect(threshold.multiplier).toBeGreaterThan(0);
      expect(threshold.adaptiveThreshold).toBeGreaterThan(100);
    });
  });

  describe('error handling', () => {
    it('should handle invalid threshold values', () => {
      // Test that negative thresholds are rejected
      expect(() => {
        new PerformanceThreshold('invalid-threshold', -100);
      }).toThrow('Base threshold must be a positive finite number');

      // Test that zero thresholds are rejected
      expect(() => {
        new PerformanceThreshold('invalid-threshold', 0);
      }).toThrow('Base threshold must be a positive finite number');

      // Test that non-finite thresholds are rejected
      expect(() => {
        new PerformanceThreshold('invalid-threshold', NaN);
      }).toThrow('Base threshold must be a positive finite number');
    });

    it('should handle extremely large thresholds', () => {
      const threshold = new PerformanceThreshold('large-threshold', Number.MAX_SAFE_INTEGER);
      expect(threshold.baseThreshold).toBe(Number.MAX_SAFE_INTEGER);
      expect(threshold.adaptiveThreshold).toBeGreaterThan(Number.MAX_SAFE_INTEGER / 2);
    });
  });
});
