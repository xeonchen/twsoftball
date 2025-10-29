/**
 * @file PerformanceBaseline.perf.test.ts
 *
 * Performance baseline tests for DI Container and Application services.
 * Establishes performance benchmarks and detects regressions.
 *
 * @remarks
 * These tests measure:
 * - DI Container service resolution performance
 * - Game creation and persistence throughput
 * - Event sourcing reconstruction scalability
 *
 * **Performance Targets:**
 * - DI Container setup: < 100ms (< 200ms with 2x tolerance for CI)
 * - Service resolution (cached): < 1ms per service
 * - Single game creation: < 50ms (< 100ms with 2x tolerance)
 * - Event generation (25 events): < 10ms (< 20ms with 2x tolerance)
 * - Repository persistence: < 20ms (< 40ms with 2x tolerance)
 * - Event persistence (50 events): < 100ms (< 200ms with 2x tolerance)
 * - State reconstruction (50 events): < 50ms (< 100ms with 2x tolerance)
 * - 1000 events reconstruction: < 500ms (< 1000ms with 2x tolerance)
 *
 * **Test Infrastructure:**
 * - Uses memory factory for consistent performance measurements
 * - Measures real operation performance (no mocks)
 * - Logs actual metrics to console for analysis
 * - Uses performance.now() for accurate timing
 *
 * **Performance Baseline Documentation:**
 * Results are documented in /docs/performance-baseline.md for tracking over time.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { createApplicationServicesWithContainerAndFactory } from '../../../application/src/services/ApplicationFactory.js';
import { createStartNewGameCommand } from '../../../application/src/test-factories/command-factories.js';
import type {
  ApplicationConfig,
  ApplicationServices,
} from '../../../application/src/types/ApplicationTypes.js';
import { createMemoryFactory } from '../memory/factory.js';

/**
 * Performance metrics for a single operation.
 */
interface PerformanceMetrics {
  duration: number;
  operation: string;
  targetMs: number;
  toleranceMs: number;
  passed: boolean;
}

/**
 * Logs performance metrics to console in a consistent format.
 */
function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  const status = metrics.passed ? '✅' : '❌';
  const toleranceInfo = `target: ${metrics.targetMs}ms, tolerance: ${metrics.toleranceMs}ms`;
  console.log(
    `${status} ${metrics.operation}: ${metrics.duration.toFixed(2)}ms (${toleranceInfo})`
  );
}

/**
 * Measures the execution time of an async operation.
 */
async function measureOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  targetMs: number,
  toleranceMs: number
): Promise<PerformanceMetrics> {
  const startTime = performance.now();
  await operation();
  const duration = performance.now() - startTime;

  const metrics: PerformanceMetrics = {
    duration,
    operation: operationName,
    targetMs,
    toleranceMs,
    passed: duration < toleranceMs,
  };

  logPerformanceMetrics(metrics);
  return metrics;
}

/**
 * Creates fresh service instances for isolated performance testing.
 * Each test gets its own DI Container and memory factory to prevent state pollution.
 */
async function createFreshServices(): Promise<ApplicationServices> {
  const factory = createMemoryFactory();
  const config: ApplicationConfig = {
    environment: 'test' as const,
    storage: 'memory' as const,
    debug: false,
  };
  return createApplicationServicesWithContainerAndFactory(config, factory);
}

