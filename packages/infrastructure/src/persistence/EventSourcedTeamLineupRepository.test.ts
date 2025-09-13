/**
 * @file EventSourcedTeamLineupRepository Tests
 * Core operations tests for event-sourced TeamLineup aggregate persistence.
 *
 * @remarks
 * TDD implementation of EventSourcedTeamLineupRepository as thin wrapper over EventStore.
 * Tests validate that repository properly delegates to event store while maintaining
 * TeamLineup aggregate event sourcing pattern.
 *
 * This repository serves as the infrastructure adapter implementing the TeamLineupRepository
 * port from the application layer. It provides event sourcing capabilities for TeamLineup
 * aggregates by delegating to an EventStore and handling the conversion between
 * domain events and stored events.
 *
 * Key responsibilities tested:
 * - Delegating save operations to EventStore with proper parameters
 * - Reconstructing TeamLineup aggregates from event streams
 * - Handling optimistic concurrency through version management
 * - Error propagation from EventStore to application layer
 * - Proper event committing after successful saves
 * - TeamLineup-specific query operations (findByGameId, findByGameIdAndSide)
 */

import { createMockTeamLineupCreatedEvent } from '@twsoftball/application';
import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
// import type { SnapshotStore } from '@twsoftball/application/ports/out/SnapshotStore'; // Commented out while snapshot tests are disabled
import { TeamLineupId, TeamLineup, GameId, DomainEvent, Game } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

/**
 * Extended EventStore interface for testing that includes delete operations.
 */
interface MockEventStoreWithDelete extends EventStore {
  delete: Mock;
}

// Import the class we're testing (it doesn't exist yet - TDD!)
import { EventSourcedTeamLineupRepository } from './EventSourcedTeamLineupRepository';

