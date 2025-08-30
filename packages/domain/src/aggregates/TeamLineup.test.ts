import { TeamLineup } from './TeamLineup';
import { TeamLineupId } from '../value-objects/TeamLineupId';
import { PlayerId } from '../value-objects/PlayerId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';
import { PlayerSubstitutedIntoGame } from '../events/PlayerSubstitutedIntoGame';
import { FieldPositionChanged } from '../events/FieldPositionChanged';
import { SoftballRules } from '../rules/SoftballRules';

describe('TeamLineup', () => {
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

  describe('createNew', () => {
    it('creates a new empty team lineup with valid id and game id', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');

      expect(lineup.id).toBe(lineupId);
      expect(lineup.gameId).toBe(gameId);
      expect(lineup.teamName).toBe('Home Tigers');
      expect(lineup.getActiveLineup()).toEqual([]);
      expect(lineup.getFieldingPositions()).toEqual(new Map());
      expect(lineup.getUncommittedEvents()).toHaveLength(1);
      expect(lineup.getUncommittedEvents()[0]?.type).toBe('TeamLineupCreated');
    });

    it('throws error when lineupId is null', () => {
      expect(() =>
        TeamLineup.createNew(null as unknown as TeamLineupId, gameId, 'Home Tigers')
      ).toThrow(DomainError);
    });

    it('throws error when gameId is null', () => {
      expect(() =>
        TeamLineup.createNew(lineupId, null as unknown as GameId, 'Home Tigers')
      ).toThrow(DomainError);
    });

    it('throws error when team name is empty', () => {
      expect(() => TeamLineup.createNew(lineupId, gameId, '')).toThrow(DomainError);
    });

    it('throws error when team name is only whitespace', () => {
      expect(() => TeamLineup.createNew(lineupId, gameId, '   ')).toThrow(DomainError);
    });

    it('throws error when team name exceeds 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(() => TeamLineup.createNew(lineupId, gameId, longName)).toThrow(DomainError);
    });
  });

  describe('addPlayer', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
    });

    it('adds a player to batting slot successfully', () => {
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      const activeLineup = updatedLineup.getActiveLineup();
      expect(activeLineup).toHaveLength(1);
      expect(activeLineup[0]?.position).toBe(1);
      expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player1);

      const fieldingPositions = updatedLineup.getFieldingPositions();
      expect(fieldingPositions.get(FieldPosition.PITCHER)).toEqual(player1);

      const events = updatedLineup.getUncommittedEvents();
      expect(events).toHaveLength(2); // TeamLineupCreated + PlayerAddedToLineup
      expect(events[1]?.type).toBe('PlayerAddedToLineup');
    });

    it('adds multiple players to different batting slots', () => {
      let updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );
      updatedLineup = updatedLineup.addPlayer(
        player2,
        jersey2,
        'Jane Smith',
        2,
        FieldPosition.CATCHER,
        rules
      );

      const activeLineup = updatedLineup.getActiveLineup();
      expect(activeLineup).toHaveLength(2);
      expect(activeLineup[0]?.position).toBe(1);
      expect(activeLineup[1]?.position).toBe(2);
    });

    it('throws error when batting slot is invalid (< 1)', () => {
      expect(() =>
        lineup.addPlayer(player1, jersey1, 'John Doe', 0, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
    });

    it('throws error when batting slot is invalid (> 20)', () => {
      expect(() =>
        lineup.addPlayer(player1, jersey1, 'John Doe', 21, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
    });

    it('throws error when batting slot is already occupied', () => {
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      expect(() =>
        updatedLineup.addPlayer(player2, jersey2, 'Jane Smith', 1, FieldPosition.CATCHER, rules)
      ).toThrow(DomainError);
    });

    it('throws error when jersey number is already taken', () => {
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      expect(() =>
        updatedLineup.addPlayer(player2, jersey1, 'Jane Smith', 2, FieldPosition.CATCHER, rules)
      ).toThrow(DomainError);
    });

    it('throws error when player is already in lineup', () => {
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      expect(() =>
        updatedLineup.addPlayer(player1, jersey2, 'John Doe', 2, FieldPosition.CATCHER, rules)
      ).toThrow(DomainError);
    });

    it('throws error when field position is already assigned', () => {
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      expect(() =>
        updatedLineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
    });

    it('allows EXTRA_PLAYER position for multiple players (designated hitters)', () => {
      let updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        10,
        FieldPosition.EXTRA_PLAYER,
        rules
      );
      updatedLineup = updatedLineup.addPlayer(
        player2,
        jersey2,
        'Jane Smith',
        11,
        FieldPosition.EXTRA_PLAYER,
        rules
      );

      const fieldingPositions = updatedLineup.getFieldingPositions();
      expect(fieldingPositions.get(FieldPosition.EXTRA_PLAYER)).toBeUndefined(); // EP doesn't play defense

      const activeLineup = updatedLineup.getActiveLineup();
      expect(activeLineup).toHaveLength(2);
    });

    it('throws error when player name is empty', () => {
      expect(() => lineup.addPlayer(player1, jersey1, '', 1, FieldPosition.PITCHER, rules)).toThrow(
        DomainError
      );
    });

    it('throws error when player name exceeds 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() =>
        lineup.addPlayer(player1, jersey1, longName, 1, FieldPosition.PITCHER, rules)
      ).toThrow(DomainError);
    });
  });

  describe('substitutePlayer', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
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
      ).toThrow(DomainError);
    });
  });

  describe('changePosition', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
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

  describe('getActiveLineup', () => {
    it('returns empty array for new lineup', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      expect(lineup.getActiveLineup()).toEqual([]);
    });

    it('returns lineup sorted by batting position', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 5, FieldPosition.CATCHER, rules);
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(
        player3,
        jersey3,
        'Bob Johnson',
        3,
        FieldPosition.FIRST_BASE,
        rules
      );

      const activeLineup = lineup.getActiveLineup();
      expect(activeLineup).toHaveLength(3);
      expect(activeLineup[0]?.position).toBe(1);
      expect(activeLineup[1]?.position).toBe(3);
      expect(activeLineup[2]?.position).toBe(5);
    });
  });

  describe('getFieldingPositions', () => {
    it('returns empty map for new lineup', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      expect(lineup.getFieldingPositions()).toEqual(new Map());
    });

    it('returns current fielding assignments', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      const positions = lineup.getFieldingPositions();
      expect(positions.get(FieldPosition.PITCHER)).toEqual(player1);
      expect(positions.get(FieldPosition.CATCHER)).toEqual(player2);
      expect(positions.size).toBe(2);
    });

    it('excludes EXTRA_PLAYER positions from fielding map', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        10,
        FieldPosition.EXTRA_PLAYER,
        rules
      );

      const positions = lineup.getFieldingPositions();
      expect(positions.size).toBe(0);
      expect(positions.has(FieldPosition.EXTRA_PLAYER)).toBe(false);
    });
  });

  describe('isPlayerEligibleForReentry', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
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

  describe('getPlayerInfo', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
    });

    it('returns player info for existing player', () => {
      const info = lineup.getPlayerInfo(player1);
      expect(info).toBeDefined();
      expect(info?.playerId).toEqual(player1);
      expect(info?.jerseyNumber).toEqual(jersey1);
      expect(info?.playerName).toBe('John Doe');
      expect(info?.currentPosition).toBe(FieldPosition.PITCHER);
      expect(info?.isStarter).toBe(true);
      expect(info?.hasUsedReentry).toBe(false);
    });

    it('returns undefined for non-existing player', () => {
      const unknownPlayer = PlayerId.generate();
      expect(lineup.getPlayerInfo(unknownPlayer)).toBeUndefined();
    });

    it('tracks re-entry status correctly', () => {
      // Substitute player out
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
      let info = updatedLineup.getPlayerInfo(player1);
      expect(info?.hasUsedReentry).toBe(false);
      expect(info?.currentPosition).toBeUndefined();

      // Re-enter player
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
      info = updatedLineup.getPlayerInfo(player1);
      expect(info?.hasUsedReentry).toBe(true);
      expect(info?.currentPosition).toBe(FieldPosition.PITCHER);
    });
  });

  describe('event sourcing', () => {
    it('marks events as committed', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      expect(lineup.getUncommittedEvents()).toHaveLength(1);

      lineup.markEventsAsCommitted();
      expect(lineup.getUncommittedEvents()).toHaveLength(0);
    });

    it('accumulates multiple events', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      const events = lineup.getUncommittedEvents();
      expect(events).toHaveLength(3); // Created + 2 Players Added
      expect(events[0]?.type).toBe('TeamLineupCreated');
      expect(events[1]?.type).toBe('PlayerAddedToLineup');
      expect(events[2]?.type).toBe('PlayerAddedToLineup');
    });

    it('includes game and team context in events', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
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

      const substitutionEvent = lineup
        .getUncommittedEvents()
        .find(e => e.type === 'PlayerSubstitutedIntoGame') as PlayerSubstitutedIntoGame;

      expect(substitutionEvent.gameId).toEqual(gameId);
      expect(substitutionEvent.teamLineupId).toEqual(lineupId);
    });
  });

  describe('immutability', () => {
    it('returns new instance on player addition', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      const updatedLineup = lineup.addPlayer(
        player1,
        jersey1,
        'John Doe',
        1,
        FieldPosition.PITCHER,
        rules
      );

      expect(updatedLineup).not.toBe(lineup);
      expect(lineup.getActiveLineup()).toHaveLength(0);
      expect(updatedLineup.getActiveLineup()).toHaveLength(1);
    });

    it('returns new instance on substitution', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

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

      expect(updatedLineup).not.toBe(lineup);
      expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);
      expect(updatedLineup.getFieldingPositions().get(FieldPosition.CATCHER)).toEqual(player2);
    });

    it('returns new instance on position change', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

      const updatedLineup = lineup.changePosition(player1, FieldPosition.FIRST_BASE, 4);

      expect(updatedLineup).not.toBe(lineup);
      expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);
      expect(updatedLineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toEqual(player1);
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
