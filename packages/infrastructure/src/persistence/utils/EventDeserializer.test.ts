/**
 * @file EventDeserializer Tests
 * Tests for event deserialization functionality to improve coverage.
 */

import { GameId, PlayerId, AtBatResultType, InningAdvanced } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { deserializeEvent } from './EventDeserializer';

describe('EventDeserializer', () => {
  const testGameId = GameId.generate();
  const testPlayerId = PlayerId.generate();

  describe('Event Type Deserialization', () => {
    it('should deserialize GameCreated events', () => {
      const rawEvent = {
        type: 'GameCreated',
        eventId: 'test-event-1',
        gameId: testGameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('GameCreated');
      expect(result.gameId.value).toBe(testGameId.value);
    });

    it('should deserialize GameStarted events', () => {
      const rawEvent = {
        type: 'GameStarted',
        eventId: 'test-event-2',
        gameId: testGameId.value,
        timestamp: new Date().toISOString(),
        aggregateVersion: 2,
        version: 2,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('GameStarted');
      expect(result.gameId.value).toBe(testGameId.value);
    });

    it('should deserialize AtBatCompleted events', () => {
      const rawEvent = {
        type: 'AtBatCompleted',
        eventId: 'test-event-3',
        gameId: testGameId.value,
        batterId: testPlayerId.value,
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        timestamp: new Date().toISOString(),
        aggregateVersion: 3,
        version: 3,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('AtBatCompleted');
      expect(result.gameId.value).toBe(testGameId.value);
    });

    it('should deserialize RunScored events', () => {
      const rawEvent = {
        type: 'RunScored',
        eventId: 'test-event-4',
        gameId: testGameId.value,
        scorerId: testPlayerId.value,
        battingTeam: 'HOME',
        rbiCreditedTo: testPlayerId.value,
        newScore: { home: 1, away: 0 },
        timestamp: new Date().toISOString(),
        aggregateVersion: 4,
        version: 4,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('RunScored');
      expect(result.gameId.value).toBe(testGameId.value);
    });

    it('should deserialize ScoreUpdated events', () => {
      const rawEvent = {
        type: 'ScoreUpdated',
        eventId: 'test-event-5',
        gameId: testGameId.value,
        scoringTeam: 'HOME',
        runsAdded: 1,
        newScore: { home: 5, away: 3 },
        timestamp: new Date().toISOString(),
        aggregateVersion: 5,
        version: 5,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('ScoreUpdated');
      expect(result.gameId.value).toBe(testGameId.value);
    });

    it('should deserialize InningAdvanced events', () => {
      const rawEvent = {
        type: 'InningAdvanced',
        eventId: 'test-event-6',
        gameId: testGameId.value,
        newInning: 2,
        isTopHalf: true,
        timestamp: new Date().toISOString(),
        aggregateVersion: 6,
        version: 6,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('InningAdvanced');
      expect(result.gameId.value).toBe(testGameId.value);
      // Verify the InningAdvanced-specific properties are correctly deserialized
      const advancedEvent = result as InningAdvanced;
      expect(advancedEvent.newInning).toBe(2);
      expect(advancedEvent.isTopHalf).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown event type', () => {
      const rawEvent = {
        type: 'UnknownEventType',
        eventId: 'test-event-unknown',
        gameId: testGameId.value,
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      expect(() => deserializeEvent(rawEvent)).toThrow('Unknown event type: UnknownEventType');
    });

    it('should handle null PlayerId data', () => {
      const rawEvent = {
        type: 'AtBatCompleted',
        eventId: 'test-event-null-player',
        gameId: testGameId.value,
        batterId: null, // This should trigger error handling
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      expect(() => deserializeEvent(rawEvent)).toThrow('PlayerId data is null or undefined');
    });

    it('should handle undefined PlayerId data', () => {
      const rawEvent = {
        type: 'AtBatCompleted',
        eventId: 'test-event-undefined-player',
        gameId: testGameId.value,
        batterId: undefined, // This should trigger error handling
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      expect(() => deserializeEvent(rawEvent)).toThrow('PlayerId data is null or undefined');
    });

    it('should handle invalid PlayerId data format', () => {
      const rawEvent = {
        type: 'AtBatCompleted',
        eventId: 'test-event-invalid-player',
        gameId: testGameId.value,
        batterId: 123, // Invalid format - should be string or object with value
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      expect(() => deserializeEvent(rawEvent)).toThrow('Invalid PlayerId data format');
    });
  });

  describe('Data Format Handling', () => {
    it('should handle PlayerId as object with value property', () => {
      const rawEvent = {
        type: 'AtBatCompleted',
        eventId: 'test-event-player-object',
        gameId: testGameId.value,
        batterId: { value: testPlayerId.value }, // Object format
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.type).toBe('AtBatCompleted');
    });

    it('should handle timestamp as Date object', () => {
      const timestamp = new Date();
      const rawEvent = {
        type: 'GameStarted',
        eventId: 'test-event-date',
        gameId: testGameId.value,
        timestamp, // Date object instead of string
        aggregateVersion: 1,
        version: 1,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.timestamp).toEqual(timestamp);
    });

    it('should handle GameId as object with value property', () => {
      const rawEvent = {
        type: 'GameStarted',
        eventId: 'test-event-gameid-object',
        gameId: { value: testGameId.value }, // Object format
        timestamp: new Date().toISOString(),
        aggregateVersion: 1,
        version: 1,
      };

      const result = deserializeEvent(rawEvent);

      expect(result.gameId.value).toBe(testGameId.value);
    });
  });
});
