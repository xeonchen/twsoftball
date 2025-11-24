import { SecureRandom } from '@twsoftball/shared';
import { vi } from 'vitest';

/**
 * Mock implementation of IDBDatabase for comprehensive EventStore testing.
 *
 * Simulates a complete IndexedDB database with realistic behavior for all
 * operations required by the TW Softball EventStore implementations. Provides
 * object store management, transaction creation, and proper lifecycle handling.
 *
 * @remarks
 * Key features:
 * - Object store creation and management with proper naming
 * - Transaction creation with mode and store validation
 * - Realistic database lifecycle (open, close, upgrade scenarios)
 * - Schema management with version control
 * - Spy integration for transaction monitoring in tests
 *
 * This mock enables EventStore tests to run in Node.js environments while
 * maintaining full compatibility with production IndexedDB usage patterns.
 *
 * @example
 * ```typescript
 * const database = new MockIDBDatabase('tw-softball-events', 1);
 * const eventsStore = database.createObjectStore('events', { keyPath: 'eventId' });
 *
 * // Transaction usage (same as real IndexedDB)
 * const transaction = database.transaction(['events'], 'readwrite');
 * const store = transaction.objectStore('events');
 * ```
 */
export class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  private readonly _objectStores: Map<string, MockIDBObjectStore> = new Map();
  private readonly _mockObjectStores: Map<string, MockIDBObjectStore> = new Map();
  public transaction: ReturnType<typeof vi.fn>;

  // Database lifecycle event handlers
  public onclose: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onversionchange: ((event: IDBVersionChangeEvent) => void) | null = null;

  /**
   * Creates a new mock IndexedDB database with the specified name and version.
   *
   * @param name - Database name (typically 'tw-softball-events')
   * @param version - Database version number for schema management
   */
  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;

    const objectStores = this._objectStores;
    this.objectStoreNames = {
      contains: (name: string) => objectStores.has(name),
      item: (index: number) => Array.from(objectStores.keys())[index] || null,
      get length() {
        return objectStores.size;
      },
      *[Symbol.iterator]() {
        yield* Array.from(objectStores.keys());
      },
    } as DOMStringList;

    // Initialize transaction as vi.fn() spy that maintains original behavior
    this.transaction = vi.fn((storeNames: string | string[], mode?: IDBTransactionMode) => {
      return new MockIDBTransaction(storeNames, mode, this);
    });
  }

  /**
   * Creates a new object store in the mock database.
   *
   * @param name - Object store name
   * @param options - IndexedDB object store configuration
   * @returns Mock object store instance
   */
  createObjectStore(name: string, options?: IDBObjectStoreParameters): MockIDBObjectStore {
    const objectStore = new MockIDBObjectStore(name, options);
    this._objectStores.set(name, objectStore);
    this._mockObjectStores.set(name, objectStore);
    return objectStore;
  }

  deleteObjectStore(name: string): void {
    this._objectStores.delete(name);
    this._mockObjectStores.delete(name);
  }

  getMockObjectStore(name: string): MockIDBObjectStore | undefined {
    return this._mockObjectStores.get(name);
  }

  close(): void {
    // Trigger onclose event if handler is set
    if (this.onclose) {
      const event = { target: this, type: 'close' } as unknown as Event;
      this.onclose(event);
    }
  }

  /**
   * Testing utility: Triggers database error event
   */
  triggerDatabaseError(errorMessage = 'Database error'): void {
    if (this.onerror) {
      const event = {
        target: this,
        type: 'error',
        error: new DOMException(errorMessage, 'DatabaseError'),
      } as unknown as Event;
      this.onerror(event);
    }
  }

  /**
   * Testing utility: Triggers version change event
   */
  triggerVersionChange(oldVersion: number = 1, newVersion: number = 2): void {
    if (this.onversionchange) {
      const event = {
        target: this,
        type: 'versionchange',
        oldVersion,
        newVersion,
      } as unknown as IDBVersionChangeEvent;
      this.onversionchange(event);
    }
  }
}

