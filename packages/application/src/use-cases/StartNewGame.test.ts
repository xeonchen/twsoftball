/**
 * @file StartNewGame.test.ts
 * Comprehensive test suite for StartNewGame use case with TDD approach.
 *
 * @remarks
 * This test suite validates the complete StartNewGame use case implementation,
 * covering all aspects of game initialization including:
 *
 * - Valid game creation scenarios with proper lineups
 * - Input validation and error handling
 * - Domain aggregate creation and coordination
 * - Event sourcing and persistence
 * - Cross-aggregate consistency
 * - Infrastructure error handling
 * - Comprehensive logging and audit trail
 *
 * **Test Structure:**
 * - Happy path scenarios: Valid game creation with various configurations
 * - Validation scenarios: Invalid input handling and error messages
 * - Business rule scenarios: Lineup validation, position requirements
 * - Infrastructure scenarios: Repository and event store failures
 * - Integration scenarios: Cross-aggregate coordination
 *
 * **TDD Approach:**
 * Tests are written first to define the expected behavior and API contract
 * before implementing the actual use case. This ensures:
 * - Clear specification of requirements
 * - Comprehensive error handling
 * - Complete test coverage from the start
 * - Design validation through usage
 *
 * @example
 * ```typescript
 * // Example of comprehensive test scenario
 * describe('Valid game creation', () => {
 *   it('should create game with complete lineups and initial state', async () => {
 *     const command = createValidCommand();
 *     const result = await startNewGame.execute(command);
 *
 *     expect(result.success).toBe(true);
 *     expect(result.initialState?.currentInning).toBe(1);
 *     expect(result.initialState?.isTopHalf).toBe(true);
 *   });
 * });
 * ```
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition, GameStatus } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { StartNewGameCommand, LineupPlayerDTO, GameRulesDTO } from '../dtos/StartNewGameCommand';
import { EventStore } from '../ports/out/EventStore';
import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';

import { StartNewGame } from './StartNewGame';

describe('StartNewGame', () => {
  let startNewGame: StartNewGame;
  let mockGameRepository: GameRepository;
  let mockEventStore: EventStore;
  let mockLogger: Logger;

  // Test data constants
  const testGameId = new GameId('test-game-123');
  const testHomeTeamName = 'Springfield Tigers';
  const testAwayTeamName = 'Shelbyville Lions';
  const testGameDate = new Date(Date.now() + 86400000); // Tomorrow
  const testLocation = 'City Park Field 1';

  // Individual mock functions
  const mockFindById = vi.fn();
  const mockSave = vi.fn();
  const mockExists = vi.fn();
  const mockFindByStatus = vi.fn();
  const mockFindByDateRange = vi.fn();
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

    // Create mock implementations
    mockGameRepository = {
      findById: mockFindById,
      save: mockSave,
      exists: mockExists,
      findByStatus: mockFindByStatus,
      findByDateRange: mockFindByDateRange,
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

    // Reset logger mock behavior
    mockIsLevelEnabled.mockReturnValue(true);

    mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      log: mockLog,
      isLevelEnabled: mockIsLevelEnabled,
    } as Logger;

    // Create use case instance with mocked dependencies
    startNewGame = new StartNewGame(mockGameRepository, mockEventStore, mockLogger);
  });

  /**
   * Helper function to create a valid lineup with all required positions.
   *
   * @remarks
   * Creates a complete 9-player lineup with all required field positions
   * and proper batting order. This represents a typical starting lineup
   * for a softball game.
   *
   * @returns Complete lineup with 9 players in standard positions
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
      homeTeamName: testHomeTeamName,
      awayTeamName: testAwayTeamName,
      ourTeamSide: 'HOME',
      gameDate: testGameDate,
      location: testLocation,
      initialLineup: createValidLineup(),
      gameRules: createStandardGameRules(),
      ...overrides,
    };
  }

  describe('Happy Path Scenarios', () => {
    beforeEach(() => {
      // Setup successful repository operations
      mockExists.mockResolvedValue(false);
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should create new game with complete lineup successfully', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.gameId).toEqual(testGameId);
      expect(result.initialState).toBeDefined();

      // Verify initial game state
      expect(result.initialState?.gameId).toEqual(testGameId);
      expect(result.initialState?.status).toBe(GameStatus.IN_PROGRESS);
      expect(result.initialState?.currentInning).toBe(1);
      expect(result.initialState?.isTopHalf).toBe(true);
      expect(result.initialState?.outs).toBe(0);
      expect(result.initialState?.score).toEqual({
        home: 0,
        away: 0,
        leader: 'TIE',
        difference: 0,
      });

      // Verify empty bases
      expect(result.initialState?.bases.first).toBeNull();
      expect(result.initialState?.bases.second).toBeNull();
      expect(result.initialState?.bases.third).toBeNull();
      expect(result.initialState?.bases.basesLoaded).toBe(false);

      // Verify lineups are properly set
      expect(result.initialState?.homeLineup.teamName).toBe(testHomeTeamName);
      expect(result.initialState?.awayLineup.teamName).toBe(testAwayTeamName);
      expect(result.initialState?.homeLineup.battingSlots).toHaveLength(9);

      // Verify current batter is first in away team (top of 1st)
      expect(result.initialState?.battingTeam).toBe('AWAY');
      expect(result.initialState?.currentBatterSlot).toBe(1);

      expect(result.errors).toBeUndefined();
    });

    it('should create game with away team as our managed team', async () => {
      const command = createValidCommand({ ourTeamSide: 'AWAY' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.initialState?.awayLineup.battingSlots).toHaveLength(9);
      expect(result.initialState?.homeLineup.battingSlots).toHaveLength(0); // Minimal tracking
    });

    it('should create game with custom game rules', async () => {
      const customRules: GameRulesDTO = {
        mercyRuleEnabled: false,
        mercyRuleInning4: 20,
        mercyRuleInning5: 15,
        timeLimitMinutes: 90,
        extraPlayerAllowed: false,
        maxPlayersInLineup: 9,
      };
      const command = createValidCommand({ gameRules: customRules });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.initialState).toBeDefined();
    });

    it('should create game with extra players (10+ lineup)', async () => {
      const extendedLineup = [
        ...createValidLineup(),
        {
          playerId: new PlayerId('player-10'),
          name: 'Extra Player',
          jerseyNumber: JerseyNumber.fromNumber(10),
          battingOrderPosition: 10,
          fieldPosition: FieldPosition.EXTRA_PLAYER, // Extra player doesn't play defense
          preferredPositions: [FieldPosition.RIGHT_FIELD, FieldPosition.LEFT_FIELD],
        },
      ];
      const command = createValidCommand({ initialLineup: extendedLineup });

      const result = await startNewGame.execute(command);

      // If test fails, error details will be shown by test framework

      expect(result.success).toBe(true);
      expect(result.initialState?.homeLineup.battingSlots).toHaveLength(10);
    });

    it('should create game without location (optional field)', async () => {
      const { location, ...commandWithoutLocation } = createValidCommand();
      expect(location).toBeDefined(); // Verify original command had location
      const command = commandWithoutLocation as StartNewGameCommand;

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.initialState).toBeDefined();
    });

    it('should create game without custom rules (use defaults)', async () => {
      const { gameRules, ...commandWithoutRules } = createValidCommand();
      expect(gameRules).toBeDefined(); // Verify original command had gameRules
      const command = commandWithoutRules as StartNewGameCommand;

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.initialState).toBeDefined();
    });
  });

  describe('Input Validation Scenarios', () => {
    it('should reject empty home team name', async () => {
      const command = createValidCommand({ homeTeamName: '' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Home team name cannot be empty');
    });

    it('should reject empty away team name', async () => {
      const command = createValidCommand({ awayTeamName: '   ' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Away team name cannot be empty');
    });

    it('should reject identical team names', async () => {
      const command = createValidCommand({
        homeTeamName: 'Tigers',
        awayTeamName: 'Tigers',
      });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Team names must be different');
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
      expect(result.errors).toContain('Initial lineup cannot be empty');
    });

    it('should reject lineup with too few players', async () => {
      const shortLineup = createValidLineup().slice(0, 8); // Only 8 players
      const command = createValidCommand({ initialLineup: shortLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Lineup must have at least 9 players');
    });

    it('should reject lineup with too many players', async () => {
      const longLineup = [
        ...createValidLineup(),
        ...Array.from({ length: 12 }, (_, i) => ({
          playerId: new PlayerId(`extra-player-${i + 10}`),
          name: `Extra Player ${i + 10}`,
          jerseyNumber: JerseyNumber.fromNumber(i + 10),
          battingOrderPosition: i + 10,
          fieldPosition: FieldPosition.RIGHT_FIELD,
          preferredPositions: [FieldPosition.RIGHT_FIELD],
        })),
      ]; // 21 players total
      const command = createValidCommand({ initialLineup: longLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Lineup cannot exceed maximum players allowed');
    });
  });

  describe('Lineup Validation Scenarios', () => {
    it('should reject duplicate jersey numbers', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, jerseyNumber: lineup[0]!.jerseyNumber } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate jersey numbers: #1 assigned to multiple players');
    });

    it('should reject duplicate player IDs', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, playerId: lineup[0]!.playerId } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate player IDs in lineup');
    });

    it('should reject invalid batting order positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, battingOrderPosition: 0 } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid batting order position: must be 1-20');
    });

    it('should reject duplicate batting order positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 1 ? { ...player, battingOrderPosition: lineup[0]!.battingOrderPosition } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate batting order position: 1');
    });

    it('should reject missing required field positions', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, fieldPosition: FieldPosition.RIGHT_FIELD } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field position: PITCHER');
    });

    it('should reject empty player names', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, name: '' } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Player name cannot be empty');
    });

    it('should reject empty preferred positions array', async () => {
      const lineup = createValidLineup();
      const modifiedLineup = lineup.map((player, index) =>
        index === 0 ? { ...player, preferredPositions: [] } : player
      );
      const command = createValidCommand({ initialLineup: modifiedLineup });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Player must have at least one preferred position');
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
      expect(result.errors).toContain('Missing required field position: CATCHER');
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
      expect(result.errors).toContain('Invalid game rules configuration');
    });
  });

  describe('Game Existence Scenarios', () => {
    it('should reject game ID that already exists', async () => {
      mockExists.mockResolvedValue(true); // Game already exists
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Game with this ID already exists');
    });

    it('should handle repository existence check failure', async () => {
      mockExists.mockRejectedValue(new Error('Database connection failed'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to verify game uniqueness');
    });
  });

  describe('Infrastructure Error Scenarios', () => {
    beforeEach(() => {
      // Setup successful existence check
      mockExists.mockResolvedValue(false);
    });

    it('should handle repository save failure', async () => {
      mockSave.mockRejectedValue(new Error('Database write failed'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save game state');
    });

    it('should handle event store failure', async () => {
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockRejectedValue(new Error('Event store unavailable'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to store game events');
    });

    it('should handle domain validation errors gracefully', async () => {
      // Mock domain error during aggregate creation
      const command = createValidCommand({
        homeTeamName: 'Same Name',
        awayTeamName: 'Same Name',
      });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Team names must be different');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSave.mockRejectedValue(new TypeError('Unexpected error'));
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred');
    });
  });

  describe('Event Generation Scenarios', () => {
    beforeEach(() => {
      mockExists.mockResolvedValue(false);
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should generate appropriate domain events for game creation', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);

      // Verify Game aggregate was saved
      expect(mockSave).toHaveBeenCalledTimes(1); // Game only (lineups/inning state would use separate repositories)

      // Verify events were stored
      expect(mockAppend).toHaveBeenCalledTimes(4); // Game, HomeLineup, AwayLineup, InningState events

      // Check that event store was called with correct event types
      const eventStoreCalls = mockAppend.mock.calls;
      const allEvents = eventStoreCalls.flatMap((call: unknown[]) => call[2] as unknown[]); // Extract events from all calls

      expect(allEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'GameCreated' }),
          expect.objectContaining({ type: 'GameStarted' }),
          expect.objectContaining({ type: 'TeamLineupCreated' }),
          expect.objectContaining({ type: 'InningStateCreated' }),
        ])
      );
    });

    it('should include proper event metadata', async () => {
      const command = createValidCommand();

      await startNewGame.execute(command);

      // Verify events have proper structure and metadata
      const eventStoreCalls = mockAppend.mock.calls;
      eventStoreCalls.forEach((call: unknown[]) => {
        const [aggregateId, aggregateType, events] = call;
        expect(aggregateId).toBeDefined();
        expect(['Game', 'TeamLineup', 'InningState']).toContain(aggregateType);
        expect(events).toBeInstanceOf(Array);
        expect((events as unknown[]).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Logging Scenarios', () => {
    beforeEach(() => {
      mockExists.mockResolvedValue(false);
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should log successful game creation', async () => {
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mockInfo).toHaveBeenCalledWith(
        'Game created successfully',
        expect.objectContaining({
          gameId: testGameId.value,
          homeTeamName: testHomeTeamName,
          awayTeamName: testAwayTeamName,
          lineupSize: 9,
          operation: 'startNewGame',
        })
      );
    });

    it('should log validation failures', async () => {
      const command = createValidCommand({ homeTeamName: '' });

      await startNewGame.execute(command);

      expect(mockWarn).toHaveBeenCalledWith(
        'Game creation failed due to validation errors',
        expect.objectContaining({
          gameId: testGameId.value,
          operation: 'startNewGame',
        })
      );
    });

    it('should log infrastructure errors', async () => {
      mockSave.mockRejectedValue(new Error('Database error'));
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mockError).toHaveBeenCalledWith(
        'Failed to start new game',
        expect.any(Error),
        expect.objectContaining({
          gameId: testGameId.value,
          operation: 'startNewGame',
        })
      );
    });

    it('should include debug logging for process steps', async () => {
      const command = createValidCommand();

      await startNewGame.execute(command);

      expect(mockDebug).toHaveBeenCalledWith(
        'Starting game creation process',
        expect.objectContaining({
          gameId: testGameId.value,
          operation: 'startNewGame',
        })
      );

      expect(mockDebug).toHaveBeenCalledWith(
        'Domain aggregates created successfully',
        expect.any(Object)
      );

      expect(mockDebug).toHaveBeenCalledWith(
        'Domain events generated successfully',
        expect.any(Object)
      );
    });
  });

  describe('Cross-aggregate Coordination Scenarios', () => {
    beforeEach(() => {
      mockExists.mockResolvedValue(false);
      mockSave.mockResolvedValue(undefined);
      mockAppend.mockResolvedValue(undefined);
    });

    it('should create all required aggregates for game initialization', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);

      // Verify Game aggregate creation
      expect(result.initialState?.gameId).toEqual(testGameId);
      expect(result.initialState?.status).toBe(GameStatus.IN_PROGRESS);

      // Verify TeamLineup aggregates creation (home and away)
      expect(result.initialState?.homeLineup).toBeDefined();
      expect(result.initialState?.awayLineup).toBeDefined();
      expect(result.initialState?.homeLineup.gameId).toEqual(testGameId);
      expect(result.initialState?.awayLineup.gameId).toEqual(testGameId);

      // Verify InningState aggregate creation
      expect(result.initialState?.currentInning).toBe(1);
      expect(result.initialState?.isTopHalf).toBe(true);
      expect(result.initialState?.outs).toBe(0);
    });

    it('should properly coordinate managed vs opponent team setup', async () => {
      const command = createValidCommand({ ourTeamSide: 'HOME' });

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);

      // Home team should have full lineup (managed team)
      expect(result.initialState?.homeLineup.battingSlots).toHaveLength(9);
      expect(result.initialState?.homeLineup.teamName).toBe(testHomeTeamName);

      // Away team should have minimal setup (opponent team)
      expect(result.initialState?.awayLineup.battingSlots).toHaveLength(0);
      expect(result.initialState?.awayLineup.teamName).toBe(testAwayTeamName);
    });

    it('should set proper initial game state across all aggregates', async () => {
      const command = createValidCommand();

      const result = await startNewGame.execute(command);

      expect(result.success).toBe(true);
      expect(result.initialState).toMatchObject({
        status: GameStatus.IN_PROGRESS,
        currentInning: 1,
        isTopHalf: true, // Away team bats first
        battingTeam: 'AWAY',
        outs: 0,
        currentBatterSlot: 1,
        score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
        bases: {
          first: null,
          second: null,
          third: null,
          basesLoaded: false,
          runnersInScoringPosition: [],
        },
      });
    });
  });
});
