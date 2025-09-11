/**
 * @file SecureRandom Tests
 * Comprehensive test suite for cryptographically secure random utilities
 */

import { describe, expect, it, vi } from 'vitest';

import { SecureRandom } from './SecureRandom';

describe('SecureRandom', () => {
  describe('randomFloat()', () => {
    it('should return a number between 0 (inclusive) and 1 (exclusive)', () => {
      const result = SecureRandom.randomFloat();

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it('should return different values on subsequent calls', () => {
      const value1 = SecureRandom.randomFloat();
      const value2 = SecureRandom.randomFloat();

      expect(value1).not.toBe(value2);
    });

    it('should use crypto.getRandomValues internally', () => {
      const mockGetRandomValues = vi.spyOn(crypto, 'getRandomValues');
      mockGetRandomValues.mockReturnValue(new Uint32Array([2147483647])); // 0x7FFFFFFF

      const result = SecureRandom.randomFloat();

      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBeCloseTo(0.5, 5); // 0x7FFFFFFF / 0x100000000 ≈ 0.5

      mockGetRandomValues.mockRestore();
    });

    it('should handle edge cases correctly', () => {
      const mockGetRandomValues = vi.spyOn(crypto, 'getRandomValues');

      // Test minimum value (0)
      mockGetRandomValues.mockReturnValue(new Uint32Array([0]));
      expect(SecureRandom.randomFloat()).toBe(0);

      // Test maximum value (approaching 1 but always less than 1)
      mockGetRandomValues.mockReturnValue(new Uint32Array([0xffffffff]));
      const maxResult = SecureRandom.randomFloat();
      expect(maxResult).toBeLessThan(1);
      expect(maxResult).toBeGreaterThan(0.999);

      mockGetRandomValues.mockRestore();
    });
  });

  describe('randomFloatRange()', () => {
    it('should return a number within the specified range', () => {
      const min = 5.5;
      const max = 10.7;
      const result = SecureRandom.randomFloatRange(min, max);

      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    });

    it('should handle negative ranges', () => {
      const min = -10.5;
      const max = -2.3;
      const result = SecureRandom.randomFloatRange(min, max);

      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    });

    it('should handle ranges crossing zero', () => {
      const min = -5.0;
      const max = 5.0;
      const result = SecureRandom.randomFloatRange(min, max);

      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    });

    it('should throw error for invalid ranges', () => {
      expect(() => SecureRandom.randomFloatRange(10, 5)).toThrow('Invalid range');
      expect(() => SecureRandom.randomFloatRange(5, 5)).toThrow('Invalid range');
    });

    it('should distribute values across the range', () => {
      const min = 0;
      const max = 100;
      const samples = Array.from({ length: 1000 }, () => SecureRandom.randomFloatRange(min, max));

      const average = samples.reduce((sum, val) => sum + val, 0) / samples.length;
      expect(average).toBeGreaterThan(40);
      expect(average).toBeLessThan(60);
    });
  });

  describe('randomInt()', () => {
    it('should return an integer within the specified range', () => {
      const min = 1;
      const max = 10;
      const result = SecureRandom.randomInt(min, max);

      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    });

    it('should handle negative ranges', () => {
      const min = -10;
      const max = -5;
      const result = SecureRandom.randomInt(min, max);

      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    });

    it('should handle single-value range', () => {
      const min = 5;
      const max = 6;
      const result = SecureRandom.randomInt(min, max);

      expect(result).toBe(5);
    });

    it('should throw error for invalid ranges', () => {
      expect(() => SecureRandom.randomInt(10, 5)).toThrow('Invalid range');
      expect(() => SecureRandom.randomInt(5, 5)).toThrow('Invalid range');
    });

    it('should throw error for non-integer inputs', () => {
      expect(() => SecureRandom.randomInt(1.5, 5)).toThrow('Both min and max must be integers');
      expect(() => SecureRandom.randomInt(1, 5.5)).toThrow('Both min and max must be integers');
    });

    it('should cover all values in range uniformly', () => {
      const min = 0;
      const max = 5;
      const counts = new Map<number, number>();

      // Generate many samples
      for (let i = 0; i < 5000; i++) {
        const value = SecureRandom.randomInt(min, max);
        counts.set(value, (counts.get(value) || 0) + 1);
      }

      // Check all values in range appear
      for (let i = min; i < max; i++) {
        expect(counts.has(i)).toBe(true);
        expect(counts.get(i)!).toBeGreaterThan(500); // Roughly uniform
      }

      // Check no values outside range appear
      expect(counts.has(-1)).toBe(false);
      expect(counts.has(max)).toBe(false);
    });
  });

  describe('randomStringId()', () => {
    it('should return string of correct default length', () => {
      const result = SecureRandom.randomStringId();

      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
    });

    it('should return string of specified length', () => {
      const lengths = [1, 5, 12, 20, 32];

      lengths.forEach(length => {
        const result = SecureRandom.randomStringId(length);
        expect(result.length).toBe(length);
      });
    });

    it('should return different values on subsequent calls', () => {
      const id1 = SecureRandom.randomStringId();
      const id2 = SecureRandom.randomStringId();

      expect(id1).not.toBe(id2);
    });

    it('should only contain valid UUID characters', () => {
      const result = SecureRandom.randomStringId(32);
      const validChars = /^[0-9a-f]+$/;

      expect(validChars.test(result)).toBe(true);
    });

    it('should throw error for invalid lengths', () => {
      expect(() => SecureRandom.randomStringId(0)).toThrow('Length must be positive');
      expect(() => SecureRandom.randomStringId(-1)).toThrow('Length must be positive');
      expect(() => SecureRandom.randomStringId(33)).toThrow('Length cannot exceed 32 characters');
    });

    it('should use crypto.randomUUID internally', () => {
      const mockRandomUUID = vi.spyOn(crypto, 'randomUUID');
      mockRandomUUID.mockReturnValue('12345678-1234-1234-1234-123456789abc');

      const result = SecureRandom.randomStringId(8);

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(result).toBe('12345678');

      mockRandomUUID.mockRestore();
    });
  });

  describe('randomUUID()', () => {
    it('should return a valid UUID string', () => {
      const result = SecureRandom.randomUUID();

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should return different UUIDs on subsequent calls', () => {
      const uuid1 = SecureRandom.randomUUID();
      const uuid2 = SecureRandom.randomUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should delegate to crypto.randomUUID', () => {
      const mockRandomUUID = vi.spyOn(crypto, 'randomUUID');
      const testUUID = '12345678-1234-1234-1234-123456789abc';
      mockRandomUUID.mockReturnValue(testUUID);

      const result = SecureRandom.randomUUID();

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(result).toBe(testUUID);

      mockRandomUUID.mockRestore();
    });
  });

  describe('integration with real crypto API', () => {
    it('should work with actual crypto implementation', () => {
      // Test that all methods work with real crypto (not mocked)
      expect(() => SecureRandom.randomFloat()).not.toThrow();
      expect(() => SecureRandom.randomFloatRange(0, 1)).not.toThrow();
      expect(() => SecureRandom.randomInt(0, 10)).not.toThrow();
      expect(() => SecureRandom.randomStringId()).not.toThrow();
      expect(() => SecureRandom.randomUUID()).not.toThrow();
    });

    it('should generate statistically random values', () => {
      // Simple statistical test for randomness
      const samples = Array.from({ length: 100 }, () => SecureRandom.randomFloat());

      // Values should be spread out (not all clustered)
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      expect(max - min).toBeGreaterThan(0.5);

      // Average should be roughly 0.5
      const average = samples.reduce((sum, val) => sum + val, 0) / samples.length;
      expect(average).toBeGreaterThan(0.3);
      expect(average).toBeLessThan(0.7);
    });
  });
});
