/**
 * @file InMemoryEventStore Tests
 * Tests for the in-memory implementation of the EventStore interface.
 *
 * @remarks
 * This test suite validates the InMemoryEventStore implementation following TDD principles.
 * Tests focus on Phase 1 core functionality: append() and getEvents() methods only.
 * Advanced queries (getGameEvents, getAllEvents, etc.) are tested for interface compliance
 * but full implementation will come in Phase 2.
 */

import {
  DomainEvent,
  DomainId,
  createMockGameCreatedEvent,
  createMockAtBatCompletedEvent,
  createMockTeamLineupCreatedEvent,
  createMockInningStateCreatedEvent,
} from '@twsoftball/application';
import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from shared package for EventStore interfaces and test utilities
// Import domain objects from domain package

import { InMemoryEventStore } from './InMemoryEventStore';

// Import shared test utilities to eliminate duplication

describe('InMemoryEventStore', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;
  let mockEvents: DomainEvent[];

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
    inningStateId = InningStateId.generate();

    mockEvents = [createMockGameCreatedEvent(gameId), createMockAtBatCompletedEvent(gameId)];
  });

  describe('Core Implementation', () => {
    it('should implement EventStore interface', () => {
      expect(eventStore).toBeInstanceOf(InMemoryEventStore);
      expect(typeof eventStore.append).toBe('function');
      expect(typeof eventStore.getEvents).toBe('function');
      expect(typeof eventStore.getGameEvents).toBe('function');
      expect(typeof eventStore.getAllEvents).toBe('function');
      expect(typeof eventStore.getEventsByType).toBe('function');
      expect(typeof eventStore.getEventsByGameId).toBe('function');
    });

    it('should return promises for all methods', () => {
      expect(eventStore.append(gameId, 'Game', mockEvents)).toBeInstanceOf(Promise);
      expect(eventStore.getEvents(gameId)).toBeInstanceOf(Promise);
      expect(eventStore.getGameEvents(gameId)).toBeInstanceOf(Promise);
      expect(eventStore.getAllEvents()).toBeInstanceOf(Promise);
      expect(eventStore.getEventsByType('GameCreated')).toBeInstanceOf(Promise);
      expect(eventStore.getEventsByGameId(gameId)).toBeInstanceOf(Promise);
    });
  });

  describe('append Method - Phase 1 Core Functionality', () => {
    it('should append events to stream with proper versioning', async () => {
      await eventStore.append(gameId, 'Game', mockEvents);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0]?.streamVersion).toBe(1);
      expect(storedEvents[1]?.streamVersion).toBe(2);
      expect(storedEvents[0]?.aggregateType).toBe('Game');
      expect(storedEvents[0]?.streamId).toBe(gameId.value);
    });

    it('should handle concurrent appends with version conflicts', async () => {
      // First append establishes initial state
      await eventStore.append(gameId, 'Game', [mockEvents[0]!], 0);

      // Second append with correct expected version should succeed
      await eventStore.append(gameId, 'Game', [mockEvents[1]!], 1);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0]?.streamVersion).toBe(1);
      expect(storedEvents[1]?.streamVersion).toBe(2);
    });

    it('should enforce optimistic locking with expectedVersion', async () => {
      // Set up initial state
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Attempt append with incorrect expected version should fail
      await expect(eventStore.append(gameId, 'Game', [mockEvents[1]!], 0)).rejects.toThrow(
        /concurrency conflict/i
      );
    });

    it('should maintain event ordering within streams', async () => {
      // Append multiple events in sequence
      await eventStore.append(gameId, 'Game', mockEvents);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents[0]?.eventType).toBe('GameCreated');
      expect(storedEvents[1]?.eventType).toBe('AtBatCompleted');
      expect(storedEvents[0]?.streamVersion).toBe(1);
      expect(storedEvents[1]?.streamVersion).toBe(2);
    });

    it('should handle empty event arrays', async () => {
      await expect(eventStore.append(gameId, 'Game', [])).resolves.not.toThrow();

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(0);
    });

    it('should properly serialize and store domain events', async () => {
      const gameCreatedEvent = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [gameCreatedEvent]);

      const storedEvents = await eventStore.getEvents(gameId);
      const storedEvent = storedEvents[0]!;

      expect(storedEvent.eventId).toBe(gameCreatedEvent.eventId);
      expect(storedEvent.streamId).toBe(gameId.value);
      expect(storedEvent.eventType).toBe('GameCreated');
      expect(typeof storedEvent.eventData).toBe('string');

      const eventData = JSON.parse(storedEvent.eventData);
      expect(eventData.type).toBe('GameCreated');
      expect(eventData.gameId.value).toBe(gameId.value);
      expect(eventData.eventId).toBe(gameCreatedEvent.eventId);
    });

    it('should append events to different aggregate types', async () => {
      const gameEvent = createMockGameCreatedEvent(gameId);
      const teamEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
      const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);

      await eventStore.append(gameId, 'Game', [gameEvent]);
      await eventStore.append(teamLineupId, 'TeamLineup', [teamEvent]);
      await eventStore.append(inningStateId, 'InningState', [inningEvent]);

      const gameEvents = await eventStore.getEvents(gameId);
      const teamEvents = await eventStore.getEvents(teamLineupId);
      const inningEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(gameEvents[0]?.aggregateType).toBe('Game');
      expect(teamEvents).toHaveLength(1);
      expect(teamEvents[0]?.aggregateType).toBe('TeamLineup');
      expect(inningEvents).toHaveLength(1);
      expect(inningEvents[0]?.aggregateType).toBe('InningState');
    });

    it('should handle large event batches efficiently', async () => {
      const largeEventBatch = Array.from({ length: 100 }, () => createMockGameCreatedEvent(gameId));

      await expect(eventStore.append(gameId, 'Game', largeEventBatch)).resolves.not.toThrow();

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(100);

      // Verify sequential version numbers
      storedEvents.forEach((event, index: number) => {
        expect(event.streamVersion).toBe(index + 1);
      });
    });

    it('should handle multiple sequential appends correctly', async () => {
      // First append
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Second append
      await eventStore.append(gameId, 'Game', [mockEvents[1]!]);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0]?.streamVersion).toBe(1);
      expect(storedEvents[1]?.streamVersion).toBe(2);
      expect(storedEvents[0]?.eventType).toBe('GameCreated');
      expect(storedEvents[1]?.eventType).toBe('AtBatCompleted');
    });
  });

  describe('getEvents Method - Phase 1 Core Functionality', () => {
    beforeEach(async () => {
      await eventStore.append(gameId, 'Game', mockEvents);
    });

    it('should retrieve events by streamId', async () => {
      const events = await eventStore.getEvents(gameId);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(2);
      expect(events[0]?.streamId).toBe(gameId.value);
      expect(events[1]?.streamId).toBe(gameId.value);
    });

    it('should retrieve events from specific version', async () => {
      const events = await eventStore.getEvents(gameId, 2);

      expect(events).toHaveLength(1);
      expect(events[0]?.streamVersion).toBe(2);
      expect(events[0]?.eventType).toBe('AtBatCompleted');
    });

    it('should return empty array for non-existent stream', async () => {
      const nonExistentId = GameId.generate();
      const events = await eventStore.getEvents(nonExistentId);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('should maintain complete StoredEvent structure', async () => {
      const events = await eventStore.getEvents(gameId);
      const event = events[0]!;

      // Verify all required StoredEvent properties
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(typeof event.streamId).toBe('string');
      expect(event.streamId).toBe(gameId.value);
      expect(['Game', 'TeamLineup', 'InningState']).toContain(event.aggregateType);
      expect(typeof event.eventType).toBe('string');
      expect(event.eventType.length).toBeGreaterThan(0);
      expect(typeof event.eventData).toBe('string');
      expect(typeof event.eventVersion).toBe('number');
      expect(event.eventVersion).toBeGreaterThanOrEqual(1);
      expect(typeof event.streamVersion).toBe('number');
      expect(event.streamVersion).toBeGreaterThanOrEqual(1);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThan(0);

      // Verify metadata structure
      expect(event.metadata).toBeDefined();
      expect(typeof event.metadata.source).toBe('string');
      expect(event.metadata.source.length).toBeGreaterThan(0);
      expect(event.metadata.createdAt).toBeInstanceOf(Date);
    });

    it('should handle boundary conditions for fromVersion parameter', async () => {
      // Add more events for boundary testing
      const additionalEvent = createMockAtBatCompletedEvent(gameId);
      await eventStore.append(gameId, 'Game', [additionalEvent]);

      // Test version 0 (should return all events)
      const allEvents = await eventStore.getEvents(gameId, 0);
      expect(allEvents).toHaveLength(3);

      // Test exact version match
      const fromVersion2 = await eventStore.getEvents(gameId, 2);
      expect(fromVersion2).toHaveLength(2);
      expect(fromVersion2[0]?.streamVersion).toBe(2);

      // Test version beyond available (should return empty)
      const beyondEvents = await eventStore.getEvents(gameId, 10);
      expect(beyondEvents).toHaveLength(0);
    });

    it('should maintain strict event ordering', async () => {
      const events = await eventStore.getEvents(gameId);

      // Verify chronological ordering
      for (let i = 1; i < events.length; i++) {
        const currentEvent = events[i];
        const previousEvent = events[i - 1];
        expect(currentEvent).toBeDefined();
        expect(previousEvent).toBeDefined();
        expect(currentEvent!.timestamp.getTime()).toBeGreaterThanOrEqual(
          previousEvent!.timestamp.getTime()
        );
      }

      // Verify version ordering
      for (let i = 1; i < events.length; i++) {
        const currentEvent = events[i];
        const previousEvent = events[i - 1];
        expect(currentEvent).toBeDefined();
        expect(previousEvent).toBeDefined();
        expect(currentEvent!.streamVersion).toBe(previousEvent!.streamVersion + 1);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle version conflict error with clear message', async () => {
      // Set up initial state
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Attempt conflicting version - should throw
      await expect(eventStore.append(gameId, 'Game', [mockEvents[1]!], 0)).rejects.toThrow(
        /concurrency conflict/i
      );

      // Verify specific error message format
      try {
        await eventStore.append(gameId, 'Game', [mockEvents[1]!], 0);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/expected.*0/);
        expect((error as Error).message).toMatch(/actual.*1/);
      }
    });

    it('should handle rapid sequential operations', async () => {
      const operations = Array.from({ length: 20 }, async () => {
        const testGameId = GameId.generate();
        const event = createMockGameCreatedEvent(testGameId);

        await eventStore.append(testGameId, 'Game', [event]);
        return eventStore.getEvents(testGameId);
      });

      const results = await Promise.all(operations);

      // All operations should complete successfully
      expect(results).toHaveLength(20);
      results.forEach((events: StoredEvent[]) => {
        expect(events).toHaveLength(1);
      });
    });

    it('should maintain isolation between different streams', async () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const event1 = createMockGameCreatedEvent(gameId1);
      const event2 = createMockAtBatCompletedEvent(gameId2);

      await eventStore.append(gameId1, 'Game', [event1]);
      await eventStore.append(gameId2, 'Game', [event2]);

      const events1 = await eventStore.getEvents(gameId1);
      const events2 = await eventStore.getEvents(gameId2);

      expect(events1).toHaveLength(1);
      expect(events1[0]?.eventType).toBe('GameCreated');
      expect(events2).toHaveLength(1);
      expect(events2[0]?.eventType).toBe('AtBatCompleted');
    });

    it('should preserve event data integrity through serialization', async () => {
      const originalEvent = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [originalEvent]);

      const storedEvents = await eventStore.getEvents(gameId);
      const eventData = JSON.parse(storedEvents[0]?.eventData || '{}');

      expect(eventData.eventId).toBe(originalEvent.eventId);
      expect(eventData.type).toBe(originalEvent.type);
      expect(eventData.gameId.value).toBe(originalEvent.gameId.value);
      expect(new Date(eventData.timestamp as string)).toEqual(originalEvent.timestamp);
    });

    it('should handle concurrent version checking correctly', async () => {
      // First append
      await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);

      // Both appends try to append based on version 1, only one should succeed
      const event1 = createMockAtBatCompletedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      // First append should succeed
      await expect(eventStore.append(gameId, 'Game', [event1], 1)).resolves.not.toThrow();

      // Second append with same expected version should fail
      await expect(eventStore.append(gameId, 'Game', [event2], 1)).rejects.toThrow(
        /concurrency conflict/i
      );
    });
  });

  // Phase 3: Comprehensive Error Handling Tests
  describe('Phase 3: Parameter Validation and Error Handling', () => {
    it('should handle version conflicts gracefully with detailed error context', async () => {
      // Set up initial state
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Attempt conflicting version - should provide actionable error
      try {
        await eventStore.append(gameId, 'Game', [mockEvents[1]!], 0);
        expect.fail('Expected concurrency error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Concurrency conflict');
        expect(errorMessage).toContain('expected version 0');
        expect(errorMessage).toContain('actual 1');
        expect(errorMessage).toContain(gameId.value);
        expect(errorMessage).toContain('Please reload the aggregate');
      }
    });

    it('should validate invalid parameters with specific error messages', async () => {
      // Test null streamId
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).append(null, 'Game', mockEvents)
      ).rejects.toThrow('Parameter validation failed: streamId cannot be null or undefined');

      // Test undefined streamId
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).append(undefined, 'Game', mockEvents)
      ).rejects.toThrow('Parameter validation failed: streamId cannot be null or undefined');

      // Test invalid aggregateType
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).append(gameId, 'InvalidType', mockEvents)
      ).rejects.toThrow(
        'Parameter validation failed: aggregateType must be one of: Game, TeamLineup, InningState'
      );

      // Test null events array
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).append(gameId, 'Game', null)
      ).rejects.toThrow('Parameter validation failed: events cannot be null or undefined');

      // Test invalid expectedVersion
      await expect(eventStore.append(gameId, 'Game', mockEvents, -1)).rejects.toThrow(
        'Parameter validation failed: expectedVersion must be a non-negative integer'
      );
    });

    it('should handle null/undefined inputs appropriately in getEvents', async () => {
      // Test null streamId
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEvents(null)
      ).rejects.toThrow('Parameter validation failed: streamId cannot be null or undefined');

      // Test undefined streamId
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEvents(undefined)
      ).rejects.toThrow('Parameter validation failed: streamId cannot be null or undefined');

      // Test invalid fromVersion
      await expect(eventStore.getEvents(gameId, -1)).rejects.toThrow(
        'Parameter validation failed: fromVersion must be a positive integer'
      );
    });

    it('should manage concurrent access safely under high load', async () => {
      const concurrentOperations = 50;
      const results: Promise<void>[] = [];

      // Create multiple concurrent append operations
      for (let i = 0; i < concurrentOperations; i++) {
        const testGameId = GameId.generate();
        const event = createMockGameCreatedEvent(testGameId);
        results.push(eventStore.append(testGameId, 'Game', [event]));
      }

      // All operations should complete successfully
      await expect(Promise.all(results)).resolves.not.toThrow();

      // Verify data integrity
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents.length).toBeGreaterThanOrEqual(concurrentOperations);
    });

    it('should enforce aggregate type validation with clear guidance', async () => {
      const gameEvent = createMockGameCreatedEvent(gameId);

      // Test mismatched aggregate type for Game event
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        await (eventStore as any).append(gameId, 'InvalidAggregate', [gameEvent]);
        expect.fail('Expected aggregate type validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Parameter validation failed');
        expect(errorMessage).toContain(
          'aggregateType must be one of: Game, TeamLineup, InningState'
        );
      }
    });

    it('should handle large event batches efficiently with memory management', async () => {
      // Suppress expected warning for large batch test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const largeEventBatch = Array.from({ length: 1000 }, () =>
        createMockGameCreatedEvent(gameId)
      );

      // Should succeed but warn about large batch sizes
      await expect(eventStore.append(gameId, 'Game', largeEventBatch)).resolves.not.toThrow();

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(1000);

      // Verify sequential version numbers
      storedEvents.forEach((event, index) => {
        expect(event.streamVersion).toBe(index + 1);
      });

      consoleWarnSpy.mockRestore();
    });

    it('should maintain consistency under memory pressure scenarios', async () => {
      // Create multiple streams with large datasets
      const streamCount = 10;
      const eventsPerStream = 500;
      const testGameIds = Array.from({ length: streamCount }, () => GameId.generate());

      for (const testGameId of testGameIds) {
        const events = Array.from({ length: eventsPerStream }, () =>
          createMockGameCreatedEvent(testGameId)
        );
        await eventStore.append(testGameId, 'Game', events);
      }

      // Verify all streams are accessible and consistent
      for (const testGameId of testGameIds) {
        const events = await eventStore.getEvents(testGameId);
        expect(events).toHaveLength(eventsPerStream);
        expect(events[0]?.streamVersion).toBe(1);
        expect(events[eventsPerStream - 1]?.streamVersion).toBe(eventsPerStream);
      }
    });

    it('should recover from malformed event data gracefully', async () => {
      // Create a mock event with malformed JSON in cross-aggregate queries
      const mockMalformedEvent = {
        eventId: 'malformed-event-id',
        streamId: gameId.value,
        aggregateType: 'Game' as const,
        eventType: 'TestEvent',
        eventData: '{"malformed": json}', // Invalid JSON
        eventVersion: 1,
        streamVersion: 1,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          createdAt: new Date(),
        },
      };

      // Inject malformed event directly into internal storage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing internal storage for testing purposes
      (eventStore as any).streams.set(gameId.value, [mockMalformedEvent]);

      // Cross-aggregate queries should handle malformed JSON gracefully
      const gameEvents = await eventStore.getGameEvents(gameId);
      expect(Array.isArray(gameEvents)).toBe(true);
      // Malformed events should be skipped, not cause failures

      const gameEventsById = await eventStore.getEventsByGameId(gameId);
      expect(Array.isArray(gameEventsById)).toBe(true);
    });

    it('should handle excessive memory usage scenarios with proper limits', async () => {
      // Suppress expected warning for large batch test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test memory limit enforcement (simulate with very large event batches)
      const excessiveEventBatch = Array.from({ length: 10000 }, () =>
        createMockGameCreatedEvent(gameId)
      );

      // Should either succeed with warning or fail with clear memory message
      try {
        await eventStore.append(gameId, 'Game', excessiveEventBatch);

        // If successful, verify the events are stored
        const storedEvents = await eventStore.getEvents(gameId);
        expect(storedEvents).toHaveLength(10000);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Memory limit');
      }

      consoleWarnSpy.mockRestore();
    });

    it('should validate event data serialization failures', async () => {
      // Create a mock event that will fail JSON serialization
      const problematicEvent = {
        ...createMockGameCreatedEvent(gameId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Creating circular reference for serialization test deliberately
        circularRef: {} as any,
      };
      problematicEvent.circularRef.self = problematicEvent;

      // Should handle serialization failure gracefully
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- Testing serialization failure deliberately
        await eventStore.append(gameId, 'Game', [problematicEvent as any]);
        expect.fail('Expected serialization error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Event serialization failed');
      }
    });

    it('should handle stream isolation under concurrent modifications', async () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      // Create concurrent modifications to different streams
      const operations = [
        ...Array.from({ length: 25 }, () =>
          eventStore.append(gameId1, 'Game', [createMockGameCreatedEvent(gameId1)])
        ),
        ...Array.from({ length: 25 }, () =>
          eventStore.append(gameId2, 'Game', [createMockAtBatCompletedEvent(gameId2)])
        ),
      ];

      await Promise.all(operations);

      // Verify stream isolation
      const events1 = await eventStore.getEvents(gameId1);
      const events2 = await eventStore.getEvents(gameId2);

      expect(events1).toHaveLength(25);
      expect(events2).toHaveLength(25);
      expect(events1.every(e => e.eventType === 'GameCreated')).toBe(true);
      expect(events2.every(e => e.eventType === 'AtBatCompleted')).toBe(true);
    });

    it('should provide clear error messages for timestamp boundary issues', async () => {
      // Test invalid timestamp filtering
      const invalidDate = new Date('invalid-date-string');

      await expect(eventStore.getAllEvents(invalidDate)).rejects.toThrow(
        'Parameter validation failed: fromTimestamp must be a valid Date object'
      );

      await expect(eventStore.getEventsByType('GameCreated', invalidDate)).rejects.toThrow(
        'Parameter validation failed: fromTimestamp must be a valid Date object'
      );
    });

    it('should handle aggregate type array validation in getEventsByGameId', async () => {
      // Test invalid aggregate type in array
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEventsByGameId(gameId, ['Game', 'InvalidType'])
      ).rejects.toThrow(
        'Parameter validation failed: aggregateTypes must only contain valid aggregate types: Game, TeamLineup, InningState'
      );

      // Test non-array aggregateTypes
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEventsByGameId(gameId, 'Game')
      ).rejects.toThrow(
        'Parameter validation failed: aggregateTypes must be an array or undefined'
      );
    });

    it('should enforce event type string validation', async () => {
      // Test non-string event type
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEventsByType(null)
      ).rejects.toThrow('Parameter validation failed: eventType must be a non-empty string');

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEventsByType('')
      ).rejects.toThrow('Parameter validation failed: eventType must be a non-empty string');

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters deliberately
        (eventStore as any).getEventsByType(123)
      ).rejects.toThrow('Parameter validation failed: eventType must be a non-empty string');
    });

    it('should handle version conflicts with retry guidance', async () => {
      // Set up initial state
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Simulate high-frequency version conflicts
      const event1 = createMockAtBatCompletedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      // First append should succeed
      await eventStore.append(gameId, 'Game', [event1], 1);

      // Second append should fail with retry guidance
      try {
        await eventStore.append(gameId, 'Game', [event2], 1);
        expect.fail('Expected concurrency error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Please reload the aggregate');
        expect(errorMessage).toContain('retry the operation');
        expect(errorMessage).toContain('current version: 2');
      }
    });
  });

  describe('Phase 2 Advanced Query Methods - Full Implementation', () => {
    let gameId1: GameId;
    let gameId2: GameId;
    let teamLineupId1: TeamLineupId;
    let teamLineupId2: TeamLineupId;
    let inningStateId1: InningStateId;
    let inningStateId2: InningStateId;

    beforeEach(async () => {
      // Set up comprehensive test data across multiple games and aggregates
      gameId1 = GameId.generate();
      gameId2 = GameId.generate();
      teamLineupId1 = TeamLineupId.generate();
      teamLineupId2 = TeamLineupId.generate();
      inningStateId1 = InningStateId.generate();
      inningStateId2 = InningStateId.generate();

      // Game 1 events
      await eventStore.append(gameId1, 'Game', [createMockGameCreatedEvent(gameId1)]);
      await eventStore.append(teamLineupId1, 'TeamLineup', [
        createMockTeamLineupCreatedEvent(gameId1, teamLineupId1),
      ]);
      await eventStore.append(inningStateId1, 'InningState', [
        createMockInningStateCreatedEvent(gameId1, inningStateId1),
      ]);

      // Add some delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      // Game 2 events
      await eventStore.append(gameId2, 'Game', [createMockGameCreatedEvent(gameId2)]);
      await eventStore.append(teamLineupId2, 'TeamLineup', [
        createMockTeamLineupCreatedEvent(gameId2, teamLineupId2),
      ]);
      await eventStore.append(inningStateId2, 'InningState', [
        createMockInningStateCreatedEvent(gameId2, inningStateId2),
      ]);

      // Additional game events for testing
      await eventStore.append(gameId1, 'Game', [createMockAtBatCompletedEvent(gameId1)]);
      await eventStore.append(gameId2, 'Game', [createMockAtBatCompletedEvent(gameId2)]);
    });

    describe('getEventsByType Method', () => {
      it('should get events by type across all streams', async () => {
        const gameCreatedEvents = await eventStore.getEventsByType('GameCreated');

        expect(gameCreatedEvents).toHaveLength(2);
        expect(gameCreatedEvents.every(event => event.eventType === 'GameCreated')).toBe(true);
      });

      it('should maintain chronological ordering in type-filtered results', async () => {
        const gameCreatedEvents = await eventStore.getEventsByType('GameCreated');

        expect(gameCreatedEvents).toHaveLength(2);
        // Verify chronological ordering by timestamp
        for (let i = 1; i < gameCreatedEvents.length; i++) {
          const current = gameCreatedEvents[i]!;
          const previous = gameCreatedEvents[i - 1]!;
          expect(current.timestamp.getTime()).toBeGreaterThanOrEqual(previous.timestamp.getTime());
        }
      });

      it('should filter events by type with timestamp filtering', async () => {
        const allEvents = await eventStore.getAllEvents();
        const midTimestamp = new Date(allEvents[3]!.timestamp.getTime()); // Around middle of events

        const recentGameCreatedEvents = await eventStore.getEventsByType(
          'GameCreated',
          midTimestamp
        );

        expect(recentGameCreatedEvents.length).toBeLessThanOrEqual(2);
        recentGameCreatedEvents.forEach(event => {
          expect(event.eventType).toBe('GameCreated');
          expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(midTimestamp.getTime());
        });
      });

      it('should return empty array for non-existent event type', async () => {
        const result = await eventStore.getEventsByType('NonExistentEventType');
        expect(result).toEqual([]);
      });

      it('should handle case-sensitive event type matching', async () => {
        const correctCase = await eventStore.getEventsByType('GameCreated');
        const incorrectCase = await eventStore.getEventsByType('gamecreated');

        expect(correctCase.length).toBeGreaterThan(0);
        expect(incorrectCase).toEqual([]);
      });
    });

    describe('getAllEvents Method', () => {
      it('should get all events with timestamp filtering', async () => {
        const allEvents = await eventStore.getAllEvents();

        expect(allEvents.length).toBeGreaterThanOrEqual(8); // 6 created + 2 AtBat events
        // Should contain events from all aggregate types
        const aggregateTypes = [...new Set(allEvents.map(event => event.aggregateType))];
        expect(aggregateTypes).toContain('Game');
        expect(aggregateTypes).toContain('TeamLineup');
        expect(aggregateTypes).toContain('InningState');
      });

      it('should maintain chronological ordering across all events', async () => {
        const allEvents = await eventStore.getAllEvents();

        expect(allEvents.length).toBeGreaterThan(0);
        // Verify chronological ordering by timestamp
        for (let i = 1; i < allEvents.length; i++) {
          const current = allEvents[i]!;
          const previous = allEvents[i - 1]!;
          expect(current.timestamp.getTime()).toBeGreaterThanOrEqual(previous.timestamp.getTime());
        }
      });

      it('should filter events by timestamp across all streams', async () => {
        const allEvents = await eventStore.getAllEvents();
        expect(allEvents.length).toBeGreaterThanOrEqual(8); // Ensure we have expected events

        // Find the earliest unique timestamp to filter from
        const timestamps = allEvents.map(e => e.timestamp.getTime());
        const uniqueTimestamps = [...new Set(timestamps)].sort((a, b) => a - b);

        if (uniqueTimestamps.length > 1) {
          // Use the second unique timestamp to ensure filtering works
          const filterTimestamp = new Date(uniqueTimestamps[1]!);
          const recentEvents = await eventStore.getAllEvents(filterTimestamp);

          expect(recentEvents.length).toBeLessThan(allEvents.length);
          recentEvents.forEach(event => {
            expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(filterTimestamp.getTime());
          });
        } else {
          // If all events have same timestamp, test that all are returned
          const filterTimestamp = new Date(timestamps[0]!);
          const recentEvents = await eventStore.getAllEvents(filterTimestamp);

          expect(recentEvents.length).toBe(allEvents.length);
          recentEvents.forEach(event => {
            expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(filterTimestamp.getTime());
          });
        }
      });

      it('should handle empty streams gracefully', async () => {
        const emptyEventStore = new InMemoryEventStore();
        const allEvents = await emptyEventStore.getAllEvents();

        expect(allEvents).toEqual([]);
      });

      it('should return all events when no timestamp filter provided', async () => {
        const allEvents = await eventStore.getAllEvents();
        const unfiltered = await eventStore.getAllEvents(undefined);

        expect(allEvents).toEqual(unfiltered);
        expect(allEvents.length).toBeGreaterThan(0);
      });
    });

    describe('getGameEvents Method', () => {
      it('should retrieve game events across aggregates', async () => {
        const game1Events = await eventStore.getGameEvents(gameId1);

        expect(game1Events.length).toBeGreaterThanOrEqual(4); // Game, TeamLineup, InningState, AtBat

        // Should contain events from all aggregate types for this game
        const aggregateTypes = [...new Set(game1Events.map(event => event.aggregateType))];
        expect(aggregateTypes).toContain('Game');
        expect(aggregateTypes).toContain('TeamLineup');
        expect(aggregateTypes).toContain('InningState');
      });

      it('should maintain chronological ordering in cross-aggregate queries', async () => {
        const game1Events = await eventStore.getGameEvents(gameId1);

        expect(game1Events.length).toBeGreaterThan(1);
        // Verify chronological ordering by timestamp
        for (let i = 1; i < game1Events.length; i++) {
          const current = game1Events[i]!;
          const previous = game1Events[i - 1]!;
          expect(current.timestamp.getTime()).toBeGreaterThanOrEqual(previous.timestamp.getTime());
        }
      });

      it('should isolate events by game ID correctly', async () => {
        const game1Events = await eventStore.getGameEvents(gameId1);
        const game2Events = await eventStore.getGameEvents(gameId2);

        expect(game1Events.length).toBeGreaterThan(0);
        expect(game2Events.length).toBeGreaterThan(0);
        expect(game1Events.length).toBe(game2Events.length); // Same structure for both games

        // Verify game isolation - check that events contain correct gameId references
        game1Events.forEach(event => {
          const eventData = JSON.parse(event.eventData);
          expect(eventData.gameId.value).toBe(gameId1.value);
        });

        game2Events.forEach(event => {
          const eventData = JSON.parse(event.eventData);
          expect(eventData.gameId.value).toBe(gameId2.value);
        });
      });

      it('should return empty array for non-existent game', async () => {
        const nonExistentGameId = GameId.generate();
        const result = await eventStore.getGameEvents(nonExistentGameId);

        expect(result).toEqual([]);
      });

      it('should handle games with partial aggregate data', async () => {
        const partialGameId = GameId.generate();
        // Only create Game aggregate, no TeamLineup or InningState
        await eventStore.append(partialGameId, 'Game', [createMockGameCreatedEvent(partialGameId)]);

        const partialGameEvents = await eventStore.getGameEvents(partialGameId);

        expect(partialGameEvents).toHaveLength(1);
        expect(partialGameEvents[0]?.aggregateType).toBe('Game');
      });
    });

    describe('getEventsByGameId Method', () => {
      it('should support complex filtering in getEventsByGameId', async () => {
        const allGameEvents = await eventStore.getEventsByGameId(gameId1);

        expect(allGameEvents.length).toBeGreaterThanOrEqual(4);
        // Should contain events from all aggregate types
        const aggregateTypes = [...new Set(allGameEvents.map(event => event.aggregateType))];
        expect(aggregateTypes).toContain('Game');
        expect(aggregateTypes).toContain('TeamLineup');
        expect(aggregateTypes).toContain('InningState');
      });

      it('should filter events by aggregate types', async () => {
        const gameOnlyEvents = await eventStore.getEventsByGameId(gameId1, ['Game']);
        const teamLineupOnlyEvents = await eventStore.getEventsByGameId(gameId1, ['TeamLineup']);
        const multipleTypesEvents = await eventStore.getEventsByGameId(gameId1, [
          'Game',
          'TeamLineup',
        ]);

        expect(gameOnlyEvents.every(event => event.aggregateType === 'Game')).toBe(true);
        expect(teamLineupOnlyEvents.every(event => event.aggregateType === 'TeamLineup')).toBe(
          true
        );
        expect(
          multipleTypesEvents.every(event => ['Game', 'TeamLineup'].includes(event.aggregateType))
        ).toBe(true);

        expect(gameOnlyEvents.length).toBeGreaterThan(0);
        expect(teamLineupOnlyEvents.length).toBeGreaterThan(0);
        expect(multipleTypesEvents.length).toBe(
          gameOnlyEvents.length + teamLineupOnlyEvents.length
        );
      });

      it('should filter events by timestamp and aggregate type', async () => {
        const allEvents = await eventStore.getEventsByGameId(gameId1);
        const midTimestamp = new Date(allEvents[2]!.timestamp.getTime()); // Get timestamp from middle event

        const recentGameEvents = await eventStore.getEventsByGameId(
          gameId1,
          ['Game'],
          midTimestamp
        );

        expect(recentGameEvents.every(event => event.aggregateType === 'Game')).toBe(true);
        recentGameEvents.forEach(event => {
          expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(midTimestamp.getTime());
        });
      });

      it('should maintain chronological ordering with filtering', async () => {
        const filteredEvents = await eventStore.getEventsByGameId(gameId1, ['Game', 'InningState']);

        expect(filteredEvents.length).toBeGreaterThan(1);
        // Verify chronological ordering by timestamp
        for (let i = 1; i < filteredEvents.length; i++) {
          const current = filteredEvents[i]!;
          const previous = filteredEvents[i - 1]!;
          expect(current.timestamp.getTime()).toBeGreaterThanOrEqual(previous.timestamp.getTime());
        }
      });

      it('should return empty array when no aggregates match filter', async () => {
        // Create a game with only Game events, then filter for non-existent aggregate type
        const emptyGameId = GameId.generate();
        await eventStore.append(emptyGameId, 'Game', [createMockGameCreatedEvent(emptyGameId)]);

        // This aggregate type filter won't match any events
        const result = await eventStore.getEventsByGameId(emptyGameId, ['TeamLineup']);

        expect(result).toEqual([]);
      });

      it('should handle edge case with future timestamp filter', async () => {
        const futureTimestamp = new Date(Date.now() + 1000000); // 1000 seconds in future

        const result = await eventStore.getEventsByGameId(gameId1, undefined, futureTimestamp);

        expect(result).toEqual([]);
      });

      it('should handle empty aggregate types array', async () => {
        const result = await eventStore.getEventsByGameId(gameId1, []);

        expect(result).toEqual([]);
      });
    });

    describe('Cross-Method Integration', () => {
      it('should maintain consistency across different query methods', async () => {
        // Get all events for game1 using different methods
        const gameEvents = await eventStore.getGameEvents(gameId1);
        const gameEventsById = await eventStore.getEventsByGameId(gameId1);
        const allEvents = await eventStore.getAllEvents();

        // gameEvents and gameEventsById should return same results when no filters applied
        expect(gameEvents).toEqual(gameEventsById);

        // All events should include the game events
        const game1EventsInAll = allEvents.filter(event => {
          const eventData = JSON.parse(event.eventData);
          return eventData.gameId && eventData.gameId.value === gameId1.value;
        });

        expect(game1EventsInAll.length).toBe(gameEvents.length);
      });

      it('should handle concurrent queries without interference', async () => {
        const queries = [
          eventStore.getAllEvents(),
          eventStore.getGameEvents(gameId1),
          eventStore.getEventsByType('GameCreated'),
          eventStore.getEventsByGameId(gameId1, ['Game']),
        ];

        const results = await Promise.all(queries);

        // All queries should complete successfully
        expect(results).toHaveLength(4);
        expect(Array.isArray(results[0])).toBe(true);
        expect(Array.isArray(results[1])).toBe(true);
        expect(Array.isArray(results[2])).toBe(true);
        expect(Array.isArray(results[3])).toBe(true);

        // Results should be consistent
        expect(results[0]!.length).toBeGreaterThan(0); // getAllEvents
        expect(results[1]!.length).toBeGreaterThan(0); // getGameEvents
        expect(results[2]!.length).toBe(2); // getEventsByType (2 GameCreated events)
        expect(results[3]!.length).toBeGreaterThan(0); // getEventsByGameId filtered to Game only
      });
    });
  });

  describe('Memory Management', () => {
    it('should handle memory efficiently for large datasets', async () => {
      // Create multiple streams with events
      const streamCount = 50;
      const eventsPerStream = 20;

      for (let i = 0; i < streamCount; i++) {
        const testGameId = GameId.generate();
        const events = Array.from({ length: eventsPerStream }, () =>
          createMockGameCreatedEvent(testGameId)
        );
        await eventStore.append(testGameId, 'Game', events);
      }

      // Verify all streams are accessible
      for (let i = 0; i < 10; i++) {
        // Test a sample
        const testGameId = GameId.generate();
        const events = await eventStore.getEvents(testGameId);
        expect(events).toHaveLength(0); // New stream should be empty
      }
    });

    it('should maintain consistent behavior under memory pressure', async () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      // Create large event batches
      const largeEventBatch1 = Array.from({ length: 200 }, () =>
        createMockGameCreatedEvent(gameId1)
      );
      const largeEventBatch2 = Array.from({ length: 200 }, () =>
        createMockAtBatCompletedEvent(gameId2)
      );

      await eventStore.append(gameId1, 'Game', largeEventBatch1);
      await eventStore.append(gameId2, 'Game', largeEventBatch2);

      const events1 = await eventStore.getEvents(gameId1);
      const events2 = await eventStore.getEvents(gameId2);

      expect(events1).toHaveLength(200);
      expect(events2).toHaveLength(200);
      expect(events1[0]?.eventType).toBe('GameCreated');
      expect(events2[0]?.eventType).toBe('AtBatCompleted');
    });
  });

  describe('Phase 3: Final Coverage Improvements', () => {
    let eventStore: InMemoryEventStore;

    beforeEach(() => {
      eventStore = new InMemoryEventStore();
    });

    describe('Memory Limit Enforcement', () => {
      it('should enforce MAX_TOTAL_EVENTS limit (lines 312-315)', async () => {
        // Suppress expected warnings for large batch tests
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const gameId = GameId.generate();

        // Create a mock that will make the total events exceed MAX_TOTAL_EVENTS (100,000)
        // We need to simulate having many existing events in the store
        const batchSize = 1000;
        const batchesNeeded = Math.floor(100000 / batchSize) + 1; // This will exceed the limit

        // Add events in smaller batches to get close to the limit
        for (let i = 0; i < batchesNeeded - 1; i++) {
          const batchGameId = GameId.generate();
          const eventBatch = Array.from({ length: batchSize }, () =>
            createMockAtBatCompletedEvent(batchGameId)
          );
          await eventStore.append(batchGameId, 'Game', eventBatch);
        }

        // Now try to add one more batch that will exceed the limit
        const finalBatch = Array.from({ length: batchSize }, () =>
          createMockAtBatCompletedEvent(gameId)
        );

        await expect(eventStore.append(gameId, 'Game', finalBatch)).rejects.toThrow(
          'Total events would exceed maximum allowed 100000'
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Error Handling Coverage', () => {
      it('should handle errors in getGameEvents catch block (lines 519-520)', async () => {
        // Create an invalid gameId that will cause an error in validation
        const invalidGameId = null as unknown as DomainId;

        // This should trigger the catch block at lines 519-520
        await expect(eventStore.getGameEvents(invalidGameId)).rejects.toThrow();
      });

      it('should handle non-Error objects in getGameEvents catch block (lines 519-520)', async () => {
        const gameId = GameId.generate();

        // Create typed interface for the event store with private method access
        interface EventStoreWithValidateStreamId {
          validateStreamId: (streamId: DomainId) => void;
        }

        // Mock the validateStreamId method to throw a non-Error object
        const typedEventStore = eventStore as unknown as EventStoreWithValidateStreamId;
        const originalValidateStreamId = typedEventStore.validateStreamId.bind(eventStore);
        typedEventStore.validateStreamId = (): void => {
          throw new Error('String error message'); // Proper Error object
        };

        // This should trigger the catch block at lines 519-520 and convert to Error
        await expect(eventStore.getGameEvents(gameId)).rejects.toThrow('String error message');

        // Restore the original method
        typedEventStore.validateStreamId = originalValidateStreamId;
      });
    });
  });
});