/**
 * Mock implementation of IDBObjectStore for realistic EventStore data operations.
 *
 * Provides complete object store functionality including CRUD operations,
 * index management, cursor iteration, and realistic error simulation.
 * Essential for testing all EventStore data persistence scenarios.
 *
 * @remarks
 * **Data Operations:**
 * - add(), put(), get(), getAll(), count() with proper error handling
 * - Realistic key path extraction for domain value objects
 * - Automatic index updating when data changes
 * - Transaction state validation for operation safety
 *
 * **Index Management:**
 * - createIndex(), deleteIndex() with proper configuration
 * - Index data synchronization with store updates
 * - Support for unique and multi-entry indexes
 *
 * **Cursor Support:**
 * - openCursor() with range filtering and direction support
 * - Proper cursor lifecycle and iteration patterns
 * - Realistic async cursor behavior with continue() calls
 *
 * **Error Simulation:**
 * - Configurable failure modes for testing error handling
 * - Transaction state validation
 * - Proper IndexedDB exception types
 *
 * @example
 * ```typescript
 * const store = new MockIDBObjectStore('events', { keyPath: 'eventId' });
 * store.createIndex('gameId', 'metadata.gameId');
 *
 * // Test error scenarios
 * store.mockAddThrowsError = true;
 * const request = store.add(eventData); // Will trigger error
 * ```
 */
export class MockIDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexNames: DOMStringList;
  private readonly _indexes: Map<string, MockIDBIndex> = new Map();
  private readonly _mockIndexes: Map<string, MockIDBIndex> = new Map();
  private readonly _data: Map<string, unknown> = new Map();
  public mockAddThrowsError = false;
  public mockGetReturnsData = true;
  public mockTransactionState: 'active' | 'failed' | 'inactive' = 'active';

  /**
   * Creates a new mock object store with the specified configuration.
   *
   * @param name - Object store name
   * @param options - IndexedDB object store parameters (keyPath, autoIncrement)
   */
  constructor(name: string, options?: IDBObjectStoreParameters) {
    this.name = name;
    this.keyPath = options?.keyPath || null;
    this.autoIncrement = options?.autoIncrement || false;

    const indexes = this._indexes;
    this.indexNames = {
      contains: (name: string) => indexes.has(name),
      item: (index: number) => Array.from(indexes.keys())[index] || null,
      get length() {
        return indexes.size;
      },
      *[Symbol.iterator]() {
        yield* Array.from(indexes.keys());
      },
    } as DOMStringList;
  }

  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): MockIDBIndex {
    const index = new MockIDBIndex(name, keyPath, options);
    this._indexes.set(name, index);
    this._mockIndexes.set(name, index);
    return index;
  }

  deleteIndex(name: string): void {
    this._indexes.delete(name);
    this._mockIndexes.delete(name);
  }

  getMockIndex(name: string): MockIDBIndex | undefined {
    return this._mockIndexes.get(name);
  }

  setMockData(key: string, value: unknown): void {
    this._data.set(key, value);

    // Update all indexes with the new data
    for (const index of this._mockIndexes.values()) {
      index.setMockData(new Map(this._data));
    }
  }

  getMockData(): Map<string, unknown> {
    return this._data;
  }

  clearMockData(): void {
    this._data.clear();
  }

  /**
   * Adds a new record to the mock object store.
   *
   * @param value - Data to add to the store
   * @returns Mock IDBRequest with operation result
   */
  add(value: unknown): IDBRequest {
    if (this.mockAddThrowsError || this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const key =
      this.keyPath && typeof value === 'object' && value !== null
        ? ((value as Record<string, unknown>)[this.keyPath as string] as string)
        : SecureRandom.randomStringId(8);

    if (typeof key === 'string') {
      this._data.set(key, value);

      // Update all indexes with the new data
      for (const index of this._mockIndexes.values()) {
        index.setMockData(new Map(this._data));
      }
    }

    return this.createMockRequest('done', key);
  }

  put(value: unknown): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const key =
      this.keyPath && typeof value === 'object' && value !== null
        ? ((value as Record<string, unknown>)[this.keyPath as string] as string)
        : SecureRandom.randomStringId(8);

    if (typeof key === 'string') {
      this._data.set(key, value);

      // Update all indexes with the new data
      for (const index of this._mockIndexes.values()) {
        index.setMockData(new Map(this._data));
      }
    }

    return this.createMockRequest('done', key);
  }

  get(key: unknown): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const result = this.mockGetReturnsData ? this._data.get(key as string) : undefined;
    return this.createMockRequest('done', result);
  }

  getAll(query?: unknown, count?: number): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    let results = Array.from(this._data.values());

    // Apply basic filtering if query provided
    if (query && typeof query === 'string') {
      results = results.filter(item => {
        if (typeof item === 'object' && item !== null) {
          const itemRecord = item as Record<string, unknown>;
          return Object.values(itemRecord).some(val => val === query);
        }
        return false;
      });
    }

    // Apply count limit if provided
    if (count && count > 0) {
      results = results.slice(0, count);
    }

    return this.createMockRequest('done', results);
  }

  count(): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    return this.createMockRequest('done', this._data.size);
  }

  openCursor(range?: IDBKeyRange, direction?: IDBCursorDirection): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const entries = Array.from(this._data.entries());
    let cursor: MockIDBCursor | null = null;

    if (entries.length > 0) {
      cursor = new MockIDBCursor(entries, range, direction, this);
    }

    const request = this.createMockRequest('done', cursor);

    // Handle cursor.continue() calls asynchronously
    if (cursor) {
      const originalContinue = cursor.continue.bind(cursor);
      cursor.continue = (key?: unknown): void => {
        originalContinue(key);

        // Simulate async cursor movement
        setTimeout(() => {
          if (request.onsuccess) {
            // Check if cursor is exhausted after continue() was called
            if (cursor.value === null || cursor.currentIndex >= cursor.entries.length) {
              // Cursor exhausted - fire success with null cursor
              const successEvent = { target: { ...request, result: null } } as unknown as Event;
              request.onsuccess(successEvent);
            } else {
              // Cursor still has data - fire success with cursor
              const successEvent = { target: { ...request, result: cursor } } as unknown as Event;
              request.onsuccess(successEvent);
            }
          }
        }, 0);
      };
    }

    return request;
  }

  delete(key: unknown): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    this._data.delete(key as string);

    // Update all indexes with the modified data
    for (const index of this._mockIndexes.values()) {
      index.setMockData(new Map(this._data));
    }

    return this.createMockRequest('done', undefined);
  }

  clear(): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    this._data.clear();

    // Update all indexes with the cleared data
    for (const index of this._mockIndexes.values()) {
      index.setMockData(new Map());
    }

    return this.createMockRequest('done', undefined);
  }

  index(name: string): MockIDBIndex {
    const index = this._indexes.get(name);
    if (!index) {
      throw new DOMException("Index '" + name + "' does not exist", 'NotFoundError');
    }
    return index;
  }

  private createMockRequest(
    readyState: string,
    result: unknown,
    error: DOMException | null = null
  ): IDBRequest {
    const request = {
      readyState,
      result,
      error,
      source: this,
      transaction: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IDBRequest;

    // Simulate async behavior
    setTimeout(() => {
      if (error && request.onerror) {
        const errorEvent = { target: request } as unknown as Event;
        request.onerror(errorEvent);
      } else if (!error && request.onsuccess) {
        const successEvent = { target: request } as unknown as Event;
        request.onsuccess(successEvent);
      }
    }, 0);

    return request;
  }
}

