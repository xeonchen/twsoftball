import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect } from 'vitest';

import {
  type JerseyValidationResult,
  type FieldPositionValidationResult,
  type LineupValidationResult,
  type TeamValidationResult,
  type Player,
  validateJerseyNumber,
  validateFieldPosition,
  validateLineup,
  validateTeamNames,
  getJerseyNumberSuggestions,
  getFieldPositionSuggestions,
  validatePlayerName,
  isPlayerComplete,
  countIncompletePlayers,
} from './domainValidation';

/**
 * Domain Validation Test Suite
 *
 * Tests domain validation utilities for game setup UI following TDD approach.
 * These tests define the expected behavior before implementation.
 *
 * Coverage requirements: 95%+
 * Integration with domain layer: Import types only for validation
 */
describe('Domain Validation in UI', () => {
  describe('Jersey Number Validation', () => {
    it('should validate jersey numbers are 1-99', () => {
      // Valid range
      expect(validateJerseyNumber('1', [])).toEqual<JerseyValidationResult>({
        isValid: true,
      });
      expect(validateJerseyNumber('99', [])).toEqual<JerseyValidationResult>({
        isValid: true,
        warning: 'High jersey numbers are less common',
      });
      expect(validateJerseyNumber('23', [])).toEqual<JerseyValidationResult>({
        isValid: true,
      });

      // Invalid - below range
      expect(validateJerseyNumber('0', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be between 1 and 99',
      });

      // Invalid - above range
      expect(validateJerseyNumber('100', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be between 1 and 99',
      });
    });

    it('should prevent duplicate jersey numbers on same team', () => {
      const existingJerseys = ['23', '15', '8'];

      // Duplicate
      expect(validateJerseyNumber('23', existingJerseys)).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number 23 is already taken',
      });

      // Not duplicate
      expect(validateJerseyNumber('42', existingJerseys)).toEqual<JerseyValidationResult>({
        isValid: true,
      });
    });

    it('should handle edge cases (0, 99, negative, 100)', () => {
      // Edge cases at boundaries
      expect(validateJerseyNumber('0', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be between 1 and 99',
      });

      expect(validateJerseyNumber('99', [])).toEqual<JerseyValidationResult>({
        isValid: true,
        warning: 'High jersey numbers are less common',
      });

      // Negative numbers
      expect(validateJerseyNumber('-5', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be numeric',
      });

      // Above range
      expect(validateJerseyNumber('100', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be between 1 and 99',
      });

      // Non-numeric
      expect(validateJerseyNumber('23a', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number must be numeric',
      });

      // Empty/whitespace
      expect(validateJerseyNumber('', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number is required',
      });

      expect(validateJerseyNumber('   ', [])).toEqual<JerseyValidationResult>({
        isValid: false,
        error: 'Jersey number is required',
      });
    });

    it('should provide helpful warnings for uncommon jersey numbers', () => {
      // Numbers over 50 might get a warning (optional enhancement)
      const result = validateJerseyNumber('87', []);
      expect(result.isValid).toBe(true);
      // Warning is optional but could be useful UX
    });

    it('should suggest common jersey numbers', () => {
      const suggestions = getJerseyNumberSuggestions(['23', '8', '15']);

      // Should suggest common numbers not already taken
      expect(suggestions).toContain('1');
      expect(suggestions).toContain('10');
      expect(suggestions).toContain('7');
      expect(suggestions).not.toContain('23'); // Already taken
      expect(suggestions).not.toContain('8'); // Already taken
      expect(suggestions).not.toContain('15'); // Already taken

      // Should suggest reasonable number of options
      expect(suggestions.length).toBeGreaterThan(5);
      expect(suggestions.length).toBeLessThan(20);
    });
  });

  describe('Field Position Validation', () => {
    it('should validate field positions are valid enum values', () => {
      // Valid positions
      expect(validateFieldPosition('P')).toEqual<FieldPositionValidationResult>({
        isValid: true,
        position: FieldPosition.PITCHER,
      });

      expect(validateFieldPosition('SS')).toEqual<FieldPositionValidationResult>({
        isValid: true,
        position: FieldPosition.SHORTSTOP,
      });

      expect(validateFieldPosition('EP')).toEqual<FieldPositionValidationResult>({
        isValid: true,
        position: FieldPosition.EXTRA_PLAYER,
      });

      // Invalid position
      expect(validateFieldPosition('XX')).toEqual<FieldPositionValidationResult>({
        isValid: false,
        error: 'Invalid field position: XX',
        suggestions: expect.arrayContaining([FieldPosition.PITCHER, FieldPosition.CATCHER]),
      });
    });

    it('should provide suggestions for invalid positions', () => {
      const result = validateFieldPosition('PITCHER');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid field position: PITCHER');
      expect(result.suggestions).toContain(FieldPosition.PITCHER);
    });

    it('should handle case-insensitive validation', () => {
      // Should accept lowercase
      expect(validateFieldPosition('p')).toEqual<FieldPositionValidationResult>({
        isValid: true,
        position: FieldPosition.PITCHER,
      });

      expect(validateFieldPosition('ss')).toEqual<FieldPositionValidationResult>({
        isValid: true,
        position: FieldPosition.SHORTSTOP,
      });
    });

    it('should validate required positions present', () => {
      const result = getFieldPositionSuggestions();

      // Should include all essential positions
      expect(result).toContain(FieldPosition.PITCHER);
      expect(result).toContain(FieldPosition.CATCHER);
      expect(result).toContain(FieldPosition.FIRST_BASE);
      expect(result).toContain(FieldPosition.SECOND_BASE);
      expect(result).toContain(FieldPosition.THIRD_BASE);
      expect(result).toContain(FieldPosition.SHORTSTOP);
      expect(result).toContain(FieldPosition.LEFT_FIELD);
      expect(result).toContain(FieldPosition.CENTER_FIELD);
      expect(result).toContain(FieldPosition.RIGHT_FIELD);
      expect(result).toContain(FieldPosition.SHORT_FIELDER);
      expect(result).toContain(FieldPosition.EXTRA_PLAYER);
    });

    it('should handle empty position input', () => {
      expect(validateFieldPosition('')).toEqual<FieldPositionValidationResult>({
        isValid: false,
        error: 'Field position is required',
      });
    });
  });

  describe('Lineup Validation', () => {
    const createPlayer = (
      name: string,
      jersey: string,
      position: string,
      battingOrder: number
    ): {
      id: string;
      name: string;
      jerseyNumber: string;
      position: string;
      battingOrder: number;
    } => ({
      id: `player-${name}`,
      name,
      jerseyNumber: jersey,
      position,
      battingOrder,
    });

    it('should validate lineup has minimum 9 players', () => {
      // Valid minimum lineup
      const validLineup = Array.from({ length: 9 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, `${i + 1}`, 'P', i + 1)
      );

      expect(validateLineup(validLineup)).toEqual<LineupValidationResult>({
        isValid: true,
        playerCount: 9,
        warning: undefined,
        positionCoverage: {
          covered: ['P'],
          missing: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF', 'EP'],
        },
      });

      // Invalid - too few players
      const shortLineup = Array.from({ length: 8 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, `${i + 1}`, 'P', i + 1)
      );

      expect(validateLineup(shortLineup)).toEqual<LineupValidationResult>({
        isValid: false,
        error: 'Lineup must have at least 9 players',
        playerCount: 8,
      });
    });

    it('should validate lineup has maximum reasonable players', () => {
      // Valid reasonable lineup
      const reasonableLineup = Array.from({ length: 15 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, `${i + 1}`, 'P', i + 1)
      );

      expect(validateLineup(reasonableLineup)).toEqual<LineupValidationResult>({
        isValid: true,
        playerCount: 15,
        warning: undefined,
        positionCoverage: {
          covered: ['P'],
          missing: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF', 'EP'],
        },
      });

      // Warning for very large lineup (optional)
      const largeLineup = Array.from({ length: 20 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, `${i + 1}`, 'P', i + 1)
      );

      const result = validateLineup(largeLineup);
      expect(result.isValid).toBe(true);
      expect(result.playerCount).toBe(20);
      // Could have warning for unusually large lineups
    });

    it('should validate batting order sequence', () => {
      const invalidBattingOrder = [
        createPlayer('Player 1', '1', 'P', 1),
        createPlayer('Player 2', '2', 'C', 1), // Duplicate batting order
        createPlayer('Player 3', '3', '1B', 3),
      ];

      expect(validateLineup(invalidBattingOrder)).toEqual<LineupValidationResult>({
        isValid: false,
        error: 'Duplicate batting order: 1',
        playerCount: 3,
      });
    });

    it('should check for duplicate jersey numbers', () => {
      const duplicateJerseys = [
        createPlayer('Player 1', '23', 'P', 1),
        createPlayer('Player 2', '23', 'C', 2), // Duplicate jersey
        createPlayer('Player 3', '15', '1B', 3),
      ];

      expect(validateLineup(duplicateJerseys)).toEqual<LineupValidationResult>({
        isValid: false,
        error: 'Duplicate jersey number: 23',
        playerCount: 3,
      });
    });

    it('should handle empty player names', () => {
      const incompleteLineup = [
        createPlayer('Player 1', '1', 'P', 1),
        createPlayer('', '2', 'C', 2), // Empty name
        createPlayer('Player 3', '3', '1B', 3),
      ];

      expect(validateLineup(incompleteLineup)).toEqual<LineupValidationResult>({
        isValid: false,
        error: 'All players must have names',
        playerCount: 2, // Only counts players with names
      });
    });

    it('should provide position coverage information', () => {
      const lineup = [
        createPlayer('Player 1', '1', 'P', 1),
        createPlayer('Player 2', '2', 'C', 2),
        createPlayer('Player 3', '3', '1B', 3),
        createPlayer('Player 4', '4', '2B', 4),
        createPlayer('Player 5', '5', '3B', 5),
        createPlayer('Player 6', '6', 'SS', 6),
        createPlayer('Player 7', '7', 'LF', 7),
        createPlayer('Player 8', '8', 'CF', 8),
        createPlayer('Player 9', '9', 'RF', 9),
      ];

      const result = validateLineup(lineup);
      expect(result.isValid).toBe(true);
      expect(result.positionCoverage).toBeDefined();
      expect(result.positionCoverage?.covered).toContain(FieldPosition.PITCHER);
      expect(result.positionCoverage?.covered).toContain(FieldPosition.CATCHER);
      expect(result.positionCoverage?.missing).not.toContain(FieldPosition.PITCHER);
    });
  });

  describe('Team Validation', () => {
    it('should validate team names are different', () => {
      // Valid different names
      expect(validateTeamNames('Eagles', 'Warriors')).toEqual<TeamValidationResult>({
        isValid: true,
      });

      // Invalid - same names
      expect(validateTeamNames('Eagles', 'Eagles')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Team names must be different',
      });

      // Case-insensitive comparison
      expect(validateTeamNames('Eagles', 'eagles')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Team names must be different',
      });
    });

    it('should validate team names are not empty', () => {
      // Empty home team
      expect(validateTeamNames('', 'Warriors')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Home team name is required',
      });

      // Empty away team
      expect(validateTeamNames('Eagles', '')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Away team name is required',
      });

      // Both empty
      expect(validateTeamNames('', '')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Team names are required',
      });

      // Whitespace only
      expect(validateTeamNames('   ', 'Warriors')).toEqual<TeamValidationResult>({
        isValid: false,
        error: 'Home team name is required',
      });
    });

    it('should provide helpful suggestions for team names', () => {
      // Test could suggest common team name patterns if needed
      const result = validateTeamNames('Eagles', 'Warriors');
      expect(result.isValid).toBe(true);
      // Suggestions are optional but could enhance UX
    });

    it('should handle special characters in team names', () => {
      // Should allow reasonable special characters
      expect(validateTeamNames("Eagles '24", 'Warriors FC')).toEqual<TeamValidationResult>({
        isValid: true,
      });

      // Should handle Unicode characters
      expect(validateTeamNames('Águilas', 'Warriors')).toEqual<TeamValidationResult>({
        isValid: true,
      });
    });

    it('should validate team name length limits', () => {
      const longName = 'A'.repeat(100); // Very long name
      const result = validateTeamNames(longName, 'Warriors');

      // Could have length limits for practical UI reasons
      if (!result.isValid) {
        expect(result.error).toContain('too long');
      }
    });
  });

  describe('Integration with Domain Layer', () => {
    it('should use domain enum values for validation', () => {
      // Verify we're using actual domain enums
      expect(Object.values(FieldPosition)).toContain('P');
      expect(Object.values(FieldPosition)).toContain('SS');
      expect(Object.values(FieldPosition)).toContain('EP');
    });

    it('should maintain separation from domain business logic', () => {
      // These utilities should only validate UI input
      // NOT perform business operations
      const result = validateJerseyNumber('23', []);
      expect(result).toHaveProperty('isValid');
      expect(result).not.toHaveProperty('domainObject');
    });

    it('should provide UI-friendly error messages', () => {
      const result = validateJerseyNumber('abc', []);
      expect(result.error).toBe('Jersey number must be numeric');
      // Should be user-friendly, not technical domain error
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large lineups efficiently', () => {
      const largeLineup = Array.from({ length: 50 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        jerseyNumber: `${i + 1}`,
        position: 'EP',
        battingOrder: i + 1,
      }));

      const start = performance.now();
      const result = validateLineup(largeLineup);
      const end = performance.now();

      expect(result.isValid).toBe(true);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should handle malformed input gracefully', () => {
      // Null/undefined handling
      expect(() => validateJerseyNumber(null as string | null | undefined, [])).not.toThrow();
      expect(() => validateFieldPosition(undefined as string | null | undefined)).not.toThrow();

      // Array with null elements
      const lineupWithNull = [
        null,
        { id: '1', name: 'Player', jerseyNumber: '1', position: 'P', battingOrder: 1 },
      ] as (Player | null | undefined)[];

      expect(() => validateLineup(lineupWithNull)).not.toThrow();
    });
  });

  describe('Per-field Validation Helpers (UX Enhancement)', () => {
    it('should validate player names', () => {
      // Valid names
      expect(validatePlayerName('John Smith')).toEqual({
        isValid: true,
      });

      expect(validatePlayerName('A')).toEqual({
        isValid: true,
      });

      // Invalid names - empty
      expect(validatePlayerName('')).toEqual({
        isValid: false,
        error: 'Player name is required',
      });

      expect(validatePlayerName('   ')).toEqual({
        isValid: false,
        error: 'Player name is required',
      });

      // Invalid names - null/undefined
      expect(validatePlayerName(null as unknown as string)).toEqual({
        isValid: false,
        error: 'Player name is required',
      });

      expect(validatePlayerName(undefined as unknown as string)).toEqual({
        isValid: false,
        error: 'Player name is required',
      });
    });

    it('should check if player is complete', () => {
      // Complete player
      expect(
        isPlayerComplete({
          id: '1',
          name: 'John Smith',
          jerseyNumber: '23',
          position: 'P',
          battingOrder: 1,
        })
      ).toBe(true);

      // Incomplete - missing name
      expect(
        isPlayerComplete({
          id: '1',
          name: '',
          jerseyNumber: '23',
          position: 'P',
          battingOrder: 1,
        })
      ).toBe(false);

      // Incomplete - missing jersey
      expect(
        isPlayerComplete({
          id: '1',
          name: 'John Smith',
          jerseyNumber: '',
          position: 'P',
          battingOrder: 1,
        })
      ).toBe(false);

      // Incomplete - missing position
      expect(
        isPlayerComplete({
          id: '1',
          name: 'John Smith',
          jerseyNumber: '23',
          position: '',
          battingOrder: 1,
        })
      ).toBe(false);

      // Incomplete - all empty
      expect(
        isPlayerComplete({
          id: '1',
          name: '',
          jerseyNumber: '',
          position: '',
          battingOrder: 1,
        })
      ).toBe(false);

      // Incomplete - whitespace only
      expect(
        isPlayerComplete({
          id: '1',
          name: '   ',
          jerseyNumber: '   ',
          position: '   ',
          battingOrder: 1,
        })
      ).toBe(false);
    });

    it('should count incomplete players in lineup', () => {
      const lineup = [
        {
          id: '1',
          name: 'John Smith',
          jerseyNumber: '23',
          position: 'P',
          battingOrder: 1,
        },
        {
          id: '2',
          name: 'Jane Doe',
          jerseyNumber: '',
          position: 'C',
          battingOrder: 2,
        },
        {
          id: '3',
          name: '',
          jerseyNumber: '',
          position: 'SS',
          battingOrder: 3,
        },
        {
          id: '4',
          name: 'Bob Wilson',
          jerseyNumber: '15',
          position: '',
          battingOrder: 4,
        },
      ];

      expect(countIncompletePlayers(lineup)).toBe(3);
    });

    it('should handle empty lineup when counting incomplete players', () => {
      expect(countIncompletePlayers([])).toBe(0);
      expect(countIncompletePlayers([null, null, null] as (Player | null)[])).toBe(0);
    });
  });

  describe('Lineup Validation - Jersey Number Requirements (Bug Fix)', () => {
    it('should reject lineup with players missing jersey numbers', () => {
      // BUG: validateLineup currently only checks for names, not jersey numbers
      // This test should FAIL before the fix and PASS after
      const lineupWithMissingJerseys: Player[] = Array.from({ length: 9 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        jerseyNumber: '', // Missing jersey numbers!
        position: 'P',
        battingOrder: i + 1,
      }));

      const result = validateLineup(lineupWithMissingJerseys);

      // Should be invalid because jersey numbers are missing
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('jersey');
      expect(result.playerCount).toBe(0); // No complete players
    });

    it('should reject lineup with some players missing jersey numbers', () => {
      const lineup: Player[] = [
        {
          id: '1',
          name: 'Player 1',
          jerseyNumber: '1',
          position: 'P',
          battingOrder: 1,
        },
        {
          id: '2',
          name: 'Player 2',
          jerseyNumber: '', // Missing jersey
          position: 'C',
          battingOrder: 2,
        },
        {
          id: '3',
          name: 'Player 3',
          jerseyNumber: '3',
          position: 'SS',
          battingOrder: 3,
        },
      ];

      const result = validateLineup(lineup);

      // Should be invalid because one player is missing jersey
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('jersey');
      expect(result.playerCount).toBe(2); // Only 2 complete players
    });

    it('should count only complete players (with name AND jersey)', () => {
      const lineup: Player[] = Array.from({ length: 10 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        jerseyNumber: i < 5 ? `${i + 1}` : '', // Only first 5 have jerseys
        position: 'P',
        battingOrder: i + 1,
      }));

      const result = validateLineup(lineup);

      // Should count only complete players (first 5)
      expect(result.playerCount).toBe(5);
      expect(result.isValid).toBe(false); // Less than 9 complete
      expect(result.error).toContain('jersey');
    });

    it('should accept lineup with 9 complete players (name + jersey + position)', () => {
      const completeLineup: Player[] = Array.from({ length: 9 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        jerseyNumber: `${i + 1}`,
        position: 'P',
        battingOrder: i + 1,
      }));

      const result = validateLineup(completeLineup);

      // Should be valid - all players complete
      expect(result.isValid).toBe(true);
      expect(result.playerCount).toBe(9);
    });
  });
});
