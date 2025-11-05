/**
 * @file DTOMappingHelpers.test.ts
 * Unit tests for DTOMappingHelpers utility
 */

import {
  TeamLineup,
  PlayerId,
  GameId,
  TeamLineupId,
  JerseyNumber,
  FieldPosition,
  SoftballRules,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { DTOMappingHelpers } from './DTOMappingHelpers.js';

describe('DTOMappingHelpers', () => {
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let playerId1: PlayerId;
  let playerId2: PlayerId;
  let playerId3: PlayerId;
  let rules: SoftballRules;

  beforeEach(() => {
    gameId = new GameId('test-game-123');
    teamLineupId = new TeamLineupId('test-lineup-456');
    playerId1 = new PlayerId('player-1');
    playerId2 = new PlayerId('player-2');
    playerId3 = new PlayerId('player-3');
    rules = new SoftballRules();
  });

  describe('mapTeamLineupToDTO', () => {
    it('should convert TeamLineup aggregate to DTO with complete batting slots', () => {
      // Create a team lineup with 3 players
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Warriors', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.addPlayer(
        playerId2,
        new JerseyNumber('20'),
        'Bob Jones',
        2,
        FieldPosition.CATCHER,
        rules
      );
      lineup = lineup.addPlayer(
        playerId3,
        new JerseyNumber('30'),
        'Charlie Davis',
        3,
        FieldPosition.FIRST_BASE,
        rules
      );

      const result = DTOMappingHelpers.mapTeamLineupToDTO(lineup, 'HOME');

      expect(result.teamLineupId).toEqual(teamLineupId);
      expect(result.gameId).toEqual(gameId);
      expect(result.teamSide).toBe('HOME');
      expect(result.teamName).toBe('Test Warriors');
      expect(result.strategy).toBe('SIMPLE');
      expect(result.battingSlots).toHaveLength(3);
      expect(result.battingSlots[0].slotNumber).toBe(1);
      expect(result.battingSlots[0].currentPlayer).toBeDefined();
      expect(result.battingSlots[0].currentPlayer?.name).toBe('Alice Smith');
      expect(result.battingSlots[0].currentPlayer?.jerseyNumber).toEqual(new JerseyNumber('10'));
    });

    it('should map field positions correctly', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Eagles', 'AWAY');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.addPlayer(
        playerId2,
        new JerseyNumber('20'),
        'Bob Jones',
        2,
        FieldPosition.CATCHER,
        rules
      );

      const result = DTOMappingHelpers.mapTeamLineupToDTO(lineup, 'AWAY');

      expect(result.fieldPositions[FieldPosition.PITCHER]).toEqual(playerId1);
      expect(result.fieldPositions[FieldPosition.CATCHER]).toEqual(playerId2);
    });

    it('should include player statistics in current player data', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const result = DTOMappingHelpers.mapTeamLineupToDTO(lineup, 'HOME');

      expect(result.battingSlots[0].currentPlayer?.statistics).toBeDefined();
      expect(result.battingSlots[0].currentPlayer?.statistics.playerId).toEqual(playerId1);
      expect(result.battingSlots[0].currentPlayer?.statistics.name).toBe('Alice Smith');
      expect(result.battingSlots[0].currentPlayer?.statistics.plateAppearances).toBe(0);
      expect(result.battingSlots[0].currentPlayer?.statistics.atBats).toBe(0);
    });

    it('should handle empty batting slots gracefully', () => {
      const lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');

      const result = DTOMappingHelpers.mapTeamLineupToDTO(lineup, 'HOME');

      expect(result.battingSlots).toHaveLength(0);
      expect(result.teamName).toBe('Test Team');
    });

    it('should include substitution history in batting slots', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Starter',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const result = DTOMappingHelpers.mapTeamLineupToDTO(lineup, 'HOME');

      expect(result.battingSlots[0].history).toBeDefined();
      expect(Array.isArray(result.battingSlots[0].history)).toBe(true);
    });
  });

  describe('mapPlayerToDTO', () => {
    it('should convert player info to PlayerInGameDTO', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const result = DTOMappingHelpers.mapPlayerToDTO(lineup, playerId1, 1);

      expect(result).not.toBeNull();
      expect(result?.playerId).toEqual(playerId1);
      expect(result?.name).toBe('Alice Smith');
      expect(result?.jerseyNumber).toEqual(new JerseyNumber('10'));
      expect(result?.battingOrderPosition).toBe(1);
      expect(result?.statistics).toBeDefined();
    });

    it('should return null for player not found', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const unknownPlayerId = new PlayerId('unknown-player');
      const result = DTOMappingHelpers.mapPlayerToDTO(lineup, unknownPlayerId, 1);

      expect(result).toBeNull();
    });

    it('should include field position when assigned', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.SHORTSTOP,
        rules
      );

      const result = DTOMappingHelpers.mapPlayerToDTO(lineup, playerId1, 1);

      expect(result?.currentFieldPosition).toBe(FieldPosition.SHORTSTOP);
      expect(result?.preferredPositions).toContain(FieldPosition.SHORTSTOP);
    });

    it('should default to EXTRA_PLAYER position when not assigned', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.EXTRA_PLAYER,
        rules
      );

      const result = DTOMappingHelpers.mapPlayerToDTO(lineup, playerId1, 1);

      expect(result?.currentFieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
    });

    it('should include empty plate appearances array', () => {
      let lineup = TeamLineup.createNew(teamLineupId, gameId, 'Test Team', 'HOME');
      lineup = lineup.addPlayer(
        playerId1,
        new JerseyNumber('10'),
        'Alice Smith',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const result = DTOMappingHelpers.mapPlayerToDTO(lineup, playerId1, 1);

      expect(result?.plateAppearances).toBeDefined();
      expect(Array.isArray(result?.plateAppearances)).toBe(true);
      expect(result?.plateAppearances).toHaveLength(0);
    });
  });

  describe('createEmptyStatistics', () => {
    it('should create empty statistics with zero values', () => {
      const result = DTOMappingHelpers.createEmptyStatistics(
        playerId1,
        'Alice Smith',
        new JerseyNumber('10')
      );

      expect(result.playerId).toEqual(playerId1);
      expect(result.name).toBe('Alice Smith');
      expect(result.jerseyNumber).toEqual(new JerseyNumber('10'));
      expect(result.plateAppearances).toBe(0);
      expect(result.atBats).toBe(0);
      expect(result.hits).toBe(0);
      expect(result.singles).toBe(0);
      expect(result.doubles).toBe(0);
      expect(result.triples).toBe(0);
      expect(result.homeRuns).toBe(0);
      expect(result.walks).toBe(0);
      expect(result.strikeouts).toBe(0);
      expect(result.rbi).toBe(0);
      expect(result.runs).toBe(0);
    });

    it('should create batting average as 0.0', () => {
      const result = DTOMappingHelpers.createEmptyStatistics(
        playerId1,
        'Alice Smith',
        new JerseyNumber('10')
      );

      expect(result.battingAverage).toBe(0.0);
      expect(result.onBasePercentage).toBe(0.0);
      expect(result.sluggingPercentage).toBe(0.0);
    });

    it('should create empty fielding statistics', () => {
      const result = DTOMappingHelpers.createEmptyStatistics(
        playerId1,
        'Alice Smith',
        new JerseyNumber('10')
      );

      expect(result.fielding).toBeDefined();
      expect(result.fielding.positions).toHaveLength(0);
      expect(result.fielding.putouts).toBe(0);
      expect(result.fielding.assists).toBe(0);
      expect(result.fielding.errors).toBe(0);
      expect(result.fielding.fieldingPercentage).toBe(1.0);
    });

    it('should handle different jersey numbers', () => {
      const result1 = DTOMappingHelpers.createEmptyStatistics(
        playerId1,
        'Player A',
        new JerseyNumber('99')
      );
      const result2 = DTOMappingHelpers.createEmptyStatistics(
        playerId2,
        'Player B',
        new JerseyNumber('1')
      );

      expect(result1.jerseyNumber).toEqual(new JerseyNumber('99'));
      expect(result2.jerseyNumber).toEqual(new JerseyNumber('1'));
    });

    it('should create independent statistics objects', () => {
      const result1 = DTOMappingHelpers.createEmptyStatistics(
        playerId1,
        'Player A',
        new JerseyNumber('10')
      );
      const result2 = DTOMappingHelpers.createEmptyStatistics(
        playerId2,
        'Player B',
        new JerseyNumber('20')
      );

      expect(result1).not.toBe(result2);
      expect(result1.fielding).not.toBe(result2.fielding);
      expect(result1.playerId).not.toEqual(result2.playerId);
    });
  });
});
