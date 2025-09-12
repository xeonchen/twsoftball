/**
 * @file GameApplicationService.lifecycle.test.ts
 * Game Lifecycle Orchestration tests for the GameApplicationService.
 *
 * @remarks
 * These tests verify the GameApplicationService's ability to orchestrate
 * game lifecycle operations including starting games with notifications
 * and executing complete game workflows from start to finish.
 *
 * **Test Coverage Areas**:
 * - Game lifecycle orchestration (start → record → end)
 * - Game start with notification handling
 * - Complete game workflow execution
 * - Error recovery during game lifecycle operations
 *
 * **Testing Strategy**:
 * - Mock all use case dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper error handling and rollback
 * - Ensure audit trails are maintained
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import { GameId, PlayerId, AtBatResultType, GameStatus, DomainError } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DTO imports
import { AtBatResult } from '../dtos/AtBatResult';
import { CompleteGameWorkflowCommand } from '../dtos/CompleteGameWorkflowCommand';
import { GameStartResult } from '../dtos/GameStartResult';
import { GameStateDTO } from '../dtos/GameStateDTO';
import { RecordAtBatCommand } from '../dtos/RecordAtBatCommand';
import { StartNewGameCommand } from '../dtos/StartNewGameCommand';
// Port imports
import { UserProfile, SessionInfo } from '../ports/out/AuthService';
// Test factory imports
import { createGameApplicationServiceMocks } from '../test-factories/mock-service-factories';
// Use case imports
import { EndInning } from '../use-cases/EndInning';
import { RecordAtBat } from '../use-cases/RecordAtBat';
import { RedoLastAction } from '../use-cases/RedoLastAction';
import { StartNewGame } from '../use-cases/StartNewGame';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer';
import { UndoLastAction } from '../use-cases/UndoLastAction';
// Note: These imports available for potential future test expansion
// import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';
// import { SubstitutionResult } from '../dtos/SubstitutionResult';
// Test helper functions for creating proper test objects
function createTestUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    roles: ['PLAYER'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    sessionId: 'session123',
    userId: 'user123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastActivityAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-02'),
    authMethod: 'local',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  };
}
// DTO imports

// Port imports

import { GameApplicationService } from './GameApplicationService';

// Type definitions for test results - removed unused interfaces

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

        mocks.functions.executeStartNewGame.mockResolvedValue(expectedResult);
        mocks.functions.authenticateUser.mockResolvedValue({
          success: true,
          user: createTestUserProfile(),
          session: createTestSessionInfo(),
          timestamp: new Date(),
        });

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.gameId).toEqual(gameId);
        expect(mocks.functions.executeStartNewGame).toHaveBeenCalledWith(command);
        expect(mocks.functions.notifyGameStarted).toHaveBeenCalledWith({
          gameId,
          homeTeam: 'Home Team',
          awayTeam: 'Away Team',
          startTime: expect.any(Date),
        });
        expect(mocks.functions.loggerInfo).toHaveBeenCalledWith(
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
        mocks.functions.executeStartNewGame.mockRejectedValue(expectedError);

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Invalid lineup configuration');
        expect(mocks.functions.notifyGameStarted).not.toHaveBeenCalled();
        expect(mocks.functions.loggerError).toHaveBeenCalledWith(
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

        mocks.functions.executeStartNewGame.mockResolvedValue(expectedResult);
        mocks.functions.notifyGameStarted.mockRejectedValue(
          new Error('Notification service unavailable')
        );

        // Act
        const result = await gameApplicationService.startNewGameWithNotifications(command);

        // Assert
        expect(result.success).toBe(true); // Game creation should still succeed
        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
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
        mocks.functions.executeStartNewGame.mockResolvedValue({
          success: true,
          gameId,
          initialState: {
            gameId,
            status: GameStatus.IN_PROGRESS,
            currentInning: 1,
            isTopHalf: true,
          } as GameStateDTO,
        } as GameStartResult);

        mocks.functions.executeRecordAtBat.mockResolvedValue({
          success: true,
          gameEnded: true,
          runsScored: 1,
        } as AtBatResult);

        mocks.functions.authenticateUser.mockResolvedValue({
          success: true,
          user: createTestUserProfile(),
          session: createTestSessionInfo(),
          timestamp: new Date(),
        });

        // Act
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.gameId).toEqual(gameId);
        expect(result.totalAtBats).toBe(1);
        expect(result.totalRuns).toBe(1);
        expect(result.gameCompleted).toBe(true);
        expect(mocks.functions.executeStartNewGame).toHaveBeenCalled();
        expect(mocks.functions.executeRecordAtBat).toHaveBeenCalled();
        expect(mocks.functions.notifyGameEnded).toHaveBeenCalled();
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
        mocks.functions.executeStartNewGame.mockResolvedValue({
          success: true,
          gameId,
        } as GameStartResult);

        mocks.functions.executeRecordAtBat.mockResolvedValue({
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
        expect(mocks.functions.loggerError).toHaveBeenCalledWith(
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

        mocks.functions.executeStartNewGame.mockResolvedValue({
          success: true,
          gameId,
        } as GameStartResult);

        // Mock failures for all at-bats
        mocks.functions.executeRecordAtBat.mockResolvedValue({
          success: false,
          errors: ['Failed at-bat'],
        } as AtBatResult);

        // Act
        const result = await gameApplicationService.completeGameWorkflow(command);

        // Assert
        expect(result.success).toBe(false);
        expect(mocks.functions.executeRecordAtBat).toHaveBeenCalledTimes(3); // Should stop at maxAttempts
        expect(result.errors).toContain('Maximum workflow attempts exceeded (3)');
      });
    });
  });
});
