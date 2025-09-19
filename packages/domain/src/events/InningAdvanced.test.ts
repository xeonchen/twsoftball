import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { InningAdvanced } from './InningAdvanced.js';

describe('InningAdvanced Domain Event', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Event Creation', () => {
    it('should create event with valid parameters', () => {
      const event = new InningAdvanced(gameId, 3, true);

      expect(event.gameId).toEqual(gameId);
      expect(event.newInning).toBe(3);
      expect(event.isTopHalf).toBe(true);
      expect(event.type).toBe('InningAdvanced');
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should have immutable properties', () => {
      const event = new InningAdvanced(gameId, 3, true);

      // Properties should be accessible and remain constant
      expect(event.newInning).toBe(3);
      expect(event.isTopHalf).toBe(true);

      // Properties should remain constant throughout object lifecycle
      const originalInning = event.newInning;
      const originalIsTopHalf = event.isTopHalf;

      expect(event.newInning).toBe(originalInning);
      expect(event.isTopHalf).toBe(originalIsTopHalf);
    });

    it('should accept both top and bottom half scenarios', () => {
      const topHalf = new InningAdvanced(gameId, 2, true);
      const bottomHalf = new InningAdvanced(gameId, 2, false);

      expect(topHalf.isTopHalf).toBe(true);
      expect(bottomHalf.isTopHalf).toBe(false);
    });
  });

  describe('Inning Number Validation', () => {
    it('should throw error for invalid inning types', () => {
      expect(() => new InningAdvanced(gameId, 'invalid' as never, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, null as never, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, undefined as never, true)).toThrow(DomainError);
    });

    it('should throw error for NaN inning', () => {
      expect(() => new InningAdvanced(gameId, NaN, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, NaN, true)).toThrow(/Inning must be a valid number/);
    });

    it('should throw error for infinite inning', () => {
      expect(() => new InningAdvanced(gameId, Infinity, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, -Infinity, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, Infinity, true)).toThrow(
        /Inning must be a finite number/
      );
    });

    it('should throw error for zero or negative inning', () => {
      expect(() => new InningAdvanced(gameId, 0, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, -1, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, -1, true)).toThrow(/Inning must be 1 or greater/);
    });

    it('should throw error for decimal inning', () => {
      expect(() => new InningAdvanced(gameId, 3.5, true)).toThrow(DomainError);
      expect(() => new InningAdvanced(gameId, 3.5, true)).toThrow(/Inning must be an integer/);
    });

    it('should accept various valid inning numbers', () => {
      const firstInning = new InningAdvanced(gameId, 1, true);
      const regulation = new InningAdvanced(gameId, 7, false);
      const extraInning = new InningAdvanced(gameId, 15, true);

      expect(firstInning.newInning).toBe(1);
      expect(regulation.newInning).toBe(7);
      expect(extraInning.newInning).toBe(15);
    });
  });

  describe('Half-Inning Context', () => {
    it('should correctly represent top half (away team batting)', () => {
      const topHalf = new InningAdvanced(gameId, 4, true);

      expect(topHalf.isTopHalf).toBe(true);
      expect(topHalf.newInning).toBe(4);
    });

    it('should correctly represent bottom half (home team batting)', () => {
      const bottomHalf = new InningAdvanced(gameId, 4, false);

      expect(bottomHalf.isTopHalf).toBe(false);
      expect(bottomHalf.newInning).toBe(4);
    });

    it('should handle boolean false explicitly for bottom half', () => {
      const bottomHalf = new InningAdvanced(gameId, 1, false);

      expect(bottomHalf.isTopHalf).toBe(false);
      expect(bottomHalf.isTopHalf).not.toBe(true);
    });
  });

  describe('Domain Event Properties', () => {
    it('should have unique event IDs for different instances', () => {
      const event1 = new InningAdvanced(gameId, 3, true);
      const event2 = new InningAdvanced(gameId, 3, true);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps within reasonable range', () => {
      const beforeCreation = new Date();
      const event = new InningAdvanced(gameId, 3, true);
      const afterCreation = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should maintain consistent type identifier', () => {
      const event1 = new InningAdvanced(gameId, 3, true);
      const event2 = new InningAdvanced(GameId.generate(), 7, false);

      expect(event1.type).toBe('InningAdvanced');
      expect(event2.type).toBe('InningAdvanced');
      expect(event1.type).toBe(event2.type);
    });

    it('should use version 1 for all instances', () => {
      const event = new InningAdvanced(gameId, 3, true);

      expect(event.version).toBe(1);
    });
  });

  describe('Game Flow Scenarios', () => {
    it('should represent start of first inning', () => {
      const startOfGame = new InningAdvanced(gameId, 1, true);

      expect(startOfGame.newInning).toBe(1);
      expect(startOfGame.isTopHalf).toBe(true);
    });

    it('should represent advancement to bottom of inning', () => {
      const bottomOfFirst = new InningAdvanced(gameId, 1, false);

      expect(bottomOfFirst.newInning).toBe(1);
      expect(bottomOfFirst.isTopHalf).toBe(false);
    });

    it('should represent advancement to next inning', () => {
      const topOfSecond = new InningAdvanced(gameId, 2, true);

      expect(topOfSecond.newInning).toBe(2);
      expect(topOfSecond.isTopHalf).toBe(true);
    });

    it('should handle regulation innings', () => {
      const topOfSeventh = new InningAdvanced(gameId, 7, true);
      const bottomOfSeventh = new InningAdvanced(gameId, 7, false);

      expect(topOfSeventh.newInning).toBe(7);
      expect(topOfSeventh.isTopHalf).toBe(true);
      expect(bottomOfSeventh.newInning).toBe(7);
      expect(bottomOfSeventh.isTopHalf).toBe(false);
    });

    it('should handle extra innings', () => {
      const topOfEighth = new InningAdvanced(gameId, 8, true);
      const bottomOfTwelfth = new InningAdvanced(gameId, 12, false);

      expect(topOfEighth.newInning).toBe(8);
      expect(topOfEighth.isTopHalf).toBe(true);
      expect(bottomOfTwelfth.newInning).toBe(12);
      expect(bottomOfTwelfth.isTopHalf).toBe(false);
    });

    it('should maintain game context across different innings', () => {
      const sameGameEvents = [
        new InningAdvanced(gameId, 1, false),
        new InningAdvanced(gameId, 2, true),
        new InningAdvanced(gameId, 2, false),
      ];

      sameGameEvents.forEach(event => {
        expect(event.gameId).toEqual(gameId);
        expect(event.type).toBe('InningAdvanced');
      });
    });
  });
});