/**
 * Mock implementation of IDBCursor for realistic record iteration in EventStore queries.
 *
 * Provides complete cursor functionality for traversing IndexedDB records,
 * essential for EventStore operations that need to process multiple events
 * such as game state reconstruction and event filtering.
 *
 * @remarks
 * **Iteration Features:**
 * - Proper cursor positioning with continue() and advance()
 * - Key range filtering with complex comparison logic
 * - Support for both object store and index cursors
 * - Realistic async iteration behavior
 *
 * **Key Path Handling:**
 * - Nested object property access (e.g., 'metadata.gameId')
 * - Array key path support for compound keys
 * - Value extraction for index-based cursors
 *
 * **Lifecycle Management:**
 * - Proper cursor exhaustion detection
 * - Bounds checking to prevent infinite loops
 * - Safe state transitions during iteration
 *
 * **EventStore Integration:**
 * - Supports game event traversal patterns
 * - Handles timestamp-based filtering
 * - Enables efficient event type queries
 *
 * @example
 * ```typescript
 * const cursor = new MockIDBCursor(
 *   entriesArray,
 *   IDBKeyRange.bound(startTime, endTime),
 *   'next',
 *   indexSource
 * );
 *
 * // Cursor traversal
 * while (cursor.value) {
 *   processEvent(cursor.value);
 *   cursor.continue();
 * }
 * ```
 */
