/**
 * @file OfflineQueuePort
 * Port interface for offline queue operations in PWA context.
 *
 * @remarks
 * This port defines the contract for offline queue functionality that
 * enables the app to queue operations when offline and sync them when
 * back online. It's a key component of the offline-first PWA strategy.
 *
 * Implementation notes:
 * - All operations are async to support both in-memory and persistent storage
 * - The queue is FIFO (First In, First Out) for processing order
 * - Status tracking enables sync progress visualization
 * - Error handling with retry counts supports resilient syncing
 *
 * @example
 * ```typescript
 * // Queue an operation while offline
 * const itemId = await offlineQueue.enqueue({
 *   type: 'RECORD_AT_BAT',
 *   payload: { gameId: 'game-123', result: 'single' },
 *   timestamp: Date.now()
 * });
 *
 * // When online, process the queue
 * const pending = await offlineQueue.getPendingItems();
 * for (const item of pending) {
 *   try {
 *     await syncToServer(item);
 *     await offlineQueue.markSynced(item.id);
 *   } catch (error) {
 *     await offlineQueue.markFailed(item.id, error.message);
 *   }
 * }
 * ```
 */

/**
 * Status of a queued item.
 *
 * - `pending`: Item is waiting to be synced
 * - `syncing`: Item is currently being synced
 * - `synced`: Item has been successfully synced
 * - `failed`: Item failed to sync (check error field)
 */
export type QueueItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * Represents an item in the offline queue.
 *
 * @remarks
 * Each queue item contains the operation type, payload, and metadata
 * needed for tracking and processing. The status field tracks sync
 * progress, while retryCount and error support error recovery.
 */
export interface QueueItem {
  /** Unique identifier for the queue item */
  readonly id: string;

  /**
   * Type of the operation being queued.
   *
   * @example 'RECORD_AT_BAT', 'START_GAME', 'END_INNING'
   */
  readonly type: string;

  /**
   * Payload data for the operation.
   * Structure depends on the operation type.
   */
  readonly payload: unknown;

  /**
   * Unix timestamp (ms) when the item was enqueued.
   * Used for FIFO ordering and debugging.
   */
  readonly timestamp: number;

  /** Current status of the queue item */
  readonly status: QueueItemStatus;

  /**
   * Number of times this item has been retried.
   * Starts at 0, incremented on each failed sync attempt.
   */
  readonly retryCount: number;

  /** Error message if status is 'failed' */
  readonly error?: string;
}

/**
 * Input for enqueueing a new item.
 * ID, status, and retryCount are auto-generated.
 */
export type EnqueueInput = Omit<QueueItem, 'id' | 'status' | 'retryCount'>;

/**
 * Port for offline queue operations.
 *
 * @remarks
 * This interface allows queueing operations when offline and processing
 * them when back online. Implementations may use IndexedDB for persistence
 * or in-memory storage for testing.
 *
 * Design Principles:
 * - FIFO ordering for queue processing
 * - Status tracking for UI feedback
 * - Error tracking with retry support
 * - Clear method for testing and cleanup
 */
export interface OfflineQueuePort {
  /**
   * Add an operation to the queue.
   *
   * @param item - The item to enqueue (without id, status, retryCount)
   * @returns Promise resolving to the generated item ID
   *
   * @example
   * ```typescript
   * const id = await queue.enqueue({
   *   type: 'RECORD_AT_BAT',
   *   payload: { gameId: 'game-123', result: 'single' },
   *   timestamp: Date.now()
   * });
   * ```
   */
  enqueue(item: EnqueueInput): Promise<string>;

  /**
   * Get all pending items in the queue.
   *
   * @returns Promise resolving to array of pending items in FIFO order
   *
   * @remarks
   * Returns items with status 'pending' or 'syncing', ordered by timestamp.
   * Items with status 'synced' or 'failed' are not included.
   */
  getPendingItems(): Promise<QueueItem[]>;

  /**
   * Mark an item as synced (removes from queue).
   *
   * @param id - ID of the item to mark as synced
   * @returns Promise resolving when the item is marked/removed
   *
   * @remarks
   * Successfully synced items are typically removed from the queue
   * to prevent re-processing. Implementations may choose to mark
   * status as 'synced' or delete the record entirely.
   */
  markSynced(id: string): Promise<void>;

  /**
   * Mark an item as failed with error message.
   *
   * @param id - ID of the item to mark as failed
   * @param error - Error message describing the failure
   * @returns Promise resolving when the item is updated
   *
   * @remarks
   * Also increments the retryCount. Failed items can be retried
   * later or reported to the user for manual intervention.
   */
  markFailed(id: string, error: string): Promise<void>;

  /**
   * Get the count of pending items.
   *
   * @returns Promise resolving to number of pending items
   *
   * @remarks
   * Useful for UI indicators showing sync status (e.g., badge count).
   * Only counts items with status 'pending' or 'syncing'.
   */
  getPendingCount(): Promise<number>;

  /**
   * Clear all items from the queue.
   *
   * @returns Promise resolving when queue is cleared
   *
   * @remarks
   * Removes all items regardless of status. Primarily used for
   * testing cleanup, user logout, or factory reset scenarios.
   */
  clear(): Promise<void>;

  /**
   * Update an item's status to syncing.
   *
   * @param id - ID of the item to mark as syncing
   * @returns Promise resolving when the item is updated
   *
   * @remarks
   * Used to indicate that sync is in progress. Helps prevent
   * duplicate processing and provides UI feedback.
   */
  markSyncing(id: string): Promise<void>;

  /**
   * Get a single item by ID.
   *
   * @param id - ID of the item to retrieve
   * @returns Promise resolving to the item or undefined if not found
   */
  getItem(id: string): Promise<QueueItem | undefined>;
}
