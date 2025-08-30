import { GameId } from '../value-objects/GameId';
import { DomainError } from '../errors/DomainError';
import type { DomainEvent } from '../events/DomainEvent';

/**
 * Test helper for event and score testing operations.
 *
 * @remarks
 * This utility reduces code duplication in event-related test files by providing
 * common score creation patterns, validation scenarios, and assertion helpers.
 * Particularly useful for testing domain events and score validation logic.
 *
 * **Key Benefits:**
 * - Eliminates duplicated score object creation across event tests
 * - Provides comprehensive validation test scenarios for scores
 * - Offers standardized GameId creation for consistent testing
 * - Includes assertion helpers for event and error validation
 *
 * **Common Use Cases:**
 * - Creating score objects for event testing
 * - Testing score validation with edge cases
 * - Creating consistent GameId instances for tests
 * - Validating domain events have required properties
 * - Testing error handling with expected error messages
 *
 * @example
 * ```typescript
 * // Create standard score for testing
 * const score = EventTestHelper.createValidScore(); // { home: 5, away: 3 }
 *
 * // Test score validation with scenarios
 * const scenarios = EventTestHelper.createScoreScenarios();
 * scenarios.forEach(scenario => {
 *   if (scenario.valid) {
 *     expect(() => new GameScore(scenario.score)).not.toThrow();
 *   } else {
 *     expect(() => new GameScore(scenario.score)).toThrow();
 *   }
 * });
 *
 * // Create GameId for events
 * const gameId = EventTestHelper.createGameId('my-test');
 *
 * // Validate error handling
 * EventTestHelper.assertScoreValidationError(
 *   () => new Score(-1),
 *   'Score cannot be negative'
 * );
 * ```
 */
export class EventTestHelper {
  /**
   * Creates a valid score object with default values.
   *
   * @param home - Home team score (defaults to 5)
   * @param away - Away team score (defaults to 3)
   * @returns Score object with specified values
   *
   * @example
   * ```typescript
   * // Use defaults for standard testing
   * const defaultScore = EventTestHelper.createValidScore();
   * expect(defaultScore).toEqual({ home: 5, away: 3 });
   *
   * // Create specific score for test scenario
   * const tieScore = EventTestHelper.createValidScore(7, 7);
   * const shutoutScore = EventTestHelper.createValidScore(10, 0);
   * ```
   *
   * @remarks
   * Provides a consistent way to create score objects for testing without
   * duplicating score creation logic. Default values (5-3) represent a
   * realistic game score that works for most test scenarios.
   */
  public static createValidScore(
    home: number = 5,
    away: number = 3
  ): { home: number; away: number } {
    return { home, away };
  }

  /**
   * Creates comprehensive test scenarios for score validation.
   *
   * @returns Array of test scenarios with valid/invalid scores and descriptions
   *
   * @example
   * ```typescript
   * const scenarios = EventTestHelper.createScoreScenarios();
   *
   * scenarios.forEach(scenario => {
   *   if (scenario.valid) {
   *     expect(() => createScoreObject(scenario.score)).not.toThrow();
   *   } else {
   *     expect(() => createScoreObject(scenario.score)).toThrow();
   *   }
   * });
   * ```
   *
   * @remarks
   * Returns a comprehensive set of test cases covering valid scores, edge cases,
   * and invalid inputs. Each scenario includes a descriptive message for
   * clear test output and debugging. Covers numerical validation, type validation,
   * and boundary conditions.
   */
  public static createScoreScenarios(): Array<{
    valid: boolean;
    score: unknown;
    description: string;
  }> {
    return [
      // Valid scenarios
      { valid: true, score: { home: 0, away: 0 }, description: 'zero score game' },
      { valid: true, score: { home: 5, away: 3 }, description: 'typical game score' },
      { valid: true, score: { home: 15, away: 12 }, description: 'high scoring game' },
      { valid: true, score: { home: 1, away: 0 }, description: 'low scoring game' },
      { valid: true, score: { home: 25, away: 25 }, description: 'tied high score game' },

      // Invalid scenarios - negative scores
      { valid: false, score: { home: -1, away: 3 }, description: 'negative home score' },
      { valid: false, score: { home: 5, away: -2 }, description: 'negative away score' },
      { valid: false, score: { home: -5, away: -3 }, description: 'both scores negative' },

      // Invalid scenarios - non-integer scores
      { valid: false, score: { home: 3.5, away: 2 }, description: 'decimal home score' },
      { valid: false, score: { home: 1, away: 2.7 }, description: 'decimal away score' },
      { valid: false, score: { home: 1.5, away: 2.5 }, description: 'both scores decimal' },

      // Invalid scenarios - non-numeric values
      { valid: false, score: { home: '5', away: 3 }, description: 'string home score' },
      { valid: false, score: { home: 2, away: '8' }, description: 'string away score' },
      { valid: false, score: { home: 'five', away: 'three' }, description: 'text scores' },

      // Invalid scenarios - null/undefined
      { valid: false, score: { home: null, away: 3 }, description: 'null home score' },
      { valid: false, score: { home: 5, away: null }, description: 'null away score' },
      { valid: false, score: { home: undefined, away: 3 }, description: 'undefined home score' },
      { valid: false, score: { home: 2, away: undefined }, description: 'undefined away score' },

      // Invalid scenarios - missing properties
      { valid: false, score: { home: 5 }, description: 'missing away score' },
      { valid: false, score: { away: 3 }, description: 'missing home score' },
      { valid: false, score: {}, description: 'empty score object' },
      { valid: false, score: null, description: 'null score object' },
      { valid: false, score: undefined, description: 'undefined score object' },

      // Invalid scenarios - extra properties
      {
        valid: false,
        score: { home: 5, away: 3, extra: 1 },
        description: 'extra property in score',
      },

      // Invalid scenarios - array instead of object
      { valid: false, score: [5, 3], description: 'array instead of score object' },

      // Invalid scenarios - infinity and NaN
      { valid: false, score: { home: Infinity, away: 3 }, description: 'infinite home score' },
      { valid: false, score: { home: 5, away: Infinity }, description: 'infinite away score' },
      { valid: false, score: { home: NaN, away: 3 }, description: 'NaN home score' },
      { valid: false, score: { home: 2, away: NaN }, description: 'NaN away score' },
    ];
  }

