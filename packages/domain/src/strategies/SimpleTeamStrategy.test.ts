import { describe, it, expect, beforeEach } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { TestPlayerFactory, TeamStrategyTestHelper } from '../test-utils/index.js';

import { SimpleTeamStrategy } from './SimpleTeamStrategy.js';
import type { TeamPlayer, BattingSlotState } from './TeamStrategy.js';

describe('SimpleTeamStrategy', () => {
  let strategy: SimpleTeamStrategy;
  let players: TeamPlayer[];
  let player1: TeamPlayer;
  let player2: TeamPlayer;
  let player3: TeamPlayer;
  let player4: TeamPlayer;
  let player5: TeamPlayer;
  let player6: TeamPlayer;
  let player7: TeamPlayer;
  let player8: TeamPlayer;
  let player9: TeamPlayer;

  beforeEach(() => {
    strategy = new SimpleTeamStrategy();

    // Create 10 players using test utilities (standard configuration) - eliminates duplication
    players = TestPlayerFactory.createPlayers(10);
    [player1, player2, player3, player4, player5, player6, player7, player8, player9] = [
      players[0]!,
      players[1]!,
      players[2]!,
      players[3]!,
      players[4]!,
      players[5]!,
      players[6]!,
      players[7]!,
      players[8]!,
    ];
  });

  describe('Construction', () => {
    it('should initialize with empty lineup', () => {
      const lineup = strategy.getCurrentLineup();

      expect(lineup).toEqual([]);
      expect(strategy.getActivePlayerCount()).toBe(0);
      expect(strategy.isLineupValid()).toBe(false);
    });
  });

  describe('setCurrentLineup', () => {
    it('should set the entire lineup with valid batting slots', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toHaveLength(2);
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[0]?.currentPlayer).toEqual(player1);
      expect(lineup[0]?.currentPosition).toBe(FieldPosition.PITCHER);
      expect(lineup[1]?.slotNumber).toBe(2);
      expect(lineup[1]?.currentPlayer).toEqual(player2);
      expect(lineup[1]?.currentPosition).toBe(FieldPosition.CATCHER);
      expect(strategy.getActivePlayerCount()).toBe(2);
    });

    it('should handle empty lineup data', () => {
      strategy.setCurrentLineup([]);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toEqual([]);
      expect(strategy.getActivePlayerCount()).toBe(0);
    });

    it('should reject invalid batting slot numbers with default rules', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 0,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(
        'Batting slot must be between 1 and 25'
      );
    });

    it('should reject invalid batting slot numbers with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 0,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData, rules)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData, rules)).toThrow(
        'Batting slot must be between 1 and 20'
      );
    });

    it('should reject batting slot numbers above maximum with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 21,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData, rules)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData, rules)).toThrow(
        'Batting slot must be between 1 and 20'
      );
    });

    it('should reject batting slot numbers above maximum with default rules', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 26,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(
        'Batting slot must be between 1 and 25'
      );
    });

    it('should reject duplicate batting slots', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 1,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(
        'Duplicate batting slot 1 found in lineup'
      );
    });

    it('should reject duplicate players', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player1,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(DomainError);
      expect(() => strategy.setCurrentLineup(lineupData)).toThrow(
        'Player player-1 appears in multiple batting slots'
      );
    });

    it('should allow non-sequential batting slot assignments', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 5,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 10,
          currentPlayer: player3,
          currentPosition: FieldPosition.FIRST_BASE,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      const lineup = strategy.getCurrentLineup();
      expect(lineup).toHaveLength(3);

      // Should be sorted by slot number
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[1]?.slotNumber).toBe(5);
      expect(lineup[2]?.slotNumber).toBe(10);
      expect(strategy.getActivePlayerCount()).toBe(3);
    });

    it('should replace existing lineup when called multiple times', () => {
      const initialLineup: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(initialLineup);
      expect(strategy.getActivePlayerCount()).toBe(1);

      const newLineup: BattingSlotState[] = [
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
        {
          slotNumber: 3,
          currentPlayer: player3,
          currentPosition: FieldPosition.FIRST_BASE,
        },
      ];

      strategy.setCurrentLineup(newLineup);
      expect(strategy.getActivePlayerCount()).toBe(2);
      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
      expect(strategy.isPlayerInLineup(player2.playerId)).toBe(true);
      expect(strategy.isPlayerInLineup(player3.playerId)).toBe(true);
    });

    it('should handle maximum lineup size (20 players - boundary case)', () => {
      // Use helper to set up full 20-player lineup (maximum allowed)
      const lineupPlayers = TeamStrategyTestHelper.setupFullLineup(strategy);

      expect(lineupPlayers).toHaveLength(20);
      expect(strategy.getActivePlayerCount()).toBe(20);
    });
  });

  describe('getCurrentLineup', () => {
    it('should return empty array when no players set', () => {
      const lineup = strategy.getCurrentLineup();

      expect(lineup).toEqual([]);
    });

    it('should return lineup sorted by batting slot number', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 10,
          currentPlayer: player3,
          currentPosition: FieldPosition.FIRST_BASE,
        },
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 5,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      const lineup = strategy.getCurrentLineup();
      expect(lineup[0]?.slotNumber).toBe(1);
      expect(lineup[1]?.slotNumber).toBe(5);
      expect(lineup[2]?.slotNumber).toBe(10);
    });

    it('should return immutable lineup data', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

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
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(true);
      expect(strategy.isPlayerInLineup(player2.playerId)).toBe(false);
    });

    it('should return false after player is substituted out', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);
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
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 3,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 7,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(3);
      expect(strategy.getPlayerBattingSlot(player2.playerId)).toBe(7);
    });

    it('should return undefined after player is substituted out', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);
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
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.PITCHER);
      expect(strategy.getPlayerFieldPosition(player2.playerId)).toBe(FieldPosition.CATCHER);
    });

    it('should return updated position after position change', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.FIRST_BASE);
    });
  });

  describe('substitutePlayer', () => {
    beforeEach(() => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];
      strategy.setCurrentLineup(lineupData);
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

    it('should reject invalid batting slot numbers with default rules', () => {
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow('Batting slot must be between 1 and 25');
    });

    it('should reject invalid batting slot numbers with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(0, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow('Batting slot must be between 1 and 20');
    });

    it('should reject batting slot numbers above maximum with custom rules', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      expect(() =>
        strategy.substitutePlayer(21, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(21, player1.playerId, player3, FieldPosition.PITCHER, rules)
      ).toThrow('Batting slot must be between 1 and 20');
    });

    it('should reject batting slot numbers above maximum with default rules', () => {
      expect(() =>
        strategy.substitutePlayer(26, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow(DomainError);
      expect(() =>
        strategy.substitutePlayer(26, player1.playerId, player3, FieldPosition.PITCHER)
      ).toThrow('Batting slot must be between 1 and 25');
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

    it('should allow any player to substitute any other player (no re-entry restrictions)', () => {
      // Substitute player1 out with player3
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      // SimpleTeamStrategy allows player1 to re-enter (no history tracking)
      expect(() =>
        strategy.substitutePlayer(1, player3.playerId, player1, FieldPosition.PITCHER)
      ).not.toThrow();

      expect(strategy.isPlayerInLineup(player1.playerId)).toBe(true);
      expect(strategy.isPlayerInLineup(player3.playerId)).toBe(false);
    });

    it('should allow non-starter to re-enter (simplified rules)', () => {
      // Substitute starter out with non-starter
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      // Substitute another starter out with same non-starter again (after they come back)
      expect(() =>
        strategy.substitutePlayer(1, player3.playerId, player4, FieldPosition.PITCHER)
      ).not.toThrow();

      // Now substitute player3 back in again - should work in SimpleTeamStrategy
      expect(() =>
        strategy.substitutePlayer(1, player4.playerId, player3, FieldPosition.FIRST_BASE)
      ).not.toThrow();
    });

    it('should preserve batting order through substitutions', () => {
      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

      const lineup = strategy.getCurrentLineup();
      expect(lineup.find(slot => slot.slotNumber === 1)?.currentPlayer).toEqual(player3);
      expect(lineup.find(slot => slot.slotNumber === 2)?.currentPlayer).toEqual(player2);
    });
  });

  describe('changePlayerPosition', () => {
    beforeEach(() => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];
      strategy.setCurrentLineup(lineupData);
    });

    it('should successfully change player position', () => {
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

      const lineup = strategy.getCurrentLineup();
      const slot1 = lineup.find(slot => slot.slotNumber === 1);

      expect(slot1?.currentPlayer).toEqual(player1);
      expect(slot1?.currentPosition).toBe(FieldPosition.FIRST_BASE);
    });

    it('should reject position change for player not in lineup', () => {
      expect(() =>
        strategy.changePlayerPosition(player3.playerId, FieldPosition.FIRST_BASE)
      ).toThrow(DomainError);
      expect(() =>
        strategy.changePlayerPosition(player3.playerId, FieldPosition.FIRST_BASE)
      ).toThrow('Player is not currently in the lineup');
    });

    it('should allow changing position to same position', () => {
      expect(() =>
        strategy.changePlayerPosition(player1.playerId, FieldPosition.PITCHER)
      ).not.toThrow();

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.PITCHER);
    });

    it('should change position without affecting batting order', () => {
      const originalBattingSlot = strategy.getPlayerBattingSlot(player1.playerId);

      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

      expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(originalBattingSlot);
      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.FIRST_BASE);
    });

    it('should allow multiple position changes', () => {
      strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);
      strategy.changePlayerPosition(player1.playerId, FieldPosition.LEFT_FIELD);
      strategy.changePlayerPosition(player1.playerId, FieldPosition.SHORTSTOP);

      expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.SHORTSTOP);
    });
  });

  describe('isLineupValid', () => {
    it('should return false for empty lineup', () => {
      expect(strategy.isLineupValid()).toBe(false);
    });

    it('should return false for lineup with less than 9 players (below minimum)', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);
      expect(strategy.isLineupValid()).toBe(false);
    });

    it('should return true for valid 9-player lineup with required positions (boundary case)', () => {
      // Use helper to set up valid 9-player lineup (minimum required)
      TeamStrategyTestHelper.setupBasicLineup(strategy, 9);
      TeamStrategyTestHelper.assertLineupValid(strategy);
    });

    it('should return false for lineup missing required positions', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
        {
          slotNumber: 3,
          currentPlayer: player3,
          currentPosition: FieldPosition.FIRST_BASE,
        },
        {
          slotNumber: 4,
          currentPlayer: player4,
          currentPosition: FieldPosition.SECOND_BASE,
        },
        {
          slotNumber: 5,
          currentPlayer: player5,
          currentPosition: FieldPosition.THIRD_BASE,
        },
        {
          slotNumber: 6,
          currentPlayer: player6,
          currentPosition: FieldPosition.SHORTSTOP,
        },
        {
          slotNumber: 7,
          currentPlayer: player7,
          currentPosition: FieldPosition.LEFT_FIELD,
        },
        {
          slotNumber: 8,
          currentPlayer: player8,
          currentPosition: FieldPosition.CENTER_FIELD,
        },
        {
          slotNumber: 9,
          currentPlayer: player9,
          currentPosition: FieldPosition.EXTRA_PLAYER, // Missing RIGHT_FIELD
        },
      ];

      strategy.setCurrentLineup(lineupData);
      expect(strategy.isLineupValid()).toBe(false);
    });

    it('should return true for lineup with more than 9 players including extra positions (10-player standard)', () => {
      // Use helper to set up 10-player lineup (standard configuration)
      TeamStrategyTestHelper.setupBasicLineup(strategy, 10);
      TeamStrategyTestHelper.assertLineupValid(strategy);
    });
  });

  describe('getActivePlayerCount', () => {
    it('should return 0 for empty lineup', () => {
      expect(strategy.getActivePlayerCount()).toBe(0);
    });

    it('should return correct count for non-empty lineup', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 5,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
        {
          slotNumber: 10,
          currentPlayer: player3,
          currentPosition: FieldPosition.FIRST_BASE,
        },
      ];

      strategy.setCurrentLineup(lineupData);
      expect(strategy.getActivePlayerCount()).toBe(3);
    });

    it('should update count after substitutions', () => {
      const lineupData: BattingSlotState[] = [
        {
          slotNumber: 1,
          currentPlayer: player1,
          currentPosition: FieldPosition.PITCHER,
        },
        {
          slotNumber: 2,
          currentPlayer: player2,
          currentPosition: FieldPosition.CATCHER,
        },
      ];

      strategy.setCurrentLineup(lineupData);
      expect(strategy.getActivePlayerCount()).toBe(2);

      strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);
      expect(strategy.getActivePlayerCount()).toBe(2); // Same count, different player
    });
  });
});
