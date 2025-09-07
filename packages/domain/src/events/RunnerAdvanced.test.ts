import { describe, it, expect } from 'vitest';

import { TestPlayerFactory, EventTestHelper } from '../test-utils';
import { Base } from '../value-objects/BasesState';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';

import { RunnerAdvanced, AdvanceReason } from './RunnerAdvanced';

describe('RunnerAdvanced', () => {
  // Use EventTestHelper for consistent test data
  const gameId = EventTestHelper.createGameId('runner-advanced');
  const runnerId = TestPlayerFactory.createPlayers(1)[0]!.playerId;

  // Helper function to reduce RunnerAdvanced instantiation duplication
  const createAdvanceEvent = (
    from: Base | null,
    to: Base | 'HOME' | 'OUT',
    reason: AdvanceReason = AdvanceReason.HIT,
    customGameId?: GameId,
    customRunnerId?: PlayerId
  ): RunnerAdvanced =>
    new RunnerAdvanced(customGameId ?? gameId, customRunnerId ?? runnerId, from, to, reason);

  describe('AdvanceReason enum', () => {
    it('should have all valid advance reasons', () => {
      expect(AdvanceReason.HIT).toBe('HIT');
      expect(AdvanceReason.WALK).toBe('WALK');
      expect(AdvanceReason.SACRIFICE).toBe('SACRIFICE');
      expect(AdvanceReason.ERROR).toBe('ERROR');
      expect(AdvanceReason.FIELDERS_CHOICE).toBe('FIELDERS_CHOICE');
      expect(AdvanceReason.STOLEN_BASE).toBe('STOLEN_BASE');
      expect(AdvanceReason.WILD_PITCH).toBe('WILD_PITCH');
      expect(AdvanceReason.BALK).toBe('BALK');
      expect(AdvanceReason.FORCE).toBe('FORCE');
    });

    it('should have exactly 9 advance reasons', () => {
      const reasons = Object.values(AdvanceReason);
      expect(reasons).toHaveLength(9);
    });
  });

  describe('Construction', () => {
    it('should create RunnerAdvanced event with valid parameters', () => {
      const event = createAdvanceEvent('FIRST', 'SECOND');

      expect(event.gameId).toBe(gameId);
      expect(event.runnerId).toBe(runnerId);
      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('SECOND');
      expect(event.reason).toBe(AdvanceReason.HIT);
      expect(event.type).toBe('RunnerAdvanced');
    });

    it('should inherit DomainEvent properties', () => {
      const event = createAdvanceEvent('SECOND', 'THIRD', AdvanceReason.STOLEN_BASE);

      // Use EventTestHelper to validate basic event properties
      EventTestHelper.assertEventValid(event);
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = createAdvanceEvent('FIRST', 'SECOND');
      const event2 = createAdvanceEvent('SECOND', 'THIRD', AdvanceReason.WALK);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = createAdvanceEvent('FIRST', 'SECOND');
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Base-to-Base Advancement', () => {
    it('should allow advancement from FIRST to SECOND', () => {
      const event = new RunnerAdvanced(gameId, runnerId, 'FIRST', 'SECOND', AdvanceReason.HIT);

      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('SECOND');
    });

    it('should allow advancement from SECOND to THIRD', () => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        'SECOND',
        'THIRD',
        AdvanceReason.SACRIFICE
      );

      expect(event.from).toBe('SECOND');
      expect(event.to).toBe('THIRD');
    });

    it('should allow advancement from THIRD to HOME', () => {
      const event = createAdvanceEvent('THIRD', 'HOME');

      expect(event.from).toBe('THIRD');
      expect(event.to).toBe('HOME');
    });

    it('should allow multiple base advancement (FIRST to THIRD)', () => {
      const event = createAdvanceEvent('FIRST', 'THIRD');

      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('THIRD');
    });

    it('should allow advancement from FIRST to HOME', () => {
      const event = createAdvanceEvent('FIRST', 'HOME');

      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('HOME');
    });

    it('should allow advancement from SECOND to HOME', () => {
      const event = createAdvanceEvent('SECOND', 'HOME');

      expect(event.from).toBe('SECOND');
      expect(event.to).toBe('HOME');
    });
  });

  describe('Batter Advancement (from null)', () => {
    it('should allow batter advancing to FIRST', () => {
      const event = new RunnerAdvanced(gameId, runnerId, null, 'FIRST', AdvanceReason.HIT);

      expect(event.from).toBeNull();
      expect(event.to).toBe('FIRST');
    });

    it('should allow batter advancing to SECOND (double)', () => {
      const event = new RunnerAdvanced(gameId, runnerId, null, 'SECOND', AdvanceReason.HIT);

      expect(event.from).toBeNull();
      expect(event.to).toBe('SECOND');
    });

    it('should allow batter advancing to THIRD (triple)', () => {
      const event = new RunnerAdvanced(gameId, runnerId, null, 'THIRD', AdvanceReason.HIT);

      expect(event.from).toBeNull();
      expect(event.to).toBe('THIRD');
    });

    it('should allow batter advancing to HOME (home run)', () => {
      const event = new RunnerAdvanced(gameId, runnerId, null, 'HOME', AdvanceReason.HIT);

      expect(event.from).toBeNull();
      expect(event.to).toBe('HOME');
    });
  });

  describe('Runner Getting Out', () => {
    it('should allow runner getting out from FIRST', () => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        'FIRST',
        'OUT',
        AdvanceReason.FIELDERS_CHOICE
      );

      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('OUT');
    });

    it('should allow runner getting out from SECOND', () => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        'SECOND',
        'OUT',
        AdvanceReason.FIELDERS_CHOICE
      );

      expect(event.from).toBe('SECOND');
      expect(event.to).toBe('OUT');
    });

    it('should allow runner getting out from THIRD', () => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        'THIRD',
        'OUT',
        AdvanceReason.FIELDERS_CHOICE
      );

      expect(event.from).toBe('THIRD');
      expect(event.to).toBe('OUT');
    });

    it('should allow batter getting out (from null)', () => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        null,
        'OUT',
        AdvanceReason.FIELDERS_CHOICE
      );

      expect(event.from).toBeNull();
      expect(event.to).toBe('OUT');
    });
  });

  describe('Validation Rules', () => {
    it('should reject advancement from base to same base', () => {
      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'FIRST', 'FIRST', AdvanceReason.HIT)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance from and to the same base',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'SECOND', 'SECOND', AdvanceReason.WALK)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance from and to the same base',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'THIRD', 'THIRD', AdvanceReason.SACRIFICE)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance from and to the same base',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should reject backward advancement', () => {
      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'SECOND', 'FIRST', AdvanceReason.HIT)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance backward from SECOND to FIRST',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'THIRD', 'FIRST', AdvanceReason.WALK)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance backward from THIRD to FIRST',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () => new RunnerAdvanced(gameId, runnerId, 'THIRD', 'SECOND', AdvanceReason.SACRIFICE)
      ).toThrow(
        expect.objectContaining({
          message: 'Runner cannot advance backward from THIRD to SECOND',
          name: 'DomainError',
        }) as Error
      );
    });

    // Note: Tests for 'HOME' and 'OUT' as 'from' values removed since
    // TypeScript's type system (Base | null) prevents these invalid states
  });

  describe('Advance Reasons Validation', () => {
    it('should accept all valid advance reasons', () => {
      Object.values(AdvanceReason).forEach(reason => {
        expect(() => new RunnerAdvanced(gameId, runnerId, 'FIRST', 'SECOND', reason)).not.toThrow();
      });
    });

    it('should store the correct advance reason', () => {
      const hitEvent = new RunnerAdvanced(gameId, runnerId, 'FIRST', 'SECOND', AdvanceReason.HIT);
      const walkEvent = new RunnerAdvanced(gameId, runnerId, 'SECOND', 'THIRD', AdvanceReason.WALK);
      const stolenEvent = new RunnerAdvanced(
        gameId,
        runnerId,
        'FIRST',
        'SECOND',
        AdvanceReason.STOLEN_BASE
      );

      expect(hitEvent.reason).toBe(AdvanceReason.HIT);
      expect(walkEvent.reason).toBe(AdvanceReason.WALK);
      expect(stolenEvent.reason).toBe(AdvanceReason.STOLEN_BASE);
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new RunnerAdvanced(gameId, runnerId, 'FIRST', 'THIRD', AdvanceReason.HIT);

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.runnerId).toBe(runnerId);
      expect(event.from).toBe('FIRST');
      expect(event.to).toBe('THIRD');
      expect(event.reason).toBe(AdvanceReason.HIT);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.from = 'SECOND';    // TS Error: Cannot assign to 'from' because it is a read-only property
      // event.to = 'HOME';        // TS Error: Cannot assign to 'to' because it is a read-only property
      // event.reason = AdvanceReason.WALK; // TS Error: Cannot assign to 'reason' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const event1 = new RunnerAdvanced(gameId, runnerId, 'FIRST', 'SECOND', AdvanceReason.HIT);
      const event2 = new RunnerAdvanced(gameId, runnerId, 'THIRD', 'HOME', AdvanceReason.SACRIFICE);

      // Each event should have its own values
      expect(event1.from).toBe('FIRST');
      expect(event1.to).toBe('SECOND');
      expect(event1.reason).toBe(AdvanceReason.HIT);

      expect(event2.from).toBe('THIRD');
      expect(event2.to).toBe('HOME');
      expect(event2.reason).toBe(AdvanceReason.SACRIFICE);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new RunnerAdvanced(gameId, runnerId, 'SECOND', 'HOME', AdvanceReason.HIT);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('RunnerAdvanced');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.runnerId.value).toBe(runnerId.value);
      expect(parsed.from).toBe('SECOND');
      expect(parsed.to).toBe('HOME');
      expect(parsed.reason).toBe(AdvanceReason.HIT);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });

    it('should handle null from value in serialization', () => {
      const event = new RunnerAdvanced(gameId, runnerId, null, 'FIRST', AdvanceReason.WALK);

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.from).toBeNull();
      expect(parsed.to).toBe('FIRST');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all valid combinations of base movements', () => {
      const bases: (Base | null)[] = [null, 'FIRST', 'SECOND', 'THIRD'];
      const destinations: (Base | 'HOME' | 'OUT')[] = ['FIRST', 'SECOND', 'THIRD', 'HOME', 'OUT'];

      bases.forEach(from => {
        destinations.forEach(to => {
          // Skip invalid combinations
          if (from === to) return; // Same base
          // Note: from can never be 'HOME' or 'OUT' based on Base | null type, so these checks are redundant

          // Skip backward movements
          if (from === 'SECOND' && to === 'FIRST') return;
          if (from === 'THIRD' && (to === 'FIRST' || to === 'SECOND')) return;

          expect(
            () => new RunnerAdvanced(gameId, runnerId, from, to, AdvanceReason.HIT)
          ).not.toThrow();
        });
      });
    });

    it('should work with different advance reasons and contexts', () => {
      const scenarios = [
        { from: null, to: 'FIRST' as const, reason: AdvanceReason.WALK },
        { from: 'FIRST' as const, to: 'SECOND' as const, reason: AdvanceReason.STOLEN_BASE },
        { from: 'SECOND' as const, to: 'HOME' as const, reason: AdvanceReason.SACRIFICE },
        { from: 'THIRD' as const, to: 'OUT' as const, reason: AdvanceReason.FIELDERS_CHOICE },
        { from: null, to: 'HOME' as const, reason: AdvanceReason.HIT },
        { from: 'FIRST' as const, to: 'THIRD' as const, reason: AdvanceReason.ERROR },
        { from: 'SECOND' as const, to: 'THIRD' as const, reason: AdvanceReason.WILD_PITCH },
        { from: 'FIRST' as const, to: 'SECOND' as const, reason: AdvanceReason.BALK },
        { from: null, to: 'SECOND' as const, reason: AdvanceReason.HIT },
      ];

      scenarios.forEach(scenario => {
        const event = new RunnerAdvanced(
          gameId,
          runnerId,
          scenario.from,
          scenario.to,
          scenario.reason
        );

        expect(event.from).toBe(scenario.from);
        expect(event.to).toBe(scenario.to);
        expect(event.reason).toBe(scenario.reason);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new RunnerAdvanced(gameId, runnerId, 'FIRST', 'SECOND', AdvanceReason.HIT);

      // Verify the type is the expected string literal
      expect(event.type).toBe('RunnerAdvanced');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('RunnerAdvanced');
    });

    it('should work with different PlayerId instances', () => {
      const runner1 = PlayerId.generate();
      const runner2 = PlayerId.generate();

      const event1 = new RunnerAdvanced(gameId, runner1, 'FIRST', 'SECOND', AdvanceReason.HIT);
      const event2 = new RunnerAdvanced(gameId, runner2, 'SECOND', 'THIRD', AdvanceReason.WALK);

      expect(event1.runnerId).toBe(runner1);
      expect(event2.runnerId).toBe(runner2);
      expect(event1.runnerId).not.toBe(event2.runnerId);
    });

    it('should work with different GameId instances', () => {
      const game1 = EventTestHelper.createGameId('game-1');
      const game2 = EventTestHelper.createGameId('game-2');

      const event1 = new RunnerAdvanced(game1, runnerId, 'FIRST', 'SECOND', AdvanceReason.HIT);
      const event2 = new RunnerAdvanced(game2, runnerId, 'SECOND', 'THIRD', AdvanceReason.WALK);

      expect(event1.gameId).toBe(game1);
      expect(event2.gameId).toBe(game2);
      expect(event1.gameId).not.toBe(event2.gameId);
    });
  });
});
