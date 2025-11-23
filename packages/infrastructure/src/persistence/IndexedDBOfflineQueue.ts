/**
 * @file IndexedDBOfflineQueue
 * IndexedDB implementation of OfflineQueuePort for persistent offline queue storage.
 *
 * @remarks
 * This implementation provides a persistent queue using IndexedDB for browser-based
 * storage. It's designed for production PWA applications with offline-first capabilities.
 *
 * Database Schema:
 * - Database name: 'tw-softball-offline-queue' (configurable)
 * - Version: 1
 * - Object store: 'queue' with keyPath 'id'
 * - Indexes: status, timestamp
 *
 * Design Principles:
 * - Singleton connection pattern for performance
 * - Lazy initialization on first access
 * - FIFO ordering by timestamp
 * - Robust error handling
 *
 * @example
 * ```typescript
 * import { IndexedDBOfflineQueue } from '@twsoftball/infrastructure/persistence';
 *
 * const queue = new IndexedDBOfflineQueue();
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
 * Database configuration constants
 */
const DEFAULT_DATABASE_NAME = 'tw-softball-offline-queue';
const DATABASE_VERSION = 1;
const QUEUE_STORE_NAME = 'queue';

/**
 * Internal record structure for IndexedDB storage
 */
interface QueueRecord {
  id: string;
  type: string;
  payload: string; // JSON serialized
  timestamp: number;
  status: QueueItemStatus;
  retryCount: number;
  error?: string;
}

/**
 * Custom error types for better error handling
 */
class OfflineQueueError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(`OfflineQueue operation failed: ${message}`);
    this.name = 'OfflineQueueError';
  }
}

class OfflineQueueConnectionError extends OfflineQueueError {
  constructor(message: string, cause?: Error) {
    super(`Connection error: ${message}`, cause);
    this.name = 'OfflineQueueConnectionError';
  }
}

/**
 * Generates a unique ID for queue items.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * IndexedDB implementation of OfflineQueuePort.
 *
 * @remarks
 * Provides persistent queue storage using IndexedDB for offline-first PWA
 * applications. Automatically handles database creation, schema setup,
 * and connection lifecycle management.
 */
export class IndexedDBOfflineQueue implements OfflineQueuePort {
  private db: IDBDatabase | null = null;
  private connectionPromise: Promise<IDBDatabase> | null = null;
  private isConnecting = false;

  constructor(private readonly databaseName: string = DEFAULT_DATABASE_NAME) {}

  /**
   * Ensures the database connection is ready.
   * Public method for explicit initialization in tests.
   */
  async ensureReady(): Promise<void> {
    await this.ensureConnection();
  }

