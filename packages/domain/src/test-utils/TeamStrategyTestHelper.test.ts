import { describe, it, expect, beforeEach } from 'vitest';
import { TeamStrategyTestHelper } from './TeamStrategyTestHelper';
import { SimpleTeamStrategy } from '../strategies/SimpleTeamStrategy';
import { FieldPosition } from '../constants/FieldPosition';
import type { TeamStrategy } from '../strategies/TeamStrategy';

describe('TeamStrategyTestHelper', () => {
  let strategy: TeamStrategy;

  beforeEach(() => {
    strategy = new SimpleTeamStrategy();
  });

  describe('setupBasicLineup', () => {
    it('should create a valid lineup with default 9 players', () => {
      const players = TeamStrategyTestHelper.setupBasicLineup(strategy);

      expect(players).toHaveLength(9);
      expect(players[0]!.name).toBe('John Smith');
      expect(players[8]!.name).toBe('Chris Lee');

      // Verify all players are unique by ID
      const playerIds = players.map(p => p.playerId.value);
      const uniqueIds = new Set(playerIds);
      expect(uniqueIds.size).toBe(9);
    });

    it('should create a lineup with specified player count', () => {
      const players = TeamStrategyTestHelper.setupBasicLineup(strategy, 12);

      expect(players).toHaveLength(12);
      expect(players[9]!.name).toBe('Rachel Adams');
      expect(players[11]!.name).toBe('Maria Rodriguez');
    });

    it('should throw error for invalid player count', () => {
      expect(() => TeamStrategyTestHelper.setupBasicLineup(strategy, 0)).toThrow(
        'Cannot create 0 players. Must be between 1 and 20'
      );

      expect(() => TeamStrategyTestHelper.setupBasicLineup(strategy, 21)).toThrow(
        'Cannot create 21 players. Must be between 1 and 20'
      );
    });

    it('should set players in batting lineup when strategy supports it', () => {
      const players = TeamStrategyTestHelper.setupBasicLineup(strategy, 9);

      // The helper should set up the lineup in the strategy
      const currentLineup = strategy.getCurrentLineup();
      expect(currentLineup).toHaveLength(9);
      expect(currentLineup[0]!.currentPlayer.playerId).toEqual(players[0]!.playerId);
    });
  });

  describe('setupFullLineup', () => {
    it('should create exactly 20 players', () => {
      const players = TeamStrategyTestHelper.setupFullLineup(strategy);

      expect(players).toHaveLength(20);
      expect(players[0]!.name).toBe('John Smith');
      expect(players[19]!.name).toBe('Stephanie Lewis');
    });

    it('should create lineup with all unique jersey numbers', () => {
      const players = TeamStrategyTestHelper.setupFullLineup(strategy);

      const jerseyNumbers = players.map(p => p.jerseyNumber.value);
      const uniqueJerseys = new Set(jerseyNumbers);
      expect(uniqueJerseys.size).toBe(20);
    });

    it('should set up a full 20-player batting lineup when strategy supports it', () => {
      const players = TeamStrategyTestHelper.setupFullLineup(strategy);

      const currentLineup = strategy.getCurrentLineup();
      expect(currentLineup).toHaveLength(20);
      expect(currentLineup[19]!.currentPlayer.playerId).toEqual(players[19]!.playerId);
    });
  });

  describe('assertLineupValid', () => {
    it('should not throw when lineup is valid', () => {
      TeamStrategyTestHelper.setupBasicLineup(strategy, 9);

      expect(() => TeamStrategyTestHelper.assertLineupValid(strategy)).not.toThrow();
    });

    it('should throw when lineup is invalid', () => {
      // Empty lineup should be invalid
      expect(() => TeamStrategyTestHelper.assertLineupValid(strategy)).toThrow(
        'Expected lineup to be valid, but it was invalid'
      );
    });

    it('should throw when lineup has insufficient players', () => {
      TeamStrategyTestHelper.setupBasicLineup(strategy, 8);

      expect(() => TeamStrategyTestHelper.assertLineupValid(strategy)).toThrow(
        'Expected lineup to be valid, but it was invalid'
      );
    });
  });

  describe('createSubstitutionScenario', () => {
    it('should return substitution test data', () => {
      const scenario = TeamStrategyTestHelper.createSubstitutionScenario();

      expect(scenario).toHaveProperty('originalPlayer');
      expect(scenario).toHaveProperty('substitutePlayer');
      expect(scenario).toHaveProperty('battingSlot');
      expect(scenario).toHaveProperty('fieldPosition');

      expect(scenario.battingSlot).toBe(3);
      expect(scenario.fieldPosition).toBe(FieldPosition.FIRST_BASE);
      expect(scenario.originalPlayer.name).toBe('Mike Johnson');
      expect(scenario.substitutePlayer.name).toBe('Sub Player');
    });

    it('should create players with different IDs', () => {
      const scenario = TeamStrategyTestHelper.createSubstitutionScenario();

      expect(scenario.originalPlayer.playerId.value).not.toBe(
        scenario.substitutePlayer.playerId.value
      );
    });

    it('should create players with different jersey numbers', () => {
      const scenario = TeamStrategyTestHelper.createSubstitutionScenario();

      expect(scenario.originalPlayer.jerseyNumber.value).not.toBe(
        scenario.substitutePlayer.jerseyNumber.value
      );
    });
  });

  describe('createPositionChangeScenario', () => {
    it('should return position change test data', () => {
      const scenario = TeamStrategyTestHelper.createPositionChangeScenario();

      expect(scenario).toHaveProperty('player');
      expect(scenario).toHaveProperty('fromPosition');
      expect(scenario).toHaveProperty('toPosition');
      expect(scenario).toHaveProperty('battingSlot');

      expect(scenario.battingSlot).toBe(1);
      expect(scenario.fromPosition).toBe(FieldPosition.PITCHER);
      expect(scenario.toPosition).toBe(FieldPosition.CATCHER);
      expect(scenario.player.name).toBe('John Smith');
    });

    it('should create meaningful position change', () => {
      const scenario = TeamStrategyTestHelper.createPositionChangeScenario();

      expect(scenario.fromPosition).not.toBe(scenario.toPosition);
    });
  });
});
