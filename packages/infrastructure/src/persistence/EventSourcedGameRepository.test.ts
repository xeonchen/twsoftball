/**
 * @file EventSourcedGameRepository Tests
 * Core operations tests for event-sourced Game aggregate persistence.
 *
 * @remarks
 * TDD implementation of EventSourcedGameRepository as thin wrapper over EventStore.
 * Tests validate that repository properly delegates to event store while maintaining
 * Game aggregate event sourcing pattern.
 *
 * This repository serves as the infrastructure adapter implementing the GameRepository
 * port from the application layer. It provides event sourcing capabilities for Game
 * aggregates by delegating to an EventStore and handling the conversion between
 * domain events and stored events.
 *
 * Key responsibilities tested:
 * - Delegating save operations to EventStore with proper parameters
 * - Reconstructing Game aggregates from event streams
 * - Handling optimistic concurrency through version management
 * - Error propagation from EventStore to application layer
 * - Proper event committing after successful saves
 */

import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import { GameId, Game, GameStatus, DomainEvent } from '@twsoftball/domain';
import {
  createMockGameCreatedEvent,
  createMockGameStartedEvent,
  createMockAtBatCompletedEvent,
} from '@twsoftball/shared';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

/**
 * Extended EventStore interface for testing that includes delete operations.
 */
interface MockEventStoreWithDelete extends EventStore {
  delete: Mock;
}

// Import the class we're testing (it doesn't exist yet - TDD!)
import { EventSourcedGameRepository } from './EventSourcedGameRepository';

