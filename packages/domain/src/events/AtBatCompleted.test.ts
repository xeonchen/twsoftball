import { describe, it, expect } from 'vitest';
import { AtBatCompleted } from './AtBatCompleted';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';
import { AtBatResultType } from '../constants/AtBatResultType';
import { DomainError } from '../errors/DomainError';

describe('AtBatCompleted', () => {
  const gameId = new GameId('test-game-123');
  const batterId = new PlayerId('player-456');

  describe('Construction', () => {
    it('should create AtBatCompleted event with valid parameters', () => {
      const event = new AtBatCompleted(
        gameId,
        batterId,
        5, // battingSlot
        AtBatResultType.SINGLE,
        3, // inning
        1 // outs
      );

      expect(event.gameId).toBe(gameId);
      expect(event.batterId).toBe(batterId);
      expect(event.battingSlot).toBe(5);
      expect(event.result).toBe(AtBatResultType.SINGLE);
      expect(event.inning).toBe(3);
      expect(event.outs).toBe(1);
      expect(event.type).toBe('AtBatCompleted');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.HOME_RUN, 1, 0);

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 0);
      const event2 = new AtBatCompleted(gameId, batterId, 2, AtBatResultType.DOUBLE, 1, 1);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 0);
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Batting Slot Validation', () => {
    it('should accept valid batting slots (1-20)', () => {
      for (let slot = 1; slot <= 20; slot += 1) {
        expect(
          () => new AtBatCompleted(gameId, batterId, slot, AtBatResultType.SINGLE, 1, 0)
        ).not.toThrow();
      }
    });

    it('should reject batting slot less than 1', () => {
      expect(() => new AtBatCompleted(gameId, batterId, 0, AtBatResultType.SINGLE, 1, 0)).toThrow(
        new DomainError('Batting slot must be between 1 and 20')
      );

      expect(() => new AtBatCompleted(gameId, batterId, -1, AtBatResultType.SINGLE, 1, 0)).toThrow(
        new DomainError('Batting slot must be between 1 and 20')
      );
    });

    it('should reject batting slot greater than 20', () => {
      expect(() => new AtBatCompleted(gameId, batterId, 21, AtBatResultType.SINGLE, 1, 0)).toThrow(
        new DomainError('Batting slot must be between 1 and 20')
      );

      expect(() => new AtBatCompleted(gameId, batterId, 25, AtBatResultType.SINGLE, 1, 0)).toThrow(
        new DomainError('Batting slot must be between 1 and 20')
      );
    });

    it('should accept boundary batting slot values', () => {
      // Test slot 10 (previous boundary)
      expect(
        () => new AtBatCompleted(gameId, batterId, 10, AtBatResultType.DOUBLE, 1, 1)
      ).not.toThrow();

      // Test slot 20 (new maximum)
      expect(
        () => new AtBatCompleted(gameId, batterId, 20, AtBatResultType.TRIPLE, 2, 0)
      ).not.toThrow();

      // Test slots 15-19 (mid-range values)
      [15, 16, 17, 18, 19].forEach(slot => {
        expect(
          () => new AtBatCompleted(gameId, batterId, slot, AtBatResultType.WALK, 1, 2)
        ).not.toThrow();
      });
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(
          () => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, inning, 0)
        ).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(() => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 0, 0)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );

      expect(() => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, -1, 0)).toThrow(
        new DomainError('Inning must be 1 or greater')
      );
    });
  });

  describe('Outs Validation', () => {
    it('should accept valid out counts before at-bat (0-2)', () => {
      [0, 1, 2].forEach(outs => {
        expect(
          () => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, outs)
        ).not.toThrow();
      });
    });

    it('should reject outs before at-bat less than 0', () => {
      expect(() => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, -1)).toThrow(
        new DomainError('Outs before at-bat must be between 0 and 2')
      );
    });

    it('should reject outs before at-bat greater than 2', () => {
      expect(() => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 3)).toThrow(
        new DomainError('Outs before at-bat must be between 0 and 2')
      );

      expect(() => new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 5)).toThrow(
        new DomainError('Outs before at-bat must be between 0 and 2')
      );
    });

    it('should allow outs=2 with out-making result (demonstrates 3rd out scenario)', () => {
      // Test that we can have 2 outs before an at-bat that results in a ground out
      // This would make the 3rd out and end the inning
      expect(
        () =>
          new AtBatCompleted(
            gameId,
            batterId,
            1,
            AtBatResultType.GROUND_OUT,
            1,
            2 // 2 outs before this at-bat
          )
      ).not.toThrow();

      // Test with other out-making results
      expect(
        () =>
          new AtBatCompleted(
            gameId,
            batterId,
            2,
            AtBatResultType.STRIKEOUT,
            1,
            2 // 2 outs before this at-bat
          )
      ).not.toThrow();

      expect(
        () =>
          new AtBatCompleted(
            gameId,
            batterId,
            3,
            AtBatResultType.FLY_OUT,
            1,
            2 // 2 outs before this at-bat
          )
      ).not.toThrow();
    });
  });

  describe('Result Validation', () => {
    it('should accept all valid AtBatResultType values', () => {
      Object.values(AtBatResultType).forEach(resultType => {
        expect(() => new AtBatCompleted(gameId, batterId, 1, resultType, 1, 0)).not.toThrow();
      });
    });

    it('should store the correct result type', () => {
      const homeRunEvent = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.HOME_RUN, 1, 0);
      const strikeoutEvent = new AtBatCompleted(
        gameId,
        batterId,
        2,
        AtBatResultType.STRIKEOUT,
        1,
        1
      );
      const walkEvent = new AtBatCompleted(gameId, batterId, 3, AtBatResultType.WALK, 1, 2);

      expect(homeRunEvent.result).toBe(AtBatResultType.HOME_RUN);
      expect(strikeoutEvent.result).toBe(AtBatResultType.STRIKEOUT);
      expect(walkEvent.result).toBe(AtBatResultType.WALK);
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new AtBatCompleted(gameId, batterId, 5, AtBatResultType.DOUBLE, 3, 1);

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.batterId).toBe(batterId);
      expect(event.battingSlot).toBe(5);
      expect(event.result).toBe(AtBatResultType.DOUBLE);
      expect(event.inning).toBe(3);
      expect(event.outs).toBe(1);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.battingSlot = 999; // TS Error: Cannot assign to 'battingSlot' because it is a read-only property
      // event.inning = 999;      // TS Error: Cannot assign to 'inning' because it is a read-only property
      // event.outs = 999;        // TS Error: Cannot assign to 'outs' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const event1 = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 0);
      const event2 = new AtBatCompleted(gameId, batterId, 2, AtBatResultType.DOUBLE, 2, 1);

      // Each event should have its own values
      expect(event1.battingSlot).toBe(1);
      expect(event1.result).toBe(AtBatResultType.SINGLE);
      expect(event1.inning).toBe(1);
      expect(event1.outs).toBe(0);

      expect(event2.battingSlot).toBe(2);
      expect(event2.result).toBe(AtBatResultType.DOUBLE);
      expect(event2.inning).toBe(2);
      expect(event2.outs).toBe(1);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new AtBatCompleted(gameId, batterId, 7, AtBatResultType.TRIPLE, 4, 2);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('AtBatCompleted');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.batterId.value).toBe(batterId.value);
      expect(parsed.battingSlot).toBe(7);
      expect(parsed.result).toBe(AtBatResultType.TRIPLE);
      expect(parsed.inning).toBe(4);
      expect(parsed.outs).toBe(2);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid values
      const minEvent = new AtBatCompleted(
        gameId,
        batterId,
        1, // min batting slot
        AtBatResultType.SINGLE,
        1, // min inning
        0 // min outs before at-bat
      );

      expect(minEvent.battingSlot).toBe(1);
      expect(minEvent.inning).toBe(1);
      expect(minEvent.outs).toBe(0);

      // Maximum valid values
      const maxEvent = new AtBatCompleted(
        gameId,
        batterId,
        20, // max batting slot
        AtBatResultType.TRIPLE_PLAY,
        999, // high inning number (no upper limit)
        2 // max outs before at-bat
      );

      expect(maxEvent.battingSlot).toBe(20);
      expect(maxEvent.inning).toBe(999);
      expect(maxEvent.outs).toBe(2);
    });

    it('should work with different result types and contexts', () => {
      const scenarios = [
        { result: AtBatResultType.HOME_RUN, inning: 1, outs: 0, slot: 4 },
        { result: AtBatResultType.STRIKEOUT, inning: 9, outs: 2, slot: 20 },
        { result: AtBatResultType.WALK, inning: 7, outs: 1, slot: 1 },
        { result: AtBatResultType.DOUBLE_PLAY, inning: 5, outs: 0, slot: 6 },
        { result: AtBatResultType.SACRIFICE_FLY, inning: 3, outs: 1, slot: 2 },
      ];

      scenarios.forEach(scenario => {
        const event = new AtBatCompleted(
          gameId,
          batterId,
          scenario.slot,
          scenario.result,
          scenario.inning,
          scenario.outs
        );

        expect(event.result).toBe(scenario.result);
        expect(event.inning).toBe(scenario.inning);
        expect(event.outs).toBe(scenario.outs);
        expect(event.battingSlot).toBe(scenario.slot);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 0);

      // Verify the type is the expected string literal
      expect(event.type).toBe('AtBatCompleted');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('AtBatCompleted');
    });
  });
});
