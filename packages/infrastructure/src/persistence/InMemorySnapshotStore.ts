/**
 * @file InMemorySnapshotStore
 * In-memory implementation of the SnapshotStore interface for testing and development.
 *
 * @remarks
 * This implementation provides a complete SnapshotStore using Map<string, AggregateSnapshot<unknown>>
 * for in-memory storage. It's designed for:
 * - Unit testing and integration testing
 * - Development and prototyping
 * - Local development environments
 * - Repository testing infrastructure
 *
 * Core Implementation Features:
 * - Thread-safe operations (as much as possible in JavaScript)
 * - Type-safe operations with proper generics
 * - Support for all three aggregate types (Game, TeamLineup, InningState)
 * - Proper error handling and parameter validation
 * - Memory management utilities for testing
 * - Data integrity and immutability guarantees
 * - Performance optimizations for testing scenarios
 *
 * Test Utility Features:
 * - clear() method for test setup/teardown
 * - getSnapshotCount() for memory monitoring
 * - Support for concurrent access patterns
 * - Easy integration with repository tests
 * - Debugging and monitoring capabilities
 *
 * Design Principles:
 * - Maintains data immutability through deep cloning
 * - Provides consistent performance characteristics
 * - Supports efficient concurrent operations
 * - Handles edge cases gracefully (null, undefined, complex objects)
 * - Preserves complete snapshot metadata
 * - Follows existing infrastructure patterns from InMemoryEventStore
 *
 * @example
 * ```typescript
 * const snapshotStore = new InMemorySnapshotStore();
 *
 * // Save a snapshot
 * const gameSnapshot: AggregateSnapshot<GameState> = {
 *   aggregateId: gameId,
 *   aggregateType: 'Game',
 *   version: 42,
 *   data: gameState,
 *   timestamp: new Date()
 * };
 * await snapshotStore.saveSnapshot(gameId, gameSnapshot);
 *
 * // Retrieve a snapshot
 * const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);
 * console.log(retrieved?.version); // 42
 *
 * // Test utilities
 * console.log(snapshotStore.getSnapshotCount()); // 1
 * snapshotStore.clear(); // Reset for next test
 * ```
 */

