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

import { GameId, PlayerId, AtBatResultType, GameStatus, DomainError } from '@twsoftball/domain';
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
        expect(
          (result as { success: boolean; errors: string[]; compensationApplied: boolean }).success
        ).toBe(false);
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
        expect(
          (result as { success: boolean; data: string; compensationApplied: boolean }).success
        ).toBe(true);
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
        expect(
          (result as { success: boolean; errors: string[]; compensationApplied: boolean }).success
        ).toBe(false);
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
        expect((result.results[0] as { data: string }).data).toBe('op1');
        expect((result.results[1] as { data: string }).data).toBe('op2');
        expect((result.results[2] as { data: string }).data).toBe('op3');
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
        expect((result as { success: boolean; data: string; attempts: number }).success).toBe(true);
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
        expect((result as { success: boolean; data: string; attempts: number }).success).toBe(true);
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
        expect((result as { success: boolean; errors: string[]; attempts: number }).success).toBe(
          false
        );
        expect(result.attempts).toBe(2);
        expect(
          (result as { success: boolean; errors: string[]; attempts: number }).errors
        ).toContain('Operation failed after 2 attempts');
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
        expect((result as { success: boolean; data: string; attempts: number }).success).toBe(true);
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

      it('should handle retry with operations that return non-success objects', async () => {
        // Test retry logic with operations that don't have success property
        const operation = vi.fn().mockResolvedValue({ data: 'no success property' });

        const result = await gameApplicationService.attemptOperationWithRetry(
          'test-operation',
          operation,
          2,
          { gameId: gameId.value }
        );

        expect((result as { data: string; attempts: number }).data).toBe('no success property');
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
  });
});
