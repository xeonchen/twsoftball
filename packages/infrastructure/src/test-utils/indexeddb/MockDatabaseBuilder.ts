/**
 * @file Mock Database Builder
 * Builder pattern and factory functions for creating mock IndexedDB environments
 */

import { vi } from 'vitest';

import { MockIDBDatabase, MockIDBObjectStore } from './MockIndexedDB';

/**
 * Mock IDBKeyRange global
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
 * Mock indexedDB global factory
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
  deleteDatabase: vi.fn(() => ({
    readyState: 'pending',
    result: null,
    error: null,
    source: null,
    transaction: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  cmp: vi.fn((first: unknown, second: unknown) => {
    if (first === second) return 0;
    return (first as number) < (second as number) ? -1 : 1;
  }),
  databases: vi.fn(() => Promise.resolve([])),
});

/**
 * Builder class for setting up mock IndexedDB databases with fluent API
 */
export class MockDatabaseBuilder {
  private readonly db: MockIDBDatabase;

  constructor(name: string = 'tw-softball-events', version: number = 1) {
    this.db = new MockIDBDatabase(name, version);
  }

  /**
   * Creates a new object store in the database
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
   * Returns the built database
   */
  build(): MockIDBDatabase {
    return this.db;
  }
}

/**
 * Builder class for configuring mock object stores
 */
export class MockObjectStoreBuilder {
  constructor(
    private readonly databaseBuilder: MockDatabaseBuilder,
    private readonly objectStore: MockIDBObjectStore & IDBObjectStore
  ) {}

  /**
   * Creates an index on the object store
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
   * Sets mock data on the object store
   */
  withData(key: string, value: unknown): MockObjectStoreBuilder {
    this.objectStore.setMockData(key, value);
    return this;
  }

  /**
   * Returns to the database builder to configure more stores
   */
  done(): MockDatabaseBuilder {
    return this.databaseBuilder;
  }

  /**
   * Finishes configuration and returns the built database
   */
  build(): MockIDBDatabase {
    return this.databaseBuilder.build();
  }
}

/**
 * Convenience factory for creating a standard EventStore database
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
 * Sets up the global IndexedDB mock environment
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
 * Cleans up global mocks
 */
export const cleanupIndexedDBMocks = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).indexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IDBKeyRange;
};