describe('EventSourcedGameRepository', () => {
  let repository: GameRepository;
  let mockEventStore: MockEventStoreWithDelete;
  let gameId: GameId;
  let mockGame: Game;
  let mockEvents: DomainEvent[];

  beforeEach(() => {
    // Create mock EventStore with all required methods
    mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn(),
      getGameEvents: vi.fn(),
      getAllEvents: vi.fn(),
      getEventsByType: vi.fn(),
      getEventsByGameId: vi.fn(),
      delete: vi.fn(),
    };

    gameId = GameId.generate();

    // Create mock events for testing
    mockEvents = [
      createMockGameCreatedEvent(gameId),
      createMockGameStartedEvent(gameId),
      createMockAtBatCompletedEvent(gameId),
    ];

    // Mock Game static methods and instance methods
    mockGame = {
      id: gameId,
      homeTeamName: 'Home Team',
      awayTeamName: 'Away Team',
      status: GameStatus.NOT_STARTED,
      getUncommittedEvents: vi.fn(),
      markEventsAsCommitted: vi.fn(),
      getVersion: vi.fn(),
      version: 0,
    } as unknown as Game;

    // Setup default return values for mock methods
    (mockGame.getVersion as Mock).mockReturnValue(0);

    // Create repository instance with mocked EventStore
    repository = new EventSourcedGameRepository(mockEventStore);
  });

  describe('Core Implementation', () => {
    it('should implement GameRepository interface', () => {
      expect(repository).toBeInstanceOf(EventSourcedGameRepository);
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.findByDateRange).toBe('function');
      expect(typeof repository.exists).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should return promises for all methods', () => {
      expect(repository.save(mockGame)).toBeInstanceOf(Promise);
      expect(repository.findById(gameId)).toBeInstanceOf(Promise);

      // These methods return rejected promises but are still Promise instances
      const findByStatusPromise = repository.findByStatus(GameStatus.IN_PROGRESS);
      const findByDateRangePromise = repository.findByDateRange(new Date(), new Date());
      const existsPromise = repository.exists(gameId);
      const deletePromise = repository.delete(gameId);

      expect(findByStatusPromise).toBeInstanceOf(Promise);
      expect(findByDateRangePromise).toBeInstanceOf(Promise);
      expect(existsPromise).toBeInstanceOf(Promise);
      expect(deletePromise).toBeInstanceOf(Promise);

      // Catch rejections to prevent unhandled rejection warnings
      findByStatusPromise.catch(() => {});
      findByDateRangePromise.catch(() => {});
      existsPromise.catch(() => {});
      deletePromise.catch(() => {});
    });
  });

  describe('Core Operations - save()', () => {
    it('should append uncommitted events to event store with correct parameters', async () => {
      // Setup: Mock game with uncommitted events
      const uncommittedEvents = [mockEvents[0]!, mockEvents[1]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockGame.getVersion as Mock).mockReturnValue(2);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockGame);

      // Verify: EventStore.append called with correct parameters
      expect(mockEventStore.append).toHaveBeenCalledOnce();
      expect(mockEventStore.append).toHaveBeenCalledWith(
        gameId,
        'Game',
        uncommittedEvents,
        0 // Expected version: 2 - 2 events = 0
      );
    });

    it('should mark events as committed after successful save', async () => {
      // Setup: Mock successful EventStore.append
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockGame);

      // Verify: Events marked as committed after successful save
      expect(mockGame.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should handle empty uncommitted events gracefully', async () => {
      // Setup: Mock game with no uncommitted events
      (mockGame.getUncommittedEvents as Mock).mockReturnValue([]);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockGame);

      // Verify: EventStore.append still called (should handle empty arrays)
      expect(mockEventStore.append).toHaveBeenCalledOnce();
      expect(mockEventStore.append).toHaveBeenCalledWith(gameId, 'Game', [], 0);
      expect(mockGame.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should pass correct version for optimistic locking', async () => {
      // Setup: Mock game with specific version
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockGame.getVersion as Mock).mockReturnValue(5); // Specific version to verify
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockGame);

      // Verify: Correct version passed to EventStore
      expect(mockEventStore.append).toHaveBeenCalledWith(
        gameId,
        'Game',
        uncommittedEvents,
        4 // Expected version: 5 - 1 event = 4
      );
    });

    it('should propagate event store errors', async () => {
      // Setup: Mock EventStore.append to throw error
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const eventStoreError = new Error('Event store connection failed');
      (mockEventStore.append as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.save(mockGame)).rejects.toThrow('Event store connection failed');

      // Verify: Events not marked as committed on error
      expect(mockGame.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle concurrency conflicts from event store', async () => {
      // Setup: Mock EventStore.append to throw concurrency error
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const concurrencyError = new Error(
        'Concurrency conflict detected: expected version 2, actual 3'
      );
      (mockEventStore.append as Mock).mockRejectedValue(concurrencyError);

      // Execute & Verify: Concurrency error propagated
      await expect(repository.save(mockGame)).rejects.toThrow('Concurrency conflict detected');

      // Verify: Events not marked as committed on concurrency error
      expect(mockGame.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should not mark events as committed if EventStore.append fails', async () => {
      // Setup: Mock EventStore.append to fail
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockEventStore.append as Mock).mockRejectedValue(new Error('Database connection lost'));

      // Execute & Verify: Error thrown
      await expect(repository.save(mockGame)).rejects.toThrow();

      // Verify: Events not marked as committed on failure
      expect(mockGame.markEventsAsCommitted).not.toHaveBeenCalled();
    });
  });

  describe('Core Operations - findById()', () => {
    it('should reconstruct game from event stream', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: {
          source: 'test',
          createdAt: event.timestamp,
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Mock Game.fromEvents static method
      const mockReconstructedGame = mockGame;
      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValue(mockReconstructedGame);

      // Execute
      const result = await repository.findById(gameId);

      // Verify: EventStore.getEvents called with correct gameId
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);

      // Verify: Game.fromEvents called with parsed domain events (plain objects from JSON.parse)
      expect(mockGameFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockGameFromEvents.mock.calls[0];
      expect(firstCall).toBeDefined();
      const actualCallArg = firstCall![0];
      expect(actualCallArg).toHaveLength(mockEvents.length);

      // Verify that each parsed event has the expected structure from JSON serialization
      actualCallArg.forEach((parsedEvent: unknown, index: number) => {
        const originalEvent = mockEvents[index];
        const event = parsedEvent as DomainEvent;
        expect(event.type).toBe(originalEvent?.type);
        expect(event.eventId).toBe(originalEvent?.eventId);
        expect(event.gameId.value).toBe(originalEvent?.gameId.value);
      });

      // Verify: Correct game returned
      expect(result).toBe(mockReconstructedGame);
    });

    it('should return null for non-existent games', async () => {
      // Setup: Mock EventStore.getEvents to return empty array (no events found)
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.findById(gameId);

      // Verify: EventStore.getEvents called
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);

      // Verify: null returned for non-existent game
      expect(result).toBeNull();
    });

    it('should handle empty event streams', async () => {
      // Setup: Mock EventStore.getEvents to return empty array
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.findById(gameId);

      // Verify: null returned for empty event stream
      expect(result).toBeNull();

      // Verify: Game.fromEvents not called for empty event stream
      expect(vi.spyOn(Game, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should reconstruct complex game state correctly', async () => {
      // Setup: Mock EventStore.getEvents to return complex event sequence
      const complexEvents = [
        createMockGameCreatedEvent(gameId),
        createMockGameStartedEvent(gameId),
        createMockAtBatCompletedEvent(gameId),
        createMockAtBatCompletedEvent(gameId),
      ];
      const storedEvents = complexEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: {
          source: 'test',
          createdAt: event.timestamp,
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Mock Game.fromEvents to return game with complex state
      const complexGame = {
        ...mockGame,
        status: GameStatus.IN_PROGRESS,
        version: 4,
      } as unknown as Game;
      const mockGameFromEvents = vi.spyOn(Game, 'fromEvents').mockReturnValue(complexGame);

      // Execute
      const result = await repository.findById(gameId);

      // Verify: Game.fromEvents called with all parsed domain events (plain objects from JSON.parse)
      expect(mockGameFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockGameFromEvents.mock.calls[0];
      expect(firstCall).toBeDefined();
      const actualCallArg = firstCall![0];
      expect(actualCallArg).toHaveLength(complexEvents.length);

      // Verify that each parsed event has the expected structure from JSON serialization
      actualCallArg.forEach((parsedEvent: unknown, index: number) => {
        const originalEvent = complexEvents[index];
        const event = parsedEvent as DomainEvent;
        expect(event.type).toBe(originalEvent?.type);
        expect(event.eventId).toBe(originalEvent?.eventId);
        expect(event.gameId.value).toBe(originalEvent?.gameId.value);
      });

      // Verify: Complex game state returned
      expect(result).toBe(complexGame);
      expect(result?.status).toBe(GameStatus.IN_PROGRESS);
    });

    it('should propagate EventStore errors during findById', async () => {
      // Setup: Mock EventStore.getEvents to throw error
      const eventStoreError = new Error('Database connection failed');
      (mockEventStore.getEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findById(gameId)).rejects.toThrow('Database connection failed');

      // Verify: EventStore.getEvents was called before error
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
    });

    it('should handle Game.fromEvents reconstruction errors', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const corruptedEvents = [mockEvents[0]!];
      const storedEvents = corruptedEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: {
          source: 'test',
          createdAt: event.timestamp,
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Mock Game.fromEvents to throw reconstruction error
      const reconstructionError = new Error('Invalid event sequence for Game reconstruction');
      vi.spyOn(Game, 'fromEvents').mockImplementation(() => {
        throw reconstructionError;
      });

      // Execute & Verify: Reconstruction error propagated
      await expect(repository.findById(gameId)).rejects.toThrow(
        'Invalid event sequence for Game reconstruction'
      );
    });
  });

  describe('Query Operations - findByStatus()', () => {
    it('should query all games and filter by status IN_PROGRESS', async () => {
      // Setup: Create events for multiple games with different statuses
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      // Game 1: IN_PROGRESS
      const game1Events = [
        createMockGameCreatedEvent(gameId1),
        createMockGameStartedEvent(gameId1), // Makes it IN_PROGRESS
      ];

      // Game 2: COMPLETED
      const game2Events = [
        createMockGameCreatedEvent(gameId2),
        createMockGameStartedEvent(gameId2),
        createMockAtBatCompletedEvent(gameId2), // Additional events for complexity
      ];

      const allEvents = [
        ...game1Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...game2Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return games with proper statuses
      const mockInProgressGame = {
        ...mockGame,
        id: gameId1,
        status: GameStatus.IN_PROGRESS,
      } as unknown as Game;
      const mockCompletedGame = {
        ...mockGame,
        id: gameId2,
        status: GameStatus.COMPLETED,
      } as unknown as Game;

      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValueOnce(mockInProgressGame)
        .mockReturnValueOnce(mockCompletedGame);

      // Execute
      const result = await repository.findByStatus(GameStatus.IN_PROGRESS);

      // Verify: EventStore.getAllEvents called
      expect(mockEventStore.getAllEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getAllEvents).toHaveBeenCalledWith();

      // Verify: Only IN_PROGRESS games returned
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockInProgressGame);
      expect(result[0]?.status).toBe(GameStatus.IN_PROGRESS);

      // Verify: Game.fromEvents called for both games during reconstruction
      expect(mockGameFromEvents).toHaveBeenCalledTimes(2);
    });

    it('should query all games and filter by status COMPLETED', async () => {
      // Setup: Create events for games with COMPLETED status
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      const game1Events = [
        createMockGameCreatedEvent(gameId1),
        createMockGameStartedEvent(gameId1),
      ];

      const game2Events = [createMockGameCreatedEvent(gameId2)];

      const allEvents = [
        ...game1Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...game2Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return games with different statuses
      const mockInProgressGame = {
        ...mockGame,
        id: gameId1,
        status: GameStatus.IN_PROGRESS,
      } as unknown as Game;
      const mockCompletedGame = {
        ...mockGame,
        id: gameId2,
        status: GameStatus.COMPLETED,
      } as unknown as Game;

      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValueOnce(mockInProgressGame)
        .mockReturnValueOnce(mockCompletedGame);

      // Execute
      const result = await repository.findByStatus(GameStatus.COMPLETED);

      // Verify: Only COMPLETED games returned
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockCompletedGame);
      expect(result[0]?.status).toBe(GameStatus.COMPLETED);

      // Verify: Game.fromEvents called for both games during reconstruction
      expect(mockGameFromEvents).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no games match status', async () => {
      // Setup: Mock getAllEvents to return events for games with different statuses
      const gameEvents = [
        createMockGameCreatedEvent(gameId),
        createMockGameStartedEvent(gameId), // Makes it IN_PROGRESS
      ];

      const allEvents = gameEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: { source: 'test', createdAt: event.timestamp },
      }));

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return IN_PROGRESS game
      const mockInProgressGame = { ...mockGame, status: GameStatus.IN_PROGRESS } as unknown as Game;
      vi.spyOn(Game, 'fromEvents').mockReturnValue(mockInProgressGame);

      // Execute: Search for COMPLETED games
      const result = await repository.findByStatus(GameStatus.COMPLETED);

      // Verify: Empty array returned
      expect(result).toEqual([]);
    });

    it('should handle GameStatus enum values correctly', async () => {
      // Setup: Mock getAllEvents to return no events
      (mockEventStore.getAllEvents as Mock).mockResolvedValue([]);

      // Execute: Test with all GameStatus enum values
      const notStartedResult = await repository.findByStatus(GameStatus.NOT_STARTED);
      const inProgressResult = await repository.findByStatus(GameStatus.IN_PROGRESS);
      const completedResult = await repository.findByStatus(GameStatus.COMPLETED);

      // Verify: All return empty arrays for no events
      expect(notStartedResult).toEqual([]);
      expect(inProgressResult).toEqual([]);
      expect(completedResult).toEqual([]);

      // Verify: EventStore.getAllEvents called for each
      expect(mockEventStore.getAllEvents).toHaveBeenCalledTimes(3);
    });

    it('should reconstruct all matching games from event streams', async () => {
      // Setup: Create events for multiple games with same status
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      const game1Events = [createMockGameCreatedEvent(gameId1)];
      const game2Events = [createMockGameCreatedEvent(gameId2)];

      const allEvents = [
        ...game1Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...game2Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return NOT_STARTED games
      const mockGame1 = {
        ...mockGame,
        id: gameId1,
        status: GameStatus.NOT_STARTED,
      } as unknown as Game;
      const mockGame2 = {
        ...mockGame,
        id: gameId2,
        status: GameStatus.NOT_STARTED,
      } as unknown as Game;

      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValueOnce(mockGame1)
        .mockReturnValueOnce(mockGame2);

      // Execute
      const result = await repository.findByStatus(GameStatus.NOT_STARTED);

      // Verify: Both games reconstructed and returned
      expect(result).toHaveLength(2);
      expect(result).toContain(mockGame1);
      expect(result).toContain(mockGame2);
      expect(mockGameFromEvents).toHaveBeenCalledTimes(2);
    });

    it('should propagate EventStore errors during query', async () => {
      // Setup: Mock EventStore.getAllEvents to throw error
      const eventStoreError = new Error('EventStore connection failed');
      (mockEventStore.getAllEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findByStatus(GameStatus.IN_PROGRESS)).rejects.toThrow(
        'EventStore connection failed'
      );
    });
  });

  describe('Query Operations - findByDateRange()', () => {
    it('should filter games by scheduled date within range', async () => {
      // Setup: Create games with different scheduled dates
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const gameId3 = GameId.generate();

      // Game 1: Within range (June 15)
      const game1CreatedEvent = createMockGameCreatedEvent(gameId1);

      // Game 2: Outside range (July 15)
      const game2CreatedEvent = createMockGameCreatedEvent(gameId2);

      // Game 3: Within range (June 1 - boundary)
      const game3CreatedEvent = createMockGameCreatedEvent(gameId3);

      const allEvents = [
        {
          eventId: game1CreatedEvent.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: game1CreatedEvent.type,
          eventData: JSON.stringify(game1CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game1CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game1CreatedEvent.timestamp },
        },
        {
          eventId: game2CreatedEvent.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: game2CreatedEvent.type,
          eventData: JSON.stringify(game2CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game2CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game2CreatedEvent.timestamp },
        },
        {
          eventId: game3CreatedEvent.eventId,
          streamId: gameId3.value,
          aggregateType: 'Game' as const,
          eventType: game3CreatedEvent.type,
          eventData: JSON.stringify(game3CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game3CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game3CreatedEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return games with correct scheduled dates
      const mockGame1 = {
        ...mockGame,
        id: gameId1,
        scheduledDate: new Date('2024-06-15'),
      } as unknown as Game;
      const mockGame2 = {
        ...mockGame,
        id: gameId2,
        scheduledDate: new Date('2024-07-15'),
      } as unknown as Game;
      const mockGame3 = {
        ...mockGame,
        id: gameId3,
        scheduledDate: new Date('2024-06-01'),
      } as unknown as Game;

      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValueOnce(mockGame1)
        .mockReturnValueOnce(mockGame2)
        .mockReturnValueOnce(mockGame3);

      // Execute
      const result = await repository.findByDateRange(startDate, endDate);

      // Verify: Only games within date range returned
      expect(result).toHaveLength(2);
      expect(result).toContain(mockGame1);
      expect(result).toContain(mockGame3);
      expect(result).not.toContain(mockGame2);

      // Verify: EventStore.getAllEvents called
      expect(mockEventStore.getAllEvents).toHaveBeenCalledOnce();
      expect(mockGameFromEvents).toHaveBeenCalledTimes(3);
    });

    it('should handle inclusive date boundaries correctly', async () => {
      // Setup: Create games exactly on boundaries
      const startDate = new Date('2024-06-01T00:00:00.000Z');
      const endDate = new Date('2024-06-30T23:59:59.999Z');

      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      // Game 1: Exactly on start boundary
      const game1CreatedEvent = createMockGameCreatedEvent(gameId1);

      // Game 2: Exactly on end boundary
      const game2CreatedEvent = createMockGameCreatedEvent(gameId2);

      const allEvents = [
        {
          eventId: game1CreatedEvent.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: game1CreatedEvent.type,
          eventData: JSON.stringify(game1CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game1CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game1CreatedEvent.timestamp },
        },
        {
          eventId: game2CreatedEvent.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: game2CreatedEvent.type,
          eventData: JSON.stringify(game2CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game2CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game2CreatedEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return games with boundary dates
      const mockGame1 = {
        ...mockGame,
        id: gameId1,
        scheduledDate: new Date('2024-06-01T00:00:00.000Z'),
      } as unknown as Game;
      const mockGame2 = {
        ...mockGame,
        id: gameId2,
        scheduledDate: new Date('2024-06-30T23:59:59.999Z'),
      } as unknown as Game;

      vi.spyOn(Game, 'fromEvents').mockReturnValueOnce(mockGame1).mockReturnValueOnce(mockGame2);

      // Execute
      const result = await repository.findByDateRange(startDate, endDate);

      // Verify: Both boundary games included (inclusive)
      expect(result).toHaveLength(2);
      expect(result).toContain(mockGame1);
      expect(result).toContain(mockGame2);
    });

    it('should return empty array when no games in date range', async () => {
      // Setup: Create games outside the search range
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const game1CreatedEvent = createMockGameCreatedEvent(gameId);

      const allEvents = [
        {
          eventId: game1CreatedEvent.eventId,
          streamId: gameId.value,
          aggregateType: 'Game' as const,
          eventType: game1CreatedEvent.type,
          eventData: JSON.stringify(game1CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game1CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game1CreatedEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return game outside range
      const mockGameOutsideRange = {
        ...mockGame,
        scheduledDate: new Date('2024-05-15'),
      } as unknown as Game;
      vi.spyOn(Game, 'fromEvents').mockReturnValue(mockGameOutsideRange);

      // Execute
      const result = await repository.findByDateRange(startDate, endDate);

      // Verify: Empty array returned
      expect(result).toEqual([]);
    });

    it('should handle same startDate and endDate', async () => {
      // Setup: Search for games on specific date
      const targetDate = new Date('2024-06-15');

      const game1CreatedEvent = createMockGameCreatedEvent(gameId);

      const allEvents = [
        {
          eventId: game1CreatedEvent.eventId,
          streamId: gameId.value,
          aggregateType: 'Game' as const,
          eventType: game1CreatedEvent.type,
          eventData: JSON.stringify(game1CreatedEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: game1CreatedEvent.timestamp,
          metadata: { source: 'test', createdAt: game1CreatedEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return game on target date
      const mockGameOnDate = {
        ...mockGame,
        scheduledDate: new Date('2024-06-15'),
      } as unknown as Game;
      vi.spyOn(Game, 'fromEvents').mockReturnValue(mockGameOnDate);

      // Execute: Same date for start and end
      const result = await repository.findByDateRange(targetDate, targetDate);

      // Verify: Game on specific date returned
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockGameOnDate);
    });

    it('should validate date parameters and throw for invalid ranges', async () => {
      // Setup: Invalid date range (end before start)
      const startDate = new Date('2024-06-30');
      const endDate = new Date('2024-06-01');

      // Execute & Verify: Should throw for invalid date range
      await expect(repository.findByDateRange(startDate, endDate)).rejects.toThrow(
        'startDate cannot be after endDate'
      );
    });

    it('should reconstruct all matching games from event streams', async () => {
      // Setup: Multiple games within date range with complex event streams
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      // Game 1: Multiple events
      const game1Events = [
        createMockGameCreatedEvent(gameId1),
        createMockGameStartedEvent(gameId1),
        createMockAtBatCompletedEvent(gameId1),
      ];
      // Note: scheduledDate will be handled by Game.fromEvents mock

      // Game 2: Single event
      const game2Events = [createMockGameCreatedEvent(gameId2)];
      // Note: scheduledDate will be handled by Game.fromEvents mock

      const allEvents = [
        ...game1Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId1.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...game2Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: gameId2.value,
          aggregateType: 'Game' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock Game.fromEvents to return complex games
      const mockComplexGame1 = {
        ...mockGame,
        id: gameId1,
        scheduledDate: new Date('2024-06-15'),
        status: GameStatus.IN_PROGRESS,
      } as unknown as Game;
      const mockSimpleGame2 = {
        ...mockGame,
        id: gameId2,
        scheduledDate: new Date('2024-06-20'),
        status: GameStatus.NOT_STARTED,
      } as unknown as Game;

      const mockGameFromEvents = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValueOnce(mockComplexGame1)
        .mockReturnValueOnce(mockSimpleGame2);

      // Execute
      const result = await repository.findByDateRange(startDate, endDate);

      // Verify: Both games reconstructed correctly
      expect(result).toHaveLength(2);
      expect(result).toContain(mockComplexGame1);
      expect(result).toContain(mockSimpleGame2);
      expect(mockGameFromEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Operations - exists()', () => {
    it('should return true for existing game efficiently', async () => {
      // Setup: Mock EventStore.getEvents to return events (indicating game exists)
      const gameEvents = [createMockGameCreatedEvent(gameId)];
      const storedEvents = gameEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: { source: 'test', createdAt: event.timestamp },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Execute
      const result = await repository.exists(gameId);

      // Verify: EventStore.getEvents called with gameId
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);

      // Verify: Returns true for existing game
      expect(result).toBe(true);

      // Verify: Should not reconstruct full aggregate (performance optimization)
      expect(vi.spyOn(Game, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should return false for non-existent game', async () => {
      // Setup: Mock EventStore.getEvents to return empty array (game doesn't exist)
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.exists(gameId);

      // Verify: EventStore.getEvents called
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);

      // Verify: Returns false for non-existent game
      expect(result).toBe(false);

      // Verify: No game reconstruction attempted
      expect(vi.spyOn(Game, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should not reconstruct full aggregate for performance', async () => {
      // Setup: Mock EventStore.getEvents to return large event stream
      const largeEventStream = Array.from({ length: 100 }, () =>
        createMockGameCreatedEvent(gameId)
      );
      const storedEvents = largeEventStream.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: { source: 'test', createdAt: event.timestamp },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Execute
      const result = await repository.exists(gameId);

      // Verify: Returns true without reconstruction
      expect(result).toBe(true);

      // Verify: No expensive reconstruction performed
      expect(vi.spyOn(Game, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should handle null/undefined gameId', async () => {
      // Setup: Test with null gameId
      const nullGameId = null as unknown as GameId;

      // Execute & Verify: Should handle null gameId gracefully
      await expect(repository.exists(nullGameId)).rejects.toThrow(
        'GameId cannot be null or undefined'
      );
    });

    it('should propagate EventStore errors', async () => {
      // Setup: Mock EventStore.getEvents to throw error
      const eventStoreError = new Error('EventStore connection failed');
      (mockEventStore.getEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.exists(gameId)).rejects.toThrow('EventStore connection failed');
    });
  });

  describe('Query Operations - delete()', () => {
    // Note: delete method is now included in main mockEventStore setup

    it('should delete game by removing all events from stream', async () => {
      // Setup: Mock successful deletion
      mockEventStore.delete.mockResolvedValue(undefined);

      // Execute
      await repository.delete(gameId);

      // Verify: EventStore.delete called with correct gameId
      expect(mockEventStore.delete).toHaveBeenCalledOnce();
      expect(mockEventStore.delete).toHaveBeenCalledWith(gameId);
    });

    it('should handle non-existent game gracefully', async () => {
      // Setup: Mock EventStore.delete to handle non-existent game
      mockEventStore.delete.mockResolvedValue(undefined);

      // Execute
      await repository.delete(gameId);

      // Verify: EventStore.delete called (should not throw for non-existent)
      expect(mockEventStore.delete).toHaveBeenCalledOnce();
    });

    it('should propagate EventStore errors during deletion', async () => {
      // Setup: Mock EventStore.delete to throw error
      const eventStoreError = new Error('EventStore deletion failed');
      mockEventStore.delete.mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.delete(gameId)).rejects.toThrow('EventStore deletion failed');
    });

    it('should validate gameId parameter', async () => {
      // Setup: Test with null gameId
      const nullGameId = null as unknown as GameId;

      // Execute & Verify: Should handle null gameId validation
      await expect(repository.delete(nullGameId)).rejects.toThrow(
        'GameId cannot be null or undefined'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null gameId in save operation', async () => {
      // Setup: Create game with null id
      const invalidGame = {
        ...mockGame,
        id: null as unknown as GameId,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as Game;

      (invalidGame.getUncommittedEvents as Mock).mockReturnValue([]);
      (invalidGame.getVersion as Mock).mockReturnValue(0);
      // EventStore should reject null gameId
      (mockEventStore.append as Mock).mockRejectedValue(new Error('Invalid gameId'));

      // Execute & Verify: Repository should handle null gameId gracefully
      await expect(repository.save(invalidGame)).rejects.toThrow();
    });

    it('should handle null gameId in findById operation', async () => {
      const nullGameId = null as unknown as GameId;

      // Execute & Verify: Repository should handle null gameId gracefully
      await expect(repository.findById(nullGameId)).rejects.toThrow();
    });

    it('should handle malformed events during reconstruction', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects with malformed eventData
      const malformedEvents = [
        { type: 'InvalidEventType', gameId: gameId } as unknown as DomainEvent,
      ];
      const storedEvents = malformedEvents.map((event, index) => ({
        eventId: 'malformed-event-id',
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: 'InvalidEventType',
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          createdAt: new Date(),
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);

      // Mock Game.fromEvents to throw on malformed events
      const mockFromEventsThrow = vi.spyOn(Game, 'fromEvents').mockImplementation(() => {
        throw new Error('Cannot reconstruct game from malformed events');
      });

      try {
        // Execute & Verify: Malformed event error propagated
        await expect(repository.findById(gameId)).rejects.toThrow(
          'Cannot reconstruct game from malformed events'
        );
      } finally {
        mockFromEventsThrow.mockRestore();
      }
    });

    it('should handle version mismatch scenarios', async () => {
      // Setup: Mock game with mismatched version
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockGame.getVersion as Mock).mockReturnValue(1);

      // Mock EventStore.append to reject with version mismatch
      const versionError = new Error('Version mismatch: expected 1, found 3');
      (mockEventStore.append as Mock).mockRejectedValue(versionError);

      // Execute & Verify: Version error propagated
      await expect(repository.save(mockGame)).rejects.toThrow('Version mismatch');
      expect(mockGame.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle EventStore timeout errors', async () => {
      // Setup: Mock EventStore.getEvents to timeout
      const timeoutError = new Error('EventStore operation timed out');
      (mockEventStore.getEvents as Mock).mockRejectedValue(timeoutError);

      // Execute & Verify: Timeout error propagated
      await expect(repository.findById(gameId)).rejects.toThrow('EventStore operation timed out');
    });

    it('should handle large event streams efficiently', async () => {
      // Setup: Mock EventStore.getEvents to return large StoredEvent stream
      const largeDomainEventStream = Array.from({ length: 1000 }, () => mockEvents[0]!);
      const largeStoredEventStream = largeDomainEventStream.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: {
          source: 'test',
          createdAt: event.timestamp,
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(largeStoredEventStream);

      const mockReconstructedGame = {
        ...mockGame,
        version: 1000,
        getVersion: vi.fn().mockReturnValue(1000),
        getUncommittedEvents: vi.fn().mockReturnValue([]),
        markEventsAsCommitted: vi.fn(),
      } as unknown as Game;
      const mockFromEventsLarge = vi
        .spyOn(Game, 'fromEvents')
        .mockReturnValue(mockReconstructedGame);

      try {
        // Execute
        const result = await repository.findById(gameId);

        // Verify: Large event stream handled correctly
        expect(result).toBe(mockReconstructedGame);
        expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      } finally {
        mockFromEventsLarge.mockRestore();
      }
    });

    it('should handle concurrent save operations', async () => {
      // Setup: Create separate mock games with independent mock functions
      const game1 = {
        ...mockGame,
        version: 1,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as Game;

      const game2 = {
        ...mockGame,
        version: 2,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as Game;

      (game1.getUncommittedEvents as Mock).mockReturnValue([mockEvents[0]!]);
      (game1.getVersion as Mock).mockReturnValue(1);
      (game2.getUncommittedEvents as Mock).mockReturnValue([mockEvents[1]!]);
      (game2.getVersion as Mock).mockReturnValue(1);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute concurrent saves
      const save1Promise = repository.save(game1);
      const save2Promise = repository.save(game2);

      await Promise.all([save1Promise, save2Promise]);

      // Verify: Both saves completed
      expect(mockEventStore.append).toHaveBeenCalledTimes(2);
      expect(game1.markEventsAsCommitted).toHaveBeenCalledOnce();
      expect(game2.markEventsAsCommitted).toHaveBeenCalledOnce();
    });
  });

  describe('Repository Pattern Compliance', () => {
    it('should act as thin wrapper with no business logic', async () => {
      // Setup: Mock successful operations
      const uncommittedEvents = [mockEvents[0]!];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockGame.getVersion as Mock).mockReturnValue(1); // 1 event, so version is 1
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute save
      await repository.save(mockGame);

      // Verify: Repository delegates to EventStore without modification
      expect(mockEventStore.append).toHaveBeenCalledWith(
        gameId,
        'Game',
        uncommittedEvents,
        0 // Expected version: 1 - 1 event = 0
      );

      // Repository should not perform any business logic validation
      expect(mockGame.getUncommittedEvents).toHaveBeenCalledOnce();
      expect(mockGame.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should preserve all domain events during save', async () => {
      // Setup: Mock game with multiple different event types
      const allEventTypes = [
        createMockGameCreatedEvent(gameId),
        createMockGameStartedEvent(gameId),
        createMockAtBatCompletedEvent(gameId),
      ];
      (mockGame.getUncommittedEvents as Mock).mockReturnValue(allEventTypes);
      (mockGame.getVersion as Mock).mockReturnValue(3); // 3 events, so version is 3
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockGame);

      // Verify: All events passed to EventStore without filtering
      expect(mockEventStore.append).toHaveBeenCalledWith(
        gameId,
        'Game',
        allEventTypes,
        0 // Expected version: 3 - 3 events = 0
      );
    });

    it('should not cache or modify retrieved games', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: event.timestamp,
        metadata: {
          source: 'test',
          createdAt: event.timestamp,
        },
      }));
      (mockEventStore.getEvents as Mock).mockResolvedValue(storedEvents);
      const mockFromEventsCache = vi.spyOn(Game, 'fromEvents').mockReturnValue(mockGame);

      try {
        // Execute multiple findById calls
        const result1 = await repository.findById(gameId);
        const result2 = await repository.findById(gameId);

        // Verify: EventStore called each time (no caching)
        expect(mockEventStore.getEvents).toHaveBeenCalledTimes(2);
        expect(result1).toBe(mockGame);
        expect(result2).toBe(mockGame);
      } finally {
        mockFromEventsCache.mockRestore();
      }
    });
  });
});
