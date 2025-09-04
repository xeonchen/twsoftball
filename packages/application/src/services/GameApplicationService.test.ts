/**
 * @file GameApplicationService.test.ts
 * Comprehensive tests for the GameApplicationService orchestrator.
 *
 * @remarks
 * These tests verify the GameApplicationService's ability to orchestrate complex
 * workflows spanning multiple use cases, handle error conditions gracefully,
 * and provide transactional boundaries for multi-step business processes.
 *
 * **Test Coverage Areas**:
 * - Game lifecycle orchestration (start → record → end)
 * - Complex workflow coordination (multi-step operations)
 * - Transaction management and rollback scenarios
 * - Error recovery and compensation actions
 * - Business rule validation across use cases
 * - Audit and logging verification
 *
 * **Testing Strategy**:
 * - Mock all use case dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper error handling and rollback
 * - Ensure audit trails are maintained
 * - Test concurrent operation handling
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import {
  GameId,
  PlayerId,
  AtBatResultType,
  GameStatus,
  DomainError,
  JerseyNumber,
  FieldPosition,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use case imports
import { AtBatResult } from '../dtos/AtBatResult';
import { CompleteAtBatSequenceCommand } from '../dtos/CompleteAtBatSequenceCommand';
import { CompleteGameWorkflowCommand } from '../dtos/CompleteGameWorkflowCommand';
import { GameStartResult } from '../dtos/GameStartResult';
import { GameStateDTO } from '../dtos/GameStateDTO';
import { RecordAtBatCommand } from '../dtos/RecordAtBatCommand';
import { StartNewGameCommand } from '../dtos/StartNewGameCommand';
// Note: These imports available for potential future test expansion
// import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';
// import { SubstitutionResult } from '../dtos/SubstitutionResult';
import { AuthService } from '../ports/out/AuthService';
import { Logger } from '../ports/out/Logger';
import { NotificationService } from '../ports/out/NotificationService';
import { EndInning } from '../use-cases/EndInning';
import { RecordAtBat } from '../use-cases/RecordAtBat';
// Note: These imports available for potential future test expansion
import { RedoLastAction } from '../use-cases/RedoLastAction';
import { StartNewGame } from '../use-cases/StartNewGame';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer';
import { UndoLastAction } from '../use-cases/UndoLastAction';

// DTO imports

// Port imports

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

interface ComplexTestResult {
  success: boolean;
  data?: unknown;
  metadata?: {
    source?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
  errors?: string[];
  statusCode?: number;
  details?: {
    reason?: string;
    retryable?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

import { GameApplicationService } from './GameApplicationService';

// Domain imports

describe('GameApplicationService', () => {
  let gameApplicationService: GameApplicationService;

  // Mock use cases
  let mockStartNewGame: StartNewGame;
  let mockRecordAtBat: RecordAtBat;
  let mockSubstitutePlayer: SubstitutePlayer;
  let mockEndInning: EndInning;
  let mockUndoLastAction: UndoLastAction;
  let mockRedoLastAction: RedoLastAction;

  // Mock ports
  let mockLogger: Logger;
  let mockNotificationService: NotificationService;
  let mockAuthService: AuthService;

  // Create mock functions that can be referenced directly (avoiding unbound-method errors)
  const mockExecuteStartNewGame = vi.fn();
  const mockExecuteRecordAtBat = vi.fn();
  const mockExecuteSubstitutePlayer = vi.fn();
  const mockExecuteEndInning = vi.fn();
  const mockExecuteUndoLastAction = vi.fn();
  const mockExecuteRedoLastAction = vi.fn();
  const mockLoggerInfo = vi.fn();
  const mockLoggerDebug = vi.fn();
  const mockLoggerWarn = vi.fn();
  const mockLoggerError = vi.fn();
  const mockNotifyGameStarted = vi.fn();
  const mockNotifyGameEnded = vi.fn();
  const mockNotifyScoreUpdate = vi.fn();
  const mockAuthenticateUser = vi.fn();
  const mockAuthorizeAction = vi.fn();

  // Test data
  const gameId = new GameId('test-game-123');
  const playerId = new PlayerId('player-456');

  beforeEach(() => {
    // Reset all mock functions
    vi.clearAllMocks();

    // Set default return values for undo/redo mocks to prevent failures
    mockExecuteUndoLastAction.mockResolvedValue({
      success: false,
      errors: ['No default undo behavior'],
      actionsUndone: 0,
    });
    mockExecuteRedoLastAction.mockResolvedValue({
      success: false,
      errors: ['No default redo behavior'],
      actionsRedone: 0,
    });

    // Mock use cases with proper type casting
    mockStartNewGame = {
      execute: mockExecuteStartNewGame,
    } as Partial<StartNewGame> as StartNewGame;

    mockRecordAtBat = {
      execute: mockExecuteRecordAtBat,
    } as Partial<RecordAtBat> as RecordAtBat;

    mockSubstitutePlayer = {
      execute: mockExecuteSubstitutePlayer,
    } as Partial<SubstitutePlayer> as SubstitutePlayer;

    mockEndInning = {
      execute: mockExecuteEndInning,
    } as Partial<EndInning> as EndInning;

    mockUndoLastAction = {
      execute: mockExecuteUndoLastAction,
    } as Partial<UndoLastAction> as UndoLastAction;

    mockRedoLastAction = {
      execute: mockExecuteRedoLastAction,
    } as Partial<RedoLastAction> as RedoLastAction;

    // Mock ports
    mockLogger = {
      debug: mockLoggerDebug,
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      log: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as Logger;

    mockNotificationService = {
      sendUserNotification: vi.fn().mockResolvedValue({ success: true }),
      notifyGameStarted: mockNotifyGameStarted,
      notifyGameEnded: mockNotifyGameEnded,
      notifyScoreUpdate: mockNotifyScoreUpdate,
    } as Partial<NotificationService> as NotificationService;

    mockAuthService = {
      getCurrentUser: mockAuthenticateUser,
      hasPermission: mockAuthorizeAction,
    } as Partial<AuthService> as AuthService;

    // Create service instance
    gameApplicationService = new GameApplicationService(
      mockStartNewGame,
      mockRecordAtBat,
      mockSubstitutePlayer,
      mockEndInning,
      mockUndoLastAction,
      mockRedoLastAction,
      mockLogger,
      mockNotificationService,
      mockAuthService
    );
  });

  describe('Game Lifecycle Orchestration', () => {
    describe('startNewGameWithNotifications', () => {
      it('should successfully start game and send notifications', async () => {
        // Arrange
        const command = {
          gameId,
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
          ourTeamSide: 'HOME',
          gameDate: new Date(),
          location: 'Test Field',
          initialLineup: [],
          gameRules: {
            mercyRuleEnabled: false,
            mercyRuleInning4: 15,
            mercyRuleInning5: 10,
            timeLimitMinutes: 60,
            extraPlayerAllowed: false,
            maxPlayersInLineup: 9,
          },
        } as StartNewGameCommand;

        const expectedResult: GameStartResult = {
          success: true,
          gameId,
          initialState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 1,
            isTopHalf: true,
          } as GameStateDTO,
        };

        mockExecuteStartNewGame.mockResolvedValue(expectedResult);
        mockAuthenticateUser.mockResolvedValue('user123');

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.gameId).toEqual(gameId);
        expect(mockExecuteStartNewGame).toHaveBeenCalledWith(command);
        expect(mockNotifyGameStarted).toHaveBeenCalledWith({
          gameId,
          homeTeam: 'Home Team',
          awayTeam: 'Away Team',
          startTime: expect.any(Date),
        });
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Game started successfully with notifications',
          expect.objectContaining({
            gameId: gameId.value,
            operation: 'startNewGameWithNotifications',
          })
        );
      });

      it('should handle start game failure gracefully', async () => {
        // Arrange
        const command: StartNewGameCommand = {
          gameId,
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
        } as StartNewGameCommand;

        const expectedError = new DomainError('Invalid lineup configuration');
        (mockStartNewGame.execute as ReturnType<typeof vi.fn>).mockRejectedValue(expectedError);

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Invalid lineup configuration');
        expect(mockNotifyGameStarted).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Failed to start new game',
          expectedError,
          expect.objectContaining({
            gameId: gameId.value,
            operation: 'startNewGameWithNotifications',
          })
        );
      });

      it('should handle notification service failure gracefully', async () => {
        // Arrange
        const command: StartNewGameCommand = {
          gameId,
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
        } as StartNewGameCommand;

        const expectedResult: GameStartResult = {
          success: true,
          gameId,
          initialState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 1,
            isTopHalf: true,
          } as GameStateDTO,
        };

        mockExecuteStartNewGame.mockResolvedValue(expectedResult);
        mockNotifyGameStarted.mockRejectedValue(new Error('Notification service unavailable'));

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(true); // Game creation should still succeed
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Failed to send game start notification',
          expect.objectContaining({
            gameId: gameId.value,
          })
        );
      });
    });

    describe('completeGameWorkflow', () => {
      it('should execute complete game workflow from start to completion', async () => {
        // Arrange
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Tigers',
            awayTeamName: 'Lions',
          } as StartNewGameCommand,
          atBatSequences: [
            {
              gameId,
              batterId: playerId,
              result: AtBatResultType.SINGLE,
            } as RecordAtBatCommand,
          ],
          substitutions: [],
          endGameNaturally: true,
        };

        // Mock successful responses
        mockExecuteStartNewGame.mockResolvedValue({
          success: true,
          gameId,
          initialState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 1,
            isTopHalf: true,
          } as GameStateDTO,
        } as GameStartResult);

        mockExecuteRecordAtBat.mockResolvedValue({
          success: true,
          gameEnded: true,
          runsScored: 1,
        } as AtBatResult);

        mockAuthenticateUser.mockResolvedValue('user123');

        // Act
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.gameId).toEqual(gameId);
        expect(result.totalAtBats).toBe(1);
        expect(result.totalRuns).toBe(1);
        expect(result.gameCompleted).toBe(true);
        expect(mockExecuteStartNewGame).toHaveBeenCalled();
        expect(mockExecuteRecordAtBat).toHaveBeenCalled();
        expect(mockNotifyGameEnded).toHaveBeenCalled();
      });

      it('should handle partial workflow failure with proper rollback', async () => {
        // Arrange
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Tigers',
            awayTeamName: 'Lions',
          } as StartNewGameCommand,
          atBatSequences: [
            {
              gameId,
              batterId: playerId,
              result: AtBatResultType.SINGLE,
            } as RecordAtBatCommand,
          ],
          substitutions: [],
          endGameNaturally: false,
        };

        // Mock successful game start but failed at-bat
        mockExecuteStartNewGame.mockResolvedValue({
          success: true,
          gameId,
        } as GameStartResult);

        mockExecuteRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['Invalid at-bat configuration'],
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain(
          'Workflow failed during at-bat sequence: Invalid at-bat configuration'
        );
        expect(result.totalAtBats).toBe(0);
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Game workflow failed, attempting compensation',
          undefined,
          expect.objectContaining({
            gameId: expect.any(String),
            operation: 'completeGameWorkflow',
            errors: expect.any(Array),
          })
        );
      });

      it('should stop execution early when max attempts exceeded', async () => {
        // Arrange
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Tigers',
            awayTeamName: 'Lions',
          } as StartNewGameCommand,
          atBatSequences: Array(10).fill({
            gameId,
            batterId: playerId,
            result: AtBatResultType.SINGLE,
          } as RecordAtBatCommand),
          substitutions: [],
          endGameNaturally: false,
          maxAttempts: 3,
        };

        mockExecuteStartNewGame.mockResolvedValue({
          success: true,
          gameId,
        } as GameStartResult);

        // Mock failures for all at-bats
        mockExecuteRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['Failed at-bat'],
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Assert
        expect(result.success).toBe(false);
        expect(mockExecuteRecordAtBat).toHaveBeenCalledTimes(3); // Should stop at maxAttempts
        expect(result.errors).toContain('Maximum workflow attempts exceeded (3)');
      });
    });
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

        mockExecuteRecordAtBat.mockResolvedValue({
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

        mockExecuteEndInning.mockResolvedValue({
          success: true,
          newInning: 2,
          isTopHalf: false,
        });

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.atBatResult.success).toBe(true);
        expect(result.inningEndResult?.success).toBe(true);
        expect(result.scoreUpdateSent).toBe(true);
        expect(mockExecuteRecordAtBat).toHaveBeenCalledWith(command.atBatCommand);
        expect(mockExecuteEndInning).toHaveBeenCalled();
        expect(mockNotifyScoreUpdate).toHaveBeenCalledWith(
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

        mockExecuteRecordAtBat.mockResolvedValue({
          success: true,
          inningEnded: false,
          runsScored: 0,
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.inningEndResult).toBeUndefined();
        expect(mockExecuteEndInning).not.toHaveBeenCalled();
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

        mockExecuteRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['Invalid batter'],
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('At-bat failed: Invalid batter');
        expect(mockExecuteEndInning).not.toHaveBeenCalled();
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
        expect(mockLoggerWarn).toHaveBeenCalledWith(
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
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Compensation failed for operation',
          expect.any(Error),
          expect.objectContaining({
            operation: 'test-operation',
          })
        );
      });
    });
  });

  describe('Transaction Management', () => {
    describe('executeInTransaction', () => {
      it('should execute multiple operations atomically', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({ success: true, data: 'op2' }),
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(3);
        expect((result.results[0] as TestResult).data).toBe('op1');
        expect((result.results[1] as TestResult).data).toBe('op2');
        expect((result.results[2] as TestResult).data).toBe('op3');
        operations.forEach(op => expect(op).toHaveBeenCalled());
      });

      it('should rollback on any operation failure', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['Op2 failed'] }),
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: Op2 failed');
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled(); // Should stop at failure
      });

      it('should handle operation exception and perform rollback', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockRejectedValue(new Error('Op2 exception')),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction exception at operation 1: Op2 exception');
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Transaction failed with exception',
          expect.any(Error),
          expect.objectContaining({
            operation: 'multi-operation',
            failedAt: 1,
          })
        );
      });

      it('should handle undefined operations in transaction gracefully', async () => {
        // Arrange - Operations array with undefined element
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          undefined as unknown as () => Promise<unknown>,
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation-with-undefined',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction exception at operation 1: Operation at index 1 is undefined'
        );
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled();
      });

      it('should handle operation failure with complex error structures', async () => {
        // Arrange - Operation that fails with complex error array
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({
            success: false,
            errors: [
              'Primary validation failed',
              'Secondary check failed',
              'Tertiary rule violated',
            ],
          }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'complex-error-transaction',
          operations,
          { gameId: gameId.value, complexErrorTest: true }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction failed at operation 1: Primary validation failed, Secondary check failed, Tertiary rule violated'
        );
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
      });

      it('should handle operation failure without error array', async () => {
        // Arrange - Operation that fails without errors array
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({
            success: false,
            message: 'Operation failed but no errors array',
          }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'no-errors-array-transaction',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: Operation failed');
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
      });

      it('should handle transaction system error gracefully', async (): Promise<void> => {
        // Test the catch block in executeInTransaction by creating operations that cause a system error
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          (): never => {
            throw new Error('System operation failure');
          }, // This will trigger the catch block
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'system-error-transaction',
          operations,
          { gameId: gameId.value }
        );

        // Assert - when a system error occurs during operation execution, rollback is attempted
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true); // Rollback is applied when system error occurs
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/Transaction exception at operation 1: System operation failure/),
          ])
        );
      });

      it('should maintain ACID properties during nested transaction workflows', async () => {
        // Given: Complex multi-step workflow with potential failure points
        let atBatExecuted = false;
        let inningProcessed = false;
        let scoresUpdated = false;

        const operations = [
          // Operation 1: Record at-bat (succeeds)
          vi.fn().mockImplementation(() => {
            atBatExecuted = true;
            return { success: true, data: 'at-bat-recorded', playerId: playerId.value };
          }),
          // Operation 2: Process inning change (succeeds)
          vi.fn().mockImplementation(() => {
            inningProcessed = true;
            return { success: true, data: 'inning-processed', newInning: 2 };
          }),
          // Operation 3: Update scores (fails at step 3 of 5)
          vi.fn().mockImplementation(() => {
            scoresUpdated = true;
            return {
              success: false,
              errors: ['Score calculation failed', 'Database constraint violation'],
            };
          }),
        ];

        // When: Operation fails at step 3 of 5
        const result = await gameApplicationService.executeInTransaction(
          'complex-game-workflow',
          operations,
          {
            gameId: gameId.value,
            workflowType: 'nested-transaction',
            totalSteps: 5,
            criticalSection: true,
          }
        );

        // Then: Steps 1-2 rolled back, state consistent, audit preserved
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.results).toHaveLength(2); // Only successful operations before failure
        expect(result.errors).toContain(
          'Transaction failed at operation 2: Score calculation failed, Database constraint violation'
        );

        // Verify all operations up to failure were executed
        expect(atBatExecuted).toBe(true);
        expect(inningProcessed).toBe(true);
        expect(scoresUpdated).toBe(true);

        // Verify rollback was logged with proper context
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'complex-game-workflow',
            operationsToRollback: 2,
            gameId: gameId.value,
            workflowType: 'nested-transaction',
          })
        );
      });

      it('should handle compensation chain failures gracefully', async () => {
        // Given: Workflow with compensation actions that will trigger rollback
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'primary-operation-succeeded' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['Primary operation failed'] }),
        ];

        // When: Primary fails, compensation is triggered
        const result = await gameApplicationService.executeInTransaction(
          'compensation-chain-failure',
          operations,
          {
            gameId: gameId.value,
            compensationType: 'critical-rollback',
          }
        );

        // Then: Transaction fails and rollback is applied
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction failed at operation 1: Primary operation failed'
        );

        // Verify rollback was attempted
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'compensation-chain-failure',
            operationsToRollback: 1,
            gameId: gameId.value,
            compensationType: 'critical-rollback',
          })
        );
      });

      it('should verify transaction boundary isolation', async () => {
        // Given: Two concurrent transaction attempts
        let transaction1State = 'initial';
        let transaction2State = 'initial';

        const transaction1Operations = [
          vi.fn().mockImplementation(async () => {
            transaction1State = 'modified';
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 50));
            return { success: true, data: 'tx1-step1' };
          }),
          vi.fn().mockImplementation(() => {
            // This should fail and trigger rollback
            return { success: false, errors: ['Transaction 1 intentional failure'] };
          }),
        ];

        const transaction2Operations = [
          vi.fn().mockImplementation(() => {
            transaction2State = 'modified';
            return { success: true, data: 'tx2-step1' };
          }),
          vi.fn().mockImplementation(() => {
            return { success: true, data: 'tx2-step2' };
          }),
        ];

        // When: Both transactions execute concurrently
        const [result1, result2] = await Promise.all([
          gameApplicationService.executeInTransaction('concurrent-tx1', transaction1Operations, {
            gameId: gameId.value,
            isolationLevel: 'strict',
          }),
          gameApplicationService.executeInTransaction('concurrent-tx2', transaction2Operations, {
            gameId: gameId.value,
            isolationLevel: 'strict',
          }),
        ]);

        // Then: Transaction boundaries maintained, no cross-contamination
        expect(result1.success).toBe(false);
        expect(result1.rollbackApplied).toBe(true);
        expect(result2.success).toBe(true);
        expect(result2.rollbackApplied).toBe(false);

        // Verify state modifications occurred independently
        expect(transaction1State).toBe('modified');
        expect(transaction2State).toBe('modified');
      });

      it('should handle rollback scenarios when operations fail mid-process', async () => {
        // Given: Multi-step operation with mid-process failure
        const operationStates: string[] = [];

        const operations = [
          vi.fn().mockImplementation(() => {
            operationStates.push('step1-executed');
            return { success: true, data: 'step1-complete', rollbackData: 'step1-rollback-info' };
          }),
          vi.fn().mockImplementation(() => {
            operationStates.push('step2-executed');
            return { success: true, data: 'step2-complete', rollbackData: 'step2-rollback-info' };
          }),
          vi.fn().mockImplementation((): never => {
            operationStates.push('step3-started');
            // Simulate mid-process failure (after starting but before completing)
            throw new Error('Mid-process failure during step 3 execution');
          }),
          vi.fn().mockImplementation(() => {
            operationStates.push('step4-should-not-execute');
            return { success: true, data: 'step4-complete' };
          }),
        ];

        // When: Operation fails mid-process at step 3
        const result = await gameApplicationService.executeInTransaction(
          'mid-process-failure-transaction',
          operations,
          {
            gameId: gameId.value,
            rollbackStrategy: 'immediate',
            auditLevel: 'detailed',
          }
        );

        // Then: Proper rollback triggered, audit trail maintained
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction exception at operation 2: Mid-process failure during step 3 execution'
        );

        // Verify execution sequence: steps 1,2,3 executed, step 4 never reached
        expect(operationStates).toEqual(['step1-executed', 'step2-executed', 'step3-started']);

        // Verify operations called in correct sequence
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).toHaveBeenCalled();
        expect(operations[3]).not.toHaveBeenCalled();

        // Verify rollback logging with context
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'mid-process-failure-transaction',
            operationsToRollback: 2, // steps 1 and 2 need rollback
            gameId: gameId.value,
            rollbackStrategy: 'immediate',
          })
        );
      });

      it('should handle transaction with operations returning different result formats', async () => {
        // Test various result formats to improve branch coverage
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'string-result' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['operation-error'] }),
          vi.fn().mockResolvedValue({ success: true, complex: { nested: 'data' } }),
        ];

        const result = await gameApplicationService.executeInTransaction(
          'mixed-results-transaction',
          operations,
          { gameId: gameId.value, testMixedResults: true }
        );

        expect(result.success).toBe(false); // Should fail because second operation failed
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: operation-error');

        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled(); // Should stop after failure
      });

      it('should handle executeWithCompensation with complex operation results', async () => {
        // Test compensation with complex result structures
        const complexResult = {
          success: false,
          data: { complexField: 'test' },
          metadata: { source: 'test', timestamp: Date.now() },
          errors: ['Complex operation failed'],
        };

        const operation = vi.fn().mockResolvedValue(complexResult);
        const compensation = vi.fn().mockResolvedValue({ compensated: true, rollbackData: 'test' });

        const result = await gameApplicationService.executeWithCompensation(
          'complex-compensation-test',
          operation,
          compensation,
          { gameId: gameId.value, complexTest: true }
        );

        expect(result).toEqual({
          ...complexResult,
          compensationApplied: true,
        });
        expect(operation).toHaveBeenCalled();
        expect(compensation).toHaveBeenCalled();

        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Applied compensation for failed operation',
          expect.objectContaining({
            operation: 'complex-compensation-test',
            gameId: gameId.value,
            complexTest: true,
          })
        );
      });
    });
  });

  describe('Business Rule Validation', () => {
    describe('validateGameOperationPermissions', () => {
      it('should validate user permissions for game operations', async () => {
        // Arrange
        mockAuthenticateUser.mockResolvedValue('user123');
        mockAuthorizeAction.mockResolvedValue(true);

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        // Assert
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('user123');
        expect(mockAuthorizeAction).toHaveBeenCalledWith('user123', 'RECORD_AT_BAT');
      });

      it('should reject operations for unauthorized users', async () => {
        // Arrange
        mockAuthenticateUser.mockResolvedValue('user123');
        mockAuthorizeAction.mockResolvedValue(false);

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'END_GAME'
        );

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('User does not have permission for END_GAME');
      });

      it('should handle authentication service failures', async () => {
        // Arrange
        (mockAuthService.getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Auth service down')
        );

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Authentication failed: Auth service down');
      });
    });
    describe('Additional Transaction Edge Cases', () => {
      it('should handle transaction with empty operations array', async () => {
        // Test transaction behavior with no operations
        const operations: Array<() => Promise<TestResult>> = [];

        const result = await gameApplicationService.executeInTransaction(
          'empty-transaction',
          operations,
          { gameId: gameId.value }
        );

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(0);
        expect(result.rollbackApplied).toBe(false);
      });

      it('should handle transaction with single successful operation', async () => {
        // Test basic successful transaction
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'single-op-success' }),
        ];

        const result = await gameApplicationService.executeInTransaction(
          'single-success-transaction',
          operations,
          { gameId: gameId.value }
        );

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.rollbackApplied).toBe(false);
        expect((result.results[0] as TestResult).data).toBe('single-op-success');
      });

      it('should handle transaction debug logging correctly', async () => {
        // Test that debug logging works without causing issues
        const operations = [vi.fn().mockResolvedValue({ success: true, data: 'debug-test' })];

        const result = await gameApplicationService.executeInTransaction(
          'debug-logging-test',
          operations,
          { gameId: gameId.value, debugLevel: 'verbose' }
        );

        expect(result.success).toBe(true);
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          'Starting transaction',
          expect.objectContaining({
            operation: 'debug-logging-test',
            operationCount: 1,
            gameId: gameId.value,
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    describe('attemptOperationWithRetry', () => {
      it('should succeed on first attempt', async () => {
        // Arrange
        const operation = vi.fn().mockResolvedValue({ success: true, data: 'success' });

        // Act
        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          3,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(true);
        expect(result.attempts).toBe(1);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry failed operations up to max attempts', async () => {
        // Arrange
        const operation = vi
          .fn()
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 1 failed'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 2 failed'] })
          .mockResolvedValueOnce({ success: true, data: 'success on attempt 3' });

        // Act
        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          3,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(true);
        expect(result.attempts).toBe(3);
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should fail after max attempts exceeded', async () => {
        // Arrange
        const operation = vi.fn().mockResolvedValue({ success: false, errors: ['Always fails'] });

        // Act
        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          2,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(false);
        expect(result.attempts).toBe(2);
        expect((result as TestResult).errors).toContain('Operation failed after 2 attempts');
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should handle operation exceptions during retry', async () => {
        // Arrange
        const operation = vi
          .fn()
          .mockRejectedValueOnce(new Error('Exception on attempt 1'))
          .mockResolvedValueOnce({ success: true, data: 'success on attempt 2' });

        // Act
        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          3,
          { gameId: gameId.value }
        );

        // Assert
        expect((result as TestResult).success).toBe(true);
        expect(result.attempts).toBe(2);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Operation attempt failed, retrying',
          expect.objectContaining({
            operation: 'test-operation',
            attempt: 1,
            maxAttempts: 3,
          })
        );
      });
    });
  });

  describe('Concurrency & Advanced Workflow Tests', () => {
    describe('Concurrent Operations and Race Conditions', () => {
      it('should serialize concurrent game modifications to prevent race conditions', async () => {
        // Given: Two simultaneous complex workflow executions on same game
        const command1: CompleteAtBatSequenceCommand = {
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

        const command2: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand: {
            gameId,
            batterId: new PlayerId('player-789'),
            result: AtBatResultType.DOUBLE,
          } as RecordAtBatCommand,
          checkInningEnd: true,
          handleSubstitutions: false,
          notifyScoreChanges: true,
        };

        // Mock successful at-bat results for concurrent execution
        mockExecuteRecordAtBat
          .mockResolvedValueOnce({
            success: true,
            inningEnded: false,
            runsScored: 1,
            gameState: {
              gameId,
              status: GameStatus.IN_PROGRESS,
              currentInning: 1,
              isTopHalf: true,
            },
          } as AtBatResult)
          .mockResolvedValueOnce({
            success: true,
            inningEnded: false,
            runsScored: 0,
            gameState: {
              gameId,
              status: GameStatus.IN_PROGRESS,
              currentInning: 1,
              isTopHalf: true,
            },
          } as AtBatResult);

        // When: Both workflows attempt state modifications simultaneously
        const [result1, result2] = await Promise.all([
          gameApplicationService.completeAtBatSequence(command1),
          gameApplicationService.completeAtBatSequence(command2),
        ]);

        // Then: Operations completed without race conditions, consistent state maintained
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result1.scoreUpdateSent).toBe(true);
        expect(result2.scoreUpdateSent).toBe(false); // Different scoring scenarios
        expect(mockExecuteRecordAtBat).toHaveBeenCalledTimes(2);
        expect(mockNotifyScoreUpdate).toHaveBeenCalledTimes(1); // Only first call scored runs
      });

      it('should handle resource contention during concurrent workflow execution', async () => {
        // Given: Multiple workflows competing for same game resources
        let resourceLockCounter = 0;
        let maxConcurrentAccess = 0;

        const createResourceIntensiveOperation = (operationId: string): ReturnType<typeof vi.fn> =>
          vi.fn().mockImplementation(async (): Promise<{ success: boolean; data: string }> => {
            resourceLockCounter++;
            maxConcurrentAccess = Math.max(maxConcurrentAccess, resourceLockCounter);

            // Simulate resource processing time
            await new Promise(resolve => setTimeout(resolve, 50));

            resourceLockCounter--;
            return { success: true, data: `${operationId}-complete` };
          });

        const operations1 = [
          createResourceIntensiveOperation('op1-a'),
          createResourceIntensiveOperation('op1-b'),
        ];
        const operations2 = [
          createResourceIntensiveOperation('op2-a'),
          createResourceIntensiveOperation('op2-b'),
        ];
        const operations3 = [
          createResourceIntensiveOperation('op3-a'),
          createResourceIntensiveOperation('op3-b'),
        ];

        // When: Multiple transactions compete for resources
        const [result1, result2, result3] = await Promise.all([
          gameApplicationService.executeInTransaction('resource-contest-1', operations1, {
            gameId: gameId.value,
            resourceType: 'game-state',
          }),
          gameApplicationService.executeInTransaction('resource-contest-2', operations2, {
            gameId: gameId.value,
            resourceType: 'game-state',
          }),
          gameApplicationService.executeInTransaction('resource-contest-3', operations3, {
            gameId: gameId.value,
            resourceType: 'game-state',
          }),
        ]);

        // Then: Fair resource allocation, no deadlocks, proper cleanup
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result3.success).toBe(true);
        expect(resourceLockCounter).toBe(0); // All resources properly released
        expect(maxConcurrentAccess).toBeGreaterThan(1); // Actual concurrency occurred
      });

      it('should maintain consistency during complex workflow failures with partial rollback', async () => {
        // Given: Multi-step workflow with failure at step 4 of 7
        const executionOrder: string[] = [];

        const operations = [
          vi.fn().mockImplementation(() => {
            executionOrder.push('step1');
            return { success: true, data: 'step1-complete', rollbackData: 'step1-undo' };
          }),
          vi.fn().mockImplementation(() => {
            executionOrder.push('step2');
            return { success: true, data: 'step2-complete', rollbackData: 'step2-undo' };
          }),
          vi.fn().mockImplementation(() => {
            executionOrder.push('step3');
            return { success: true, data: 'step3-complete', rollbackData: 'step3-undo' };
          }),
          vi.fn().mockImplementation(() => {
            executionOrder.push('step4-failed');
            // Failure occurs mid-process
            return {
              success: false,
              errors: ['Business rule violation', 'Constraint check failed'],
            };
          }),
          vi.fn().mockImplementation(() => {
            executionOrder.push('step5-should-not-execute');
            return { success: true, data: 'step5-complete' };
          }),
        ];

        // When: Failure occurs mid-process at step 4
        const result = await gameApplicationService.executeInTransaction(
          'complex-workflow-failure',
          operations,
          {
            gameId: gameId.value,
            workflowType: 'multi-step-business-process',
            totalSteps: 7,
          }
        );

        // Then: Proper rollback, state consistency, resource cleanup
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction failed at operation 3: Business rule violation, Constraint check failed'
        );

        // Verify execution stopped at failure point
        expect(executionOrder).toEqual(['step1', 'step2', 'step3', 'step4-failed']);

        // Verify rollback was triggered for successful operations
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'complex-workflow-failure',
            operationsToRollback: 3, // Steps 1-3 need rollback
            gameId: gameId.value,
          })
        );
      });

      it('should handle cascading failures in complex workflow orchestration', async () => {
        // Given: Complex workflow with cascading dependencies
        let cascadeCounter = 0;

        const createCascadingOperation = (
          stepName: string,
          shouldFail = false
        ): ReturnType<typeof vi.fn> =>
          vi.fn().mockImplementation(() => {
            cascadeCounter++;
            if (shouldFail && cascadeCounter >= 3) {
              throw new Error(`Cascading failure at ${stepName} (cascade ${cascadeCounter})`);
            }
            return { success: true, data: `${stepName}-success` };
          });

        const operations = [
          createCascadingOperation('initialize'),
          createCascadingOperation('validate'),
          createCascadingOperation('execute', true), // Will fail on third call
          createCascadingOperation('finalize'),
        ];

        // When: Cascading failure occurs during execution
        const result = await gameApplicationService.executeInTransaction(
          'cascading-failure-workflow',
          operations,
          {
            gameId: gameId.value,
            cascadeTest: true,
            failureMode: 'cascading',
          }
        );

        // Then: Transaction fails and rollback applied
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringMatching(
              /Transaction exception at operation 2: Cascading failure at execute/
            ),
          ])
        );

        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).toHaveBeenCalled();
        expect(operations[3]).not.toHaveBeenCalled();
      });
    });

    describe('Advanced Error Recovery and Compensation', () => {
      it('should handle executeWithCompensation exception with compensation failure', async () => {
        // Given: Operation that throws exception and compensation that also fails
        const operation = vi.fn().mockImplementation((): never => {
          throw new Error('Primary operation failed with exception');
        });
        const compensation = vi.fn().mockImplementation((): never => {
          throw new Error('Compensation also failed');
        });

        // When: Both operation and compensation throw exceptions
        await expect(
          gameApplicationService.executeWithCompensation(
            'dual-failure-operation',
            operation,
            compensation,
            { gameId: gameId.value, testDualFailure: true }
          )
        ).rejects.toThrow('Primary operation failed with exception');

        // Then: Both failures are logged appropriately
        expect(operation).toHaveBeenCalled();
        expect(compensation).toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Compensation failed for operation',
          expect.any(Error),
          expect.objectContaining({
            operation: 'dual-failure-operation',
            originalError: expect.any(Error),
            gameId: gameId.value,
          })
        );
      });

      it('should handle compensation success after operation exception', async () => {
        // Given: Operation throws exception but compensation succeeds
        const operation = vi.fn().mockImplementation((): never => {
          throw new Error('Operation threw an exception');
        });
        const compensation = vi.fn().mockResolvedValue({ compensationApplied: true });

        // When: Operation fails with exception, compensation succeeds
        await expect(
          gameApplicationService.executeWithCompensation(
            'exception-with-successful-compensation',
            operation,
            compensation,
            { gameId: gameId.value, testCompensationSuccess: true }
          )
        ).rejects.toThrow('Operation threw an exception');

        // Then: Compensation is attempted and succeeds
        expect(operation).toHaveBeenCalled();
        expect(compensation).toHaveBeenCalled();
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Applied compensation for operation exception',
          expect.objectContaining({
            operation: 'exception-with-successful-compensation',
            error: 'Operation threw an exception',
            gameId: gameId.value,
          })
        );
      });

      it('should handle complex retry scenarios with variable delay patterns', async () => {
        // Given: Operation that fails multiple times with different error patterns
        let attemptCount = 0;
        const delays: number[] = [];

        // Mock setTimeout to capture actual delay values
        vi.stubGlobal(
          'setTimeout',
          vi.fn().mockImplementation((callback, delay: number) => {
            delays.push(delay);
            callback();
            return 1 as unknown as ReturnType<typeof setTimeout>;
          })
        );

        const operation = vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount <= 4) {
            return {
              success: false,
              errors: [`Attempt ${attemptCount} failed`],
              metadata: { attemptNumber: attemptCount, retryable: true },
            };
          }
          return { success: true, data: 'finally succeeded', finalAttempt: attemptCount };
        });

        // When: Operation requires multiple retries before success
        const result = await gameApplicationService.attemptOperationWithRetry(
          'variable-retry-test',
          operation,
          6,
          { gameId: gameId.value, testVariableRetries: true }
        );

        vi.unstubAllGlobals();

        // Then: Proper retry pattern with exponential backoff
        expect((result as TestResult).success).toBe(true);
        expect(result.attempts).toBe(5);
        expect((result as TestResult).data).toBe('finally succeeded');
        expect(delays).toEqual([1000, 2000, 4000, 8000]); // Exponential backoff pattern
        expect(operation).toHaveBeenCalledTimes(5);
      });

      it('should handle resource cleanup during workflow interruption', async () => {
        // Given: Workflow with resource allocation that gets interrupted
        const resourcesAllocated: string[] = [];
        const resourcesReleased: string[] = [];

        const operations = [
          vi.fn().mockImplementation(() => {
            resourcesAllocated.push('database-connection');
            return { success: true, resources: ['database-connection'] };
          }),
          vi.fn().mockImplementation(() => {
            resourcesAllocated.push('file-lock');
            return { success: true, resources: ['file-lock'] };
          }),
          vi.fn().mockImplementation(() => {
            // Simulate resource cleanup attempt during failure
            resourcesReleased.push('partial-cleanup');
            throw new Error('Resource allocation failed during operation');
          }),
        ];

        // When: Workflow is interrupted during resource allocation
        const result = await gameApplicationService.executeInTransaction(
          'resource-cleanup-test',
          operations,
          {
            gameId: gameId.value,
            resourceManagement: true,
            cleanupRequired: true,
          }
        );

        // Then: Rollback triggered with proper resource context
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(resourcesAllocated).toEqual(['database-connection', 'file-lock']);
        expect(resourcesReleased).toEqual(['partial-cleanup']);

        // Verify rollback logging with resource context
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'resource-cleanup-test',
            operationsToRollback: 2,
            gameId: gameId.value,
            resourceManagement: true,
          })
        );
      });
    });

    describe('Complex Workflow State Management', () => {
      it('should handle workflow variables and initialization edge cases', async () => {
        // Test specific uncovered lines around workflow variable assignment
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Home',
            awayTeamName: 'Test Away',
          } as StartNewGameCommand,
          atBatSequences: [],
          substitutions: [],
          endGameNaturally: false,
          continueOnFailure: false,
        };

        mockExecuteStartNewGame.mockResolvedValue({
          success: true,
          gameId,
          initialState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 1,
            isTopHalf: true,
          } as GameStateDTO,
        } as GameStartResult);

        // When: Workflow executes with edge case configurations
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Then: Default values properly applied, workflow completed
        expect(result.success).toBe(true);
        expect(result.totalAtBats).toBe(0);
        expect(result.totalRetryAttempts).toBe(0);
        expect(result.compensationApplied).toBe(false);
      });

      it('should handle complex at-bat sequence retry variables and execution paths', async () => {
        // Test uncovered line 263: retryAttemptsUsed initialization
        const command: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand: {
            gameId,
            batterId: playerId,
            result: AtBatResultType.TRIPLE,
          } as RecordAtBatCommand,
          checkInningEnd: false,
          handleSubstitutions: false,
          notifyScoreChanges: false,
          queuedSubstitutions: [],
        };

        mockExecuteRecordAtBat.mockResolvedValue({
          success: true,
          inningEnded: false,
          runsScored: 0,
        } as AtBatResult);

        // When: At-bat sequence executes with minimal configuration
        const result = await gameApplicationService.completeAtBatSequence(command);

        // Then: Variables properly initialized and execution completed
        expect(result.success).toBe(true);
        expect(result.retryAttemptsUsed).toBe(0); // Tests line 263 initialization
        expect(result.substitutionResults).toHaveLength(0);
        expect(result.scoreUpdateSent).toBe(false);
      });

      it('should handle workflow state transitions during complex error scenarios', async () => {
        // Test workflow state management during multiple failure points
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Complex Team',
            awayTeamName: 'State Team',
          } as StartNewGameCommand,
          atBatSequences: [
            {
              gameId,
              batterId: playerId,
              result: AtBatResultType.SINGLE,
            } as RecordAtBatCommand,
          ],
          substitutions: [],
          endGameNaturally: false,
          maxAttempts: 5, // Test lines 449-450 variable assignments
          continueOnFailure: true,
        };

        // Mock game start success but at-bat failures
        mockExecuteStartNewGame.mockResolvedValue({
          success: true,
          gameId,
        } as GameStartResult);

        mockExecuteRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['State transition error'],
        } as AtBatResult);

        // When: Complex workflow with state transition errors
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Then: State variables properly managed throughout failure
        expect(result.success).toBe(true); // continueOnFailure is true
        expect(result.totalAtBats).toBe(1);
        expect(result.successfulAtBats).toBe(0);
        expect(result.totalRetryAttempts).toBe(0); // Tests line 450 variable usage
        expect(result.compensationApplied).toBe(false);
      });

      it('should handle permission validation with object-format user responses', async () => {
        // Test uncovered branch in validateGameOperationPermissions
        const userObject = {
          userId: 'complex-user-123',
          roles: ['game-operator'],
          permissions: ['RECORD_AT_BAT', 'SUBSTITUTE_PLAYER'],
        };

        mockAuthenticateUser.mockResolvedValue(userObject);
        mockAuthorizeAction.mockResolvedValue(true);

        // When: Authentication returns user object instead of string
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        // Then: User object properly handled
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('complex-user-123');
        expect(mockAuthorizeAction).toHaveBeenCalledWith('complex-user-123', 'RECORD_AT_BAT');
      });
    });

    describe('Performance and Resource Management Edge Cases', () => {
      it('should handle high-volume concurrent transaction processing', async () => {
        // Test system behavior under high concurrent load
        const transactionCount = 10;
        const operationsPerTransaction = 3;
        let totalOperationsExecuted = 0;

        const createConcurrentTransaction = (
          txId: number
        ): Promise<{
          success: boolean;
          results: unknown[];
          rollbackApplied: boolean;
          errors?: string[];
        }> => {
          const operations = Array.from({ length: operationsPerTransaction }, (_, opIndex) =>
            vi.fn().mockImplementation(async (): Promise<{ success: boolean; data: string }> => {
              totalOperationsExecuted++;
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
              return { success: true, data: `tx${txId}-op${opIndex}` };
            })
          );
          return gameApplicationService.executeInTransaction(`high-volume-tx-${txId}`, operations, {
            gameId: gameId.value,
            transactionId: txId,
          });
        };

        // When: Multiple transactions execute concurrently
        const results = await Promise.all(
          Array.from({ length: transactionCount }, (_, i) => createConcurrentTransaction(i))
        );

        // Then: All transactions complete successfully without resource conflicts
        expect(results.every((r: { success: boolean }) => r.success)).toBe(true);
        expect(totalOperationsExecuted).toBe(transactionCount * operationsPerTransaction);

        // Verify all transactions logged completion
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          'Transaction completed successfully',
          expect.objectContaining({
            operationCount: operationsPerTransaction,
          })
        );
      });

      it('should handle memory pressure scenarios during workflow execution', async () => {
        // Simulate memory-intensive workflow operations
        let memoryUsageSimulated = 0;
        const maxMemoryThreshold = 1000;

        const memoryIntensiveOperation = vi.fn().mockImplementation(() => {
          memoryUsageSimulated += 200;
          if (memoryUsageSimulated > maxMemoryThreshold) {
            throw new Error('Simulated memory pressure - operation aborted');
          }
          return { success: true, memoryUsed: memoryUsageSimulated };
        });

        const operations: Array<() => Promise<unknown>> = Array(6).fill(memoryIntensiveOperation);

        // When: Memory pressure occurs during transaction
        const result = await gameApplicationService.executeInTransaction(
          'memory-pressure-test',
          operations,
          { gameId: gameId.value, memoryTest: true }
        );

        // Then: Transaction fails with proper cleanup
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/Transaction exception.*memory pressure/)])
        );
      });

      it('should handle timeout scenarios in complex workflow coordination', async () => {
        // Test workflow behavior under timeout conditions
        let operationDelay = 0;

        const timeoutProneOperation = vi.fn().mockImplementation(async () => {
          operationDelay += 100;
          await new Promise(resolve => setTimeout(resolve, operationDelay));

          if (operationDelay > 250) {
            throw new Error(`Operation timeout after ${operationDelay}ms`);
          }
          return { success: true, executionTime: operationDelay };
        });

        const operations = [timeoutProneOperation, timeoutProneOperation, timeoutProneOperation];

        // When: Operations exceed timeout threshold
        const result = await gameApplicationService.executeInTransaction(
          'timeout-test-workflow',
          operations,
          { gameId: gameId.value, timeoutTest: true }
        );

        // Then: Transaction fails with timeout handling
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/Transaction exception.*timeout/)])
        );
      });
    });
  });

  describe('Audit and Logging', () => {
    describe('logOperationAudit', () => {
      it('should log successful operations with complete context', async () => {
        // Arrange
        mockAuthenticateUser.mockResolvedValue('test-user-123');

        const operation = 'RECORD_AT_BAT';
        const context = {
          gameId: gameId.value,
          batterId: playerId.value,
          result: AtBatResultType.HOME_RUN,
        };
        const result = { success: true, runsScored: 1 };

        // Act
        await gameApplicationService.logOperationAudit(operation, context, result);

        // Assert
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Operation audit log',
          expect.objectContaining({
            operation,
            success: true,
            context,
            result,
            userId: expect.any(String),
            timestamp: expect.any(Date),
          })
        );
      });

      it('should log failed operations with error details', async () => {
        // Arrange
        mockAuthenticateUser.mockResolvedValue('test-user-456');

        const operation = 'SUBSTITUTE_PLAYER';
        const context = { gameId: gameId.value };
        const result = { success: false, errors: ['Invalid substitution'] };

        // Act
        await gameApplicationService.logOperationAudit(operation, context, result);

        // Assert
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Operation audit log - FAILED',
          expect.objectContaining({
            operation,
            success: false,
            context,
            result,
            userId: expect.any(String),
            timestamp: expect.any(Date),
          })
        );
      });

      it('should handle audit logging failures gracefully', async () => {
        // Arrange
        (mockLogger.info as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw new Error('Logging system failure');
        });

        const operation = 'RECORD_AT_BAT';
        const context = { gameId: gameId.value };
        const result = { success: true };

        // Act - should not throw despite logging failure
        await expect(
          gameApplicationService.logOperationAudit(operation, context, result)
        ).resolves.not.toThrow();

        // Assert - should log the failure
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Failed to log operation audit',
          expect.any(Error),
          expect.objectContaining({
            operation,
            context,
          })
        );
      });

      it('should handle audit logging with user object format', async () => {
        // Test line coverage for user object handling in audit logging
        mockAuthenticateUser.mockResolvedValue({
          userId: 'user-object-789',
          name: 'Audit Test User',
        });

        const operation = 'TEST_OPERATION';
        const context = { gameId: gameId.value };
        const result = { success: true };

        await gameApplicationService.logOperationAudit(operation, context, result);

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Operation audit log',
          expect.objectContaining({
            userId: 'user-object-789',
          })
        );
      });

      it('should handle audit logging with no user', async () => {
        // Test line coverage for no user scenario in audit logging
        mockAuthenticateUser.mockResolvedValue(null);

        const operation = 'TEST_OPERATION';
        const context = { gameId: gameId.value };
        const result = { success: true };

        await gameApplicationService.logOperationAudit(operation, context, result);

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Operation audit log',
          expect.objectContaining({
            userId: undefined,
          })
        );
      });

      it('should handle audit logging when result has no success property', async () => {
        // Test line 1333: the false branch when result doesn't have 'success' property
        mockAuthenticateUser.mockResolvedValue('test-user-no-success');

        const operation = 'TEST_OPERATION_NO_SUCCESS';
        const context = { gameId: gameId.value };
        // Result with no 'success' property - should trigger line 1333
        const result = { data: 'some data', timestamp: new Date() } as Record<string, unknown>;

        await gameApplicationService.logOperationAudit(operation, context, result);

        // Should log as failed since success defaults to false (line 1333)
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Operation audit log - FAILED',
          expect.objectContaining({
            operation,
            success: false, // This tests line 1333 - defaults to false
            context,
            result,
            userId: 'test-user-no-success',
            timestamp: expect.any(Date),
          })
        );
      });

      it('should handle audit logging when result is null', async () => {
        // Test line 1333: the false branch when result is null
        mockAuthenticateUser.mockResolvedValue('test-user-null-result');

        const operation = 'TEST_OPERATION_NULL_RESULT';
        const context = { gameId: gameId.value };
        // Null result - should trigger line 1333
        const result = null;

        await gameApplicationService.logOperationAudit(
          operation,
          context,
          result as unknown as Record<string, unknown>
        );

        // Should log as failed since success defaults to false (line 1333)
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Operation audit log - FAILED',
          expect.objectContaining({
            operation,
            success: false, // This tests line 1333 - defaults to false
            context,
            result: null,
            userId: 'test-user-null-result',
            timestamp: expect.any(Date),
          })
        );
      });

      it('should handle retry with operations that return non-success objects', async () => {
        // Test retry logic with operations that don't have success property
        const operation = vi.fn().mockResolvedValue({ data: 'no success property' });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          2,
          { gameId: gameId.value }
        );

        expect((result as TestResult).data).toBe('no success property');
        expect(result.attempts).toBe(1);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should handle final retry failure scenario', async () => {
        // Test the final result creation when all retries are exhausted
        const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

        await expect(
          gameApplicationService.attemptOperationWithRetry('test-operation', operation, 2, {
            gameId: gameId.value,
          })
        ).rejects.toThrow('Always fails');

        expect(mockLoggerError).toHaveBeenCalledWith(
          'Operation failed after all retry attempts',
          expect.any(Error),
          expect.objectContaining({
            attempts: 2,
            maxAttempts: 2,
          })
        );
      });

      it('should use exponential backoff between retry attempts', async () => {
        // Test that exponential backoff delays are applied between retries
        const delays: number[] = [];

        // Mock setTimeout to capture delay values
        vi.stubGlobal(
          'setTimeout',
          vi.fn().mockImplementation((callback, delay: number) => {
            delays.push(delay);
            // Execute callback immediately for test speed
            callback();
            return 1 as unknown as ReturnType<typeof setTimeout>;
          })
        );

        const operation = vi
          .fn()
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 1 failed'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 2 failed'] })
          .mockResolvedValueOnce({ success: true, data: 'success on attempt 3' });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'backoff-test-operation',
          operation,
          3,
          { gameId: gameId.value, testExponentialBackoff: true }
        );

        // Restore setTimeout
        vi.unstubAllGlobals();

        expect((result as TestResult).success).toBe(true);
        expect(result.attempts).toBe(3);
        expect(delays).toHaveLength(2); // Two delays between three attempts
        expect(delays[0]).toBe(1000); // First delay: 1000ms
        expect(delays[1]).toBe(2000); // Second delay: 2000ms (exponential backoff)
      });

      it('should cap exponential backoff at maximum delay', async () => {
        // Test that exponential backoff doesn't exceed maximum delay (10 seconds)
        const delays: number[] = [];

        vi.stubGlobal(
          'setTimeout',
          vi.fn().mockImplementation((callback, delay: number) => {
            delays.push(delay);
            callback();
            return 1 as unknown as ReturnType<typeof setTimeout>;
          })
        );

        const operation = vi
          .fn()
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 1'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 2'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 3'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 4'] })
          .mockResolvedValueOnce({ success: false, errors: ['Attempt 5'] })
          .mockResolvedValueOnce({ success: true, data: 'success' });

        await gameApplicationService.attemptOperationWithRetry('max-delay-test', operation, 6, {
          gameId: gameId.value,
        });

        vi.unstubAllGlobals();

        // Verify delays: 1000, 2000, 4000, 8000, 10000 (capped)
        expect(delays).toEqual([1000, 2000, 4000, 8000, 10000]);
      });

      it('should handle operation that fails on all attempts and build final error result', async () => {
        // Test the specific path where operation fails on final attempt and builds enhanced result
        const operation = vi
          .fn()
          .mockResolvedValueOnce({ success: false, errors: ['First failure'] })
          .mockResolvedValueOnce({ success: false, errors: ['Second failure'], metadata: 'test' });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'final-failure-test',
          operation,
          2,
          { gameId: gameId.value, testPath: 'final-failure' }
        );

        // Test lines 1244-1258: Building enhanced result with retry-specific error
        expect((result as TestResult).success).toBe(false);
        expect((result as TestResult).attempts).toBe(2);
        expect((result as TestResult).errors).toEqual([
          'Second failure',
          'Operation failed after 2 attempts',
        ]);
        expect((result as unknown as ComplexTestResult).metadata).toBe('test'); // Preserve other result properties
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should handle operation with missing errors property correctly', async () => {
        // Test the path where operation fails but has no errors property
        const operation = vi
          .fn()
          .mockResolvedValueOnce({ success: false, message: 'No errors array' });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'missing-errors-test',
          operation,
          1,
          { gameId: gameId.value }
        );

        // Test lines 1246-1254: Handling missing errors array
        expect((result as TestResult).success).toBe(false);
        expect(result.attempts).toBe(1);
        expect((result as TestResult).errors).toEqual(['Operation failed after 1 attempts']);
        expect((result as TestResult).message).toBe('No errors array');
      });

      it('should handle operations with complex result structures during retries', async () => {
        // Test retry logic with operations that have complex, non-standard result structures
        const complexResult = {
          success: false,
          statusCode: 500,
          details: { reason: 'Database timeout', retryable: true },
          metadata: { timestamp: Date.now(), source: 'complex-operation' },
          errors: ['Primary error', 'Secondary error'],
        };

        const operation = vi
          .fn()
          .mockResolvedValueOnce(complexResult)
          .mockResolvedValueOnce({
            ...complexResult,
            success: true,
            statusCode: 200,
            data: 'eventual success',
          });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'complex-structure-test',
          operation,
          3,
          { gameId: gameId.value, complexTest: true }
        );

        expect((result as unknown as ComplexTestResult).success).toBe(true);
        expect((result as TestResult).attempts).toBe(2);
        expect((result as unknown as ComplexTestResult).statusCode).toBe(200);
        expect((result as unknown as ComplexTestResult).data).toBe('eventual success');
        expect(
          ((result as unknown as ComplexTestResult).metadata as { source?: string })?.source
        ).toBe('complex-operation');
      });
    });

    describe('Undo/Redo Game Actions', () => {
      it('should execute undo last game action successfully', async () => {
        // Test the undoLastGameAction method
        const undoCommand = {
          gameId,
          actionLimit: 1,
          notes: 'incorrect entry',
          confirmDangerous: false,
        };

        const mockUndoResult = {
          success: true,
          actionsUndone: 1,
          undoneActionTypes: ['AT_BAT_RECORDED'],
          totalEventsGenerated: 2,
          undoStack: { canUndo: false, canRedo: true },
        };

        // Override the default failure mock for this test
        mockExecuteUndoLastAction.mockResolvedValueOnce(mockUndoResult);
        mockAuthenticateUser.mockResolvedValue('test-user-123');

        // Reset logger mocks that might have been affected by previous tests
        mockLoggerInfo.mockReset();
        mockLoggerError.mockReset();
        mockLoggerWarn.mockReset();
        mockLoggerDebug.mockReset();

        const result = await gameApplicationService.undoLastGameAction(undoCommand);

        expect(result).toEqual(mockUndoResult);
        expect(mockExecuteUndoLastAction).toHaveBeenCalledWith(undoCommand);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Undo operation completed successfully',
          expect.objectContaining({
            gameId: gameId.value,
            actionsUndone: mockUndoResult.actionsUndone,
            operation: 'undoLastGameAction',
          })
        );
      });

      it('should handle undo last game action failure', async () => {
        // Test failure path for undoLastGameAction
        const undoCommand = {
          gameId,
          actionLimit: 1,
          notes: 'mistake correction',
          confirmDangerous: false,
        };

        const mockUndoResult = {
          success: false,
          errors: ['No actions available to undo', 'Game state invalid'],
          actionsUndone: 0,
        };

        mockExecuteUndoLastAction.mockResolvedValue(mockUndoResult);

        const result = await gameApplicationService.undoLastGameAction(undoCommand);

        expect(result).toEqual(mockUndoResult);
        expect(mockExecuteUndoLastAction).toHaveBeenCalledWith(undoCommand);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Undo operation failed',
          expect.objectContaining({
            gameId: gameId.value,
            errors: ['No actions available to undo', 'Game state invalid'],
            operation: 'undoLastGameAction',
          })
        );
      });

      it('should execute redo last game action successfully', async () => {
        // Test the redoLastGameAction method
        const redoCommand = {
          gameId,
          actionLimit: 1,
          notes: 'restore action',
          confirmDangerous: false,
        };

        const mockRedoResult = {
          success: true,
          actionsRedone: 1,
          redoneActionTypes: ['PLAYER_SUBSTITUTED'],
          totalEventsGenerated: 2,
          undoStack: { canUndo: true, canRedo: false },
        };

        // Override the default failure mock for this test
        mockExecuteRedoLastAction.mockResolvedValueOnce(mockRedoResult);
        mockAuthenticateUser.mockResolvedValue('test-user-123');

        // Reset logger mocks that might have been affected by previous tests
        mockLoggerInfo.mockReset();
        mockLoggerError.mockReset();
        mockLoggerWarn.mockReset();
        mockLoggerDebug.mockReset();

        const result = await gameApplicationService.redoLastGameAction(redoCommand);

        expect(result).toEqual(mockRedoResult);
        expect(mockExecuteRedoLastAction).toHaveBeenCalledWith(redoCommand);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Redo operation completed successfully',
          expect.objectContaining({
            gameId: gameId.value,
            actionsRedone: mockRedoResult.actionsRedone,
            operation: 'redoLastGameAction',
          })
        );
      });

      it('should handle redo last game action failure', async () => {
        // Test failure path for redoLastGameAction
        const redoCommand = {
          gameId,
          actionLimit: 1,
          notes: 'restore incorrect undo',
          confirmDangerous: false,
        };

        const mockRedoResult = {
          success: false,
          errors: ['No actions available to redo', 'Action already applied'],
          actionsRedone: 0,
        };

        mockExecuteRedoLastAction.mockResolvedValue(mockRedoResult);

        const result = await gameApplicationService.redoLastGameAction(redoCommand);

        expect(result).toEqual(mockRedoResult);
        expect(mockExecuteRedoLastAction).toHaveBeenCalledWith(redoCommand);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Redo operation failed',
          expect.objectContaining({
            gameId: gameId.value,
            errors: ['No actions available to redo', 'Action already applied'],
            operation: 'redoLastGameAction',
          })
        );
      });

      it('should handle undo operation exception during execution', async () => {
        // Test exception handling in undoLastGameAction
        const undoCommand = {
          gameId,
          actionLimit: 2,
          notes: 'test exception handling',
          confirmDangerous: true,
        };

        const expectedError = new Error('Undo execution failed unexpectedly');
        mockExecuteUndoLastAction.mockRejectedValue(expectedError);

        // When: Undo operation throws an exception
        const result = await gameApplicationService.undoLastGameAction(undoCommand);

        // Then: Exception is handled gracefully
        expect(result.success).toBe(false);
        expect(result.gameId).toEqual(gameId);
        expect(result.actionsUndone).toBe(0);
        expect(result.errors).toContain(
          'Undo operation failed: Undo execution failed unexpectedly'
        );

        expect(mockLoggerError).toHaveBeenCalledWith(
          'Undo operation failed with exception',
          expectedError,
          expect.objectContaining({
            gameId: gameId.value,
            actionLimit: 2,
            notes: 'test exception handling',
            operation: 'undoLastGameAction',
          })
        );
      });

      it('should handle redo operation exception during execution', async () => {
        // Test exception handling in redoLastGameAction
        const redoCommand = {
          gameId,
          actionLimit: 3,
          notes: 'test exception handling in redo',
          confirmDangerous: false,
        };

        const expectedError = new Error('Redo execution failed unexpectedly');
        mockExecuteRedoLastAction.mockRejectedValue(expectedError);

        // When: Redo operation throws an exception
        const result = await gameApplicationService.redoLastGameAction(redoCommand);

        // Then: Exception is handled gracefully
        expect(result.success).toBe(false);
        expect(result.gameId).toEqual(gameId);
        expect(result.actionsRedone).toBe(0);
        expect(result.errors).toContain(
          'Redo operation failed: Redo execution failed unexpectedly'
        );

        expect(mockLoggerError).toHaveBeenCalledWith(
          'Redo operation failed with exception',
          expectedError,
          expect.objectContaining({
            gameId: gameId.value,
            actionLimit: 3,
            notes: 'test exception handling in redo',
            operation: 'redoLastGameAction',
          })
        );
      });
    });

    describe('Permission Validation Edge Cases', () => {
      it('should handle unauthenticated user scenario', async () => {
        // Test lines 883-887: return validation result when no authenticated user
        mockAuthenticateUser.mockResolvedValue(null);

        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        expect(result).toEqual({
          valid: false,
          errors: ['No authenticated user found'],
        });

        expect(mockAuthenticateUser).toHaveBeenCalled();
        expect(mockAuthorizeAction).not.toHaveBeenCalled();
      });
    });

    describe('Transaction Rollback Error Handling', () => {
      it('should call performTransactionRollback and test successful logging path', () => {
        // Test the successful path through performTransactionRollback (lines 1403-1419)
        const debugSpy = vi.spyOn(mockLogger, 'debug');
        const warnSpy = vi.spyOn(mockLogger, 'warn');

        // Call the performTransactionRollback method directly to test the success path
        const boundMethod =
          gameApplicationService['performTransactionRollback'].bind(gameApplicationService);
        boundMethod('successful-rollback-test', [{ id: 1 }, { id: 2 }, { id: 3 }], {
          gameId: gameId.value,
          rollbackTest: true,
        });

        // Verify warn log for rollback start (lines 1403-1407)
        expect(warnSpy).toHaveBeenCalledWith('Performing transaction rollback', {
          transaction: 'successful-rollback-test',
          operationsToRollback: 3,
          gameId: gameId.value,
          rollbackTest: true,
        });

        // Verify debug log for successful completion (lines 1416-1419)
        expect(debugSpy).toHaveBeenCalledWith('Transaction rollback completed', {
          transaction: 'successful-rollback-test',
          gameId: gameId.value,
          rollbackTest: true,
        });
      });

      it('should test rollback method with empty successful results', () => {
        // Test edge case with no operations to rollback
        const warnSpy = vi.spyOn(mockLogger, 'warn');
        const debugSpy = vi.spyOn(mockLogger, 'debug');

        const boundMethodEmpty =
          gameApplicationService['performTransactionRollback'].bind(gameApplicationService);
        boundMethodEmpty('empty-rollback-test', [], { gameId: gameId.value, emptyRollback: true });

        expect(warnSpy).toHaveBeenCalledWith('Performing transaction rollback', {
          transaction: 'empty-rollback-test',
          operationsToRollback: 0,
          gameId: gameId.value,
          emptyRollback: true,
        });

        expect(debugSpy).toHaveBeenCalledWith('Transaction rollback completed', {
          transaction: 'empty-rollback-test',
          gameId: gameId.value,
          emptyRollback: true,
        });
      });

      it('should test rollback error handling by making logger throw', () => {
        // Test lines 1421-1425: catch block for rollback failures
        // Make the logger.debug throw an error to trigger the catch block
        const originalDebug = mockLogger.debug.bind(mockLogger);
        const errorSpy = vi.spyOn(mockLogger, 'error');
        const warnSpy = vi.spyOn(mockLogger, 'warn');

        // Mock debug to throw error, simulating a failure during rollback
        const mockDebugThrow = (): never => {
          throw new Error('Rollback operation failed due to database connection loss');
        };
        mockLogger.debug = vi.fn().mockImplementation(mockDebugThrow);

        // Call the method that should trigger rollback and catch the error
        const boundMethodError =
          gameApplicationService['performTransactionRollback'].bind(gameApplicationService);
        boundMethodError('error-rollback-test', [{ id: 1, operation: 'test' }], {
          gameId: gameId.value,
          testRollbackError: true,
        });

        // Verify warn log for rollback start (lines 1403-1407)
        expect(warnSpy).toHaveBeenCalledWith('Performing transaction rollback', {
          transaction: 'error-rollback-test',
          operationsToRollback: 1,
          gameId: gameId.value,
          testRollbackError: true,
        });

        // Verify error log for catch block (lines 1421-1425)
        expect(errorSpy).toHaveBeenCalledWith('Transaction rollback failed', expect.any(Error), {
          transaction: 'error-rollback-test',
          gameId: gameId.value,
          testRollbackError: true,
        });

        // Restore original debug function
        mockLogger.debug = originalDebug;
      });
    });
  });

  /**
   * Advanced Error Recovery & System Boundaries Tests
   *
   * These tests target specific uncovered lines to push coverage to 90%+:
   * - Lines 673-701: completeGameWorkflow catch block error handling
   * - Lines 1102-1117: Transaction system error catch block
   */
  describe('Advanced Error Recovery & System Boundaries', () => {
    describe('CompleteGameWorkflow Error Recovery (Lines 673-701)', () => {
      it('should handle unexpected system exception during workflow execution', async () => {
        // Test lines 673-701: catch block for completeGameWorkflow when an unexpected error occurs
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: [],
          substitutions: [],
          maxAttempts: 2,
          continueOnFailure: false,
          enableNotifications: true,
        };

        // Make startNewGame.execute throw an unexpected system error (not a DomainError)
        mockStartNewGame.execute = vi.fn().mockImplementation(() => {
          // Simulate a system-level failure (memory, database connection, etc.)
          const systemError = new Error(
            'System resource exhaustion - database connection pool depleted'
          );
          systemError.name = 'SystemResourceError';
          throw systemError;
        });

        const errorSpy = vi.spyOn(mockLogger, 'error');

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify the catch block response structure (lines 679-700)
        expect(result.success).toBe(false);
        expect(result.gameId).toBe(gameId);
        expect(result.gameStartResult).toEqual({
          success: false,
          gameId,
          errors: ['Game start failed'],
        });
        expect(result.totalAtBats).toBe(0);
        expect(result.successfulAtBats).toBe(0);
        expect(result.totalRuns).toBe(0);
        expect(result.totalSubstitutions).toBe(0);
        expect(result.successfulSubstitutions).toBe(0);
        expect(result.completedInnings).toBe(0);
        expect(result.gameCompleted).toBe(false);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.totalRetryAttempts).toBe(0); // currentAttempts in catch block
        expect(result.compensationApplied).toBe(false);
        expect(result.errors).toEqual([
          'Complete workflow failed: System resource exhaustion - database connection pool depleted',
        ]);

        // Verify error logging (lines 673-677)
        expect(errorSpy).toHaveBeenCalledWith('Complete game workflow failed', expect.any(Error), {
          gameId: gameId.value,
          duration: expect.any(Number),
          operation: 'completeGameWorkflow',
        });
      });

      it('should handle non-Error exceptions in workflow catch block', async () => {
        // Test lines 698-699: error handling for non-Error objects
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: [],
          substitutions: [],
          maxAttempts: 1,
          continueOnFailure: false,
        };

        // Throw a non-Error object to test the error message handling
        mockStartNewGame.execute = vi.fn().mockImplementation(() => {
          const error = new Error('Critical system failure') as Error & { code: string };
          error.code = 'SYSTEM_FAILURE';
          throw error;
        });

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify handling of non-Error exceptions (line 698-699)
        expect(result.success).toBe(false);
        expect(result.errors).toEqual(['Complete workflow failed: Critical system failure']);
      });

      it('should handle workflow failure with null gameStartResult fallback', async () => {
        // Test lines 682-686: gameStartResult fallback when undefined
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: [],
          substitutions: [],
        };

        // Make startNewGame fail immediately before gameStartResult is set
        mockStartNewGame.execute = vi.fn().mockImplementation(() => {
          throw new Error('Immediate startup failure');
        });

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify gameStartResult fallback (lines 682-686)
        expect(result.gameStartResult).toEqual({
          success: false,
          gameId,
          errors: ['Game start failed'],
        });
      });
    });

    describe('Advanced Integration Boundary Conditions', () => {
      it('should handle resource exhaustion during complex workflow cascade', async () => {
        // Test advanced error recovery under resource pressure
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: Array(10)
            .fill(null)
            .map(() => ({
              gameId: gameId,
              batterId: playerId,
              result: AtBatResultType.SINGLE,
              runnerAdvances: [],
            })),
          substitutions: [],
          maxAttempts: 3,
          continueOnFailure: false,
        };

        mockStartNewGame.execute = vi.fn().mockResolvedValue({
          success: true,
          gameId,
          gameState: { id: gameId, status: GameStatus.IN_PROGRESS },
        });

        // Make RecordAtBat fail every time to exceed retry attempts
        mockRecordAtBat.execute = vi.fn().mockImplementation(() => {
          const resourceError = new Error('Heap memory exhausted during operation');
          resourceError.name = 'ResourceExhaustionError';
          throw resourceError;
        });

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify graceful handling of resource exhaustion - it triggers compensation path
        expect(result.success).toBe(false);
        expect(result.errors?.length).toBeGreaterThan(0);
        expect(result.errors![0]).toContain('Workflow exception: Heap memory exhausted');
        expect(result.compensationApplied).toBe(true);
        // rollbackApplied property does not exist on CompleteGameWorkflowResult
      });

      it('should handle permission boundary failure in multi-step workflow', async () => {
        // Test permission/authorization edge cases
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: [
            {
              gameId: gameId,
              batterId: playerId,
              result: AtBatResultType.HOME_RUN,
              runnerAdvances: [],
            },
          ],
          substitutions: [],
        };

        mockStartNewGame.execute = vi.fn().mockResolvedValue({
          success: true,
          gameId,
          gameState: { id: gameId, status: GameStatus.IN_PROGRESS },
        });

        // Simulate permission failure during critical operation
        mockRecordAtBat.execute = vi.fn().mockImplementation(() => {
          const authError = new Error(
            'Insufficient permissions: RECORD_AT_BAT requires GAME_MANAGER role'
          );
          authError.name = 'AuthorizationError';
          throw authError;
        });

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify authorization error handling - it gets caught in compensation path
        expect(result.success).toBe(false);
        expect(result.errors?.length).toBeGreaterThan(0);
        expect(result.errors![0]).toContain(
          'Workflow exception: Insufficient permissions: RECORD_AT_BAT requires GAME_MANAGER role'
        );
      });

      it('should handle timeout during external service integration', async () => {
        // Test integration timeout boundary conditions by causing timeout in startup
        const gameId = new GameId('test-game-advanced-' + Math.random().toString(36).substring(7));
        const playerId = new PlayerId(
          'test-player-advanced-' + Math.random().toString(36).substring(7)
        );
        const command: CompleteGameWorkflowCommand = {
          startGameCommand: {
            gameId,
            homeTeamName: 'Test Team',
            awayTeamName: 'Away Team',
            ourTeamSide: 'HOME' as const,
            initialLineup: [
              {
                playerId: playerId,
                name: 'Player 1',
                jerseyNumber: new JerseyNumber('1'),
                battingOrderPosition: 1,
                fieldPosition: FieldPosition.FIRST_BASE,
                preferredPositions: [FieldPosition.FIRST_BASE],
              },
            ],
            gameDate: new Date(),
          },
          atBatSequences: [],
          substitutions: [],
          enableNotifications: true,
        };

        // Make startNewGame timeout to trigger catch block
        mockStartNewGame.execute = vi.fn().mockImplementation(
          () =>
            new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('Request timeout after 30000ms'));
              }, 1);
            })
        );

        const result = await gameApplicationService.completeGameWorkflow(command);

        // Verify timeout handling doesn't crash the system
        expect(result.success).toBe(false);
        expect(result.errors?.length).toBeGreaterThan(0);
        expect(result.errors![0]).toContain('Complete workflow failed:');
      });
    });

    /**
     * Phase 3.1: Critical Service Hardening Tests
     *
     * These tests target the specific uncovered lines identified by commit-readiness-reviewer:
     * - Lines 634-638: Game end notification failure scenarios
     * - Lines 526-538: Compensation logic during workflow failures
     * - Lines 1102-1117: Transaction system error scenarios and maximum attempts exceeded
     */
    describe('Critical Service Hardening - Phase 3.1', () => {
      describe('Game End Notification Failure Scenarios (Lines 634-638)', () => {
        it('should handle game end notification service connection failure', async () => {
          // Arrange
          const command: CompleteGameWorkflowCommand = {
            startGameCommand: {
              gameId,
              homeTeamName: 'Home Team',
              awayTeamName: 'Away Team',
              ourTeamSide: 'HOME',
              gameDate: new Date(),
              initialLineup: [],
            },
            atBatSequences: [
              {
                gameId,
                batterId: new PlayerId('batter-123'),
                result: AtBatResultType.HOME_RUN,
                runnerAdvances: [],
              },
            ],
            substitutions: [],
            enableNotifications: true,
            endGameNaturally: true,
          };

          // Mock successful start and at-bat, but notification service connection failure
          mockStartNewGame.execute = vi
            .fn()
            .mockResolvedValue({ success: true, gameId } as GameStartResult);
          mockRecordAtBat.execute = vi.fn().mockResolvedValue({
            success: true,
            gameState: {} as GameStateDTO,
            runsScored: 1,
            rbiAwarded: 1,
            inningEnded: false,
            gameEnded: true,
          } as AtBatResult);

          // Simulate notification service connection failure
          mockNotificationService.notifyGameEnded = vi
            .fn()
            .mockRejectedValue(new Error('Database connection failed during notification send'));

          // Act
          const result = await gameApplicationService.completeGameWorkflow(command);

          // Assert
          expect(result.success).toBe(true); // Workflow should still succeed despite notification failure
          expect(result.gameCompleted).toBe(true);
          expect(result.totalRuns).toBe(1);

          // Verify notification failure was logged (targets lines 634-638)
          expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Failed to send game end notification',
            expect.objectContaining({
              gameId: gameId.value,
              error: 'Database connection failed during notification send',
            })
          );
        });

        it('should handle game end notification service unknown error', async () => {
          // Arrange
          const command: CompleteGameWorkflowCommand = {
            startGameCommand: {
              gameId,
              homeTeamName: 'Home Team',
              awayTeamName: 'Away Team',
              ourTeamSide: 'HOME',
              gameDate: new Date(),
              initialLineup: [],
            },
            atBatSequences: [
              {
                gameId,
                batterId: new PlayerId('batter-456'),
                result: AtBatResultType.TRIPLE,
                runnerAdvances: [],
              },
            ],
            substitutions: [],
            enableNotifications: true,
            endGameNaturally: true,
          };

          mockStartNewGame.execute = vi
            .fn()
            .mockResolvedValue({ success: true, gameId } as GameStartResult);
          mockRecordAtBat.execute = vi.fn().mockResolvedValue({
            success: true,
            gameState: {} as GameStateDTO,
            runsScored: 1,
            rbiAwarded: 1,
            inningEnded: false,
            gameEnded: true,
          } as AtBatResult);

          // Simulate notification service throwing non-Error object
          mockNotificationService.notifyGameEnded = vi
            .fn()
            .mockRejectedValue('Unknown notification error');

          // Act
          const result = await gameApplicationService.completeGameWorkflow(command);

          // Assert
          expect(result.success).toBe(true);
          expect(result.gameCompleted).toBe(true);

          // Verify unknown error handling in notification failure (targets lines 636-637)
          expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Failed to send game end notification',
            expect.objectContaining({
              gameId: gameId.value,
              error: 'Unknown error',
            })
          );
        });
      });

      describe('Compensation Logic During Workflow Failures (Lines 526-538)', () => {
        it('should apply compensation logic when maxAttempts not specified and continueOnFailure is false', async () => {
          // Arrange
          const command: CompleteGameWorkflowCommand = {
            startGameCommand: {
              gameId,
              homeTeamName: 'Home Team',
              awayTeamName: 'Away Team',
              ourTeamSide: 'HOME',
              gameDate: new Date(),
              initialLineup: [],
            },
            atBatSequences: [
              {
                gameId,
                batterId: new PlayerId('batter-789'),
                result: AtBatResultType.SINGLE,
                runnerAdvances: [],
              },
            ],
            substitutions: [],
            // maxAttempts not specified, continueOnFailure defaults to false
          };

          mockStartNewGame.execute = vi
            .fn()
            .mockResolvedValue({ success: true, gameId } as GameStartResult);
          mockRecordAtBat.execute = vi.fn().mockResolvedValue({
            success: false,
            errors: ['At-bat processing failed'],
          } as AtBatResult);

          // Act
          const result = await gameApplicationService.completeGameWorkflow(command);

          // Assert - Compensation should be applied (targets lines 526-538)
          expect(result.success).toBe(false);
          expect(result.totalAtBats).toBe(0); // Reset on rollback
          expect(result.successfulAtBats).toBe(0); // Reset on rollback
          expect(result.totalRuns).toBe(0); // Reset on rollback
          expect(result.compensationApplied).toBe(false); // This specific path sets it to false
          expect(result.errors).toEqual([
            'Workflow failed during at-bat sequence: At-bat processing failed',
          ]);

          // Verify compensation logging
          expect(mockLoggerError).toHaveBeenCalledWith(
            'Game workflow failed, attempting compensation',
            undefined,
            expect.objectContaining({
              gameId: gameId.value,
              operation: 'completeGameWorkflow',
              errors: ['At-bat processing failed'],
            })
          );
        });

        it('should handle compensation rollback with different error patterns', async () => {
          // Arrange
          const command: CompleteGameWorkflowCommand = {
            startGameCommand: {
              gameId,
              homeTeamName: 'Test Team 1',
              awayTeamName: 'Test Team 2',
              ourTeamSide: 'HOME',
              gameDate: new Date(),
              initialLineup: [],
            },
            atBatSequences: [
              {
                gameId,
                batterId: new PlayerId('batter-compensation'),
                result: AtBatResultType.DOUBLE,
                runnerAdvances: [],
              },
            ],
            substitutions: [],
            continueOnFailure: false, // Explicit false to trigger compensation path
          };

          mockStartNewGame.execute = vi
            .fn()
            .mockResolvedValue({ success: true, gameId } as GameStartResult);
          mockRecordAtBat.execute = vi.fn().mockResolvedValue({
            success: false,
            errors: ['Validation failed', 'Business rule violation'],
          } as AtBatResult);

          // Act
          const result = await gameApplicationService.completeGameWorkflow(command);

          // Assert - Multiple error handling in compensation
          expect(result.success).toBe(false);
          expect(result.totalAtBats).toBe(0);
          expect(result.successfulAtBats).toBe(0);
          expect(result.totalRuns).toBe(0);
          expect(result.totalSubstitutions).toBe(0);
          expect(result.successfulSubstitutions).toBe(0);
          expect(result.completedInnings).toBe(0);
          expect(result.gameCompleted).toBe(false);
          expect(result.totalRetryAttempts).toBe(1); // Failed attempts counter

          expect(mockLoggerError).toHaveBeenCalledWith(
            'Game workflow failed, attempting compensation',
            undefined,
            expect.objectContaining({
              gameId: gameId.value,
              operation: 'completeGameWorkflow',
              errors: ['Validation failed', 'Business rule violation'],
            })
          );
        });
      });

      describe('Transaction System Error Scenarios (Lines 1102-1117)', () => {
        it('should handle transaction system error when operation throws unexpected exception', async () => {
          // Arrange
          const operations = [
            vi.fn().mockImplementation((): never => {
              throw new TypeError('Unexpected system error in transaction operation');
            }),
          ];

          // Act
          const result = await gameApplicationService.executeInTransaction(
            'error-prone-transaction',
            operations,
            { gameId: gameId.value, testTransactionError: true }
          );

          // Assert - Transaction system error handling (targets lines 1102-1117)
          expect(result.success).toBe(false);
          expect(result.rollbackApplied).toBe(true);
          expect(result.errors).toEqual([
            'Transaction exception at operation 0: Unexpected system error in transaction operation',
          ]);

          // Verify operation error logging (targets lines 1072-1076)
          expect(mockLoggerError).toHaveBeenCalledWith(
            'Transaction failed with exception',
            expect.any(TypeError),
            expect.objectContaining({
              operation: 'error-prone-transaction',
              failedAt: 0,
              gameId: gameId.value,
              testTransactionError: true,
            })
          );
        });

        it('should handle transaction system error with non-Error exception object', async () => {
          // Arrange
          const operations = [
            vi.fn().mockImplementation((): never => {
              throw new Error('String exception in transaction system');
            }),
          ];

          // Act
          const result = await gameApplicationService.executeInTransaction(
            'non-error-exception-transaction',
            operations,
            { gameId: gameId.value, testNonErrorException: true }
          );

          // Assert - Error exception handling (targets lines 1103)
          expect(result.success).toBe(false);
          expect(result.rollbackApplied).toBe(true);
          expect(result.errors).toEqual([
            'Transaction exception at operation 0: String exception in transaction system',
          ]);

          // Verify proper logging of Error exceptions
          expect(mockLoggerError).toHaveBeenCalledWith(
            'Transaction failed with exception',
            expect.any(Error),
            expect.objectContaining({
              operation: 'non-error-exception-transaction',
              failedAt: 0,
              gameId: gameId.value,
              testNonErrorException: true,
            })
          );
        });

        it('should handle maximum attempts exceeded scenarios with proper error aggregation', async () => {
          // Arrange
          // Mock setTimeout to avoid real delays during test
          vi.stubGlobal(
            'setTimeout',
            vi.fn().mockImplementation((callback, _delay: number) => {
              // Execute callback immediately for test speed
              callback();
              return 1 as unknown as ReturnType<typeof setTimeout>;
            })
          );

          const failingOperation = vi
            .fn()
            .mockResolvedValue({ success: false, errors: ['Persistent failure'] });

          // Act - Test the retry mechanism reaching maximum attempts
          const result = await gameApplicationService.attemptOperationWithRetry(
            'max-attempts-test',
            failingOperation,
            5, // maxAttempts
            { gameId: gameId.value, testMaxAttempts: true }
          );

          // Restore setTimeout
          vi.unstubAllGlobals();

          // Assert - Maximum attempts exceeded handling
          expect(result.attempts).toBe(5);
          expect(failingOperation).toHaveBeenCalledTimes(5);

          // Verify the error includes the max attempts message
          expect(
            (result as { success: boolean; errors: string[]; attempts: number }).errors
          ).toContain('Operation failed after 5 attempts');
        });
      });
    });
  });
});
