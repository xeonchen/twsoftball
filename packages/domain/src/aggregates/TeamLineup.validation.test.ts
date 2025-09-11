import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { SoftballRules } from '../rules/SoftballRules';
import { GameId } from '../value-objects/GameId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

import { TeamLineup } from './TeamLineup';

describe('TeamLineup - Validation and Complex Scenarios', () => {
  let lineupId: TeamLineupId;
  let gameId: GameId;
  let player1: PlayerId;
  let player2: PlayerId;
  let player3: PlayerId;
  let jersey1: JerseyNumber;
  let jersey2: JerseyNumber;
  let jersey3: JerseyNumber;
  let rules: SoftballRules;

  beforeEach(() => {
    lineupId = TeamLineupId.generate();
    gameId = GameId.generate();
    player1 = PlayerId.generate();
    player2 = PlayerId.generate();
    player3 = PlayerId.generate();
    jersey1 = new JerseyNumber('1');
    jersey2 = new JerseyNumber('2');
    jersey3 = new JerseyNumber('3');
    rules = new SoftballRules();
  });

  describe('isLineupValid', () => {
    it('returns false for empty lineup', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      expect(lineup.isLineupValid()).toBe(false);
    });

    it('returns false when missing required positions', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);
      // Missing other required positions

      expect(lineup.isLineupValid()).toBe(false);
    });

    it('returns true with all required positions filled', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');

      // Add all 9 required positions
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('1'),
        'Pitcher',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('2'),
        'Catcher',
        2,
        FieldPosition.CATCHER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('3'),
        'First Base',
        3,
        FieldPosition.FIRST_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('4'),
        'Second Base',
        4,
        FieldPosition.SECOND_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('5'),
        'Third Base',
        5,
        FieldPosition.THIRD_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('6'),
        'Shortstop',
        6,
        FieldPosition.SHORTSTOP,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('7'),
        'Left Field',
        7,
        FieldPosition.LEFT_FIELD,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('8'),
        'Center Field',
        8,
        FieldPosition.CENTER_FIELD,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('9'),
        'Right Field',
        9,
        FieldPosition.RIGHT_FIELD,
        rules
      );

      expect(lineup.isLineupValid()).toBe(true);
    });

    it('returns true with extra players beyond required positions', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');

      // Add all 9 required positions plus extra player
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('1'),
        'Pitcher',
        1,
        FieldPosition.PITCHER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('2'),
        'Catcher',
        2,
        FieldPosition.CATCHER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('3'),
        'First Base',
        3,
        FieldPosition.FIRST_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('4'),
        'Second Base',
        4,
        FieldPosition.SECOND_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('5'),
        'Third Base',
        5,
        FieldPosition.THIRD_BASE,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('6'),
        'Shortstop',
        6,
        FieldPosition.SHORTSTOP,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('7'),
        'Left Field',
        7,
        FieldPosition.LEFT_FIELD,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('8'),
        'Center Field',
        8,
        FieldPosition.CENTER_FIELD,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('9'),
        'Right Field',
        9,
        FieldPosition.RIGHT_FIELD,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('10'),
        'Short Fielder',
        10,
        FieldPosition.SHORT_FIELDER,
        rules
      );
      lineup = lineup.addPlayer(
        PlayerId.generate(),
        new JerseyNumber('11'),
        'Extra Player',
        11,
        FieldPosition.EXTRA_PLAYER,
        rules
      );

      expect(lineup.isLineupValid()).toBe(true);
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('handles 20-player lineup correctly', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');

      // Add 20 players
      for (let i = 1; i <= 20; i += 1) {
        const pid = PlayerId.generate();
        const jersey = new JerseyNumber(i.toString());
        let position: FieldPosition;
        if (i <= 9) {
          position = [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
          ][i - 1]!;
        } else if (i === 10) {
          position = FieldPosition.SHORT_FIELDER;
        } else {
          position = FieldPosition.EXTRA_PLAYER;
        }

        lineup = lineup.addPlayer(pid, jersey, `Player ${i}`, i, position, rules);
      }

      expect(lineup.getActiveLineup()).toHaveLength(20);
      expect(lineup.isLineupValid()).toBe(true);
    });

    it('prevents double re-entry for starters', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

      // First substitution
      lineup = lineup.substitutePlayer(
        1,
        player1,
        player2,
        jersey2,
        'Jane Smith',
        FieldPosition.CATCHER,
        3,
        rules
      );

      // Re-entry
      lineup = lineup.substitutePlayer(
        1,
        player2,
        player1,
        jersey1,
        'John Doe',
        FieldPosition.PITCHER,
        5,
        rules,
        true
      );

      // Another substitution
      lineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        7,
        rules
      );

      // Attempt second re-entry (should fail)
      expect(() =>
        lineup.substitutePlayer(
          1,
          player3,
          player1,
          jersey1,
          'John Doe',
          FieldPosition.PITCHER,
          9,
          rules,
          true
        )
      ).toThrow(DomainError);
    });

    it('maintains jersey number uniqueness across substitutions', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      // Substitute using jersey3
      lineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      // Try to add another player with jersey3 (should fail)
      const newPlayer = PlayerId.generate();
      expect(() =>
        lineup.addPlayer(newPlayer, jersey3, 'New Player', 4, FieldPosition.SECOND_BASE, rules)
      ).toThrow(DomainError);
    });

    it('handles complex position swaps during substitutions', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'Pitcher', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Catcher', 2, FieldPosition.CATCHER, rules);

      // Change positions before substitution
      lineup = lineup.changePosition(player1, FieldPosition.FIRST_BASE, 3);
      lineup = lineup.changePosition(player2, FieldPosition.SHORTSTOP, 3);

      // Now substitute
      lineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'New Player',
        FieldPosition.PITCHER,
        4,
        rules
      );

      const positions = lineup.getFieldingPositions();
      expect(positions.get(FieldPosition.PITCHER)).toEqual(player3);
      expect(positions.get(FieldPosition.SHORTSTOP)).toEqual(player2);
      expect(positions.get(FieldPosition.FIRST_BASE)).toBeUndefined();
    });
  });
});
