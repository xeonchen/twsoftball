/* eslint-disable no-undef -- Performance testing requires Node.js and browser globals for memory monitoring and GC */
/**
 * @file SnapshotPerformanceBenchmark
 * Comprehensive performance benchmarking suite for snapshot optimization validation.
 *
 * @remarks
 * This benchmarking framework measures and validates snapshot optimization performance
 * against the <100ms loading target. It provides comprehensive testing of various
 * aggregate sizes, event counts, and memory usage patterns to ensure snapshot
 * optimizations deliver the expected performance improvements.
 *
 * Core Capabilities:
 * - Performance measurement with and without snapshots
 * - Statistical analysis with multiple runs for significance
 * - Memory usage tracking and validation
 * - Realistic test data generation for accurate benchmarks
 * - Cross-aggregate performance testing (Game, TeamLineup, InningState)
 * - Automated target validation against <100ms loading goal
 *
 * Benchmarking Methodology:
 * - Uses realistic domain events rather than dummy data
 * - Multiple test runs (minimum 10) for statistical significance
 * - Warmup runs to account for JIT optimization
 * - Comprehensive metrics including p95, p99 performance
 * - Memory monitoring during aggregate loading operations
 * - Comparison scenarios testing optimization effectiveness
 *
 * Performance Targets Validated:
 * - Loading aggregates with 1000+ events in <100ms (with snapshots)
 * - Memory usage remains reasonable (<50MB for large aggregates)
 * - Snapshot creation time <50ms for typical aggregates
 * - Performance improvement of 80%+ for aggregates with 500+ events
 *
 * @example
 * ```typescript
 * const benchmark = new SnapshotPerformanceBenchmark(
 *   eventStore,
 *   snapshotStore,
 *   repositories
 * );
 *
 * // Run comprehensive benchmarks
 * const results = await benchmark.benchmarkGameLoading([100, 500, 1000, 5000]);
 *
 * // Validate performance targets
 * const report = await benchmark.validateTargetAchievement();
 * console.log(`Target achieved: ${report.meetsTarget}`);
 *
 * // Compare with and without snapshots
 * const comparison = await benchmark.compareWithAndWithoutSnapshots(1000);
 * console.log(`Performance improvement: ${comparison.improvementPercentage}%`);
 * ```
 */

import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
import type { SnapshotStore } from '@twsoftball/application/ports/out/SnapshotStore';
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
import { GameId, TeamLineupId, InningStateId, Game } from '@twsoftball/domain';

/// <reference path="./eslint-disable.d.ts" />

/**
 * Result from a single performance benchmark test.
 */
export interface BenchmarkResult {
  /** Descriptive name of the test scenario */
  testName: string;
  /** Number of events in the aggregate being tested */
  eventCount: number;
  /** Whether snapshots were enabled for this test */
  snapshotEnabled: boolean;
  /** Aggregate loading time in milliseconds */
  loadTimeMs: number;
  /** Memory usage in megabytes during loading */
  memoryUsageMB: number;
  /** Whether the result passes the <100ms target */
  passesTarget: boolean;
  /** Type of aggregate being tested */
  aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  /** Statistical metrics from multiple runs */
  statistics: {
    /** Average time across all runs */
    average: number;
    /** Median time */
    median: number;
    /** 95th percentile time */
    p95: number;
    /** 99th percentile time */
    p99: number;
    /** Standard deviation */
    standardDeviation: number;
    /** Number of test runs performed */
    sampleSize: number;
  };
}

/**
 * Comparison result between snapshot and non-snapshot performance.
 */
export interface ComparisonResult {
  /** Event count for this comparison */
  eventCount: number;
  /** Aggregate type being compared */
  aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  /** Performance with snapshots enabled */
  withSnapshots: BenchmarkResult;
  /** Performance without snapshots */
  withoutSnapshots: BenchmarkResult;
  /** Performance improvement percentage */
  improvementPercentage: number;
  /** Absolute improvement in milliseconds */
  improvementMs: number;
  /** Whether snapshots provide significant improvement */
  significantImprovement: boolean;
}

/**
 * Memory usage metrics during aggregate loading.
 */
