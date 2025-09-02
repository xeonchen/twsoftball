/**
 * @file GameCommandService Tests
 * Tests for the primary inbound port interface for game recording commands.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameCommandService } from './GameCommandService';
import { StartNewGameCommand } from '../../dtos/StartNewGameCommand';
import { RecordAtBatCommand } from '../../dtos/RecordAtBatCommand';
import { GameStartResult } from '../../dtos/GameStartResult';
import { AtBatResult } from '../../dtos/AtBatResult';
import { TeamLineupDTO } from '../../dtos/TeamLineupDTO';
import {
  GameId,
  PlayerId,
  AtBatResultType,
  JerseyNumber,
  FieldPosition,
  GameStatus,
  TeamLineupId,
} from '@twsoftball/domain';

// Helper function to create mock lineup DTOs
function createMockLineupDTO(
  gameId: GameId,
  teamSide: 'HOME' | 'AWAY',
  teamName: string
): TeamLineupDTO {
  return {
    teamLineupId: TeamLineupId.generate(),
    gameId,
    teamSide,
    teamName,
    strategy: 'DETAILED',
    battingSlots: [],
    fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
    benchPlayers: [],
    substitutionHistory: [],
  };
}

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
        homeLineup: createMockLineupDTO(command.gameId, 'HOME', command.homeTeamName),
        awayLineup: createMockLineupDTO(command.gameId, 'AWAY', command.awayTeamName),
        currentBatter: null,
        lastUpdated: new Date(),
      },
    });
  }

  recordAtBat(): Promise<AtBatResult> {
    return Promise.resolve({
      success: true,
      gameState: {
        gameId: GameId.generate(),
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
        homeLineup: createMockLineupDTO(GameId.generate(), 'HOME', 'Home Team'),
        awayLineup: createMockLineupDTO(GameId.generate(), 'AWAY', 'Away Team'),
        currentBatter: null,
        lastUpdated: new Date(),
      },
      runsScored: 0,
      rbiAwarded: 0,
      inningEnded: false,
      gameEnded: false,
    });
  }

  substitutePlayer(): Promise<Record<string, unknown>> {
    return Promise.resolve({ success: true });
  }

  endInning(): Promise<Record<string, unknown>> {
    return Promise.resolve({ success: true });
  }

  endGame(): Promise<Record<string, unknown>> {
    return Promise.resolve({ success: true });
  }

  undoLastAction(): Promise<Record<string, unknown>> {
    return Promise.resolve({ success: true });
  }

  redoLastAction(): Promise<Record<string, unknown>> {
    return Promise.resolve({ success: true });
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
      const command: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        ourTeamSide: 'HOME',
        gameDate: new Date(),
        initialLineup: [],
      };

      const result = service.startNewGame(command);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('startNewGame Method', () => {
    it('should accept StartNewGameCommand and return GameStartResult', async () => {
      const command: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Eagles',
        awayTeamName: 'Hawks',
        ourTeamSide: 'HOME',
        gameDate: new Date('2024-08-30T14:00:00Z'),
        location: 'City Park',
        initialLineup: [
          {
            playerId: PlayerId.generate(),
            name: 'John Smith',
            jerseyNumber: JerseyNumber.fromNumber(1),
            battingOrderPosition: 1,
            fieldPosition: FieldPosition.PITCHER,
            preferredPositions: [FieldPosition.PITCHER],
          },
        ],
        gameRules: {
          mercyRuleEnabled: true,
          mercyRuleInning4: 15,
          mercyRuleInning5: 10,
          timeLimitMinutes: 60,
          extraPlayerAllowed: true,
          maxPlayersInLineup: 12,
        },
      };

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
      const minimalCommand: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        ourTeamSide: 'AWAY',
        gameDate: new Date(),
        initialLineup: [],
      };

      const result = await service.startNewGame(minimalCommand);

      expect(result).toBeDefined();
      expect(result.gameId).toEqual(minimalCommand.gameId);
    });
  });

  describe('recordAtBat Method', () => {
    it('should accept RecordAtBatCommand and return AtBatResult', async () => {
      const command: RecordAtBatCommand = {
        gameId: GameId.generate(),
        batterId: PlayerId.generate(),
        result: AtBatResultType.SINGLE,
        runnerAdvances: [
          {
            playerId: PlayerId.generate(),
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'HIT',
          },
        ],
        notes: 'Line drive to left field',
        timestamp: new Date(),
      };

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
      const minimalCommand: RecordAtBatCommand = {
        gameId: GameId.generate(),
        batterId: PlayerId.generate(),
        result: AtBatResultType.STRIKEOUT,
        runnerAdvances: [],
      };

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
      const command: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Test Home',
        awayTeamName: 'Test Away',
        ourTeamSide: 'HOME',
        gameDate: new Date(),
        initialLineup: [],
      };

      // Should not throw and should resolve to proper result
      const result = await service.startNewGame(command);
      expect(result).toBeDefined();
    });

    it('should support promise chaining', () => {
      const command: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Chain Home',
        awayTeamName: 'Chain Away',
        ourTeamSide: 'HOME',
        gameDate: new Date(),
        initialLineup: [],
      };

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
            gameId: GameId.generate(),
            errors: ['Mock validation error'],
          });
        }

        recordAtBat(): Promise<AtBatResult> {
          return Promise.resolve({
            success: false,
            gameState: {
              gameId: GameId.generate(),
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
              homeLineup: createMockLineupDTO(GameId.generate(), 'HOME', 'Error Home Team'),
              awayLineup: createMockLineupDTO(GameId.generate(), 'AWAY', 'Error Away Team'),
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
        substitutePlayer(): Promise<Record<string, unknown>> {
          return Promise.resolve({ success: false });
        }
        endInning(): Promise<Record<string, unknown>> {
          return Promise.resolve({ success: false });
        }
        endGame(): Promise<Record<string, unknown>> {
          return Promise.resolve({ success: false });
        }
        undoLastAction(): Promise<Record<string, unknown>> {
          return Promise.resolve({ success: false });
        }
        redoLastAction(): Promise<Record<string, unknown>> {
          return Promise.resolve({ success: false });
        }
      }

      const errorService = new ErrorMockService();
      const command: StartNewGameCommand = {
        gameId: GameId.generate(),
        homeTeamName: 'Error Test',
        awayTeamName: 'Error Test',
        ourTeamSide: 'HOME',
        gameDate: new Date(),
        initialLineup: [],
      };

      const result = await errorService.startNewGame(command);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
