/**
 * @file IndexedDB Transaction Manager
 * Utility class for managing IndexedDB transactions consistently
 * Eliminates duplication in transaction handling code
 */

/**
 * Result wrapper for IndexedDB transaction operations in the TW Softball EventStore.
 *
 * Provides a consistent interface for handling both successful and failed transaction
 * outcomes, enabling proper error handling and result processing across all
 * EventStore persistence operations.
 *
 * @template T - The type of data returned by successful operations
 */
export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Configuration options for IndexedDB transaction execution in EventStore operations.
 *
 * Allows customization of transaction behavior for different softball game event
 * persistence scenarios, from quick reads to complex multi-store batch operations.
 */
export interface TransactionOptions {
  mode?: IDBTransactionMode;
  timeout?: number;
}

/**
 * Utility class for managing IndexedDB transactions with robust error handling and lifecycle management.
 *
 * Provides a higher-level abstraction over raw IndexedDB transaction APIs, ensuring
 * consistent error handling, timeout management, and proper cleanup across all
 * EventStore implementations in the TW Softball application.
 *
 * @remarks
 * This manager addresses common IndexedDB pitfalls:
 * - Race conditions between operation completion and transaction lifecycle
 * - Inconsistent error handling across different operation types
 * - Transaction timeout and cleanup management
 * - Promise resolution timing issues
 *
 * All transaction operations are wrapped in proper error boundaries and include
 * timeout protection to prevent hanging operations that could impact game UX.
 *
 * @example
 * ```typescript
 * const txManager = new IndexedDBTransactionManager(database);
 *
 * const result = await txManager.executeWriteTransaction(
 *   'events',
 *   async (transaction, store) => {
 *     const request = store.add(eventData);
 *     return IndexedDBTransactionManager.promiseifyRequest(request);
 *   },
 *   5000 // 5 second timeout
 * );
 *
 * if (result.success) {
 *   console.log('Event stored:', result.data);
 * } else {
 *   console.error('Storage failed:', result.error);
 * }
 * ```
 */
export class IndexedDBTransactionManager {
  private db: IDBDatabase | undefined;

  /**
   * Creates a new transaction manager for the specified IndexedDB database.
   *
   * @param db - Optional IndexedDB database instance. Can be set later via setDatabase()
   */
  constructor(db?: IDBDatabase) {
    this.db = db;
  }

  /**
   * Updates the IndexedDB database instance used by this transaction manager.
   *
   * Allows for database instance replacement during lifecycle management,
   * such as when reconnecting after database upgrade or corruption recovery.
   *
   * @param db - The new IndexedDB database instance to use for transactions
   */
  setDatabase(db: IDBDatabase): void {
    this.db = db;
  }

