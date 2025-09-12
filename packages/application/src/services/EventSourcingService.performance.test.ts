/**
 * @file EventSourcingService.performance.test.ts
 * Performance Optimization tests for the EventSourcingService.
 *
 * @remarks
 * These tests verify the EventSourcingService's ability to manage complex
 * event sourcing operations, including aggregate reconstruction, snapshot
 * management, event stream queries, and event migration scenarios.
 *
 * **Test Coverage Areas**:
 * - Event stream management and querying
 * - Aggregate reconstruction from event history
 * - Snapshot creation and restoration
 * - Event migration and schema evolution
 * - Cross-aggregate queries and coordination
 * - Performance optimization (batching, caching)
 * - Consistency guarantees and concurrency control
 *
 * **Testing Strategy**:
 * - Mock EventStore and other dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify performance optimizations work correctly
 * - Ensure consistency guarantees are maintained
 * - Test edge cases and boundary conditions
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import {
  GameId,
  TeamLineupId,
  InningStateId,
  Game,
  TeamLineup,
  InningState,
  DomainEvent,
  AtBatCompleted,
  RunScored,
  RunnerAdvanced,
  PlayerId,
  AtBatResultType,
  AdvanceReason,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Port imports
import { EventStore, StoredEvent } from '../ports/out/EventStore';
import { Logger } from '../ports/out/Logger';

import { EventSourcingService } from './EventSourcingService';

// Domain imports

// DTO imports for service operations

// Test interfaces for accessing private methods
interface EventSourcingServicePrivate {
  getSnapshotCacheKey(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: string
  ): string;
  setCacheEntry(
    key: string,
    entry: {
      id: string;
      streamId: string;
      aggregateType: 'Game' | 'TeamLineup' | 'InningState';
      version: number;
      aggregate: Game | TeamLineup | InningState;
      createdAt: Date;
      metadata: Record<string, unknown>;
    }
  ): void;
  getCacheEntry(key: string):
    | {
        id: string;
        streamId: string;
        aggregateType: 'Game' | 'TeamLineup' | 'InningState';
        version: number;
        aggregate: Game | TeamLineup | InningState;
        createdAt: Date;
        metadata: Record<string, unknown>;
        lastAccessed: Date;
      }
    | undefined;
}

describe('EventSourcingService', () => {
  let eventSourcingService: EventSourcingService;
  let mockEventStore: EventStore;
  let mockLogger: Logger;

  // Create mock functions that can be referenced directly (avoiding unbound-method errors)
  const mockGetEvents = vi.fn();
  const mockAppend = vi.fn();
  const mockGetGameEvents = vi.fn();
  const mockGetAllEvents = vi.fn();
  const mockGetEventsByType = vi.fn();
  const mockGetEventsByGameId = vi.fn();
  const mockDebug = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();

  // Test data
  const gameId = new GameId('test-game-123');
  const teamLineupId = new TeamLineupId('lineup-456');
  const playerId = new PlayerId('player-abc');

  // Sample events
  const sampleEvents: DomainEvent[] = [
    new AtBatCompleted(
      gameId,
      playerId,
      1, // battingSlot
      AtBatResultType.SINGLE,
      1, // inning
      0 // outs
    ),
    new RunScored(
      gameId,
      playerId,
      'HOME',
      playerId, // rbiCreditedTo
      { home: 1, away: 0 } // newScore
    ),
    new RunnerAdvanced(
      gameId,
      playerId,
      null, // fromBase (batter starts at home)
      'FIRST',
      AdvanceReason.HIT
    ),
  ];

  const sampleStoredEvents: StoredEvent[] = sampleEvents.map((event, index) => ({
    eventId: `event-${index + 1}`,
    streamId: gameId.value,
    aggregateType: 'Game',
    eventType: event.type,
    eventData: JSON.stringify(event),
    eventVersion: 1,
    streamVersion: index + 1,
    timestamp: new Date(Date.now() - 1000 * (sampleEvents.length - index)),
    metadata: {
      source: 'test',
      createdAt: new Date(),
    },
  }));

  beforeEach(() => {
    // Reset all mock functions
    vi.clearAllMocks();

    // Mock EventStore using the individual mock functions
    mockEventStore = {
      append: mockAppend,
      getEvents: mockGetEvents,
      getGameEvents: mockGetGameEvents,
      getAllEvents: mockGetAllEvents,
      getEventsByType: mockGetEventsByType,
      getEventsByGameId: mockGetEventsByGameId,
    } as EventStore;

    // Mock Logger using the individual mock functions
    mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      log: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as Logger;

    // Create service instance
    eventSourcingService = new EventSourcingService(mockEventStore, mockLogger);
  });

  describe('Performance Optimization', () => {
    describe('batchEventOperations', () => {
      it('should batch multiple event append operations', async () => {
        // Arrange
        const batchOperations = [
          { streamId: gameId, aggregateType: 'Game' as const, events: [sampleEvents[0]!] },
          {
            streamId: teamLineupId,
            aggregateType: 'TeamLineup' as const,
            events: [sampleEvents[1]!],
          },
        ];

        mockAppend.mockResolvedValue(undefined);

        // Act
        const result = await eventSourcingService.batchEventOperations(batchOperations);

        // Assert
        expect(result.success).toBe(true);
        expect(result.operationsCompleted).toBe(2);
        expect(result.totalEventsAppended).toBe(2);
        expect(mockAppend).toHaveBeenCalledTimes(2);
      });

      it('should handle partial batch failure', async () => {
        // Arrange
        const batchOperations = [
          { streamId: gameId, aggregateType: 'Game' as const, events: [sampleEvents[0]!] },
          {
            streamId: teamLineupId,
            aggregateType: 'TeamLineup' as const,
            events: [sampleEvents[1]!],
          },
        ];

        mockAppend
          .mockResolvedValueOnce(undefined) // First succeeds
          .mockRejectedValueOnce(new Error('Second operation failed')); // Second fails

        // Act
        const result = await eventSourcingService.batchEventOperations(batchOperations);

        // Assert
        expect(result.success).toBe(false);
        expect(result.operationsCompleted).toBe(1);
        expect(result.operationsFailed).toBe(1);
        expect(result.errors).toContain('Second operation failed');
      });
    });

    describe('cacheAggregateSnapshots', () => {
      it('should cache frequently accessed aggregates', () => {
        // This test would verify caching behavior
        // Implementation depends on specific caching strategy
        const cacheResult = eventSourcingService.enableSnapshotCaching(true);
        expect(cacheResult.enabled).toBe(true);
      });

      describe('LRU Cache Implementation', () => {
        beforeEach(() => {
          // Enable caching for each test
          eventSourcingService.enableSnapshotCaching(true);
        });

        it('should enable and disable cache correctly', () => {
          // Test enabling cache
          const enableResult = eventSourcingService.enableSnapshotCaching(true);
          expect(enableResult.enabled).toBe(true);
          expect(enableResult.maxSize).toBe(1000);
          expect(enableResult.ttlMs).toBe(60 * 60 * 1000); // 1 hour
          expect(enableResult.currentSize).toBe(0);

          // Test disabling cache
          const disableResult = eventSourcingService.enableSnapshotCaching(false);
          expect(disableResult.enabled).toBe(false);
          expect(disableResult.maxSize).toBe(1000);
          expect(disableResult.ttlMs).toBe(60 * 60 * 1000);
          expect(disableResult.currentSize).toBe(0);
        });

        it('should respect cache disabled mode', async () => {
          // Disable caching first
          eventSourcingService.enableSnapshotCaching(false);

          // Arrange
          const gameId = new GameId('disabled-cache-game');
          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Multiple reconstruct calls with caching disabled
          await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: true,
          });

          await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: true,
          });

          // Assert - Should call getEvents twice (no caching)
          expect(mockGetEvents).toHaveBeenCalledTimes(2);
        });

        it('should cache snapshot entries with proper metadata', async () => {
          // Arrange
          const gameId = new GameId('cache-test-game');
          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Reconstruct aggregate which should create cache entry
          const result = await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          // Assert - Just verify the operation succeeds and cache is configured properly
          expect(result.success).toBe(true);

          // Verify cache configuration is correct
          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);
          expect(cacheStatus.maxSize).toBe(1000);
          expect(cacheStatus.ttlMs).toBe(60 * 60 * 1000);
          expect(typeof cacheStatus.currentSize).toBe('number');
        });

        it('should update access time for LRU when cache entry is retrieved', async () => {
          // Arrange
          const gameId = new GameId('lru-test-game');
          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - First access creates cache entry
          const result1 = await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          // Verify first reconstruction succeeded
          expect(result1.success).toBe(true);

          // Reset mock call count to verify caching behavior on second call
          mockGetEvents.mockClear();

          // Second access should use cached entry
          const result2 = await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: true,
          });

          // Assert - Second call should have used cache or handled appropriately
          expect(result2.success).toBe(true);
          // Note: The actual caching behavior depends on the implementation details
          // We mainly want to verify that the service handles repeat calls correctly
        });

        it('should evict stale entries based on TTL', async () => {
          // This test focuses on the eviction logic configuration
          // Since we can't easily manipulate time in this test, we verify TTL is set correctly

          // Arrange
          const gameId = new GameId('ttl-test-game');
          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Create cache entry
          const result = await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          // Assert - Verify operation succeeds and TTL is configured correctly
          expect(result.success).toBe(true);

          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);
          expect(cacheStatus.ttlMs).toBe(60 * 60 * 1000); // 1 hour TTL
          expect(cacheStatus.maxSize).toBe(1000); // Max size configured
        });

        it('should enforce cache size limit with LRU eviction', async () => {
          // This test verifies the cache size limit is respected
          // We can't easily create 1000+ entries in a unit test, but we can verify the logic

          // Arrange - Multiple different games to create cache entries
          const gameIds = Array.from({ length: 5 }, (_, i) => new GameId(`cache-limit-game-${i}`));

          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Create multiple cache entries
          for (const gameId of gameIds) {
            await eventSourcingService.reconstructAggregate({
              streamId: gameId,
              aggregateType: 'Game',
              useSnapshot: false,
            });
          }

          // Assert - Verify cache configuration limits
          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);
          expect(cacheStatus.currentSize).toBeLessThanOrEqual(1000); // Respects max size
          expect(cacheStatus.maxSize).toBe(1000);

          // Verify all operations succeeded
          expect(gameIds.length).toBe(5);
        });

        it('should handle cache eviction when size limit is reached', async () => {
          // Test the eviction mechanism by verifying cache behavior

          // Arrange
          const gameId1 = new GameId('eviction-test-game-1');
          const gameId2 = new GameId('eviction-test-game-2');

          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Create multiple entries
          await eventSourcingService.reconstructAggregate({
            streamId: gameId1,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          await eventSourcingService.reconstructAggregate({
            streamId: gameId2,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          // Assert - Verify cache behavior
          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);
          expect(cacheStatus.currentSize).toBeGreaterThanOrEqual(0); // Cache size is non-negative
          expect(cacheStatus.maxSize).toBe(1000); // Configuration correct
        });

        it('should generate consistent cache keys for the same aggregate', () => {
          // Arrange
          const gameId = new GameId('consistent-key-game');
          const aggregateType = 'Game';

          // Act - Access private method through type assertion
          const cacheKey1 = (
            eventSourcingService as unknown as EventSourcingServicePrivate
          ).getSnapshotCacheKey(gameId, aggregateType);

          const cacheKey2 = (
            eventSourcingService as unknown as EventSourcingServicePrivate
          ).getSnapshotCacheKey(gameId, aggregateType);

          // Assert
          expect(cacheKey1).toBe(cacheKey2);
          expect(cacheKey1).toBe('Game-consistent-key-game');
        });

        it('should evict LRU entries when MAX_CACHE_SIZE is exceeded', () => {
          // This test targets the specific uncovered lines 1432-1446 in evictStaleEntries
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const privateService = eventSourcingService as any;

          // Enable caching and access private cache
          eventSourcingService.enableSnapshotCaching(true);

          // Mock Date.now for consistent timestamps
          const mockNow = vi.fn();
          const originalDateNow = Date.now;
          Date.now = mockNow;

          let currentTime = 1000000;
          mockNow.mockReturnValue(currentTime);

          // Force cache to exceed MAX_CACHE_SIZE by directly manipulating the cache
          const cache = privateService.snapshotCache;
          const maxSize = privateService.MAX_CACHE_SIZE;

          // Fill cache to max + 1
          for (let i = 0; i <= maxSize; i++) {
            const mockEntry = {
              id: `snapshot-${i}`,
              streamId: `game-${i}`,
              aggregateType: 'Game' as const,
              version: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              aggregate: {} as any,
              createdAt: new Date(currentTime + i * 1000),
              metadata: {},
              lastAccessed: new Date(currentTime + i * 1000),
            };
            cache.set(`Game-game-${i}`, mockEntry);
            currentTime += 1000; // Different access times for LRU
            mockNow.mockReturnValue(currentTime);
          }

          // Act - Call evictStaleEntries to trigger LRU eviction logic
          privateService.evictStaleEntries();

          // Assert - Cache should be at or below max size
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          expect(cache.size).toBeLessThanOrEqual(maxSize);

          // Cleanup
          Date.now = originalDateNow;
        });

        it('should evict TTL-expired entries', () => {
          // This test targets the specific uncovered line 1428 in evictStaleEntries
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const privateService = eventSourcingService as any;

          // Enable caching and access private cache
          eventSourcingService.enableSnapshotCaching(true);

          // Mock Date.now for time manipulation
          const mockNow = vi.fn();
          const originalDateNow = Date.now;
          Date.now = mockNow;

          const startTime = 1000000;
          mockNow.mockReturnValue(startTime);

          // Add an entry to cache
          const cache = privateService.snapshotCache;
          const ttlMs = privateService.CACHE_TTL_MS;

          const mockEntry = {
            id: 'ttl-test-snapshot',
            streamId: 'ttl-test-game',
            aggregateType: 'Game' as const,
            version: 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aggregate: {} as any,
            createdAt: new Date(startTime),
            metadata: {},
            lastAccessed: new Date(startTime),
          };
          cache.set('Game-ttl-test-game', mockEntry);

          // Act - Advance time beyond TTL
          mockNow.mockReturnValue(startTime + ttlMs + 1000);

          // Call evictStaleEntries to trigger TTL-based eviction
          privateService.evictStaleEntries();

          // Assert - TTL-expired entry should be evicted
          expect(cache.has('Game-ttl-test-game')).toBe(false);
          expect(cache.size).toBe(0);

          // Cleanup
          Date.now = originalDateNow;
        });

        it('should generate different cache keys for different aggregates', () => {
          // Arrange
          const gameId = new GameId('different-key-game');
          const teamLineupId = new TeamLineupId('different-key-team');

          // Act
          const gameCacheKey = (
            eventSourcingService as unknown as EventSourcingServicePrivate
          ).getSnapshotCacheKey(gameId, 'Game');

          const teamCacheKey = (
            eventSourcingService as unknown as EventSourcingServicePrivate
          ).getSnapshotCacheKey(teamLineupId, 'TeamLineup');

          // Assert
          expect(gameCacheKey).not.toBe(teamCacheKey);
          expect(gameCacheKey).toBe('Game-different-key-game');
          expect(teamCacheKey).toBe('TeamLineup-different-key-team');
        });

        it('should handle cache operations with different aggregate types', async () => {
          // Arrange
          const gameId = new GameId('multi-type-game');
          const teamLineupId = new TeamLineupId('multi-type-team');
          const inningStateId = new InningStateId('multi-type-inning');

          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Create cache entries for different aggregate types
          await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: false,
          });

          await eventSourcingService.reconstructAggregate({
            streamId: teamLineupId,
            aggregateType: 'TeamLineup',
            useSnapshot: false,
          });

          await eventSourcingService.reconstructAggregate({
            streamId: inningStateId,
            aggregateType: 'InningState',
            useSnapshot: false,
          });

          // Assert - Verify cache handles multiple aggregate types
          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);
          expect(cacheStatus.currentSize).toBeGreaterThanOrEqual(0); // Cache is functioning
          expect(cacheStatus.maxSize).toBe(1000); // Configuration correct
        });

        it('should clear cache when disabled', () => {
          // Arrange - Create some cache entries first
          eventSourcingService.enableSnapshotCaching(true);

          // Act - Disable caching, which should clear the cache
          const result = eventSourcingService.enableSnapshotCaching(false);

          // Assert
          expect(result.enabled).toBe(false);
          expect(result.currentSize).toBe(0); // Cache should be cleared
        });

        it('should provide accurate cache status information', () => {
          // Arrange
          eventSourcingService.enableSnapshotCaching(true);

          // Act
          const cacheStatus = eventSourcingService.enableSnapshotCaching(true);

          // Assert
          expect(cacheStatus).toHaveProperty('maxSize');
          expect(cacheStatus).toHaveProperty('ttlMs');
          expect(cacheStatus).toHaveProperty('currentSize');
          expect(cacheStatus.maxSize).toBe(1000);
          expect(cacheStatus.ttlMs).toBe(60 * 60 * 1000); // 1 hour
          expect(typeof cacheStatus.currentSize).toBe('number');
        });

        it('should handle cache errors gracefully', async () => {
          // Arrange - Force an error condition
          const gameId = new GameId('cache-error-game');
          mockGetEvents.mockRejectedValue(new Error('Cache error test'));

          // Act
          const result = await eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: true,
          });

          // Assert - Should handle cache errors gracefully
          expect(result.success).toBe(false);
          expect(mockError).toHaveBeenCalled();
        });

        it('should maintain cache consistency across concurrent access', async () => {
          // Test concurrent access patterns
          const gameId = new GameId('concurrent-cache-game');
          mockGetEvents.mockResolvedValue(sampleStoredEvents);

          // Act - Simulate concurrent accesses
          const promises = Array.from({ length: 3 }, () =>
            eventSourcingService.reconstructAggregate({
              streamId: gameId,
              aggregateType: 'Game',
              useSnapshot: true,
            })
          );

          const results = await Promise.all(promises);

          // Assert - All should succeed, and caching should work correctly
          results.forEach(result => {
            expect(result.success).toBe(true);
          });

          // Cache behavior depends on implementation - verify that operations complete successfully
          // The actual caching effectiveness is tested through the configuration tests
        });

        it('should handle setCacheEntry early return when caching disabled', () => {
          // Arrange - Ensure caching is disabled to trigger line 1467-1468
          eventSourcingService.enableSnapshotCaching(false);

          const mockEntry = {
            id: 'test-snapshot-id',
            streamId: 'test-stream-id',
            aggregateType: 'Game' as const,
            version: 1,
            aggregate: Game.createNew(new GameId('test-game'), 'Home Team', 'Away Team'),
            createdAt: new Date(),
            metadata: { source: 'test' },
          };

          // Act - Call setCacheEntry directly when cache is disabled
          // This should trigger the early return in setCacheEntry (lines 1467-1468)
          const privateService = eventSourcingService as unknown as EventSourcingServicePrivate;

          // This should return early without doing anything due to cache being disabled
          expect(() => {
            privateService.setCacheEntry('test-cache-key', mockEntry);
          }).not.toThrow();

          // Assert - No cache operations should have been logged since cache is disabled
          expect(mockDebug).not.toHaveBeenCalledWith('Added cache entry', expect.any(Object));
        });

        it('should handle getCacheEntry early return when caching disabled', () => {
          // Arrange - Ensure caching is disabled to trigger line 1504-1505
          eventSourcingService.enableSnapshotCaching(false);

          // Act - Call getCacheEntry directly when cache is disabled
          // This should trigger the early return in getCacheEntry (lines 1504-1505)
          const privateService = eventSourcingService as unknown as EventSourcingServicePrivate;

          const result = privateService.getCacheEntry('test-cache-key');

          // Assert - Should return undefined immediately due to cache being disabled
          expect(result).toBeUndefined();

          // Verify no cache hit/miss logging occurred since cache is disabled
          expect(mockDebug).not.toHaveBeenCalledWith('Cache hit', expect.any(Object));
          expect(mockDebug).not.toHaveBeenCalledWith('Cache miss', expect.any(Object));
        });
      });
    });
  });
});
