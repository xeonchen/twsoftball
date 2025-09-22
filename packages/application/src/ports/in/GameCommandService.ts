/**
 * @file GameCommandService
 * Primary inbound port interface for game recording commands.
 *
 * @remarks
 * This interface defines the driving port for all game command operations
 * in the hexagonal architecture. It serves as the contract between the
 * application core and external actors (web controllers, mobile apps, CLI).
 *
 * The interface follows CQRS principles by focusing exclusively on commands
 * that modify game state. Query operations are handled by separate query
 * service interfaces to maintain clear separation of concerns.
 *
 * All methods are asynchronous to support various infrastructure implementations
 * (database persistence, event sourcing, distributed systems) without forcing
 * blocking operations at the interface level.
 *
 * Command results include both success indicators and detailed error information
 * to enable proper error handling and user feedback in the presentation layer.
 *
 * @example
 * ```typescript
 * // Implementation by use case classes
 * class GameApplicationService implements GameCommandService {
 *   constructor(
 *     private startGameUseCase: StartNewGameUseCase,
 *     private recordAtBatUseCase: RecordAtBatUseCase
 *   ) {}
 *
 *   async startNewGame(command: StartNewGameCommand): Promise<GameStartResult> {
 *     return await this.startGameUseCase.execute(command);
 *   }
 *
 *   async recordAtBat(command: RecordAtBatCommand): Promise<AtBatResult> {
 *     return await this.recordAtBatUseCase.execute(command);
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage by web controller
 * class GameController {
 *   constructor(private gameCommandService: GameCommandService) {}
 *
 *   async startGame(request: HttpRequest): Promise<HttpResponse> {
 *     const command = this.mapToCommand(request);
 *     const result = await this.gameCommandService.startNewGame(command);
 *     return this.mapToResponse(result);
 *   }
 * }
 * ```
 */

import { AtBatResult } from '../../dtos/AtBatResult.js';
import { EndGameCommand } from '../../dtos/EndGameCommand.js';
import { EndGameResult } from '../../dtos/EndGameResult.js';
import { EndInningCommand } from '../../dtos/EndInningCommand.js';
import { GameStartResult } from '../../dtos/GameStartResult.js';
import { InningEndResult } from '../../dtos/InningEndResult.js';
import { RecordAtBatCommand } from '../../dtos/RecordAtBatCommand.js';
import { RedoCommand } from '../../dtos/RedoCommand.js';
import { RedoResult } from '../../dtos/RedoResult.js';
import { StartNewGameCommand } from '../../dtos/StartNewGameCommand.js';
import { SubstitutePlayerCommand } from '../../dtos/SubstitutePlayerCommand.js';
import { SubstitutionResult } from '../../dtos/SubstitutionResult.js';
import { UndoCommand } from '../../dtos/UndoCommand.js';
import { UndoResult } from '../../dtos/UndoResult.js';

/**
 * Primary inbound port for all game command operations.
 *
 * @remarks
 * This interface defines the application's primary command API for game
 * management. It encapsulates all operations that modify game state,
 * from initial game setup through completion.
 *
 * Design principles:
 * - Command-focused: Only operations that change state
 * - Async-first: All operations return promises for flexibility
 * - Error-safe: Results include success indicators and error details
 * - Type-safe: Strongly typed commands and results
 * - Protocol-agnostic: No dependencies on HTTP, gRPC, or other protocols
 *
 * The interface supports the complete game lifecycle:
 * 1. Game initialization with team setup and lineups
 * 2. At-bat recording with comprehensive state updates
 * 3. Lineup management with substitutions and position changes
 * 4. Game flow control (inning transitions, game completion)
 * 5. Action history management (undo/redo capabilities)
 *
 * Error handling is embedded in the result types rather than thrown exceptions,
 * enabling better error composition and handling in distributed scenarios.
 */
export interface GameCommandService {
  /**
   * Initiates a new softball game with complete setup information.
   *
   * @remarks
   * Creates a new game with specified teams, lineups, and rules configuration.
   * Validates all input data including lineup completeness, jersey number
   * uniqueness, and field position assignments.
   *
   * Success conditions:
   * - Valid team names provided
   * - Complete lineup with 9+ players
   * - All required field positions assigned
   * - Unique jersey numbers within team
   * - Valid game rules configuration
   *
   * The resulting game state is ready for play with:
   * - Empty bases and 0-0 score
   * - Top of 1st inning with away team batting
   * - First batter identified and ready
   *
   * @param command - Complete game setup information
   * @returns Promise resolving to game start result with initial state or errors
   */
  startNewGame(command: StartNewGameCommand): Promise<GameStartResult>;

  /**
   * Records the result of a single at-bat with all associated runner movements.
   *
   * @remarks
   * Processes a complete plate appearance outcome, updating game state to
   * reflect the result. Calculates runs scored, RBI awarded, and determines
   * if significant game events occurred (inning/game end).
   *
   * Handles all standard softball outcomes:
   * - Hits (singles through home runs)
   * - Walks and strikeouts
   * - Fielding outs (ground outs, fly outs, force plays)
   * - Complex plays (double plays, sacrifice flies, fielder's choice)
   * - Error situations with custom runner advancement
   *
   * Updates managed automatically:
   * - Base runner positions
   * - Batting order progression
   * - Score and inning state
   * - Player statistics
   * - Game completion status
   *
   * @param command - At-bat result with runner movements
   * @returns Promise resolving to at-bat result with updated game state
   */
  recordAtBat(command: RecordAtBatCommand): Promise<AtBatResult>;

  /**
   * Executes player substitutions during the game.
   *
   * @remarks
   * Manages lineup changes including defensive substitutions, pinch hitters,
   * and pinch runners. Enforces substitution rules including re-entry
   * limitations and batting order maintenance.
   *
   * @param command - Substitution details including players and positions
   * @returns Promise resolving to substitution result with updated lineups
   */
  substitutePlayer(command: SubstitutePlayerCommand): Promise<SubstitutionResult>;

  /**
   * Forces the current inning to end (administrative action).
   *
   * @remarks
   * Manually ends the current half-inning, typically used for administrative
   * purposes or unusual game situations. Updates inning state and advances
   * to the next half-inning.
   *
   * @param command - Inning end details
   * @returns Promise resolving to inning end result with updated state
   */
  endInning(command: EndInningCommand): Promise<InningEndResult>;

  /**
   * Concludes the game manually or due to special conditions.
   *
   * @remarks
   * Ends the game before natural completion, typically due to weather,
   * time limits, forfeit, or mercy rule application. Calculates final
   * statistics and marks game as completed.
   *
   * @param command - Game end details including reason
   * @returns Promise resolving to game end result with final statistics
   */
  endGame(command: EndGameCommand): Promise<EndGameResult>;

  /**
   * Reverts the last recorded action in the game.
   *
   * @remarks
   * Implements undo functionality for error correction. Reverts the most
   * recent state change (at-bat, substitution, etc.) and restores the
   * previous game state.
   *
   * Maintains undo history to support multiple consecutive undo operations.
   * Changes can be redone if needed before new actions are recorded.
   *
   * @param command - Undo action details
   * @returns Promise resolving to undo result with restored state
   */
  undoLastAction(command: UndoCommand): Promise<UndoResult>;

  /**
   * Reapplies a previously undone action.
   *
   * @remarks
   * Implements redo functionality to reapply actions that were undone.
   * Only available when undo operations have been performed and no new
   * actions have been recorded since.
   *
   * @param command - Redo action details
   * @returns Promise resolving to redo result with reapplied changes
   */
  redoLastAction(command: RedoCommand): Promise<RedoResult>;
}