  /**
   * Executes an IndexedDB transaction with comprehensive error handling and lifecycle management.
   *
   * The core transaction execution method that handles the complex IndexedDB transaction
   * lifecycle, including proper event sequencing, timeout management, and race condition
   * prevention between operation completion and transaction events.
   *
   * @template T - The return type of the transaction operation
   * @param storeNames - Object store name(s) to include in the transaction
   * @param operation - The function to execute within the transaction context
   * @param options - Transaction configuration (mode, timeout)
   * @returns Promise resolving to TransactionResult with operation outcome
   *
   * @remarks
   * This method addresses several IndexedDB complexity issues:
   *
   * **Race Condition Prevention:**
   * - Operations may complete before or after transaction events fire
   * - Uses completion flags to ensure exactly one result resolution
   * - Handles both synchronous and asynchronous operation functions
   *
   * **Error Handling:**
   * - Transaction errors (onerror, onabort) are captured and reported
   * - Operation errors automatically abort the transaction
   * - Timeout protection prevents indefinite hanging
   *
   * **Lifecycle Management:**
   * - Proper cleanup of timeout handlers
   * - Safe transaction abort on operation failures
   * - Structured error reporting with context
   *
   * @example
   * ```typescript
   * const result = await txManager.executeTransaction(
   *   ['events', 'metadata'],
   *   async (transaction, eventsStore) => {
   *     // Access other stores via transaction.objectStore()
   *     const metadataStore = transaction.objectStore('metadata');
   *
   *     await IndexedDBTransactionManager.promiseifyRequest(
   *       eventsStore.add(eventData)
   *     );
   *     await IndexedDBTransactionManager.promiseifyRequest(
   *       metadataStore.put(metadata)
   *     );
   *
   *     return { eventsStored: 1, metadataUpdated: true };
   *   },
   *   { mode: 'readwrite', timeout: 10000 }
   * );
   * ```
   */
  async executeTransaction<T>(
    storeNames: string | string[],
    operation: (transaction: IDBTransaction, objectStore: IDBObjectStore) => Promise<T> | T,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    if (!this.db) {
      return {
        success: false,
        error: new Error('Database not initialized'),
      };
    }

    const { mode = 'readwrite', timeout = 30000 } = options;
    const storeNameArray = Array.isArray(storeNames) ? storeNames : [storeNames];

    return new Promise(resolve => {
      let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
      let transactionCompleted = false;
      let operationResult: T | undefined;
      let operationError: Error | undefined;
      let operationCompleted = false;

      // Helper function to safely resolve once
      const safeResolve = (result: TransactionResult<T>): void => {
        if (!transactionCompleted) {
          transactionCompleted = true;
          if (timeoutId) globalThis.clearTimeout(timeoutId);
          resolve(result);
        }
      };

      let transaction: IDBTransaction;
      let objectStore: IDBObjectStore;

      try {
        transaction = this.db!.transaction(storeNameArray, mode);
        objectStore = transaction.objectStore(storeNameArray[0]!);
      } catch (error) {
        return resolve({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }

      // Set up timeout
      if (timeout > 0) {
        timeoutId = globalThis.setTimeout((): void => {
          if (!transactionCompleted) {
            transaction.abort();
            safeResolve({
              success: false,
              error: new Error('Transaction timeout after ' + timeout + 'ms'),
            });
          }
        }, timeout);
      }

      // Set up transaction event handlers
      transaction.oncomplete = (): void => {
        if (operationCompleted && !operationError) {
          if (operationResult !== undefined) {
            safeResolve({ success: true, data: operationResult });
          } else {
            safeResolve({ success: true });
          }
        } else if (operationError) {
          safeResolve({
            success: false,
            error: operationError,
          });
        } else {
          // Operation hasn't completed yet, wait for it
          if (operationResult !== undefined) {
            safeResolve({ success: true, data: operationResult });
          } else {
            safeResolve({ success: true });
          }
        }
      };

      transaction.onerror = (): void => {
        safeResolve({
          success: false,
          error: new Error(
            'IndexedDB transaction failed: ' + (transaction.error?.message || 'Unknown error')
          ),
        });
      };

      transaction.onabort = (): void => {
        safeResolve({
          success: false,
          error: operationError || new Error('Transaction was aborted'),
        });
      };

      // Execute the operation
      try {
        const opResult = operation(transaction, objectStore);

        // Handle async operations
        if (opResult instanceof Promise) {
          opResult
            .then(data => {
              operationResult = data;
              operationCompleted = true;
              // Transaction completion will be handled by oncomplete event
            })
            .catch(error => {
              operationError = error instanceof Error ? error : new Error(String(error));
              operationCompleted = true;

              if (!transactionCompleted) {
                transaction.abort();
              }
            });
        } else {
          // Synchronous operation
          operationResult = opResult;
          operationCompleted = true;
          // Transaction completion will be handled by oncomplete event
        }
      } catch (error) {
        operationError = error instanceof Error ? error : new Error(String(error));
        operationCompleted = true;
        transaction.abort();
      }
    });
  }

  /**
   * Executes a read-only IndexedDB transaction for data retrieval operations.
   *
   * Convenience method for read operations that automatically sets transaction
   * mode to 'readonly' and provides appropriate defaults for query operations.
   *
   * @template T - The return type of the read operation
   * @param storeNames - Object store name(s) to read from
   * @param operation - The read operation to execute
   * @param timeout - Optional timeout override (default: 30 seconds)
   * @returns Promise resolving to TransactionResult with query results
   *
   * @example
   * ```typescript
   * const result = await txManager.executeReadTransaction(
   *   'events',
   *   async (transaction, store) => {
   *     const index = store.index('gameId');
   *     const request = index.getAll(gameId.value);
   *     return IndexedDBTransactionManager.promiseifyRequest(request);
   *   }
   * );
   * ```
   */
  async executeReadTransaction<T>(
    storeNames: string | string[],
    operation: (transaction: IDBTransaction, objectStore: IDBObjectStore) => Promise<T> | T,
    timeout?: number
  ): Promise<TransactionResult<T>> {
    const options: TransactionOptions = { mode: 'readonly' };
    if (timeout !== undefined) {
      options.timeout = timeout;
    }
    return this.executeTransaction(storeNames, operation, options);
  }

  /**
   * Executes a read-write IndexedDB transaction for data modification operations.
   *
   * Convenience method for write operations that automatically sets transaction
   * mode to 'readwrite' and provides appropriate defaults for persistence operations.
   *
   * @template T - The return type of the write operation
   * @param storeNames - Object store name(s) to modify
   * @param operation - The write operation to execute
   * @param timeout - Optional timeout override (default: 30 seconds)
   * @returns Promise resolving to TransactionResult with operation results
   *
   * @example
   * ```typescript
   * const result = await txManager.executeWriteTransaction(
   *   'events',
   *   async (transaction, store) => {
   *     const eventKey = await IndexedDBTransactionManager.promiseifyRequest(
   *       store.add(serializedEvent)
   *     );
   *     return { eventId: eventKey, stored: true };
   *   }
   * );
   * ```
   */
  async executeWriteTransaction<T>(
    storeNames: string | string[],
    operation: (transaction: IDBTransaction, objectStore: IDBObjectStore) => Promise<T> | T,
    timeout?: number
  ): Promise<TransactionResult<T>> {
    const options: TransactionOptions = { mode: 'readwrite' };
    if (timeout !== undefined) {
      options.timeout = timeout;
    }
    return this.executeTransaction(storeNames, operation, options);
  }

  /**
   * Executes multiple operations within a single IndexedDB transaction for atomic batch processing.
   *
   * Essential for EventStore batch operations where multiple events must be stored
   * atomically - if any event fails to store, the entire batch is rolled back
   * to maintain data consistency in the softball game state.
   *
   * @template T - The return type of individual operations
   * @param storeNames - Object store name(s) for the batch operations
   * @param operations - Array of operations to execute atomically
   * @param options - Transaction configuration
   * @returns Promise resolving to TransactionResult containing array of all operation results
   *
   * @remarks
   * All operations execute sequentially within the same transaction context.
   * If any operation fails, the entire transaction is aborted and no changes
   * are persisted. This ensures atomic batch behavior critical for event sourcing.
   *
   * @example
   * ```typescript
   * const events = [gameCreated, firstAtBat, secondAtBat];
   *
   * const result = await txManager.executeBatchTransaction(
   *   'events',
   *   events.map(event =>
   *     (transaction, store) => store.add(serializeEvent(event))
   *   ),
   *   { mode: 'readwrite', timeout: 15000 }
   * );
   *
   * if (result.success) {
   *   console.log('All events stored:', result.data); // Array of event keys
   * } else {
   *   console.log('Batch failed, no events stored:', result.error);
   * }
   * ```
   */
  async executeBatchTransaction<T>(
    storeNames: string | string[],
    operations: Array<(transaction: IDBTransaction, objectStore: IDBObjectStore) => Promise<T> | T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(
      storeNames,
      async (transaction, objectStore) => {
        const results: T[] = [];

        for (const operation of operations) {
          const result = await operation(transaction, objectStore);
          results.push(result);
        }

        return results;
      },
      options
    );
  }

  /**
   * Converts IndexedDB request objects into Promises with proper error handling.
   *
   * IndexedDB uses an event-based API that requires manual Promise wrapping.
   * This utility provides consistent error handling and Promise conversion
   * for all IndexedDB request operations in the EventStore.
   *
   * @template T - The expected result type of the IndexedDB request
   * @param request - The IndexedDB request object to promisify
   * @returns Promise that resolves with request.result or rejects with request.error
   *
   * @example
   * @example
   * // Instead of event handlers:
   * // request.onsuccess = (event) => { handle success };
   * // request.onerror = (event) => { handle error };
   *
   * // Use Promise-based approach:
   * // try {
   * //   const result = await IndexedDBTransactionManager.promiseifyRequest(request);
   * //   // handle success
   * // } catch (error) {
   * //   // handle error
   * // }
   */
  static promiseifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void =>
        reject(
          new Error('IndexedDB operation failed: ' + (request.error?.message || 'Unknown error'))
        );
    });
  }

  /**
   * Converts IndexedDB cursor iteration into a Promise-based operation with result collection.
   *
   * Simplifies the complex IndexedDB cursor API by handling cursor iteration
   * automatically and collecting processed results into an array. Essential
   * for EventStore query operations that need to process multiple records.
   *
   * @template T - The type of processed results from cursor iteration
   * @param request - The IndexedDB cursor request to iterate
   * @param processor - Function to process each cursor value into result type T
   * @returns Promise resolving to array of processed results
   *
   * @remarks
   * The processor function is called for each record the cursor visits.
   * Return `undefined` from the processor to skip including that record
   * in the final results array.
   *
   * @example
   * // Get all events for a specific game:
   * // const gameEvents = await IndexedDBTransactionManager.promisifyCursor(
   * //   gameIndex.openCursor(IDBKeyRange.only(gameId.value)),
   * //   (cursor) => {
   * //     const storedEvent = cursor.value as StoredEvent;
   * //     // Only include events after a certain timestamp
   * //     if (storedEvent.timestamp > cutoffTime) {
   * //       return storedEvent;
   * //     }
   * //     // Return undefined to skip this record
   * //     return undefined;
   * //   }
   * // );
   */
  static promisifyCursor<T>(
    request: IDBRequest<IDBCursorWithValue | null>,
    processor: (cursor: IDBCursorWithValue) => T | void
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];

      request.onsuccess = (): void => {
        const cursor = request.result;
        if (cursor) {
          // Process current cursor position
          const result = processor(cursor);
          if (result !== undefined) {
            results.push(result);
          }
          // Move to next record
          cursor.continue();
        } else {
          // Cursor exhausted - return collected results
          resolve(results);
        }
      };

      request.onerror = (): void =>
        reject(
          new Error('Cursor iteration failed: ' + (request.error?.message || 'Unknown error'))
        );
    });
  }
}
