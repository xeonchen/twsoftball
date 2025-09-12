/**
 * @file MockEventCreators.test.ts
 * Comprehensive tests for mock event creation utilities.
 * Tests all factory functions that create domain events for testing purposes.
 */

import {
  GameId,
  TeamLineupId,
  InningStateId,
  DomainEvent,
  GameCreated,
  AtBatCompleted,
  TeamLineupCreated,
  InningStateCreated,
  PlayerId,
  AtBatResultType,
} from '@twsoftball/domain';
import {
  createMockGameCreatedEvent,
  createMockAtBatCompletedEvent,
  createMockTeamLineupCreatedEvent,
  createMockInningStateCreatedEvent,
  createMockGameId,
  createMockTeamLineupId,
  createMockInningStateId,
  createMockEventBatch,
} from '@twsoftball/shared';
import { describe, it, expect } from 'vitest';

describe('MockEventCreators', () => {
  describe('createMockGameCreatedEvent', () => {
    it('should create a valid GameCreated event', () => {
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      expect(event).toBeInstanceOf(GameCreated);
      expect(event.type).toBe('GameCreated');
      expect(event.gameId).toBe(gameId);
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should set default team names', () => {
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      expect(event.homeTeamName).toBe('Mock Home Team');
      expect(event.awayTeamName).toBe('Mock Away Team');
    });

    it('should create event with proper timestamp', () => {
      const beforeCreation = Date.now();
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);
      const afterCreation = Date.now();

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation);
    });

    it('should create events with the same gameId but different timestamps', () => {
      const gameId = GameId.generate();
      const event1 = createMockGameCreatedEvent(gameId);

      // Small delay to ensure different timestamps
      const event2 = createMockGameCreatedEvent(gameId);

      expect(event1.gameId).toBe(event2.gameId);
      expect(event1.gameId).toBe(gameId);
      expect(event2.gameId).toBe(gameId);

      // Both events should have valid timestamps
      expect(event1.timestamp).toBeInstanceOf(Date);
      expect(event2.timestamp).toBeInstanceOf(Date);
    });

    it('should be a proper DomainEvent', () => {
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      expect(event).toBeInstanceOf(DomainEvent);
      expect(event.type).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should maintain consistent structure across multiple calls', () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const event1 = createMockGameCreatedEvent(gameId1);
      const event2 = createMockGameCreatedEvent(gameId2);

      expect(event1.type).toBe(event2.type);
      expect(event1.homeTeamName).toBe(event2.homeTeamName);
      expect(event1.awayTeamName).toBe(event2.awayTeamName);
      expect(event1.gameId).not.toBe(event2.gameId);
    });
  });

  describe('createMockAtBatCompletedEvent', () => {
    it('should create a valid AtBatCompleted event', () => {
      const gameId = GameId.generate();
      const event = createMockAtBatCompletedEvent(gameId);

      expect(event).toBeInstanceOf(AtBatCompleted);
      expect(event.type).toBe('AtBatCompleted');
      expect(event.gameId).toBe(gameId);
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should set default batting parameters', () => {
      const gameId = GameId.generate();
      const event = createMockAtBatCompletedEvent(gameId);

      expect(event.battingSlot).toBe(3);
      expect(event.result).toBe(AtBatResultType.SINGLE);
      expect(event.inning).toBe(3);
      expect(event.outs).toBe(1);
    });

    it('should generate unique PlayerId for each event', () => {
      const gameId = GameId.generate();
      const event1 = createMockAtBatCompletedEvent(gameId);
      const event2 = createMockAtBatCompletedEvent(gameId);

      expect(event1.batterId).toBeInstanceOf(PlayerId);
      expect(event2.batterId).toBeInstanceOf(PlayerId);
      expect(event1.batterId.value).not.toBe(event2.batterId.value);
    });

    it('should create event with proper timestamp', () => {
      const beforeCreation = Date.now();
      const gameId = GameId.generate();
      const event = createMockAtBatCompletedEvent(gameId);
      const afterCreation = Date.now();

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation);
    });

    it('should be a proper DomainEvent', () => {
      const gameId = GameId.generate();
      const event = createMockAtBatCompletedEvent(gameId);

      expect(event).toBeInstanceOf(DomainEvent);
      expect(event.type).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should use valid softball parameters', () => {
      const gameId = GameId.generate();
      const event = createMockAtBatCompletedEvent(gameId);

      // Batting slot should be valid (1-based)
      expect(event.battingSlot).toBeGreaterThan(0);
      expect(event.battingSlot).toBeLessThanOrEqual(15); // Max lineup size

      // Inning should be valid
      expect(event.inning).toBeGreaterThan(0);

      // Outs should be in valid range (0-2)
      expect(event.outs).toBeGreaterThanOrEqual(0);
      expect(event.outs).toBeLessThanOrEqual(2);

      // Result should be a valid AtBatResultType
      expect(Object.values(AtBatResultType)).toContain(event.result);
    });
  });

  describe('createMockTeamLineupCreatedEvent', () => {
    it('should create a valid TeamLineupCreated event', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const event = createMockTeamLineupCreatedEvent(gameId, teamLineupId);

      expect(event).toBeInstanceOf(TeamLineupCreated);
      expect(event.type).toBe('TeamLineupCreated');
      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should set default team name', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const event = createMockTeamLineupCreatedEvent(gameId, teamLineupId);

      expect(event.teamName).toBe('Mock Team Name');
    });

    it('should create event with proper timestamp', () => {
      const beforeCreation = Date.now();
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const event = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
      const afterCreation = Date.now();

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation);
    });

    it('should be a proper DomainEvent', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const event = createMockTeamLineupCreatedEvent(gameId, teamLineupId);

      expect(event).toBeInstanceOf(DomainEvent);
      expect(event.type).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should associate event with correct game and team lineup', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const event = createMockTeamLineupCreatedEvent(gameId, teamLineupId);

      expect(event.gameId).toBe(gameId);
      expect(event.teamLineupId).toBe(teamLineupId);
      expect(event.eventId).toBeDefined();
    });

    it('should create different events for different IDs', () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const teamLineupId1 = TeamLineupId.generate();
      const teamLineupId2 = TeamLineupId.generate();

      const event1 = createMockTeamLineupCreatedEvent(gameId1, teamLineupId1);
      const event2 = createMockTeamLineupCreatedEvent(gameId2, teamLineupId2);

      expect(event1.gameId).not.toBe(event2.gameId);
      expect(event1.teamLineupId).not.toBe(event2.teamLineupId);
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('createMockInningStateCreatedEvent', () => {
    it('should create a valid InningStateCreated event', () => {
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);

      expect(event).toBeInstanceOf(InningStateCreated);
      expect(event.type).toBe('InningStateCreated');
      expect(event.gameId).toBe(gameId);
      expect(event.inningStateId).toBe(inningStateId);
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
    });

    it('should set default inning parameters', () => {
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);

      expect(event.inning).toBe(1);
      expect(event.isTopHalf).toBe(true);
    });

    it('should create event with proper timestamp', () => {
      const beforeCreation = Date.now();
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);
      const afterCreation = Date.now();

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterCreation);
    });

    it('should be a proper DomainEvent', () => {
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);

      expect(event).toBeInstanceOf(DomainEvent);
      expect(event.type).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should associate event with correct game and inning state', () => {
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);

      expect(event.gameId).toBe(gameId);
      expect(event.inningStateId).toBe(inningStateId);
      expect(event.eventId).toBeDefined();
    });

    it('should use valid inning parameters', () => {
      const gameId = GameId.generate();
      const inningStateId = InningStateId.generate();
      const event = createMockInningStateCreatedEvent(gameId, inningStateId);

      // Inning number should be positive
      expect(event.inning).toBeGreaterThan(0);

      // isTopHalf should be a boolean
      expect(typeof event.isTopHalf).toBe('boolean');
    });
  });

  describe('ID Generator Functions', () => {
    describe('createMockGameId', () => {
      it('should generate a valid GameId', () => {
        const gameId = createMockGameId();

        expect(gameId).toBeInstanceOf(GameId);
        expect(typeof gameId.value).toBe('string');
        expect(gameId.value).toBeTruthy();
      });

      it('should generate unique GameIds', () => {
        const gameId1 = createMockGameId();
        const gameId2 = createMockGameId();

        expect(gameId1).not.toBe(gameId2);
        expect(gameId1.value).not.toBe(gameId2.value);
      });

      it('should generate IDs with consistent format', () => {
        const gameIds = Array.from({ length: 10 }, () => createMockGameId());

        gameIds.forEach(gameId => {
          expect(gameId).toBeInstanceOf(GameId);
          expect(typeof gameId.value).toBe('string');
          expect(gameId.value.length).toBeGreaterThan(0);
        });

        // All IDs should be unique
        const uniqueValues = new Set(gameIds.map(id => id.value));
        expect(uniqueValues.size).toBe(gameIds.length);
      });
    });

    describe('createMockTeamLineupId', () => {
      it('should generate a valid TeamLineupId', () => {
        const teamLineupId = createMockTeamLineupId();

        expect(teamLineupId).toBeInstanceOf(TeamLineupId);
        expect(typeof teamLineupId.value).toBe('string');
        expect(teamLineupId.value).toBeTruthy();
      });

      it('should generate unique TeamLineupIds', () => {
        const id1 = createMockTeamLineupId();
        const id2 = createMockTeamLineupId();

        expect(id1).not.toBe(id2);
        expect(id1.value).not.toBe(id2.value);
      });

      it('should be compatible with TeamLineupId methods', () => {
        const teamLineupId = createMockTeamLineupId();

        expect(teamLineupId.toString).toBeDefined();
        expect(teamLineupId.equals).toBeDefined();
        expect(typeof teamLineupId.toString()).toBe('string');
      });
    });

    describe('createMockInningStateId', () => {
      it('should generate a valid InningStateId', () => {
        const inningStateId = createMockInningStateId();

        expect(inningStateId).toBeInstanceOf(InningStateId);
        expect(typeof inningStateId.value).toBe('string');
        expect(inningStateId.value).toBeTruthy();
      });

      it('should generate unique InningStateIds', () => {
        const id1 = createMockInningStateId();
        const id2 = createMockInningStateId();

        expect(id1).not.toBe(id2);
        expect(id1.value).not.toBe(id2.value);
      });

      it('should be compatible with InningStateId methods', () => {
        const inningStateId = createMockInningStateId();

        expect(inningStateId.toString).toBeDefined();
        expect(inningStateId.equals).toBeDefined();
        expect(typeof inningStateId.toString()).toBe('string');
      });
    });
  });

  describe('createMockEventBatch', () => {
    it('should create an array of events with specified count', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 5);

      expect(Array.isArray(batch)).toBe(true);
      expect(batch).toHaveLength(5);
      batch.forEach(event => {
        expect(event).toBeInstanceOf(DomainEvent);
      });
    });

    it('should make first event a GameCreated event', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 3);

      expect(batch[0]).toBeInstanceOf(GameCreated);
      expect(batch[0]?.type).toBe('GameCreated');
      expect(batch[0]?.gameId).toBe(gameId);
    });

    it('should make remaining events AtBatCompleted events', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 5);

      for (let i = 1; i < batch.length; i++) {
        expect(batch[i]).toBeInstanceOf(AtBatCompleted);
        expect(batch[i]?.type).toBe('AtBatCompleted');
        expect(batch[i]?.gameId).toBe(gameId);
      }
    });

    it('should handle batch size of 1', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 1);

      expect(batch).toHaveLength(1);
      expect(batch[0]).toBeInstanceOf(GameCreated);
      expect(batch[0]?.type).toBe('GameCreated');
    });

    it('should handle large batch sizes', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 100);

      expect(batch).toHaveLength(100);
      expect(batch[0]?.type).toBe('GameCreated');

      // All other events should be AtBatCompleted
      for (let i = 1; i < batch.length; i++) {
        expect(batch[i]?.type).toBe('AtBatCompleted');
      }
    });

    it('should handle zero batch size', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 0);

      expect(batch).toHaveLength(0);
      expect(Array.isArray(batch)).toBe(true);
    });

    it('should associate all events with the same gameId', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 10);

      batch.forEach(event => {
        expect(event.gameId).toBe(gameId);
        expect(event.eventId).toBeDefined();
      });
    });

    it('should create events with proper timestamps in sequence', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 5);

      // All events should have valid timestamps
      batch.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
      });

      // Timestamps should be reasonably close in time (within same test execution)
      const firstTimestamp = batch[0]!.timestamp.getTime();
      const lastTimestamp = batch[batch.length - 1]!.timestamp.getTime();
      const timeDifference = lastTimestamp - firstTimestamp;

      // Should be within a reasonable timeframe (less than 1 second)
      expect(timeDifference).toBeLessThan(1000);
    });

    it('should create events that are all proper DomainEvents', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 10);

      batch.forEach(event => {
        expect(event).toBeInstanceOf(DomainEvent);
        expect(event.type).toBeDefined();
        expect(event.eventId).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.gameId).toBeDefined();
      });
    });

    it('should generate unique events in batch', () => {
      const gameId = GameId.generate();
      const batch = createMockEventBatch(gameId, 10);

      // AtBatCompleted events should have unique PlayerIds
      const atBatEvents = batch.slice(1) as AtBatCompleted[];
      const playerIds = atBatEvents.map(event => event.batterId.value);
      const uniquePlayerIds = new Set(playerIds);

      expect(uniquePlayerIds.size).toBe(playerIds.length);
    });
  });

  describe('Integration Tests', () => {
    it('should create compatible events for all aggregate types', () => {
      const gameId = GameId.generate();
      const teamLineupId = TeamLineupId.generate();
      const inningStateId = InningStateId.generate();

      const gameEvent = createMockGameCreatedEvent(gameId);
      const teamEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
      const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);
      const atBatEvent = createMockAtBatCompletedEvent(gameId);

      // All events should be related to the same game
      expect(gameEvent.gameId).toBe(gameId);
      expect(teamEvent.gameId).toBe(gameId);
      expect(inningEvent.gameId).toBe(gameId);
      expect(atBatEvent.gameId).toBe(gameId);

      // But have different event IDs
      expect(gameEvent.eventId).toBeDefined();
      expect(teamEvent.eventId).toBeDefined();
      expect(inningEvent.eventId).toBeDefined();
      expect(atBatEvent.eventId).toBeDefined();
      expect(gameEvent.eventId).not.toBe(teamEvent.eventId);
    });

    it('should create events that can be used in event sourcing workflows', () => {
      const gameId = GameId.generate();
      const events: DomainEvent[] = [];

      // Create a sequence of events as would happen in a game
      events.push(createMockGameCreatedEvent(gameId));
      events.push(createMockAtBatCompletedEvent(gameId));
      events.push(createMockAtBatCompletedEvent(gameId));

      expect(events).toHaveLength(3);

      // All events should be serializable (important for event storage)
      events.forEach(event => {
        expect(() => JSON.stringify(event)).not.toThrow();

        const serialized = JSON.stringify(event);
        const parsed = JSON.parse(serialized);

        expect(parsed.type).toBe(event.type);
        expect(parsed.gameId).toBeDefined();
        expect(parsed.eventId).toBeDefined();
      });
    });

    it('should maintain consistency with domain layer event structure', () => {
      const gameId = GameId.generate();
      const event = createMockGameCreatedEvent(gameId);

      // Verify it matches the expected domain event interface
      expect(event.type).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.gameId).toBeInstanceOf(GameId);

      // Should have domain event properties
      expect(event.version).toBeDefined();
      expect(typeof event.version).toBe('number');
    });
  });
});
