import { DomainError } from '../errors/DomainError';
import { GameId } from '../value-objects/GameId';

import { GameCompleted } from './GameCompleted';

describe('GameCompleted Domain Event', () => {
  let gameId: GameId;
  let validScore: { home: number; away: number };

  beforeEach(() => {
    gameId = GameId.generate();
    validScore = { home: 8, away: 5 };
  });

  describe('Event Creation', () => {
    it('should create event with valid parameters', () => {
      const event = new GameCompleted(gameId, 'REGULATION', validScore, 7);

      expect(event.gameId).toEqual(gameId);
      expect(event.endingType).toBe('REGULATION');
      expect(event.finalScore).toEqual(validScore);
      expect(event.completedInning).toBe(7);
      expect(event.type).toBe('GameCompleted');
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should freeze final score object for immutability', () => {
      const event = new GameCompleted(gameId, 'REGULATION', validScore, 7);

      // Final score should be frozen and cannot be modified
      expect(() => {
        event.finalScore.home = 999;
      }).toThrow();
      expect(() => {
        event.finalScore.away = 999;
      }).toThrow();
    });

    it('should accept all valid ending types', () => {
      const regulation = new GameCompleted(gameId, 'REGULATION', validScore, 7);
      const mercyRule = new GameCompleted(gameId, 'MERCY_RULE', validScore, 5);
      const forfeit = new GameCompleted(gameId, 'FORFEIT', validScore, 3);
      const timeLimit = new GameCompleted(gameId, 'TIME_LIMIT', validScore, 6);

      expect(regulation.endingType).toBe('REGULATION');
      expect(mercyRule.endingType).toBe('MERCY_RULE');
      expect(forfeit.endingType).toBe('FORFEIT');
      expect(timeLimit.endingType).toBe('TIME_LIMIT');
    });
  });

  describe('Ending Type Validation', () => {
    it('should throw error for invalid ending type', () => {
      expect(() => new GameCompleted(gameId, 'INVALID' as never, validScore, 7)).toThrow(
        DomainError
      );
      expect(() => new GameCompleted(gameId, 'INVALID' as never, validScore, 7)).toThrow(
        /Invalid ending type: INVALID/
      );
    });

    it('should throw error for empty ending type', () => {
      expect(() => new GameCompleted(gameId, '' as never, validScore, 7)).toThrow(DomainError);
    });

    it('should throw error for null ending type', () => {
      expect(() => new GameCompleted(gameId, null as never, validScore, 7)).toThrow(DomainError);
    });

    it('should throw error for undefined ending type', () => {
      expect(() => new GameCompleted(gameId, undefined as never, validScore, 7)).toThrow(
        DomainError
      );
    });

    it('should be case sensitive for ending types', () => {
      expect(() => new GameCompleted(gameId, 'regulation' as never, validScore, 7)).toThrow(
        DomainError
      );
      expect(() => new GameCompleted(gameId, 'Regulation' as never, validScore, 7)).toThrow(
        DomainError
      );
    });
  });

  describe('Final Score Validation', () => {
    describe('Home Score Validation', () => {
      it('should throw error for invalid home score types', () => {
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 'invalid' as never, away: 5 }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: null as never, away: 5 }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: undefined as never, away: 5 }, 7)
        ).toThrow(DomainError);
      });

      it('should throw error for NaN home score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: NaN, away: 5 }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: NaN, away: 5 }, 7)).toThrow(
          /Home score must be a valid number/
        );
      });

      it('should throw error for infinite home score', () => {
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: Infinity, away: 5 }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: -Infinity, away: 5 }, 7)
        ).toThrow(DomainError);
      });

      it('should throw error for negative home score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: -1, away: 5 }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: -1, away: 5 }, 7)).toThrow(
          /Home score cannot be negative/
        );
      });

      it('should throw error for decimal home score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 5.5, away: 5 }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 5.5, away: 5 }, 7)).toThrow(
          /Home score must be an integer/
        );
      });
    });

    describe('Away Score Validation', () => {
      it('should throw error for invalid away score types', () => {
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 8, away: 'invalid' as never }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 8, away: null as never }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 8, away: undefined as never }, 7)
        ).toThrow(DomainError);
      });

      it('should throw error for NaN away score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: NaN }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: NaN }, 7)).toThrow(
          /Away score must be a valid number/
        );
      });

      it('should throw error for infinite away score', () => {
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 8, away: Infinity }, 7)
        ).toThrow(DomainError);
        expect(
          () => new GameCompleted(gameId, 'REGULATION', { home: 8, away: -Infinity }, 7)
        ).toThrow(DomainError);
      });

      it('should throw error for negative away score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: -1 }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: -1 }, 7)).toThrow(
          /Away score cannot be negative/
        );
      });

      it('should throw error for decimal away score', () => {
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: 5.5 }, 7)).toThrow(
          DomainError
        );
        expect(() => new GameCompleted(gameId, 'REGULATION', { home: 8, away: 5.5 }, 7)).toThrow(
          /Away score must be an integer/
        );
      });
    });

    it('should accept zero scores', () => {
      const event = new GameCompleted(gameId, 'REGULATION', { home: 0, away: 0 }, 7);

      expect(event.finalScore.home).toBe(0);
      expect(event.finalScore.away).toBe(0);
    });

    it('should accept high scores', () => {
      const event = new GameCompleted(gameId, 'MERCY_RULE', { home: 25, away: 3 }, 5);

      expect(event.finalScore.home).toBe(25);
      expect(event.finalScore.away).toBe(3);
    });
  });

  describe('Completed Inning Validation', () => {
    it('should throw error for invalid inning types', () => {
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, 'invalid' as never)).toThrow(
        DomainError
      );
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, null as never)).toThrow(
        DomainError
      );
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, undefined as never)).toThrow(
        DomainError
      );
    });

    it('should throw error for NaN inning', () => {
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, NaN)).toThrow(DomainError);
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, NaN)).toThrow(
        /Completed inning must be a valid number/
      );
    });

    it('should throw error for zero or negative inning', () => {
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, 0)).toThrow(DomainError);
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, -1)).toThrow(DomainError);
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, -1)).toThrow(
        /Completed inning must be 1 or greater/
      );
    });

    it('should throw error for decimal inning', () => {
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, 7.5)).toThrow(DomainError);
      expect(() => new GameCompleted(gameId, 'REGULATION', validScore, 7.5)).toThrow(
        /Completed inning must be an integer/
      );
    });

    it('should accept various valid inning numbers', () => {
      const regulation = new GameCompleted(gameId, 'REGULATION', validScore, 7);
      const mercy = new GameCompleted(gameId, 'MERCY_RULE', validScore, 5);
      const extraInning = new GameCompleted(gameId, 'REGULATION', validScore, 12);

      expect(regulation.completedInning).toBe(7);
      expect(mercy.completedInning).toBe(5);
      expect(extraInning.completedInning).toBe(12);
    });
  });

  describe('Domain Event Properties', () => {
    it('should have unique event IDs for different instances', () => {
      const event1 = new GameCompleted(gameId, 'REGULATION', validScore, 7);
      const event2 = new GameCompleted(gameId, 'REGULATION', validScore, 7);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps within reasonable range', () => {
      const beforeCreation = new Date();
      const event = new GameCompleted(gameId, 'REGULATION', validScore, 7);
      const afterCreation = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should maintain consistent type identifier', () => {
      const event1 = new GameCompleted(gameId, 'REGULATION', validScore, 7);
      const event2 = new GameCompleted(GameId.generate(), 'MERCY_RULE', { home: 15, away: 0 }, 5);

      expect(event1.type).toBe('GameCompleted');
      expect(event2.type).toBe('GameCompleted');
      expect(event1.type).toBe(event2.type);
    });

    it('should use version 1 for all instances', () => {
      const event = new GameCompleted(gameId, 'REGULATION', validScore, 7);

      expect(event.version).toBe(1);
    });
  });
});
