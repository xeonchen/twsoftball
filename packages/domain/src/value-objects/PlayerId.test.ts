import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { PlayerId } from './PlayerId';

describe('PlayerId', () => {
  describe('Construction', () => {
    it('should create PlayerId with valid string value', () => {
      const playerId = new PlayerId('player-123');

      expect(playerId.value).toBe('player-123');
    });

    it('should reject empty string', () => {
      expect(() => new PlayerId('')).toThrow(DomainError);
      expect(() => new PlayerId('')).toThrow('PlayerId cannot be empty or whitespace');
    });

    it('should reject whitespace-only string', () => {
      expect(() => new PlayerId('   ')).toThrow(DomainError);
      expect(() => new PlayerId('   ')).toThrow('PlayerId cannot be empty or whitespace');
    });

    it('should reject strings longer than 50 characters', () => {
      const longId = 'p'.repeat(51);

      expect(() => new PlayerId(longId)).toThrow(DomainError);
      expect(() => new PlayerId(longId)).toThrow('PlayerId cannot exceed 50 characters');
    });

    it('should accept string exactly 50 characters long', () => {
      const maxLengthId = 'p'.repeat(50);

      expect(() => new PlayerId(maxLengthId)).not.toThrow();

      const playerId = new PlayerId(maxLengthId);
      expect(playerId.value).toBe(maxLengthId);
    });
  });

  describe('Equality', () => {
    it('should be equal when values are the same', () => {
      const id1 = new PlayerId('same-player');
      const id2 = new PlayerId('same-player');

      expect(id1.equals(id2)).toBe(true);
      expect(id2.equals(id1)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const id1 = new PlayerId('player-1');
      const id2 = new PlayerId('player-2');

      expect(id1.equals(id2)).toBe(false);
      expect(id2.equals(id1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const playerId = new PlayerId('test-player');

      expect(playerId.equals(null as unknown as PlayerId)).toBe(false);
      expect(playerId.equals(undefined as unknown as PlayerId)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const playerId = new PlayerId('williams-22');

      expect(playerId.toString()).toBe('williams-22');
    });
  });

  describe('Static factory methods', () => {
    it('should generate unique PlayerIds', () => {
      const id1 = PlayerId.generate();
      const id2 = PlayerId.generate();

      expect(id1.value).toBeDefined();
      expect(id2.value).toBeDefined();
      expect(id1.value).not.toBe(id2.value);
      expect(typeof id1.value).toBe('string');
      expect(id1.value.length).toBeGreaterThan(0);
    });

    it('should generate valid PlayerIds', () => {
      const generated = PlayerId.generate();

      // Should not throw when creating from generated value
      expect(() => new PlayerId(generated.value)).not.toThrow();

      // Generated ID should be within length limits
      expect(generated.value.length).toBeLessThanOrEqual(50);
      expect(generated.value.length).toBeGreaterThan(0);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const playerId = new PlayerId('test-player');

      // Value should be readonly (TypeScript enforced)
      expect(playerId.value).toBe('test-player');

      // Should not have any methods that mutate state
      const keys = Object.getOwnPropertyNames(PlayerId.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should support JSON serialization', () => {
      const playerId = new PlayerId('serializable-player');

      const serialized = JSON.stringify(playerId);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBe('serializable-player');
    });
  });
});
