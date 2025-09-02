import { SoftballRules } from '../rules/SoftballRules';
import type { MercyRuleTier } from '../rules/SoftballRules';
import { GameId } from '../value-objects/GameId';
import { GameScore } from '../value-objects/GameScore';
import { Score } from '../value-objects/Score';

/**
 * Factory for creating test game-related objects with consistent patterns.
 *
 * @remarks
 * This utility eliminates duplicated game data creation code across test files.
 * Provides methods for creating GameIds, Scores, GameScores, and SoftballRules
 * with sensible defaults while allowing customization for specific test scenarios.
 *
 * @example
 * ```typescript
 * // Create test game ID
 * const gameId = TestGameFactory.createGameId();
 *
 * // Create score objects
 * const score = TestGameFactory.createScore(5);
 * const gameScore = TestGameFactory.createGameScore(3, 2);
 *
 * // Create rules with defaults
 * const rules = TestGameFactory.createValidRules();
 * ```
 */
export class TestGameFactory {
  /**
   * Counter for generating unique game ID suffixes in tests.
   * Ensures test isolation and prevents ID collisions.
   */
  private static gameIdCounter = 0;

  /**
   * Creates a GameId with optional custom suffix.
   * Uses counter for uniqueness when no suffix provided.
   *
   * @param suffix - Optional suffix to append to game ID
   * @returns A valid GameId for testing
   *
   * @example
   * ```typescript
   * // Generate unique ID
   * const gameId1 = TestGameFactory.createGameId();
   * const gameId2 = TestGameFactory.createGameId();
   * expect(gameId1.equals(gameId2)).toBe(false);
   *
   * // Custom suffix for specific test scenarios
   * const customGameId = TestGameFactory.createGameId('mercy-rule-test');
   * expect(customGameId.value).toContain('mercy-rule-test');
   * ```
   */
  public static createGameId(suffix?: string): GameId {
    if (suffix) {
      this.gameIdCounter += 1;
      return new GameId(`test-game-${suffix}-${Date.now()}-${this.gameIdCounter}`);
    }

    this.gameIdCounter += 1;
    return new GameId(`test-game-${this.gameIdCounter}`);
  }

  /**
   * Creates a Score object with specified run count.
   *
   * @param runs - Number of runs (defaults to 0)
   * @returns A valid Score object
   *
   * @throws {DomainError} If runs is negative
   *
   * @example
   * ```typescript
   * const zeroScore = TestGameFactory.createScore(); // 0 runs
   * const fiveRuns = TestGameFactory.createScore(5);
   * expect(fiveRuns.runs).toBe(5);
   * ```
   */
  public static createScore(runs: number = 0): Score {
    return new Score(runs);
  }

  /**
   * Creates a GameScore object with home and away team scores.
   *
   * @param homeRuns - Home team run count (defaults to 0)
   * @param awayRuns - Away team run count (defaults to 0)
   * @returns A valid GameScore object
   *
   * @throws {DomainError} If either run count is negative
   *
   * @example
   * ```typescript
   * const tiedGame = TestGameFactory.createGameScore(3, 3);
   * const homeLeading = TestGameFactory.createGameScore(5, 2);
   * expect(homeLeading.getRunDifferential()).toBe(3);
   * ```
   */
  public static createGameScore(homeRuns: number = 0, awayRuns: number = 0): GameScore {
    return GameScore.fromRuns(homeRuns, awayRuns);
  }

