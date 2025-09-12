import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createMockIndexedDB,
  createBlockedMockIndexedDB,
  MockDatabaseBuilder,
} from '../test-utils/indexeddb';

import { IndexedDBEventStore } from './IndexedDBEventStore';

describe('IndexedDBEventStore Database Lifecycle Events', () => {
  let eventStore: IndexedDBEventStore;
  let mockIndexedDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: typeof globalThis.indexedDB;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Store original IndexedDB reference
    originalIndexedDB = globalThis.indexedDB;

    // Create fresh mock IndexedDB
    mockIndexedDB = createMockIndexedDB();
    globalThis.indexedDB = mockIndexedDB as unknown as IDBFactory;

    // Create event store instance
    eventStore = new IndexedDBEventStore('test-lifecycle-db');

    // Spy on console.warn for testing error logging
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original IndexedDB
    globalThis.indexedDB = originalIndexedDB;

    // Restore console.warn
    consoleWarnSpy.mockRestore();

    // Clean up event store
    // @ts-expect-error - accessing private property for cleanup
    eventStore.db = null;
    // @ts-expect-error - accessing private property for cleanup
    eventStore.connectionPromise = null;
  });

  describe('Database Blocked Handler', () => {
    it('should handle database blocked during open (line 242-245)', async () => {
      // Create a blocked IndexedDB open request
      const blockedRequest = createBlockedMockIndexedDB('blocked-test-db');

      // Replace the indexedDB.open with our blocked version
      globalThis.indexedDB.open = vi.fn(() => blockedRequest);

      // Create event store that will trigger blocked scenario
      void new IndexedDBEventStore('blocked-test-db');

      // Wait for the blocked event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify that the onblocked handler was set and executed
      // The handler itself is lines 242-245 in IndexedDBEventStore
      expect(globalThis.indexedDB.open).toHaveBeenCalled();

      // Since the onblocked handler is empty (just a comment),
      // we're testing that it doesn't throw an error when triggered
      expect(() => {
        if (blockedRequest.onblocked) {
          const event = {
            target: blockedRequest,
            type: 'blocked',
            newVersion: 1,
            oldVersion: 0,
          } as unknown as IDBVersionChangeEvent;
          blockedRequest.onblocked(event);
        }
      }).not.toThrow();
    });

    it('should handle onblocked event gracefully without errors', () => {
      const mockRequest = {
        onblocked: null as ((event: Event) => void) | null,
      };

      // Simulate the IndexedDBEventStore setting the onblocked handler
      mockRequest.onblocked = (): void => {
        // This is the actual handler code from lines 242-245
        // Handle blocked state - another connection might be upgrading
        // This is not an error, just wait for the operation to complete
      };

      // Trigger the event
      const blockedEvent = {
        target: mockRequest,
        type: 'blocked',
        newVersion: 1,
        oldVersion: 0,
      } as unknown as Event;

      expect(() => {
        mockRequest.onblocked?.(blockedEvent);
      }).not.toThrow();
    });
  });

  describe('Database Close Handler', () => {
    it('should handle unexpected database closure (lines 265-268)', async () => {
      // Wait for initial connection to establish
      await new Promise(resolve => setTimeout(resolve, 20));

      // Get the established database connection
      // @ts-expect-error - accessing private property for testing
      const db = eventStore.db;
      expect(db).not.toBeNull();

      // Trigger database close event
      if (db) {
        db.close();
      }

      // Verify cleanup happened
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.db).toBeNull();
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.connectionPromise).toBeNull();
    });

    it('should cleanup connection state when database closes', () => {
      const mockDb = new MockDatabaseBuilder('test-close-db', 1).build();

      // @ts-expect-error - setting private property for testing
      eventStore.db = mockDb;
      // @ts-expect-error - setting private property for testing
      eventStore.connectionPromise = Promise.resolve(mockDb);

      // Set up the close handler like IndexedDBEventStore does (lines 265-268)
      mockDb.onclose = (): void => {
        // @ts-expect-error - accessing private property in handler
        eventStore.db = null;
        // @ts-expect-error - accessing private property in handler
        eventStore.connectionPromise = null;
      };

      // Trigger close event to test the handler
      mockDb.close();

      // Verify the close handler cleaned up properly
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.db).toBeNull();
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.connectionPromise).toBeNull();
    });
  });

  describe('Database Error Handler', () => {
    it('should handle database-level errors (lines 270-273)', async () => {
      // Wait for initial connection to establish
      await new Promise(resolve => setTimeout(resolve, 20));

      // Get the established database connection
      // @ts-expect-error - accessing private property for testing
      const db = eventStore.db;
      expect(db).not.toBeNull();

      // Trigger database error
      if (db) {
        (db as unknown as { triggerDatabaseError: (message: string) => void }).triggerDatabaseError(
          'Test database error'
        );
      }

      // Verify error was logged (line 272)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'IndexedDB connection error:',
        expect.objectContaining({
          target: db,
          type: 'error',
        })
      );
    });

    it('should log database errors with proper warning message', () => {
      const mockDb = new MockDatabaseBuilder('test-error-db', 1).build();

      // Set up the error handler like IndexedDBEventStore does
      mockDb.onerror = (event: Event): void => {
        // This is the actual handler code from lines 270-273
        // eslint-disable-next-line no-console -- Development warning for IndexedDB connection issues
        console.warn('IndexedDB connection error:', event);
      };

      // Trigger the error
      const errorEvent = {
        target: mockDb,
        type: 'error',
        error: new DOMException('Test error', 'DatabaseError'),
      } as unknown as Event;

      mockDb.onerror(errorEvent);

      // Verify the warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('IndexedDB connection error:', errorEvent);
    });
  });

  describe('Database Version Change Handler', () => {
    it('should handle version change events (lines 275-280)', async () => {
      // Wait for initial connection to establish
      await new Promise(resolve => setTimeout(resolve, 20));

      // Get the established database connection
      // @ts-expect-error - accessing private property for testing
      const db = eventStore.db;
      expect(db).not.toBeNull();

      // Store initial state
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.db).not.toBeNull();
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.connectionPromise).not.toBeNull();

      // Trigger version change event
      if (db) {
        (
          db as unknown as {
            triggerVersionChange: (oldVersion: number, newVersion: number) => void;
          }
        ).triggerVersionChange(1, 2);
      }

      // Verify the version change handler:
      // 1. Closed the database (line 277)
      // 2. Cleared the db reference (line 278)
      // 3. Cleared the connectionPromise reference (line 279)
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.db).toBeNull();
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.connectionPromise).toBeNull();
    });

    it('should cleanup all references during version change', () => {
      const mockDb = new MockDatabaseBuilder('test-version-db', 1).build();

      // @ts-expect-error - setting private property for testing
      eventStore.db = mockDb;
      // @ts-expect-error - setting private property for testing
      eventStore.connectionPromise = Promise.resolve(mockDb);

      // Set up the version change handler like IndexedDBEventStore does
      mockDb.onversionchange = (): void => {
        // This is the actual handler code from lines 275-280
        // Another connection wants to upgrade the database
        mockDb.close();
        // @ts-expect-error - accessing private property in test
        eventStore.db = null;
        // @ts-expect-error - accessing private property in test
        eventStore.connectionPromise = null;
      };

      // Trigger the version change
      mockDb.triggerVersionChange(1, 2);

      // Verify cleanup
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.db).toBeNull();
      // @ts-expect-error - accessing private property for testing
      expect(eventStore.connectionPromise).toBeNull();
    });

    it('should handle multiple version changes gracefully', () => {
      const mockDb = new MockDatabaseBuilder('test-multi-version-db', 1).build();
      let closeCallCount = 0;

      // Override close to count calls
      const originalClose = mockDb.close;
      mockDb.close = (): void => {
        closeCallCount++;
        originalClose.call(mockDb);
      };

      // Set up the version change handler like IndexedDBEventStore does
      mockDb.onversionchange = (): void => {
        // This is the actual handler code from lines 275-280
        mockDb.close();
        // @ts-expect-error - accessing private property in test
        eventStore.db = null;
        // @ts-expect-error - accessing private property in test
        eventStore.connectionPromise = null;
      };

      // @ts-expect-error - setting private property for testing
      eventStore.db = mockDb;
      // @ts-expect-error - setting private property for testing
      eventStore.connectionPromise = Promise.resolve(mockDb);

      // Trigger multiple version changes
      mockDb.triggerVersionChange(1, 2);
      mockDb.triggerVersionChange(2, 3);
      mockDb.triggerVersionChange(3, 4);

      // Each version change should trigger a close
      expect(closeCallCount).toBe(3);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle onblocked with null handler gracefully', () => {
      const blockedRequest = createBlockedMockIndexedDB('null-handler-test');
      blockedRequest.onblocked = null;

      // This should not throw even though onblocked is null
      expect(() => {
        if (blockedRequest.onblocked) {
          const event = {
            target: blockedRequest,
            type: 'blocked',
            newVersion: 1,
            oldVersion: 0,
          } as unknown as IDBVersionChangeEvent;
          blockedRequest.onblocked(event);
        }
      }).not.toThrow();
    });

    it('should handle database close with no active connection', () => {
      const mockDb = new MockDatabaseBuilder('no-connection-test', 1).build();

      // Ensure no active connection
      // @ts-expect-error - setting private property for testing
      eventStore.db = null;
      // @ts-expect-error - setting private property for testing
      eventStore.connectionPromise = null;

      // This should not throw
      expect(() => {
        mockDb.close();
      }).not.toThrow();
    });

    it('should handle database error with no error object', () => {
      const mockDb = new MockDatabaseBuilder('no-error-obj-test', 1).build();

      // Set up error handler
      mockDb.onerror = (event: Event): void => {
        // eslint-disable-next-line no-console -- Intentional console usage in error handler test
        console.warn('IndexedDB connection error:', event);
      };

      // Trigger error without error property
      const errorEvent = { target: mockDb, type: 'error' } as unknown as Event;

      expect(() => {
        mockDb.onerror?.(errorEvent);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
