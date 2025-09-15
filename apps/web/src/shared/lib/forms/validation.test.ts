import {
  teamSetupSchema,
  gameConfigSchema,
  playerNameSchema,
  validateTeamName,
} from './validation';

describe('Form Validation', () => {
  describe('teamSetupSchema', () => {
    it('should validate team names correctly', () => {
      const validTeamSetup = {
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
      };

      const result = teamSetupSchema.safeParse(validTeamSetup);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.homeTeam).toBe('Warriors');
        expect(result.data.awayTeam).toBe('Eagles');
      }
    });

    it('should reject duplicate team names', () => {
      const duplicateTeamSetup = {
        homeTeam: 'Warriors',
        awayTeam: 'Warriors',
      };

      const result = teamSetupSchema.safeParse(duplicateTeamSetup);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('same team name');
      }
    });

    it('should reject empty team names', () => {
      const emptyTeamSetup = {
        homeTeam: '',
        awayTeam: 'Eagles',
      };

      const result = teamSetupSchema.safeParse(emptyTeamSetup);
      expect(result.success).toBe(false);
    });

    it('should reject team names that are too short', () => {
      const shortTeamSetup = {
        homeTeam: 'A',
        awayTeam: 'Eagles',
      };

      const result = teamSetupSchema.safeParse(shortTeamSetup);
      expect(result.success).toBe(false);
    });

    it('should reject team names that are too long', () => {
      const longTeamSetup = {
        homeTeam: 'A'.repeat(31), // 31 characters
        awayTeam: 'Eagles',
      };

      const result = teamSetupSchema.safeParse(longTeamSetup);
      expect(result.success).toBe(false);
    });
  });

  describe('gameConfigSchema', () => {
    it('should validate basic game configuration', () => {
      const validConfig = {
        gameType: 'slow-pitch' as const,
        inningsCount: 7,
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
      };

      const result = gameConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid innings count', () => {
      const invalidConfig = {
        gameType: 'slow-pitch' as const,
        inningsCount: 15, // Too many innings
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
      };

      const result = gameConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject invalid game type', () => {
      const invalidConfig = {
        gameType: 'invalid-type',
        inningsCount: 7,
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
      };

      const result = gameConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('playerNameSchema', () => {
    it('should validate proper player names', () => {
      const validNames = ['John Doe', 'Mary Smith', 'José Rodriguez', "O'Connor"];

      validNames.forEach(name => {
        const result = playerNameSchema.safeParse(name);
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty or too short names', () => {
      const invalidNames = ['', 'A', 'B'];

      invalidNames.forEach(name => {
        const result = playerNameSchema.safeParse(name);
        expect(result.success).toBe(false);
      });
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = ['John123', 'Player@Name', 'Test<Name>'];

      invalidNames.forEach(name => {
        const result = playerNameSchema.safeParse(name);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateTeamName utility', () => {
    it('should return true for valid team names', () => {
      const validNames = ['Warriors', 'Eagles FC', 'The Mighty Ducks'];

      validNames.forEach(name => {
        expect(validateTeamName(name)).toBe(true);
      });
    });

    it('should return false for invalid team names', () => {
      const invalidNames = ['', 'A', 'A'.repeat(31), 'Team@Name'];

      invalidNames.forEach(name => {
        expect(validateTeamName(name)).toBe(false);
      });
    });

    it('should handle edge cases gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(validateTeamName(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(validateTeamName(undefined as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(validateTeamName(123 as any)).toBe(false);
    });
  });
});