  /**
   * Ensures database connection is established with singleton pattern.
   */
  private async ensureConnection(): Promise<IDBDatabase> {
    // Return existing connection if available
    if (this.db) {
      return this.db;
    }

    // Return existing connection promise if already connecting
    if (this.connectionPromise && this.isConnecting) {
      return this.connectionPromise;
    }

    // Create new connection
    this.isConnecting = true;
    this.connectionPromise = this.createConnection();

    try {
      this.db = await this.connectionPromise;
      return this.db;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Creates a new database connection with schema setup.
   */
  private createConnection(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Check IndexedDB availability
      if (!this.isIndexedDBAvailable()) {
        reject(new OfflineQueueConnectionError('IndexedDB is not available'));
        return;
      }

      const request = globalThis.indexedDB.open(this.databaseName, DATABASE_VERSION);

      request.onerror = (): void => {
        const error = request.error || new DOMException('Unknown error', 'UnknownError');
        reject(new OfflineQueueConnectionError(`Failed to open database: ${error.message}`, error));
      };

      request.onblocked = (): void => {
        // Handle blocked state - another connection might be upgrading
      };

      request.onupgradeneeded = (event): void => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createObjectStores(db);
        } catch (error) {
          reject(
            new OfflineQueueError(
              `Failed to create database schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error : undefined
            )
          );
        }
      };

      request.onsuccess = (): void => {
        const db = request.result;

        // Set up connection lifecycle handlers
        db.onclose = (): void => {
          this.db = null;
          this.connectionPromise = null;
        };

        db.onerror = (): void => {
          // Handle connection errors silently
        };

        db.onversionchange = (): void => {
          db.close();
          this.db = null;
          this.connectionPromise = null;
        };

        resolve(db);
      };
    });
  }

  /**
   * Creates object stores and indexes during database upgrade.
   */
  private createObjectStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
      const store = db.createObjectStore(QUEUE_STORE_NAME, {
        keyPath: 'id',
        autoIncrement: false,
      });

      // Create indexes for efficient querying
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    }
  }

  /**
   * Checks if IndexedDB is available in the current browser.
   */
  private isIndexedDBAvailable(): boolean {
    try {
      return (
        typeof globalThis !== 'undefined' &&
        'indexedDB' in globalThis &&
        globalThis.indexedDB !== null &&
        typeof globalThis.indexedDB.open === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * Add an operation to the queue.
   */
  async enqueue(item: EnqueueInput): Promise<string> {
    const db = await this.ensureConnection();
    const id = generateId();

    const record: QueueRecord = {
      id,
      type: item.type,
      payload: JSON.stringify(item.payload),
      timestamp: item.timestamp,
      status: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const request = store.add(record);

      request.onsuccess = (): void => {
        resolve(id);
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to enqueue item: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Get all pending items in the queue.
   */
  async getPendingItems(): Promise<QueueItem[]> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const items: QueueItem[] = [];

      const request = store.openCursor();

      request.onsuccess = (event): void => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (cursor) {
          const record = cursor.value as QueueRecord;

          if (record.status === 'pending' || record.status === 'syncing') {
            items.push(this.recordToQueueItem(record));
          }

          cursor.continue();
        } else {
          // Sort by timestamp (FIFO)
          items.sort((a, b) => a.timestamp - b.timestamp);
          resolve(items);
        }
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to get pending items: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Mark an item as synced (removes from queue).
   */
  async markSynced(id: string): Promise<void> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const request = store.delete(id);

      request.onsuccess = (): void => {
        resolve();
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to mark item as synced: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Mark an item as failed with error message.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const getRequest = store.get(id);

      getRequest.onsuccess = (): void => {
        const record = getRequest.result as QueueRecord | undefined;

        if (!record) {
          // Item doesn't exist, nothing to update
          resolve();
          return;
        }

        const updatedRecord: QueueRecord = {
          ...record,
          status: 'failed',
          error,
          retryCount: record.retryCount + 1,
        };

        const putRequest = store.put(updatedRecord);

        putRequest.onsuccess = (): void => {
          resolve();
        };

        putRequest.onerror = (): void => {
          reject(
            new OfflineQueueError(
              `Failed to mark item as failed: ${putRequest.error?.message || 'Unknown error'}`,
              putRequest.error || undefined
            )
          );
        };
      };

      getRequest.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to get item for marking failed: ${getRequest.error?.message || 'Unknown error'}`,
            getRequest.error || undefined
          )
        );
      };
    });
  }

  /**
   * Get the count of pending items.
   */
  async getPendingCount(): Promise<number> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      let count = 0;

      const request = store.openCursor();

      request.onsuccess = (event): void => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (cursor) {
          const record = cursor.value as QueueRecord;

          if (record.status === 'pending' || record.status === 'syncing') {
            count++;
          }

          cursor.continue();
        } else {
          resolve(count);
        }
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to get pending count: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Clear all items from the queue.
   */
  async clear(): Promise<void> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const request = store.clear();

      request.onsuccess = (): void => {
        resolve();
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to clear queue: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Update an item's status to syncing.
   */
  async markSyncing(id: string): Promise<void> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const getRequest = store.get(id);

      getRequest.onsuccess = (): void => {
        const record = getRequest.result as QueueRecord | undefined;

        if (!record) {
          // Item doesn't exist, nothing to update
          resolve();
          return;
        }

        const updatedRecord: QueueRecord = {
          ...record,
          status: 'syncing',
        };

        const putRequest = store.put(updatedRecord);

        putRequest.onsuccess = (): void => {
          resolve();
        };

        putRequest.onerror = (): void => {
          reject(
            new OfflineQueueError(
              `Failed to mark item as syncing: ${putRequest.error?.message || 'Unknown error'}`,
              putRequest.error || undefined
            )
          );
        };
      };

      getRequest.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to get item for marking syncing: ${getRequest.error?.message || 'Unknown error'}`,
            getRequest.error || undefined
          )
        );
      };
    });
  }

  /**
   * Get a single item by ID.
   */
  async getItem(id: string): Promise<QueueItem | undefined> {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);

      const request = store.get(id);

      request.onsuccess = (): void => {
        const record = request.result as QueueRecord | undefined;

        if (!record) {
          resolve(undefined);
          return;
        }

        resolve(this.recordToQueueItem(record));
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to get item: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };
    });
  }

  /**
   * Converts a database record to a QueueItem.
   */
  private recordToQueueItem(record: QueueRecord): QueueItem {
    const item: QueueItem = {
      id: record.id,
      type: record.type,
      payload: JSON.parse(record.payload) as unknown,
      timestamp: record.timestamp,
      status: record.status,
      retryCount: record.retryCount,
    };

    if (record.error !== undefined) {
      return { ...item, error: record.error };
    }

    return item;
  }

  /**
   * Closes the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Destroys the queue and deletes the database.
   */
  async destroy(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      if (!this.isIndexedDBAvailable()) {
        resolve();
        return;
      }

      const request = globalThis.indexedDB.deleteDatabase(this.databaseName);

      request.onsuccess = (): void => {
        resolve();
      };

      request.onerror = (): void => {
        reject(
          new OfflineQueueError(
            `Failed to delete database: ${request.error?.message || 'Unknown error'}`,
            request.error || undefined
          )
        );
      };

      request.onblocked = (): void => {
        // Database deletion blocked - another connection might be open
        resolve();
      };
    });
  }
}
