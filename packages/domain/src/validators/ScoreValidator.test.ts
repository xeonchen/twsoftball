import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { ScoreValidator } from './ScoreValidator';

describe('ScoreValidator', () => {
  describe('validateScore', () => {
    it('should accept valid score objects', () => {
      expect(() => ScoreValidator.validateScore({ home: 0, away: 0 })).not.toThrow();
      expect(() => ScoreValidator.validateScore({ home: 5, away: 3 })).not.toThrow();
      expect(() => ScoreValidator.validateScore({ home: 15, away: 12 })).not.toThrow();
    });

    it('should reject negative home scores', () => {
      expect(() => ScoreValidator.validateScore({ home: -1, away: 3 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: -1, away: 3 })).toThrow(
        'Home score cannot be negative'
      );
    });

    it('should reject negative away scores', () => {
      expect(() => ScoreValidator.validateScore({ home: 3, away: -2 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: 3, away: -2 })).toThrow(
        'Away score cannot be negative'
      );
    });

    it('should reject fractional home scores', () => {
      expect(() => ScoreValidator.validateScore({ home: 3.5, away: 2 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: 3.5, away: 2 })).toThrow(
        'Home score must be an integer'
      );
    });

    it('should reject fractional away scores', () => {
      expect(() => ScoreValidator.validateScore({ home: 2, away: 4.7 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: 2, away: 4.7 })).toThrow(
        'Away score must be an integer'
      );
    });

    it('should reject NaN home scores', () => {
      expect(() => ScoreValidator.validateScore({ home: NaN, away: 3 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: NaN, away: 3 })).toThrow(
        'Home score must be a valid number'
      );
    });

    it('should reject NaN away scores', () => {
      expect(() => ScoreValidator.validateScore({ home: 5, away: NaN })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: 5, away: NaN })).toThrow(
        'Away score must be a valid number'
      );
    });

    it('should reject infinite home scores', () => {
      expect(() => ScoreValidator.validateScore({ home: Infinity, away: 2 })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: Infinity, away: 2 })).toThrow(
        'Home score must be a finite number'
      );
    });

    it('should reject infinite away scores', () => {
      expect(() => ScoreValidator.validateScore({ home: 3, away: -Infinity })).toThrow(DomainError);
      expect(() => ScoreValidator.validateScore({ home: 3, away: -Infinity })).toThrow(
        'Away score must be a finite number'
      );
    });
  });

  describe('validateTeamScore', () => {
    it('should accept valid team scores', () => {
      expect(() => ScoreValidator.validateTeamScore(0, 'HOME')).not.toThrow();
      expect(() => ScoreValidator.validateTeamScore(15, 'AWAY')).not.toThrow();
      expect(() => ScoreValidator.validateTeamScore(7, 'Home')).not.toThrow();
      expect(() => ScoreValidator.validateTeamScore(3, 'Away')).not.toThrow();
    });

    it('should reject negative scores with team-specific error messages', () => {
      expect(() => ScoreValidator.validateTeamScore(-1, 'HOME')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(-1, 'HOME')).toThrow(
        'HOME score cannot be negative'
      );

      expect(() => ScoreValidator.validateTeamScore(-5, 'AWAY')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(-5, 'AWAY')).toThrow(
        'AWAY score cannot be negative'
      );
    });

    it('should reject fractional scores with team-specific error messages', () => {
      expect(() => ScoreValidator.validateTeamScore(3.5, 'HOME')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(3.5, 'HOME')).toThrow(
        'HOME score must be an integer'
      );

      expect(() => ScoreValidator.validateTeamScore(7.2, 'AWAY')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(7.2, 'AWAY')).toThrow(
        'AWAY score must be an integer'
      );
    });

    it('should reject NaN scores with team-specific error messages', () => {
      expect(() => ScoreValidator.validateTeamScore(NaN, 'HOME')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(NaN, 'HOME')).toThrow(
        'HOME score must be a valid number'
      );

      expect(() => ScoreValidator.validateTeamScore(NaN, 'AWAY')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(NaN, 'AWAY')).toThrow(
        'AWAY score must be a valid number'
      );
    });

    it('should reject infinite scores with team-specific error messages', () => {
      expect(() => ScoreValidator.validateTeamScore(Infinity, 'HOME')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(Infinity, 'HOME')).toThrow(
        'HOME score must be a finite number'
      );

      expect(() => ScoreValidator.validateTeamScore(-Infinity, 'AWAY')).toThrow(DomainError);
      expect(() => ScoreValidator.validateTeamScore(-Infinity, 'AWAY')).toThrow(
        'AWAY score must be a finite number'
      );
    });

    it('should handle case-sensitive team names in error messages', () => {
      expect(() => ScoreValidator.validateTeamScore(-1, 'Home')).toThrow(
        'Home score cannot be negative'
      );
      expect(() => ScoreValidator.validateTeamScore(-1, 'home')).toThrow(
        'home score cannot be negative'
      );
      expect(() => ScoreValidator.validateTeamScore(-1, 'Away')).toThrow(
        'Away score cannot be negative'
      );
    });
  });

  describe('validateRunsAdded', () => {
    it('should accept valid positive integer runs', () => {
      expect(() => ScoreValidator.validateRunsAdded(1)).not.toThrow();
      expect(() => ScoreValidator.validateRunsAdded(2)).not.toThrow();
      expect(() => ScoreValidator.validateRunsAdded(4)).not.toThrow(); // Grand slam scenario
      expect(() => ScoreValidator.validateRunsAdded(10)).not.toThrow(); // High-scoring inning
    });

    it('should reject zero runs added', () => {
      expect(() => ScoreValidator.validateRunsAdded(0)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(0)).toThrow(
        'Runs added must be greater than zero'
      );
    });

    it('should reject negative runs added', () => {
      expect(() => ScoreValidator.validateRunsAdded(-1)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(-1)).toThrow(
        'Runs added must be greater than zero'
      );

      expect(() => ScoreValidator.validateRunsAdded(-5)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(-5)).toThrow(
        'Runs added must be greater than zero'
      );
    });

    it('should reject fractional runs added', () => {
      expect(() => ScoreValidator.validateRunsAdded(1.5)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(1.5)).toThrow('Runs added must be an integer');

      expect(() => ScoreValidator.validateRunsAdded(2.7)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(2.7)).toThrow('Runs added must be an integer');
    });

    it('should reject NaN runs added', () => {
      expect(() => ScoreValidator.validateRunsAdded(NaN)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(NaN)).toThrow(
        'Runs added must be a valid number'
      );
    });

    it('should reject infinite runs added', () => {
      expect(() => ScoreValidator.validateRunsAdded(Infinity)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(Infinity)).toThrow(
        'Runs added must be a finite number'
      );

      expect(() => ScoreValidator.validateRunsAdded(-Infinity)).toThrow(DomainError);
      expect(() => ScoreValidator.validateRunsAdded(-Infinity)).toThrow(
        'Runs added must be a finite number'
      );
    });
  });
});