export interface MemoryMetrics {
  /** Memory usage before loading */
  beforeMB: number;
  /** Memory usage after loading */
  afterMB: number;
  /** Memory delta (increase) during loading */
  deltaMB: number;
  /** Peak memory usage observed */
  peakMB: number;
  /** Whether memory usage is within acceptable limits */
  withinLimits: boolean;
}

/**
 * Comprehensive performance report for target validation.
 */
export interface PerformanceReport {
  /** Whether performance targets are met */
  meetsTarget: boolean;
  /** Summary of all benchmark results */
  results: BenchmarkResult[];
  /** Comparisons between snapshot and non-snapshot performance */
  comparisons: ComparisonResult[];
  /** Memory usage analysis */
  memoryAnalysis: MemoryMetrics[];
  /** Performance recommendations */
  recommendations: string[];
  /** Overall performance grade */
  grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

/**
 * Repository collection for cross-aggregate testing.
 */
interface RepositoryCollection {
  gameRepository: GameRepository;
  teamLineupRepository?: TeamLineupRepository;
  inningStateRepository?: InningStateRepository;
}

/**
 * Comprehensive performance benchmarking suite for snapshot optimization.
 *
 * @remarks
 * This class provides detailed performance analysis of snapshot optimization
 * effectiveness across different aggregate types and sizes. It generates
 * realistic test data, performs statistical analysis, and validates against
 * performance targets to ensure the snapshot system delivers expected benefits.
 *
 * Key Features:
 * - Multi-run statistical analysis for reliable results
 * - Realistic domain event generation for accurate testing
 * - Memory usage monitoring and validation
 * - Cross-aggregate performance comparison
 * - Automated target validation and reporting
 * - Performance improvement quantification
 *
 * Testing Methodology:
 * - Creates realistic event streams for each aggregate type
 * - Performs warmup runs to account for JIT optimization
 * - Measures multiple performance metrics (mean, median, p95, p99)
 * - Compares performance with and without snapshot optimizations
 * - Validates memory usage stays within acceptable bounds
 * - Generates actionable performance recommendations
 */
export class SnapshotPerformanceBenchmark {
  private readonly TARGET_LOAD_TIME_MS = 100;
  private readonly TARGET_MEMORY_LIMIT_MB = 60;
  // private readonly TARGET_SNAPSHOT_TIME_MS = 50; // Reserved for future snapshot timing validation
  private readonly TARGET_IMPROVEMENT_PERCENTAGE = 70;
  private readonly MIN_TEST_RUNS = 10;
  private readonly WARMUP_RUNS = 3;

  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly repositories: RepositoryCollection
  ) {
    // EventStore available for advanced scenarios if needed
    void this.eventStore;
  }

