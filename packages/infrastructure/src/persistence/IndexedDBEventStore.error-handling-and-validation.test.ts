/**
 * @file IndexedDBEventStore Error Handling and Validation Tests
 * @description Comprehensive tests for error handling, validation, and resilience scenarios
 *
 * This test file focuses on covering the most important remaining error scenarios:
 * - Browser incompatibility scenarios
 * - Complex serialization error cases
 * - Parameter validation edge cases
 * - Date parsing errors
 * - Non-standard error types in catch blocks
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  createMockGameCreatedEvent,
  createMockAtBatCompletedEvent,
} from '../test-utils/event-store';
import { createMockIndexedDB, createMockIDBKeyRange } from '../test-utils/indexeddb';

import { IndexedDBEventStore } from './IndexedDBEventStore';

describe('IndexedDBEventStore - Focused Error Coverage', () => {
  let mockIndexedDB: ReturnType<typeof createMockIndexedDB>;
  let eventStore: IndexedDBEventStore;

  beforeEach(() => {
    mockIndexedDB = createMockIndexedDB();
    globalThis.indexedDB = mockIndexedDB;
    globalThis.IDBKeyRange = createMockIDBKeyRange();
    eventStore = new IndexedDBEventStore('test-focused-errors');
  });

  afterEach(() => {
    eventStore.close();
    mockIndexedDB.deleteDatabase('test-focused-errors');
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle IndexedDB not available', async () => {
      // Create a new store without IndexedDB
      const originalIndexedDB = globalThis.indexedDB;
      delete (globalThis as unknown as { indexedDB: unknown }).indexedDB;

      const store = new IndexedDBEventStore('test-no-indexeddb');
      const gameId = GameId.generate();
      const events = [createMockGameCreatedEvent(gameId)];

      await expect(store.append(gameId, 'Game', events)).rejects.toThrow(
        'IndexedDB is not available in this browser'
      );

      // Cleanup
      globalThis.indexedDB = originalIndexedDB;
      store.close();
    });

    it('should handle corrupted indexedDB object (missing methods)', async () => {
      // Mock partially corrupted indexedDB
      const corruptedIndexedDB = {
        open: undefined as unknown,
        deleteDatabase: mockIndexedDB.deleteDatabase,
        cmp: mockIndexedDB.cmp,
      };
      globalThis.indexedDB = corruptedIndexedDB as unknown as IDBFactory;

      const store = new IndexedDBEventStore('test-corrupted');
      const gameId = GameId.generate();
      const events = [createMockGameCreatedEvent(gameId)];

      await expect(store.append(gameId, 'Game', events)).rejects.toThrow(
        'IndexedDB is not available in this browser'
      );

      store.close();
    });

    it('should handle null indexedDB.open method', async () => {
      // Mock null open method
      const nullOpenIndexedDB = {
        ...mockIndexedDB,
        open: null as unknown,
      };
      globalThis.indexedDB = nullOpenIndexedDB as unknown as IDBFactory;

      const store = new IndexedDBEventStore('test-null-open');
      const gameId = GameId.generate();
      const events = [createMockGameCreatedEvent(gameId)];

      await expect(store.append(gameId, 'Game', events)).rejects.toThrow(
        'IndexedDB is not available in this browser'
      );

      store.close();
    });
  });

  describe('Parameter Validation Edge Cases', () => {
    it('should handle invalid aggregateType in validation', async () => {
      const gameId = GameId.generate();
      const events = [createMockGameCreatedEvent(gameId)];

      // This should test the aggregateType validation error path
      await expect(eventStore.append(gameId, 'InvalidType' as never, events)).rejects.toThrow(
        'aggregateType must be one of: Game, TeamLineup, InningState'
      );
    });

    it('should handle invalid fromVersion parameter in getEvents', async () => {
      const gameId = GameId.generate();

      // Test negative fromVersion
      await expect(eventStore.getEvents(gameId, -1)).rejects.toThrow(
        'fromVersion must be a non-negative integer'
      );

      // Test non-integer fromVersion
      await expect(eventStore.getEvents(gameId, 3.14)).rejects.toThrow(
        'fromVersion must be a non-negative integer'
      );
    });

    it('should handle empty eventType in getEventsByType', async () => {
      await expect(eventStore.getEventsByType('')).rejects.toThrow(
        'eventType must be a non-empty string'
      );

      await expect(eventStore.getEventsByType('   ')).rejects.toThrow(
        'eventType must be a non-empty string'
      );
    });

    it('should handle invalid Date in getAllEvents', async () => {
      const invalidDate = new Date('invalid');
      await expect(eventStore.getAllEvents(invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });

    it('should handle invalid Date in getEventsByType', async () => {
      const invalidDate = new Date('invalid');
      await expect(eventStore.getEventsByType('GameCreated', invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });

    it('should handle invalid aggregateTypes array in getEventsByGameId', async () => {
      const gameId = GameId.generate();

      // Test non-array aggregateTypes
      await expect(eventStore.getEventsByGameId(gameId, 'NotAnArray' as never)).rejects.toThrow(
        'aggregateTypes must be an array or undefined'
      );

      // Test invalid aggregate types in array
      await expect(
        eventStore.getEventsByGameId(gameId, ['Game', 'InvalidType'] as never)
      ).rejects.toThrow('aggregateTypes must only contain valid aggregate types');
    });

    it('should handle invalid Date in getEventsByGameId', async () => {
      const gameId = GameId.generate();
      const invalidDate = new Date('invalid');

      await expect(eventStore.getEventsByGameId(gameId, undefined, invalidDate)).rejects.toThrow(
        'fromTimestamp must be a valid Date object'
      );
    });
  });

  describe('Serialization Error Edge Cases', () => {
    it('should handle serialization error for functions in event data', async () => {
      const gameId = GameId.generate();
      const eventWithFunction = {
        ...createMockGameCreatedEvent(gameId),
        invalidProp: (): string => 'function not allowed',
      };

      await expect(eventStore.append(gameId, 'Game', [eventWithFunction as never])).rejects.toThrow(
        'Event serialization failed'
      );
    });

    it('should handle serialization error for symbols in event data', async () => {
      const gameId = GameId.generate();
      const eventWithSymbol = {
        ...createMockGameCreatedEvent(gameId),
        invalidSymbol: Symbol('not serializable'),
      };

      await expect(eventStore.append(gameId, 'Game', [eventWithSymbol as never])).rejects.toThrow(
        'Event serialization failed'
      );
    });

    it('should handle nested function in event metadata', async () => {
      const gameId = GameId.generate();
      const eventWithNestedFunction = {
        ...createMockGameCreatedEvent(gameId),
        metadata: {
          normal: 'value',
          nested: {
            func: (): string => 'nested function',
          },
        },
      };

      await expect(
        eventStore.append(gameId, 'Game', [eventWithNestedFunction as never])
      ).rejects.toThrow('Event serialization failed');
    });

    it('should handle circular reference in event data', async () => {
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      // Create circular reference
      const circular: { event: unknown; self?: unknown } = { event };
      circular.self = circular;
      const eventWithCircular = {
        ...event,
        circular,
      };

      await expect(eventStore.append(gameId, 'Game', [eventWithCircular as never])).rejects.toThrow(
        'Event serialization failed'
      );
    });
  });

  describe('Date Parsing Error Cases', () => {
    it('should handle invalid date string in deserializeDate', () => {
      // Create an event with an invalid date string and test deserialization
      const eventStore = new IndexedDBEventStore('test-date-errors');

      // Access the private method for testing
      const deserializeDate = (
        eventStore as unknown as { deserializeDate: (input: unknown) => Date }
      ).deserializeDate.bind(eventStore);

      expect((): Date => deserializeDate('invalid-date-string')).toThrow(
        'Invalid date string: invalid-date-string'
      );

      expect((): Date => deserializeDate('2023-99-99')).toThrow('Invalid date string: 2023-99-99');

      expect((): Date => deserializeDate(123)).toThrow('Expected Date or date string, got: number');

      expect((): Date => deserializeDate(null)).toThrow(
        'Expected Date or date string, got: object'
      );

      eventStore.close();
    });
  });

  describe('Generic Error Handling Paths', () => {
    it('should handle string error in catch blocks', async () => {
      const gameId = GameId.generate();

      // Mock ensureConnection to throw a string
      const originalEnsureConnection = (
        eventStore as unknown as { ensureConnection: () => Promise<unknown> }
      ).ensureConnection;
      (eventStore as unknown as { ensureConnection: () => never }).ensureConnection = (): never => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing error handling for string values
        throw 'String error message';
      };

      try {
        await expect(
          eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)])
        ).rejects.toThrow('Failed to append events: String error message');
      } finally {
        (eventStore as unknown as { ensureConnection: () => Promise<unknown> }).ensureConnection =
          originalEnsureConnection;
      }
    });

    it('should handle null error in catch blocks', async () => {
      const gameId = GameId.generate();

      // Mock ensureConnection to throw null
      const originalEnsureConnection = (
        eventStore as unknown as { ensureConnection: () => Promise<unknown> }
      ).ensureConnection;
      (eventStore as unknown as { ensureConnection: () => never }).ensureConnection = (): never => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing error handling for null values
        throw null;
      };

      try {
        await expect(
          eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)])
        ).rejects.toThrow('Failed to append events: Unknown error');
      } finally {
        (eventStore as unknown as { ensureConnection: () => Promise<unknown> }).ensureConnection =
          originalEnsureConnection;
      }
    });

    it('should handle complex object error in catch blocks', async () => {
      const gameId = GameId.generate();

      // Mock ensureConnection to throw a complex object
      const originalEnsureConnection = (
        eventStore as unknown as { ensureConnection: () => Promise<unknown> }
      ).ensureConnection;
      (eventStore as unknown as { ensureConnection: () => never }).ensureConnection = (): never => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing error handling for complex objects
        throw { message: { nested: 'Complex nested error' }, code: 500 };
      };

      try {
        await expect(
          eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)])
        ).rejects.toThrow('Failed to append events: [object Object]');
      } finally {
        (eventStore as unknown as { ensureConnection: () => Promise<unknown> }).ensureConnection =
          originalEnsureConnection;
      }
    });

    it('should handle object with message property in catch blocks', async () => {
      const gameId = GameId.generate();

      // Mock ensureConnection to throw an object with message property
      const originalEnsureConnection = (
        eventStore as unknown as { ensureConnection: () => Promise<unknown> }
      ).ensureConnection;
      (eventStore as unknown as { ensureConnection: () => never }).ensureConnection = (): never => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing error handling for objects with message property
        throw { message: 'Object with message property' };
      };

      try {
        await expect(
          eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)])
        ).rejects.toThrow('Failed to append events: Object with message property');
      } finally {
        (eventStore as unknown as { ensureConnection: () => Promise<unknown> }).ensureConnection =
          originalEnsureConnection;
      }
    });
  });

  describe('Version Conflict Error Handling', () => {
    it('should handle version conflict during append', async () => {
      const gameId = GameId.generate();

      // First, append an event
      await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);

      // Now try to append with wrong expected version
      await expect(
        eventStore.append(gameId, 'Game', [createMockAtBatCompletedEvent(gameId)], 5)
      ).rejects.toThrow('Version conflict for stream');
    });
  });

  describe('Database Connection Error Scenarios', () => {
    it('should handle database close after connection', async () => {
      const gameId = GameId.generate();

      // First establish connection
      await eventStore.append(gameId, 'Game', [createMockGameCreatedEvent(gameId)]);

      // Test the close method
      eventStore.close();

      // Verify database is closed by checking if db property is null
      expect((eventStore as unknown as { db: unknown }).db).toBe(null);
    });

    it('should handle multiple close calls gracefully', () => {
      // Test multiple close calls don't cause errors
      eventStore.close();
      eventStore.close();
      eventStore.close();

      // Should not throw any errors
      expect((eventStore as unknown as { db: unknown }).db).toBe(null);
    });
  });

  describe('Event Validation Edge Cases', () => {
    it('should handle null events array', async () => {
      const gameId = GameId.generate();

      await expect(eventStore.append(gameId, 'Game', null as never)).rejects.toThrow(
        'events cannot be null or undefined'
      );
    });

    it('should handle undefined events array', async () => {
      const gameId = GameId.generate();

      await expect(eventStore.append(gameId, 'Game', undefined as never)).rejects.toThrow(
        'events cannot be null or undefined'
      );
    });

    it('should handle non-array events parameter', async () => {
      const gameId = GameId.generate();

      await expect(eventStore.append(gameId, 'Game', 'not an array' as never)).rejects.toThrow(
        'events must be an array'
      );
    });

    it('should handle null streamId parameter', async () => {
      const events = [createMockGameCreatedEvent(GameId.generate())];

      await expect(eventStore.append(null as never, 'Game', events)).rejects.toThrow(
        'streamId cannot be null or undefined'
      );
    });

    it('should handle undefined streamId parameter', async () => {
      const events = [createMockGameCreatedEvent(GameId.generate())];

      await expect(eventStore.append(undefined as never, 'Game', events)).rejects.toThrow(
        'streamId cannot be null or undefined'
      );
    });
  });
});
