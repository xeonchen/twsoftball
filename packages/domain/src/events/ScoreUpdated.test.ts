import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { ScoreUpdated } from './ScoreUpdated.js';

describe('ScoreUpdated Domain Event', () => {
  let gameId: GameId;
  let validScore: { home: number; away: number };

  beforeEach(() => {
    gameId = GameId.generate();
    validScore = { home: 5, away: 3 };
  });

  describe('Event Creation', () => {
    it('should create event with valid parameters', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 2, validScore);

      expect(event.gameId).toEqual(gameId);
      expect(event.scoringTeam).toBe('HOME');
      expect(event.runsAdded).toBe(2);
      expect(event.newScore).toEqual(validScore);
      expect(event.type).toBe('ScoreUpdated');
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should freeze new score object for immutability', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 2, validScore);

      // New score should be frozen and cannot be modified
      expect(() => {
        event.newScore.home = 999;
      }).toThrow();
      expect(() => {
        event.newScore.away = 999;
      }).toThrow();
    });

    it('should accept both HOME and AWAY scoring teams', () => {
      const homeEvent = new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 });
      const awayEvent = new ScoreUpdated(gameId, 'AWAY', 2, { home: 1, away: 2 });

      expect(homeEvent.scoringTeam).toBe('HOME');
      expect(awayEvent.scoringTeam).toBe('AWAY');
    });
  });

  describe('Scoring Team Validation', () => {
    it('should throw error for invalid scoring team', () => {
      expect(() => new ScoreUpdated(gameId, 'INVALID' as never, 1, validScore)).toThrow(
        DomainError
      );
      expect(() => new ScoreUpdated(gameId, 'INVALID' as never, 1, validScore)).toThrow(
        /Scoring team must be either HOME or AWAY/
      );
    });

    it('should throw error for empty scoring team', () => {
      expect(() => new ScoreUpdated(gameId, '' as never, 1, validScore)).toThrow(DomainError);
    });

    it('should throw error for null scoring team', () => {
      expect(() => new ScoreUpdated(gameId, null as never, 1, validScore)).toThrow(DomainError);
    });

    it('should throw error for undefined scoring team', () => {
      expect(() => new ScoreUpdated(gameId, undefined as never, 1, validScore)).toThrow(
        DomainError
      );
    });

    it('should be case sensitive for scoring team', () => {
      expect(() => new ScoreUpdated(gameId, 'home' as never, 1, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'away' as never, 1, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'Home' as never, 1, validScore)).toThrow(DomainError);
    });
  });

  describe('Runs Added Validation', () => {
    it('should throw error for invalid runs added types', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', 'invalid' as never, validScore)).toThrow(
        DomainError
      );
      expect(() => new ScoreUpdated(gameId, 'HOME', null as never, validScore)).toThrow(
        DomainError
      );
      expect(() => new ScoreUpdated(gameId, 'HOME', undefined as never, validScore)).toThrow(
        DomainError
      );
    });

    it('should throw error for NaN runs added', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', NaN, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', NaN, validScore)).toThrow(
        /Runs added must be a valid number/
      );
    });

    it('should throw error for infinite runs added', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', Infinity, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', -Infinity, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', Infinity, validScore)).toThrow(
        /Runs added must be a finite number/
      );
    });

    it('should throw error for zero runs added', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', 0, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', 0, validScore)).toThrow(
        /Runs added must be greater than zero/
      );
    });

    it('should throw error for negative runs added', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', -1, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', -1, validScore)).toThrow(
        /Runs added must be greater than zero/
      );
    });

    it('should throw error for decimal runs added', () => {
      expect(() => new ScoreUpdated(gameId, 'HOME', 1.5, validScore)).toThrow(DomainError);
      expect(() => new ScoreUpdated(gameId, 'HOME', 1.5, validScore)).toThrow(
        /Runs added must be an integer/
      );
    });

    it('should accept various valid runs added values', () => {
      const oneRun = new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 });
      const multipleRuns = new ScoreUpdated(gameId, 'AWAY', 5, { home: 1, away: 5 });
      const grandSlam = new ScoreUpdated(gameId, 'HOME', 4, { home: 5, away: 0 });

      expect(oneRun.runsAdded).toBe(1);
      expect(multipleRuns.runsAdded).toBe(5);
      expect(grandSlam.runsAdded).toBe(4);
    });
  });

  describe('New Score Validation', () => {
    describe('Home Score Validation', () => {
      it('should throw error for invalid home score types', () => {
        expect(
          () => new ScoreUpdated(gameId, 'HOME', 1, { home: 'invalid' as never, away: 3 })
        ).toThrow(DomainError);
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: null as never, away: 3 })).toThrow(
          DomainError
        );
        expect(
          () => new ScoreUpdated(gameId, 'HOME', 1, { home: undefined as never, away: 3 })
        ).toThrow(DomainError);
      });

      it('should throw error for NaN home score', () => {
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: NaN, away: 3 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: NaN, away: 3 })).toThrow(
          /Home score must be a valid number/
        );
      });

      it('should throw error for infinite home score', () => {
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: Infinity, away: 3 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: -Infinity, away: 3 })).toThrow(
          DomainError
        );
      });

      it('should throw error for negative home score', () => {
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: -1, away: 3 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: -1, away: 3 })).toThrow(
          /Home score cannot be negative/
        );
      });

      it('should throw error for decimal home score', () => {
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: 2.5, away: 3 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'HOME', 1, { home: 2.5, away: 3 })).toThrow(
          /Home score must be an integer/
        );
      });
    });

    describe('Away Score Validation', () => {
      it('should throw error for invalid away score types', () => {
        expect(
          () => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: 'invalid' as never })
        ).toThrow(DomainError);
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: null as never })).toThrow(
          DomainError
        );
        expect(
          () => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: undefined as never })
        ).toThrow(DomainError);
      });

      it('should throw error for NaN away score', () => {
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: NaN })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: NaN })).toThrow(
          /Away score must be a valid number/
        );
      });

      it('should throw error for infinite away score', () => {
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: Infinity })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: -Infinity })).toThrow(
          DomainError
        );
      });

      it('should throw error for negative away score', () => {
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: -1 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: -1 })).toThrow(
          /Away score cannot be negative/
        );
      });

      it('should throw error for decimal away score', () => {
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: 3.5 })).toThrow(
          DomainError
        );
        expect(() => new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: 3.5 })).toThrow(
          /Away score must be an integer/
        );
      });
    });

    it('should accept zero scores', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 });

      expect(event.newScore.home).toBe(1);
      expect(event.newScore.away).toBe(0);
    });

    it('should accept high scores', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 10, { home: 25, away: 15 });

      expect(event.newScore.home).toBe(25);
      expect(event.newScore.away).toBe(15);
    });
  });

  describe('Domain Event Properties', () => {
    it('should have unique event IDs for different instances', () => {
      const event1 = new ScoreUpdated(gameId, 'HOME', 1, validScore);
      const event2 = new ScoreUpdated(gameId, 'HOME', 1, validScore);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps within reasonable range', () => {
      const beforeCreation = new Date();
      const event = new ScoreUpdated(gameId, 'HOME', 1, validScore);
      const afterCreation = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should maintain consistent type identifier', () => {
      const event1 = new ScoreUpdated(gameId, 'HOME', 1, validScore);
      const event2 = new ScoreUpdated(GameId.generate(), 'AWAY', 3, { home: 2, away: 6 });

      expect(event1.type).toBe('ScoreUpdated');
      expect(event2.type).toBe('ScoreUpdated');
      expect(event1.type).toBe(event2.type);
    });

    it('should use version 1 for all instances', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 1, validScore);

      expect(event.version).toBe(1);
    });
  });

  describe('Business Scenarios', () => {
    it('should handle single run scoring', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 });

      expect(event.runsAdded).toBe(1);
      expect(event.newScore.home).toBe(1);
    });

    it('should handle multiple runs scoring in one update', () => {
      const event = new ScoreUpdated(gameId, 'AWAY', 3, { home: 5, away: 3 });

      expect(event.runsAdded).toBe(3);
      expect(event.newScore.away).toBe(3);
    });

    it('should handle home runs or big innings', () => {
      const event = new ScoreUpdated(gameId, 'HOME', 4, { home: 10, away: 6 });

      expect(event.runsAdded).toBe(4);
      expect(event.newScore.home).toBe(10);
    });

    it('should maintain context of which team scored', () => {
      const homeScoring = new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 });
      const awayScoring = new ScoreUpdated(gameId, 'AWAY', 1, { home: 2, away: 1 });

      expect(homeScoring.scoringTeam).toBe('HOME');
      expect(awayScoring.scoringTeam).toBe('AWAY');
    });
  });
});
