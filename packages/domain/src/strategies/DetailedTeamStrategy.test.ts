import { describe, it, expect, beforeEach } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { SoftballRules } from '../rules/SoftballRules';
import { TestPlayerFactory, TeamStrategyTestHelper } from '../test-utils';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';

import { DetailedTeamStrategy } from './DetailedTeamStrategy';
import type { TeamPlayer } from './TeamStrategy';

describe('DetailedTeamStrategy', () => {
  let strategy: DetailedTeamStrategy;
  let players: TeamPlayer[];
  let player1: TeamPlayer;
  let player2: TeamPlayer;
  let player3: TeamPlayer;
  let player4: TeamPlayer;

  beforeEach(() => {
    strategy = new DetailedTeamStrategy();

    // Create 10 players using test utilities (standard configuration) - eliminates duplication
    players = TestPlayerFactory.createPlayers(10);
    [player1, player2, player3, player4] = [players[0]!, players[1]!, players[2]!, players[3]!];
  });

  describe('Construction', () => {
    it('should initialize with empty lineup', () => {
      const lineup = strategy.getCurrentLineup();

      expect(lineup).toEqual([]);
      expect(strategy.getActivePlayerCount()).toBe(0);
      expect(strategy.isLineupValid()).toBe(false);
    });
  });

  describe('addPlayer', () => {
    it('should add player to first available batting slot', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toHaveLength(1);
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[0]?.currentPlayer).toEqual(player1);
      expect(lineup[0]?.currentPosition).toBe(FieldPosition.PITCHER);
    });

    it('should add multiple players to sequential slots', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);
      strategy.addPlayer(player3, 3, FieldPosition.FIRST_BASE);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toHaveLength(3);
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[1]?.slotNumber).toBe(2);
      expect(lineup[2]?.slotNumber).toBe(3);
      expect(strategy.getActivePlayerCount()).toBe(3);
    });

    it('should reject invalid batting slot numbers with default rules', () => {
      expect(() => strategy.addPlayer(player1, 0, FieldPosition.PITCHER)).toThrow(DomainError);
      expect(() => strategy.addPlayer(player1, 0, FieldPosition.PITCHER)).toThrow(
        'Batting slot must be between 1 and 25'
      );

      expect(() => strategy.addPlayer(player1, 26, FieldPosition.PITCHER)).toThrow(DomainError);
      expect(() => strategy.addPlayer(player1, 26, FieldPosition.PITCHER)).toThrow(
        'Batting slot must be between 1 and 25'
      );
    });

    it('should reject invalid batting slot numbers with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      expect(() => strategy.addPlayer(player1, 0, FieldPosition.PITCHER, rules)).toThrow(
        DomainError
      );
      expect(() => strategy.addPlayer(player1, 0, FieldPosition.PITCHER, rules)).toThrow(
        'Batting slot must be between 1 and 20'
      );

      expect(() => strategy.addPlayer(player1, 21, FieldPosition.PITCHER, rules)).toThrow(
        DomainError
      );
      expect(() => strategy.addPlayer(player1, 21, FieldPosition.PITCHER, rules)).toThrow(
        'Batting slot must be between 1 and 20'
      );
    });

    it('should reject duplicate player in lineup', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      expect(() => strategy.addPlayer(player1, 2, FieldPosition.CATCHER)).toThrow(DomainError);
      expect(() => strategy.addPlayer(player1, 2, FieldPosition.CATCHER)).toThrow(
        'Player is already in the lineup'
      );
    });

    it('should reject occupied batting slot', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      expect(() => strategy.addPlayer(player2, 1, FieldPosition.CATCHER)).toThrow(DomainError);
      expect(() => strategy.addPlayer(player2, 1, FieldPosition.CATCHER)).toThrow(
        'Batting slot 1 is already occupied'
      );
    });

    it('should allow non-sequential batting slot assignments', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 5, FieldPosition.CATCHER);
      strategy.addPlayer(player3, 3, FieldPosition.FIRST_BASE);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toHaveLength(3);

      // Should be sorted by slot number
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[1]?.slotNumber).toBe(3);
      expect(lineup[2]?.slotNumber).toBe(5);
    });

    it('should track substitution history for starters', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      const substitutionHistory = strategy.getPlayerSubstitutionHistory(player1.playerId);
      expect(substitutionHistory).toBeDefined();
      if (!substitutionHistory) {
        throw new Error('Expected substitution history to be defined');
      }
      expect(substitutionHistory.isStarter).toBe(true);
      expect(substitutionHistory.timesSubstituted).toBe(0);
      expect(substitutionHistory.canReenter).toBe(true);
    });
  });

  describe('getCurrentLineup', () => {
    it('should return empty array when no players added', () => {
      const lineup = strategy.getCurrentLineup();

      expect(lineup).toEqual([]);
    });

    it('should return lineup sorted by batting slot number', () => {
      strategy.addPlayer(player3, 10, FieldPosition.FIRST_BASE);
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 5, FieldPosition.CATCHER);

      const lineup = strategy.getCurrentLineup();
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[1]?.slotNumber).toBe(5);
      expect(lineup[2]?.slotNumber).toBe(10);
    });

    it('should return immutable lineup data', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      const lineup1 = strategy.getCurrentLineup();
      const lineup2 = strategy.getCurrentLineup();

      expect(lineup1).not.toBe(lineup2); // Different array references
      expect(lineup1).toEqual(lineup2); // But same content
    });
  });

  describe('isPlayerInLineup', () => {
    it('should return false when player not in lineup', () => {
      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
    });

    it('should return true when player is in lineup', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(true);
      expect(strategy.isPlayerInLineup(player2.playerId)).toBe(false);
    });

    it('should return false after player is substituted out', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.PITCHER);

      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player2.playerId)).toBe(true);
    });
  });

  describe('getPlayerBattingSlot', () => {
    it('should return undefined when player not in lineup', () => {
      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBeUndefined();
    });

    it('should return correct batting slot when player is in lineup', () => {
      strategy.addPlayer(player1, 3, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 7, FieldPosition.CATCHER);

      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(3);
      expect(strategy.getPlayerBattingSlot(player2.playerId)).toBe(7);
    });

    it('should return undefined after player is substituted out', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.PITCHER);

      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBeUndefined();
      expect(strategy.getPlayerBattingSlot(player2.playerId)).toBe(1);
    });
  });

  describe('getPlayerFieldPosition', () => {
    it('should return undefined when player not in lineup', () => {
      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBeUndefined();
    });

    it('should return correct field position when player is in lineup', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.PITCHER);
      expect(strategy.getPlayerFieldPosition(player2.playerId)).toBe(FieldPosition.CATCHER);
    });

    it('should return updated position after position change', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.FIRST_BASE);
    });
  });

  describe('substitutePlayer', () => {
    beforeEach(() => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);
    });

    it('should successfully substitute player', () => {
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      const lineup = strategy.getCurrentLineup();
      const slot1 = lineup.find(slot => slot.slotNumber === 1);

      expect(slot1?.currentPlayer).toEqual(player3);
      expect(slot1?.currentPosition).toBe(FieldPosition.FIRST_BASE);
      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player3.playerId)).toBe(true);
    });

    it('should reject invalid batting slot with default rules', () => {
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow('Batting slot must be between 1 and 25');
    });

    it('should reject invalid batting slot with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow('Batting slot must be between 1 and 20');
    });

    it('should reject substitution for empty slot', () => {
      expect(() =>
        strategy.substitutePlayer(5, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(5, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow('No player found in batting slot 5');
    });

    it('should reject substitution with wrong outgoing player', () => {
      expect(() =>
        strategy.substitutePlayer(1, player2.playerId, player3, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(1, player2.playerId, player3, FieldPosition.PITCHER)
      ).toThrow('Player player-2 is not in batting slot 1');
    });

    it('should reject substitution if incoming player already in lineup', () => {
      expect(() =>
        strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.PITCHER)
      ).toThrow('Player is already in the lineup');
    });

    it('should update substitution history for both players', () => {
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      const outgoingHistory = strategy.getPlayerSubstitutionHistory(player1.playerId);
      expect(outgoingHistory).toBeDefined();
      expect(outgoingHistory?.timesSubstituted).toBe(1);
      expect(outgoingHistory?.canReenter).toBe(true); // Starter can re-enter

      const incomingHistory = strategy.getPlayerSubstitutionHistory(player3.playerId);
      expect(incomingHistory).toBeDefined();
      expect(incomingHistory?.isStarter).toBe(false);
      expect(incomingHistory?.timesSubstituted).toBe(0);
      expect(incomingHistory?.canReenter).toBe(false); // Non-starter cannot re-enter
    });

    it('should allow starter to re-enter after being substituted', () => {
      // Substitute starter out
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      // Substitute starter back in
      expect(() =>
        strategy.substitutePlayer(1, player3.playerId, player1, FieldPosition.PITCHER)
      ).not.toThrow();

      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(true);
      expect(strategy.isPlayerInLineup(player3.playerId)).toBe(false);
    });

    it('should reject non-starter re-entry', () => {
      // Substitute starter out with non-starter
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      // Try to substitute non-starter back in after being removed
      strategy.substitutePlayer(1, player3.playerId, player4, FieldPosition.SHORTSTOP);

      expect(() =>
        strategy.substitutePlayer(1, player4.playerId, player3, FieldPosition.FIRST_BASE)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(1, player4.playerId, player3, FieldPosition.FIRST_BASE)
      ).toThrow('Player cannot re-enter the game');
    });

    it('should reject starter re-entry after multiple substitutions', () => {
      // Substitute starter out and back in (first re-entry allowed)
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);
      strategy.substitutePlayer(1, player3.playerId, player1, FieldPosition.PITCHER);

      // Substitute starter out again
      strategy.substitutePlayer(1, player1.playerId, player4, FieldPosition.SHORTSTOP);

      // Try to re-enter again (should be rejected - only one re-entry allowed)
      expect(() =>
        strategy.substitutePlayer(1, player4.playerId, player1, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(1, player4.playerId, player1, FieldPosition.PITCHER)
      ).toThrow('Player cannot re-enter the game');
    });
  });

  describe('changePlayerPosition', () => {
    beforeEach(() => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);
    });

    it('should successfully change player position', () => {
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.FIRST_BASE);
      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(1); // Batting slot unchanged
    });

    it('should reject position change for player not in lineup', () => {
      expect(() =>
        strategy.changePlayerPosition(player3.playerId, FieldPosition.FIRST_BASE)
      ).toThrow(DomainError);
      expect(() =>
        strategy.changePlayerPosition(player3.playerId, FieldPosition.FIRST_BASE)
      ).toThrow('Player is not currently in the lineup');
    });

    it('should track position change history', () => {
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);
      strategy.changePlayerPosition(player1.playerId, FieldPosition.SHORTSTOP);

      const history = strategy.getPlayerSubstitutionHistory(player1.playerId);
      expect(history).toBeDefined();
      expect(history?.positionChanges).toHaveLength(2);
      expect(history?.positionChanges[0]?.from).toBe(FieldPosition.PITCHER);
      expect(history?.positionChanges[0]?.to).toBe(FieldPosition.FIRST_BASE);
      expect(history?.positionChanges[1]?.from).toBe(FieldPosition.FIRST_BASE);
      expect(history?.positionChanges[1]?.to).toBe(FieldPosition.SHORTSTOP);
    });
  });

  describe('isLineupValid', () => {
    it('should return false for empty lineup', () => {
      expect(strategy.isLineupValid()).toBe(false);
    });

    it('should return false for lineup with less than 9 players (below minimum)', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);

      expect(strategy.isLineupValid()).toBe(false);
    });

    it('should return true for lineup with exactly 9 players (boundary case)', () => {
      // Add 9 players with all required positions (minimum required configuration)
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
      ];

      for (let i = 0; i < 9; i += 1) {
        strategy.addPlayer(players[i]!, i + 1, positions[i]!);
      }

      TeamStrategyTestHelper.assertLineupValid(strategy);
    });

    it('should return true for lineup with 10 players (standard configuration including short fielder)', () => {
      // Add 10 players including short fielder (standard slow-pitch configuration)
      const positions = [
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
      ];

      for (let i = 0; i < 10; i += 1) {
        strategy.addPlayer(players[i]!, i + 1, positions[i]!);
      }

      TeamStrategyTestHelper.assertLineupValid(strategy);
    });

    it('should return false when required defensive positions are missing', () => {
      // Add 9 players but without a catcher (required position)
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.FIRST_BASE); // No catcher
      strategy.addPlayer(
        { playerId: new PlayerId('p3'), jerseyNumber: new JerseyNumber('3'), name: 'Player 3' },
        3,
        FieldPosition.FIRST_BASE
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p4'), jerseyNumber: new JerseyNumber('4'), name: 'Player 4' },
        4,
        FieldPosition.SECOND_BASE
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p5'), jerseyNumber: new JerseyNumber('5'), name: 'Player 5' },
        5,
        FieldPosition.THIRD_BASE
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p6'), jerseyNumber: new JerseyNumber('6'), name: 'Player 6' },
        6,
        FieldPosition.SHORTSTOP
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p7'), jerseyNumber: new JerseyNumber('7'), name: 'Player 7' },
        7,
        FieldPosition.LEFT_FIELD
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p8'), jerseyNumber: new JerseyNumber('8'), name: 'Player 8' },
        8,
        FieldPosition.CENTER_FIELD
      );
      strategy.addPlayer(
        { playerId: new PlayerId('p9'), jerseyNumber: new JerseyNumber('9'), name: 'Player 9' },
        9,
        FieldPosition.RIGHT_FIELD
      );

      expect(strategy.isLineupValid()).toBe(false);
    });
  });

  describe('getActivePlayerCount', () => {
    it('should return 0 for empty lineup', () => {
      expect(strategy.getActivePlayerCount()).toBe(0);
    });

    it('should return correct count after adding players', () => {
      expect(strategy.getActivePlayerCount()).toBe(0);

      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      expect(strategy.getActivePlayerCount()).toBe(1);

      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);
      expect(strategy.getActivePlayerCount()).toBe(2);

      strategy.addPlayer(player3, 5, FieldPosition.FIRST_BASE);
      expect(strategy.getActivePlayerCount()).toBe(3);
    });

    it('should maintain count after substitution', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);
      expect(strategy.getActivePlayerCount()).toBe(2);

      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);
      expect(strategy.getActivePlayerCount()).toBe(2);
    });
  });

  describe('getPlayerSubstitutionHistory', () => {
    it('should return undefined for player not tracked', () => {
      expect(strategy.getPlayerSubstitutionHistory(player1.playerId)).toBeUndefined();
    });

    it('should track starter history correctly', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      const history = strategy.getPlayerSubstitutionHistory(player1.playerId);
      expect(history).toBeDefined();
      expect(history?.isStarter).toBe(true);
      expect(history?.timesSubstituted).toBe(0);
      expect(history?.canReenter).toBe(true);
      expect(history?.positionChanges).toEqual([]);
    });

    it('should track substitution history correctly', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.CATCHER);

      const starterHistory = strategy.getPlayerSubstitutionHistory(player1.playerId);
      expect(starterHistory).toBeDefined();
      expect(starterHistory?.timesSubstituted).toBe(1);
      expect(starterHistory?.canReenter).toBe(true);

      const substituteHistory = strategy.getPlayerSubstitutionHistory(player2.playerId);
      expect(substituteHistory).toBeDefined();
      expect(substituteHistory?.isStarter).toBe(false);
      expect(substituteHistory?.timesSubstituted).toBe(0);
      expect(substituteHistory?.canReenter).toBe(false);
    });
  });

  describe('getAllPlayers', () => {
    it('should return empty array when no players tracked', () => {
      expect(strategy.getAllPlayers()).toEqual([]);
    });

    it('should return all players that have been added to the team', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);

      const allPlayers = strategy.getAllPlayers();
      expect(allPlayers).toHaveLength(2);
      expect(allPlayers).toContainEqual(player1);
      expect(allPlayers).toContainEqual(player2);
    });

    it('should include substituted players in all players list', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);
      strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.CATCHER);

      const allPlayers = strategy.getAllPlayers();
      expect(allPlayers).toHaveLength(2);
      expect(allPlayers).toContainEqual(player1);
      expect(allPlayers).toContainEqual(player2);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple substitutions and position changes correctly', () => {
      // Use helper to create substitution scenario
      const scenario = TeamStrategyTestHelper.createSubstitutionScenario();

      // Set up initial lineup
      strategy.addPlayer(scenario.originalPlayer, 1, FieldPosition.PITCHER);
      strategy.addPlayer(player2, 2, FieldPosition.CATCHER);

      // Change position
      strategy.changePlayerPosition(scenario.originalPlayer.playerId, FieldPosition.FIRST_BASE);

      // Substitute
      strategy.substitutePlayer(
        1,
        scenario.originalPlayer.playerId,
        scenario.substitutePlayer,
        FieldPosition.SHORTSTOP
      );

      // Verify final state
      expect(strategy.isPlayerInLineup(scenario.originalPlayer.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(scenario.substitutePlayer.playerId)).toBe(true);
      expect(strategy.getPlayerFieldPosition(scenario.substitutePlayer.playerId)).toBe(
        FieldPosition.SHORTSTOP
      );

      // Verify histories
      const player1History = strategy.getPlayerSubstitutionHistory(
        scenario.originalPlayer.playerId
      );
      expect(player1History).toBeDefined();
      expect(player1History?.positionChanges).toHaveLength(1);
      expect(player1History?.timesSubstituted).toBe(1);

      const player3History = strategy.getPlayerSubstitutionHistory(
        scenario.substitutePlayer.playerId
      );
      expect(player3History).toBeDefined();
      expect(player3History?.isStarter).toBe(false);
    });

    it('should maintain data integrity across complex operations', () => {
      // Add full roster using TestPlayerFactory (12-player common configuration)
      const rosterPlayers = TestPlayerFactory.createPlayers(12);

      // Add first 9 players with standard positions (minimum required)
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
      ];

      for (let i = 0; i < 9; i += 1) {
        strategy.addPlayer(rosterPlayers[i]!, i + 1, positions[i]!);
      }

      TeamStrategyTestHelper.assertLineupValid(strategy);
      expect(strategy.getActivePlayerCount()).toBe(9); // Minimum configuration

      // Perform multiple operations with helper data
      const player0 = rosterPlayers[0]!;
      const player9 = rosterPlayers[9]!;
      const playerAtIndex2 = rosterPlayers[2]!;
      const player10 = rosterPlayers[10]!;

      strategy.substitutePlayer(1, player0.playerId, player9, FieldPosition.PITCHER);
      strategy.changePlayerPosition(player9.playerId, FieldPosition.FIRST_BASE);
      strategy.substitutePlayer(3, playerAtIndex2.playerId, player10, FieldPosition.THIRD_BASE);

      // Verify integrity
      expect(strategy.getActivePlayerCount()).toBe(9);
      expect(strategy.isLineupValid()).toBe(false); // Missing first base coverage
      expect(strategy.getAllPlayers()).toHaveLength(11); // All players tracked (9 minimum starters + 2 substitutes)
    });
  });

  describe('Edge cases and error conditions', () => {
    it('should handle maximum batting slots correctly with custom rules (20-player boundary case)', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });

      for (let i = 1; i <= 20; i += 1) {
        const player = {
          playerId: new PlayerId(`player-${i}`),
          jerseyNumber: new JerseyNumber(i.toString()),
          name: `Player ${i}`,
        };
        strategy.addPlayer(player, i, FieldPosition.EXTRA_PLAYER, rules);
      }

      expect(strategy.getActivePlayerCount()).toBe(20);

      // Should reject adding to slot 21 with rules limiting to 20
      const extraPlayer = {
        playerId: new PlayerId('extra'),
        jerseyNumber: new JerseyNumber('99'),
        name: 'Extra Player',
      };

      expect(() => strategy.addPlayer(extraPlayer, 21, FieldPosition.EXTRA_PLAYER, rules)).toThrow(
        DomainError
      );
    });

    it('should handle maximum batting slots correctly with default rules (25-player maximum boundary case)', () => {
      // Default rules allow up to 25 players (maximum possible)
      for (let i = 1; i <= 25; i += 1) {
        const player = {
          playerId: new PlayerId(`player-${i}`),
          jerseyNumber: new JerseyNumber(i.toString()),
          name: `Player ${i}`,
        };
        strategy.addPlayer(player, i, FieldPosition.EXTRA_PLAYER);
      }

      expect(strategy.getActivePlayerCount()).toBe(25);

      // Should reject adding to slot 26
      const extraPlayer = {
        playerId: new PlayerId('extra'),
        jerseyNumber: new JerseyNumber('99'),
        name: 'Extra Player',
      };

      expect(() => strategy.addPlayer(extraPlayer, 26, FieldPosition.EXTRA_PLAYER)).toThrow(
        DomainError
      );
    });

    it('should handle rapid substitutions correctly', () => {
      strategy.addPlayer(player1, 1, FieldPosition.PITCHER);

      // Rapid substitutions
      strategy.substitutePlayer(1, player1.playerId, player2, FieldPosition.CATCHER);
      strategy.substitutePlayer(1, player2.playerId, player3, FieldPosition.FIRST_BASE);
      strategy.substitutePlayer(1, player3.playerId, player4, FieldPosition.SHORTSTOP);

      // Only player4 should be active
      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player2.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player3.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player4.playerId)).toBe(true);

      // All should be tracked in history
      expect(strategy.getAllPlayers()).toHaveLength(4);
    });
  });
});