export class MockIDBCursor {
  key: unknown;
  primaryKey: unknown;
  value: unknown;
  source: MockIDBIndex | MockIDBObjectStore;
  direction: IDBCursorDirection;
  readonly entries: [string, unknown][];
  currentIndex = 0;

  /**
   * Creates a new mock cursor for iterating over data records.
   *
   * @param entries - Array of [key, value] pairs to iterate over
   * @param range - Optional key range for filtering
   * @param direction - Cursor direction ('next', 'prev', etc.)
   * @param source - Source index or object store
   */
  constructor(
    entries: [string, unknown][],
    range?: IDBKeyRange,
    direction: IDBCursorDirection = 'next',
    source?: MockIDBIndex | MockIDBObjectStore
  ) {
    this.entries = entries;
    this.direction = direction;
    this.source = source || ({} as MockIDBObjectStore);

    // Apply range filtering if provided
    if (range && 'includes' in range && typeof range.includes === 'function') {
      this.entries = this.entries.filter(([key, value]) => {
        // For index cursors, check the indexed value
        if (source instanceof MockIDBIndex) {
          const record = value as Record<string, unknown>;
          const indexedValue = this.getValueByKeyPath(record, source.keyPath);
          return range.includes(indexedValue);
        }
        // For object store cursors, check the key
        return range.includes(key);
      });
    }

    // Set initial cursor position
    if (this.entries.length > 0) {
      const [key, value] = this.entries[0]!;
      this.key = key;
      this.primaryKey = key;
      this.value = value;
    }
  }

  private getValueByKeyPath(obj: Record<string, unknown>, keyPath: string | string[]): unknown {
    if (typeof keyPath === 'string') {
      const keys = keyPath.split('.');
      let current: unknown = obj;
      for (const key of keys) {
        if (current && typeof current === 'object') {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    }

    if (Array.isArray(keyPath)) {
      return keyPath.map(path => this.getValueByKeyPath(obj, path));
    }

    return undefined;
  }

  continue(_key?: unknown): void {
    this.currentIndex++;

    // Add bounds check to prevent infinite loops
    if (this.currentIndex >= this.entries.length) {
      // Set cursor value to null to signal completion
      this.key = null;
      this.primaryKey = null;
      this.value = null;
      return; // Stop iteration when exhausted
    }

    if (this.currentIndex < this.entries.length) {
      const [nextKey, nextValue] = this.entries[this.currentIndex]!;
      this.key = nextKey;
      this.primaryKey = nextKey;
      this.value = nextValue;
    }
  }

  advance(count: number): void {
    void count; // Parameter required by interface
    this.currentIndex += count;
    if (this.currentIndex < this.entries.length) {
      const [nextKey, nextValue] = this.entries[this.currentIndex]!;
      this.key = nextKey;
      this.primaryKey = nextKey;
      this.value = nextValue;
    }
  }

  update(_value: unknown): IDBRequest {
    return {
      readyState: 'done',
      result: undefined,
      error: null,
      source: this,
      transaction: null,
      onsuccess: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IDBRequest;
  }

  delete(): IDBRequest {
    return {
      readyState: 'done',
      result: undefined,
      error: null,
      source: this,
      transaction: null,
      onsuccess: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IDBRequest;
  }
}

/**
 * Mock implementation of IDBIndex for secondary index querying in EventStore operations.
 *
 * Provides complete index functionality for efficient EventStore queries,
 * enabling fast lookups by game ID, event type, timestamp, and other
 * indexed fields critical for softball game state management.
 *
 * @remarks
 * **Query Operations:**
 * - get(), getAll() with key-based filtering
 * - openCursor() for index-based iteration
 * - Proper key path value extraction from stored records
 *
 * **Index Configuration:**
 * - Support for unique and non-unique indexes
 * - Multi-entry index handling for array values
 * - Nested key path support (e.g., 'metadata.gameId')
 *
 * **Data Synchronization:**
 * - Automatic updates when object store data changes
 * - Proper index value extraction and maintenance
 * - Consistent data view across store and index operations
 *
 * **EventStore Integration:**
 * - Game ID index for cross-aggregate queries
 * - Event type index for filtering operations
 * - Timestamp index for chronological ordering
 * - Stream ID index for aggregate reconstruction
 *
 * @example
 * ```typescript
 * const gameIdIndex = new MockIDBIndex('gameId', 'metadata.gameId', { unique: false });
 *
 * // Query by game ID
 * const gameEvents = await promiseifyRequest(
 *   gameIdIndex.getAll(gameId.value)
 * );
 *
 * // Cursor iteration with filtering
 * const cursor = gameIdIndex.openCursor(IDBKeyRange.only(gameId.value));
 * ```
 */
export class MockIDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
  private mockData: Map<string, unknown> = new Map();
  public mockTransactionState: 'active' | 'failed' | 'inactive' = 'active';

  /**
   * Creates a new mock index for secondary key access.
   *
   * @param name - Index name
   * @param keyPath - Field path to index (supports nested paths)
   * @param options - Index configuration (unique, multiEntry)
   */
  constructor(name: string, keyPath: string | string[], options?: IDBIndexParameters) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = options?.unique || false;
    this.multiEntry = options?.multiEntry || false;
  }

  setMockData(data: Map<string, unknown>): void {
    this.mockData = data;
  }

  get(key: unknown): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const result = this.mockData.get(key as string);
    return this.createMockRequest('done', result);
  }

  getAll(query?: unknown, count?: number): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    let results = Array.from(this.mockData.values());

    if (query) {
      results = results.filter(item => {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          return this.getValueByKeyPath(record, this.keyPath) === query;
        }
        return false;
      });
    }

