import { describe, it, expect } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

import { PlayerSubstitutedIntoGame } from './PlayerSubstitutedIntoGame';

describe('PlayerSubstitutedIntoGame', () => {
  const gameId = new GameId('test-game-123');
  const teamLineupId = new TeamLineupId('team-lineup-456');
  const outgoingPlayerId = new PlayerId('outgoing-player-789');
  const incomingPlayerId = new PlayerId('incoming-player-abc');

  describe('Construction', () => {
    it('should create PlayerSubstitutedIntoGame event with valid parameters', () => {
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        5, // battingSlot
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.RIGHT_FIELD,
        7 // inning
      );

      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.battingSlot).toBe(5);
      expect(event.outgoingPlayerId).toBe(outgoingPlayerId);
      expect(event.incomingPlayerId).toBe(incomingPlayerId);
      expect(event.fieldPosition).toBe(FieldPosition.RIGHT_FIELD);
      expect(event.inning).toBe(7);
      expect(event.type).toBe('PlayerSubstitutedIntoGame');
    });

    it('should inherit DomainEvent properties', () => {
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.PITCHER,
        1
      );

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.version).toBe(1);
    });

    it('should create events with unique event IDs', () => {
      const event1 = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.FIRST_BASE,
        1
      );
      const event2 = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        2,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.SECOND_BASE,
        2
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set timestamp to current time', () => {
      const beforeTime = new Date();
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.CATCHER,
        1
      );
      const afterTime = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Batting Slot Validation', () => {
    it('should accept valid batting slots (1-20)', () => {
      for (let slot = 1; slot <= 20; slot += 1) {
        expect(
          () =>
            new PlayerSubstitutedIntoGame(
              gameId,
              teamLineupId,
              slot,
              outgoingPlayerId,
              incomingPlayerId,
              FieldPosition.CENTER_FIELD,
              1
            )
        ).not.toThrow();
      }
    });

    it('should reject batting slot less than 1', () => {
      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            0,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.LEFT_FIELD,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Batting slot must be between 1 and 20',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            -1,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.SHORTSTOP,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Batting slot must be between 1 and 20',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should reject batting slot greater than 20', () => {
      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            21,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.THIRD_BASE,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Batting slot must be between 1 and 20',
          name: 'DomainError',
        }) as Error
      );

      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            25,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.SHORT_FIELDER,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Batting slot must be between 1 and 20',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should accept boundary batting slot values', () => {
      // Test slot 10 (previous boundary)
      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            10,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.PITCHER,
            5
          )
      ).not.toThrow();

      // Test slot 20 (current maximum)
      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            20,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.EXTRA_PLAYER,
            3
          )
      ).not.toThrow();

      // Test slots 15-19 (mid-range values)
      [15, 16, 17, 18, 19].forEach(slot => {
        expect(
          () =>
            new PlayerSubstitutedIntoGame(
              gameId,
              teamLineupId,
              slot,
              outgoingPlayerId,
              incomingPlayerId,
              FieldPosition.RIGHT_FIELD,
              2
            )
        ).not.toThrow();
      });
    });
  });

  describe('Inning Validation', () => {
    it('should accept positive inning values', () => {
      [1, 2, 7, 12, 100].forEach(inning => {
        expect(
          () =>
            new PlayerSubstitutedIntoGame(
              gameId,
              teamLineupId,
              1,
              outgoingPlayerId,
              incomingPlayerId,
              FieldPosition.CATCHER,
              inning
            )
        ).not.toThrow();
      });
    });

    it('should reject inning less than 1', () => {
      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            1,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.FIRST_BASE,
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
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            1,
            outgoingPlayerId,
            incomingPlayerId,
            FieldPosition.SECOND_BASE,
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

  describe('Player Validation', () => {
    it('should accept different outgoing and incoming players', () => {
      const differentOutgoing = new PlayerId('different-outgoing');
      const differentIncoming = new PlayerId('different-incoming');

      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            1,
            differentOutgoing,
            differentIncoming,
            FieldPosition.THIRD_BASE,
            1
          )
      ).not.toThrow();
    });

    it('should reject same player for outgoing and incoming', () => {
      const samePlayer = new PlayerId('same-player-id');

      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            1,
            samePlayer,
            samePlayer,
            FieldPosition.SHORTSTOP,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Outgoing and incoming players must be different',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should reject players with same ID but different instances', () => {
      const playerId1 = new PlayerId('player-123');
      const playerId2 = new PlayerId('player-123'); // Same ID, different instance

      expect(
        () =>
          new PlayerSubstitutedIntoGame(
            gameId,
            teamLineupId,
            1,
            playerId1,
            playerId2,
            FieldPosition.LEFT_FIELD,
            1
          )
      ).toThrow(
        expect.objectContaining({
          message: 'Outgoing and incoming players must be different',
          name: 'DomainError',
        }) as Error
      );
    });
  });

  describe('Field Position Validation', () => {
    it('should accept all valid FieldPosition values', () => {
      Object.values(FieldPosition).forEach(position => {
        expect(
          () =>
            new PlayerSubstitutedIntoGame(
              gameId,
              teamLineupId,
              1,
              outgoingPlayerId,
              incomingPlayerId,
              position,
              1
            )
        ).not.toThrow();
      });
    });

    it('should store the correct field position', () => {
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SHORT_FIELDER,
        FieldPosition.EXTRA_PLAYER,
      ];

      positions.forEach(position => {
        const event = new PlayerSubstitutedIntoGame(
          gameId,
          teamLineupId,
          1,
          outgoingPlayerId,
          incomingPlayerId,
          position,
          1
        );
        expect(event.fieldPosition).toBe(position);
      });
    });
  });

  describe('Immutability', () => {
    it('should have properties defined as readonly (compile-time check)', () => {
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        8,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.CENTER_FIELD,
        6
      );

      // Verify all properties are present and have correct values
      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.battingSlot).toBe(8);
      expect(event.outgoingPlayerId).toBe(outgoingPlayerId);
      expect(event.incomingPlayerId).toBe(incomingPlayerId);
      expect(event.fieldPosition).toBe(FieldPosition.CENTER_FIELD);
      expect(event.inning).toBe(6);

      // TypeScript provides compile-time readonly guarantees
      // The following would be caught by TypeScript compiler:
      // event.battingSlot = 999;      // TS Error: Cannot assign to 'battingSlot' because it is a read-only property
      // event.inning = 999;           // TS Error: Cannot assign to 'inning' because it is a read-only property
      // event.fieldPosition = ...;    // TS Error: Cannot assign to 'fieldPosition' because it is a read-only property
    });

    it('should create new instances for different events rather than modify existing ones', () => {
      const incomingPlayer2 = new PlayerId('incoming-player-xyz');

      const event1 = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.FIRST_BASE,
        1
      );
      const event2 = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        2,
        outgoingPlayerId,
        incomingPlayer2,
        FieldPosition.SECOND_BASE,
        2
      );

      // Each event should have its own values
      expect(event1.battingSlot).toBe(1);
      expect(event1.incomingPlayerId).toBe(incomingPlayerId);
      expect(event1.fieldPosition).toBe(FieldPosition.FIRST_BASE);
      expect(event1.inning).toBe(1);

      expect(event2.battingSlot).toBe(2);
      expect(event2.incomingPlayerId).toBe(incomingPlayer2);
      expect(event2.fieldPosition).toBe(FieldPosition.SECOND_BASE);
      expect(event2.inning).toBe(2);

      // Events should be separate instances
      expect(event1).not.toBe(event2);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Serialization', () => {
    it('should be serializable to JSON', () => {
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        12,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.SHORT_FIELDER,
        9
      );

      const serialized = JSON.stringify(event);
      const parsed = JSON.parse(serialized);

      expect(parsed.eventId).toBe(event.eventId);
      expect(parsed.type).toBe('PlayerSubstitutedIntoGame');
      expect(parsed.version).toBe(1);
      expect(parsed.gameId.value).toBe(gameId.value);
      expect(parsed.teamLineupId.value).toBe(teamLineupId.value);
      expect(parsed.battingSlot).toBe(12);
      expect(parsed.outgoingPlayerId.value).toBe(outgoingPlayerId.value);
      expect(parsed.incomingPlayerId.value).toBe(incomingPlayerId.value);
      expect(parsed.fieldPosition).toBe(FieldPosition.SHORT_FIELDER);
      expect(parsed.inning).toBe(9);
      expect(new Date(parsed.timestamp as string)).toEqual(event.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Minimum valid values
      const minEvent = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1, // min batting slot
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.PITCHER,
        1 // min inning
      );

      expect(minEvent.battingSlot).toBe(1);
      expect(minEvent.inning).toBe(1);

      // Maximum valid values
      const maxEvent = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        20, // max batting slot
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.EXTRA_PLAYER,
        999 // high inning number (no upper limit)
      );

      expect(maxEvent.battingSlot).toBe(20);
      expect(maxEvent.inning).toBe(999);
    });

    it('should work with different field positions and contexts', () => {
      const scenarios = [
        { position: FieldPosition.PITCHER, inning: 1, slot: 1 },
        { position: FieldPosition.CATCHER, inning: 3, slot: 9 },
        { position: FieldPosition.SHORT_FIELDER, inning: 7, slot: 15 },
        { position: FieldPosition.EXTRA_PLAYER, inning: 5, slot: 20 },
        { position: FieldPosition.CENTER_FIELD, inning: 12, slot: 10 },
      ];

      scenarios.forEach(scenario => {
        const event = new PlayerSubstitutedIntoGame(
          gameId,
          teamLineupId,
          scenario.slot,
          outgoingPlayerId,
          incomingPlayerId,
          scenario.position,
          scenario.inning
        );

        expect(event.fieldPosition).toBe(scenario.position);
        expect(event.inning).toBe(scenario.inning);
        expect(event.battingSlot).toBe(scenario.slot);
      });
    });

    it('should handle re-entry substitution scenario (starter returning)', () => {
      const originalStarter = new PlayerId('original-starter');
      const substitutePlayer = new PlayerId('substitute-player');

      // This event would represent a starter being substituted back into the game
      // (softball allows starters to re-enter once)
      const reentryEvent = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        4, // batting slot
        substitutePlayer, // outgoing substitute
        originalStarter, // incoming starter (re-entry)
        FieldPosition.LEFT_FIELD,
        8 // late inning re-entry
      );

      expect(reentryEvent.outgoingPlayerId).toBe(substitutePlayer);
      expect(reentryEvent.incomingPlayerId).toBe(originalStarter);
      expect(reentryEvent.inning).toBe(8);
    });
  });

  describe('Business Rule Scenarios', () => {
    it('should support typical substitution scenarios', () => {
      const scenarios = [
        {
          description: 'Pitcher substitution',
          slot: 1,
          position: FieldPosition.PITCHER,
          inning: 4,
        },
        {
          description: 'Pinch hitter substitution',
          slot: 9,
          position: FieldPosition.RIGHT_FIELD,
          inning: 7,
        },
        {
          description: 'Extra player entering defensively',
          slot: 11,
          position: FieldPosition.SHORT_FIELDER,
          inning: 6,
        },
        {
          description: 'Defensive replacement',
          slot: 5,
          position: FieldPosition.CENTER_FIELD,
          inning: 9,
        },
      ];

      scenarios.forEach(scenario => {
        const event = new PlayerSubstitutedIntoGame(
          gameId,
          teamLineupId,
          scenario.slot,
          outgoingPlayerId,
          incomingPlayerId,
          scenario.position,
          scenario.inning
        );

        expect(event.battingSlot).toBe(scenario.slot);
        expect(event.fieldPosition).toBe(scenario.position);
        expect(event.inning).toBe(scenario.inning);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type property as string literal', () => {
      const event = new PlayerSubstitutedIntoGame(
        gameId,
        teamLineupId,
        1,
        outgoingPlayerId,
        incomingPlayerId,
        FieldPosition.PITCHER,
        1
      );

      // Verify the type is the expected string literal
      expect(event.type).toBe('PlayerSubstitutedIntoGame');
      expect(typeof event.type).toBe('string');

      // This should help with event routing and type discrimination
      const eventType: string = event.type;
      expect(eventType).toBe('PlayerSubstitutedIntoGame');
    });
  });
});
