/**
 * @file InMemoryOfflineQueue
 * In-memory implementation of OfflineQueuePort for testing and development.
 *
 * @remarks
 * This implementation stores queue items in memory using a Map structure.
 * Ideal for unit testing and development scenarios where persistence
 * is not required.
 *
 * Features:
 * - Fast synchronous operations wrapped in Promises for interface compatibility
 * - Unique ID generation using crypto.randomUUID
 * - FIFO ordering by timestamp
 * - Thread-safe for single-threaded JavaScript environments
 *
 * @example
 * ```typescript
 * import { InMemoryOfflineQueue } from '@twsoftball/infrastructure/memory';
 *
 * const queue = new InMemoryOfflineQueue();
 *
 * const id = await queue.enqueue({
 *   type: 'RECORD_AT_BAT',
 *   payload: { gameId: 'game-123' },
 *   timestamp: Date.now()
 * });
 *
 * const pending = await queue.getPendingItems();
 * ```
 */

import type {
  OfflineQueuePort,
  QueueItem,
  QueueItemStatus,
  EnqueueInput,
} from '@twsoftball/application';

/**
 * Mutable internal representation of a queue item.
 * Used internally to allow status and retryCount updates.
 */
interface MutableQueueItem {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  status: QueueItemStatus;
  retryCount: number;
  error?: string;
}

/**
 * Generates a unique ID for queue items.
 * Falls back to timestamp-based ID if crypto.randomUUID is unavailable.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * In-memory implementation of OfflineQueuePort.
 *
 * @remarks
 * Provides a simple, fast implementation for testing and development.
 * All data is stored in memory and lost when the instance is garbage collected.
 *
 * Implementation details:
 * - Uses Map for O(1) lookups by ID
 * - Returns deep copies to prevent external mutation
 * - Sorts by timestamp for FIFO ordering
 */
export class InMemoryOfflineQueue implements OfflineQueuePort {
  private readonly items: Map<string, MutableQueueItem> = new Map();

  /**
   * Add an operation to the queue.
   *
   * @param item - The item to enqueue (without id, status, retryCount)
   * @returns Promise resolving to the generated item ID
   */
  enqueue(item: EnqueueInput): Promise<string> {
    const id = generateId();

    const queueItem: MutableQueueItem = {
      id,
      type: item.type,
      payload: this.deepClone(item.payload),
      timestamp: item.timestamp,
      status: 'pending',
      retryCount: 0,
    };

    this.items.set(id, queueItem);
    return Promise.resolve(id);
  }

  /**
   * Get all pending items in the queue.
   *
   * @returns Promise resolving to array of pending items in FIFO order
   */
  getPendingItems(): Promise<QueueItem[]> {
    const pendingItems: QueueItem[] = [];

    for (const item of this.items.values()) {
      if (item.status === 'pending' || item.status === 'syncing') {
        pendingItems.push(this.toImmutableItem(item));
      }
    }

    // Sort by timestamp (FIFO)
    pendingItems.sort((a, b) => a.timestamp - b.timestamp);

    return Promise.resolve(pendingItems);
  }

  /**
   * Mark an item as synced (removes from queue).
   *
   * @param id - ID of the item to mark as synced
   */
  markSynced(id: string): Promise<void> {
    // Remove the item from the queue
    this.items.delete(id);
    return Promise.resolve();
  }

  /**
   * Mark an item as failed with error message.
   *
   * @param id - ID of the item to mark as failed
   * @param error - Error message describing the failure
   */
  markFailed(id: string, error: string): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.status = 'failed';
      item.error = error;
      item.retryCount += 1;
    }
    return Promise.resolve();
  }

  /**
   * Get the count of pending items.
   *
   * @returns Promise resolving to number of pending items
   */
  getPendingCount(): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.status === 'pending' || item.status === 'syncing') {
        count++;
      }
    }
    return Promise.resolve(count);
  }

  /**
   * Clear all items from the queue.
   */
  clear(): Promise<void> {
    this.items.clear();
    return Promise.resolve();
  }

  /**
   * Update an item's status to syncing.
   *
   * @param id - ID of the item to mark as syncing
   */
  markSyncing(id: string): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.status = 'syncing';
    }
    return Promise.resolve();
  }

  /**
   * Get a single item by ID.
   *
   * @param id - ID of the item to retrieve
   * @returns Promise resolving to the item or undefined if not found
   */
  getItem(id: string): Promise<QueueItem | undefined> {
    const item = this.items.get(id);
    if (!item) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(this.toImmutableItem(item));
  }

  /**
   * Converts a mutable internal item to an immutable QueueItem.
   * Creates a deep copy to prevent external mutation.
   */
  private toImmutableItem(item: MutableQueueItem): QueueItem {
    const result: QueueItem = {
      id: item.id,
      type: item.type,
      payload: this.deepClone(item.payload),
      timestamp: item.timestamp,
      status: item.status,
      retryCount: item.retryCount,
    };

    if (item.error !== undefined) {
      return { ...result, error: item.error };
    }

    return result;
  }

  /**
   * Creates a deep clone of a value.
   * Handles primitive values, arrays, and plain objects.
   */
  private deepClone<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }
    // Use JSON parse/stringify for deep cloning
    // This works for JSON-serializable data which is what we expect in payloads
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
