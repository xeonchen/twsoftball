/**
 * @file MockIndexedDB
 * Complete mock implementation of IndexedDB API for testing
 * Extracted from IndexedDBEventStore.test.ts to eliminate duplication
 *
 * @remarks
 * FUTURE IMPROVEMENT: Consider replacing this 700+ line custom implementation
 * with the `fake-indexeddb` npm package for:
 * - Better standards compliance and reliability
 * - Reduced maintenance burden
 * - More accurate browser behavior simulation
 * - Community-tested edge case handling
 *
 * Current custom implementation is retained to avoid breaking existing tests
 * without proper validation of fake-indexeddb compatibility.
 */

import { vi } from 'vitest';

export class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  private readonly _objectStores: Map<string, MockIDBObjectStore> = new Map();
  private readonly _mockObjectStores: Map<string, MockIDBObjectStore> = new Map();
  public transaction: ReturnType<typeof vi.fn>;

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
    // Mock close
  }
}

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
        : Math.random().toString();

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
        : Math.random().toString();

    if (typeof key === 'string') {
      this._data.set(key, value);
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

  index(name: string): MockIDBIndex {
    const index = this._indexes.get(name);
    if (!index) {
      throw new DOMException(`Index '${name}' does not exist`, 'NotFoundError');
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

export class MockIDBCursor {
  key: unknown;
  primaryKey: unknown;
  value: unknown;
  source: MockIDBIndex | MockIDBObjectStore;
  direction: IDBCursorDirection;
  readonly entries: [string, unknown][];
  currentIndex = 0;

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

export class MockIDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
  private mockData: Map<string, unknown> = new Map();
  public mockTransactionState: 'active' | 'failed' | 'inactive' = 'active';

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

export class MockIDBTransaction {
  objectStoreNames: DOMStringList;
  mode: IDBTransactionMode;
  db: MockIDBDatabase;
  error: DOMException | null = null;
  public mockState: 'active' | 'finished' | 'aborted' | 'failed' = 'active';
  public mockShouldFail = false;
  public oncomplete: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onabort: ((event: Event) => void) | null = null;

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
    } else {
      // Complete transaction successfully
      setTimeout(() => {
        this.mockState = 'finished';
        if (this.oncomplete) {
          const completeEvent = { target: this } as unknown as Event;
          this.oncomplete(completeEvent);
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
      throw new DOMException(`Object store '${name}' not found`, 'NotFoundError');
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
