import { describe, it, expect } from 'vitest';

import { TestPlayerFactory, EventTestHelper } from '../test-utils/index.js';
import {
  createAdvanceEvent,
  baseToBaseScenarios,
  batterAdvancementScenarios,
  runnerOutScenarios,
  validationErrorScenarios,
  advanceReasonScenarios,
} from '../test-utils/RunnerAdvancedTestHelpers.js';
import { Base } from '../value-objects/BasesState.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { RunnerAdvanced, AdvanceReason } from './RunnerAdvanced.js';

describe('RunnerAdvanced', () => {
  // Use EventTestHelper for consistent test data
  const gameId = EventTestHelper.createGameId('runner-advanced');
  const runnerId = TestPlayerFactory.createPlayers(1)[0]!.playerId;

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
      const event = createAdvanceEvent('FIRST', 'SECOND', AdvanceReason.HIT, gameId, runnerId);

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
    it.each(baseToBaseScenarios)('should allow $description', scenario => {
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

  describe('Batter Advancement (from null)', () => {
    it.each(batterAdvancementScenarios)('should allow $description', scenario => {
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

  describe('Runner Getting Out', () => {
    it.each(runnerOutScenarios)('should allow $description', scenario => {
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

  describe('Validation Rules', () => {
    it.each(validationErrorScenarios)('should reject $description', scenario => {
      expect(
        () => new RunnerAdvanced(gameId, runnerId, scenario.from, scenario.to, scenario.reason)
      ).toThrow(
        expect.objectContaining({
          message: scenario.expectedError,
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

    it.each(advanceReasonScenarios)('should store correct reason for $description', scenario => {
      const event = new RunnerAdvanced(
        gameId,
        runnerId,
        scenario.from,
        scenario.to,
        scenario.reason
      );
      expect(event.reason).toBe(scenario.reason);
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

    it.each(advanceReasonScenarios)('should work with $description', scenario => {
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
