/**
 * @file IndexedDBTransactionManager Tests
 * Comprehensive test suite for the IndexedDBTransactionManager utility class.
 *
 * @remarks
 * This test suite validates all transaction management functionality including:
 * - Transaction lifecycle management (create, execute, complete, error, abort)
 * - Async and sync operation handling
 * - Timeout management with proper cleanup
 * - Read-only and read-write transaction modes
 * - Batch transaction operations
 * - Error handling and recovery
 * - Promise utilities for IDB requests and cursors
 * - Race condition prevention in transaction resolution
 *
 * Tests use comprehensive mocking of IndexedDB APIs to ensure deterministic behavior
 * and cover all edge cases including timeout scenarios, transaction aborts, and
 * error conditions that are difficult to reproduce with real IndexedDB.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { IndexedDBTransactionManager } from './IndexedDBTransactionManager';

// Mock IDB interfaces for testing
interface MockIDBTransaction {
  mode: IDBTransactionMode;
  objectStoreNames: DOMStringList;
  objectStore: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  oncomplete: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onabort: ((event: Event) => void) | null;
  error: DOMException | null;
}

interface MockIDBObjectStore {
  name: string;
  add: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  openCursor: ReturnType<typeof vi.fn>;
}

interface MockIDBDatabase {
  name: string;
  version: number;
  transaction: ReturnType<typeof vi.fn>;
  objectStoreNames: DOMStringList;
}

interface MockIDBRequest {
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  result: unknown;
  error: DOMException | null;
}

interface MockIDBCursorWithValue {
  value: unknown;
  key: unknown;
  continue: ReturnType<typeof vi.fn>;
}

describe('IndexedDBTransactionManager', () => {
  let manager: IndexedDBTransactionManager;
  let mockDb: MockIDBDatabase;
  let mockTransaction: MockIDBTransaction;
  let mockObjectStore: MockIDBObjectStore;
  let originalSetTimeout: typeof globalThis.setTimeout;
  let originalClearTimeout: typeof globalThis.clearTimeout;

  beforeEach(() => {
    // Store original timer functions
    originalSetTimeout = globalThis.setTimeout;
    originalClearTimeout = globalThis.clearTimeout;

    // Mock global timer functions
    globalThis.setTimeout = vi
      .fn()
      .mockImplementation((callback: (...args: unknown[]) => void, delay?: number) => {
        return originalSetTimeout(callback, delay) as unknown as ReturnType<
          typeof globalThis.setTimeout
        >;
      }) as unknown as typeof globalThis.setTimeout;
    globalThis.clearTimeout = vi.fn(
      (timeoutId: string | number | ReturnType<typeof setTimeout> | undefined) => {
        originalClearTimeout(timeoutId);
      }
    );

    // Create mock IndexedDB objects
    mockObjectStore = {
      name: 'events',
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      openCursor: vi.fn(),
    };

    mockTransaction = {
      mode: 'readwrite',
      objectStoreNames: { contains: vi.fn(), item: vi.fn(), length: 1 } as unknown as DOMStringList,
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
      abort: vi.fn(),
      oncomplete: null,
      onerror: null,
      onabort: null,
      error: null,
    };

    mockDb = {
      name: 'test-db',
      version: 1,
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: { contains: vi.fn(), item: vi.fn(), length: 1 } as unknown as DOMStringList,
    };

    // Create manager instances
    manager = new IndexedDBTransactionManager(mockDb as unknown as IDBDatabase);
  });

  afterEach(() => {
    // Restore original timer functions
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    vi.restoreAllMocks();
  });

  describe('Constructor and Database Management', () => {
    it('should create manager without database', () => {
      const managerWithoutDb = new IndexedDBTransactionManager();
      expect(managerWithoutDb).toBeInstanceOf(IndexedDBTransactionManager);
    });

    it('should create manager with database', () => {
      const managerWithDb = new IndexedDBTransactionManager(mockDb as unknown as IDBDatabase);
      expect(managerWithDb).toBeInstanceOf(IndexedDBTransactionManager);
    });

    it('should set database after construction', () => {
      const managerWithoutDb = new IndexedDBTransactionManager();
      managerWithoutDb.setDatabase(mockDb as unknown as IDBDatabase);

      // Verify database is set by attempting an operation
      expect(async () => {
        await managerWithoutDb.executeTransaction('events', () => 'test');
      }).not.toThrow();
    });
  });

  describe('executeTransaction', () => {
    describe('Database Validation', () => {
      it('should return error result when database is not initialized', async () => {
        const managerWithoutDb = new IndexedDBTransactionManager();
        const result = await managerWithoutDb.executeTransaction('events', () => 'test');

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe('Database not initialized');
        expect(result.data).toBeUndefined();
      });
    });

    describe('Transaction Creation', () => {
      it('should create transaction with single store name', async () => {
        // Setup auto-complete for immediate success
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue('test-result');
        const result = await manager.executeTransaction('events', operation);

        expect(mockDb.transaction).toHaveBeenCalledWith(['events'], 'readwrite');
        expect(mockTransaction.objectStore).toHaveBeenCalledWith('events');
        expect(operation).toHaveBeenCalledWith(mockTransaction, mockObjectStore);
        expect(result.success).toBe(true);
        expect(result.data).toBe('test-result');
      });

      it('should create transaction with multiple store names', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue('test-result');
        await manager.executeTransaction(['events', 'snapshots'], operation);

        expect(mockDb.transaction).toHaveBeenCalledWith(['events', 'snapshots'], 'readwrite');
      });

      it('should use readonly mode when specified', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue('test-result');
        await manager.executeTransaction('events', operation, { mode: 'readonly' });

        expect(mockDb.transaction).toHaveBeenCalledWith(['events'], 'readonly');
      });

      it('should default to readwrite mode', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue('test-result');
        await manager.executeTransaction('events', operation);

        expect(mockDb.transaction).toHaveBeenCalledWith(['events'], 'readwrite');
      });
    });

    describe('Synchronous Operations', () => {
      it('should handle successful synchronous operation', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue('sync-result');
        const result = await manager.executeTransaction('events', operation);

        expect(operation).toHaveBeenCalledWith(mockTransaction, mockObjectStore);
        expect(result.success).toBe(true);
        expect(result.data).toBe('sync-result');
      });

      it('should handle synchronous operation that throws', async () => {
        const error = new Error('Sync operation failed');
        const operation = vi.fn().mockImplementation(() => {
          throw error;
        });

        // Trigger abort event after abort is called
        setTimeout(() => {
          mockTransaction.onabort?.(new Event('abort'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(mockTransaction.abort).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
      });

      it('should handle synchronous operation returning undefined', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue(undefined);
        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBeUndefined();
      });

      it('should handle synchronous operation returning null', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const operation = vi.fn().mockReturnValue(null);
        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBe(null);
      });
    });

    describe('Asynchronous Operations', () => {
      it('should handle successful async operation', async () => {
        const operation = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-result';
        });

        // Complete transaction after async operation resolves
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 50);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBe('async-result');
      });

      it('should handle async operation that rejects', async () => {
        const error = new Error('Async operation failed');
        const operation = vi.fn().mockRejectedValue(error);

        // Trigger abort event after operation fails
        setTimeout(() => {
          mockTransaction.onabort?.(new Event('abort'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(mockTransaction.abort).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
      });

      it('should handle async operation rejecting with non-Error', async () => {
        const operation = vi.fn().mockRejectedValue('string error');

        // Trigger abort event after operation fails
        setTimeout(() => {
          mockTransaction.onabort?.(new Event('abort'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(mockTransaction.abort).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe('string error');
      });

      it('should handle async operation returning promise that resolves to undefined', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        const operation = vi.fn().mockResolvedValue(undefined);
        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBeUndefined();
      });
    });

    describe('Transaction Event Handlers', () => {
      it('should handle transaction completion successfully', async () => {
        const operation = vi.fn().mockReturnValue('completed-result');

        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBe('completed-result');
      });

      it('should handle transaction error', async () => {
        const operation = vi.fn().mockReturnValue('should-not-return');
        mockTransaction.error = new DOMException('Transaction failed', 'TransactionInactiveError');

        setTimeout(() => {
          mockTransaction.onerror?.(new Event('error'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toContain('IndexedDB transaction failed');
      });

      it('should handle transaction error with no error details', async () => {
        const operation = vi.fn().mockReturnValue('should-not-return');
        mockTransaction.error = null;

        setTimeout(() => {
          mockTransaction.onerror?.(new Event('error'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Unknown error');
      });

      it('should handle transaction abort without operation error', async () => {
        const operation = vi.fn().mockReturnValue('should-not-return');

        setTimeout(() => {
          mockTransaction.onabort?.(new Event('abort'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Transaction was aborted');
      });

      it('should handle transaction abort with operation error', async () => {
        const operationError = new Error('Operation caused abort');
        const operation = vi.fn().mockRejectedValue(operationError);

        setTimeout(() => {
          mockTransaction.onabort?.(new Event('abort'));
        }, 50); // Give time for async operation to fail first

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(false);
        expect(result.error).toBe(operationError);
      });
    });

    describe('Timeout Management', () => {
      it('should apply default timeout of 30 seconds', async () => {
        const operation = vi.fn().mockReturnValue('test');

        // Don't complete the transaction to test timeout
        const promise = manager.executeTransaction('events', operation);

        expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000);

        // Complete transaction to resolve promise
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        await promise;
      });

      it('should use custom timeout when specified', async () => {
        const operation = vi.fn().mockReturnValue('test');

        const promise = manager.executeTransaction('events', operation, { timeout: 5000 });

        expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

        // Complete transaction to resolve promise
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        await promise;
      });

      it('should disable timeout when set to 0', async () => {
        // Reset the setTimeout mock for this specific test
        vi.clearAllMocks();

        originalSetTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        const operation = vi.fn().mockReturnValue('test');
        await manager.executeTransaction('events', operation, { timeout: 0 });

        expect(globalThis.setTimeout).not.toHaveBeenCalled();
      });

      it('should clear timeout on successful completion', async () => {
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 10);

        const operation = vi.fn().mockReturnValue('test');
        await manager.executeTransaction('events', operation, { timeout: 5000 });

        expect(globalThis.clearTimeout).toHaveBeenCalled();
      });

      it('should abort transaction and return timeout error when timeout expires', async () => {
        const operation = vi.fn().mockImplementation(() => {
          // Never complete, causing timeout
          return new Promise(() => {});
        });

        // Mock setTimeout to immediately call the callback
        (globalThis.setTimeout as unknown as ReturnType<typeof vi.fn>).mockImplementation(
          (callback: () => void) => {
            originalSetTimeout(callback, 0);
            return 123 as unknown as ReturnType<typeof globalThis.setTimeout>;
          }
        );

        const result = await manager.executeTransaction('events', operation, { timeout: 1000 });

        expect(mockTransaction.abort).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Transaction timeout after 1000ms');
      });

      it('should not timeout if transaction completes before timeout', async () => {
        const operation = vi.fn().mockReturnValue('completed-result');

        // Complete transaction immediately
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);

        const result = await manager.executeTransaction('events', operation, { timeout: 1000 });

        expect(mockTransaction.abort).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data).toBe('completed-result');
      });
    });

    describe('Race Condition Prevention', () => {
      it('should prevent multiple resolution of promise', async () => {
        const operation = vi.fn().mockReturnValue('test-result');

        // Simulate race condition by firing multiple events
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
          mockTransaction.oncomplete?.(new Event('complete')); // Second call should be ignored
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBe('test-result');
      });

      it('should handle operation completion race with transaction completion', async () => {
        const operation = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => originalSetTimeout(resolve, 5));
          return 'async-result';
        });

        // Fire transaction complete after async operation finishes
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 15);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(true);
        expect(result.data).toBe('async-result');
      });
    });

    describe('Complex Transaction Scenarios', () => {
      it('should handle operation that completes after transaction error', async () => {
        const operation = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'should-not-succeed';
        });

        mockTransaction.error = new DOMException('Transaction failed');

        // Error occurs before operation completes
        setTimeout(() => {
          mockTransaction.onerror?.(new Event('error'));
        }, 10);

        const result = await manager.executeTransaction('events', operation);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('IndexedDB transaction failed');
      });

      it('should handle operation error followed by transaction complete', async () => {
        const operationError = new Error('Operation failed');
        const operation = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw operationError;
        });

        // Complete transaction after operation fails
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 50);

        const result = await manager.executeTransaction('events', operation);

        expect(mockTransaction.abort).toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.error).toBe(operationError);
      });
    });
  });

  describe('executeReadTransaction', () => {
    it('should create readonly transaction with default timeout', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('read-result');
      const result = await manager.executeReadTransaction('events', operation);

      expect(mockDb.transaction).toHaveBeenCalledWith(['events'], 'readonly');
      expect(result.success).toBe(true);
      expect(result.data).toBe('read-result');
    });

    it('should use custom timeout when specified', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('read-result');
      await manager.executeReadTransaction('events', operation, 15000);

      expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    it('should handle multiple store names', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('read-result');
      await manager.executeReadTransaction(['events', 'snapshots'], operation);

      expect(mockDb.transaction).toHaveBeenCalledWith(['events', 'snapshots'], 'readonly');
    });
  });

  describe('executeWriteTransaction', () => {
    it('should create readwrite transaction with default timeout', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('write-result');
      const result = await manager.executeWriteTransaction('events', operation);

      expect(mockDb.transaction).toHaveBeenCalledWith(['events'], 'readwrite');
      expect(result.success).toBe(true);
      expect(result.data).toBe('write-result');
    });

    it('should use custom timeout when specified', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('write-result');
      await manager.executeWriteTransaction('events', operation, 20000);

      expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 20000);
    });

    it('should handle multiple store names', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('write-result');
      await manager.executeWriteTransaction(['events', 'snapshots'], operation);

      expect(mockDb.transaction).toHaveBeenCalledWith(['events', 'snapshots'], 'readwrite');
    });
  });

  describe('executeBatchTransaction', () => {
    it('should execute multiple operations in sequence', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 10);

      const operation1 = vi.fn().mockReturnValue('result1');
      const operation2 = vi.fn().mockReturnValue('result2');
      const operation3 = vi.fn().mockReturnValue('result3');

      const result = await manager.executeBatchTransaction('events', [
        operation1,
        operation2,
        operation3,
      ]);

      expect(operation1).toHaveBeenCalledWith(mockTransaction, mockObjectStore);
      expect(operation2).toHaveBeenCalledWith(mockTransaction, mockObjectStore);
      expect(operation3).toHaveBeenCalledWith(mockTransaction, mockObjectStore);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['result1', 'result2', 'result3']);
    });

    it('should handle async operations in batch', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 50);

      const operation1 = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'async-result1';
      });
      const operation2 = vi.fn().mockReturnValue('sync-result2');
      const operation3 = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'async-result3';
      });

      const result = await manager.executeBatchTransaction('events', [
        operation1,
        operation2,
        operation3,
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['async-result1', 'sync-result2', 'async-result3']);
    });

    it('should handle empty operations array', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const result = await manager.executeBatchTransaction('events', []);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should abort batch if any operation fails', async () => {
      const operation1 = vi.fn().mockReturnValue('result1');
      const operation2 = vi.fn().mockRejectedValue(new Error('Operation 2 failed'));
      const operation3 = vi.fn().mockReturnValue('result3'); // Should not be called

      // Trigger abort event when operation fails
      setTimeout(() => {
        mockTransaction.onabort?.(new Event('abort'));
      }, 10);

      const result = await manager.executeBatchTransaction('events', [
        operation1,
        operation2,
        operation3,
      ]);

      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
      expect(operation3).not.toHaveBeenCalled(); // Should not be called due to early failure
      expect(mockTransaction.abort).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation 2 failed');
    });

    it('should use custom options for batch transaction', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete?.(new Event('complete'));
      }, 0);

      const operation = vi.fn().mockReturnValue('result');
      await manager.executeBatchTransaction(['events', 'snapshots'], [operation], {
        mode: 'readonly',
        timeout: 25000,
      });

      expect(mockDb.transaction).toHaveBeenCalledWith(['events', 'snapshots'], 'readonly');
      expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 25000);
    });
  });

  describe('promiseifyRequest', () => {
    it('should resolve with request result on success', async () => {
      const mockRequest: MockIDBRequest = {
        onsuccess: null,
        onerror: null,
        result: 'test-result',
        error: null,
      };

      const promise = IndexedDBTransactionManager.promiseifyRequest(
        mockRequest as unknown as IDBRequest
      );

      // Simulate success event
      setTimeout(() => {
        mockRequest.onsuccess?.(new Event('success'));
      }, 0);

      const result = await promise;
      expect(result).toBe('test-result');
    });

    it('should reject with error on request error', async () => {
      const mockRequest: MockIDBRequest = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: new DOMException('Request failed', 'DataError'),
      };

      const promise = IndexedDBTransactionManager.promiseifyRequest(
        mockRequest as unknown as IDBRequest
      );

      // Simulate error event
      setTimeout(() => {
        mockRequest.onerror?.(new Event('error'));
      }, 0);

      await expect(promise).rejects.toThrow('IndexedDB operation failed: Request failed');
    });

    it('should handle request error with no error details', async () => {
      const mockRequest: MockIDBRequest = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const promise = IndexedDBTransactionManager.promiseifyRequest(
        mockRequest as unknown as IDBRequest
      );

      setTimeout(() => {
        mockRequest.onerror?.(new Event('error'));
      }, 0);

      await expect(promise).rejects.toThrow('IndexedDB operation failed: Unknown error');
    });

    it('should handle different result types', async () => {
      const testCases = ['string-result', 42, { key: 'value' }, null, undefined, [], true, false];

      for (const testResult of testCases) {
        const mockRequest: MockIDBRequest = {
          onsuccess: null,
          onerror: null,
          result: testResult,
          error: null,
        };

        const promise = IndexedDBTransactionManager.promiseifyRequest(
          mockRequest as unknown as IDBRequest
        );

        setTimeout(() => {
          mockRequest.onsuccess?.(new Event('success'));
        }, 0);

        const result = await promise;
        expect(result).toBe(testResult);
      }
    });
  });

  describe('promisifyCursor', () => {
    it('should process all cursor values and resolve with results', async () => {
      const mockCursor1: MockIDBCursorWithValue = {
        value: { id: 1, data: 'first' },
        key: 1,
        continue: vi.fn(),
      };

      const mockCursor2: MockIDBCursorWithValue = {
        value: { id: 2, data: 'second' },
        key: 2,
        continue: vi.fn(),
      };

      const mockRequest: MockIDBRequest & {
        result: MockIDBCursorWithValue | null;
      } = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const processor = vi
        .fn()
        .mockReturnValueOnce('processed-first')
        .mockReturnValueOnce('processed-second');

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      // Simulate cursor iteration
      setTimeout(() => {
        mockRequest.result = mockCursor1;
        mockRequest.onsuccess?.(new Event('success'));
      }, 0);

      setTimeout(() => {
        mockRequest.result = mockCursor2;
        mockRequest.onsuccess?.(new Event('success'));
      }, 10);

      setTimeout(() => {
        mockRequest.result = null; // End of cursor
        mockRequest.onsuccess?.(new Event('success'));
      }, 20);

      const results = await promise;

      expect(processor).toHaveBeenCalledTimes(2);
      expect(processor).toHaveBeenNthCalledWith(1, mockCursor1);
      expect(processor).toHaveBeenNthCalledWith(2, mockCursor2);
      expect(mockCursor1.continue).toHaveBeenCalled();
      expect(mockCursor2.continue).toHaveBeenCalled();
      expect(results).toEqual(['processed-first', 'processed-second']);
    });

    it('should filter out undefined results from processor', async () => {
      const mockCursor1: MockIDBCursorWithValue = {
        value: { id: 1, data: 'first' },
        key: 1,
        continue: vi.fn(),
      };

      const mockCursor2: MockIDBCursorWithValue = {
        value: { id: 2, data: 'second' },
        key: 2,
        continue: vi.fn(),
      };

      const mockRequest: MockIDBRequest & {
        result: MockIDBCursorWithValue | null;
      } = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const processor = vi
        .fn()
        .mockReturnValueOnce('processed-first')
        .mockReturnValueOnce(undefined); // This should be filtered out

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      setTimeout(() => {
        mockRequest.result = mockCursor1;
        mockRequest.onsuccess?.(new Event('success'));
      }, 0);

      setTimeout(() => {
        mockRequest.result = mockCursor2;
        mockRequest.onsuccess?.(new Event('success'));
      }, 10);

      setTimeout(() => {
        mockRequest.result = null;
        mockRequest.onsuccess?.(new Event('success'));
      }, 20);

      const results = await promise;

      expect(results).toEqual(['processed-first']);
    });

    it('should handle empty cursor (no results)', async () => {
      const mockRequest: MockIDBRequest & {
        result: MockIDBCursorWithValue | null;
      } = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const processor = vi.fn();

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      setTimeout(() => {
        mockRequest.result = null; // No cursor results
        mockRequest.onsuccess?.(new Event('success'));
      }, 0);

      const results = await promise;

      expect(processor).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it('should reject on cursor iteration error', async () => {
      const mockRequest: MockIDBRequest = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: new DOMException('Cursor failed', 'DataError'),
      };

      const processor = vi.fn();

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      setTimeout(() => {
        mockRequest.onerror?.(new Event('error'));
      }, 0);

      await expect(promise).rejects.toThrow('Cursor iteration failed: Cursor failed');
    });

    it('should handle cursor error with no error details', async () => {
      const mockRequest: MockIDBRequest = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const processor = vi.fn();

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      setTimeout(() => {
        mockRequest.onerror?.(new Event('error'));
      }, 0);

      await expect(promise).rejects.toThrow('Cursor iteration failed: Unknown error');
    });

    it('should handle processor that returns falsy but defined values', async () => {
      const mockCursor1: MockIDBCursorWithValue = {
        value: { id: 1, data: 'first' },
        key: 1,
        continue: vi.fn(),
      };

      const mockCursor2: MockIDBCursorWithValue = {
        value: { id: 2, data: 'second' },
        key: 2,
        continue: vi.fn(),
      };

      const mockRequest: MockIDBRequest & {
        result: MockIDBCursorWithValue | null;
      } = {
        onsuccess: null,
        onerror: null,
        result: null,
        error: null,
      };

      const processor = vi
        .fn()
        .mockReturnValueOnce(0) // falsy but defined
        .mockReturnValueOnce(false); // falsy but defined

      const promise = IndexedDBTransactionManager.promisifyCursor(
        mockRequest as unknown as IDBRequest<IDBCursorWithValue | null>,
        processor
      );

      setTimeout(() => {
        mockRequest.result = mockCursor1;
        mockRequest.onsuccess?.(new Event('success'));
      }, 0);

      setTimeout(() => {
        mockRequest.result = mockCursor2;
        mockRequest.onsuccess?.(new Event('success'));
      }, 10);

      setTimeout(() => {
        mockRequest.result = null;
        mockRequest.onsuccess?.(new Event('success'));
      }, 20);

      const results = await promise;

      expect(results).toEqual([0, false]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle transaction creation failure', async () => {
      mockDb.transaction.mockImplementation(() => {
        throw new Error('Transaction creation failed');
      });

      const operation = vi.fn();
      const result = await manager.executeTransaction('events', operation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Transaction creation failed');
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle object store access failure', async () => {
      mockTransaction.objectStore.mockImplementation(() => {
        throw new Error('Object store not found');
      });

      const operation = vi.fn();
      const result = await manager.executeTransaction('events', operation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Object store not found');
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle operation completion before transaction event handlers are set', async () => {
      const operation = vi.fn().mockImplementation(() => {
        // Immediately trigger transaction complete
        setTimeout(() => {
          mockTransaction.oncomplete?.(new Event('complete'));
        }, 0);
        return 'immediate-result';
      });

      const result = await manager.executeTransaction('events', operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('immediate-result');
    });
  });
});
