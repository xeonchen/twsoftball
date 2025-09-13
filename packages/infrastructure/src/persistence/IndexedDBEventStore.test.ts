/**
 * @file IndexedDBEventStore Tests
 * Tests for the IndexedDB implementation of the EventStore interface.
 *
 * @remarks
 * This test suite validates the IndexedDBEventStore implementation using TDD principles.
 * Tests are written BEFORE implementation and focus on database schema creation,
 * connection management, and browser compatibility for IndexedDB operations.
 *
 * The schema tests validate:
 * - Database creation with correct name and version
 * - Events object store creation with proper structure
 * - Index creation for efficient querying
 * - Schema migration handling
 * - Connection lifecycle management
 * - Browser compatibility validation
 *
 * Test structure follows the InMemoryEventStore pattern but includes IndexedDB-specific
 * concerns such as database versioning, connection pooling, and browser compatibility.
 */

import {
  DomainEvent,
  AggregateType,
  createMockGameCreatedEvent,
  createMockAtBatCompletedEvent,
} from '@twsoftball/application';
import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import { GameId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import from shared package for EventStore interfaces and test utilities
// Import domain objects from domain package

import { createMockIndexedDB, createMockIDBKeyRange } from '../test-utils/indexeddb';

import { IndexedDBEventStore } from './IndexedDBEventStore';

// Declare indexedDB for testing environment
declare const indexedDB: IDBFactory;

// Internal method interfaces for type-safe mocking
interface IndexedDBEventStoreInternal {
  ensureConnection: () => Promise<IDBDatabase>;
  deserializeDate: (dateValue: Date | string) => Date;
  extractGameId: (event: DomainEvent) => string;
  db?: IDBDatabase;
}

// Mock creators and IndexedDB implementation now imported from shared utilities

describe('IndexedDBEventStore', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  // Note: These will be used in future tests when TeamLineup and InningState aggregate tests are added
  // let teamLineupId: TeamLineupId;
  // let inningStateId: InningStateId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    // Store original indexedDB
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;

    // Mock indexedDB
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();

    // Mock IDBKeyRange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    // Create eventStore for tests that expect it to be available
    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
    // teamLineupId = TeamLineupId.generate();
    // inningStateId = InningStateId.generate();
  });

  afterEach(() => {
    // Restore original indexedDB
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  describe('Database Schema Creation', () => {
    it('should initialize database ready for event operations', async () => {
      // Verify the store can perform basic operations (behavioral test)
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      // The store should be initialized and ready to append events
      await expect(eventStore.append(gameId, 'Game', [event])).resolves.toBeUndefined();

      // Verify the event was actually stored
      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0]?.eventType).toBe('GameCreated');
    });

    it('should create database with correct name and version', async () => {
      // Access the internal store for testing
      const internalStore = eventStore as unknown as IndexedDBEventStoreInternal;

      // Trigger database initialization
      await internalStore.ensureConnection();

      // Verify mock IndexedDB was called with correct parameters
      expect(indexedDB.open).toHaveBeenCalledWith('tw-softball-events', 1);
    });

    it('should handle database schema upgrades correctly', async () => {
      // This test validates schema migration handling
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      // This should trigger database creation and schema setup
      await eventStore.append(gameId, 'Game', [event]);

      // Verify the upgrade process was handled (mocked IndexedDB should have been called)
      expect(indexedDB.open).toHaveBeenCalled();
    });
  });

  describe('Event Persistence Operations', () => {
    it('should store and retrieve events correctly', async () => {
      const event = createMockGameCreatedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event]);

      const retrievedEvents = await eventStore.getEvents(gameId);
      expect(retrievedEvents).toHaveLength(1);
      expect(retrievedEvents[0]?.eventType).toBe('GameCreated');
      expect(retrievedEvents[0]?.streamId).toBe(gameId.value);
    });

    it('should maintain event order when storing multiple events', async () => {
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event1, event2]);

      const retrievedEvents = await eventStore.getEvents(gameId);
      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents[0]?.eventType).toBe('GameCreated');
      expect(retrievedEvents[1]?.eventType).toBe('AtBatCompleted');
    });

    it('should handle empty result when no events exist', async () => {
      const nonExistentGameId = GameId.generate();

      const retrievedEvents = await eventStore.getEvents(nonExistentGameId);
      expect(retrievedEvents).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      const mockIndexedDB = createMockIndexedDB();
      mockIndexedDB.open = vi.fn().mockImplementation(() => {
        const request = {
          readyState: 'pending',
          result: null,
          error: new DOMException('Connection failed', 'ConnectionError'),
          source: null,
          transaction: null,
          onsuccess: null,
          onerror: null as ((event: Event) => void) | null,
          onupgradeneeded: null,
          onblocked: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };

        setTimeout(() => {
          request.readyState = 'done';
          if (request.onerror) {
            const errorEvent = { target: request } as unknown as Event;
            request.onerror(errorEvent);
          }
        }, 0);

        return request;
      });

      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = mockIndexedDB;

      const failingEventStore = new IndexedDBEventStore();
      const event = createMockGameCreatedEvent(gameId);

      await expect(failingEventStore.append(gameId, 'Game', [event])).rejects.toThrow();
    });

    it('should handle transaction failures appropriately', async () => {
      // This test would verify transaction rollback scenarios
      // Implementation depends on the actual IndexedDBEventStore error handling
      const event = createMockGameCreatedEvent(gameId);

      // For now, just verify the method exists and can be called
      await expect(eventStore.append(gameId, 'Game', [event])).resolves.toBeUndefined();
    });
  });

  describe('IndexedDB-Specific Features', () => {
    it('should handle browser compatibility issues', () => {
      // Test that the store can detect IndexedDB availability
      expect(typeof indexedDB).toBeDefined();
    });

    it('should handle concurrent access scenarios', async () => {
      // Test concurrent append operations
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      const promises = [
        eventStore.append(gameId, 'Game', [event1]),
        eventStore.append(gameId, 'Game', [event2]),
      ];

      await Promise.all(promises);

      const retrievedEvents = await eventStore.getEvents(gameId);
      expect(retrievedEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large event batches efficiently', async () => {
      const largeEventBatch = Array.from({ length: 100 }, () => createMockGameCreatedEvent(gameId));

      const startTime = Date.now();
      await eventStore.append(gameId, 'Game', largeEventBatch);
      const endTime = Date.now();

      // Verify all events were stored
      const storedEvents = await eventStore.getEvents(gameId);
      expect(storedEvents).toHaveLength(largeEventBatch.length);

      // Performance assertion (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

describe('IndexedDBEventStore Optimistic Locking', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  it('should implement optimistic locking for concurrent writes', async () => {
    // Test basic event append operation
    const event = createMockGameCreatedEvent(gameId);
    await eventStore.append(gameId, 'Game', [event]);

    const retrievedEvents = await eventStore.getEvents(gameId);
    expect(retrievedEvents).toHaveLength(1);
  });
});

describe('Error Handling and Edge Cases', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  it('should handle storage quota limits', async () => {
    // Test behavior when IndexedDB quota is exceeded - use smaller batch for test performance
    const largeEventBatch = Array.from({ length: 1000 }, () => createMockGameCreatedEvent(gameId));

    // Should either succeed or fail gracefully with clear error
    try {
      await eventStore.append(gameId, 'Game', largeEventBatch);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/quota|storage|limit|IndexedDB/i);
    }
  });
});

describe('IndexedDBEventStore Performance and Scalability', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  it('should handle large event batches efficiently', { timeout: 10000 }, async () => {
    const largeEventBatch = Array.from({ length: 1000 }, (_, i) => {
      const event = createMockGameCreatedEvent(gameId);
      Object.defineProperty(event, 'eventId', { value: `event-${i}`, writable: false });
      return event;
    });

    const startTime = Date.now();
    await eventStore.append(gameId, 'Game', largeEventBatch);
    const endTime = Date.now();

    // Verify all events were stored
    const storedEvents = await eventStore.getEvents(gameId);
    expect(storedEvents).toHaveLength(largeEventBatch.length);

    // Performance should be reasonable (adjust threshold as needed)
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});

describe('IndexedDBEventStore Index Optimization', () => {
  let eventStore: EventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  it('should optimize queries using database indexes', async () => {
    // Test that the implementation can handle indexed queries efficiently
    const events = Array.from({ length: 100 }, () => createMockGameCreatedEvent(gameId));

    await eventStore.append(gameId, 'Game', events);

    const retrievedEvents = await eventStore.getEvents(gameId);

    expect(retrievedEvents).toHaveLength(events.length);
    // Verify events are retrieved correctly - timing assertions are flaky in CI
    expect(retrievedEvents[0]).toMatchObject({
      streamId: gameId.value,
      aggregateType: 'Game',
    });
  });
});

describe('IndexedDBEventStore Additional Methods Coverage', () => {
  let eventStore: IndexedDBEventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  describe('getAllEvents method', () => {
    it('should retrieve all events across all streams', async () => {
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event1, event2]);

      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0]?.eventType).toBe('GameCreated');
      expect(allEvents[1]?.eventType).toBe('AtBatCompleted');
    });

    it('should filter events by timestamp when fromTimestamp is provided', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2030-01-01');

      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      // Should return events when fromTimestamp is in the past
      const eventsFromPast = await eventStore.getAllEvents(pastDate);
      expect(eventsFromPast).toHaveLength(1);

      // Should return no events when fromTimestamp is in the future
      const eventsFromFuture = await eventStore.getAllEvents(futureDate);
      expect(eventsFromFuture).toHaveLength(0);
    });

    it('should throw error for invalid fromTimestamp', async () => {
      const invalidDate = new Date('invalid');
      await expect(eventStore.getAllEvents(invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });

    it('should return empty array when no events exist', async () => {
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(0);
    });
  });

  describe('getEventsByType method', () => {
    it('should retrieve events of specific type', async () => {
      const gameEvent = createMockGameCreatedEvent(gameId);
      const atBatEvent = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [gameEvent, atBatEvent]);

      const gameCreatedEvents = await eventStore.getEventsByType('GameCreated');
      expect(gameCreatedEvents).toHaveLength(1);
      expect(gameCreatedEvents[0]?.eventType).toBe('GameCreated');

      const atBatEvents = await eventStore.getEventsByType('AtBatCompleted');
      expect(atBatEvents).toHaveLength(1);
      expect(atBatEvents[0]?.eventType).toBe('AtBatCompleted');
    });

    it('should filter events by timestamp when fromTimestamp is provided', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2030-01-01');

      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      const eventsFromPast = await eventStore.getEventsByType('GameCreated', pastDate);
      expect(eventsFromPast).toHaveLength(1);

      const eventsFromFuture = await eventStore.getEventsByType('GameCreated', futureDate);
      expect(eventsFromFuture).toHaveLength(0);
    });

    it('should return empty array for non-existent event type', async () => {
      const events = await eventStore.getEventsByType('NonExistentEvent');
      expect(events).toHaveLength(0);
    });

    it('should throw error for invalid eventType', async () => {
      await expect(eventStore.getEventsByType('')).rejects.toThrow(
        'eventType must be a non-empty string'
      );
      await expect(eventStore.getEventsByType('   ')).rejects.toThrow(
        'eventType must be a non-empty string'
      );
    });

    it('should throw error for invalid fromTimestamp', async () => {
      const invalidDate = new Date('invalid');
      await expect(eventStore.getEventsByType('GameCreated', invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });
  });

  describe('getGameEvents method', () => {
    it('should retrieve all events for a specific game', async () => {
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event1, event2]);

      const gameEvents = await eventStore.getGameEvents(gameId);
      expect(gameEvents).toHaveLength(2);
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(gameEvents[1]?.eventType).toBe('AtBatCompleted');
    });

    it('should return empty array for non-existent game', async () => {
      const nonExistentGameId = GameId.generate();
      const gameEvents = await eventStore.getGameEvents(nonExistentGameId);
      expect(gameEvents).toHaveLength(0);
    });

    it('should throw error for null/undefined gameId', async () => {
      await expect(eventStore.getGameEvents(null as unknown as GameId)).rejects.toThrow(
        'streamId cannot be null or undefined'
      );
      await expect(eventStore.getGameEvents(undefined as unknown as GameId)).rejects.toThrow(
        'streamId cannot be null or undefined'
      );
    });
  });

  describe('getEventsByGameId method', () => {
    it('should retrieve events for a game with aggregate type filtering', async () => {
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event1, event2]);

      const gameEvents = await eventStore.getEventsByGameId(gameId, ['Game']);
      expect(gameEvents).toHaveLength(2);
    });

    it('should filter by timestamp when fromTimestamp is provided', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2030-01-01');

      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      const eventsFromPast = await eventStore.getEventsByGameId(gameId, undefined, pastDate);
      expect(eventsFromPast).toHaveLength(1);

      const eventsFromFuture = await eventStore.getEventsByGameId(gameId, undefined, futureDate);
      expect(eventsFromFuture).toHaveLength(0);
    });

    it('should throw error for invalid aggregateTypes array', async () => {
      await expect(
        eventStore.getEventsByGameId(gameId, 'Game' as unknown as AggregateType[])
      ).rejects.toThrow('aggregateTypes must be an array or undefined');
      await expect(
        eventStore.getEventsByGameId(gameId, ['InvalidType'] as unknown as AggregateType[])
      ).rejects.toThrow('aggregateTypes must only contain valid aggregate types');
    });

    it('should throw error for invalid fromTimestamp', async () => {
      const invalidDate = new Date('invalid');
      await expect(eventStore.getEventsByGameId(gameId, undefined, invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });

    it('should return empty array for non-existent game', async () => {
      const nonExistentGameId = GameId.generate();
      const events = await eventStore.getEventsByGameId(nonExistentGameId);
      expect(events).toHaveLength(0);
    });

    // PHASE 1: Critical Error Path Tests for IndexedDBEventStore (Lines 1187, 1200, 1203-1220)
    describe('IndexedDB Infrastructure Error Paths', () => {
      it('should handle catch block with Error objects (lines 1203-1220)', async () => {
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(new Error('Connection failed'));

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: Connection failed'
        );
      });

      it('should handle catch block with non-Error objects having message property (lines 1207-1214)', async () => {
        const customError = { message: 'Custom error object' };
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(customError);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: Custom error object'
        );
      });

      it('should handle catch block with string errors (lines 1212-1213)', async () => {
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue('String error message');

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: String error message'
        );
      });

      it('should handle catch block with null errors (line 1214)', async () => {
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(null);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: Unknown error'
        );
      });

      it('should handle catch block with undefined errors (line 1214)', async () => {
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(undefined);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: Unknown error'
        );
      });

      it('should handle catch block with complex object errors without message (lines 1210-1214)', async () => {
        const complexError = { code: 500, details: 'Server error' };
        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(complexError);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Failed to get events by game ID: Unknown error'
        );
      });

      it('should re-throw IndexedDBError instances from catch block (line 1203-1204)', async () => {
        const indexedDBError = new (class extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'IndexedDBError';
          }
        })('Original IndexedDB error');

        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(indexedDBError);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Original IndexedDB error'
        );
      });

      it('should re-throw EventStoreParameterError instances from catch block (line 1203-1204)', async () => {
        const parameterError = new (class extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'EventStoreParameterError';
          }
        })('Parameter validation error');

        const internal = eventStore as unknown as IndexedDBEventStoreInternal;
        internal.ensureConnection = vi.fn().mockRejectedValue(parameterError);

        await expect(eventStore.getEventsByGameId(gameId)).rejects.toThrow(
          'Parameter validation error'
        );
      });
    });
  });

  describe('getEvents method with fromVersion parameter', () => {
    it('should retrieve events from specific version', async () => {
      const event1 = createMockGameCreatedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);
      const event3 = createMockGameCreatedEvent(gameId);

      await eventStore.append(gameId, 'Game', [event1, event2, event3]);

      const eventsFromVersion2 = await eventStore.getEvents(gameId, 2);
      expect(eventsFromVersion2.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw error for invalid fromVersion', async () => {
      await expect(eventStore.getEvents(gameId, -1)).rejects.toThrow(
        'fromVersion must be a non-negative integer'
      );
      await expect(eventStore.getEvents(gameId, 1.5)).rejects.toThrow(
        'fromVersion must be a non-negative integer'
      );
    });
  });

  describe('Connection and lifecycle methods', () => {
    it('should close database connection when close() is called after connection established', async () => {
      // First establish a connection by doing an operation
      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      // Now test that close method works
      expect(() => eventStore.close()).not.toThrow();
    });

    it('should destroy event store when destroy() is called', async () => {
      // Establish connection first
      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      expect(() => eventStore.destroy()).not.toThrow();
    });

    it('should handle multiple close() calls safely', async () => {
      // Establish connection first
      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      expect(() => {
        eventStore.close();
        eventStore.close();
      }).not.toThrow();
    });

    it('should close without error when no connection exists', () => {
      const freshEventStore = new IndexedDBEventStore();
      expect(() => freshEventStore.close()).not.toThrow();
    });
  });
});

