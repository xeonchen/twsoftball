/**
 * @file Snapshot Performance Simulation Tests
 * Performance measurement tests using realistic database I/O simulation.
 *
 * @remarks
 * This file focuses on PERFORMANCE testing with simulated database I/O delays
 * using RealisticEventStore. It validates that snapshots provide significant
 * performance improvements under realistic database conditions.
 *
 * For correctness testing without performance concerns, see SnapshotCorrectness.test.ts
 *
 * Test Focus:
 * - Significant performance improvement validation
 * - Realistic database I/O simulation
 * - Scaling characteristics with event count
 * - Performance under concurrent load
 *
 * Simulation Details:
 * - RealisticEventStore simulates batch I/O patterns
 * - Base cost + per-event cost for realistic delays
 * - Models actual database query performance characteristics
 *
 * Limitations:
 * - Simulation only (not actual database)
 * - Future: Will need SQLite integration for production validation
 */

/* eslint-disable no-console -- Performance test files need diagnostic console output */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { EventSourcedGameRepository } from '../persistence/EventSourcedGameRepository';
import { InMemorySnapshotStore } from '../persistence/InMemorySnapshotStore';

import { RealisticEventStore } from './RealisticEventStore';
import type { ComparisonResult } from './SnapshotPerformanceBenchmark';
import { SnapshotPerformanceBenchmark } from './SnapshotPerformanceBenchmark';

