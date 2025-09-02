import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';
import { SoftballRules } from '../rules/SoftballRules';

import { BattingSlotValidation } from './BattingSlotValidation';

describe('BattingSlotValidation', () => {
  describe('validateBattingSlot', () => {
    describe('with standard 9-player rules', () => {
      const standardRules = new SoftballRules({ maxPlayersPerTeam: 9 });

      it('should accept valid batting slots (1-9)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(1, standardRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(5, standardRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(9, standardRules)).not.toThrow();
      });

      it('should reject batting slot below minimum (1)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(0, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(-1, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(-5, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );
      });

      it('should reject batting slot above maximum (9)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(10, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(15, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(25, standardRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );
      });
    });

    describe('with extended lineup rules (20 players)', () => {
      const extendedRules = new SoftballRules({ maxPlayersPerTeam: 20 });

      it('should accept valid batting slots (1-20)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(1, extendedRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(9, extendedRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(10, extendedRules)).not.toThrow(); // First EP slot
        expect(() => BattingSlotValidation.validateBattingSlot(15, extendedRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(20, extendedRules)).not.toThrow(); // Last slot
      });

      it('should reject batting slot below minimum (1)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(0, extendedRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(-1, extendedRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );
      });

      it('should reject batting slot above maximum (20)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(21, extendedRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(25, extendedRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(50, extendedRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );
      });
    });

    describe('with large league rules (25 players)', () => {
      const largeLeagueRules = new SoftballRules({ maxPlayersPerTeam: 25 });

      it('should accept valid batting slots (1-25)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(1, largeLeagueRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(25, largeLeagueRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(12, largeLeagueRules)).not.toThrow();
      });

      it('should reject batting slots outside range', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(0, largeLeagueRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 25')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(26, largeLeagueRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 25')
        );
      });
    });

    describe('with small league rules (15 players)', () => {
      const smallLeagueRules = new SoftballRules({ maxPlayersPerTeam: 15 });

      it('should accept valid batting slots (1-15)', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(1, smallLeagueRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(15, smallLeagueRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(8, smallLeagueRules)).not.toThrow();
      });

      it('should reject batting slots outside range', () => {
        expect(() => BattingSlotValidation.validateBattingSlot(16, smallLeagueRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 15')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(20, smallLeagueRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 15')
        );
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle minimum valid team size (9 players)', () => {
        const minRules = new SoftballRules({ maxPlayersPerTeam: 9 });

        expect(() => BattingSlotValidation.validateBattingSlot(1, minRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(9, minRules)).not.toThrow();

        expect(() => BattingSlotValidation.validateBattingSlot(10, minRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );
      });

      it('should handle maximum valid team size (50 players)', () => {
        const maxRules = new SoftballRules({ maxPlayersPerTeam: 50 });

        expect(() => BattingSlotValidation.validateBattingSlot(1, maxRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(50, maxRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(25, maxRules)).not.toThrow();

        expect(() => BattingSlotValidation.validateBattingSlot(51, maxRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 50')
        );
      });

      it('should handle minimum valid team size boundary', () => {
        // Test with minimum allowed team size (9 players per SoftballRules)
        const minRules = new SoftballRules({ maxPlayersPerTeam: 9 });

        expect(() => BattingSlotValidation.validateBattingSlot(1, minRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(9, minRules)).not.toThrow();

        expect(() => BattingSlotValidation.validateBattingSlot(10, minRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );
      });
    });

    describe('error message format and consistency', () => {
      it('should provide consistent error message format across different rule configurations', () => {
        const rules9 = new SoftballRules({ maxPlayersPerTeam: 9 });
        const rules20 = new SoftballRules({ maxPlayersPerTeam: 20 });
        const rules25 = new SoftballRules({ maxPlayersPerTeam: 25 });

        // All should follow the same error message pattern
        expect(() => BattingSlotValidation.validateBattingSlot(0, rules9)).toThrow(
          new DomainError('Batting slot must be between 1 and 9')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(0, rules20)).toThrow(
          new DomainError('Batting slot must be between 1 and 20')
        );

        expect(() => BattingSlotValidation.validateBattingSlot(0, rules25)).toThrow(
          new DomainError('Batting slot must be between 1 and 25')
        );
      });

      it('should maintain exact backward compatibility with existing error messages', () => {
        // This test ensures the error message format exactly matches patterns used elsewhere
        const rules = new SoftballRules({ maxPlayersPerTeam: 20 });

        try {
          BattingSlotValidation.validateBattingSlot(25, rules);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(DomainError);
          expect((error as Error).message).toBe('Batting slot must be between 1 and 20');
          expect((error as Error).name).toBe('DomainError');
        }
      });
    });

    describe('realistic usage scenarios', () => {
      it('should validate traditional batting positions (1-9)', () => {
        const traditionalRules = new SoftballRules({ maxPlayersPerTeam: 20 });

        // Traditional positions should always be valid
        for (let slot = 1; slot <= 9; slot += 1) {
          expect(() =>
            BattingSlotValidation.validateBattingSlot(slot, traditionalRules)
          ).not.toThrow();
        }
      });

      it('should validate Extra Player positions (10+)', () => {
        const epRules = new SoftballRules({ maxPlayersPerTeam: 25 });

        // Extra Player positions
        expect(() => BattingSlotValidation.validateBattingSlot(10, epRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(15, epRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(25, epRules)).not.toThrow();
      });

      it('should work with common league configurations', () => {
        // Recreational league (smaller rosters)
        const recRules = new SoftballRules({ maxPlayersPerTeam: 12 });
        expect(() => BattingSlotValidation.validateBattingSlot(12, recRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(13, recRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 12')
        );

        // Competitive league (extended rosters)
        const compRules = new SoftballRules({ maxPlayersPerTeam: 30 });
        expect(() => BattingSlotValidation.validateBattingSlot(30, compRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(31, compRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 30')
        );
      });
    });

    describe('integration with domain entities', () => {
      it('should work with rules from different sources', () => {
        // Default rules
        const defaultRules = new SoftballRules();
        expect(() => BattingSlotValidation.validateBattingSlot(25, defaultRules)).not.toThrow();

        // Custom rules
        const customRules = new SoftballRules({ maxPlayersPerTeam: 18 });
        expect(() => BattingSlotValidation.validateBattingSlot(18, customRules)).not.toThrow();
        expect(() => BattingSlotValidation.validateBattingSlot(19, customRules)).toThrow(
          new DomainError('Batting slot must be between 1 and 18')
        );
      });
    });
  });
});
