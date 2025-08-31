/**
 * @file GameRepository
 * Outbound port interface for Game aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the driven port for Game aggregate data access
 * in the hexagonal architecture. It abstracts all persistence operations
 * for the Game aggregate root, enabling different storage implementations
 * without affecting the application core.
 *
 * The repository pattern provides a domain-centric view of data access,
 * hiding infrastructure concerns like database connections, queries, and
 * serialization. It operates at the aggregate boundary, ensuring that
 * the Game aggregate is persisted and retrieved as a consistent unit.
 *
 * Query methods support common access patterns needed by the application:
 * - Direct lookup by unique identifier
 * - Status-based filtering for workflow management
 * - Date range queries for scheduling and reporting
 *
 * All operations are asynchronous to support various storage backends
 * (SQL databases, NoSQL, file systems, cloud storage) without constraining
 * the application architecture.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class IndexedDBGameRepository implements GameRepository {
 *   private db: IDBDatabase;
 *
 *   async findById(id: GameId): Promise<Game | null> {
 *     const data = await this.getFromIndexedDB(id.value);
 *     return data ? Game.fromSnapshot(data) : null;
 *   }
 *
 *   async save(game: Game): Promise<void> {
 *     const snapshot = game.toSnapshot();
 *     await this.saveToIndexedDB(snapshot);
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage in application service
 * class GameApplicationService {
 *   constructor(private gameRepository: GameRepository) {}
 *
 *   async startNewGame(command: StartNewGameCommand): Promise<GameStartResult> {
 *     const game = Game.create(...);
 *     await this.gameRepository.save(game);
 *     return { success: true, gameId: game.id, ... };
 *   }
 * }
 * ```
 */

import { GameId, GameStatus, Game } from '@twsoftball/domain';

/**
 * Repository interface for Game aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the contract for Game aggregate data access,
 * supporting the complete lifecycle of game management from creation
 * through completion. It provides both individual game operations
 * and query capabilities for game collection management.
 *
 * Design principles:
 * - Aggregate-focused: Operations work with complete Game entities
 * - Domain-centric: Uses domain types (GameId, GameStatus, Game)
 * - Infrastructure-agnostic: No dependencies on specific storage technology
 * - Consistency-oriented: Maintains aggregate boundaries and invariants
 * - Performance-aware: Supports efficient query patterns
 *
 * The repository handles Game aggregate root persistence, including:
 * - Complete game state (score, status, timing)
 * - Game configuration (rules, team information)
 * - Game metadata (location, dates, administrative info)
 *
 * Query operations support common application patterns:
 * - Real-time game lookup for active scoring
 * - Status filtering for game management workflows
 * - Date range queries for scheduling and reporting
 *
 * Implementations should ensure data consistency, handle concurrent access
 * appropriately, and provide reasonable performance for expected usage patterns.
 */
export interface GameRepository {
  /**
   * Retrieves a game by its unique identifier.
   *
   * @remarks
   * Primary lookup method for accessing individual games. Used extensively
   * by use cases that need to load game state for validation or updates.
   *
   * The returned Game aggregate includes complete state and can be immediately
   * used for business operations without additional loading.
   *
   * @param id - Unique identifier for the game
   * @returns Promise resolving to Game aggregate or null if not found
   * @throws Error for infrastructure issues (database unavailable, etc.)
   */
  findById(id: GameId): Promise<Game | null>;

  /**
   * Persists a game aggregate to storage.
   *
   * @remarks
   * Handles both new game creation and updates to existing games.
   * Implementations should use the Game's unique identifier to determine
   * whether to insert or update records.
   *
   * The entire aggregate is saved as a unit, maintaining consistency
   * across all game data. Event sourcing implementations may store
   * this as a series of domain events rather than current state.
   *
   * @param game - Complete Game aggregate to persist
   * @returns Promise that resolves when save is complete
   * @throws Error for validation failures or infrastructure issues
   */
  save(game: Game): Promise<void>;

  /**
   * Retrieves all games with a specific status.
   *
   * @remarks
   * Supports workflow and management queries by filtering games based
   * on their current status. Common use cases include:
   * - Finding active games for live updates
   * - Locating completed games for statistics
   * - Identifying not-started games for scheduling
   *
   * Results are returned as complete Game aggregates, suitable for
   * immediate use in business operations.
   *
   * @param status - Game status to filter by
   * @returns Promise resolving to array of matching games (may be empty)
   * @throws Error for infrastructure issues
   */
  findByStatus(status: GameStatus): Promise<Game[]>;

  /**
   * Retrieves games scheduled within a specific date range.
   *
   * @remarks
   * Supports scheduling and reporting queries by filtering games based
   * on their scheduled start time. Useful for:
   * - Calendar views and scheduling interfaces
   * - Historical reporting and analysis
   * - Batch processing of games from specific time periods
   *
   * Date range is inclusive on both ends. Games with start times exactly
   * matching the range boundaries are included in results.
   *
   * @param startDate - Beginning of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   * @returns Promise resolving to array of games within range (may be empty)
   * @throws Error for invalid date range or infrastructure issues
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Game[]>;

  /**
   * Removes a game from storage.
   *
   * @remarks
   * Permanently deletes a game aggregate and all associated data.
   * This operation should be used carefully as it may affect
   * referential integrity with other aggregates.
   *
   * Implementations should handle cascading deletions appropriately
   * and may need to coordinate with other repositories to maintain
   * system consistency.
   *
   * @param id - Unique identifier for the game to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error for constraint violations or infrastructure issues
   */
  delete(id: GameId): Promise<void>;
}