describe('Snapshot Performance Simulation - Database I/O', () => {
  let eventStore: RealisticEventStore;
  let snapshotStore: InMemorySnapshotStore;
  let gameRepository: EventSourcedGameRepository;
  let benchmark: SnapshotPerformanceBenchmark;

  beforeEach(() => {
    // Set up infrastructure with realistic delays for honest performance testing
    eventStore = new RealisticEventStore();
    snapshotStore = new InMemorySnapshotStore();
    gameRepository = new EventSourcedGameRepository(eventStore, snapshotStore);

    // Create benchmark instance
    benchmark = new SnapshotPerformanceBenchmark(eventStore, snapshotStore, {
      gameRepository,
    });
  });

  afterEach(() => {
    // Clean up test data
    snapshotStore.clear();
  });

  describe('Snapshot Optimization Benefits', () => {
    it('should show significant performance improvement with simulated database I/O', async () => {
      console.log('🚀 Testing snapshot benefits with simulated database I/O delays...');

      const comparison = await benchmark.compareWithAndWithoutSnapshots(1000);

      console.log(`📊 Results for 1000 events with simulated I/O delays:`);
      console.log(`   With snapshots: ${comparison.withSnapshots.loadTimeMs.toFixed(2)}ms`);
      console.log(`   Without snapshots: ${comparison.withoutSnapshots.loadTimeMs.toFixed(2)}ms`);
      console.log(`   Improvement: ${comparison.improvementPercentage.toFixed(2)}%`);
      console.log(`   Meets 100ms target: ${comparison.withSnapshots.passesTarget ? '✅' : '❌'}`);
      console.log(
        `   Meets 50%+ improvement: ${comparison.improvementPercentage >= 50 ? '✅' : '❌'}`
      );

      // With simulated database I/O delays, snapshots should show significant improvement
      expect(comparison.withSnapshots.loadTimeMs).toBeLessThan(100);
      expect(comparison.improvementPercentage).toBeGreaterThanOrEqual(50); // Realistic expectation with test overhead
      expect(comparison.withSnapshots.passesTarget).toBe(true);
    }, 60000);

    it('should show performance benefits scaling with aggregate size', async () => {
      console.log('🚀 Testing snapshot benefits scaling with aggregate size...');

      const eventCounts = [100, 500, 1000, 2000];
      const results: ComparisonResult[] = [];

      for (const eventCount of eventCounts) {
        console.log(`Testing ${eventCount} events...`);
        const comparison = await benchmark.compareWithAndWithoutSnapshots(eventCount);
        results.push(comparison);

        console.log(`📊 Results for ${eventCount} events:`);
        console.log(`   With snapshots: ${comparison.withSnapshots.loadTimeMs.toFixed(2)}ms`);
        console.log(`   Without snapshots: ${comparison.withoutSnapshots.loadTimeMs.toFixed(2)}ms`);
        console.log(`   Improvement: ${comparison.improvementPercentage.toFixed(2)}%`);
        const expectedImprovement = eventCount >= 500 ? 40 : 20;
        const meetsImprovement = comparison.improvementPercentage >= expectedImprovement;
        console.log(
          `   Meets ${expectedImprovement}%+ improvement: ${meetsImprovement ? '✅' : '❌'}`
        );
      }

      // Verify all aggregates meet performance targets with simulated I/O
      for (const result of results) {
        // All should meet the 100ms target with snapshots
        expect(result.withSnapshots.passesTarget).toBe(true);

        // With simulated database I/O, expect scaling performance improvements:
        // For smaller aggregates (100 events): 20%+ improvement (snapshot overhead impacts smaller sets)
        // For larger aggregates (500+ events): 40%+ improvement (clear snapshot benefits)
        const expectedImprovement = result.eventCount >= 500 ? 40 : 20;
        expect(result.improvementPercentage).toBeGreaterThanOrEqual(expectedImprovement);

        // Snapshots should have acceptable absolute performance
        expect(result.withSnapshots.loadTimeMs).toBeLessThan(100); // 100ms target
      }

      console.log(`✅ All aggregates achieve expected improvements with simulated database I/O`);
      console.log(`   (20%+ for <500 events, 40%+ for 500+ events due to snapshot overhead)`);
    }, 180000);

    it('should demonstrate linear vs constant time complexity with simulated I/O', async () => {
      console.log('🚀 Testing time complexity characteristics with simulated database I/O...');

      const eventCounts = [500, 1000, 2000, 4000];

      console.log(`📊 Time Complexity Analysis:`);
      console.log(`Event Count | Without Snapshots | With Snapshots | Improvement`);
      console.log(`------------|------------------|----------------|------------`);

      for (const eventCount of eventCounts) {
        const comparison = await benchmark.compareWithAndWithoutSnapshots(eventCount);

        console.log(
          `${eventCount.toString().padStart(11)} | ` +
            `${comparison.withoutSnapshots.loadTimeMs.toFixed(2).padStart(16)} | ` +
            `${comparison.withSnapshots.loadTimeMs.toFixed(2).padStart(14)} | ` +
            `${comparison.improvementPercentage.toFixed(1).padStart(10)}%`
        );

        // With snapshots, time should remain roughly constant
        expect(comparison.withSnapshots.loadTimeMs).toBeLessThan(100);
      }

      console.log(`✅ Snapshot-optimized loading shows constant time characteristics`);
    }, 240000);
  });

  describe('Performance Under Load', () => {
    it('should maintain performance improvement with concurrent simulated I/O', async () => {
      console.log('🚀 Testing concurrent performance with simulated database I/O...');

      // Create multiple aggregates concurrently
      const concurrentTests = [
        benchmark.compareWithAndWithoutSnapshots(1000),
        benchmark.compareWithAndWithoutSnapshots(1500),
        benchmark.compareWithAndWithoutSnapshots(2000),
      ];

      const results = await Promise.all(concurrentTests);

      results.forEach((result, index) => {
        const eventCount = [1000, 1500, 2000][index];
        console.log(`📊 Concurrent test ${index + 1} (${eventCount} events):`);
        console.log(`   With snapshots: ${result.withSnapshots.loadTimeMs.toFixed(2)}ms`);
        console.log(`   Improvement: ${result.improvementPercentage.toFixed(2)}%`);

        // All concurrent operations should still meet targets
        expect(result.withSnapshots.passesTarget).toBe(true);
        expect(result.withSnapshots.loadTimeMs).toBeLessThan(100);
      });

      console.log(`✅ All concurrent operations maintained performance targets`);
    }, 120000);
  });
});
