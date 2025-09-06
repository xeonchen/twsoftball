/**
 * @file Test Scenarios Tests
 * Comprehensive test coverage for test scenario setup functions.
 *
 * @remarks
 * These tests validate the behavior of pre-configured test scenarios that provide
 * complete test setup with mocks, test data, and commands. They ensure consistent
 * scenario creation, proper mock configuration, and reliable test patterns.
 *
 * **Test Coverage Areas**:
 * - Scenario setup functions and their return structures
 * - Mock configuration and behavior in each scenario
 * - Test data consistency and relationships
 * - Command generation and customization
 * - Error scenarios and edge cases
 */

import { Game, GameId, GameStatus, AtBatResultType, DomainError } from '@twsoftball/domain';
import { vi, describe, it, expect, afterEach } from 'vitest';

import { RecordAtBatCommand } from '../dtos/RecordAtBatCommand';
import { RedoCommand } from '../dtos/RedoCommand';
import { StartNewGameCommand } from '../dtos/StartNewGameCommand';
import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';
import { UndoCommand } from '../dtos/UndoCommand';

import {
  setupSuccessfulAtBatScenario,
  setupSuccessfulGameStartScenario,
  setupSuccessfulSubstitutionScenario,
  setupSuccessfulUndoScenario,
  setupSuccessfulRedoScenario,
  setupRepositoryFailureScenario,
  setupEventStoreFailureScenario,
  setupDomainErrorScenario,
  setupConcurrencyConflictScenario,
  setupGameNotFoundScenario,
  setupCustomScenario,
} from './test-scenarios';

