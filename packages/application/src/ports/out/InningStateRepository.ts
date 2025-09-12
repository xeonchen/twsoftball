/**
 * @file InningStateRepository
 * Outbound port interface for InningState aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the driven port for InningState aggregate data access
 * in the hexagonal architecture. It abstracts all persistence operations
 * for the InningState aggregate root, enabling different storage implementations
 * without affecting the application core.
 *
 * The repository pattern provides a domain-centric view of data access,
 * hiding infrastructure concerns like database connections, queries, and
 * serialization. It operates at the aggregate boundary, ensuring that
 * the InningState aggregate is persisted and retrieved as a consistent unit.
 *
 * Query methods support common access patterns needed by the application:
 * - Direct lookup by unique identifier
 * - Current inning retrieval for active game management
 * - Game-based filtering for inning progression tracking
 *
 * All operations are asynchronous to support various storage backends
 * (SQL databases, NoSQL, file systems, cloud storage) without constraining
 * the application architecture.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class IndexedDBInningStateRepository implements InningStateRepository {
 *   private db: IDBDatabase;
 *
 *   async findById(id: InningStateId): Promise<InningState | null> {
 *     const data = await this.getFromIndexedDB(id.value);
 *     return data ? InningState.fromSnapshot(data) : null;
 *   }
 *
 *   async save(inningState: InningState): Promise<void> {
 *     const snapshot = inningState.toSnapshot();
 *     await this.saveToIndexedDB(snapshot);
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage in application service
 * class InningApplicationService {
 *   constructor(private inningStateRepository: InningStateRepository) {}
 *
 *   async advanceToNextInning(command: AdvanceInningCommand): Promise<InningResult> {
 *     const currentInning = await this.inningStateRepository.findCurrentByGameId(command.gameId);
 *     const newInning = currentInning.advanceToNext();
 *     await this.inningStateRepository.save(newInning);
 *     return { success: true, inning: newInning };
 *   }
 * }
 * ```
 */

import { InningStateId, InningState, GameId } from '@twsoftball/domain';

/**
 * Repository interface for InningState aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the contract for InningState aggregate data access,
 * supporting the complete lifecycle of inning management from game start
 * through completion. It provides both individual inning operations
 * and query capabilities for current inning tracking.
 *
 * Design principles:
 * - Aggregate-focused: Operations work with complete InningState entities
 * - Domain-centric: Uses domain types (InningStateId, GameId, InningState)
 * - Infrastructure-agnostic: No dependencies on specific storage technology
 * - Consistency-oriented: Maintains aggregate boundaries and invariants
 * - Performance-aware: Supports efficient query patterns for active games
 *
 * The repository handles InningState aggregate root persistence, including:
 * - Complete inning state (current inning, half, outs, runners on base)
 * - Inning progression tracking (inning number, top/bottom half)
 * - Game flow metadata (timing, transition history)
 *
 * Query operations support common application patterns:
 * - Individual inning lookup for state validation
 * - Current inning retrieval for active game scoring
 * - Game-based queries for inning progression management
 *
 * Implementations should ensure data consistency, handle concurrent inning
 * state modifications appropriately, and provide reasonable performance for
 * real-time game scoring operations.
 */
export interface InningStateRepository {
  /**
   * Retrieves an inning state by its unique identifier.
   *
   * @remarks
   * Primary lookup method for accessing individual inning states. Used by
   * use cases that need to load specific inning state for validation, updates,
   * or historical analysis.
   *
   * The returned InningState aggregate includes complete game flow state:
   * current inning number, half (top/bottom), outs count, and runners on base
   * positions, ready for immediate business operations.
   *
   * @param id - Unique identifier for the inning state
   * @returns Promise resolving to InningState aggregate or null if not found
   * @throws Error for infrastructure issues (database unavailable, etc.)
   */
  findById(id: InningStateId): Promise<InningState | null>;

  /**
   * Retrieves the current active inning state for a specific game.
   *
   * @remarks
   * Primary method for accessing the current inning state during active game
   * play. This is essential for real-time scoring operations, game flow
   * management, and ensuring proper inning progression.
   *
   * The current inning state represents the most recent inning state for the
   * game, containing all necessary information for continuing play including
   * inning number, half, outs, and base runner positions.
   *
   * Returns null if no inning state exists for the game (game not yet started)
   * or if the game has been completed and inning state archived.
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to current InningState aggregate or null if not found
   * @throws Error for infrastructure issues
   */
  findCurrentByGameId(gameId: GameId): Promise<InningState | null>;

  /**
   * Persists an inning state aggregate to storage.
   *
   * @remarks
   * Handles both new inning state creation and updates to existing states.
   * Implementations should use the InningState's unique identifier to determine
   * whether to insert or update records.
   *
   * The entire aggregate is saved as a unit, maintaining consistency
   * across all inning data including inning number, half, outs count,
   * and base runner positions. Event sourcing implementations may store
   * this as a series of domain events rather than current state.
   *
   * For games with multiple inning states (historical tracking), implementations
   * should handle the relationship between current and historical states
   * appropriately.
   *
   * @param inningState - Complete InningState aggregate to persist
   * @returns Promise that resolves when save is complete
   * @throws Error for validation failures or infrastructure issues
   */
  save(inningState: InningState): Promise<void>;

  /**
   * Removes an inning state from storage.
   *
   * @remarks
   * Permanently deletes an inning state aggregate and all associated data.
   * This operation should be used carefully as it may affect game flow
   * integrity and referential consistency with other aggregates.
   *
   * Consider the impact on game progression tracking and ensure that
   * deleting inning states doesn't leave games in an inconsistent state.
   * Implementations should handle cascading effects appropriately.
   *
   * @param id - Unique identifier for the inning state to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error for constraint violations or infrastructure issues
   */
  delete(id: InningStateId): Promise<void>;
}