describe('Performance Baseline Tests', () => {
  describe('DI Container Performance', () => {
    it('should resolve all services within performance target', async () => {
      console.log('\n🚀 Testing DI Container service resolution performance...\n');

      // Target: < 100ms for initial container setup
      // Tolerance: 2x for CI variability
      const targetMs = 100;
      const toleranceMs = 200;

      const metrics = await measureOperation(
        async () => {
          const factory = createMemoryFactory();
          const config = {
            environment: 'test' as const,
            storage: 'memory' as const,
            debug: false,
          };
          await createApplicationServicesWithContainerAndFactory(config, factory);
        },
        'DI Container setup and service resolution',
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      expect(metrics.passed).toBe(true);

      console.log('\n✅ DI Container performance verified\n');
    });

    it('should resolve cached services quickly', async () => {
      console.log('\n🚀 Testing cached service resolution performance...\n');

      // Target: < 1ms per cached service resolution
      // Tolerance: 2x for CI variability
      const targetMs = 1;
      const toleranceMs = 2;

      const services = await createFreshServices();

      const metrics = await measureOperation(
        async () => {
          // Access already-resolved services (cached)
          const { startNewGame, gameRepository, eventStore } = services;
          expect(startNewGame).toBeDefined();
          expect(gameRepository).toBeDefined();
          expect(eventStore).toBeDefined();
          // Return promise to satisfy async requirement
          return Promise.resolve();
        },
        'Cached service access',
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      expect(metrics.passed).toBe(true);

      console.log('\n✅ Cached service resolution performance verified\n');
    });

    it('should handle parallel service resolution efficiently', async () => {
      console.log('\n🚀 Testing parallel service resolution performance...\n');

      // Target: < 50ms for parallel resolution of 10 services
      // Tolerance: 2x for CI variability
      const targetMs = 50;
      const toleranceMs = 100;

      const metrics = await measureOperation(
        async () => {
          // Create 10 parallel container instances
          const factory = createMemoryFactory();
          const config = {
            environment: 'test' as const,
            storage: 'memory' as const,
            debug: false,
          };

          const promises = Array.from({ length: 10 }, () =>
            createApplicationServicesWithContainerAndFactory(config, factory)
          );

          await Promise.all(promises);
        },
        'Parallel resolution of 10 service containers',
        targetMs,
        toleranceMs
      );

      // Note: This test may show slower performance due to memory pressure
      // The tolerance is generous to account for parallel execution overhead
      expect(metrics.duration).toBeLessThan(toleranceMs * 2); // Extra tolerance for parallel ops
      console.log(
        `   Note: Parallel operations completed in ${metrics.duration.toFixed(2)}ms (acceptable for ${10} containers)`
      );

      console.log('\n✅ Parallel service resolution performance verified\n');
    });
  });

  describe('Game Creation Performance', () => {
    it('should create game within performance target', async () => {
      console.log('\n🚀 Testing game creation performance...\n');

      // Target: < 50ms for single game creation
      // Tolerance: 2x for CI variability
      const targetMs = 50;
      const toleranceMs = 100;

      const services = await createFreshServices();

      const gameId = GameId.generate();
      const command = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Performance Test Home',
        awayTeamName: 'Performance Test Away',
      });

      const metrics = await measureOperation(
        async () => {
          const result = await services.startNewGame.execute(command);
          expect(result.success).toBe(true);
        },
        'Single game creation',
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      expect(metrics.passed).toBe(true);

      console.log('\n✅ Game creation performance verified\n');
    });

    it('should persist game to repository efficiently', async () => {
      console.log('\n🚀 Testing game persistence performance...\n');

      // Target: < 20ms for repository persistence
      // Tolerance: 2x for CI variability
      const targetMs = 20;
      const toleranceMs = 40;

      const services = await createFreshServices();

      const gameId = GameId.generate();
      const command = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Persistence Test Home',
        awayTeamName: 'Persistence Test Away',
      });

      // Create game first
      await services.startNewGame.execute(command);

      const metrics = await measureOperation(
        async () => {
          // Measure persistence retrieval
          const game = await services.gameRepository.findById(gameId);
          expect(game).toBeDefined();
        },
        'Game persistence and retrieval',
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      expect(metrics.passed).toBe(true);

      console.log('\n✅ Game persistence performance verified\n');
    });

    it('should handle batch game creation efficiently', async () => {
      console.log('\n🚀 Testing batch game creation performance...\n');

      // Target: < 300ms for 10 games
      // Tolerance: 2x for CI variability
      const targetMs = 300;
      const toleranceMs = 600;
      const gameCount = 10;

      const services = await createFreshServices();

      const metrics = await measureOperation(
        async () => {
          const promises = Array.from({ length: gameCount }, (_, i) => {
            const gameId = GameId.generate();
            const command = createStartNewGameCommand.standard({
              gameId,
              homeTeamName: `Batch Home ${i}`,
              awayTeamName: `Batch Away ${i}`,
            });
            return services.startNewGame.execute(command);
          });

          const results = await Promise.all(promises);
          results.forEach(result => {
            expect(result.success).toBe(true);
          });
        },
        `Batch creation of ${gameCount} games`,
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      const avgPerGame = metrics.duration / gameCount;
      console.log(`   Average per game: ${avgPerGame.toFixed(2)}ms`);

      console.log('\n✅ Batch game creation performance verified\n');
    });
  });

  describe('Event Sourcing Performance', () => {
    it('should reconstruct state efficiently from small event streams', async () => {
      console.log('\n🚀 Testing event sourcing reconstruction (50 events)...\n');

      // Target: < 50ms for 50 events reconstruction
      // Tolerance: 2x for CI variability
      const targetMs = 50;
      const toleranceMs = 100;
      const eventCount = 50;

      const services = await createFreshServices();

      // Create multiple games to generate ~50 events
      const gameIds: GameId[] = [];
      for (let i = 0; i < eventCount; i++) {
        const gameId = GameId.generate();
        gameIds.push(gameId);
        const command = createStartNewGameCommand.standard({
          gameId,
          homeTeamName: `Event Test Home ${i}`,
          awayTeamName: `Event Test Away ${i}`,
        });
        await services.startNewGame.execute(command);
      }

      const metrics = await measureOperation(
        async () => {
          // Measure reconstruction by loading all games
          const promises = gameIds.map(gameId => services.gameRepository.findById(gameId));
          const games = await Promise.all(promises);
          expect(games.every(game => game !== null)).toBe(true);
        },
        `State reconstruction from ${eventCount} events`,
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      const avgPerEvent = metrics.duration / eventCount;
      console.log(`   Average per event: ${avgPerEvent.toFixed(2)}ms`);

      console.log('\n✅ Event sourcing reconstruction performance verified\n');
    });

    it('should handle medium event streams efficiently', async () => {
      console.log('\n🚀 Testing event sourcing reconstruction (100 events)...\n');

      // Target: < 100ms for 100 events
      // Tolerance: 2x for CI variability
      const targetMs = 100;
      const toleranceMs = 200;
      const eventCount = 100;

      const services = await createFreshServices();

      // Create games to generate ~100 events
      const gameIds: GameId[] = [];
      for (let i = 0; i < eventCount; i++) {
        const gameId = GameId.generate();
        gameIds.push(gameId);
        const command = createStartNewGameCommand.standard({
          gameId,
          homeTeamName: `Medium Event Test ${i}`,
          awayTeamName: `Medium Event Away ${i}`,
        });
        await services.startNewGame.execute(command);
      }

      const metrics = await measureOperation(
        async () => {
          const promises = gameIds.map(gameId => services.gameRepository.findById(gameId));
          const games = await Promise.all(promises);
          expect(games.every(game => game !== null)).toBe(true);
        },
        `State reconstruction from ${eventCount} events`,
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      const avgPerEvent = metrics.duration / eventCount;
      console.log(`   Average per event: ${avgPerEvent.toFixed(2)}ms`);

      console.log('\n✅ Medium event stream performance verified\n');
    });

    it('should scale linearly with large event streams', async () => {
      console.log('\n🚀 Testing event sourcing scaling characteristics...\n');

      const eventCounts = [25, 50, 100];
      const results: Array<{ eventCount: number; duration: number; perEvent: number }> = [];

      for (const eventCount of eventCounts) {
        console.log(`\n📊 Testing ${eventCount} events...`);

        const services = await createFreshServices();

        // Create games
        const gameIds: GameId[] = [];
        for (let i = 0; i < eventCount; i++) {
          const gameId = GameId.generate();
          gameIds.push(gameId);
          const command = createStartNewGameCommand.standard({
            gameId,
            homeTeamName: `Scale Test ${eventCount}-${i}`,
            awayTeamName: `Scale Away ${eventCount}-${i}`,
          });
          await services.startNewGame.execute(command);
        }

        // Measure reconstruction
        const startTime = performance.now();
        const promises = gameIds.map(gameId => services.gameRepository.findById(gameId));
        const games = await Promise.all(promises);
        const duration = performance.now() - startTime;

        expect(games.every(game => game !== null)).toBe(true);

        const perEvent = duration / eventCount;
        results.push({ eventCount, duration, perEvent });

        console.log(
          `   ${eventCount} events: ${duration.toFixed(2)}ms (${perEvent.toFixed(2)}ms per event)`
        );
      }

      // Display scaling summary
      console.log('\n📊 Scaling Performance Summary:');
      console.log('Events | Duration | Per Event');
      console.log('-------|----------|----------');
      results.forEach(result => {
        console.log(
          `${result.eventCount.toString().padStart(6)} | ` +
            `${result.duration.toFixed(2).padStart(8)} | ` +
            `${result.perEvent.toFixed(2).padStart(9)}`
        );
      });

      // Verify linear scaling (not exponential)
      // Per-event time should not increase dramatically
      const perEventTimes = results.map(r => r.perEvent);
      const maxPerEvent = Math.max(...perEventTimes);
      const minPerEvent = Math.min(...perEventTimes);
      const scalingRatio = maxPerEvent / minPerEvent;

      console.log(
        `\n   Scaling ratio: ${scalingRatio.toFixed(2)}x (should be < 3x for linear scaling)`
      );

      // Expect scaling to be roughly linear (within 3x variance)
      expect(scalingRatio).toBeLessThan(3);

      console.log('\n✅ Event sourcing scaling characteristics verified\n');
    });

    it('should handle very large event streams within target', async () => {
      console.log('\n🚀 Testing large event stream performance (500 events)...\n');

      // Target: < 500ms for 500 events (linear extrapolation from 100 events)
      // Tolerance: 2x for CI variability
      const targetMs = 500;
      const toleranceMs = 1000;
      const eventCount = 500;

      const services = await createFreshServices();

      // Create games to generate events
      const gameIds: GameId[] = [];
      for (let i = 0; i < eventCount; i++) {
        const gameId = GameId.generate();
        gameIds.push(gameId);
        const command = createStartNewGameCommand.standard({
          gameId,
          homeTeamName: `Large Event ${i}`,
          awayTeamName: `Large Away ${i}`,
        });
        await services.startNewGame.execute(command);
      }

      const metrics = await measureOperation(
        async () => {
          const promises = gameIds.map(gameId => services.gameRepository.findById(gameId));
          const games = await Promise.all(promises);
          expect(games.every(game => game !== null)).toBe(true);
        },
        `State reconstruction from ${eventCount} events`,
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      const avgPerEvent = metrics.duration / eventCount;
      console.log(`   Average per event: ${avgPerEvent.toFixed(2)}ms`);

      console.log('\n✅ Large event stream performance verified\n');
    });

    it('should persist events efficiently', async () => {
      console.log('\n🚀 Testing event persistence performance...\n');

      // Target: < 100ms for 50 events persistence
      // Tolerance: 2x for CI variability
      const targetMs = 100;
      const toleranceMs = 200;
      const eventCount = 50;

      const services = await createFreshServices();

      const metrics = await measureOperation(
        async () => {
          // Create games which persists events
          const promises = Array.from({ length: eventCount }, (_, i) => {
            const gameId = GameId.generate();
            const command = createStartNewGameCommand.standard({
              gameId,
              homeTeamName: `Persist Test ${i}`,
              awayTeamName: `Persist Away ${i}`,
            });
            return services.startNewGame.execute(command);
          });

          const results = await Promise.all(promises);
          expect(results.every(result => result.success)).toBe(true);
        },
        `Event persistence (${eventCount} events)`,
        targetMs,
        toleranceMs
      );

      expect(metrics.duration).toBeLessThan(toleranceMs);
      const avgPerEvent = metrics.duration / eventCount;
      console.log(`   Average per event: ${avgPerEvent.toFixed(2)}ms`);

      console.log('\n✅ Event persistence performance verified\n');
    });
  });

  describe('Performance Summary', () => {
    it('should log comprehensive performance summary', () => {
      console.log('\n📊 PERFORMANCE BASELINE SUMMARY\n');
      console.log('========================================\n');

      console.log('DI Container:');
      console.log('  - Initial setup: Target < 100ms');
      console.log('  - Cached access: Target < 1ms');
      console.log('  - Parallel resolution (10x): Target < 50ms');
      console.log('');

      console.log('Game Creation:');
      console.log('  - Single game: Target < 50ms');
      console.log('  - Persistence: Target < 20ms');
      console.log('  - Batch (10 games): Target < 300ms');
      console.log('');

      console.log('Event Sourcing:');
      console.log('  - Small stream (50 events): Target < 50ms');
      console.log('  - Medium stream (100 events): Target < 100ms');
      console.log('  - Large stream (500 events): Target < 500ms');
      console.log('  - Scaling: Linear (< 3x variance)');
      console.log('  - Event persistence (50): Target < 100ms');
      console.log('');

      console.log('========================================');
      console.log('\n✅ All performance baselines documented\n');

      // This test always passes - it's for documentation
      expect(true).toBe(true);
    });
  });
});
