/**
 * @file StartNewGameCommand Tests
 * Tests for command DTO to initiate a new softball game.
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  StartNewGameCommand,
  LineupPlayerDTO,
  GameRulesDTO,
  StartNewGameCommandValidator,
  StartNewGameCommandValidationError,
  StartNewGameCommandFactory,
} from './StartNewGameCommand.js';

describe('StartNewGameCommand', () => {
  let validCommand: StartNewGameCommand;
  let gameId: GameId;
  let lineupPlayers: LineupPlayerDTO[];
  let gameRules: GameRulesDTO;

  beforeEach(() => {
    gameId = GameId.generate();

    // Create a full 10-player lineup for validation (standard slow-pitch softball)
    lineupPlayers = Array.from({ length: 10 }, (_, i) => ({
      playerId: PlayerId.generate(),
      name: `Player ${i + 1}`,
      jerseyNumber: JerseyNumber.fromNumber(i + 1),
      battingOrderPosition: i + 1,
      fieldPosition: [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.SHORT_FIELDER,
      ][i]!,
      preferredPositions: i < 2 ? [FieldPosition.PITCHER, FieldPosition.FIRST_BASE] : [],
    }));

    gameRules = {
      mercyRuleEnabled: true,
      mercyRuleInning4: 15,
      mercyRuleInning5: 10,
      timeLimitMinutes: 60,
      extraPlayerAllowed: true,
      maxPlayersInLineup: 12,
    };

    validCommand = {
      gameId,
      homeTeamName: 'Eagles',
      awayTeamName: 'Hawks',
      ourTeamSide: 'HOME',
      gameDate: new Date('2024-08-30T14:00:00Z'),
      location: 'City Park Field 1',
      initialLineup: lineupPlayers,
      gameRules,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid StartNewGameCommand with all required fields', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
      expect(command.ourTeamSide).toBe('HOME');
      expect(command.gameDate).toBeInstanceOf(Date);
      expect(command.location).toBe('City Park Field 1');
      expect(Array.isArray(command.initialLineup)).toBe(true);
      expect(command.gameRules).toBeDefined();
    });

    it('should handle optional location field', () => {
      const commandWithoutLocation = {
        ...validCommand,
        location: undefined,
      };

      expect(commandWithoutLocation.location).toBeUndefined();
    });

    it('should handle optional game rules field', () => {
      const commandWithoutRules = {
        ...validCommand,
        gameRules: undefined,
      };

      expect(commandWithoutRules.gameRules).toBeUndefined();
    });

    it('should maintain proper data types', () => {
      const command = validCommand;

      expect(typeof command.homeTeamName).toBe('string');
      expect(typeof command.awayTeamName).toBe('string');
      expect(typeof command.ourTeamSide).toBe('string');
      expect(command.gameDate).toBeInstanceOf(Date);
    });
  });

  describe('Team Side Handling', () => {
    it('should handle HOME team side', () => {
      const homeCommand = {
        ...validCommand,
        ourTeamSide: 'HOME' as const,
      };

      expect(homeCommand.ourTeamSide).toBe('HOME');
    });

    it('should handle AWAY team side', () => {
      const awayCommand = {
        ...validCommand,
        ourTeamSide: 'AWAY' as const,
      };

      expect(awayCommand.ourTeamSide).toBe('AWAY');
    });

    it('should enforce proper team side type', () => {
      const command = validCommand;

      expect(command.ourTeamSide).toMatch(/^(HOME|AWAY)$/);
    });
  });

  describe('Initial Lineup', () => {
    it('should handle standard lineup (10 players with SF)', () => {
      const standardLineup: LineupPlayerDTO[] = Array.from({ length: 10 }, (_, i) => ({
        playerId: PlayerId.generate(),
        name: `Player ${i + 1}`,
        jerseyNumber: JerseyNumber.fromNumber(i + 1),
        battingOrderPosition: i + 1,
        fieldPosition: [
          FieldPosition.PITCHER,
          FieldPosition.CATCHER,
          FieldPosition.FIRST_BASE,
          FieldPosition.SECOND_BASE,
          FieldPosition.THIRD_BASE,
          FieldPosition.SHORTSTOP,
          FieldPosition.LEFT_FIELD,
          FieldPosition.CENTER_FIELD,
          FieldPosition.RIGHT_FIELD,
          FieldPosition.SHORT_FIELDER,
        ][i]!,
        preferredPositions: [],
      }));

      const command = {
        ...validCommand,
        initialLineup: standardLineup,
      };

      expect(command.initialLineup).toHaveLength(10);
      expect(command.initialLineup[0]?.battingOrderPosition).toBe(1);
      expect(command.initialLineup[9]?.battingOrderPosition).toBe(10);
      expect(command.initialLineup[9]?.fieldPosition).toBe(FieldPosition.SHORT_FIELDER);
    });

    it('should handle 9-player lineup (without SF)', () => {
      const ninePlayerLineup: LineupPlayerDTO[] = Array.from({ length: 9 }, (_, i) => ({
        playerId: PlayerId.generate(),
        name: `Player ${i + 1}`,
        jerseyNumber: JerseyNumber.fromNumber(i + 1),
        battingOrderPosition: i + 1,
        fieldPosition: [
          FieldPosition.PITCHER,
          FieldPosition.CATCHER,
          FieldPosition.FIRST_BASE,
          FieldPosition.SECOND_BASE,
          FieldPosition.THIRD_BASE,
          FieldPosition.SHORTSTOP,
          FieldPosition.LEFT_FIELD,
          FieldPosition.CENTER_FIELD,
          FieldPosition.RIGHT_FIELD,
        ][i]!,
        preferredPositions: [],
      }));

      const command = {
        ...validCommand,
        initialLineup: ninePlayerLineup,
      };

      expect(command.initialLineup).toHaveLength(9);
      expect(command.initialLineup[0]?.battingOrderPosition).toBe(1);
      expect(command.initialLineup[8]?.battingOrderPosition).toBe(9);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.SHORT_FIELDER)).toBe(
        false
      );
    });

    it('should handle 11-player lineup (10 fielders + 1 EP)', () => {
      const elevenPlayerLineup: LineupPlayerDTO[] = [];

      // Add 10 fielding players first (including SF)
      for (let i = 1; i <= 10; i++) {
        elevenPlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
            FieldPosition.SHORT_FIELDER,
          ][i - 1]!,
          preferredPositions: [],
        });
      }

      // Add 1 extra player
      elevenPlayerLineup.push({
        playerId: PlayerId.generate(),
        name: 'Extra Player 11',
        jerseyNumber: JerseyNumber.fromNumber(11),
        battingOrderPosition: 11,
        fieldPosition: FieldPosition.EXTRA_PLAYER,
        preferredPositions: [FieldPosition.LEFT_FIELD, FieldPosition.RIGHT_FIELD],
      });

      const command = {
        ...validCommand,
        initialLineup: elevenPlayerLineup,
      };

      expect(command.initialLineup).toHaveLength(11);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.SHORT_FIELDER)).toBe(
        true
      );
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)).toBe(
        true
      );
      expect(
        command.initialLineup.filter(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)
      ).toHaveLength(1);
    });

    it('should handle 12-player lineup (10 fielders + 2 EPs)', () => {
      const twelvePlayerLineup: LineupPlayerDTO[] = [];

      // Add 10 fielding players first (including SF)
      for (let i = 1; i <= 10; i++) {
        twelvePlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
            FieldPosition.SHORT_FIELDER,
          ][i - 1]!,
          preferredPositions: [],
        });
      }

      // Add 2 extra players
      for (let i = 11; i <= 12; i++) {
        twelvePlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Extra Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: FieldPosition.EXTRA_PLAYER,
          preferredPositions: [FieldPosition.LEFT_FIELD, FieldPosition.RIGHT_FIELD],
        });
      }

      const command = {
        ...validCommand,
        initialLineup: twelvePlayerLineup,
      };

      expect(command.initialLineup).toHaveLength(12);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.SHORT_FIELDER)).toBe(
        true
      );
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)).toBe(
        true
      );
      expect(
        command.initialLineup.filter(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)
      ).toHaveLength(2);
    });

    it('should handle 25-player lineup (large roster with flexible positions)', () => {
      const twentyFivePlayerLineup: LineupPlayerDTO[] = [];

      // Add 10 fielding players first (including SF)
      for (let i = 1; i <= 10; i++) {
        twentyFivePlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
            FieldPosition.SHORT_FIELDER,
          ][i - 1]!,
          preferredPositions: [],
        });
      }

      // Add 15 extra players for flexible roster
      for (let i = 11; i <= 25; i++) {
        twentyFivePlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Roster Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: FieldPosition.EXTRA_PLAYER,
          preferredPositions: [FieldPosition.LEFT_FIELD, FieldPosition.RIGHT_FIELD],
        });
      }

      const command = {
        ...validCommand,
        initialLineup: twentyFivePlayerLineup,
        gameRules: {
          ...gameRules,
          maxPlayersInLineup: 30, // Allow large roster
        },
      };

      expect(command.initialLineup).toHaveLength(25);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.SHORT_FIELDER)).toBe(
        true
      );
      expect(
        command.initialLineup.filter(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)
      ).toHaveLength(15);
    });

    it('should handle 30-player lineup (maximum allowed roster)', () => {
      const thirtyPlayerLineup: LineupPlayerDTO[] = [];

      // Add 10 fielding players first (including SF)
      for (let i = 1; i <= 10; i++) {
        thirtyPlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
            FieldPosition.SHORT_FIELDER,
          ][i - 1]!,
          preferredPositions: [],
        });
      }

      // Add 20 extra players for maximum roster
      for (let i = 11; i <= 30; i++) {
        thirtyPlayerLineup.push({
          playerId: PlayerId.generate(),
          name: `Roster Player ${i}`,
          jerseyNumber: JerseyNumber.fromNumber(i),
          battingOrderPosition: i,
          fieldPosition: FieldPosition.EXTRA_PLAYER,
          preferredPositions: [FieldPosition.LEFT_FIELD, FieldPosition.RIGHT_FIELD],
        });
      }

      const command = {
        ...validCommand,
        initialLineup: thirtyPlayerLineup,
        gameRules: {
          ...gameRules,
          maxPlayersInLineup: 30, // Allow maximum roster
        },
      };

      expect(command.initialLineup).toHaveLength(30);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.SHORT_FIELDER)).toBe(
        true
      );
      expect(
        command.initialLineup.filter(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)
      ).toHaveLength(20);
    });

    it('should handle lineup player properties correctly', () => {
      const command = validCommand;
      const firstPlayer = command.initialLineup[0];

      expect(firstPlayer?.playerId).toBeInstanceOf(PlayerId);
      expect(firstPlayer?.name).toBe('Player 1');
      expect(firstPlayer?.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(firstPlayer?.battingOrderPosition).toBe(1);
      expect(Object.values(FieldPosition)).toContain(firstPlayer?.fieldPosition);
      expect(Array.isArray(firstPlayer?.preferredPositions)).toBe(true);
    });

    it('should handle preferred positions array', () => {
      const command = validCommand;
      const versatilePlayer = command.initialLineup[0];

      expect(versatilePlayer?.preferredPositions).toHaveLength(2);
      expect(versatilePlayer?.preferredPositions).toContain(FieldPosition.PITCHER);
      expect(versatilePlayer?.preferredPositions).toContain(FieldPosition.FIRST_BASE);
    });

    it('should handle empty preferred positions', () => {
      const playerWithNoPreferences: LineupPlayerDTO = {
        playerId: PlayerId.generate(),
        name: 'Flexible Player',
        jerseyNumber: JerseyNumber.fromNumber(99),
        battingOrderPosition: 3,
        fieldPosition: FieldPosition.THIRD_BASE,
        preferredPositions: [],
      };

      const command = {
        ...validCommand,
        initialLineup: [playerWithNoPreferences],
      };

      expect(command.initialLineup[0]?.preferredPositions).toHaveLength(0);
    });
  });

  describe('Game Rules Configuration', () => {
    it('should handle complete game rules', () => {
      const command = validCommand;
      const rules = command.gameRules!;

      expect(typeof rules.mercyRuleEnabled).toBe('boolean');
      expect(typeof rules.mercyRuleInning4).toBe('number');
      expect(typeof rules.mercyRuleInning5).toBe('number');
      expect(typeof rules.timeLimitMinutes).toBe('number');
      expect(typeof rules.extraPlayerAllowed).toBe('boolean');
      expect(typeof rules.maxPlayersInLineup).toBe('number');
    });

    it('should handle disabled mercy rule', () => {
      const noMercyRules: GameRulesDTO = {
        ...gameRules,
        mercyRuleEnabled: false,
        mercyRuleInning4: 0,
        mercyRuleInning5: 0,
      };

      const command = {
        ...validCommand,
        gameRules: noMercyRules,
      };

      expect(command.gameRules.mercyRuleEnabled).toBe(false);
    });

    it('should handle optional time limit', () => {
      const noTimeLimitRules: GameRulesDTO = {
        ...gameRules,
        // timeLimitMinutes is omitted to represent undefined
      };
      delete (noTimeLimitRules as unknown as Record<string, unknown>)['timeLimitMinutes'];

      const command = {
        ...validCommand,
        gameRules: noTimeLimitRules,
      };

      expect(command.gameRules.timeLimitMinutes).toBeUndefined();
    });

    it('should handle various lineup sizes', () => {
      const flexibleRules: GameRulesDTO = {
        ...gameRules,
        maxPlayersInLineup: 15,
        extraPlayerAllowed: true,
      };

      const command = {
        ...validCommand,
        gameRules: flexibleRules,
      };

      expect(command.gameRules.maxPlayersInLineup).toBe(15);
      expect(command.gameRules.extraPlayerAllowed).toBe(true);
    });

    it('should handle large roster sizes (25+ players)', () => {
      const largeRosterRules: GameRulesDTO = {
        ...gameRules,
        maxPlayersInLineup: 30,
        extraPlayerAllowed: true,
      };

      const command = {
        ...validCommand,
        gameRules: largeRosterRules,
      };

      expect(command.gameRules.maxPlayersInLineup).toBe(30);
      expect(command.gameRules.extraPlayerAllowed).toBe(true);
    });

    it('should allow maxPlayersInLineup of 25 (common flexible roster size)', () => {
      const flexibleRosterRules: GameRulesDTO = {
        ...gameRules,
        maxPlayersInLineup: 25,
        extraPlayerAllowed: true,
      };

      const command = {
        ...validCommand,
        gameRules: flexibleRosterRules,
      };

      expect(command.gameRules.maxPlayersInLineup).toBe(25);
    });
  });

  describe('Date and Location Handling', () => {
    it('should handle game date properly', () => {
      const futureDate = new Date('2024-12-25T10:00:00Z');
      const command = {
        ...validCommand,
        gameDate: futureDate,
      };

      expect(command.gameDate).toEqual(futureDate);
    });

    it('should handle location string', () => {
      const command = {
        ...validCommand,
        location: 'Memorial Stadium Field A',
      };

      expect(command.location).toBe('Memorial Stadium Field A');
    });

    it('should handle missing location gracefully', () => {
      const command = {
        ...validCommand,
        location: undefined,
      };

      expect(command.location).toBeUndefined();
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);

      command.initialLineup.forEach(player => {
        expect(player.playerId).toBeInstanceOf(PlayerId);
        expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
        expect(Object.values(FieldPosition)).toContain(player.fieldPosition);
      });
    });

    it('should maintain unique player IDs in lineup', () => {
      const command = validCommand;
      const playerIds = command.initialLineup.map(p => p.playerId.value);
      const uniqueIds = [...new Set(playerIds)];

      expect(uniqueIds.length).toBe(playerIds.length);
    });

    it('should maintain unique jersey numbers in lineup', () => {
      const command = validCommand;
      const jerseyNumbers = command.initialLineup.map(p => p.jerseyNumber.value);
      const uniqueNumbers = [...new Set(jerseyNumbers)];

      expect(uniqueNumbers.length).toBe(jerseyNumbers.length);
    });

    it('should maintain unique batting order positions', () => {
      const command = validCommand;
      const positions = command.initialLineup.map(p => p.battingOrderPosition);
      const uniquePositions = [...new Set(positions)];

      expect(uniquePositions.length).toBe(positions.length);
    });
  });

  describe('StartNewGameCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should validate a complete valid command', () => {
        expect(() => StartNewGameCommandValidator.validate(validCommand)).not.toThrow();
      });

      it('should throw error for empty home team name', () => {
        const invalidCommand = { ...validCommand, homeTeamName: '' };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Home team name is required and cannot be empty',
            name: 'StartNewGameCommandValidationError',
            validationContext: expect.objectContaining({
              field: 'homeTeamName',
              value: '',
            }),
          }) as Error
        );
      });

      it('should throw error for whitespace-only home team name', () => {
        const invalidCommand = { ...validCommand, homeTeamName: '   ' };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Home team name is required and cannot be empty',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for empty away team name', () => {
        const invalidCommand = { ...validCommand, awayTeamName: '' };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Away team name is required and cannot be empty',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for identical team names', () => {
        const invalidCommand = { ...validCommand, awayTeamName: 'Eagles' };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Home and away team names must be different',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid team side', () => {
        const invalidCommand = {
          ...validCommand,
          ourTeamSide: 'INVALID',
        } as unknown as StartNewGameCommand;
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Our team side must be either HOME or AWAY',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid game date', () => {
        const invalidDate = new Date('invalid');
        const invalidCommand = { ...validCommand, gameDate: invalidDate };
        let thrownError: StartNewGameCommandValidationError | undefined;
        try {
          StartNewGameCommandValidator.validate(invalidCommand);
        } catch (error) {
          thrownError = error as StartNewGameCommandValidationError;
        }
        expect(thrownError).toBeInstanceOf(StartNewGameCommandValidationError);
        expect(thrownError?.message).toBe('Game date must be a valid Date object');
        expect(thrownError?.errorType).toBe('StartNewGameCommandValidationError');
      });

      it('should throw error for empty location string when provided', () => {
        const invalidCommand = { ...validCommand, location: '   ' };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Location cannot be empty if provided',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should allow undefined location', () => {
        const { location: _location, ...commandWithoutLocation } = validCommand;
        expect(() => StartNewGameCommandValidator.validate(commandWithoutLocation)).not.toThrow();
      });
    });

    describe('Lineup Validation', () => {
      it('should throw error for non-array lineup', () => {
        const invalidCommand = {
          ...validCommand,
          initialLineup: 'not-array',
        } as unknown as StartNewGameCommand;
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Initial lineup must be an array',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for lineup with less than 9 players', () => {
        const shortLineup = lineupPlayers.slice(0, 1);
        const invalidCommand = { ...validCommand, initialLineup: shortLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message:
              'Initial lineup must have at least 9 players (10-player standard lineup recommended)',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for lineup with more than 30 players', () => {
        const longLineup = Array.from({ length: 31 }, (_, i) => ({
          playerId: PlayerId.generate(),
          name: `Player ${i + 1}`,
          jerseyNumber: JerseyNumber.fromNumber(i + 1),
          battingOrderPosition: i + 1,
          fieldPosition: FieldPosition.PITCHER,
          preferredPositions: [],
        }));
        const invalidCommand = { ...validCommand, initialLineup: longLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Initial lineup cannot exceed 30 players',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for player without playerId', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = { ...lineupPlayers[0]!, playerId: null } as unknown as LineupPlayerDTO;
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: playerId is required',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for player with empty name', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = { ...lineupPlayers[0]!, name: '' };
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: name is required and cannot be empty',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for player without jerseyNumber', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = {
          ...lineupPlayers[0]!,
          jerseyNumber: null,
        } as unknown as LineupPlayerDTO;
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: jerseyNumber is required',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid batting order position (too low)', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = { ...lineupPlayers[0]!, battingOrderPosition: 0 };
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrowError(
          'Player at index 0: battingOrderPosition must be between 1 and 30'
        );
      });

      it('should throw error for invalid batting order position (too high)', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = { ...lineupPlayers[0]!, battingOrderPosition: 31 };
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: battingOrderPosition must be between 1 and 30',
            name: 'StartNewGameCommandValidationError',
            validationContext: expect.objectContaining({
              field: 'initialLineup[0].battingOrderPosition',
              value: 31,
            }),
          }) as Error
        );
      });

      it('should throw error for invalid field position', () => {
        const invalidPosition = 'INVALID_POSITION';
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = {
          ...lineupPlayers[0]!,
          fieldPosition: invalidPosition,
        } as unknown as LineupPlayerDTO;
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: invalid fieldPosition',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for non-array preferred positions', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = {
          ...lineupPlayers[0]!,
          preferredPositions: 'not-array',
        } as unknown as LineupPlayerDTO;
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: preferredPositions must be an array',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid preferred position', () => {
        const invalidLineup = [...lineupPlayers];
        invalidLineup[0] = {
          ...lineupPlayers[0]!,
          preferredPositions: ['INVALID_POSITION'],
        } as unknown as LineupPlayerDTO;
        const invalidCommand = { ...validCommand, initialLineup: invalidLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Player at index 0: invalid preferred position INVALID_POSITION',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });
    });

    describe('Uniqueness Constraint Validation', () => {
      let fullLineup: LineupPlayerDTO[];

      beforeEach(() => {
        fullLineup = Array.from({ length: 10 }, (_, i) => ({
          playerId: PlayerId.generate(),
          name: `Player ${i + 1}`,
          jerseyNumber: JerseyNumber.fromNumber(i + 1),
          battingOrderPosition: i + 1,
          fieldPosition: [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
            FieldPosition.SHORT_FIELDER,
          ][i]!,
          preferredPositions: [],
        }));
      });

      it('should throw error for duplicate player IDs', () => {
        const duplicateId = PlayerId.generate();
        const modifiedLineup = fullLineup.map((player, index) =>
          index === 0 || index === 1 ? { ...player, playerId: duplicateId } : player
        );
        const invalidCommand = { ...validCommand, initialLineup: modifiedLineup };
        const expectedPlayerIds = modifiedLineup.map(p => p.playerId.value);
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'All players must have unique player IDs',
            name: 'StartNewGameCommandValidationError',
            validationContext: expect.objectContaining({
              field: 'initialLineup',
              value: expectedPlayerIds,
            }),
          }) as Error
        );
      });

      it('should throw error for duplicate jersey numbers', () => {
        const duplicateJerseyNumber = JerseyNumber.fromNumber(5);
        const modifiedLineup = fullLineup.map((player, index) =>
          index === 0 || index === 1 ? { ...player, jerseyNumber: duplicateJerseyNumber } : player
        );
        const invalidCommand = { ...validCommand, initialLineup: modifiedLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          'All players must have unique jersey numbers'
        );
      });

      it('should throw error for duplicate batting order positions', () => {
        const modifiedLineup = fullLineup.map((player, index) =>
          index === 0 || index === 1 ? { ...player, battingOrderPosition: 3 } : player
        );
        const invalidCommand = { ...validCommand, initialLineup: modifiedLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'All players must have unique batting order positions',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for non-consecutive batting order', () => {
        // Create a lineup where all positions are unique but not consecutive (skip position 2)
        const gappedLineup = fullLineup.map((player, index) => ({
          ...player,
          battingOrderPosition: index === 1 ? 3 : index < 1 ? index + 1 : index + 2, // Skip position 2
        }));
        const invalidCommand = { ...validCommand, initialLineup: gappedLineup };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'Batting order must be consecutive starting from 1. Missing position 2',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should allow valid consecutive batting order', () => {
        const validCommand2 = { ...validCommand, initialLineup: fullLineup };
        expect(() => StartNewGameCommandValidator.validate(validCommand2)).not.toThrow();
      });
    });

    describe('Game Rules Validation', () => {
      it('should throw error for non-boolean mercyRuleEnabled', () => {
        const invalidRules = { ...gameRules, mercyRuleEnabled: 'yes' } as unknown as GameRulesDTO;
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'mercyRuleEnabled must be a boolean',
            errorType: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid mercyRuleInning4 (negative)', () => {
        const invalidRules = { ...gameRules, mercyRuleInning4: -1 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'mercyRuleInning4 must be between 0 and 50',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid mercyRuleInning4 (too high)', () => {
        const invalidRules = { ...gameRules, mercyRuleInning4: 51 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'mercyRuleInning4 must be between 0 and 50',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid mercyRuleInning5 (negative)', () => {
        const invalidRules = { ...gameRules, mercyRuleInning5: -1 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'mercyRuleInning5 must be between 0 and 50',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid mercyRuleInning5 (too high)', () => {
        const invalidRules = { ...gameRules, mercyRuleInning5: 51 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          'mercyRuleInning5 must be between 0 and 50'
        );
      });

      it('should throw error when inning5 mercy is greater than inning4', () => {
        const invalidRules = { ...gameRules, mercyRuleInning4: 10, mercyRuleInning5: 15 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrowError(
          'mercyRuleInning5 cannot be greater than mercyRuleInning4'
        );
      });

      it('should throw error for invalid time limit (zero)', () => {
        const invalidRules = { ...gameRules, timeLimitMinutes: 0 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'timeLimitMinutes must be between 1 and 300',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid time limit (too high)', () => {
        const invalidRules = { ...gameRules, timeLimitMinutes: 301 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'timeLimitMinutes must be between 1 and 300',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should allow undefined time limit', () => {
        const { timeLimitMinutes: _timeLimitMinutes, ...rulesWithoutTimeLimit } = gameRules;
        const validCommand2 = { ...validCommand, gameRules: rulesWithoutTimeLimit };
        expect(() => StartNewGameCommandValidator.validate(validCommand2)).not.toThrow();
      });

      it('should throw error for non-boolean extraPlayerAllowed', () => {
        const invalidRules = {
          ...gameRules,
          extraPlayerAllowed: 'maybe',
        } as unknown as GameRulesDTO;
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message: 'extraPlayerAllowed must be a boolean',
            name: 'StartNewGameCommandValidationError',
          }) as Error
        );
      });

      it('should throw error for invalid maxPlayersInLineup (too low)', () => {
        const invalidRules = { ...gameRules, maxPlayersInLineup: 8 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message:
              'maxPlayersInLineup must be between 9 and 30 (10-player standard, 11-12 common, 25+ for flexible rosters)',
            name: 'StartNewGameCommandValidationError',
            validationContext: expect.objectContaining({
              field: 'maxPlayersInLineup',
            }),
          }) as Error
        );
      });

      it('should throw error for invalid maxPlayersInLineup (too high)', () => {
        const invalidRules = { ...gameRules, maxPlayersInLineup: 31 };
        const invalidCommand = { ...validCommand, gameRules: invalidRules };
        expect(() => StartNewGameCommandValidator.validate(invalidCommand)).toThrow(
          expect.objectContaining({
            message:
              'maxPlayersInLineup must be between 9 and 30 (10-player standard, 11-12 common, 25+ for flexible rosters)',
            name: 'StartNewGameCommandValidationError',
            validationContext: expect.objectContaining({
              field: 'maxPlayersInLineup',
              value: 31,
            }),
          }) as Error
        );
      });

      it('should allow disabled mercy rule with zero values', () => {
        const validRules = {
          ...gameRules,
          mercyRuleEnabled: false,
          mercyRuleInning4: 0,
          mercyRuleInning5: 0,
        };
        const validCommand2 = { ...validCommand, gameRules: validRules };
        expect(() => StartNewGameCommandValidator.validate(validCommand2)).not.toThrow();
      });
    });
  });

  describe('StartNewGameCommandFactory', () => {
    let standardLineup: LineupPlayerDTO[];

    beforeEach(() => {
      standardLineup = Array.from({ length: 10 }, (_, i) => ({
        playerId: PlayerId.generate(),
        name: `Player ${i + 1}`,
        jerseyNumber: JerseyNumber.fromNumber(i + 1),
        battingOrderPosition: i + 1,
        fieldPosition: [
          FieldPosition.PITCHER,
          FieldPosition.CATCHER,
          FieldPosition.FIRST_BASE,
          FieldPosition.SECOND_BASE,
          FieldPosition.THIRD_BASE,
          FieldPosition.SHORTSTOP,
          FieldPosition.LEFT_FIELD,
          FieldPosition.CENTER_FIELD,
          FieldPosition.RIGHT_FIELD,
          FieldPosition.SHORT_FIELDER,
        ][i]!,
        preferredPositions: [],
      }));
    });

    describe('createWithDefaults', () => {
      it('should create valid command with default rules', () => {
        const gameId = GameId.generate();
        const gameDate = new Date('2024-08-30T14:00:00Z');

        const command = StartNewGameCommandFactory.createWithDefaults(
          gameId,
          'Eagles',
          'Hawks',
          'HOME',
          gameDate,
          standardLineup,
          'Field 1'
        );

        expect(command.gameId).toBe(gameId);
        expect(command.homeTeamName).toBe('Eagles');
        expect(command.awayTeamName).toBe('Hawks');
        expect(command.ourTeamSide).toBe('HOME');
        expect(command.gameDate).toBe(gameDate);
        expect(command.location).toBe('Field 1');
        expect(command.initialLineup).toBe(standardLineup);
        expect(command.gameRules).toEqual(StartNewGameCommandFactory.getDefaultGameRules());
      });

      it('should create valid command without location', () => {
        const gameId = GameId.generate();
        const gameDate = new Date('2024-08-30T14:00:00Z');

        const command = StartNewGameCommandFactory.createWithDefaults(
          gameId,
          'Eagles',
          'Hawks',
          'AWAY',
          gameDate,
          standardLineup
        );

        expect(command.location).toBeUndefined();
        expect(command.ourTeamSide).toBe('AWAY');
      });

      it('should throw validation error for invalid data', () => {
        const gameId = GameId.generate();
        const gameDate = new Date('2024-08-30T14:00:00Z');
        const shortLineup = standardLineup.slice(0, 5); // Too few players

        expect(() =>
          StartNewGameCommandFactory.createWithDefaults(
            gameId,
            'Eagles',
            'Hawks',
            'HOME',
            gameDate,
            shortLineup
          )
        ).toThrow(StartNewGameCommandValidationError);
      });
    });

    describe('getDefaultGameRules', () => {
      it('should return consistent default rules', () => {
        const rules1 = StartNewGameCommandFactory.getDefaultGameRules();
        const rules2 = StartNewGameCommandFactory.getDefaultGameRules();

        expect(rules1).toEqual(rules2);
        expect(rules1.mercyRuleEnabled).toBe(true);
        expect(rules1.mercyRuleInning4).toBe(15);
        expect(rules1.mercyRuleInning5).toBe(10);
        expect(rules1.timeLimitMinutes).toBeUndefined();
        expect(rules1.extraPlayerAllowed).toBe(true);
        expect(rules1.maxPlayersInLineup).toBe(12);
      });
    });

    describe('getTournamentGameRules', () => {
      it('should return tournament rules with stricter mercy rules', () => {
        const tournamentRules = StartNewGameCommandFactory.getTournamentGameRules();
        const defaultRules = StartNewGameCommandFactory.getDefaultGameRules();

        expect(tournamentRules.mercyRuleInning4).toBeLessThan(defaultRules.mercyRuleInning4);
        expect(tournamentRules.mercyRuleInning5).toBeLessThan(defaultRules.mercyRuleInning5);
        expect(tournamentRules.timeLimitMinutes).toBeDefined();
        expect(tournamentRules.extraPlayerAllowed).toBe(false);
        expect(tournamentRules.maxPlayersInLineup).toBe(9);
      });

      it('should return valid tournament rules structure', () => {
        const rules = StartNewGameCommandFactory.getTournamentGameRules();

        expect(rules.mercyRuleEnabled).toBe(true);
        expect(rules.mercyRuleInning4).toBe(12);
        expect(rules.mercyRuleInning5).toBe(7);
        expect(rules.timeLimitMinutes).toBe(75);
        expect(rules.extraPlayerAllowed).toBe(false);
        expect(rules.maxPlayersInLineup).toBe(9);
      });
    });
  });

  describe('StartNewGameCommandValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new StartNewGameCommandValidationError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('StartNewGameCommandValidationError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StartNewGameCommandValidationError);
    });
  });
});
