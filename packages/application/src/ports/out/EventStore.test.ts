/**
 * @file EventStore Tests
 * Tests for the outbound port interface for multi-aggregate event persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventStore, StoredEvent } from './EventStore';
import {
  GameId,
  TeamLineupId,
  InningStateId,
  DomainEvent,
  GameCreated,
  AtBatCompleted,
  PlayerId,
  AtBatResultType,
} from '@twsoftball/domain';

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
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
    inningStateId = InningStateId.generate();

    mockEvents = [createMockGameCreatedEvent(gameId), createMockAtBatEvent(gameId)];
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
      const nonExistentId = GameId.generate();
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
      const emptyGameId = GameId.generate();
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
      const inningEvent = createMockAtBatEvent(gameId);

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
});
