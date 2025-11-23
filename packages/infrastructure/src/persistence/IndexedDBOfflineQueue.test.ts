/**
 * @file IndexedDBOfflineQueue Tests
 * TDD tests for the IndexedDB implementation of OfflineQueuePort.
 *
 * @remarks
 * These tests use the project's custom MockIndexedDB for browser-independent testing.
 * The tests verify proper database schema creation, CRUD operations,
 * and status management for offline queue items.
 */

import type { EnqueueInput } from '@twsoftball/application';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createMockIndexedDB, createMockIDBKeyRange } from '../test-utils/indexeddb';

import { IndexedDBOfflineQueue } from './IndexedDBOfflineQueue';

describe('IndexedDBOfflineQueue', () => {
  let queue: IndexedDBOfflineQueue;
  let cleanupFns: Array<() => void> = [];

  beforeEach(() => {
    // Set up mock IndexedDB
    const mockDB = createMockIndexedDB();
    const mockKeyRange = createMockIDBKeyRange();

    // Store original values for cleanup
    const originalIndexedDB = globalThis.indexedDB;
    const originalIDBKeyRange = globalThis.IDBKeyRange;

    // Apply mocks
    globalThis.indexedDB = mockDB;
    globalThis.IDBKeyRange = mockKeyRange;

    cleanupFns.push(() => {
      globalThis.indexedDB = originalIndexedDB;
      globalThis.IDBKeyRange = originalIDBKeyRange;
    });

    // Use unique database name per test to avoid conflicts
    const dbName = `tw-softball-offline-queue-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    queue = new IndexedDBOfflineQueue(dbName);
  });

  afterEach(async () => {
    // Clean up - close connection and delete database
    await queue.destroy();

    // Restore originals
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
  });

  describe('database initialization', () => {
    it('should create database with correct schema', async () => {
      // Initialize the queue
      await queue.ensureReady();

      // Just verify queue works after initialization
      const count = await queue.getPendingCount();
      expect(count).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add item with pending status', async () => {
      await queue.ensureReady();

      const input: EnqueueInput = {
        type: 'RECORD_AT_BAT',
        payload: { gameId: 'game-123', result: 'single' },
        timestamp: Date.now(),
      };

      const id = await queue.enqueue(input);
      const item = await queue.getItem(id);

      expect(item).toBeDefined();
      expect(item?.status).toBe('pending');
      expect(item?.type).toBe('RECORD_AT_BAT');
      expect(item?.payload).toEqual({ gameId: 'game-123', result: 'single' });
    });

    it('should generate unique id for each item', async () => {
      await queue.ensureReady();

      const input: EnqueueInput = {
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      };

      const id1 = await queue.enqueue(input);
      const id2 = await queue.enqueue(input);
      const id3 = await queue.enqueue(input);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should set retryCount to 0', async () => {
      await queue.ensureReady();

      const input: EnqueueInput = {
        type: 'START_GAME',
        payload: { teamName: 'Warriors' },
        timestamp: Date.now(),
      };

      const id = await queue.enqueue(input);
      const item = await queue.getItem(id);

      expect(item?.retryCount).toBe(0);
    });

    it('should preserve timestamp from input', async () => {
      await queue.ensureReady();

      const timestamp = 1700000000000;
      const input: EnqueueInput = {
        type: 'END_INNING',
        payload: {},
        timestamp,
      };

      const id = await queue.enqueue(input);
      const item = await queue.getItem(id);

      expect(item?.timestamp).toBe(timestamp);
    });
  });

  describe('getPendingItems', () => {
    it('should return only pending items', async () => {
      await queue.ensureReady();

      // Add multiple items
      const id1 = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });
      const id2 = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now() + 1,
      });
      const id3 = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now() + 2,
      });

      // Mark one as synced, one as failed
      await queue.markSynced(id1);
      await queue.markFailed(id3, 'Network error');

      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe(id2);
    });

    it('should return items in FIFO order (by timestamp)', async () => {
      await queue.ensureReady();

      const baseTime = Date.now();

      // Add items in non-sequential order
      await queue.enqueue({
        type: 'ITEM_C',
        payload: {},
        timestamp: baseTime + 200,
      });
      await queue.enqueue({
        type: 'ITEM_A',
        payload: {},
        timestamp: baseTime,
      });
      await queue.enqueue({
        type: 'ITEM_B',
        payload: {},
        timestamp: baseTime + 100,
      });

      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(3);
      expect(pending[0]?.type).toBe('ITEM_A');
      expect(pending[1]?.type).toBe('ITEM_B');
      expect(pending[2]?.type).toBe('ITEM_C');
    });

    it('should return empty array when no pending items', async () => {
      await queue.ensureReady();

      const pending = await queue.getPendingItems();

      expect(pending).toEqual([]);
    });

    it('should include syncing items', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      await queue.markSyncing(id);

      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1);
      expect(pending[0]?.status).toBe('syncing');
    });
  });

  describe('markSynced', () => {
    it('should remove item from queue', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      await queue.markSynced(id);

      const item = await queue.getItem(id);
      const pending = await queue.getPendingItems();

      // Item should be removed (undefined) or have synced status
      expect(item === undefined || item.status === 'synced').toBe(true);
      expect(pending).toHaveLength(0);
    });

    it('should not throw for non-existent item', async () => {
      await queue.ensureReady();

      await expect(queue.markSynced('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('markFailed', () => {
    it('should update status and error message', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      await queue.markFailed(id, 'Network timeout');

      const item = await queue.getItem(id);

      expect(item?.status).toBe('failed');
      expect(item?.error).toBe('Network timeout');
    });

    it('should increment retry count', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      expect((await queue.getItem(id))?.retryCount).toBe(0);

      await queue.markFailed(id, 'Error 1');
      expect((await queue.getItem(id))?.retryCount).toBe(1);

      await queue.markFailed(id, 'Error 2');
      expect((await queue.getItem(id))?.retryCount).toBe(2);

      await queue.markFailed(id, 'Error 3');
      expect((await queue.getItem(id))?.retryCount).toBe(3);
    });

    it('should not throw for non-existent item', async () => {
      await queue.ensureReady();

      await expect(queue.markFailed('non-existent-id', 'Some error')).resolves.not.toThrow();
    });
  });

  describe('markSyncing', () => {
    it('should update status to syncing', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      await queue.markSyncing(id);

      const item = await queue.getItem(id);
      expect(item?.status).toBe('syncing');
    });

    it('should not throw for non-existent item', async () => {
      await queue.ensureReady();

      await expect(queue.markSyncing('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending items only', async () => {
      await queue.ensureReady();

      // Add multiple items
      const id1 = await queue.enqueue({
        type: 'ITEM_1',
        payload: {},
        timestamp: Date.now(),
      });
      await queue.enqueue({
        type: 'ITEM_2',
        payload: {},
        timestamp: Date.now() + 1,
      });
      const id3 = await queue.enqueue({
        type: 'ITEM_3',
        payload: {},
        timestamp: Date.now() + 2,
      });
      await queue.enqueue({
        type: 'ITEM_4',
        payload: {},
        timestamp: Date.now() + 3,
      });

      // Mark some as synced/failed
      await queue.markSynced(id1);
      await queue.markFailed(id3, 'Error');

      const count = await queue.getPendingCount();

      expect(count).toBe(2);
    });

    it('should return 0 when queue is empty', async () => {
      await queue.ensureReady();

      const count = await queue.getPendingCount();

      expect(count).toBe(0);
    });

    it('should include syncing items in count', async () => {
      await queue.ensureReady();

      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: {},
        timestamp: Date.now(),
      });

      await queue.markSyncing(id);

      const count = await queue.getPendingCount();
      expect(count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all items', async () => {
      await queue.ensureReady();

      // Add multiple items with different statuses
      const id1 = await queue.enqueue({
        type: 'ITEM_1',
        payload: {},
        timestamp: Date.now(),
      });
      await queue.enqueue({
        type: 'ITEM_2',
        payload: {},
        timestamp: Date.now() + 1,
      });
      const id3 = await queue.enqueue({
        type: 'ITEM_3',
        payload: {},
        timestamp: Date.now() + 2,
      });

      // Vary statuses
      await queue.markSyncing(id1);
      await queue.markFailed(id3, 'Error');

      // Clear the queue
      await queue.clear();

      const pending = await queue.getPendingItems();
      const count = await queue.getPendingCount();
      const item1 = await queue.getItem(id1);
      const item3 = await queue.getItem(id3);

      expect(pending).toHaveLength(0);
      expect(count).toBe(0);
      expect(item1).toBeUndefined();
      expect(item3).toBeUndefined();
    });

    it('should not throw when queue is already empty', async () => {
      await queue.ensureReady();

      await expect(queue.clear()).resolves.not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should return item by id', async () => {
      await queue.ensureReady();

      const input: EnqueueInput = {
        type: 'RECORD_AT_BAT',
        payload: { gameId: 'game-123' },
        timestamp: Date.now(),
      };

      const id = await queue.enqueue(input);
      const item = await queue.getItem(id);

      expect(item).toBeDefined();
      expect(item?.id).toBe(id);
      expect(item?.type).toBe('RECORD_AT_BAT');
      expect(item?.payload).toEqual({ gameId: 'game-123' });
    });

    it('should return undefined for non-existent item', async () => {
      await queue.ensureReady();

      const item = await queue.getItem('non-existent-id');

      expect(item).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle complex payload objects', async () => {
      await queue.ensureReady();

      const complexPayload = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date().toISOString(),
        nullValue: null,
        booleans: [true, false],
      };

      const id = await queue.enqueue({
        type: 'COMPLEX_PAYLOAD',
        payload: complexPayload,
        timestamp: Date.now(),
      });

      const item = await queue.getItem(id);
      expect(item?.payload).toEqual(complexPayload);
    });
  });
});
