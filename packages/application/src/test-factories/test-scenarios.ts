/**
 * @file Test Scenarios
 * Common test scenarios and setup patterns for reducing code duplication.
 *
 * @remarks
 * This module provides pre-configured test scenarios that are commonly used across
 * multiple test files. Instead of duplicating scenario setup in each test, these
 * functions provide consistent, reusable test patterns with proper mock configuration.
 *
 * Each scenario function sets up mocks, creates test data, and returns everything
 * needed for a specific test pattern. This reduces duplication while ensuring
 * consistent test setup across the codebase.
 *
 * **Scenario Types**:
 * - Success scenarios: Happy path testing with proper mock configuration
 * - Failure scenarios: Error conditions with appropriate mock failures
 * - Infrastructure scenarios: Database, event store, and service failures
 * - Domain scenarios: Business rule violations and edge cases
 *
 * **Design Principles**:
 * - Complete scenario setup in single function call
 * - Consistent naming and parameter patterns
 * - Easy customization through options parameters
 * - Proper type safety with return type definitions
 *
 * @example
 * ```typescript
 * import { setupSuccessfulAtBatScenario, setupRepositoryFailureScenario } from '../test-factories/test-scenarios.js';
 *
 * describe('RecordAtBat', () => {
 *   it('should record at-bat successfully', async () => {
 *     const scenario = setupSuccessfulAtBatScenario();
 *     const useCase = new RecordAtBat(scenario.mocks.gameRepository, scenario.mocks.eventStore, scenario.mocks.logger);
 *
 *     const result = await useCase.execute(scenario.command);
 *     expect(result.success).toBe(true);
 *   });
 *
 *   it('should handle repository failures', async () => {
 *     const scenario = setupRepositoryFailureScenario('Database connection failed');
 *     // ... test implementation
 *   });
 * });
 * ```
 */

import { Game, GameId, GameStatus, DomainError, AtBatResultType } from '@twsoftball/domain';
import { vi } from 'vitest';

// Disable unbound-method rule for this file as vi.mocked() is designed to work with unbound methods

import { SecureTestUtils } from '../test-utils/secure-test-utils.js';

import {
  createMockDependencies,
  EnhancedMockGameRepository,
  EnhancedMockEventStore,
  EnhancedMockLogger,
  EnhancedMockNotificationService,
} from './mock-factories.js';
import { GameTestBuilder, CommandTestBuilder } from './test-builders.js';

/**
 * Common scenario return type for consistency.
 */
export interface TestScenario<TCommand = unknown> {
  mocks: {
    gameRepository: EnhancedMockGameRepository;
    eventStore: EnhancedMockEventStore;
    logger: EnhancedMockLogger;
    notificationService: EnhancedMockNotificationService;
  };
  testData: {
    game: Game;
    gameId: GameId;
  };
  command: TCommand;
}

/**
 * Sets up a successful at-bat recording scenario.
 *
 * @remarks
 * Configures all mocks for a successful at-bat recording operation:
 * - Game repository returns a valid, in-progress game
 * - Event store operations succeed
 * - Logger captures all messages
 * - Creates a realistic RecordAtBatCommand
 *
 * This scenario covers the happy path for at-bat recording with proper
 * mock configuration and realistic test data.
 *
 * @param options Customization options for the scenario
 * @returns Complete test scenario with mocks, data, and command
 *
 * @example
 * ```typescript
 * const scenario = setupSuccessfulAtBatScenario({
 *   gameId: 'specific-game-id',
 *   atBatResult: AtBatResultType.HOME_RUN
 * });
 *
 * const useCase = new RecordAtBat(scenario.mocks.gameRepository, scenario.mocks.eventStore, scenario.mocks.logger);
 * const result = await useCase.execute(scenario.command);
 * ```
 */
