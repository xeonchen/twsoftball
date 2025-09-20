/**
 * @file GameApplicationService.workflows.test.ts
 * Complex Workflow Coordination tests for the GameApplicationService.
 *
 * @remarks
 * These tests verify the GameApplicationService's ability to coordinate
 * complex workflows involving multiple use cases, handle compensation
 * patterns, and orchestrate multi-step business operations.
 *
 * **Test Coverage Areas**:
 * - Complete at-bat sequence coordination
 * - Multi-step operation orchestration
 * - Compensation pattern execution
 * - Complex workflow state management
 *
 * **Testing Strategy**:
 * - Mock all use case dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper error handling and compensation
 * - Ensure audit trails are maintained
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import { GameId, PlayerId, AtBatResultType, GameStatus } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DTO imports
import { AtBatResult } from '../dtos/AtBatResult.js';
import { CompleteAtBatSequenceCommand } from '../dtos/CompleteAtBatSequenceCommand.js';
import { InningEndResult } from '../dtos/InningEndResult.js';
import { RecordAtBatCommand } from '../dtos/RecordAtBatCommand.js';
// Port imports
// Port imports
// Port imports - removed unused imports
import { createGameStateDTO } from '../test-factories/dto-factories.js';
import { createGameApplicationServiceMocks } from '../test-factories/mock-service-factories.js';
// Use case imports
import { EndInning } from '../use-cases/EndInning.js';
import { RecordAtBat } from '../use-cases/RecordAtBat.js';
import { RedoLastAction } from '../use-cases/RedoLastAction.js';
import { StartNewGame } from '../use-cases/StartNewGame.js';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer.js';
import { UndoLastAction } from '../use-cases/UndoLastAction.js';
// Note: These imports available for potential future test expansion
// import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand.js';
// import { SubstitutionResult } from '../dtos/SubstitutionResult.js';
// Test helper functions removed - not used in this test file
// DTO imports

// Port imports

import { GameApplicationService } from './GameApplicationService.js';

// Type definitions for test results
interface TestResult {
  success: boolean;
  data?: string;
  errors?: string[];
  attempts?: number;
  actionsUndone?: number;
  actionsRedone?: number;
  compensationApplied?: boolean;
  rollbackApplied?: boolean;
  results?: unknown[];
  message?: string;
  [key: string]: unknown;
}

// Type definitions - removed unused interfaces

// Domain imports

describe('GameApplicationService', () => {
  let gameApplicationService: GameApplicationService;
  let mocks: ReturnType<typeof createGameApplicationServiceMocks>;

  // Test data
  const gameId = new GameId('test-game-123');
  const playerId = new PlayerId('player-456');

  beforeEach(() => {
    // Reset all mock functions
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mocks = createGameApplicationServiceMocks();

    // Create service instance using the mock factory
    // Use type assertions because mocks only implement execute method,
    // but GameApplicationService only calls execute methods in these tests
    gameApplicationService = new GameApplicationService(
      mocks.mockStartNewGame as unknown as StartNewGame,
      mocks.mockRecordAtBat as unknown as RecordAtBat,
      mocks.mockSubstitutePlayer as unknown as SubstitutePlayer,
      mocks.mockEndInning as unknown as EndInning,
      mocks.mockUndoLastAction as unknown as UndoLastAction,
      mocks.mockRedoLastAction as unknown as RedoLastAction,
      mocks.mockLogger,
      mocks.mockNotificationService,
      mocks.mockAuthService
    );
  });

  describe('Complex Workflow Coordination', () => {
    describe('completeAtBatSequence', () => {
      it('should coordinate complete at-bat sequence with inning management', async () => {
        // Arrange
        const command: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand: {
            gameId,
            batterId: playerId,
            result: AtBatResultType.HOME_RUN,
          } as RecordAtBatCommand,
          checkInningEnd: true,
          handleSubstitutions: true,
          notifyScoreChanges: true,
        };

        mocks.functions.executeRecordAtBat.mockResolvedValue({
          success: true,
          inningEnded: true,
          runsScored: 1,
          gameState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 2,
            isTopHalf: false,
          },
        } as AtBatResult);

        mocks.functions.executeEndInning.mockResolvedValue({
          success: true,
          gameState: createGameStateDTO(GameId.generate()),
          transitionType: 'FULL_INNING',
          previousHalf: { inning: 1, isTopHalf: false },
          newHalf: { inning: 2, isTopHalf: true },
          gameEnded: false,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          eventsGenerated: ['HalfInningEnded', 'InningAdvanced'],
        } as InningEndResult);

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.atBatResult.success).toBe(true);
        expect(result.inningEndResult?.success).toBe(true);
        expect(result.scoreUpdateSent).toBe(true);
        expect(mocks.functions.executeRecordAtBat).toHaveBeenCalledWith(command.atBatCommand);
        expect(mocks.functions.executeEndInning).toHaveBeenCalled();
        expect(mocks.functions.notifyScoreUpdate).toHaveBeenCalledWith(
          gameId.value,
          expect.objectContaining({
            homeScore: expect.any(Number),
            awayScore: expect.any(Number),
            inning: expect.any(Number),
            scoringPlay: expect.stringContaining('run'),
          })
        );
      });

      it('should handle at-bat success but skip inning end when not needed', async () => {
        // Arrange
        const command: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand: {
            gameId,
            batterId: playerId,
            result: AtBatResultType.SINGLE,
          } as RecordAtBatCommand,
          checkInningEnd: true,
        };

        mocks.functions.executeRecordAtBat.mockResolvedValue({
          success: true,
          inningEnded: false,
          runsScored: 0,
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.inningEndResult).toBeUndefined();
        expect(mocks.functions.executeEndInning).not.toHaveBeenCalled();
      });

      it('should handle at-bat failure and stop sequence', async () => {
        // Arrange
        const command: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand: {
            gameId,
            batterId: playerId,
            result: AtBatResultType.SINGLE,
          } as RecordAtBatCommand,
        };

        mocks.functions.executeRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['Invalid batter'],
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('At-bat failed: Invalid batter');
        expect(mocks.functions.executeEndInning).not.toHaveBeenCalled();
      });
    });

    describe('executeWithCompensation', () => {
      it('should execute operation and handle compensation on failure', async () => {
        // Arrange
        const operation = vi
          .fn()
          .mockResolvedValue({ success: false, errors: ['Operation failed'] });
        const compensation = vi.fn().mockResolvedValue({ success: true });

        // Act
        const result = await gameApplicationService.executeWithCompensation(
          'test-operation',
          operation,
          compensation,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(false);
        expect(result.compensationApplied).toBe(true);
        expect(operation).toHaveBeenCalled();
        expect(compensation).toHaveBeenCalled();
        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
          'Applied compensation for failed operation',
          expect.objectContaining({
            operation: 'test-operation',
            gameId: gameId.value,
          })
        );
      });

      it('should execute operation successfully without compensation', async () => {
        // Arrange
        const operation = vi.fn().mockResolvedValue({ success: true, data: 'result' });
        const compensation = vi.fn();

        // Act
        const result = await gameApplicationService.executeWithCompensation(
          'test-operation',
          operation,
          compensation,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(true);
        expect(result.compensationApplied).toBe(false);
        expect(operation).toHaveBeenCalled();
        expect(compensation).not.toHaveBeenCalled();
      });

      it('should handle compensation failure gracefully', async () => {
        // Arrange
        const operation = vi
          .fn()
          .mockResolvedValue({ success: false, errors: ['Operation failed'] });
        const compensation = vi.fn().mockRejectedValue(new Error('Compensation failed'));

        // Act
        const result = await gameApplicationService.executeWithCompensation(
          'test-operation',
          operation,
          compensation,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(false);
        expect(result.compensationApplied).toBe(false);
        expect(mocks.functions.loggerError).toHaveBeenCalledWith(
          'Compensation failed for operation',
          expect.any(Error),
          expect.objectContaining({
            operation: 'test-operation',
          })
        );
      });
    });
  });
});