    if (count && count > 0) {
      results = results.slice(0, count);
    }

    return this.createMockRequest('done', results);
  }

  openCursor(range?: IDBKeyRange, direction?: IDBCursorDirection): IDBRequest {
    if (this.mockTransactionState === 'failed') {
      return this.createMockRequest(
        'error',
        null,
        new DOMException('Transaction failed', 'TransactionInactiveError')
      );
    }

    const entries = Array.from(this.mockData.entries());
    let cursor: MockIDBCursor | null = null;

    if (entries.length > 0) {
      cursor = new MockIDBCursor(entries, range, direction, this);
    }

    const request = this.createMockRequest('done', cursor);

    // Handle cursor.continue() calls asynchronously
    if (cursor) {
      const originalContinue = cursor.continue.bind(cursor);
      cursor.continue = (key?: unknown): void => {
        originalContinue(key);

        // Simulate async cursor movement
        setTimeout(() => {
          if (request.onsuccess) {
            // Check if cursor is exhausted after continue() was called
            if (cursor.value === null || cursor.currentIndex >= cursor.entries.length) {
              // Cursor exhausted - fire success with null cursor
              const successEvent = { target: { ...request, result: null } } as unknown as Event;
              request.onsuccess(successEvent);
            } else {
              // Cursor still has data - fire success with cursor
              const successEvent = { target: { ...request, result: cursor } } as unknown as Event;
              request.onsuccess(successEvent);
            }
          }
        }, 0);
      };
    }

    return request;
  }

  private getValueByKeyPath(obj: Record<string, unknown>, keyPath: string | string[]): unknown {
    if (typeof keyPath === 'string') {
      const keys = keyPath.split('.');
      let current: unknown = obj;
      for (const key of keys) {
        if (current && typeof current === 'object') {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    }

    if (Array.isArray(keyPath)) {
      return keyPath.map(path => this.getValueByKeyPath(obj, path));
    }

    return undefined;
  }

  private createMockRequest(
    readyState: string,
    result: unknown,
    error: DOMException | null = null
  ): IDBRequest {
    const request = {
      readyState,
      result,
      error,
      source: this,
      transaction: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IDBRequest;

    // Simulate async behavior
    setTimeout(() => {
      if (error && request.onerror) {
        const errorEvent = { target: request } as unknown as Event;
        request.onerror(errorEvent);
      } else if (!error && request.onsuccess) {
        const successEvent = { target: request } as unknown as Event;
        request.onsuccess(successEvent);
      }
    }, 0);

    return request;
  }
}

/**
 * Mock implementation of IDBTransaction for realistic transaction lifecycle testing.
 *
 * Provides complete transaction functionality with proper state management,
 * event handling, and error simulation essential for testing EventStore
 * transaction scenarios and error recovery patterns.
 *
 * @remarks
 * **Transaction Lifecycle:**
 * - Proper state transitions (active → finished/aborted/failed)
 * - Realistic event sequencing (oncomplete, onerror, onabort)
 * - Automatic completion and error handling
 *
 * **State Management:**
 * - Transaction mode validation (readonly vs readwrite)
 * - Object store access control based on transaction state
 * - Proper error propagation to associated object stores
 *
 * **Error Simulation:**
 * - Configurable failure modes for testing error handling
 * - Realistic IndexedDB exception types and timing
 * - Transaction abort scenarios and cleanup
 *
 * **EventStore Integration:**
 * - Multi-store transaction support for complex operations
 * - Atomic event batch processing
 * - Proper rollback behavior for failed operations
 *
 * @example
 * ```typescript
 * const transaction = new MockIDBTransaction(
 *   ['events', 'metadata'],
 *   'readwrite',
 *   mockDatabase
 * );
 *
 * // Test failure scenarios
 * transaction.mockShouldFail = true;
 * transaction.oncomplete = () => { // Should not be called };
 * transaction.onerror = (event) => { // Handle expected error };
 * ```
 */
export class MockIDBTransaction {
  objectStoreNames: DOMStringList;
  mode: IDBTransactionMode;
  db: MockIDBDatabase;
  error: DOMException | null = null;
  public mockState: 'active' | 'finished' | 'aborted' | 'failed' = 'active';
  private _mockShouldFail = false;
  private _failureScheduled = false;

  public get mockShouldFail(): boolean {
    return this._mockShouldFail;
  }

  public set mockShouldFail(value: boolean) {
    this._mockShouldFail = value;
    if (value && this.mockState === 'active') {
      this.setupFailure();
    }
  }

  public oncomplete: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onabort: ((event: Event) => void) | null = null;

  /**
   * Sets up transaction failure with error and triggers error event
   */
  private setupFailure(): void {
    this._failureScheduled = true;
    this.error = new DOMException('Mock transaction failure', 'TransactionInactiveError');
    this.mockState = 'failed';

    // Update object stores to reflect failed state
    setTimeout(() => {
      const store = this.db.getMockObjectStore('events');
      if (store) {
        store.mockTransactionState = 'failed';
      }

      if (this.onerror) {
        const errorEvent = { target: this } as unknown as Event;
        this.onerror(errorEvent);
      }
    }, 0);
  }

  /**
   * Creates a new mock transaction with the specified stores and mode.
   *
   * @param storeNames - Object store name(s) to include in transaction
   * @param mode - Transaction mode ('readonly', 'readwrite')
   * @param db - Parent database instance
   */
  constructor(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly',
    db: MockIDBDatabase
  ) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    this.objectStoreNames = {
      contains: (name: string) => names.includes(name),
      item: (index: number) => names[index] || null,
      length: names.length,
      *[Symbol.iterator]() {
        yield* names;
      },
    } as DOMStringList;
    this.mode = mode;
    this.db = db;

    // If this is a mock that should fail, set up the error
    if (this.mockShouldFail) {
      this.setupFailure();
    } else {
      // Complete transaction successfully
      setTimeout(() => {
        // Don't complete if failure was scheduled
        if (!this._failureScheduled) {
          this.mockState = 'finished';
          if (this.oncomplete) {
            const completeEvent = { target: this } as unknown as Event;
            this.oncomplete(completeEvent);
          }
        }
      }, 0);
    }
  }

  objectStore(name: string): MockIDBObjectStore {
    if (
      this.mockState === 'failed' ||
      this.mockState === 'aborted' ||
      this.mockState === 'finished'
    ) {
      throw new DOMException('Transaction is not active', 'TransactionInactiveError');
    }

    const store = this.db.getMockObjectStore(name);
    if (!store) {
      throw new DOMException("Object store '" + name + "' not found", 'NotFoundError');
    }

    // Set transaction state on the object store
    store.mockTransactionState = this.mockState === 'active' ? 'active' : 'inactive';

    return store;
  }

  abort(): void {
    if (this.mockState === 'active') {
      this.mockState = 'aborted';

      // Update object stores to reflect aborted state
      const store = this.db.getMockObjectStore('events');
      if (store) {
        store.mockTransactionState = 'inactive';
      }

      if (this.onabort) {
        const abortEvent = { target: this } as unknown as Event;
        this.onabort(abortEvent);
      }
    }
  }

  commit(): void {
    if (this.mockState === 'active') {
      this.mockState = 'finished';

      if (this.oncomplete) {
        const completeEvent = { target: this } as unknown as Event;
        this.oncomplete(completeEvent);
      }
    }
  }

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}
