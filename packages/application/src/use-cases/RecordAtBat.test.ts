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

import { GameId, PlayerId, AtBatResultType, Game, GameStatus } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Disable unbound-method rule for this file as vi.mocked() is designed to work with unbound methods
/* eslint-disable @typescript-eslint/unbound-method */

import {
  createMockDependencies,
  GameTestBuilder,
  CommandTestBuilder,
  setupSuccessfulAtBatScenario,
  setupGameNotFoundScenario,
  SecureTestUtils,
  EnhancedMockGameRepository,
  EnhancedMockEventStore,
  EnhancedMockLogger,
} from '../test-factories';

import { RecordAtBat } from './RecordAtBat';

describe('RecordAtBat Use Case', () => {
  // Test dependencies (mocks)
  let mockGameRepository: EnhancedMockGameRepository;
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
    return GameTestBuilder.create()
      .withId(gameId)
      .withStatus(status)
      .withTeamNames('Home Dragons', 'Away Tigers')
      .build();
  };

  beforeEach(() => {
    const mocks = createMockDependencies();
    mockGameRepository = mocks.gameRepository;
    mockEventStore = mocks.eventStore;
    mockLogger = mocks.logger;

    recordAtBat = new RecordAtBat(mockGameRepository, mockEventStore, mockLogger);
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

      // Verify persistence
      expect(mockGameRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventStore.append).toHaveBeenCalled();
    });

    it('should record a single with one RBI', async () => {
      // Arrange - using centralized scenario
      const scenario = setupSuccessfulAtBatScenario({
        gameId: gameId.value,
        atBatResult: AtBatResultType.SINGLE,
        withRunners: true,
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
      expect(result.errors).toContain('An unexpected error occurred during at-bat processing');
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
      expect(result.errors).toContain('An unexpected error occurred during at-bat processing');
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
      expect(result.errors).toContain('An unexpected error occurred during at-bat processing');
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
      expect(result.errors).toContain('An unexpected error occurred during at-bat processing');
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
  });
});
