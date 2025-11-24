/**
 * @file Mock Database Builder
 * Builder pattern and factory functions for creating mock IndexedDB environments
 */

import { vi } from 'vitest';

import { MockIDBDatabase, MockIDBObjectStore } from './MockIndexedDB';

/**
 * Creates a comprehensive mock implementation of the IDBKeyRange global for testing.
 *
 * Provides a complete mock of IndexedDB's key range functionality, supporting
 * all standard range operations (only, bound, upperBound, lowerBound) with
 * proper key comparison logic for EventStore testing scenarios.
 *
 * @returns Mock IDBKeyRange constructor with all static methods implemented
 *
 * @remarks
 * This mock handles complex key comparison scenarios including:
 * - Object keys with nested value properties (common in domain value objects)
 * - Numeric range comparisons with open/closed bounds
 * - Proper includes() method implementation for cursor filtering
 *
 * The mock is designed to behave identically to browser IDBKeyRange for
 * all softball game EventStore test scenarios while being deterministic
 * and controllable in test environments.
 *
 * @example
 * ```typescript
 * const mockKeyRange = createMockIDBKeyRange();
 * global.IDBKeyRange = mockKeyRange;
 *
 * // Use like real IDBKeyRange
 * const range = IDBKeyRange.bound(startKey, endKey);
 * expect(range.includes(testKey)).toBe(true);
 * ```
 */
export const createMockIDBKeyRange = (): typeof IDBKeyRange => {
  // Create a mock constructor function
  const MockKeyRangeConstructor = vi.fn() as unknown as typeof IDBKeyRange;

  // Set up prototype
  MockKeyRangeConstructor.prototype = {} as IDBKeyRange;
  MockKeyRangeConstructor.only = vi.fn((value: unknown) => ({
    lower: value,
    upper: value,
    lowerOpen: false,
    upperOpen: false,
    includes: vi.fn((key: unknown) => key === value),
  })) as typeof IDBKeyRange.only;
  MockKeyRangeConstructor.bound = vi.fn(
    (lower: unknown, upper: unknown, lowerOpen = false, upperOpen = false) => ({
      lower,
      upper,
      lowerOpen,
      upperOpen,
      includes: vi.fn((key: unknown) => {
        const keyValue =
          typeof key === 'object' && key !== null && 'value' in key
            ? (key as { value: unknown }).value
            : key;
        const lowerValue =
          typeof lower === 'object' && lower !== null && 'value' in lower
            ? (lower as { value: unknown }).value
            : lower;
        const upperValue =
          typeof upper === 'object' && upper !== null && 'value' in upper
            ? (upper as { value: unknown }).value
            : upper;

        const aboveLower = lowerOpen
          ? (keyValue as number) > (lowerValue as number)
          : (keyValue as number) >= (lowerValue as number);
        const belowUpper = upperOpen
          ? (keyValue as number) < (upperValue as number)
          : (keyValue as number) <= (upperValue as number);
        return aboveLower && belowUpper;
      }),
    })
  ) as typeof IDBKeyRange.bound;
  MockKeyRangeConstructor.upperBound = vi.fn((upper: unknown, upperOpen = false) => ({
    lower: undefined,
    upper,
    lowerOpen: false,
    upperOpen,
    includes: vi.fn((key: unknown) => {
      const keyValue =
        typeof key === 'object' && key !== null && 'value' in key
          ? (key as { value: unknown }).value
          : key;
      const upperValue =
        typeof upper === 'object' && upper !== null && 'value' in upper
          ? (upper as { value: unknown }).value
          : upper;
      return upperOpen
        ? (keyValue as number) < (upperValue as number)
        : (keyValue as number) <= (upperValue as number);
    }),
  })) as typeof IDBKeyRange.upperBound;
  MockKeyRangeConstructor.lowerBound = vi.fn((lower: unknown, lowerOpen = false) => ({
    lower,
    upper: undefined,
    lowerOpen,
    upperOpen: false,
    includes: vi.fn((key: unknown) => {
      const keyValue =
        typeof key === 'object' && key !== null && 'value' in key
          ? (key as { value: unknown }).value
          : key;
      const lowerValue =
        typeof lower === 'object' && lower !== null && 'value' in lower
          ? (lower as { value: unknown }).value
          : lower;
      return lowerOpen
        ? (keyValue as number) > (lowerValue as number)
        : (keyValue as number) >= (lowerValue as number);
    }),
  })) as typeof IDBKeyRange.lowerBound;

  return MockKeyRangeConstructor;
};

