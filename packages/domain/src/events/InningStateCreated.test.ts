import { describe, it, expect } from 'vitest';
import { InningStateCreated } from './InningStateCreated';
import { InningStateId } from '../value-objects/InningStateId';
import { GameId } from '../value-objects/GameId';
import { DomainError } from '../errors/DomainError';

describe('InningStateCreated', () => {
  const inningStateId = new InningStateId('inning-state-123');
  const gameId = new GameId('test-game-456');

  describe('Construction', () => {
    it('should create InningStateCreated event with valid parameters', () => {
      const event = new InningStateCreated(
        inningStateId,
        gameId,
        3, // inning
        true // isTopHalf
      );

      expect(event.inningStateId).toBe(inningStateId);
      expect(event.gameId).toBe(gameId);
      expect(event.inning).toBe(3);
      expect(event.isTopHalf).toBe(true);
      expect(event.type).toBe('InningStateCreated');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new InningStateCreated(inningStateId, gameId, 1, false);

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const inningStateId2 = new InningStateId('inning-state-789');
      const event1 = new InningStateCreated(inningStateId, gameId, 1, true);
      const event2 = new InningStateCreated(inningStateId2, gameId, 2, false);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new InningStateCreated(inningStateId, gameId, 1, true);
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('InningStateId Validation', () => {
    it('should reject null inningStateId', () => {
      // @ts-expect-error - Testing null validation
      expect(() => new InningStateCreated(null, gameId, 1, true)).toThrow(
        new DomainError('InningStateId cannot be null or undefined')
      );
    });

    it('should reject undefined inningStateId', () => {
      // @ts-expect-error - Testing undefined validation
      expect(() => new InningStateCreated(undefined, gameId, 1, true)).toThrow(
        new DomainError('InningStateId cannot be null or undefined')
      );
    });
  });

  describe('GameId Validation', () => {
    it('should reject null gameId', () => {
      // @ts-expect-error - Testing null validation
      expect(() => new InningStateCreated(inningStateId, null, 1, true)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });

    it('should reject undefined gameId', () => {
      // @ts-expect-error - Testing undefined validation
      expect(() => new InningStateCreated(inningStateId, undefined, 1, true)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(() => new InningStateCreated(inningStateId, gameId, inning, true)).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(() => new InningStateCreated(inningStateId, gameId, 0, true)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );

      expect(() => new InningStateCreated(inningStateId, gameId, -1, true)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );
    });

    it('should reject non-number inning', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new InningStateCreated(inningStateId, gameId, 'invalid', true)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject NaN inning', () => {
      expect(() => new InningStateCreated(inningStateId, gameId, NaN, true)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject non-finite inning', () => {
      expect(() => new InningStateCreated(inningStateId, gameId, Infinity, true)).toThrow(
        new DomainError('Inning must be a finite number')
      );

      expect(() => new InningStateCreated(inningStateId, gameId, -Infinity, true)).toThrow(
        new DomainError('Inning must be a finite number')
      );
    });

    it('should reject non-integer inning', () => {
      expect(() => new InningStateCreated(inningStateId, gameId, 1.5, true)).toThrow(
        new DomainError('Inning must be an integer')
      );
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new InningStateCreated(inningStateId, gameId, 7, false);

      // Verify all properties are present and have correct values
      expect(event.inningStateId).toBe(inningStateId);
      expect(event.gameId).toBe(gameId);
      expect(event.inning).toBe(7);
      expect(event.isTopHalf).toBe(false);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.inningStateId = new InningStateId('other'); // TS Error: Cannot assign to 'inningStateId' because it is a read-only property
      // event.gameId = new GameId('other');              // TS Error: Cannot assign to 'gameId' because it is a read-only property
      // event.inning = 999;                              // TS Error: Cannot assign to 'inning' because it is a read-only property
      // event.isTopHalf = true;                          // TS Error: Cannot assign to 'isTopHalf' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const inningStateId2 = new InningStateId('inning-state-789');
      const gameId2 = new GameId('test-game-789');

      const event1 = new InningStateCreated(inningStateId, gameId, 1, true);
      const event2 = new InningStateCreated(inningStateId2, gameId2, 2, false);

      // Each event should have its own values
      expect(event1.inningStateId).toBe(inningStateId);
      expect(event1.gameId).toBe(gameId);
      expect(event1.inning).toBe(1);
      expect(event1.isTopHalf).toBe(true);

      expect(event2.inningStateId).toBe(inningStateId2);
      expect(event2.gameId).toBe(gameId2);
      expect(event2.inning).toBe(2);
      expect(event2.isTopHalf).toBe(false);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new InningStateCreated(inningStateId, gameId, 9, true);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('InningStateCreated');
      expect(parsed.version).toBe(1);
      expect(parsed.inningStateId.value).toBe(inningStateId.value);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.inning).toBe(9);
      expect(parsed.isTopHalf).toBe(true);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid values
      const minEvent = new InningStateCreated(
        inningStateId,
        gameId,
        1, // min inning
        true // top half
      );

      expect(minEvent.inning).toBe(1);
      expect(minEvent.isTopHalf).toBe(true);

      // Maximum practical values
      const maxEvent = new InningStateCreated(
        inningStateId,
        gameId,
        999, // high inning number (no upper limit for extra innings)
        false // bottom half
      );

      expect(maxEvent.inning).toBe(999);
      expect(maxEvent.isTopHalf).toBe(false);
    });

    it('should work with different inning state creation scenarios', () => {
      const scenarios = [
        { inning: 1, isTop: true, desc: 'Game start - top 1st' },
        { inning: 1, isTop: false, desc: 'Game start - bottom 1st' },
        { inning: 7, isTop: true, desc: 'Mid-game - top 7th' },
        { inning: 12, isTop: false, desc: 'Extra innings - bottom 12th' },
        { inning: 21, isTop: true, desc: 'Marathon game - top 21st' },
      ];

      scenarios.forEach((scenario, index) => {
        const uniqueInningStateId = new InningStateId(`inning-state-${index}`);
        const event = new InningStateCreated(
          uniqueInningStateId,
          gameId,
          scenario.inning,
          scenario.isTop
        );

        expect(event.inningStateId).toBe(uniqueInningStateId);
        expect(event.inning).toBe(scenario.inning);
        expect(event.isTopHalf).toBe(scenario.isTop);
      });
    });

    it('should work with generated InningStateId', () => {
      const generatedId = InningStateId.generate();
      const event = new InningStateCreated(generatedId, gameId, 1, true);

      expect(event.inningStateId).toBe(generatedId);
      expect(event.inningStateId.value).toBeDefined();
      expect(event.inningStateId.value.length).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new InningStateCreated(inningStateId, gameId, 1, true);

      // Verify the type is the expected string literal
      expect(event.type).toBe('InningStateCreated');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('InningStateCreated');
    });

    it('should handle boolean isTopHalf parameter correctly', () => {
      // Test true value (top half / away team batting)
      const topHalfEvent = new InningStateCreated(inningStateId, gameId, 1, true);
      expect(topHalfEvent.isTopHalf).toBe(true);
      expect(typeof topHalfEvent.isTopHalf).toBe('boolean');

      // Test false value (bottom half / home team batting)
      const bottomHalfEvent = new InningStateCreated(inningStateId, gameId, 1, false);
      expect(bottomHalfEvent.isTopHalf).toBe(false);
      expect(typeof bottomHalfEvent.isTopHalf).toBe('boolean');
    });

    it('should maintain proper value object types', () => {
      const event = new InningStateCreated(inningStateId, gameId, 1, true);

      expect(event.inningStateId).toBeInstanceOf(InningStateId);
      expect(event.gameId).toBeInstanceOf(GameId);
      expect(typeof event.inning).toBe('number');
      expect(typeof event.isTopHalf).toBe('boolean');
    });
  });

  describe('Business Context', () => {
    it('should capture complete aggregate creation state for event sourcing', () => {
      const event = new InningStateCreated(inningStateId, gameId, 5, true);

      // Verify all necessary information is captured for aggregate reconstruction
      expect(event.inningStateId).toBeDefined(); // Aggregate root identity
      expect(event.gameId).toBeDefined(); // Parent game relationship
      expect(event.inning).toBe(5); // Initial inning number
      expect(event.isTopHalf).toBe(true); // Initial half-inning state

      // This information allows event sourcing to:
      // 1. Create the InningState aggregate with proper identity
      // 2. Link it to the correct parent game
      // 3. Initialize with the correct inning and half-inning state
      // 4. Establish the baseline for all subsequent inning state events
    });

    it('should work as first event in InningState aggregate lifecycle', () => {
      // This event typically starts the InningState aggregate's event stream
      const creationEvent = new InningStateCreated(InningStateId.generate(), gameId, 1, true);

      // Should have standard DomainEvent properties for event ordering
      expect(creationEvent.eventId).toBeDefined();
      expect(creationEvent.timestamp).toBeInstanceOf(Date);
      expect(creationEvent.version).toBe(1);

      // Should establish the aggregate's initial state
      expect(creationEvent.inning).toBe(1);
      expect(creationEvent.isTopHalf).toBe(true);
    });

    it('should support different game flow scenarios', () => {
      // Normal game start
      const gameStart = new InningStateCreated(
        InningStateId.generate(),
        gameId,
        1,
        true // Always start with top half (away team bats first)
      );

      expect(gameStart.inning).toBe(1);
      expect(gameStart.isTopHalf).toBe(true);

      // Resume from suspended game (hypothetical)
      const resumedGame = new InningStateCreated(
        InningStateId.generate(),
        gameId,
        6,
        false // Resuming in bottom 6th
      );

      expect(resumedGame.inning).toBe(6);
      expect(resumedGame.isTopHalf).toBe(false);
    });
  });
});
