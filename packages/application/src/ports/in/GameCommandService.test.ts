/**
 * @file GameCommandService Tests
 * Tests for the primary inbound port interface for game recording commands.
 *
 * @remarks
 * This test suite verifies the GameCommandService interface contract without
 * testing actual implementation logic. It focuses on method signatures,
 * parameter handling, and return type validation.
 *
 * Uses centralized test utilities to reduce code duplication and improve
 * maintainability across the test suite.
 */

import {
  GameId,
  PlayerId,
  AtBatResultType,
  JerseyNumber,
  FieldPosition,
  GameStatus,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { AtBatResult } from '../../dtos/AtBatResult.js';
import { EndGameResult } from '../../dtos/EndGameResult.js';
import { GameStartResult } from '../../dtos/GameStartResult.js';
import { InningEndResult } from '../../dtos/InningEndResult.js';
import { RedoResult } from '../../dtos/RedoResult.js';
import { StartNewGameCommand } from '../../dtos/StartNewGameCommand.js';
import { SubstitutionResult } from '../../dtos/SubstitutionResult.js';
import { UndoResult } from '../../dtos/UndoResult.js';
import {
  CommandTestBuilder,
  SecureTestUtils,
  createLineupDTO,
} from '../../test-factories/index.js';

import { GameCommandService } from './GameCommandService.js';

// Use factory function instead of local helper

// Mock implementation for testing the interface contract
class MockGameCommandService implements GameCommandService {
  startNewGame(command: StartNewGameCommand): Promise<GameStartResult> {
    return Promise.resolve({
      success: true,
      gameId: command.gameId,
      initialState: {
        gameId: command.gameId,
        status: GameStatus.IN_PROGRESS,
        score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
        gameStartTime: command.gameDate,
        currentInning: 1,
        isTopHalf: true,
        battingTeam: 'AWAY',
        outs: 0,
        bases: {
          first: null,
          second: null,
          third: null,
          runnersInScoringPosition: [],
          basesLoaded: false,
        },
        currentBatterSlot: 1,
        homeLineup: createLineupDTO(command.gameId, 'HOME', command.homeTeamName),
        awayLineup: createLineupDTO(command.gameId, 'AWAY', command.awayTeamName),
        currentBatter: null,
        lastUpdated: new Date(),
      },
    });
  }

  recordAtBat(): Promise<AtBatResult> {
    const gameId = new GameId(SecureTestUtils.generateGameId());
    return Promise.resolve({
      success: true,
      gameState: {
        gameId,
        status: GameStatus.IN_PROGRESS,
        score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
        gameStartTime: new Date(),
        currentInning: 1,
        isTopHalf: true,
        battingTeam: 'AWAY',
        outs: 0,
        bases: {
          first: null,
          second: null,
          third: null,
          runnersInScoringPosition: [],
          basesLoaded: false,
        },
        currentBatterSlot: 1,
        homeLineup: createLineupDTO(gameId, 'HOME', 'Home Team'),
        awayLineup: createLineupDTO(gameId, 'AWAY', 'Away Team'),
        currentBatter: null,
        lastUpdated: new Date(),
      },
      runsScored: 0,
      rbiAwarded: 0,
      inningEnded: false,
      gameEnded: false,
    });
  }

  substitutePlayer(): Promise<SubstitutionResult> {
    return Promise.reject(new Error('Substitution not supported'));
  }

  endInning(): Promise<InningEndResult> {
    return Promise.reject(new Error('End inning not supported'));
  }

  endGame(): Promise<EndGameResult> {
    return Promise.reject(new Error('End game not supported'));
  }

  undoLastAction(): Promise<UndoResult> {
    return Promise.reject(new Error('Undo not supported'));
  }

  redoLastAction(): Promise<RedoResult> {
    return Promise.reject(new Error('Redo not supported'));
  }
}

describe('GameCommandService Interface', () => {
  let service: GameCommandService;

  beforeEach(() => {
    service = new MockGameCommandService();
  });

  describe('Interface Contract', () => {
    it('should define all required methods', () => {
      expect(typeof service.startNewGame).toBe('function');
      expect(typeof service.recordAtBat).toBe('function');
      expect(typeof service.substitutePlayer).toBe('function');
      expect(typeof service.endInning).toBe('function');
      expect(typeof service.endGame).toBe('function');
      expect(typeof service.undoLastAction).toBe('function');
      expect(typeof service.redoLastAction).toBe('function');
    });

    it('should return promises for all methods', () => {
      const command = CommandTestBuilder.startNewGame()
        .withTeamNames('Home Team', 'Away Team')
        .build();

      const result = service.startNewGame(command);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('startNewGame Method', () => {
    it('should accept StartNewGameCommand and return GameStartResult', async () => {
      const command = CommandTestBuilder.startNewGame()
        .withTeamNames('Eagles', 'Hawks')
        .withGameDate(new Date('2024-08-30T14:00:00Z'))
        .withLocation('City Park')
        .withInitialLineup([
          {
            playerId: new PlayerId(SecureTestUtils.generatePlayerId()),
            name: 'John Smith',
            jerseyNumber: JerseyNumber.fromNumber(1),
            battingOrderPosition: 1,
            fieldPosition: FieldPosition.PITCHER,
            preferredPositions: [FieldPosition.PITCHER],
          },
        ])
        .withGameRules({
          mercyRuleEnabled: true,
          mercyRuleInning4: 15,
          mercyRuleInning5: 10,
          timeLimitMinutes: 60,
          extraPlayerAllowed: true,
          maxPlayersInLineup: 12,
        })
        .build();

      const result = await service.startNewGame(command);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.gameId).toEqual(command.gameId);

      if (result.success) {
        expect(result.initialState).toBeDefined();
        expect(result.errors).toBeUndefined();
      } else {
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle command with optional fields', async () => {
      const minimalCommand = CommandTestBuilder.startNewGame()
        .withTeamNames('Home', 'Away')
        .withOurTeamSide('AWAY')
        .build();

      const result = await service.startNewGame(minimalCommand);

      expect(result).toBeDefined();
      expect(result.gameId).toEqual(minimalCommand.gameId);
    });
  });

  describe('recordAtBat Method', () => {
    it('should accept RecordAtBatCommand and return AtBatResult', async () => {
      const command = CommandTestBuilder.recordAtBat()
        .withResult(AtBatResultType.SINGLE)
        .withRunnerAdvances([
          {
            playerId: new PlayerId(SecureTestUtils.generatePlayerId()),
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'HIT',
          },
        ])
        .withNotes('Line drive to left field')
        .withTimestamp(new Date())
        .build();

      const result = await service.recordAtBat(command);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.gameState).toBeDefined();
      expect(typeof result.runsScored).toBe('number');
      expect(typeof result.rbiAwarded).toBe('number');
      expect(typeof result.inningEnded).toBe('boolean');
      expect(typeof result.gameEnded).toBe('boolean');

      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle command with minimal fields', async () => {
      const minimalCommand = CommandTestBuilder.recordAtBat()
        .withResult(AtBatResultType.STRIKEOUT)
        .withRunnerAdvances([])
        .build();

      const result = await service.recordAtBat(minimalCommand);

      expect(result).toBeDefined();
      expect(result.gameState).toBeDefined();
    });
  });

  describe('Method Signatures', () => {
    it('should have correct parameter and return types for all methods', () => {
      // This test verifies the interface contract at compile time
      // The actual type checking happens during compilation

      const startNewGameMethod = service.startNewGame.bind(service);
      const recordAtBatMethod = service.recordAtBat.bind(service);
      const substitutePlayerMethod = service.substitutePlayer.bind(service);
      const endInningMethod = service.endInning.bind(service);
      const endGameMethod = service.endGame.bind(service);
      const undoLastActionMethod = service.undoLastAction.bind(service);
      const redoLastActionMethod = service.redoLastAction.bind(service);

      expect(startNewGameMethod).toBeDefined();
      expect(recordAtBatMethod).toBeDefined();
      expect(substitutePlayerMethod).toBeDefined();
      expect(endInningMethod).toBeDefined();
      expect(endGameMethod).toBeDefined();
      expect(undoLastActionMethod).toBeDefined();
      expect(redoLastActionMethod).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should handle async operations properly', async () => {
      const command = CommandTestBuilder.startNewGame()
        .withTeamNames('Test Home', 'Test Away')
        .build();

      // Should not throw and should resolve to proper result
      const result = await service.startNewGame(command);
      expect(result).toBeDefined();
    });

    it('should support promise chaining', () => {
      const command = CommandTestBuilder.startNewGame()
        .withTeamNames('Chain Home', 'Chain Away')
        .build();

      return service.startNewGame(command).then(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should allow implementations to return error results', async () => {
      // Mock implementation can return errors

      class ErrorMockService implements GameCommandService {
        startNewGame(_command: StartNewGameCommand): Promise<GameStartResult> {
          return Promise.resolve({
            success: false,
            gameId: new GameId(SecureTestUtils.generateGameId()),
            errors: ['Mock validation error'],
          });
        }

        recordAtBat(): Promise<AtBatResult> {
          const gameId = new GameId(SecureTestUtils.generateGameId());
          return Promise.resolve({
            success: false,
            gameState: {
              gameId,
              status: GameStatus.IN_PROGRESS,
              score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
              gameStartTime: new Date(),
              currentInning: 1,
              isTopHalf: true,
              battingTeam: 'AWAY',
              outs: 0,
              bases: {
                first: null,
                second: null,
                third: null,
                runnersInScoringPosition: [],
                basesLoaded: false,
              },
              currentBatterSlot: 1,
              homeLineup: createLineupDTO(gameId, 'HOME', 'Error Home Team'),
              awayLineup: createLineupDTO(gameId, 'AWAY', 'Error Away Team'),
              currentBatter: null,
              lastUpdated: new Date(),
            },
            runsScored: 0,
            rbiAwarded: 0,
            inningEnded: false,
            gameEnded: false,
            errors: ['Mock recording error'],
          });
        }

        // Other methods...
        substitutePlayer(): Promise<SubstitutionResult> {
          return Promise.reject(new Error('Substitution failed'));
        }
        endInning(): Promise<InningEndResult> {
          return Promise.reject(new Error('End inning failed'));
        }
        endGame(): Promise<EndGameResult> {
          return Promise.reject(new Error('End game failed'));
        }
        undoLastAction(): Promise<UndoResult> {
          return Promise.reject(new Error('Undo failed'));
        }
        redoLastAction(): Promise<RedoResult> {
          return Promise.reject(new Error('Redo failed'));
        }
      }

      const errorService = new ErrorMockService();
      const command = CommandTestBuilder.startNewGame()
        .withTeamNames('Error Test', 'Error Test')
        .build();

      const result = await errorService.startNewGame(command);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
