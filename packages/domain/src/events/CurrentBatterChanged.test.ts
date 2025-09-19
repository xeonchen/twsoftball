import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { CurrentBatterChanged } from './CurrentBatterChanged.js';

describe('CurrentBatterChanged', () => {
  const gameId = new GameId('test-game-123');

  describe('Construction', () => {
    it('should create CurrentBatterChanged event with valid parameters', () => {
      const event = new CurrentBatterChanged(
        gameId,
        1, // previousBattingSlot
        2, // newBattingSlot
        3, // inning
        true // isTopHalf
      );

      expect(event.gameId).toBe(gameId);
      expect(event.previousBattingSlot).toBe(1);
      expect(event.newBattingSlot).toBe(2);
      expect(event.inning).toBe(3);
      expect(event.isTopHalf).toBe(true);
      expect(event.type).toBe('CurrentBatterChanged');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new CurrentBatterChanged(gameId, 1, 2, 1, false);

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = new CurrentBatterChanged(gameId, 1, 2, 1, true);
      const event2 = new CurrentBatterChanged(gameId, 2, 3, 1, false);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new CurrentBatterChanged(gameId, 1, 2, 1, true);
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('GameId Validation', () => {
    it('should reject null gameId', () => {
      // @ts-expect-error - Testing null validation
      expect(() => new CurrentBatterChanged(null, 1, 2, 1, true)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });

    it('should reject undefined gameId', () => {
      // @ts-expect-error - Testing undefined validation
      expect(() => new CurrentBatterChanged(undefined, 1, 2, 1, true)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });
  });

  describe('Previous Batting Slot Validation', () => {
    it('should accept valid previous batting slots (1-20)', () => {
      for (let slot = 1; slot <= 20; slot += 1) {
        expect(
          () => new CurrentBatterChanged(gameId, slot, slot === 20 ? 1 : slot + 1, 1, true)
        ).not.toThrow();
      }
    });

    it('should reject previous batting slot less than 1', () => {
      expect(() => new CurrentBatterChanged(gameId, 0, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );

      expect(() => new CurrentBatterChanged(gameId, -1, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject previous batting slot greater than 20', () => {
      expect(() => new CurrentBatterChanged(gameId, 21, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );

      expect(() => new CurrentBatterChanged(gameId, 25, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject non-number previous batting slot', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new CurrentBatterChanged(gameId, 'invalid', 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject NaN previous batting slot', () => {
      expect(() => new CurrentBatterChanged(gameId, NaN, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject non-integer previous batting slot', () => {
      expect(() => new CurrentBatterChanged(gameId, 1.5, 2, 1, true)).toThrow(
        new DomainError('Previous batting slot must be an integer between 1 and 20')
      );
    });
  });

  describe('New Batting Slot Validation', () => {
    it('should accept valid new batting slots (1-20)', () => {
      for (let slot = 1; slot <= 20; slot += 1) {
        expect(
          () => new CurrentBatterChanged(gameId, slot === 1 ? 20 : slot - 1, slot, 1, true)
        ).not.toThrow();
      }
    });

    it('should reject new batting slot less than 1', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 0, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );

      expect(() => new CurrentBatterChanged(gameId, 1, -1, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject new batting slot greater than 20', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 21, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );

      expect(() => new CurrentBatterChanged(gameId, 1, 25, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject non-number new batting slot', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new CurrentBatterChanged(gameId, 1, 'invalid', 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject NaN new batting slot', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, NaN, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );
    });

    it('should reject non-integer new batting slot', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 2.5, 1, true)).toThrow(
        new DomainError('New batting slot must be an integer between 1 and 20')
      );
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(() => new CurrentBatterChanged(gameId, 1, 2, inning, true)).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 2, 0, true)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );

      expect(() => new CurrentBatterChanged(gameId, 1, 2, -1, true)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );
    });

    it('should reject non-number inning', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new CurrentBatterChanged(gameId, 1, 2, 'invalid', true)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject NaN inning', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 2, NaN, true)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject non-finite inning', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 2, Infinity, true)).toThrow(
        new DomainError('Inning must be a finite number')
      );

      expect(() => new CurrentBatterChanged(gameId, 1, 2, -Infinity, true)).toThrow(
        new DomainError('Inning must be a finite number')
      );
    });

    it('should reject non-integer inning', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 2, 1.5, true)).toThrow(
        new DomainError('Inning must be an integer')
      );
    });
  });

  describe('Batting Slot Change Validation', () => {
    it('should reject when previous and new slots are the same', () => {
      expect(() => new CurrentBatterChanged(gameId, 1, 1, 1, true)).toThrow(
        new DomainError('Previous and new batting slots cannot be the same - no change occurred')
      );

      expect(() => new CurrentBatterChanged(gameId, 5, 5, 3, false)).toThrow(
        new DomainError('Previous and new batting slots cannot be the same - no change occurred')
      );
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new CurrentBatterChanged(gameId, 1, 2, 3, true);

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.previousBattingSlot).toBe(1);
      expect(event.newBattingSlot).toBe(2);
      expect(event.inning).toBe(3);
      expect(event.isTopHalf).toBe(true);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.previousBattingSlot = 999; // TS Error: Cannot assign to 'previousBattingSlot' because it is a read-only property
      // event.newBattingSlot = 999;     // TS Error: Cannot assign to 'newBattingSlot' because it is a read-only property
      // event.inning = 999;             // TS Error: Cannot assign to 'inning' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const event1 = new CurrentBatterChanged(gameId, 1, 2, 1, true);
      const event2 = new CurrentBatterChanged(gameId, 2, 3, 2, false);

      // Each event should have its own values
      expect(event1.previousBattingSlot).toBe(1);
      expect(event1.newBattingSlot).toBe(2);
      expect(event1.inning).toBe(1);
      expect(event1.isTopHalf).toBe(true);

      expect(event2.previousBattingSlot).toBe(2);
      expect(event2.newBattingSlot).toBe(3);
      expect(event2.inning).toBe(2);
      expect(event2.isTopHalf).toBe(false);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new CurrentBatterChanged(gameId, 9, 1, 4, false);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('CurrentBatterChanged');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.previousBattingSlot).toBe(9);
      expect(parsed.newBattingSlot).toBe(1);
      expect(parsed.inning).toBe(4);
      expect(parsed.isTopHalf).toBe(false);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid values
      const minEvent = new CurrentBatterChanged(
        gameId,
        1, // min previous batting slot
        2, // different new batting slot
        1, // min inning
        true // top half
      );

      expect(minEvent.previousBattingSlot).toBe(1);
      expect(minEvent.newBattingSlot).toBe(2);
      expect(minEvent.inning).toBe(1);
      expect(minEvent.isTopHalf).toBe(true);

      // Maximum valid values
      const maxEvent = new CurrentBatterChanged(
        gameId,
        20, // max previous batting slot
        19, // different new batting slot
        999, // high inning number (no upper limit)
        false // bottom half
      );

      expect(maxEvent.previousBattingSlot).toBe(20);
      expect(maxEvent.newBattingSlot).toBe(19);
      expect(maxEvent.inning).toBe(999);
      expect(maxEvent.isTopHalf).toBe(false);
    });

    it('should work with different batting order progressions', () => {
      const scenarios = [
        { prev: 1, new: 2, inning: 1, isTop: true }, // Normal progression
        { prev: 9, new: 1, inning: 3, isTop: false }, // Order cycles back to 1
        { prev: 5, new: 10, inning: 7, isTop: true }, // Jump to EP slots
        { prev: 20, new: 1, inning: 12, isTop: false }, // Max slot back to 1
        { prev: 3, new: 7, inning: 2, isTop: true }, // Non-sequential (substitution)
      ];

      scenarios.forEach(scenario => {
        const event = new CurrentBatterChanged(
          gameId,
          scenario.prev,
          scenario.new,
          scenario.inning,
          scenario.isTop
        );

        expect(event.previousBattingSlot).toBe(scenario.prev);
        expect(event.newBattingSlot).toBe(scenario.new);
        expect(event.inning).toBe(scenario.inning);
        expect(event.isTopHalf).toBe(scenario.isTop);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new CurrentBatterChanged(gameId, 1, 2, 1, true);

      // Verify the type is the expected string literal
      expect(event.type).toBe('CurrentBatterChanged');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('CurrentBatterChanged');
    });

    it('should handle boolean isTopHalf parameter correctly', () => {
      // Test true value
      const topHalfEvent = new CurrentBatterChanged(gameId, 1, 2, 1, true);
      expect(topHalfEvent.isTopHalf).toBe(true);
      expect(typeof topHalfEvent.isTopHalf).toBe('boolean');

      // Test false value
      const bottomHalfEvent = new CurrentBatterChanged(gameId, 1, 2, 1, false);
      expect(bottomHalfEvent.isTopHalf).toBe(false);
      expect(typeof bottomHalfEvent.isTopHalf).toBe('boolean');
    });
  });
});
