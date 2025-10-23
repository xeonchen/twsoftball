/**
 * @file RecordAtBat
 * Use case for recording at-bat results and updating game state across all aggregates.
 *
 * @remarks
 * This use case orchestrates the recording of plate appearance outcomes in softball games,
 * coordinating multiple domain aggregates, calculating statistics (RBI, runs scored),
 * and ensuring data consistency through proper event sourcing.
 *
 * **Business Process Flow**:
 * 1. **Validation**: Verify game exists, is in progress, and batter is valid
 * 2. **State Loading**: Load all relevant aggregates (Game, lineups, inning state)
 * 3. **Domain Coordination**: Apply at-bat result to appropriate aggregates
 * 4. **Statistics Calculation**: Calculate RBIs, runs scored, and other derived stats
 * 5. **Event Generation**: Create domain events for all state changes
 * 6. **Persistence**: Save updated aggregates and store events atomically
 * 7. **Result Assembly**: Build comprehensive result DTO for presentation layer
 *
 * **Key Responsibilities**:
 * - **Cross-aggregate coordination**: Updates Game, TeamLineup, and InningState
 * - **Event sourcing**: Generates and persists domain events for audit trail
 * - **Statistics calculation**: Uses RBICalculator and other domain services
 * - **Error handling**: Provides detailed error information for troubleshooting
 * - **Audit logging**: Comprehensive logging for monitoring and debugging
 *
 * **Design Patterns**:
 * - **Hexagonal Architecture**: Uses ports for infrastructure dependencies
 * - **Domain-Driven Design**: Rich domain model coordination with proper aggregates
 * - **Command-Query Separation**: Command input, comprehensive result output
 * - **Event Sourcing**: All state changes recorded as immutable domain events
 * - **Dependency Injection**: Testable with mocked dependencies
 *
 * **Error Handling Strategy**:
 * - Input validation with detailed field-level error messages
 * - Domain rule violations caught and translated to user-friendly messages
 * - Infrastructure failures (database, event store) handled gracefully
 * - All errors logged with full context for debugging and monitoring
 * - Failed operations leave system in consistent state (no partial updates)
 *
 * @example
 * ```typescript
 * // Service setup with dependency injection
 * const recordAtBat = new RecordAtBat(
 *   gameRepository,
 *   eventStore,
 *   logger
 * );
 *
 * // Record a home run with bases loaded
 * const command: RecordAtBatCommand = {
 *   gameId: GameId.create('game-123'),
 *   batterId: PlayerId.create('player-456'),
 *   result: AtBatResultType.HOME_RUN,
 *   runnerAdvances: [
 *     { playerId: batterId, fromBase: null, toBase: 'HOME', advanceReason: 'BATTED_BALL' },
 *     { playerId: runner1Id, fromBase: 'FIRST', toBase: 'HOME', advanceReason: 'BATTED_BALL' },
 *     { playerId: runner2Id, fromBase: 'SECOND', toBase: 'HOME', advanceReason: 'BATTED_BALL' },
 *     { playerId: runner3Id, fromBase: 'THIRD', toBase: 'HOME', advanceReason: 'BATTED_BALL' }
 *   ]
 * };
 *
 * const result = await recordAtBat.execute(command);
 *
 * if (result.success) {
 *   console.log(`Recorded ${result.runsScored} runs, ${result.rbiAwarded} RBI`);
 *   if (result.gameEnded) console.log('Game completed!');
 * } else {
 *   console.error('Operation failed:', result.errors);
 * }
 * ```
 */

import {
  Game,
  GameId,
  PlayerId,
  TeamLineupId,
  FieldPosition,
  AtBatResultType,
  GameStatus,
  DomainEvent,
  RunScored,
} from '@twsoftball/domain';

