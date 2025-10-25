import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { FieldPositionChanged } from '../events/FieldPositionChanged.js';
import { PlayerSubstitutedIntoGame } from '../events/PlayerSubstitutedIntoGame.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { TeamLineup } from './TeamLineup.js';

describe('TeamLineup - Substitutions and Position Changes', () => {
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

  describe('substitutePlayer', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);
    });

    it('substitutes a player in batting slot successfully', () => {
      const updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      const activeLineup = updatedLineup.getActiveLineup();
      expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player3);

      const fieldingPositions = updatedLineup.getFieldingPositions();
      expect(fieldingPositions.get(FieldPosition.FIRST_BASE)).toEqual(player3);
      expect(fieldingPositions.get(FieldPosition.PITCHER)).toBeUndefined();

      const events = updatedLineup.getUncommittedEvents();
      const substitutionEvent = events.find(
        e => e.type === 'PlayerSubstitutedIntoGame'
      ) as PlayerSubstitutedIntoGame;
      expect(substitutionEvent).toBeDefined();
      expect(substitutionEvent.outgoingPlayerId).toEqual(player1);
      expect(substitutionEvent.incomingPlayerId).toEqual(player3);
      expect(substitutionEvent.battingSlot).toBe(1);
      expect(substitutionEvent.fieldPosition).toBe(FieldPosition.FIRST_BASE);
      expect(substitutionEvent.inning).toBe(3);
    });

    it('marks original starter as eligible for re-entry', () => {
      const updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      expect(updatedLineup.isPlayerEligibleForReentry(player1)).toBe(true);
      expect(updatedLineup.isPlayerEligibleForReentry(player3)).toBe(false);
    });

    it('allows starter re-entry into their original slot', () => {
      // First substitution - starter out
      const updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      // Starter re-enters
      const reentryLineup = updatedLineup.substitutePlayer(
        1,
        player3,
        player1,
        jersey1,
        'John Doe',
        FieldPosition.PITCHER,
        5,
        rules,
        true
      );

      expect(reentryLineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player1);
      expect(reentryLineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used up re-entry
    });

    it('throws error when attempting to re-enter starter who already used re-entry', () => {
      // Create a complex substitution scenario
      let updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );
      updatedLineup = updatedLineup.substitutePlayer(
        1,
        player3,
        player1,
        jersey1,
        'John Doe',
        FieldPosition.PITCHER,
        5,
        rules,
        true
      );

      // Use a NEW substitute player for the final substitution (since player3 can't re-enter)
      const newSubstitutePlayer = PlayerId.generate();
      const newSubstituteJersey = new JerseyNumber('50');
      const finalLineup = updatedLineup.substitutePlayer(
        1,
        player1,
        newSubstitutePlayer,
        newSubstituteJersey,
        'New Substitute',
        FieldPosition.FIRST_BASE,
        7,
        rules
      );

      expect(() =>
        finalLineup.substitutePlayer(
          1,
          newSubstitutePlayer,
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

    it('throws error when outgoing player is not in specified slot', () => {
      expect(() =>
        lineup.substitutePlayer(
          1,
          player2,
          player3,
          jersey3,
          'Bob Johnson',
          FieldPosition.FIRST_BASE,
          3,
          rules
        )
      ).toThrow(DomainError);
    });

    it('throws error when incoming player jersey is already taken', () => {
      expect(() =>
        lineup.substitutePlayer(
          1,
          player1,
          player3,
          jersey2,
          'Bob Johnson',
          FieldPosition.FIRST_BASE,
          3,
          rules
        )
      ).toThrow(DomainError);
    });

    it('throws error when batting slot is not occupied', () => {
      // Create a lineup with only 2 players (slots 1 and 2)
      const sparseLineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      const withTwoPlayers = sparseLineup
        .addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules)
        .addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      // Try to substitute from slot 3, which is empty
      expect(() =>
        withTwoPlayers.substitutePlayer(
          3, // empty slot
          player1, // this player is not in slot 3
          player3,
          jersey3,
          'Bob Johnson',
          FieldPosition.FIRST_BASE,
          3,
          rules
        )
      ).toThrow('Batting slot 3 is not occupied');
    });

    it('throws error when incoming player is already in lineup', () => {
      expect(() =>
        lineup.substitutePlayer(
          1,
          player1,
          player2,
          jersey3,
          'Jane Smith',
          FieldPosition.FIRST_BASE,
          3,
          rules
        )
      ).toThrow(DomainError);
    });

    it('throws error when field position is already occupied', () => {
      expect(() =>
        lineup.substitutePlayer(
          1,
          player1,
          player3,
          jersey3,
          'Bob Johnson',
          FieldPosition.CATCHER,
          3,
          rules
        )
      ).toThrow(DomainError);
    });

    it('throws error when inning is invalid', () => {
      expect(() =>
        lineup.substitutePlayer(
          1,
          player1,
          player3,
          jersey3,
          'Bob Johnson',
          FieldPosition.FIRST_BASE,
          0,
          rules
        )
      ).toThrow(DomainError);
    });

    it('throws error when re-entry attempted for player not in team history', () => {
      const unknownPlayer = PlayerId.generate();
      const unknownJersey = new JerseyNumber('99');

      // Try to bring in a completely new player marked as "re-entry"
      // This player was never part of the team
      expect(() =>
        lineup.substitutePlayer(
          1,
          player1,
          unknownPlayer,
          unknownJersey,
          'Unknown Player',
          FieldPosition.SHORTSTOP, // use a different position
          3,
          rules,
          true // marked as re-entry but player never existed in team
        )
      ).toThrow('Cannot mark substitution as re-entry for player not in team history');
    });

    it('throws error when substitution is marked as re-entry but player was not starter', () => {
      const nonStarter = PlayerId.generate();
      const nonStarterJersey = new JerseyNumber('99');

      // Add non-starter as substitute first
      let updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        nonStarter,
        nonStarterJersey,
        'Non Starter',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      // Remove non-starter
      updatedLineup = updatedLineup.substitutePlayer(
        1,
        nonStarter,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.SECOND_BASE,
        5,
        rules
      );

      // Try to bring back non-starter as re-entry (should fail)
      expect(() =>
        updatedLineup.substitutePlayer(
          1,
          player3,
          nonStarter,
          nonStarterJersey,
          'Non Starter',
          FieldPosition.FIRST_BASE,
          7,
          rules,
          true
        )
      ).toThrow('Only original starters are eligible for re-entry');
    });

    it('throws error when non-starter tries to re-enter without re-entry flag', () => {
      const nonStarter = PlayerId.generate();
      const nonStarterJersey = new JerseyNumber('99');

      // Add non-starter as substitute first
      let updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        nonStarter,
        nonStarterJersey,
        'Non Starter',
        FieldPosition.FIRST_BASE,
        3,
        rules
      );

      // Remove non-starter
      updatedLineup = updatedLineup.substitutePlayer(
        1,
        nonStarter,
        player3,
        jersey3,
        'Bob Johnson',
        FieldPosition.SECOND_BASE,
        5,
        rules
      );

      // Try to bring back non-starter without re-entry flag (should fail)
      expect(() =>
        updatedLineup.substitutePlayer(
          1,
          player3,
          nonStarter,
          nonStarterJersey,
          'Non Starter',
          FieldPosition.FIRST_BASE,
          7,
          rules,
          false // explicitly not a re-entry
        )
      ).toThrow('Non-starter players cannot re-enter the game');
    });

    it('throws error when player has already used re-entry privilege', () => {
      const player4 = PlayerId.generate();
      const jersey4 = new JerseyNumber('44');

      // Substitute out player1
      let updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player4,
        jersey4,
        'New Player',
        FieldPosition.SHORTSTOP, // Use different position
        3,
        rules
      );

      // Re-enter player1 once (allowed)
      updatedLineup = updatedLineup.substitutePlayer(
        1,
        player4,
        player1,
        jersey1,
        'John Doe',
        FieldPosition.PITCHER,
        5,
        rules,
        true // first re-entry
      );

      // Substitute out player1 again with a different new player
      const player5 = PlayerId.generate();
      const jersey5 = new JerseyNumber('55');

      updatedLineup = updatedLineup.substitutePlayer(
        1,
        player1,
        player5,
        jersey5,
        'Another Player',
        FieldPosition.SECOND_BASE, // Use different position
        7,
        rules
      );

      // Try to re-enter player1 again (should fail - already used re-entry)
      expect(() =>
        updatedLineup.substitutePlayer(
          1,
          player5,
          player1,
          jersey1,
          'John Doe',
          FieldPosition.PITCHER,
          9,
          rules,
          true // second re-entry attempt
        )
      ).toThrow('Player has already used their re-entry privilege');
    });
  });

  describe('changePosition', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);
      lineup = lineup.addPlayer(
        player3,
        jersey3,
        'Bob Johnson',
        3,
        FieldPosition.FIRST_BASE,
        rules
      );
    });

    it('changes player position successfully', () => {
      const updatedLineup = lineup.changePosition(player1, FieldPosition.SHORTSTOP, 4);

      const fieldingPositions = updatedLineup.getFieldingPositions();
      expect(fieldingPositions.get(FieldPosition.SHORTSTOP)).toEqual(player1);
      expect(fieldingPositions.get(FieldPosition.PITCHER)).toBeUndefined();

      const events = updatedLineup.getUncommittedEvents();
      const positionEvent = events.find(
        e => e.type === 'FieldPositionChanged'
      ) as FieldPositionChanged;
      expect(positionEvent).toBeDefined();
      expect(positionEvent.playerId).toEqual(player1);
      expect(positionEvent.fromPosition).toBe(FieldPosition.PITCHER);
      expect(positionEvent.toPosition).toBe(FieldPosition.SHORTSTOP);
      expect(positionEvent.inning).toBe(4);
    });

    it('allows player to move to EXTRA_PLAYER position', () => {
      const updatedLineup = lineup.changePosition(player1, FieldPosition.EXTRA_PLAYER, 4);

      const fieldingPositions = updatedLineup.getFieldingPositions();
      expect(fieldingPositions.get(FieldPosition.PITCHER)).toBeUndefined();

      // EXTRA_PLAYER should not appear in fielding positions (they don't play defense)
      expect(fieldingPositions.has(FieldPosition.EXTRA_PLAYER)).toBe(false);
    });

    it('throws error when player is not in lineup', () => {
      const unknownPlayer = PlayerId.generate();
      expect(() => lineup.changePosition(unknownPlayer, FieldPosition.SHORTSTOP, 4)).toThrow(
        DomainError
      );
    });

    it('throws error when target position is already occupied', () => {
      expect(() => lineup.changePosition(player1, FieldPosition.CATCHER, 4)).toThrow(DomainError);
    });

    it('throws error when trying to change to same position', () => {
      expect(() => lineup.changePosition(player1, FieldPosition.PITCHER, 4)).toThrow(DomainError);
    });

    it('throws error when inning is invalid', () => {
      expect(() => lineup.changePosition(player1, FieldPosition.SHORTSTOP, 0)).toThrow(DomainError);
    });
  });

  describe('isPlayerEligibleForReentry', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
    });

    it('returns false for starter who has not been substituted', () => {
      expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false);
    });

    it('returns true for starter who has been substituted out', () => {
      const updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player2,
        jersey2,
        'Jane Smith',
        FieldPosition.CATCHER,
        3,
        rules
      );
      expect(updatedLineup.isPlayerEligibleForReentry(player1)).toBe(true);
    });

    it('returns false for starter who already used re-entry', () => {
      let updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player2,
        jersey2,
        'Jane Smith',
        FieldPosition.CATCHER,
        3,
        rules
      );
      updatedLineup = updatedLineup.substitutePlayer(
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

      expect(updatedLineup.isPlayerEligibleForReentry(player1)).toBe(false);
    });

    it('returns false for player not in team', () => {
      const unknownPlayer = PlayerId.generate();
      expect(lineup.isPlayerEligibleForReentry(unknownPlayer)).toBe(false);
    });

    it('returns false for non-starter substitute', () => {
      const updatedLineup = lineup.substitutePlayer(
        1,
        player1,
        player2,
        jersey2,
        'Jane Smith',
        FieldPosition.CATCHER,
        3,
        rules
      );
      expect(updatedLineup.isPlayerEligibleForReentry(player2)).toBe(false);
    });
  });
});