describe('Test Scenarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupSuccessfulAtBatScenario', () => {
    describe('basic scenario setup', () => {
      it('should create scenario with default values', () => {
        const scenario = setupSuccessfulAtBatScenario();

        // Verify structure
        expect(scenario).toHaveProperty('mocks');
        expect(scenario).toHaveProperty('testData');
        expect(scenario).toHaveProperty('command');

        // Verify mocks exist
        expect(scenario.mocks.gameRepository).toBeDefined();
        expect(scenario.mocks.eventStore).toBeDefined();
        expect(scenario.mocks.logger).toBeDefined();
        expect(scenario.mocks.notificationService).toBeDefined();

        // Verify test data
        expect(scenario.testData.game).toBeInstanceOf(Game);
        expect(scenario.testData.gameId).toBeInstanceOf(GameId);
        expect(scenario.testData.game.status).toBe(GameStatus.IN_PROGRESS);

        // Verify command
        expect(scenario.command).toHaveProperty('gameId');
        expect(scenario.command).toHaveProperty('batterId');
        expect(scenario.command).toHaveProperty('result');
        expect((scenario.command as RecordAtBatCommand).result).toBe(AtBatResultType.SINGLE);
      });

      it('should configure mocks for successful operations', async () => {
        const scenario = setupSuccessfulAtBatScenario();

        // Repository should return the game
        const foundGame = await scenario.mocks.gameRepository.findById(scenario.testData.gameId);
        expect(foundGame).toBe(scenario.testData.game);

        // Save should succeed
        await expect(
          scenario.mocks.gameRepository.save(scenario.testData.game)
        ).resolves.toBeUndefined();

        // Event store should succeed
        await expect(
          scenario.mocks.eventStore.append(scenario.testData.gameId, 'Game', [])
        ).resolves.toBeUndefined();
      });

      it('should ensure game ID consistency between data and command', () => {
        const scenario = setupSuccessfulAtBatScenario();

        expect(scenario.testData.game.id.value).toBe(
          (scenario.command as RecordAtBatCommand).gameId.value
        );
        expect(scenario.testData.gameId.value).toBe(
          (scenario.command as RecordAtBatCommand).gameId.value
        );
      });
    });

    describe('customization options', () => {
      it('should accept custom game ID', () => {
        const customGameId = 'custom-at-bat-game';
        const scenario = setupSuccessfulAtBatScenario({ gameId: customGameId });

        expect(scenario.testData.gameId.value).toBe(customGameId);
        expect(scenario.testData.game.id.value).toBe(customGameId);
        expect((scenario.command as RecordAtBatCommand).gameId.value).toBe(customGameId);
      });

      it('should accept custom at-bat result', () => {
        const customResult = AtBatResultType.HOME_RUN;
        const scenario = setupSuccessfulAtBatScenario({ atBatResult: customResult });

        expect((scenario.command as RecordAtBatCommand).result).toBe(customResult);
      });

      it('should handle withRunners option', () => {
        // The current implementation has a comment for future runner support
        const scenario = setupSuccessfulAtBatScenario({ withRunners: true });

        // Should still create valid scenario
        expect((scenario.command as RecordAtBatCommand).runnerAdvances).toEqual([]);
      });
    });

    describe('mock verification', () => {
      it('should have properly configured mock functions', () => {
        const scenario = setupSuccessfulAtBatScenario();

        expect(vi.isMockFunction(scenario.mocks.gameRepository.findById)).toBe(true);

        expect(vi.isMockFunction(scenario.mocks.gameRepository.save)).toBe(true);

        expect(vi.isMockFunction(scenario.mocks.eventStore.append)).toBe(true);

        expect(vi.isMockFunction(scenario.mocks.logger.info)).toBe(true);
      });

      it('should allow mock customization after scenario creation', async () => {
        const scenario = setupSuccessfulAtBatScenario();

        // Override mock behavior
        const customError = new Error('Custom test error');

        vi.mocked(scenario.mocks.gameRepository.save).mockRejectedValue(customError);

        await expect(scenario.mocks.gameRepository.save(scenario.testData.game)).rejects.toThrow(
          'Custom test error'
        );
      });
    });
  });

  describe('setupSuccessfulGameStartScenario', () => {
    describe('basic scenario setup', () => {
      it('should create game start scenario with defaults', () => {
        const scenario = setupSuccessfulGameStartScenario();

        expect(scenario.testData.game.status).toBe(GameStatus.NOT_STARTED);
        expect(scenario.command).toHaveProperty('homeTeamName');
        expect(scenario.command).toHaveProperty('awayTeamName');
        expect((scenario.command as StartNewGameCommand).homeTeamName).toBe('Home Team');
        expect((scenario.command as StartNewGameCommand).awayTeamName).toBe('Away Team');
      });

      it('should configure repository for new game creation', async () => {
        const scenario = setupSuccessfulGameStartScenario();

        // Game should not exist initially (for new game creation)
        const foundGame = await scenario.mocks.gameRepository.findById(scenario.testData.gameId);
        expect(foundGame).toBe(null);
      });
    });

    describe('customization options', () => {
      it('should accept custom team names', () => {
        const homeTeam = 'Eagles';
        const awayTeam = 'Hawks';
        const scenario = setupSuccessfulGameStartScenario({ homeTeam, awayTeam });

        expect(scenario.testData.game.homeTeamName).toBe(homeTeam);
        expect(scenario.testData.game.awayTeamName).toBe(awayTeam);
        expect((scenario.command as StartNewGameCommand).homeTeamName).toBe(homeTeam);
        expect((scenario.command as StartNewGameCommand).awayTeamName).toBe(awayTeam);
      });

      it('should handle withLineup option', () => {
        // The current implementation has a comment for future lineup support
        const scenario = setupSuccessfulGameStartScenario({ withLineup: true });

        expect((scenario.command as StartNewGameCommand).initialLineup).toEqual([]);
      });
    });
  });

  describe('setupSuccessfulSubstitutionScenario', () => {
    describe('basic scenario setup', () => {
      it('should create substitution scenario', () => {
        const scenario = setupSuccessfulSubstitutionScenario();

        expect(scenario.testData.game.status).toBe(GameStatus.IN_PROGRESS);
        expect(scenario.command).toHaveProperty('battingSlot');
        expect(scenario.command).toHaveProperty('outgoingPlayerId');
        expect(scenario.command).toHaveProperty('incomingPlayerId');
        expect((scenario.command as SubstitutePlayerCommand).battingSlot).toBe(1);
        expect((scenario.command as SubstitutePlayerCommand).isReentry).toBe(false);
      });
    });

    describe('customization options', () => {
      it('should accept custom batting slot', () => {
        const battingSlot = 7;
        const scenario = setupSuccessfulSubstitutionScenario({ battingSlot });

        expect((scenario.command as SubstitutePlayerCommand).battingSlot).toBe(battingSlot);
      });

      it('should accept reentry flag', () => {
        const scenario = setupSuccessfulSubstitutionScenario({ isReentry: true });

        expect((scenario.command as SubstitutePlayerCommand).isReentry).toBe(true);
      });
    });
  });

  describe('setupSuccessfulUndoScenario', () => {
    describe('basic scenario setup', () => {
      it('should create undo scenario', () => {
        const scenario = setupSuccessfulUndoScenario();

        expect(scenario.testData.game.status).toBe(GameStatus.IN_PROGRESS);
        expect(scenario.command).toHaveProperty('gameId');
        expect(scenario.command).toHaveProperty('actionLimit');
        expect((scenario.command as UndoCommand).actionLimit).toBe(1);
      });
    });

    describe('customization options', () => {
      it('should accept custom action limit', () => {
        const actionLimit = 5;
        const scenario = setupSuccessfulUndoScenario({ actionLimit });

        expect((scenario.command as UndoCommand).actionLimit).toBe(actionLimit);
      });

      it('should set up mock events when requested', async () => {
        const scenario = setupSuccessfulUndoScenario({ withEvents: true });

        // Event store should have mock events configured
        const events = await scenario.mocks.eventStore.getGameEvents(scenario.testData.gameId);
        expect(events).toHaveLength(1);
        expect(events[0]?.eventType).toBe('AtBatCompleted');
      });
    });
  });

  describe('setupSuccessfulRedoScenario', () => {
    describe('basic scenario setup', () => {
      it('should create redo scenario', () => {
        const scenario = setupSuccessfulRedoScenario();

        expect(scenario.testData.game.status).toBe(GameStatus.IN_PROGRESS);
        expect(scenario.command).toHaveProperty('gameId');
        expect(scenario.command).toHaveProperty('actionLimit');
        expect((scenario.command as RedoCommand).actionLimit).toBe(1);
      });
    });

    describe('customization options', () => {
      it('should set up undo history when requested', () => {
        const scenario = setupSuccessfulRedoScenario({ withUndoHistory: true });

        // Should not throw when setting up undo history
        expect(() => {
          scenario.mocks.eventStore.setMockUndoHistory(scenario.testData.gameId, []);
        }).not.toThrow();
      });
    });
  });

  describe('failure scenarios', () => {
    describe('setupRepositoryFailureScenario', () => {
      it('should create repository failure scenario with defaults', async () => {
        const scenario = setupRepositoryFailureScenario();

        // Repository should be configured to fail
        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).rejects.toThrow('Database connection failed');
      });

      it('should accept custom error message', async () => {
        const customError = 'Custom repository error';
        const scenario = setupRepositoryFailureScenario(customError);

        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).rejects.toThrow(customError);
      });

      it('should configure different failure types', async () => {
        const saveFailure = setupRepositoryFailureScenario('Save failed', 'save');
        const existsFailure = setupRepositoryFailureScenario('Exists failed', 'exists');

        // Save should fail
        await expect(
          saveFailure.mocks.gameRepository.save(saveFailure.testData.game)
        ).rejects.toThrow('Save failed');

        // Exists should fail
        await expect(
          existsFailure.mocks.gameRepository.exists(existsFailure.testData.gameId)
        ).rejects.toThrow('Exists failed');
      });
    });

    describe('setupEventStoreFailureScenario', () => {
      it('should create event store failure scenario', async () => {
        const scenario = setupEventStoreFailureScenario();

        // Event store should fail but repository should succeed
        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).resolves.toBe(scenario.testData.game);

        await expect(
          scenario.mocks.eventStore.append(scenario.testData.gameId, 'Game', [])
        ).rejects.toThrow('Event store connection failed');
      });

      it('should configure different event store failures', async () => {
        const getEventsFailure = setupEventStoreFailureScenario('Get events failed', 'getEvents');
        const getGameEventsFailure = setupEventStoreFailureScenario(
          'Get game events failed',
          'getGameEvents'
        );

        await expect(
          getEventsFailure.mocks.eventStore.getEvents(getEventsFailure.testData.gameId)
        ).rejects.toThrow('Get events failed');

        await expect(
          getGameEventsFailure.mocks.eventStore.getGameEvents(getGameEventsFailure.testData.gameId)
        ).rejects.toThrow('Get game events failed');
      });
    });

    describe('setupDomainErrorScenario', () => {
      it('should create domain error scenario', async () => {
        const scenario = setupDomainErrorScenario();

        // Repository should find game but save should fail with domain error
        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).resolves.toBe(scenario.testData.game);

        await expect(scenario.mocks.gameRepository.save(scenario.testData.game)).rejects.toThrow(
          DomainError
        );
      });

      it('should handle different error types', () => {
        const validationError = setupDomainErrorScenario('Validation failed', 'validation');
        const stateError = setupDomainErrorScenario('Invalid state', 'state');
        const businessError = setupDomainErrorScenario('Business rule violated', 'business');

        expect(validationError.testData.game.status).toBe(GameStatus.IN_PROGRESS);
        expect(stateError.testData.game.status).toBe(GameStatus.COMPLETED);
        expect(businessError.testData.game.status).toBe(GameStatus.IN_PROGRESS);
      });
    });

    describe('setupConcurrencyConflictScenario', () => {
      it('should create concurrency conflict scenario', async () => {
        const scenario = setupConcurrencyConflictScenario();

        // Repository should find game but save should fail with concurrency error
        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).resolves.toBe(scenario.testData.game);

        await expect(
          scenario.mocks.gameRepository.save(scenario.testData.game)
        ).rejects.toMatchObject({
          name: 'ConcurrencyError',
          message: 'Version conflict',
        });
      });

      it('should accept custom conflict message', async () => {
        const customMessage = 'Optimistic locking failed';
        const scenario = setupConcurrencyConflictScenario(customMessage);

        await expect(scenario.mocks.gameRepository.save(scenario.testData.game)).rejects.toThrow(
          customMessage
        );
      });
    });

    describe('setupGameNotFoundScenario', () => {
      it('should create game not found scenario', async () => {
        const scenario = setupGameNotFoundScenario();

        // Repository should return null
        const result = await scenario.mocks.gameRepository.findById(scenario.testData.gameId);
        expect(result).toBe(null);
      });

      it('should accept custom game ID', async () => {
        const customGameId = 'missing-game-123';
        const scenario = setupGameNotFoundScenario(customGameId);

        expect(scenario.testData.gameId.value).toBe(customGameId);
        expect((scenario.command as RecordAtBatCommand).gameId.value).toBe(customGameId);

        const result = await scenario.mocks.gameRepository.findById(scenario.testData.gameId);
        expect(result).toBe(null);
      });
    });
  });

  describe('setupCustomScenario', () => {
    describe('basic customization', () => {
      it('should create scenario with default settings', () => {
        const scenario = setupCustomScenario({});

        expect(scenario.testData.game.status).toBe(GameStatus.IN_PROGRESS);
        expect(scenario.command).toHaveProperty('gameId');
      });

      it('should accept custom game status', () => {
        const scenario = setupCustomScenario({
          gameStatus: GameStatus.COMPLETED,
        });

        expect(scenario.testData.game.status).toBe(GameStatus.COMPLETED);
      });

      it('should accept custom game ID', () => {
        const gameId = 'custom-scenario-game';
        const scenario = setupCustomScenario({ gameId });

        expect(scenario.testData.gameId.value).toBe(gameId);
        expect(scenario.testData.game.id.value).toBe(gameId);
      });
    });

    describe('repository behavior customization', () => {
      it('should configure successful repository behavior', async () => {
        const scenario = setupCustomScenario({
          repositoryBehavior: {
            findById: 'success',
            save: 'success',
          },
        });

        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).resolves.toBe(scenario.testData.game);

        await expect(
          scenario.mocks.gameRepository.save(scenario.testData.game)
        ).resolves.toBeUndefined();
      });

      it('should configure not found repository behavior', async () => {
        const scenario = setupCustomScenario({
          repositoryBehavior: {
            findById: 'notFound',
          },
        });

        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).resolves.toBe(null);
      });

      it('should configure error repository behavior', async () => {
        const scenario = setupCustomScenario({
          repositoryBehavior: {
            findById: 'error',
            save: 'error',
            error: 'Custom repository error',
          },
        });

        await expect(
          scenario.mocks.gameRepository.findById(scenario.testData.gameId)
        ).rejects.toThrow('Custom repository error');

        await expect(scenario.mocks.gameRepository.save(scenario.testData.game)).rejects.toThrow(
          'Custom repository error'
        );
      });
    });

    describe('event store behavior customization', () => {
      it('should configure successful event store behavior', async () => {
        const scenario = setupCustomScenario({
          eventStoreBehavior: {
            append: 'success',
          },
        });

        await expect(
          scenario.mocks.eventStore.append(scenario.testData.gameId, 'Game', [])
        ).resolves.toBeUndefined();
      });

      it('should configure error event store behavior', async () => {
        const scenario = setupCustomScenario({
          eventStoreBehavior: {
            append: 'error',
            error: 'Custom event store error',
          },
        });

        await expect(
          scenario.mocks.eventStore.append(scenario.testData.gameId, 'Game', [])
        ).rejects.toThrow('Custom event store error');
      });
    });

    describe('command type customization', () => {
      it('should create start game command', () => {
        const scenario = setupCustomScenario({
          commandType: 'startGame',
        });

        expect(scenario.command).toHaveProperty('homeTeamName');
        expect(scenario.command).toHaveProperty('awayTeamName');
      });

      it('should create substitute command', () => {
        const scenario = setupCustomScenario({
          commandType: 'substitute',
        });

        expect(scenario.command).toHaveProperty('battingSlot');
        expect(scenario.command).toHaveProperty('outgoingPlayerId');
      });

      it('should create undo command', () => {
        const scenario = setupCustomScenario({
          commandType: 'undo',
        });

        expect(scenario.command).toHaveProperty('gameId');
        // Should not have actionLimit by default
        expect(scenario.command).not.toHaveProperty('actionLimit');
      });

      it('should create redo command', () => {
        const scenario = setupCustomScenario({
          commandType: 'redo',
        });

        expect(scenario.command).toHaveProperty('gameId');
      });

      it('should default to recordAtBat command', () => {
        const scenario = setupCustomScenario({
          commandType: 'recordAtBat',
        });

        expect(scenario.command).toHaveProperty('batterId');
        expect(scenario.command).toHaveProperty('result');
      });
    });

    describe('command options customization', () => {
      it('should apply command options', () => {
        const customOptions = {
          notes: 'Custom test notes',
          customField: 'custom value',
        };

        const scenario = setupCustomScenario({
          commandOptions: customOptions,
        });

        expect(scenario.command).toMatchObject(customOptions);
      });

      it('should handle non-object command options gracefully', () => {
        expect(() => {
          setupCustomScenario({
            commandOptions: 'not an object',
          });
        }).not.toThrow();
      });
    });
  });

  describe('scenario structure validation', () => {
    it('should have consistent TestScenario structure across all scenarios', () => {
      const scenarios = [
        setupSuccessfulAtBatScenario(),
        setupSuccessfulGameStartScenario(),
        setupSuccessfulSubstitutionScenario(),
        setupSuccessfulUndoScenario(),
        setupSuccessfulRedoScenario(),
        setupRepositoryFailureScenario(),
        setupEventStoreFailureScenario(),
        setupDomainErrorScenario(),
        setupConcurrencyConflictScenario(),
        setupGameNotFoundScenario(),
        setupCustomScenario({}),
      ];

      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('mocks');
        expect(scenario).toHaveProperty('testData');
        expect(scenario).toHaveProperty('command');

        expect(scenario.mocks).toHaveProperty('gameRepository');
        expect(scenario.mocks).toHaveProperty('eventStore');
        expect(scenario.mocks).toHaveProperty('logger');
        expect(scenario.mocks).toHaveProperty('notificationService');

        expect(scenario.testData).toHaveProperty('game');
        expect(scenario.testData).toHaveProperty('gameId');
        expect(scenario.testData.game).toBeInstanceOf(Game);
        expect(scenario.testData.gameId).toBeInstanceOf(GameId);

        expect(scenario.command).toHaveProperty('gameId');
      });
    });

    it('should maintain game ID consistency across scenario components', () => {
      const scenarios = [
        setupSuccessfulAtBatScenario(),
        setupRepositoryFailureScenario(),
        setupCustomScenario({ gameId: 'consistent-game' }),
      ];

      scenarios.forEach(scenario => {
        expect(scenario.testData.game.id.value).toBe(scenario.testData.gameId.value);
        expect(scenario.testData.gameId.value).toBe(
          (
            scenario.command as
              | RecordAtBatCommand
              | StartNewGameCommand
              | SubstitutePlayerCommand
              | UndoCommand
              | RedoCommand
          ).gameId.value
        );
      });
    });
  });

  describe('scenario reusability and isolation', () => {
    it('should create independent scenarios with different IDs', () => {
      const scenario1 = setupSuccessfulAtBatScenario();
      const scenario2 = setupSuccessfulAtBatScenario();

      expect(scenario1.testData.gameId.value).not.toBe(scenario2.testData.gameId.value);
      expect(scenario1.mocks.gameRepository).not.toBe(scenario2.mocks.gameRepository);
    });

    it('should allow mock reconfiguration without affecting other scenarios', async () => {
      const scenario1 = setupSuccessfulAtBatScenario();
      const scenario2 = setupSuccessfulAtBatScenario();

      // Reconfigure one scenario's mocks

      vi.mocked(scenario1.mocks.gameRepository.findById).mockResolvedValue(null);

      // Should not affect the other scenario
      const result1 = await scenario1.mocks.gameRepository.findById(scenario1.testData.gameId);
      const result2 = await scenario2.mocks.gameRepository.findById(scenario2.testData.gameId);

      expect(result1).toBe(null);
      expect(result2).toBe(scenario2.testData.game);
    });
  });
});
