/**
 * @file EndInning Use Case Tests
 * Comprehensive tests for the EndInning use case following TDD approach.
 */

import { Game, GameId, GameStatus, DomainError } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EndInningCommand } from '../dtos/EndInningCommand';
import { EventStore } from '../ports/out/EventStore';
import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';

import { EndInning } from './EndInning';

describe('EndInning Use Case', () => {
  let useCase: EndInning;
  let mockGameRepository: GameRepository;
  let mockEventStore: EventStore;
  let mockLogger: Logger;
  let gameId: GameId;
  let validCommand: EndInningCommand;
  let mockGame: Game;

  // Create individual mock functions
  const mockFindById = vi.fn();
  const mockSave = vi.fn();
  const mockExists = vi.fn();
  const mockAppend = vi.fn();
  const mockGetEvents = vi.fn();
  const mockDebug = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock dependencies
    mockGameRepository = {
      findById: mockFindById,
      save: mockSave,
      exists: mockExists,
      findByStatus: vi.fn(),
      findByDateRange: vi.fn(),
      delete: vi.fn(),
    } as GameRepository;

    mockEventStore = {
      append: mockAppend,
      getEvents: mockGetEvents,
      getGameEvents: vi.fn(),
      getAllEvents: vi.fn(),
      getEventsByType: vi.fn(),
      getEventsByGameId: vi.fn(),
    } as EventStore;

    mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      log: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as Logger;

    // Create use case instance
    useCase = new EndInning(mockGameRepository, mockEventStore, mockLogger);

    // Create test data
    gameId = GameId.generate();

    validCommand = {
      gameId,
      inning: 5,
      isTopHalf: true,
      endingReason: 'THREE_OUTS',
      finalOuts: 3,
      gameEnding: false,
      notes: 'Standard inning ending',
      timestamp: new Date('2024-08-30T15:30:00Z'),
    };

    // Create mock game
    mockGame = Game.createNew(gameId, 'Home Team', 'Away Team');
    mockGame.startGame(); // Game is in progress
  });

  describe('Constructor', () => {
    it('should create use case with required dependencies', () => {
      expect(useCase).toBeInstanceOf(EndInning);
      expect(useCase).toBeDefined();
    });

    it('should require all dependencies', () => {
      expect(
        () => new EndInning(null as unknown as GameRepository, mockEventStore, mockLogger)
      ).toThrow();
      expect(
        () => new EndInning(mockGameRepository, null as unknown as EventStore, mockLogger)
      ).toThrow();
      expect(
        () => new EndInning(mockGameRepository, mockEventStore, null as unknown as Logger)
      ).toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should validate required command fields', async () => {
      // Missing gameId
      const invalidCommand = {
        ...validCommand,
        gameId: null as unknown as GameId,
      } as EndInningCommand;

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      // The specific error message may be caught by the exception handler
      expect(result.errors![0]).toMatch(/GameId|null|undefined|error/i);
    });

    it('should validate inning number is positive', async () => {
      const invalidCommand = {
        ...validCommand,
        inning: 0,
      };

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inning must be 1 or greater');
    });

    it('should validate inning number is integer', async () => {
      const invalidCommand = {
        ...validCommand,
        inning: 5.5,
      };

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inning must be an integer');
    });

    it('should validate final outs count range', async () => {
      const invalidCommand = {
        ...validCommand,
        finalOuts: -1,
      };

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Final outs must be between 0 and 3');
    });

    it('should validate final outs count upper bound', async () => {
      const invalidCommand = {
        ...validCommand,
        finalOuts: 4,
      };

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Final outs must be between 0 and 3');
    });

    it('should validate ending reason is valid', async () => {
      const invalidCommand = {
        ...validCommand,
        endingReason: 'INVALID_REASON' as unknown as typeof validCommand.endingReason,
      } as EndInningCommand;

      const result = await useCase.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid ending reason');
    });

    it('should accept all valid ending reasons', async () => {
      const validReasons = [
        'THREE_OUTS',
        'MERCY_RULE',
        'TIME_LIMIT',
        'FORFEIT',
        'WALKOFF',
        'MANUAL',
      ] as const;

      for (const reason of validReasons) {
        const command = {
          ...validCommand,
          endingReason: reason,
        };

        // Use direct mock functions instead of vi.mocked
        mockFindById.mockResolvedValue(mockGame);

        const result = await useCase.execute(command);

        // Should pass validation (may fail later for other reasons, but not validation)
        if (result.errors) {
          expect(result.errors).not.toContain('Invalid ending reason');
        }
      }
    });
  });

  describe('Game State Validation', () => {
    it('should fail when game is not found', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(null);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Game not found: ${gameId.value}`);
      expect(result.transitionType).toBe('FAILED');
    });

    it('should fail when game is not in progress', async () => {
      const completedGame = Game.createNew(gameId, 'Home Team', 'Away Team');
      // Game is NOT_STARTED, not IN_PROGRESS

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(completedGame);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot end inning: Game is not in progress');
      expect(result.transitionType).toBe('FAILED');
    });

    it('should succeed when game is in progress', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(true);
      expect(mockFindById).toHaveBeenCalledWith(gameId);
    });
  });

  describe('Half-Inning Transitions (Top → Bottom)', () => {
    it('should handle top half ending transition to bottom half', async () => {
      const command = {
        ...validCommand,
        inning: 3,
        isTopHalf: true,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
        gameEnding: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.transitionType).toBe('HALF_INNING');
      expect(result.previousHalf).toEqual({ inning: 3, isTopHalf: true });
      expect(result.newHalf).toEqual({ inning: 3, isTopHalf: false });
      expect(result.gameEnded).toBe(false);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
    });

    it('should clear bases and reset outs for bottom half', async () => {
      const command = {
        ...validCommand,
        inning: 4,
        isTopHalf: true,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameState.outs).toBe(0);
      expect(result.gameState.bases.first).toBeNull();
      expect(result.gameState.bases.second).toBeNull();
      expect(result.gameState.bases.third).toBeNull();
      expect(result.gameState.currentBatterSlot).toBe(1); // Reset to leadoff
    });

    it('should generate HalfInningEnded event for top half ending', async () => {
      const command = {
        ...validCommand,
        inning: 2,
        isTopHalf: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
      expect(result.eventsGenerated).toHaveLength(1); // Only HalfInningEnded for top half
    });

    it('should update game state to show bottom half', async () => {
      const command = {
        ...validCommand,
        inning: 5,
        isTopHalf: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameState.currentInning).toBe(5);
      expect(result.gameState.isTopHalf).toBe(false); // Now bottom half
      expect(result.gameState.battingTeam).toBe('HOME'); // Home team batting in bottom half
    });
  });

  describe('Full Inning Transitions (Bottom → Next Top)', () => {
    it('should handle bottom half ending transition to next inning', async () => {
      const command = {
        ...validCommand,
        inning: 6,
        isTopHalf: false,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
        gameEnding: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.transitionType).toBe('FULL_INNING');
      expect(result.previousHalf).toEqual({ inning: 6, isTopHalf: false });
      expect(result.newHalf).toEqual({ inning: 7, isTopHalf: true });
      expect(result.gameEnded).toBe(false);
    });

    it('should generate both HalfInningEnded and InningAdvanced events', async () => {
      const command = {
        ...validCommand,
        inning: 3,
        isTopHalf: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
      expect(result.eventsGenerated).toContain('InningAdvanced');
      expect(result.eventsGenerated).toHaveLength(2);
    });

    it('should advance to correct next inning', async () => {
      const command = {
        ...validCommand,
        inning: 4,
        isTopHalf: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameState.currentInning).toBe(5); // Advanced to 5th inning
      expect(result.gameState.isTopHalf).toBe(true); // Top of next inning
      expect(result.gameState.battingTeam).toBe('AWAY'); // Away team bats in top half
    });

    it('should reset all inning state for new inning', async () => {
      const command = {
        ...validCommand,
        inning: 2,
        isTopHalf: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameState.outs).toBe(0);
      expect(result.gameState.currentBatterSlot).toBe(1);
      expect(result.gameState.bases.basesLoaded).toBe(false);
    });
  });

  describe('Game Ending Detection', () => {
    it('should detect regulation game completion (bottom of 7th)', async () => {
      const command = {
        ...validCommand,
        inning: 7,
        isTopHalf: false,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
        gameEnding: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.transitionType).toBe('GAME_END');
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('REGULATION');
      expect(result.newHalf).toBeNull(); // No next half - game over
    });

    it('should detect mercy rule game ending', async () => {
      const command = {
        ...validCommand,
        inning: 5,
        isTopHalf: false,
        endingReason: 'MERCY_RULE' as const,
        finalOuts: 1,
        gameEnding: true,
        notes: '15-run mercy rule invoked',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('MERCY_RULE');
      expect(result.endingReason).toBe('MERCY_RULE');
      expect(result.finalScore).toBeDefined();
    });

    it('should detect walkoff game ending', async () => {
      const command = {
        ...validCommand,
        inning: 7,
        isTopHalf: false,
        endingReason: 'WALKOFF' as const,
        finalOuts: 2, // Game ended before 3rd out
        gameEnding: true,
        notes: 'Walkoff RBI single',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('WALKOFF');
      expect(result.finalOuts).toBe(2);
      expect(result.previousHalf.isTopHalf).toBe(false); // Home team was batting
    });

    it('should generate GameCompleted event for game ending', async () => {
      const command = {
        ...validCommand,
        inning: 7,
        isTopHalf: false,
        gameEnding: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('GameCompleted');
      expect(result.eventsGenerated).toContain('HalfInningEnded');
    });

    it('should set game status to COMPLETED when game ends', async () => {
      const command = {
        ...validCommand,
        inning: 7,
        isTopHalf: false,
        gameEnding: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameState.status).toBe(GameStatus.COMPLETED);
    });
  });

  describe('Special Ending Reasons', () => {
    it('should handle time limit ending', async () => {
      const command = {
        ...validCommand,
        endingReason: 'TIME_LIMIT' as const,
        finalOuts: 2, // Game ended mid-inning
        gameEnding: true,
        notes: '2-hour time limit reached',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.endingReason).toBe('TIME_LIMIT');
      expect(result.gameEndingType).toBe('TIME_LIMIT');
      expect(result.gameEnded).toBe(true);
    });

    it('should handle forfeit ending', async () => {
      const command = {
        ...validCommand,
        endingReason: 'FORFEIT' as const,
        finalOuts: 0, // No outs when forfeit declared
        gameEnding: true,
        notes: 'Forfeit due to insufficient players',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.endingReason).toBe('FORFEIT');
      expect(result.gameEndingType).toBe('FORFEIT');
      expect(result.finalOuts).toBe(0);
    });

    it('should handle manual administrative ending', async () => {
      const command = {
        ...validCommand,
        endingReason: 'MANUAL' as const,
        finalOuts: 2,
        gameEnding: false, // Could be mid-game administrative action
        notes: 'Inning ended for field maintenance',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.endingReason).toBe('MANUAL');
      expect(result.gameEnded).toBe(false); // Not necessarily game ending
    });
  });

  describe('Extra Innings Handling', () => {
    it('should handle extra innings progression', async () => {
      const command = {
        ...validCommand,
        inning: 8,
        isTopHalf: false,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
        gameEnding: false,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.transitionType).toBe('FULL_INNING');
      expect(result.newHalf!.inning).toBe(9); // 9th inning
      expect(result.gameEnded).toBe(false); // Game continues
    });

    it('should handle extra innings walkoff', async () => {
      const command = {
        ...validCommand,
        inning: 10,
        isTopHalf: false,
        endingReason: 'WALKOFF' as const,
        finalOuts: 1,
        gameEnding: true,
        notes: 'Extra innings walkoff victory',
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('WALKOFF');
      expect(result.previousHalf.inning).toBe(10);
    });
  });

  describe('Event Generation', () => {
    it('should generate HalfInningEnded event for all transitions', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
    });

    it('should generate InningAdvanced for full inning transitions', async () => {
      const command = {
        ...validCommand,
        isTopHalf: false, // Bottom half ending
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('InningAdvanced');
    });

    it('should generate GameCompleted for game ending', async () => {
      const command = {
        ...validCommand,
        gameEnding: true,
      };

      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.eventsGenerated).toContain('GameCompleted');
    });
  });

  describe('Persistence', () => {
    it('should save updated game state', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      await useCase.execute(validCommand);

      expect(mockSave).toHaveBeenCalledWith(expect.any(Game));
    });

    it('should store domain events', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      await useCase.execute(validCommand);

      expect(mockAppend).toHaveBeenCalledWith(gameId, 'Game', expect.any(Array));
    });

    it('should handle save failures gracefully', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockRejectedValue(new Error('Database save failed'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state');
      expect(mockError).toHaveBeenCalled();
    });

    it('should handle event store failures gracefully', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockResolvedValue(undefined); // Ensure save succeeds
      // Use direct mock functions instead of vi.mocked
      mockAppend.mockRejectedValue(new Error('Event store failed'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to store events');
      expect(mockError).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log debug information during processing', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      await useCase.execute(validCommand);

      expect(mockDebug).toHaveBeenCalledWith(
        'Starting inning ending process',
        expect.objectContaining({
          gameId: gameId.value,
          inning: validCommand.inning,
          isTopHalf: validCommand.isTopHalf,
        })
      );
    });

    it('should log successful completion', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockResolvedValue(undefined); // Ensure save succeeds
      mockAppend.mockResolvedValue(undefined); // Ensure event store succeeds

      await useCase.execute(validCommand);

      expect(mockInfo).toHaveBeenCalledWith(
        'Inning ended successfully',
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'endInning',
        })
      );
    });

    it('should log errors with context', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockRejectedValue(new Error('Database error'));

      await useCase.execute(validCommand);

      expect(mockError).toHaveBeenCalledWith(
        'Failed to end inning',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'endInning',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle domain errors gracefully', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockRejectedValue(new DomainError('Invalid game state transition'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid game state transition');
    });

    it('should handle infrastructure errors', async () => {
      mockFindById.mockRejectedValue(new Error('Database connection failed'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      // Should contain some error message about infrastructure failure
      expect(result.errors![0]).toMatch(/Failed to load|Failed to save|Database connection|error/i);
    });

    it('should handle unexpected errors', async () => {
      mockFindById.mockRejectedValue(new Error('Unexpected error'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred');
    });

    it('should provide current game state on errors', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockRejectedValue(new Error('Save failed'));

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(false);
      expect(result.gameState).toBeDefined();
      expect(result.gameState.gameId).toEqual(gameId);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should complete execution within reasonable time', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const startTime = Date.now();
      await useCase.execute(validCommand);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent execution attempts', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);
      mockSave.mockResolvedValue(undefined); // Ensure save succeeds
      mockAppend.mockResolvedValue(undefined); // Ensure event store succeeds

      // Execute multiple commands concurrently
      const commands = [
        { ...validCommand, inning: 3 },
        { ...validCommand, inning: 4 },
        { ...validCommand, inning: 5 },
      ];

      const results = await Promise.all(commands.map(cmd => useCase.execute(cmd)));

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Integration with Domain Aggregates', () => {
    beforeEach(() => {
      // Setup successful mocks for integration tests
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should coordinate with Game aggregate properly', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(true);
      expect(result.gameState.gameId).toEqual(mockGame.id);
      expect(result.gameState.status).toBe(mockGame.status);
    });

    it('should maintain consistency with inning state transitions', async () => {
      // Use direct mock functions instead of vi.mocked
      mockFindById.mockResolvedValue(mockGame);

      const result = await useCase.execute(validCommand);

      expect(result.success).toBe(true);

      // Verify state reset after inning transition
      expect(result.gameState.outs).toBe(0);
      expect(result.gameState.currentBatterSlot).toBe(1);

      // Verify proper half-inning transition
      if (result.transitionType === 'HALF_INNING') {
        expect(result.gameState.isTopHalf).toBe(!validCommand.isTopHalf);
      }
    });
  });
});
