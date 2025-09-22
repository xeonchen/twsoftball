import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';

import { TeamValidation } from './TeamValidation.js';

describe('TeamValidation', () => {
  describe('validateTeamDesignation', () => {
    // Test data for valid team designations
    const validTeamData = [
      { team: 'HOME', fieldName: 'batting team' },
      { team: 'AWAY', fieldName: 'scoring team' },
      { team: 'HOME', fieldName: 'team' },
      { team: 'AWAY', fieldName: 'team' },
    ];

    // Test data for invalid team designations with categories
    const invalidTeamData = [
      // Alternative team names
      { team: 'VISITOR', fieldName: 'team', category: 'alternative team names' },
      { team: 'VISITING', fieldName: 'team', category: 'alternative team names' },
      { team: 'HOST', fieldName: 'team', category: 'alternative team names' },
      { team: 'GUEST', fieldName: 'team', category: 'alternative team names' },

      // Case variations
      { team: 'home', fieldName: 'batting team', category: 'lowercase variations' },
      { team: 'away', fieldName: 'scoring team', category: 'lowercase variations' },
      { team: 'Home', fieldName: 'team', category: 'capitalized variations' },
      { team: 'Away', fieldName: 'team', category: 'capitalized variations' },

      // Mixed case and whitespace
      { team: 'HoMe', fieldName: 'team', category: 'mixed case variations' },
      { team: 'aWaY', fieldName: 'team', category: 'mixed case variations' },
      { team: 'HOME ', fieldName: 'team', category: 'whitespace variations' },
      { team: ' AWAY', fieldName: 'team', category: 'whitespace variations' },

      // Empty and whitespace strings
      { team: '', fieldName: 'team', category: 'empty values' },
      { team: '   ', fieldName: 'team', category: 'empty values' },
      { team: '\t', fieldName: 'team', category: 'empty values' },
      { team: '\n', fieldName: 'team', category: 'empty values' },

      // Null and undefined
      { team: null, fieldName: 'team', category: 'null values' },
      { team: undefined, fieldName: 'team', category: 'null values' },

      // Numeric strings
      { team: '1', fieldName: 'team', category: 'numeric strings' },
      { team: '0', fieldName: 'team', category: 'numeric strings' },

      // Similar but incorrect values
      { team: 'HOMES', fieldName: 'team', category: 'similar incorrect values' },
      { team: 'AWAYS', fieldName: 'team', category: 'similar incorrect values' },
      { team: 'HOME_TEAM', fieldName: 'team', category: 'similar incorrect values' },
      { team: 'AWAY_TEAM', fieldName: 'team', category: 'similar incorrect values' },
    ];

    // Test data for field name variations
    const fieldNameTestData = [
      { team: 'INVALID', fieldName: 'batting team' },
      { team: 'WRONG', fieldName: 'scoring team' },
      { team: 'BAD', fieldName: 'current team' },
      { team: '', fieldName: 'team designation' },
    ];

    // Helper function to create expected error message
    const createExpectedError = (fieldName: string): string =>
      `${fieldName} must be either HOME or AWAY`;

    // Helper function to assert validation throws expected error
    const assertValidationError = (team: unknown, fieldName: string): void => {
      expect(() => TeamValidation.validateTeamDesignation(team as string, fieldName)).toThrow(
        new DomainError(createExpectedError(fieldName))
      );
    };

    it('should accept valid team designations', () => {
      validTeamData.forEach(({ team, fieldName }) => {
        expect(() => TeamValidation.validateTeamDesignation(team, fieldName)).not.toThrow();
      });
    });

    it('should reject invalid team designations', () => {
      invalidTeamData.forEach(({ team, fieldName }) => {
        assertValidationError(team, fieldName);
      });
    });

    it('should include field name in error message', () => {
      fieldNameTestData.forEach(({ team, fieldName }) => {
        assertValidationError(team, fieldName);
      });
    });

    it('should maintain exact backward compatibility with error message format', () => {
      const compatibilityTestData = [
        { team: 'VISITOR', fieldName: 'team' },
        { team: 'home', fieldName: 'batting team' },
      ];

      compatibilityTestData.forEach(({ team, fieldName }) => {
        try {
          TeamValidation.validateTeamDesignation(team, fieldName);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(DomainError);
          expect((error as Error).message).toBe(createExpectedError(fieldName));
          expect((error as Error).name).toBe('DomainError');
        }
      });
    });

    describe('realistic usage scenarios', () => {
      // Test data for common domain contexts
      const domainContextData = [
        { team: 'HOME', context: 'current batting team' },
        { team: 'AWAY', context: 'current batting team' },
        { team: 'HOME', context: 'scoring team' },
        { team: 'AWAY', context: 'scoring team' },
        { team: 'HOME', context: 'team in event' },
        { team: 'AWAY', context: 'team in event' },
      ];

      // Test data for typical user input errors
      const userInputErrorData = [
        { team: 'home', fieldName: 'team' },
        { team: 'visitor', fieldName: 'team' },
        { team: 'h', fieldName: 'team' },
        { team: 'a', fieldName: 'team' },
      ];

      // Test data for event sourcing patterns
      const eventSourcingData = [
        { team: 'HOME', context: 'run scored event' },
        { team: 'AWAY', context: 'at-bat completed event' },
        { team: 'HOME', context: 'inning advanced event' },
        { team: 'AWAY', context: 'player substitution event' },
      ];

      it('should work with common domain contexts', () => {
        domainContextData.forEach(({ team, context }) => {
          expect(() => TeamValidation.validateTeamDesignation(team, context)).not.toThrow();
        });
      });

      it('should handle typical invalid inputs from user interfaces', () => {
        userInputErrorData.forEach(({ team, fieldName }) => {
          assertValidationError(team, fieldName);
        });
      });

      it('should work with inning state logic patterns', () => {
        const isTopHalf = true;
        const currentBattingTeam = isTopHalf ? 'AWAY' : 'HOME';

        expect(() =>
          TeamValidation.validateTeamDesignation(currentBattingTeam, 'current batting team')
        ).not.toThrow();

        const otherTeam = currentBattingTeam === 'HOME' ? 'AWAY' : 'HOME';
        expect(() =>
          TeamValidation.validateTeamDesignation(otherTeam, 'fielding team')
        ).not.toThrow();
      });

      it('should work with score tracking patterns', () => {
        const teams = ['HOME', 'AWAY'] as const;

        teams.forEach(team => {
          expect(() =>
            TeamValidation.validateTeamDesignation(team, 'team for score update')
          ).not.toThrow();
        });
      });

      it('should work with event sourcing patterns', () => {
        eventSourcingData.forEach(({ team, context }) => {
          expect(() => TeamValidation.validateTeamDesignation(team, context)).not.toThrow();
        });
      });
    });

    describe('edge cases and robustness', () => {
      // Test data for type coercion attempts
      const typeCoercionData = [
        { value: 1, description: 'number' },
        { value: true, description: 'boolean' },
        { value: [], description: 'array' },
        { value: {}, description: 'object' },
      ];

      // Test data for Unicode and special characters
      const unicodeTestData = [
        { value: 'HOM�', description: 'Unicode replacement character in HOME' },
        { value: '�WAY', description: 'Unicode replacement character in AWAY' },
        { value: 'HOME<�', description: 'Unicode with special characters' },
      ];

      it('should handle type coercion attempts', () => {
        typeCoercionData.forEach(({ value }) => {
          assertValidationError(value, 'team');
        });
      });

      it('should handle Unicode and special characters', () => {
        unicodeTestData.forEach(({ value }) => {
          assertValidationError(value, 'team');
        });
      });

      it('should be performant with valid inputs', () => {
        const start = performance.now();

        for (let i = 0; i < 1000; i += 1) {
          TeamValidation.validateTeamDesignation('HOME', 'test');
          TeamValidation.validateTeamDesignation('AWAY', 'test');
        }

        const end = performance.now();
        const duration = end - start;

        // Should complete 2000 validations in under 10ms (very generous threshold)
        expect(duration).toBeLessThan(10);
      });
    });
  });
});
