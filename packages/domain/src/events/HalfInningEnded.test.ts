import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';

import { HalfInningEnded } from './HalfInningEnded.js';

describe('HalfInningEnded', () => {
  const gameId = new GameId('test-game-123');

  describe('Construction', () => {
    it('should create HalfInningEnded event with valid parameters', () => {
      const event = new HalfInningEnded(
        gameId,
        3, // inning
        true, // wasTopHalf
        3, // finalOuts
        1, // awayTeamBatterSlot
        1 // homeTeamBatterSlot
      );

      expect(event.gameId).toBe(gameId);
      expect(event.inning).toBe(3);
      expect(event.wasTopHalf).toBe(true);
      expect(event.finalOuts).toBe(3);
      expect(event.type).toBe('HalfInningEnded');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new HalfInningEnded(gameId, 1, false, 3, 1, 1);

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = new HalfInningEnded(gameId, 1, true, 3, 1, 1);
      const event2 = new HalfInningEnded(gameId, 2, false, 2, 1, 1);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new HalfInningEnded(gameId, 1, true, 3, 1, 1);
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('GameId Validation', () => {
    it('should reject null gameId', () => {
      // @ts-expect-error - Testing null validation
      expect(() => new HalfInningEnded(null, 1, true, 3, 1, 1)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });

    it('should reject undefined gameId', () => {
      // @ts-expect-error - Testing undefined validation
      expect(() => new HalfInningEnded(undefined, 1, true, 3, 1, 1)).toThrow(
        new DomainError('GameId cannot be null or undefined')
      );
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(() => new HalfInningEnded(gameId, inning, true, 3, 1, 1)).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(() => new HalfInningEnded(gameId, 0, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );

      expect(() => new HalfInningEnded(gameId, -1, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );
    });

    it('should reject non-number inning', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new HalfInningEnded(gameId, 'invalid', true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject NaN inning', () => {
      expect(() => new HalfInningEnded(gameId, NaN, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be a valid number')
      );
    });

    it('should reject non-finite inning', () => {
      expect(() => new HalfInningEnded(gameId, Infinity, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be a finite number')
      );

      expect(() => new HalfInningEnded(gameId, -Infinity, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be a finite number')
      );
    });

    it('should reject non-integer inning', () => {
      expect(() => new HalfInningEnded(gameId, 1.5, true, 3, 1, 1)).toThrow(
        new DomainError('Inning must be an integer')
      );
    });
  });

  describe('Final Outs Validation', () => {
    it('should accept valid final outs (0-5)', () => {
      [0, 1, 2, 3, 4, 5].forEach(outs => {
        expect(() => new HalfInningEnded(gameId, 1, true, outs, 1, 1)).not.toThrow();
      });
    });

    it('should reject final outs less than 0', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, -1, 1, 1)).toThrow(
        new DomainError('Final outs must be between 0 and 5')
      );
    });

    it('should reject final outs greater than 5', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 6, 1, 1)).toThrow(
        new DomainError('Final outs must be between 0 and 5')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 10, 1, 1)).toThrow(
        new DomainError('Final outs must be between 0 and 5')
      );
    });

    it('should reject non-number final outs', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new HalfInningEnded(gameId, 1, true, 'invalid', 1, 1)).toThrow(
        new DomainError('Final outs must be a valid number')
      );
    });

    it('should reject NaN final outs', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, NaN, 1, 1)).toThrow(
        new DomainError('Final outs must be a valid number')
      );
    });

    it('should reject non-finite final outs', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, Infinity, 1, 1)).toThrow(
        new DomainError('Final outs must be a finite number')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, -Infinity, 1, 1)).toThrow(
        new DomainError('Final outs must be a finite number')
      );
    });

    it('should reject non-integer final outs', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 2.5, 1, 1)).toThrow(
        new DomainError('Final outs must be an integer')
      );
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new HalfInningEnded(gameId, 7, false, 2, 1, 1);

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.inning).toBe(7);
      expect(event.wasTopHalf).toBe(false);
      expect(event.finalOuts).toBe(2);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.inning = 999;        // TS Error: Cannot assign to 'inning' because it is a read-only property
      // event.wasTopHalf = true;   // TS Error: Cannot assign to 'wasTopHalf' because it is a read-only property
      // event.finalOuts = 999;     // TS Error: Cannot assign to 'finalOuts' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const event1 = new HalfInningEnded(gameId, 1, true, 3, 1, 1);
      const event2 = new HalfInningEnded(gameId, 2, false, 1, 1, 1);

      // Each event should have its own values
      expect(event1.inning).toBe(1);
      expect(event1.wasTopHalf).toBe(true);
      expect(event1.finalOuts).toBe(3);

      expect(event2.inning).toBe(2);
      expect(event2.wasTopHalf).toBe(false);
      expect(event2.finalOuts).toBe(1);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new HalfInningEnded(gameId, 9, true, 2, 1, 1);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('HalfInningEnded');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.inning).toBe(9);
      expect(parsed.wasTopHalf).toBe(true);
      expect(parsed.finalOuts).toBe(2);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid values
      const minEvent = new HalfInningEnded(
        gameId,
        1, // min inning
        true, // was top half
        0, // min final outs (walkoff scenario)
        1, // awayTeamBatterSlot
        1 // homeTeamBatterSlot
      );

      expect(minEvent.inning).toBe(1);
      expect(minEvent.wasTopHalf).toBe(true);
      expect(minEvent.finalOuts).toBe(0);

      // Maximum valid values
      const maxEvent = new HalfInningEnded(
        gameId,
        999, // high inning number (no upper limit)
        false, // was bottom half
        5, // max final outs (extended inning scenario)
        1, // awayTeamBatterSlot
        1 // homeTeamBatterSlot
      );

      expect(maxEvent.inning).toBe(999);
      expect(maxEvent.wasTopHalf).toBe(false);
      expect(maxEvent.finalOuts).toBe(5);
    });

    it('should work with different half-inning scenarios', () => {
      const scenarios = [
        { inning: 1, wasTop: true, outs: 3, desc: 'Normal top half ending' },
        { inning: 9, wasTop: false, outs: 0, desc: 'Walk-off bottom 9th' },
        { inning: 7, wasTop: true, outs: 2, desc: 'Mercy rule ending' },
        { inning: 12, wasTop: false, outs: 1, desc: 'Extra inning walkoff' },
        { inning: 3, wasTop: true, outs: 4, desc: 'Extended inning (errors)' },
      ];

      scenarios.forEach(scenario => {
        const event = new HalfInningEnded(
          gameId,
          scenario.inning,
          scenario.wasTop,
          scenario.outs,
          1,
          1
        );

        expect(event.inning).toBe(scenario.inning);
        expect(event.wasTopHalf).toBe(scenario.wasTop);
        expect(event.finalOuts).toBe(scenario.outs);
      });
    });

    it('should handle typical game flow transitions', () => {
      // Top half endings (away team just batted)
      const topHalfEnding = new HalfInningEnded(gameId, 3, true, 3, 1, 1);
      expect(topHalfEnding.wasTopHalf).toBe(true);
      expect(topHalfEnding.finalOuts).toBe(3);

      // Bottom half endings (home team just batted)
      const bottomHalfEnding = new HalfInningEnded(gameId, 3, false, 3, 1, 1);
      expect(bottomHalfEnding.wasTopHalf).toBe(false);
      expect(bottomHalfEnding.finalOuts).toBe(3);

      // Walkoff scenarios (game ends mid-bottom)
      const walkoffEnding = new HalfInningEnded(gameId, 7, false, 1, 1, 1);
      expect(walkoffEnding.wasTopHalf).toBe(false);
      expect(walkoffEnding.finalOuts).toBe(1); // Less than 3 outs
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new HalfInningEnded(gameId, 1, true, 3, 1, 1);

      // Verify the type is the expected string literal
      expect(event.type).toBe('HalfInningEnded');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('HalfInningEnded');
    });

    it('should handle boolean wasTopHalf parameter correctly', () => {
      // Test true value (away team just finished batting)
      const topHalfEvent = new HalfInningEnded(gameId, 1, true, 3, 1, 1);
      expect(topHalfEvent.wasTopHalf).toBe(true);
      expect(typeof topHalfEvent.wasTopHalf).toBe('boolean');

      // Test false value (home team just finished batting)
      const bottomHalfEvent = new HalfInningEnded(gameId, 1, false, 3, 1, 1);
      expect(bottomHalfEvent.wasTopHalf).toBe(false);
      expect(typeof bottomHalfEvent.wasTopHalf).toBe('boolean');
    });
  });

  describe('Away Team Batter Slot Validation', () => {
    it('should accept valid away team batter slots (1-20)', () => {
      [1, 10, 15, 20].forEach(slot => {
        expect(() => new HalfInningEnded(gameId, 1, true, 3, slot, 1)).not.toThrow();
      });
    });

    it('should reject non-number away team batter slot', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 'invalid', 1)).toThrow(
        new DomainError('Away team batter slot must be a valid number')
      );
    });

    it('should reject NaN away team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, NaN, 1)).toThrow(
        new DomainError('Away team batter slot must be a valid number')
      );
    });

    it('should reject non-finite away team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, Infinity, 1)).toThrow(
        new DomainError('Away team batter slot must be a finite number')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, -Infinity, 1)).toThrow(
        new DomainError('Away team batter slot must be a finite number')
      );
    });

    it('should reject away team batter slot less than 1', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 0, 1)).toThrow(
        new DomainError('Away team batter slot must be between 1 and 20')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, -1, 1)).toThrow(
        new DomainError('Away team batter slot must be between 1 and 20')
      );
    });

    it('should reject away team batter slot greater than 20', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 21, 1)).toThrow(
        new DomainError('Away team batter slot must be between 1 and 20')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, 100, 1)).toThrow(
        new DomainError('Away team batter slot must be between 1 and 20')
      );
    });

    it('should reject non-integer away team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1.5, 1)).toThrow(
        new DomainError('Away team batter slot must be an integer')
      );
    });
  });

  describe('Home Team Batter Slot Validation', () => {
    it('should accept valid home team batter slots (1-20)', () => {
      [1, 10, 15, 20].forEach(slot => {
        expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, slot)).not.toThrow();
      });
    });

    it('should reject non-number home team batter slot', () => {
      // @ts-expect-error - Testing string validation
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, 'invalid')).toThrow(
        new DomainError('Home team batter slot must be a valid number')
      );
    });

    it('should reject NaN home team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, NaN)).toThrow(
        new DomainError('Home team batter slot must be a valid number')
      );
    });

    it('should reject non-finite home team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, Infinity)).toThrow(
        new DomainError('Home team batter slot must be a finite number')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, -Infinity)).toThrow(
        new DomainError('Home team batter slot must be a finite number')
      );
    });

    it('should reject home team batter slot less than 1', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, 0)).toThrow(
        new DomainError('Home team batter slot must be between 1 and 20')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, -1)).toThrow(
        new DomainError('Home team batter slot must be between 1 and 20')
      );
    });

    it('should reject home team batter slot greater than 20', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, 21)).toThrow(
        new DomainError('Home team batter slot must be between 1 and 20')
      );

      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, 100)).toThrow(
        new DomainError('Home team batter slot must be between 1 and 20')
      );
    });

    it('should reject non-integer home team batter slot', () => {
      expect(() => new HalfInningEnded(gameId, 1, true, 3, 1, 1.5)).toThrow(
        new DomainError('Home team batter slot must be an integer')
      );
    });
  });

  describe('Business Context', () => {
    it('should capture complete half-inning state for event sourcing reconstruction', () => {
      const event = new HalfInningEnded(gameId, 5, true, 3, 1, 1);

      // Verify all necessary information is captured for state reconstruction
      expect(event.gameId).toBeDefined(); // Links to parent game
      expect(event.inning).toBe(5); // Which inning ended
      expect(event.wasTopHalf).toBe(true); // Which half ended (away team)
      expect(event.finalOuts).toBe(3); // How many outs when ended

      // This information allows event sourcing to:
      // 1. Identify which game the event belongs to
      // 2. Know exactly when in the game this occurred
      // 3. Determine what the next state should be (bottom 5th)
      // 4. Understand how the half-inning ended (normal vs walkoff)
    });
  });
});
