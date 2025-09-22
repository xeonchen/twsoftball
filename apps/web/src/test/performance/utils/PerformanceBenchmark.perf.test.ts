/* eslint-env node -- Required for process.env access in performance tests */

import { describe, it, expect, vi } from 'vitest';

import { PerformanceEnvironment } from './config';
import { PerformanceBenchmark } from './PerformanceBenchmark';

describe('PerformanceBenchmark Performance Tests', () => {
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

      expect(relativeVariance).toBeLessThan(0.5); // Fixed 50% variance threshold for local testing
    });
  });
});
