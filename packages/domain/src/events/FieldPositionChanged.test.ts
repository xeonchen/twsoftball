import { describe, it, expect } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

import { FieldPositionChanged } from './FieldPositionChanged';

describe('FieldPositionChanged', () => {
  const gameId = new GameId('test-game-123');
  const teamLineupId = new TeamLineupId('team-lineup-456');
  const playerId = new PlayerId('player-789');

  describe('Construction', () => {
    it('should create FieldPositionChanged event with valid parameters', () => {
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.FIRST_BASE,
        5 // inning
      );

      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.playerId).toBe(playerId);
      expect(event.fromPosition).toBe(FieldPosition.RIGHT_FIELD);
      expect(event.toPosition).toBe(FieldPosition.FIRST_BASE);
      expect(event.inning).toBe(5);
      expect(event.type).toBe('FieldPositionChanged');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.PITCHER,
        FieldPosition.FIRST_BASE,
        1
      );

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        1
      );
      const event2 = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        2
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        1
      );
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(
          () =>
            new FieldPositionChanged(
              gameId,
              teamLineupId,
              playerId,
              FieldPosition.PITCHER,
              FieldPosition.CATCHER,
              inning
            )
        ).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(
        () =>
          new FieldPositionChanged(
            gameId,
            teamLineupId,
            playerId,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            0
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Inning must be 1 or greater',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () =>
          new FieldPositionChanged(
            gameId,
            teamLineupId,
            playerId,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            -1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Inning must be 1 or greater',
          name: 'DomainError',
        }) as Error
      );
    });
  });

  describe('Position Validation', () => {
    it('should accept different from and to positions', () => {
      const positionPairs = [
        [FieldPosition.PITCHER, FieldPosition.FIRST_BASE],
        [FieldPosition.CATCHER, FieldPosition.THIRD_BASE],
        [FieldPosition.LEFT_FIELD, FieldPosition.RIGHT_FIELD],
        [FieldPosition.SHORT_FIELDER, FieldPosition.CENTER_FIELD],
        [FieldPosition.EXTRA_PLAYER, FieldPosition.SECOND_BASE],
      ];

      positionPairs.forEach(pair => {
        const from = pair[0];
        const to = pair[1];
        if (!from || !to) return;
        expect(
          () => new FieldPositionChanged(gameId, teamLineupId, playerId, from, to, 1)
        ).not.toThrow();
      });
    });

    it('should reject same from and to positions', () => {
      Object.values(FieldPosition).forEach(position => {
        expect(
          () =>
            new FieldPositionChanged(
              gameId,
              teamLineupId,
              playerId,
              position,
              position, // Same position
              1
            )
        ).toThrow(
          expect.objectContaining({
            message: 'From and to positions must be different',
            name: 'DomainError',
          }) as Error
        );
      });
    });

    it('should accept all valid FieldPosition values for from position', () => {
      Object.values(FieldPosition).forEach(fromPosition => {
        // Use a different position for 'to'
        const toPosition =
          fromPosition === FieldPosition.PITCHER ? FieldPosition.FIRST_BASE : FieldPosition.PITCHER;

        expect(
          () =>
            new FieldPositionChanged(gameId, teamLineupId, playerId, fromPosition, toPosition, 1)
        ).not.toThrow();
      });
    });

    it('should accept all valid FieldPosition values for to position', () => {
      Object.values(FieldPosition).forEach(toPosition => {
        // Use a different position for 'from'
        const fromPosition =
          toPosition === FieldPosition.PITCHER ? FieldPosition.CATCHER : FieldPosition.PITCHER;

        expect(
          () =>
            new FieldPositionChanged(gameId, teamLineupId, playerId, fromPosition, toPosition, 1)
        ).not.toThrow();
      });
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        8
      );

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.playerId).toBe(playerId);
      expect(event.fromPosition).toBe(FieldPosition.LEFT_FIELD);
      expect(event.toPosition).toBe(FieldPosition.CENTER_FIELD);
      expect(event.inning).toBe(8);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.fromPosition = FieldPosition.PITCHER;    // TS Error: Cannot assign to 'fromPosition' because it is a read-only property
      // event.toPosition = FieldPosition.CATCHER;      // TS Error: Cannot assign to 'toPosition' because it is a read-only property
      // event.inning = 999;                            // TS Error: Cannot assign to 'inning' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const event1 = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        1
      );
      const event2 = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        2
      );

      // Each event should have its own values
      expect(event1.fromPosition).toBe(FieldPosition.FIRST_BASE);
      expect(event1.toPosition).toBe(FieldPosition.SECOND_BASE);
      expect(event1.inning).toBe(1);

      expect(event2.fromPosition).toBe(FieldPosition.THIRD_BASE);
      expect(event2.toPosition).toBe(FieldPosition.SHORTSTOP);
      expect(event2.inning).toBe(2);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.SHORT_FIELDER,
        FieldPosition.RIGHT_FIELD,
        7
      );

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('FieldPositionChanged');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.teamLineupId.value).toBe(teamLineupId.value);
      expect(parsed.playerId.value).toBe(playerId.value);
      expect(parsed.fromPosition).toBe(FieldPosition.SHORT_FIELDER);
      expect(parsed.toPosition).toBe(FieldPosition.RIGHT_FIELD);
      expect(parsed.inning).toBe(7);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid inning
      const minEvent = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        1 // min inning
      );

      expect(minEvent.inning).toBe(1);

      // High inning number (no upper limit)
      const maxEvent = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.LEFT_FIELD,
        FieldPosition.RIGHT_FIELD,
        999 // high inning number
      );

      expect(maxEvent.inning).toBe(999);
    });

    it('should work with all position combinations', () => {
      // Test a representative sample of position changes
      const testCases = [
        [FieldPosition.PITCHER, FieldPosition.FIRST_BASE],
        [FieldPosition.CATCHER, FieldPosition.THIRD_BASE],
        [FieldPosition.FIRST_BASE, FieldPosition.PITCHER],
        [FieldPosition.LEFT_FIELD, FieldPosition.CENTER_FIELD],
        [FieldPosition.CENTER_FIELD, FieldPosition.RIGHT_FIELD],
        [FieldPosition.SHORT_FIELDER, FieldPosition.SECOND_BASE],
        [FieldPosition.EXTRA_PLAYER, FieldPosition.SHORTSTOP],
      ];

      testCases.forEach((testCase, index) => {
        const from = testCase[0];
        const to = testCase[1];
        if (!from || !to) return;
        const event = new FieldPositionChanged(gameId, teamLineupId, playerId, from, to, index + 1);

        expect(event.fromPosition).toBe(from);
        expect(event.toPosition).toBe(to);
      });
    });
  });

  describe('Business Rule Scenarios', () => {
    it('should support common position change scenarios', () => {
      const scenarios = [
        {
          description: 'Pitcher moves to first base',
          from: FieldPosition.PITCHER,
          to: FieldPosition.FIRST_BASE,
          inning: 3,
        },
        {
          description: 'Outfield rotation',
          from: FieldPosition.LEFT_FIELD,
          to: FieldPosition.RIGHT_FIELD,
          inning: 5,
        },
        {
          description: 'Extra player enters defensive position',
          from: FieldPosition.EXTRA_PLAYER,
          to: FieldPosition.SHORT_FIELDER,
          inning: 6,
        },
        {
          description: 'Infield shift',
          from: FieldPosition.SECOND_BASE,
          to: FieldPosition.SHORTSTOP,
          inning: 7,
        },
        {
          description: 'Player moves to bench (Extra Player)',
          from: FieldPosition.CENTER_FIELD,
          to: FieldPosition.EXTRA_PLAYER,
          inning: 8,
        },
      ];

      scenarios.forEach(scenario => {
        const event = new FieldPositionChanged(
          gameId,
          teamLineupId,
          playerId,
          scenario.from,
          scenario.to,
          scenario.inning
        );

        expect(event.fromPosition).toBe(scenario.from);
        expect(event.toPosition).toBe(scenario.to);
        expect(event.inning).toBe(scenario.inning);
      });
    });

    it('should support strategic defensive changes', () => {
      // Test scenarios based on real softball strategy
      const strategicChanges = [
        {
          description: 'Shift for left-handed batter',
          from: FieldPosition.THIRD_BASE,
          to: FieldPosition.SHORT_FIELDER,
        },
        {
          description: 'Move catcher to first base for double play',
          from: FieldPosition.CATCHER,
          to: FieldPosition.FIRST_BASE,
        },
        {
          description: 'Outfield playing shallow',
          from: FieldPosition.CENTER_FIELD,
          to: FieldPosition.SHORT_FIELDER,
        },
      ];

      strategicChanges.forEach((change, index) => {
        const event = new FieldPositionChanged(
          gameId,
          teamLineupId,
          playerId,
          change.from,
          change.to,
          index + 1
        );

        expect(event.fromPosition).toBe(change.from);
        expect(event.toPosition).toBe(change.to);
      });
    });
  });

  describe('Multiple Position Changes', () => {
    it('should handle sequence of position changes for same player', () => {
      const playerId2 = new PlayerId('versatile-player');

      // Player moves through multiple positions during game
      const positionSequence = [
        { from: FieldPosition.RIGHT_FIELD, to: FieldPosition.FIRST_BASE, inning: 3 },
        { from: FieldPosition.FIRST_BASE, to: FieldPosition.PITCHER, inning: 5 },
        { from: FieldPosition.PITCHER, to: FieldPosition.CATCHER, inning: 7 },
        { from: FieldPosition.CATCHER, to: FieldPosition.EXTRA_PLAYER, inning: 9 },
      ];

      const events = positionSequence.map(
        change =>
          new FieldPositionChanged(
            gameId,
            teamLineupId,
            playerId2,
            change.from,
            change.to,
            change.inning
          )
      );

      // Verify each event in the sequence
      events.forEach((event, index) => {
        const expectedChange = positionSequence[index];
        if (!expectedChange) {
          throw new Error(`Expected change not found at index ${index}`);
        }
        expect(event.playerId).toBe(playerId2);
        expect(event.fromPosition).toBe(expectedChange.from);
        expect(event.toPosition).toBe(expectedChange.to);
        expect(event.inning).toBe(expectedChange.inning);
      });

      // Verify events are distinct
      const eventIds = events.map(e => e.eventId);
      const uniqueEventIds = new Set(eventIds);
      expect(uniqueEventIds.size).toBe(events.length);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new FieldPositionChanged(
        gameId,
        teamLineupId,
        playerId,
        FieldPosition.PITCHER,
        FieldPosition.FIRST_BASE,
        1
      );

      // Verify the type is the expected string literal
      expect(event.type).toBe('FieldPositionChanged');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('FieldPositionChanged');
    });
  });
});
