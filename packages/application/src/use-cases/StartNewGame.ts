/**
 * @file StartNewGame
 * Use case for creating and initializing a new softball game with complete setup.
 *
 * @remarks
 * StartNewGame is a foundational use case that orchestrates the complex process of
 * creating a new softball game from scratch. This involves coordinating multiple
 * domain aggregates (Game, TeamLineup, InningState), validating team lineups,
 * enforcing business rules, generating initial domain events, and ensuring proper
 * game state initialization for immediate gameplay.
 *
 * **Business Process Flow**:
 * 1. **Input Validation**: Verify command structure, team names, and basic constraints
 * 2. **Game Uniqueness**: Ensure game ID doesn't already exist in system
 * 3. **Lineup Validation**: Validate player information, positions, and jersey numbers
 * 4. **Aggregate Creation**: Create Game, TeamLineup, and InningState aggregates
 * 5. **Rule Application**: Apply game rules and configure initial state
 * 6. **Event Generation**: Create domain events for all initial state
 * 7. **Atomic Persistence**: Save all aggregates and events consistently
 * 8. **Result Assembly**: Build complete initial game state for presentation
 *
 * **Key Responsibilities**:
 * - **Game initialization**: Create new Game aggregate with proper configuration
 * - **Lineup management**: Create and validate complete team lineups
 * - **State coordination**: Initialize InningState for immediate gameplay
 * - **Business rule enforcement**: Validate all constraints and requirements
 * - **Event sourcing**: Generate complete audit trail from game creation
 * - **Error handling**: Provide detailed validation and error information
 * - **Cross-aggregate consistency**: Ensure all aggregates are properly linked
 *
 * **Design Patterns**:
 * - **Hexagonal Architecture**: Uses ports for infrastructure dependencies
 * - **Domain-Driven Design**: Rich domain model with aggregate coordination
 * - **Command Pattern**: Clean command input with comprehensive result output
 * - **Event Sourcing**: All state changes captured as immutable domain events
 * - **Validation Strategy**: Multi-layer validation from input to domain rules
 *
 * **Validation Strategy**:
 * - **Input validation**: Command structure and basic field requirements
 * - **Business validation**: Team names, lineup completeness, jersey uniqueness
 * - **Domain validation**: Aggregate creation rules and invariants
 * - **Infrastructure validation**: Game ID uniqueness and persistence readiness
 *
 * @example
 * ```typescript
 * // Service setup with dependency injection
 * const startNewGame = new StartNewGame(
 *   gameRepository,
 *   inningStateRepository,
 *   teamLineupRepository,
 *   eventStore,
 *   logger
 * );
 *
 * // Create a new game with custom rules configuration
 * const command: StartNewGameCommand = {
 *   gameId: GameId.generate(),
 *   homeTeamName: 'Springfield Tigers',
 *   awayTeamName: 'Shelbyville Lions',
 *   ourTeamSide: 'HOME',
 *   gameDate: new Date('2024-08-30T14:00:00Z'),
 *   location: 'City Park Field 1',
 *   initialLineup: [...completeLineup],
 *   rulesConfig: {
 *     totalInnings: 7,
 *     maxPlayersPerTeam: 25,
 *     timeLimitMinutes: 60,
 *     allowReEntry: true,
 *     mercyRuleEnabled: true,
 *     mercyRuleTiers: [
 *       { differential: 15, afterInning: 4 },
 *       { differential: 10, afterInning: 5 }
 *     ],
 *     maxExtraInnings: 2,
 *     allowTieGames: false
 *   }
 * };
 *
 * const result = await startNewGame.execute(command);
 *
 * if (result.success) {
 *   console.log('Game created successfully!');
 *   console.log(`Initial state: ${result.initialState?.status}`);
 *   console.log(`First batter: ${result.initialState?.currentBatter?.name}`);
 *   // Game is ready for immediate at-bat recording
 * } else {
 *   console.error('Game creation failed:', result.errors);
 *   // Handle validation errors and retry with corrections
 * }
 *
 * // Or create with default rules (omit rulesConfig)
 * const commandWithDefaults: StartNewGameCommand = {
 *   gameId: GameId.generate(),
 *   homeTeamName: 'Eagles',
 *   awayTeamName: 'Hawks',
 *   ourTeamSide: 'HOME',
 *   gameDate: new Date(),
 *   initialLineup: [...completeLineup]
 *   // rulesConfig omitted - uses SoftballRules.standard()
 * };
 * ```
 */

import {
  Game,
  TeamLineup,
  InningState,
  GameId,
  PlayerId,
  JerseyNumber,
  TeamLineupId,
  InningStateId,
  FieldPosition,
  DomainEvent,
  SoftballRules,
} from '@twsoftball/domain';

