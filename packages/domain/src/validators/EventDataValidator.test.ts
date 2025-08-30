import { describe, it, expect } from 'vitest';
import { EventDataValidator } from './EventDataValidator';
import { GameId } from '../value-objects/GameId';

describe('EventDataValidator', () => {
  describe('freezeData', () => {
    it('should freeze simple objects', () => {
      const data = { home: 5, away: 3 };
      const frozen = EventDataValidator.freezeData(data);

      expect(frozen).toBe(data); // Same reference
      expect(Object.isFrozen(frozen)).toBe(true);

      // Should throw when attempting to modify
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (frozen as any).home = 10;
      }).toThrow();
    });

    it('should freeze objects with various property types', () => {
      const data = {
        number: 42,
        string: 'test',
        boolean: true,
        array: [1, 2, 3],
        nested: { value: 'nested' },
      };

      const frozen = EventDataValidator.freezeData(data);
      expect(Object.isFrozen(frozen)).toBe(true);

      // Direct properties should be immutable
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (frozen as any).number = 0;
      }).toThrow();
    });

    it('should return the same object reference after freezing', () => {
      const data = { score: 15 };
      const frozen = EventDataValidator.freezeData(data);

      expect(frozen).toBe(data);
      expect(Object.isFrozen(data)).toBe(true);
    });
  });

  describe('deepFreeze', () => {
    it('should freeze nested objects recursively', () => {
      const data = {
        score: { home: 5, away: 3 },
        players: [{ id: 1, name: 'John' }],
        metadata: { timestamp: new Date(), tags: ['important'] },
      };

      const frozen = EventDataValidator.deepFreeze(data);

      // Root object should be frozen
      expect(Object.isFrozen(frozen)).toBe(true);

      // Nested objects should be frozen
      expect(Object.isFrozen(frozen.score)).toBe(true);
      expect(Object.isFrozen(frozen.players)).toBe(true);
      expect(Object.isFrozen(frozen.players[0])).toBe(true);
      expect(Object.isFrozen(frozen.metadata)).toBe(true);
      expect(Object.isFrozen(frozen.metadata.tags)).toBe(true);

      // Should throw when attempting to modify nested properties
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (frozen.score as any).home = 10;
      }).toThrow();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (frozen.players[0] as any).name = 'Jane';
      }).toThrow();

      expect(() => {
        frozen.metadata.tags.push('new');
      }).toThrow();
    });

    it('should handle empty objects and arrays', () => {
      const data = {
        emptyObject: {},
        emptyArray: [],
        nullValue: null,
        undefinedValue: undefined,
      };

      const frozen = EventDataValidator.deepFreeze(data);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.emptyObject)).toBe(true);
      expect(Object.isFrozen(frozen.emptyArray)).toBe(true);
    });

    it('should handle primitive values without error', () => {
      const data = {
        number: 42,
        string: 'test',
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };

      expect(() => EventDataValidator.deepFreeze(data)).not.toThrow();
      expect(Object.isFrozen(data)).toBe(true);
    });

    it('should handle Date objects', () => {
      const data = {
        timestamp: new Date('2023-01-01'),
        nested: {
          anotherDate: new Date('2023-12-31'),
        },
      };

      const frozen = EventDataValidator.deepFreeze(data);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.nested)).toBe(true);
      // Date objects themselves can't be frozen in a meaningful way,
      // but the containing objects should be frozen
    });
  });

  describe('validateEventMetadata', () => {
    it('should accept valid GameId', () => {
      const gameId = new GameId('valid-game-id');
      expect(() => EventDataValidator.validateEventMetadata(gameId)).not.toThrow();
    });

    it('should accept valid GameId with valid timestamp', () => {
      const gameId = new GameId('valid-game-id');
      const timestamp = new Date();
      expect(() => EventDataValidator.validateEventMetadata(gameId, timestamp)).not.toThrow();
    });

    it('should reject invalid timestamp', () => {
      const gameId = new GameId('valid-game-id');
      const invalidDate = new Date('invalid-date');

      expect(() => EventDataValidator.validateEventMetadata(gameId, invalidDate)).toThrow(
        'Event timestamp must be a valid Date object'
      );
    });

    it('should reject non-Date timestamp', () => {
      const gameId = new GameId('valid-game-id');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(() => EventDataValidator.validateEventMetadata(gameId, 'not-a-date' as any)).toThrow(
        'Event timestamp must be a valid Date object'
      );
    });

    it('should reject null gameId', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(() => EventDataValidator.validateEventMetadata(null as any)).toThrow(
        'Event gameId is required'
      );
    });
  });

  describe('copyAndFreeze', () => {
    it('should create a copy and freeze it', () => {
      const original = { home: 5, away: 3 };
      const copy = EventDataValidator.copyAndFreeze(original);

      // Should be a different object
      expect(copy).not.toBe(original);

      // Copy should be frozen
      expect(Object.isFrozen(copy)).toBe(true);

      // Original should not be frozen
      expect(Object.isFrozen(original)).toBe(false);

      // Should have same values
      expect(copy.home).toBe(original.home);
      expect(copy.away).toBe(original.away);
    });

    it('should prevent original mutations from affecting the copy', () => {
      const original = { score: 10, status: 'active' };
      const copy = EventDataValidator.copyAndFreeze(original);

      // Modify original
      original.score = 20;
      original.status = 'inactive';

      // Copy should remain unchanged
      expect(copy.score).toBe(10);
      expect(copy.status).toBe('active');
    });

    it('should create shallow copies', () => {
      const original = {
        score: { home: 5, away: 3 },
        tags: ['important'],
      };
      const copy = EventDataValidator.copyAndFreeze(original);

      // Top-level properties are different references
      expect(copy).not.toBe(original);

      // But nested objects share references (shallow copy)
      expect(copy.score).toBe(original.score);
      expect(copy.tags).toBe(original.tags);

      // Copy should be frozen
      expect(Object.isFrozen(copy)).toBe(true);

      // Original should not be frozen
      expect(Object.isFrozen(original)).toBe(false);
    });

    it('should work with complex objects', () => {
      const original = {
        gameId: 'game-123',
        score: { home: 8, away: 5 },
        timestamp: new Date(),
        players: ['player1', 'player2'],
        metadata: {
          inning: 9,
          outs: 2,
        },
      };

      const copy = EventDataValidator.copyAndFreeze(original);

      // Should be different object
      expect(copy).not.toBe(original);

      // Should be frozen
      expect(Object.isFrozen(copy)).toBe(true);

      // Should have same values
      expect(copy.gameId).toBe(original.gameId);
      expect(copy.score).toBe(original.score); // Shallow copy
      expect(copy.timestamp).toBe(original.timestamp);
      expect(copy.players).toBe(original.players); // Shallow copy
      expect(copy.metadata).toBe(original.metadata); // Shallow copy
    });
  });
});
