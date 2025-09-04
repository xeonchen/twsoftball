/**
 * @file PlayerStatisticsDTO Tests
 * Tests for DTOs representing player batting and fielding statistics.
 */

import { PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { PlayerStatisticsDTO, FieldingStatisticsDTO } from './PlayerStatisticsDTO';

describe('PlayerStatisticsDTO', () => {
  let validPlayerStats: PlayerStatisticsDTO;
  let playerId: PlayerId;

  beforeEach(() => {
    playerId = PlayerId.generate();

    const fieldingStats: FieldingStatisticsDTO = {
      positions: [FieldPosition.FIRST_BASE, FieldPosition.LEFT_FIELD],
      putouts: 8,
      assists: 3,
      errors: 1,
      fieldingPercentage: 0.917,
    };

    validPlayerStats = {
      playerId,
      name: 'John Smith',
      jerseyNumber: JerseyNumber.fromNumber(15),
      plateAppearances: 5,
      atBats: 4,
      hits: 3,
      singles: 2,
      doubles: 1,
      triples: 0,
      homeRuns: 0,
      walks: 1,
      strikeouts: 1,
      rbi: 2,
      runs: 1,
      battingAverage: 0.75,
      onBasePercentage: 0.8,
      sluggingPercentage: 1.0,
      fielding: fieldingStats,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid PlayerStatisticsDTO with all required fields', () => {
      const stats = validPlayerStats;

      expect(stats.playerId).toBeInstanceOf(PlayerId);
      expect(stats.name).toBe('John Smith');
      expect(stats.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(typeof stats.plateAppearances).toBe('number');
      expect(typeof stats.atBats).toBe('number');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.singles).toBe('number');
      expect(typeof stats.doubles).toBe('number');
      expect(typeof stats.triples).toBe('number');
      expect(typeof stats.homeRuns).toBe('number');
      expect(typeof stats.walks).toBe('number');
      expect(typeof stats.strikeouts).toBe('number');
      expect(typeof stats.rbi).toBe('number');
      expect(typeof stats.runs).toBe('number');
      expect(typeof stats.battingAverage).toBe('number');
      expect(typeof stats.onBasePercentage).toBe('number');
      expect(typeof stats.sluggingPercentage).toBe('number');
      expect(typeof stats.fielding).toBe('object');
    });

    it('should maintain proper numeric types for all statistics', () => {
      const stats = validPlayerStats;

      // Count statistics should be integers
      expect(Number.isInteger(stats.plateAppearances)).toBe(true);
      expect(Number.isInteger(stats.atBats)).toBe(true);
      expect(Number.isInteger(stats.hits)).toBe(true);
      expect(Number.isInteger(stats.singles)).toBe(true);
      expect(Number.isInteger(stats.doubles)).toBe(true);
      expect(Number.isInteger(stats.triples)).toBe(true);
      expect(Number.isInteger(stats.homeRuns)).toBe(true);
      expect(Number.isInteger(stats.walks)).toBe(true);
      expect(Number.isInteger(stats.strikeouts)).toBe(true);
      expect(Number.isInteger(stats.rbi)).toBe(true);
      expect(Number.isInteger(stats.runs)).toBe(true);

      // Percentage statistics should be numbers (may be decimal)
      expect(typeof stats.battingAverage).toBe('number');
      expect(typeof stats.onBasePercentage).toBe('number');
      expect(typeof stats.sluggingPercentage).toBe('number');
    });
  });

  describe('Batting Statistics Logic', () => {
    it('should handle perfect batting statistics', () => {
      const perfectStats: PlayerStatisticsDTO = {
        ...validPlayerStats,
        plateAppearances: 3,
        atBats: 3,
        hits: 3,
        singles: 3,
        doubles: 0,
        triples: 0,
        homeRuns: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 2,
        runs: 2,
        battingAverage: 1.0,
        onBasePercentage: 1.0,
        sluggingPercentage: 1.0,
        fielding: validPlayerStats.fielding,
      };

      expect(perfectStats.battingAverage).toBe(1.0);
      expect(perfectStats.onBasePercentage).toBe(1.0);
      expect(perfectStats.sluggingPercentage).toBe(1.0);
      expect(perfectStats.hits).toBe(perfectStats.atBats);
    });

    it('should handle zero batting statistics (new player)', () => {
      const newPlayerStats: PlayerStatisticsDTO = {
        ...validPlayerStats,
        plateAppearances: 0,
        atBats: 0,
        hits: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        homeRuns: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        runs: 0,
        battingAverage: 0,
        onBasePercentage: 0,
        sluggingPercentage: 0,
      };

      expect(newPlayerStats.plateAppearances).toBe(0);
      expect(newPlayerStats.atBats).toBe(0);
      expect(newPlayerStats.hits).toBe(0);
      expect(newPlayerStats.battingAverage).toBe(0);
    });

    it('should maintain proper relationships between hit types', () => {
      const stats = validPlayerStats;
      const totalExtraBaseHits = stats.doubles + stats.triples + stats.homeRuns;
      const expectedHits = stats.singles + totalExtraBaseHits;

      expect(stats.hits).toBe(expectedHits);
    });

    it('should handle walks separately from at-bats', () => {
      const walkHeavyStats: PlayerStatisticsDTO = {
        ...validPlayerStats,
        plateAppearances: 6,
        atBats: 3,
        hits: 2,
        walks: 3, // 3 walks, so PA > AB
        battingAverage: 0.667, // 2/3
        onBasePercentage: 0.833, // (2+3)/6
      };

      expect(walkHeavyStats.plateAppearances).toBeGreaterThan(walkHeavyStats.atBats);
      expect(walkHeavyStats.plateAppearances).toBe(walkHeavyStats.atBats + walkHeavyStats.walks);
    });

    it('should calculate slugging percentage correctly for power hitters', () => {
      const powerHitterStats: PlayerStatisticsDTO = {
        ...validPlayerStats,
        atBats: 4,
        hits: 3,
        singles: 1, // 1 base
        doubles: 1, // 2 bases
        triples: 0, // 0 bases
        homeRuns: 1, // 4 bases
        sluggingPercentage: 1.75, // (1 + 2 + 4) / 4 = 7/4 = 1.75
      };

      expect(powerHitterStats.sluggingPercentage).toBe(1.75);
      expect(powerHitterStats.homeRuns).toBe(1);
    });
  });

  describe('Fielding Statistics', () => {
    it('should handle comprehensive fielding statistics', () => {
      const fieldingStats = validPlayerStats.fielding;

      expect(Array.isArray(fieldingStats.positions)).toBe(true);
      expect(fieldingStats.positions.length).toBeGreaterThan(0);
      expect(typeof fieldingStats.putouts).toBe('number');
      expect(typeof fieldingStats.assists).toBe('number');
      expect(typeof fieldingStats.errors).toBe('number');
      expect(typeof fieldingStats.fieldingPercentage).toBe('number');
    });

    it('should calculate fielding percentage correctly', () => {
      const fieldingStats: FieldingStatisticsDTO = {
        positions: [FieldPosition.SHORTSTOP],
        putouts: 10,
        assists: 15,
        errors: 2,
        fieldingPercentage: 0.926, // (10 + 15) / (10 + 15 + 2) = 25/27 ≈ 0.926
      };

      const stats = {
        ...validPlayerStats,
        fielding: fieldingStats,
      };

      expect(stats.fielding.fieldingPercentage).toBeCloseTo(0.926, 3);
      expect(stats.fielding.putouts).toBe(10);
      expect(stats.fielding.assists).toBe(15);
      expect(stats.fielding.errors).toBe(2);
    });

    it('should handle perfect fielding (no errors)', () => {
      const perfectFieldingStats: FieldingStatisticsDTO = {
        positions: [FieldPosition.FIRST_BASE],
        putouts: 12,
        assists: 3,
        errors: 0,
        fieldingPercentage: 1.0,
      };

      const stats = {
        ...validPlayerStats,
        fielding: perfectFieldingStats,
      };

      expect(stats.fielding.fieldingPercentage).toBe(1.0);
      expect(stats.fielding.errors).toBe(0);
    });

    it('should handle multiple field positions', () => {
      const versatileFieldingStats: FieldingStatisticsDTO = {
        positions: [FieldPosition.FIRST_BASE, FieldPosition.THIRD_BASE, FieldPosition.LEFT_FIELD],
        putouts: 5,
        assists: 7,
        errors: 1,
        fieldingPercentage: 0.923, // (5 + 7) / (5 + 7 + 1) = 12/13 ≈ 0.923
      };

      const stats = {
        ...validPlayerStats,
        fielding: versatileFieldingStats,
      };

      expect(stats.fielding.positions).toHaveLength(3);
      expect(stats.fielding.positions).toContain(FieldPosition.FIRST_BASE);
      expect(stats.fielding.positions).toContain(FieldPosition.THIRD_BASE);
      expect(stats.fielding.positions).toContain(FieldPosition.LEFT_FIELD);
    });

    it('should handle new player with no fielding opportunities', () => {
      const noFieldingStats: FieldingStatisticsDTO = {
        positions: [],
        putouts: 0,
        assists: 0,
        errors: 0,
        fieldingPercentage: 1.0, // Perfect by default when no chances
      };

      const stats = {
        ...validPlayerStats,
        fielding: noFieldingStats,
      };

      expect(stats.fielding.positions).toHaveLength(0);
      expect(stats.fielding.putouts).toBe(0);
      expect(stats.fielding.assists).toBe(0);
      expect(stats.fielding.errors).toBe(0);
      expect(stats.fielding.fieldingPercentage).toBe(1.0);
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const stats = validPlayerStats;

      expect(stats.playerId).toBeInstanceOf(PlayerId);
      expect(stats.jerseyNumber).toBeInstanceOf(JerseyNumber);

      stats.fielding.positions.forEach(position => {
        expect(Object.values(FieldPosition)).toContain(position);
      });
    });

    it('should maintain consistency with jersey number', () => {
      const stats = validPlayerStats;

      expect(stats.jerseyNumber.value).toBe('15');
      expect(stats.jerseyNumber).toBeInstanceOf(JerseyNumber);
    });
  });

  describe('Statistical Ranges and Validation', () => {
    it('should have non-negative count statistics', () => {
      const stats = validPlayerStats;

      expect(stats.plateAppearances).toBeGreaterThanOrEqual(0);
      expect(stats.atBats).toBeGreaterThanOrEqual(0);
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.singles).toBeGreaterThanOrEqual(0);
      expect(stats.doubles).toBeGreaterThanOrEqual(0);
      expect(stats.triples).toBeGreaterThanOrEqual(0);
      expect(stats.homeRuns).toBeGreaterThanOrEqual(0);
      expect(stats.walks).toBeGreaterThanOrEqual(0);
      expect(stats.strikeouts).toBeGreaterThanOrEqual(0);
      expect(stats.rbi).toBeGreaterThanOrEqual(0);
      expect(stats.runs).toBeGreaterThanOrEqual(0);
    });

    it('should have percentage statistics in valid ranges', () => {
      const stats = validPlayerStats;

      expect(stats.battingAverage).toBeGreaterThanOrEqual(0);
      expect(stats.battingAverage).toBeLessThanOrEqual(1);
      expect(stats.onBasePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.onBasePercentage).toBeLessThanOrEqual(1);
      expect(stats.sluggingPercentage).toBeGreaterThanOrEqual(0);
      // Slugging percentage can be > 1 (e.g., all home runs would be 4.000)
    });

    it('should maintain logical relationships between statistics', () => {
      const stats = validPlayerStats;

      // Hits cannot exceed at-bats
      expect(stats.hits).toBeLessThanOrEqual(stats.atBats);

      // At-bats cannot exceed plate appearances
      expect(stats.atBats).toBeLessThanOrEqual(stats.plateAppearances);

      // Individual hit types should sum to total hits
      const hitSum = stats.singles + stats.doubles + stats.triples + stats.homeRuns;
      expect(stats.hits).toBe(hitSum);
    });
  });
});
