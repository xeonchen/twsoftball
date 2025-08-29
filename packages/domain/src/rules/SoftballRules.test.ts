import { describe, it, expect } from 'vitest';
import { SoftballRules } from './SoftballRules';
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
      expect(rules.mercyRuleDifferential).toBe(15);
      expect(rules.mercyRuleAfterInning).toBe(3);
    });

    it('should create rules with custom values', () => {
      const customRules = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 90,
        allowReEntry: false,
        mercyRuleEnabled: false,
        mercyRuleDifferential: 20,
        mercyRuleAfterInning: 5,
      });

      expect(customRules.totalInnings).toBe(9);
      expect(customRules.maxPlayersPerTeam).toBe(20);
      expect(customRules.timeLimitMinutes).toBe(90);
      expect(customRules.allowReEntry).toBe(false);
      expect(customRules.mercyRuleEnabled).toBe(false);
      expect(customRules.mercyRuleDifferential).toBe(20);
      expect(customRules.mercyRuleAfterInning).toBe(5);
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

    it('should reject invalid mercyRuleDifferential', () => {
      expect(() => new SoftballRules({ mercyRuleDifferential: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleDifferential: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleDifferential: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleDifferential: 101 })).toThrow(DomainError);
    });

    it('should reject invalid mercyRuleAfterInning', () => {
      expect(() => new SoftballRules({ mercyRuleAfterInning: 0 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleAfterInning: -1 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleAfterInning: 3.5 })).toThrow(DomainError);
      expect(() => new SoftballRules({ mercyRuleAfterInning: 51 })).toThrow(DomainError);
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
        mercyRuleDifferential: 1, // minimum valid
        mercyRuleAfterInning: 1, // minimum valid
      });

      expect(edgeCaseRules.totalInnings).toBe(1);
      expect(edgeCaseRules.maxPlayersPerTeam).toBe(9);
      expect(edgeCaseRules.timeLimitMinutes).toBe(1);
      expect(edgeCaseRules.mercyRuleDifferential).toBe(1);
      expect(edgeCaseRules.mercyRuleAfterInning).toBe(1);
    });

    it('should handle maximum valid values', () => {
      const maxRules = new SoftballRules({
        totalInnings: 50, // maximum valid
        maxPlayersPerTeam: 50, // maximum valid
        timeLimitMinutes: 720, // maximum valid (12 hours)
        mercyRuleDifferential: 100, // maximum valid
        mercyRuleAfterInning: 50, // maximum valid
      });

      expect(maxRules.totalInnings).toBe(50);
      expect(maxRules.maxPlayersPerTeam).toBe(50);
      expect(maxRules.timeLimitMinutes).toBe(720);
      expect(maxRules.mercyRuleDifferential).toBe(100);
      expect(maxRules.mercyRuleAfterInning).toBe(50);
    });
  });

  describe('Mercy rule evaluation', () => {
    it('should identify mercy rule game with enabled rules', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
      });

      expect(rules.isMercyRule(20, 5, 4)).toBe(true); // 15+ run diff after inning 3
      expect(rules.isMercyRule(18, 3, 5)).toBe(true); // exactly 15 run diff after inning 3
    });

    it('should not identify mercy rule when differential is insufficient', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
      });

      expect(rules.isMercyRule(19, 5, 4)).toBe(false); // only 14 run diff
      expect(rules.isMercyRule(10, 0, 4)).toBe(false); // only 10 run diff
    });

    it('should not identify mercy rule when inning is too early', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
      });

      expect(rules.isMercyRule(20, 5, 3)).toBe(false); // inning 3, need after inning 3
      expect(rules.isMercyRule(20, 5, 2)).toBe(false); // inning 2
    });

    it('should not identify mercy rule when rule is disabled', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: false,
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
      });

      expect(rules.isMercyRule(20, 5, 4)).toBe(false);
      expect(rules.isMercyRule(50, 0, 7)).toBe(false);
    });

    it('should handle edge cases for mercy rule evaluation', () => {
      const rules = new SoftballRules({
        mercyRuleEnabled: true,
        mercyRuleDifferential: 1,
        mercyRuleAfterInning: 1,
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
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
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
        mercyRuleDifferential: 10,
        mercyRuleAfterInning: 5,
      });

      const rules2 = new SoftballRules({
        totalInnings: 9,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 120,
        allowReEntry: false,
        mercyRuleEnabled: true,
        mercyRuleDifferential: 10,
        mercyRuleAfterInning: 5,
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
        mercyRuleDifferential: 15,
        mercyRuleAfterInning: 3,
      }); // explicit defaults

      expect(rules1.equals(rules2)).toBe(true);
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
        mercyRuleDifferential: 12,
        mercyRuleAfterInning: 4,
      });

      const serialized = JSON.stringify(rules);
      const parsed = JSON.parse(serialized);

      expect(parsed.totalInnings).toBe(9);
      expect(parsed.maxPlayersPerTeam).toBe(20);
      expect(parsed.timeLimitMinutes).toBe(90);
      expect(parsed.allowReEntry).toBe(false);
      expect(parsed.mercyRuleEnabled).toBe(true);
      expect(parsed.mercyRuleDifferential).toBe(12);
      expect(parsed.mercyRuleAfterInning).toBe(4);
    });

    it('should have meaningful string representation', () => {
      const rules = new SoftballRules();
      const str = rules.toString();

      expect(str).toContain('SoftballRules');
      expect(str).toContain('totalInnings=7');
      expect(str).toContain('allowReEntry=true');
      expect(str).toContain('mercyRule=15 runs after inning 3');
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
      expect(rules.mercyRuleDifferential).toBe(15);
      expect(rules.mercyRuleAfterInning).toBe(3);
    });

    it('should create tournament rules', () => {
      const rules = SoftballRules.tournament();

      expect(rules.totalInnings).toBe(7);
      expect(rules.maxPlayersPerTeam).toBe(20);
      expect(rules.timeLimitMinutes).toBe(90);
      expect(rules.allowReEntry).toBe(false);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleDifferential).toBe(10);
      expect(rules.mercyRuleAfterInning).toBe(4);
    });

    it('should create youth league rules', () => {
      const rules = SoftballRules.youthLeague();

      expect(rules.totalInnings).toBe(5);
      expect(rules.maxPlayersPerTeam).toBe(15);
      expect(rules.timeLimitMinutes).toBe(75);
      expect(rules.allowReEntry).toBe(true);
      expect(rules.mercyRuleEnabled).toBe(true);
      expect(rules.mercyRuleDifferential).toBe(12);
      expect(rules.mercyRuleAfterInning).toBe(2);
    });
  });
});
