/**
 * @file GameQueryService
 * Primary inbound port interface for game state queries and statistics.
 *
 * @remarks
 * This interface defines the driving port for all game query operations
 * in the hexagonal architecture. It complements GameCommandService by
 * focusing exclusively on read operations that don't modify game state.
 *
 * Following CQRS principles, this interface is optimized for data retrieval
 * and can support different read models, caching strategies, and query
 * optimizations without affecting command operations.
 *
 * The interface supports various query patterns:
 * - Current state queries for live game display
 * - Statistical queries for performance analysis
 * - Historical queries for game reconstruction and auditing
 * - Status queries for UI state management (undo/redo availability)
 *
 * All methods are asynchronous to support various data sources (databases,
 * caches, external services) and enable non-blocking query operations.
 *
 * @example
 * ```typescript
 * // Implementation by query handler classes
 * class GameQueryApplicationService implements GameQueryService {
 *   constructor(
 *     private gameRepository: GameRepository,
 *     private statisticsCalculator: StatisticsCalculator
 *   ) {}
 *
 *   async getCurrentGameState(gameId: GameId): Promise<GameStateDTO> {
 *     const game = await this.gameRepository.findById(gameId);
 *     return this.mapToDTO(game);
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage by web controller
 * class GameViewController {
 *   constructor(private gameQueryService: GameQueryService) {}
 *
 *   async getGameState(gameId: string): Promise<GameStateResponse> {
 *     const id = new GameId(gameId);
 *     const state = await this.gameQueryService.getCurrentGameState(id);
 *     return this.formatResponse(state);
 *   }
 * }
 * ```
 */

import { GameId, PlayerId } from '@twsoftball/domain';

import { GameHistoryDTO } from '../../dtos/GameHistoryDTO';
import { GameStateDTO } from '../../dtos/GameStateDTO';
import { GameStatisticsDTO } from '../../dtos/GameStatisticsDTO';
import { PlayerStatisticsDTO } from '../../dtos/PlayerStatisticsDTO';

/**
 * Primary inbound port for all game query operations.
 *
 * @remarks
 * This interface defines the application's primary query API for game
 * information retrieval. It encapsulates all read operations needed
 * to support game display, statistics, and analysis.
 *
 * Design principles:
 * - Query-focused: Only operations that read data
 * - Async-first: All operations return promises for performance
 * - Type-safe: Strongly typed query parameters and results
 * - Cacheable: Operations suitable for caching and optimization
 * - Protocol-agnostic: No dependencies on specific transport protocols
 *
 * The interface supports comprehensive game information access:
 * 1. Real-time game state for live display and scoring
 * 2. Statistical data for performance analysis and reporting
 * 3. Historical information for game reconstruction and review
 * 4. Action state queries for UI control (undo/redo buttons)
 *
 * Error handling typically uses exceptions for invalid queries (game not found)
 * while returning empty/null results for legitimate empty states (no statistics).
 */
export interface GameQueryService {
  /**
   * Retrieves the complete current state of a game.
   *
   * @remarks
   * Returns comprehensive game state suitable for live display, including
   * current score, inning situation, base runners, lineups, and batting
   * information. This is the primary query for real-time game interfaces.
   *
   * The returned state represents a point-in-time snapshot that includes:
   * - Current score and game status
   * - Inning, outs, and batting situation
   * - Base runners and their positions
   * - Complete lineups for both teams
   * - Current batter information
   * - Last update timestamp
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to complete game state
   * @throws Error when game is not found or inaccessible
   */
  getCurrentGameState(gameId: GameId): Promise<GameStateDTO>;

  /**
   * Retrieves comprehensive statistics for a specific game.
   *
   * @remarks
   * Returns detailed statistical analysis including team totals, individual
   * player performance, and significant game events. Suitable for post-game
   * analysis, reporting, and performance tracking.
   *
   * Statistics include:
   * - Team-level performance metrics (runs, hits, errors)
   * - Individual player batting and fielding statistics
   * - Game timeline with significant events
   * - Comparative analysis between teams
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to comprehensive game statistics
   * @throws Error when game is not found
   */
  getGameStatistics(gameId: GameId): Promise<GameStatisticsDTO>;

  /**
   * Retrieves statistics for a specific player.
   *
   * @remarks
   * Returns player performance data either for a specific game or across
   * all games (season totals). Includes both batting and fielding statistics
   * with calculated performance metrics.
   *
   * When gameId is provided: returns player's performance in that specific game
   * When gameId is omitted: returns player's season/career totals
   *
   * @param playerId - Unique identifier for the player
   * @param gameId - Optional game identifier for game-specific stats
   * @returns Promise resolving to player statistics
   * @throws Error when player is not found
   */
  getPlayerStatistics(playerId: PlayerId, gameId?: GameId): Promise<PlayerStatisticsDTO>;

  /**
   * Retrieves the complete event history for a game.
   *
   * @remarks
   * Returns chronological sequence of all recorded events in the game,
   * suitable for game reconstruction, detailed analysis, and audit trails.
   *
   * History includes:
   * - All at-bat results with timestamps
   * - Substitutions and lineup changes
   * - Administrative actions (manual inning ends, etc.)
   * - Timeline of score changes and significant events
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to complete game history
   * @throws Error when game is not found
   */
  getGameHistory(gameId: GameId): Promise<GameHistoryDTO>;

  /**
   * Checks if the last action in a game can be undone.
   *
   * @remarks
   * Returns boolean indicating whether undo functionality is available.
   * Used to control UI elements (undo button state) and validate undo
   * requests before processing.
   *
   * Undo is typically available when:
   * - At least one action has been recorded in the game
   * - The game is still in progress (not completed)
   * - No system constraints prevent state reversal
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to undo availability status
   */
  canUndo(gameId: GameId): Promise<boolean>;

  /**
   * Checks if a previously undone action can be redone.
   *
   * @remarks
   * Returns boolean indicating whether redo functionality is available.
   * Used to control UI elements (redo button state) and validate redo
   * requests before processing.
   *
   * Redo is typically available when:
   * - Previous undo operations have been performed
   * - No new actions have been recorded since the undo
   * - The game is still in progress
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to redo availability status
   */
  canRedo(gameId: GameId): Promise<boolean>;
}