  /**
   * Creates a GameId instance with a standardized prefix.
   *
   * @param suffix - Suffix to append to the game ID (defaults to 'test')
   * @returns GameId instance with format 'game-{suffix}'
   *
   * @example
   * ```typescript
   * // Create standard test GameId
   * const gameId = EventTestHelper.createGameId();
   * expect(gameId.value).toBe('game-test');
   *
   * // Create GameId for specific test scenario
   * const homeGameId = EventTestHelper.createGameId('home-vs-away');
   * const eventGameId = EventTestHelper.createGameId('event-test');
   * ```
   *
   * @remarks
   * Provides consistent GameId creation across event tests. Uses a predictable
   * format that makes test debugging easier while ensuring all created GameIds
   * are valid according to domain rules.
   */
  public static createGameId(suffix: string = 'test'): GameId {
    return new GameId(`game-${suffix}`);
  }

  /**
   * Asserts that a domain event has valid properties.
   *
   * @param event - The domain event to validate
   * @throws {Error} If the event is missing required properties
   *
   * @example
   * ```typescript
   * const event = new AtBatCompleted(gameId, playerId, 1, AtBatResultType.SINGLE, 2, 0);
   * EventTestHelper.assertEventValid(event); // Should not throw
   *
   * // Use in test assertions
   * const createdEvent = eventFactory.createEvent(...);
   * EventTestHelper.assertEventValid(createdEvent);
   * ```
   *
   * @remarks
   * Validates that the event has basic domain event properties like gameId,
   * timestamp, and type. This provides a standard way to verify event
   * construction across different event types without duplicating validation logic.
   */
  public static assertEventValid(event: DomainEvent): void {
    if (!event.gameId) {
      throw new Error('Event must have a gameId property');
    }

    if (!(event.timestamp instanceof Date)) {
      throw new Error('Event must have a Date timestamp property');
    }

    if (!event.type) {
      throw new Error('Event must have a type property');
    }

    // Basic sanity checks
    if (event.timestamp.getTime() <= 0) {
      throw new Error('Event timestamp must be a valid date');
    }
  }

  /**
   * Asserts that a function throws a DomainError with the expected message.
   *
   * @param fn - Function that should throw the error
   * @param expectedMessage - Expected error message
   * @throws {Error} If function doesn't throw expected error
   *
   * @example
   * ```typescript
   * // Test score validation error
   * EventTestHelper.assertScoreValidationError(
   *   () => new Score(-1),
   *   'Score cannot be negative'
   * );
   *
   * // Test GameScore validation error
   * EventTestHelper.assertScoreValidationError(
   *   () => new GameScore({ home: 'invalid', away: 5 }),
   *   'Home score must be a non-negative integer'
   * );
   * ```
   *
   * @remarks
   * Provides standardized error validation for score-related domain logic.
   * Ensures error messages match expectations and that appropriate error types
   * are thrown. Particularly useful for testing value object validation.
   */
  public static assertScoreValidationError(fn: () => void, expectedMessage: string): void {
    let thrownError: Error | null = null;

    try {
      fn();
    } catch (error) {
      thrownError = error as Error;
    }

    if (!thrownError) {
      throw new Error(`Expected function to throw error with message: "${expectedMessage}"`);
    }

    if (!(thrownError instanceof DomainError)) {
      throw new Error(`Expected DomainError, but got: ${thrownError.constructor.name}`);
    }

    if (thrownError.message !== expectedMessage) {
      throw new Error(
        `Expected error message: "${expectedMessage}", but got: "${thrownError.message}"`
      );
    }
  }
}
