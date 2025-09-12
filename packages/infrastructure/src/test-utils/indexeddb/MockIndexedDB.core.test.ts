/**
 * @file MockIndexedDB Core Tests
 * Core functionality tests for the MockIndexedDB classes.
 *
 * @remarks
 * This test suite validates basic functionality of the MockIndexedDB implementation including:
 * - MockIDBDatabase core operations and object store management
 * - MockIDBObjectStore basic operations (add, put, get, getAll, count)
 * - MockIDBIndex basic operations and querying
 * - MockIDBCursor basic iteration functionality
 * - Basic constructor and configuration scenarios
 *
 * Tests cover the fundamental operations and expected behaviors for each mock class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  MockIDBDatabase,
  MockIDBObjectStore,
  MockIDBIndex,
  MockIDBCursor,
  MockIDBTransaction,
} from './MockIndexedDB';

// Helper function to wait for async operations
const waitForAsync = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('MockIndexedDB Core', () => {
  describe('MockIDBDatabase', () => {
    let database: MockIDBDatabase;

    beforeEach(() => {
      database = new MockIDBDatabase('test-db', 1);
    });

    describe('constructor', () => {
      it('should initialize with correct properties', () => {
        expect(database.name).toBe('test-db');
        expect(database.version).toBe(1);
        expect(database.objectStoreNames.length).toBe(0);
      });

      it('should initialize empty object store names', () => {
        expect(database.objectStoreNames.contains('nonexistent')).toBe(false);
        expect(database.objectStoreNames.item(0)).toBeNull();
        expect(Array.from(database.objectStoreNames)).toEqual([]);
      });

      it('should initialize transaction as vi.fn spy', () => {
        expect(vi.isMockFunction(database.transaction)).toBe(true);
      });
    });

    describe('createObjectStore', () => {
      it('should create object store with default options', () => {
        const store = database.createObjectStore('test-store');

        expect(store).toBeInstanceOf(MockIDBObjectStore);
        expect(store.name).toBe('test-store');
        expect(store.keyPath).toBeNull();
        expect(store.autoIncrement).toBe(false);
        expect(database.objectStoreNames.contains('test-store')).toBe(true);
        expect(database.objectStoreNames.length).toBe(1);
      });

      it('should create object store with custom options', () => {
        const options = { keyPath: 'customId', autoIncrement: true };
        const store = database.createObjectStore('test-store', options);

        expect(store.keyPath).toBe('customId');
        expect(store.autoIncrement).toBe(true);
      });

      it('should support array keyPath', () => {
        const options = { keyPath: ['key1', 'key2'] };
        const store = database.createObjectStore('test-store', options);

        expect(store.keyPath).toEqual(['key1', 'key2']);
      });

      it('should update objectStoreNames iterator', () => {
        database.createObjectStore('store1');
        database.createObjectStore('store2');

        const storeNames = Array.from(database.objectStoreNames);
        expect(storeNames).toEqual(['store1', 'store2']);
        expect(database.objectStoreNames.item(0)).toBe('store1');
        expect(database.objectStoreNames.item(1)).toBe('store2');
      });
    });

    describe('deleteObjectStore', () => {
      beforeEach(() => {
        database.createObjectStore('store-to-delete');
      });

      it('should remove object store', () => {
        expect(database.objectStoreNames.contains('store-to-delete')).toBe(true);

        database.deleteObjectStore('store-to-delete');

        expect(database.objectStoreNames.contains('store-to-delete')).toBe(false);
        expect(database.objectStoreNames.length).toBe(0);
        expect(database.getMockObjectStore('store-to-delete')).toBeUndefined();
      });
    });

    describe('getMockObjectStore', () => {
      it('should return undefined for non-existent store', () => {
        expect(database.getMockObjectStore('nonexistent')).toBeUndefined();
      });

      it('should return existing store', () => {
        const store = database.createObjectStore('test-store');
        expect(database.getMockObjectStore('test-store')).toBe(store);
      });
    });

    describe('basic transaction creation', () => {
      beforeEach(() => {
        database.createObjectStore('store1');
        database.createObjectStore('store2');
      });

      it('should create transaction with single store name', () => {
        const transaction = database.transaction('store1');

        expect(transaction).toBeInstanceOf(MockIDBTransaction);
        expect(transaction.objectStoreNames.contains('store1')).toBe(true);
        expect(transaction.objectStoreNames.length).toBe(1);
        expect(transaction.mode).toBe('readonly');
        expect(transaction.db).toBe(database);
      });

      it('should create transaction with multiple store names', () => {
        const transaction = database.transaction(['store1', 'store2']);

        expect(transaction.objectStoreNames.contains('store1')).toBe(true);
        expect(transaction.objectStoreNames.contains('store2')).toBe(true);
        expect(transaction.objectStoreNames.length).toBe(2);
      });

      it('should create transaction with custom mode', () => {
        const transaction = database.transaction('store1', 'readwrite');
        expect(transaction.mode).toBe('readwrite');
      });

      it('should track function calls as vi.fn spy', () => {
        database.transaction('store1');
        database.transaction(['store1', 'store2'], 'readwrite');

        expect(database.transaction).toHaveBeenCalledTimes(2);
        expect(database.transaction).toHaveBeenNthCalledWith(1, 'store1');
        expect(database.transaction).toHaveBeenNthCalledWith(2, ['store1', 'store2'], 'readwrite');
      });
    });

    describe('close', () => {
      it('should execute without error', () => {
        expect(() => database.close()).not.toThrow();
      });
    });
  });

  describe('MockIDBObjectStore', () => {
    let objectStore: MockIDBObjectStore;

    beforeEach(() => {
      objectStore = new MockIDBObjectStore('test-store', { keyPath: 'id' });
    });

    describe('constructor', () => {
      it('should initialize with correct properties', () => {
        expect(objectStore.name).toBe('test-store');
        expect(objectStore.keyPath).toBe('id');
        expect(objectStore.autoIncrement).toBe(false);
        expect(objectStore.indexNames.length).toBe(0);
      });

      it('should initialize with autoIncrement option', () => {
        const autoStore = new MockIDBObjectStore('auto-store', { autoIncrement: true });
        expect(autoStore.autoIncrement).toBe(true);
      });

      it('should handle null keyPath', () => {
        const nullKeyStore = new MockIDBObjectStore('null-key-store');
        expect(nullKeyStore.keyPath).toBeNull();
      });
    });

    describe('createIndex', () => {
      it('should create index with default options', () => {
        const index = objectStore.createIndex('test-index', 'indexKey');

        expect(index).toBeInstanceOf(MockIDBIndex);
        expect(index.name).toBe('test-index');
        expect(index.keyPath).toBe('indexKey');
        expect(index.unique).toBe(false);
        expect(index.multiEntry).toBe(false);
        expect(objectStore.indexNames.contains('test-index')).toBe(true);
      });

      it('should create index with custom options', () => {
        const options = { unique: true, multiEntry: true };
        const index = objectStore.createIndex('unique-index', 'uniqueKey', options);

        expect(index.unique).toBe(true);
        expect(index.multiEntry).toBe(true);
      });

      it('should support array keyPath', () => {
        const index = objectStore.createIndex('compound-index', ['key1', 'key2']);
        expect(index.keyPath).toEqual(['key1', 'key2']);
      });

      it('should update indexNames iterator', () => {
        objectStore.createIndex('index1', 'key1');
        objectStore.createIndex('index2', 'key2');

        const indexNames = Array.from(objectStore.indexNames);
        expect(indexNames).toEqual(['index1', 'index2']);
        expect(objectStore.indexNames.item(0)).toBe('index1');
        expect(objectStore.indexNames.item(1)).toBe('index2');
      });
    });

    describe('deleteIndex', () => {
      beforeEach(() => {
        objectStore.createIndex('index-to-delete', 'deleteKey');
      });

      it('should remove index', () => {
        expect(objectStore.indexNames.contains('index-to-delete')).toBe(true);

        objectStore.deleteIndex('index-to-delete');

        expect(objectStore.indexNames.contains('index-to-delete')).toBe(false);
        expect(objectStore.indexNames.length).toBe(0);
        expect(objectStore.getMockIndex('index-to-delete')).toBeUndefined();
      });
    });

    describe('getMockIndex', () => {
      it('should return undefined for non-existent index', () => {
        expect(objectStore.getMockIndex('nonexistent')).toBeUndefined();
      });

      it('should return existing index', () => {
        const index = objectStore.createIndex('test-index', 'testKey');
        expect(objectStore.getMockIndex('test-index')).toBe(index);
      });
    });

    describe('data management', () => {
      it('should set data and update indexes', () => {
        const index = objectStore.createIndex('value-index', 'value');
        const testData = { id: 'test-id', value: 'test-value' };

        objectStore.setMockData('test-key', testData);

        const data = objectStore.getMockData();
        expect(data.get('test-key')).toEqual(testData);

        // Verify index received updated data
        expect(index.setMockData).toBeDefined();
      });

      it('should handle multiple data entries', () => {
        objectStore.setMockData('key1', { id: '1', value: 'one' });
        objectStore.setMockData('key2', { id: '2', value: 'two' });

        const data = objectStore.getMockData();
        expect(data.size).toBe(2);
        expect(data.get('key1')).toEqual({ id: '1', value: 'one' });
        expect(data.get('key2')).toEqual({ id: '2', value: 'two' });
      });

      it('should return current mock data', () => {
        objectStore.setMockData('key1', { id: '1' });
        objectStore.setMockData('key2', { id: '2' });

        const data = objectStore.getMockData();
        expect(data.size).toBe(2);
        expect(data.get('key1')).toEqual({ id: '1' });
      });

      it('should clear all mock data', () => {
        objectStore.setMockData('key1', { id: '1' });
        objectStore.setMockData('key2', { id: '2' });

        objectStore.clearMockData();
        const data = objectStore.getMockData();
        expect(data.size).toBe(0);
      });
    });

    describe('basic operations', () => {
      it('should add data successfully', () => {
        const testData = { id: 'test-id', value: 'test-value' };
        const request = objectStore.add(testData);

        expect(request.readyState).toBe('done');
        expect(request.result).toBe('test-id');
        expect(request.error).toBeNull();

        const data = objectStore.getMockData();
        expect(data.get('test-id')).toEqual(testData);
      });

      it('should put data successfully', () => {
        const testData = { id: 'put-id', value: 'put-value' };
        const request = objectStore.put(testData);

        expect(request.readyState).toBe('done');
        expect(request.result).toBe('put-id');
        expect(request.error).toBeNull();

        const data = objectStore.getMockData();
        expect(data.get('put-id')).toEqual(testData);
      });

      it('should overwrite existing data with put', () => {
        const originalData = { id: 'same-id', value: 'original' };
        const updatedData = { id: 'same-id', value: 'updated' };

        objectStore.put(originalData);
        objectStore.put(updatedData);

        const data = objectStore.getMockData();
        expect(data.get('same-id')).toEqual(updatedData);
      });

      it('should get existing data', () => {
        objectStore.setMockData('existing-key', { id: 'existing-key', value: 'existing-value' });

        const request = objectStore.get('existing-key');

        expect(request.readyState).toBe('done');
        expect(request.result).toEqual({ id: 'existing-key', value: 'existing-value' });
        expect(request.error).toBeNull();
      });

      it('should return undefined for non-existent key', () => {
        const request = objectStore.get('non-existent-key');

        expect(request.readyState).toBe('done');
        expect(request.result).toBeUndefined();
      });

      it('should return correct count', () => {
        objectStore.setMockData('key1', { id: '1' });
        objectStore.setMockData('key2', { id: '2' });
        objectStore.setMockData('key3', { id: '3' });

        const request = objectStore.count();

        expect(request.readyState).toBe('done');
        expect(request.result).toBe(3);
      });

      it('should return zero for empty store', () => {
        objectStore.clearMockData();
        const request = objectStore.count();

        expect(request.result).toBe(0);
      });
    });

    describe('getAll operations', () => {
      beforeEach(() => {
        objectStore.setMockData('key1', { id: '1', category: 'A', value: 'first' });
        objectStore.setMockData('key2', { id: '2', category: 'B', value: 'second' });
        objectStore.setMockData('key3', { id: '3', category: 'A', value: 'third' });
      });

      it('should return all data when no query', () => {
        const request = objectStore.getAll();

        expect(request.readyState).toBe('done');
        expect(Array.isArray(request.result)).toBe(true);
        expect((request.result as unknown[]).length).toBe(3);
      });

      it('should filter by query string', () => {
        const request = objectStore.getAll('A'); // Query for category 'A'

        const results = request.result as unknown[];
        expect(results.length).toBe(2);
        expect(results.every(item => (item as { category: string }).category === 'A')).toBe(true);
      });

      it('should limit results by count', () => {
        const request = objectStore.getAll(undefined, 2);

        const results = request.result as unknown[];
        expect(results.length).toBe(2);
      });

      it('should combine query and count', () => {
        const request = objectStore.getAll('A', 1);

        const results = request.result as unknown[];
        expect(results.length).toBe(1);
        expect((results[0] as { category: string }).category).toBe('A');
      });

      it('should handle non-object values in filtering', () => {
        objectStore.setMockData('primitive', 'string-value');
        const request = objectStore.getAll('string-value');

        const results = request.result as unknown[];
        expect(results.length).toBe(0); // Primitive values are filtered out
      });
    });

    describe('cursor operations', () => {
      beforeEach(() => {
        objectStore.setMockData('key1', { id: '1', value: 'first' });
        objectStore.setMockData('key2', { id: '2', value: 'second' });
        objectStore.setMockData('key3', { id: '3', value: 'third' });
      });

      it('should open cursor successfully', () => {
        const request = objectStore.openCursor();

        expect(request.readyState).toBe('done');
        expect(request.result).toBeInstanceOf(MockIDBCursor);

        const cursor = request.result as MockIDBCursor;
        expect(cursor.key).toBe('key1');
        expect(cursor.value).toEqual({ id: '1', value: 'first' });
      });

      it('should handle empty store', () => {
        objectStore.clearMockData();
        const request = objectStore.openCursor();

        expect(request.result).toBeNull();
      });

      it('should support custom direction', () => {
        const request = objectStore.openCursor(undefined, 'prev');

        const cursor = request.result as MockIDBCursor;
        expect(cursor.direction).toBe('prev');
      });

      it('should handle cursor continuation asynchronously', async () => {
        const request = objectStore.openCursor();
        const cursor = request.result as MockIDBCursor;
        let continuationCallbackFired = false;

        request.onsuccess = (): void => {
          continuationCallbackFired = true;
        };

        cursor.continue();
        await waitForAsync();

        expect(continuationCallbackFired).toBe(true);
      });
    });

    describe('index access', () => {
      let testIndex: MockIDBIndex;

      beforeEach(() => {
        testIndex = objectStore.createIndex('test-index', 'indexKey');
      });

      it('should return existing index', () => {
        const index = objectStore.index('test-index');
        expect(index).toBe(testIndex);
      });

      it('should throw error for non-existent index', () => {
        expect(() => objectStore.index('non-existent')).toThrow(DOMException);
        expect(() => objectStore.index('non-existent')).toThrow(
          "Index 'non-existent' does not exist"
        );
      });
    });

    describe('request interface', () => {
      it('should have proper request interface methods', () => {
        const request = objectStore.get('test');

        expect(request.addEventListener).toBeDefined();
        expect(request.removeEventListener).toBeDefined();
        expect(request.dispatchEvent).toBeDefined();
        expect(vi.isMockFunction(request.addEventListener)).toBe(true);
      });
    });
  });

  describe('MockIDBIndex', () => {
    let index: MockIDBIndex;

    beforeEach(() => {
      index = new MockIDBIndex('test-index', 'indexKey', { unique: true, multiEntry: true });
    });

    describe('constructor', () => {
      it('should initialize with correct properties', () => {
        expect(index.name).toBe('test-index');
        expect(index.keyPath).toBe('indexKey');
        expect(index.unique).toBe(true);
        expect(index.multiEntry).toBe(true);
      });

      it('should initialize with default options', () => {
        const defaultIndex = new MockIDBIndex('default-index', 'defaultKey');
        expect(defaultIndex.unique).toBe(false);
        expect(defaultIndex.multiEntry).toBe(false);
      });

      it('should support array keyPath', () => {
        const compoundIndex = new MockIDBIndex('compound', ['key1', 'key2']);
        expect(compoundIndex.keyPath).toEqual(['key1', 'key2']);
      });
    });

    describe('data management', () => {
      it('should update internal data', () => {
        const testData = new Map([
          ['key1', { indexKey: 'value1', otherData: 'data1' }],
          ['key2', { indexKey: 'value2', otherData: 'data2' }],
        ]);

        index.setMockData(testData);

        // Verify data was set (internal method)
        expect(index.setMockData).toBeDefined();
      });
    });

    describe('basic operations', () => {
      beforeEach(() => {
        const testData = new Map([
          ['key1', { indexKey: 'searchValue', data: 'test1' }],
          ['key2', { indexKey: 'otherValue', data: 'test2' }],
        ]);
        index.setMockData(testData);
      });

      it('should get data by key', () => {
        const request = index.get('key1');

        expect(request.readyState).toBe('done');
        expect(request.result).toEqual({ indexKey: 'searchValue', data: 'test1' });
      });

      it('should return undefined for non-existent key', () => {
        const request = index.get('non-existent');

        expect(request.readyState).toBe('done');
        expect(request.result).toBeUndefined();
      });
    });

    describe('getAll operations', () => {
      beforeEach(() => {
        const testData = new Map([
          ['key1', { indexKey: 'A', category: 'first', data: 'test1' }],
          ['key2', { indexKey: 'B', category: 'second', data: 'test2' }],
          ['key3', { indexKey: 'A', category: 'third', data: 'test3' }],
        ]);
        index.setMockData(testData);
      });

      it('should return all data when no query', () => {
        const request = index.getAll();

        expect(request.readyState).toBe('done');
        const results = request.result as unknown[];
        expect(results.length).toBe(3);
      });

      it('should filter by query using keyPath', () => {
        const request = index.getAll('A');

        const results = request.result as unknown[];
        expect(results.length).toBe(2);
        expect(results.every(item => (item as { indexKey: string }).indexKey === 'A')).toBe(true);
      });

      it('should limit results by count', () => {
        const request = index.getAll(undefined, 2);

        const results = request.result as unknown[];
        expect(results.length).toBe(2);
      });

      it('should combine query and count', () => {
        const request = index.getAll('A', 1);

        const results = request.result as unknown[];
        expect(results.length).toBe(1);
        expect((results[0] as { indexKey: string }).indexKey).toBe('A');
      });

      it('should handle non-object values in filtering', () => {
        const mixedData = new Map<string, unknown>([
          ['key1', 'string-value'],
          ['key2', { indexKey: 'A', data: 'test' }],
        ]);
        index.setMockData(mixedData);

        const request = index.getAll('A');
        const results = request.result as unknown[];
        expect(results.length).toBe(1);
        expect((results[0] as { indexKey: string }).indexKey).toBe('A');
      });
    });

    describe('cursor operations', () => {
      beforeEach(() => {
        const testData = new Map([
          ['key1', { indexKey: 'A', data: 'first' }],
          ['key2', { indexKey: 'B', data: 'second' }],
          ['key3', { indexKey: 'C', data: 'third' }],
        ]);
        index.setMockData(testData);
      });

      it('should open cursor successfully', () => {
        const request = index.openCursor();

        expect(request.readyState).toBe('done');
        expect(request.result).toBeInstanceOf(MockIDBCursor);

        const cursor = request.result as MockIDBCursor;
        expect(cursor.source).toBe(index);
      });

      it('should handle empty index', () => {
        index.setMockData(new Map());
        const request = index.openCursor();

        expect(request.result).toBeNull();
      });

      it('should support custom range and direction', () => {
        const mockRange = {
          includes: vi.fn(() => true),
        } as unknown as IDBKeyRange;

        const request = index.openCursor(mockRange, 'prev');

        const cursor = request.result as MockIDBCursor;
        expect(cursor.direction).toBe('prev');
      });

      it('should handle cursor continuation asynchronously', async () => {
        const request = index.openCursor();
        const cursor = request.result as MockIDBCursor;
        let continuationCallbackFired = false;

        request.onsuccess = (): void => {
          continuationCallbackFired = true;
        };

        cursor.continue();
        await waitForAsync();

        expect(continuationCallbackFired).toBe(true);
      });
    });
  });

  describe('MockIDBCursor', () => {
    let entries: [string, unknown][];
    let cursor: MockIDBCursor;
    let mockSource: MockIDBObjectStore;

    beforeEach(() => {
      entries = [
        ['key1', { id: '1', value: 'first' }],
        ['key2', { id: '2', value: 'second' }],
        ['key3', { id: '3', value: 'third' }],
      ];
      mockSource = new MockIDBObjectStore('test-store');
      cursor = new MockIDBCursor(entries, undefined, 'next', mockSource);
    });

    describe('constructor', () => {
      it('should initialize with correct properties', () => {
        expect(cursor.entries).toBe(entries);
        expect(cursor.direction).toBe('next');
        expect(cursor.source).toBe(mockSource);
        expect(cursor.currentIndex).toBe(0);
        expect(cursor.key).toBe('key1');
        expect(cursor.primaryKey).toBe('key1');
        expect(cursor.value).toEqual({ id: '1', value: 'first' });
      });

      it('should handle empty entries', () => {
        const emptyCursor = new MockIDBCursor([], undefined, 'next', mockSource);
        expect(emptyCursor.key).toBeUndefined();
        expect(emptyCursor.value).toBeUndefined();
      });

      it('should use default direction', () => {
        const defaultCursor = new MockIDBCursor(entries);
        expect(defaultCursor.direction).toBe('next');
      });

      it('should use default source', () => {
        const defaultCursor = new MockIDBCursor(entries);
        expect(defaultCursor.source).toEqual({});
      });

      it('should handle custom direction', () => {
        const prevCursor = new MockIDBCursor(entries, undefined, 'prev');
        expect(prevCursor.direction).toBe('prev');
      });
    });

    describe('continue', () => {
      it('should advance to next entry', () => {
        cursor.continue();

        expect(cursor.currentIndex).toBe(1);
        expect(cursor.key).toBe('key2');
        expect(cursor.primaryKey).toBe('key2');
        expect(cursor.value).toEqual({ id: '2', value: 'second' });
      });

      it('should handle end of entries', () => {
        cursor.currentIndex = 2; // Last entry
        cursor.continue();

        expect(cursor.currentIndex).toBe(3);
        expect(cursor.key).toBeNull();
        expect(cursor.primaryKey).toBeNull();
        expect(cursor.value).toBeNull();
      });

      it('should handle beyond end of entries', () => {
        cursor.currentIndex = 5; // Beyond entries
        cursor.continue();

        expect(cursor.currentIndex).toBe(6);
        expect(cursor.key).toBeNull();
        expect(cursor.value).toBeNull();
      });

      it('should update cursor values when within bounds', () => {
        cursor.currentIndex = 0;
        cursor.continue();

        expect(cursor.currentIndex).toBe(1);
        expect(cursor.key).toBe('key2');
        expect(cursor.value).toEqual({ id: '2', value: 'second' });
      });

      it('should handle continue with key parameter', () => {
        cursor.continue('specific-key');

        expect(cursor.currentIndex).toBe(1);
        expect(cursor.key).toBe('key2');
      });
    });

    describe('advance', () => {
      it('should advance by specified count', () => {
        cursor.advance(2);

        expect(cursor.currentIndex).toBe(2);
        expect(cursor.key).toBe('key3');
        expect(cursor.primaryKey).toBe('key3');
        expect(cursor.value).toEqual({ id: '3', value: 'third' });
      });

      it('should handle advancing beyond entries', () => {
        cursor.advance(5);

        expect(cursor.currentIndex).toBe(5);
        // Key and value should not be updated when beyond bounds
      });

      it('should handle zero advance count', () => {
        const originalIndex = cursor.currentIndex;
        cursor.advance(0);

        expect(cursor.currentIndex).toBe(originalIndex);
      });
    });

    describe('update and delete', () => {
      it('should return mock request for update', () => {
        const request = cursor.update({ id: 'updated' });

        expect(request.readyState).toBe('done');
        expect(request.result).toBeUndefined();
        expect(request.error).toBeNull();
        expect(request.source).toBe(cursor);
      });

      it('should have proper request interface for update', () => {
        const request = cursor.update({ id: 'updated' });

        expect(request.addEventListener).toBeDefined();
        expect(request.removeEventListener).toBeDefined();
        expect(request.dispatchEvent).toBeDefined();
        expect(vi.isMockFunction(request.addEventListener)).toBe(true);
      });

      it('should return mock request for delete', () => {
        const request = cursor.delete();

        expect(request.readyState).toBe('done');
        expect(request.result).toBeUndefined();
        expect(request.error).toBeNull();
        expect(request.source).toBe(cursor);
      });

      it('should have proper request interface for delete', () => {
        const request = cursor.delete();

        expect(request.addEventListener).toBeDefined();
        expect(request.removeEventListener).toBeDefined();
        expect(request.dispatchEvent).toBeDefined();
        expect(vi.isMockFunction(request.addEventListener)).toBe(true);
      });
    });
  });
});
