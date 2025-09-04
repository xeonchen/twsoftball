/**
 * @file GameQueryService Tests
 * Tests for the primary inbound port interface for game state queries.
 */

import { GameId, PlayerId, GameStatus, TeamLineupId, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { GameStateDTO } from '../../dtos/GameStateDTO';
import { TeamLineupDTO } from '../../dtos/TeamLineupDTO';

import { GameQueryService } from './GameQueryService';

// Helper function to create mock lineup DTOs for query service
function createMockLineupDTOForQuery(
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
class MockGameQueryService implements GameQueryService {
  getCurrentGameState(gameId: GameId): Promise<GameStateDTO> {
    return Promise.resolve({
      gameId,
      status: GameStatus.IN_PROGRESS,
      score: { home: 3, away: 2, leader: 'HOME', difference: 1 },
      gameStartTime: new Date(),
      currentInning: 5,
      isTopHalf: false,
      battingTeam: 'HOME',
      outs: 1,
      bases: {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      },
      currentBatterSlot: 4,
      homeLineup: createMockLineupDTOForQuery(gameId, 'HOME', 'Home Eagles'),
      awayLineup: createMockLineupDTOForQuery(gameId, 'AWAY', 'Away Hawks'),
      currentBatter: null,
      lastUpdated: new Date(),
    });
  }

  getGameStatistics(): Promise<Record<string, unknown>> {
    return Promise.resolve({
      gameId: GameId.generate(),
      teamStatistics: {},
      playerStatistics: [],
      gameEvents: [],
    });
  }

  getPlayerStatistics(): Promise<Record<string, unknown>> {
    return Promise.resolve({
      playerId: PlayerId.generate(),
      name: 'Test Player',
      statistics: {},
    });
  }

  getGameHistory(): Promise<Record<string, unknown>> {
    return Promise.resolve({
      gameId: GameId.generate(),
      events: [],
      timeline: [],
    });
  }

  canUndo(): Promise<boolean> {
    return Promise.resolve(true);
  }

  canRedo(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

describe('GameQueryService Interface', () => {
  let service: GameQueryService;

  beforeEach(() => {
    service = new MockGameQueryService();
  });

  describe('Interface Contract', () => {
    it('should define all required methods', () => {
      expect(typeof service.getCurrentGameState).toBe('function');
      expect(typeof service.getGameStatistics).toBe('function');
      expect(typeof service.getPlayerStatistics).toBe('function');
      expect(typeof service.getGameHistory).toBe('function');
      expect(typeof service.canUndo).toBe('function');
      expect(typeof service.canRedo).toBe('function');
    });

    it('should return promises for all methods', () => {
      const gameId = GameId.generate();

      const result = service.getCurrentGameState(gameId);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getCurrentGameState Method', () => {
    it('should accept GameId and return GameStateDTO', async () => {
      const gameId = GameId.generate();

      const result = await service.getCurrentGameState(gameId);

      expect(result).toBeDefined();
      expect(result['gameId']).toEqual(gameId);
      expect(typeof result.status).toBe('string');
      expect(typeof result.score).toBe('object');
      expect(result.gameStartTime).toBeInstanceOf(Date);
      expect(typeof result.currentInning).toBe('number');
      expect(typeof result.isTopHalf).toBe('boolean');
      expect(typeof result.battingTeam).toBe('string');
      expect(typeof result.outs).toBe('number');
      expect(typeof result.bases).toBe('object');
      expect(typeof result.currentBatterSlot).toBe('number');
      expect(typeof result.homeLineup).toBe('object');
      expect(typeof result.awayLineup).toBe('object');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should maintain game state structure', async () => {
      const gameId = GameId.generate();

      const result = await service.getCurrentGameState(gameId);

      // Verify score structure
      expect(result.score.home).toBeDefined();
      expect(result.score.away).toBeDefined();
      expect(result.score.leader).toBeDefined();
      expect(result.score.difference).toBeDefined();

      // Verify bases structure
      expect(result.bases.first !== undefined).toBe(true); // Can be null
      expect(result.bases.second !== undefined).toBe(true);
      expect(result.bases.third !== undefined).toBe(true);
      expect(Array.isArray(result.bases.runnersInScoringPosition)).toBe(true);
      expect(typeof result.bases.basesLoaded).toBe('boolean');

      // Verify lineup structure
      expect(result.homeLineup).toBeDefined();
      expect(result.awayLineup).toBeDefined();
    });
  });

  describe('getGameStatistics Method', () => {
    it('should return comprehensive game statistics', async () => {
      const gameId = GameId.generate();

      const result = await service.getGameStatistics(gameId);

      expect(result).toBeDefined();
      expect(result['gameId']).toBeDefined();
      expect(result['teamStatistics']).toBeDefined();
      expect(Array.isArray(result['playerStatistics'])).toBe(true);
      expect(Array.isArray(result['gameEvents'])).toBe(true);
    });
  });

  describe('getPlayerStatistics Method', () => {
    it('should return player-specific statistics', async () => {
      const playerId = PlayerId.generate();
      const gameId = GameId.generate();

      const result = await service.getPlayerStatistics(playerId, gameId);

      expect(result).toBeDefined();
      expect(result['playerId']).toBeDefined();
      expect(result['name']).toBeDefined();
      expect(result['statistics']).toBeDefined();
    });

    it('should handle optional gameId parameter', async () => {
      const playerId = PlayerId.generate();

      // Should work without gameId (season stats)
      const result = await service.getPlayerStatistics(playerId);

      expect(result).toBeDefined();
    });
  });

  describe('getGameHistory Method', () => {
    it('should return complete game history', async () => {
      const gameId = GameId.generate();

      const result = await service.getGameHistory(gameId);

      expect(result).toBeDefined();
      expect(result['gameId']).toBeDefined();
      expect(Array.isArray(result['events'])).toBe(true);
      expect(Array.isArray(result['timeline'])).toBe(true);
    });
  });

  describe('Undo/Redo Status Methods', () => {
    it('should return boolean for canUndo', async () => {
      const gameId = GameId.generate();

      const result = await service.canUndo(gameId);

      expect(typeof result).toBe('boolean');
    });

    it('should return boolean for canRedo', async () => {
      const gameId = GameId.generate();

      const result = await service.canRedo(gameId);

      expect(typeof result).toBe('boolean');
    });

    it('should handle undo/redo state logic', async () => {
      const gameId = GameId.generate();

      const canUndo = await service.canUndo(gameId);
      const canRedo = await service.canRedo(gameId);

      // Both should be boolean
      expect(typeof canUndo).toBe('boolean');
      expect(typeof canRedo).toBe('boolean');

      // In typical usage, if we can undo, we might not be able to redo (and vice versa)
      // This depends on the game's action history state
    });
  });

  describe('Method Signatures', () => {
    it('should have correct parameter and return types', () => {
      // This test verifies the interface contract at compile time
      const getCurrentGameStateMethod = service.getCurrentGameState.bind(service);
      const getGameStatisticsMethod = service.getGameStatistics.bind(service);
      const getPlayerStatisticsMethod = service.getPlayerStatistics.bind(service);
      const getGameHistoryMethod = service.getGameHistory.bind(service);
      const canUndoMethod = service.canUndo.bind(service);
      const canRedoMethod = service.canRedo.bind(service);

      expect(getCurrentGameStateMethod).toBeDefined();
      expect(getGameStatisticsMethod).toBeDefined();
      expect(getPlayerStatisticsMethod).toBeDefined();
      expect(getGameHistoryMethod).toBeDefined();
      expect(canUndoMethod).toBeDefined();
      expect(canRedoMethod).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should handle async operations properly', async () => {
      const gameId = GameId.generate();

      // Should not throw and should resolve to proper result
      const result = await service.getCurrentGameState(gameId);
      expect(result).toBeDefined();
      expect(result['gameId']).toEqual(gameId);
    });

    it('should support promise chaining', () => {
      const gameId = GameId.generate();

      return service.getCurrentGameState(gameId).then(result => {
        expect(result).toBeDefined();
        expect(result['gameId']).toEqual(gameId);
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should allow implementations to throw errors for invalid inputs', async () => {
      // Mock implementation that throws errors
      class ErrorMockQueryService implements GameQueryService {
        getCurrentGameState(gameId: GameId): Promise<GameStateDTO> {
          return Promise.reject(new Error(`Game not found: ${gameId.value}`));
        }

        getGameStatistics(): Promise<Record<string, unknown>> {
          return Promise.reject(new Error('Statistics not available'));
        }

        getPlayerStatistics(): Promise<Record<string, unknown>> {
          return Promise.reject(new Error('Player not found'));
        }

        getGameHistory(): Promise<Record<string, unknown>> {
          return Promise.reject(new Error('History not available'));
        }

        canUndo(): Promise<boolean> {
          return Promise.resolve(false);
        }

        canRedo(): Promise<boolean> {
          return Promise.resolve(false);
        }
      }

      const errorService = new ErrorMockQueryService();
      const gameId = GameId.generate();

      await expect(errorService.getCurrentGameState(gameId)).rejects.toThrow('Game not found');
    });

    it('should handle missing data gracefully', async () => {
      // Mock implementation that returns null/empty for missing data

      class EmptyMockQueryService implements GameQueryService {
        getCurrentGameState(_gameId: GameId): Promise<GameStateDTO> {
          return Promise.reject(new Error('Game not found'));
        }

        getGameStatistics(_gameId: GameId): Promise<Record<string, unknown>> {
          return Promise.resolve({});
        }

        getPlayerStatistics(
          _playerId: PlayerId,
          _gameId?: GameId
        ): Promise<Record<string, unknown>> {
          return Promise.resolve({});
        }

        getGameHistory(_gameId: GameId): Promise<Record<string, unknown>> {
          return Promise.resolve({
            gameId: GameId.generate(),
            events: [],
            timeline: [],
          });
        }

        canUndo(): Promise<boolean> {
          return Promise.resolve(false);
        }

        canRedo(): Promise<boolean> {
          return Promise.resolve(false);
        }
      }

      const emptyService = new EmptyMockQueryService();
      const gameId = GameId.generate();
      const playerId = PlayerId.generate();

      // Should handle empty responses
      const stats = await emptyService.getGameStatistics(gameId);
      const playerStats = await emptyService.getPlayerStatistics(playerId);
      expect(stats).toEqual({});
      expect(playerStats).toEqual({});

      // Empty arrays should be handled
      const history = await emptyService.getGameHistory(gameId);
      expect(history['events']).toHaveLength(0);
      expect(history['timeline']).toHaveLength(0);
    });
  });
});
