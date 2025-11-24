/**
 * @file InMemoryOfflineQueue Tests
 * TDD tests for the in-memory implementation of OfflineQueuePort.
 */

import type { EnqueueInput } from '@twsoftball/application';
import { describe, it, expect, beforeEach } from 'vitest';

import { InMemoryOfflineQueue } from './InMemoryOfflineQueue';

describe('InMemoryOfflineQueue', () => {
  let queue: InMemoryOfflineQueue;

  beforeEach(() => {
    queue = new InMemoryOfflineQueue();
  });

  describe('enqueue', () => {
    it('should add item with pending status', async () => {
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
      const pending = await queue.getPendingItems();

      expect(pending).toEqual([]);
    });

    it('should include syncing items', async () => {
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
      await expect(queue.markSynced('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('markFailed', () => {
    it('should update status and error message', async () => {
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
      await expect(queue.markFailed('non-existent-id', 'Some error')).resolves.not.toThrow();
    });
  });

  describe('markSyncing', () => {
    it('should update status to syncing', async () => {
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
      await expect(queue.markSyncing('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending items only', async () => {
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
      const count = await queue.getPendingCount();

      expect(count).toBe(0);
    });

    it('should include syncing items in count', async () => {
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
      await expect(queue.clear()).resolves.not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should return item by id', async () => {
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
      const item = await queue.getItem('non-existent-id');

      expect(item).toBeUndefined();
    });
  });

  describe('queue item immutability', () => {
    it('should return copies of items to prevent external mutation', async () => {
      const id = await queue.enqueue({
        type: 'RECORD_AT_BAT',
        payload: { value: 'original' },
        timestamp: Date.now(),
      });

      const item1 = await queue.getItem(id);
      const item2 = await queue.getItem(id);

      // Items should be separate copies
      expect(item1).not.toBe(item2);
      expect(item1).toEqual(item2);
    });
  });
});
