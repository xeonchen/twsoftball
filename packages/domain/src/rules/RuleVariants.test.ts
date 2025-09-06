import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { RuleVariants } from './RuleVariants';
import { SoftballRules } from './SoftballRules';

describe('RuleVariants', () => {
  describe('Core Rule Variants', () => {
    it('should create standard rules', () => {
      const rules = RuleVariants.standard();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(60);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ]);
      expect(rules.maxExtraInnings).toBe(0);
      expect(rules.allowTieGames).toBe(true);
    });

    it('should create tournament rules', () => {
      const rules = RuleVariants.tournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 4 }]);
    });

    it('should create recreation league rules', () => {
      const rules = RuleVariants.recreationLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });
  });

  describe('Custom rule creation', () => {
    it('should create custom rules with modifications', () => {
      const baseRules = RuleVariants.standard();
      const customRules = RuleVariants.withCustomizations(baseRules, {
        totalInnings: 9,
        timeLimitMinutes: 150,
      });

      expect(customRules.totalInnings).toBe(9);
      expect(customRules.timeLimitMinutes).toBe(150);
      // Other properties should remain from base rules
      expect(customRules.maxPlayersPerTeam).toBe(25);
      expect(customRules.allowReEntry).toBe(true);
      expect(customRules.mercyRuleEnabled).toBe(true);
      expect(customRules.mercyRuleTiers).toEqual([
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ]);
    });

    it('should create custom rules from scratch', () => {
      const customRules = RuleVariants.custom({
        totalInnings: 5,
        maxPlayersPerTeam: 12,
        timeLimitMinutes: 60,
        allowReEntry: false,
        mercyRuleEnabled: false,
        mercyRuleTiers: [{ differential: 25, afterInning: 1 }],
      });

      expect(customRules.totalInnings).toBe(5);
      expect(customRules.maxPlayersPerTeam).toBe(12);
      expect(customRules.timeLimitMinutes).toBe(60);
      expect(customRules.allowReEntry).toBe(false);
      expect(customRules.mercyRuleEnabled).toBe(false);
      expect(customRules.mercyRuleTiers).toEqual([{ differential: 25, afterInning: 1 }]);
    });

    it('should handle null base rules in withCustomizations', () => {
      expect(() => {
        RuleVariants.withCustomizations(null as unknown as SoftballRules, {});
      }).toThrow(DomainError);
    });

    it('should handle undefined base rules in withCustomizations', () => {
      expect(() => {
        RuleVariants.withCustomizations(undefined as unknown as SoftballRules, {});
      }).toThrow(DomainError);
    });

    it('should handle empty customizations', () => {
      const baseRules = RuleVariants.recreationLeague();
      const customRules = RuleVariants.withCustomizations(baseRules, {});

      expect(customRules.equals(baseRules)).toBe(true);
    });

    it('should handle partial customizations', () => {
      const baseRules = RuleVariants.tournament();
      const customRules = RuleVariants.withCustomizations(baseRules, {
        allowReEntry: true,
        mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
      });

      expect(customRules.allowReEntry).toBe(true);
      expect(customRules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
      // Other properties should remain unchanged
      expect(customRules.totalInnings).toBe(baseRules.totalInnings);
      expect(customRules.maxPlayersPerTeam).toBe(baseRules.maxPlayersPerTeam);
      expect(customRules.timeLimitMinutes).toBe(baseRules.timeLimitMinutes);
    });
  });

  describe('Rule set validation', () => {
    it('should validate that all core rule variants produce valid SoftballRules', () => {
      const variants = [
        RuleVariants.standard(),
        RuleVariants.tournament(),
        RuleVariants.recreationLeague(),
      ];

      variants.forEach(rules => {
        expect(rules).toBeInstanceOf(SoftballRules);
        expect(rules.totalInnings).toBeGreaterThan(0);
        expect(rules.maxPlayersPerTeam).toBeGreaterThanOrEqual(9);
      });
    });

    it('should have reasonable mercy rule configurations', () => {
      const variants = [
        RuleVariants.standard(),
        RuleVariants.tournament(),
        RuleVariants.recreationLeague(),
      ];

      variants.forEach(rules => {
        if (rules.mercyRuleEnabled) {
          expect(rules.mercyRuleTiers.length).toBeGreaterThan(0);
          expect(rules.mercyRuleTiers[0]!.differential).toBeGreaterThan(0);
        }
      });
    });

    it('should have consistent time limits where specified', () => {
      const standardRules = RuleVariants.standard();
      const tournamentRules = RuleVariants.tournament();

      if (standardRules.timeLimitMinutes !== null) {
        expect(standardRules.timeLimitMinutes).toBeGreaterThan(0);
        expect(standardRules.timeLimitMinutes).toBeLessThanOrEqual(240); // 4 hours max
      }

      if (tournamentRules.timeLimitMinutes !== null) {
        expect(tournamentRules.timeLimitMinutes).toBeGreaterThan(0);
        expect(tournamentRules.timeLimitMinutes).toBeLessThanOrEqual(240); // 4 hours max
      }
    });
  });

  describe('Convenience methods compatibility', () => {
    it('should provide standard recreation rules alias', () => {
      const recreation1 = RuleVariants.recreationLeague();
      const recreation2 = SoftballRules.recreationLeague();

      expect(recreation1.equals(recreation2)).toBe(true);
    });

    it('should provide standard tournament rules alias', () => {
      const tournament1 = RuleVariants.tournament();
      const tournament2 = SoftballRules.tournament();

      expect(tournament1.equals(tournament2)).toBe(true);
    });

    it('should provide standard rules alias', () => {
      const standard1 = RuleVariants.standard();
      const standard2 = SoftballRules.standard();

      expect(standard1.equals(standard2)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle extreme customizations within bounds', () => {
      const extremeRules = RuleVariants.custom({
        totalInnings: 1, // minimum
        maxPlayersPerTeam: 9, // minimum
        timeLimitMinutes: 1, // minimum
        mercyRuleTiers: [{ differential: 1, afterInning: 1 }], // minimum
      });

      expect(extremeRules.totalInnings).toBe(1);
      expect(extremeRules.maxPlayersPerTeam).toBe(9);
      expect(extremeRules.timeLimitMinutes).toBe(1);
    });

    it('should delegate validation to SoftballRules constructor', () => {
      expect(() => {
        RuleVariants.custom({ totalInnings: 0 });
      }).toThrow(DomainError);

      expect(() => {
        RuleVariants.custom({ maxPlayersPerTeam: 8 });
      }).toThrow(DomainError);
    });

    it('should support advanced mercy rule customizations', () => {
      const baseRules = RuleVariants.standard();
      const customRules = RuleVariants.withCustomizations(baseRules, {
        mercyRuleTiers: [
          { differential: 15, afterInning: 3 },
          { differential: 10, afterInning: 5 },
          { differential: 5, afterInning: 6 },
        ],
      });

      expect(customRules.mercyRuleTiers).toHaveLength(3);
      expect(customRules.mercyRuleTiers).toEqual([
        { differential: 15, afterInning: 3 },
        { differential: 10, afterInning: 5 },
        { differential: 5, afterInning: 6 },
      ]);
    });
  });
});
