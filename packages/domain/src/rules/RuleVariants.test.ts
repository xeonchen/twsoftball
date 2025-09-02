import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { RuleVariants } from './RuleVariants';
import { SoftballRules } from './SoftballRules';

describe('RuleVariants', () => {
  describe('Standard Variants', () => {
    it('should create ASA/USA Softball rules', () => {
      const rules = RuleVariants.asaUsaSoftball();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 5 }]);
    });

    it('should create USSSA rules', () => {
      const rules = RuleVariants.usssa();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });

    it('should create NSA rules', () => {
      const rules = RuleVariants.nsa();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
    });

    it('should create ISA rules', () => {
      const rules = RuleVariants.isa();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(15);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 20, afterInning: 4 }]);
    });
  });

  describe('League Type Variants', () => {
    it('should create church league rules', () => {
      const rules = RuleVariants.churchLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });

    it('should create corporate league rules', () => {
      const rules = RuleVariants.corporateLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(30);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
    });

    it('should create beer league rules', () => {
      const rules = RuleVariants.beerLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 20, afterInning: 4 }]);
    });

    it('should create competitive league rules', () => {
      const rules = RuleVariants.competitiveLeague();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(18);
      expect(rules.timeLimitMinutes).toBe(120);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 8, afterInning: 5 }]);
    });
  });

  describe('Tournament Type Variants', () => {
    it('should create single elimination tournament rules', () => {
      const rules = RuleVariants.singleEliminationTournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 4 }]);
    });

    it('should create double elimination tournament rules', () => {
      const rules = RuleVariants.doubleEliminationTournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(105);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
    });

    it('should create round robin tournament rules', () => {
      const rules = RuleVariants.roundRobinTournament();

      expect(rules.totalInnings).toBe(6);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 8, afterInning: 3 }]);
    });

    it('should create weekend tournament rules', () => {
      const rules = RuleVariants.weekendTournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });
  });

  describe('Age-Based Variants', () => {
    it('should create 12U (12 and under) rules', () => {
      const rules = RuleVariants.youth12U();

      expect(rules.totalInnings).toBe(6);
      expect(rules.maxPlayersPerTeam).toBe(15);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 2 }]);
    });

    it('should create 14U (14 and under) rules', () => {
      const rules = RuleVariants.youth14U();

      expect(rules.totalInnings).toBe(6);
      expect(rules.maxPlayersPerTeam).toBe(15);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 3 }]);
    });

    it('should create 16U (16 and under) rules', () => {
      const rules = RuleVariants.youth16U();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(18);
      expect(rules.timeLimitMinutes).toBe(105);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 3 }]);
    });

    it('should create 18U (18 and under) rules', () => {
      const rules = RuleVariants.youth18U();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(120);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 4 }]);
    });

    it('should create senior (50+) rules', () => {
      const rules = RuleVariants.senior50Plus();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 4 }]);
    });

    it('should create masters (60+) rules', () => {
      const rules = RuleVariants.masters60Plus();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 20, afterInning: 3 }]);
    });
  });

  describe('Special Format Variants', () => {
    it('should create co-ed rules', () => {
      const rules = RuleVariants.coEd();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
    });

    it('should create slow pitch rules', () => {
      const rules = RuleVariants.slowPitch();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 15, afterInning: 3 }]);
    });

    it('should create fast pitch rules', () => {
      const rules = RuleVariants.fastPitch();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(18);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 8, afterInning: 5 }]);
    });

    it('should create modified pitch rules', () => {
      const rules = RuleVariants.modifiedPitch();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(105);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 12, afterInning: 4 }]);
    });
  });

  describe('Advanced Mercy Rule Variants', () => {
    it('should create two-tier mercy rule system', () => {
      const rules = RuleVariants.twoTierMercyRule();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(25);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([
        { differential: 10, afterInning: 4 }, // 10 runs after 4th inning
        { differential: 7, afterInning: 5 }, // 7 runs after 5th inning
      ]);
    });

    it('should create three-tier mercy rule system', () => {
      const rules = RuleVariants.threeTierMercyRule();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([
        { differential: 20, afterInning: 2 }, // Very lenient early
        { differential: 12, afterInning: 4 }, // Moderate mid-game
        { differential: 8, afterInning: 6 }, // Tight late game
      ]);
    });

    it('should create lenient mercy rule system', () => {
      const rules = RuleVariants.lenientMercyRule();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(30);
      expect(rules.timeLimitMinutes).toBe(null);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 25, afterInning: 3 }]);
    });

    it('should create tight mercy rule system', () => {
      const rules = RuleVariants.tightMercyRule();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(18);
      expect(rules.timeLimitMinutes).toBe(120);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleTiers).toEqual([{ differential: 6, afterInning: 5 }]);
    });
  });

  describe('Custom rule creation', () => {
    it('should create custom rules with modifications', () => {
      const baseRules = RuleVariants.asaUsaSoftball();
      const customRules = RuleVariants.withCustomizations(baseRules, {
        totalInnings: 9,
        timeLimitMinutes: 150,
      });

      expect(customRules.totalInnings).toBe(9);
      expect(customRules.timeLimitMinutes).toBe(150);
      // Other properties should remain from base rules
      expect(customRules.maxPlayersPerTeam).toBe(20);
      expect(customRules.allowReEntry).toBe(false);
      expect(customRules.mercyRuleEnabled).toBe(true);
      expect(customRules.mercyRuleTiers).toEqual([{ differential: 10, afterInning: 5 }]);
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
    it('should validate that all rule variants produce valid SoftballRules', () => {
      const variants = [
        RuleVariants.asaUsaSoftball(),
        RuleVariants.usssa(),
        RuleVariants.nsa(),
        RuleVariants.isa(),
        RuleVariants.churchLeague(),
        RuleVariants.corporateLeague(),
        RuleVariants.beerLeague(),
        RuleVariants.competitiveLeague(),
        RuleVariants.singleEliminationTournament(),
        RuleVariants.doubleEliminationTournament(),
        RuleVariants.roundRobinTournament(),
        RuleVariants.weekendTournament(),
        RuleVariants.youth12U(),
        RuleVariants.youth14U(),
        RuleVariants.youth16U(),
        RuleVariants.youth18U(),
        RuleVariants.senior50Plus(),
        RuleVariants.masters60Plus(),
        RuleVariants.coEd(),
        RuleVariants.slowPitch(),
        RuleVariants.fastPitch(),
        RuleVariants.modifiedPitch(),
        RuleVariants.twoTierMercyRule(),
        RuleVariants.threeTierMercyRule(),
        RuleVariants.lenientMercyRule(),
        RuleVariants.tightMercyRule(),
      ];

      variants.forEach(rules => {
        expect(rules).toBeInstanceOf(SoftballRules);
        expect(rules.totalInnings).toBeGreaterThan(0);
        expect(rules.maxPlayersPerTeam).toBeGreaterThanOrEqual(9);
      });
    });

    it('should have reasonable mercy rule configurations', () => {
      const variants = [
        RuleVariants.asaUsaSoftball(),
        RuleVariants.usssa(),
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
      const timedRules = [
        RuleVariants.churchLeague(),
        RuleVariants.corporateLeague(),
        RuleVariants.singleEliminationTournament(),
        RuleVariants.coEd(),
      ];

      timedRules.forEach(rules => {
        if (rules.timeLimitMinutes !== null) {
          expect(rules.timeLimitMinutes).toBeGreaterThan(0);
          expect(rules.timeLimitMinutes).toBeLessThanOrEqual(240); // 4 hours max
        }
      });
    });
  });

  describe('Convenience methods', () => {
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

    it('should provide standard youth rules alias', () => {
      const youth1 = RuleVariants.youthLeague();
      const youth2 = SoftballRules.youthLeague();

      expect(youth1.equals(youth2)).toBe(true);
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

    it('should validate multi-tier mercy rule ordering', () => {
      const twoTier = RuleVariants.twoTierMercyRule();
      const threeTier = RuleVariants.threeTierMercyRule();

      // Two-tier should have differentials in descending order and innings in ascending order
      expect(twoTier.mercyRuleTiers[0]!.differential).toBeGreaterThan(
        twoTier.mercyRuleTiers[1]!.differential
      );
      expect(twoTier.mercyRuleTiers[0]!.afterInning).toBeLessThan(
        twoTier.mercyRuleTiers[1]!.afterInning
      );

      // Three-tier should follow the same pattern
      expect(threeTier.mercyRuleTiers[0]!.differential).toBeGreaterThan(
        threeTier.mercyRuleTiers[1]!.differential
      );
      expect(threeTier.mercyRuleTiers[1]!.differential).toBeGreaterThan(
        threeTier.mercyRuleTiers[2]!.differential
      );
      expect(threeTier.mercyRuleTiers[0]!.afterInning).toBeLessThan(
        threeTier.mercyRuleTiers[1]!.afterInning
      );
      expect(threeTier.mercyRuleTiers[1]!.afterInning).toBeLessThan(
        threeTier.mercyRuleTiers[2]!.afterInning
      );
    });

    it('should handle extreme mercy rule variations', () => {
      const lenient = RuleVariants.lenientMercyRule();
      const tight = RuleVariants.tightMercyRule();

      // Lenient should have very high differential
      expect(lenient.mercyRuleTiers[0]!.differential).toBe(25);
      expect(lenient.mercyRuleTiers[0]!.afterInning).toBe(3);

      // Tight should have low differential
      expect(tight.mercyRuleTiers[0]!.differential).toBe(6);
      expect(tight.mercyRuleTiers[0]!.afterInning).toBe(5);
    });

    it('should support advanced mercy rule customizations', () => {
      const baseRules = RuleVariants.twoTierMercyRule();
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