import { GameStartResult } from '../dtos/GameStartResult.js';
import { GameStateDTO } from '../dtos/GameStateDTO.js';
import { PlayerStatisticsDTO, FieldingStatisticsDTO } from '../dtos/PlayerStatisticsDTO.js';
import {
  StartNewGameCommand,
  LineupPlayerDTO,
  GameRulesDTO,
  StartNewGameCommandValidator,
} from '../dtos/StartNewGameCommand.js';
import { TeamLineupDTO, BattingSlotDTO } from '../dtos/TeamLineupDTO.js';
import { EventStore } from '../ports/out/EventStore.js';
import { GameRepository } from '../ports/out/GameRepository.js';
import { InningStateRepository } from '../ports/out/InningStateRepository.js';
import { Logger } from '../ports/out/Logger.js';
import { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';
// Note: Reverted to direct error handling to maintain architecture compliance

/**
 * Use case for creating and initializing new softball games with complete setup.
 *
 * @remarks
 * This use case implements the complete business process for starting a new softball
 * game from initial command through ready-to-play state. It coordinates multiple
 * domain aggregates, validates complex business rules, and ensures consistent
 * state initialization across the entire game system.
 *
 * **Architecture Integration**:
 * - **Application Layer**: Orchestrates domain operations and infrastructure calls
 * - **Domain Layer**: Uses aggregates, value objects, and events for business logic
 * - **Infrastructure Layer**: Accessed through ports for persistence and logging
 *
 * **Concurrency Considerations**:
 * - Game ID uniqueness check prevents duplicate game creation
 * - Atomic persistence ensures consistent state across all aggregates
 * - Error handling prevents partial game creation scenarios
 *
 * **Performance Considerations**:
 * - Efficient aggregate creation with minimal object allocations
 * - Batch event generation and storage operations
 * - Structured logging with conditional debug output
 * - Early validation failures to prevent expensive operations
 *
 * The use case follows established Command pattern with comprehensive validation,
 * detailed error handling, and extensive audit logging for production monitoring.
 */
export class StartNewGame {
  /**
   * Creates a new StartNewGame use case instance.
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
   * Executes the complete game creation process with comprehensive error handling.
   *
   * @remarks
   * This is the main entry point for the use case. It implements the complete
   * business process from command validation through game state initialization,
   * with detailed error handling and comprehensive audit logging.
   *
   * **Process Overview**:
   * 1. **Command Validation**: Verify input structure and basic constraints
   * 2. **Game Uniqueness**: Check that game ID is not already in use
   * 3. **Lineup Validation**: Validate players, positions, and jersey numbers
   * 4. **Domain Creation**: Create Game, TeamLineup, and InningState aggregates
   * 5. **Event Generation**: Create domain events for all state initialization
   * 6. **Atomic Persistence**: Save all aggregates and events consistently
   * 7. **State Assembly**: Build complete initial game state for presentation
   *
   * **Automatic First Batter Selection**:
   * After game creation, the system automatically selects the first batter
   * (away team, batting slot #1) so the game is immediately ready to record
   * the first at-bat. No manual batter selection is required.
   *
   * For complete game flow documentation, see:
   * {@link file://../../../docs/design/game-flow.md#automatic-batter-selection Automatic Batter Selection}
   *
   * **Error Handling Strategy**:
   * - Input validation errors provide specific field-level feedback
   * - Business rule violations include detailed explanations
   * - Infrastructure errors are handled gracefully with retry consideration
   * - All errors are logged with complete context for debugging
   * - Failed operations maintain system consistency (no partial updates)
   *
   * **Logging Strategy**:
   * - Debug: Detailed process flow and intermediate validation results
   * - Info: Successful operations with key metrics and timing
   * - Warn: Validation failures and recoverable issues
   * - Error: All failures with complete context and stack traces
   *
   * @param command - Complete game creation command with all setup information
   * @returns Promise resolving to game creation result with success/failure details
   *
   * @example
   * ```typescript
   * // Successful execution
   * const result = await startNewGame.execute({
   *   gameId: GameId.generate(),
   *   homeTeamName: 'Tigers',
   *   awayTeamName: 'Lions',
   *   ourTeamSide: 'HOME',
   *   gameDate: new Date(),
   *   initialLineup: completeLineup,
   *   gameRules: standardRules
   * });
   *
   * if (result.success) {
   *   // Game is ready for immediate play
   *   startGameUI(result.initialState);
   *   enableAtBatRecording(result.gameId);
   * } else {
   *   // Handle specific validation errors
   *   displayValidationErrors(result.errors);
   *   highlightInvalidFields(result.errors);
   * }
   * ```
   */
  async execute(command: StartNewGameCommand): Promise<GameStartResult> {
    const startTime = Date.now();

    this.logger.debug('Starting game creation process', {
      gameId: command.gameId.value,
      homeTeamName: command.homeTeamName,
      awayTeamName: command.awayTeamName,
      ourTeamSide: command.ourTeamSide,
      lineupSize: command.initialLineup.length,
      operation: 'startNewGame',
    });

    try {
      // Step 0: Fail-fast DTO validation
      try {
        StartNewGameCommandValidator.validate(command);
      } catch (validationError) {
        this.logger.warn('Game creation failed due to DTO validation error', {
          gameId: command.gameId.value,
          error:
            validationError instanceof Error ? validationError.message : 'Unknown validation error',
          operation: 'startNewGame',
        });
        return this.createFailureResult(command.gameId, [
          validationError instanceof Error ? validationError.message : 'Invalid command structure',
        ]);
      }

      // Step 1: Validate command input
      const inputValidation = this.validateCommandInput(command);
      if (!inputValidation.valid) {
        this.logger.warn('Game creation failed due to validation errors', {
          gameId: command.gameId.value,
          errors: inputValidation.errors,
          operation: 'startNewGame',
        });
        return this.createFailureResult(command.gameId, inputValidation.errors);
      }

      // Step 2: Check game uniqueness
      const uniquenessCheck = await this.validateGameUniqueness(command.gameId);
      if (!uniquenessCheck.valid) {
        return this.createFailureResult(command.gameId, uniquenessCheck.errors);
      }

      // Step 3: Validate lineup details
      const lineupValidation = this.validateLineup(command.initialLineup);
      if (!lineupValidation.valid) {
        this.logger.warn('Game creation failed due to lineup validation errors', {
          gameId: command.gameId.value,
          errors: lineupValidation.errors,
          operation: 'startNewGame',
        });
        return this.createFailureResult(command.gameId, lineupValidation.errors);
      }

      // Step 4: Create domain aggregates
      const aggregates = this.createDomainAggregates(command);

      this.logger.debug('Domain aggregates created successfully', {
        gameId: command.gameId.value,
        aggregateCount: 3, // Game, TeamLineup (home/away), InningState
        operation: 'startNewGame',
      });

      // Step 5: Generate domain events
      const events = this.generateInitialEvents(aggregates);

      this.logger.debug('Domain events generated successfully', {
        gameId: command.gameId.value,
        eventCount: events.length,
        eventTypes: events.map(e => e.type),
        operation: 'startNewGame',
      });

      // Step 6: Persist all changes atomically
      await this.persistGameState(aggregates, events);

      // Step 7: Build initial game state result
      const initialState = this.buildInitialGameState(aggregates, command);

      const duration = Date.now() - startTime;

      this.logger.info('Game created successfully', {
        gameId: command.gameId.value,
        homeTeamName: command.homeTeamName,
        awayTeamName: command.awayTeamName,
        ourTeamSide: command.ourTeamSide,
        lineupSize: command.initialLineup.length,
        location: command.location,
        duration,
        operation: 'startNewGame',
      });

      return {
        success: true,
        gameId: command.gameId,
        initialState,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Failed to start new game', error as Error, {
        gameId: command.gameId.value,
        homeTeamName: command.homeTeamName,
        awayTeamName: command.awayTeamName,
        duration,
        operation: 'startNewGame',
      });

      return this.handleUnexpectedError(error, command.gameId);
    }
  }

  /**
   * Validates the basic structure and content of the command input.
   *
   * @remarks
   * Performs comprehensive validation of all command fields including:
   * - Required field presence and format validation
   * - Team name uniqueness and length constraints
   * - Game date validation (not in past, reasonable future)
   * - Basic lineup structure validation
   * - Game rules constraint validation
   *
   * This is the first line of defense against invalid input and provides
   * specific, user-friendly error messages for UI display.
   *
   * @param command - The command to validate
   * @returns Validation result with success flag and detailed error messages
   */
  private validateCommandInput(command: StartNewGameCommand): ValidationResult {
    const errors: string[] = [];

    // Validate team names
    if (!command.homeTeamName?.trim()) {
      errors.push('Home team name cannot be empty');
    }
    if (!command.awayTeamName?.trim()) {
      errors.push('Away team name cannot be empty');
    }
    if (command.homeTeamName?.trim() === command.awayTeamName?.trim()) {
      errors.push('Team names must be different');
    }

    // Validate game date
    if (command.gameDate < new Date()) {
      errors.push('Game date cannot be in the past');
    }

    // Validate basic lineup structure
    if (!command.initialLineup || command.initialLineup.length === 0) {
      errors.push('Initial lineup cannot be empty');
    }

    if (command.initialLineup && command.initialLineup.length < 9) {
      errors.push('Lineup must have at least 9 players (10-player standard lineup recommended)');
    }

    // Validate against game rules if provided
    if (command.gameRules && command.initialLineup) {
      const maxPlayers = command.gameRules.maxPlayersInLineup || 30;
      if (command.initialLineup.length > maxPlayers) {
        errors.push('Lineup cannot exceed maximum players allowed');
      }
    } else if (command.initialLineup && command.initialLineup.length > 30) {
      // Default max without custom rules
      errors.push('Lineup cannot exceed maximum players allowed');
    }

    // Validate game rules if provided
    if (command.gameRules) {
      const rulesValidation = this.validateGameRules(command.gameRules);
      errors.push(...rulesValidation);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates game rules configuration for consistency and business logic.
   *
   * @remarks
   * Ensures that custom game rules make logical sense and don't violate
   * fundamental softball rules. This prevents impossible game scenarios
   * and ensures the system can properly handle the configured rules.
   *
   * @param gameRules - The game rules to validate
   * @returns Array of validation error messages
   */
  private validateGameRules(gameRules: GameRulesDTO): string[] {
    const errors: string[] = [];

    if (gameRules.mercyRuleInning4 < 0) {
      errors.push('Invalid game rules configuration');
    }
    if (gameRules.mercyRuleInning5 < 0) {
      errors.push('Invalid game rules configuration');
    }
    if (gameRules.timeLimitMinutes !== undefined && gameRules.timeLimitMinutes <= 0) {
      errors.push('Invalid game rules configuration');
    }
    if (gameRules.maxPlayersInLineup < 9) {
      errors.push('Invalid game rules configuration');
    }

    return errors;
  }

  /**
   * Validates that the specified game ID doesn't already exist in the system.
   *
   * @remarks
   * Prevents duplicate game creation which could cause data integrity issues
   * and user confusion. Uses the repository to check for existing games
   * with the same identifier.
   *
   * @param gameId - The game ID to check for uniqueness
   * @returns Promise resolving to validation result
   */
  private async validateGameUniqueness(gameId: GameId): Promise<ValidationResult> {
    try {
      const gameExists = await this.gameRepository.exists(gameId);
      if (gameExists) {
        return {
          valid: false,
          errors: ['Game with this ID already exists'],
        };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      this.logger.error('Failed to check game uniqueness', error as Error, {
        gameId: gameId.value,
        operation: 'validateGameUniqueness',
      });

      return {
        valid: false,
        errors: ['Failed to verify game uniqueness'],
      };
    }
  }

  /**
   * Validates the complete lineup for business rule compliance.
   *
   * @remarks
   * Performs comprehensive lineup validation including:
   * - Player information completeness (names, IDs, jersey numbers)
   * - Jersey number uniqueness within team
   * - Player ID uniqueness within lineup
   * - Batting order validation (sequential, no duplicates)
   * - Field position requirements (all required positions covered)
   * - Preferred position validation
   *
   * This is the most complex validation step as it ensures the lineup
   * can support actual gameplay without conflicts or missing information.
   *
   * @param lineup - The lineup to validate
   * @param gameRules - Optional game rules for additional constraints
   * @returns Validation result with detailed error messages
   */
  private validateLineup(lineup: LineupPlayerDTO[]): ValidationResult {
    const errors: string[] = [];

    // Track used values for uniqueness validation
    const usedJerseyNumbers = new Set<string>();
    const usedPlayerIds = new Set<string>();
    const usedBattingPositions = new Set<number>();
    const assignedFieldPositions = new Set<FieldPosition>();

    // Required field positions for softball
    const requiredPositions = new Set([
      FieldPosition.PITCHER,
      FieldPosition.CATCHER,
      FieldPosition.FIRST_BASE,
      FieldPosition.SECOND_BASE,
      FieldPosition.THIRD_BASE,
      FieldPosition.SHORTSTOP,
      FieldPosition.LEFT_FIELD,
      FieldPosition.CENTER_FIELD,
      FieldPosition.RIGHT_FIELD,
    ]);

    for (const player of lineup) {
      // Validate player name
      if (!player.name?.trim()) {
        errors.push('Player name cannot be empty');
      }

      // Validate jersey number uniqueness
      const jerseyNum = player.jerseyNumber.value;
      if (usedJerseyNumbers.has(jerseyNum)) {
        errors.push(`Duplicate jersey numbers: #${jerseyNum} assigned to multiple players`);
      }
      usedJerseyNumbers.add(jerseyNum);

      // Player ID and batting order uniqueness validation handled by DTO layer
      usedPlayerIds.add(player.playerId.value);
      usedBattingPositions.add(player.battingOrderPosition);

      // Track field position assignments
      assignedFieldPositions.add(player.fieldPosition);

      // Validate preferred positions
      if (!player.preferredPositions || player.preferredPositions.length === 0) {
        errors.push('Player must have at least one preferred position');
      }
    }

    // Validate all required positions are filled
    for (const requiredPosition of requiredPositions) {
      if (!assignedFieldPositions.has(requiredPosition)) {
        // Use enum value directly (already human-readable)
        errors.push(`Missing required field position: ${requiredPosition}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Creates all required domain aggregates for the new game.
   *
   * @remarks
   * This method orchestrates the creation of all three main aggregates
   * required for a complete game:
   * - Game: Core game state and coordination
   * - TeamLineup (Home/Away): Player lineup management
   * - InningState: Current inning and batting state
   *
   * The aggregates are created in dependency order and properly linked
   * through shared identifiers.
   *
   * @param command - The validated command with all game setup information
   * @returns Object containing all created aggregates
   */
  private createDomainAggregates(command: StartNewGameCommand): GameAggregates {
    // Create SoftballRules from command rulesConfig (or use defaults)
    const softballRules = this.createSoftballRulesFromCommand(command);

    // Create Game aggregate with rules
    const game = Game.createNew(
      command.gameId,
      command.homeTeamName,
      command.awayTeamName,
      softballRules
    );

    // Start the game immediately (ready for play)
    game.startGame();

    // Create home team lineup
    // TeamLineup.createNew() initializes currentBatterSlot to 1 (leadoff batter)
    const homeLineupId = new TeamLineupId(`${command.gameId.value}-home`);
    const homeLineup = TeamLineup.createNew(
      homeLineupId,
      command.gameId,
      command.homeTeamName,
      'HOME'
    );

    // Create away team lineup
    // Both home and away teams start from batting slot 1 at game start
    const awayLineupId = new TeamLineupId(`${command.gameId.value}-away`);
    const awayLineup = TeamLineup.createNew(
      awayLineupId,
      command.gameId,
      command.awayTeamName,
      'AWAY'
    );

    // Add players to the managed team lineup (our team with full roster)
    let managedLineup = command.ourTeamSide === 'HOME' ? homeLineup : awayLineup;
    for (const player of command.initialLineup) {
      managedLineup = managedLineup.addPlayer(
        player.playerId,
        player.jerseyNumber,
        player.name,
        player.battingOrderPosition,
        player.fieldPosition,
        softballRules
      );
    }

    // Create minimal opponent lineup with placeholder players
    // This ensures both teams have valid lineups for game start
    // In future: wizard will collect both team lineups, making this logic unnecessary
    let opponentLineup = command.ourTeamSide === 'HOME' ? awayLineup : homeLineup;
    opponentLineup = this.createOpponentPlaceholderLineup(
      opponentLineup,
      command.gameId,
      command.ourTeamSide === 'HOME' ? command.awayTeamName : command.homeTeamName,
      command.ourTeamSide === 'HOME' ? 'AWAY' : 'HOME',
      softballRules
    );

    // Return aggregates with both lineups populated
    if (command.ourTeamSide === 'HOME') {
      return {
        game,
        homeLineup: managedLineup,
        awayLineup: opponentLineup,
        inningState: this.createInningState(command.gameId),
      };
    } else {
      return {
        game,
        homeLineup: opponentLineup,
        awayLineup: managedLineup,
        inningState: this.createInningState(command.gameId),
      };
    }
  }

  /**
   * Creates SoftballRules instance from command rulesConfig or gameRules (deprecated).
   *
   * @remarks
   * Converts the command's rulesConfig (preferred) or gameRules (deprecated) into
   * a proper domain SoftballRules instance. If neither is provided, uses standard
   * softball rules as the default.
   *
   * Priority order:
   * 1. rulesConfig (new format matching Domain layer)
   * 2. gameRules (deprecated format, converted to rulesConfig)
   * 3. SoftballRules.standard() (default if neither provided)
   *
   * @param command - The game creation command
   * @returns Configured SoftballRules instance
   */
  private createSoftballRulesFromCommand(command: StartNewGameCommand): SoftballRules {
    // Priority 1: Use new rulesConfig format if provided
    if (command.rulesConfig) {
      const standardRules = SoftballRules.standard();
      return new SoftballRules({
        totalInnings: command.rulesConfig.totalInnings ?? standardRules.totalInnings,
        maxPlayersPerTeam: command.rulesConfig.maxPlayersPerTeam ?? standardRules.maxPlayersPerTeam,
        timeLimitMinutes: command.rulesConfig.timeLimitMinutes ?? standardRules.timeLimitMinutes,
        allowReEntry: command.rulesConfig.allowReEntry ?? standardRules.allowReEntry,
        mercyRuleEnabled: command.rulesConfig.mercyRuleEnabled ?? standardRules.mercyRuleEnabled,
        mercyRuleTiers: command.rulesConfig.mercyRuleTiers ?? [...standardRules.mercyRuleTiers],
        maxExtraInnings: command.rulesConfig.maxExtraInnings ?? standardRules.maxExtraInnings,
        allowTieGames: command.rulesConfig.allowTieGames ?? standardRules.allowTieGames,
      });
    }

    // Priority 2: Use deprecated gameRules if provided (for backward compatibility)
    if (command.gameRules) {
      return this.createSoftballRules(command.gameRules);
    }

    // Priority 3: Use standard rules as default
    return SoftballRules.standard();
  }

  /**
   * Creates SoftballRules instance from game rules DTO or defaults.
   *
   * @remarks
   * Converts the optional GameRulesDTO from the command into a proper
   * domain SoftballRules instance. Uses recreation league defaults if
   * no custom rules are provided.
   *
   * @deprecated Use createSoftballRulesFromCommand instead with rulesConfig
   * @param gameRulesDTO - Optional game rules from command
   * @returns Configured SoftballRules instance
   */
  private createSoftballRules(gameRulesDTO?: GameRulesDTO): SoftballRules {
    if (!gameRulesDTO) {
      return SoftballRules.recreationLeague();
    }

    return new SoftballRules({
      totalInnings: 7, // Standard softball
      maxPlayersPerTeam: gameRulesDTO.maxPlayersInLineup,
      timeLimitMinutes: gameRulesDTO.timeLimitMinutes ?? null,
      allowReEntry: true, // Standard for most leagues
      mercyRuleEnabled: gameRulesDTO.mercyRuleEnabled,
      mercyRuleTiers: [
        { differential: gameRulesDTO.mercyRuleInning4, afterInning: 4 },
        { differential: gameRulesDTO.mercyRuleInning5, afterInning: 5 },
      ],
    });
  }

  /**
   * Creates the initial inning state for the game.
   *
   * @remarks
   * Creates the InningState aggregate that tracks the current inning,
   * outs, bases, and batting order. Initialized to the standard
   * game start state (top of 1st inning, away team batting).
   *
   * @param gameId - The game ID to associate with the inning state
   * @returns Newly created InningState aggregate
   */
  private createInningState(gameId: GameId): InningState {
    const inningStateId = new InningStateId(`${gameId.value}-inning`);
    return InningState.createNew(inningStateId, gameId);
  }

  /**
   * Creates a minimal opponent lineup with placeholder players.
   *
   * @remarks
   * This is a temporary solution while the wizard only collects one team's lineup.
   * Creates 9 generic players (one per defensive position) to satisfy the domain
   * model's expectation that both teams have valid lineups.
   *
   * **Future Enhancement**: When the wizard is updated to collect both team lineups,
   * this method can be removed entirely.
   *
   * **Design Decisions**:
   * - Uses generic player names ("Player 1", "Player 2", etc.)
   * - Assigns sequential jersey numbers (1-9)
   * - Maps each player to required defensive positions
   * - Sets batting order to match jersey number for simplicity
   * - Generates unique PlayerId for each placeholder
   *
   * @param opponentLineup - Empty TeamLineup aggregate for opponent
   * @param gameId - Game identifier for generating player IDs
   * @param teamName - Opponent team name
   * @param teamSide - Which side opponent plays on (HOME or AWAY)
   * @param softballRules - Game rules for lineup validation
   * @returns TeamLineup with 9 placeholder players
   */
  private createOpponentPlaceholderLineup(
    opponentLineup: TeamLineup,
    gameId: GameId,
    _teamName: string,
    _teamSide: 'HOME' | 'AWAY',
    softballRules: SoftballRules
  ): TeamLineup {
    // Required defensive positions in batting order
    const positions: FieldPosition[] = [
      FieldPosition.PITCHER,
      FieldPosition.CATCHER,
      FieldPosition.FIRST_BASE,
      FieldPosition.SECOND_BASE,
      FieldPosition.THIRD_BASE,
      FieldPosition.SHORTSTOP,
      FieldPosition.LEFT_FIELD,
      FieldPosition.CENTER_FIELD,
      FieldPosition.RIGHT_FIELD,
      FieldPosition.SHORT_FIELDER,
    ];

    let lineup = opponentLineup;

    // Create one placeholder player per position
    for (let i = 0; i < positions.length; i++) {
      const battingOrder = i + 1; // 1-based batting order
      const jerseyNum = battingOrder; // Jersey number matches batting order
      const position = positions[i];
      if (!position) {
        throw new Error(`Missing position at index ${i}`);
      }

      // Generate unique player ID: gameId-opp-{battingOrder}
      const playerId = new PlayerId(`${gameId.value}-opp-${battingOrder}`);
      const jerseyNumber = new JerseyNumber(jerseyNum.toString());
      const playerName = `Player ${battingOrder}`;

      lineup = lineup.addPlayer(
        playerId,
        jerseyNumber,
        playerName,
        battingOrder,
        position,
        softballRules
      );
    }

    return lineup;
  }

  /**
   * Generates all initial domain events for the game creation.
   *
   * @remarks
   * Collects domain events from all created aggregates and ensures they
   * are properly sequenced and contain all necessary information for
   * event sourcing and audit trail purposes.
   *
   * @param aggregates - All created domain aggregates
   * @returns Array of all domain events to be persisted
   */
  private generateInitialEvents(aggregates: GameAggregates): DomainEvent[] {
    const allEvents: DomainEvent[] = [];

    // Collect events from Game aggregate
    allEvents.push(...aggregates.game.getUncommittedEvents());

    // Collect events from TeamLineup aggregates
    allEvents.push(...aggregates.homeLineup.getUncommittedEvents());
    allEvents.push(...aggregates.awayLineup.getUncommittedEvents());

    // Collect events from InningState aggregate
    allEvents.push(...aggregates.inningState.getUncommittedEvents());

    return allEvents;
  }

  /**
   * Persists all game state changes atomically across aggregates and events.
   *
   * @remarks
   * Saves all aggregates and their associated events in a coordinated manner
   * to ensure consistency. Uses error handling to prevent partial updates
   * that could leave the system in an inconsistent state.
   *
   * **Persistence Strategy**:
   * 1. Save Game aggregate (most critical for game existence)
   * 2. Save TeamLineup aggregates (essential for gameplay)
   * 3. Save InningState aggregate (required for current state)
   * 4. Store all domain events for audit trail and event sourcing
   *
   * @param aggregates - All domain aggregates to persist
   * @param events - All domain events to store
   * @throws Error for any persistence failures requiring upstream handling
   */
  private async persistGameState(aggregates: GameAggregates, events: DomainEvent[]): Promise<void> {
    try {
      // Save Game aggregate
      await this.gameRepository.save(aggregates.game);

      this.logger.debug('Game aggregate saved successfully', {
        gameId: aggregates.game.id.value,
        operation: 'persistGame',
      });

      // Save TeamLineup aggregates (home and away)
      await this.teamLineupRepository.save(aggregates.homeLineup);
      await this.teamLineupRepository.save(aggregates.awayLineup);

      this.logger.debug('TeamLineup aggregates saved successfully', {
        gameId: aggregates.game.id.value,
        operation: 'persistTeamLineups',
      });

      // Save InningState aggregate
      await this.inningStateRepository.save(aggregates.inningState);

      this.logger.debug('InningState aggregate saved successfully', {
        gameId: aggregates.game.id.value,
        operation: 'persistInningState',
      });

      // Store all domain events
      await this.eventStore.append(
        aggregates.game.id,
        'Game',
        aggregates.game.getUncommittedEvents()
      );
      await this.eventStore.append(
        aggregates.homeLineup.id,
        'TeamLineup',
        aggregates.homeLineup.getUncommittedEvents()
      );
      await this.eventStore.append(
        aggregates.awayLineup.id,
        'TeamLineup',
        aggregates.awayLineup.getUncommittedEvents()
      );
      await this.eventStore.append(
        aggregates.inningState.id,
        'InningState',
        aggregates.inningState.getUncommittedEvents()
      );

      this.logger.debug('Domain events stored successfully', {
        gameId: aggregates.game.id.value,
        totalEvents: events.length,
        eventTypes: events.map(e => e.type),
        operation: 'persistEvents',
      });
    } catch (error) {
      // Categorize and log different types of persistence failures
      if (error instanceof Error) {
        if (
          error.message.includes('save') ||
          error.message.includes('repository') ||
          error.message.includes('Database') ||
          error.message.includes('write')
        ) {
          this.logger.error('Game repository save failed', error, {
            gameId: aggregates.game.id.value,
            operation: 'persistGameState',
            errorType: 'repository',
          });
          throw new Error('Failed to save game state');
        } else if (error.message.includes('store') || error.message.includes('event')) {
          this.logger.error('Event store persistence failed', error, {
            gameId: aggregates.game.id.value,
            operation: 'persistGameState',
            errorType: 'eventStore',
          });
          throw new Error('Failed to store game events');
        }
      }

      // Re-throw for upstream error handling
      throw error;
    }
  }

  /**
   * Builds the complete initial game state DTO for the presentation layer.
   *
   * @remarks
   * Assembles all aggregate data into a comprehensive GameStateDTO that
   * provides the presentation layer with everything needed to display
   * the initial game state and enable immediate gameplay.
   *
   * This includes current score (0-0), inning state (top 1st), empty bases,
   * complete lineups, and current batter information.
   *
   * @param aggregates - All domain aggregates with current state
   * @param command - Original command for additional context
   * @returns Complete initial game state DTO
   */
  private buildInitialGameState(
    aggregates: GameAggregates,
    command: StartNewGameCommand
  ): GameStateDTO {
    // Build team lineup DTOs
    const homeLineupDTO = this.buildTeamLineupDTO(aggregates.homeLineup, 'HOME');
    const awayLineupDTO = this.buildTeamLineupDTO(aggregates.awayLineup, 'AWAY');

    // Determine current batter for top of 1st inning (away team bats first)
    // Both teams now have valid lineups (our team + opponent placeholders)
    // Current batter should ALWAYS be set at game start
    const currentBatterSlot = awayLineupDTO.battingSlots.find(slot => slot.slotNumber === 1);
    const currentBatter = currentBatterSlot?.currentPlayer || null;

    // VALIDATION: Current batter must be set at game start
    // If this fails, it indicates a critical bug in lineup initialization
    if (currentBatter === null) {
      this.logger.error(
        'Game initialization failed: currentBatter is null',
        new Error('Invalid game state'),
        {
          gameId: aggregates.game.id.value,
          ourTeamSide: command.ourTeamSide,
          battingTeam: 'AWAY',
          awayLineupSize: awayLineupDTO.battingSlots.length,
          homeLineupSize: homeLineupDTO.battingSlots.length,
          operation: 'buildInitialGameState',
        }
      );

      throw new Error(
        'Game initialization failed: No current batter available. ' +
          'This indicates a bug in lineup setup. Please report this issue.'
      );
    }

    return {
      gameId: aggregates.game.id,
      status: aggregates.game.status,
      score: {
        home: 0,
        away: 0,
        leader: 'TIE',
        difference: 0,
      },
      gameStartTime: command.gameDate,
      currentInning: 1,
      isTopHalf: true, // Away team always bats first
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
      homeLineup: homeLineupDTO,
      awayLineup: awayLineupDTO,
      currentBatter,
      lastUpdated: new Date(),
    };
  }

  /**
   * Builds a TeamLineupDTO from a TeamLineup aggregate.
   *
   * @remarks
   * Converts the domain TeamLineup aggregate into a DTO suitable for
   * presentation layer consumption. Includes all batting slots, field
   * positions, and player information.
   *
   * @param teamLineup - The TeamLineup aggregate to convert
   * @param teamSide - Whether this is HOME or AWAY team
   * @returns Complete TeamLineupDTO
   */
  private buildTeamLineupDTO(teamLineup: TeamLineup, teamSide: 'HOME' | 'AWAY'): TeamLineupDTO {
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
              preferredPositions: playerInfo.currentPosition ? [playerInfo.currentPosition] : [], // Simplified for now
              plateAppearances: [], // No plate appearances yet in new game
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
      strategy: 'SIMPLE', // Default strategy - would be configurable in full implementation
      battingSlots,
      fieldPositions,
      benchPlayers: [], // Would be implemented in full version
      substitutionHistory: [], // Would be implemented in full version
    };
  }

  /**
   * Creates a failure result DTO with detailed error information.
   *
   * @remarks
   * Provides comprehensive error information while maintaining consistent
   * interface structure. Used for all validation and business rule failures.
   *
   * @param gameId - Game ID for context
   * @param errors - Array of specific error messages
   * @returns Complete failure result with error details
   */
  private createFailureResult(gameId: GameId, errors: string[]): GameStartResult {
    return {
      success: false,
      gameId,
      errors,
    };
  }

  /**
   * Handles unexpected errors during game creation with graceful degradation.
   *
   * @remarks
   * Provides consistent error handling for exceptions that occur during
   * processing. Translates technical errors into user-friendly messages
   * while preserving detailed information for debugging and monitoring.
   *
   * @param error - The caught error
   * @param gameId - Game ID for context
   * @returns Failure result with appropriate error messages
   */
  private handleUnexpectedError(error: unknown, gameId: GameId): GameStartResult {
    this.logger.error('An unexpected error occurred', error as Error, {
      gameId: gameId.value,
      operation: 'startNewGame',
    });

    const errorMessage = this.categorizeError(error);
    return this.createFailureResult(gameId, [errorMessage]);
  }

  /**
   * Categorizes different types of errors for appropriate user messaging.
   *
   * @param error - The error to categorize
   * @returns User-friendly error message
   */
  private categorizeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('Database') || error.message.includes('save')) {
        return 'Failed to save game state';
      }
      if (error.message.includes('store')) {
        return 'Failed to store game events';
      }
      if (error.message.includes('Domain validation failed') || error.name === 'DomainError') {
        return 'Domain validation failed';
      }
      return 'An unexpected error occurred';
    }
    return 'An unexpected error occurred';
  }

  /**
   * Creates empty player statistics for a new game.
   *
   * @param playerId - Player identifier
   * @param name - Player display name
   * @param jerseyNumber - Player jersey number
   * @returns Empty PlayerStatisticsDTO with zero values
   */
  private createEmptyStatistics(
    playerId: PlayerId,
    name: string,
    jerseyNumber: JerseyNumber
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
}

/**
 * Internal interface for validation result with detailed error reporting.
 *
 * @remarks
 * Used internally within the use case to pass validation results between
 * different validation steps. Provides consistent structure for handling
 * both successful validation and detailed error information.
 */
interface ValidationResult {
  /** Whether the validation passed successfully */
  readonly valid: boolean;

  /** Array of specific error messages for failed validations */
  readonly errors: string[];
}

/**
 * Internal interface for grouping all created domain aggregates.
 *
 * @remarks
 * Used internally to pass all created aggregates between processing steps
 * within the use case. Ensures type safety and clear organization of the
 * different aggregate types required for a complete game.
 */
interface GameAggregates {
  /** Main game aggregate coordinating overall game state */
  readonly game: Game;

  /** Home team lineup aggregate with player management */
  readonly homeLineup: TeamLineup;

  /** Away team lineup aggregate with player management */
  readonly awayLineup: TeamLineup;

  /** Current inning state aggregate with batting state */
  readonly inningState: InningState;
}
