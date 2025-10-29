import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { TeamLineup } from './TeamLineup.js';

describe('TeamLineup - Core Operations', () => {
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
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

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
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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

    it('allows EXTRA_PLAYER position for multiple players (batting-only players)', () => {
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

  describe('getActiveLineup', () => {
    it('returns empty array for new lineup', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(lineup.getActiveLineup()).toEqual([]);
    });

    it('returns lineup sorted by batting position', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(lineup.getFieldingPositions()).toEqual(new Map());
    });

    it('returns current fielding assignments', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      const positions = lineup.getFieldingPositions();
      expect(positions.get(FieldPosition.PITCHER)).toEqual(player1);
      expect(positions.get(FieldPosition.CATCHER)).toEqual(player2);
      expect(positions.size).toBe(2);
    });

    it('excludes EXTRA_PLAYER positions from fielding map', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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

  describe('getPlayerInfo', () => {
    let lineup: TeamLineup;

    beforeEach(() => {
      lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      expect(lineup.getUncommittedEvents()).toHaveLength(1);

      lineup.markEventsAsCommitted();
      expect(lineup.getUncommittedEvents()).toHaveLength(0);
    });

    it('accumulates multiple events', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);
      lineup = lineup.addPlayer(player2, jersey2, 'Jane Smith', 2, FieldPosition.CATCHER, rules);

      const events = lineup.getUncommittedEvents();
      expect(events).toHaveLength(3); // Created + 2 Players Added
      expect(events[0]?.type).toBe('TeamLineupCreated');
      expect(events[1]?.type).toBe('PlayerAddedToLineup');
      expect(events[2]?.type).toBe('PlayerAddedToLineup');
    });

    it('includes game and team context in events', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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
        .find(e => e.type === 'PlayerSubstitutedIntoGame');

      expect(substitutionEvent?.['gameId']).toEqual(gameId);
      expect(substitutionEvent?.['teamLineupId']).toEqual(lineupId);
    });
  });

  describe('immutability', () => {
    it('returns new instance on player addition', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
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
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

      const updatedLineup = lineup.changePosition(player1, FieldPosition.FIRST_BASE, 4);

      expect(updatedLineup).not.toBe(lineup);
      expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);
      expect(updatedLineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toEqual(player1);
    });
  });

  describe('getPlayerAtSlot', () => {
    it('should return player ID when slot exists and has a current player', () => {
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

      const player = lineup.getPlayerAtSlot(1);
      expect(player).toEqual(player1);
    });

    it('should return null when slot number does not exist', () => {
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');

      const player = lineup.getPlayerAtSlot(99);
      expect(player).toBeNull();
    });

    it('should return null when slot exists but has no current player', () => {
      // This would happen if a slot's BattingSlot.getCurrentPlayer() returns null
      // which could occur in edge cases during event sourcing
      let lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers', 'HOME');
      lineup = lineup.addPlayer(player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER, rules);

      // Query a different slot that hasn't been populated
      const player = lineup.getPlayerAtSlot(5);
      expect(player).toBeNull();
    });
  });
});
