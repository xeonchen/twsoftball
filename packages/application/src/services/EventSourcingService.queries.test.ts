/**
 * @file EventSourcingService.queries.test.ts
 * Event Queries and Migration tests for the EventSourcingService.
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
interface QueryEventsCommand {
  readonly gameId?: GameId;
  readonly streamId?: GameId | TeamLineupId;
  readonly eventTypes?: string[];
  readonly fromTimestamp?: Date;
  readonly toTimestamp?: Date;
  readonly aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[];
  readonly limit?: number;
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
});
