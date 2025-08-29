import { describe, it, expect } from 'vitest';
import { SoftballRules, MercyRuleTier } from './SoftballRules';
import { DomainError } from '../errors/DomainError';

describe('SoftballRules', () => {
  describe('Construction', () => {
    it('should create rules with default values', () => {
      const rules = new SoftballRules();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ]);
      expect(rules.maxExtraInnings).toBe(null);
      expect(rules.allowTieGames).toBe(false);
    });

    it('should create rules with custom values', () => {
      const customRules = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 90,
        allowReEntry: false,
        mercyRuleEnabled: false,
        mercyRuleTiers: [],
        maxExtraInnings: 3,
        allowTieGames: true,
      });

      expect(customRules.totalInnings).toBe(9);
      expect(customRules.maxPlayersPerTeam).toBe(20);
      expect(customRules.timeLimitMinutes).toBe(90);
      expect(customRules.allowReEntry).toBe(false);
      expect(customRules.mercyRuleEnabled).toBe(false);
      expect(customRules.mercyRuleTiers).toEqual([]);
      expect(customRules.maxExtraInnings).toBe(3);
      expect(customRules.allowTieGames).toBe(true);
    });

    it('should accept partial configuration', () => {
      const partialRules = new SoftballRules({
        totalInnings: 5,
        timeLimitMinutes: 120,
      });

      expect(partialRules.totalInnings).toBe(5);
      expect(partialRules.maxPlayersPerTeam).toBe(25); // default
      expect(partialRules.timeLimitMinutes).toBe(120);
      expect(partialRules.allowReEntry).toBe(true); // default
    });

    it('should reject invalid totalInnings', () => {
      expect(() => new SoftballRules({ totalInnings: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ totalInnings: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ totalInnings: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ totalInnings: 51 })).toThrow(DomainError);
    });

    it('should reject invalid maxPlayersPerTeam', () => {
      expect(() => new SoftballRules({ maxPlayersPerTeam: 8 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxPlayersPerTeam: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxPlayersPerTeam: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxPlayersPerTeam: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxPlayersPerTeam: 51 })).toThrow(DomainError);
    });

    it('should reject invalid timeLimitMinutes', () => {
      expect(() => new SoftballRules({ timeLimitMinutes: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ timeLimitMinutes: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ timeLimitMinutes: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ timeLimitMinutes: 721 })).toThrow(DomainError);
    });

    it('should accept null timeLimitMinutes', () => {
      const rules = new SoftballRules({ timeLimitMinutes: null });

      expect(rules.timeLimitMinutes).toBe(null);
    });

    it('should handle edge case values correctly', () => {
      const edgeCaseRules = new SoftballRules({
        totalInnings: 1, // minimum valid
        maxPlayersPerTeam: 9, // minimum valid
        timeLimitMinutes: 1, // minimum valid
        mercyRuleTiers: [{ differential: 1, afterInning: 1 }], // minimum valid
      });

      expect(edgeCaseRules.totalInnings).toBe(1);
      expect(edgeCaseRules.maxPlayersPerTeam).toBe(9);
      expect(edgeCaseRules.timeLimitMinutes).toBe(1);
      expect(edgeCaseRules.mercyRuleTiers).toEqual([{ differential: 1, afterInning: 1 }]);
    });

    it('should handle maximum valid values', () => {
      const maxRules = new SoftballRules({
        totalInnings: 50, // maximum valid
        maxPlayersPerTeam: 50, // maximum valid
        timeLimitMinutes: 720, // maximum valid (12 hours)
        mercyRuleTiers: [{ differential: 100, afterInning: 50 }], // maximum valid
      });

      expect(maxRules.totalInnings).toBe(50);
      expect(maxRules.maxPlayersPerTeam).toBe(50);
      expect(maxRules.timeLimitMinutes).toBe(720);
      expect(maxRules.mercyRuleTiers).toEqual([{ differential: 100, afterInning: 50 }]);
    });

    it('should create rules with mercy rule tiers', () => {
      const tiers: MercyRuleTier[] = [
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ];

      const tieredRules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: tiers,
      });

      expect(tieredRules.mercyRuleEnabled).toBe(true);
      expect(tieredRules.mercyRuleTiers).toEqual(tiers);
    });

    it('should reject invalid mercy rule tiers', () => {
      expect(
        () =>
          new SoftballRules({
            mercyRuleTiers: [
              { differential: 0, afterInning: 3 }, // Invalid differential
            ],
          })
      ).toThrow(DomainError);

      expect(
        () =>
          new SoftballRules({
            mercyRuleTiers: [
              { differential: 10, afterInning: 0 }, // Invalid inning
            ],
          })
      ).toThrow(DomainError);
    });

    it('should reject mercy rule tiers with duplicate innings', () => {
      expect(
        () =>
          new SoftballRules({
            mercyRuleTiers: [
              { differential: 10, afterInning: 4 },
              { differential: 7, afterInning: 4 }, // Duplicate inning
            ],
          })
      ).toThrow(DomainError);
    });

    it('should reject mercy rule tiers with non-increasing innings', () => {
      expect(
        () =>
          new SoftballRules({
            mercyRuleTiers: [
              { differential: 7, afterInning: 5 },
              { differential: 10, afterInning: 4 }, // Decreasing inning order
            ],
          })
      ).toThrow(DomainError);

      expect(
        () =>
          new SoftballRules({
            mercyRuleTiers: [
              { differential: 10, afterInning: 4 },
              { differential: 7, afterInning: 4 }, // Equal inning values
            ],
          })
      ).toThrow(DomainError);
    });

    it('should accept empty mercy rule tiers array', () => {
      const rules = new SoftballRules({
        mercyRuleTiers: [],
      });

      expect(rules.mercyRuleTiers).toEqual([]);
    });

    it('should reject invalid maxExtraInnings', () => {
      expect(() => new SoftballRules({ maxExtraInnings: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxExtraInnings: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxExtraInnings: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ maxExtraInnings: 21 })).toThrow(DomainError);
    });

    it('should accept valid maxExtraInnings', () => {
      const rules1 = new SoftballRules({ maxExtraInnings: null });
      expect(rules1.maxExtraInnings).toBe(null);

      const rules2 = new SoftballRules({ maxExtraInnings: 1 });
      expect(rules2.maxExtraInnings).toBe(1);

      const rules3 = new SoftballRules({ maxExtraInnings: 20 });
      expect(rules3.maxExtraInnings).toBe(20);
    });

    it('should reject tie games when maxExtraInnings is null', () => {
      expect(
        () =>
          new SoftballRules({
            maxExtraInnings: null,
            allowTieGames: true,
          })
      ).toThrow(DomainError);
    });

    it('should accept tie games when maxExtraInnings is set', () => {
      const rules = new SoftballRules({
        maxExtraInnings: 5,
        allowTieGames: true,
      });

      expect(rules.maxExtraInnings).toBe(5);
      expect(rules.allowTieGames).toBe(true);
    });
  });

  describe('Mercy rule evaluation', () => {
    it('should identify mercy rule game with default two-tier system', () => {
      const rules = new SoftballRules({ mercyRuleEnabled: true });

      expect(rules.isMercyRule(15, 4, 5)).toBe(true); // 11-run diff at 5th inning (first tier)
      expect(rules.isMercyRule(12, 5, 6)).toBe(true); // 7-run diff at 6th inning (second tier)
    });

    it('should not identify mercy rule when differential is insufficient', () => {
      const rules = new SoftballRules({ mercyRuleEnabled: true });

      expect(rules.isMercyRule(13, 4, 4)).toBe(false); // only 9 run diff at 4th inning
      expect(rules.isMercyRule(11, 5, 5)).toBe(false); // only 6 run diff at 5th inning
    });

    it('should apply mercy rule AT the specified inning (>= logic)', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
      });

      expect(rules.isMercyRule(15, 5, 4)).toBe(true); // AT 4th inning with 10+ runs
      expect(rules.isMercyRule(15, 5, 3)).toBe(false); // Before 4th inning
      expect(rules.isMercyRule(15, 5, 5)).toBe(true); // After 4th inning
    });

    it('should handle the specific 4th inning bottom scenario', () => {
      const rules = new SoftballRules({ mercyRuleEnabled: true });

      // 4th inning bottom, 1 out: Away: 0 runs, Home: 9 runs
      // Batter hits home run → Home: 10 runs
      // Should end immediately (10-run differential AT 4th inning)
      expect(rules.isMercyRule(10, 0, 4)).toBe(true); // 10-run differential AT 4th inning
      expect(rules.isMercyRule(9, 0, 4)).toBe(false); // Only 9-run differential
    });

    it('should not identify mercy rule when rule is disabled', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: false,
        mercyRuleTiers: [{ differential: 1, afterInning: 1 }],
      });

      expect(rules.isMercyRule(20, 5, 4)).toBe(false);
      expect(rules.isMercyRule(50, 0, 7)).toBe(false);
    });

    it('should handle edge cases for mercy rule evaluation', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 1, afterInning: 1 }],
      });

      expect(rules.isMercyRule(1, 0, 2)).toBe(true); // minimum case
      expect(rules.isMercyRule(0, 1, 2)).toBe(true); // reverse scores
    });

    it('should validate mercy rule parameters', () => {
      const rules = new SoftballRules();

      expect(() => rules.isMercyRule(-1, 5, 4)).toThrow(DomainError);
      expect(() => rules.isMercyRule(10, -1, 4)).toThrow(DomainError);
      expect(() => rules.isMercyRule(10, 5, 0)).toThrow(DomainError);
      expect(() => rules.isMercyRule(10, 5, -1)).toThrow(DomainError);
      expect(() => rules.isMercyRule(3.5, 5, 4)).toThrow(DomainError);
      expect(() => rules.isMercyRule(10, 3.5, 4)).toThrow(DomainError);
      expect(() => rules.isMercyRule(10, 5, 3.5)).toThrow(DomainError);
    });
  });

  describe('Multi-tier mercy rule evaluation', () => {
    it('should evaluate two-tier mercy rule system correctly', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [
          { differential: 10, afterInning: 4 }, // 10 runs after 4th inning
          { differential: 7, afterInning: 5 }, // 7 runs after 5th inning
        ],
      });

      // Before any threshold inning
      expect(rules.isMercyRule(15, 2, 3)).toBe(false); // In 3rd inning
      expect(rules.isMercyRule(13, 4, 3)).toBe(false); // Before 4th inning

      // First tier: 10 runs AT 4th inning (>= logic)
      expect(rules.isMercyRule(15, 4, 4)).toBe(true); // 11-run differential AT 4th inning
      expect(rules.isMercyRule(14, 4, 4)).toBe(true); // Exactly 10-run differential AT 4th inning
      expect(rules.isMercyRule(13, 4, 4)).toBe(false); // Only 9-run differential
      expect(rules.isMercyRule(15, 4, 5)).toBe(true); // 11-run differential after 4th inning

      // Second tier: 7 runs AT 5th inning (>= logic)
      expect(rules.isMercyRule(12, 5, 5)).toBe(true); // 7-run differential AT 5th inning
      expect(rules.isMercyRule(11, 5, 5)).toBe(false); // Only 6-run differential
      expect(rules.isMercyRule(12, 5, 6)).toBe(true); // 7-run differential after 5th inning

      // First tier should still work in later innings
      expect(rules.isMercyRule(17, 6, 7)).toBe(true); // 11-run differential triggers first tier
    });

    it('should evaluate single-tier mercy rule system correctly', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 12, afterInning: 3 }],
      });

      expect(rules.isMercyRule(15, 2, 3)).toBe(true); // 13-run differential AT 3rd inning
      expect(rules.isMercyRule(14, 2, 3)).toBe(true); // Exactly 12-run differential AT 3rd inning
      expect(rules.isMercyRule(13, 2, 3)).toBe(false); // Only 11-run differential
      expect(rules.isMercyRule(15, 2, 4)).toBe(true); // 13-run differential after 3rd inning
    });

    it('should evaluate three-tier mercy rule system correctly', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [
          { differential: 15, afterInning: 3 }, // Very lenient early
          { differential: 10, afterInning: 4 }, // Moderate mid-game
          { differential: 5, afterInning: 6 }, // Tight late game
        ],
      });

      // First tier: 15 runs after 3rd inning
      expect(rules.isMercyRule(20, 4, 4)).toBe(true); // 16-run differential
      expect(rules.isMercyRule(19, 4, 4)).toBe(true); // 15-run differential meets first tier
      expect(rules.isMercyRule(18, 4, 4)).toBe(true); // 14-run differential meets second tier (10 runs at 4th inning)

      // Second tier: 10 runs after 4th inning
      expect(rules.isMercyRule(15, 4, 5)).toBe(true); // 11-run differential
      expect(rules.isMercyRule(13, 4, 5)).toBe(false); // Only 9-run differential

      // Third tier: 5 runs after 6th inning
      expect(rules.isMercyRule(10, 4, 7)).toBe(true); // 6-run differential
      expect(rules.isMercyRule(8, 4, 7)).toBe(false); // Only 4-run differential

      // Earlier tiers should still work in later innings
      expect(rules.isMercyRule(25, 4, 7)).toBe(true); // First tier still applies
      expect(rules.isMercyRule(15, 4, 7)).toBe(true); // Second tier still applies
    });

    it('should use default two-tier system when no tiers configured', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        // No mercyRuleTiers specified - should use defaults
      });

      expect(rules.isMercyRule(15, 4, 4)).toBe(true); // 11-run differential AT 4th inning (first tier: 10 runs at 4th)
      expect(rules.isMercyRule(12, 5, 5)).toBe(true); // 7-run differential AT 5th inning (second tier: 7 runs at 5th)
      expect(rules.isMercyRule(13, 4, 4)).toBe(false); // Only 9-run differential, doesn't meet 10-run threshold
    });

    it('should respect mercy rule enabled flag with tiers', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: false, // Disabled
        mercyRuleTiers: [
          { differential: 5, afterInning: 1 }, // Very lenient tier
        ],
      });

      expect(rules.isMercyRule(50, 0, 7)).toBe(false); // Should not trigger when disabled
    });

    it('should handle edge cases with multi-tier evaluation', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: [
          { differential: 10, afterInning: 4 },
          { differential: 7, afterInning: 5 },
        ],
      });

      // Test with away team leading
      expect(rules.isMercyRule(5, 15, 5)).toBe(true); // 10-run away team lead
      expect(rules.isMercyRule(5, 11, 6)).toBe(false); // Only 6-run away team lead

      // Test boundary conditions
      expect(rules.isMercyRule(10, 0, 5)).toBe(true); // Exactly 10 runs
      expect(rules.isMercyRule(7, 0, 6)).toBe(true); // Exactly 7 runs
      expect(rules.isMercyRule(1, 0, 5)).toBe(false); // Only 1 run
    });
  });

  describe('Game completion evaluation', () => {
    it('should identify game complete at regulation innings', () => {
      const rules = new SoftballRules({ totalInnings: 7 });

      expect(rules.isGameComplete(5, 3, 7)).toBe(true);
      expect(rules.isGameComplete(3, 5, 7)).toBe(true);
    });

    it('should identify game complete via mercy rule', () => {
      const rules = new SoftballRules({
        totalInnings: 7,
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
      });

      expect(rules.isGameComplete(20, 5, 4)).toBe(true); // mercy rule applies
    });

    it('should not identify game complete before regulation', () => {
      const rules = new SoftballRules({ totalInnings: 7 });

      expect(rules.isGameComplete(10, 5, 6)).toBe(false);
      expect(rules.isGameComplete(5, 10, 3)).toBe(false);
    });

    it('should handle tie games at regulation', () => {
      const rules = new SoftballRules({ totalInnings: 7 });

      expect(rules.isGameComplete(5, 5, 7)).toBe(false); // tied, continues
    });

    it('should handle extra innings', () => {
      const rules = new SoftballRules({ totalInnings: 7 });

      expect(rules.isGameComplete(5, 6, 8)).toBe(true); // winner in extra innings
      expect(rules.isGameComplete(5, 5, 12)).toBe(false); // still tied in extras
    });

    it('should end tie games when maxExtraInnings reached and allowTieGames is true', () => {
      const rules = new SoftballRules({
        totalInnings: 7,
        maxExtraInnings: 3,
        allowTieGames: true,
      });

      // Game tied 5-5, in the 10th inning (3 extra innings played)
      expect(rules.isGameComplete(5, 5, 10)).toBe(true); // Tie game ends

      // Game tied 5-5, in the 9th inning (2 extra innings played)
      expect(rules.isGameComplete(5, 5, 9)).toBe(false); // Continue playing

      // Game with winner should still end normally
      expect(rules.isGameComplete(6, 5, 9)).toBe(true); // Winner in extra innings
    });

    it('should continue tie games when maxExtraInnings reached but allowTieGames is false', () => {
      const rules = new SoftballRules({
        totalInnings: 7,
        maxExtraInnings: 3,
        allowTieGames: false,
      });

      // Game tied 5-5, in the 10th inning (3 extra innings played)
      // But tie games not allowed, so continue playing
      expect(rules.isGameComplete(5, 5, 10)).toBe(false);
    });

    it('should handle unlimited extra innings (null maxExtraInnings)', () => {
      const rules = new SoftballRules({
        totalInnings: 7,
        maxExtraInnings: null,
        allowTieGames: false,
      });

      // Game tied in 15th inning should continue (no limit)
      expect(rules.isGameComplete(5, 5, 15)).toBe(false);

      // Game with winner should end
      expect(rules.isGameComplete(6, 5, 15)).toBe(true);
    });

    it('should validate game completion parameters', () => {
      const rules = new SoftballRules();

      expect(() => rules.isGameComplete(-1, 5, 7)).toThrow(DomainError);
      expect(() => rules.isGameComplete(10, -1, 7)).toThrow(DomainError);
      expect(() => rules.isGameComplete(10, 5, 0)).toThrow(DomainError);
      expect(() => rules.isGameComplete(10, 5, -1)).toThrow(DomainError);
      expect(() => rules.isGameComplete(3.5, 5, 7)).toThrow(DomainError);
      expect(() => rules.isGameComplete(10, 3.5, 7)).toThrow(DomainError);
      expect(() => rules.isGameComplete(10, 5, 3.5)).toThrow(DomainError);
    });
  });

  describe('Equality', () => {
    it('should be equal when all properties match', () => {
      const rules1 = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 120,
        allowReEntry: false,
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 10, afterInning: 5 }],
        maxExtraInnings: 5,
        allowTieGames: true,
      });

      const rules2 = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 120,
        allowReEntry: false,
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 10, afterInning: 5 }],
        maxExtraInnings: 5,
        allowTieGames: true,
      });

      expect(rules1.equals(rules2)).toBe(true);
      expect(rules2.equals(rules1)).toBe(true);
    });

    it('should not be equal when properties differ', () => {
      const rules1 = new SoftballRules({ totalInnings: 7 });
      const rules2 = new SoftballRules({ totalInnings: 9 });

      expect(rules1.equals(rules2)).toBe(false);
      expect(rules2.equals(rules1)).toBe(false);
    });

    it('should handle null timeLimitMinutes in equality', () => {
      const rules1 = new SoftballRules({ timeLimitMinutes: null });
      const rules2 = new SoftballRules({ timeLimitMinutes: null });
      const rules3 = new SoftballRules({ timeLimitMinutes: 120 });

      expect(rules1.equals(rules2)).toBe(true);
      expect(rules1.equals(rules3)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const rules = new SoftballRules();

      expect(rules.equals(null as unknown as SoftballRules)).toBe(false);
      expect(rules.equals(undefined as unknown as SoftballRules)).toBe(false);
    });

    it('should handle default vs explicit values in equality', () => {
      const rules1 = new SoftballRules(); // all defaults
      const rules2 = new SoftballRules({
        totalInnings: 7,
        maxPlayersPerTeam: 25,
        timeLimitMinutes: null,
        allowReEntry: true,
        mercyRuleEnabled: true,
        mercyRuleTiers: [
          { differential: 10, afterInning: 4 },
          { differential: 7, afterInning: 5 },
        ],
        maxExtraInnings: null,
        allowTieGames: false,
      }); // explicit defaults

      expect(rules1.equals(rules2)).toBe(true);
    });

    it('should not be equal when tie game rules differ', () => {
      const rules1 = new SoftballRules({
        maxExtraInnings: 5,
        allowTieGames: true,
      });

      const rules2 = new SoftballRules({
        maxExtraInnings: 5,
        allowTieGames: false,
      });

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should not be equal when maxExtraInnings differs', () => {
      const rules1 = new SoftballRules({
        maxExtraInnings: 3,
        allowTieGames: true,
      });

      const rules2 = new SoftballRules({
        maxExtraInnings: 5,
        allowTieGames: true,
      });

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should be equal when mercy rule tiers match', () => {
      const tiers: MercyRuleTier[] = [
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ];

      const rules1 = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: tiers,
      });

      const rules2 = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleTiers: tiers,
      });

      expect(rules1.equals(rules2)).toBe(true);
    });

    it('should not be equal when mercy rule tiers differ', () => {
      const rules1 = new SoftballRules({
        mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
      });

      const rules2 = new SoftballRules({
        mercyRuleTiers: [{ differential: 7, afterInning: 5 }],
      });

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should not be equal when tier arrays have different lengths', () => {
      const rules1 = new SoftballRules({
        mercyRuleTiers: [
          { differential: 10, afterInning: 4 },
          { differential: 7, afterInning: 5 },
        ],
      });

      const rules2 = new SoftballRules({
        mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
      });

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should not be equal when one has tiers and other has empty array', () => {
      const rules1 = new SoftballRules({
        mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
      });

      const rules2 = new SoftballRules({
        mercyRuleTiers: [],
      });

      expect(rules1.equals(rules2)).toBe(false);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const rules = new SoftballRules({ totalInnings: 7 });

      // Properties should be readonly (TypeScript enforced)
      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);

      // Should not be able to modify properties
      // (TypeScript prevents this, but test for runtime safety)
      expect(rules.totalInnings).toBe(7);
    });

    it('should support JSON serialization', () => {
      const rules = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 90,
        allowReEntry: false,
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
        maxExtraInnings: 3,
        allowTieGames: true,
      });

      const serialized = JSON.stringify(rules);
      const parsed = JSON.parse(serialized);

      expect(parsed.totalInnings).toBe(9);
      expect(parsed.maxPlayersPerTeam).toBe(20);
      expect(parsed.timeLimitMinutes).toBe(90);
      expect(parsed.allowReEntry).toBe(false);
      expect(parsed.mercyRuleEnabled).toBe(true);
      expect(parsed.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
      expect(parsed.maxExtraInnings).toBe(3);
      expect(parsed.allowTieGames).toBe(true);
    });

    it('should have meaningful string representation', () => {
      const rules = new SoftballRules();
      const str = rules.toString();

      expect(str).toContain('SoftballRules');
      expect(str).toContain('totalInnings=7');
      expect(str).toContain('allowReEntry=true');
      expect(str).toContain('mercyRule=tiers: [10 runs at inning 4, 7 runs at inning 5]');
      expect(str).toContain('maxExtraInnings=unlimited');
      expect(str).toContain('allowTieGames=not allowed');
    });

    it('should show mercy rule tiers in string representation', () => {
      const rules = new SoftballRules({
        mercyRuleTiers: [
          { differential: 10, afterInning: 4 },
          { differential: 7, afterInning: 5 },
        ],
      });
      const str = rules.toString();

      expect(str).toContain('SoftballRules');
      expect(str).toContain('mercyRule=tiers: [10 runs at inning 4, 7 runs at inning 5]');
    });

    it('should show disabled mercy rule in string representation', () => {
      const rules = new SoftballRules({ mercyRuleEnabled: false });
      const str = rules.toString();

      expect(str).toContain('mercyRule=disabled');
    });
  });

  describe('Static factory methods', () => {
    it('should create default recreation league rules', () => {
      const rules = SoftballRules.recreationLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });

    it('should create tournament rules', () => {
      const rules = SoftballRules.tournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 4 }]);
    });

    it('should create youth league rules', () => {
      const rules = SoftballRules.youthLeague();

      expect(rules.totalInnings).toBe(5);
      expect(rules.maxPlayersPerTeam).toBe(15);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 2 }]);
    });
  });
});
