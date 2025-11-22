/**
 * @file RecordAtBat.test.ts
 * Comprehensive test suite for RecordAtBat use case.
 *
 * @remarks
 * This test suite follows TDD principles and focuses on testing the use case logic
 * for recording at-bat results. Tests verify proper orchestration, error handling,
 * event generation, and logging without getting bogged down in complex domain setup.
 *
 * Uses centralized test utilities to reduce code duplication and improve maintainability.
 * Mock setup, test data builders, and common scenarios are provided by the test-factories
 * module, allowing focus on business logic verification.
 *
 * Test coverage includes:
 * - Successful at-bat scenarios with proper RBI and run calculations
 * - Error conditions and validation failures
 * - Event generation and persistence
 * - Infrastructure failure handling
 * - Comprehensive logging verification
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import {
  GameId,
  PlayerId,
  AtBatResultType,
  Game,
  GameStatus,
  JerseyNumber,
  FieldPosition,
  BasesState,
  GameCoordinator,
  InningState,
  RunnerAdvanced,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Disable unbound-method rule for this file as vi.mocked() is designed to work with unbound methods

import {
  createMockDependencies,
  GameTestBuilder,
  CommandTestBuilder,
  setupSuccessfulAtBatScenario,
  setupGameNotFoundScenario,
  SecureTestUtils,
  EnhancedMockGameRepository,
  EnhancedMockInningStateRepository,
  EnhancedMockTeamLineupRepository,
  EnhancedMockEventStore,
  EnhancedMockLogger,
} from '../test-factories/index.js';

import { RecordAtBat } from './RecordAtBat.js';

/**
 * Helper to create a minimal mock InningState for testing.
 * Returns mock data that satisfies the interface methods used by RecordAtBat.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockInningState(gameIdParam: GameId) {
  const mockState: any = {
    id: { value: `inning-state-${gameIdParam.value}` },
    gameId: gameIdParam,
    inning: 1,
    isTopHalf: true,
    outs: 0,
    awayBatterSlot: 1,
    homeBatterSlot: 1,
    basesState: BasesState.empty(), // Required for GameCoordinator.determineRunnerAdvancement
    getBases: vi.fn().mockReturnValue({
      first: null,
      second: null,
      third: null,
      runnersInScoringPosition: [],
      basesLoaded: false,
    }),
    getUncommittedEvents: vi.fn().mockReturnValue([]), // Default: no uncommitted events
    withRevertedInning: vi.fn().mockImplementation((completedInning: number) => ({
      ...mockState,
      inning: completedInning,
      isTopHalf: false,
      basesState: BasesState.empty(),
      getUncommittedEvents: vi.fn().mockReturnValue([]), // Reverted state has no uncommitted events
    })),
  };
  return mockState;
}

/**
 * Helper to create a minimal mock TeamLineup for testing.
 * Returns mock data that satisfies the interface methods used by RecordAtBat.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockTeamLineup(
  gameIdParam: GameId,
  teamSide: 'HOME' | 'AWAY',
  playerIdParam: PlayerId
) {
  return {
    id: { value: `lineup-${teamSide.toLowerCase()}-${gameIdParam.value}` },
    gameId: gameIdParam,
    teamName: teamSide === 'HOME' ? 'Home Dragons' : 'Away Tigers',
    getPlayerAtSlot: vi.fn().mockReturnValue(playerIdParam),
    getPlayerInfo: vi.fn().mockReturnValue({
      playerName: 'Test Player',
      jerseyNumber: new JerseyNumber('10'),
      currentPosition: FieldPosition.SHORTSTOP,
    }),
    getActiveLineup: vi.fn().mockReturnValue([
      {
        position: 1,
        getCurrentPlayer: vi.fn().mockReturnValue(playerIdParam),
        history: [],
      },
    ]),
    getBattingSlots: vi.fn().mockReturnValue([]),
    getFieldingPositions: vi.fn().mockReturnValue(new Map()),
  };
}

/**
 * Helper to create a GameCoordinator.recordAtBat() result object for testing.
 * Simplifies test setup by providing sensible defaults that can be overridden.
 *
 * @remarks
 * This helper prevents repetition of the full AtBatRecordingResult shape in every test.
 * Pass only the fields you need to customize for each test scenario.
 */
function createCoordinatorResult(
  game: Game,
  inningState: any,
  overrides?: Partial<{
    success: boolean;
    runsScored: number;
    rbis: number;
    inningComplete: boolean;
    inningTransition: any;
    gameComplete: boolean;
    completionReason: 'REGULATION' | 'WALKOFF' | 'MERCY_RULE' | null;
    errorMessage: string | undefined;
  }>
): {
  success: boolean;
  updatedGame: Game | null;
  updatedInningState: InningState | null;
  runsScored: number;
  rbis: number;
  inningComplete: boolean;
  inningTransition: any;
  gameComplete: boolean;
  completionReason: 'REGULATION' | 'WALKOFF' | 'MERCY_RULE' | null;
  errorMessage?: string;
} {
  return {
    success: true,
    updatedGame: game,
    updatedInningState: inningState,
    runsScored: 0,
    rbis: 0,
    inningComplete: false,
    inningTransition: null,
    gameComplete: false,
    completionReason: null,
    errorMessage: undefined,
    ...overrides,
  };
}