  /**
   * Creates SoftballRules with default recreational league settings.
   *
   * @param overrides - Optional rule overrides for customization
   * @returns A valid SoftballRules object with sensible defaults
   *
   * @example
   * ```typescript
   * // Standard rules
   * const rules = TestGameFactory.createValidRules();
   *
   * // Custom mercy rule
   * const mercyRules = TestGameFactory.createValidRules({
   *   mercyRuleEnabled: true,
   *   mercyRuleDifferential: 15
   * });
   * ```
   */
  public static createValidRules(
    overrides: Partial<{
      totalInnings: number;
      maxPlayersPerTeam: number;
      timeLimitMinutes: number | null;
      allowReEntry: boolean;
      mercyRuleEnabled: boolean;
      mercyRuleTiers: MercyRuleTier[];
      maxExtraInnings: number | null;
      allowTieGames: boolean;
    }> = {}
  ): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 60,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [],
      maxExtraInnings: null,
      allowTieGames: false,
      ...overrides,
    });
  }

  /**
   * Creates SoftballRules optimized for fast testing scenarios.
   * Uses minimal settings to speed up test execution.
   *
   * @param overrides - Optional rule overrides for customization
   * @returns A valid SoftballRules object optimized for testing
   *
   * @example
   * ```typescript
   * // Fast 3-inning game for unit tests
   * const fastRules = TestGameFactory.createFastTestRules();
   * expect(fastRules.totalInnings).toBe(3);
   * ```
   */
  public static createFastTestRules(
    overrides: Partial<{
      totalInnings: number;
      maxPlayersPerTeam: number;
      timeLimitMinutes: number | null;
      allowReEntry: boolean;
      mercyRuleEnabled: boolean;
      mercyRuleTiers: MercyRuleTier[];
      maxExtraInnings: number | null;
      allowTieGames: boolean;
    }> = {}
  ): SoftballRules {
    return new SoftballRules({
      totalInnings: 3, // Short games
      maxPlayersPerTeam: 15, // Smaller teams
      timeLimitMinutes: null, // No time pressure in tests
      allowReEntry: true, // More flexibility
      mercyRuleEnabled: false, // Let tests run to completion
      mercyRuleTiers: [],
      maxExtraInnings: 10, // Allow extra innings if needed
      allowTieGames: true, // Allow ties for faster tests
      ...overrides,
    });
  }

  /**
   * Creates SoftballRules with mercy rule enabled and custom tiers.
   *
   * @param tiers - Mercy rule tiers to apply (defaults to common patterns)
   * @param overrides - Optional rule overrides for other settings
   * @returns A valid SoftballRules object with mercy rule configuration
   *
   * @example
   * ```typescript
   * // Standard multi-tier mercy rule
   * const rules = TestGameFactory.createMercyRules();
   *
   * // Custom mercy tiers
   * const customMercy = TestGameFactory.createMercyRules([
   *   { differential: 15, afterInning: 3 },
   *   { differential: 10, afterInning: 5 }
   * ]);
   * ```
   */
  public static createMercyRules(
    tiers: MercyRuleTier[] = [
      { differential: 15, afterInning: 3 },
      { differential: 10, afterInning: 5 },
      { differential: 7, afterInning: 7 },
    ],
    overrides: Partial<{
      totalInnings: number;
      maxPlayersPerTeam: number;
      timeLimitMinutes: number | null;
      allowReEntry: boolean;
      mercyRuleEnabled: boolean;
      maxExtraInnings: number | null;
      allowTieGames: boolean;
    }> = {}
  ): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 60,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: tiers,
      maxExtraInnings: null,
      allowTieGames: false,
      ...overrides,
    });
  }

  /**
   * Creates SoftballRules with re-entry allowed for substitution testing.
   *
   * @param overrides - Optional rule overrides for customization
   * @returns A valid SoftballRules object with re-entry enabled
   *
   * @example
   * ```typescript
   * const reEntryRules = TestGameFactory.createReEntryRules();
   * expect(reEntryRules.allowReEntry).toBe(true);
   * ```
   */
  public static createReEntryRules(
    overrides: Partial<{
      totalInnings: number;
      maxPlayersPerTeam: number;
      timeLimitMinutes: number | null;
      allowReEntry: boolean;
      mercyRuleEnabled: boolean;
      mercyRuleTiers: MercyRuleTier[];
      maxExtraInnings: number | null;
      allowTieGames: boolean;
    }> = {}
  ): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 60,
      allowReEntry: true, // Key difference
      mercyRuleEnabled: true,
      mercyRuleTiers: [],
      maxExtraInnings: null,
      allowTieGames: false,
      ...overrides,
    });
  }

  /**
   * Creates common game scenario scores for testing specific game states.
   *
   * @returns Object containing various pre-configured game scores
   *
   * @example
   * ```typescript
   * const scores = TestGameFactory.createCommonScenarios();
   *
   * // Test tied game logic
   * expect(scores.tied.isHomeTiedWithAway()).toBe(true);
   *
   * // Test mercy rule scenarios
   * expect(scores.mercyRuleTriggered.getRunDifferential()).toBeGreaterThanOrEqual(15);
   * ```
   */
  public static createCommonScenarios(): Record<string, GameScore> {
    return {
      /** 0-0 tie - game start or low-scoring game */
      tied: this.createGameScore(0, 0),

      /** Close game scenarios */
      closeGame: this.createGameScore(5, 4),
      walkoffSituation: this.createGameScore(3, 4), // Away leads by 1

      /** Blowout/mercy rule scenarios */
      mercyRuleTriggered: this.createGameScore(15, 0),
      largeLead: this.createGameScore(12, 3),

      /** Extra inning scenarios */
      extraInningTie: this.createGameScore(7, 7),

      /** High-scoring games */
      slugfest: this.createGameScore(18, 16),

      /** One-sided games */
      shutout: this.createGameScore(8, 0),
      perfectGame: this.createGameScore(1, 0),
    };
  }

  /**
   * Resets the game ID counter for test isolation.
   * Call this in test setup to ensure predictable IDs.
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   TestGameFactory.resetGameIdCounter();
   * });
   * ```
   */
  public static resetGameIdCounter(): void {
    this.gameIdCounter = 0;
  }
}
