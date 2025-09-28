/**
 * @file Jersey Number Constants
 * Constants related to jersey number management and assignment.
 *
 * @remarks
 * Centralizes jersey number rules and boundaries to ensure consistency
 * across the domain layer, especially for substitute player scenarios.
 *
 * Design Principles:
 * - Clear naming that reflects business meaning
 * - Values based on softball jersey number conventions
 * - Immutable constants to prevent accidental modification
 *
 * @example
 * ```typescript
 * // Finding next available jersey for substitute
 * let jerseyNum = JERSEY_NUMBERS.SUBSTITUTE_START;
 * while (usedJerseys.includes(jerseyNum) && jerseyNum <= JERSEY_NUMBERS.MAX_ALLOWED) {
 *   jerseyNum++;
 * }
 * ```
 */

/**
 * Jersey number constants for consistent assignment across the domain.
 */
export const JERSEY_NUMBERS = {
  /**
   * Starting jersey number for substitute players.
   *
   * @remarks
   * Starting from 50 avoids conflicts with typical starter jersey numbers (1-49).
   * This provides a clear separation between regular players and substitutes.
   */
  SUBSTITUTE_START: 50,

  /**
   * Maximum allowed jersey number.
   *
   * @remarks
   * Standard softball jersey number limit. Some leagues may have different
   * restrictions, but 99 is a common upper bound.
   */
  MAX_ALLOWED: 99,

  /**
   * Minimum allowed jersey number.
   *
   * @remarks
   * Jersey number 0 is typically not allowed in most softball leagues.
   */
  MIN_ALLOWED: 1,
} as const;
