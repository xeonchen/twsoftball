import { describe, it, expect } from 'vitest';
import { TeamValidation } from './TeamValidation';
import { DomainError } from '../errors/DomainError';

describe('TeamValidation', () => {
  describe('validateTeamDesignation', () => {
    it('should accept valid team designations', () => {
      expect(() => TeamValidation.validateTeamDesignation('HOME', 'batting team')).not.toThrow();
      expect(() => TeamValidation.validateTeamDesignation('AWAY', 'scoring team')).not.toThrow();
      expect(() => TeamValidation.validateTeamDesignation('HOME', 'team')).not.toThrow();
      expect(() => TeamValidation.validateTeamDesignation('AWAY', 'team')).not.toThrow();
    });

    it('should reject invalid team designations', () => {
      expect(() => TeamValidation.validateTeamDesignation('VISITOR', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('VISITING', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('HOST', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('GUEST', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should be case-sensitive and reject lowercase', () => {
      expect(() => TeamValidation.validateTeamDesignation('home', 'batting team')).toThrow(
        new DomainError('batting team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('away', 'scoring team')).toThrow(
        new DomainError('scoring team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('Home', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('Away', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should reject mixed case variations', () => {
      expect(() => TeamValidation.validateTeamDesignation('HoMe', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('aWaY', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('HOME ', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation(' AWAY', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should reject empty and whitespace strings', () => {
      expect(() => TeamValidation.validateTeamDesignation('', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('   ', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('\t', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('\n', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should reject null and undefined values', () => {
      expect(() =>
        TeamValidation.validateTeamDesignation(null as unknown as string, 'team')
      ).toThrow(new DomainError('team must be either HOME or AWAY'));

      expect(() =>
        TeamValidation.validateTeamDesignation(undefined as unknown as string, 'team')
      ).toThrow(new DomainError('team must be either HOME or AWAY'));
    });

    it('should reject numeric strings', () => {
      expect(() => TeamValidation.validateTeamDesignation('1', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('0', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should reject similar but incorrect values', () => {
      expect(() => TeamValidation.validateTeamDesignation('HOMES', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('AWAYS', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('HOME_TEAM', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('AWAY_TEAM', 'team')).toThrow(
        new DomainError('team must be either HOME or AWAY')
      );
    });

    it('should include field name in error message', () => {
      expect(() => TeamValidation.validateTeamDesignation('INVALID', 'batting team')).toThrow(
        new DomainError('batting team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('WRONG', 'scoring team')).toThrow(
        new DomainError('scoring team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('BAD', 'current team')).toThrow(
        new DomainError('current team must be either HOME or AWAY')
      );

      expect(() => TeamValidation.validateTeamDesignation('', 'team designation')).toThrow(
        new DomainError('team designation must be either HOME or AWAY')
      );
    });

    it('should maintain exact backward compatibility with error message format', () => {
      // This test ensures the error message format exactly matches existing patterns
      try {
        TeamValidation.validateTeamDesignation('VISITOR', 'team');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as Error).message).toBe('team must be either HOME or AWAY');
        expect((error as Error).name).toBe('DomainError');
      }

      try {
        TeamValidation.validateTeamDesignation('home', 'batting team');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as Error).message).toBe('batting team must be either HOME or AWAY');
        expect((error as Error).name).toBe('DomainError');
      }
    });

    describe('realistic usage scenarios', () => {
      it('should work with common domain contexts', () => {
        // Game state contexts
        expect(() =>
          TeamValidation.validateTeamDesignation('HOME', 'current batting team')
        ).not.toThrow();
        expect(() =>
          TeamValidation.validateTeamDesignation('AWAY', 'current batting team')
        ).not.toThrow();

        // Scoring contexts
        expect(() => TeamValidation.validateTeamDesignation('HOME', 'scoring team')).not.toThrow();
        expect(() => TeamValidation.validateTeamDesignation('AWAY', 'scoring team')).not.toThrow();

        // Event contexts
        expect(() => TeamValidation.validateTeamDesignation('HOME', 'team in event')).not.toThrow();
        expect(() => TeamValidation.validateTeamDesignation('AWAY', 'team in event')).not.toThrow();
      });

      it('should handle typical invalid inputs from user interfaces', () => {
        // Common user input errors
        expect(() => TeamValidation.validateTeamDesignation('home', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );

        expect(() => TeamValidation.validateTeamDesignation('visitor', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );

        expect(() => TeamValidation.validateTeamDesignation('h', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );

        expect(() => TeamValidation.validateTeamDesignation('a', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );
      });

      it('should work with inning state logic patterns', () => {
        // Simulating typical usage in inning state management
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
        // Simulating usage in score updates
        const teams = ['HOME', 'AWAY'] as const;

        teams.forEach(team => {
          expect(() =>
            TeamValidation.validateTeamDesignation(team, 'team for score update')
          ).not.toThrow();
        });
      });

      it('should work with event sourcing patterns', () => {
        // Simulating usage in domain events
        const eventData = [
          { team: 'HOME', context: 'run scored event' },
          { team: 'AWAY', context: 'at-bat completed event' },
          { team: 'HOME', context: 'inning advanced event' },
          { team: 'AWAY', context: 'player substitution event' },
        ];

        eventData.forEach(({ team, context }) => {
          expect(() => TeamValidation.validateTeamDesignation(team, context)).not.toThrow();
        });
      });
    });

    describe('edge cases and robustness', () => {
      it('should handle type coercion attempts', () => {
        expect(() =>
          TeamValidation.validateTeamDesignation(1 as unknown as string, 'team')
        ).toThrow(new DomainError('team must be either HOME or AWAY'));

        expect(() =>
          TeamValidation.validateTeamDesignation(true as unknown as string, 'team')
        ).toThrow(new DomainError('team must be either HOME or AWAY'));

        expect(() =>
          TeamValidation.validateTeamDesignation([] as unknown as string, 'team')
        ).toThrow(new DomainError('team must be either HOME or AWAY'));

        expect(() =>
          TeamValidation.validateTeamDesignation({} as unknown as string, 'team')
        ).toThrow(new DomainError('team must be either HOME or AWAY'));
      });

      it('should handle Unicode and special characters', () => {
        expect(() => TeamValidation.validateTeamDesignation('HOM�', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );

        expect(() => TeamValidation.validateTeamDesignation('�WAY', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );

        expect(() => TeamValidation.validateTeamDesignation('HOME<�', 'team')).toThrow(
          new DomainError('team must be either HOME or AWAY')
        );
      });

      it('should be performant with valid inputs', () => {
        // This test ensures the validation is efficient for the common case
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
