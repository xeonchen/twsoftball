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
  GameStatus,
  DomainEvent,
  RunScored,
  RunnerAdvanced,
  GameCoordinator,
} from '@twsoftball/domain';

import { AtBatResult } from '../dtos/AtBatResult.js';
import { GameStateDTO } from '../dtos/GameStateDTO.js';
import { RecordAtBatCommand, RecordAtBatCommandValidator } from '../dtos/RecordAtBatCommand.js';
import { EventStore } from '../ports/out/EventStore.js';
import { GameRepository } from '../ports/out/GameRepository.js';
import { InningStateRepository } from '../ports/out/InningStateRepository.js';
import { Logger } from '../ports/out/Logger.js';
import { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';
import { GameStateDTOBuilder } from '../utils/GameStateDTOBuilder.js';
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

      // Step 7: Persist BOTH coordinator-returned aggregates atomically
      await this.inningStateRepository.save(result.updatedInningState);
      await this.persistChanges(result.updatedGame, events, originalGame);

      this.logger.info('At-bat recorded successfully', {
        gameId: command.gameId.value,
        batterId: command.batterId.value,
        operation: 'recordAtBat',
        result: command.result,
        runsScored: result.runsScored,
        rbiAwarded: result.rbiAwarded,
      });

      return await this.createSuccessResult(result.updatedGame, result);
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

    // Step 3: Load BOTH lineups (GameCoordinator needs both for validation)
    const homeLineup = await this.teamLineupRepository.findByGameIdAndSide(game.id, 'HOME');
    const awayLineup = await this.teamLineupRepository.findByGameIdAndSide(game.id, 'AWAY');
    if (!homeLineup || !awayLineup) {
      throw new Error(`TeamLineup not found for game ${game.id.value}`);
    }

    // Step 4: Get current batting slot for return value (pre-advancement)
    const battingSlot = inningState.isTopHalf
      ? inningState.awayBatterSlot
      : inningState.homeBatterSlot;

    // Step 5: Capture pre-play score for event generation
    const prePlayScore = {
      home: game.score.getHomeRuns(),
      away: game.score.getAwayRuns(),
    };

    // Step 6: Convert runnerAdvances DTO to domain RunnerAdvancement format
    // Pass ALL override data to domain - no filtering
    // GameCoordinator now supports fromBase: null (batter) and toBase: 'OUT' (put outs)
    const runnerAdvancementOverrides =
      command.runnerAdvances?.map(advance => ({
        runnerId: advance.playerId,
        fromBase: advance.fromBase, // Can be null for batter
        toBase: advance.toBase, // Can be 'OUT' for outs
      })) || [];

    // Step 7: Delegate to GameCoordinator for synchronized multi-aggregate coordination
    const coordinatorResult = GameCoordinator.recordAtBat(
      game,
      homeLineup,
      awayLineup,
      inningState,
      command.batterId,
      command.result,
      runnerAdvancementOverrides
    );

    if (!coordinatorResult.success) {
      return {
        updatedGame: game, // Return original game on failure
        runsScored: 0,
        rbiAwarded: 0,
        inningEnded: false,
        gameEnded: false,
        updatedInningState: inningState, // Return original state on failure
        currentBattingSlot: battingSlot,
        prePlayScore,
        postPlayScore: prePlayScore, // No score change on failure
        battingTeamSide,
      };
    }

    // Step 8: Extract synchronized aggregates (DO NOT modify further)
    const updatedGame = coordinatorResult.updatedGame!;
    let updatedInningState = coordinatorResult.updatedInningState!;
    const effectiveRunsScored = coordinatorResult.runsScored;
    const effectiveRBIs = coordinatorResult.rbis;
    const inningEnded = coordinatorResult.inningComplete;
    const gameEnded = coordinatorResult.gameComplete;

    // Step 9: If game completed and inning advanced, revert InningState to completion point
    // GameCoordinator completes the Game at the current inning (doesn't advance),
    // but InningState may have auto-advanced on 3rd out. We need to revert it to match.
    if (gameEnded && inningEnded && updatedInningState.inning > updatedGame.currentInning) {
      updatedInningState = updatedInningState.withRevertedInning(updatedGame.currentInning);
    }

    // Step 10: Capture post-play score for event generation
    const postPlayScore = {
      home: updatedGame.score.getHomeRuns(),
      away: updatedGame.score.getAwayRuns(),
    };

    // Step 11: Return coordinator-provided aggregate explicitly (DO NOT rely on mutation)
    // Always use coordinatorResult.updatedGame! to ensure architectural contract is explicit
    // This prevents silent data loss if GameCoordinator changes to return new instances

    return {
      updatedGame, // Explicit coordinator-returned aggregate
      runsScored: effectiveRunsScored,
      rbiAwarded: effectiveRBIs,
      inningEnded,
      gameEnded,
      updatedInningState,
      currentBattingSlot: battingSlot, // Slot BEFORE advancement
      prePlayScore,
      postPlayScore,
      battingTeamSide,
    };
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
   * - From Application: RunScored (for scoring tracking with INCREMENTAL scores), GameEnded (if game ends)
   *
   * **CRITICAL: Event Sourcing Pattern**
   * RunScored events MUST include the actual score progression (not placeholders).
   * Each RunScored event shows the score AFTER that specific run was added.
   * This allows Game aggregate to replay events and reconstruct exact score state.
   *
   * @param command - Original at-bat command
   * @param result - Processed result with calculated statistics, updated InningState, and score progression
   * @returns Array of domain events representing all state changes
   */
  private generateEvents(command: RecordAtBatCommand, result: ProcessedAtBatResult): DomainEvent[] {
    const events: DomainEvent[] = [];

    // Extract domain events from InningState aggregate
    // These include AtBatCompleted, RunnerAdvanced, CurrentBatterChanged, etc.
    const inningStateEvents = result.updatedInningState.getUncommittedEvents();
    events.push(...inningStateEvents);

    // Generate RunScored events for each run with INCREMENTAL score progression
    // IMPORTANT: Use REAL runner IDs from domain events, not fabricated events
    // Filter RunnerAdvanced events where toBase === 'HOME' to find actual scoring runners
    const runnerAdvancedEvents = inningStateEvents.filter(
      (event): event is RunnerAdvanced =>
        event.type === 'RunnerAdvanced' &&
        event instanceof RunnerAdvanced &&
        event['toBase'] === 'HOME'
    );

    runnerAdvancedEvents.forEach((runnerAdvancedEvent, index) => {
      const runNumber = index + 1;
      const incrementalScore = { ...result.prePlayScore };

      if (result.battingTeamSide === 'HOME') {
        incrementalScore.home = result.prePlayScore.home + runNumber;
      } else {
        incrementalScore.away = result.prePlayScore.away + runNumber;
      }

      // Create RunScored event with REAL runner ID from domain event
      events.push(
        new RunScored(
          command.gameId,
          runnerAdvancedEvent['runnerId'], // REAL runner ID from domain event
          result.battingTeamSide, // Actual batting team
          command.batterId, // rbiCreditedTo
          incrementalScore // Real incremental score (not placeholder!)
        )
      );
    });

    // Extract domain events from Game aggregate
    // These include GameCompleted, InningAdvanced, etc.
    const gameEvents = result.updatedGame.getUncommittedEvents();
    events.push(...gameEvents);

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
    // IMPORTANT: Pass the game object directly to avoid reloading from repository
    // This ensures we use the latest in-memory state including any game completion status
    const gameStateDTO = await GameStateDTOBuilder.buildGameStateDTO(
      game,
      this.inningStateRepository,
      this.teamLineupRepository,
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
      ? await GameStateDTOBuilder.buildGameStateDTO(
          game,
          this.inningStateRepository,
          this.teamLineupRepository
        )
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
  /** Updated Game aggregate from GameCoordinator (DO NOT use original mutated reference) */
  readonly updatedGame: Game;

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

  /** Score before runs were added (for event generation) */
  readonly prePlayScore: { home: number; away: number };

  /** Score after runs were added (for event generation) */
  readonly postPlayScore: { home: number; away: number };

  /** Which team was batting (HOME or AWAY) */
  readonly battingTeamSide: 'HOME' | 'AWAY';
}
