/**
 * @file StartNewGameCommand Tests
 * Tests for command DTO to initiate a new softball game.
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { StartNewGameCommand, LineupPlayerDTO, GameRulesDTO } from './StartNewGameCommand';

describe('StartNewGameCommand', () => {
  let validCommand: StartNewGameCommand;
  let gameId: GameId;
  let lineupPlayers: LineupPlayerDTO[];
  let gameRules: GameRulesDTO;

  beforeEach(() => {
    gameId = GameId.generate();

    lineupPlayers = [
      {
        playerId: PlayerId.generate(),
        name: 'John Smith',
        jerseyNumber: JerseyNumber.fromNumber(1),
        battingOrderPosition: 1,
        fieldPosition: FieldPosition.PITCHER,
        preferredPositions: [FieldPosition.PITCHER, FieldPosition.FIRST_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Jane Doe',
        jerseyNumber: JerseyNumber.fromNumber(2),
        battingOrderPosition: 2,
        fieldPosition: FieldPosition.CATCHER,
        preferredPositions: [FieldPosition.CATCHER],
      },
    ];

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
    it('should handle minimum lineup (9 players)', () => {
      const minimalLineup: LineupPlayerDTO[] = Array.from({ length: 9 }, (_, i) => ({
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
        initialLineup: minimalLineup,
      };

      expect(command.initialLineup).toHaveLength(9);
      expect(command.initialLineup[0]?.battingOrderPosition).toBe(1);
      expect(command.initialLineup[8]?.battingOrderPosition).toBe(9);
    });

    it('should handle extended lineup (with extra players)', () => {
      // Start with 9 baseline players
      const extendedLineup: LineupPlayerDTO[] = [];

      // Add 9 regular players first
      for (let i = 1; i <= 9; i++) {
        extendedLineup.push({
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
          ][i - 1]!,
          preferredPositions: [],
        });
      }

      // Add extra players
      for (let i = 10; i <= 12; i++) {
        extendedLineup.push({
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
        initialLineup: extendedLineup,
      };

      expect(command.initialLineup.length).toBeGreaterThan(9);
      expect(command.initialLineup.some(p => p.fieldPosition === FieldPosition.EXTRA_PLAYER)).toBe(
        true
      );
    });

    it('should handle lineup player properties correctly', () => {
      const command = validCommand;
      const firstPlayer = command.initialLineup[0];

      expect(firstPlayer?.playerId).toBeInstanceOf(PlayerId);
      expect(firstPlayer?.name).toBe('John Smith');
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
});
