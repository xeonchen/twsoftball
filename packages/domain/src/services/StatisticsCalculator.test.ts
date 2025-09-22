import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';

import { StatisticsCalculator, AtBatResult } from './StatisticsCalculator.js';

describe('StatisticsCalculator', () => {
  describe('calculateBattingAverage', () => {
    it('should calculate batting average correctly', () => {
      expect(StatisticsCalculator.calculateBattingAverage(5, 20)).toBe(0.25); // 5 hits in 20 at-bats
      expect(StatisticsCalculator.calculateBattingAverage(0, 10)).toBe(0.0); // No hits
      expect(StatisticsCalculator.calculateBattingAverage(10, 20)).toBe(0.5); // 50%
      expect(StatisticsCalculator.calculateBattingAverage(1, 3)).toBe(0.333); // Rounded to 3 decimals
    });

    it('should return 0.000 when no at-bats', () => {
      expect(StatisticsCalculator.calculateBattingAverage(0, 0)).toBe(0.0);
      expect(StatisticsCalculator.calculateBattingAverage(5, 0)).toBe(0.0); // Invalid but handle gracefully
    });

    it('should throw error for negative values', () => {
      expect(() => StatisticsCalculator.calculateBattingAverage(-1, 10)).toThrow(DomainError);
      expect(() => StatisticsCalculator.calculateBattingAverage(5, -1)).toThrow(DomainError);
    });

    it('should throw error when hits exceed at-bats', () => {
      expect(() => StatisticsCalculator.calculateBattingAverage(10, 5)).toThrow(DomainError);
    });
  });

  describe('calculateOnBasePercentage', () => {
    it('should calculate on-base percentage correctly', () => {
      // H=5, BB=3, HBP=1, AB=20, SF=2 => (5+3+1)/(20+3+1+2) = 9/26 = 0.346
      expect(StatisticsCalculator.calculateOnBasePercentage(5, 3, 1, 20, 2)).toBe(0.346);

      // Perfect on-base (all hits or walks)
      expect(StatisticsCalculator.calculateOnBasePercentage(10, 5, 0, 10, 0)).toBe(1.0);

      // No on-base events
      expect(StatisticsCalculator.calculateOnBasePercentage(0, 0, 0, 10, 1)).toBe(0.0);
    });

    it('should return 0.000 when no plate appearances', () => {
      expect(StatisticsCalculator.calculateOnBasePercentage(0, 0, 0, 0, 0)).toBe(0.0);
    });

    it('should throw error for negative values', () => {
      expect(() => StatisticsCalculator.calculateOnBasePercentage(-1, 2, 0, 10, 0)).toThrow(
        DomainError
      );
      expect(() => StatisticsCalculator.calculateOnBasePercentage(5, -1, 0, 10, 0)).toThrow(
        DomainError
      );
    });

    it('should throw error when on-base events exceed plate appearances', () => {
      // This is actually mathematically impossible to violate without violating other constraints
      // Let's test a simpler constraint violation - hits > at-bats in the context of OBP
      expect(() => StatisticsCalculator.calculateOnBasePercentage(15, 0, 0, 10, 0)).toThrow(
        DomainError
      );
    });
  });

  describe('calculateSluggingPercentage', () => {
    it('should calculate slugging percentage correctly', () => {
      // 2 singles, 1 double, 1 triple, 1 HR in 20 at-bats = (2*1 + 1*2 + 1*3 + 1*4)/20 = 11/20 = 0.550
      expect(StatisticsCalculator.calculateSluggingPercentage(11, 20)).toBe(0.55);

      // All singles
      expect(StatisticsCalculator.calculateSluggingPercentage(5, 20)).toBe(0.25);

      // No hits
      expect(StatisticsCalculator.calculateSluggingPercentage(0, 20)).toBe(0.0);
    });

    it('should return 0.000 when no at-bats', () => {
      expect(StatisticsCalculator.calculateSluggingPercentage(0, 0)).toBe(0.0);
    });

    it('should throw error for negative values', () => {
      expect(() => StatisticsCalculator.calculateSluggingPercentage(-1, 10)).toThrow(DomainError);
      expect(() => StatisticsCalculator.calculateSluggingPercentage(5, -1)).toThrow(DomainError);
    });

    it('should throw error when total bases exceed 4 times at-bats', () => {
      // Maximum total bases is 4 * at-bats (if all are home runs)
      expect(() => StatisticsCalculator.calculateSluggingPercentage(41, 10)).toThrow(DomainError);
    });
  });

  describe('calculateOPS', () => {
    it('should calculate OPS correctly', () => {
      const obp = 0.4;
      const slg = 0.5;
      expect(StatisticsCalculator.calculateOPS(obp, slg)).toBe(0.9);
    });

    it('should handle zero values', () => {
      expect(StatisticsCalculator.calculateOPS(0, 0)).toBe(0.0);
      expect(StatisticsCalculator.calculateOPS(0.3, 0)).toBe(0.3);
      expect(StatisticsCalculator.calculateOPS(0, 0.4)).toBe(0.4);
    });

    it('should throw error for negative values', () => {
      expect(() => StatisticsCalculator.calculateOPS(-0.1, 0.5)).toThrow(DomainError);
      expect(() => StatisticsCalculator.calculateOPS(0.3, -0.1)).toThrow(DomainError);
    });

    it('should throw error for OBP values greater than 1.0', () => {
      expect(() => StatisticsCalculator.calculateOPS(1.1, 0.5)).toThrow(DomainError);
      // Slugging can exceed 1.0, so this should not throw
      expect(() => StatisticsCalculator.calculateOPS(0.3, 1.1)).not.toThrow();
    });
  });

  describe('calculateTotalBases', () => {
    it('should calculate total bases from at-bat results correctly', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 3 }, // 3 * 1 = 3
        { type: AtBatResultType.DOUBLE, count: 2 }, // 2 * 2 = 4
        { type: AtBatResultType.TRIPLE, count: 1 }, // 1 * 3 = 3
        { type: AtBatResultType.HOME_RUN, count: 1 }, // 1 * 4 = 4
        { type: AtBatResultType.WALK, count: 5 }, // 5 * 0 = 0
        { type: AtBatResultType.STRIKEOUT, count: 3 }, // 3 * 0 = 0
      ];

      expect(StatisticsCalculator.calculateTotalBases(atBatResults)).toBe(14);
    });

    it('should handle empty results array', () => {
      expect(StatisticsCalculator.calculateTotalBases([])).toBe(0);
    });

    it('should handle only non-hit results', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.WALK, count: 5 },
        { type: AtBatResultType.STRIKEOUT, count: 3 },
        { type: AtBatResultType.GROUND_OUT, count: 2 },
      ];

      expect(StatisticsCalculator.calculateTotalBases(atBatResults)).toBe(0);
    });

    it('should throw error for negative counts', () => {
      const atBatResults: AtBatResult[] = [{ type: AtBatResultType.SINGLE, count: -1 }];

      expect(() => StatisticsCalculator.calculateTotalBases(atBatResults)).toThrow(DomainError);
    });
  });

  describe('calculateHits', () => {
    it('should calculate hits from at-bat results correctly', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 3 },
        { type: AtBatResultType.DOUBLE, count: 2 },
        { type: AtBatResultType.TRIPLE, count: 1 },
        { type: AtBatResultType.HOME_RUN, count: 1 },
        { type: AtBatResultType.WALK, count: 5 }, // Not a hit
        { type: AtBatResultType.ERROR, count: 2 }, // Not a hit
        { type: AtBatResultType.STRIKEOUT, count: 3 }, // Not a hit
      ];

      expect(StatisticsCalculator.calculateHits(atBatResults)).toBe(7); // 3+2+1+1
    });

    it('should handle empty results array', () => {
      expect(StatisticsCalculator.calculateHits([])).toBe(0);
    });

    it('should handle only non-hit results', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.WALK, count: 5 },
        { type: AtBatResultType.ERROR, count: 2 },
        { type: AtBatResultType.STRIKEOUT, count: 3 },
      ];

      expect(StatisticsCalculator.calculateHits(atBatResults)).toBe(0);
    });
  });

  describe('calculateAtBats', () => {
    it('should calculate at-bats correctly (excludes walks, HBP, SF)', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 3 }, // Counts as AB
        { type: AtBatResultType.STRIKEOUT, count: 2 }, // Counts as AB
        { type: AtBatResultType.WALK, count: 4 }, // Does not count
        { type: AtBatResultType.SACRIFICE_FLY, count: 1 }, // Does not count
        { type: AtBatResultType.GROUND_OUT, count: 2 }, // Counts as AB
      ];

      expect(StatisticsCalculator.calculateAtBats(atBatResults)).toBe(7); // 3+2+2
    });

    it('should handle empty results array', () => {
      expect(StatisticsCalculator.calculateAtBats([])).toBe(0);
    });

    it('should exclude walks and sacrifice flies', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.WALK, count: 10 },
        { type: AtBatResultType.SACRIFICE_FLY, count: 2 },
      ];

      expect(StatisticsCalculator.calculateAtBats(atBatResults)).toBe(0);
    });
  });

  describe('calculatePlateAppearances', () => {
    it('should calculate plate appearances correctly (includes all results)', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 3 },
        { type: AtBatResultType.WALK, count: 4 },
        { type: AtBatResultType.SACRIFICE_FLY, count: 1 },
        { type: AtBatResultType.STRIKEOUT, count: 2 },
      ];

      expect(StatisticsCalculator.calculatePlateAppearances(atBatResults)).toBe(10);
    });

    it('should handle empty results array', () => {
      expect(StatisticsCalculator.calculatePlateAppearances([])).toBe(0);
    });
  });

  describe('calculatePlayerStats', () => {
    it('should calculate comprehensive player statistics', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 2 }, // 2 hits, 2 TB, 2 AB
        { type: AtBatResultType.DOUBLE, count: 1 }, // 1 hit, 2 TB, 1 AB
        { type: AtBatResultType.HOME_RUN, count: 1 }, // 1 hit, 4 TB, 1 AB
        { type: AtBatResultType.WALK, count: 2 }, // 0 hits, 0 TB, 0 AB (2 on-base)
        { type: AtBatResultType.STRIKEOUT, count: 4 }, // 0 hits, 0 TB, 4 AB
        { type: AtBatResultType.SACRIFICE_FLY, count: 1 }, // 0 hits, 0 TB, 0 AB
      ];

      const stats = StatisticsCalculator.calculatePlayerStats(atBatResults);

      // Totals: 4 hits, 8 total bases, 8 at-bats, 11 plate appearances, 2 walks
      expect(stats.hits).toBe(4);
      expect(stats.atBats).toBe(8);
      expect(stats.plateAppearances).toBe(11);
      expect(stats.totalBases).toBe(8);
      expect(stats.walks).toBe(2);

      // Calculated stats
      expect(stats.battingAverage).toBe(0.5); // 4/8
      expect(stats.onBasePercentage).toBe(0.545); // (4+2+0)/(8+2+0+1) = 6/11
      expect(stats.sluggingPercentage).toBe(1.0); // 8/8
      expect(stats.ops).toBe(1.545); // 0.545 + 1.000
    });

    it('should handle player with no statistics', () => {
      const stats = StatisticsCalculator.calculatePlayerStats([]);

      expect(stats.hits).toBe(0);
      expect(stats.atBats).toBe(0);
      expect(stats.plateAppearances).toBe(0);
      expect(stats.totalBases).toBe(0);
      expect(stats.walks).toBe(0);
      expect(stats.battingAverage).toBe(0.0);
      expect(stats.onBasePercentage).toBe(0.0);
      expect(stats.sluggingPercentage).toBe(0.0);
      expect(stats.ops).toBe(0.0);
    });

    it('should handle player with only walks and strikeouts', () => {
      const atBatResults: AtBatResult[] = [
        { type: AtBatResultType.WALK, count: 5 },
        { type: AtBatResultType.STRIKEOUT, count: 3 },
      ];

      const stats = StatisticsCalculator.calculatePlayerStats(atBatResults);

      expect(stats.hits).toBe(0);
      expect(stats.atBats).toBe(3);
      expect(stats.plateAppearances).toBe(8);
      expect(stats.totalBases).toBe(0);
      expect(stats.walks).toBe(5);
      expect(stats.battingAverage).toBe(0.0);
      expect(stats.onBasePercentage).toBe(0.625); // 5/8
      expect(stats.sluggingPercentage).toBe(0.0);
      expect(stats.ops).toBe(0.625);
    });
  });

  describe('isHit', () => {
    it('should correctly identify hits', () => {
      expect(StatisticsCalculator.isHit(AtBatResultType.SINGLE)).toBe(true);
      expect(StatisticsCalculator.isHit(AtBatResultType.DOUBLE)).toBe(true);
      expect(StatisticsCalculator.isHit(AtBatResultType.TRIPLE)).toBe(true);
      expect(StatisticsCalculator.isHit(AtBatResultType.HOME_RUN)).toBe(true);
    });

    it('should correctly identify non-hits', () => {
      expect(StatisticsCalculator.isHit(AtBatResultType.WALK)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.ERROR)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.FIELDERS_CHOICE)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.STRIKEOUT)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.GROUND_OUT)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.FLY_OUT)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.SACRIFICE_FLY)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.DOUBLE_PLAY)).toBe(false);
      expect(StatisticsCalculator.isHit(AtBatResultType.TRIPLE_PLAY)).toBe(false);
    });
  });

  describe('countsAsAtBat', () => {
    it('should correctly identify at-bat events', () => {
      // Hits count as at-bats
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.SINGLE)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.DOUBLE)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.TRIPLE)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.HOME_RUN)).toBe(true);

      // Outs count as at-bats
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.STRIKEOUT)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.GROUND_OUT)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.FLY_OUT)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.DOUBLE_PLAY)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.TRIPLE_PLAY)).toBe(true);

      // Other outcomes count as at-bats
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.ERROR)).toBe(true);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.FIELDERS_CHOICE)).toBe(true);
    });

    it('should correctly identify non-at-bat events', () => {
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.WALK)).toBe(false);
      expect(StatisticsCalculator.countsAsAtBat(AtBatResultType.SACRIFICE_FLY)).toBe(false);
    });
  });

  describe('getBaseValue', () => {
    it('should return correct base values', () => {
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.SINGLE)).toBe(1);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.DOUBLE)).toBe(2);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.TRIPLE)).toBe(3);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.HOME_RUN)).toBe(4);
    });

    it('should return 0 for non-hit results', () => {
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.WALK)).toBe(0);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.STRIKEOUT)).toBe(0);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.ERROR)).toBe(0);
      expect(StatisticsCalculator.getBaseValue(AtBatResultType.GROUND_OUT)).toBe(0);
    });
  });

  describe('Business Rules Documentation', () => {
    it('should document softball statistics calculation rules', () => {
      // This test serves as living documentation for softball statistics:

      // 1. Batting Average = Hits / At-Bats (walks and sacrifice flies don't count)
      expect(StatisticsCalculator.calculateBattingAverage(3, 10)).toBe(0.3);

      // 2. On-Base Percentage = (H + BB + HBP) / (AB + BB + HBP + SF)
      expect(StatisticsCalculator.calculateOnBasePercentage(3, 2, 1, 10, 1)).toBe(0.429); // 6/14

      // 3. Slugging Percentage = Total Bases / At-Bats
      expect(StatisticsCalculator.calculateSluggingPercentage(8, 10)).toBe(0.8);

      // 4. OPS = On-Base Percentage + Slugging Percentage
      expect(StatisticsCalculator.calculateOPS(0.4, 0.5)).toBe(0.9);

      // 5. Total Bases: Single=1, Double=2, Triple=3, Home Run=4
      const mixedResults: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 2 }, // 2 bases
        { type: AtBatResultType.DOUBLE, count: 1 }, // 2 bases
        { type: AtBatResultType.HOME_RUN, count: 1 }, // 4 bases
      ];
      expect(StatisticsCalculator.calculateTotalBases(mixedResults)).toBe(8);

      // 6. At-Bats exclude walks and sacrifice flies but include errors
      const atBatExamples: AtBatResult[] = [
        { type: AtBatResultType.SINGLE, count: 1 }, // Counts
        { type: AtBatResultType.WALK, count: 1 }, // Doesn't count
        { type: AtBatResultType.ERROR, count: 1 }, // Counts
        { type: AtBatResultType.SACRIFICE_FLY, count: 1 }, // Doesn't count
      ];
      expect(StatisticsCalculator.calculateAtBats(atBatExamples)).toBe(2);

      // 7. Plate Appearances include everything
      expect(StatisticsCalculator.calculatePlateAppearances(atBatExamples)).toBe(4);
    });
  });
});