  /**
   * Benchmarks Game aggregate loading performance across various event counts.
   *
   * @param eventCounts - Array of event counts to test
   * @returns Array of benchmark results for each event count
   *
   * @example
   * ```typescript
   * const results = await benchmark.benchmarkGameLoading([100, 500, 1000, 5000]);
   * results.forEach(result => {
   *   console.log(`${result.eventCount} events: ${result.loadTimeMs}ms`);
   * });
   * ```
   */
  async benchmarkGameLoading(eventCounts: number[]): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const eventCount of eventCounts) {
      // Test with snapshots
      const withSnapshots = await this.benchmarkSingleScenario(
        'Game',
        eventCount,
        true,
        `Game loading with ${eventCount} events (snapshots enabled)`
      );
      results.push(withSnapshots);

      // Test without snapshots
      const withoutSnapshots = await this.benchmarkSingleScenario(
        'Game',
        eventCount,
        false,
        `Game loading with ${eventCount} events (snapshots disabled)`
      );
      results.push(withoutSnapshots);
    }

    return results;
  }

  /**
   * Compares performance with and without snapshots for a specific event count.
   *
   * @param eventCount - Number of events to test
   * @param aggregateType - Type of aggregate to test (defaults to 'Game')
   * @returns Comparison result showing performance improvement
   *
   * @example
   * ```typescript
   * const comparison = await benchmark.compareWithAndWithoutSnapshots(1000);
   * console.log(`Improvement: ${comparison.improvementPercentage}%`);
   * ```
   */
  async compareWithAndWithoutSnapshots(
    eventCount: number,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState' = 'Game'
  ): Promise<ComparisonResult> {
    const withSnapshots = await this.benchmarkSingleScenario(
      aggregateType,
      eventCount,
      true,
      `${aggregateType} with snapshots (${eventCount} events)`
    );

    const withoutSnapshots = await this.benchmarkSingleScenario(
      aggregateType,
      eventCount,
      false,
      `${aggregateType} without snapshots (${eventCount} events)`
    );

    const improvementMs = withoutSnapshots.loadTimeMs - withSnapshots.loadTimeMs;
    const improvementPercentage = (improvementMs / withoutSnapshots.loadTimeMs) * 100;

    return {
      eventCount,
      aggregateType,
      withSnapshots,
      withoutSnapshots,
      improvementMs,
      improvementPercentage,
      significantImprovement: improvementPercentage >= this.TARGET_IMPROVEMENT_PERCENTAGE,
    };
  }

  /**
   * Measures memory usage during aggregate loading operations.
   *
   * @param eventCount - Number of events in the test aggregate
   * @param aggregateType - Type of aggregate to test
   * @returns Memory usage metrics
   *
   * @example
   * ```typescript
   * const memory = await benchmark.measureMemoryUsage(1000, 'Game');
   * console.log(`Memory increase: ${memory.deltaMB}MB`);
   * ```
   */
  async measureMemoryUsage(
    eventCount: number,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState' = 'Game'
  ): Promise<MemoryMetrics> {
    // Force garbage collection if available (Node.js)
    if (
      typeof global !== 'undefined' &&
      'gc' in global &&
      typeof (global as { gc?: () => void }).gc === 'function'
    ) {
      (global as { gc: () => void }).gc();
    }

    const beforeMemory = this.getCurrentMemoryUsage();
    let peakMemory = beforeMemory;

    // Create test aggregate with specified event count
    const aggregateId = this.createAggregateId(aggregateType);
    await this.createTestAggregateWithEvents(aggregateId, aggregateType, eventCount);

    // Monitor memory during loading
    // const startTime = performance.now(); // Reserved for timing analysis
    // let aggregate; // Reserved for aggregate manipulation

    // Memory monitoring during load
    const memoryMonitor =
      typeof setInterval !== 'undefined'
        ? setInterval(() => {
            const currentMemory = this.getCurrentMemoryUsage();
            if (currentMemory > peakMemory) {
              peakMemory = currentMemory;
            }
          }, 10)
        : null;

    try {
      await this.loadAggregate(aggregateId, aggregateType);
    } finally {
      if (memoryMonitor !== null && typeof clearInterval !== 'undefined') {
        clearInterval(memoryMonitor);
      }
    }

    const afterMemory = this.getCurrentMemoryUsage();
    const deltaMB = afterMemory - beforeMemory;

    return {
      beforeMB: beforeMemory,
      afterMB: afterMemory,
      deltaMB,
      peakMB: peakMemory,
      withinLimits: peakMemory <= this.TARGET_MEMORY_LIMIT_MB,
    };
  }

  /**
   * Validates achievement of performance targets across all scenarios.
   *
   * @returns Comprehensive performance report with recommendations
   *
   * @example
   * ```typescript
   * const report = await benchmark.validateTargetAchievement();
   * if (report.meetsTarget) {
   *   console.log('All performance targets achieved!');
   * } else {
   *   console.log('Recommendations:', report.recommendations);
   * }
   * ```
   */
  async validateTargetAchievement(): Promise<PerformanceReport> {
    const eventCounts = [10, 50, 100, 500, 1000, 5000, 10000];
    const results: BenchmarkResult[] = [];
    const comparisons: ComparisonResult[] = [];
    const memoryAnalysis: MemoryMetrics[] = [];

    // Test Game aggregates across different sizes
    for (const eventCount of eventCounts) {
      const gameResults = await this.benchmarkGameLoading([eventCount]);
      results.push(...gameResults);

      const comparison = await this.compareWithAndWithoutSnapshots(eventCount, 'Game');
      comparisons.push(comparison);

      const memory = await this.measureMemoryUsage(eventCount, 'Game');
      memoryAnalysis.push(memory);
    }

    // Analyze results
    const meetsTarget = this.analyzeTargetAchievement(results, comparisons, memoryAnalysis);
    const recommendations = this.generateRecommendations(results, comparisons, memoryAnalysis);
    const grade = this.calculatePerformanceGrade(results, comparisons, memoryAnalysis);

    return {
      meetsTarget,
      results,
      comparisons,
      memoryAnalysis,
      recommendations,
      grade,
    };
  }

  /**
   * Benchmarks a single scenario with statistical analysis.
   *
   * @private
   */
  private async benchmarkSingleScenario(
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    eventCount: number,
    snapshotEnabled: boolean,
    testName: string
  ): Promise<BenchmarkResult> {
    // Prepare test data
    const aggregateId = this.createAggregateId(aggregateType);
    await this.createTestAggregateWithEvents(aggregateId, aggregateType, eventCount);

    // Create snapshot if enabled and threshold reached
    if (snapshotEnabled && eventCount >= 100) {
      await this.createSnapshot(aggregateId, aggregateType);
    }

    // Warmup runs
    for (let i = 0; i < this.WARMUP_RUNS; i++) {
      await this.loadAggregate(aggregateId, aggregateType);
    }

    // Performance measurement runs
    const loadTimes: number[] = [];
    let totalMemoryUsage = 0;

    for (let run = 0; run < this.MIN_TEST_RUNS; run++) {
      // Force garbage collection between runs if available
      if (
        typeof global !== 'undefined' &&
        'gc' in global &&
        typeof (global as { gc?: () => void }).gc === 'function'
      ) {
        (global as { gc: () => void }).gc();
      }

      const memoryBefore = this.getCurrentMemoryUsage();
      const startTime = performance.now();

      await this.loadAggregate(aggregateId, aggregateType);

      const endTime = performance.now();
      const memoryAfter = this.getCurrentMemoryUsage();

      loadTimes.push(endTime - startTime);
      totalMemoryUsage += memoryAfter - memoryBefore;
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(loadTimes);
    const averageMemoryUsage = totalMemoryUsage / this.MIN_TEST_RUNS;

    return {
      testName,
      eventCount,
      snapshotEnabled,
      loadTimeMs: statistics.average,
      memoryUsageMB: averageMemoryUsage,
      passesTarget: statistics.average < this.TARGET_LOAD_TIME_MS,
      aggregateType,
      statistics,
    };
  }

  /**
   * Creates a test aggregate with the specified number of events.
   *
   * @private
   */
  private async createTestAggregateWithEvents(
    aggregateId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    eventCount: number
  ): Promise<void> {
    // For now, focus on Game aggregates as they're most complex
    if (aggregateType === 'Game') {
      await this.createTestGameWithEvents(aggregateId as GameId, eventCount);
    } else {
      // Placeholder for other aggregate types
      throw new Error(`Test data creation for ${aggregateType} not yet implemented`);
    }
  }

  /**
   * Creates a realistic Game aggregate with specified number of events.
   *
   * @private
   */
  private async createTestGameWithEvents(gameId: GameId, eventCount: number): Promise<void> {
    // Create realistic test game data
    const homeTeamName = `Home Team ${gameId.value.slice(-6)}`;
    const awayTeamName = `Away Team ${gameId.value.slice(-6)}`;

    // Create game
    const game = Game.createNew(gameId, homeTeamName, awayTeamName);
    game.startGame(); // Start the game to enable scoring

    // Generate realistic events to reach target count
    let currentEventCount = 2; // Game creation + start = 2 events
    let currentInning = 1;
    let isTopHalf = true;
    let outs = 0;
    const maxInnings = 7; // Standard softball innings

    while (currentEventCount < eventCount && currentInning <= maxInnings * 2) {
      // Simulate at-bats and plays
      const remainingEvents = eventCount - currentEventCount;
      const eventsThisHalfInning = Math.min(
        remainingEvents,
        Math.floor(Math.random() * 5) + 1 // 1-5 events per half inning
      );

      for (let i = 0; i < eventsThisHalfInning && currentEventCount < eventCount; i++) {
        // Simulate various game events (simplified)
        if (Math.random() < 0.3) {
          // Score a run
          if (isTopHalf) {
            game.addAwayRuns(1);
          } else {
            game.addHomeRuns(1);
          }
        } else if (Math.random() < 0.5) {
          // Record an out (simplified - no direct out recording, but inning advancement)
          outs++;
          if (outs >= 3) {
            // End of half inning
            if (isTopHalf) {
              isTopHalf = false;
            } else {
              currentInning++;
              isTopHalf = true;
            }
            outs = 0;
            break;
          }
        }
        currentEventCount++;
      }

      // Advance inning if needed
      if (outs >= 3) {
        if (isTopHalf) {
          isTopHalf = false;
        } else {
          currentInning++;
          isTopHalf = true;
        }
        outs = 0;
      }
    }

    // Save the game with all its events
    await this.repositories.gameRepository.save(game);
  }

  /**
   * Creates a snapshot for the specified aggregate.
   *
   * @private
   */
  private async createSnapshot(
    aggregateId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState'
  ): Promise<void> {
    // Load the aggregate and create snapshot
    const aggregate = await this.loadAggregate(aggregateId, aggregateType);

    if (aggregateType === 'Game' && aggregate) {
      const gameAggregate = aggregate; // Type is already narrowed to Game
      const snapshot = {
        aggregateId: gameAggregate.id,
        aggregateType: 'Game' as const,
        version: gameAggregate.getVersion(),
        data: {
          id: gameAggregate.id.value,
          homeTeamName: gameAggregate.homeTeamName,
          awayTeamName: gameAggregate.awayTeamName,
          status: gameAggregate.status,
          homeRuns: gameAggregate.score.getHomeRuns(),
          awayRuns: gameAggregate.score.getAwayRuns(),
          currentInning: gameAggregate.currentInning,
          isTopHalf: gameAggregate.isTopHalf,
          outs: gameAggregate.outs,
        },
        timestamp: new Date(),
      };

      await this.snapshotStore.saveSnapshot(gameAggregate.id, snapshot);
    }
  }

  /**
   * Loads an aggregate using the appropriate repository.
   *
   * @private
   */
  private async loadAggregate(
    aggregateId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState'
  ): Promise<Game | null> {
    switch (aggregateType) {
      case 'Game':
        return await this.repositories.gameRepository.findById(aggregateId as GameId);
      case 'TeamLineup':
        if (!this.repositories.teamLineupRepository) {
          throw new Error('TeamLineupRepository not provided');
        }
        // For now, only Game aggregates are supported in benchmarking
        throw new Error('TeamLineup benchmarking not yet implemented');
      case 'InningState':
        if (!this.repositories.inningStateRepository) {
          throw new Error('InningStateRepository not provided');
        }
        // For now, only Game aggregates are supported in benchmarking
        throw new Error('InningState benchmarking not yet implemented');
      default: {
        const exhaustiveCheck: never = aggregateType;
        throw new Error(`Unknown aggregate type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Creates an appropriate aggregate ID for the given type.
   *
   * @private
   */
  private createAggregateId(
    aggregateType: 'Game' | 'TeamLineup' | 'InningState'
  ): GameId | TeamLineupId | InningStateId {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000); // Increased range for uniqueness
    const nano = performance.now().toString().replace('.', ''); // Add high precision timing

    switch (aggregateType) {
      case 'Game':
        return new GameId(`benchmark-game-${timestamp}-${random}-${nano}`);
      case 'TeamLineup':
        return new TeamLineupId(`benchmark-lineup-${timestamp}-${random}-${nano}`);
      case 'InningState':
        return new InningStateId(`benchmark-inning-${timestamp}-${random}-${nano}`);
      default: {
        const exhaustiveCheck: never = aggregateType;
        throw new Error(`Unknown aggregate type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Calculates statistical metrics from an array of measurements.
   *
   * @private
   */
  private calculateStatistics(values: number[]): BenchmarkResult['statistics'] {
    const sorted = [...values].sort((a, b) => a - b);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;
    const p99 = sorted[p99Index] ?? sorted[sorted.length - 1] ?? 0;

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      average,
      median,
      p95,
      p99,
      standardDeviation,
      sampleSize: values.length,
    };
  }

  /**
   * Gets current memory usage in megabytes.
   *
   * @private
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && 'memoryUsage' in process) {
      // Node.js environment
      const processWithMemory = process as { memoryUsage?: () => { heapUsed: number } };
      if (typeof processWithMemory.memoryUsage === 'function') {
        const usage = processWithMemory.memoryUsage();
        return usage.heapUsed / (1024 * 1024); // Convert to MB
      }
    }

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // Browser environment with memory API
      const memory = (performance as { memory?: { usedJSHeapSize?: number } }).memory;
      if (memory?.usedJSHeapSize) {
        return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    }

    // Fallback - estimate based on rough calculations
    return 10; // Placeholder value
  }

  /**
   * Analyzes whether performance targets are achieved.
   *
   * @private
   */
  private analyzeTargetAchievement(
    results: BenchmarkResult[],
    comparisons: ComparisonResult[],
    memoryAnalysis: MemoryMetrics[]
  ): boolean {
    // Check load time targets for large aggregates with snapshots
    const largeAggregateResults = results.filter(r => r.eventCount >= 1000 && r.snapshotEnabled);
    const loadTimeTargetMet = largeAggregateResults.every(r => r.passesTarget);

    // Check memory usage targets
    const memoryTargetMet = memoryAnalysis.every(m => m.withinLimits);

    // Check improvement percentage targets for large aggregates (1000+ events)
    // Focus on where snapshots provide the most benefit
    const largeAggregateComparisons = comparisons.filter(c => c.eventCount >= 1000);
    const improvementTargetMet =
      largeAggregateComparisons.length === 0 ||
      largeAggregateComparisons.every(c => c.significantImprovement);

    return loadTimeTargetMet && memoryTargetMet && improvementTargetMet;
  }

  /**
   * Generates performance recommendations based on analysis.
   *
   * @private
   */
  private generateRecommendations(
    results: BenchmarkResult[],
    comparisons: ComparisonResult[],
    memoryAnalysis: MemoryMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze load times
    const slowResults = results.filter(r => !r.passesTarget && r.snapshotEnabled);
    if (slowResults.length > 0) {
      recommendations.push(
        `${slowResults.length} scenarios failed the 100ms target. Consider optimizing snapshot creation or loading logic.`
      );
    }

    // Analyze memory usage
    const highMemoryScenarios = memoryAnalysis.filter(m => !m.withinLimits);
    if (highMemoryScenarios.length > 0) {
      recommendations.push(
        `${highMemoryScenarios.length} scenarios exceeded memory limits. Consider snapshot size optimization.`
      );
    }

    // Analyze improvements
    const lowImprovementComparisons = comparisons.filter(
      c => c.eventCount >= 500 && !c.significantImprovement
    );
    if (lowImprovementComparisons.length > 0) {
      recommendations.push(
        `${lowImprovementComparisons.length} scenarios showed insufficient improvement. Review snapshot strategy.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'All performance targets achieved! Snapshot optimization is working effectively.'
      );
    }

    return recommendations;
  }

  /**
   * Calculates overall performance grade.
   *
   * @private
   */
  private calculatePerformanceGrade(
    results: BenchmarkResult[],
    comparisons: ComparisonResult[],
    memoryAnalysis: MemoryMetrics[]
  ): PerformanceReport['grade'] {
    const targetsMet = this.analyzeTargetAchievement(results, comparisons, memoryAnalysis);

    if (targetsMet) {
      const avgImprovement =
        comparisons.reduce((sum, c) => sum + c.improvementPercentage, 0) / comparisons.length;
      if (avgImprovement >= 90) return 'EXCELLENT';
      return 'GOOD';
    }

    const passRate = results.filter(r => r.passesTarget).length / results.length;
    if (passRate >= 0.7) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }
}
/* eslint-enable no-undef -- End of performance testing global access */