export function setupSuccessfulAtBatScenario(options?: {
  gameId?: string;
  atBatResult?: AtBatResultType;
  withRunners?: boolean;
}): TestScenario {
  const gameId = new GameId(options?.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create test game
  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  // Configure successful repository behavior
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);

  // Configure successful event store behavior
  vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);

  // Create test command
  const command = CommandTestBuilder.recordAtBat()
    .withGameId(gameId)
    .withResult(options?.atBatResult ?? AtBatResultType.SINGLE)
    .build();

  if (options?.withRunners) {
    // Note: In actual implementation, we'd need to create proper RunnerAdvance objects
    // For now, keeping this as a comment to avoid readonly property assignment
    // command.runnerAdvances = [...];
  }

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a successful game start scenario.
 *
 * @remarks
 * Configures mocks for successful game creation and startup:
 * - Repository operations succeed
 * - Event store handles game events properly
 * - Creates realistic team and player data
 *
 * @param options Customization options
 * @returns Complete test scenario for game starting
 */
export function setupSuccessfulGameStartScenario(options?: {
  gameId?: string;
  homeTeam?: string;
  awayTeam?: string;
  withLineup?: boolean;
}): TestScenario {
  const gameId = new GameId(options?.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create test game
  const game = GameTestBuilder.create()
    .withId(gameId)
    .withStatus(GameStatus.NOT_STARTED)
    .withTeamNames(options?.homeTeam || 'Home Team', options?.awayTeam || 'Away Team')
    .build();

  // Configure successful behavior
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(null); // Game doesn't exist yet
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);

  // Create test command
  const command = CommandTestBuilder.startNewGame()
    .withGameId(gameId)
    .withTeamNames(options?.homeTeam || 'Home Team', options?.awayTeam || 'Away Team')
    .build();

  if (options?.withLineup) {
    // Note: In actual implementation, we'd need to create proper lineup objects
    // For now, keeping this as a comment to avoid readonly property assignment
    // command.initialLineup = [...];
  }

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a successful player substitution scenario.
 *
 * @remarks
 * Configures mocks for successful player substitution:
 * - Game is in progress and allows substitutions
 * - All validation rules pass
 * - Repository and event store operations succeed
 *
 * @param options Customization options
 * @returns Complete test scenario for player substitution
 */
export function setupSuccessfulSubstitutionScenario(options?: {
  gameId?: string;
  battingSlot?: number;
  isReentry?: boolean;
}): TestScenario {
  const gameId = new GameId(options?.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create test game
  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  // Configure successful behavior
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);

  // Create test command
  const command = CommandTestBuilder.substitutePlayer()
    .withGameId(gameId)
    .withBattingSlot(options?.battingSlot || 1)
    .withReentry(options?.isReentry || false)
    .build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a successful undo operation scenario.
 *
 * @remarks
 * Configures mocks for successful undo operation:
 * - Game has actions available to undo
 * - Event store contains proper event history
 * - All operations succeed
 *
 * @param options Customization options
 * @returns Complete test scenario for undo operations
 */
export function setupSuccessfulUndoScenario(options?: {
  gameId?: string;
  actionLimit?: number;
  withEvents?: boolean;
}): TestScenario {
  const gameId = new GameId(options?.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create test game
  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  // Configure successful behavior
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);

  // Set up event history if requested
  if (options?.withEvents) {
    const mockEvents = [
      {
        type: 'AtBatCompleted',
        eventType: 'AtBatCompleted',
        eventData: { result: 'SINGLE' },
        timestamp: new Date(),
      },
    ];
    mocks.eventStore.setMockEvents(gameId, mockEvents);
  }

  // Create test command
  const command = CommandTestBuilder.undo()
    .withGameId(gameId)
    .withActionLimit(options?.actionLimit || 1)
    .build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a successful redo operation scenario.
 *
 * @remarks
 * Similar to undo scenario but with undo history available for redoing.
 *
 * @param options Customization options
 * @returns Complete test scenario for redo operations
 */
export function setupSuccessfulRedoScenario(options?: {
  gameId?: string;
  actionLimit?: number;
  withUndoHistory?: boolean;
}): TestScenario {
  const gameId = new GameId(options?.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create test game
  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  // Configure successful behavior
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);

  // Set up undo history for redo operations
  if (options?.withUndoHistory) {
    const undoEvents = [
      {
        type: 'ActionUndone',
        eventType: 'ActionUndone',
        eventData: { originalEventType: 'AtBatCompleted' },
        timestamp: new Date(),
      },
    ];
    mocks.eventStore.setMockUndoHistory(gameId, undoEvents);
  }

  // Create test command
  const command = CommandTestBuilder.redo()
    .withGameId(gameId)
    .withActionLimit(options?.actionLimit || 1)
    .build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a repository failure scenario.
 *
 * @remarks
 * Configures the game repository to fail with specified error.
 * Useful for testing error handling and infrastructure failure scenarios.
 *
 * @param errorMessage Error message for the repository failure
 * @param failureType Type of operation that should fail
 * @returns Test scenario with configured repository failure
 *
 * @example
 * ```typescript
 * const scenario = setupRepositoryFailureScenario(
 *   'Database connection failed',
 *   'findById'
 * );
 *
 * const useCase = new MyUseCase(scenario.mocks.gameRepository, ...);
 * const result = await useCase.execute(scenario.command);
 * expect(result.success).toBe(false);
 * expect(result.errors).toContain('Failed to load game data');
 * ```
 */
export function setupRepositoryFailureScenario(
  errorMessage: string = 'Database connection failed',
  failureType: 'findById' | 'save' | 'exists' = 'findById'
): TestScenario {
  const gameId = new GameId(SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Configure repository failure
  const error = new Error(errorMessage);
  switch (failureType) {
    case 'findById':
      vi.mocked(mocks.gameRepository.findById).mockRejectedValue(error);
      break;
    case 'save':
      vi.mocked(mocks.gameRepository.save).mockRejectedValue(error);
      break;
    case 'exists':
      vi.mocked(mocks.gameRepository.exists).mockRejectedValue(error);
      break;
  }

  // Create test game and command
  const game = GameTestBuilder.create().withId(gameId).build();

  const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up an event store failure scenario.
 *
 * @remarks
 * Configures the event store to fail with specified error.
 * Tests event persistence failure handling.
 *
 * @param errorMessage Error message for event store failure
 * @param failureType Type of event store operation that should fail
 * @returns Test scenario with configured event store failure
 */
export function setupEventStoreFailureScenario(
  errorMessage: string = 'Event store connection failed',
  failureType: 'append' | 'getEvents' | 'getGameEvents' = 'append'
): TestScenario {
  const gameId = new GameId(SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create and configure successful game repository
  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);

  // Configure event store failure
  const error = new Error(errorMessage);
  switch (failureType) {
    case 'append':
      vi.mocked(mocks.eventStore.append).mockRejectedValue(error);
      break;
    case 'getEvents':
      vi.mocked(mocks.eventStore.getEvents).mockRejectedValue(error);
      break;
    case 'getGameEvents':
      vi.mocked(mocks.eventStore.getGameEvents).mockRejectedValue(error);
      break;
  }

  const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a domain error scenario.
 *
 * @remarks
 * Creates a scenario where domain validation rules are violated,
 * resulting in domain errors being thrown.
 *
 * @param domainErrorMessage The domain error message
 * @param errorType Type of domain error scenario
 * @returns Test scenario with domain rule violations
 */
export function setupDomainErrorScenario(
  domainErrorMessage: string = 'Domain rule violation',
  errorType: 'validation' | 'state' | 'business' = 'validation'
): TestScenario {
  const gameId = new GameId(SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create game in appropriate state for error scenario
  const gameStatus = errorType === 'state' ? GameStatus.COMPLETED : GameStatus.IN_PROGRESS;
  const game = GameTestBuilder.create().withId(gameId).withStatus(gameStatus).build();

  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);

  // Configure domain error during save operation
  const domainError = new DomainError(domainErrorMessage);
  vi.mocked(mocks.gameRepository.save).mockRejectedValue(domainError);

  const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a concurrency conflict scenario.
 *
 * @remarks
 * Simulates optimistic locking failures or version conflicts
 * that occur during concurrent access to the same game.
 *
 * @param conflictMessage Error message for the conflict
 * @returns Test scenario with concurrency conflict
 */
export function setupConcurrencyConflictScenario(
  conflictMessage: string = 'Version conflict'
): TestScenario {
  const gameId = new GameId(SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  const game = GameTestBuilder.create().withId(gameId).withStatus(GameStatus.IN_PROGRESS).build();

  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);

  // Create concurrency error
  const concurrencyError = Object.assign(new Error(conflictMessage), {
    name: 'ConcurrencyError',
  });
  vi.mocked(mocks.gameRepository.save).mockRejectedValue(concurrencyError);

  const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}

/**
 * Sets up a game not found scenario.
 *
 * @remarks
 * Configures repository to return null for game lookup,
 * simulating missing game scenarios.
 *
 * @param gameId Optional specific game ID to use
 * @returns Test scenario with missing game
 */
export function setupGameNotFoundScenario(gameId?: string): TestScenario {
  const testGameId = new GameId(gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Configure repository to return null (game not found)
  vi.mocked(mocks.gameRepository.findById).mockResolvedValue(null);

  // Create a placeholder game for testData (won't be used in actual test)
  const game = GameTestBuilder.create().withId(testGameId).build();

  const command = CommandTestBuilder.recordAtBat().withGameId(testGameId).build();

  return {
    mocks,
    testData: { game, gameId: testGameId },
    command,
  };
}

/**
 * Sets up a complete test scenario with customizable mock behavior.
 *
 * @remarks
 * Provides maximum flexibility for custom test scenarios while
 * maintaining the standard scenario interface. Allows fine-grained
 * control over mock behavior through configuration options.
 *
 * @param config Configuration options for the scenario
 * @returns Fully customizable test scenario
 */
export function setupCustomScenario(config: {
  gameId?: string;
  gameStatus?: GameStatus;
  repositoryBehavior?: {
    findById?: 'success' | 'notFound' | 'error';
    save?: 'success' | 'error';
    error?: string;
  };
  eventStoreBehavior?: {
    append?: 'success' | 'error';
    getEvents?: 'success' | 'error';
    error?: string;
  };
  commandType?: 'recordAtBat' | 'startGame' | 'substitute' | 'undo' | 'redo';
  commandOptions?: unknown;
}): TestScenario {
  const gameId = new GameId(config.gameId || SecureTestUtils.generateGameId());
  const mocks = createMockDependencies();

  // Create game with specified status
  const game = GameTestBuilder.create()
    .withId(gameId)
    .withStatus(config.gameStatus || GameStatus.IN_PROGRESS)
    .build();

  // Configure repository behavior
  const repo = config.repositoryBehavior || {};
  if (repo.findById === 'success') {
    vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  } else if (repo.findById === 'notFound') {
    vi.mocked(mocks.gameRepository.findById).mockResolvedValue(null);
  } else if (repo.findById === 'error') {
    vi.mocked(mocks.gameRepository.findById).mockRejectedValue(
      new Error(repo.error || 'Repository error')
    );
  } else {
    // Default to success
    vi.mocked(mocks.gameRepository.findById).mockResolvedValue(game);
  }

  if (repo.save === 'success') {
    vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  } else if (repo.save === 'error') {
    vi.mocked(mocks.gameRepository.save).mockRejectedValue(new Error(repo.error || 'Save error'));
  } else {
    // Default to success
    vi.mocked(mocks.gameRepository.save).mockResolvedValue(undefined);
  }

  // Configure event store behavior
  const eventStore = config.eventStoreBehavior || {};
  if (eventStore.append === 'success') {
    vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);
  } else if (eventStore.append === 'error') {
    vi.mocked(mocks.eventStore.append).mockRejectedValue(
      new Error(eventStore.error || 'Event store error')
    );
  } else {
    // Default to success
    vi.mocked(mocks.eventStore.append).mockResolvedValue(undefined);
  }

  // Create command based on type
  let command: unknown;
  const commandType = config.commandType || 'recordAtBat';

  switch (commandType) {
    case 'startGame':
      command = CommandTestBuilder.startNewGame().withGameId(gameId).build();
      break;
    case 'substitute':
      command = CommandTestBuilder.substitutePlayer().withGameId(gameId).build();
      break;
    case 'undo':
      command = CommandTestBuilder.undo().withGameId(gameId).build();
      break;
    case 'redo':
      command = CommandTestBuilder.redo().withGameId(gameId).build();
      break;
    case 'recordAtBat':
    default:
      command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();
      break;
  }

  // Apply any command customizations
  if (config.commandOptions && typeof config.commandOptions === 'object') {
    Object.assign(command as object, config.commandOptions);
  }

  return {
    mocks,
    testData: { game, gameId },
    command,
  };
}
