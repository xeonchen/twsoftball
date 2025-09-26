/**
 * @file Wizard to Command Mapper Tests
 * Comprehensive test suite for converting UI wizard state to StartNewGameCommand.
 *
 * @remarks
 * This test suite follows TDD principles and validates all aspects of the wizard
 * to command mapping, including domain value object creation, validation, and
 * error handling. The tests ensure proper conversion from UI state to application
 * layer commands while maintaining hexagonal architecture boundaries.
 *
 * Test Categories:
 * - Basic mapping and structure validation
 * - Team configuration mapping (home/away/ourTeam)
 * - Lineup conversion and batting order assignment
 * - Domain value object creation and validation
 * - Jersey number validation and uniqueness
 * - Field position validation
 * - Error handling for invalid data
 * - Edge cases and boundary conditions
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/application';
import { describe, it, expect, beforeEach } from 'vitest';

import type { SetupWizardState, Player } from '../../lib/types';

import { wizardToCommand } from './wizardToCommand';

describe('Wizard to Command Mapping', () => {
  let validWizardState: SetupWizardState;

  beforeEach(() => {
    // Setup valid default state for each test
    validWizardState = {
      teams: {
        home: 'Eagles',
        away: 'Hawks',
        ourTeam: 'home',
      },
      lineup: [
        {
          id: 'player-1',
          name: 'John Smith',
          jerseyNumber: '1',
          position: 'P',
          battingOrder: 1,
        },
        {
          id: 'player-2',
          name: 'Jane Doe',
          jerseyNumber: '2',
          position: 'C',
          battingOrder: 2,
        },
        {
          id: 'player-3',
          name: 'Bob Johnson',
          jerseyNumber: '3',
          position: '1B',
          battingOrder: 3,
        },
        {
          id: 'player-4',
          name: 'Alice Brown',
          jerseyNumber: '4',
          position: '2B',
          battingOrder: 4,
        },
        {
          id: 'player-5',
          name: 'Charlie Wilson',
          jerseyNumber: '5',
          position: '3B',
          battingOrder: 5,
        },
        {
          id: 'player-6',
          name: 'Diana Davis',
          jerseyNumber: '6',
          position: 'SS',
          battingOrder: 6,
        },
        {
          id: 'player-7',
          name: 'Frank Miller',
          jerseyNumber: '7',
          position: 'LF',
          battingOrder: 7,
        },
        {
          id: 'player-8',
          name: 'Grace Taylor',
          jerseyNumber: '8',
          position: 'CF',
          battingOrder: 8,
        },
        {
          id: 'player-9',
          name: 'Henry Anderson',
          jerseyNumber: '9',
          position: 'RF',
          battingOrder: 9,
        },
      ],
    };
  });

  describe('Basic Command Structure', () => {
    it('should convert setup wizard state to StartNewGameCommand', () => {
      const command = wizardToCommand(validWizardState);

      expect(command).toBeDefined();
      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
      expect(command.ourTeamSide).toBe('HOME');
      expect(command.gameDate).toBeInstanceOf(Date);
      expect(command.initialLineup).toHaveLength(9);
    });

    it('should generate unique GameId for new games', () => {
      const command1 = wizardToCommand(validWizardState);
      const command2 = wizardToCommand(validWizardState);

      expect(command1.gameId.value).not.toBe(command2.gameId.value);
      expect(command1.gameId.value).toMatch(/^game-[a-f0-9-]+$/);
    });

    it('should set current date/time as gameDate', () => {
      const beforeCall = new Date();
      const command = wizardToCommand(validWizardState);
      const afterCall = new Date();

      expect(command.gameDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(command.gameDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('Team Configuration Mapping', () => {
    it('should handle home team as our team correctly', () => {
      validWizardState.teams.ourTeam = 'home';

      const command = wizardToCommand(validWizardState);

      expect(command.ourTeamSide).toBe('HOME');
      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
    });

    it('should handle away team as our team correctly', () => {
      validWizardState.teams.ourTeam = 'away';

      const command = wizardToCommand(validWizardState);

      expect(command.ourTeamSide).toBe('AWAY');
      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
    });

    it('should throw error when ourTeam is null', () => {
      validWizardState.teams.ourTeam = null;

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Our team side must be specified (home or away)'
      );
    });

    it('should trim team names and handle extra whitespace', () => {
      validWizardState.teams.home = '  Eagles  ';
      validWizardState.teams.away = '\tHawks\n';

      const command = wizardToCommand(validWizardState);

      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
    });
  });

  describe('Lineup Player Mapping', () => {
    it('should map lineup players to LineupPlayerDTO format', () => {
      const command = wizardToCommand(validWizardState);

      const firstPlayer = command.initialLineup[0];
      expect(firstPlayer.playerId).toBeInstanceOf(PlayerId);
      expect(firstPlayer.playerId.value).toBe('player-1');
      expect(firstPlayer.name).toBe('John Smith');
      expect(firstPlayer.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(firstPlayer.jerseyNumber.value).toBe('1');
      expect(firstPlayer.battingOrderPosition).toBe(1);
      expect(firstPlayer.fieldPosition).toBe(FieldPosition.PITCHER);
      expect(firstPlayer.preferredPositions).toEqual([FieldPosition.PITCHER]);
    });

    it('should assign batting order positions correctly', () => {
      const command = wizardToCommand(validWizardState);

      command.initialLineup.forEach((player, index) => {
        expect(player.battingOrderPosition).toBe(index + 1);
      });
    });

    it('should sort players by batting order before mapping', () => {
      // Scramble the batting order in the input
      validWizardState.lineup = [
        { ...validWizardState.lineup[2], battingOrder: 3 },
        { ...validWizardState.lineup[0], battingOrder: 1 },
        { ...validWizardState.lineup[1], battingOrder: 2 },
        { ...validWizardState.lineup[4], battingOrder: 5 },
        { ...validWizardState.lineup[3], battingOrder: 4 },
        { ...validWizardState.lineup[6], battingOrder: 7 },
        { ...validWizardState.lineup[5], battingOrder: 6 },
        { ...validWizardState.lineup[8], battingOrder: 9 },
        { ...validWizardState.lineup[7], battingOrder: 8 },
      ];

      const command = wizardToCommand(validWizardState);

      // Verify the players are mapped in correct batting order
      expect(command.initialLineup[0].name).toBe('John Smith'); // batting order 1
      expect(command.initialLineup[1].name).toBe('Jane Doe'); // batting order 2
      expect(command.initialLineup[2].name).toBe('Bob Johnson'); // batting order 3
    });

    it('should handle 10-player lineup with short fielder', () => {
      validWizardState.lineup.push({
        id: 'player-10',
        name: 'Ivan Short',
        jerseyNumber: '10',
        position: 'SF',
        battingOrder: 10,
      });

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup).toHaveLength(10);
      const shortFielder = command.initialLineup[9];
      expect(shortFielder.fieldPosition).toBe(FieldPosition.SHORT_FIELDER);
      expect(shortFielder.battingOrderPosition).toBe(10);
    });

    it('should handle extra players correctly', () => {
      validWizardState.lineup.push({
        id: 'player-10',
        name: 'Extra Player',
        jerseyNumber: '10',
        position: 'EP',
        battingOrder: 10,
      });

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup).toHaveLength(10);
      const extraPlayer = command.initialLineup[9];
      expect(extraPlayer.fieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
      expect(extraPlayer.battingOrderPosition).toBe(10);
    });
  });

  describe('Validation Requirements', () => {
    it('should validate lineup has minimum 9 players', () => {
      validWizardState.lineup = validWizardState.lineup.slice(0, 8); // Only 8 players

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Lineup must contain at least 9 players'
      );
    });

    it('should validate jersey numbers are 1-99', () => {
      validWizardState.lineup[0].jerseyNumber = '100';

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Jersey number must be between 1 and 99'
      );
    });

    it('should reject jersey number 0', () => {
      validWizardState.lineup[0].jerseyNumber = '0';

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Jersey number must be between 1 and 99'
      );
    });

    it('should validate jersey numbers are numeric', () => {
      validWizardState.lineup[0].jerseyNumber = 'ABC';

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Jersey number must be a valid number'
      );
    });

    it('should prevent duplicate jersey numbers', () => {
      validWizardState.lineup[0].jerseyNumber = '5';
      validWizardState.lineup[4].jerseyNumber = '5'; // Duplicate

      expect(() => wizardToCommand(validWizardState)).toThrow('Duplicate jersey number: 5');
    });

    it('should validate field positions are valid', () => {
      validWizardState.lineup[0].position = 'INVALID';

      expect(() => wizardToCommand(validWizardState)).toThrow('Invalid field position: INVALID');
    });

    it('should validate batting order is sequential starting from 1', () => {
      validWizardState.lineup[0].battingOrder = 2; // Should start at 1

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Batting order must be sequential starting from 1'
      );
    });

    it('should validate no gaps in batting order', () => {
      validWizardState.lineup[2].battingOrder = 5; // Skip 3, go to 5

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Batting order must be sequential starting from 1'
      );
    });

    it('should handle sparse arrays gracefully', () => {
      // Create a sparse array with undefined element but preserve batting order
      const sparseLineup: (Player | undefined)[] = [...validWizardState.lineup];
      sparseLineup[0] = undefined; // Create undefined element at first position
      // Update batting order to be sequential starting from the undefined element
      sparseLineup[1].battingOrder = 1;
      sparseLineup[2].battingOrder = 2;
      sparseLineup[3].battingOrder = 3;
      sparseLineup[4].battingOrder = 4;
      sparseLineup[5].battingOrder = 5;
      sparseLineup[6].battingOrder = 6;
      sparseLineup[7].battingOrder = 7;
      sparseLineup[8].battingOrder = 8;

      const invalidState = {
        teams: validWizardState.teams,
        lineup: sparseLineup,
      };

      expect(() => wizardToCommand(invalidState)).toThrow(
        'Invalid lineup: missing player at position 9'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing or invalid data gracefully', () => {
      const invalidState = {
        teams: {
          home: '',
          away: 'Hawks',
          ourTeam: 'home' as const,
        },
        lineup: validWizardState.lineup,
      };

      expect(() => wizardToCommand(invalidState)).toThrow('Home team name is required');
    });

    it('should validate away team name is provided', () => {
      validWizardState.teams.away = '';

      expect(() => wizardToCommand(validWizardState)).toThrow('Away team name is required');
    });

    it('should validate team names are different', () => {
      validWizardState.teams.home = 'Eagles';
      validWizardState.teams.away = 'Eagles';

      expect(() => wizardToCommand(validWizardState)).toThrow(
        'Home and away team names must be different'
      );
    });

    it('should validate player names are provided', () => {
      validWizardState.lineup[0].name = '';

      expect(() => wizardToCommand(validWizardState)).toThrow('Player name is required');
    });

    it('should validate player IDs are provided', () => {
      validWizardState.lineup[0].id = '';

      expect(() => wizardToCommand(validWizardState)).toThrow('Player ID is required');
    });

    it('should validate jersey numbers are provided', () => {
      validWizardState.lineup[0].jerseyNumber = '';

      expect(() => wizardToCommand(validWizardState)).toThrow('Jersey number is required');
    });

    it('should validate positions are provided', () => {
      validWizardState.lineup[0].position = '';

      expect(() => wizardToCommand(validWizardState)).toThrow('Position is required');
    });

    it('should handle null/undefined lineup gracefully', () => {
      const invalidState = {
        teams: validWizardState.teams,
        lineup: null as unknown as Player[],
      };

      expect(() => wizardToCommand(invalidState)).toThrow('Lineup is required');
    });

    it('should handle non-array lineup gracefully', () => {
      const invalidState = {
        teams: validWizardState.teams,
        lineup: 'not an array' as unknown as Player[],
      };

      expect(() => wizardToCommand(invalidState)).toThrow('Lineup must be an array');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum allowed lineup size', () => {
      // Add players up to common maximum (12 players)
      const extraPlayers = [
        {
          id: 'player-10',
          name: 'Player Ten',
          jerseyNumber: '10',
          position: 'SF',
          battingOrder: 10,
        },
        {
          id: 'player-11',
          name: 'Player Eleven',
          jerseyNumber: '11',
          position: 'EP',
          battingOrder: 11,
        },
        {
          id: 'player-12',
          name: 'Player Twelve',
          jerseyNumber: '12',
          position: 'EP',
          battingOrder: 12,
        },
      ];

      validWizardState.lineup.push(...extraPlayers);

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup).toHaveLength(12);
      expect(command.initialLineup[11].name).toBe('Player Twelve');
    });

    it('should handle jersey number 1', () => {
      validWizardState.lineup[0].jerseyNumber = '1';

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup[0].jerseyNumber.value).toBe('1');
    });

    it('should handle jersey number 99', () => {
      validWizardState.lineup[0].jerseyNumber = '99';

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup[0].jerseyNumber.value).toBe('99');
    });

    it('should preserve player name with special characters', () => {
      validWizardState.lineup[0].name = "O'Connor-Smith Jr.";

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup[0].name).toBe("O'Connor-Smith Jr.");
    });

    it('should handle all valid field positions', () => {
      const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF', 'EP'];

      // Create a lineup with all positions (11 players)
      const fullLineup = positions.map((pos, index) => ({
        id: `player-${index + 1}`,
        name: `Player ${index + 1}`,
        jerseyNumber: `${index + 1}`,
        position: pos,
        battingOrder: index + 1,
      }));

      validWizardState.lineup = fullLineup;

      const command = wizardToCommand(validWizardState);

      expect(command.initialLineup).toHaveLength(11);
      positions.forEach((pos, index) => {
        const expectedPosition = Object.values(FieldPosition).find(
          fp => fp === (pos as FieldPosition)
        );
        expect(command.initialLineup[index]?.fieldPosition).toBe(expectedPosition);
      });
    });
  });
});
