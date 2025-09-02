import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';

import { RunScored } from './RunScored';

describe('RunScored', () => {
  const gameId = GameId.generate();
  const scorerId = PlayerId.generate();
  const rbiPlayerId = PlayerId.generate();

  describe('construction', () => {
    it('should create RunScored event with valid parameters including RBI', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });

      expect(event.gameId).toBe(gameId);
      expect(event.scorerId).toBe(scorerId);
      expect(event.battingTeam).toBe('HOME');
      expect(event.rbiCreditedTo).toBe(rbiPlayerId);
      expect(event.newScore).toEqual({ home: 1, away: 0 });
      expect(event.type).toBe('RunScored');
    });

    it('should create RunScored event with null RBI (no RBI scenario)', () => {
      const event = new RunScored(gameId, scorerId, 'AWAY', null, { home: 0, away: 1 });

      expect(event.gameId).toBe(gameId);
      expect(event.scorerId).toBe(scorerId);
      expect(event.battingTeam).toBe('AWAY');
      expect(event.rbiCreditedTo).toBeNull();
      expect(event.newScore).toEqual({ home: 0, away: 1 });
      expect(event.type).toBe('RunScored');
    });

    it('should create RunScored event with high scores', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 15, away: 12 });

      expect(event.newScore).toEqual({ home: 15, away: 12 });
    });
  });

  describe('DomainEvent integration', () => {
    it('should extend DomainEvent with required properties', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
      expect(event.type).toBe('RunScored');
    });

    it('should have unique eventId for each instance', () => {
      const event1 = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });
      const event2 = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('battingTeam validation', () => {
    it('should accept HOME as battingTeam', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 })
      ).not.toThrow();
    });

    it('should accept AWAY as battingTeam', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: 1 })
      ).not.toThrow();
    });

    it('should reject invalid battingTeam', () => {
      expect(
        () =>
          new RunScored(gameId, scorerId, 'INVALID' as 'HOME', rbiPlayerId, { home: 1, away: 0 })
      ).toThrow(DomainError);

      expect(
        () =>
          new RunScored(gameId, scorerId, 'INVALID' as 'HOME', rbiPlayerId, { home: 1, away: 0 })
      ).toThrow('battingTeam must be either HOME or AWAY');
    });

    it('should reject empty battingTeam', () => {
      expect(
        () => new RunScored(gameId, scorerId, '' as 'HOME', rbiPlayerId, { home: 1, away: 0 })
      ).toThrow(DomainError);
    });
  });

  describe('newScore validation', () => {
    it('should accept zero scores', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 0, away: 0 })
      ).not.toThrow();
    });

    it('should reject negative home score', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: -1, away: 0 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: -1, away: 0 })
      ).toThrow('Home score cannot be negative');
    });

    it('should reject negative away score', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: -1 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: -1 })
      ).toThrow('Away score cannot be negative');
    });

    it('should reject non-integer home score', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1.5, away: 0 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1.5, away: 0 })
      ).toThrow('Home score must be an integer');
    });

    it('should reject non-integer away score', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: 2.7 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: 2.7 })
      ).toThrow('Away score must be an integer');
    });

    it('should reject NaN scores', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: NaN, away: 0 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 0, away: NaN })
      ).toThrow(DomainError);
    });

    it('should reject Infinity scores', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: Infinity, away: 0 })
      ).toThrow(DomainError);

      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 0, away: Infinity })
      ).toThrow(DomainError);
    });
  });

  describe('RBI attribution scenarios', () => {
    it('should handle RBI credited to batter', () => {
      const batterId = PlayerId.generate();
      const event = new RunScored(gameId, scorerId, 'HOME', batterId, { home: 1, away: 0 });

      expect(event.rbiCreditedTo).toBe(batterId);
    });

    it('should handle no RBI scenarios (null)', () => {
      const event = new RunScored(gameId, scorerId, 'AWAY', null, { home: 0, away: 1 });

      expect(event.rbiCreditedTo).toBeNull();
    });

    it('should allow scorer and RBI player to be the same (inside-the-park home run)', () => {
      const event = new RunScored(
        gameId,
        scorerId,
        'HOME',
        scorerId, // Same player scores and gets RBI
        { home: 1, away: 0 }
      );

      expect(event.scorerId).toBe(scorerId);
      expect(event.rbiCreditedTo).toBe(scorerId);
    });

    it('should allow different scorer and RBI player (runner scores on hit)', () => {
      const batterId = PlayerId.generate();
      const event = new RunScored(
        gameId,
        scorerId, // Runner who scored
        'HOME',
        batterId, // Batter who drove in run
        { home: 1, away: 0 }
      );

      expect(event.scorerId).toBe(scorerId);
      expect(event.rbiCreditedTo).toBe(batterId);
    });
  });

  describe('immutability', () => {
    it('should be immutable - all properties readonly', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });

      // These should be compile-time errors if properties aren't readonly
      // @ts-expect-error - gameId is readonly
      event.gameId = GameId.generate();
      // @ts-expect-error - scorerId is readonly
      event.scorerId = PlayerId.generate();
      // @ts-expect-error - battingTeam is readonly
      event.battingTeam = 'AWAY';
      // @ts-expect-error - rbiCreditedTo is readonly
      event.rbiCreditedTo = null;
      // @ts-expect-error - newScore is readonly
      event.newScore = { home: 2, away: 0 };
    });

    it('should not allow mutation of newScore object', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });

      // Score object should be frozen to prevent mutations
      expect(() => {
        // Try to mutate the frozen object - should throw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event.newScore as any).home = 5;
      }).toThrow();
    });
  });

  describe('serialization support', () => {
    it('should be JSON serializable', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 3, away: 2 });

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('RunScored');
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.scorerId.value).toBe(scorerId.value);
      expect(parsed.battingTeam).toBe('HOME');
      expect(parsed.rbiCreditedTo.value).toBe(rbiPlayerId.value);
      expect(parsed.newScore).toEqual({ home: 3, away: 2 });
    });

    it('should serialize null RBI correctly', () => {
      const event = new RunScored(gameId, scorerId, 'AWAY', null, { home: 1, away: 2 });

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.rbiCreditedTo).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle maximum reasonable scores', () => {
      expect(
        () => new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 999, away: 888 })
      ).not.toThrow();
    });

    it('should handle game with only home team scoring', () => {
      const event = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 10, away: 0 });

      expect(event.newScore).toEqual({ home: 10, away: 0 });
    });

    it('should handle game with only away team scoring', () => {
      const event = new RunScored(gameId, scorerId, 'AWAY', rbiPlayerId, { home: 0, away: 7 });

      expect(event.newScore).toEqual({ home: 0, away: 7 });
    });
  });

  describe('type consistency', () => {
    it('should have consistent type property', () => {
      const event1 = new RunScored(gameId, scorerId, 'HOME', rbiPlayerId, { home: 1, away: 0 });
      const event2 = new RunScored(gameId, scorerId, 'AWAY', null, { home: 1, away: 1 });

      expect(event1.type).toBe('RunScored');
      expect(event2.type).toBe('RunScored');
      expect(event1.type).toBe(event2.type);
    });
  });
});