import type {
  SnapshotStore,
  AggregateSnapshot,
} from '@twsoftball/application/ports/out/SnapshotStore';
import type { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';

/**
 * Custom error types for better error handling and debugging
 */
class SnapshotStoreParameterError extends Error {
  constructor(message: string) {
    super(`Snapshot parameter validation failed: ${message}`);
    this.name = 'SnapshotStoreParameterError';
  }
}

class SnapshotStoreSerializationError extends Error {
  constructor(message: string) {
    super(`Snapshot serialization failed: ${message}`);
    this.name = 'SnapshotStoreSerializationError';
  }
}

/**
 * In-memory implementation of the SnapshotStore interface.
 *
 * @remarks
 * Provides a complete snapshot store implementation using Map storage for
 * development, testing, and prototyping. Supports all SnapshotStore interface
 * methods with proper concurrency control and data integrity guarantees.
 *
 * Storage Structure:
 * - Uses Map<aggregateId: string, snapshot: AggregateSnapshot<unknown>> for storage
 * - Each aggregate ID maps to its latest snapshot
 * - Snapshots are stored as deep copies to ensure immutability
 * - All data is kept in memory for the lifetime of the instance
 *
 * Concurrency Control:
 * - Thread-safe for concurrent read/write operations in single-threaded JavaScript
 * - Atomic operations for save/get methods
 * - No risk of partial state corruption during concurrent access
 *
 * Data Integrity:
 * - Deep cloning ensures stored data cannot be modified externally
 * - Immutable return values prevent accidental state mutation
 * - Proper serialization/deserialization handling for complex objects
 * - Preserves Date objects and nested structures correctly
 *
 * Performance Characteristics:
 * - O(1) save and retrieval operations
 * - Linear scaling with number of stored snapshots
 * - Optimized for testing scenarios with frequent clear() operations
 * - Efficient memory usage through Map storage
 *
 * Test Utilities:
 * - clear() method for test setup/teardown
 * - getSnapshotCount() for memory monitoring and debugging
 * - Support for test scenario validation
 */
export class InMemorySnapshotStore implements SnapshotStore {
  /**
   * Internal storage for aggregate snapshots.
   * Key: aggregateId (string), Value: AggregateSnapshot<unknown>
   *
   * @remarks
   * Uses Map for O(1) access and proper key handling. Each aggregate
   * ID maps to its latest snapshot. Older snapshots are overwritten
   * when new ones are saved for the same aggregate.
   */
  private readonly snapshots = new Map<string, AggregateSnapshot<unknown>>();

  /**
   * Parameter validation for aggregate ID.
   *
   * @param aggregateId - The aggregate ID to validate
   * @throws SnapshotStoreParameterError for invalid IDs
   * @private
   */
  private validateAggregateId(
    aggregateId: GameId | TeamLineupId | InningStateId | null | undefined
  ): void {
    if (aggregateId === null || aggregateId === undefined) {
      throw new SnapshotStoreParameterError('aggregateId cannot be null or undefined');
    }

    if (!aggregateId.value || typeof aggregateId.value !== 'string') {
      throw new SnapshotStoreParameterError('aggregateId must have a valid string value');
    }
  }

  /**
   * Parameter validation for snapshot object.
   *
   * @param snapshot - The snapshot to validate
   * @throws SnapshotStoreParameterError for invalid snapshots
   * @private
   */
  private validateSnapshot<T>(snapshot: AggregateSnapshot<T> | null | undefined): void {
    if (snapshot === null || snapshot === undefined) {
      throw new SnapshotStoreParameterError('snapshot cannot be null or undefined');
    }

    if (!snapshot.aggregateId || !snapshot.aggregateId.value) {
      throw new SnapshotStoreParameterError('snapshot must have a valid aggregateId');
    }

    const validTypes = ['Game', 'TeamLineup', 'InningState'];
    if (!validTypes.includes(snapshot.aggregateType)) {
      throw new SnapshotStoreParameterError(
        `snapshot.aggregateType must be one of: ${validTypes.join(', ')}`
      );
    }

    if (
      typeof snapshot.version !== 'number' ||
      snapshot.version < 0 ||
      !Number.isInteger(snapshot.version)
    ) {
      throw new SnapshotStoreParameterError('snapshot.version must be a non-negative integer');
    }

    if (!(snapshot.timestamp instanceof Date) || isNaN(snapshot.timestamp.getTime())) {
      throw new SnapshotStoreParameterError('snapshot.timestamp must be a valid Date object');
    }
  }

  /**
   * Creates a deep copy of a snapshot to ensure immutability.
   *
   * @param snapshot - The snapshot to clone
   * @returns Deep copy of the snapshot
   * @throws SnapshotStoreSerializationError for serialization failures
   * @private
   */
  private deepCloneSnapshot<T>(snapshot: AggregateSnapshot<T>): AggregateSnapshot<T> {
    try {
      // Use structured cloning approach for deep cloning with proper Date handling
      return this.deepCloneWithDateSupport(snapshot);
    } catch (error) {
      throw new SnapshotStoreSerializationError(
        `Failed to clone snapshot for aggregate ${snapshot.aggregateId.value}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Performs deep cloning with proper Date object support.
   *
   * @param obj - Object to clone
   * @returns Deep cloned object with preserved Date instances
   * @private
   */
  private deepCloneWithDateSupport<T>(obj: T): T {
    // Handle null and undefined
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.deepCloneWithDateSupport(item)) as T;
    }

    // Handle Objects
    const clonedObj = {} as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = this.deepCloneWithDateSupport((obj as Record<string, unknown>)[key]);
      }
    }

    return clonedObj as T;
  }

  /**
   * Saves an aggregate snapshot to persistent storage.
   *
   * @remarks
   * Persists the current state of an aggregate as a snapshot, enabling
   * optimized reconstruction by avoiding replay of all historical events.
   * The snapshot includes complete aggregate state, version information,
   * and metadata for proper reconstruction and debugging.
   *
   * Implementation details:
   * - Creates deep copy of snapshot to ensure immutability
   * - Overwrites any existing snapshot for the same aggregate
   * - Validates all input parameters before storage
   * - Handles complex nested objects and Date preservation
   * - Atomic operation - either fully succeeds or fails cleanly
   *
   * Concurrency handling:
   * - Thread-safe in single-threaded JavaScript environment
   * - Multiple concurrent saves to different aggregates are safe
   * - Latest save wins for the same aggregate ID
   *
   * @param aggregateId - Unique identifier for the aggregate instance
   * @param snapshot - Complete snapshot containing state and metadata
   * @returns Promise that resolves when snapshot is successfully stored
   * @throws SnapshotStoreParameterError for invalid parameters
   * @throws SnapshotStoreSerializationError for serialization failures
   *
   * @example
   * ```typescript
   * const gameSnapshot: AggregateSnapshot<GameState> = {
   *   aggregateId: gameId,
   *   aggregateType: 'Game',
   *   version: 150,
   *   data: gameState,
   *   timestamp: new Date()
   * };
   *
   * await snapshotStore.saveSnapshot(gameId, gameSnapshot);
   * ```
   */
  async saveSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId,
    snapshot: AggregateSnapshot<T>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate parameters
        this.validateAggregateId(aggregateId);
        this.validateSnapshot(snapshot);

        // Ensure snapshot aggregateId matches the provided aggregateId
        if (snapshot.aggregateId.value !== aggregateId.value) {
          throw new SnapshotStoreParameterError(
            `snapshot.aggregateId (${snapshot.aggregateId.value}) must match provided aggregateId (${aggregateId.value})`
          );
        }

        // Create deep copy to ensure immutability
        const clonedSnapshot = this.deepCloneSnapshot(snapshot);

        // Store the snapshot (overwrites any existing snapshot for this aggregate)
        const key = aggregateId.value;
        this.snapshots.set(key, clonedSnapshot);

        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves the latest snapshot for a specific aggregate.
   *
   * @remarks
   * Returns the most recent snapshot for the specified aggregate, if one
   * exists. The snapshot can then be used as a starting point for aggregate
   * reconstruction, with subsequent events replayed from the snapshot version.
   *
   * Implementation details:
   * - Returns deep copy to prevent external modification of stored data
   * - Handles proper Date object deserialization
   * - Returns null if no snapshot exists for the aggregate
   * - Preserves complete type safety through generic parameter T
   * - Atomic operation with consistent state guarantees
   *
   * Performance characteristics:
   * - O(1) lookup time using Map storage
   * - Efficient memory usage with on-demand cloning
   * - Optimized for frequent read operations in testing
   *
   * @param aggregateId - Unique identifier for the aggregate instance
   * @returns Promise resolving to snapshot if found, null otherwise
   * @throws SnapshotStoreParameterError for invalid aggregateId
   * @throws SnapshotStoreSerializationError for deserialization failures
   *
   * @example
   * ```typescript
   * const snapshot = await snapshotStore.getSnapshot<GameState>(gameId);
   *
   * if (snapshot) {
   *   // Reconstruct from snapshot + events since snapshot.version
   *   const events = await eventStore.getEvents(gameId, snapshot.version);
   *   return Game.fromSnapshot(snapshot, events);
   * } else {
   *   // Reconstruct from all events
   *   const events = await eventStore.getEvents(gameId);
   *   return Game.fromEvents(events);
   * }
   * ```
   */
  async getSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId
  ): Promise<AggregateSnapshot<T> | null> {
    return new Promise((resolve, reject) => {
      try {
        // Validate parameters
        this.validateAggregateId(aggregateId);

        const key = aggregateId.value;
        const storedSnapshot = this.snapshots.get(key);

        if (!storedSnapshot) {
          resolve(null);
          return;
        }

        // Create deep copy to ensure immutability
        const clonedSnapshot = this.deepCloneSnapshot(storedSnapshot);

        // Type assertion is safe here since we're returning a copy
        resolve(clonedSnapshot as AggregateSnapshot<T>);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Clears all stored snapshots from memory.
   *
   * @remarks
   * This method is primarily used for testing and administrative operations.
   * It completely removes all snapshots from the store, which is useful
   * for test setup/teardown and memory management in testing environments.
   *
   * Use cases:
   * - Test setup and teardown
   * - Memory cleanup in development
   * - Debugging and state reset
   * - Integration test isolation
   *
   * Performance impact:
   * - O(1) operation that clears the entire Map
   * - Immediate memory reclamation for stored snapshots
   * - No impact on ongoing operations (they complete normally)
   *
   * @example
   * ```typescript
   * // Test setup
   * beforeEach(() => {
   *   snapshotStore.clear();
   * });
   *
   * // Or manual cleanup
   * snapshotStore.clear();
   * console.log(snapshotStore.getSnapshotCount()); // 0
   * ```
   */
  clear(): void {
    this.snapshots.clear();
  }

  /**
   * Returns the current number of stored snapshots.
   *
   * @remarks
   * This method is primarily used for testing, debugging, and monitoring.
   * It provides visibility into memory usage and storage state without
   * exposing the internal data structure.
   *
   * Use cases:
   * - Test assertions and validation
   * - Memory usage monitoring
   * - Debugging storage state
   * - Performance analysis
   * - Integration test verification
   *
   * Performance characteristics:
   * - O(1) operation using Map.size
   * - No impact on stored data
   * - Safe to call frequently
   *
   * @returns Number of currently stored snapshots
   *
   * @example
   * ```typescript
   * // Test assertions
   * expect(snapshotStore.getSnapshotCount()).toBe(0);
   *
   * await snapshotStore.saveSnapshot(gameId, snapshot);
   * expect(snapshotStore.getSnapshotCount()).toBe(1);
   *
   * // Memory monitoring
   * console.log(`Snapshots in memory: ${snapshotStore.getSnapshotCount()}`);
   * ```
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }
}
