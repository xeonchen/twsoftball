/**
 * @file EventSourcedInningStateRepository Tests
 * Core operations tests for event-sourced InningState aggregate persistence.
 *
 * @remarks
 * TDD implementation of EventSourcedInningStateRepository as thin wrapper over EventStore.
 * Tests validate that repository properly delegates to event store while maintaining
 * InningState aggregate event sourcing pattern.
 *
 * This repository serves as the infrastructure adapter implementing the InningStateRepository
 * port from the application layer. It provides event sourcing capabilities for InningState
 * aggregates by delegating to an EventStore and handling the conversion between
 * domain events and stored events.
 *
 * Key responsibilities tested:
 * - Delegating save operations to EventStore with proper parameters
 * - Reconstructing InningState aggregates from event streams
 * - Handling optimistic concurrency through version management
 * - Error propagation from EventStore to application layer
 * - Proper event committing after successful saves
 * - InningState-specific query operations (findCurrentByGameId)
 * - Complex runner state reconstruction from events
 */

import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
// import type { SnapshotStore } from '@twsoftball/application/ports/out/SnapshotStore'; // Commented out while snapshot tests are disabled
import {
  InningStateId,
  InningState,
  GameId,
  PlayerId,
  DomainEvent,
  BasesState,
  AtBatResultType,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

import { EventSourcedInningStateRepository } from './EventSourcedInningStateRepository';
import { InMemoryEventStore } from './InMemoryEventStore';

describe('EventSourcedInningStateRepository', () => {
  let repository: InningStateRepository;
  // let repositoryWithSnapshots: InningStateRepository; // Commented out for now while snapshot tests are disabled
  let eventStore: InMemoryEventStore;
  // let mockSnapshotStore: SnapshotStore; // Commented out for now while snapshot tests are disabled
  let inningStateId: InningStateId;
  let gameId: GameId;
  let mockInningState: InningState;
  let mockEvents: DomainEvent[];
  let batterId: PlayerId;

  beforeEach(() => {
    // Create InMemoryEventStore for testing (matching other repository patterns)
    eventStore = new InMemoryEventStore();

    // Create mock SnapshotStore (commented out while snapshot tests are disabled)
    // mockSnapshotStore = {
    //   saveSnapshot: vi.fn(),
    //   getSnapshot: vi.fn(),
    // };

    inningStateId = InningStateId.generate();
    gameId = GameId.generate();
    batterId = PlayerId.generate();

    // Create mock events for testing InningState scenarios
    mockEvents = [
      {
        type: 'InningStateCreated' as const,
        eventId: crypto.randomUUID(),
        timestamp: new Date(),
        version: 1,
        gameId,
        inningStateId,
        inning: 1,
        isTopHalf: true,
      } as DomainEvent,
      {
        type: 'AtBatCompleted' as const,
        eventId: crypto.randomUUID(),
        timestamp: new Date(),
        version: 1,
        gameId,
        batterId,
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        inning: 1,
        outs: 0,
      } as DomainEvent,
      {
        type: 'RunnerAdvanced' as const,
        eventId: crypto.randomUUID(),
        timestamp: new Date(),
        version: 1,
        gameId,
        runnerId: batterId,
        from: null,
        to: 'FIRST' as const,
        reason: 'HIT' as const,
      } as DomainEvent,
    ];

    // Mock InningState static methods and instance methods
    mockInningState = {
      id: inningStateId,
      gameId,
      inning: 1,
      isTopHalf: true,
      outs: 0,
      currentBattingSlot: 2,
      basesState: BasesState.empty().withRunnerOn('FIRST', batterId),
      getUncommittedEvents: vi.fn(),
      markEventsAsCommitted: vi.fn(),
      getVersion: vi.fn(),
      version: 0,
      getCurrentSituation: vi.fn(),
      withRunnerOnBase: vi.fn(),
      withOuts: vi.fn(),
      withCurrentBattingSlot: vi.fn(),
      withInningHalf: vi.fn(),
      recordAtBat: vi.fn(),
      advanceRunners: vi.fn(),
      endHalfInning: vi.fn(),
      isInningComplete: vi.fn(),
    } as unknown as InningState;

    // Setup default return values for mock methods
    (mockInningState.getVersion as Mock).mockReturnValue(0);
    (mockInningState.getUncommittedEvents as Mock).mockReturnValue([]);

    // Create repository instance with InMemoryEventStore
    repository = new EventSourcedInningStateRepository(eventStore);

    // Create repository instance with snapshot support (commented out while snapshot tests are disabled)
    // repositoryWithSnapshots = new EventSourcedInningStateRepository(eventStore, mockSnapshotStore);
  });

  describe('Core Implementation', () => {
    it('should implement InningStateRepository interface', () => {
      expect(repository).toBeInstanceOf(EventSourcedInningStateRepository);
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findCurrentByGameId).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should return promises for all methods', () => {
      expect(repository.save(mockInningState)).toBeInstanceOf(Promise);
      expect(repository.findById(inningStateId)).toBeInstanceOf(Promise);
      expect(repository.findCurrentByGameId(gameId)).toBeInstanceOf(Promise);
      expect(repository.delete(inningStateId)).toBeInstanceOf(Promise);

      // Catch rejections to prevent unhandled rejection warnings
      repository.save(mockInningState).catch(() => {});
      repository.findById(inningStateId).catch(() => {});
      repository.findCurrentByGameId(gameId).catch(() => {});
      repository.delete(inningStateId).catch(() => {});
    });
  });

  describe('Core Operations - save()', () => {
    it('should append uncommitted events to event store with correct parameters', async () => {
      // Setup: Mock inning state with uncommitted events
      const uncommittedEvents = [mockEvents[0]!, mockEvents[1]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockInningState.getVersion as Mock).mockReturnValue(2);

      const eventStoreSpy = vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: EventStore.append called with correct parameters
      expect(eventStoreSpy).toHaveBeenCalledOnce();
      expect(eventStoreSpy).toHaveBeenCalledWith(
        inningStateId,
        'InningState',
        uncommittedEvents,
        0 // Expected version: 2 - 2 events = 0
      );
    });

    it('should mark events as committed after successful save', async () => {
      // Setup: Mock successful EventStore.append
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: Events marked as committed after successful save
      expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should handle empty uncommitted events gracefully', async () => {
      // Setup: Mock inning state with no uncommitted events
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue([]);
      const eventStoreSpy = vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: EventStore.append still called (should handle empty arrays)
      expect(eventStoreSpy).toHaveBeenCalledOnce();
      expect(eventStoreSpy).toHaveBeenCalledWith(inningStateId, 'InningState', [], 0);
      expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should pass correct version for optimistic locking', async () => {
      // Setup: Mock inning state with specific version
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockInningState.getVersion as Mock).mockReturnValue(5); // Specific version to verify
      const eventStoreSpy = vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: Correct version passed to EventStore
      expect(eventStoreSpy).toHaveBeenCalledWith(
        inningStateId,
        'InningState',
        uncommittedEvents,
        4 // Expected version: 5 - 1 event = 4
      );
    });

    it('should propagate event store errors', async () => {
      // Setup: Mock EventStore.append to throw error
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const eventStoreError = new Error('Event store connection failed');
      vi.spyOn(eventStore, 'append').mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.save(mockInningState)).rejects.toThrow(
        'Event store connection failed'
      );

      // Verify: Events not marked as committed on error
      expect(mockInningState.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle concurrency conflicts from event store', async () => {
      // Setup: Mock EventStore.append to throw concurrency error
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      const concurrencyError = new Error(
        'Concurrency conflict detected: expected version 2, actual 3'
      );
      vi.spyOn(eventStore, 'append').mockRejectedValue(concurrencyError);

      // Execute & Verify: Concurrency error propagated
      await expect(repository.save(mockInningState)).rejects.toThrow(
        'Concurrency conflict detected'
      );

      // Verify: Events not marked as committed on concurrency error
      expect(mockInningState.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should not mark events as committed if EventStore.append fails', async () => {
      // Setup: Mock EventStore.append to fail
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      vi.spyOn(eventStore, 'append').mockRejectedValue(new Error('Database connection lost'));

      // Execute & Verify: Error thrown
      await expect(repository.save(mockInningState)).rejects.toThrow();

      // Verify: Events not marked as committed on failure
      expect(mockInningState.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle complex runner state events in save operations', async () => {
      // Setup: Mock inning state with complex runner state events
      const complexEvents = [
        mockEvents[0]!, // InningStateCreated
        mockEvents[1]!, // AtBatCompleted
        mockEvents[2]!, // RunnerAdvanced to first
        {
          type: 'CurrentBatterChanged' as const,
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          previousSlot: 1,
          newSlot: 2,
          inning: 1,
          isTopHalf: true,
        } as DomainEvent,
      ];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(complexEvents);
      (mockInningState.getVersion as Mock).mockReturnValue(4);
      const eventStoreSpy = vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: All complex events handled correctly
      expect(eventStoreSpy).toHaveBeenCalledWith(
        inningStateId,
        'InningState',
        complexEvents,
        0 // Expected version: 4 - 4 events = 0
      );
    });
  });

  describe('Core Operations - findById()', () => {
    it('should reconstruct inning state from event stream', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
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
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);

      // Mock InningState.fromEvents static method
      const mockReconstructedInningState = mockInningState;
      const mockFromEvents = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValue(mockReconstructedInningState);

      // Execute
      const result = await repository.findById(inningStateId);

      // Verify: EventStore.getEvents called with correct inningStateId
      expect(eventStore.getEvents).toHaveBeenCalledOnce();
      expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId);

      // Verify: InningState.fromEvents called with parsed domain events
      expect(mockFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockFromEvents.mock.calls[0];
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

      // Verify: Correct inning state returned
      expect(result).toBe(mockReconstructedInningState);
    });

    it('should return null for non-existent inning states', async () => {
      // Setup: Mock EventStore.getEvents to return empty array (no events found)
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue([]);

      // Execute
      const result = await repository.findById(inningStateId);

      // Verify: EventStore.getEvents called
      expect(eventStore.getEvents).toHaveBeenCalledOnce();
      expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId);

      // Verify: null returned for non-existent inning state
      expect(result).toBeNull();
    });

    it('should handle empty event streams', async () => {
      // Setup: Mock EventStore.getEvents to return empty array
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue([]);

      // Execute
      const result = await repository.findById(inningStateId);

      // Verify: null returned for empty event stream
      expect(result).toBeNull();

      // Verify: InningState.fromEvents not called for empty event stream
      expect(vi.spyOn(InningState, 'fromEvents')).not.toHaveBeenCalled();
    });

    it('should reconstruct complex inning state with runners correctly', async () => {
      // Setup: Mock EventStore.getEvents to return complex event sequence with runner positions
      const complexEvents = [
        {
          type: 'InningStateCreated',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          inningStateId,
          inning: 3,
          isTopHalf: false,
        },
        {
          type: 'AtBatCompleted',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          batterId,
          battingSlot: 5,
          result: AtBatResultType.DOUBLE,
          inning: 3,
          outs: 1,
        },
        {
          type: 'RunnerAdvanced',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          runnerId: batterId,
          from: null,
          to: 'SECOND',
        },
      ] as DomainEvent[];

      const storedEvents = complexEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          createdAt: new Date(),
        },
      }));
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);

      // Mock InningState.fromEvents to return inning state with complex runner state
      const complexInningState = {
        ...mockInningState,
        inning: 3,
        isTopHalf: false,
        outs: 1,
        currentBattingSlot: 6,
        basesState: BasesState.empty().withRunnerOn('SECOND', batterId),
        version: 3,
      } as unknown as InningState;
      const mockFromEvents = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValue(complexInningState);

      // Execute
      const result = await repository.findById(inningStateId);

      // Verify: InningState.fromEvents called with all parsed domain events
      expect(mockFromEvents).toHaveBeenCalledOnce();
      const firstCall = mockFromEvents.mock.calls[0];
      expect(firstCall).toBeDefined();
      const actualCallArg = firstCall![0];
      expect(actualCallArg).toHaveLength(complexEvents.length);

      // Verify that each parsed event has the expected structure
      actualCallArg.forEach((parsedEvent: unknown, index: number) => {
        const originalEvent = complexEvents[index];
        const event = parsedEvent as DomainEvent;
        expect(event.type).toBe(originalEvent?.type);
        expect(event.eventId).toBe(originalEvent?.eventId);
      });

      // Verify: Complex inning state returned with proper runner positions
      expect(result).toBe(complexInningState);
    });

    it('should propagate EventStore errors during findById', async () => {
      // Setup: Mock EventStore.getEvents to throw error
      const eventStoreError = new Error('Database connection failed');
      vi.spyOn(eventStore, 'getEvents').mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findById(inningStateId)).rejects.toThrow(
        'Database connection failed'
      );

      // Verify: EventStore.getEvents was called before error
      expect(eventStore.getEvents).toHaveBeenCalledOnce();
    });

    it('should handle InningState.fromEvents reconstruction errors', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const corruptedEvents = [mockEvents[0]!];
      const storedEvents = corruptedEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
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
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);

      // Mock InningState.fromEvents to throw reconstruction error
      const reconstructionError = new Error(
        'Invalid event sequence for InningState reconstruction'
      );
      vi.spyOn(InningState, 'fromEvents').mockImplementation(() => {
        throw reconstructionError;
      });

      // Execute & Verify: Reconstruction error propagated
      await expect(repository.findById(inningStateId)).rejects.toThrow(
        'Invalid event sequence for InningState reconstruction'
      );
    });

    it('should handle malformed event data during reconstruction', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects with malformed eventData
      const malformedEvents = [
        {
          eventId: 'malformed-event-id',
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InvalidEventType',
          eventData: '{"invalid": "structure"}',
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date(),
          metadata: {
            source: 'test',
            createdAt: new Date(),
          },
        },
      ];
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(malformedEvents);

      // Mock InningState.fromEvents to throw on malformed events
      const mockFromEventsThrow = vi.spyOn(InningState, 'fromEvents').mockImplementation(() => {
        throw new Error('Cannot reconstruct inning state from malformed events');
      });

      try {
        // Execute & Verify: Malformed event error propagated
        await expect(repository.findById(inningStateId)).rejects.toThrow(
          'Cannot reconstruct inning state from malformed events'
        );
      } finally {
        mockFromEventsThrow.mockRestore();
      }
    });
  });

  describe('Query Operations - findCurrentByGameId()', () => {
    it('should return most recent inning state for game', async () => {
      // Setup: Create events for multiple inning states in the same game
      const inningState1Id = InningStateId.generate();
      const inningState2Id = InningStateId.generate();

      // First inning state (earlier)
      const inning1Events = [
        {
          type: 'InningStateCreated',
          eventId: crypto.randomUUID(),
          gameId,
          inningStateId: inningState1Id,
          inning: 1,
          isTopHalf: true,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          version: 1,
        },
      ] as DomainEvent[];

      // Second inning state (more recent)
      const inning2Events = [
        {
          type: 'InningStateCreated',
          eventId: crypto.randomUUID(),
          gameId,
          inningStateId: inningState2Id,
          inning: 2,
          isTopHalf: true,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          version: 1,
        },
      ] as DomainEvent[];

      const allEvents = [
        ...inning1Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningState1Id.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
        ...inning2Events.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningState2Id.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        })),
      ];

      vi.spyOn(eventStore, 'getAllEvents').mockResolvedValue(allEvents);

      // Mock InningState.fromEvents to return different inning states
      const mockInning1State = {
        ...mockInningState,
        id: inningState1Id,
        inning: 1,
        isTopHalf: true,
      } as unknown as InningState;
      const mockInning2State = {
        ...mockInningState,
        id: inningState2Id,
        inning: 2,
        isTopHalf: true,
      } as unknown as InningState;

      const mockFromEvents = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValueOnce(mockInning1State)
        .mockReturnValueOnce(mockInning2State);

      // Execute
      const result = await repository.findCurrentByGameId(gameId);

      // Verify: EventStore.getAllEvents called
      expect(eventStore.getAllEvents).toHaveBeenCalledOnce();

      // Verify: Most recent inning state returned (inning 2)
      expect(result).toBe(mockInning2State);
      expect(result?.inning).toBe(2);

      // Verify: InningState.fromEvents called for both inning states during reconstruction
      expect(mockFromEvents).toHaveBeenCalledTimes(2);
    });

    it('should return null when no inning states found for game', async () => {
      // Setup: Mock getAllEvents to return empty array (no events found)
      vi.spyOn(eventStore, 'getAllEvents').mockResolvedValue([]);

      // Execute
      const result = await repository.findCurrentByGameId(gameId);

      // Verify: EventStore.getAllEvents called
      expect(eventStore.getAllEvents).toHaveBeenCalledOnce();

      // Verify: null returned for non-existent game
      expect(result).toBeNull();
    });

    it('should handle multiple innings for same game and return latest chronologically', async () => {
      // Setup: Create events for multiple inning states with different inning numbers
      const inning1StateId = InningStateId.generate();
      const inning3StateId = InningStateId.generate();
      const inning2StateId = InningStateId.generate();

      const allEvents = [
        // Inning 1 (oldest)
        {
          eventId: crypto.randomUUID(),
          streamId: inning1StateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InningStateCreated',
          eventData: JSON.stringify({
            type: 'InningStateCreated',
            gameId,
            inningStateId: inning1StateId,
            inning: 1,
            isTopHalf: true,
          }),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          metadata: { source: 'test', createdAt: new Date('2024-01-01T10:00:00Z') },
        },
        // Inning 3 (newest by inning number)
        {
          eventId: crypto.randomUUID(),
          streamId: inning3StateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InningStateCreated',
          eventData: JSON.stringify({
            type: 'InningStateCreated',
            gameId,
            inningStateId: inning3StateId,
            inning: 3,
            isTopHalf: false,
          }),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date('2024-01-01T10:30:00Z'),
          metadata: { source: 'test', createdAt: new Date('2024-01-01T10:30:00Z') },
        },
        // Inning 2 (middle - created after inning 3 but lower inning number)
        {
          eventId: crypto.randomUUID(),
          streamId: inning2StateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InningStateCreated',
          eventData: JSON.stringify({
            type: 'InningStateCreated',
            gameId,
            inningStateId: inning2StateId,
            inning: 2,
            isTopHalf: true,
          }),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          metadata: { source: 'test', createdAt: new Date('2024-01-01T11:00:00Z') },
        },
      ];

      vi.spyOn(eventStore, 'getAllEvents').mockResolvedValue(allEvents);

      // Mock InningState.fromEvents to return different inning states
      const mockInning1State = {
        ...mockInningState,
        id: inning1StateId,
        inning: 1,
      } as unknown as InningState;
      const mockInning3State = {
        ...mockInningState,
        id: inning3StateId,
        inning: 3,
      } as unknown as InningState;
      const mockInning2State = {
        ...mockInningState,
        id: inning2StateId,
        inning: 2,
      } as unknown as InningState;

      vi.spyOn(InningState, 'fromEvents')
        .mockReturnValueOnce(mockInning1State)
        .mockReturnValueOnce(mockInning3State)
        .mockReturnValueOnce(mockInning2State);

      // Execute
      const result = await repository.findCurrentByGameId(gameId);

      // Verify: Latest inning state returned (inning 2, last one chronologically)
      expect(result).toBe(mockInning2State);
      expect(result?.inning).toBe(2);
    });

    it('should filter events by gameId correctly', async () => {
      // Setup: Create events for multiple games
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const inning1StateId = InningStateId.generate();
      const inning2StateId = InningStateId.generate();

      const allEvents = [
        // Game 1 events
        {
          eventId: crypto.randomUUID(),
          streamId: inning1StateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InningStateCreated',
          eventData: JSON.stringify({
            type: 'InningStateCreated',
            gameId: gameId1,
            inningStateId: inning1StateId,
            inning: 1,
            isTopHalf: true,
          }),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date(),
          metadata: { source: 'test', createdAt: new Date() },
        },
        // Game 2 events (should be filtered out)
        {
          eventId: crypto.randomUUID(),
          streamId: inning2StateId.value,
          aggregateType: 'InningState' as const,
          eventType: 'InningStateCreated',
          eventData: JSON.stringify({
            type: 'InningStateCreated',
            gameId: gameId2,
            inningStateId: inning2StateId,
            inning: 1,
            isTopHalf: true,
          }),
          eventVersion: 1,
          streamVersion: 1,
          timestamp: new Date(),
          metadata: { source: 'test', createdAt: new Date() },
        },
      ];

      vi.spyOn(eventStore, 'getAllEvents').mockResolvedValue(allEvents);

      const mockGame1InningState = {
        ...mockInningState,
        id: inning1StateId,
        gameId: gameId1,
      } as unknown as InningState;

      vi.spyOn(InningState, 'fromEvents').mockReturnValue(mockGame1InningState);

      // Execute: Search for gameId1
      const result = await repository.findCurrentByGameId(gameId1);

      // Verify: Only game1 inning state returned, game2 filtered out
      expect(result).toBe(mockGame1InningState);
      expect(result?.gameId).toBe(gameId1);
    });

    it('should handle complex multi-inning scenarios with half-inning transitions', async () => {
      // Setup: Create realistic game progression with multiple half-innings
      const inningStateIds = [
        InningStateId.generate(), // 1st inning top
        InningStateId.generate(), // 1st inning bottom
        InningStateId.generate(), // 2nd inning top
        InningStateId.generate(), // 2nd inning bottom
      ];

      const allEvents = inningStateIds.map((id, index) => ({
        eventId: crypto.randomUUID(),
        streamId: id.value,
        aggregateType: 'InningState' as const,
        eventType: 'InningStateCreated',
        eventData: JSON.stringify({
          type: 'InningStateCreated',
          gameId,
          inningStateId: id,
          inning: Math.floor(index / 2) + 1, // 1, 1, 2, 2
          isTopHalf: index % 2 === 0, // true, false, true, false
        }),
        eventVersion: 1,
        streamVersion: 1,
        timestamp: new Date(Date.now() + index * 1000),
        metadata: { source: 'test', createdAt: new Date(Date.now() + index * 1000) },
      }));

      vi.spyOn(eventStore, 'getAllEvents').mockResolvedValue(allEvents);

      // Mock InningState.fromEvents for each state
      const mockStates = inningStateIds.map(
        (id, index) =>
          ({
            ...mockInningState,
            id,
            inning: Math.floor(index / 2) + 1,
            isTopHalf: index % 2 === 0,
          }) as unknown as InningState
      );

      let callIndex = 0;
      vi.spyOn(InningState, 'fromEvents').mockImplementation(() => {
        return mockStates[callIndex++] || mockStates[0]!;
      });

      // Execute
      const result = await repository.findCurrentByGameId(gameId);

      // Verify: Latest inning state returned (2nd inning bottom)
      expect(result).toBe(mockStates[3]);
      expect(result?.inning).toBe(2);
      expect(result?.isTopHalf).toBe(false);
    });

    it('should propagate EventStore errors during query', async () => {
      // Setup: Mock EventStore.getAllEvents to throw error
      const eventStoreError = new Error('EventStore connection failed');
      vi.spyOn(eventStore, 'getAllEvents').mockRejectedValue(eventStoreError);

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.findCurrentByGameId(gameId)).rejects.toThrow(
        'EventStore connection failed'
      );
    });
  });

  describe('Query Operations - delete()', () => {
    it('should delete inning state by removing all events from stream', async () => {
      // Setup: Add delete method to eventStore for testing
      const deleteMethod = vi.fn().mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventStore as any).delete = deleteMethod;

      // Execute
      await repository.delete(inningStateId);

      // Verify: EventStore.delete called with correct inningStateId
      expect(deleteMethod).toHaveBeenCalledOnce();
      expect(deleteMethod).toHaveBeenCalledWith(inningStateId);
    });

    it('should handle non-existent inning state gracefully', async () => {
      // Setup: Add delete method to eventStore for testing
      const deleteMethod = vi.fn().mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventStore as any).delete = deleteMethod;

      // Execute
      await repository.delete(inningStateId);

      // Verify: EventStore.delete called (should not throw for non-existent)
      expect(deleteMethod).toHaveBeenCalledOnce();
    });

    it('should propagate EventStore errors during deletion', async () => {
      // Setup: Add delete method that throws error
      const eventStoreError = new Error('EventStore deletion failed');
      const deleteMethod = vi.fn().mockRejectedValue(eventStoreError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventStore as any).delete = deleteMethod;

      // Execute & Verify: Error propagated from EventStore
      await expect(repository.delete(inningStateId)).rejects.toThrow('EventStore deletion failed');
    });

    it('should validate inningStateId parameter', async () => {
      // Setup: Test with null inningStateId
      const nullInningStateId = null as unknown as InningStateId;

      // Execute & Verify: Should handle null inningStateId validation
      await expect(repository.delete(nullInningStateId)).rejects.toThrow(
        'InningStateId cannot be null or undefined'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null inningStateId in save operation', async () => {
      // Setup: Create inning state with null id
      const invalidInningState = {
        ...mockInningState,
        id: null as unknown as InningStateId,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as InningState;

      (invalidInningState.getUncommittedEvents as Mock).mockReturnValue([]);
      (invalidInningState.getVersion as Mock).mockReturnValue(0);
      // EventStore should reject null inningStateId
      vi.spyOn(eventStore, 'append').mockRejectedValue(new Error('Invalid inningStateId'));

      // Execute & Verify: Repository should handle null inningStateId gracefully
      await expect(repository.save(invalidInningState)).rejects.toThrow();
    });

    it('should handle null inningStateId in findById operation', async () => {
      const nullInningStateId = null as unknown as InningStateId;

      // Execute & Verify: Repository should handle null inningStateId gracefully
      await expect(repository.findById(nullInningStateId)).rejects.toThrow();
    });

    it('should handle malformed events during reconstruction', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects with malformed eventData
      const malformedEvents = [
        { type: 'InvalidEventType', gameId: gameId } as unknown as DomainEvent,
      ];
      const storedEvents = malformedEvents.map((event, index) => ({
        eventId: 'malformed-event-id',
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
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
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);

      // Mock InningState.fromEvents to throw on malformed events
      const mockFromEventsThrow = vi.spyOn(InningState, 'fromEvents').mockImplementation(() => {
        throw new Error('Cannot reconstruct inning state from malformed events');
      });

      try {
        // Execute & Verify: Malformed event error propagated
        await expect(repository.findById(inningStateId)).rejects.toThrow(
          'Cannot reconstruct inning state from malformed events'
        );
      } finally {
        mockFromEventsThrow.mockRestore();
      }
    });

    it('should handle version mismatch scenarios', async () => {
      // Setup: Mock inning state with mismatched version
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockInningState.getVersion as Mock).mockReturnValue(1);

      // Mock EventStore.append to reject with version mismatch
      const versionError = new Error('Version mismatch: expected 1, found 3');
      vi.spyOn(eventStore, 'append').mockRejectedValue(versionError);

      // Execute & Verify: Version error propagated
      await expect(repository.save(mockInningState)).rejects.toThrow('Version mismatch');
      expect(mockInningState.markEventsAsCommitted).not.toHaveBeenCalled();
    });

    it('should handle EventStore timeout errors', async () => {
      // Setup: Mock EventStore.getEvents to timeout
      const timeoutError = new Error('EventStore operation timed out');
      vi.spyOn(eventStore, 'getEvents').mockRejectedValue(timeoutError);

      // Execute & Verify: Timeout error propagated
      await expect(repository.findById(inningStateId)).rejects.toThrow(
        'EventStore operation timed out'
      );
    });

    it('should handle large event streams efficiently', async () => {
      // Setup: Mock EventStore.getEvents to return large StoredEvent stream
      const largeDomainEventStream = Array.from({ length: 1000 }, () => mockEvents[0]!);
      const largeStoredEventStream = largeDomainEventStream.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
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
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(largeStoredEventStream);

      const mockReconstructedInningState = {
        ...mockInningState,
        version: 1000,
        getVersion: vi.fn().mockReturnValue(1000),
        getUncommittedEvents: vi.fn().mockReturnValue([]),
        markEventsAsCommitted: vi.fn(),
      } as unknown as InningState;
      const mockFromEventsLarge = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValue(mockReconstructedInningState);

      try {
        // Execute
        const result = await repository.findById(inningStateId);

        // Verify: Large event stream handled correctly
        expect(result).toBe(mockReconstructedInningState);
        expect(eventStore.getEvents).toHaveBeenCalledOnce();
      } finally {
        mockFromEventsLarge.mockRestore();
      }
    });

    it('should handle concurrent save operations', async () => {
      // Setup: Create separate mock inning states with independent mock functions
      const inningState1 = {
        ...mockInningState,
        id: InningStateId.generate(),
        version: 1,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as InningState;

      const inningState2 = {
        ...mockInningState,
        id: InningStateId.generate(),
        version: 2,
        getUncommittedEvents: vi.fn(),
        markEventsAsCommitted: vi.fn(),
        getVersion: vi.fn(),
      } as unknown as InningState;

      (inningState1.getUncommittedEvents as Mock).mockReturnValue([mockEvents[0]!]);
      (inningState1.getVersion as Mock).mockReturnValue(1);
      (inningState2.getUncommittedEvents as Mock).mockReturnValue([mockEvents[1]!]);
      (inningState2.getVersion as Mock).mockReturnValue(1);
      vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute concurrent saves
      const save1Promise = repository.save(inningState1);
      const save2Promise = repository.save(inningState2);

      await Promise.all([save1Promise, save2Promise]);

      // Verify: Both saves completed
      expect(eventStore.append).toHaveBeenCalledTimes(2);
      expect(inningState1.markEventsAsCommitted).toHaveBeenCalledOnce();
      expect(inningState2.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should handle complex runner state reconstruction from events', async () => {
      // Setup: Create events representing complex runner movements
      const runnerId1 = PlayerId.generate();
      const runnerId2 = PlayerId.generate();

      const complexRunnerEvents = [
        {
          type: 'InningStateCreated',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          inningStateId,
          inning: 1,
          isTopHalf: true,
        },
        {
          type: 'RunnerAdvanced',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          runnerId: runnerId1,
          from: null,
          to: 'FIRST',
        },
        {
          type: 'RunnerAdvanced',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          runnerId: runnerId2,
          from: null,
          to: 'SECOND',
        },
        {
          type: 'RunnerAdvanced',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          runnerId: runnerId1,
          from: 'FIRST',
          to: 'THIRD',
        },
      ] as DomainEvent[];

      const storedEvents = complexRunnerEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
        eventType: event.type,
        eventData: JSON.stringify(event),
        eventVersion: 1,
        streamVersion: index + 1,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          createdAt: new Date(),
        },
      }));
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);

      // Mock InningState.fromEvents to return state with complex runner positions
      const complexRunnerState = {
        ...mockInningState,
        basesState: BasesState.empty()
          .withRunnerOn('SECOND', runnerId2)
          .withRunnerOn('THIRD', runnerId1),
        version: 4,
      } as unknown as InningState;
      const mockFromEvents = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValue(complexRunnerState);

      // Execute
      const result = await repository.findById(inningStateId);

      // Verify: Complex runner state reconstructed correctly
      expect(result).toBe(complexRunnerState);
      expect(mockFromEvents).toHaveBeenCalledOnce();

      // Verify all events were passed to reconstruction
      const firstCall = mockFromEvents.mock.calls[0];
      expect(firstCall![0]).toHaveLength(complexRunnerEvents.length);
    });
  });

  describe('Repository Pattern Compliance', () => {
    it('should act as thin wrapper with no business logic', async () => {
      // Setup: Mock successful operations
      const uncommittedEvents = [mockEvents[0]!];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
      (mockInningState.getVersion as Mock).mockReturnValue(1); // 1 event, so version is 1
      vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute save
      await repository.save(mockInningState);

      // Verify: Repository delegates to EventStore without modification
      expect(eventStore.append).toHaveBeenCalledWith(
        inningStateId,
        'InningState',
        uncommittedEvents,
        0 // Expected version: 1 - 1 event = 0
      );

      // Repository should not perform any business logic validation
      expect(mockInningState.getUncommittedEvents).toHaveBeenCalledOnce();
      expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();
    });

    it('should preserve all domain events during save', async () => {
      // Setup: Mock inning state with multiple different event types
      const allInningEventTypes = [
        {
          type: 'InningStateCreated',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          inningStateId,
        },
        {
          type: 'AtBatCompleted',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          batterId,
          battingSlot: 1,
          result: AtBatResultType.SINGLE,
        },
        {
          type: 'RunnerAdvanced',
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          runnerId: batterId,
          from: null,
          to: 'FIRST',
        },
      ] as DomainEvent[];
      (mockInningState.getUncommittedEvents as Mock).mockReturnValue(allInningEventTypes);
      (mockInningState.getVersion as Mock).mockReturnValue(3); // 3 events, so version is 3
      vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

      // Execute
      await repository.save(mockInningState);

      // Verify: All events passed to EventStore without filtering
      expect(eventStore.append).toHaveBeenCalledWith(
        inningStateId,
        'InningState',
        allInningEventTypes,
        0 // Expected version: 3 - 3 events = 0
      );
    });

    it('should not cache or modify retrieved inning states', async () => {
      // Setup: Mock EventStore.getEvents to return StoredEvent objects
      const storedEvents = mockEvents.map((event, index) => ({
        eventId: event.eventId,
        streamId: inningStateId.value,
        aggregateType: 'InningState' as const,
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
      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedEvents);
      const mockFromEventsCache = vi
        .spyOn(InningState, 'fromEvents')
        .mockReturnValue(mockInningState);

      try {
        // Execute multiple findById calls
        const result1 = await repository.findById(inningStateId);
        const result2 = await repository.findById(inningStateId);

        // Verify: EventStore called each time (no caching)
        expect(eventStore.getEvents).toHaveBeenCalledTimes(2);
        expect(result1).toBe(mockInningState);
        expect(result2).toBe(mockInningState);
      } finally {
        mockFromEventsCache.mockRestore();
      }
    });
  });

  /*
  describe('Snapshot Integration', () => {
    describe('Constructor Backward Compatibility', () => {
      it('should work without SnapshotStore for backward compatibility', () => {
        const repositoryWithoutSnapshots = new EventSourcedInningStateRepository(eventStore);
        expect(repositoryWithoutSnapshots).toBeDefined();
        expect(repositoryWithoutSnapshots).toBeInstanceOf(EventSourcedInningStateRepository);
      });

      it('should work with SnapshotStore for enhanced performance', () => {
        const repositoryWithSnapshots = new EventSourcedInningStateRepository(
          eventStore,
          mockSnapshotStore
        );
        expect(repositoryWithSnapshots).toBeDefined();
        expect(repositoryWithSnapshots).toBeInstanceOf(EventSourcedInningStateRepository);
      });
    });

    describe('Snapshot-Optimized save()', () => {
      it('should create snapshot when frequency threshold is reached', async () => {
        // Setup: Mock inning state with version that reaches snapshot frequency (10)
        const uncommittedEvents = [mockEvents[0]!];
        (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockInningState.getVersion as Mock).mockReturnValue(10); // Meets frequency threshold
        vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);
        (mockSnapshotStore.getSnapshotFrequency as Mock).mockReturnValue(10);

        // Execute
        await repositoryWithSnapshots.save(mockInningState);

        // Verify: Events saved first
        expect(eventStore.append).toHaveBeenCalledOnce();
        expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();

        // Verify: Snapshot creation triggered
        expect(mockSnapshotStore.save).toHaveBeenCalledOnce();
        const snapshotCall = (mockSnapshotStore.save as Mock).mock.calls[0];
        expect(snapshotCall[0]).toEqual(inningStateId);
        expect(snapshotCall[1]).toBe('InningState');
        expect(snapshotCall[2]).toBe(10); // version
        expect(snapshotCall[3]).toBeDefined(); // snapshot data
      });

      it('should not create snapshot when frequency threshold not reached', async () => {
        // Setup: Mock inning state with version below snapshot frequency
        const uncommittedEvents = [mockEvents[0]!];
        (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockInningState.getVersion as Mock).mockReturnValue(5); // Below threshold
        vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);
        (mockSnapshotStore.getSnapshotFrequency as Mock).mockReturnValue(10);

        // Execute
        await repositoryWithSnapshots.save(mockInningState);

        // Verify: Events saved
        expect(eventStore.append).toHaveBeenCalledOnce();
        expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();

        // Verify: No snapshot created
        expect(mockSnapshotStore.save).not.toHaveBeenCalled();
      });

      it('should not fail if snapshot creation fails', async () => {
        // Setup: Mock inning state that triggers snapshot but snapshot fails
        const uncommittedEvents = [mockEvents[0]!];
        (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockInningState.getVersion as Mock).mockReturnValue(10);
        vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);
        (mockSnapshotStore.getSnapshotFrequency as Mock).mockReturnValue(10);
        (mockSnapshotStore.save as Mock).mockRejectedValue(new Error('Snapshot save failed'));

        // Execute - should not throw
        await expect(repositoryWithSnapshots.save(mockInningState)).resolves.toBeUndefined();

        // Verify: Events still saved and committed
        expect(eventStore.append).toHaveBeenCalledOnce();
        expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();
      });

      it('should save without snapshots when no SnapshotStore provided', async () => {
        // Setup: Use repository without snapshots
        const uncommittedEvents = [mockEvents[0]!];
        (mockInningState.getUncommittedEvents as Mock).mockReturnValue(uncommittedEvents);
        (mockInningState.getVersion as Mock).mockReturnValue(10);
        vi.spyOn(eventStore, 'append').mockResolvedValue(undefined);

        // Execute
        await repository.save(mockInningState);

        // Verify: Events saved without snapshot creation
        expect(eventStore.append).toHaveBeenCalledOnce();
        expect(mockInningState.markEventsAsCommitted).toHaveBeenCalledOnce();
        expect(mockSnapshotStore.save).not.toHaveBeenCalled();
      });
    });

    describe('Snapshot-Optimized findById()', () => {
      it('should load from snapshot + subsequent events when available', async () => {
        // Setup: Mock snapshot and subsequent events
        const snapshotData = {
          id: inningStateId.value,
          gameId: gameId.value,
          inning: 1,
          isTopHalf: true,
          outs: 1,
          currentBattingSlot: 3,
          basesState: {
            first: batterId.value,
            second: null,
            third: null,
          },
          version: 5,
        };
        const subsequentEvent = {
          type: 'AtBatCompleted' as const,
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          version: 1,
          gameId,
          batterId,
          battingSlot: 3,
          result: AtBatResultType.SINGLE,
          inning: 1,
          outs: 1,
        } as DomainEvent;
        const storedSubsequentEvents = [
          {
            eventId: subsequentEvent.eventId,
            streamId: inningStateId.value,
            aggregateType: 'InningState' as const,
            eventType: subsequentEvent.type,
            eventData: JSON.stringify(subsequentEvent),
            eventVersion: 1,
            streamVersion: 6,
            timestamp: subsequentEvent.timestamp,
            metadata: { source: 'test', createdAt: subsequentEvent.timestamp },
          },
        ];

        (mockSnapshotStore.findLatest as Mock).mockResolvedValue({
          aggregateId: inningStateId,
          aggregateType: 'InningState',
          version: 5,
          data: snapshotData,
          timestamp: new Date(),
        });
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedSubsequentEvents);

        // Mock InningState reconstruction
        const mockReconstructedInningState = mockInningState;
        const mockFromEvents = vi
          .spyOn(InningState, 'fromEvents')
          .mockReturnValue(mockReconstructedInningState);

        // Execute
        const result = await repositoryWithSnapshots.findById(inningStateId);

        // Verify: Snapshot loaded
        expect(mockSnapshotStore.findLatest).toHaveBeenCalledWith(inningStateId);

        // Verify: Subsequent events loaded after snapshot version
        expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId, 5);

        // Verify: InningState reconstructed from subsequent events
        expect(mockFromEvents).toHaveBeenCalledOnce();

        // Verify: Correct result returned
        expect(result).toBe(mockReconstructedInningState);
      });

      it('should fallback to event-only loading when no snapshot exists', async () => {
        // Setup: No snapshot available
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(allEvents);

        const mockReconstructedInningState = mockInningState;
        const mockFromEvents = vi
          .spyOn(InningState, 'fromEvents')
          .mockReturnValue(mockReconstructedInningState);

        // Execute
        const result = await repositoryWithSnapshots.findById(inningStateId);

        // Verify: Snapshot checked
        expect(mockSnapshotStore.findLatest).toHaveBeenCalledWith(inningStateId);

        // Verify: All events loaded (traditional approach)
        expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId);

        // Verify: InningState reconstructed from all events
        expect(mockFromEvents).toHaveBeenCalledOnce();
        expect(result).toBe(mockReconstructedInningState);
      });

      it('should gracefully fallback to event-only loading on snapshot errors', async () => {
        // Setup: Snapshot loading fails
        (mockSnapshotStore.findLatest as Mock).mockRejectedValue(new Error('Snapshot load failed'));
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(allEvents);

        const mockReconstructedInningState = mockInningState;
        const mockFromEvents = vi
          .spyOn(InningState, 'fromEvents')
          .mockReturnValue(mockReconstructedInningState);

        // Execute - should not throw
        const result = await repositoryWithSnapshots.findById(inningStateId);

        // Verify: Fallback to event-only loading
        expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId);
        expect(mockFromEvents).toHaveBeenCalledOnce();
        expect(result).toBe(mockReconstructedInningState);
      });

      it('should return null when no snapshot and no events exist', async () => {
        // Setup: No snapshot and no events
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue([]);

        // Execute
        const result = await repositoryWithSnapshots.findById(inningStateId);

        // Verify: null returned
        expect(result).toBeNull();

        // Verify: No reconstruction attempted
        expect(vi.spyOn(InningState, 'fromEvents')).not.toHaveBeenCalled();
      });

      it('should work traditionally when no SnapshotStore provided', async () => {
        // Setup: Use repository without snapshots
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(allEvents);

        const mockReconstructedInningState = mockInningState;
        const mockFromEvents = vi
          .spyOn(InningState, 'fromEvents')
          .mockReturnValue(mockReconstructedInningState);

        // Execute
        const result = await repository.findById(inningStateId);

        // Verify: Only event store used (no snapshot calls)
        expect(mockSnapshotStore.findLatest).not.toHaveBeenCalled();
        expect(eventStore.getEvents).toHaveBeenCalledWith(inningStateId);
        expect(result).toBe(mockReconstructedInningState);
      });
    });

    describe('Complex Inning State Snapshots', () => {
      it('should handle snapshots with complex runner state', async () => {
        // Setup: Complex inning state with multiple runners
        const runner1 = PlayerId.generate();
        const runner2 = PlayerId.generate();
        const runner3 = PlayerId.generate();

        const complexSnapshotData = {
          id: inningStateId.value,
          gameId: gameId.value,
          inning: 7,
          isTopHalf: false,
          outs: 2,
          currentBattingSlot: 9,
          basesState: {
            first: runner1.value,
            second: runner2.value,
            third: runner3.value,
          },
          version: 25,
        };

        (mockSnapshotStore.findLatest as Mock).mockResolvedValue({
          aggregateId: inningStateId,
          aggregateType: 'InningState',
          version: 25,
          data: complexSnapshotData,
          timestamp: new Date(),
        });
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue([]); // No subsequent events

        // Mock InningState with complex state
        const complexInningState = {
          ...mockInningState,
          inning: 7,
          isTopHalf: false,
          outs: 2,
          currentBattingSlot: 9,
          basesState: BasesState.empty()
            .withRunnerOn('FIRST', runner1)
            .withRunnerOn('SECOND', runner2)
            .withRunnerOn('THIRD', runner3),
        } as unknown as InningState;

        const mockFromEvents = vi
          .spyOn(InningState, 'fromEvents')
          .mockReturnValue(complexInningState);

        // Execute
        const result = await repositoryWithSnapshots.findById(inningStateId);

        // Verify: Complex state loaded properly
        expect(result).toBe(complexInningState);
        expect(mockSnapshotStore.findLatest).toHaveBeenCalledWith(inningStateId);
      });

      it('should achieve faster loading with snapshots for large inning histories', async () => {
        // Setup: Large inning state with snapshot at version 50
        const snapshotData = {
          id: inningStateId.value,
          gameId: gameId.value,
          inning: 9,
          isTopHalf: true,
          outs: 1,
          currentBattingSlot: 5,
          basesState: {
            first: batterId.value,
            second: null,
            third: null,
          },
          version: 50,
        };
        const fewSubsequentEvents = [
          {
            type: 'AtBatCompleted' as const,
            eventId: crypto.randomUUID(),
            timestamp: new Date(),
            version: 1,
            gameId,
            batterId,
            battingSlot: 5,
            result: AtBatResultType.DOUBLE,
            inning: 9,
            outs: 1,
          } as DomainEvent,
        ];
        const storedSubsequentEvents = fewSubsequentEvents.map(event => ({
          eventId: event.eventId,
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: 51,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));

        (mockSnapshotStore.findLatest as Mock).mockResolvedValue({
          aggregateId: inningStateId,
          aggregateType: 'InningState',
          version: 50,
          data: snapshotData,
          timestamp: new Date(),
        });
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(storedSubsequentEvents);

        const mockFromEvents = vi.spyOn(InningState, 'fromEvents').mockReturnValue(mockInningState);

        // Execute
        const startTime = Date.now();
        const result = await repositoryWithSnapshots.findById(inningStateId);
        const endTime = Date.now();

        // Verify: Only 1 event processed instead of 51
        expect(mockFromEvents).toHaveBeenCalledOnce();
        const eventsProcessed = mockFromEvents.mock.calls[0]![0] as DomainEvent[];
        expect(eventsProcessed).toHaveLength(1); // Only subsequent events, not all 51

        // Verify: Result is correct
        expect(result).toBe(mockInningState);

        // Performance is inherently better by processing fewer events
        expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      });

      it('should maintain consistent interface regardless of snapshot availability', async () => {
        // Setup: Test both repositories
        const allEvents = mockEvents.map((event, index) => ({
          eventId: event.eventId,
          streamId: inningStateId.value,
          aggregateType: 'InningState' as const,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: event.timestamp },
        }));

        // Mock both paths
        (mockSnapshotStore.findLatest as Mock).mockResolvedValue(null);
        vi.spyOn(eventStore, 'getEvents').mockResolvedValue(allEvents);
        const mockFromEvents = vi.spyOn(InningState, 'fromEvents').mockReturnValue(mockInningState);

        // Execute both
        const resultWithSnapshots = await repositoryWithSnapshots.findById(inningStateId);
        const resultWithoutSnapshots = await repository.findById(inningStateId);

        // Verify: Same interface and results
        expect(resultWithSnapshots).toBe(mockInningState);
        expect(resultWithoutSnapshots).toBe(mockInningState);
        expect(typeof resultWithSnapshots?.id).toBe(typeof resultWithoutSnapshots?.id);
      });
    });
  });
  */
});