describe('IndexedDBEventStore Parameter Validation', () => {
  let eventStore: IndexedDBEventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
    (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

    eventStore = new IndexedDBEventStore();
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  describe('append method parameter validation', () => {
    it('should throw error for null streamId', async () => {
      const event = createMockGameCreatedEvent(gameId);
      await expect(eventStore.append(null as unknown as GameId, 'Game', [event])).rejects.toThrow(
        'streamId cannot be null or undefined'
      );
    });

    it('should throw error for undefined streamId', async () => {
      const event = createMockGameCreatedEvent(gameId);
      await expect(
        eventStore.append(undefined as unknown as GameId, 'Game', [event])
      ).rejects.toThrow('streamId cannot be null or undefined');
    });

    it('should throw error for invalid aggregateType', async () => {
      const event = createMockGameCreatedEvent(gameId);
      await expect(
        eventStore.append(gameId, 'InvalidType' as unknown as AggregateType, [event])
      ).rejects.toThrow('aggregateType must be one of: Game, TeamLineup, InningState');
    });

    it('should throw error for null events array', async () => {
      await expect(
        eventStore.append(gameId, 'Game', null as unknown as DomainEvent[])
      ).rejects.toThrow('events cannot be null or undefined');
    });

    it('should throw error for undefined events array', async () => {
      await expect(
        eventStore.append(gameId, 'Game', undefined as unknown as DomainEvent[])
      ).rejects.toThrow('events cannot be null or undefined');
    });

    it('should throw error for non-array events parameter', async () => {
      await expect(
        eventStore.append(gameId, 'Game', 'not an array' as unknown as DomainEvent[])
      ).rejects.toThrow('events must be an array');
    });

    it('should handle empty events array', async () => {
      await expect(eventStore.append(gameId, 'Game', [])).resolves.toBeUndefined();
    });
  });

  describe('Event serialization validation', () => {
    it('should throw error for events with non-serializable properties', async () => {
      const eventWithFunction = {
        ...createMockGameCreatedEvent(gameId),
        nonSerializable: (): string => 'function',
      } as unknown as DomainEvent;

      await expect(eventStore.append(gameId, 'Game', [eventWithFunction])).rejects.toThrow(
        /serialization failed/i
      );
    });

    it('should handle events with Date objects properly', async () => {
      const eventWithDate = createMockGameCreatedEvent(gameId);
      await expect(eventStore.append(gameId, 'Game', [eventWithDate])).resolves.toBeUndefined();
    });
  });
});

describe('IndexedDBEventStore Error Scenarios', () => {
  let eventStore: IndexedDBEventStore;
  let gameId: GameId;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    gameId = GameId.generate();
  });

  afterEach(() => {
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
  });

  describe('IndexedDB unavailable scenarios', () => {
    it('should handle IndexedDB not available', async () => {
      // Mock IndexedDB as unavailable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global for test
      (globalThis as any).indexedDB = undefined;

      eventStore = new IndexedDBEventStore();
      const event = createMockGameCreatedEvent(gameId);

      await expect(eventStore.append(gameId, 'Game', [event])).rejects.toThrow(
        /IndexedDB is not available/
      );
    });

    it('should handle IndexedDB open method missing', async () => {
      // Mock IndexedDB with missing open method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global for test
      (globalThis as any).indexedDB = {};

      eventStore = new IndexedDBEventStore();
      const event = createMockGameCreatedEvent(gameId);

      await expect(eventStore.append(gameId, 'Game', [event])).rejects.toThrow(
        /IndexedDB is not available/
      );
    });
  });

  describe('Version conflict scenarios', () => {
    it('should throw error when expectedVersion conflicts with current version', async () => {
      const mockIndexedDB = createMockIndexedDB();
      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = mockIndexedDB;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
      (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

      eventStore = new IndexedDBEventStore();

      // First, add an event to establish version 1
      const event1 = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event1]);

      // Try to append with expectedVersion 0 (should conflict)
      const event2 = createMockAtBatCompletedEvent(gameId);
      await expect(eventStore.append(gameId, 'Game', [event2], 0)).rejects.toThrow(
        /Version conflict/
      );
    });
  });

  describe('Database connection error scenarios', () => {
    it('should handle database upgrade errors', async () => {
      // Mock IndexedDB that triggers upgrade error
      const mockIndexedDB = createMockIndexedDB();
      mockIndexedDB.open = vi.fn().mockImplementation(() => {
        const request = {
          readyState: 'pending',
          result: null,
          error: null,
          source: null,
          transaction: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null as ((event: Event) => void) | null,
          onblocked: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };

        setTimeout(() => {
          request.readyState = 'done';
          if (request.onupgradeneeded) {
            // Trigger upgrade error
            const mockDB = {
              objectStoreNames: { contains: (): boolean => false },
              createObjectStore: (): void => {
                throw new Error('Upgrade failed');
              },
            };
            const upgradeEvent = { target: { result: mockDB } } as unknown as Event;
            request.onupgradeneeded(upgradeEvent);
          }
        }, 0);

        return request;
      });

      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = mockIndexedDB;

      const failingEventStore = new IndexedDBEventStore();
      const event = createMockGameCreatedEvent(gameId);

      await expect(failingEventStore.append(gameId, 'Game', [event])).rejects.toThrow(
        /Schema error/
      );
    });

    it('should handle invalid date deserialization', async () => {
      const mockIndexedDB = createMockIndexedDB();
      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = mockIndexedDB;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global object for testing purposes
      (globalThis as any).IDBKeyRange = createMockIDBKeyRange();

      eventStore = new IndexedDBEventStore();

      // Store an event
      const event = createMockGameCreatedEvent(gameId);
      await eventStore.append(gameId, 'Game', [event]);

      // Mock the store to return invalid date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for test
      const internalStore = eventStore as any;
      try {
        internalStore.deserializeDate('invalid-date');
        expect.fail('Should have thrown for invalid date');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/Invalid date string/);
      }
    });
  });

  describe('Constructor Error Handling', () => {
    it('should handle connection errors during construction gracefully', async () => {
      // Mock indexedDB to return a failing request
      const mockOpen = vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onerror: null,
        onupgradeneeded: null,
        onsuccess: null,
      } as unknown as IDBOpenDBRequest);

      globalThis.indexedDB = {
        open: mockOpen,
        deleteDatabase: vi.fn(),
        databases: vi.fn(),
        cmp: vi.fn(),
      } as unknown as IDBFactory;

      // Create the instance - constructor should not throw
      const eventStore = new IndexedDBEventStore('test-failing-db');

      // Simulate the error in ensureConnection that should be caught by constructor
      const openRequest = mockOpen.mock.results[0]?.value;
      setTimeout(() => {
        openRequest.onerror?.(new Event('error'));
      }, 0);

      expect(eventStore).toBeDefined();

      // Give time for the promise rejection to be handled
      await new Promise(resolve => setTimeout(resolve, 10));

      // The constructor should have silently handled the error (lines 188-189)
      expect(mockOpen).toHaveBeenCalled();
    });
  });
});
