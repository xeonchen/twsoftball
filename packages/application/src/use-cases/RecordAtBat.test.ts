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
      // Arrange - Create a scenario where ground out with multiple outs might be 3rd out
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
      expect(result.inningEnded).toBe(true); // Should end inning due to double play heuristic
    });

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
      expect(result.errors).toContain('An unexpected error occurred during at-bat processing');

      // Should attempt to load game twice
      expect(mockGameRepository.findById).toHaveBeenCalledTimes(2);

      // Should log warning about failed game state loading
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load game state for error result',
        expect.objectContaining({
          gameId: gameId.value,
          originalError: initialError,
          loadError: loadError,
        })
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
});
