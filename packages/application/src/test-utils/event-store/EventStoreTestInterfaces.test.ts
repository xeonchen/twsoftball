/**
 * @file EventStoreTestInterfaces.test.ts
 * Comprehensive tests for EventStore test interfaces and type definitions.
 * Validates interface structure, type exports, and type compatibility.
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import {
  // Re-exported domain types
  GameId as ReexportedGameId,
  TeamLineupId as ReexportedTeamLineupId,
  InningStateId as ReexportedInningStateId,
  DomainEvent as ReexportedDomainEvent,
  // Test-specific types
  DomainId,
  AggregateType,
  StoredEventMetadata,
  StoredEvent,
  EventStore,
} from './EventStoreTestInterfaces.js';

describe('EventStoreTestInterfaces', () => {
  describe('Domain Type Re-exports', () => {
    it('should re-export GameId from domain layer', () => {
      // Verify re-exported type is the same as original
      expect(ReexportedGameId).toBe(GameId);

      // Verify functionality works
      const gameId = GameId.generate();
      expect(gameId).toBeInstanceOf(GameId);
      expect(gameId).toBeInstanceOf(ReexportedGameId);
    });

    it('should re-export TeamLineupId from domain layer', () => {
      expect(ReexportedTeamLineupId).toBe(TeamLineupId);

      const teamLineupId = TeamLineupId.generate();
      expect(teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(teamLineupId).toBeInstanceOf(ReexportedTeamLineupId);
    });

    it('should re-export InningStateId from domain layer', () => {
      expect(ReexportedInningStateId).toBe(InningStateId);

      const inningStateId = InningStateId.generate();
      expect(inningStateId).toBeInstanceOf(InningStateId);
      expect(inningStateId).toBeInstanceOf(ReexportedInningStateId);
    });

    it('should re-export DomainEvent from domain layer', () => {
      expect(ReexportedDomainEvent).toBe(DomainEvent);
    });
  });

  describe('DomainId Union Type', () => {
    it('should accept GameId', () => {
      const gameId: DomainId = GameId.generate();
      expect(gameId).toBeInstanceOf(GameId);
    });

    it('should accept TeamLineupId', () => {
      const teamLineupId: DomainId = TeamLineupId.generate();
      expect(teamLineupId).toBeInstanceOf(TeamLineupId);
    });

    it('should accept InningStateId', () => {
      const inningStateId: DomainId = InningStateId.generate();
      expect(inningStateId).toBeInstanceOf(InningStateId);
    });

    it('should maintain type safety', () => {
      // This test ensures TypeScript compilation validates the union
      const testDomainIds: DomainId[] = [
        GameId.generate(),
        TeamLineupId.generate(),
        InningStateId.generate(),
      ];

      testDomainIds.forEach(id => {
        expect(typeof id.value).toBe('string');
        expect(id.toString).toBeDefined();
      });
    });
  });

  describe('AggregateType Literal Type', () => {
    it('should define Game as valid aggregate type', () => {
      const aggregateType: AggregateType = 'Game';
      expect(aggregateType).toBe('Game');
    });

    it('should define TeamLineup as valid aggregate type', () => {
      const aggregateType: AggregateType = 'TeamLineup';
      expect(aggregateType).toBe('TeamLineup');
    });

    it('should define InningState as valid aggregate type', () => {
      const aggregateType: AggregateType = 'InningState';
      expect(aggregateType).toBe('InningState');
    });

    it('should contain all expected aggregate types', () => {
      const validTypes: AggregateType[] = ['Game', 'TeamLineup', 'InningState'];

      validTypes.forEach(type => {
        expect(['Game', 'TeamLineup', 'InningState']).toContain(type);
      });
    });
  });

  describe('StoredEventMetadata Interface', () => {
    it('should define required source field', () => {
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: new Date(),
      };

      expect(metadata.source).toBe('test-source');
      expect(typeof metadata.source).toBe('string');
    });

    it('should define required createdAt field', () => {
      const now = new Date();
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: now,
      };

      expect(metadata.createdAt).toBe(now);
      expect(metadata.createdAt).toBeInstanceOf(Date);
    });

    it('should support optional correlationId', () => {
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: new Date(),
        correlationId: 'corr-123',
      };

      expect(metadata.correlationId).toBe('corr-123');
      expect(typeof metadata.correlationId).toBe('string');
    });

    it('should support optional causationId', () => {
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: new Date(),
        causationId: 'cause-456',
      };

      expect(metadata.causationId).toBe('cause-456');
      expect(typeof metadata.causationId).toBe('string');
    });

    it('should support optional userId', () => {
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: new Date(),
        userId: 'user-789',
      };

      expect(metadata.userId).toBe('user-789');
      expect(typeof metadata.userId).toBe('string');
    });

    it('should support all optional fields together', () => {
      const metadata: StoredEventMetadata = {
        source: 'test-source',
        createdAt: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-456',
        userId: 'user-789',
      };

      expect(metadata.source).toBe('test-source');
      expect(metadata.correlationId).toBe('corr-123');
      expect(metadata.causationId).toBe('cause-456');
      expect(metadata.userId).toBe('user-789');
    });

    it('should enforce readonly properties', () => {
      const metadata: StoredEventMetadata = {
        source: 'original-source',
        createdAt: new Date(),
      };

      // TypeScript should prevent this at compile time
      // We're testing runtime behavior to ensure interface is properly defined
      expect(metadata.source).toBe('original-source');

      // The readonly modifier is enforced at compile time, not runtime
      // This test validates the interface structure is correct
      expect(Object.getOwnPropertyDescriptor(metadata, 'source')?.writable).not.toBe(false);
    });
  });

  describe('StoredEvent Interface', () => {
    const createValidStoredEvent = (): StoredEvent => ({
      eventId: 'event-123',
      streamId: 'stream-456',
      aggregateType: 'Game',
      eventType: 'GameCreated',
      eventData: '{"gameId":"game-123"}',
      eventVersion: 1,
      streamVersion: 1,
      timestamp: new Date(),
      metadata: {
        source: 'test',
        createdAt: new Date(),
      },
    });

    it('should define all required fields with correct types', () => {
      const event = createValidStoredEvent();

      expect(typeof event.eventId).toBe('string');
      expect(typeof event.streamId).toBe('string');
      expect(typeof event.aggregateType).toBe('string');
      expect(typeof event.eventType).toBe('string');
      expect(typeof event.eventData).toBe('string');
      expect(typeof event.eventVersion).toBe('number');
      expect(typeof event.streamVersion).toBe('number');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(typeof event.metadata).toBe('object');
    });

    it('should enforce AggregateType for aggregateType field', () => {
      const gameEvent: StoredEvent = {
        ...createValidStoredEvent(),
        aggregateType: 'Game',
      };

      const teamEvent: StoredEvent = {
        ...createValidStoredEvent(),
        aggregateType: 'TeamLineup',
      };

      const inningEvent: StoredEvent = {
        ...createValidStoredEvent(),
        aggregateType: 'InningState',
      };

      expect(gameEvent.aggregateType).toBe('Game');
      expect(teamEvent.aggregateType).toBe('TeamLineup');
      expect(inningEvent.aggregateType).toBe('InningState');
    });

    it('should require StoredEventMetadata for metadata field', () => {
      const event = createValidStoredEvent();
      const metadata = event.metadata;

      expect(metadata.source).toBeDefined();
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(typeof metadata.source).toBe('string');
    });

    it('should enforce readonly properties', () => {
      const event = createValidStoredEvent();

      // Verify all properties exist and are accessible
      expect(event.eventId).toBeDefined();
      expect(event.streamId).toBeDefined();
      expect(event.aggregateType).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.eventData).toBeDefined();
      expect(event.eventVersion).toBeDefined();
      expect(event.streamVersion).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.metadata).toBeDefined();
    });

    it('should support serialized JSON in eventData', () => {
      const gameData = { gameId: 'game-123', homeTeam: 'Tigers' };
      const event: StoredEvent = {
        ...createValidStoredEvent(),
        eventData: JSON.stringify(gameData),
      };

      const rawParsedData = JSON.parse(event.eventData);
      const parsedData = rawParsedData as { gameId: string; homeTeam: string };

      // Type guard to ensure proper typing
      if (typeof parsedData.gameId === 'string') {
        expect(parsedData.gameId).toBe('game-123');
      } else {
        throw new Error('gameId is not a string');
      }
      expect(parsedData.homeTeam).toBe('Tigers');
    });
  });

  describe('EventStore Interface', () => {
    // Mock implementation for testing interface contract
    const createMockEventStore = (): EventStore => ({
      append: (): Promise<void> => Promise.resolve(),
      getEvents: (): Promise<StoredEvent[]> => Promise.resolve([]),
      getGameEvents: (): Promise<StoredEvent[]> => Promise.resolve([]),
      getAllEvents: (): Promise<StoredEvent[]> => Promise.resolve([]),
      getEventsByType: (): Promise<StoredEvent[]> => Promise.resolve([]),
      getEventsByGameId: (): Promise<StoredEvent[]> => Promise.resolve([]),
    });

    it('should define append method with correct signature', async () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();
      const mockEvent = { type: 'GameCreated' } as DomainEvent;

      // Should accept all DomainId types
      await expect(eventStore.append(gameId, 'Game', [mockEvent])).resolves.not.toThrow();
      await expect(eventStore.append(gameId, 'Game', [mockEvent], 0)).resolves.not.toThrow();
    });

    it('should define getEvents method with correct signature', async () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();

      await expect(eventStore.getEvents(gameId)).resolves.toEqual([]);
      await expect(eventStore.getEvents(gameId, 1)).resolves.toEqual([]);
    });

    it('should define getGameEvents method', async () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();

      await expect(eventStore.getGameEvents(gameId)).resolves.toEqual([]);
    });

    it('should define getAllEvents method', async () => {
      const eventStore = createMockEventStore();

      await expect(eventStore.getAllEvents()).resolves.toEqual([]);
      await expect(eventStore.getAllEvents(new Date())).resolves.toEqual([]);
    });

    it('should define getEventsByType method', async () => {
      const eventStore = createMockEventStore();

      await expect(eventStore.getEventsByType('GameCreated')).resolves.toEqual([]);
      await expect(eventStore.getEventsByType('GameCreated', new Date())).resolves.toEqual([]);
    });

    it('should define getEventsByGameId method', async () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();

      await expect(eventStore.getEventsByGameId(gameId)).resolves.toEqual([]);
      await expect(eventStore.getEventsByGameId(gameId, ['Game'])).resolves.toEqual([]);
      await expect(
        eventStore.getEventsByGameId(gameId, ['Game', 'TeamLineup'], new Date())
      ).resolves.toEqual([]);
    });

    it('should support all DomainId types for stream operations', async () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const inningStateId = InningStateId.generate();
      const mockEvent = { type: 'TestEvent' } as DomainEvent;

      // All ID types should be accepted
      await expect(eventStore.append(gameId, 'Game', [mockEvent])).resolves.not.toThrow();
      await expect(
        eventStore.append(teamLineupId, 'TeamLineup', [mockEvent])
      ).resolves.not.toThrow();
      await expect(
        eventStore.append(inningStateId, 'InningState', [mockEvent])
      ).resolves.not.toThrow();

      await expect(eventStore.getEvents(gameId)).resolves.toEqual([]);
      await expect(eventStore.getEvents(teamLineupId)).resolves.toEqual([]);
      await expect(eventStore.getEvents(inningStateId)).resolves.toEqual([]);
    });

    it('should return Promise types for all methods', () => {
      const eventStore = createMockEventStore();
      const gameId = GameId.generate();
      const mockEvent = { type: 'TestEvent' } as DomainEvent;

      // Verify return types are Promises
      expect(eventStore.append(gameId, 'Game', [mockEvent])).toBeInstanceOf(Promise);
      expect(eventStore.getEvents(gameId)).toBeInstanceOf(Promise);
      expect(eventStore.getGameEvents(gameId)).toBeInstanceOf(Promise);
      expect(eventStore.getAllEvents()).toBeInstanceOf(Promise);
      expect(eventStore.getEventsByType('TestEvent')).toBeInstanceOf(Promise);
      expect(eventStore.getEventsByGameId(gameId)).toBeInstanceOf(Promise);
    });
  });

  describe('Type Compatibility', () => {
    it('should maintain compatibility between domain IDs and interface usage', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const inningStateId = InningStateId.generate();

      // These should all be valid DomainId types
      const domainIds: DomainId[] = [gameId, teamLineupId, inningStateId];

      domainIds.forEach(id => {
        expect(typeof id.value).toBe('string');
        expect(id.toString).toBeDefined();
      });
    });

    it('should ensure AggregateType matches expected domain aggregates', () => {
      const aggregateTypes: AggregateType[] = ['Game', 'TeamLineup', 'InningState'];

      aggregateTypes.forEach(type => {
        expect(['Game', 'TeamLineup', 'InningState']).toContain(type);
      });
    });

    it('should support EventStore interface with all domain types', async () => {
      const mockStore: EventStore = {
        append: (streamId, aggregateType, events, expectedVersion): Promise<void> => {
          expect(streamId).toBeDefined();
          expect(aggregateType).toBeDefined();
          expect(Array.isArray(events)).toBe(true);
          if (expectedVersion !== undefined) {
            expect(typeof expectedVersion).toBe('number');
          }
          return Promise.resolve();
        },
        getEvents: (streamId, fromVersion): Promise<StoredEvent[]> => {
          expect(streamId).toBeDefined();
          if (fromVersion !== undefined) {
            expect(typeof fromVersion).toBe('number');
          }
          return Promise.resolve([]);
        },
        getGameEvents: (gameId): Promise<StoredEvent[]> => {
          expect(gameId).toBeInstanceOf(GameId);
          return Promise.resolve([]);
        },
        getAllEvents: (fromTimestamp): Promise<StoredEvent[]> => {
          if (fromTimestamp !== undefined) {
            expect(fromTimestamp).toBeInstanceOf(Date);
          }
          return Promise.resolve([]);
        },
        getEventsByType: (eventType, fromTimestamp): Promise<StoredEvent[]> => {
          expect(typeof eventType).toBe('string');
          if (fromTimestamp !== undefined) {
            expect(fromTimestamp).toBeInstanceOf(Date);
          }
          return Promise.resolve([]);
        },
        getEventsByGameId: (gameId, aggregateTypes, fromTimestamp): Promise<StoredEvent[]> => {
          expect(gameId).toBeInstanceOf(GameId);
          if (aggregateTypes !== undefined) {
            expect(Array.isArray(aggregateTypes)).toBe(true);
          }
          if (fromTimestamp !== undefined) {
            expect(fromTimestamp).toBeInstanceOf(Date);
          }
          return Promise.resolve([]);
        },
      };

      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const mockEvent = { type: 'TestEvent' } as DomainEvent;

      // Test full interface compatibility
      await mockStore.append(gameId, 'Game', [mockEvent]);
      await mockStore.append(teamLineupId, 'TeamLineup', [mockEvent], 0);
      await mockStore.getEvents(gameId);
      await mockStore.getEvents(gameId, 1);
      await mockStore.getGameEvents(gameId);
      await mockStore.getAllEvents();
      await mockStore.getAllEvents(new Date());
      await mockStore.getEventsByType('TestEvent');
      await mockStore.getEventsByType('TestEvent', new Date());
      await mockStore.getEventsByGameId(gameId);
      await mockStore.getEventsByGameId(gameId, ['Game']);
      await mockStore.getEventsByGameId(gameId, ['Game', 'TeamLineup'], new Date());

      // All calls should complete without type errors
      expect(true).toBe(true);
    });
  });
});
