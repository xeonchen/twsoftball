/**
 * @file EventSourcingService.reconstruction.test.ts
 * Aggregate Reconstruction tests for the EventSourcingService.
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
  Game,
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
interface ReconstructAggregateCommand {
  readonly streamId: GameId | TeamLineupId;
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  readonly toVersion?: number;
  readonly useSnapshot?: boolean;
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
});
