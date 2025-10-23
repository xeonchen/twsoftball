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
  return {
    id: { value: `inning-state-${gameIdParam.value}` },
    gameId: gameIdParam,
    inning: 1,
    isTopHalf: true,
    outs: 0,
    awayBatterSlot: 1,
    homeBatterSlot: 1,
    getBases: vi.fn().mockReturnValue({
      first: null,
      second: null,
      third: null,
      runnersInScoringPosition: [],
      basesLoaded: false,
    }),
  };
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
    (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

    vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
      mockInningState as any
    );
    vi.mocked(mockTeamLineupRepository.findByGameIdAndSide).mockImplementation(
      async (_gId, side) => {
        return side === 'HOME' ? (mockHomeLineup as any) : (mockAwayLineup as any);
      }
    );

    recordAtBat = new RecordAtBat(
      mockGameRepository,
      mockInningStateRepository,
      mockTeamLineupRepository,
      mockEventStore,
      mockLogger
    );
  });

  describe('Successful At-Bat Scenarios', () => {
    it('should record a home run with proper runs and RBI calculation', async () => {
      // Arrange
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventStore.append).mockResolvedValue(undefined);

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

      // Verify persistence (2 saves: one for score update, one for final state)
      expect(mockGameRepository.save).toHaveBeenCalledTimes(2);
      expect(mockEventStore.append).toHaveBeenCalled();
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
      expect(mockEventStore.append).toHaveBeenCalled();
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
      expect(mockEventStore.append).toHaveBeenCalled();
    });

    it('should return gameState with correct currentBatter after recording at-bat', async () => {
      // Arrange - Set up game with batter #1 at batting slot 1
      const game = createTestGame();
      const batter1Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-1'));

      // Create mock InningState with slot 1 currently batting
      const mockInningState = createMockInningState(gameId);
      (mockInningState as any).awayBatterSlot = 1;
      (mockInningState as any).isTopHalf = true;

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
      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      // Set up mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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
      // Arrange - Set up successful game loading but failing event store
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);

      const eventStoreError = new Error('Event store unavailable');
      vi.mocked(mockEventStore.append).mockRejectedValue(eventStoreError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to store events: Event store unavailable');
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
      (mockInningState as any).outs = 1;

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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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

      // Verify event store was called (events were generated)
      expect(mockEventStore.append).toHaveBeenCalled();
    });

    it('should handle scenario with only runners scoring (no base advances)', async () => {
      // Arrange - Test filtering logic where all runners either score or get out
      const game = createTestGame();
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

      // Verify event store was called (events were generated)
      expect(mockEventStore.append).toHaveBeenCalled();
    });

    it('should handle scenario with only base advances (no scoring)', async () => {
      // Arrange - Test filtering logic where runners only advance to bases
      const game = createTestGame();
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

      // Verify event store was called (events were generated)
      expect(mockEventStore.append).toHaveBeenCalled();
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

      // Verify event store was called (even with empty events)
      expect(mockEventStore.append).toHaveBeenCalled();
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
      // Arrange - Setup successful game find, but fail event store with database error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);

      // Make event store fail with database connection error
      vi.mocked(mockEventStore.append).mockRejectedValue(
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
          compensationApplied: true,
        })
      );
    });

    it('should log event store-specific errors correctly', async () => {
      // Arrange - Setup successful game find, but fail event store with store error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);

      // Make event store fail with event store-specific error
      vi.mocked(mockEventStore.append).mockRejectedValue(
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
          compensationApplied: true,
        })
      );
    });

    it('should log generic persistence errors', async () => {
      // Arrange - Setup successful game find, but fail event store with generic error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockGameRepository.save).mockResolvedValue(undefined);

      // Make event store fail with generic error (not database or event store specific)
      vi.mocked(mockEventStore.append).mockRejectedValue(new Error('Network timeout occurred'));

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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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

    it('should call InningState.recordAtBat() with correct parameters', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const updatedMockInningState = {
        ...mockInningState,
        awayBatterSlot: 2,
        getUncommittedEvents: vi.fn().mockReturnValue([]),
      };

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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
      expect((mockInningState as any).recordAtBat).toHaveBeenCalledWith(
        batterId,
        1, // battingSlot
        AtBatResultType.SINGLE,
        1 // inning
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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState as any) // processAtBat call
        .mockResolvedValueOnce(updatedMockInningState as any); // buildGameStateDTO call
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
      expect(result.gameState.currentBatterSlot).toBe(1); // Should be 1 (batter who just batted, pre-advancement)
    });

    it('should use InningState domain events instead of generating stub events', async () => {
      // Arrange
      const game = createTestGame();
      const mockInningState = createMockInningState(gameId);
      const mockAwayLineup = createMockTeamLineup(gameId, 'AWAY', batterId);

      const domainEvents = [
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
        getUncommittedEvents: vi.fn().mockReturnValue(domainEvents),
      };

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId).mockResolvedValue(
        mockInningState as any
      );
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
      // Verify that event store was called with events including BatterAdvanced
      expect(mockEventStore.append).toHaveBeenCalledWith(
        gameId,
        'Game',
        expect.arrayContaining([expect.objectContaining({ type: 'CurrentBatterChanged' })])
      );
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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState as any)
        .mockResolvedValueOnce(updatedMockInningState as any);
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
      expect(result.gameState.currentBatterSlot).toBe(10); // Should be 10 (batter who just batted, pre-advancement)
    });
  });

  describe('Compensation Failure Handling', () => {
    it('should handle compensation failure when event store fails after game save', async () => {
      // Arrange - Setup scenario where game save succeeds but event store fails
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make game repository save succeed first time, then fail during compensation
      vi.mocked(mockGameRepository.save)
        .mockResolvedValueOnce(undefined) // First save (successful)
        .mockRejectedValueOnce(new Error('Compensation save failed')); // Compensation save fails

      // Make event store fail
      vi.mocked(mockEventStore.append).mockRejectedValue(new Error('Event store connection lost'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should fail with compensation failure error
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Transaction compensation failed');
      expect(result.errors?.[0]).toContain('Original error: Event store connection lost');
      expect(result.errors?.[0]).toContain('Compensation error: Compensation save failed');
      expect(result.errors?.[0]).toContain('System may be in inconsistent state');
    });

    it('should log compensation attempt and failure correctly', async () => {
      // Arrange - Setup scenario where compensation fails
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make game repository save succeed first time, then fail during compensation
      vi.mocked(mockGameRepository.save)
        .mockResolvedValueOnce(undefined) // First save (successful)
        .mockRejectedValueOnce(new Error('Repository unavailable')); // Compensation fails

      // Make event store fail
      const originalError = new Error('Event store critical failure');
      vi.mocked(mockEventStore.append).mockRejectedValue(originalError);

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should log compensation attempt and failure
      expect(result.success).toBe(false);

      // Should log compensation warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempting transaction compensation',
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'compensateFailedTransaction',
          reason: 'Event store failed after game save',
          originalError: 'Event store critical failure',
        })
      );

      // Should log compensation failure error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Transaction compensation failed',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'compensateFailedTransaction',
          originalError: 'Event store critical failure',
          systemState: 'potentially_inconsistent',
          requiresManualIntervention: true,
        })
      );
    });

    it('should handle compensation failure with non-Error objects', async () => {
      // Arrange - Setup scenario where compensation fails with non-Error
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make game repository save succeed first time, then fail with non-Error
      vi.mocked(mockGameRepository.save)
        .mockResolvedValueOnce(undefined) // First save (successful)
        .mockRejectedValueOnce('String error during compensation'); // Non-Error compensation failure

      // Make event store fail with non-Error
      vi.mocked(mockEventStore.append).mockRejectedValue('String error in event store');

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should handle non-Error objects gracefully
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Original error: Unknown');
      expect(result.errors?.[0]).toContain('Compensation error: Unknown');

      // Should log with 'Unknown error' for non-Error objects
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempting transaction compensation',
        expect.objectContaining({
          originalError: 'Unknown error',
        })
      );
    });

    it('should successfully log compensation when recovery succeeds', async () => {
      // Arrange - Setup scenario where compensation succeeds
      const game = createTestGame();
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);

      // Make game repository save succeed both times
      vi.mocked(mockGameRepository.save)
        .mockResolvedValueOnce(undefined) // First save (successful)
        .mockResolvedValueOnce(undefined); // Compensation save succeeds

      // Make event store fail
      vi.mocked(mockEventStore.append).mockRejectedValue(new Error('Temporary event store issue'));

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.SINGLE)
        .build();

      // Act
      const result = await recordAtBat.execute(command);

      // Assert - Should still fail overall but log successful compensation
      expect(result.success).toBe(false);

      // Should log successful compensation
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Transaction compensation successful',
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'compensateFailedTransaction',
        })
      );
    });
  });

  describe('Inning Transition Bug Investigation', () => {
    it('should flip isTopHalf from true to false when top half ends with 3rd out', async () => {
      // Arrange - Create a scenario with 2 outs already, top of 1st inning
      const game = createTestGame();
      const batter1Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-1'));
      const batter2Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-2'));
      const batter3Id = new PlayerId(SecureTestUtils.generatePlayerId('batter-3'));

      // Mock InningState with 2 outs already (top of 1st)
      const mockInningState = createMockInningState(gameId);
      (mockInningState as any).outs = 2; // 2 outs already
      (mockInningState as any).isTopHalf = true; // Top half
      (mockInningState as any).inning = 1;
      (mockInningState as any).awayBatterSlot = 3; // Batter #3 is up

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
      console.log('[TEST] BEFORE - inning:', (mockInningState as any).inning);
      console.log('[TEST] BEFORE - isTopHalf:', (mockInningState as any).isTopHalf);
      console.log('[TEST] BEFORE - outs:', (mockInningState as any).outs);
      console.log('[TEST] BEFORE - awayBatterSlot:', (mockInningState as any).awayBatterSlot);

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

      (mockInningState as any).recordAtBat = vi.fn().mockReturnValue(updatedMockInningState);

      // Set up repository mocks
      vi.mocked(mockGameRepository.findById).mockResolvedValue(game);
      vi.mocked(mockInningStateRepository.findCurrentByGameId)
        .mockResolvedValueOnce(mockInningState as any) // processAtBat call
        .mockResolvedValueOnce(updatedMockInningState as any); // buildGameStateDTO call
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
});
