/**
 * @file StartNewGame Validation Tests
 * Input validation and business rules tests for StartNewGame use case.
 *
 * @remarks
 * This test suite validates all input validation and business rule scenarios including:
 * - Input validation for team names, dates, and basic parameters
 * - Lineup validation for jersey numbers, player IDs, and batting order
 * - Business rule validation for field positions and game rules
 * - Boundary conditions and edge cases for all validation scenarios
 * - Comprehensive error message validation
 *
 * Tests ensure proper validation behavior and clear error reporting.
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  StartNewGameCommand,
  LineupPlayerDTO,
  GameRulesDTO,
  StartNewGameCommandValidator,
} from '../dtos/StartNewGameCommand.js';
import { createGameApplicationServiceMocks } from '../test-factories/index.js';

import { StartNewGame } from './StartNewGame.js';

describe('StartNewGame Validation', () => {
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

  describe('Input Validation Scenarios', () => {
    it('should reject empty home team name', async () => {
      const command = createValidCommand({ homeTeamName: '' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Home team name is required and cannot be empty');
    });

    it('should reject whitespace-only home team name', async () => {
      const command = createValidCommand({ homeTeamName: '   ' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Home team name is required and cannot be empty');
    });

    it('should reject empty away team name', async () => {
      const command = createValidCommand({ awayTeamName: '' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Away team name is required and cannot be empty');
    });

    it('should reject whitespace-only away team name', async () => {
      const command = createValidCommand({ awayTeamName: '   ' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Away team name is required and cannot be empty');
    });

    it('should reject identical team names', async () => {
      const command = createValidCommand({
        homeTeamName: 'Tigers',
        awayTeamName: 'Tigers',
      });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Home and away team names must be different');
    });

    it('should reject game date in the past', async () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      const command = createValidCommand({ gameDate: pastDate });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Game date cannot be in the past');
    });

    it('should reject empty initial lineup', async () => {
      const command = createValidCommand({ initialLineup: [] });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Initial lineup must have at least 9 players (10-player standard lineup recommended)'
      );
    });

    it('should reject lineup with too few players (below 9-player minimum)', async () => {
      const shortLineup = createValidLineup().slice(0, 8); // Only 8 players (below minimum)
      const command = createValidCommand({ initialLineup: shortLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Initial lineup must have at least 9 players (10-player standard lineup recommended)'
      );
    });

    it('should reject lineup with too many players (exceeds maximum boundary)', async () => {
      const longLineup = [
        ...createValidLineup(),
        ...Array.from({ length: 22 }, (_, i) => ({
          playerId: new PlayerId(`extra-player-${i + 11}`),
          name: `Extra Player ${i + 11}`,
          jerseyNumber: JerseyNumber.fromNumber(i + 11),
          battingOrderPosition: i + 11,
          fieldPosition: FieldPosition.RIGHT_FIELD,
          preferredPositions: [FieldPosition.RIGHT_FIELD],
        })),
      ]; // 32 players total (exceeds DTO's 30 limit boundary)
      const command = createValidCommand({ initialLineup: longLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Initial lineup cannot exceed 30 players');
    });

    it('should reject invalid team side value', async () => {
      const command = createValidCommand({ ourTeamSide: 'INVALID' as 'HOME' | 'AWAY' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(['Our team side must be either HOME or AWAY'])
      );
    });

    it('should accept valid boundary cases for team names', async () => {
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const command = createValidCommand({
        homeTeamName: 'A', // Single character (valid minimum)
        awayTeamName: 'B', // Single character but different
      });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });

    it('should accept future game dates', async () => {
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const futureDate = new Date(Date.now() + 86400000 * 365); // One year in future
      const command = createValidCommand({ gameDate: futureDate });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });
  });

  describe('Lineup Validation Scenarios', () => {
    it('should reject duplicate jersey numbers via DTO validation', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, jerseyNumber: lineup[0]!.jerseyNumber } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('All players must have unique jersey numbers');
    });

    it('should handle duplicate jersey number validation in use case logic', async () => {
      // Mock the DTO validator to pass validation but create a scenario
      // where the use case's internal validation logic encounters duplicates
      const originalValidate = StartNewGameCommandValidator.validate;
      const lineup = createValidLineup();

      // Create a lineup that would pass initial checks but trigger use case validation
      const modifiedLineup = lineup.map((player, index) => {
        if (index === 1) {
          // Create duplicate jersey number that might slip through
          return {
            ...player,
            jerseyNumber: lineup[0]!.jerseyNumber,
            playerId: new PlayerId('unique-player-2'), // Keep player ID unique
          };
        }
        return player;
      });

      // Temporarily mock the validator to skip the duplicate check
      StartNewGameCommandValidator.validate = vi.fn();

      try {
        const command = createValidCommand({ initialLineup: modifiedLineup });
        const result = await startNewGame.execute(command);

        expect(result.success).toBe(false);
        expect(
          result.errors.some(
            error =>
              error.includes('Duplicate jersey numbers:') &&
              error.includes('#' + lineup[0]!.jerseyNumber.value)
          )
        ).toBe(true);
      } finally {
        // Restore original validator
        StartNewGameCommandValidator.validate = originalValidate;
      }
    });

    it('should reject duplicate player IDs', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, playerId: lineup[0]!.playerId } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('All players must have unique player IDs');
    });

    it('should reject invalid batting order positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, battingOrderPosition: 0 } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /Player at index \d+: battingOrderPosition must be between 1 and 30/
          ),
        ])
      );
    });

    it('should reject batting order positions above maximum (31)', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, battingOrderPosition: 31 } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /Player at index \d+: battingOrderPosition must be between 1 and 30/
          ),
        ])
      );
    });

    it('should reject duplicate batting order positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, battingOrderPosition: lineup[0]!.battingOrderPosition } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('All players must have unique batting order positions');
    });

    it('should reject empty player names', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, name: '' } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(['Player at index 0: name is required and cannot be empty'])
      );
    });

    it('should reject whitespace-only player names', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, name: '   ' } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(['Player at index 0: name is required and cannot be empty'])
      );
    });

    it('should reject empty preferred positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, preferredPositions: [] } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(['Player must have at least one preferred position'])
      );
    });

    it('should handle validation edge cases for player names and preferred positions', async () => {
      // Mock the DTO validator to test internal validation logic
      const originalValidate = StartNewGameCommandValidator.validate;
      const lineup = createValidLineup();

      const modifiedLineup = lineup.map((player, index) => {
        if (index === 0) {
          // Test empty name after trim
          return { ...player, name: '   ' }; // Only whitespace
        }
        if (index === 1) {
          // Test undefined preferred positions
          return { ...player, preferredPositions: undefined as unknown as FieldPosition[] };
        }
        return player;
      });

      // Mock validator to bypass DTO validation and test use case logic
      StartNewGameCommandValidator.validate = vi.fn();

      try {
        const command = createValidCommand({ initialLineup: modifiedLineup });
        const result = await startNewGame.execute(command);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            'Player name cannot be empty',
            'Player must have at least one preferred position',
          ])
        );
      } finally {
        // Restore original validator
        StartNewGameCommandValidator.validate = originalValidate;
      }
    });

    it('should handle validation edge cases for empty name fields', async () => {
      // Mock the DTO validator to test internal validation logic
      const originalValidate = StartNewGameCommandValidator.validate;
      const lineup = createValidLineup();

      const modifiedLineup = lineup.map((player, index) => {
        if (index === 0) {
          // Test null name
          return { ...player, name: null as unknown as string };
        }
        if (index === 1) {
          // Test undefined name
          return { ...player, name: undefined as unknown as string };
        }
        return player;
      });

      // Mock validator to bypass DTO validation and test use case logic
      StartNewGameCommandValidator.validate = vi.fn();

      try {
        const command = createValidCommand({ initialLineup: modifiedLineup });
        const result = await startNewGame.execute(command);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining(['Player name cannot be empty', 'Player name cannot be empty'])
        );
      } finally {
        // Restore original validator
        StartNewGameCommandValidator.validate = originalValidate;
      }
    });

    it('should accept reasonable number of preferred positions', async () => {
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const lineup = createValidLineup();
      const multiplePositions = [
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
      ];
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, preferredPositions: multiplePositions } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });

    it('should accept valid boundary cases for lineup validation', async () => {
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const lineup = createValidLineup();
      // Test that valid batting positions work within lineup constraints
      // Since we have 10 players with positions 1-10, this should be valid as-is
      const modifiedLineup = lineup;
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });
  });

  describe('Business Rule Scenarios', () => {
    it('should validate all required field positions are filled', async () => {
      const lineup = createValidLineup();

      // Remove catcher position by creating new lineup without catcher
      const modifiedLineup = lineup.map(player =>
        player.fieldPosition === FieldPosition.CATCHER
          ? { ...player, fieldPosition: FieldPosition.LEFT_FIELD }
          : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: C');
    });

    it('should validate that all required infield positions are covered', async () => {
      const lineup = createValidLineup();

      // Test missing first base position specifically
      const modifiedLineup = lineup.map(player =>
        player.fieldPosition === FieldPosition.FIRST_BASE
          ? { ...player, fieldPosition: FieldPosition.RIGHT_FIELD }
          : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: 1B');
    });

    it('should validate missing required shortstop position', async () => {
      const lineup = createValidLineup();

      // Test missing shortstop position specifically
      const modifiedLineup = lineup.map(player =>
        player.fieldPosition === FieldPosition.SHORTSTOP
          ? { ...player, fieldPosition: FieldPosition.CENTER_FIELD }
          : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: SS');
    });

    it('should validate missing required outfield positions', async () => {
      const lineup = createValidLineup();

      // Test missing left field position specifically
      const modifiedLineup = lineup.map(player =>
        player.fieldPosition === FieldPosition.LEFT_FIELD
          ? { ...player, fieldPosition: FieldPosition.CENTER_FIELD }
          : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: LF');
    });

    it('should handle multiple missing required positions', async () => {
      const lineup = createValidLineup();

      // Remove multiple required positions to test comprehensive validation
      const modifiedLineup = lineup.map(player => {
        if (
          player.fieldPosition === FieldPosition.PITCHER ||
          player.fieldPosition === FieldPosition.SECOND_BASE ||
          player.fieldPosition === FieldPosition.THIRD_BASE
        ) {
          return { ...player, fieldPosition: FieldPosition.RIGHT_FIELD };
        }
        return player;
      });
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Missing required field position: P',
          'Missing required field position: 2B',
          'Missing required field position: 3B',
        ])
      );
    });

    it('should enforce jersey number range limits', () => {
      // This test verifies that invalid jersey numbers are caught by domain validation
      expect(() => {
        JerseyNumber.fromNumber(100); // Should throw for invalid range
      }).toThrow('Jersey number must be between 1 and 99');
    });

    it('should validate game rules constraints', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: -5, // Negative runs invalid
        mercyRuleInning5: 10,
        timeLimitMinutes: 0, // Zero time invalid
        extraPlayerAllowed: true,
        maxPlayersInLineup: 5, // Too few players
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      // DTO validator will catch the first error (negative mercy rule inning 4)
      expect(result.errors).toContain('mercyRuleInning4 must be between 0 and 50');
    });

    it('should handle game rules validation edge cases via use case logic', async () => {
      // Test use case validation for game rules by bypassing DTO validation
      const originalValidate = StartNewGameCommandValidator.validate;
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: -1, // Negative - should be caught by use case
        mercyRuleInning5: 10,
        timeLimitMinutes: -30, // Negative time - should be caught by use case
        extraPlayerAllowed: true,
        maxPlayersInLineup: 8, // Too few - should be caught by use case
      };

      // Mock validator to bypass DTO validation and test use case logic
      StartNewGameCommandValidator.validate = vi.fn();

      try {
        const command = createValidCommand({ gameRules: invalidRules });
        const result = await startNewGame.execute(command);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining(['Invalid game rules configuration']));
      } finally {
        // Restore original validator
        StartNewGameCommandValidator.validate = originalValidate;
      }
    });

    it('should reject negative mercy rule inning 4 differential', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: -1, // Negative runs invalid
        mercyRuleInning5: 10,
        timeLimitMinutes: 60,
        extraPlayerAllowed: true,
        maxPlayersInLineup: 12,
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('mercyRuleInning4 must be between 0 and 50');
    });

    it('should reject negative mercy rule inning 5 differential', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 15,
        mercyRuleInning5: -1, // Negative runs invalid
        timeLimitMinutes: 60,
        extraPlayerAllowed: true,
        maxPlayersInLineup: 12,
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('mercyRuleInning5 must be between 0 and 50');
    });

    it('should reject excessive mercy rule differentials (over 50)', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 51, // Too high
        mercyRuleInning5: 10,
        timeLimitMinutes: 60,
        extraPlayerAllowed: true,
        maxPlayersInLineup: 12,
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('mercyRuleInning4 must be between 0 and 50');
    });

    it('should reject negative time limits', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 15,
        mercyRuleInning5: 10,
        timeLimitMinutes: -1, // Negative time invalid
        extraPlayerAllowed: true,
        maxPlayersInLineup: 12,
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('timeLimitMinutes must be between 1 and 300');
    });

    it('should reject excessive time limits (over 5 hours)', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 15,
        mercyRuleInning5: 10,
        timeLimitMinutes: 301, // Over 5 hours
        extraPlayerAllowed: true,
        maxPlayersInLineup: 12,
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('timeLimitMinutes must be between 1 and 300');
    });

    it('should reject too few max players in lineup', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 15,
        mercyRuleInning5: 10,
        timeLimitMinutes: 60,
        extraPlayerAllowed: true,
        maxPlayersInLineup: 8, // Below minimum of 9
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'maxPlayersInLineup must be between 9 and 30 (10-player standard, 11-12 common, 25+ for flexible rosters)'
      );
    });

    it('should reject too many max players in lineup', async () => {
      const invalidRules: GameRulesDTO = {
        mercyRuleEnabled: true,
        mercyRuleInning4: 15,
        mercyRuleInning5: 10,
        timeLimitMinutes: 60,
        extraPlayerAllowed: true,
        maxPlayersInLineup: 31, // Above maximum of 30
      };
      const command = createValidCommand({ gameRules: invalidRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'maxPlayersInLineup must be between 9 and 30 (10-player standard, 11-12 common, 25+ for flexible rosters)'
      );
    });

    it('should accept valid boundary values for game rules', async () => {
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const boundaryRules: GameRulesDTO = {
        mercyRuleEnabled: false,
        mercyRuleInning4: 15, // Valid value
        mercyRuleInning5: 10, // Valid value
        timeLimitMinutes: 120, // 2 hours
        extraPlayerAllowed: false,
        maxPlayersInLineup: 10, // Match the lineup size
      };
      const command = createValidCommand({ gameRules: boundaryRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });

    it('should validate required field positions when SHORT_FIELDER is missing', async () => {
      const lineup = createValidLineup().slice(0, 9); // Remove SHORT_FIELDER
      const command = createValidCommand({ initialLineup: lineup });

      // This should succeed since SHORT_FIELDER is not required in 9-player lineups
      // Setup mocks for successful execution
      mocks.functions.gameRepositoryExists.mockResolvedValue(false);
      mocks.functions.gameRepositorySave.mockResolvedValue(undefined);
      mocks.functions.eventStoreAppend.mockResolvedValue(undefined);

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
    });

    it('should validate all core positions are present', async () => {
      const lineup = createValidLineup();

      // Remove first base by changing to outfield
      const modifiedLineup = lineup.map(player =>
        player.fieldPosition === FieldPosition.FIRST_BASE
          ? { ...player, fieldPosition: FieldPosition.CENTER_FIELD }
          : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: 1B');
    });
  });
});
