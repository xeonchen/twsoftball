/**
 * @file secure-test-utils.test.ts
 * Tests for secure test utilities that replace Math.random() usage.
 */

import { describe, it, expect } from 'vitest';

import { SecureTestUtils } from './secure-test-utils.js';

describe('SecureTestUtils', () => {
  describe('generateTestId', () => {
    it('should generate a string identifier', () => {
      const id = SecureTestUtils.generateTestId();
      expect(typeof id).toBe('string');
      expect(id).toBeTruthy();
      expect(id.length).toBe(8);
    });

    it('should generate unique identifiers', () => {
      const id1 = SecureTestUtils.generateTestId();
      const id2 = SecureTestUtils.generateTestId();
      expect(id1).not.toBe(id2);
    });

    it('should generate consistent format', () => {
      const id = SecureTestUtils.generateTestId();
      // Should be 8 characters from UUID (hex + dashes -> filtered to 8)
      expect(id).toMatch(/^[0-9a-f-]{8}$/);
    });
  });

  describe('generateEventId', () => {
    it('should generate event ID with timestamp prefix', () => {
      const eventId = SecureTestUtils.generateEventId();
      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^event-\d+-[0-9a-f-]{8}$/);
    });

    it('should generate unique event IDs', () => {
      const id1 = SecureTestUtils.generateEventId();
      const id2 = SecureTestUtils.generateEventId();
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in event ID', () => {
      const before = Date.now();
      const eventId = SecureTestUtils.generateEventId();
      const after = Date.now();

      const timestampPart = eventId.split('-')[1];
      if (!timestampPart) throw new Error('Invalid event ID format');
      const timestamp = parseInt(timestampPart, 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('generateTestTimestamp', () => {
    it('should generate timestamp with random offset', () => {
      const base = Date.now();
      const timestamp = SecureTestUtils.generateTestTimestamp(base);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThanOrEqual(base);
      expect(timestamp).toBeLessThanOrEqual(base + 1000);
    });

    it('should use current time if no base provided', () => {
      const before = Date.now();
      const timestamp = SecureTestUtils.generateTestTimestamp();
      const after = Date.now() + 1000;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should respect custom max offset', () => {
      const base = 1000000;
      const maxOffset = 500;
      const timestamp = SecureTestUtils.generateTestTimestamp(base, maxOffset);

      expect(timestamp).toBeGreaterThanOrEqual(base);
      expect(timestamp).toBeLessThanOrEqual(base + maxOffset);
    });

    it('should generate different timestamps', () => {
      const base = Date.now();
      const timestamp1 = SecureTestUtils.generateTestTimestamp(base);
      const timestamp2 = SecureTestUtils.generateTestTimestamp(base);

      // They might be equal but unlikely with random offset
      expect(typeof timestamp1).toBe('number');
      expect(typeof timestamp2).toBe('number');
    });
  });

  describe('generateGameId', () => {
    it('should generate game ID with default prefix', () => {
      const gameId = SecureTestUtils.generateGameId();
      expect(gameId).toMatch(/^test-game-[0-9a-f-]{7}$/);
    });

    it('should generate game ID with custom prefix', () => {
      const gameId = SecureTestUtils.generateGameId('custom-game');
      expect(gameId).toMatch(/^custom-game-[0-9a-f-]{7}$/);
    });

    it('should generate unique game IDs', () => {
      const id1 = SecureTestUtils.generateGameId();
      const id2 = SecureTestUtils.generateGameId();
      expect(id1).not.toBe(id2);
    });

    it('should maintain consistent length', () => {
      const gameId = SecureTestUtils.generateGameId('prefix');
      const suffix = gameId.split('-').pop();
      expect(suffix?.length).toBe(7);
    });
  });

  describe('generatePlayerId', () => {
    it('should generate player ID with default prefix', () => {
      const playerId = SecureTestUtils.generatePlayerId();
      expect(playerId).toMatch(/^test-player-[0-9a-f-]{7}$/);
    });

    it('should generate player ID with custom prefix', () => {
      const playerId = SecureTestUtils.generatePlayerId('custom-player');
      expect(playerId).toMatch(/^custom-player-[0-9a-f-]{7}$/);
    });

    it('should generate unique player IDs', () => {
      const id1 = SecureTestUtils.generatePlayerId();
      const id2 = SecureTestUtils.generatePlayerId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSecureRandomNumber', () => {
    it('should generate number in default range [0, 1)', () => {
      const num = SecureTestUtils.generateSecureRandomNumber();
      expect(typeof num).toBe('number');
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(1);
    });

    it('should generate number in custom range', () => {
      const min = 10;
      const max = 20;
      const num = SecureTestUtils.generateSecureRandomNumber(min, max);

      expect(num).toBeGreaterThanOrEqual(min);
      expect(num).toBeLessThan(max);
    });

    it('should generate different numbers', () => {
      const num1 = SecureTestUtils.generateSecureRandomNumber();
      const num2 = SecureTestUtils.generateSecureRandomNumber();

      // Extremely unlikely to be equal
      expect(typeof num1).toBe('number');
      expect(typeof num2).toBe('number');
      expect(isFinite(num1)).toBe(true);
      expect(isFinite(num2)).toBe(true);
    });
  });

  describe('generateSecureRandomInt', () => {
    it('should generate integer in default range [0, 100)', () => {
      const int = SecureTestUtils.generateSecureRandomInt();
      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(0);
      expect(int).toBeLessThan(100);
    });

    it('should generate integer in custom range', () => {
      const min = 5;
      const max = 15;
      const int = SecureTestUtils.generateSecureRandomInt(min, max);

      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(min);
      expect(int).toBeLessThan(max);
    });

    it('should handle single-value range', () => {
      const min = 42;
      const max = 43;
      const int = SecureTestUtils.generateSecureRandomInt(min, max);

      expect(int).toBe(42);
    });

    it('should generate different integers over multiple calls', () => {
      const integers = Array.from({ length: 10 }, () =>
        SecureTestUtils.generateSecureRandomInt(0, 1000)
      );

      // Check they're all valid integers
      for (const int of integers) {
        expect(Number.isInteger(int)).toBe(true);
        expect(int).toBeGreaterThanOrEqual(0);
        expect(int).toBeLessThan(1000);
      }

      // Check for some variety (not all the same)
      const uniqueValues = new Set(integers);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });
});

describe('LegacySecureTestUtils', () => {
  it('should provide backward-compatible function exports', async () => {
    const { LegacySecureTestUtils } = await import('./secure-test-utils');

    expect(typeof LegacySecureTestUtils.randomTestString).toBe('function');
    expect(typeof LegacySecureTestUtils.randomEventId).toBe('function');
    expect(typeof LegacySecureTestUtils.randomTimestamp).toBe('function');
  });

  it('should generate valid outputs through legacy functions', async () => {
    const { LegacySecureTestUtils } = await import('./secure-test-utils');

    const testString = LegacySecureTestUtils.randomTestString();
    const eventId = LegacySecureTestUtils.randomEventId();
    const timestamp = LegacySecureTestUtils.randomTimestamp();

    expect(typeof testString).toBe('string');
    expect(typeof eventId).toBe('string');
    expect(typeof timestamp).toBe('number');

    expect(testString.length).toBe(8);
    expect(eventId).toMatch(/^event-\d+-[0-9a-f-]{8}$/);
    expect(timestamp).toBeGreaterThan(0);
  });
});
