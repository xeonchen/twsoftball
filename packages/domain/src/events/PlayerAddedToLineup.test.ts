import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { PlayerAddedToLineup } from './PlayerAddedToLineup.js';

describe('PlayerAddedToLineup', () => {
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let playerId: PlayerId;
  let jerseyNumber: JerseyNumber;

  beforeEach(() => {
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
    playerId = PlayerId.generate();
    jerseyNumber = new JerseyNumber('42');
  });

  describe('constructor', () => {
    it('creates event with valid parameters', () => {
      const event = new PlayerAddedToLineup(
        gameId,
        teamLineupId,
        playerId,
        jerseyNumber,
        'John Smith',
        1,
        FieldPosition.PITCHER
      );

      expect(event.type).toBe('PlayerAddedToLineup');
      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.playerId).toBe(playerId);
      expect(event.jerseyNumber).toBe(jerseyNumber);
      expect(event.playerName).toBe('John Smith');
      expect(event.battingSlot).toBe(1);
      expect(event.fieldPosition).toBe(FieldPosition.PITCHER);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('accepts all valid batting slots from 1 to 20', () => {
      Array.from({ length: 20 }, (_, index) => index + 1).forEach(slot => {
        expect(
          () =>
            new PlayerAddedToLineup(
              gameId,
              teamLineupId,
              playerId,
              jerseyNumber,
              'Player Name',
              slot,
              FieldPosition.PITCHER
            )
        ).not.toThrow();
      });
    });

    it('accepts all valid field positions', () => {
      Object.values(FieldPosition).forEach(position => {
        expect(
          () =>
            new PlayerAddedToLineup(
              gameId,
              teamLineupId,
              playerId,
              jerseyNumber,
              'Player Name',
              1,
              position
            )
        ).not.toThrow();
      });
    });

    it('throws error when batting slot is less than 1', () => {
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            'John Smith',
            0,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('throws error when batting slot is greater than 20', () => {
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            'John Smith',
            21,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('throws error when player name is empty', () => {
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            '',
            1,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('throws error when player name is only whitespace', () => {
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            '   ',
            1,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('throws error when player name exceeds 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            longName,
            1,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('accepts player name at exactly 100 characters', () => {
      const exactLengthName = 'A'.repeat(100);
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            exactLengthName,
            1,
            FieldPosition.PITCHER
          )
      ).not.toThrow();
    });

    it('preserves player name with leading/trailing spaces when valid', () => {
      const nameWithSpaces = '  John Smith  ';
      const event = new PlayerAddedToLineup(
        gameId,
        teamLineupId,
        playerId,
        jerseyNumber,
        nameWithSpaces,
        1,
        FieldPosition.PITCHER
      );

      expect(event.playerName).toBe(nameWithSpaces);
    });
  });

  describe('validation edge cases', () => {
    it('handles decimal batting slots by truncating', () => {
      // JavaScript may pass decimal numbers
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            'Player Name',
            1.9, // Will be treated as valid since it's > 1 and < 20
            FieldPosition.PITCHER
          )
      ).not.toThrow();
    });

    it('validates batting slot bounds with negative numbers', () => {
      expect(
        () =>
          new PlayerAddedToLineup(
            gameId,
            teamLineupId,
            playerId,
            jerseyNumber,
            'Player Name',
            -1,
            FieldPosition.PITCHER
          )
      ).toThrow(DomainError);
    });

    it('handles special characters in player names', () => {
      const specialName = "John O'Connor-Smith Jr.";
      const event = new PlayerAddedToLineup(
        gameId,
        teamLineupId,
        playerId,
        jerseyNumber,
        specialName,
        1,
        FieldPosition.PITCHER
      );

      expect(event.playerName).toBe(specialName);
    });

    it('handles unicode characters in player names', () => {
      const unicodeName = 'José María García-López';
      const event = new PlayerAddedToLineup(
        gameId,
        teamLineupId,
        playerId,
        jerseyNumber,
        unicodeName,
        1,
        FieldPosition.PITCHER
      );

      expect(event.playerName).toBe(unicodeName);
    });
  });
});
