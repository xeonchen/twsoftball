import { GameId } from '@twsoftball/domain';
import { DomainEvent } from '@twsoftball/shared';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createMockIndexedDB,
  MockDatabaseBuilder,
  createMockIDBKeyRange,
} from '../test-utils/indexeddb';

import { IndexedDBEventStore } from './IndexedDBEventStore';

describe('IndexedDBEventStore Simple Transaction Error Tests', () => {
  let eventStore: IndexedDBEventStore;
  let mockIndexedDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: typeof globalThis.indexedDB;
  let gameId: GameId;

  beforeEach(() => {
    // Store original IndexedDB reference
    originalIndexedDB = globalThis.indexedDB;

    // Create fresh mock IndexedDB
    mockIndexedDB = createMockIndexedDB();
    globalThis.indexedDB = mockIndexedDB as unknown as IDBFactory;

    // Set up IDBKeyRange mock
    globalThis.IDBKeyRange = createMockIDBKeyRange();

    // Create event store instance
    eventStore = new IndexedDBEventStore('test-simple-tx-errors-db');

    // Create test game ID
    gameId = GameId.generate();
  });

  afterEach(() => {
    // Restore original IndexedDB
    globalThis.indexedDB = originalIndexedDB;

    // Clean up event store
    // @ts-expect-error - accessing private property for cleanup
    eventStore.db = null;
    // @ts-expect-error - accessing private property for cleanup
    eventStore.connectionPromise = null;
  });

  it('should handle append transaction error (lines 491-498)', async () => {
    // Set up database with transaction that will fail
    const mockDb = new MockDatabaseBuilder('append-tx-error', 1)
      .withObjectStore('events', { keyPath: 'eventId' })
      .withIndex('streamId', 'streamId')
      .build();

    // Make transaction fail
    mockDb.transaction = vi.fn(() => {
      const mockTransaction = {
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onerror: null as ((event: Event) => void) | null,
        oncomplete: null,
        onabort: null,
        mode: 'readwrite',
        db: mockDb,
        error: null,
      };

      // Trigger transaction error after it's set up
      setTimeout(() => {
        if (mockTransaction.onerror) {
          const errorEvent = {
            target: mockTransaction,
            type: 'error',
            error: new DOMException('Transaction failed', 'TransactionError'),
          } as unknown as Event;
          mockTransaction.onerror(errorEvent);
        }
      }, 0);

      return mockTransaction;
    });

    // @ts-expect-error - setting private property for testing
    eventStore.db = mockDb;

    const testEvent: DomainEvent = {
      eventId: 'test-event-1',
      type: 'TestEvent',
      timestamp: new Date(),
      aggregateVersion: 1,
      version: 1,
      gameId: GameId.generate(),
    };

    // This should reject due to transaction error
    await expect(eventStore.append(gameId, 'Game', [testEvent])).rejects.toThrow(
      'Failed to append events'
    );
  });

  it('should handle getAllEvents transaction error (lines 782-789)', async () => {
    const mockDb = new MockDatabaseBuilder('getallevents-tx-error', 1)
      .withObjectStore('events', { keyPath: 'eventId' })
      .build();

    mockDb.transaction = vi.fn(() => {
      const mockTransaction = {
        objectStore: vi.fn(() => ({
          openCursor: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        onerror: null as ((event: Event) => void) | null,
        oncomplete: null,
        onabort: null,
        mode: 'readonly',
        db: mockDb,
        error: null,
      };

      // Trigger transaction error
      setTimeout(() => {
        if (mockTransaction.onerror) {
          const errorEvent = {
            target: mockTransaction,
            type: 'error',
            error: new DOMException('Transaction failed', 'TransactionError'),
          } as unknown as Event;
          mockTransaction.onerror(errorEvent);
        }
      }, 0);

      return mockTransaction;
    });

    // @ts-expect-error - setting private property for testing
    eventStore.db = mockDb;

    // Test the actual error message pattern from the implementation
    await expect(eventStore.getAllEvents()).rejects.toThrow();
  });
});
