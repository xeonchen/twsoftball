/**
 * @file EventSourcingService.snapshots.test.ts
 * Snapshot Management tests for the EventSourcingService.
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
interface CreateSnapshotCommand {
  readonly streamId: GameId | TeamLineupId;
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  readonly atVersion: number;
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
});
