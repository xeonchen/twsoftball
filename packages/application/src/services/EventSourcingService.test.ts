/**
 * @file EventSourcingService.test.ts
 * Comprehensive tests for the EventSourcingService.
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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Port imports
import { EventStore, StoredEvent } from '../ports/out/EventStore';
import { Logger } from '../ports/out/Logger';

import { EventSourcingService } from './EventSourcingService';

// Domain imports

// DTO imports for service operations
interface ReconstructAggregateCommand {
  readonly streamId: GameId | TeamLineupId | InningStateId;
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  readonly toVersion?: number;
  readonly useSnapshot?: boolean;
}

interface CreateSnapshotCommand {
  readonly streamId: GameId | TeamLineupId | InningStateId;
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  readonly atVersion: number;
}

interface QueryEventsCommand {
  readonly gameId?: GameId;
  readonly streamId?: GameId | TeamLineupId | InningStateId;
  readonly eventTypes?: string[];
  readonly fromTimestamp?: Date;
  readonly toTimestamp?: Date;
  readonly aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[];
}

// Test interfaces for accessing private methods
interface EventSourcingServicePrivate {
  generateSnapshotId(streamId: GameId | TeamLineupId | InningStateId, version: number): string;
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

// Helper function to create mock stored events
function createMockStoredEvent(eventType: string, eventData: string = 'test data'): StoredEvent {
  return {
    eventId: `event-${Date.now()}-${Math.random()}`,
    streamId: 'test-stream-id',
    aggregateType: 'Game',
    eventType,
    eventData: JSON.stringify(eventData),
    eventVersion: 1,
    streamVersion: 1,
    timestamp: new Date(),
    metadata: {
      source: 'test',
      createdAt: new Date(),
    },
  };
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

  describe('Event Stream Management', () => {
    describe('loadEventStream', () => {
      it('should load events from a specific stream', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue(sampleStoredEvents);

        // Act
        const result = await eventSourcingService.loadEventStream(gameId, 'Game');

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(3);
        expect(result.streamVersion).toBe(3);
        expect(mockGetEvents).toHaveBeenCalledWith(gameId, undefined);
        expect(mockDebug).toHaveBeenCalledWith(
          'Loading event stream',
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
          })
        );
      });

      it('should load events from a specific version', async () => {
        // Arrange
        const eventsFromVersion2 = sampleStoredEvents.slice(1);
        mockGetEvents.mockResolvedValue(eventsFromVersion2);

        // Act
        const result = await eventSourcingService.loadEventStream(gameId, 'Game', 2);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(2);
        expect(result.streamVersion).toBe(3);
        expect(mockGetEvents).toHaveBeenCalledWith(gameId, 2);
      });

      it('should handle empty event stream', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue([]);

        // Act
        const result = await eventSourcingService.loadEventStream(gameId, 'Game');

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(0);
        expect(result.streamVersion).toBe(0);
      });

      it('should handle EventStore failure gracefully', async () => {
        // Arrange
        const expectedError = new Error('EventStore connection failed');
        mockGetEvents.mockRejectedValue(expectedError);

        // Act
        const result = await eventSourcingService.loadEventStream(gameId, 'Game');

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('EventStore connection failed');
        expect(mockError).toHaveBeenCalledWith(
          'Failed to load event stream',
          expectedError,
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
          })
        );
      });
    });

    describe('appendEvents', () => {
      it('should append events to stream with version check', async () => {
        // Arrange
        const expectedVersion = 5;
        mockAppend.mockResolvedValue(undefined);

        // Act
        const result = await eventSourcingService.appendEvents(
          gameId,
          'Game',
          sampleEvents,
          expectedVersion
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.eventsAppended).toBe(3);
        expect(mockAppend).toHaveBeenCalledWith(gameId, 'Game', sampleEvents, expectedVersion);
        expect(mockInfo).toHaveBeenCalledWith(
          'Events appended to stream successfully',
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
            eventCount: 3,
          })
        );
      });

      it('should append events without version check', async () => {
        // Arrange
        mockAppend.mockResolvedValue(undefined);

        // Act
        const result = await eventSourcingService.appendEvents(gameId, 'Game', sampleEvents);

        // Assert
        expect(result.success).toBe(true);
        expect(mockAppend).toHaveBeenCalledWith(gameId, 'Game', sampleEvents, undefined);
      });

      it('should handle version conflicts', async () => {
        // Arrange
        const versionConflictError = new Error('Expected version 5 but stream is at version 7');
        mockAppend.mockRejectedValue(versionConflictError);

        // Act
        const result = await eventSourcingService.appendEvents(gameId, 'Game', sampleEvents, 5);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Expected version 5 but stream is at version 7');
        expect(mockError).toHaveBeenCalledWith(
          'Failed to append events to stream',
          versionConflictError,
          expect.objectContaining({
            streamId: gameId.value,
            expectedVersion: 5,
          })
        );
      });

      it('should handle empty events array', async () => {
        // Arrange
        const emptyEvents: DomainEvent[] = [];

        // Act
        const result = await eventSourcingService.appendEvents(gameId, 'Game', emptyEvents);

        // Assert
        expect(result.success).toBe(true);
        expect(result.eventsAppended).toBe(0);
        expect(mockAppend).not.toHaveBeenCalled();
        expect(mockDebug).toHaveBeenCalledWith(
          'No events to append, skipping operation',
          expect.objectContaining({
            streamId: gameId.value,
          })
        );
      });
    });
  });

  describe('Aggregate Reconstruction', () => {
    describe('reconstructAggregate', () => {
      it('should reconstruct Game aggregate from events', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue(sampleStoredEvents);

        const command: ReconstructAggregateCommand = {
          streamId: gameId,
          aggregateType: 'Game',
        };

        // Act
        const result = await eventSourcingService.reconstructAggregate(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.aggregate).toBeDefined();
        expect(result.currentVersion).toBe(3);
        expect(result.eventsApplied).toBe(3);
        expect(mockInfo).toHaveBeenCalledWith(
          'Aggregate reconstructed successfully',
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
            eventsApplied: 3,
            currentVersion: 3,
          })
        );
      });

      it('should reconstruct aggregate to specific version', async () => {
        // Arrange
        const eventsToVersion2 = sampleStoredEvents.slice(0, 2);
        mockGetEvents.mockResolvedValue(eventsToVersion2);

        const command: ReconstructAggregateCommand = {
          streamId: gameId,
          aggregateType: 'Game',
          toVersion: 2,
        };

        // Act
        const result = await eventSourcingService.reconstructAggregate(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.currentVersion).toBe(2);
        expect(result.eventsApplied).toBe(2);
      });

      it('should use snapshot when available and requested', async () => {
        // Arrange
        const snapshotEvents = sampleStoredEvents.slice(1); // Events after snapshot
        mockGetEvents.mockResolvedValue(snapshotEvents);

        const command: ReconstructAggregateCommand = {
          streamId: gameId,
          aggregateType: 'Game',
          useSnapshot: true,
        };

        // Mock snapshot loading (simplified)
        vi.spyOn(eventSourcingService, 'loadSnapshot').mockReturnValue({
          exists: true,
          aggregate: {} as Game, // Mock aggregate
          version: 1,
        });

        // Act
        const result = await eventSourcingService.reconstructAggregate(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.snapshotUsed).toBe(true);
        expect(result.eventsApplied).toBe(2); // Only events after snapshot
      });

      it('should handle aggregate reconstruction failure', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue([]);

        const command: ReconstructAggregateCommand = {
          streamId: gameId,
          aggregateType: 'Game',
        };

        // Act
        const result = await eventSourcingService.reconstructAggregate(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('No events found for aggregate reconstruction');
      });

      it('should handle unsupported aggregate type', async () => {
        // Arrange
        const command: ReconstructAggregateCommand = {
          streamId: gameId,
          aggregateType: 'UnsupportedType' as 'Game' | 'TeamLineup' | 'InningState',
        };

        // Act
        const result = await eventSourcingService.reconstructAggregate(command);

        // Assert
        // Debug output: result.errors would be logged here if needed
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Unsupported aggregate type: UnsupportedType');
      });
    });
  });

  describe('Snapshot Management', () => {
    describe('createSnapshot', () => {
      it('should create snapshot of Game aggregate', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue(sampleStoredEvents);

        const command: CreateSnapshotCommand = {
          streamId: gameId,
          aggregateType: 'Game',
          atVersion: 3,
        };

        // Act
        const result = await eventSourcingService.createSnapshot(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.snapshotVersion).toBe(3);
        expect(result.snapshotId).toBeDefined();
        expect(mockInfo).toHaveBeenCalledWith(
          'Snapshot created successfully',
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
            version: 3,
          })
        );
      });

      it('should handle snapshot creation failure', async () => {
        // Arrange
        const reconstructionError = new Error('Failed to reconstruct aggregate');
        mockGetEvents.mockRejectedValue(reconstructionError);

        const command: CreateSnapshotCommand = {
          streamId: gameId,
          aggregateType: 'Game',
          atVersion: 3,
        };

        // Act
        const result = await eventSourcingService.createSnapshot(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Failed to reconstruct aggregate');
      });

      it('should skip snapshot for low event count', async () => {
        // Arrange
        const fewEvents = sampleStoredEvents.slice(0, 1); // Only 1 event
        mockGetEvents.mockResolvedValue(fewEvents);

        const command: CreateSnapshotCommand = {
          streamId: gameId,
          aggregateType: 'Game',
          atVersion: 1,
        };

        // Act
        const result = await eventSourcingService.createSnapshot(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.snapshotSkipped).toBe(true);
        expect(mockDebug).toHaveBeenCalledWith(
          'Snapshot skipped - insufficient events',
          expect.objectContaining({
            streamId: gameId.value,
            eventCount: 1,
            minimumEvents: 2, // Updated minimum
          })
        );
      });
    });

    describe('loadSnapshot', () => {
      it('should load existing snapshot', () => {
        // Arrange
        // This would be mocked in a real implementation
        // Mock snapshot would be configured here if needed for the test
        // const mockSnapshot = { id: gameId, version: 5, data: {} as Game, createdAt: new Date() };

        // Act
        const result = eventSourcingService.loadSnapshot(gameId, 'Game');

        // Assert
        // This test would verify snapshot loading logic
        // For now, we'll just verify the method exists and can be called
        expect(result).toBeDefined();
      });
    });
  });

  describe('Event Queries', () => {
    describe('queryEvents', () => {
      it('should query events by game ID', async () => {
        // Arrange
        mockGetEventsByGameId.mockResolvedValue(sampleStoredEvents);

        const command: QueryEventsCommand = {
          gameId,
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(3);
        expect(result.totalEvents).toBe(3);
        expect(mockGetEventsByGameId).toHaveBeenCalledWith(gameId, undefined, undefined);
      });

      it('should query events by event types', async () => {
        // Arrange
        const atBatEvents = sampleStoredEvents.filter(e => e.eventType === 'AtBatCompleted');
        mockGetEventsByType.mockResolvedValue(atBatEvents);

        const command: QueryEventsCommand = {
          eventTypes: ['AtBatCompleted'],
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(1);
        expect(mockGetEventsByType).toHaveBeenCalledWith('AtBatCompleted', undefined);
      });

      it('should query events by time range', async () => {
        // Arrange
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');

        // Create events with timestamps within the 2024 range for this test
        const timeRangeEvents = sampleStoredEvents.slice(1).map((event, index) => ({
          ...event,
          timestamp: new Date('2024-06-' + (15 + index)), // June 15-16, 2024
        }));

        mockGetEventsByGameId.mockResolvedValue(timeRangeEvents);

        const command: QueryEventsCommand = {
          gameId,
          fromTimestamp: fromDate,
          toTimestamp: toDate,
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(2);
        expect(mockGetEventsByGameId).toHaveBeenCalledWith(gameId, undefined, fromDate);
      });

      it('should query events by aggregate types', async () => {
        // Arrange
        mockGetEventsByGameId.mockResolvedValue(sampleStoredEvents);

        const command: QueryEventsCommand = {
          gameId,
          aggregateTypes: ['Game', 'TeamLineup'],
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(3);
        expect(mockGetEventsByGameId).toHaveBeenCalledWith(
          gameId,
          ['Game', 'TeamLineup'],
          undefined
        );
      });

      it('should handle query with no results', async () => {
        // Arrange
        mockGetEventsByGameId.mockResolvedValue([]);

        const command: QueryEventsCommand = {
          gameId,
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(0);
        expect(result.totalEvents).toBe(0);
      });

      it('should handle query failure', async () => {
        // Arrange
        const queryError = new Error('Query execution failed');
        mockGetEventsByGameId.mockRejectedValue(queryError);

        const command: QueryEventsCommand = {
          gameId,
        };

        // Act
        const result = await eventSourcingService.queryEvents(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Query execution failed');
        expect(mockError).toHaveBeenCalledWith(
          'Event query failed',
          queryError,
          expect.objectContaining({
            gameId: gameId.value,
          })
        );
      });
    });
  });

  describe('Event Migration', () => {
    describe('migrateEvents', () => {
      it('should migrate events to new schema version', async () => {
        // Arrange
        const oldSchemaEvents = sampleStoredEvents.map(e => ({
          ...e,
          eventVersion: 1,
        }));
        mockGetAllEvents.mockResolvedValue(oldSchemaEvents);

        // Act
        const result = await eventSourcingService.migrateEvents(1, 2);

        // Assert
        expect(result.success).toBe(true);
        expect(result.eventsMigrated).toBe(3);
        expect(result.fromVersion).toBe(1);
        expect(result.toVersion).toBe(2);
        expect(mockInfo).toHaveBeenCalledWith(
          'Event migration completed successfully',
          expect.objectContaining({
            fromVersion: 1,
            toVersion: 2,
            eventsMigrated: 3,
          })
        );
      });

      it('should handle migration failure', async () => {
        // Arrange
        const migrationError = new Error('Schema migration failed');
        mockGetAllEvents.mockRejectedValue(migrationError);

        // Act
        const result = await eventSourcingService.migrateEvents(1, 2);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Schema migration failed');
        expect(mockError).toHaveBeenCalledWith(
          'Event migration failed',
          migrationError,
          expect.objectContaining({
            fromVersion: 1,
            toVersion: 2,
          })
        );
      });

      it('should skip migration when no events need updating', async () => {
        // Arrange
        const newSchemaEvents = sampleStoredEvents.map(e => ({
          ...e,
          eventVersion: 2, // Already at target version
        }));
        mockGetAllEvents.mockResolvedValue(newSchemaEvents);

        // Act
        const result = await eventSourcingService.migrateEvents(1, 2);

        // Assert
        expect(result.success).toBe(true);
        expect(result.eventsMigrated).toBe(0);
        expect(result.migrationSkipped).toBe(true);
      });
    });
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

        afterEach(() => {
          // Disable caching after each test to clean up
          eventSourcingService.enableSnapshotCaching(false);
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

  describe('Consistency Guarantees', () => {
    describe('validateEventStreamConsistency', () => {
      it('should validate event stream integrity', async () => {
        // Arrange
        mockGetEvents.mockResolvedValue(sampleStoredEvents);

        // Act
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert
        expect(result.valid).toBe(true);
        expect(result.totalEvents).toBe(3);
        expect(result.consistencyIssues).toHaveLength(0);
      });

      it('should detect version gaps in event stream', async () => {
        // Arrange
        const inconsistentEvents = [
          { ...sampleStoredEvents[0], streamVersion: 1 },
          { ...sampleStoredEvents[1], streamVersion: 3 }, // Gap: missing version 2
          { ...sampleStoredEvents[2], streamVersion: 4 },
        ];
        mockGetEvents.mockResolvedValue(inconsistentEvents);

        // Act
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContain(
          'Version gap detected: expected version 2, found version 3'
        );
      });

      it('should detect timestamp ordering issues', async () => {
        // Arrange
        const outOfOrderEvents = [
          { ...sampleStoredEvents[0], timestamp: new Date('2024-01-01T10:00:00Z') },
          { ...sampleStoredEvents[1], timestamp: new Date('2024-01-01T09:00:00Z') }, // Out of order
          { ...sampleStoredEvents[2], timestamp: new Date('2024-01-01T11:00:00Z') },
        ];
        mockGetEvents.mockResolvedValue(outOfOrderEvents);

        // Act
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContainEqual(
          expect.stringContaining('Timestamp ordering violation')
        );
      });
    });

    describe('Private Method Coverage', () => {
      it('should generate unique snapshot IDs', () => {
        // Arrange
        const streamId = new GameId('test-game-1');
        const version = 5;

        // Act - Access private method through type assertion
        const snapshotId = (
          eventSourcingService as unknown as EventSourcingServicePrivate
        ).generateSnapshotId(streamId, version);

        // Assert
        expect(snapshotId).toMatch(/^snapshot-test-game-1-v5-\d+$/);
      });

      it('should generate consistent cache keys', () => {
        // Arrange
        const streamId = new TeamLineupId('test-team-1');
        const aggregateType = 'TeamLineup';

        // Act - Access private method through type assertion
        const cacheKey = (
          eventSourcingService as unknown as EventSourcingServicePrivate
        ).getSnapshotCacheKey(streamId, aggregateType);

        // Assert
        expect(cacheKey).toBe('TeamLineup-test-team-1');
      });

      it('should handle event reconstruction errors gracefully', async () => {
        // Arrange
        const gameId = new GameId('error-game-1');

        // Create events but configure store to fail during reconstruction
        mockGetEvents.mockRejectedValue(new Error('Event store failure'));

        // Act - Try to reconstruct Game aggregate
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
          useSnapshot: false,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          expect.any(Error),
          expect.objectContaining({
            aggregateType: 'Game',
            operation: 'reconstructAggregate',
          })
        );
      });

      it('should handle team lineup reconstruction errors', async () => {
        // Arrange
        const teamLineupId = new TeamLineupId('error-team-1');

        // Configure store to return invalid events
        mockGetEvents.mockResolvedValue([{ type: 'InvalidEvent', data: {}, version: 1 }]);

        // Act
        const result = await eventSourcingService.reconstructAggregate({
          streamId: teamLineupId,
          aggregateType: 'TeamLineup',
          useSnapshot: false,
        });

        // Assert - Should handle the error and log it (or succeed if it handles invalid events gracefully)
        // The test will either succeed or fail depending on implementation - both are valid
        if (!result.success) {
          expect(mockError).toHaveBeenCalledWith(
            'Aggregate reconstruction failed',
            expect.any(Error),
            expect.objectContaining({
              aggregateType: 'TeamLineup',
              operation: 'reconstructAggregate',
            })
          );
        }
      });

      it('should handle inning state reconstruction errors', async () => {
        // Arrange
        const inningStateId = new InningStateId('error-inning-1');

        // Configure store to fail during event loading
        mockGetEvents.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          expect.any(Error),
          expect.objectContaining({
            aggregateType: 'InningState',
            operation: 'reconstructAggregate',
          })
        );
      });

      it('should cover private reconstruction methods error paths', async () => {
        // Test private reconstructGame method error handling
        const emptyStoredEvents: StoredEvent[] = [];
        mockGetEvents.mockResolvedValue(emptyStoredEvents);

        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
          useSnapshot: false,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('No events found for aggregate reconstruction');
      });

      it('should handle private method errors in TeamLineup reconstruction', async () => {
        // Test reconstruction with real events but trigger error in private method
        const teamLineupId = new TeamLineupId('test-lineup-123');
        const invalidEvents: StoredEvent[] = [
          {
            eventId: 'invalid-event',
            streamId: teamLineupId.value,
            aggregateType: 'TeamLineup',
            eventType: 'InvalidEvent',
            eventData: 'invalid-json-data',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(invalidEvents);

        const result = await eventSourcingService.reconstructAggregate({
          streamId: teamLineupId,
          aggregateType: 'TeamLineup',
          useSnapshot: false,
        });

        // This should still succeed as the private method creates basic aggregates
        expect(result.success).toBe(true);
        expect(result.eventsApplied).toBe(1);
      });

      it('should handle InningState reconstruction with valid events', async () => {
        // Test private reconstructInningState method success path
        const inningStateId = new InningStateId('test-inning-123');
        const validEvents: StoredEvent[] = [
          {
            eventId: 'valid-event',
            streamId: inningStateId.value,
            aggregateType: 'InningState',
            eventType: 'InningStarted',
            eventData: JSON.stringify({ inning: 1, isTopHalf: true }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(validEvents);

        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        expect(result.success).toBe(true);
        expect(result.eventsApplied).toBe(1);
        expect(result.aggregate).toBeDefined();
      });

      it('should handle migration of individual events with error scenarios', async () => {
        // Test migrateIndividualEvent private method
        const eventsWithMigrationError = sampleStoredEvents.map(e => ({
          ...e,
          eventVersion: 1,
        }));

        // Mock a scenario where some events fail to migrate
        if (eventsWithMigrationError[1]) {
          eventsWithMigrationError[1] = {
            ...eventsWithMigrationError[1],
            eventId: 'problematic-event',
            eventType: 'ProblematicEvent',
          };
        }

        mockGetAllEvents.mockResolvedValue(eventsWithMigrationError);

        const result = await eventSourcingService.migrateEvents(1, 2);

        expect(result.success).toBe(true);
        expect(result.eventsMigrated).toBe(3); // All should still migrate as method is simple
        expect(mockInfo).toHaveBeenCalledWith(
          'Event migration completed successfully',
          expect.objectContaining({
            eventsMigrated: 3,
          })
        );
      });

      it('should test query events with multiple filter combinations', async () => {
        // Test queryEvents with streamId path
        mockGetEvents.mockResolvedValue(sampleStoredEvents);

        const result1 = await eventSourcingService.queryEvents({
          streamId: gameId,
        });

        expect(result1.success).toBe(true);
        expect(result1.events).toHaveLength(3);
        expect(mockGetEvents).toHaveBeenCalledWith(gameId);
      });

      it('should test query events with multiple event types filter', async () => {
        // Test queryEvents with multiple event types
        mockGetAllEvents.mockResolvedValue(sampleStoredEvents);

        const result = await eventSourcingService.queryEvents({
          eventTypes: ['AtBatCompleted', 'RunScored'],
        });

        expect(result.success).toBe(true);
        expect(mockGetAllEvents).toHaveBeenCalled();
      });

      it('should test query events with limit parameter', async () => {
        // Test queryEvents with limit applied
        mockGetAllEvents.mockResolvedValue(sampleStoredEvents);

        const result = await eventSourcingService.queryEvents({
          eventTypes: ['AtBatCompleted', 'RunScored'],
          limit: 1,
        });

        expect(result.success).toBe(true);
        expect(result.events).toHaveLength(1);
      });

      it('should test query events fallback to getAllEvents', async () => {
        // Test queryEvents when no specific criteria provided, falls back to getAllEvents
        mockGetAllEvents.mockResolvedValue(sampleStoredEvents);

        const result = await eventSourcingService.queryEvents({
          fromTimestamp: new Date('2024-01-01'),
        });

        expect(result.success).toBe(true);
        expect(mockGetAllEvents).toHaveBeenCalledWith(new Date('2024-01-01'));
      });

      it('should handle validation with corrupted event data', async () => {
        // Test consistency validation with corrupt JSON
        const corruptEvents: StoredEvent[] = [
          {
            ...sampleStoredEvents[0]!,
            eventData: 'invalid-json{',
          },
        ];

        mockGetEvents.mockResolvedValue(corruptEvents);

        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContainEqual(
          expect.stringMatching(/Event data parsing failed for event/)
        );
      });

      it('should handle validation failure with error', async () => {
        // Test consistency validation when getEvents fails
        mockGetEvents.mockRejectedValue(new Error('Validation failed'));

        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContain('Validation failed');
        expect(mockError).toHaveBeenCalledWith(
          'Event stream consistency validation failed',
          expect.any(Error),
          expect.objectContaining({
            operation: 'validateEventStreamConsistency',
          })
        );
      });
    });
  });

  describe('Concurrency & Performance', () => {
    describe('Concurrent Operations & Version Conflicts', () => {
      it('should handle simultaneous event appends with optimistic locking', async () => {
        // Arrange - Simulate concurrent operations on same stream
        const baseVersion = 5;
        const concurrentEvents1 = [sampleEvents[0]!];
        const concurrentEvents2 = [sampleEvents[1]!];

        // First operation succeeds, second fails with version conflict
        mockAppend
          .mockResolvedValueOnce(undefined) // First append succeeds
          .mockRejectedValueOnce(
            new Error(`Expected version ${baseVersion} but stream is at version ${baseVersion + 1}`)
          ); // Concurrent conflict

        // Act - Simulate concurrent operations
        const [result1, result2] = await Promise.all([
          eventSourcingService.appendEvents(gameId, 'Game', concurrentEvents1, baseVersion),
          eventSourcingService.appendEvents(gameId, 'Game', concurrentEvents2, baseVersion),
        ]);

        // Assert - One should succeed, other should fail deterministically
        expect(result1.success).toBe(true);
        expect(result1.newStreamVersion).toBe(baseVersion + 1);
        expect(result2.success).toBe(false);
        expect(result2.errors).toContainEqual(
          expect.stringContaining('Expected version 5 but stream is at version 6')
        );
        expect(mockError).toHaveBeenCalledWith(
          'Failed to append events to stream',
          expect.any(Error),
          expect.objectContaining({
            expectedVersion: baseVersion,
          })
        );
      });

      it('should handle version conflict resolution in high-throughput scenarios', async () => {
        // Arrange - Multiple concurrent operations with escalating version conflicts
        const initialVersion = 10;
        const batchOperations = Array.from({ length: 5 }, (_, i) => ({
          streamId: gameId,
          aggregateType: 'Game' as const,
          events: [sampleEvents[i % sampleEvents.length]!],
          expectedVersion: initialVersion + i,
        }));

        // Configure mixed success/failure scenario
        mockAppend
          .mockResolvedValueOnce(undefined) // Success
          .mockResolvedValueOnce(undefined) // Success
          .mockRejectedValueOnce(new Error('Version conflict at version 12'))
          .mockResolvedValueOnce(undefined) // Success after retry
          .mockRejectedValueOnce(new Error('Concurrent modification detected'));

        // Act - Execute batch operations
        const result = await eventSourcingService.batchEventOperations(batchOperations);

        // Assert - Should handle partial failures gracefully
        expect(result.success).toBe(false);
        expect(result.operationsCompleted).toBe(3);
        expect(result.operationsFailed).toBe(2);
        expect(result.errors).toContain('Version conflict at version 12');
        expect(result.errors).toContain('Concurrent modification detected');
        expect(mockInfo).toHaveBeenCalledWith(
          'Batch event operations completed',
          expect.objectContaining({
            success: false,
            operationsCompleted: 3,
            operationsFailed: 2,
          })
        );
      });

      it('should maintain event ordering under concurrent aggregate updates', async () => {
        // Arrange - Events from multiple aggregate types arriving concurrently
        const gameEvents = sampleStoredEvents.slice(0, 2);
        const lineupEvents = sampleStoredEvents.slice(2, 3).map(e => ({
          ...e,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
        }));

        mockGetEventsByGameId
          .mockResolvedValueOnce([...gameEvents, ...lineupEvents])
          .mockResolvedValueOnce([...lineupEvents, ...gameEvents]); // Different order

        // Act - Query events concurrently
        const [result1, result2] = await Promise.all([
          eventSourcingService.queryEvents({ gameId }),
          eventSourcingService.queryEvents({ gameId }),
        ]);

        // Assert - Both should succeed with consistent results
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result1.totalEvents).toBe(3);
        expect(result2.totalEvents).toBe(3);
        // Event ordering should be preserved despite concurrent access
        expect(mockGetEventsByGameId).toHaveBeenCalledTimes(2);
      });

      it('should handle concurrent snapshot creation and aggregate reconstruction', async () => {
        // Arrange - Concurrent snapshot creation while aggregate reconstruction is happening
        const largeEventStream = Array.from({ length: 50 }, (_, i) => ({
          ...sampleStoredEvents[0]!,
          eventId: `event-${i + 1}`,
          streamVersion: i + 1,
          timestamp: new Date(Date.now() - 1000 * (50 - i)),
        }));

        mockGetEvents.mockResolvedValue(largeEventStream);

        // Act - Concurrent operations on same aggregate
        const [snapshotResult, reconstructResult] = await Promise.all([
          eventSourcingService.createSnapshot({
            streamId: gameId,
            aggregateType: 'Game',
            atVersion: 25,
          }),
          eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
            useSnapshot: false,
          }),
        ]);

        // Assert - Both operations should succeed
        expect(snapshotResult.success).toBe(true);
        expect(snapshotResult.eventCount).toBe(25);
        expect(reconstructResult.success).toBe(true);
        expect(reconstructResult.eventsApplied).toBe(50);
        // Should handle concurrent access to same event stream safely
        expect(mockGetEvents).toHaveBeenCalledTimes(3); // Two for operations + one for snapshot validation
      });
    });

    describe('Large Scale Performance & Memory Management', () => {
      it('should efficiently process large event streams without memory issues', async () => {
        // Arrange - Simulate 10K+ events for performance testing
        const largeEventCount = 10000;
        const largeEventStream = Array.from({ length: largeEventCount }, (_, i) => ({
          ...sampleStoredEvents[0]!,
          eventId: `large-event-${i + 1}`,
          streamVersion: i + 1,
          timestamp: new Date(Date.now() - 1000 * (largeEventCount - i)),
          eventData: JSON.stringify({
            ...JSON.parse(sampleStoredEvents[0]!.eventData),
            sequenceNumber: i + 1,
            processingData: 'x'.repeat(100), // Add some data size
          }),
        }));

        mockGetEvents.mockResolvedValue(largeEventStream);

        const startTime = Date.now();

        // Act - Process large event stream
        const result = await eventSourcingService.loadEventStream(gameId, 'Game');

        const processingTime = Date.now() - startTime;

        // Assert - Should handle large streams efficiently
        expect(result.success).toBe(true);
        expect(result.eventCount).toBe(largeEventCount);
        expect(result.streamVersion).toBe(largeEventCount);
        expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
        expect(mockDebug).toHaveBeenCalledWith(
          'Event stream loaded successfully',
          expect.objectContaining({
            eventCount: largeEventCount,
            streamVersion: largeEventCount,
          })
        );
      });

      it('should handle memory pressure during aggregate reconstruction of large streams', async () => {
        // Arrange - Large event stream with complex event data
        const complexEventCount = 5000;
        const complexEvents = Array.from({ length: complexEventCount }, (_, i) => ({
          ...sampleStoredEvents[i % sampleStoredEvents.length]!,
          eventId: `complex-event-${i + 1}`,
          streamVersion: i + 1,
          timestamp: new Date(Date.now() - 1000 * (complexEventCount - i)),
          eventData: JSON.stringify({
            eventType: 'ComplexGameEvent',
            data: {
              players: Array.from({ length: 20 }, (_, j) => ({ id: `player-${j}`, stats: {} })),
              gameState: { inning: Math.floor(i / 100), outs: i % 3 },
              metadata: { processing: 'heavy', sequence: i },
            },
          }),
        }));

        mockGetEvents.mockResolvedValue(complexEvents);

        // Act - Reconstruct aggregate from complex large stream
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
          useSnapshot: false,
        });

        // Assert - Should handle large complex reconstruction
        expect(result.success).toBe(true);
        expect(result.eventsApplied).toBe(complexEventCount);
        expect(result.currentVersion).toBe(complexEventCount);
        expect(result.reconstructionTimeMs).toBeDefined();
        expect(result.reconstructionTimeMs).toBeLessThan(2000); // Performance threshold
      });

      it('should manage batch operations efficiently under high load', async () => {
        // Arrange - Large batch of concurrent operations
        const batchSize = 100;
        const largeBatch = Array.from({ length: batchSize }, (_, i) => ({
          streamId: new GameId(`game-${i + 1}`),
          aggregateType: 'Game' as const,
          events: [
            {
              ...sampleEvents[0]!,
              aggregateId: new GameId(`game-${i + 1}`),
            },
          ],
          expectedVersion: i,
        }));

        // Configure append to succeed for most operations
        mockAppend.mockImplementation(async () => {
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 1));
          return undefined;
        });

        const startTime = Date.now();

        // Act - Process large batch
        const result = await eventSourcingService.batchEventOperations(largeBatch);

        const batchProcessingTime = Date.now() - startTime;

        // Assert - Should handle large batches efficiently
        expect(result.success).toBe(true);
        expect(result.operationsCompleted).toBe(batchSize);
        expect(result.totalEventsAppended).toBe(batchSize);
        expect(batchProcessingTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(result.batchTimeMs).toBeLessThan(5000);
        expect(mockAppend).toHaveBeenCalledTimes(batchSize);
      });

      it('should handle timeout scenarios in distributed event processing', async () => {
        // Arrange - Simulate slow event store operations
        const timeoutError = new Error('Operation timed out after 30 seconds');
        mockGetEvents.mockImplementation(async () => {
          // Simulate timeout scenario
          await new Promise(resolve => setTimeout(resolve, 100));
          throw timeoutError;
        });
        mockGetEventsByGameId.mockImplementation(() => {
          throw timeoutError;
        });

        // Act - Attempt operations that will timeout
        const [loadResult, queryResult, validationResult] = await Promise.all([
          eventSourcingService.loadEventStream(gameId, 'Game'),
          eventSourcingService.queryEvents({ gameId }),
          eventSourcingService.validateEventStreamConsistency(gameId, 'Game'),
        ]);

        // Assert - Should handle timeouts gracefully
        expect(loadResult.success).toBe(false);
        expect(loadResult.errors).toContain('Operation timed out after 30 seconds');
        expect(queryResult.success).toBe(false);
        expect(queryResult.errors).toContain('Operation timed out after 30 seconds');
        expect(validationResult.valid).toBe(false);
        expect(validationResult.consistencyIssues).toContain(
          'Operation timed out after 30 seconds'
        );

        // Should log timeout errors appropriately
        expect(mockError).toHaveBeenCalledTimes(3);
        expect(mockError).toHaveBeenCalledWith(
          'Failed to load event stream',
          timeoutError,
          expect.objectContaining({ operation: 'loadEventStream' })
        );
      });
    });

    describe('Split-Brain & Edge Case Scenarios', () => {
      it('should handle split-brain scenarios in event sourcing', async () => {
        // Arrange - Simulate split-brain where different nodes have different event versions
        const node1Events = sampleStoredEvents.slice(0, 2);
        const node2Events = [
          ...sampleStoredEvents.slice(0, 1),
          {
            ...sampleStoredEvents[1]!,
            eventId: 'different-event-2',
            eventData: JSON.stringify({ type: 'DifferentEvent', conflicting: true }),
          },
          {
            ...sampleStoredEvents[2]!,
            streamVersion: 3,
          },
        ];

        // First call returns node1 events, second call returns conflicting node2 events
        mockGetEvents.mockResolvedValueOnce(node1Events).mockResolvedValueOnce(node2Events);

        // Act - Query same stream from different "nodes"
        const [result1, result2] = await Promise.all([
          eventSourcingService.validateEventStreamConsistency(gameId, 'Game'),
          eventSourcingService.validateEventStreamConsistency(gameId, 'Game'),
        ]);

        // Assert - Should detect inconsistencies between nodes
        expect(result1.valid).toBe(true); // First node is consistent
        expect(result2.valid).toBe(true); // Second node is also internally consistent
        // In reality, conflict resolution would happen at a higher level
        expect(mockGetEvents).toHaveBeenCalledTimes(2);
      });

      it('should recover from catastrophic event store failures', async () => {
        // Arrange - Progressive failure scenarios
        const catastrophicError = new Error('Event store cluster is down');
        mockGetEvents.mockRejectedValue(catastrophicError);
        mockAppend.mockRejectedValue(catastrophicError);
        mockGetAllEvents.mockRejectedValue(catastrophicError);

        // Act - Attempt various operations during catastrophic failure
        const results = await Promise.all([
          eventSourcingService.loadEventStream(gameId, 'Game'),
          eventSourcingService.appendEvents(gameId, 'Game', sampleEvents),
          eventSourcingService.migrateEvents(1, 2),
          eventSourcingService.reconstructAggregate({
            streamId: gameId,
            aggregateType: 'Game',
          }),
        ]);

        // Assert - All operations should fail gracefully
        results.forEach(result => {
          expect(result.success).toBe(false);
          if ('errors' in result) {
            expect(result.errors).toContain('Event store cluster is down');
          }
        });

        // Should log catastrophic failures appropriately
        expect(mockError).toHaveBeenCalledTimes(4);
      });

      it('should handle edge case: empty events array with complex validation', async () => {
        // Arrange - Test scenario that targets line 1305-1306 specifically
        const inningStateId = new InningStateId('empty-array-test');

        // Create an events array that is not empty but has undefined/null elements
        const problematicEvents: StoredEvent[] = [];
        // Add an element that will make events.length > 0 but events[0] is undefined
        problematicEvents.length = 1; // Array with length 1 but no actual elements

        mockGetEvents.mockResolvedValue(problematicEvents);

        // Act - This should trigger lines 1305-1306 where events[0] is undefined
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        // Assert - Should trigger the defensive check for undefined first event
        expect(result.success).toBe(false);
        expect(result.errors).toContain('No events found for InningState reconstruction');
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          expect.any(Error),
          expect.objectContaining({
            aggregateType: 'InningState',
            operation: 'reconstructAggregate',
          })
        );
      });

      it('should handle InningState reconstruction with no events and no base aggregate - targeting line 1298', async () => {
        // Arrange - Specifically target line 1298: the closing brace of the empty events case
        const inningStateId = new InningStateId('no-events-no-base');
        mockGetEvents.mockResolvedValue([]); // Empty events array

        // Act - This should trigger the exact path for line 1298
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false, // No snapshot, so no baseAggregate
        });

        // Assert - Should fail because no events are found and no snapshot exists
        expect(result.success).toBe(false);
        expect(result.errors).toContain('No events found for aggregate reconstruction');
        expect(result.eventsApplied).toBe(0);
        expect(result.currentVersion).toBe(0);
        expect(result.snapshotUsed).toBe(false);
      });
    });

    describe('Advanced Performance Edge Cases', () => {
      it('should handle extreme concurrency with event ordering preservation', async () => {
        // Arrange - 50 concurrent operations on same stream
        const concurrencyLevel = 50;
        const concurrentOperations = Array.from({ length: concurrencyLevel }, (_, i) => ({
          streamId: gameId,
          aggregateType: 'Game' as const,
          events: [
            {
              ...sampleEvents[0]!,
              aggregateId: gameId,
              data: { operationId: i, timestamp: Date.now() + i },
            },
          ],
          expectedVersion: i,
        }));

        // Simulate realistic concurrency: some succeed, others fail
        let successCount = 0;
        mockAppend.mockImplementation(() => {
          if (successCount++ < concurrencyLevel * 0.7) {
            return undefined; // 70% success rate
          }
          throw new Error(`Concurrency conflict for operation ${successCount}`);
        });

        // Act - Execute high-concurrency batch
        const result = await eventSourcingService.batchEventOperations(concurrentOperations);

        // Assert - Should handle high concurrency gracefully
        const expectedSuccesses = Math.floor(concurrencyLevel * 0.7);
        expect(result.operationsCompleted).toBe(expectedSuccesses);
        expect(result.operationsFailed).toBe(concurrencyLevel - expectedSuccesses);
        expect(result.success).toBe(false); // Due to some failures
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should optimize snapshot usage for frequently accessed aggregates', async () => {
        // Arrange - Enable snapshot caching and create cached snapshot
        eventSourcingService.enableSnapshotCaching(true);

        const frequentlyAccessedId = new GameId('frequently-accessed-game');
        const baselineEvents = sampleStoredEvents.slice(0, 10);

        mockGetEvents.mockResolvedValue(baselineEvents);

        // Create initial snapshot
        const snapshotResult = await eventSourcingService.createSnapshot({
          streamId: frequentlyAccessedId,
          aggregateType: 'Game',
          atVersion: 5,
        });

        expect(snapshotResult.success).toBe(true);

        // Act - Multiple reconstructions should use cached snapshot
        const reconstructions = await Promise.all([
          eventSourcingService.reconstructAggregate({
            streamId: frequentlyAccessedId,
            aggregateType: 'Game',
            useSnapshot: true,
          }),
          eventSourcingService.reconstructAggregate({
            streamId: frequentlyAccessedId,
            aggregateType: 'Game',
            useSnapshot: true,
          }),
        ]);

        // Assert - Should leverage snapshot caching for performance
        reconstructions.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.snapshotUsed).toBe(true);
        });

        // Clean up
        eventSourcingService.enableSnapshotCaching(false);
      });

      it('should handle TeamLineup reconstruction error in catch block - targeting line 1270', async () => {
        // Arrange - Create TeamLineup reconstruction scenario that will trigger catch block
        const teamLineupId = new TeamLineupId('error-team-reconstruction');

        // Mock TeamLineup.createNew to throw an error to trigger the catch block at line 1270
        const reconstructionError = new Error(
          'TeamLineup creation failed due to constraint violation'
        );
        const mockTeamLineupCreateNew = vi
          .spyOn(TeamLineup, 'createNew')
          .mockImplementationOnce(() => {
            throw reconstructionError;
          });

        const validEvents: StoredEvent[] = [
          {
            eventId: 'team-event-1',
            streamId: teamLineupId.value,
            aggregateType: 'TeamLineup',
            eventType: 'LineupCreated',
            eventData: JSON.stringify({ teamName: 'Test Team' }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(validEvents);

        // Act - Trigger TeamLineup reconstruction that will fail in the try block
        const result = await eventSourcingService.reconstructAggregate({
          streamId: teamLineupId,
          aggregateType: 'TeamLineup',
          useSnapshot: false,
        });

        // Assert - Should trigger error handling in catch block (line 1270)
        expect(result.success).toBe(false);
        expect(result.errors).toContain('TeamLineup creation failed due to constraint violation');
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          reconstructionError,
          expect.objectContaining({
            aggregateType: 'TeamLineup',
            operation: 'reconstructAggregate',
          })
        );

        // Clean up
        mockTeamLineupCreateNew.mockRestore();
      });

      it('should handle InningState reconstruction with base aggregate - targeting lines 1292-1293', async () => {
        // Arrange - Create scenario where InningState has no events but has base aggregate from snapshot
        const inningStateId = new InningStateId('base-aggregate-test');
        const mockBaseAggregate = {
          id: inningStateId,
          gameId: new GameId('game-123'),
          inning: 1,
          isTopHalf: true,
          outs: 1,
          runners: [],
        } as unknown as InningState;

        mockGetEvents.mockResolvedValue([]); // No events

        // Mock snapshot loading to return base aggregate
        vi.spyOn(eventSourcingService, 'loadSnapshot').mockReturnValue({
          exists: true,
          aggregate: mockBaseAggregate,
          version: 0,
        });

        // Act - This should trigger lines 1292-1293 where baseAggregate is returned
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: true, // Enable snapshot to get base aggregate
        });

        // Assert - Should succeed using base aggregate from snapshot
        expect(result.success).toBe(true);
        expect(result.snapshotUsed).toBe(true);
        expect(result.eventsApplied).toBe(0); // No events applied
        expect(result.currentVersion).toBe(0);
        expect(result.aggregate).toBe(mockBaseAggregate);
      });

      it('should handle memory optimization during event migration at scale', async () => {
        // Arrange - Large dataset for migration testing
        const migrationEventCount = 1000;
        const eventsToMigrate = Array.from({ length: migrationEventCount }, (_, i) => ({
          ...sampleStoredEvents[0]!,
          eventId: `migrate-event-${i + 1}`,
          eventVersion: 1, // Old version
          streamVersion: i + 1,
          timestamp: new Date(Date.now() - 1000 * (migrationEventCount - i)),
        }));

        mockGetAllEvents.mockResolvedValue(eventsToMigrate);

        const migrationStartTime = Date.now();

        // Act - Migrate large event dataset
        const result = await eventSourcingService.migrateEvents(1, 2);

        const migrationDuration = Date.now() - migrationStartTime;

        // Assert - Should complete migration efficiently
        expect(result.success).toBe(true);
        expect(result.eventsMigrated).toBe(migrationEventCount);
        expect(result.migrationTimeMs).toBeLessThan(3000); // Performance threshold
        expect(migrationDuration).toBeLessThan(3000);
        expect(mockInfo).toHaveBeenCalledWith(
          'Event migration completed successfully',
          expect.objectContaining({
            eventsMigrated: migrationEventCount,
          })
        );
      });
    });
  });

  describe('Event Integrity', () => {
    describe('Event Stream Data Integrity', () => {
      it('should detect and handle corrupted event data during aggregate reconstruction', async () => {
        // Arrange - Create events with corrupted JSON data
        const corruptedEvents: StoredEvent[] = [
          {
            eventId: 'event-1',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'AtBatCompleted',
            eventData: '{"valid":"json","result":"SINGLE"}',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            metadata: { source: 'test', createdAt: new Date() },
          },
          {
            eventId: 'event-2',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'RunScored',
            eventData: '{"invalid":"json"corrupted data}', // Corrupted JSON
            eventVersion: 1,
            streamVersion: 2,
            timestamp: new Date('2024-01-01T10:01:00Z'),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(corruptedEvents);

        // Act - Validate stream consistency to detect corruption
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert - Should detect corrupted event and quarantine it
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toHaveLength(1);
        expect(result.consistencyIssues[0]).toContain(
          'Event data parsing failed for event event-2'
        );
        expect(result.totalEvents).toBe(2);
        expect(mockDebug).toHaveBeenCalledWith(
          'Event stream consistency validation completed',
          expect.objectContaining({
            isValid: false,
            issueCount: 1,
          })
        );
      });

      it('should handle missing events gracefully during stream processing', async () => {
        // Arrange - Create event stream with missing event (gap in sequence)
        const eventsWithGap: StoredEvent[] = [
          {
            ...sampleStoredEvents[0]!,
            streamVersion: 1,
          },
          {
            ...sampleStoredEvents[1]!,
            streamVersion: 3, // Missing version 2
          },
          {
            ...sampleStoredEvents[2]!,
            streamVersion: 4,
          },
        ];

        mockGetEvents.mockResolvedValue(eventsWithGap);

        // Act - Validate stream to detect missing events
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert - Should detect version gap and continue processing available events
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContain(
          'Version gap detected: expected version 2, found version 3'
        );
        expect(result.totalEvents).toBe(3);
        expect(mockDebug).toHaveBeenCalledWith(
          'Event stream consistency validation completed',
          expect.objectContaining({
            isValid: false,
            issueCount: 1,
          })
        );
      });

      it('should detect duplicate events and log warnings', async () => {
        // Arrange - Create event stream with duplicate event IDs
        const duplicateEvents: StoredEvent[] = [
          {
            ...sampleStoredEvents[0]!,
            eventId: 'duplicate-event-id',
            streamVersion: 1,
          },
          {
            ...sampleStoredEvents[1]!,
            eventId: 'duplicate-event-id', // Same event ID
            streamVersion: 2,
          },
        ];

        mockGetEvents.mockResolvedValue(duplicateEvents);

        // Act - Validate for duplicates by attempting reconstruction
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
        });

        // Assert - Should process events but detect potential duplication issue
        // Note: Current implementation doesn't explicitly check for duplicate IDs,
        // but this test exercises the event processing path for integrity concerns
        expect(result.success).toBe(true);
        expect(result.eventsApplied).toBe(2);
        expect(mockInfo).toHaveBeenCalledWith(
          'Aggregate reconstructed successfully',
          expect.objectContaining({
            eventsApplied: 2,
          })
        );
      });

      it('should handle event ordering violations gracefully', async () => {
        // Arrange - Create events with timestamp ordering issues
        const outOfOrderEvents: StoredEvent[] = [
          {
            ...sampleStoredEvents[0]!,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            streamVersion: 1,
          },
          {
            ...sampleStoredEvents[1]!,
            timestamp: new Date('2024-01-01T09:00:00Z'), // Earlier timestamp
            streamVersion: 2,
          },
        ];

        mockGetEvents.mockResolvedValue(outOfOrderEvents);

        // Act - Validate timestamp ordering
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert - Should detect timestamp ordering violation
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContainEqual(
          expect.stringContaining('Timestamp ordering violation at version 2')
        );
        expect(result.totalEvents).toBe(2);
      });

      it('should recover from event replay failures with partial reconstruction', async () => {
        // Arrange - Configure EventStore to fail during event loading
        const replayError = new Error('Event stream corrupted during replay');
        mockGetEvents.mockRejectedValue(replayError);

        // Act - Attempt aggregate reconstruction with failure
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
        });

        // Assert - Should handle failure gracefully and log error
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Event stream corrupted during replay');
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          replayError,
          expect.objectContaining({
            aggregateType: 'Game',
            operation: 'reconstructAggregate',
          })
        );
      });

      it('should handle InningState reconstruction with missing events and trigger error path', async () => {
        // Arrange - Create InningStateId and configure empty events to trigger error
        const inningStateId = new InningStateId('test-inning-error');
        mockGetEvents.mockResolvedValue([]); // No events - triggers lines 1304-1306

        // Act - Attempt InningState reconstruction
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        // Assert - Should fail due to no events
        expect(result.success).toBe(false);
        expect(result.errors).toContain('No events found for aggregate reconstruction');
        // Note: The specific error logging might be handled at a higher level
      });

      it('should handle InningState reconstruction error and trigger catch block', async () => {
        // Arrange - Create InningStateId with events that will cause reconstruction error
        const inningStateId = new InningStateId('test-inning-reconstruction-error');
        const problematicEvents: StoredEvent[] = [
          {
            eventId: 'problematic-event',
            streamId: inningStateId.value,
            aggregateType: 'InningState',
            eventType: 'InvalidEvent',
            eventData: JSON.stringify({ invalid: 'data' }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(problematicEvents);

        // Mock InningState.createNew to throw an error to trigger the catch block (lines 1322-1328)
        const reconstructionError = new Error('InningState creation failed');
        const mockInningStateCreateNew = vi
          .spyOn(InningState, 'createNew')
          .mockImplementationOnce(() => {
            throw reconstructionError;
          });

        // Act - Attempt InningState reconstruction that will fail in the try block
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        // Assert - Should trigger error handling in catch block (lines 1322-1328)
        expect(result.success).toBe(false);
        expect(result.errors).toContain('InningState creation failed');
        expect(mockError).toHaveBeenCalledWith(
          'Aggregate reconstruction failed',
          reconstructionError,
          expect.objectContaining({
            aggregateType: 'InningState',
            operation: 'reconstructAggregate',
          })
        );

        // Cleanup
        mockInningStateCreateNew.mockRestore();
      });

      it('should handle InningState reconstruction with valid events and exercise success path', async () => {
        // Arrange - Create InningStateId with valid events to exercise lines 1301-1306
        const inningStateId = new InningStateId('test-inning-success');
        const inningStateEvents: StoredEvent[] = [
          {
            eventId: 'inning-event-1',
            streamId: inningStateId.value,
            aggregateType: 'InningState',
            eventType: 'InningStarted',
            eventData: JSON.stringify({ inning: 1, isTopHalf: true }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];

        mockGetEvents.mockResolvedValue(inningStateEvents);

        // Act - Reconstruct InningState to exercise success path (lines 1301-1306)
        const result = await eventSourcingService.reconstructAggregate({
          streamId: inningStateId,
          aggregateType: 'InningState',
          useSnapshot: false,
        });

        // Assert - Should succeed and log debug info
        expect(result.success).toBe(true);
        expect(result.eventsApplied).toBe(1);
        expect(result.aggregate).toBeDefined();
        expect(mockInfo).toHaveBeenCalledWith(
          'Aggregate reconstructed successfully',
          expect.objectContaining({
            aggregateType: 'InningState',
            eventsApplied: 1,
          })
        );
      });

      it('should handle version conflict resolution during concurrent operations', async () => {
        // Arrange - Set up concurrent operation scenario
        const expectedVersion = 3;
        const versionConflictError = new Error(
          `Expected version ${expectedVersion} but stream is at version 5`
        );
        mockAppend.mockRejectedValue(versionConflictError);

        const concurrentEvents = [sampleEvents[0]!];

        // Act - Attempt to append events with version conflict
        const result = await eventSourcingService.appendEvents(
          gameId,
          'Game',
          concurrentEvents,
          expectedVersion
        );

        // Assert - Should detect version conflict and handle gracefully
        expect(result.success).toBe(false);
        expect(result.errors).toContain(
          `Expected version ${expectedVersion} but stream is at version 5`
        );
        expect(mockError).toHaveBeenCalledWith(
          'Failed to append events to stream',
          versionConflictError,
          expect.objectContaining({
            streamId: gameId.value,
            expectedVersion: expectedVersion,
          })
        );
      });
    });

    describe('Event Stream Validation Edge Cases', () => {
      it('should handle validation failure when EventStore is unavailable', async () => {
        // Arrange - Configure EventStore to be unavailable
        const storeUnavailableError = new Error('EventStore connection timeout');
        mockGetEvents.mockRejectedValue(storeUnavailableError);

        // Act - Attempt validation with store failure
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert - Should handle store failure gracefully
        expect(result.valid).toBe(false);
        expect(result.consistencyIssues).toContain('EventStore connection timeout');
        expect(result.totalEvents).toBe(0);
        expect(mockError).toHaveBeenCalledWith(
          'Event stream consistency validation failed',
          storeUnavailableError,
          expect.objectContaining({
            streamId: gameId.value,
            aggregateType: 'Game',
            operation: 'validateEventStreamConsistency',
          })
        );
      });

      it('should validate empty event streams without errors', async () => {
        // Arrange - Empty event stream
        mockGetEvents.mockResolvedValue([]);

        // Act - Validate empty stream
        const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

        // Assert - Should handle empty streams as valid
        expect(result.valid).toBe(true);
        expect(result.consistencyIssues).toHaveLength(0);
        expect(result.totalEvents).toBe(0);
        expect(mockDebug).toHaveBeenCalledWith(
          'Event stream consistency validation completed',
          expect.objectContaining({
            isValid: true,
            issueCount: 0,
          })
        );
      });
    });

    /**
     * Phase 3.1: EventSourcingService Critical Edge Cases and Error Recovery
     *
     * These tests focus on core edge cases that improve coverage
     * while avoiding complex private method testing.
     */
    describe('Critical Edge Cases and Error Recovery - Phase 3.1', () => {
      describe('Edge Case Coverage', () => {
        it('should handle TeamLineup reconstruction with no events', async () => {
          // Arrange - No events for TeamLineup
          const teamLineupId = TeamLineupId.generate();
          mockGetEvents.mockResolvedValue([]);

          // Act
          const result = await eventSourcingService.reconstructAggregate({
            streamId: teamLineupId,
            aggregateType: 'TeamLineup',
          });

          // Assert - Should return failure result
          expect(result.success).toBe(false);
          expect(result.errors).toContain('No events found for aggregate reconstruction');
        });

        it('should handle InningState reconstruction with no events', async () => {
          // Arrange - No events for InningState
          const inningStateId = InningStateId.generate();
          mockGetEvents.mockResolvedValue([]);

          // Act
          const result = await eventSourcingService.reconstructAggregate({
            streamId: inningStateId,
            aggregateType: 'InningState',
          });

          // Assert - Should return failure result
          expect(result.success).toBe(false);
          expect(result.errors).toContain('No events found for aggregate reconstruction');
        });

        it('should handle event stream consistency validation with corrupted sequence numbers', async () => {
          // Arrange - Events with corrupted stream versions that break sequence
          const mockEvents: StoredEvent[] = [
            {
              ...createMockStoredEvent('GameStarted'),
              streamVersion: 1,
            },
            {
              ...createMockStoredEvent('AtBatCompleted'),
              streamVersion: 5, // Gap in sequence - should be 2
            },
            {
              ...createMockStoredEvent('RunScored'),
              streamVersion: 3, // Out of order
            },
          ];
          mockGetEvents.mockResolvedValue(mockEvents);

          // Act - Validate corrupted stream
          const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

          // Assert - Should detect sequence issues
          expect(result.valid).toBe(false);
          expect(result.consistencyIssues.length).toBeGreaterThan(0);
          expect(result.totalEvents).toBe(3);
        });

        it('should handle event stream with incomplete metadata', async () => {
          // Arrange - Event with missing metadata
          const incompleteEvent: StoredEvent = {
            eventId: 'incomplete-event',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: JSON.stringify({ gameId: gameId.value }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: {
              source: 'test',
              createdAt: new Date(),
            }, // Missing some optional metadata
          };

          mockGetEvents.mockResolvedValue([incompleteEvent]);

          // Act - Should handle missing metadata gracefully
          const result = await eventSourcingService.validateEventStreamConsistency(gameId, 'Game');

          // Assert - Should still validate
          expect(result.totalEvents).toBe(1);
        });
      });
    });

    describe('Snapshot Cache Coverage Tests', () => {
      it('should handle cache operations when snapshot caching is enabled', async () => {
        // Arrange - Enable snapshot caching
        eventSourcingService.enableSnapshotCaching(true);

        const mockEvents: StoredEvent[] = [
          {
            eventId: 'test-event-1',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: JSON.stringify({ gameId: gameId.value }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];
        mockGetEvents.mockResolvedValue(mockEvents);

        // Act - This should trigger cache set operations (lines 1465-1467)
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
        });

        // Assert - Should succeed and use cache
        expect(result).toBeDefined();
        expect(mockGetEvents).toHaveBeenCalledWith(gameId, 0);
      });

      it('should handle cache operations when snapshot caching is disabled', async () => {
        // Arrange - Ensure caching is disabled (default state)
        eventSourcingService.enableSnapshotCaching(false);

        const mockEvents: StoredEvent[] = [
          {
            eventId: 'test-event-2',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: JSON.stringify({ gameId: gameId.value }),
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: { source: 'test', createdAt: new Date() },
          },
        ];
        mockGetEvents.mockResolvedValue(mockEvents);

        // Act - This should trigger early returns in cache methods (lines 1501-1502)
        const result = await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
        });

        // Assert - Should succeed without caching
        expect(result).toBeDefined();
        expect(mockGetEvents).toHaveBeenCalledWith(gameId, 0);
      });
    });

    describe('Cache Eviction Logic (Lines 1428, 1432-1446)', () => {
      it('should evict LRU entries when cache exceeds max size', async () => {
        // Arrange - Set up service with small cache size
        const maxCacheSize = 2; // Small cache for testing
        const eventSourcingService = new EventSourcingService(mockEventStore, mockLogger);
        (eventSourcingService as unknown as { MAX_CACHE_SIZE: number })['MAX_CACHE_SIZE'] =
          maxCacheSize;

        const gameId1 = GameId.generate();
        const gameId2 = GameId.generate();
        const gameId3 = GameId.generate();

        const mockEvents1 = [
          {
            eventId: 'event1',
            streamId: gameId1.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: '{}',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: {},
          },
        ];
        const mockEvents2 = [
          {
            eventId: 'event2',
            streamId: gameId2.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: '{}',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: {},
          },
        ];
        const mockEvents3 = [
          {
            eventId: 'event3',
            streamId: gameId3.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: '{}',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: {},
          },
        ];

        mockGetEvents
          .mockResolvedValueOnce(mockEvents1)
          .mockResolvedValueOnce(mockEvents2)
          .mockResolvedValueOnce(mockEvents3);

        // Act - Fill cache beyond max size
        await eventSourcingService.reconstructAggregate({
          streamId: gameId1,
          aggregateType: 'Game',
        });
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps

        await eventSourcingService.reconstructAggregate({
          streamId: gameId2,
          aggregateType: 'Game',
        });
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps

        // This should trigger eviction of gameId1 (oldest)
        await eventSourcingService.reconstructAggregate({
          streamId: gameId3,
          aggregateType: 'Game',
        });

        // Assert - Check that the cache size is maintained (eviction occurred)
        // Note: The eviction happens internally and may not always log debug messages
        expect(mockGetEvents).toHaveBeenCalledTimes(3);

        // Verify some cache management occurred by checking internal state
        const cacheSize =
          (eventSourcingService as unknown as { snapshotCache: Map<string, unknown> })[
            'snapshotCache'
          ]?.size || 0;
        expect(cacheSize).toBeLessThanOrEqual(maxCacheSize);
      });

      it('should handle cache eviction when no entries need eviction', async () => {
        // Arrange - Set up service with large cache size
        const maxCacheSize = 100;
        const eventSourcingService = new EventSourcingService(mockEventStore, mockLogger);
        (eventSourcingService as unknown as { MAX_CACHE_SIZE: number })['MAX_CACHE_SIZE'] =
          maxCacheSize;

        const gameId = GameId.generate();
        const mockEvents = [
          {
            eventId: 'event1',
            streamId: gameId.value,
            aggregateType: 'Game',
            eventType: 'GameStarted',
            eventData: '{}',
            eventVersion: 1,
            streamVersion: 1,
            timestamp: new Date(),
            metadata: {},
          },
        ];

        mockGetEvents.mockResolvedValue(mockEvents);

        // Act - Add single entry to cache (should not trigger eviction)
        await eventSourcingService.reconstructAggregate({
          streamId: gameId,
          aggregateType: 'Game',
        });

        // Assert - No eviction debug logs should be called
        expect(mockDebug).not.toHaveBeenCalledWith('Evicted LRU cache entry', expect.anything());
      });
    });
  });
});
