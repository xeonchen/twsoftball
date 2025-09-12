/**
 * @file SecureRandom
 * Cryptographically secure random number generation utilities
 *
 * @remarks
 * This utility provides secure alternatives to Math.random() using the Web Crypto API.
 * All methods use crypto.getRandomValues() or crypto.randomUUID() for cryptographic security,
 * eliminating security hotspots identified by static code analysis tools like SonarQube.
 *
 * These are fundamental primitives that can be used across all architecture layers
 * without creating dependency violations.
 */

/**
 * Cryptographically secure random number generation utilities.
 *
 * @remarks
 * Provides drop-in replacements for Math.random() and related operations
 * using Web Crypto API for security compliance. These primitives are designed
 * to be used across all architecture layers (Domain, Application, Infrastructure).
 *
 * @example
 * ```typescript
 * import { SecureRandom } from '@twsoftball/shared/utils/SecureRandom';
 *
 * // Direct Math.random() replacement
 * const float = SecureRandom.randomFloat(); // [0, 1)
 *
 * // Secure random in range
 * const delay = SecureRandom.randomFloatRange(0, 1000);
 * const index = SecureRandom.randomInt(0, array.length);
 *
 * // Secure random identifiers
 * const id = SecureRandom.randomStringId(); // 8 chars
 * const key = SecureRandom.randomStringId(12); // 12 chars
 * ```
 */
export class SecureRandom {
  /**
   * Generate a cryptographically secure random float in the range [0, 1).
   *
   * @remarks
   * Direct replacement for Math.random() using crypto.getRandomValues().
   * Provides the same range and distribution as Math.random() but with
   * cryptographic security.
   *
   * @returns A secure random floating-point number between 0 (inclusive) and 1 (exclusive)
   *
   * @example
   * ```typescript
   * // Replace Math.random()
   * const oldWay = Math.random();
   * const newWay = SecureRandom.randomFloat();
   *
   * // Both return values in [0, 1) range
   * console.log(typeof newWay); // 'number'
   * console.log(newWay >= 0 && newWay < 1); // true
   * ```
   */
  static randomFloat(): number {
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    // Use 0x100000000 instead of 0xffffffff to ensure result is always < 1
    return randomBytes[0]! / 0x100000000;
  }

  /**
   * Generate a cryptographically secure random float in a specified range.
   *
   * @remarks
   * Uses secure random generation to produce a float within [min, max).
   * Commonly used for jitter calculations, delays, and other range-based randomization.
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns A secure random floating-point number in the specified range
   *
   * @example
   * ```typescript
   * // Jitter for retry delays
   * const jitterMs = SecureRandom.randomFloatRange(0, 100);
   *
   * // Random percentage
   * const percentage = SecureRandom.randomFloatRange(0.0, 1.0);
   *
   * // Random delay with variance
   * const baseDelay = 1000;
   * const variance = 0.1;
   * const jitter = SecureRandom.randomFloatRange(0, variance * baseDelay);
   * ```
   */
  static randomFloatRange(min: number, max: number): number {
    if (min >= max) {
      throw new Error(`Invalid range: min (${min}) must be less than max (${max})`);
    }
    const randomFloat = this.randomFloat();
    return min + randomFloat * (max - min);
  }

  /**
   * Generate a cryptographically secure random integer in a specified range.
   *
   * @remarks
   * Uses secure random generation to produce an integer within [min, max).
   * The maximum value is exclusive to match common programming patterns.
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns A secure random integer in the specified range
   *
   * @example
   * ```typescript
   * // Random array index
   * const index = SecureRandom.randomInt(0, myArray.length);
   *
   * // Random port number
   * const port = SecureRandom.randomInt(3000, 4000);
   *
   * // Random dice roll (1-6)
   * const diceRoll = SecureRandom.randomInt(1, 7);
   * ```
   */
  static randomInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error(`Invalid range: min (${min}) must be less than max (${max})`);
    }
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('Both min and max must be integers');
    }

    const range = max - min;
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    return min + (randomBytes[0]! % range);
  }

  /**
   * Generate a cryptographically secure random string identifier.
   *
   * @remarks
   * Uses crypto.randomUUID() as the source of entropy and extracts a substring
   * of the specified length. Default length of 8 characters provides good uniqueness
   * for most use cases while remaining concise.
   *
   * @param length - Length of the string to generate (defaults to 8)
   * @returns A secure random string identifier
   *
   * @example
   * ```typescript
   * // Default 8-character ID
   * const id = SecureRandom.randomStringId(); // "a1b2c3d4"
   *
   * // Custom length
   * const longId = SecureRandom.randomStringId(16); // "a1b2c3d4e5f6g7h8"
   *
   * // For database keys
   * const dbKey = SecureRandom.randomStringId(12);
   * ```
   */
  static randomStringId(length: number = 8): string {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }
    if (length > 32) {
      throw new Error('Length cannot exceed 32 characters (UUID without hyphens length limit)');
    }

    // Generate UUID and remove hyphens to get continuous characters
    const uuid = crypto.randomUUID().replace(/-/g, '');
    return uuid.substring(0, length);
  }

  /**
   * Generate a full cryptographically secure UUID.
   *
   * @remarks
   * Direct wrapper around crypto.randomUUID() for completeness.
   * Use this when you need a full UUID rather than a shorter identifier.
   *
   * @returns A secure random UUID string
   *
   * @example
   * ```typescript
   * const uuid = SecureRandom.randomUUID();
   * // "123e4567-e89b-12d3-a456-426614174000"
   * ```
   */
  static randomUUID(): string {
    return crypto.randomUUID();
  }
}