/**
 * Creates a mock implementation of the IndexedDB global API for testing EventStore operations.
 *
 * Provides a complete mock of the browser's indexedDB global object, including
 * database opening, deletion, and utility methods. Designed to simulate real
 * IndexedDB behavior for softball game EventStore testing without requiring
 * an actual browser environment.
 *
 * @returns Mock indexedDB object with all required methods and realistic async behavior
 *
 * @remarks
 * Key features of this mock:
 * - Simulates asynchronous database opening with proper event sequencing
 * - Supports onupgradeneeded for schema creation scenarios
 * - Provides realistic database deletion behavior
 * - Implements key comparison utilities used by EventStore
 *
 * The mock uses setTimeout to simulate the asynchronous nature of IndexedDB
 * operations, ensuring tests properly handle the async lifecycle.
 *
 * @example
 * ```typescript
 * const mockIndexedDB = createMockIndexedDB();
 * global.indexedDB = mockIndexedDB;
 *
 * // Use like real indexedDB
 * const request = indexedDB.open('tw-softball-events', 1);
 * request.onsuccess = (event) => {
 *   const db = event.target.result;
 *   // db is now a MockIDBDatabase instance
 * };
 * ```
 */
export const createMockIndexedDB = (): {
  open: ReturnType<typeof vi.fn>;
  deleteDatabase: ReturnType<typeof vi.fn>;
  cmp: ReturnType<typeof vi.fn>;
  databases: ReturnType<typeof vi.fn>;
} => ({
  open: vi.fn((name: string, version?: number) => {
    const request = {
      readyState: 'pending',
      result: null as MockIDBDatabase | null,
      error: null,
      source: null,
      transaction: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
      onblocked: null as ((event: Event) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    // Simulate async operation
    setTimeout(() => {
      const db = new MockIDBDatabase(name, version || 1);
      request.result = db;

      // First trigger onupgradeneeded for schema creation (simulates first-time database creation)
      if (request.onupgradeneeded) {
        const upgradeEvent = {
          target: request,
          oldVersion: 0,
          newVersion: version || 1,
        } as unknown as IDBVersionChangeEvent;
        request.onupgradeneeded(upgradeEvent);
      }

      // Then trigger onsuccess
      request.readyState = 'done';
      if (request.onsuccess) {
        const successEvent = { target: request } as unknown as Event;
        request.onsuccess(successEvent);
      }
    }, 0);

    return request as unknown as IDBOpenDBRequest;
  }),
  deleteDatabase: vi.fn(() => {
    const request = {
      readyState: 'pending',
      result: null,
      error: null,
      source: null,
      transaction: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onblocked: null as ((event: Event) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    // Simulate async database deletion
    setTimeout(() => {
      request.readyState = 'done';
      if (request.onsuccess) {
        const successEvent = { target: request } as unknown as Event;
        request.onsuccess(successEvent);
      }
    }, 0);

    return request as unknown as IDBOpenDBRequest;
  }),
  cmp: vi.fn((first: unknown, second: unknown) => {
    if (first === second) return 0;
    return (first as number) < (second as number) ? -1 : 1;
  }),
  databases: vi.fn(() => Promise.resolve([])),
});

/**
 * Creates a mock IndexedDB open request that will trigger the onblocked event
 * @param name - Database name
 * @param version - Database version
 * @returns Mock request that triggers onblocked
 */
export const createBlockedMockIndexedDB = (_name: string, _version?: number): IDBOpenDBRequest => {
  const request = {
    readyState: 'pending',
    result: null as MockIDBDatabase | null,
    error: null,
    source: null,
    transaction: null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    onblocked: null as ((event: Event) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  // Simulate blocked database operation
  setTimeout(() => {
    if (request.onblocked) {
      const blockedEvent = {
        target: request,
        type: 'blocked',
        oldVersion: _version || 1,
        newVersion: _version || 1,
      } as unknown as Event;
      request.onblocked(blockedEvent);
    }
  }, 0);

  return request as unknown as IDBOpenDBRequest;
};

/**
 * Fluent builder for constructing mock IndexedDB databases with realistic EventStore schemas.
 *
 * Provides a chainable API for setting up complete mock database environments
 * that mirror the actual IndexedDB structure used by the TW Softball EventStore.
 * Essential for creating consistent test fixtures across all EventStore tests.
 *
 * @remarks
 * The builder pattern enables:
 * - Readable test setup with method chaining
 * - Consistent database schema across tests
 * - Isolation between test cases through fresh instances
 * - Easy customization for specific test scenarios
 *
 * Each builder instance creates an independent mock database, ensuring
 * test isolation and preventing data leakage between test cases.
 *
 * @example
 * ```typescript
 * const database = new MockDatabaseBuilder('test-events', 1)
 *   .withObjectStore('events', { keyPath: 'eventId' })
 *     .withIndex('streamId', 'streamId')
 *     .withIndex('gameId', 'metadata.gameId')
 *     .withData('event-1', mockGameCreatedEvent)
 *   .done()
 *   .withObjectStore('snapshots', { keyPath: 'aggregateId' })
 *     .withIndex('aggregateType', 'aggregateType')
 *   .build();
 * ```
 */
export class MockDatabaseBuilder {
  private readonly db: MockIDBDatabase;

  /**
   * Creates a new database builder with the specified name and version.
   *
   * @param name - Database name (defaults to 'tw-softball-events')
   * @param version - Database version number (defaults to 1)
   */
  constructor(name: string = 'tw-softball-events', version: number = 1) {
    this.db = new MockIDBDatabase(name, version);
  }

  /**
   * Adds an object store to the mock database and returns a store builder for further configuration.
   *
   * Creates a new object store with the specified name and options, then returns
   * a MockObjectStoreBuilder to enable fluent configuration of indexes and test data.
   *
   * @param name - Object store name (e.g., 'events', 'snapshots')
   * @param options - IndexedDB object store configuration
   * @returns MockObjectStoreBuilder for further store configuration
   *
   * @example
   * ```typescript
   * builder.withObjectStore('events', { keyPath: 'eventId', autoIncrement: false })
   *   .withIndex('timestamp', 'timestamp')
   *   .withData('test-event-1', mockEventData)
   * ```
   */
  withObjectStore(
    name: string,
    options: IDBObjectStoreParameters = { keyPath: 'eventId' }
  ): MockObjectStoreBuilder {
    const objectStore = this.db.createObjectStore(name, options) as MockIDBObjectStore &
      IDBObjectStore;
    return new MockObjectStoreBuilder(this, objectStore);
  }

  /**
   * Completes database construction and returns the configured MockIDBDatabase instance.
   *
   * @returns Fully configured mock database ready for use in tests
   */
  build(): MockIDBDatabase {
    return this.db;
  }
}

/**
 * Fluent builder for configuring individual mock object stores with indexes and test data.
 *
 * Provides chainable methods for setting up object store indexes, populating test data,
 * and managing the transition back to database-level configuration. Essential for
 * creating realistic EventStore schemas in test environments.
 *
 * @remarks
 * This builder enables:
 * - Index creation with proper configuration
 * - Test data population for realistic scenarios
 * - Seamless transition between store and database configuration
 * - Method chaining for readable test setup
 *
 * @example
 * ```typescript
 * storeBuilder
 *   .withIndex('streamId', 'streamId', { unique: false })
 *   .withIndex('eventType', 'eventType', { unique: false })
 *   .withData('event-1', mockGameCreatedEvent)
 *   .withData('event-2', mockAtBatEvent)
 *   .done() // Returns to database builder
 *   .withObjectStore('metadata') // Configure another store
 * ```
 */
export class MockObjectStoreBuilder {
  /**
   * Creates a new object store builder linked to the parent database builder.
   *
   * @param databaseBuilder - Parent database builder for returning after store configuration
   * @param objectStore - The mock object store instance to configure
   */
  constructor(
    private readonly databaseBuilder: MockDatabaseBuilder,
    private readonly objectStore: MockIDBObjectStore & IDBObjectStore
  ) {}

  /**
   * Adds an index to the object store for efficient querying in EventStore operations.
   *
   * Creates an IndexedDB index that enables fast lookups by specific fields,
   * essential for EventStore query patterns like finding events by game ID,
   * event type, or timestamp ranges.
   *
   * @param name - Index name for reference in queries
   * @param keyPath - Field path to index (supports nested paths like 'metadata.gameId')
   * @param options - Index configuration (unique, multiEntry)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * storeBuilder
   *   .withIndex('gameId', 'metadata.gameId', { unique: false })
   *   .withIndex('timestamp', 'timestamp', { unique: false })
   *   .withIndex('eventId', 'eventId', { unique: true })
   * ```
   */
  withIndex(
    name: string,
    keyPath: string | string[],
    options: IDBIndexParameters = { unique: false }
  ): MockObjectStoreBuilder {
    this.objectStore.createIndex(name, keyPath, options);
    return this;
  }

  /**
   * Populates the object store with test data for realistic testing scenarios.
   *
   * Adds pre-defined data to the mock object store, enabling tests to work
   * with realistic data sets without needing to set up complex test fixtures
   * during each test execution.
   *
   * @param key - Primary key for the data record
   * @param value - Data object to store (typically a serialized event or domain object)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * storeBuilder
   *   .withData('game-123-event-1', {
   *     eventId: 'event-1',
   *     streamId: 'game-123',
   *     eventType: 'GameCreated',
   *     eventData: JSON.stringify(gameCreatedEvent)
   *   })
   *   .withData('game-123-event-2', {
   *     eventId: 'event-2',
   *     streamId: 'game-123',
   *     eventType: 'AtBatCompleted',
   *     eventData: JSON.stringify(atBatEvent)
   *   })
   * ```
   */
  withData(key: string, value: unknown): MockObjectStoreBuilder {
    this.objectStore.setMockData(key, value);
    return this;
  }

  /**
   * Completes object store configuration and returns to the database builder.
   *
   * Enables continued database configuration with additional object stores
   * or completion of the entire database setup process.
   *
   * @returns Parent database builder for further configuration
   */
  done(): MockDatabaseBuilder {
    return this.databaseBuilder;
  }

  /**
   * Completes configuration and returns the fully built mock database.
   *
   * Shortcut method that completes object store configuration and
   * immediately builds the final database instance.
   *
   * @returns Fully configured mock database ready for use in tests
   */
  build(): MockIDBDatabase {
    return this.databaseBuilder.build();
  }
}

/**
 * Factory function for creating a standard TW Softball EventStore mock database.
 *
 * Provides a pre-configured mock database with the exact schema used by the
 * production EventStore implementations, including all required object stores
 * and indexes for efficient event querying and game state reconstruction.
 *
 * @returns Fully configured mock database matching production EventStore schema
 *
 * @remarks
 * This factory creates the standard EventStore schema:
 * - 'events' object store with keyPath 'eventId'
 * - Indexes for: streamId, aggregateType, eventType, timestamp, gameId
 *
 * The schema matches exactly what IndexedDBEventStore expects, ensuring
 * test compatibility with production code paths.
 *
 * @example
 * ```typescript
 * // Simple setup for EventStore tests
 * const mockDatabase = createEventStoreMockDatabase();
 * const eventStore = new IndexedDBEventStore();
 * eventStore.setDatabase(mockDatabase);
 *
 * // Now eventStore works with the mock database
 * await eventStore.append(gameId, 'Game', events);
 * ```
 */
export const createEventStoreMockDatabase = (): MockIDBDatabase => {
  return new MockDatabaseBuilder('tw-softball-events', 1)
    .withObjectStore('events', { keyPath: 'eventId' })
    .withIndex('streamId', 'streamId', { unique: false })
    .withIndex('aggregateType', 'aggregateType', { unique: false })
    .withIndex('eventType', 'eventType', { unique: false })
    .withIndex('timestamp', 'timestamp', { unique: false })
    .withIndex('gameId', 'metadata.gameId', { unique: false })
    .build();
};

/**
 * Configures the global test environment with IndexedDB mocks for EventStore testing.
 *
 * Replaces the global indexedDB and IDBKeyRange objects with comprehensive mocks,
 * enabling EventStore tests to run in Node.js environments without requiring
 * browser APIs or additional test dependencies.
 *
 * @remarks
 * This function should be called in test setup (beforeEach, beforeAll, or test file setup)
 * to ensure all IndexedDB operations use the mock implementations. The mocks provide
 * realistic behavior for all EventStore operations while being deterministic and fast.
 *
 * Call `cleanupIndexedDBMocks()` after tests to restore the original environment.
 *
 * @example
 * ```typescript
 * // In test setup
 * beforeEach(() => {
 *   setupIndexedDBMocks();
 * });
 *
 * afterEach(() => {
 *   cleanupIndexedDBMocks();
 * });
 *
 * // Tests can now use EventStore with IndexedDB operations
 * it('should store events', async () => {
 *   const eventStore = new IndexedDBEventStore();
 *   await eventStore.append(gameId, 'Game', events);
 *   // Test continues with mocked IndexedDB...
 * });
 * ```
 */
export const setupIndexedDBMocks = (): void => {
  const mockIndexedDB = createMockIndexedDB();
  const mockIDBKeyRange = createMockIDBKeyRange();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).indexedDB = mockIndexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IDBKeyRange = mockIDBKeyRange;
};

/**
 * Removes IndexedDB mocks from the global environment to restore original state.
 *
 * Cleans up the global mock objects installed by `setupIndexedDBMocks()`,
 * ensuring tests don't interfere with each other and that the test environment
 * returns to its original state after IndexedDB mock usage.
 *
 * @remarks
 * This function should be called in test teardown (afterEach, afterAll) to
 * prevent mock leakage between tests and maintain test isolation.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   cleanupIndexedDBMocks();
 * });
 * ```
 */
export const cleanupIndexedDBMocks = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).indexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IDBKeyRange;
};
