import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';

import { GameId } from './GameId.js';

describe('GameId', () => {
  describe('Construction', () => {
    it('should create GameId with valid string value', () => {
      const gameId = new GameId('game-123');

      expect(gameId.value).toBe('game-123');
    });

    it('should reject empty string', () => {
      expect(() => new GameId('')).toThrow(DomainError);
      expect(() => new GameId('')).toThrow('GameId cannot be empty or whitespace');
    });

    it('should reject whitespace-only string', () => {
      expect(() => new GameId('   ')).toThrow(DomainError);
      expect(() => new GameId('   ')).toThrow('GameId cannot be empty or whitespace');
    });

    it('should reject strings longer than 50 characters', () => {
      const longId = 'a'.repeat(51);

      expect(() => new GameId(longId)).toThrow(DomainError);
      expect(() => new GameId(longId)).toThrow('GameId cannot exceed 50 characters');
    });

    it('should accept string exactly 50 characters long', () => {
      const maxLengthId = 'a'.repeat(50);

      expect(() => new GameId(maxLengthId)).not.toThrow();

      const gameId = new GameId(maxLengthId);
      expect(gameId.value).toBe(maxLengthId);
    });
  });

  describe('Equality', () => {
    it('should be equal when values are the same', () => {
      const id1 = new GameId('same-id');
      const id2 = new GameId('same-id');

      expect(id1.equals(id2)).toBe(true);
      expect(id2.equals(id1)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const id1 = new GameId('id-1');
      const id2 = new GameId('id-2');

      expect(id1.equals(id2)).toBe(false);
      expect(id2.equals(id1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const gameId = new GameId('test-id');

      // TypeScript prevents this at compile time, but test runtime behavior
      expect(gameId.equals(null as unknown as GameId)).toBe(false);
      expect(gameId.equals(undefined as unknown as GameId)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const gameId = new GameId('test-game-id');

      expect(gameId.toString()).toBe('test-game-id');
    });
  });

  describe('Static factory methods', () => {
    it('should generate unique GameIds', () => {
      const id1 = GameId.generate();
      const id2 = GameId.generate();

      expect(id1.value).toBeDefined();
      expect(id2.value).toBeDefined();
      expect(id1.value).not.toBe(id2.value);
      expect(typeof id1.value).toBe('string');
      expect(id1.value.length).toBeGreaterThan(0);
    });

    it('should generate valid GameIds', () => {
      const generated = GameId.generate();

      // Should not throw when creating from generated value
      expect(() => new GameId(generated.value)).not.toThrow();

      // Generated ID should be within length limits
      expect(generated.value.length).toBeLessThanOrEqual(50);
      expect(generated.value.length).toBeGreaterThan(0);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const gameId = new GameId('test-id');

      // Value should be readonly (TypeScript enforced)
      expect(gameId.value).toBe('test-id');

      // Should not have any methods that mutate state
      const keys = Object.getOwnPropertyNames(GameId.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should support JSON serialization', () => {
      const gameId = new GameId('serializable-id');

      const serialized = JSON.stringify(gameId);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBe('serializable-id');
    });
  });
});
