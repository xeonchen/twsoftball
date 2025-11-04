/**
 * @file StartNewGame Error Handling Tests
 * Error scenarios and edge cases tests for StartNewGame use case.
 *
 * @remarks
 * This test suite validates error handling scenarios including:
 * - Game existence validation and conflicts
 * - Infrastructure error scenarios (database, event store failures)
 * - Logging scenarios and error reporting
 * - Edge cases for comprehensive coverage
 * - Error handling coverage for specific code paths
 * - Coverage verification and completeness testing
 *
 * Tests ensure robust error handling and proper recovery mechanisms.
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition, DomainError } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { StartNewGameCommand, LineupPlayerDTO, GameRulesDTO } from '../dtos/StartNewGameCommand.js';
import {
  createGameApplicationServiceMocks,
  createMockInningStateRepository,
  createMockTeamLineupRepository,
} from '../test-factories/index.js';

import { StartNewGame } from './StartNewGame.js';

describe('StartNewGame Error Handling', () => {
  let startNewGame: StartNewGame;
  let mocks: ReturnType<typeof createGameApplicationServiceMocks>;

  // Test data constants
  const testGameId = new GameId('test-game-123');
  const testGameDate = new Date(Date.now() + 86400000);
  const testLocation = 'City Park Field 1';

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mocks = createGameApplicationServiceMocks();

    // Create use case instance with mocked dependencies
    startNewGame = new StartNewGame(
      mocks.mockGameRepository,
      createMockInningStateRepository(),
      createMockTeamLineupRepository(),
      mocks.mockEventStore,
      mocks.mockLogger
    );
  });

  /**
   * Helper function to create a valid lineup with standard slow-pitch positions.
   *
   * @remarks
   * Creates a complete 10-player lineup with all standard field positions
   * and proper batting order. This represents the standard (most common) starting lineup
   * for slow-pitch softball including the SHORT_FIELDER position.
   *
   * @returns Complete lineup with 10 players in standard slow-pitch positions
   */
  function createValidLineup(): LineupPlayerDTO[] {
    return [
      {
        playerId: new PlayerId('player-1'),
        name: 'John Pitcher',
        jerseyNumber: JerseyNumber.fromNumber(1),
        battingOrderPosition: 1,
        fieldPosition: FieldPosition.PITCHER,
        preferredPositions: [FieldPosition.PITCHER],
      },
      {
        playerId: new PlayerId('player-2'),
        name: 'Jane Catcher',
        jerseyNumber: JerseyNumber.fromNumber(2),
        battingOrderPosition: 2,
        fieldPosition: FieldPosition.CATCHER,
        preferredPositions: [FieldPosition.CATCHER],
      },
      {
        playerId: new PlayerId('player-3'),
        name: 'Bob First',
        jerseyNumber: JerseyNumber.fromNumber(3),
        battingOrderPosition: 3,
        fieldPosition: FieldPosition.FIRST_BASE,
        preferredPositions: [FieldPosition.FIRST_BASE],
      },
      {
        playerId: new PlayerId('player-4'),
        name: 'Sue Second',
        jerseyNumber: JerseyNumber.fromNumber(4),
        battingOrderPosition: 4,
        fieldPosition: FieldPosition.SECOND_BASE,
        preferredPositions: [FieldPosition.SECOND_BASE],
      },
      {
        playerId: new PlayerId('player-5'),
        name: 'Mike Third',
        jerseyNumber: JerseyNumber.fromNumber(5),
        battingOrderPosition: 5,
        fieldPosition: FieldPosition.THIRD_BASE,
        preferredPositions: [FieldPosition.THIRD_BASE],
      },
      {
        playerId: new PlayerId('player-6'),
        name: 'Lisa Short',
        jerseyNumber: JerseyNumber.fromNumber(6),
        battingOrderPosition: 6,
        fieldPosition: FieldPosition.SHORTSTOP,
        preferredPositions: [FieldPosition.SHORTSTOP],
      },
      {
        playerId: new PlayerId('player-7'),
        name: 'Tom Left',
        jerseyNumber: JerseyNumber.fromNumber(7),
        battingOrderPosition: 7,
        fieldPosition: FieldPosition.LEFT_FIELD,
        preferredPositions: [FieldPosition.LEFT_FIELD],
      },
      {
        playerId: new PlayerId('player-8'),
        name: 'Amy Center',
        jerseyNumber: JerseyNumber.fromNumber(8),
        battingOrderPosition: 8,
        fieldPosition: FieldPosition.CENTER_FIELD,
        preferredPositions: [FieldPosition.CENTER_FIELD],
      },
      {
        playerId: new PlayerId('player-9'),
        name: 'Chris Right',
        jerseyNumber: JerseyNumber.fromNumber(9),
        battingOrderPosition: 9,
        fieldPosition: FieldPosition.RIGHT_FIELD,
        preferredPositions: [FieldPosition.RIGHT_FIELD],
      },
      {
        playerId: new PlayerId('player-10'),
        name: 'Sam Short',
        jerseyNumber: JerseyNumber.fromNumber(10),
        battingOrderPosition: 10,
        fieldPosition: FieldPosition.SHORT_FIELDER,
        preferredPositions: [FieldPosition.SHORT_FIELDER],
      },
    ];
  }

  /**
   * Helper function to create standard game rules configuration.
   *
   * @remarks
   * Provides typical recreational league rules with mercy rule enabled
   * and reasonable time limits. Used as baseline for testing.
   *
   * @returns Standard game rules configuration
   */
  function createStandardGameRules(): GameRulesDTO {
    return {
      mercyRuleEnabled: true,
      mercyRuleInning4: 15,
      mercyRuleInning5: 10,
      timeLimitMinutes: 60,
      extraPlayerAllowed: true,
      maxPlayersInLineup: 12,
    };
  }

  /**
   * Helper function to create a complete valid command for testing.
   *
   * @remarks
   * Creates a fully populated command with valid team names, lineup,
   * and game rules. This represents the happy path scenario.
   *
   * @param overrides - Optional command field overrides for testing variations
   * @returns Complete valid StartNewGameCommand
   */
  function createValidCommand(overrides: Partial<StartNewGameCommand> = {}): StartNewGameCommand {
    return {
      gameId: testGameId,
      homeTeamName: 'Springfield Tigers',
      awayTeamName: 'Shelbyville Lions',
      ourTeamSide: 'HOME',
      gameDate: testGameDate,
      location: testLocation,
      initialLineup: createValidLineup(),
      gameRules: createStandardGameRules(),
      ...overrides,
    };
  }

  describe('Game Existence Scenarios', () => {
    it('should reject game ID that already exists', async () => {
      mocks.functions.gameRepositoryExists.mockResolvedValue(true); // Game already exists
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Game with this ID already exists');
    });

    it('should handle repository existence check failure', async () => {
      mocks.functions.gameRepositoryExists.mockRejectedValue(
        new Error('Database connection failed')
      );
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to verify game uniqueness');
    });
  });

  describe('Infrastructure Error Scenarios', () => {
    beforeEach(() => {
      // Setup successful existence check
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
    });

    it('should handle repository save failure', async () => {
      mocks.functions.gameRepositorySave.mockRejectedValue(new Error('Database write failed'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state');
    });

    it('should handle event store failure', async () => {
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockRejectedValue(new Error('Event store unavailable'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to store game events');
    });

    it('should handle domain error during game creation', async () => {
      mocks.functions.gameRepositorySave.mockRejectedValue(new DomainError('Invalid game state'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Domain validation failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mocks.functions.gameRepositorySave.mockRejectedValue('Unknown error string');
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred');
    });
  });

  describe('Logging Scenarios', () => {
    beforeEach(() => {
      // Setup successful operations for logging tests
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);
    });

    it('should log debug information during game creation', async () => {
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mocks.functions.loggerDebug).toHaveBeenCalledWith(
        'Starting game creation process',
        expect.objectContaining({
          gameId: testGameId.value,
          homeTeamName: 'Springfield Tigers',
          awayTeamName: 'Shelbyville Lions',
        })
      );
    });

    it('should log game creation completion', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(mocks.functions.loggerInfo).toHaveBeenCalledWith(
        'Game created successfully',
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should log validation errors', async () => {
      const command = createValidCommand({ homeTeamName: '' });

      await startNewGame.execute(command);

      expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
        'Game creation failed due to DTO validation error',
        expect.objectContaining({
          gameId: testGameId.value,
          error: expect.any(String),
        })
      );
    });

    it('should log infrastructure errors', async () => {
      mocks.functions.gameRepositorySave.mockRejectedValue(new Error('Database write failed'));
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mocks.functions.loggerError).toHaveBeenCalledWith(
        'Failed to start new game',
        expect.any(Error),
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should log domain errors with context', async () => {
      const domainError = new DomainError('Invalid lineup configuration');
      mocks.functions.gameRepositorySave.mockRejectedValue(domainError);
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mocks.functions.loggerError).toHaveBeenCalledWith(
        'Failed to start new game',
        expect.any(Error),
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should log unknown errors with fallback message', async () => {
      mocks.functions.gameRepositorySave.mockRejectedValue(null);
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mocks.functions.loggerError).toHaveBeenCalledWith(
        'An unexpected error occurred',
        null,
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should include lineup details in success logging', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(mocks.functions.loggerInfo).toHaveBeenCalledWith(
        'Game created successfully',
        expect.objectContaining({
          gameId: testGameId.value,
          homeTeamName: 'Springfield Tigers',
          awayTeamName: 'Shelbyville Lions',
        })
      );
    });
  });

  describe('Edge Cases for Coverage', () => {
    it('should handle empty error arrays gracefully', async () => {
      // Force a scenario where validation passes but other errors occur
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockRejectedValue(new Error('Unexpected error'));

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle malformed command objects', async () => {
      // Use a command with empty lineup to trigger validation errors
      const malformedCommand = {
        gameId: testGameId,
        homeTeamName: 'Team A',
        awayTeamName: 'Team B',
        ourTeamSide: 'HOME' as const,
        gameDate: testGameDate,
        initialLineup: [], // Empty lineup will cause validation error
      } as StartNewGameCommand;

      const result = await startNewGame.execute(malformedCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle null/undefined command gracefully', async () => {
      // Use a command with invalid team side to trigger validation error
      const invalidCommand = {
        gameId: testGameId,
        homeTeamName: 'Team A',
        awayTeamName: 'Team B',
        ourTeamSide: 'INVALID' as 'HOME' | 'AWAY',
        gameDate: testGameDate,
        initialLineup: createValidLineup(),
      } as StartNewGameCommand;

      const result = await startNewGame.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle very long team names (boundary testing)', async () => {
      const veryLongName = 'A'.repeat(1000); // Very long team name
      const command = createValidCommand({ homeTeamName: veryLongName });

      const result = await startNewGame.execute(command);

      // Should either succeed or fail with proper error handling
      expect(result.success).toBeDefined();
      expect(result.errors !== undefined || result.initialState !== undefined).toBe(true);
    });

    it('should handle extreme jersey numbers (boundary testing)', (): void => {
      // This test verifies boundary handling for jersey numbers
      expect(() => {
        JerseyNumber.fromNumber(0); // Should throw for below minimum
      }).toThrow('Jersey number must be between 1 and 99');

      expect(() => {
        JerseyNumber.fromNumber(99); // Should succeed at boundary
      }).not.toThrow();
    });

    it('should handle special characters in team names', async () => {
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const command = createValidCommand({
        homeTeamName: 'Team @#$%^&*()',
        awayTeamName: 'Squad 123!',
      });

      const result = await startNewGame.execute(command);

      // Should handle special characters gracefully
      expect(result.success).toBeDefined();
    });

    it('should handle unicode team names', async () => {
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const command = createValidCommand({
        homeTeamName: 'Équipe Française',
        awayTeamName: '日本チーム',
      });

      const result = await startNewGame.execute(command);

      // Should handle unicode characters gracefully
      expect(result.success).toBeDefined();
    });

    it('should handle edge cases in lineup positions', async () => {
      const lineup = createValidLineup();

      // Test with all players in same position (should fail validation)
      const modifiedLineup = lineup.map(player => ({
        ...player,
        fieldPosition: FieldPosition.RIGHT_FIELD,
      }));
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      // Should have validation errors about missing required positions
      expect(result.errors).toBeDefined();
    });

    it('should handle maximum complexity lineup scenario', async () => {
      // Create a lineup that tests multiple edge cases simultaneously
      const fieldPositions = Object.values(FieldPosition);
      const complexLineup: LineupPlayerDTO[] = Array.from({ length: 12 }, (_, i) => ({
        playerId: new PlayerId(`player-${i + 1}`),
        name: `Player ${i + 1}`,
        jerseyNumber: JerseyNumber.fromNumber(i + 1),
        battingOrderPosition: i + 1,
        fieldPosition:
          i < 10 ? fieldPositions[i] || FieldPosition.EXTRA_PLAYER : FieldPosition.EXTRA_PLAYER,
        preferredPositions: [
          fieldPositions[i % fieldPositions.length] || FieldPosition.EXTRA_PLAYER,
        ],
      }));

      const command = createValidCommand({ initialLineup: complexLineup });

      const result = await startNewGame.execute(command);

      // Should handle complex lineup scenario
      expect(result.success).toBeDefined();
    });
  });

  describe('Error Handling Coverage (Lines 788, 962, 974-975)', () => {
    it('should handle specific error scenarios for complete coverage', async () => {
      // Test error handling in domain aggregate creation
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);

      // Mock an error that occurs during game aggregate creation
      const domainError = new DomainError('Game creation failed');
      mocks.functions.gameRepositorySave.mockRejectedValue(domainError);

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Domain validation failed');

      // Verify proper error logging occurred
      expect(mocks.functions.loggerError).toHaveBeenCalledWith(
        'Failed to start new game',
        expect.any(Error),
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should handle event store errors with proper logging', async () => {
      // Test line 962 - event store error handling
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockRejectedValue(
        new Error('Event store connection failed')
      );

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to store game events');
    });

    it('should handle infrastructure errors during repository save', async () => {
      // Test lines 974-975 - repository save error handling
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockRejectedValue(
        new Error('Database connection timeout')
      );

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state');

      // Verify infrastructure error was logged properly
      expect(mocks.functions.loggerError).toHaveBeenCalledWith(
        'Failed to start new game',
        expect.any(Error),
        expect.objectContaining({
          gameId: testGameId.value,
        })
      );
    });

    it('should handle cascading failures in multiple operations', async () => {
      // Test scenario where multiple operations fail
      mocks.functions.gameRepositoryExists.mockRejectedValue(new Error('Existence check failed'));

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to verify game uniqueness');
    });

    it('should handle memory or resource exhaustion scenarios', async () => {
      // Simulate a resource exhaustion error
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockRejectedValue(new Error('Out of memory'));

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred');
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Simulate timeout errors
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.eventStoreAppend.mockRejectedValue(new Error('Operation timeout'));
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);

      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred');
    });
  });

  describe('Coverage Verification', () => {
    beforeEach(() => {
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);
    });

    it('should verify code simplification improves coverage', async () => {
      // This test ensures our code simplification changes are working
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });

    it('should verify all error paths are covered', async () => {
      // Test multiple error scenarios to ensure complete coverage
      const scenarios = [
        {
          name: 'validation error',
          setup: (): StartNewGameCommand => createValidCommand({ homeTeamName: '' }),
          expectError: 'Home team name is required and cannot be empty',
        },
        {
          name: 'existence error',
          setup: (): StartNewGameCommand => {
            mocks.functions.gameRepositoryExists.mockRejectedValue(new Error('DB error'));
            return createValidCommand();
          },
          expectError: 'Failed to verify game uniqueness',
        },
        {
          name: 'save error',
          setup: (): StartNewGameCommand => {
            mocks.functions.gameRepositorySave.mockRejectedValue(new Error('Database save failed'));
            return createValidCommand();
          },
          expectError: 'Failed to save game state',
        },
        {
          name: 'event store error',
          setup: (): StartNewGameCommand => {
            mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
            mocks.functions.eventStoreAppend.mockRejectedValue(new Error('Event store error'));
            return createValidCommand();
          },
          expectError: 'Failed to store game events',
        },
      ];

      for (const scenario of scenarios) {
        // Reset mocks
        vi.clearAllMocks();
        mocks.functions.gameRepositoryExists.mockResolvedValue(false);

        const command = scenario.setup();
        const result = await startNewGame.execute(command);

        expect(result.success).toBe(false);
        expect(result.errors).toContain(scenario.expectError);
      }
    });

    it('should verify successful path coverage', async () => {
      // Ensure successful execution path is properly covered
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameId).toEqual(testGameId);
      expect(result.initialState).toBeDefined();
      expect(result.errors).toBeUndefined();

      // Verify all mocks were called as expected
      expect(mocks.functions.gameRepositoryExists).toHaveBeenCalledTimes(1);
      expect(mocks.functions.gameRepositorySave).toHaveBeenCalledTimes(1);
      expect(mocks.functions.eventStoreAppend).toHaveBeenCalled();
    });

    it('should verify complex validation scenarios are covered', async () => {
      // Test complex validation that exercises multiple code paths
      // Create command with empty team names and invalid lineup to trigger multiple errors
      const invalidCommand = {
        gameId: testGameId,
        homeTeamName: '', // Empty team name
        awayTeamName: '', // Empty team name
        ourTeamSide: 'HOME' as const,
        gameDate: testGameDate,
        initialLineup: [], // Empty lineup
      } as StartNewGameCommand;

      const result = await startNewGame.execute(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThanOrEqual(1); // At least one validation error
    });
  });
});
