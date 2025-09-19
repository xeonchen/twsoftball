import { describe, it, expect, beforeEach } from 'vitest';

import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { GameScore } from '../value-objects/GameScore.js';
import { Score } from '../value-objects/Score.js';

import { TestGameFactory } from './TestGameFactory.js';

describe('TestGameFactory', () => {
  beforeEach(() => {
    // Reset counter for predictable test results
    TestGameFactory.resetGameIdCounter();
  });

  describe('createGameId', () => {
    it('should create unique game IDs with counter', () => {
      const id1 = TestGameFactory.createGameId();
      const id2 = TestGameFactory.createGameId();

      expect(id1).toBeInstanceOf(GameId);
      expect(id2).toBeInstanceOf(GameId);
      expect(id1.equals(id2)).toBe(false);
      expect(id1.value).toBe('test-game-1');
      expect(id2.value).toBe('test-game-2');
    });

    it('should create game ID with custom suffix', () => {
      const gameId = TestGameFactory.createGameId('mercy-rule-test');

      expect(gameId).toBeInstanceOf(GameId);
      expect(gameId.value).toContain('mercy-rule-test');
      expect(gameId.value).toContain('test-game-');
    });

    it('should include timestamp in custom suffix IDs for uniqueness', () => {
      const id1 = TestGameFactory.createGameId('same-suffix');
      const id2 = TestGameFactory.createGameId('same-suffix');

      expect(id1.equals(id2)).toBe(false); // Should be unique due to timestamp
    });
  });

  describe('createScore', () => {
    it('should create Score with specified runs', () => {
      const score = TestGameFactory.createScore(5);

      expect(score).toBeInstanceOf(Score);
      expect(score.runs).toBe(5);
    });

    it('should create Score with zero runs by default', () => {
      const score = TestGameFactory.createScore();

      expect(score).toBeInstanceOf(Score);
      expect(score.runs).toBe(0);
    });

    it('should create Score with large number of runs', () => {
      const score = TestGameFactory.createScore(25);

      expect(score.runs).toBe(25);
    });

    it('should handle edge case of maximum reasonable runs', () => {
      const score = TestGameFactory.createScore(999);

      expect(score.runs).toBe(999);
    });
  });

  describe('createGameScore', () => {
    it('should create GameScore with specified home and away runs', () => {
      const gameScore = TestGameFactory.createGameScore(5, 3);

      expect(gameScore).toBeInstanceOf(GameScore);
      expect(gameScore.getHomeRuns()).toBe(5);
      expect(gameScore.getAwayRuns()).toBe(3);
      expect(gameScore.getRunDifferential()).toBe(2);
    });

    it('should create GameScore with zero runs by default', () => {
      const gameScore = TestGameFactory.createGameScore();

      expect(gameScore.getHomeRuns()).toBe(0);
      expect(gameScore.getAwayRuns()).toBe(0);
      expect(gameScore.isTied()).toBe(true);
    });

    it('should create tied game', () => {
      const gameScore = TestGameFactory.createGameScore(7, 7);

      expect(gameScore.isTied()).toBe(true);
      expect(gameScore.getRunDifferential()).toBe(0);
    });

    it('should create away team leading scenario', () => {
      const gameScore = TestGameFactory.createGameScore(2, 5);

      expect(gameScore.isAwayWinning()).toBe(true);
      expect(gameScore.getRunDifferential()).toBe(-3); // Home trailing by 3
    });
  });

  describe('createValidRules', () => {
    it('should create SoftballRules with default settings', () => {
      const rules = TestGameFactory.createValidRules();

      expect(rules).toBeInstanceOf(SoftballRules);
      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(60);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
    });

    it('should override specific rules while keeping defaults', () => {
      const rules = TestGameFactory.createValidRules({
        totalInnings: 5,
        allowReEntry: true,
      });

      expect(rules.totalInnings).toBe(5); // Overridden
      expect(rules.allowReEntry).toBe(true); // Overridden
      expect(rules.maxPlayersPerTeam).toBe(25); // Default
      expect(rules.mercyRuleEnabled).toBe(true); // Default
    });

    it('should create rules with custom mercy rule settings', () => {
      const rules = TestGameFactory.createValidRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
      });

      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toHaveLength(1);
      expect(rules.mercyRuleTiers[0]).toEqual({ differential: 15, afterInning: 3 });
    });
  });

  describe('createFastTestRules', () => {
    it('should create rules optimized for fast testing', () => {
      const rules = TestGameFactory.createFastTestRules();

      expect(rules.totalInnings).toBe(3); // Shorter games
      expect(rules.maxPlayersPerTeam).toBe(15); // Smaller teams
      expect(rules.timeLimitMinutes).toBe(null); // No time pressure
      expect(rules.allowReEntry).toBe(true); // More flexibility
      expect(rules.mercyRuleEnabled).toBe(false); // Let tests run
      expect(rules.maxExtraInnings).toBe(10); // Minimal requirements
    });

    it('should override fast test defaults', () => {
      const rules = TestGameFactory.createFastTestRules({
        totalInnings: 1,
        mercyRuleEnabled: true,
      });

      expect(rules.totalInnings).toBe(1); // Overridden
      expect(rules.mercyRuleEnabled).toBe(true); // Overridden
      expect(rules.allowReEntry).toBe(true); // Fast test default
      expect(rules.maxExtraInnings).toBe(10); // Fast test default
    });
  });

  describe('createMercyRules', () => {
    it('should create rules with default mercy rule tiers', () => {
      const rules = TestGameFactory.createMercyRules();

      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toHaveLength(3);
      expect(rules.mercyRuleTiers[0]).toEqual({ differential: 15, afterInning: 3 });
      expect(rules.mercyRuleTiers[1]).toEqual({ differential: 10, afterInning: 5 });
      expect(rules.mercyRuleTiers[2]).toEqual({ differential: 7, afterInning: 7 });
    });

    it('should create rules with custom mercy rule tiers', () => {
      const customTiers = [
        { differential: 20, afterInning: 2 },
        { differential: 12, afterInning: 4 },
      ];
      const rules = TestGameFactory.createMercyRules(customTiers);

      expect(rules.mercyRuleTiers).toEqual(customTiers);
      expect(rules.mercyRuleEnabled).toBe(true);
    });

    it('should create rules with empty mercy tiers', () => {
      const rules = TestGameFactory.createMercyRules([]);

      expect(rules.mercyRuleTiers).toEqual([]);
      expect(rules.mercyRuleEnabled).toBe(true);
    });

    it('should override other rules while maintaining mercy settings', () => {
      const rules = TestGameFactory.createMercyRules(undefined, {
        totalInnings: 5,
        allowReEntry: true,
      });

      expect(rules.totalInnings).toBe(5); // Overridden
      expect(rules.allowReEntry).toBe(true); // Overridden
      expect(rules.mercyRuleEnabled).toBe(true); // Mercy default
      expect(rules.mercyRuleTiers).toHaveLength(3); // Default mercy tiers
    });
  });

  describe('createReEntryRules', () => {
    it('should create rules with re-entry enabled', () => {
      const rules = TestGameFactory.createReEntryRules();

      expect(rules.allowReEntry).toBe(true); // Key difference
      expect(rules.totalInnings).toBe(7); // Standard default
      expect(rules.mercyRuleEnabled).toBe(true); // Standard default
    });

    it('should override re-entry rules', () => {
      const rules = TestGameFactory.createReEntryRules({
        allowReEntry: false,
        totalInnings: 9,
      });

      expect(rules.allowReEntry).toBe(false); // Overridden
      expect(rules.totalInnings).toBe(9); // Overridden
      expect(rules.mercyRuleEnabled).toBe(true); // Default maintained
    });
  });

  describe('createCommonScenarios', () => {
    it('should create all expected scenario types', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios).toHaveProperty('tied');
      expect(scenarios).toHaveProperty('closeGame');
      expect(scenarios).toHaveProperty('walkoffSituation');
      expect(scenarios).toHaveProperty('mercyRuleTriggered');
      expect(scenarios).toHaveProperty('largeLead');
      expect(scenarios).toHaveProperty('extraInningTie');
      expect(scenarios).toHaveProperty('slugfest');
      expect(scenarios).toHaveProperty('shutout');
      expect(scenarios).toHaveProperty('perfectGame');
    });

    it('should create tied game scenario', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios['tied']!.isTied()).toBe(true);
      expect(scenarios['tied']!.getHomeRuns()).toBe(0);
      expect(scenarios['tied']!.getAwayRuns()).toBe(0);
    });

    it('should create mercy rule scenario', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios['mercyRuleTriggered']!.getRunDifferential()).toBeGreaterThanOrEqual(15);
      expect(scenarios['mercyRuleTriggered']!.isHomeWinning()).toBe(true);
    });

    it('should create walkoff situation', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios['walkoffSituation']!.isAwayWinning()).toBe(true);
      expect(scenarios['walkoffSituation']!.getRunDifferential()).toBe(-1); // Away leads by 1
    });

    it('should create high-scoring scenario', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios['slugfest']!.getHomeRuns()).toBe(18);
      expect(scenarios['slugfest']!.getAwayRuns()).toBe(16);
      expect(scenarios['slugfest']!.isHomeWinning()).toBe(true);
    });

    it('should create shutout scenario', () => {
      const scenarios = TestGameFactory.createCommonScenarios();

      expect(scenarios['shutout']!.getAwayRuns()).toBe(0);
      expect(scenarios['shutout']!.getHomeRuns()).toBeGreaterThan(0);
    });
  });

  describe('resetGameIdCounter', () => {
    it('should reset counter to 0', () => {
      // Create some IDs to increment counter
      TestGameFactory.createGameId();
      TestGameFactory.createGameId();

      // Reset counter
      TestGameFactory.resetGameIdCounter();

      // Next ID should start from 1 again
      const id = TestGameFactory.createGameId();
      expect(id.value).toBe('test-game-1');
    });

    it('should provide consistent IDs after reset', () => {
      TestGameFactory.resetGameIdCounter();
      const id1 = TestGameFactory.createGameId();

      TestGameFactory.resetGameIdCounter();
      const id2 = TestGameFactory.createGameId();

      expect(id1.value).toBe(id2.value);
      expect(id1.value).toBe('test-game-1');
    });
  });

  describe('integration with domain objects', () => {
    it('should create objects compatible with game domain', () => {
      const gameId = TestGameFactory.createGameId();
      const score = TestGameFactory.createScore(5);
      const gameScore = TestGameFactory.createGameScore(3, 2);
      const rules = TestGameFactory.createValidRules();

      // All objects should be properly typed domain objects
      expect(gameId).toBeInstanceOf(GameId);
      expect(score).toBeInstanceOf(Score);
      expect(gameScore).toBeInstanceOf(GameScore);
      expect(rules).toBeInstanceOf(SoftballRules);
    });

    it('should create rules that validate correctly', () => {
      const rules = TestGameFactory.createValidRules();

      // Rules should be self-consistent and valid
      expect(rules.totalInnings).toBeGreaterThan(0);
      expect(rules.maxPlayersPerTeam).toBeGreaterThanOrEqual(9);
      expect(rules.maxPlayersPerTeam).toBeGreaterThan(0);
    });

    it('should create scores that work with game logic', () => {
      const gameScore = TestGameFactory.createGameScore(5, 3);

      // Score should support all expected operations
      expect(gameScore.isHomeWinning()).toBe(true);
      expect(gameScore.getRunDifferential()).toBe(2);
      expect(gameScore.toString()).toBe('5-3');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle zero runs in createScore', () => {
      const score = TestGameFactory.createScore(0);
      expect(score.runs).toBe(0);
    });

    it('should handle large run counts', () => {
      const gameScore = TestGameFactory.createGameScore(50, 45);
      expect(gameScore.getHomeRuns()).toBe(50);
      expect(gameScore.getAwayRuns()).toBe(45);
    });

    it('should maintain counter state between calls', () => {
      const id1 = TestGameFactory.createGameId();
      const id2 = TestGameFactory.createGameId();
      const id3 = TestGameFactory.createGameId();

      expect(id1.value).toBe('test-game-1');
      expect(id2.value).toBe('test-game-2');
      expect(id3.value).toBe('test-game-3');
    });
  });
});
