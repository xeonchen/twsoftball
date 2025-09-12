/**
 * @file TeamLineupRepository
 * Outbound port interface for TeamLineup aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the driven port for TeamLineup aggregate data access
 * in the hexagonal architecture. It abstracts all persistence operations
 * for the TeamLineup aggregate root, enabling different storage implementations
 * without affecting the application core.
 *
 * The repository pattern provides a domain-centric view of data access,
 * hiding infrastructure concerns like database connections, queries, and
 * serialization. It operates at the aggregate boundary, ensuring that
 * the TeamLineup aggregate is persisted and retrieved as a consistent unit.
 *
 * Query methods support common access patterns needed by the application:
 * - Direct lookup by unique identifier
 * - Game-based filtering for both home and away lineup retrieval
 * - Side-specific queries for home vs away lineup management
 *
 * All operations are asynchronous to support various storage backends
 * (SQL databases, NoSQL, file systems, cloud storage) without constraining
 * the application architecture.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class IndexedDBTeamLineupRepository implements TeamLineupRepository {
 *   private db: IDBDatabase;
 *
 *   async findById(id: TeamLineupId): Promise<TeamLineup | null> {
 *     const data = await this.getFromIndexedDB(id.value);
 *     return data ? TeamLineup.fromSnapshot(data) : null;
 *   }
 *
 *   async save(lineup: TeamLineup): Promise<void> {
 *     const snapshot = lineup.toSnapshot();
 *     await this.saveToIndexedDB(snapshot);
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage in application service
 * class LineupApplicationService {
 *   constructor(private teamLineupRepository: TeamLineupRepository) {}
 *
 *   async createGameLineups(command: CreateGameLineupsCommand): Promise<LineupResult> {
 *     const homeLineup = TeamLineup.create(...);
 *     const awayLineup = TeamLineup.create(...);
 *     await this.teamLineupRepository.save(homeLineup);
 *     await this.teamLineupRepository.save(awayLineup);
 *     return { success: true, lineups: [homeLineup, awayLineup] };
 *   }
 * }
 * ```
 */

import { TeamLineupId, TeamLineup, GameId } from '@twsoftball/domain';

/**
 * Repository interface for TeamLineup aggregate persistence and retrieval.
 *
 * @remarks
 * This interface defines the contract for TeamLineup aggregate data access,
 * supporting the complete lifecycle of team lineup management from creation
 * through game completion. It provides both individual lineup operations
 * and query capabilities for game-based lineup retrieval.
 *
 * Design principles:
 * - Aggregate-focused: Operations work with complete TeamLineup entities
 * - Domain-centric: Uses domain types (TeamLineupId, GameId, TeamLineup)
 * - Infrastructure-agnostic: No dependencies on specific storage technology
 * - Consistency-oriented: Maintains aggregate boundaries and invariants
 * - Performance-aware: Supports efficient query patterns for game management
 *
 * The repository handles TeamLineup aggregate root persistence, including:
 * - Complete lineup state (batting order, player positions, substitutions)
 * - Lineup configuration (team side, game association, roster information)
 * - Lineup metadata (creation time, modification history)
 *
 * Query operations support common application patterns:
 * - Individual lineup lookup for roster management
 * - Game-based queries for both home and away lineups
 * - Side-specific queries for targeted lineup operations
 *
 * Implementations should ensure data consistency, handle concurrent lineup
 * modifications appropriately, and provide reasonable performance for expected
 * usage patterns during active game management.
 */
export interface TeamLineupRepository {
  /**
   * Retrieves a team lineup by its unique identifier.
   *
   * @remarks
   * Primary lookup method for accessing individual team lineups. Used extensively
   * by use cases that need to load lineup state for validation, updates, or
   * substitution management.
   *
   * The returned TeamLineup aggregate includes complete batting order, fielding
   * positions, and substitution history, ready for immediate business operations.
   *
   * @param id - Unique identifier for the team lineup
   * @returns Promise resolving to TeamLineup aggregate or null if not found
   * @throws Error for infrastructure issues (database unavailable, etc.)
   */
  findById(id: TeamLineupId): Promise<TeamLineup | null>;

  /**
   * Retrieves all lineups associated with a specific game.
   *
   * @remarks
   * Retrieves both home and away team lineups for a given game. This is the
   * primary method for loading complete game lineup information needed for
   * game management, scoring, and administrative operations.
   *
   * Results typically include exactly two lineups (home and away) for standard
   * games, but the array structure allows for flexible handling of different
   * game formats or incomplete lineup scenarios.
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to array of TeamLineup aggregates (may be empty)
   * @throws Error for infrastructure issues
   */
  findByGameId(gameId: GameId): Promise<TeamLineup[]>;

  /**
   * Retrieves the lineup for a specific side (home or away) in a game.
   *
   * @remarks
   * Provides targeted access to either the home or away team lineup for
   * a specific game. This method is useful when operations only need to
   * work with one team's lineup rather than loading both lineups.
   *
   * Common use cases include:
   * - Substitution management for a specific team
   * - Batting order validation during lineup creation
   * - Side-specific roster operations
   *
   * @param gameId - Unique identifier for the game
   * @param side - Team side indicator ('HOME' or 'AWAY')
   * @returns Promise resolving to TeamLineup aggregate or null if not found
   * @throws Error for infrastructure issues or invalid side parameter
   */
  findByGameIdAndSide(gameId: GameId, side: 'HOME' | 'AWAY'): Promise<TeamLineup | null>;

  /**
   * Persists a team lineup aggregate to storage.
   *
   * @remarks
   * Handles both new lineup creation and updates to existing lineups.
   * Implementations should use the TeamLineup's unique identifier to determine
   * whether to insert or update records.
   *
   * The entire aggregate is saved as a unit, maintaining consistency
   * across all lineup data including batting order, fielding positions,
   * and substitution history. Event sourcing implementations may store
   * this as a series of domain events rather than current state.
   *
   * @param lineup - Complete TeamLineup aggregate to persist
   * @returns Promise that resolves when save is complete
   * @throws Error for validation failures or infrastructure issues
   */
  save(lineup: TeamLineup): Promise<void>;

  /**
   * Removes a team lineup from storage.
   *
   * @remarks
   * Permanently deletes a team lineup aggregate and all associated data.
   * This operation should be used carefully as it may affect game integrity
   * and referential consistency with other aggregates.
   *
   * Implementations should handle cascading effects appropriately, potentially
   * coordinating with other repositories to maintain system consistency.
   * Consider the impact on associated games and statistical data.
   *
   * @param id - Unique identifier for the team lineup to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error for constraint violations or infrastructure issues
   */
  delete(id: TeamLineupId): Promise<void>;
}
