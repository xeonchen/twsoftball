/**
 * @file SnapshotStore
 * Outbound port interface for aggregate snapshot persistence and retrieval.
 *
 * @remarks
 * This interface defines the driven port for snapshot storage operations
 * in the hexagonal architecture. Snapshots enable performance optimization
 * by capturing aggregate state at specific points, allowing faster aggregate
 * reconstruction by replaying only events since the last snapshot.
 *
 * The snapshot store supports all three aggregate types in the system:
 * - Game: Core game state including score, inning, and play history
 * - TeamLineup: Team composition and batting order information
 * - InningState: Current inning-specific state and context
 *
 * Snapshot operations are designed to work seamlessly with the EventStore
 * to provide complete aggregate reconstruction capabilities with optimized
 * performance for aggregates with long event histories.
 *
 * Type safety is enforced through generic constraints, ensuring that
 * snapshot data matches the expected aggregate structure while maintaining
 * flexibility for different aggregate state representations.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class IndexedDBSnapshotStore implements SnapshotStore {
 *   async saveSnapshot<T>(
 *     aggregateId: GameId,
 *     snapshot: AggregateSnapshot<T>
 *   ): Promise<void> {
 *     const storedSnapshot = {
 *       id: aggregateId.value,
 *       aggregateType: snapshot.aggregateType,
 *       version: snapshot.version,
 *       data: JSON.stringify(snapshot.data),
 *       timestamp: snapshot.timestamp.toISOString(),
 *       metadata: { source: 'web-app', createdAt: new Date() }
 *     };
 *
 *     await this.saveToIndexedDB(storedSnapshot);
 *   }
 * }
 *
 * // Usage in repository
 * class EventSourcedGameRepository {
 *   constructor(
 *     private eventStore: EventStore,
 *     private snapshotStore: SnapshotStore
 *   ) {}
 *
 *   async findById(gameId: GameId): Promise<Game> {
 *     const snapshot = await this.snapshotStore.getSnapshot<GameState>(gameId);
 *
 *     if (snapshot) {
 *       const events = await this.eventStore.getEvents(gameId, snapshot.version);
 *       return Game.fromSnapshot(snapshot, events);
 *     } else {
 *       const events = await this.eventStore.getEvents(gameId);
 *       return Game.fromEvents(events);
 *     }
 *   }
 * }
 * ```
 */

import { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';

/**
 * Snapshot store interface for aggregate state persistence and retrieval.
 *
 * @remarks
 * This interface provides snapshot storage capabilities that complement
 * the event sourcing pattern. Snapshots capture aggregate state at specific
 * versions to optimize reconstruction performance for aggregates with
 * extensive event histories.
 *
 * Key design principles:
 * - Multi-aggregate: Supports Game, TeamLineup, and InningState aggregates
 * - Type-safe: Strongly typed aggregate identifiers and snapshot structures
 * - Performance-focused: Enables fast aggregate reconstruction
 * - Version-aware: Snapshots are tied to specific aggregate versions
 * - Consistent: Maintains consistency with event store versioning
 *
 * Snapshot strategy:
 * - Snapshots are optional performance optimizations
 * - Aggregate reconstruction must work with or without snapshots
 * - Snapshots represent point-in-time aggregate state
 * - Event replay from snapshot version provides current state
 * - Snapshot frequency can be configured per aggregate type
 *
 * Snapshot lifecycle:
 * 1. Aggregate reaches snapshot threshold (e.g., every 100 events)
 * 2. Current aggregate state is captured as snapshot
 * 3. Snapshot is stored with version and timestamp metadata
 * 4. Future reconstructions can start from snapshot + subsequent events
 * 5. Old snapshots may be retained for historical analysis
 */
export interface SnapshotStore {
  /**
   * Saves an aggregate snapshot to persistent storage.
   *
   * @remarks
   * Persists the current state of an aggregate as a snapshot, enabling
   * optimized reconstruction by avoiding replay of all historical events.
   * The snapshot includes complete aggregate state, version information,
   * and metadata for proper reconstruction and debugging.
   *
   * Snapshot storage considerations:
   * - Snapshots may overwrite previous snapshots for the same aggregate
   * - Version information must match the aggregate's current version
   * - Data should be serializable for persistent storage
   * - Timestamp provides snapshot creation audit trail
   * - Type parameter T ensures snapshot data type safety
   *
   * Error conditions:
   * - Storage failures should be handled gracefully
   * - Invalid snapshot structure should be rejected
   * - Concurrent snapshot attempts should be handled safely
   *
   * @param aggregateId - Unique identifier for the aggregate instance
   * @param snapshot - Complete snapshot containing state and metadata
   * @returns Promise that resolves when snapshot is successfully stored
   * @throws Error for storage failures or invalid snapshot data
   *
   * @example
   * ```typescript
   * const gameSnapshot: AggregateSnapshot<GameState> = {
   *   aggregateId: gameId,
   *   aggregateType: 'Game',
   *   version: 150,
   *   data: gameState.serialize(),
   *   timestamp: new Date()
   * };
   *
   * await snapshotStore.saveSnapshot(gameId, gameSnapshot);
   * ```
   */
  saveSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId,
    snapshot: AggregateSnapshot<T>
  ): Promise<void>;

  /**
   * Retrieves the latest snapshot for a specific aggregate.
   *
   * @remarks
   * Returns the most recent snapshot for the specified aggregate, if one
   * exists. The snapshot can then be used as a starting point for aggregate
   * reconstruction, with subsequent events replayed from the snapshot version.
   *
   * Snapshot retrieval behavior:
   * - Returns null if no snapshot exists for the aggregate
   * - Returns the most recent snapshot if multiple exist
   * - Includes all necessary data for aggregate reconstruction
   * - Preserves type safety through generic parameter T
   * - Handles deserialization of stored snapshot data
   *
   * Performance considerations:
   * - Snapshot retrieval should be faster than full event replay
   * - Large snapshots may impact memory usage during reconstruction
   * - Concurrent access should be handled safely
   * - Corrupt snapshots should be detected and handled
   *
   * @param aggregateId - Unique identifier for the aggregate instance
   * @returns Promise resolving to snapshot if found, null otherwise
   * @throws Error for storage access failures or corrupted snapshot data
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
  getSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId
  ): Promise<AggregateSnapshot<T> | null>;
}

/**
 * Aggregate snapshot structure for capturing point-in-time aggregate state.
 *
 * @remarks
 * This interface represents a complete snapshot of an aggregate's state
 * at a specific version. Snapshots serve as performance optimizations for
 * event sourcing, allowing faster aggregate reconstruction by providing
 * a starting state that can be enhanced with subsequent events.
 *
 * The generic type parameter T represents the aggregate's state data
 * structure, ensuring type safety while maintaining flexibility across
 * different aggregate types and their evolving schemas.
 *
 * Snapshot structure design:
 * - aggregateId: Links snapshot to specific aggregate instance
 * - aggregateType: Enables type-specific deserialization logic
 * - version: Indicates which events are included in the snapshot
 * - data: Complete aggregate state at the snapshot version
 * - timestamp: Provides audit trail and debugging information
 *
 * Version semantics:
 * - Version represents the last event version included in the snapshot
 * - Events with versions > snapshot.version need to be replayed
 * - Version 0 indicates snapshot captures initial state only
 * - Negative versions are not permitted
 *
 * Data serialization:
 * - Data structure must be serializable for persistent storage
 * - Complex objects should implement proper serialization methods
 * - Circular references should be avoided or handled explicitly
 * - Type information may need to be preserved for deserialization
 *
 * @template T The type of the aggregate state data stored in the snapshot
 */
export interface AggregateSnapshot<T = unknown> {
  /**
   * Unique identifier of the aggregate this snapshot represents.
   *
   * @remarks
   * Links the snapshot to a specific aggregate instance. Must match
   * the aggregate ID used in the corresponding event stream. Type safety
   * is enforced to ensure only valid aggregate ID types are accepted.
   */
  readonly aggregateId: GameId | TeamLineupId | InningStateId;

  /**
   * Type identifier for the aggregate represented by this snapshot.
   *
   * @remarks
   * Enables proper deserialization and type handling in infrastructure
   * implementations. Must correspond to one of the three supported
   * aggregate types in the system.
   *
   * Valid values:
   * - 'Game': For Game aggregate snapshots
   * - 'TeamLineup': For TeamLineup aggregate snapshots
   * - 'InningState': For InningState aggregate snapshots
   */
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';

  /**
   * Version number indicating the last event included in this snapshot.
   *
   * @remarks
   * Represents the aggregate version at the time the snapshot was created.
   * Events with versions greater than this value need to be replayed to
   * reconstruct the current aggregate state.
   *
   * Version constraints:
   * - Must be a positive integer
   * - Must not exceed the aggregate's current version
   * - Should correspond to an actual event version in the stream
   * - Used for optimistic concurrency control during reconstruction
   */
  readonly version: number;

  /**
   * Complete aggregate state data at the snapshot version.
   *
   * @remarks
   * Contains all necessary information to reconstruct the aggregate
   * state at the specified version. The structure depends on the
   * aggregate type and may evolve over time as the domain model changes.
   *
   * Data requirements:
   * - Must be serializable for persistent storage
   * - Should include all state necessary for aggregate reconstruction
   * - May include derived state for performance optimization
   * - Should be compatible with aggregate's fromSnapshot() method
   */
  readonly data: T;

  /**
   * Timestamp when the snapshot was created.
   *
   * @remarks
   * Provides audit trail information and enables debugging of snapshot
   * creation patterns. The timestamp represents when the snapshot was
   * generated, not when the aggregate reached the snapshot version.
   *
   * Timestamp usage:
   * - Audit trail for snapshot creation
   * - Debugging and monitoring snapshot frequency
   * - Potential cleanup of old snapshots
   * - Performance analysis of snapshot creation overhead
   */
  readonly timestamp: Date;
}

/**
 * Type alias for Game aggregate snapshots with proper type constraints.
 *
 * @remarks
 * Provides a convenient type alias for Game-specific snapshots while
 * enforcing that the aggregateId is a GameId and aggregateType is 'Game'.
 * This improves type safety and developer experience when working with
 * Game snapshots specifically.
 *
 * @template T The type of the Game state data stored in the snapshot
 */
export type GameSnapshot<T = unknown> = AggregateSnapshot<T> & {
  readonly aggregateId: GameId;
  readonly aggregateType: 'Game';
};

/**
 * Type alias for TeamLineup aggregate snapshots with proper type constraints.
 *
 * @remarks
 * Provides a convenient type alias for TeamLineup-specific snapshots while
 * enforcing that the aggregateId is a TeamLineupId and aggregateType is 'TeamLineup'.
 * This improves type safety and developer experience when working with
 * TeamLineup snapshots specifically.
 *
 * @template T The type of the TeamLineup state data stored in the snapshot
 */
export type TeamLineupSnapshot<T = unknown> = AggregateSnapshot<T> & {
  readonly aggregateId: TeamLineupId;
  readonly aggregateType: 'TeamLineup';
};

/**
 * Type alias for InningState aggregate snapshots with proper type constraints.
 *
 * @remarks
 * Provides a convenient type alias for InningState-specific snapshots while
 * enforcing that the aggregateId is an InningStateId and aggregateType is 'InningState'.
 * This improves type safety and developer experience when working with
 * InningState snapshots specifically.
 *
 * @template T The type of the InningState state data stored in the snapshot
 */
export type InningStateSnapshot<T = unknown> = AggregateSnapshot<T> & {
  readonly aggregateId: InningStateId;
  readonly aggregateType: 'InningState';
};
