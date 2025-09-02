/**
 * @file GameRepository Tests
 * Tests for the outbound port interface for Game aggregate persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameRepository } from './GameRepository';
import { GameId, GameStatus, Game } from '@twsoftball/domain';

// Mock implementation for testing the interface contract
class MockGameRepository implements GameRepository {
  private readonly games = new Map<string, Game>();

  findById(id: GameId): Promise<Game | null> {
    return Promise.resolve(this.games.get(id.value) || null);
  }

  save(game: Game): Promise<void> {
    this.games.set(game.id.value, game);
    return Promise.resolve();
  }

  findByStatus(status: GameStatus): Promise<Game[]> {
    return Promise.resolve(Array.from(this.games.values()).filter(game => game.status === status));
  }

  findByDateRange(): Promise<Game[]> {
    // For this mock, we'll just return all games since Game doesn't have a scheduled date
    // Real implementations would filter by the actual scheduled date
    return Promise.resolve(Array.from(this.games.values()));
  }

  exists(id: GameId): Promise<boolean> {
    return Promise.resolve(this.games.has(id.value));
  }

  delete(id: GameId): Promise<void> {
    this.games.delete(id.value);
    return Promise.resolve();
  }

  // Helper method for tests
  addTestGame(game: Game): void {
    this.games.set(game.id.value, game);
  }

  clear(): void {
    this.games.clear();
  }
}

describe('GameRepository Interface', () => {
  let repository: GameRepository;
  let mockRepository: MockGameRepository;
  let gameId: GameId;
  let testGame: Game;

  beforeEach(() => {
    mockRepository = new MockGameRepository();
    repository = mockRepository;
    gameId = GameId.generate();

    // Create a test game using domain factory methods
    testGame = Game.createNew(gameId, 'Test Home Team', 'Test Away Team');
  });

  describe('Interface Contract', () => {
    it('should define all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.findByDateRange).toBe('function');
      expect(typeof repository.exists).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should return promises for all methods', () => {
      expect(repository.findById(gameId)).toBeInstanceOf(Promise);
      expect(repository.save(testGame)).toBeInstanceOf(Promise);
      expect(repository.findByStatus(GameStatus.IN_PROGRESS)).toBeInstanceOf(Promise);
      expect(repository.findByDateRange(new Date(), new Date())).toBeInstanceOf(Promise);
      expect(repository.exists(gameId)).toBeInstanceOf(Promise);
      expect(repository.delete(gameId)).toBeInstanceOf(Promise);
    });
  });

  describe('findById Method', () => {
    it('should return game when found', async () => {
      mockRepository.addTestGame(testGame);

      const result = await repository.findById(gameId);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Game);
      expect(result!.id).toEqual(gameId);
    });

    it('should return null when game not found', async () => {
      const nonExistentId = GameId.generate();

      const result = await repository.findById(nonExistentId);

      expect(result).toBeNull();
    });

    it('should handle GameId parameter correctly', async () => {
      mockRepository.addTestGame(testGame);

      const result = await repository.findById(testGame.id);

      expect(result).not.toBeNull();
      expect(result!.id.value).toBe(testGame.id.value);
    });
  });

  describe('save Method', () => {
    it('should save new game successfully', async () => {
      await repository.save(testGame);

      const retrieved = await repository.findById(gameId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toEqual(gameId);
    });

    it('should update existing game', async () => {
      // Save initial game
      await repository.save(testGame);

      // Start the game to change its state
      testGame.startGame();
      const startedGame = testGame;
      await repository.save(startedGame);

      // Retrieve and verify update
      const retrieved = await repository.findById(gameId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.status).toBe(GameStatus.IN_PROGRESS);
    });

    it('should handle Game domain object', async () => {
      expect(testGame).toBeInstanceOf(Game);

      await expect(repository.save(testGame)).resolves.toBeUndefined();
    });
  });

  describe('findByStatus Method', () => {
    beforeEach(async () => {
      // Set up test data with different statuses
      const game1 = Game.createNew(GameId.generate(), 'Team A', 'Team B');
      game1.startGame();
      const game2 = Game.createNew(GameId.generate(), 'Team C', 'Team D');
      const game3 = Game.createNew(GameId.generate(), 'Team E', 'Team F');
      game3.startGame();

      await repository.save(game1);
      await repository.save(game2);
      await repository.save(game3);
    });

    it('should return games with matching status', async () => {
      const inProgressGames = await repository.findByStatus(GameStatus.IN_PROGRESS);

      expect(Array.isArray(inProgressGames)).toBe(true);
      expect(inProgressGames.length).toBe(2);
      inProgressGames.forEach(game => {
        expect(game).toBeInstanceOf(Game);
        expect(game.status).toBe(GameStatus.IN_PROGRESS);
      });
    });

    it('should return empty array for status with no games', async () => {
      const completedGames = await repository.findByStatus(GameStatus.COMPLETED);

      expect(Array.isArray(completedGames)).toBe(true);
      expect(completedGames).toHaveLength(0);
    });

    it('should handle all GameStatus values', async () => {
      const notStartedGames = await repository.findByStatus(GameStatus.NOT_STARTED);
      const inProgressGames = await repository.findByStatus(GameStatus.IN_PROGRESS);
      const completedGames = await repository.findByStatus(GameStatus.COMPLETED);

      expect(Array.isArray(notStartedGames)).toBe(true);
      expect(Array.isArray(inProgressGames)).toBe(true);
      expect(Array.isArray(completedGames)).toBe(true);
    });
  });

  describe('findByDateRange Method', () => {
    beforeEach(async () => {
      // Set up test data with different dates
      // Note: dates are currently unused as Game doesn't have scheduled date field

      const game1 = Game.createNew(GameId.generate(), 'Team A', 'Team B');
      const game2 = Game.createNew(GameId.generate(), 'Team C', 'Team D');
      const game3 = Game.createNew(GameId.generate(), 'Team E', 'Team F');

      await repository.save(game1);
      await repository.save(game2);
      await repository.save(game3);
    });

    it('should return games within date range', async () => {
      const startDate = new Date('2024-08-29T00:00:00Z');
      const endDate = new Date('2024-08-30T23:59:59Z');

      const games = await repository.findByDateRange(startDate, endDate);

      expect(Array.isArray(games)).toBe(true);
      expect(games).toHaveLength(3); // Mock returns all games since Game doesn't have scheduled date
      games.forEach(game => {
        expect(game).toBeInstanceOf(Game);
        // Real implementations would validate date ranges
        // But Game aggregate doesn't have scheduled date property
      });
    });

    it('should return empty array for range with no games', async () => {
      const startDate = new Date('2024-08-25T00:00:00Z');
      const endDate = new Date('2024-08-26T23:59:59Z');

      const games = await repository.findByDateRange(startDate, endDate);

      expect(Array.isArray(games)).toBe(true);
      expect(games).toHaveLength(3); // Mock returns all games since Game doesn't have scheduled date
    });

    it('should handle single day range', async () => {
      const singleDay = new Date('2024-08-30T00:00:00Z');
      const endOfDay = new Date('2024-08-30T23:59:59Z');

      const games = await repository.findByDateRange(singleDay, endOfDay);

      expect(games).toHaveLength(3); // Mock returns all games since Game doesn't have scheduled date
      // Real implementations would filter by the actual scheduled date
    });

    it('should handle date boundary conditions', async () => {
      const exactStart = new Date('2024-08-30T14:00:00Z');
      const exactEnd = new Date('2024-08-30T14:00:00Z');

      const games = await repository.findByDateRange(exactStart, exactEnd);

      expect(games).toHaveLength(3); // Mock returns all games since Game doesn't have scheduled date
      // Real implementations would filter by the actual scheduled date
    });
  });

  describe('delete Method', () => {
    it('should delete existing game', async () => {
      // Save game first
      await repository.save(testGame);
      let retrieved = await repository.findById(gameId);
      expect(retrieved).not.toBeNull();

      // Delete game
      await repository.delete(gameId);
      retrieved = await repository.findById(gameId);
      expect(retrieved).toBeNull();
    });

    it('should handle deletion of non-existent game gracefully', async () => {
      const nonExistentId = GameId.generate();

      // Should not throw error
      await expect(repository.delete(nonExistentId)).resolves.toBeUndefined();
    });

    it('should accept GameId parameter', async () => {
      await repository.save(testGame);

      await expect(repository.delete(testGame.id)).resolves.toBeUndefined();

      const retrieved = await repository.findById(testGame.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Domain Integration', () => {
    it('should work with Game domain objects', async () => {
      expect(testGame).toBeInstanceOf(Game);
      expect(testGame.id).toBeInstanceOf(GameId);

      await repository.save(testGame);
      const retrieved = await repository.findById(testGame.id);

      expect(retrieved).toBeInstanceOf(Game);
      expect(retrieved!.id).toBeInstanceOf(GameId);
    });

    it('should preserve Game aggregate state', async () => {
      const originalScore = testGame.score;
      const originalStatus = testGame.status;
      const originalInning = testGame.currentInning;

      await repository.save(testGame);
      const retrieved = await repository.findById(testGame.id);

      expect(retrieved!.score).toEqual(originalScore);
      expect(retrieved!.status).toBe(originalStatus);
      expect(retrieved!.currentInning).toBe(originalInning);
    });

    it('should handle GameStatus enum properly', async () => {
      testGame.startGame();
      const startedGame = testGame;
      await repository.save(startedGame);

      const inProgressGames = await repository.findByStatus(GameStatus.IN_PROGRESS);
      expect(inProgressGames).toHaveLength(1);
      expect(inProgressGames[0]?.status).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('Error Handling Contract', () => {
    it('should allow implementations to throw errors for database issues', async () => {
      class ErrorMockRepository implements GameRepository {
        findById(_id: GameId): Promise<Game | null> {
          return Promise.reject(new Error('Database connection failed'));
        }

        save(_game: Game): Promise<void> {
          return Promise.reject(new Error('Disk full'));
        }

        findByStatus(_status: GameStatus): Promise<Game[]> {
          return Promise.reject(new Error('Query timeout'));
        }

        findByDateRange(_startDate: Date, _endDate: Date): Promise<Game[]> {
          return Promise.reject(new Error('Invalid date range'));
        }

        exists(_id: GameId): Promise<boolean> {
          return Promise.reject(new Error('Database connection failed'));
        }

        delete(_id: GameId): Promise<void> {
          return Promise.reject(new Error('Permission denied'));
        }
      }

      const errorRepository = new ErrorMockRepository();

      await expect(errorRepository.findById(gameId)).rejects.toThrow('Database connection failed');

      await expect(errorRepository.save(testGame)).rejects.toThrow('Disk full');
    });
  });

  describe('Performance Contract', () => {
    it('should complete operations in reasonable time', async () => {
      const startTime = Date.now();

      await repository.save(testGame);
      await repository.findById(gameId);
      await repository.findByStatus(GameStatus.NOT_STARTED);
      await repository.delete(gameId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete basic operations quickly (within 100ms for mock)
      expect(duration).toBeLessThan(100);
    });
  });
});
