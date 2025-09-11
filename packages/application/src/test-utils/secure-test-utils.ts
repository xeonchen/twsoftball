import { SecureRandom } from '@twsoftball/shared';

/**
 * Secure test utilities to replace Math.random() with cryptographically secure alternatives.
 *
 * @remarks
 * This utility provides secure random generation for test scenarios, eliminating
 * security hotspots from static code analysis while maintaining test functionality.
 *
 * All methods delegate to SecureRandom primitives from the shared package for
 * cryptographic security while providing domain-specific convenience methods.
 *
 * @example
 * ```typescript
 * import { SecureTestUtils } from '../test-utils/secure-test-utils';
 *
 * // Replace Math.random() usage
 * const gameId = `test-game-${SecureTestUtils.generateTestId()}`;
 * const playerId = `test-player-${SecureTestUtils.generateTestId()}`;
 * const timestamp = SecureTestUtils.generateTestTimestamp();
 * ```
 */

export class SecureTestUtils {
  /**
   * Generate a secure random test identifier.
   *
   * @remarks
   * Replaces Math.random().toString(36).substring(7) with crypto.randomUUID()
   * for security compliance while maintaining similar format.
   *
   * @returns A secure random string identifier suitable for tests
   */
  static generateTestId(): string {
    return SecureRandom.randomStringId(8);
  }

  /**
   * Generate a secure random event ID with timestamp prefix.
   *
   * @remarks
   * Replaces `event-${Date.now()}-${Math.random()}` patterns with
   * secure random generation.
   *
   * @returns A secure event ID with timestamp and random components
   */
  static generateEventId(): string {
    const timestamp = Date.now();
    const randomId = SecureRandom.randomStringId(8);
    return `event-${timestamp}-${randomId}`;
  }

  /**
   * Generate a secure random timestamp offset for testing.
   *
   * @remarks
   * Replaces `Date.now() + Math.random() * 1000` patterns with
   * secure random generation for test timestamps.
   *
   * @param baseTime Optional base timestamp (defaults to Date.now())
   * @param maxOffsetMs Maximum offset in milliseconds (defaults to 1000)
   * @returns A timestamp with secure random offset
   */
  static generateTestTimestamp(baseTime?: number, maxOffsetMs: number = 1000): number {
    const base = baseTime ?? Date.now();
    // Use SecureRandom for secure offset generation
    const randomOffset = SecureRandom.randomFloatRange(0, maxOffsetMs);
    return base + randomOffset;
  }

  /**
   * Generate a secure random game identifier for advanced testing.
   *
   * @remarks
   * Replaces patterns like 'test-game-advanced-' + Math.random().toString(36).substring(7)
   * with secure random generation.
   *
   * @param prefix Optional prefix for the game ID (defaults to 'test-game')
   * @returns A secure random game identifier
   */
  static generateGameId(prefix: string = 'test-game'): string {
    const randomId = SecureRandom.randomStringId(7); // Match original length
    return `${prefix}-${randomId}`;
  }

  /**
   * Generate a secure random player identifier for advanced testing.
   *
   * @remarks
   * Replaces patterns like 'test-player-advanced-' + Math.random().toString(36).substring(7)
   * with secure random generation.
   *
   * @param prefix Optional prefix for the player ID (defaults to 'test-player')
   * @returns A secure random player identifier
   */
  static generatePlayerId(prefix: string = 'test-player'): string {
    const randomId = SecureRandom.randomStringId(7); // Match original length
    return `${prefix}-${randomId}`;
  }

  /**
   * Generate a secure random number within a range.
   *
   * @remarks
   * Provides a secure alternative to Math.random() for generating
   * numbers within a specific range using crypto.getRandomValues.
   *
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns A secure random number within the specified range
   */
  static generateSecureRandomNumber(min: number = 0, max: number = 1): number {
    return SecureRandom.randomFloatRange(min, max);
  }

  /**
   * Generate a secure random integer within a range.
   *
   * @remarks
   * Provides a secure alternative to Math.floor(Math.random() * max)
   * using crypto.getRandomValues for integer generation.
   *
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns A secure random integer within the specified range
   */
  static generateSecureRandomInt(min: number = 0, max: number = 100): number {
    return SecureRandom.randomInt(min, max);
  }
}

/**
 * Legacy compatibility functions for gradual migration.
 *
 * @deprecated Use SecureTestUtils methods directly for new code
 */
export const LegacySecureTestUtils = {
  /**
   * @deprecated Use SecureTestUtils.generateTestId() instead
   */
  randomTestString: (): string => SecureTestUtils.generateTestId(),

  /**
   * @deprecated Use SecureTestUtils.generateEventId() instead
   */
  randomEventId: (): string => SecureTestUtils.generateEventId(),

  /**
   * @deprecated Use SecureTestUtils.generateTestTimestamp() instead
   */
  randomTimestamp: (): number => SecureTestUtils.generateTestTimestamp(),
} as const;