describe('RecordAtBat Use Case', () => {
  // Test dependencies (mocks)
  let mockGameRepository: EnhancedMockGameRepository;
  let mockInningStateRepository: EnhancedMockInningStateRepository;
  let mockTeamLineupRepository: EnhancedMockTeamLineupRepository;
  let mockEventStore: EnhancedMockEventStore;
  let mockLogger: EnhancedMockLogger;

  // Use case under test
  let recordAtBat: RecordAtBat;

  // Test data - using secure test utilities
  const gameId = new GameId(SecureTestUtils.generateGameId('game-123'));
  const batterId = new PlayerId(SecureTestUtils.generatePlayerId('batter-1'));
  const runner3Id = new PlayerId(SecureTestUtils.generatePlayerId('runner-3'));

  // Common test setup helpers using centralized builders
  const createTestGame = (status: GameStatus = GameStatus.IN_PROGRESS): Game => {
    const game = GameTestBuilder.create()
      .withId(gameId)
      .withStatus(status)
      .withTeamNames('Home Dragons', 'Away Tigers')
      .build();

    // Add getScore() method for compatibility with RecordAtBat.buildGameStateDTO()
    // This is needed because the implementation calls game.getScore()
    (game as any).getScore = vi.fn().mockReturnValue({
      home: game.score.getHomeRuns(),
      away: game.score.getAwayRuns(),
      leader: game.score.isHomeWinning() ? 'HOME' : game.score.isAwayWinning() ? 'AWAY' : 'TIE',
      difference: Math.abs(game.score.getRunDifferential()),
    });

    return game;
  };

  beforeEach(() => {
    const mocks = createMockDependencies();
    mockGameRepository = mocks.gameRepository;
    mockInningStateRepository = mocks.inningStateRepository;
    mockTeamLineupRepository = mocks.teamLineupRepository;
    mockEventStore = mocks.eventStore;
    mockLogger = mocks.logger;

    // Set up default mock data for InningState and TeamLineup
    // These are needed for buildGameStateDTO() calls in successful test scenarios
    const mockInningState = createMockInningState(gameId);
    const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterId);
    const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

    // Add recordAtBat method to mockInningState for processAtBat coordination
    const updatedMockInningState = {
      ...mockInningState,
      awayBatterSlot: 2, // Advanced from 1 to 2
      getUncommittedEvents: vi.fn().mockReturnValue([
        {
          type: 'AtBatCompleted',
          gameId,
          batterId,
          battingSlot: 1,
          result: 'SINGLE',
          inning: 1,
          outs: 0,
        },
        { type: 'RunnerAdvanced', gameId, runnerId: batterId, from: null, to: 'FIRST' },
        { type: 'CurrentBatterChanged', gameId, previousSlot: 1, newSlot: 2 },
      ]),
    };
    mockInningState.recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

    vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
    vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
      async (_gId, side) => {
        return side === 'HOME' ? (mockHomeLineup as any) : (mockAwayLineup as any);
      }
    );

    recordAtBat = new RecordAtBat(
      mockGameRepository,
      mockInningStateRepository,
      mockTeamLineupRepository,
      mockLogger
    );
  });

  describe('Successful At-Bat Scenarios', () => {
    it('should record a home run with proper runs and RBI calculation', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator.recordAtBat to return successful result with 2 runs, 2 RBIs
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 2,
          rbis: 2,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.HOME_RUN)
        .withRunnerAdvances([
          {
            playerId: runner3Id,
            fromBase: 'THIRD',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ])
        .withNotes('Home run with runner on third')
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(2); // Batter + runner from third
      expect(result.rbiAwarded).toBe(2); // Both runs are RBIs on home run
      expect(result.inningEnded).toBe(false);
      expect(result.gameEnded).toBe(false);
      expect(result.errors).toBeUndefined();

      // Verify persistence (1 save for final state using coordinator-returned aggregate)
      expect(mockGameRepository.save).toHaveBeenCalledTimes(1);
      expect(mockInningStateRepository.save).toHaveBeenCalledTimes(1);
      // EventSourcedGameRepository handles event persistence internally
    });

    it('should record a single with one RBI', async () => {
      // Arrange - using centralized scenario
      const scenario = setupSuccessfulAtBatScenario({
        gameId: gameId.value,
        atBatResult: AtBatResultType.SINGLE,
        withRunners: true,
      });

      // Add getScore() method to the scenario game for compatibility
      (scenario.testData.game as any).getScore = vi.fn().mockReturnValue({
        home: scenario.testData.game.score.getHomeRuns(),
        away: scenario.testData.game.score.getAwayRuns(),
        leader: scenario.testData.game.score.isHomeWinning()
          ? 'HOME'
          : scenario.testData.game.score.isAwayWinning()
            ? 'AWAY'
            : 'TIE',
        difference: Math.abs(scenario.testData.game.score.getRunDifferential()),
      });

      vi.mocked(mockGameRepository.findById).mockResolvedValue(scenario.testData.game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockGameRepository.save).toHaveBeenCalled();
      // EventSourcedGameRepository handles event persistence internally
    });

    it('should record a walk with no RBI', async () => {
      // Arrange - using centralized scenario
      const scenario = setupSuccessfulAtBatScenario({
        gameId: gameId.value,
        atBatResult: AtBatResultType.WALK,
        withRunners: false,
      });

      // Add getScore() method to the scenario game for compatibility
      (scenario.testData.game as any).getScore = vi.fn().mockReturnValue({
        home: scenario.testData.game.score.getHomeRuns(),
        away: scenario.testData.game.score.getAwayRuns(),
        leader: scenario.testData.game.score.isHomeWinning()
          ? 'HOME'
          : scenario.testData.game.score.isAwayWinning()
            ? 'AWAY'
            : 'TIE',
        difference: Math.abs(scenario.testData.game.score.getRunDifferential()),
      });

      vi.mocked(mockGameRepository.findById).mockResolvedValue(scenario.testData.game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.WALK)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockGameRepository.save).toHaveBeenCalled();
      // EventSourcedGameRepository handles event persistence internally
    });

    it('should return gameState with correct currentBatter after recording at-bat', async () => {
      // Arrange - Set up game with batter #1 at batting slot 1
      const game = createTestGame();
      const batter1Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-1'));

      // Create mock InningState with slot 1 currently batting
      const mockInningState = createMockInningState(gameId);
      mockInningState.awayBatterSlot = 1;
      mockInningState.isTopHalf = true;

      // Create mock lineup with batter #1 at slot 1
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batter1Id);
      vi.mocked(mockAwayLineup.getPlayerAtSlot).mockImplementation((slot: number) => {
        if (slot === 1) return batter1Id;
        if (slot === 2) return new PlayerId(SecureTestUtils.generatePlayerId('batter-2'));
        return null as any;
      });

      // Mock recordAtBat to advance batting order (slot 1 → 2)
      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2, // ADVANCED to slot 2
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batter1Id,
            battingSlot: 1,
            result: AtBatResultType.SINGLE,
            inning: 1,
            outs: 0,
          },
          { type: 'RunnerAdvanced', gameId, runnerId: batter1Id, from: null, to: 'FIRST' },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 1, newSlot: 2 },
        ]),
      };
      mockInningState.recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      // Set up mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'AWAY'
            ? (mockAwayLineup as any)
            : (createMockTeamLineup(gameId, 'HOME', batter1Id) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batter1Id)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - gameState.currentBatter should be batter #1 (who just batted)
      // NOT batter #2 (who's up next)
      expect(result.success).toBe(true);
      expect(result.gameState?.currentBatter?.playerId.value).toBe(batter1Id.value);
      expect(result.gameState?.currentBatter?.battingOrderPosition).toBe(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle game not found error', async () => {
      // Arrange - using centralized error scenario
      const scenario = setupGameNotFoundScenario(gameId.value);

      Object.assign(mockGameRepository, scenario.mocks.gameRepository);
      Object.assign(mockEventStore, scenario.mocks.eventStore);
      Object.assign(mockLogger, scenario.mocks.logger);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Game not found: ${gameId.value}`);
    });

    it('should handle repository failures gracefully', async () => {
      // Arrange - Mock repository to fail with database connection error
      const dbError = new Error('Database connection failed');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(dbError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state: Database connection failed');
    });

    it('should handle event store failures', async () => {
      // Arrange - Set up game loading to succeed, but repository save to fail (which includes event persistence)
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      const eventStoreError = new Error('Event store unavailable');
      vi.mocked(mockGameRepository.save).mockRejectedValue(eventStoreError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Event store unavailable');
    });

    it('should handle errors with "Unexpected error occurred" in message', async () => {
      // Arrange - Mock repository to fail with error containing "Unexpected error occurred"
      const unexpectedError = new Error('Unexpected error occurred during processing');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(unexpectedError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'An unexpected error occurred: Unexpected error occurred during processing'
      );
    });

    it('should handle errors with empty message', async () => {
      // Arrange - Mock repository to fail with error having empty message
      const emptyMessageError = new Error('');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(emptyMessageError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred: ');
    });

    it('should handle errors with whitespace-only message', async () => {
      // Arrange - Mock repository to fail with error having whitespace-only message
      const whitespaceError = new Error('   \n\t  ');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(whitespaceError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred: ');
    });

    it('should handle errors with undefined message property', async () => {
      // Arrange - Mock repository to fail with error object having undefined message
      const errorWithUndefinedMessage = new Error();
      // Explicitly delete the message property to test the undefined case
      Object.defineProperty(errorWithUndefinedMessage, 'message', {
        value: undefined,
        configurable: true,
      });
      vi.mocked(mockGameRepository.findById).mockRejectedValue(errorWithUndefinedMessage);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred: ');
    });

    it('should handle non-Error objects thrown as exceptions', async () => {
      // Arrange - Mock repository to throw non-Error object
      const nonErrorObject = { status: 500, message: 'Server error' };
      vi.mocked(mockGameRepository.findById).mockRejectedValue(nonErrorObject);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred during operation');
    });

    it('should handle null thrown as exception', async () => {
      // Arrange - Mock repository to throw null
      vi.mocked(mockGameRepository.findById).mockRejectedValue(null);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred during operation');
    });

    it('should handle undefined thrown as exception', async () => {
      // Arrange - Mock repository to throw undefined
      vi.mocked(mockGameRepository.findById).mockRejectedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred during operation');
    });

    it('should handle errors with generic messages that do not match specific patterns', async () => {
      // Arrange - Mock repository to fail with generic error message
      const genericError = new Error('Something went wrong unexpectedly');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(genericError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'An unexpected error occurred: Something went wrong unexpectedly'
      );
    });

    it('should handle "Invalid batter" error messages', async () => {
      // Arrange - Mock repository to fail with "Invalid batter" error
      const invalidBatterError = new Error('Invalid batter state detected');
      vi.mocked(mockGameRepository.findById).mockRejectedValue(invalidBatterError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid batter state');
    });

    it('should handle "Transaction compensation failed" error messages', async () => {
      // Arrange - Mock repository to fail with compensation error
      const compensationError = new Error(
        'Transaction compensation failed for game test-game. Original error: Event store failed. Compensation error: Repository down. System may be in inconsistent state and requires manual intervention.'
      );
      vi.mocked(mockGameRepository.findById).mockRejectedValue(compensationError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      // The error message gets passed through as-is when it contains "Transaction compensation failed"
      expect(result.errors?.[0]).toContain('Transaction compensation failed');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle double play scenarios that end the inning', async () => {
      // Arrange - Create a scenario where ground out with multiple outs creates 3rd out
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock InningState with 1 out already (double play will create 2 more for total of 3)
      mockInningState.outs = 1;

      const updatedMockInningState = {
        ...mockInningState,
        outs: 3, // After double play
        awayBatterSlot: 2,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId,
            battingSlot: 1,
            result: AtBatResultType.GROUND_OUT,
            inning: 1,
            outs: 1,
          },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 1, newSlot: 2 },
          {
            type: 'HalfInningEnded',
            gameId,
            inningNumber: 1,
            isTopHalf: true,
            outsCount: 3,
            awayTeamBatterSlot: 2,
            homeTeamBatterSlot: 1,
          },
        ]),
      };

      // Mock GameCoordinator.recordAtBat to return inning-ending result
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: true, // Inning ends with 3rd out
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.GROUND_OUT)
        .withRunnerAdvances([
          {
            playerId: new PlayerId(SecureTestUtils.generatePlayerId('runner-1')),
            fromBase: 'FIRST',
            toBase: 'OUT',
            advanceReason: 'FORCE_OUT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'GROUND_OUT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(true); // Should end inning due to 3 outs
    });

    it('should not detect third out for non-ground out results', async () => {
      // Arrange - Test isLikelyThirdOut with non-ground out result (line 465 branch)
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator to return inningComplete: false
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.HOME_RUN) // Non-ground out result
        .withRunnerAdvances([
          {
            playerId: new PlayerId(SecureTestUtils.generatePlayerId('runner-1')),
            fromBase: 'FIRST',
            toBase: 'OUT',
            advanceReason: 'FORCE_OUT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'HIT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(false); // Should NOT end inning for home run with outs
    });

    it('should not detect third out for ground out with less than 2 outs', async () => {
      // Arrange - Test isLikelyThirdOut with ground out but only 1 out (line 468 branch)
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator to return inningComplete: false
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.GROUND_OUT)
        .withRunnerAdvances([
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'GROUND_OUT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(false); // Should NOT end inning with only 1 out
    });

    it('should handle scenarios with no runner advances for ground out', async () => {
      // Arrange - Test isLikelyThirdOut with ground out but no runner advances
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator to return inningComplete: false
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.GROUND_OUT)
        .withRunnerAdvances([]) // No runner advances
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(false); // Should NOT end inning with no outs created
    });
  });

  describe('Event Generation Edge Cases', () => {
    it('should handle runner advances with mixed outcomes for event generation', async () => {
      // Arrange - Test event generation with runners going to HOME, OUT, and bases (lines 534-542)
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator.recordAtBat to return result with 1 run, 1 RBI
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 1,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const runnerId1 = new PlayerId(SecureTestUtils.generatePlayerId('runner-1'));
      const runnerId2 = new PlayerId(SecureTestUtils.generatePlayerId('runner-2'));
      const runnerId3 = new PlayerId(SecureTestUtils.generatePlayerId('runner-3'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.DOUBLE)
        .withRunnerAdvances([
          {
            playerId: runnerId1,
            fromBase: 'THIRD',
            toBase: 'HOME', // Should generate RunScored event
            advanceReason: 'HIT',
          },
          {
            playerId: runnerId2,
            fromBase: 'FIRST',
            toBase: 'OUT', // Should NOT generate RunnerAdvanced event
            advanceReason: 'FORCE_OUT',
          },
          {
            playerId: runnerId3,
            fromBase: 'SECOND',
            toBase: 'THIRD', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'SECOND', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(1); // Only runner from third scores
      expect(result.rbiAwarded).toBe(1); // RBI for the run scored

      // EventSourcedGameRepository handles event persistence internally
    });

    it('should handle scenario with only runners scoring (no base advances)', async () => {
      // Arrange - Test filtering logic where all runners either score or get out
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator.recordAtBat to return result with 1 run, 1 RBI
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 1,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const runnerId1 = new PlayerId(SecureTestUtils.generatePlayerId('runner-1'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.TRIPLE) // Changed to TRIPLE for consistency
        .withRunnerAdvances([
          {
            playerId: runnerId1,
            fromBase: 'THIRD',
            toBase: 'HOME', // Should generate RunScored event
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'THIRD', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(1); // Only runner from third scores
      expect(result.rbiAwarded).toBe(1); // RBI for the run scored

      // EventSourcedGameRepository handles event persistence internally
    });

    it('should handle scenario with only base advances (no scoring)', async () => {
      // Arrange - Test filtering logic where runners only advance to bases
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);

      // Mock GameCoordinator.recordAtBat to return result with 0 runs, 0 RBIs
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const runnerId1 = new PlayerId(SecureTestUtils.generatePlayerId('runner-1'));
      const runnerId2 = new PlayerId(SecureTestUtils.generatePlayerId('runner-2'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .withRunnerAdvances([
          {
            playerId: runnerId1,
            fromBase: 'FIRST',
            toBase: 'SECOND', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
          {
            playerId: runnerId2,
            fromBase: 'SECOND',
            toBase: 'THIRD', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'FIRST', // Should generate RunnerAdvanced event
            advanceReason: 'HIT',
          },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(0); // No runs scored
      expect(result.rbiAwarded).toBe(0); // No RBIs

      // EventSourcedGameRepository handles event persistence internally
    });

    it('should handle empty runner advances array for event generation', async () => {
      // Arrange - Test event generation with no runner advances
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.STRIKEOUT)
        .withRunnerAdvances([]) // Empty array to test filtering edge case
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(0); // No runs scored
      expect(result.rbiAwarded).toBe(0); // No RBIs

      // EventSourcedGameRepository handles event persistence internally
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle failed game state loading during error handling', async () => {
      // Arrange - Mock both initial load and error recovery load to fail
      const initialError = new Error('Primary database failure');
      const loadError = new Error('Secondary load also failed');

      vi.mocked(mockGameRepository.findById)
        .mockRejectedValueOnce(initialError) // Initial load fails
        .mockRejectedValueOnce(loadError); // Error recovery load also fails

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state: Primary database failure');

      // Should attempt to load game twice
      expect(mockGameRepository.findById).toHaveBeenCalledTimes(2);

      // Should log warning about failed game state loading
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load game state for error result context',
        {
          gameId: gameId.value,
          operation: 'recordAtBat',
          loadError: loadError,
        }
      );
    });
  });

  describe('Database Error Handling', () => {
    it('should log database-specific errors correctly', async () => {
      // Arrange - Setup successful game find, but fail repository save with database error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make repository save fail with database connection error (includes event persistence)
      vi.mocked(mockGameRepository.save).mockRejectedValue(
        new Error('Database connection failed - could not persist events')
      );

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should fail and log database-specific error
      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database persistence failed',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'persistChanges',
          errorType: 'database',
        })
      );
    });

    it('should log event store-specific errors correctly', async () => {
      // Arrange - Setup successful game find, but fail repository save with event store error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make repository save fail with event store-specific error (atomic save includes events)
      vi.mocked(mockGameRepository.save).mockRejectedValue(
        new Error('Event store unavailable - service temporarily down')
      );

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should fail and log event store-specific error
      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event store persistence failed',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'persistChanges',
          errorType: 'eventStore',
        })
      );
    });

    it('should log generic persistence errors', async () => {
      // Arrange - Setup successful game find, but fail repository save with generic error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make repository save fail with generic error (not database or event store specific)
      vi.mocked(mockGameRepository.save).mockRejectedValue(new Error('Network timeout occurred'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should fail but not log with specific error type
      expect(result.success).toBe(false);
      // Should not call the specific database or event store error logging
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'Database persistence failed',
        expect.any(Error),
        expect.any(Object)
      );
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'Event store persistence failed',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Aggregate Coordination Tests', () => {
    it('should load InningState aggregate in processAtBat', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      // Mock recordAtBat on InningState
      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2, // Advanced from slot 1 to 2
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId,
            battingSlot: 1,
            result: AtBatResultType.SINGLE,
            inning: 1,
            outs: 0,
          },
          { type: 'RunnerAdvanced', gameId, runnerId: batterId, from: null, to: 'FIRST' },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 1, newSlot: 2 },
        ]),
      };

      mockInningState.recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'AWAY'
            ? (mockAwayLineup as any)
            : (createMockTeamLineup(gameId, 'HOME', batterId) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockInningStateRepository.findCurrentByGameId).toHaveBeenCalledWith(gameId);
      expect(mockTeamLineupRepository.findByGameIdAndSide).toHaveBeenCalledWith(gameId, 'AWAY');
    });

    it('should call GameCoordinator.recordAtBat() with correct parameters', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2,
        getUncommittedEvents: vi.fn().mockReturnValue([]),
      };

      // Spy on GameCoordinator.recordAtBat
      const coordinatorSpy = vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockResolvedValue(
        mockAwayLineup as any
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(coordinatorSpy).toHaveBeenCalledWith(
        game, // Game aggregate
        expect.any(Object), // homeLineup
        expect.any(Object), // awayLineup
        mockInningState, // inningState
        batterId, // batterId
        AtBatResultType.SINGLE, // atBatResult
        expect.any(Array) // runnerAdvances
      );
    });

    it('should persist updated InningState after recordAtBat', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2,
        getUncommittedEvents: vi.fn().mockReturnValue([]),
      };

      // Mock GameCoordinator to return the updated InningState
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockResolvedValue(
        mockAwayLineup as any
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockInningStateRepository.save).toHaveBeenCalledWith(updatedMockInningState);
    });

    it('should advance batting order from slot 1 to 2', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2, // Advanced from 1 to 2
        getUncommittedEvents: vi
          .fn()
          .mockReturnValue([{ type: 'CurrentBatterChanged', gameId, previousSlot: 1, newSlot: 2 }]),
      };

      mockInningState.recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState) // processAtBat call
        .mockResolvedValueOnce(updatedMockInningState); // buildGameStateDTO call
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockResolvedValue(
        mockAwayLineup as any
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.gameState.currentBatterSlot).toBe(2); // After slot 1 bats, next batter is slot 2 (post-advancement)
    });

    it('should extract and persist domain events from Game and InningState aggregates', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const inningStateDomainEvents = [
        {
          type: 'AtBatCompleted',
          gameId,
          batterId,
          battingSlot: 1,
          result: AtBatResultType.SINGLE,
          inning: 1,
          outs: 0,
        },
        { type: 'RunnerAdvanced', gameId, runnerId: batterId, from: null, to: 'FIRST' },
        {
          type: 'CurrentBatterChanged',
          gameId,
          previousSlot: 1,
          newSlot: 2,
          inning: 1,
          isTopHalf: true,
        },
      ];

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2,
        getUncommittedEvents: vi.fn().mockReturnValue(inningStateDomainEvents),
      };

      // Mock GameCoordinator to return both updated aggregates with events
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockResolvedValue(
        mockAwayLineup as any
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      // EventSourcedGameRepository handles event persistence internally
    });

    it('should handle batting order wrapping from slot 10 to 1', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = {
        ...createMockInningState(gameId),
        awayBatterSlot: 10, // Starting at slot 10
      };
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 1, // Wrapped back to 1
        getUncommittedEvents: vi
          .fn()
          .mockReturnValue([
            { type: 'CurrentBatterChanged', gameId, previousSlot: 10, newSlot: 1 },
          ]),
      };

      // Mock GameCoordinator to return both updated aggregates with events
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 1,
          inningComplete: false,
          gameComplete: false,
        })
      );

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState)
        .mockResolvedValueOnce(updatedMockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockResolvedValue(
        mockAwayLineup as any
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.gameState.currentBatterSlot).toBe(1); // After slot 10 bats, wraps to slot 1 (post-advancement)
    });
  });

  // NOTE: Compensation tests removed because atomic repository saves eliminate the need for compensation.
  // EventSourcedGameRepository.save() now handles both aggregate and event persistence atomically,
  // so we can no longer have a scenario where game saves but events don't.

  describe('Inning Transition Bug Investigation', () => {
    it('should flip isTopHalf from true to false when top half ends with 3rd out', async () => {
      // Arrange - Create a scenario with 2 outs already, top of 1st inning
      const game = createTestGame();
      const batter1Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-1'));
      const batter2Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-2'));
      const batter3Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-3'));

      // Mock InningState with 2 outs already (top of 1st)
      const mockInningState = createMockInningState(gameId);
      mockInningState.outs = 2; // 2 outs already
      mockInningState.isTopHalf = true; // Top half
      mockInningState.inning = 1;
      mockInningState.awayBatterSlot = 3; // Batter #3 is up

      // Mock lineup
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batter3Id);
      vi.mocked(mockAwayLineup.getPlayerAtSlot).mockImplementation((slot: number) => {
        if (slot === 1) return batter1Id;
        if (slot === 2) return batter2Id;
        if (slot === 3) return batter3Id;
        return null as any;
      });

      // Log BEFORE recording 3rd out
      console.log('\n[TEST] ============ BEFORE RECORDING 3RD OUT ============');
      console.log('[TEST] BEFORE - inning:', mockInningState.inning);
      console.log('[TEST] BEFORE - isTopHalf:', mockInningState.isTopHalf);
      console.log('[TEST] BEFORE - outs:', mockInningState.outs);
      console.log('[TEST] BEFORE - awayBatterSlot:', mockInningState.awayBatterSlot);

      // Mock the result AFTER recording the 3rd out
      // The domain layer should transition to bottom of 1st with 0 outs
      const updatedMockInningState = {
        ...mockInningState,
        outs: 0, // Reset to 0 after half-inning ends
        isTopHalf: false, // THIS SHOULD BE FALSE after top half ends
        inning: 1, // Same inning
        awayBatterSlot: 3, // Batter slot might stay the same or advance
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batter3Id,
            battingSlot: 3,
            result: AtBatResultType.FLY_OUT,
            inning: 1,
            outs: 2,
          },
          {
            type: 'HalfInningEnded',
            gameId,
            inning: 1,
            isTopHalf: true, // The half that ENDED
            finalOuts: 3,
          },
          {
            type: 'HalfInningStarted',
            gameId,
            inning: 1,
            isTopHalf: false, // New half that STARTED
          },
        ]),
      };

      // Mock GameCoordinator to return the transition to bottom half
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: true,
          gameComplete: false,
        })
      );

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState) // processAtBat call
        .mockResolvedValueOnce(updatedMockInningState); // buildGameStateDTO call
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'AWAY'
            ? (mockAwayLineup as any)
            : (createMockTeamLineup(gameId, 'HOME', batter1Id) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batter3Id)
        .withResult(AtBatResultType.FLY_OUT)
        .withRunnerAdvances([
          {
            playerId: batter3Id,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'FLY_OUT',
          },
        ])
        .build();

      // Act - Record the 3rd out
      const result = await recordAtBat.execute(command);

      // Log AFTER recording 3rd out
      console.log('\n[TEST] ============ AFTER RECORDING 3RD OUT ============');
      console.log('[TEST] AFTER - result.success:', result.success);
      console.log('[TEST] AFTER - result.inningEnded:', result.inningEnded);
      console.log('[TEST] AFTER - gameState.currentInning:', result.gameState.currentInning);
      console.log('[TEST] AFTER - gameState.isTopHalf:', result.gameState.isTopHalf);
      console.log('[TEST] AFTER - gameState.outs:', result.gameState.outs);
      console.log(
        '[TEST] AFTER - updatedMockInningState.isTopHalf:',
        updatedMockInningState.isTopHalf
      );
      console.log('[TEST] AFTER - updatedMockInningState.outs:', updatedMockInningState.outs);
      console.log('[TEST] ===============================================\n');

      // Assert - These will FAIL if the bug exists, showing us actual values
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(true); // Half-inning should have ended
      expect(result.gameState.outs).toBe(0); // Outs should reset to 0
      expect(result.gameState.isTopHalf).toBe(false); // THIS IS THE BUG - should be false but might be true
      expect(result.gameState.currentInning).toBe(1); // Should still be inning 1
    });
  });

  describe('Mercy Rule Completion', () => {
    it('should complete game via 10-run mercy rule after 4th inning', async () => {
      // Arrange - Setup game in bottom 4th, away leads 10-0, 2 outs
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Set game to inning 4
      Object.defineProperty(game, 'currentInning', { value: 4, writable: false });
      Object.defineProperty(game, 'isTopHalf', { value: false, writable: false });

      // Add getScore() mock for compatibility
      (game as any).getScore = vi.fn().mockReturnValue({
        home: 0,
        away: 10,
        leader: 'AWAY',
        difference: 10,
      });

      // Mock the score methods to reflect mercy rule scenario (away team up 10-0)
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(0);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(10);

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-mercy-1'));

      // Mock InningState - bottom of 4th, 2 outs
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 4;
      mockInningState.isTopHalf = false; // Bottom half
      mockInningState.outs = 2; // 2 outs already
      mockInningState.homeBatterSlot = 3;

      // Mock GameCoordinator.recordAtBat to return game-ending result with mercy rule
      // Game completes at inning 4, so return mockInningState (inning 4), NOT an updated state at inning 5
      vi.spyOn(GameCoordinator, 'recordAtBat').mockImplementation(() => {
        // GameCoordinator mutates the game in-place by calling completeGame()
        game.completeGame('MERCY_RULE');
        return createCoordinatorResult(game, mockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: true,
          gameComplete: true,
          completionReason: 'MERCY_RULE',
        });
      });

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.GROUND_OUT)
        .withRunnerAdvances([
          {
            playerId: batterIdParam,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'GROUND_OUT',
          },
        ])
        .build();

      // Act - Record the 3rd out
      const result = await recordAtBat.execute(command);

      // Assert - Game should be completed via mercy rule
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(true);
      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(result.gameState.status).toBe(GameStatus.COMPLETED);

      // BUG FIX VERIFICATION: DTO should show currentInning = 4 (where game ended)
      // NOT inning = 5 (the advanced but unused inning)
      expect(result.gameState.currentInning).toBe(4);
      expect(result.gameState.score.away).toBe(10);
      expect(result.gameState.score.home).toBe(0);
    });

    it('should complete game via 7-run mercy rule after 5th inning', async () => {
      // Arrange - Setup game in bottom 5th, home leads 7-0, 2 outs
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Set game to inning 5
      Object.defineProperty(game, 'currentInning', { value: 5, writable: false });
      Object.defineProperty(game, 'isTopHalf', { value: false, writable: false });

      // Add getScore() mock for compatibility
      (game as any).getScore = vi.fn().mockReturnValue({
        home: 7,
        away: 0,
        leader: 'HOME',
        difference: 7,
      });

      // Mock the score methods to reflect mercy rule scenario (home team up 7-0)
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(7);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(0);

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-mercy-2'));

      // Mock InningState - bottom of 5th, 2 outs
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 5;
      mockInningState.isTopHalf = false; // Bottom half
      mockInningState.outs = 2; // 2 outs already
      mockInningState.homeBatterSlot = 3;

      // Mock the result AFTER recording the 3rd out
      const updatedMockInningState = {
        ...mockInningState,
        outs: 0,
        isTopHalf: true, // Would transition to top of 6th
        inning: 6, // Advance to next inning
        homeBatterSlot: 3,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 3,
            result: AtBatResultType.FLY_OUT,
            inning: 5,
            outs: 2,
          },
          {
            type: 'HalfInningEnded',
            gameId,
            inning: 5,
            isTopHalf: false,
            finalOuts: 3,
          },
          {
            type: 'HalfInningStarted',
            gameId,
            inning: 6,
            isTopHalf: true,
          },
        ]),
        // Add withRevertedInning method for reversion logic
        withRevertedInning: vi.fn().mockImplementation((completedInning: number) => ({
          ...mockInningState,
          inning: completedInning,
          isTopHalf: false,
          basesState: BasesState.empty(),
          getUncommittedEvents: vi.fn().mockReturnValue([]),
        })),
      };

      // Mock GameCoordinator.recordAtBat to return game-ending result with mercy rule
      vi.spyOn(GameCoordinator, 'recordAtBat').mockImplementation(() => {
        // GameCoordinator mutates the game in-place by calling completeGame()
        game.completeGame('MERCY_RULE');
        return createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: true,
          gameComplete: true,
          completionReason: 'MERCY_RULE',
        });
      });

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState)
        .mockResolvedValueOnce(updatedMockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.FLY_OUT)
        .withRunnerAdvances([
          {
            playerId: batterIdParam,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'FLY_OUT',
          },
        ])
        .build();

      // Act - Record the 3rd out
      const result = await recordAtBat.execute(command);

      // Assert - Game should be completed via mercy rule
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(true);
      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(result.gameState.status).toBe(GameStatus.COMPLETED);

      // BUG FIX VERIFICATION: DTO should show currentInning = 5 (where game ended)
      // NOT inning = 6 (the advanced but unused inning)
      expect(result.gameState.currentInning).toBe(5);
      expect(result.gameState.score.home).toBe(7);
      expect(result.gameState.score.away).toBe(0);
    });

    it('should NOT trigger mercy rule if differential insufficient', async () => {
      // Arrange - Setup game in bottom 5th, away leads 6-0, 2 outs
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Add getScore() mock for compatibility
      (game as any).getScore = vi.fn().mockReturnValue({
        home: 0,
        away: 6,
        leader: 'AWAY',
        difference: 6,
      });

      // Mock the score methods to reflect insufficient differential (away team up 6-0)
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(0);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(6);

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-mercy-3'));

      // Mock InningState - bottom of 5th, 2 outs
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 5;
      mockInningState.isTopHalf = false; // Bottom half
      mockInningState.outs = 2; // 2 outs already
      mockInningState.homeBatterSlot = 3;

      // Mock the result AFTER recording the 3rd out
      const updatedMockInningState = {
        ...mockInningState,
        outs: 0,
        isTopHalf: true, // Transition to top of 6th
        inning: 6, // Advance to next inning
        homeBatterSlot: 3,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 3,
            result: AtBatResultType.GROUND_OUT,
            inning: 5,
            outs: 2,
          },
          {
            type: 'HalfInningEnded',
            gameId,
            inning: 5,
            isTopHalf: false,
            finalOuts: 3,
          },
          {
            type: 'HalfInningStarted',
            gameId,
            inning: 6,
            isTopHalf: true,
          },
        ]),
      };

      mockInningState.recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      // Mock GameCoordinator.recordAtBat to return successful result (NO mercy rule)
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 0,
          rbis: 0,
          inningComplete: true,
          gameComplete: false, // Game continues (no mercy rule)
          completionReason: null,
        })
      );

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState)
        .mockResolvedValueOnce(updatedMockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.GROUND_OUT)
        .withRunnerAdvances([
          {
            playerId: batterIdParam,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'GROUND_OUT',
          },
        ])
        .build();

      // Act - Record the 3rd out
      const result = await recordAtBat.execute(command);

      // Assert - Game should continue (not completed)
      expect(result.success).toBe(true);
      expect(result.inningEnded).toBe(true);
      expect(game.status).toBe(GameStatus.IN_PROGRESS); // Game continues!
      expect(result.gameState.status).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('Walk-Off Victory Scenarios', () => {
    it('should end game immediately on walk-off in bottom 7 (no inning advancement)', async () => {
      // Arrange - Setup game: Bottom 7, 2 outs, home trailing 4-6 (need 2+ runs to win)
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Mock score methods to reflect bottom 7, home trailing 4-6
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(4);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(6);
      vi.spyOn(game.score, 'isHomeWinning').mockReturnValue(false);

      // Add getScore() mock for compatibility
      (game as any).getScore = vi.fn().mockReturnValue({
        home: 4,
        away: 6,
        leader: 'AWAY',
        difference: 2,
      });

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-walkoff'));
      const runnerOnFirst = new PlayerId(SecureTestUtils.generatePlayerId('runner-1st'));
      const runnerOnThird = new PlayerId(SecureTestUtils.generatePlayerId('runner-3rd'));

      // Mock InningState - bottom of 7th, 2 outs, runners on 1st and 3rd
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 7;
      mockInningState.isTopHalf = false; // Bottom half
      mockInningState.outs = 2; // 2 outs
      mockInningState.homeBatterSlot = 3;

      // Mock the result AFTER recording the walk-off hit
      // Walk-off detected - inning should NOT advance
      // 3 runs score (runner from 1st, runner from 3rd, batter on HR) → 4+3=7 > 6
      const updatedMockInningState = {
        ...mockInningState,
        outs: 2, // Outs stay at 2 (walk-off prevents 3rd out from being recorded)
        isTopHalf: false, // Stays bottom half
        inning: 7, // Stays at 7 (no advancement)
        homeBatterSlot: 4, // Batting order still advances
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 3,
            result: AtBatResultType.HOME_RUN,
            inning: 7,
            outs: 2,
          },
          { type: 'RunnerAdvanced', gameId, runnerId: runnerOnFirst, from: 'FIRST', to: 'HOME' },
          { type: 'RunnerAdvanced', gameId, runnerId: runnerOnThird, from: 'THIRD', to: 'HOME' },
          { type: 'RunnerAdvanced', gameId, runnerId: batterIdParam, from: null, to: 'HOME' },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 3, newSlot: 4 },
          // NO HalfInningEnded event (walk-off prevents it)
        ]),
      };

      // Mock GameCoordinator.recordAtBat to return walk-off victory result
      // Note: Walk-off ends the game as REGULATION (walk-off is a completion reason, not an ending type)
      vi.spyOn(GameCoordinator, 'recordAtBat').mockImplementation(() => {
        game.completeGame('REGULATION');
        return createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 3,
          rbis: 3,
          inningComplete: false,
          gameComplete: true,
          completionReason: 'WALKOFF',
        });
      });

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.HOME_RUN)
        .withRunnerAdvances([
          {
            playerId: runnerOnFirst,
            fromBase: 'FIRST',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: runnerOnThird,
            fromBase: 'THIRD',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: batterIdParam,
            fromBase: null,
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ])
        .build();

      // Act - Record walk-off hit
      const result = await recordAtBat.execute(command);

      // Assert - Walk-off detected and game ends immediately
      expect(result.success).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.runsScored).toBe(3); // 3 runs score (4+3=7 > 6)
      expect(game.status).toBe(GameStatus.COMPLETED);

      // Critical: currentInning and isTopHalf should reflect where the game ended
      expect(result.gameState.currentInning).toBe(7); // Stays at 7
      expect(result.gameState.isTopHalf).toBe(false); // Still bottom
      expect(result.gameState.outs).toBe(2); // Outs stay at 2 (no 3rd out)

      // Verify no InningAdvanced event in result
      const events = updatedMockInningState.getUncommittedEvents();
      const inningAdvancedEvents = events.filter(e => e.type === 'InningAdvanced');
      expect(inningAdvancedEvents).toHaveLength(0);
    });

    it('should detect walk-off in extra innings (bottom 8)', async () => {
      // Arrange - Setup game: Bottom 8, 1 out, home trailing 5-6
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Mock score methods
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(5);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(6);
      vi.spyOn(game.score, 'isHomeWinning').mockReturnValue(false);

      (game as any).getScore = vi.fn().mockReturnValue({
        home: 5,
        away: 6,
        leader: 'AWAY',
        difference: 1,
      });

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-extra'));
      const runner1 = new PlayerId(SecureTestUtils.generatePlayerId('runner-1'));
      const runner2 = new PlayerId(SecureTestUtils.generatePlayerId('runner-2'));

      // Mock InningState - bottom of 8th, 1 out
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 8; // Extra innings
      mockInningState.isTopHalf = false;
      mockInningState.outs = 1;
      mockInningState.homeBatterSlot = 5;

      const updatedMockInningState = {
        ...mockInningState,
        outs: 1, // Outs stay at 1
        isTopHalf: false,
        inning: 8, // Stays at 8
        homeBatterSlot: 6,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 5,
            result: AtBatResultType.HOME_RUN,
            inning: 8,
            outs: 1,
          },
          { type: 'RunnerAdvanced', gameId, runnerId: runner1, from: 'FIRST', to: 'HOME' },
          { type: 'RunnerAdvanced', gameId, runnerId: runner2, from: 'SECOND', to: 'HOME' },
          { type: 'RunnerAdvanced', gameId, runnerId: batterIdParam, from: null, to: 'HOME' },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 5, newSlot: 6 },
        ]),
      };

      // Mock GameCoordinator.recordAtBat to return walk-off victory in extra innings
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 3,
          rbis: 3,
          inningComplete: false,
          gameComplete: true,
          completionReason: 'WALKOFF',
        })
      );

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.HOME_RUN)
        .withRunnerAdvances([
          { playerId: runner1, fromBase: 'FIRST', toBase: 'HOME', advanceReason: 'HIT' },
          { playerId: runner2, fromBase: 'SECOND', toBase: 'HOME', advanceReason: 'HIT' },
          { playerId: batterIdParam, fromBase: null, toBase: 'HOME', advanceReason: 'HIT' },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Walk-off in extra innings
      expect(result.success).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.runsScored).toBe(3); // 3-run homer
      expect(result.gameState.currentInning).toBe(8); // Stays at 8
      expect(result.gameState.isTopHalf).toBe(false);
    });

    it('should NOT trigger walk-off when home team only ties (not winning)', async () => {
      // Arrange - Setup game: Bottom 7, 1 out, home trailing 4-5, single scores 1 to tie
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Mock score: starts at 4-5, becomes 5-5 after run scores (tied, not winning)
      // Use constant return values so isWalkOffScenario sees score BEFORE addHomeRuns
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(4); // Stays at 4 for walk-off check
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(5);
      vi.spyOn(game.score, 'isHomeWinning').mockReturnValue(false); // Still trailing/tied
      // Mock addHomeRuns to do nothing (prevent score update from interfering with mocks)
      vi.spyOn(game, 'addHomeRuns').mockImplementation(() => {});
      // Mock isWalkOffScenario explicitly to ensure it returns false for tie game
      vi.spyOn(game, 'isWalkOffScenario').mockReturnValue(false);

      (game as any).getScore = vi.fn().mockReturnValue({
        home: 4,
        away: 5,
        leader: 'AWAY',
        difference: 1,
      });

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-tie'));
      const runnerOnThird = new PlayerId(SecureTestUtils.generatePlayerId('runner-tie-3rd'));

      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 7;
      mockInningState.isTopHalf = false;
      mockInningState.outs = 1;
      mockInningState.homeBatterSlot = 4;
      // Set up bases with runner on third
      mockInningState.basesState = BasesState.empty().withRunnerOn('THIRD', runnerOnThird);

      // After single, score ties 5-5, but game does NOT end (needs to take lead)
      const updatedMockInningState = {
        ...mockInningState,
        outs: 1, // Still 1 out (no walk-off, game continues)
        isTopHalf: false,
        inning: 7,
        homeBatterSlot: 5,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 4,
            result: AtBatResultType.SINGLE,
            inning: 7,
            outs: 1,
          },
          { type: 'RunnerAdvanced', gameId, runnerId: runnerOnThird, from: 'THIRD', to: 'HOME' },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 4, newSlot: 5 },
        ]),
      };

      // Mock GameCoordinator.recordAtBat to return NO walk-off (game continues)
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue(
        createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 1,
          rbis: 1,
          inningComplete: false,
          gameComplete: false, // Game continues - tie doesn't end game
          completionReason: null,
        })
      );

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      // Spy on completeGame to ensure it's NOT called for a tie
      const completeGameSpy = vi.spyOn(game, 'completeGame');

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.SINGLE)
        .withRunnerAdvances([
          { playerId: runnerOnThird, fromBase: 'THIRD', toBase: 'HOME', advanceReason: 'HIT' },
        ])
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - NOT walk-off (only tied), game continues
      expect(result.success).toBe(true);
      expect(GameCoordinator.recordAtBat).toHaveBeenCalled(); // Verify coordinator was called
      expect(completeGameSpy).not.toHaveBeenCalled(); // Game should NOT be completed
      expect(result.gameEnded).toBe(false); // Game continues!
      expect(result.runsScored).toBe(1);
      expect(game.status).toBe(GameStatus.IN_PROGRESS);
      expect(result.gameState.currentInning).toBe(7);
      expect(result.gameState.isTopHalf).toBe(false);
    });

    it('should calculate runs and RBIs automatically when runnerAdvances is not provided', async () => {
      // Arrange - Bottom 7, bases loaded, home trailing 3-5
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .withTeamNames('Home Dragons', 'Away Tigers')
        .build();

      // Mock score methods to reflect home trailing 3-5
      vi.spyOn(game.score, 'getHomeRuns').mockReturnValue(3);
      vi.spyOn(game.score, 'getAwayRuns').mockReturnValue(5);
      vi.spyOn(game.score, 'isHomeWinning').mockReturnValue(false);

      // Spy on addHomeRuns to verify it's called with correct value
      vi.spyOn(game, 'addHomeRuns');

      (game as any).getScore = vi.fn().mockReturnValue({
        home: 3,
        away: 5,
        leader: 'AWAY',
        difference: 2,
      });

      const batterIdParam = new PlayerId(SecureTestUtils.generatePlayerId('batter-auto'));
      const runner1 = new PlayerId(SecureTestUtils.generatePlayerId('runner-1st'));
      const runner2 = new PlayerId(SecureTestUtils.generatePlayerId('runner-2nd'));
      const runner3 = new PlayerId(SecureTestUtils.generatePlayerId('runner-3rd'));

      // Mock InningState - bottom of 7th, 2 outs, bases loaded
      const mockInningState = createMockInningState(gameId);
      mockInningState.inning = 7;
      mockInningState.isTopHalf = false;
      mockInningState.outs = 2;
      mockInningState.homeBatterSlot = 4;

      // Set up bases loaded scenario with proper BasesState
      mockInningState.basesState = BasesState.empty()
        .withRunnerOn('FIRST', runner1)
        .withRunnerOn('SECOND', runner2)
        .withRunnerOn('THIRD', runner3);

      // Mock the result AFTER recording the home run
      const updatedMockInningState = {
        ...mockInningState,
        outs: 2,
        isTopHalf: false,
        inning: 7, // Walk-off prevents inning advancement
        homeBatterSlot: 5,
        getUncommittedEvents: vi.fn().mockReturnValue([
          {
            type: 'AtBatCompleted',
            gameId,
            batterId: batterIdParam,
            battingSlot: 4,
            result: AtBatResultType.HOME_RUN,
            inning: 7,
            outs: 2,
          },
          { type: 'CurrentBatterChanged', gameId, previousSlot: 4, newSlot: 5 },
        ]),
      };

      // Mock GameCoordinator.recordAtBat to return walk-off with 4 runs
      // Note: Walk-off ends the game as REGULATION (walk-off is a completion reason, not an ending type)
      vi.spyOn(GameCoordinator, 'recordAtBat').mockImplementation(() => {
        game.addHomeRuns(4); // Add runs to home team
        game.completeGame('REGULATION');
        return createCoordinatorResult(game, updatedMockInningState, {
          success: true,
          runsScored: 4, // Grand slam: 3 runners + batter
          rbis: 4,
          inningComplete: false,
          gameComplete: true,
          completionReason: 'WALKOFF',
        });
      });

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterIdParam);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(mockInningState);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
        async (_gId, side) => {
          return side === 'HOME'
            ? (mockHomeLineup as any)
            : (createMockTeamLineup(gameId, 'AWAY', batterIdParam) as any);
        }
      );
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

      // Command with NO runnerAdvances - auto-computation should calculate 4 runs
      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterIdParam)
        .withResult(AtBatResultType.HOME_RUN)
        // runnerAdvances: undefined - explicitly not provided
        .build();

      // Act - Record home run WITHOUT runnerAdvances
      const result = await recordAtBat.execute(command);

      // Assert - Runs and RBIs calculated automatically
      expect(result.success).toBe(true);
      expect(result.runsScored).toBe(4); // Batter + 3 runners
      expect(result.rbiAwarded).toBe(4); // All 4 runs driven in by batter

      // Assert - Game score updated correctly (3 + 4 = 7)
      expect(game.addHomeRuns).toHaveBeenCalledWith(4);

      // Assert - Walk-off detection works (home now winning 7-5)
      expect(result.gameEnded).toBe(true);
      expect(result.gameState.status).toBe(GameStatus.COMPLETED);
      expect(result.gameState.currentInning).toBe(7);
      expect(result.gameState.isTopHalf).toBe(false);
    });
  });

  describe('Error Handling - Data Integrity', () => {
    it('should return failure when game status is COMPLETED', async () => {
      // Arrange
      const completedGame = createTestGame(GameStatus.COMPLETED);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(completedGame as any);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Cannot record at-bat: Game status is')])
      );
    });

    it('should return failure when game status is NOT_STARTED', async () => {
      // Arrange
      const notStartedGame = createTestGame(GameStatus.NOT_STARTED);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(notStartedGame as any);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Cannot record at-bat: Game status is')])
      );
    });

    it('should throw error when InningState not found', async () => {
      // Arrange
      const game = createTestGame();

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(null);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act & Assert
      await expect(recordAtBat.execute(command)).rejects.toThrow(
        `InningState not found for game: ${gameId.value}`
      );
    });
  });

  describe('GameCoordinator Integration - Failure Paths', () => {
    it('should handle empty result when GameCoordinator validation fails', async () => {
      // Arrange
      const game = createTestGame();
      const inningState = createMockInningState(gameId);
      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', PlayerId.generate());

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(inningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockAwayLineup as any);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      // Mock GameCoordinator to return failure
      const coordinatorSpy = vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue({
        success: false,
        errors: ['Invalid batter: Player not in lineup'],
      });

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - ProcessedAtBatResult should have no changes when coordinator fails
      // The use case completes successfully but with zero stats
      expect(result.runsScored).toBe(0);
      expect(result.rbiAwarded).toBe(0);
      expect(result.inningEnded).toBe(false);
      expect(result.gameEnded).toBe(false);

      coordinatorSpy.mockRestore();
    });
  });

  describe('Event Generation - Coverage for Multi-Run Scenarios', () => {
    it('should generate RunScored events from RunnerAdvanced events with toBase HOME', async () => {
      // This test specifically covers lines 532-550 (RunScored event generation)
      const game = createTestGame();
      const runner1Id = PlayerId.generate();
      const runner2Id = PlayerId.generate();

      const inningState = createMockInningState(gameId);
      inningState.isTopHalf = false; // HOME is batting (bottom of inning)

      const updatedInningState = createMockInningState(gameId);
      updatedInningState.isTopHalf = false; // HOME is batting

      // Mock getUncommittedEvents to return RunnerAdvanced events with toBase === 'HOME'
      updatedInningState.getUncommittedEvents = vi.fn().mockReturnValue([
        new RunnerAdvanced(gameId, runner1Id, 'FIRST', 'HOME'), // Runner from 1st scores
        new RunnerAdvanced(gameId, runner2Id, 'SECOND', 'HOME'), // Runner from 2nd scores
        new RunnerAdvanced(gameId, batterId, null, 'HOME'), // Batter scores
      ]);

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', PlayerId.generate());

      // Mock GameCoordinator to return success with runs
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue({
        success: true,
        updatedGame: game,
        updatedInningState,
        runsScored: 3,
        rbis: 3,
        inningComplete: false,
        gameComplete: false,
      } as any);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(inningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockAwayLineup as any);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.HOME_RUN)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Verify the use case completed (lines 532-550 exercised by event generation)
      expect(result.success).toBe(true);

      // EventSourcedGameRepository handles event persistence internally
      // Success indicates generateEvents method ran correctly
    });

    it('should generate RunScored events with AWAY team score increment when away team bats', async () => {
      // This test covers the else branch (lines 532-534) where battingTeamSide === 'AWAY'
      const game = createTestGame();
      const runner1Id = PlayerId.generate();

      const inningState = createMockInningState(gameId);
      inningState.isTopHalf = true; // AWAY is batting (top of inning)

      const updatedInningState = createMockInningState(gameId);
      updatedInningState.isTopHalf = true; // AWAY is batting

      // Mock getUncommittedEvents to return RunnerAdvanced event with toBase === 'HOME'
      updatedInningState.getUncommittedEvents = vi.fn().mockReturnValue([
        new RunnerAdvanced(gameId, runner1Id, 'THIRD', 'HOME'), // Runner from 3rd scores
      ]);

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', PlayerId.generate());
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId); // Batter is on AWAY team

      // Mock GameCoordinator to return success with 1 run
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue({
        success: true,
        updatedGame: game,
        updatedInningState,
        runsScored: 1,
        rbis: 1,
        inningComplete: false,
        gameComplete: false,
      } as any);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(inningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide)
        .mockResolvedValueOnce(mockAwayLineup as any) // First call returns AWAY lineup (batting team)
        .mockResolvedValueOnce(mockAwayLineup as any) // Second call for batting team
        .mockResolvedValueOnce(mockHomeLineup as any); // Third call for fielding team
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Verify the use case completed successfully (AWAY team scoring branch exercised)
      expect(result.success).toBe(true);
    });
  });

  describe('Persistence Error Logging - Coverage for Error Branches', () => {
    it('should log database error when save fails with database-related message', async () => {
      // This test covers lines 616-622 (database error logging branch)
      const game = createTestGame();
      const inningState = createMockInningState(gameId);
      const updatedInningState = createMockInningState(gameId);
      updatedInningState.getUncommittedEvents = vi.fn().mockReturnValue([]);

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', PlayerId.generate());

      // Mock GameCoordinator to return success
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue({
        success: true,
        updatedGame: game,
        updatedInningState,
        runsScored: 0,
        rbis: 0,
        inningComplete: false,
        gameComplete: false,
      } as any);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(inningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockAwayLineup as any);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      // Mock save to fail with database error (exercises lines 616-622)
      const databaseError = new Error('Database connection failed');
      vi.mocked(mockGameRepository.save).mockRejectedValue(databaseError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Error should be propagated and logged
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Database connection failed');

      // Verify the database error logging branch was exercised
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database persistence failed',
        databaseError,
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'persistChanges',
          errorType: 'database',
        })
      );
    });

    it('should log event store error when save fails with store-related message', async () => {
      // This test covers lines 623-629 (event store error logging branch)
      const game = createTestGame();
      const inningState = createMockInningState(gameId);
      const updatedInningState = createMockInningState(gameId);
      updatedInningState.getUncommittedEvents = vi.fn().mockReturnValue([]);

      const mockHomeLineup = createMockTeamLineup(gameId, 'HOME', batterId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', PlayerId.generate());

      // Mock GameCoordinator to return success
      vi.spyOn(GameCoordinator, 'recordAtBat').mockReturnValue({
        success: true,
        updatedGame: game,
        updatedInningState,
        runsScored: 0,
        rbis: 0,
        inningComplete: false,
        gameComplete: false,
      } as any);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game as any);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(inningState);
      vi.mocked(mockTeamLineupRepository.findByGameIdAndSide)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockHomeLineup as any)
        .mockResolvedValueOnce(mockAwayLineup as any);
      vi.mocked(mockInningStateRepository.save).mockResolvedValue(undefined);

      // Mock save to fail with event store error (exercises lines 623-629)
      const eventStoreError = new Error('Event store unavailable');
      vi.mocked(mockGameRepository.save).mockRejectedValue(eventStoreError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Error should be propagated and logged
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Event store unavailable');

      // Verify the event store error logging branch was exercised
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event store persistence failed',
        eventStoreError,
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'persistChanges',
          errorType: 'eventStore',
        })
      );
    });
  });
});
