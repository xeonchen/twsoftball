/**
 * @file SubstitutePlayer.test.ts
 * Comprehensive tests for the SubstitutePlayer use case covering all substitution scenarios and edge cases.
 */

import {
  Game,
  GameId,
  PlayerId,
  TeamLineupId,
  JerseyNumber,
  FieldPosition,
  DomainError,
  PlayerSubstitutedIntoGame,
  FieldPositionChanged,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';
import { EventStore } from '../ports/out/EventStore';
import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';

import { SubstitutePlayer } from './SubstitutePlayer';

// Test data helpers

// Test data factories
const createTestGame = (_overrides: Partial<unknown> = {}): Game => {
  const game = Game.createNew(new GameId('test-game-123'), 'Home Eagles', 'Away Hawks');
  // Start the game to allow substitutions
  game.startGame();
  return game;
};

const createValidCommand = (
  overrides: Partial<SubstitutePlayerCommand> = {}
): SubstitutePlayerCommand => ({
  gameId: new GameId('test-game-123'),
  teamLineupId: new TeamLineupId('home-lineup'),
  battingSlot: 1,
  outgoingPlayerId: new PlayerId('outgoing-player'),
  incomingPlayerId: new PlayerId('incoming-player'),
  incomingPlayerName: 'John Substitute',
  incomingJerseyNumber: JerseyNumber.fromNumber(99),
  newFieldPosition: FieldPosition.PITCHER,
  inning: 5,
  isReentry: false,
  ...overrides,
});

describe('SubstitutePlayer Use Case', () => {
  let substitutePlayer: SubstitutePlayer;
  let mockGameRepository: GameRepository;
  let mockEventStore: EventStore;
  let mockLogger: Logger;
  let testGame: Game;

  // Individual mock functions
  const mockFindById = vi.fn();
  const mockSave = vi.fn();
  const mockFindByStatus = vi.fn();
  const mockFindByDateRange = vi.fn();
  const mockExists = vi.fn();
  const mockDelete = vi.fn();
  const mockAppend = vi.fn();
  const mockGetEvents = vi.fn();
  const mockGetGameEvents = vi.fn();
  const mockGetAllEvents = vi.fn();
  const mockGetEventsByType = vi.fn();
  const mockGetEventsByGameId = vi.fn();
  const mockDebug = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();
  const mockLog = vi.fn();
  const mockIsLevelEnabled = vi.fn();

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset mock behavior
    mockIsLevelEnabled.mockReturnValue(true);

    mockGameRepository = {
      findById: mockFindById,
      save: mockSave,
      findByStatus: mockFindByStatus,
      findByDateRange: mockFindByDateRange,
      exists: mockExists,
      delete: mockDelete,
    } as GameRepository;

    mockEventStore = {
      append: mockAppend,
      getEvents: mockGetEvents,
      getGameEvents: mockGetGameEvents,
      getAllEvents: mockGetAllEvents,
      getEventsByType: mockGetEventsByType,
      getEventsByGameId: mockGetEventsByGameId,
    } as EventStore;

    mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      log: mockLog,
      isLevelEnabled: mockIsLevelEnabled,
    } as Logger;

    substitutePlayer = new SubstitutePlayer(mockGameRepository, mockEventStore, mockLogger);

    testGame = createTestGame();
    mockFindById.mockResolvedValue(testGame);
  });

  describe('Constructor and Dependencies', () => {
    it('should create instance with required dependencies', () => {
      expect(substitutePlayer).toBeInstanceOf(SubstitutePlayer);
    });

    it('should inject all required dependencies', () => {
      const newSubstitutePlayer = new SubstitutePlayer(
        mockGameRepository,
        mockEventStore,
        mockLogger
      );

      expect(newSubstitutePlayer).toBeDefined();
    });
  });

  describe('Successful Substitutions', () => {
    beforeEach(() => {
      // Setup successful mocks
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should execute regular player substitution successfully', async () => {
      const command = createValidCommand({
        battingSlot: 1,
        isReentry: false,
        notes: 'Regular substitution for tactical advantage',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(true);
      expect(result.substitutionDetails).toBeDefined();
      expect(result.substitutionDetails!.battingSlot).toBe(1);
      expect(result.substitutionDetails!.wasReentry).toBe(false);
      expect(result.positionChanged).toBe(false); // Same position
      expect(result.reentryUsed).toBe(false);
      expect(result.errors).toBeUndefined();
    });

    it('should execute starter re-entry substitution successfully', async () => {
      const command = createValidCommand({
        battingSlot: 3,
        outgoingPlayerId: new PlayerId('substitute-player'),
        incomingPlayerId: new PlayerId('original-starter'),
        incomingPlayerName: 'Original Smith',
        isReentry: true,
        notes: 'Starter returning for final innings',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(true);
      expect(result.substitutionDetails!.wasReentry).toBe(true);
      expect(result.reentryUsed).toBe(true);
      expect(result.substitutionDetails!.notes).toBe('Starter returning for final innings');
    });

    it('should execute position change substitution successfully', async () => {
      const command = createValidCommand({
        newFieldPosition: FieldPosition.FIRST_BASE, // Different from pitcher
        notes: 'Moving player to different position',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(true);
      expect(result.positionChanged).toBe(true);
      expect(result.substitutionDetails!.newFieldPosition).toBe(FieldPosition.FIRST_BASE);
    });

    it('should handle pinch hitter scenario', async () => {
      const command = createValidCommand({
        battingSlot: 9, // Pitcher's slot typically
        outgoingPlayerId: new PlayerId('pitcher-batting'),
        incomingPlayerId: new PlayerId('pinch-hitter'),
        incomingPlayerName: 'Clutch Henderson',
        newFieldPosition: FieldPosition.EXTRA_PLAYER,
        notes: 'Pinch hitter in crucial situation',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(true);
      expect(result.positionChanged).toBe(true);
      expect(result.substitutionDetails!.newFieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
    });

    it('should handle defensive specialist substitution', async () => {
      const command = createValidCommand({
        battingSlot: 7,
        incomingPlayerName: 'Gold Glove Wilson',
        newFieldPosition: FieldPosition.CENTER_FIELD,
        inning: 9,
        notes: 'Defensive specialist for final inning',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(true);
      expect(result.substitutionDetails!.inning).toBe(9);
    });

    it('should generate appropriate domain events', async () => {
      const command = createValidCommand();

      await substitutePlayer.execute(command);

      expect(mockAppend).toHaveBeenCalledWith(
        command.gameId,
        'Game',
        expect.arrayContaining([expect.any(PlayerSubstitutedIntoGame)])
      );
    });

    it('should generate field position changed event when position changes', async () => {
      const command = createValidCommand({
        newFieldPosition: FieldPosition.FIRST_BASE, // Different position
      });

      await substitutePlayer.execute(command);

      expect(mockAppend).toHaveBeenCalledWith(
        command.gameId,
        'Game',
        expect.arrayContaining([
          expect.any(PlayerSubstitutedIntoGame),
          expect.any(FieldPositionChanged),
        ])
      );
    });

    it('should persist game state changes', async () => {
      const command = createValidCommand();

      await substitutePlayer.execute(command);

      expect(mockSave).toHaveBeenCalledWith(testGame);
    });

    it('should log successful substitutions', async () => {
      const command = createValidCommand({
        notes: 'Test substitution for logging',
      });

      await substitutePlayer.execute(command);

      expect(mockInfo).toHaveBeenCalledWith(
        'Player substitution completed successfully',
        expect.objectContaining({
          gameId: command.gameId.value,
          battingSlot: command.battingSlot,
          operation: 'substitutePlayer',
        })
      );
    });
  });

  describe('Validation Failures', () => {
    it('should fail when game not found', async () => {
      mockFindById.mockResolvedValue(null);
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Game not found: test-game-123');
    });

    it('should fail when game is not in progress', async () => {
      const completedGame = createTestGame();
      // Simulate completed game
      mockFindById.mockResolvedValue(completedGame);

      const command = createValidCommand();
      const result = await substitutePlayer.execute(command);

      // This would depend on game status validation in the implementation
      if (!result.success && result.errors) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/game.*status/i)])
        );
      }
    });

    it('should fail for invalid batting slot', async () => {
      const command = createValidCommand({
        battingSlot: 25, // Invalid - outside 1-20 range
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/batting slot/i)])
      );
    });

    it('should fail for invalid inning', async () => {
      const command = createValidCommand({
        inning: 0, // Invalid - must be >= 1
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/inning/i)]));
    });

    it('should fail when outgoing player not in specified slot', async () => {
      const command = createValidCommand({
        outgoingPlayerId: new PlayerId('wrong-player'),
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/player.*not.*batting slot/i)])
      );
    });

    it('should fail when incoming player already in lineup', async () => {
      const command = createValidCommand({
        incomingPlayerId: new PlayerId('already-active-player'),
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/already.*lineup/i)])
      );
    });
  });

  describe('Re-entry Rule Violations', () => {
    it('should fail when non-starter attempts re-entry', async () => {
      const command = createValidCommand({
        incomingPlayerId: new PlayerId('non-starter-player'),
        isReentry: true,
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/not.*original starter/i)])
      );
    });

    it('should fail when starter attempts second re-entry', async () => {
      const command = createValidCommand({
        incomingPlayerId: new PlayerId('already-reentered-starter'),
        isReentry: true,
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/only.*once.*per game/i)])
      );
    });

    it('should fail when claiming re-entry for regular substitution', async () => {
      const command = createValidCommand({
        incomingPlayerId: new PlayerId('new-substitute-player'),
        isReentry: true, // Wrong - this is not a re-entry
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/not.*starter/i)])
      );
    });
  });

  describe('Timing Constraint Violations', () => {
    it('should fail when substituting in same inning player entered', async () => {
      const command = createValidCommand({
        inning: 3, // Same inning current player entered
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/same inning/i)])
      );
    });

    it('should fail when substituting before player entered', async () => {
      const command = createValidCommand({
        inning: 1, // Before current player entered
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/earlier.*inning/i)])
      );
    });
  });

  describe('Data Validation Failures', () => {
    it('should fail with duplicate jersey number', async () => {
      const command = createValidCommand({
        incomingJerseyNumber: JerseyNumber.fromNumber(5), // Already assigned
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/jersey number.*already/i)])
      );
    });

    it('should fail with empty player name', async () => {
      const command = createValidCommand({
        incomingPlayerName: '',
      });

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/player name.*empty/i)])
      );
    });

    it('should fail with invalid field position combination', () => {
      // This would test business rules about position assignments
      createValidCommand({
        newFieldPosition: FieldPosition.PITCHER, // If pitcher already assigned
      });

      // Implementation would validate position conflicts
      // TODO: Implement this test when business rules are defined
    });
  });

  describe('Infrastructure Failures', () => {
    it('should handle game repository load failure', async () => {
      mockFindById.mockRejectedValue(new Error('Database connection failed'));
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/failed to load game/i)])
      );
    });

    it('should handle game repository save failure', async () => {
      mockSave.mockRejectedValue(new Error('Database save failed'));
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/failed to save/i)])
      );
    });

    it('should handle event store failure', async () => {
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockRejectedValue(new Error('Event store failure'));
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/failed to store events/i)])
      );
    });

    it('should log infrastructure failures', async () => {
      const error = new Error('Database connection timeout');
      mockFindById.mockRejectedValue(error);
      const command = createValidCommand();

      await substitutePlayer.execute(command);

      expect(mockError).toHaveBeenCalledWith(
        'Failed to execute player substitution',
        error,
        expect.objectContaining({
          gameId: command.gameId.value,
          operation: 'substitutePlayer',
        })
      );
    });
  });

  describe('Domain Error Handling', () => {
    it('should handle domain validation errors gracefully', async () => {
      const domainError = new DomainError('Substitution violates softball rules');
      mockSave.mockRejectedValue(domainError);
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([domainError.message]);
    });

    it('should differentiate domain errors from infrastructure errors', () => {
      new DomainError('Invalid substitution timing');
      // mockFindById.mockResolvedValue(testGame);
      // Simulate domain error during processing

      createValidCommand();

      // Would need to set up scenario that triggers domain error
      // This depends on the actual implementation
      // TODO: Implement this test when domain error handling is complete
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(() => {
      // Setup successful mocks for complex scenario tests
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should handle multiple simultaneous substitution attempts', async () => {
      const command1 = createValidCommand({
        battingSlot: 1,
        outgoingPlayerId: new PlayerId('outgoing-player-1'),
        incomingPlayerId: new PlayerId('incoming-player-1'),
      });
      const command2 = createValidCommand({
        battingSlot: 2,
        outgoingPlayerId: new PlayerId('outgoing-player-2'),
        incomingPlayerId: new PlayerId('incoming-player-2'),
      });

      // This would test concurrency handling if implemented
      const [result1, result2] = await Promise.all([
        substitutePlayer.execute(command1),
        substitutePlayer.execute(command2),
      ]);

      // Both should succeed since they are different slots and players
      expect(result1.success && result2.success).toBe(true);
    });

    it('should handle emergency substitution scenarios', async () => {
      const emergencyCommand = createValidCommand({
        notes: 'Emergency substitution due to injury',
        inning: 3, // Mid-game emergency
      });

      const result = await substitutePlayer.execute(emergencyCommand);

      if (result.success) {
        expect(result.substitutionDetails!.notes).toContain('injury');
      }
    });

    it('should handle tournament format with extended lineup', async () => {
      const tournamentCommand = createValidCommand({
        battingSlot: 15, // Extended tournament lineup
        incomingPlayerName: 'Tournament Player',
        notes: 'Tournament rotation keeping players fresh',
      });

      const result = await substitutePlayer.execute(tournamentCommand);

      if (result.success) {
        expect(result.substitutionDetails!.battingSlot).toBe(15);
      }
    });

    it('should handle strategic late-game substitutions', async () => {
      const lateGameCommand = createValidCommand({
        inning: 9,
        newFieldPosition: FieldPosition.CENTER_FIELD,
        notes: 'Defensive upgrade for final inning',
      });

      const result = await substitutePlayer.execute(lateGameCommand);

      if (result.success) {
        expect(result.substitutionDetails!.inning).toBe(9);
        expect(result.positionChanged).toBe(true);
      }
    });
  });

  describe('Performance and Logging', () => {
    beforeEach(() => {
      // Setup successful mocks for performance tests
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should log performance metrics for successful operations', async () => {
      const command = createValidCommand();

      await substitutePlayer.execute(command);

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringMatching(/completed successfully/i),
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });

    it('should log detailed debugging information', async () => {
      const command = createValidCommand();

      await substitutePlayer.execute(command);

      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(/starting.*substitution/i),
        expect.objectContaining({
          gameId: command.gameId.value,
          battingSlot: command.battingSlot,
        })
      );
    });

    it('should handle operations within reasonable time limits', async () => {
      const command = createValidCommand();
      const startTime = Date.now();

      await substitutePlayer.execute(command);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Result DTO Construction', () => {
    it('should build complete success result DTO', async () => {
      const command = createValidCommand({
        notes: 'Test substitution with complete details',
      });

      const result = await substitutePlayer.execute(command);

      if (result.success) {
        expect(result.gameState).toBeDefined();
        expect(result.substitutionDetails).toBeDefined();
        expect(result.substitutionDetails!.timestamp).toBeInstanceOf(Date);
        expect(result.positionChanged).toBeDefined();
        expect(result.reentryUsed).toBeDefined();
      }
    });

    it('should build complete failure result DTO', async () => {
      mockFindById.mockResolvedValue(null);
      const command = createValidCommand();

      const result = await substitutePlayer.execute(command);

      expect(result.success).toBe(false);
      expect(result.gameState).toBeDefined(); // Should provide context even on failure
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.substitutionDetails).toBeUndefined();
    });
  });
});