describe('EventSourcedTeamLineupRepository', () => {
  let repository: TeamLineupRepository;
  // let repositoryWithSnapshots: TeamLineupRepository; // Commented out for now while snapshot tests are disabled
  let mockEventStore: MockEventStoreWithDelete;
  // let mockSnapshotStore: SnapshotStore; // Commented out for now while snapshot tests are disabled
  let mockGameRepository: GameRepository;
  let teamLineupId: TeamLineupId;
  let gameId: GameId;
  let mockTeamLineup: TeamLineup;
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

    // Create mock GameRepository
    mockGameRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      findByStatus: vi.fn(),
      findByDateRange: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
    };

    // Create mock SnapshotStore (commented out while snapshot tests are disabled)
    // mockSnapshotStore = {
    //   saveSnapshot: vi.fn(),
    //   getSnapshot: vi.fn(),
    // };

    teamLineupId = TeamLineupId.generate();
    gameId = GameId.generate();

    // Create mock events for testing
    mockEvents = [createMockTeamLineupCreatedEvent(gameId, teamLineupId)];

    // Mock Game instance
    mockGame = {
      id: gameId,
      homeTeamName: 'Home Team',
      awayTeamName: 'Away Team',
    } as unknown as Game;

    // Mock TeamLineup static methods and instance methods
    mockTeamLineup = {
      id: teamLineupId,
      gameId,
      teamName: 'Mock Team',
      getUncommittedEvents: vi.fn(),
      markEventsAsCommitted: vi.fn(),
      getVersion: vi.fn(),
      version: 0,
    } as unknown as TeamLineup;

    // Setup default return values for mock methods
    (mockTeamLineup.getVersion as Mock).mockReturnValue(0);
    (mockGameRepository.findById as Mock).mockResolvedValue(mockGame);

    // Create repository instance with mocked EventStore and GameRepository
    repository = new EventSourcedTeamLineupRepository(mockEventStore, mockGameRepository);

    // Create repository instance with snapshot support (commented out while snapshot tests are disabled)
    // repositoryWithSnapshots = new EventSourcedTeamLineupRepository(
    //   mockEventStore,
    //   mockGameRepository,
    //   mockSnapshotStore
    // );
  });

  describe('Core Implementation', () => {
    it('should implement TeamLineupRepository interface', () => {
      expect(repository).toBeInstanceOf(EventSourcedTeamLineupRepository);
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByGameId).toBe('function');
      expect(typeof repository.findByGameIdAndSide).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should return promises for all methods', () => {
      expect(repository.save(mockTeamLineup)).toBeInstanceOf(Promise);
      expect(repository.findById(teamLineupId)).toBeInstanceOf(Promise);
      expect(repository.findByGameId(gameId)).toBeInstanceOf(Promise);
      expect(repository.findByGameIdAndSide(gameId, 'HOME')).toBeInstanceOf(Promise);
      expect(repository.delete(teamLineupId)).toBeInstanceOf(Promise);

      // Catch rejections to prevent unhandled rejection warnings
      repository.save(mockTeamLineup).catch(() => {});
      repository.findById(teamLineupId).catch(() => {});
      repository.findByGameId(gameId).catch(() => {});
      repository.findByGameIdAndSide(gameId, 'HOME').catch(() => {});
      repository.delete(teamLineupId).catch(() => {});
    });
  });

  describe('Core Operations - save()', () => {
    it('should append uncommitted events to event store with correct parameters', async () => {
      // Setup: Mock lineup with uncommitted events
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(1);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockTeamLineup);

      // Verify: EventStore.append called with correct parameters
      expect(mockEventStore.append).toHaveBeenCalledOnce();
      expect(mockEventStore.append).toHaveBeenCalledWith(
        teamLineupId,
        'TeamLineup',
        uncommittedEvents,
        0 // Expected version: 1 - 1 event = 0
      );
    });

    it('should mark events as committed after successful save', async () => {
      // Setup: Mock successful EventStore.append
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockTeamLineup);

      // Verify: Events marked as committed after successful save
      expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should handle empty uncommitted events gracefully', async () => {
      // Setup: Mock lineup with no uncommitted events
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue([]);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockTeamLineup);

      // Verify: EventStore.append still called (should handle empty arrays)
      expect(mockEventStore.append).toHaveBeenCalledOnce();
      expect(mockEventStore.append).toHaveBeenCalledWith(teamLineupId, 'TeamLineup', [], 0);
      expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should pass correct version for optimistic locking', async () => {
      // Setup: Mock lineup with specific version
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(5); // Specific version to verify
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockTeamLineup);

      // Verify: Correct version passed to EventStore
      expect(mockEventStore.append).toHaveBeenCalledWith(
        teamLineupId,
        'TeamLineup',
        uncommittedEvents,
        4 // Expected version: 5 - 1 event = 4
      );
    });

    it('should propagate event store errors', async () => {
      // Setup: Mock EventStore.append to throw error
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const eventStoreError = new Error('Event store connection failed');
      (mockEventStore.append as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.save(mockTeamLineup)).rejects.toThrow(
        'Event store connection failed'
      );

      // Verify: Events not marked as committed on error
      expect(mockTeamLineup.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle concurrency conflicts from event store', async () => {
      // Setup: Mock EventStore.append to throw concurrency error
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const concurrencyError = new Error(
        'Concurrency conflict detected: expected version 2, actual 3'
      );
      (mockEventStore.append as Mock).mockRejectedValue(concurrencyError);

      // Execute & Verify: Concurrency error propagated
      await expect(repository.save(mockTeamLineup)).rejects.toThrow(
        'Concurrency conflict detected'
      );

      // Verify: Events not marked as committed on concurrency error
      expect(mockTeamLineup.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should not mark events as committed if EventStore.append fails', async () => {
      // Setup: Mock EventStore.append to fail
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockEventStore.append as Mock).mockRejectedValue(new Error('Database connection lost'));

      // Execute & Verify: Error thrown
      await expect(repository.save(mockTeamLineup)).rejects.toThrow();

      // Verify: Events not marked as committed on failure
      expect(mockTeamLineup.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle multiple saves with incremental versions', async () => {
      // Setup: Mock lineup with multiple event batches
      const firstBatch = [mockEvents[0]!];
      const secondBatch = [createMockTeamLineupCreatedEvent(gameId, teamLineupId)];

      (mockTeamLineup.getUncommittedEvents as Mock)
        .mockReturnValueOnce(firstBatch)
        .mockReturnValueOnce(secondBatch);
      (mockTeamLineup.getVersion as Mock).mockReturnValueOnce(1).mockReturnValueOnce(2);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute: Two consecutive saves
      await repository.save(mockTeamLineup);
      await repository.save(mockTeamLineup);

      // Verify: Both saves called with correct parameters
      expect(mockEventStore.append).toHaveBeenCalledTimes(2);
      expect(mockEventStore.append).toHaveBeenNthCalledWith(
        1,
        teamLineupId,
        'TeamLineup',
        firstBatch,
        0
      );
      expect(mockEventStore.append).toHaveBeenNthCalledWith(
        2,
        teamLineupId,
        'TeamLineup',
        secondBatch,
        1
      );
    });
  });

  describe('Core Operations - findById()', () => {
    it('should reconstruct lineup from event stream', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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

      // Mock TeamLineup.fromEvents static method
      const mockReconstructedLineup = mockTeamLineup;
      const mockTeamLineupFromEvents = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValue(mockReconstructedLineup);

      // Execute
      const result = await repository.findById(teamLineupId);

      // Verify: EventStore.getEvents called with correct teamLineupId
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);

      // Verify: TeamLineup.fromEvents called with parsed domain events
      expect(mockTeamLineupFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockTeamLineupFromEvents.mock.calls[0];
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

      // Verify: Correct lineup returned
      expect(result).toBe(mockReconstructedLineup);
    });

    it('should return null for non-existent lineups', async () => {
      // Setup: Mock EventStore.getEvents to return empty array (no events found)
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.findById(teamLineupId);

      // Verify: EventStore.getEvents called
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);

      // Verify: null returned for non-existent lineup
      expect(result).toBeNull();
    });

    it('should handle empty event streams', async () => {
      // Setup: Mock EventStore.getEvents to return empty array
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.findById(teamLineupId);

      // Verify: null returned for empty event stream
      expect(result).toBeNull();

      // Verify: TeamLineup.fromEvents not called for empty event stream
      expect(vi.spyOn(TeamLineup, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should reconstruct complex lineup state correctly', async () => {
      // Setup: Mock EventStore.getEvents to return complex event sequence
      const complexEvents = [
        createMockTeamLineupCreatedEvent(gameId, teamLineupId),
        createMockTeamLineupCreatedEvent(gameId, teamLineupId), // Additional event for complexity
      ];
      const storedEvents = complexEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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

      // Mock TeamLineup.fromEvents to return lineup with complex state
      const complexLineup = {
        ...mockTeamLineup,
        version: 2,
      } as unknown as TeamLineup;
      const mockTeamLineupFromEvents = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValue(complexLineup);

      // Execute
      const result = await repository.findById(teamLineupId);

      // Verify: TeamLineup.fromEvents called with all parsed domain events
      expect(mockTeamLineupFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockTeamLineupFromEvents.mock.calls[0];
      expect(firstCall).toBeDefined();
      const actualCallArg = firstCall![0];
      expect(actualCallArg).toHaveLength(complexEvents.length);

      // Verify: Complex lineup state returned
      expect(result).toBe(complexLineup);
      expect((result as unknown as { version?: number })?.version).toBe(2);
    });

    it('should propagate EventStore errors during findById', async () => {
      // Setup: Mock EventStore.getEvents to throw error
      const eventStoreError = new Error('Database connection failed');
      (mockEventStore.getEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findById(teamLineupId)).rejects.toThrow('Database connection failed');

      // Verify: EventStore.getEvents was called before error
      expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
    });

    it('should handle TeamLineup.fromEvents reconstruction errors', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const corruptedEvents = [mockEvents[0]!];
      const storedEvents = corruptedEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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

      // Mock TeamLineup.fromEvents to throw reconstruction error
      const reconstructionError = new Error('Invalid event sequence for TeamLineup reconstruction');
      vi.spyOn(TeamLineup, 'fromEvents').mockImplementation(() => {
        throw reconstructionError;
      });

      // Execute & Verify: Reconstruction error propagated
      await expect(repository.findById(teamLineupId)).rejects.toThrow(
        'Invalid event sequence for TeamLineup reconstruction'
      );
    });
  });

  describe('Query Operations - findByGameId()', () => {
    it('should query all events and filter by gameId returning both lineups', async () => {
      // Setup: Create events for multiple lineups in same game
      const homeTeamLineupId = TeamLineupId.generate();
      const awayTeamLineupId = TeamLineupId.generate();
      const otherGameId = GameId.generate();
      const otherTeamLineupId = TeamLineupId.generate();

      // Game events for target game (HOME and AWAY lineups)
      const gameEvents = [
        createMockTeamLineupCreatedEvent(gameId, homeTeamLineupId),
        createMockTeamLineupCreatedEvent(gameId, awayTeamLineupId),
      ];

      // Events for different game (should be filtered out)
      const otherGameEvents = [createMockTeamLineupCreatedEvent(otherGameId, otherTeamLineupId)];

      const allEvents = [
        ...gameEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: index === 0 ? homeTeamLineupId.value : awayTeamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...otherGameEvents.map(event => ({
          eventId: event.eventId,
          streamId: otherTeamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents to return lineups for correct game
      const mockHomeLineup = {
        ...mockTeamLineup,
        id: homeTeamLineupId,
        gameId,
        teamName: 'Home Team',
      } as unknown as TeamLineup;
      const mockAwayLineup = {
        ...mockTeamLineup,
        id: awayTeamLineupId,
        gameId,
        teamName: 'Away Team',
      } as unknown as TeamLineup;
      const mockOtherLineup = {
        ...mockTeamLineup,
        id: otherTeamLineupId,
        gameId: otherGameId,
        teamName: 'Other Game Team',
      } as unknown as TeamLineup;

      const mockTeamLineupFromEvents = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValueOnce(mockHomeLineup)
        .mockReturnValueOnce(mockAwayLineup)
        .mockReturnValueOnce(mockOtherLineup);

      // Execute
      const result = await repository.findByGameId(gameId);

      // Verify: EventStore.getAllEvents called
      expect(mockEventStore.getAllEvents).toHaveBeenCalledOnce();

      // Verify: Only lineups for target game returned
      expect(result).toHaveLength(2);
      expect(result).toContain(mockHomeLineup);
      expect(result).toContain(mockAwayLineup);
      expect(result).not.toContain(mockOtherLineup);

      // Verify: TeamLineup.fromEvents called for all found lineups during reconstruction
      expect(mockTeamLineupFromEvents).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no lineups found for game', async () => {
      // Setup: Mock getAllEvents to return events for different games only
      const otherGameId = GameId.generate();
      const otherTeamLineupId = TeamLineupId.generate();
      const otherGameEvents = [createMockTeamLineupCreatedEvent(otherGameId, otherTeamLineupId)];

      const allEvents = otherGameEvents.map(event => ({
        eventId: event.eventId,
        streamId: otherTeamLineupId.value,
        aggregateType: 'TeamLineup' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: 1,
        timestamp: event.timestamp,
        metadata: { source: 'test', createdAt: event.timestamp },
      }));

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents for the other game's lineup
      const mockOtherLineup = {
        ...mockTeamLineup,
        id: otherTeamLineupId,
        gameId: otherGameId,
      } as unknown as TeamLineup;
      vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockOtherLineup);

      // Execute: Search for lineups in target game
      const result = await repository.findByGameId(gameId);

      // Verify: Empty array returned
      expect(result).toEqual([]);
    });

    it('should handle empty event store gracefully', async () => {
      // Setup: Mock getAllEvents to return no events
      (mockEventStore.getAllEvents as Mock).mockResolvedValue([]);

      // Execute
      const result = await repository.findByGameId(gameId);

      // Verify: Empty array returned
      expect(result).toEqual([]);

      // Verify: TeamLineup.fromEvents never called
      expect(vi.spyOn(TeamLineup, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should reconstruct all matching lineups from event streams', async () => {
      // Setup: Create events for multiple lineups with same gameId
      const lineup1Id = TeamLineupId.generate();
      const lineup2Id = TeamLineupId.generate();

      const lineup1Events = [createMockTeamLineupCreatedEvent(gameId, lineup1Id)];
      const lineup2Events = [createMockTeamLineupCreatedEvent(gameId, lineup2Id)];

      const allEvents = [
        ...lineup1Events.map(event => ({
          eventId: event.eventId,
          streamId: lineup1Id.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...lineup2Events.map(event => ({
          eventId: event.eventId,
          streamId: lineup2Id.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents to return different lineups
      const mockLineup1 = {
        ...mockTeamLineup,
        id: lineup1Id,
        gameId,
        teamName: 'Team 1',
      } as unknown as TeamLineup;
      const mockLineup2 = {
        ...mockTeamLineup,
        id: lineup2Id,
        gameId,
        teamName: 'Team 2',
      } as unknown as TeamLineup;

      const mockTeamLineupFromEvents = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValueOnce(mockLineup1)
        .mockReturnValueOnce(mockLineup2);

      // Execute
      const result = await repository.findByGameId(gameId);

      // Verify: Both lineups reconstructed and returned
      expect(result).toHaveLength(2);
      expect(result).toContain(mockLineup1);
      expect(result).toContain(mockLineup2);
      expect(mockTeamLineupFromEvents).toHaveBeenCalledTimes(2);
    });

    it('should propagate EventStore errors during query', async () => {
      // Setup: Mock EventStore.getAllEvents to throw error
      const eventStoreError = new Error('EventStore connection failed');
      (mockEventStore.getAllEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findByGameId(gameId)).rejects.toThrow('EventStore connection failed');
    });

    it('should handle mixed aggregate types correctly', async () => {
      // Setup: Mix of TeamLineup and other aggregate events
      const lineupId = TeamLineupId.generate();
      const gameCreatedEvent = {
        eventId: 'game-event-id',
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: 'GameCreated',
        eventData: JSON.stringify({ gameId }),
        eventVersion: 1,
        streamVersion: 1,
        timestamp: new Date(),
        metadata: { source: 'test', createdAt: new Date() },
      };

      const lineupEvent = {
        eventId: mockEvents[0]!.eventId,
        streamId: lineupId.value,
        aggregateType: 'TeamLineup' as const,
        eventType: mockEvents[0]!.type,
        eventData: JSON.stringify(mockEvents[0]!),
        eventVersion: 1,
        streamVersion: 1,
        timestamp: mockEvents[0]!.timestamp,
        metadata: { source: 'test', createdAt: mockEvents[0]!.timestamp },
      };

      (mockEventStore.getAllEvents as Mock).mockResolvedValue([gameCreatedEvent, lineupEvent]);

      // Mock TeamLineup.fromEvents for the lineup event
      const mockFoundLineup = {
        ...mockTeamLineup,
        id: lineupId,
        gameId,
      } as unknown as TeamLineup;
      vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockFoundLineup);

      // Execute
      const result = await repository.findByGameId(gameId);

      // Verify: Only TeamLineup aggregates returned
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockFoundLineup);
    });
  });

  describe('Query Operations - findByGameIdAndSide()', () => {
    it('should find HOME side lineup for game', async () => {
      // Setup: Create events for both HOME and AWAY lineups
      const homeLineupId = TeamLineupId.generate();
      const awayLineupId = TeamLineupId.generate();

      const homeEvent = createMockTeamLineupCreatedEvent(gameId, homeLineupId);
      const awayEvent = createMockTeamLineupCreatedEvent(gameId, awayLineupId);

      const allEvents = [
        {
          eventId: homeEvent.eventId,
          streamId: homeLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: homeEvent.type,
          eventData: JSON.stringify(homeEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: homeEvent.timestamp,
          metadata: { source: 'test', createdAt: homeEvent.timestamp },
        },
        {
          eventId: awayEvent.eventId,
          streamId: awayLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: awayEvent.type,
          eventData: JSON.stringify(awayEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: awayEvent.timestamp,
          metadata: { source: 'test', createdAt: awayEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents to return lineups with different sides
      // Note: Side determination logic will be implemented in the repository
      const mockHomeLineup = {
        ...mockTeamLineup,
        id: homeLineupId,
        gameId,
        teamName: 'Home Team',
      } as unknown as TeamLineup;
      const mockAwayLineup = {
        ...mockTeamLineup,
        id: awayLineupId,
        gameId,
        teamName: 'Away Team',
      } as unknown as TeamLineup;

      vi.spyOn(TeamLineup, 'fromEvents')
        .mockReturnValueOnce(mockHomeLineup)
        .mockReturnValueOnce(mockAwayLineup);

      // Execute: Search for HOME side
      const result = await repository.findByGameIdAndSide(gameId, 'HOME');

      // Verify: HOME lineup returned (first lineup created is typically HOME)
      expect(result).toBe(mockHomeLineup);
      expect(result?.teamName).toBe('Home Team');
    });

    it('should find AWAY side lineup for game', async () => {
      // Setup: Create events for both HOME and AWAY lineups
      const homeLineupId = TeamLineupId.generate();
      const awayLineupId = TeamLineupId.generate();

      const homeEvent = createMockTeamLineupCreatedEvent(gameId, homeLineupId);
      const awayEvent = createMockTeamLineupCreatedEvent(gameId, awayLineupId);

      const allEvents = [
        {
          eventId: homeEvent.eventId,
          streamId: homeLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: homeEvent.type,
          eventData: JSON.stringify(homeEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: homeEvent.timestamp,
          metadata: { source: 'test', createdAt: homeEvent.timestamp },
        },
        {
          eventId: awayEvent.eventId,
          streamId: awayLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: awayEvent.type,
          eventData: JSON.stringify(awayEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: awayEvent.timestamp,
          metadata: { source: 'test', createdAt: awayEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents to return lineups
      const mockHomeLineup = {
        ...mockTeamLineup,
        id: homeLineupId,
        gameId,
        teamName: 'Home Team',
      } as unknown as TeamLineup;
      const mockAwayLineup = {
        ...mockTeamLineup,
        id: awayLineupId,
        gameId,
        teamName: 'Away Team',
      } as unknown as TeamLineup;

      vi.spyOn(TeamLineup, 'fromEvents')
        .mockReturnValueOnce(mockHomeLineup)
        .mockReturnValueOnce(mockAwayLineup);

      // Execute: Search for AWAY side
      const result = await repository.findByGameIdAndSide(gameId, 'AWAY');

      // Verify: AWAY lineup returned (second lineup created is typically AWAY)
      expect(result).toBe(mockAwayLineup);
      expect(result?.teamName).toBe('Away Team');
    });

    it('should return null when side not found', async () => {
      // Setup: Create events for only one lineup (HOME)
      const homeLineupId = TeamLineupId.generate();
      const homeEvent = createMockTeamLineupCreatedEvent(gameId, homeLineupId);

      const allEvents = [
        {
          eventId: homeEvent.eventId,
          streamId: homeLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: homeEvent.type,
          eventData: JSON.stringify(homeEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: homeEvent.timestamp,
          metadata: { source: 'test', createdAt: homeEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents to return only home lineup
      const mockHomeLineup = {
        ...mockTeamLineup,
        id: homeLineupId,
        gameId,
        teamName: 'Home Team',
      } as unknown as TeamLineup;

      vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockHomeLineup);

      // Execute: Search for AWAY side (which doesn't exist)
      const result = await repository.findByGameIdAndSide(gameId, 'AWAY');

      // Verify: null returned for non-existent side
      expect(result).toBeNull();
    });

    it('should return null when game not found', async () => {
      // Setup: Mock getAllEvents to return events for different game
      const otherGameId = GameId.generate();
      const otherLineupId = TeamLineupId.generate();
      const otherEvent = createMockTeamLineupCreatedEvent(otherGameId, otherLineupId);

      const allEvents = [
        {
          eventId: otherEvent.eventId,
          streamId: otherLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: otherEvent.type,
          eventData: JSON.stringify(otherEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: otherEvent.timestamp,
          metadata: { source: 'test', createdAt: otherEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents for other game's lineup
      const mockOtherLineup = {
        ...mockTeamLineup,
        id: otherLineupId,
        gameId: otherGameId,
      } as unknown as TeamLineup;
      vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockOtherLineup);

      // Execute: Search for lineup in target game
      const result = await repository.findByGameIdAndSide(gameId, 'HOME');

      // Verify: null returned for non-existent game
      expect(result).toBeNull();
    });

    it('should handle invalid side parameter gracefully', async () => {
      // Setup: Create events for lineups
      const lineupId = TeamLineupId.generate();
      const lineupEvent = createMockTeamLineupCreatedEvent(gameId, lineupId);

      const allEvents = [
        {
          eventId: lineupEvent.eventId,
          streamId: lineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: lineupEvent.type,
          eventData: JSON.stringify(lineupEvent),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: lineupEvent.timestamp,
          metadata: { source: 'test', createdAt: lineupEvent.timestamp },
        },
      ];

      (mockEventStore.getAllEvents as Mock).mockResolvedValue(allEvents);

      // Mock TeamLineup.fromEvents
      const mockFoundLineup = {
        ...mockTeamLineup,
        id: lineupId,
        gameId,
      } as unknown as TeamLineup;
      vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockFoundLineup);

      // Execute: Search with invalid side (should default to HOME or handle gracefully)
      const invalidSide = 'INVALID' as 'HOME' | 'AWAY';
      const result = await repository.findByGameIdAndSide(gameId, invalidSide);

      // Verify: Should handle gracefully (implementation dependent)
      expect(result).toBeNull(); // Expected behavior for invalid side
    });

    it('should propagate EventStore errors during side-specific query', async () => {
      // Setup: Mock EventStore.getAllEvents to throw error
      const eventStoreError = new Error('EventStore connection failed');
      (mockEventStore.getAllEvents as Mock).mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findByGameIdAndSide(gameId, 'HOME')).rejects.toThrow(
        'EventStore connection failed'
      );
    });
  });

  describe('Delete Operations - delete()', () => {
    it('should delete lineup by removing all events from stream', async () => {
      // Setup: Mock successful deletion
      mockEventStore.delete.mockResolvedValue(undefined);

      // Execute
      await repository.delete(teamLineupId);

      // Verify: EventStore.delete called with correct teamLineupId
      expect(mockEventStore.delete).toHaveBeenCalledOnce();
      expect(mockEventStore.delete).toHaveBeenCalledWith(teamLineupId);
    });

    it('should handle non-existent lineup gracefully', async () => {
      // Setup: Mock EventStore.delete to handle non-existent lineup
      mockEventStore.delete.mockResolvedValue(undefined);

      // Execute
      await repository.delete(teamLineupId);

      // Verify: EventStore.delete called (should not throw for non-existent)
      expect(mockEventStore.delete).toHaveBeenCalledOnce();
    });

    it('should propagate EventStore errors during deletion', async () => {
      // Setup: Mock EventStore.delete to throw error
      const eventStoreError = new Error('EventStore deletion failed');
      mockEventStore.delete.mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.delete(teamLineupId)).rejects.toThrow('EventStore deletion failed');
    });

    it('should validate teamLineupId parameter', async () => {
      // Setup: Test with null teamLineupId
      const nullTeamLineupId = null as unknown as TeamLineupId;

      // Execute & Verify: Should handle null teamLineupId validation
      await expect(repository.delete(nullTeamLineupId)).rejects.toThrow(
        'TeamLineupId cannot be null or undefined'
      );
    });

    it('should handle database constraint errors', async () => {
      // Setup: Mock EventStore.delete to throw constraint error
      const constraintError = new Error('Cannot delete: lineup has active references');
      mockEventStore.delete.mockRejectedValue(constraintError);

      // Execute & Verify: Constraint error propagated
      await expect(repository.delete(teamLineupId)).rejects.toThrow(
        'Cannot delete: lineup has active references'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null teamLineupId in save operation', async () => {
      // Setup: Create lineup with null id
      const invalidLineup = {
        ...mockTeamLineup,
        id: null as unknown as TeamLineupId,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as TeamLineup;

      (invalidLineup.getUncommittedEvents as Mock).mockReturnValue([]);
      (invalidLineup.getVersion as Mock).mockReturnValue(0);
      // EventStore should reject null teamLineupId
      (mockEventStore.append as Mock).mockRejectedValue(new Error('Invalid teamLineupId'));

      // Execute & Verify: Repository should handle null teamLineupId gracefully
      await expect(repository.save(invalidLineup)).rejects.toThrow();
    });

    it('should handle null teamLineupId in findById operation', async () => {
      const nullTeamLineupId = null as unknown as TeamLineupId;

      // Execute & Verify: Repository should handle null teamLineupId gracefully
      await expect(repository.findById(nullTeamLineupId)).rejects.toThrow();
    });

    it('should handle malformed events during reconstruction', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects with malformed eventData
      const malformedEvents = [
        { type: 'InvalidEventType', gameId: gameId } as unknown as DomainEvent,
      ];
      const storedEvents = malformedEvents.map((event, index) => ({
        eventId: 'malformed-event-id',
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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

      // Mock TeamLineup.fromEvents to throw on malformed events
      const mockFromEventsThrow = vi.spyOn(TeamLineup, 'fromEvents').mockImplementation(() => {
        throw new Error('Cannot reconstruct lineup from malformed events');
      });

      try {
        // Execute & Verify: Malformed event error propagated
        await expect(repository.findById(teamLineupId)).rejects.toThrow(
          'Cannot reconstruct lineup from malformed events'
        );
      } finally {
        mockFromEventsThrow.mockRestore();
      }
    });

    it('should handle version mismatch scenarios', async () => {
      // Setup: Mock lineup with mismatched version
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(1);

      // Mock EventStore.append to reject with version mismatch
      const versionError = new Error('Version mismatch: expected 1, found 3');
      (mockEventStore.append as Mock).mockRejectedValue(versionError);

      // Execute & Verify: Version error propagated
      await expect(repository.save(mockTeamLineup)).rejects.toThrow('Version mismatch');
      expect(mockTeamLineup.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle EventStore timeout errors', async () => {
      // Setup: Mock EventStore.getEvents to timeout
      const timeoutError = new Error('EventStore operation timed out');
      (mockEventStore.getEvents as Mock).mockRejectedValue(timeoutError);

      // Execute & Verify: Timeout error propagated
      await expect(repository.findById(teamLineupId)).rejects.toThrow(
        'EventStore operation timed out'
      );
    });

    it('should handle large event streams efficiently', async () => {
      // Setup: Mock EventStore.getEvents to return large StoredEvent stream
      const largeDomainEventStream = Array.from({ length: 1000 }, () => mockEvents[0]!);
      const largeStoredEventStream = largeDomainEventStream.map((event, index) => ({
        eventId: event.eventId,
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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

      const mockReconstructedLineup = {
        ...mockTeamLineup,
        version: 1000,
        getVersion: vi.fn().mockReturnValue(1000),
        getUncommittedEvents: vi.fn().mockReturnValue([]),
        markEventsAsCommitted: vi.fn(),
      } as unknown as TeamLineup;
      const mockFromEventsLarge = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValue(mockReconstructedLineup);

      try {
        // Execute
        const result = await repository.findById(teamLineupId);

        // Verify: Large event stream handled correctly
        expect(result).toBe(mockReconstructedLineup);
        expect(mockEventStore.getEvents).toHaveBeenCalledOnce();
      } finally {
        mockFromEventsLarge.mockRestore();
      }
    });

    it('should handle concurrent save operations', async () => {
      // Setup: Create separate mock lineups with independent mock functions
      const lineup1 = {
        ...mockTeamLineup,
        version: 1,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as TeamLineup;

      const lineup2 = {
        ...mockTeamLineup,
        version: 2,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as TeamLineup;

      (lineup1.getUncommittedEvents as Mock).mockReturnValue([mockEvents[0]!]);
      (lineup1.getVersion as Mock).mockReturnValue(1);
      (lineup2.getUncommittedEvents as Mock).mockReturnValue([mockEvents[0]!]);
      (lineup2.getVersion as Mock).mockReturnValue(1);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute concurrent saves
      const save1Promise = repository.save(lineup1);
      const save2Promise = repository.save(lineup2);

      await Promise.all([save1Promise, save2Promise]);

      // Verify: Both saves completed
      expect(mockEventStore.append).toHaveBeenCalledTimes(2);
      expect(lineup1.markEventsAsCommitted).toHaveBeenCalledOnce();
      expect(lineup2.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should handle corrupted JSON event data', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent with corrupted JSON
      const corruptedStoredEvents = [
        {
          eventId: 'corrupted-event-id',
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: 'TeamLineupCreated',
          eventData: '{"malformed": json}', // Invalid JSON
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date(),
          metadata: { source: 'test', createdAt: new Date() },
        },
      ];
      (mockEventStore.getEvents as Mock).mockResolvedValue(corruptedStoredEvents);

      // Execute & Verify: JSON parse error should be handled
      await expect(repository.findById(teamLineupId)).rejects.toThrow();
    });

    it('should maintain transaction consistency during save failures', async () => {
      // Setup: Mock EventStore.append to fail after partial completion
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockEventStore.append as Mock).mockRejectedValue(new Error('Transaction rollback'));

      // Execute & Verify: Failure should not leave partial state
      await expect(repository.save(mockTeamLineup)).rejects.toThrow('Transaction rollback');

      // Verify: Events not marked as committed on transaction failure
      expect(mockTeamLineup.markEventsAsCommitted).not.toHaveBeenCalled();
    });
  });

  describe('Repository Pattern Compliance', () => {
    it('should act as thin wrapper with no business logic', async () => {
      // Setup: Mock successful operations
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(1); // 1 event, so version is 1
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute save
      await repository.save(mockTeamLineup);

      // Verify: Repository delegates to EventStore without modification
      expect(mockEventStore.append).toHaveBeenCalledWith(
        teamLineupId,
        'TeamLineup',
        uncommittedEvents,
        0 // Expected version: 1 - 1 event = 0
      );

      // Repository should not perform any business logic validation
      expect(mockTeamLineup.getUncommittedEvents).toHaveBeenCalledOnce();
      expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should preserve all domain events during save', async () => {
      // Setup: Mock lineup with multiple different event types
      const allEventTypes = [
        createMockTeamLineupCreatedEvent(gameId, teamLineupId),
        createMockTeamLineupCreatedEvent(gameId, teamLineupId), // Different event for variety
      ];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(allEventTypes);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(2); // 2 events, so version is 2
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute
      await repository.save(mockTeamLineup);

      // Verify: All events passed to EventStore without filtering
      expect(mockEventStore.append).toHaveBeenCalledWith(
        teamLineupId,
        'TeamLineup',
        allEventTypes,
        0 // Expected version: 2 - 2 events = 0
      );
    });

    it('should not cache or modify retrieved lineups', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: teamLineupId.value,
        aggregateType: 'TeamLineup' as const,
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
      const mockFromEventsCache = vi
        .spyOn(TeamLineup, 'fromEvents')
        .mockReturnValue(mockTeamLineup);

      try {
        // Execute multiple findById calls
        const result1 = await repository.findById(teamLineupId);
        const result2 = await repository.findById(teamLineupId);

        // Verify: EventStore called each time (no caching)
        expect(mockEventStore.getEvents).toHaveBeenCalledTimes(2);
        expect(result1).toBe(mockTeamLineup);
        expect(result2).toBe(mockTeamLineup);
      } finally {
        mockFromEventsCache.mockRestore();
      }
    });

    it('should use correct aggregate type for TeamLineup events', async () => {
      // Setup: Mock lineup save operation
      const uncommittedEvents = [mockEvents[0]!];
      (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValue(1);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute save
      await repository.save(mockTeamLineup);

      // Verify: Correct aggregate type used
      expect(mockEventStore.append).toHaveBeenCalledWith(
        teamLineupId,
        'TeamLineup', // Correct aggregate type
        uncommittedEvents,
        0
      );
    });

    it('should maintain proper event sourcing semantics', async () => {
      // Setup: Mock multiple save operations to verify version progression
      const firstEvents = [mockEvents[0]!];
      const secondEvents = [createMockTeamLineupCreatedEvent(gameId, teamLineupId)];

      (mockTeamLineup.getUncommittedEvents as Mock)
        .mockReturnValueOnce(firstEvents)
        .mockReturnValueOnce(secondEvents);
      (mockTeamLineup.getVersion as Mock).mockReturnValueOnce(1).mockReturnValueOnce(2);
      (mockEventStore.append as Mock).mockResolvedValue(undefined);

      // Execute sequential saves
      await repository.save(mockTeamLineup);
      await repository.save(mockTeamLineup);

      // Verify: Proper version progression for event sourcing
      expect(mockEventStore.append).toHaveBeenNthCalledWith(
        1,
        teamLineupId,
        'TeamLineup',
        firstEvents,
        0 // First save: version 1 - 1 = 0
      );
      expect(mockEventStore.append).toHaveBeenNthCalledWith(
        2,
        teamLineupId,
        'TeamLineup',
        secondEvents,
        1 // Second save: version 2 - 1 = 1
      );

      // Verify: Events marked as committed after each successful save
      expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledTimes(2);
    });
  });

  /*
  describe('Snapshot Integration', () => {
    describe('Constructor Backward Compatibility', () => {
      it('should work without SnapshotStore for backward compatibility', () => {
        const repositoryWithoutSnapshots = new EventSourcedTeamLineupRepository(
          mockEventStore,
          mockGameRepository
        );
        expect(repositoryWithoutSnapshots).toBeDefined();
        expect(repositoryWithoutSnapshots).toBeInstanceOf(EventSourcedTeamLineupRepository);
      });

      it('should work with SnapshotStore for enhanced performance', () => {
        const repositoryWithSnapshots = new EventSourcedTeamLineupRepository(
          mockEventStore,
          mockGameRepository,
          mockSnapshotStore
        );
        expect(repositoryWithSnapshots).toBeDefined();
        expect(repositoryWithSnapshots).toBeInstanceOf(EventSourcedTeamLineupRepository);
      });
    });

    describe('Snapshot-Optimized save()', () => {
      it('should create snapshot when frequency threshold is reached', async () => {
        // Setup: Mock lineup with version that reaches snapshot frequency (100)
        const uncommittedEvents = [mockEvents[0]!];
        (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockTeamLineup.getVersion as Mock).mockReturnValue(100); // Meets frequency threshold
        (mockEventStore.append as Mock).mockResolvedValue(undefined);

        // Mock SnapshotManager methods to simulate reaching threshold
        (mockEventStore.getEvents as Mock).mockResolvedValue(Array(100).fill(mockEvents[0])); // 100 events
        (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null); // No existing snapshot

        // Execute
        await repositoryWithSnapshots.save(mockTeamLineup);

        // Verify: Events saved first
        expect(mockEventStore.append).toHaveBeenCalledOnce();
        expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();

        // Verify: Snapshot creation triggered
        expect(mockSnapshotStore.saveSnapshot).toHaveBeenCalledOnce();
        const snapshotCall = (mockSnapshotStore.saveSnapshot as Mock).mock.calls[0];
        expect(snapshotCall[0]).toEqual(teamLineupId);
        expect(snapshotCall[1]).toMatchObject({
          aggregateId: teamLineupId,
          aggregateType: 'TeamLineup',
          version: 100,
          data: expect.any(Object),
          timestamp: expect.any(Date),
        });
      });

      it('should not create snapshot when frequency threshold not reached', async () => {
        // Setup: Mock lineup with version below snapshot frequency
        const uncommittedEvents = [mockEvents[0]!];
        (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockTeamLineup.getVersion as Mock).mockReturnValue(5); // Below threshold
        (mockEventStore.append as Mock).mockResolvedValue(undefined);

        // Mock SnapshotManager methods to simulate NOT reaching threshold
        (mockEventStore.getEvents as Mock).mockResolvedValue(Array(5).fill(mockEvents[0])); // Only 5 events
        (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null); // No existing snapshot

        // Execute
        await repositoryWithSnapshots.save(mockTeamLineup);

        // Verify: Events saved
        expect(mockEventStore.append).toHaveBeenCalledOnce();
        expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();

        // Verify: No snapshot created
        expect(mockSnapshotStore.saveSnapshot).not.toHaveBeenCalled();
      });

      it('should not fail if snapshot creation fails', async () => {
        // Setup: Mock lineup that triggers snapshot but snapshot fails
        const uncommittedEvents = [mockEvents[0]!];
        (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockTeamLineup.getVersion as Mock).mockReturnValue(100);
        (mockEventStore.append as Mock).mockResolvedValue(undefined);

        // Mock SnapshotManager methods to simulate reaching threshold but failing to save
        (mockEventStore.getEvents as Mock).mockResolvedValue(Array(100).fill(mockEvents[0]));
        (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);
        (mockSnapshotStore.saveSnapshot as Mock).mockRejectedValue(
          new Error('Snapshot save failed')
        );

        // Execute - should not throw
        await expect(repositoryWithSnapshots.save(mockTeamLineup)).resolves.toBeUndefined();

        // Verify: Events still saved and committed
        expect(mockEventStore.append).toHaveBeenCalledOnce();
        expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();
      });

      it('should save without snapshots when no SnapshotStore provided', async () => {
        // Setup: Use repository without snapshots
        const uncommittedEvents = [mockEvents[0]!];
        (mockTeamLineup.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockTeamLineup.getVersion as Mock).mockReturnValue(100);
        (mockEventStore.append as Mock).mockResolvedValue(undefined);

        // Execute
        await repository.save(mockTeamLineup);

        // Verify: Events saved without snapshot creation
        expect(mockEventStore.append).toHaveBeenCalledOnce();
        expect(mockTeamLineup.markEventsAsCommitted).toHaveBeenCalledOnce();
        expect(mockSnapshotStore.saveSnapshot).not.toHaveBeenCalled();
      });
    });

    describe('Snapshot-Optimized findById()', () => {
      it('should load from snapshot + subsequent events when available', async () => {
        // Setup: Mock snapshot and subsequent events
        const snapshotData = {
          id: teamLineupId.value,
          gameId: gameId.value,
          teamName: 'Mock Team',
          version: 5,
        };
        const subsequentEvents = [createMockTeamLineupCreatedEvent(gameId, teamLineupId)];
        const storedSubsequentEvents = subsequentEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 6 + index,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));

        (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue({
          aggregateId: teamLineupId,
          aggregateType: 'TeamLineup',
          version: 5,
          data: snapshotData,
          timestamp: new Date(),
        });
        (mockEventStore.getEvents as Mock).mockResolvedValue(storedSubsequentEvents);

        // Mock TeamLineup reconstruction
        const mockReconstructedLineup = mockTeamLineup;
        const mockFromEvents = vi
          .spyOn(TeamLineup, 'fromEvents')
          .mockReturnValue(mockReconstructedLineup);

        // Execute
        const result = await repositoryWithSnapshots.findById(teamLineupId);

        // Verify: Snapshot loaded
        expect(mockSnapshotStore.findLatest).toHaveBeenCalledWith(teamLineupId);

        // Verify: Subsequent events loaded after snapshot version
        expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId, 5);

        // Verify: TeamLineup reconstructed from subsequent events
        expect(mockFromEvents).toHaveBeenCalledOnce();

        // Verify: Correct result returned
        expect(result).toBe(mockReconstructedLineup);
      });

      it('should fallback to event-only loading when no snapshot exists', async () => {
        // Setup: No snapshot available
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        (mockEventStore.getEvents as Mock).mockResolvedValue(allEvents);

        const mockReconstructedLineup = mockTeamLineup;
        const mockFromEvents = vi
          .spyOn(TeamLineup, 'fromEvents')
          .mockReturnValue(mockReconstructedLineup);

        // Execute
        const result = await repositoryWithSnapshots.findById(teamLineupId);

        // Verify: Snapshot checked
        expect(mockSnapshotStore.findLatest).toHaveBeenCalledWith(teamLineupId);

        // Verify: All events loaded (traditional approach)
        expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);

        // Verify: TeamLineup reconstructed from all events
        expect(mockFromEvents).toHaveBeenCalledOnce();
        expect(result).toBe(mockReconstructedLineup);
      });

      it('should gracefully fallback to event-only loading on snapshot errors', async () => {
        // Setup: Snapshot loading fails
        (mockSnapshotStore.findLatest as Mock).mockRejectedValue(new Error('Snapshot load failed'));
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        (mockEventStore.getEvents as Mock).mockResolvedValue(allEvents);

        const mockReconstructedLineup = mockTeamLineup;
        const mockFromEvents = vi
          .spyOn(TeamLineup, 'fromEvents')
          .mockReturnValue(mockReconstructedLineup);

        // Execute - should not throw
        const result = await repositoryWithSnapshots.findById(teamLineupId);

        // Verify: Fallback to event-only loading
        expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);
        expect(mockFromEvents).toHaveBeenCalledOnce();
        expect(result).toBe(mockReconstructedLineup);
      });

      it('should return null when no snapshot and no events exist', async () => {
        // Setup: No snapshot and no events
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        (mockEventStore.getEvents as Mock).mockResolvedValue([]);

        // Execute
        const result = await repositoryWithSnapshots.findById(teamLineupId);

        // Verify: null returned
        expect(result).toBeNull();

        // Verify: No reconstruction attempted
        expect(vi.spyOn(TeamLineup, 'fromEvents')).not.toHaveBeenCalled();
      });

      it('should work traditionally when no SnapshotStore provided', async () => {
        // Setup: Use repository without snapshots
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        (mockEventStore.getEvents as Mock).mockResolvedValue(allEvents);

        const mockReconstructedLineup = mockTeamLineup;
        const mockFromEvents = vi
          .spyOn(TeamLineup, 'fromEvents')
          .mockReturnValue(mockReconstructedLineup);

        // Execute
        const result = await repository.findById(teamLineupId);

        // Verify: Only event store used (no snapshot calls)
        expect(mockSnapshotStore.findLatest).not.toHaveBeenCalled();
        expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);
        expect(result).toBe(mockReconstructedLineup);
      });
    });

    describe('Performance Benefits', () => {
      it('should achieve faster loading with snapshots for large aggregates', async () => {
        // Setup: Large aggregate with snapshot at version 50
        const snapshotData = {
          id: teamLineupId.value,
          gameId: gameId.value,
          teamName: 'Mock Team',
          version: 50,
        };
        const fewSubsequentEvents = [createMockTeamLineupCreatedEvent(gameId, teamLineupId)];
        const storedSubsequentEvents = fewSubsequentEvents.map(event => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 51,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));

        (mockSnapshotStore.findLatest as Mock).mockResolvedValue({
          aggregateId: teamLineupId,
          aggregateType: 'TeamLineup',
          version: 50,
          data: snapshotData,
          timestamp: new Date(),
        });
        (mockEventStore.getEvents as Mock).mockResolvedValue(storedSubsequentEvents);

        const mockFromEvents = vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockTeamLineup);

        // Execute
        const startTime = Date.now();
        const result = await repositoryWithSnapshots.findById(teamLineupId);
        const endTime = Date.now();

        // Verify: Only 1 event processed instead of 51
        expect(mockFromEvents).toHaveBeenCalledOnce();
        const eventsProcessed = mockFromEvents.mock.calls[0]![0] as DomainEvent[];
        expect(eventsProcessed).toHaveLength(1); // Only subsequent events, not all 51

        // Verify: Result is correct
        expect(result).toBe(mockTeamLineup);

        // Performance is inherently better by processing fewer events
        expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      });

      it('should maintain consistent interface regardless of snapshot availability', async () => {
        // Setup: Test both repositories
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: teamLineupId.value,
          aggregateType: 'TeamLineup' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));

        // Mock both paths
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        (mockEventStore.getEvents as Mock).mockResolvedValue(allEvents);
        const mockFromEvents = vi.spyOn(TeamLineup, 'fromEvents').mockReturnValue(mockTeamLineup);

        // Execute both
        const resultWithSnapshots = await repositoryWithSnapshots.findById(teamLineupId);
        const resultWithoutSnapshots = await repository.findById(teamLineupId);

        // Verify: Same interface and results
        expect(resultWithSnapshots).toBe(mockTeamLineup);
        expect(resultWithoutSnapshots).toBe(mockTeamLineup);
        expect(typeof resultWithSnapshots?.id).toBe(typeof resultWithoutSnapshots?.id);
      });
    });
  });
  */
});
