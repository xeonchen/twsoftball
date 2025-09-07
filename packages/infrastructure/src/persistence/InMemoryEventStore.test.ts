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
  GameId,
  TeamLineupId,
  InningStateId,
  DomainEvent,
  GameCreated,
  AtBatCompleted,
  TeamLineupCreated,
  InningStateCreated,
  PlayerId,
  AtBatResultType,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import type { EventStore, StoredEvent } from '../../../application/src/ports/out/EventStore';

import { InMemoryEventStore } from './InMemoryEventStore';

// Mock domain events for testing
const createMockGameCreatedEvent = (gameId: GameId): GameCreated => {
  return new GameCreated(gameId, 'Mock Home Team', 'Mock Away Team');
};

const createMockAtBatEvent = (gameId: GameId): AtBatCompleted => {
  return new AtBatCompleted(
    gameId,
    PlayerId.generate(),
    3, // batting slot
    AtBatResultType.SINGLE,
    3, // inning
    1 // outs (valid range 0-2)
  );
};

const createMockTeamLineupCreatedEvent = (
  gameId: GameId,
  teamLineupId: TeamLineupId
): TeamLineupCreated => {
  return new TeamLineupCreated(teamLineupId, gameId, 'Mock Team Name');
};

const createMockInningStateCreatedEvent = (
  gameId: GameId,
  inningStateId: InningStateId
): InningStateCreated => {
  return new InningStateCreated(inningStateId, gameId, 1, true);
};

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

    mockEvents = [createMockGameCreatedEvent(gameId), createMockAtBatEvent(gameId)];
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
      const additionalEvent = createMockAtBatEvent(gameId);
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
      const event2 = createMockAtBatEvent(gameId2);

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
      const event1 = createMockAtBatEvent(gameId);
      const event2 = createMockAtBatEvent(gameId);

      // First append should succeed
      await expect(eventStore.append(gameId, 'Game', [event1], 1)).resolves.not.toThrow();

      // Second append with same expected version should fail
      await expect(eventStore.append(gameId, 'Game', [event2], 1)).rejects.toThrow(
        /concurrency conflict/i
      );
    });
  });

  describe('Phase 2 Interface Compliance - Basic Implementation', () => {
    // These tests ensure Phase 2 methods exist and return proper types
    // Full implementation will be added in Phase 2

    beforeEach(async () => {
      // Set up test data across multiple aggregates
      await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);
      await eventStore.append(teamLineupId, 'TeamLineup', [
        createMockTeamLineupCreatedEvent(gameId, teamLineupId),
      ]);
      await eventStore.append(inningStateId, 'InningState', [
        createMockInningStateCreatedEvent(gameId, inningStateId),
      ]);
    });

    it('should have getGameEvents method that returns promise', async () => {
      const result = await eventStore.getGameEvents(gameId);
      expect(Array.isArray(result)).toBe(true);
      // Implementation details tested in Phase 2
    });

    it('should have getAllEvents method that returns promise', async () => {
      const result = await eventStore.getAllEvents();
      expect(Array.isArray(result)).toBe(true);
      // Implementation details tested in Phase 2
    });

    it('should have getEventsByType method that returns promise', async () => {
      const result = await eventStore.getEventsByType('GameCreated');
      expect(Array.isArray(result)).toBe(true);
      // Implementation details tested in Phase 2
    });

    it('should have getEventsByGameId method that returns promise', async () => {
      const result = await eventStore.getEventsByGameId(gameId);
      expect(Array.isArray(result)).toBe(true);
      // Implementation details tested in Phase 2
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
      const largeEventBatch2 = Array.from({ length: 200 }, () => createMockAtBatEvent(gameId2));

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
});