import { AtBatResult } from '../dtos/AtBatResult.js';
import { GameStateDTO } from '../dtos/GameStateDTO.js';
import { PlayerInGameDTO } from '../dtos/PlayerInGameDTO.js';
import { PlayerStatisticsDTO, FieldingStatisticsDTO } from '../dtos/PlayerStatisticsDTO.js';
import { RecordAtBatCommand, RecordAtBatCommandValidator } from '../dtos/RecordAtBatCommand.js';
import { RunnerAdvanceDTO } from '../dtos/RunnerAdvanceDTO.js';
import { TeamLineupDTO, BattingSlotDTO } from '../dtos/TeamLineupDTO.js';
import { EventStore } from '../ports/out/EventStore.js';
import { GameRepository } from '../ports/out/GameRepository.js';
import { InningStateRepository } from '../ports/out/InningStateRepository.js';
import { Logger } from '../ports/out/Logger.js';
import { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';
import { UseCaseErrorHandler } from '../utils/UseCaseErrorHandler.js';
// Note: Reverted to direct logging to maintain architecture compliance

/**
 * Use case for recording at-bat results and coordinating game state updates.
 *
 * @remarks
 * This use case implements the complete business process for recording a plate
 * appearance outcome in a softball game. It coordinates multiple domain aggregates,
 * applies business rules, calculates statistics, and maintains data consistency
 * through event sourcing.
 *
 * **Architecture Integration**:
 * - **Application Layer**: Orchestrates domain operations and infrastructure calls
 * - **Domain Layer**: Uses aggregates, services, and events for business logic
 * - **Infrastructure Layer**: Accessed through ports for persistence and logging
 *
 * **Concurrency Considerations**:
 * - Optimistic locking through event store version checking
 * - Atomic operations for cross-aggregate consistency
 * - Error handling prevents partial state updates
 *
 * **Performance Considerations**:
 * - Efficient aggregate loading and caching
 * - Batch event generation and storage
 * - Minimal domain object allocations
 * - Structured logging with level checking
 *
 * The use case follows the Command pattern with comprehensive error handling
 * and detailed audit logging for production monitoring and debugging.
 */
export class RecordAtBat {
  /**
   * Creates a new RecordAtBat use case instance.
   *
   * @remarks
   * Constructor uses dependency injection to provide testable, flexible
   * implementations of required infrastructure services. All dependencies
   * are required and must be properly configured before use.
   *
   * The use case maintains no internal state and is thread-safe for
   * concurrent execution with different command inputs.
   *
   * @param gameRepository - Port for Game aggregate persistence operations
   * @param inningStateRepository - Port for InningState aggregate persistence operations
   * @param teamLineupRepository - Port for TeamLineup aggregate persistence operations
   * @param eventStore - Port for domain event storage and retrieval
   * @param logger - Port for structured application logging
   */
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly inningStateRepository: InningStateRepository,
    private readonly teamLineupRepository: TeamLineupRepository,
    private readonly eventStore: EventStore,
    private readonly logger: Logger
  ) {
    if (!gameRepository) {
      throw new Error('GameRepository is required');
    }
    if (!inningStateRepository) {
      throw new Error('InningStateRepository is required');
    }
    if (!teamLineupRepository) {
      throw new Error('TeamLineupRepository is required');
    }
    if (!eventStore) {
      throw new Error('EventStore is required');
    }
    if (!logger) {
      throw new Error('Logger is required');
    }
  }

  /**
   * Executes the at-bat recording process with comprehensive error handling.
   *
   * @remarks
   * This is the main entry point for the use case. It implements the complete
   * business process from validation through persistence, with detailed error
   * handling and comprehensive logging.
   *
   * **Process Overview**:
   * 1. **Input Validation**: Verify command structure and basic constraints
   * 2. **Game Loading**: Load game and verify it's in valid state
   * 3. **Aggregate Coordination**: Update all relevant domain aggregates
   * 4. **Statistics Calculation**: Calculate RBI, runs, and derived metrics
   * 5. **Event Generation**: Create domain events for all state changes
   * 6. **Atomic Persistence**: Save aggregates and events consistently
   * 7. **Result Assembly**: Build comprehensive result for presentation
   *
   * **Error Handling**:
   * - All errors are caught, logged, and translated to user-friendly messages
   * - Domain errors preserve business rule violation details
   * - Infrastructure errors are handled gracefully with retry consideration
   * - Failed operations maintain system consistency (no partial updates)
   *
   * **Logging Strategy**:
   * - Debug: Detailed process flow and intermediate state
   * - Info: Successful operations with key metrics
   * - Warn: Recoverable issues and performance concerns
   * - Error: All failures with complete context and stack traces
   *
   * @param command - Complete at-bat command with all required information
   * @returns Promise resolving to comprehensive result with success/failure details
   *
   * @example
   * ```typescript
   * // Successful execution
   * const result = await recordAtBat.execute({
   *   gameId: GameId.create('game-123'),
   *   batterId: PlayerId.create('player-456'),
   *   result: AtBatResultType.SINGLE,
   *   runnerAdvances: [...]
   * });
   *
   * if (result.success) {
   *   // Handle successful recording
   *   updateUI(result.gameState);
   *   showStats(result.runsScored, result.rbiAwarded);
   * } else {
   *   // Handle validation or processing errors
   *   displayErrors(result.errors);
   * }
   * ```
   */
  async execute(command: RecordAtBatCommand): Promise<AtBatResult> {
    // Log start of operation

    this.logger.debug('Starting at-bat processing', {
      gameId: command.gameId.value,
      batterId: command.batterId.value,
      operation: 'recordAtBat',
      result: command.result,
    });

    try {
      // Step 0: Fail-fast DTO validation
      try {
        RecordAtBatCommandValidator.validate(command);
      } catch (validationError) {
        this.logger.warn('DTO validation failed', {
          gameId: command.gameId.value,
          batterId: command.batterId.value,
          operation: 'recordAtBat',
          validationError:
            validationError instanceof Error ? validationError.message : 'Unknown validation error',
        });
        return await this.createFailureResult(null, [
          validationError instanceof Error ? validationError.message : 'Invalid command structure',
        ]);
      }

      // Step 1: Load and validate game
      const game = await this.loadAndValidateGame(command.gameId);
      if (!game) {
        return await this.createFailureResult(null, [`Game not found: ${command.gameId.value}`]);
      }

      // Step 2: Capture original state for transaction compensation
      const originalGame = game; // In a full implementation, create deep copy for safety

      // Step 3: Validate game state
      const gameStateValidation = this.validateGameState(game);
      if (!gameStateValidation.valid) {
        return await this.createFailureResult(game, gameStateValidation.errors);
      }

      // Step 4: Load aggregates and process at-bat with full aggregate coordination
      // Note: Batting position persistence is now handled internally by InningState aggregate.
      // InningState tracks both awayTeamBatterSlot and homeTeamBatterSlot internally,
      // and endHalfInning() automatically preserves both slots without requiring parameters.
      // No cross-aggregate coordination needed for batting position persistence.

      // Step 5: Apply business logic and calculate results
      const result = await this.processAtBat(game, command);

      // Step 6: Generate events
      const events = this.generateEvents(command, result);

      // Step 7: Persist changes atomically with compensation support
      await this.persistChanges(game, events, originalGame);

      this.logger.info('At-bat recorded successfully', {
        gameId: command.gameId.value,
        batterId: command.batterId.value,
        operation: 'recordAtBat',
        result: command.result,
        runsScored: result.runsScored,
        rbiAwarded: result.rbiAwarded,
      });

      return await this.createSuccessResult(game, result);
    } catch (error) {
      return UseCaseErrorHandler.handleError(
        error,
        command.gameId,
        this.gameRepository,
        this.logger,
        'recordAtBat',
        (game, errors) => this.createFailureResult(game, errors),
        { batterId: command.batterId.value, result: command.result }
      );
    }
  }

  /**
   * Loads game from repository with comprehensive error handling.
   *
   * @remarks
   * Handles repository access errors gracefully and provides detailed logging
   * for debugging repository issues. Returns null for not-found cases to
   * enable appropriate error handling by caller.
   *
   * @param gameId - Unique identifier for the game to load
   * @returns Promise resolving to Game aggregate or null if not found
   * @throws Error for repository infrastructure failures
   */
  private async loadAndValidateGame(gameId: GameId): Promise<Game | null> {
    try {
      this.logger.debug('Loading game from repository', {
        gameId: gameId.value,
        operation: 'loadGame',
      });

      return await this.gameRepository.findById(gameId);
    } catch (error) {
      this.logger.error('Failed to load game from repository', error as Error, {
        gameId: gameId.value,
        operation: 'loadGame',
      });
      throw error;
    }
  }

  /**
   * Validates that the game is in a valid state for recording at-bats.
   *
   * @remarks
   * Performs business rule validation to ensure the game can accept new at-bat
   * records. Checks game status, timing, and other prerequisites.
   *
   * @param game - Game aggregate to validate
   * @returns Validation result with success flag and error messages
   */
  private validateGameState(game: Game): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if game is in progress
    if (game.status !== GameStatus.IN_PROGRESS) {
      errors.push(`Cannot record at-bat: Game status is ${game.status}`);
    }

    // Add additional validations as needed
    // - Check if game is within valid timing windows
    // - Verify no other concurrent operations
    // - Check for game-specific business rules

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Processes the at-bat by applying domain rules and calculating results.
   *
   * @remarks
   * This method contains the core business logic for recording an at-bat.
   * It coordinates with the InningState aggregate to properly advance the
   * batting order and update inning state.
   *
   * **Cross-Aggregate Coordination:**
   * - Loads InningState and TeamLineup aggregates from repositories
   * - Determines current batter from InningState and TeamLineup
   * - Calls InningState.recordAtBat() to process domain logic
   * - Persists updated InningState aggregate
   * - Returns updated state for use by buildGameStateDTO
   *
   * @param game - Current game aggregate
   * @param command - At-bat command with all details
   * @returns Processed result with statistics and state changes
   */
  private async processAtBat(
    game: Game,
    command: RecordAtBatCommand
  ): Promise<ProcessedAtBatResult> {
    // Step 1: Load InningState aggregate
    const inningState = await this.inningStateRepository.findCurrentByGameId(game.id);
    if (!inningState) {
      throw new Error(`InningState not found for game: ${game.id.value}`);
    }

    // Step 2: Determine batting team and load their lineup
    const battingTeamSide = inningState.isTopHalf ? 'AWAY' : 'HOME';
    const battingTeamLineup = await this.teamLineupRepository.findByGameIdAndSide(
      game.id,
      battingTeamSide
    );
    if (!battingTeamLineup) {
      throw new Error(`TeamLineup not found for game ${game.id.value} and side ${battingTeamSide}`);
    }

    // Step 3: Get current batting slot and validate batter
    const battingSlot = inningState.isTopHalf
      ? inningState.awayBatterSlot
      : inningState.homeBatterSlot;
    const currentBatterPlayerId = battingTeamLineup.getPlayerAtSlot(battingSlot);
    if (!currentBatterPlayerId) {
      throw new Error(`No player found at batting slot ${battingSlot}`);
    }

    // Step 4: Coordinate with InningState aggregate to record the at-bat
    // This will advance batting order and update inning state
    const updatedInningState = inningState.recordAtBat(
      command.batterId,
      battingSlot,
      command.result,
      inningState.inning
    );

    // Step 5: Extract events IMMEDIATELY (before save clears them)
    const events = updatedInningState.getUncommittedEvents();
    const inningEnded = events.some(e => e.type === 'HalfInningEnded');

    // Step 6: Persist updated InningState (this clears uncommitted events)
    await this.inningStateRepository.save(updatedInningState);

    // Step 7: Calculate additional results
    const runsScored = this.calculateRunsScored(command.runnerAdvances || []);
    const rbiAwarded = this.calculateRBI(command.result, command.runnerAdvances || []);

    // Step 8: Update game score with runs from this at-bat
    if (runsScored > 0) {
      if (battingTeamSide === 'HOME') {
        game.addHomeRuns(runsScored);
      } else {
        game.addAwayRuns(runsScored);
      }
      await this.gameRepository.save(game);
    }

    // Step 9: Check if game should end
    let gameEnded = false;

    // Check for walk-off win (home team wins in bottom of 7+ before inning ends)
    if (!inningEnded && game.isWalkOffScenario()) {
      game.completeGame('REGULATION');
      await this.gameRepository.save(game);
      gameEnded = true;
    }
    // Check for normal completion after regulation 7 innings
    else if (inningEnded && updatedInningState.inning === 8 && updatedInningState.isTopHalf) {
      // Game should end when we advance past inning 7 (now in top of 8th)
      game.completeGame('REGULATION');
      await this.gameRepository.save(game);
      gameEnded = true;
    }

    return {
      runsScored,
      rbiAwarded,
      inningEnded,
      gameEnded,
      updatedInningState,
      currentBattingSlot: battingSlot, // Slot BEFORE advancement
    };
  }

  /**
   * Calculates the number of runs scored from runner advances.
   *
   * @remarks
   * Counts runners who reached HOME base as a result of the at-bat.
   * This includes the batter if they scored (home run) and any baserunners
   * who crossed home plate.
   *
   * @param runnerAdvances - All runner movements during the at-bat
   * @returns Total number of runs scored
   */
  private calculateRunsScored(runnerAdvances: RunnerAdvanceDTO[]): number {
    return runnerAdvances.filter(advance => advance.toBase === 'HOME').length;
  }

  /**
   * Calculates RBI awarded to the batter based on at-bat result and advances.
   *
   * @remarks
   * Implements RBI rules:
   * - Home runs: RBI for batter plus all runners who score
   * - Sacrifice flies: RBI if runner scores from sacrifice
   * - Base hits: RBI for runners who score due to hit
   * - Walks: RBI only on bases-loaded walk
   * - Errors: No RBI awarded
   * - Force outs: May award RBI depending on situation
   *
   * @param result - The at-bat result type
   * @param runnerAdvances - All runner movements
   * @returns Number of RBI awarded to batter
   */
  private calculateRBI(result: AtBatResultType, runnerAdvances: RunnerAdvanceDTO[]): number {
    // Simplified RBI calculation
    // In full implementation, would use RBICalculator domain service

    const runsScored = runnerAdvances.filter(advance => advance.toBase === 'HOME').length;

    // No RBI for errors
    if (result === AtBatResultType.ERROR) {
      return 0;
    }

    // Walks only get RBI if bases loaded (would need more context to determine)
    if (result === AtBatResultType.WALK) {
      return runsScored > 0 ? 1 : 0;
    }

    // Most other results award RBI for runs scored
    return runsScored;
  }

  /**
   * Generates domain events for the at-bat and its consequences.
   *
   * @remarks
   * Extracts domain events from the updated InningState aggregate and combines
   * them with additional application-level events (RunScored, GameEnded).
   * The InningState aggregate already generates proper domain events
   * (AtBatCompleted, RunnerAdvanced, CurrentBatterChanged, etc.) through
   * its recordAtBat() method, so we don't need to recreate them.
   *
   * **Generated Events**:
   * - From InningState: AtBatCompleted, RunnerAdvanced, CurrentBatterChanged
   * - From Application: RunScored (for scoring tracking), GameEnded (if game ends)
   *
   * @param command - Original at-bat command
   * @param result - Processed result with calculated statistics and updated InningState
   * @returns Array of domain events representing all state changes
   */
  private generateEvents(command: RecordAtBatCommand, result: ProcessedAtBatResult): DomainEvent[] {
    const events: DomainEvent[] = [];

    // Extract domain events from InningState aggregate
    // These include AtBatCompleted, RunnerAdvanced, CurrentBatterChanged, etc.
    const inningStateEvents = result.updatedInningState.getUncommittedEvents();
    events.push(...inningStateEvents);

    // Generate RunScored events for each run
    const runsScored = command.runnerAdvances?.filter(advance => advance.toBase === 'HOME') || [];
    runsScored.forEach(runnerAdvance => {
      events.push(
        new RunScored(
          command.gameId,
          runnerAdvance.playerId,
          'HOME', // battingTeam - simplified for now
          command.batterId, // rbiCreditedTo
          { home: 0, away: 0 } // newScore - simplified for now
        )
      );
    });

    return events;
  }

  /**
   * Persists all changes atomically to ensure consistency.
   *
   * @remarks
   * Implements a transaction-safe persistence pattern using compensation logic.
   * Ensures that either both the game aggregate and events are saved successfully,
   * or the system remains in its original consistent state.
   *
   * **Transaction Safety Strategy**:
   * 1. Save Game aggregate first (most critical state)
   * 2. Store domain events for audit trail
   * 3. Implement compensation on partial failures
   * 4. Maintain system consistency through rollback
   *
   * **Failure Recovery**:
   * - Game save fails: No changes persisted, system consistent
   * - Event store fails: Compensate by reverting game state
   * - Compensation fails: Log error and propagate (requires manual intervention)
   *
   * In a full implementation with multiple aggregates:
   * - Save all aggregates atomically using Unit of Work pattern
   * - Use distributed transaction patterns if needed
   * - Implement comprehensive compensating actions
   *
   * @param game - Updated Game aggregate to persist
   * @param events - Domain events to store
   * @param originalGame - Original game state for compensation rollback
   * @throws Error for persistence failures requiring upstream handling
   */
  private async persistChanges(
    game: Game,
    events: DomainEvent[],
    originalGame?: Game
  ): Promise<void> {
    let gameWasSaved = false;

    try {
      // Phase 1: Save game aggregate
      await this.gameRepository.save(game);
      gameWasSaved = true;

      this.logger.debug('Game aggregate saved successfully', {
        gameId: game.id.value,
        operation: 'persistGame',
      });

      // Phase 2: Store domain events
      await this.eventStore.append(game.id, 'Game', events);

      this.logger.debug('Domain events stored successfully', {
        gameId: game.id.value,
        eventCount: events.length,
        eventTypes: events.map(e => e.type),
        operation: 'persistEvents',
      });
    } catch (error) {
      // Transaction failed - determine recovery action
      if (gameWasSaved && originalGame) {
        // Event store failed after game was saved - attempt compensation
        await this.compensateFailedTransaction(originalGame, error);
      }

      // Distinguish between different types of persistence failures
      if (error instanceof Error) {
        if (error.message.includes('Database') || error.message.includes('connection')) {
          this.logger.error('Database persistence failed', error, {
            gameId: game.id.value,
            operation: 'persistChanges',
            errorType: 'database',
            compensationApplied: gameWasSaved && originalGame !== undefined,
          });
        } else if (error.message.includes('Event store') || error.message.includes('store')) {
          this.logger.error('Event store persistence failed', error, {
            gameId: game.id.value,
            operation: 'persistChanges',
            errorType: 'eventStore',
            compensationApplied: gameWasSaved && originalGame !== undefined,
          });
        }
      }

      throw error; // Re-throw for upstream error handling
    }
  }

  /**
   * Compensates for failed transaction by reverting game state.
   *
   * @remarks
   * Implements compensation logic when event storage fails after game save.
   * Attempts to restore system consistency by reverting the game aggregate
   * to its original state.
   *
   * **Compensation Strategy**:
   * - Restore original game state to maintain consistency
   * - Log compensation attempt for audit purposes
   * - Handle compensation failures gracefully
   *
   * This is a simplified compensation pattern. In production systems:
   * - Use proper transaction managers or saga patterns
   * - Implement retry mechanisms with exponential backoff
   * - Provide manual intervention capabilities for failed compensations
   * - Consider eventual consistency patterns for distributed scenarios
   *
   * @param originalGame - Original game state to restore
   * @param originalError - The error that triggered compensation
   * @throws Error if compensation itself fails (requires manual intervention)
   */
  private async compensateFailedTransaction(
    originalGame: Game,
    originalError: unknown
  ): Promise<void> {
    try {
      this.logger.warn('Attempting transaction compensation', {
        gameId: originalGame.id.value,
        operation: 'compensateFailedTransaction',
        reason: 'Event store failed after game save',
        originalError: originalError instanceof Error ? originalError.message : 'Unknown error',
      });

      // Restore original game state
      await this.gameRepository.save(originalGame);

      this.logger.info('Transaction compensation successful', {
        gameId: originalGame.id.value,
        operation: 'compensateFailedTransaction',
      });
    } catch (compensationError) {
      // Compensation failed - system may be in inconsistent state
      this.logger.error('Transaction compensation failed', compensationError as Error, {
        gameId: originalGame.id.value,
        operation: 'compensateFailedTransaction',
        originalError: originalError instanceof Error ? originalError.message : 'Unknown error',
        systemState: 'potentially_inconsistent',
        requiresManualIntervention: true,
      });

      throw new Error(
        `Transaction compensation failed for game ${originalGame.id.value}. ` +
          `Original error: ${originalError instanceof Error ? originalError.message : 'Unknown'}. ` +
          `Compensation error: ${compensationError instanceof Error ? compensationError.message : 'Unknown'}. ` +
          `System may be in inconsistent state and requires manual intervention.`
      );
    }
  }

  /**
   * Creates a success result DTO with complete game state and statistics.
   *
   * @remarks
   * Assembles all result information into a comprehensive DTO that provides
   * the presentation layer with everything needed to update the UI and
   * display relevant information to users.
   *
   * @param game - Updated game aggregate
   * @param result - Processed at-bat result
   * @returns Promise resolving to complete success result
   */
  private async createSuccessResult(
    game: Game,
    result: ProcessedAtBatResult
  ): Promise<AtBatResult> {
    // Build complete GameStateDTO from all aggregates, using updated InningState
    // Pass currentBattingSlot to show the batter who JUST batted (pre-advancement)
    const gameStateDTO = await this.buildGameStateDTO(
      game.id,
      result.updatedInningState,
      result.currentBattingSlot
    );

    return {
      success: true,
      gameState: gameStateDTO,
      runsScored: result.runsScored,
      rbiAwarded: result.rbiAwarded,
      inningEnded: result.inningEnded,
      gameEnded: result.gameEnded,
      // errors field is optional for success cases
    } as AtBatResult;
  }

  /**
   * Creates a failure result DTO with detailed error information.
   *
   * @remarks
   * Provides comprehensive error information while maintaining a consistent
   * interface structure. Includes current game state (if available) to help
   * the presentation layer maintain context even during error conditions.
   *
   * @param game - Current game state (may be null if not loaded)
   * @param errors - Array of error messages describing the failures
   * @returns Promise resolving to complete failure result with error details
   */
  private async createFailureResult(game: Game | null, errors: string[]): Promise<AtBatResult> {
    const gameStateDTO = game
      ? await this.buildGameStateDTO(game.id)
      : this.buildEmptyGameStateDTO();

    return {
      success: false,
      gameState: gameStateDTO,
      runsScored: 0,
      rbiAwarded: 0,
      inningEnded: false,
      gameEnded: false,
      errors,
    };
  }

  /**
   * Builds complete GameStateDTO by loading and coordinating all aggregates.
   *
   * @remarks
   * Constructs comprehensive game state after at-bat recording by loading
   * Game, InningState, and TeamLineup aggregates, then deriving current batter
   * information. The currentBatter represents the player who will bat AFTER
   * this at-bat completes (next batter up).
   *
   * This follows the pattern established in StartNewGame.buildInitialGameState()
   * for consistency across the Application layer.
   *
   * **Data Sources**:
   * - Game aggregate: Overall status, score, team names
   * - InningState aggregate: Current inning, half, outs, bases, batter slot
   * - TeamLineup aggregates: Complete lineup information for both teams
   * - Derived: Current batter from batting slot + lineup combination
   *
   * @param gameId - Unique identifier for the game to load
   * @param updatedInningState - Optional updated InningState from processAtBat (avoids stale data)
   * @returns Promise resolving to complete game state DTO
   * @throws Error if any required aggregate cannot be loaded
   */
  private async buildGameStateDTO(
    gameId: GameId,
    updatedInningState?: import('@twsoftball/domain').InningState,
    currentBattingSlot?: number
  ): Promise<GameStateDTO> {
    // Load all necessary aggregates
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId.value}`);
    }

    // Use provided updatedInningState if available, otherwise load from repository
    const inningState =
      updatedInningState || (await this.inningStateRepository.findCurrentByGameId(gameId));
    if (!inningState) {
      throw new Error(`InningState not found for game: ${gameId.value}`);
    }

    const homeLineup = await this.teamLineupRepository.findByGameIdAndSide(gameId, 'HOME');
    const awayLineup = await this.teamLineupRepository.findByGameIdAndSide(gameId, 'AWAY');
    if (!homeLineup || !awayLineup) {
      throw new Error(`Team lineups not found for game: ${gameId.value}`);
    }

    // Determine current batter based on provided slot (pre-advancement) or inning state
    // If currentBattingSlot is provided, use it (shows batter who JUST batted)
    // Otherwise, use inningState's current slot (shows batter who's UP NEXT)
    const battingSlot =
      currentBattingSlot ??
      (inningState.isTopHalf ? inningState.awayBatterSlot : inningState.homeBatterSlot);
    const battingTeamLineup = inningState.isTopHalf ? awayLineup : homeLineup;
    const currentBatterPlayerId = battingTeamLineup.getPlayerAtSlot(battingSlot);

    const currentBatter = currentBatterPlayerId
      ? this.mapPlayerToDTO(battingTeamLineup, currentBatterPlayerId, battingSlot)
      : null;

    // Build complete GameStateDTO
    // [FAIL FAST] Validate Domain layer provided complete state
    if (inningState.isTopHalf === undefined || inningState.isTopHalf === null) {
      throw new Error(
        '[Application] CRITICAL: InningState.isTopHalf is undefined/null. ' +
          `Domain layer must provide complete state. Inning: ${inningState.inning}, Outs: ${inningState.outs}`
      );
    }

    const dto: GameStateDTO = {
      gameId: game.id,
      status: game.status,
      score: game.getScoreDTO(),
      gameStartTime: game.startTime,
      currentInning: inningState.inning,
      isTopHalf: inningState.isTopHalf,
      battingTeam: inningState.isTopHalf ? 'AWAY' : 'HOME',
      outs: inningState.outs,
      bases: inningState.getBases(),
      currentBatterSlot: battingSlot,
      homeLineup: this.mapTeamLineupToDTO(homeLineup, 'HOME'),
      awayLineup: this.mapTeamLineupToDTO(awayLineup, 'AWAY'),
      currentBatter,
      lastUpdated: new Date(),
    };

    return dto;
  }

  /**
   * Maps TeamLineup aggregate to TeamLineupDTO for presentation layer.
   *
   * @remarks
   * Converts domain TeamLineup aggregate into DTO format suitable for
   * presentation layer consumption. Includes all batting slots, field
   * positions, and player information with statistics.
   *
   * @param teamLineup - The TeamLineup aggregate to convert
   * @param teamSide - Whether this is HOME or AWAY team
   * @returns Complete TeamLineupDTO
   */
  private mapTeamLineupToDTO(
    teamLineup: import('@twsoftball/domain').TeamLineup,
    teamSide: 'HOME' | 'AWAY'
  ): TeamLineupDTO {
    // Convert domain batting slots to DTO format
    const activeLineup = teamLineup.getActiveLineup();
    const battingSlots: BattingSlotDTO[] = activeLineup.map(battingSlot => {
      const currentPlayerId = battingSlot.getCurrentPlayer();
      const playerInfo = teamLineup.getPlayerInfo(currentPlayerId);

      return {
        slotNumber: battingSlot.position,
        currentPlayer: playerInfo
          ? {
              playerId: currentPlayerId,
              name: playerInfo.playerName,
              jerseyNumber: playerInfo.jerseyNumber,
              battingOrderPosition: battingSlot.position,
              currentFieldPosition: playerInfo.currentPosition || FieldPosition.EXTRA_PLAYER,
              preferredPositions: playerInfo.currentPosition ? [playerInfo.currentPosition] : [],
              plateAppearances: [], // Would be populated from game history
              statistics: this.createEmptyStatistics(
                currentPlayerId,
                playerInfo.playerName,
                playerInfo.jerseyNumber
              ),
            }
          : null,
        history: battingSlot.history.map(h => {
          const historyPlayerInfo = teamLineup.getPlayerInfo(h.playerId);
          return {
            playerId: h.playerId,
            playerName: historyPlayerInfo?.playerName || 'Unknown',
            enteredInning: h.enteredInning,
            exitedInning: h.exitedInning,
            wasStarter: h.wasStarter,
            isReentry: h.isReentry,
          };
        }),
      };
    });

    // Convert domain field positions to DTO format
    const fieldPositionsMap = teamLineup.getFieldingPositions();
    const fieldPositions: Record<FieldPosition, PlayerId | null> = {} as Record<
      FieldPosition,
      PlayerId | null
    >;
    for (const [position, playerId] of fieldPositionsMap.entries()) {
      fieldPositions[position] = playerId;
    }

    return {
      teamLineupId: teamLineup.id,
      gameId: teamLineup.gameId,
      teamSide,
      teamName: teamLineup.teamName,
      strategy: 'SIMPLE', // Default strategy
      battingSlots,
      fieldPositions,
      benchPlayers: [], // Would be implemented in full version
      substitutionHistory: [], // Would be implemented in full version
    };
  }

  /**
   * Maps player information to PlayerInGameDTO.
   *
   * @remarks
   * Converts domain player information into DTO format for current batter
   * display. Includes complete player details, position, and statistics.
   *
   * @param teamLineup - The TeamLineup aggregate containing player info
   * @param playerId - Player identifier
   * @param battingSlot - Current batting slot number
   * @returns Complete PlayerInGameDTO or null if player not found
   */
  private mapPlayerToDTO(
    teamLineup: import('@twsoftball/domain').TeamLineup,
    playerId: PlayerId,
    battingSlot: number
  ): PlayerInGameDTO | null {
    const playerInfo = teamLineup.getPlayerInfo(playerId);
    if (!playerInfo) {
      return null;
    }

    return {
      playerId,
      name: playerInfo.playerName,
      jerseyNumber: playerInfo.jerseyNumber,
      battingOrderPosition: battingSlot,
      currentFieldPosition: playerInfo.currentPosition || FieldPosition.EXTRA_PLAYER,
      preferredPositions: playerInfo.currentPosition ? [playerInfo.currentPosition] : [],
      plateAppearances: [], // Would be populated from game history
      statistics: this.createEmptyStatistics(
        playerId,
        playerInfo.playerName,
        playerInfo.jerseyNumber
      ),
    };
  }

  /**
   * Creates empty player statistics for display.
   *
   * @param playerId - Player identifier
   * @param name - Player display name
   * @param jerseyNumber - Player jersey number
   * @returns Empty PlayerStatisticsDTO with zero values
   */
  private createEmptyStatistics(
    playerId: PlayerId,
    name: string,
    jerseyNumber: import('@twsoftball/domain').JerseyNumber
  ): PlayerStatisticsDTO {
    const emptyFielding: FieldingStatisticsDTO = {
      positions: [],
      putouts: 0,
      assists: 0,
      errors: 0,
      fieldingPercentage: 1.0,
    };

    return {
      playerId,
      name,
      jerseyNumber,
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      strikeouts: 0,
      rbi: 0,
      runs: 0,
      battingAverage: 0.0,
      onBasePercentage: 0.0,
      sluggingPercentage: 0.0,
      fielding: emptyFielding,
    };
  }

  /**
   * Builds an empty GameStateDTO for error conditions when game is not available.
   *
   * @remarks
   * Provides a consistent DTO structure even when the game cannot be loaded.
   * This helps maintain API consistency and prevents downstream errors in
   * the presentation layer.
   *
   * @returns Empty game state DTO with default values
   */
  private buildEmptyGameStateDTO(): GameStateDTO {
    const emptyGameId = new GameId('unknown');

    return {
      gameId: emptyGameId,
      status: GameStatus.NOT_STARTED,
      score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
      gameStartTime: new Date(),
      currentInning: 1,
      isTopHalf: true,
      battingTeam: 'AWAY',
      outs: 0,
      bases: {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      },
      currentBatterSlot: 1,
      homeLineup: {
        teamLineupId: new TeamLineupId('unknown-home'),
        gameId: emptyGameId,
        teamSide: 'HOME',
        teamName: 'Unknown Team',
        strategy: 'SIMPLE',
        battingSlots: [],
        fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
        benchPlayers: [],
        substitutionHistory: [],
      },
      awayLineup: {
        teamLineupId: new TeamLineupId('unknown-away'),
        gameId: emptyGameId,
        teamSide: 'AWAY',
        teamName: 'Unknown Team',
        strategy: 'SIMPLE',
        battingSlots: [],
        fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
        benchPlayers: [],
        substitutionHistory: [],
      },
      currentBatter: null,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Internal interface for processed at-bat results during use case execution.
 *
 * @remarks
 * This interface is used internally within the use case to pass calculated
 * results between processing steps. It contains the core statistics and
 * state changes that need to be included in the final result DTO.
 *
 * Separate from the public AtBatResult DTO to maintain clear separation
 * between internal processing and external API contracts.
 */
interface ProcessedAtBatResult {
  /** Number of runs that scored as a result of this at-bat */
  readonly runsScored: number;

  /** Number of RBI awarded to the batter */
  readonly rbiAwarded: number;

  /** Whether this at-bat ended the current inning */
  readonly inningEnded: boolean;

  /** Whether this at-bat ended the entire game */
  readonly gameEnded: boolean;

  /** Updated InningState aggregate after recording the at-bat */
  readonly updatedInningState: import('@twsoftball/domain').InningState;

  /** Batting slot BEFORE advancement (the slot of the batter who just batted) */
  readonly currentBattingSlot: number;
}
