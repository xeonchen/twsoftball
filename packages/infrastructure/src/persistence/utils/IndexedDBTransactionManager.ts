/**
 * @file IndexedDB Transaction Manager
 * Utility class for managing IndexedDB transactions consistently
 * Eliminates duplication in transaction handling code
 */

/**
 * Transaction execution result
 */
export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  mode?: IDBTransactionMode;
  timeout?: number;
}

/**
 * Manages IndexedDB transactions with consistent error handling and lifecycle management
 */
export class IndexedDBTransactionManager {
  private db: IDBDatabase | undefined;

  constructor(db?: IDBDatabase) {
    this.db = db;
  }

  /**
   * Sets the database instance
   */
  setDatabase(db: IDBDatabase): void {
    this.db = db;
  }

  /**
   * Executes a transaction with automatic error handling and cleanup
   * Fixed race conditions in promise resolution and transaction lifecycle management
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

      const transaction = this.db!.transaction(storeNameArray, mode);
      const objectStore = transaction.objectStore(storeNameArray[0]!);

      // Set up timeout
      if (timeout > 0) {
        timeoutId = globalThis.setTimeout((): void => {
          if (!transactionCompleted) {
            transaction.abort();
            safeResolve({
              success: false,
              error: new Error(`Transaction timeout after ${timeout}ms`),
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
            `IndexedDB transaction failed: ${transaction.error?.message || 'Unknown error'}`
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
   * Executes a read-only transaction
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
   * Executes a read-write transaction
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
   * Executes multiple operations within a single transaction
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
   * Wraps an IDB request in a Promise with proper error handling
   */
  static promiseifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void =>
        reject(
          new Error(`IndexedDB operation failed: ${request.error?.message || 'Unknown error'}`)
        );
    });
  }

  /**
   * Wraps an IDB cursor iteration in a Promise
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
          const result = processor(cursor);
          if (result !== undefined) {
            results.push(result);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = (): void =>
        reject(new Error(`Cursor iteration failed: ${request.error?.message || 'Unknown error'}`));
    });
  }
}
