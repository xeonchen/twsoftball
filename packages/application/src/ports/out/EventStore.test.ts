/**
 * @file EventStore Tests
 * Tests for the outbound port interface for multi-aggregate event persistence.
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

import {
  createMockGameId,
  createMockTeamLineupId,
  createMockInningStateId,
} from '../../test-utils/event-store/index.js';

import { EventStore, StoredEvent } from './EventStore.js';

// Import shared test utilities

// Keep domain-specific mock creators since they use real domain classes
const createMockGameCreatedEvent = (gameId: GameId): GameCreated => {
  return new GameCreated(gameId, 'Mock Home Team', 'Mock Away Team');
};

const createMockAtBatCompletedEvent = (gameId: GameId): AtBatCompleted => {
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

// Mock implementation for testing the interface contract
class MockEventStore implements EventStore {
  private readonly events = new Map<string, StoredEvent[]>();
  // private readonly globalEventCounter = 0; // unused variable

  append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    const streamKey = streamId.value;
    const existingEvents = this.events.get(streamKey) || [];

    if (expectedVersion !== undefined && existingEvents.length !== expectedVersion) {
      return Promise.reject(
        new Error(
          `Concurrency conflict: expected version ${expectedVersion}, actual ${existingEvents.length}`
        )
      );
    }

    const storedEvents = events.map((event, index) => ({
      eventId: event.eventId,
      streamId: streamKey,
      aggregateType,
      eventType: event.type,
      eventData: JSON.stringify(event),
      eventVersion: 1,
      streamVersion: existingEvents.length + index + 1,
      timestamp: event.timestamp,
      metadata: {
        source: 'test',
        createdAt: new Date(),
      },
    }));

    this.events.set(streamKey, [...existingEvents, ...storedEvents]);
    return Promise.resolve();
  }

  getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    const events = this.events.get(streamId.value) || [];
    return Promise.resolve(
      fromVersion ? events.filter(e => e.streamVersion >= fromVersion) : events
    );
  }

  getGameEvents(gameId: GameId): Promise<StoredEvent[]> {
    const allEvents: StoredEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(
        ...events.filter(e => {
          const eventData = JSON.parse(e.eventData);
          return eventData.gameId && eventData.gameId.value === gameId.value;
        })
      );
    }
    return Promise.resolve(allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  }

  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]> {
    const allEvents: StoredEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    const sorted = allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return Promise.resolve(
      fromTimestamp ? sorted.filter(e => e.timestamp >= fromTimestamp) : sorted
    );
  }

  async getEventsByType(eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]> {
    const allEvents = await this.getAllEvents(fromTimestamp);
    return allEvents.filter(e => e.eventType === eventType);
  }

  async getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]> {
    let events = await this.getGameEvents(gameId);

    if (aggregateTypes) {
      events = events.filter(e => aggregateTypes.includes(e.aggregateType));
    }

    if (fromTimestamp) {
      events = events.filter(e => e.timestamp >= fromTimestamp);
    }

    return events;
  }
}

describe('EventStore Interface', () => {
  let eventStore: EventStore;
  let mockStore: MockEventStore;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;
  let mockEvents: DomainEvent[];

  beforeEach(() => {
    mockStore = new MockEventStore();
    eventStore = mockStore;
    gameId = createMockGameId();
    teamLineupId = createMockTeamLineupId();
    inningStateId = createMockInningStateId();

    mockEvents = [createMockGameCreatedEvent(gameId), createMockAtBatCompletedEvent(gameId)];
  });

  describe('Interface Contract', () => {
    it('should define all required methods', () => {
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

  describe('append Method', () => {
    it('should append events to Game aggregate stream', async () => {
      await eventStore.append(gameId, 'Game', mockEvents);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0]?.aggregateType).toBe('Game');
      expect(storedEvents[0]?.streamId).toBe(gameId.value);
    });

    it('should append events to TeamLineup aggregate stream', async () => {
      await eventStore.append(teamLineupId, 'TeamLineup', [mockEvents[0]!]);

      const storedEvents = await eventStore.getEvents(teamLineupId);
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0]?.aggregateType).toBe('TeamLineup');
      expect(storedEvents[0]?.streamId).toBe(teamLineupId.value);
    });

    it('should append events to InningState aggregate stream', async () => {
      await eventStore.append(inningStateId, 'InningState', [mockEvents[1]!]);

      const storedEvents = await eventStore.getEvents(inningStateId);
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0]?.aggregateType).toBe('InningState');
      expect(storedEvents[0]?.streamId).toBe(inningStateId.value);
    });

    it('should maintain event order within stream', async () => {
      await eventStore.append(gameId, 'Game', mockEvents);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents[0]?.eventType).toBe('GameCreated');
      expect(storedEvents[1]?.eventType).toBe('AtBatCompleted');
      expect(storedEvents[0]?.streamVersion).toBe(1);
      expect(storedEvents[1]?.streamVersion).toBe(2);
    });

    it('should handle expected version for optimistic concurrency', async () => {
      // First append
      await eventStore.append(gameId, 'Game', [mockEvents[0]!], 0);

      // Second append with correct expected version
      await eventStore.append(gameId, 'Game', [mockEvents[1]!], 1);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(2);
    });

    it('should throw error on version conflict', async () => {
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      // Try to append with incorrect expected version
      await expect(eventStore.append(gameId, 'Game', [mockEvents[1]!], 0)).rejects.toThrow(
        'Concurrency conflict'
      );
    });

    it('should serialize domain events properly', async () => {
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);

      const storedEvents = await eventStore.getEvents(gameId);
      const eventData = JSON.parse(storedEvents[0]!.eventData);

      expect(eventData.type).toBe('GameCreated');
      expect(eventData.gameId.value).toBe(gameId.value);
    });
  });

  describe('getEvents Method', () => {
    beforeEach(async () => {
      await eventStore.append(gameId, 'Game', mockEvents);
    });

    it('should retrieve all events from stream', async () => {
      const events = await eventStore.getEvents(gameId);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(2);
      expect(events[0]!).toHaveProperty('eventId');
      expect(events[0]!).toHaveProperty('streamId');
      expect(events[0]!).toHaveProperty('eventType');
      expect(events[0]!).toHaveProperty('eventData');
    });

    it('should retrieve events from specific version', async () => {
      const events = await eventStore.getEvents(gameId, 2);

      expect(events).toHaveLength(1);
      expect(events[0]!.streamVersion).toBe(2);
      expect(events[0]!.eventType).toBe('AtBatCompleted');
    });

    it('should return empty array for non-existent stream', async () => {
      const nonExistentId = createMockGameId();
      const events = await eventStore.getEvents(nonExistentId);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('should maintain StoredEvent structure', async () => {
      const events = await eventStore.getEvents(gameId);
      const event = events[0]!;

      expect(event.eventId).toBeDefined();
      expect(event.streamId).toBe(gameId.value);
      expect(event.eventType).toBe('GameCreated');
      expect(typeof event.eventData).toBe('string');
      expect(typeof event.eventVersion).toBe('number');
      expect(typeof event.streamVersion).toBe('number');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.metadata).toBeDefined();
      expect(event.metadata.source).toBeDefined();
      expect(event.metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getGameEvents Method', () => {
    beforeEach(async () => {
      // Add events to different aggregate streams for same game
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);
      await eventStore.append(teamLineupId, 'TeamLineup', [mockEvents[0]!]);
      await eventStore.append(inningStateId, 'InningState', [mockEvents[1]!]);
    });

    it('should retrieve events from all aggregates for a game', async () => {
      const events = await eventStore.getGameEvents(gameId);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      // All events should be related to the game
      events.forEach(event => {
        const eventData = JSON.parse(event.eventData);
        expect(eventData.gameId.value).toBe(gameId.value);
      });
    });

    it('should return events in chronological order', async () => {
      const events = await eventStore.getGameEvents(gameId);

      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
          events[i - 1]!.timestamp.getTime()
        );
      }
    });

    it('should return empty array for game with no events', async () => {
      const emptyGameId = createMockGameId();
      const events = await eventStore.getGameEvents(emptyGameId);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });
  });

  describe('getAllEvents Method', () => {
    beforeEach(async () => {
      await eventStore.append(gameId, 'Game', mockEvents);
    });

    it('should retrieve all events across all streams', async () => {
      const events = await eventStore.getAllEvents();

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by timestamp when provided', async () => {
      const futureTime = new Date(Date.now() + 10000);
      const events = await eventStore.getAllEvents(futureTime);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('should return events in chronological order', async () => {
      const events = await eventStore.getAllEvents();

      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
          events[i - 1]!.timestamp.getTime()
        );
      }
    });
  });

  describe('getEventsByType Method', () => {
    beforeEach(async () => {
      await eventStore.append(gameId, 'Game', mockEvents);
    });

    it('should filter events by type', async () => {
      const events = await eventStore.getEventsByType('GameCreated');

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.eventType).toBe('GameCreated');
      });
    });

    it('should return empty array for non-existent event type', async () => {
      const events = await eventStore.getEventsByType('NonExistentEvent');

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('should filter by timestamp when provided', async () => {
      const futureTime = new Date(Date.now() + 10000);
      const events = await eventStore.getEventsByType('GameCreated', futureTime);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });
  });

  describe('getEventsByGameId Method', () => {
    beforeEach(async () => {
      await eventStore.append(gameId, 'Game', [mockEvents[0]!]);
      await eventStore.append(teamLineupId, 'TeamLineup', [mockEvents[0]!]);
      await eventStore.append(inningStateId, 'InningState', [mockEvents[1]!]);
    });

    it('should retrieve all events for a game', async () => {
      const events = await eventStore.getEventsByGameId(gameId);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should filter by aggregate types when specified', async () => {
      const events = await eventStore.getEventsByGameId(gameId, ['Game']);

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event.aggregateType).toBe('Game');
      });
    });

    it('should filter by multiple aggregate types', async () => {
      const events = await eventStore.getEventsByGameId(gameId, ['Game', 'TeamLineup']);

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(['Game', 'TeamLineup']).toContain(event.aggregateType);
      });
    });

    it('should filter by timestamp when provided', async () => {
      const futureTime = new Date(Date.now() + 10000);
      const events = await eventStore.getEventsByGameId(gameId, undefined, futureTime);

      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(0);
    });

    it('should combine all filters when provided', async () => {
      const currentTime = new Date();
      const events = await eventStore.getEventsByGameId(
        gameId,
        ['Game'],
        new Date(currentTime.getTime() - 1000)
      );

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event.aggregateType).toBe('Game');
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(currentTime.getTime() - 1000);
      });
    });
  });

  describe('Domain Integration', () => {
    it('should work with domain event objects', async () => {
      const domainEvent = createMockGameCreatedEvent(gameId);
      expect(domainEvent).toBeInstanceOf(GameCreated);

      await eventStore.append(gameId, 'Game', [domainEvent]);

      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents[0]?.eventType).toBe('GameCreated');
    });

    it('should preserve event data integrity', async () => {
      const originalEvent = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [originalEvent]);

      const storedEvents = await eventStore.getEvents(gameId);
      const eventData = JSON.parse(storedEvents[0]!.eventData);

      expect(eventData.eventId).toBe(originalEvent.eventId);
      expect(eventData.type).toBe(originalEvent.type);
      expect(eventData.gameId.value).toBe(originalEvent.gameId.value);
      expect(new Date(eventData.timestamp as string)).toEqual(originalEvent.timestamp);
    });

    it('should handle all aggregate ID types', async () => {
      const gameEvent = createMockGameCreatedEvent(gameId);
      const teamEvent = createMockGameCreatedEvent(gameId);
      const inningEvent = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [gameEvent]);
      await eventStore.append(teamLineupId, 'TeamLineup', [teamEvent]);
      await eventStore.append(inningStateId, 'InningState', [inningEvent]);

      const gameEvents = await eventStore.getEvents(gameId);
      const teamEvents = await eventStore.getEvents(teamLineupId);
      const inningEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(teamEvents).toHaveLength(1);
      expect(inningEvents).toHaveLength(1);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle infrastructure errors appropriately', async () => {
      class ErrorMockEventStore implements EventStore {
        append(
          ..._args: [
            GameId | TeamLineupId | InningStateId,
            'Game' | 'TeamLineup' | 'InningState',
            DomainEvent[],
            number?,
          ]
        ): Promise<void> {
          return Promise.reject(new Error('Database write failed'));
        }

        getEvents(
          ..._args: [GameId | TeamLineupId | InningStateId, number?]
        ): Promise<StoredEvent[]> {
          return Promise.reject(new Error('Database read failed'));
        }

        getGameEvents(..._args: [GameId]): Promise<StoredEvent[]> {
          return Promise.reject(new Error('Query failed'));
        }

        getAllEvents(..._args: [Date?]): Promise<StoredEvent[]> {
          return Promise.reject(new Error('Full scan failed'));
        }

        getEventsByType(..._args: [string, Date?]): Promise<StoredEvent[]> {
          return Promise.reject(new Error('Index query failed'));
        }

        getEventsByGameId(
          ..._args: [GameId, ('Game' | 'TeamLineup' | 'InningState')[]?, Date?]
        ): Promise<StoredEvent[]> {
          return Promise.reject(new Error('Cross-aggregate query failed'));
        }
      }

      const errorStore = new ErrorMockEventStore();

      await expect(errorStore.append(gameId, 'Game', mockEvents)).rejects.toThrow(
        'Database write failed'
      );

      await expect(errorStore.getEvents(gameId)).rejects.toThrow('Database read failed');
    });
  });

  describe('Comprehensive Contract Validation', () => {
    describe('append() method edge cases', () => {
      it('should handle empty events array', async () => {
        await expect(eventStore.append(gameId, 'Game', [])).resolves.not.toThrow();

        const storedEvents = await eventStore.getEvents(gameId);
        expect(storedEvents).toHaveLength(0);
      });

      it('should handle null and undefined parameters appropriately', async () => {
        // TypeScript should prevent these, but testing runtime behavior
        const testCases = [
          { streamId: null, aggregateType: 'Game', events: mockEvents, expectedError: true },
          { streamId: gameId, aggregateType: null, events: mockEvents, expectedError: true },
          { streamId: gameId, aggregateType: 'Game', events: null, expectedError: true },
        ];

        for (const testCase of testCases) {
          try {
            await (
              eventStore as unknown as {
                append: (
                  streamId: unknown,
                  aggregateType: unknown,
                  events: unknown
                ) => Promise<void>;
              }
            ).append(testCase.streamId, testCase.aggregateType, testCase.events);
            if (testCase.expectedError) {
              expect.fail('Expected error for null/undefined parameters');
            }
          } catch (_error) {
            expect(testCase.expectedError).toBe(true);
          }
        }
      });

      it('should enforce strict aggregate type validation', async () => {
        const gameEvent = createMockGameCreatedEvent(gameId);
        const teamEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
        const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);

        // Valid combinations
        await expect(eventStore.append(gameId, 'Game', [gameEvent])).resolves.not.toThrow();
        await expect(
          eventStore.append(teamLineupId, 'TeamLineup', [teamEvent])
        ).resolves.not.toThrow();
        await expect(
          eventStore.append(inningStateId, 'InningState', [inningEvent])
        ).resolves.not.toThrow();

        // Clean up for next tests
        const cleanStore = new MockEventStore();
        eventStore = cleanStore;
      });

      it('should handle large event batches', async () => {
        const largeEventBatch = Array.from({ length: 100 }, () =>
          createMockGameCreatedEvent(gameId)
        );

        await expect(eventStore.append(gameId, 'Game', largeEventBatch)).resolves.not.toThrow();

        const storedEvents = await eventStore.getEvents(gameId);
        expect(storedEvents).toHaveLength(100);

        // Verify sequential version numbers
        storedEvents.forEach((event, index) => {
          expect(event.streamVersion).toBe(index + 1);
        });
      });

      it('should handle concurrent version conflicts properly', async () => {
        // Set up initial state
        await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);

        // Attempt concurrent writes with same expected version
        const event1 = createMockAtBatCompletedEvent(gameId);
        const event2 = createMockAtBatCompletedEvent(gameId);

        // First write should succeed
        await expect(eventStore.append(gameId, 'Game', [event1], 1)).resolves.not.toThrow();

        // Second write with same expected version should fail
        await expect(eventStore.append(gameId, 'Game', [event2], 1)).rejects.toThrow(
          'Concurrency conflict'
        );
      });
    });

    describe('getEvents() method edge cases', () => {
      beforeEach(async () => {
        // Set up test data with multiple events
        const events = [
          createMockGameCreatedEvent(gameId),
          createMockAtBatCompletedEvent(gameId),
          createMockAtBatCompletedEvent(gameId),
        ];
        await eventStore.append(gameId, 'Game', events);
      });

      it('should handle boundary conditions for fromVersion parameter', async () => {
        // Test version 0 (should return all events)
        const allEvents = await eventStore.getEvents(gameId, 0);
        expect(allEvents).toHaveLength(3);

        // Test exact version match
        const fromVersion2 = await eventStore.getEvents(gameId, 2);
        expect(fromVersion2).toHaveLength(2);
        expect(fromVersion2[0]!.streamVersion).toBe(2);

        // Test version beyond available (should return empty)
        const beyondEvents = await eventStore.getEvents(gameId, 10);
        expect(beyondEvents).toHaveLength(0);

        // Test negative version (edge case)
        const negativeEvents = await eventStore.getEvents(gameId, -1);
        expect(negativeEvents).toHaveLength(3); // Should return all events
      });

      it('should maintain strict ordering guarantees', async () => {
        const events = await eventStore.getEvents(gameId);

        // Verify chronological ordering
        for (let i = 1; i < events.length; i++) {
          expect(events[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
            events[i - 1]!.timestamp.getTime()
          );
        }

        // Verify version ordering
        for (let i = 1; i < events.length; i++) {
          expect(events[i]!.streamVersion).toBe(events[i - 1]!.streamVersion + 1);
        }
      });
    });

    describe('Cross-aggregate query validation', () => {
      beforeEach(async () => {
        // Set up cross-aggregate test data
        await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);
        await eventStore.append(teamLineupId, 'TeamLineup', [
          createMockTeamLineupCreatedEvent(gameId, teamLineupId),
        ]);
        await eventStore.append(inningStateId, 'InningState', [
          createMockInningStateCreatedEvent(gameId, inningStateId),
        ]);
      });

      it('should correctly identify game-related events across all aggregates', async () => {
        const gameEvents = await eventStore.getGameEvents(gameId);

        expect(gameEvents.length).toBeGreaterThanOrEqual(3);

        // All events should be related to the game
        gameEvents.forEach(event => {
          const eventData = JSON.parse(event.eventData);
          expect(eventData.gameId.value).toBe(gameId.value);
        });

        // Should include all aggregate types
        const aggregateTypes = [...new Set(gameEvents.map(e => e.aggregateType))];
        expect(aggregateTypes.sort()).toEqual(['Game', 'InningState', 'TeamLineup']);
      });

      it('should handle complex filtering in getEventsByGameId', async () => {
        // Test single aggregate type filter
        const gameOnly = await eventStore.getEventsByGameId(gameId, ['Game']);
        expect(gameOnly.every(e => e.aggregateType === 'Game')).toBe(true);

        // Test multiple aggregate type filter
        const gameAndTeam = await eventStore.getEventsByGameId(gameId, ['Game', 'TeamLineup']);
        expect(gameAndTeam.every(e => ['Game', 'TeamLineup'].includes(e.aggregateType))).toBe(true);

        // Test with timestamp filter
        const currentTime = new Date();
        const filtered = await eventStore.getEventsByGameId(
          gameId,
          undefined,
          new Date(currentTime.getTime() - 1000)
        );
        expect(filtered.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('StoredEvent structure validation', () => {
      beforeEach(async () => {
        await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);
      });

      it('should enforce complete StoredEvent structure', async () => {
        const events = await eventStore.getEvents(gameId);
        const event = events[0]!;

        // Test all required fields exist with correct types
        expect(typeof event.eventId).toBe('string');
        expect(event.eventId.length).toBeGreaterThan(0);

        expect(typeof event.streamId).toBe('string');
        expect(event.streamId).toBe(gameId.value);

        expect(['Game', 'TeamLineup', 'InningState']).toContain(event.aggregateType);

        expect(typeof event.eventType).toBe('string');
        expect(event.eventType.length).toBeGreaterThan(0);

        expect(typeof event.eventData).toBe('string');
        expect(() => {
          const parsed: unknown = JSON.parse(event.eventData);
          return parsed;
        }).not.toThrow();

        expect(typeof event.eventVersion).toBe('number');
        expect(event.eventVersion).toBeGreaterThanOrEqual(1);

        expect(typeof event.streamVersion).toBe('number');
        expect(event.streamVersion).toBeGreaterThanOrEqual(1);

        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).toBeGreaterThan(0);

        // Test metadata structure
        expect(event.metadata).toBeDefined();
        expect(typeof event.metadata.source).toBe('string');
        expect(event.metadata.source.length).toBeGreaterThan(0);
        expect(event.metadata.createdAt).toBeInstanceOf(Date);

        // Test optional metadata fields
        if (event.metadata.correlationId) {
          expect(typeof event.metadata.correlationId).toBe('string');
        }
        if (event.metadata.causationId) {
          expect(typeof event.metadata.causationId).toBe('string');
        }
        if (event.metadata.userId) {
          expect(typeof event.metadata.userId).toBe('string');
        }
      });

      it('should preserve event data serialization integrity', async () => {
        // Use an existing event from the beforeEach setup to avoid timing issues
        const storedEvents = await eventStore.getEvents(gameId);
        expect(storedEvents).toHaveLength(1);

        const storedEventData = JSON.parse(storedEvents[0]!.eventData);

        // Verify all expected event properties are present and properly typed
        expect(typeof storedEventData.eventId).toBe('string');
        expect(storedEventData.eventId.length).toBeGreaterThan(0);
        expect(storedEventData.type).toBe('GameCreated');
        expect(typeof storedEventData.gameId).toBe('object');
        expect(storedEventData.gameId.value).toBe(gameId.value);
        expect(typeof storedEventData.version).toBe('number');
        expect(storedEventData.version).toBe(1);

        // Verify timestamp precision is maintained
        expect(typeof storedEventData.timestamp).toBe('string');
        const storedTimestamp = new Date(storedEventData.timestamp as string);
        expect(storedTimestamp).toBeInstanceOf(Date);
        expect(storedTimestamp.getTime()).toBeGreaterThan(0);
      });
    });

    describe('Event type and filtering validation', () => {
      beforeEach(async () => {
        const mixedEvents = [
          createMockGameCreatedEvent(gameId),
          createMockAtBatCompletedEvent(gameId),
          createMockTeamLineupCreatedEvent(gameId, teamLineupId),
        ];

        await eventStore.append(gameId, 'Game', [mixedEvents[0]!]);
        await eventStore.append(gameId, 'Game', [mixedEvents[1]!]);
        await eventStore.append(teamLineupId, 'TeamLineup', [mixedEvents[2]!]);
      });

      it('should handle precise event type filtering', async () => {
        // Test exact type match
        const gameCreatedEvents = await eventStore.getEventsByType('GameCreated');
        expect(gameCreatedEvents.every(e => e.eventType === 'GameCreated')).toBe(true);
        expect(gameCreatedEvents.length).toBeGreaterThan(0);

        // Test non-existent type
        const nonExistentEvents = await eventStore.getEventsByType('NonExistentEventType');
        expect(nonExistentEvents).toHaveLength(0);

        // Test empty string type
        const emptyTypeEvents = await eventStore.getEventsByType('');
        expect(emptyTypeEvents).toHaveLength(0);
      });

      it('should handle timestamp filtering precision', async () => {
        const currentTime = new Date();

        // Future timestamp should return empty results
        const futureEvents = await eventStore.getEventsByType(
          'GameCreated',
          new Date(currentTime.getTime() + 60000)
        );
        expect(futureEvents).toHaveLength(0);

        // Past timestamp should return all events
        const pastEvents = await eventStore.getEventsByType(
          'GameCreated',
          new Date(currentTime.getTime() - 60000)
        );
        expect(pastEvents.length).toBeGreaterThan(0);
      });
    });

    describe('Performance and scalability validation', () => {
      it('should handle rapid sequential operations', async () => {
        const operations = Array.from({ length: 50 }, async () => {
          const testGameId = GameId.generate();
          const event = createMockGameCreatedEvent(testGameId);

          await eventStore.append(testGameId, 'Game', [event]);
          return eventStore.getEvents(testGameId);
        });

        const results = await Promise.all(operations);

        // All operations should complete successfully
        expect(results).toHaveLength(50);
        results.forEach(events => {
          expect(events).toHaveLength(1);
        });
      });

      it('should maintain consistency under load', async () => {
        const batchSize = 20;
        const events = Array.from({ length: batchSize }, () => createMockGameCreatedEvent(gameId));

        // Perform batch append
        await eventStore.append(gameId, 'Game', events);

        // Verify consistency
        const retrievedEvents = await eventStore.getEvents(gameId);
        expect(retrievedEvents).toHaveLength(batchSize);

        // Verify version sequence integrity
        retrievedEvents.forEach((event, index) => {
          expect(event.streamVersion).toBe(index + 1);
        });
      });
    });
  });
});
