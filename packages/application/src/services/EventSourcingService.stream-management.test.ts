/**
 * @file EventSourcingService.stream-management.test.ts
 * Event Stream Management tests for the EventSourcingService.
 *
 * @remarks
 * These tests verify the EventSourcingService's ability to manage event
 * streams including loading events from streams, appending events with
 * version control, and handling stream-related operations.
 *
 * **Test Coverage Areas**:
 * - Event stream loading and querying
 * - Event appending with concurrency control
 * - Version conflict handling
 * - Stream error handling and recovery
 *
 * **Testing Strategy**:
 * - Mock EventStore and other dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper version control mechanisms
 * - Ensure error handling works correctly
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import {
  GameId,
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
import { EventStore, StoredEvent } from '../ports/out/EventStore.js';
import { Logger } from '../ports/out/Logger.js';

import { EventSourcingService } from './EventSourcingService.js';

// Domain imports

// DTO imports for service operations

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
});
