/**
 * @file GameStatisticsDTO.test.ts
 * Comprehensive tests for GameStatisticsDTO and related interfaces.
 */

import { GameId, PlayerId, JerseyNumber, GameStatus } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import type {
  GameStatisticsDTO,
  TeamStatisticsDTO,
  GamePlayerPerformanceDTO,
  InningScoreDTO,
  SignificantGameEventDTO,
  GameMetricsDTO,
} from './GameStatisticsDTO';

describe('GameStatisticsDTO', () => {
  describe('GameStatisticsDTO interface', () => {
    it('should represent complete game statistics correctly', () => {
      const gameStats: GameStatisticsDTO = {
        gameId: GameId.generate(),
        gameStatus: GameStatus.COMPLETED,
        finalScore: { home: 8, away: 5 },
        completedAt: new Date('2024-06-15T21:30:00Z'),
        durationMinutes: 150,
        teams: { home: 'Dragons', away: 'Tigers' },
        teamStatistics: {
          home: {
            runs: 8,
            hits: 12,
            errors: 1,
            leftOnBase: 6,
            battingAverage: 0.324,
            onBasePercentage: 0.412,
            sluggingPercentage: 0.527,
            strikeouts: 8,
            walks: 5,
            extraBaseHits: 4,
            rbis: 7,
            twoOutRbis: 3,
            rispBattingAverage: 0.4,
          },
          away: {
            runs: 5,
            hits: 9,
            errors: 3,
            leftOnBase: 8,
            battingAverage: 0.243,
            onBasePercentage: 0.324,
            sluggingPercentage: 0.378,
            strikeouts: 12,
            walks: 3,
            extraBaseHits: 2,
            rbis: 4,
            twoOutRbis: 1,
            rispBattingAverage: 0.2,
          },
        },
        playerPerformances: [],
        inningScores: [],
        significantEvents: [],
        gameMetrics: {
          totalRuns: 13,
          totalHits: 21,
          totalErrors: 4,
          largestLead: 5,
          leadChanges: 3,
          ties: 2,
          extraInnings: false,
          competitivenessRating: 7.5,
          runsPerInning: 1.86,
          averageInningDuration: 18.5,
        },
        calculatedAt: new Date(),
      };

      expect(gameStats.gameId).toBeInstanceOf(GameId);
      expect(gameStats.gameStatus).toBe(GameStatus.COMPLETED);
      expect(gameStats.finalScore.home).toBe(8);
      expect(gameStats.finalScore.away).toBe(5);
      expect(gameStats.teams.home).toBe('Dragons');
      expect(gameStats.teams.away).toBe('Tigers');
      expect(gameStats.durationMinutes).toBe(150);
      expect(gameStats.gameMetrics.totalRuns).toBe(13);
      expect(gameStats.gameMetrics.competitivenessRating).toBe(7.5);
    });

    it('should handle in-progress games', () => {
      const gameStats: GameStatisticsDTO = {
        gameId: GameId.generate(),
        gameStatus: GameStatus.IN_PROGRESS,
        finalScore: { home: 4, away: 3 },
        completedAt: null,
        durationMinutes: null,
        teams: { home: 'Hawks', away: 'Eagles' },
        teamStatistics: {
          home: {
            runs: 4,
            hits: 6,
            errors: 0,
            leftOnBase: 3,
            battingAverage: 0.333,
            onBasePercentage: 0.4,
            sluggingPercentage: 0.5,
            strikeouts: 4,
            walks: 2,
            extraBaseHits: 2,
            rbis: 3,
            twoOutRbis: 1,
            rispBattingAverage: 0.5,
          },
          away: {
            runs: 3,
            hits: 5,
            errors: 1,
            leftOnBase: 4,
            battingAverage: 0.278,
            onBasePercentage: 0.35,
            sluggingPercentage: 0.389,
            strikeouts: 6,
            walks: 1,
            extraBaseHits: 1,
            rbis: 2,
            twoOutRbis: 0,
            rispBattingAverage: 0.25,
          },
        },
        playerPerformances: [],
        inningScores: [],
        significantEvents: [],
        gameMetrics: {
          totalRuns: 7,
          totalHits: 11,
          totalErrors: 1,
          largestLead: 2,
          leadChanges: 2,
          ties: 1,
          extraInnings: false,
          competitivenessRating: 8.0,
          runsPerInning: 1.17,
          averageInningDuration: null,
        },
        calculatedAt: new Date(),
      };

      expect(gameStats.gameStatus).toBe(GameStatus.IN_PROGRESS);
      expect(gameStats.completedAt).toBeNull();
      expect(gameStats.durationMinutes).toBeNull();
      expect(gameStats.gameMetrics.averageInningDuration).toBeNull();
    });
  });

  describe('TeamStatisticsDTO interface', () => {
    it('should represent team statistics correctly', () => {
      const teamStats: TeamStatisticsDTO = {
        runs: 8,
        hits: 12,
        errors: 1,
        leftOnBase: 6,
        battingAverage: 0.324,
        onBasePercentage: 0.412,
        sluggingPercentage: 0.527,
        strikeouts: 8,
        walks: 5,
        extraBaseHits: 4,
        rbis: 7,
        twoOutRbis: 3,
        rispBattingAverage: 0.4,
      };

      expect(teamStats.runs).toBe(8);
      expect(teamStats.battingAverage).toBe(0.324);
      expect(teamStats.onBasePercentage).toBe(0.412);
      expect(teamStats.sluggingPercentage).toBe(0.527);
      expect(teamStats.extraBaseHits).toBe(4);
      expect(teamStats.twoOutRbis).toBe(3);
      expect(teamStats.rispBattingAverage).toBe(0.4);
    });

    it('should handle perfect performance statistics', () => {
      const perfectStats: TeamStatisticsDTO = {
        runs: 15,
        hits: 15,
        errors: 0,
        leftOnBase: 0,
        battingAverage: 1.0,
        onBasePercentage: 1.0,
        sluggingPercentage: 4.0,
        strikeouts: 0,
        walks: 0,
        extraBaseHits: 15,
        rbis: 15,
        twoOutRbis: 5,
        rispBattingAverage: 1.0,
      };

      expect(perfectStats.battingAverage).toBe(1.0);
      expect(perfectStats.errors).toBe(0);
      expect(perfectStats.leftOnBase).toBe(0);
      expect(perfectStats.strikeouts).toBe(0);
    });
  });

  describe('GamePlayerPerformanceDTO interface', () => {
    it('should represent player performance correctly', () => {
      const playerPerformance: GamePlayerPerformanceDTO = {
        playerId: PlayerId.generate(),
        name: 'John Smith',
        jerseyNumber: JerseyNumber.fromNumber(15),
        primaryPosition: 'SS',
        batting: {
          plateAppearances: 5,
          atBats: 4,
          hits: 3,
          singles: 1,
          doubles: 1,
          triples: 0,
          homeRuns: 1,
          runs: 2,
          rbis: 3,
          walks: 1,
          strikeouts: 1,
          battingAverage: 0.75,
          onBasePercentage: 0.8,
          sluggingPercentage: 1.5,
        },
        fielding: {
          putouts: 4,
          assists: 6,
          errors: 0,
          fieldingPercentage: 1.0,
        },
        achievements: ['game_winning_rbi', 'cycle_attempt'],
      };

      expect(playerPerformance.playerId).toBeInstanceOf(PlayerId);
      expect(playerPerformance.name).toBe('John Smith');
      expect(playerPerformance.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(playerPerformance.primaryPosition).toBe('SS');
      expect(playerPerformance.batting.battingAverage).toBe(0.75);
      expect(playerPerformance.fielding?.fieldingPercentage).toBe(1.0);
      expect(playerPerformance.achievements).toContain('game_winning_rbi');
    });

    it('should handle players with no fielding statistics', () => {
      const dhPerformance: GamePlayerPerformanceDTO = {
        playerId: PlayerId.generate(),
        name: 'Mike Johnson',
        jerseyNumber: JerseyNumber.fromNumber(10),
        primaryPosition: 'DH',
        batting: {
          plateAppearances: 4,
          atBats: 3,
          hits: 2,
          singles: 2,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          runs: 1,
          rbis: 1,
          walks: 1,
          strikeouts: 0,
          battingAverage: 0.667,
          onBasePercentage: 0.75,
          sluggingPercentage: 0.667,
        },
        fielding: null,
        achievements: ['contact_hitter'],
      };

      expect(dhPerformance.primaryPosition).toBe('DH');
      expect(dhPerformance.fielding).toBeNull();
      expect(dhPerformance.batting.strikeouts).toBe(0);
    });
  });

  describe('InningScoreDTO interface', () => {
    it('should represent inning scores correctly', () => {
      const inningScore: InningScoreDTO = {
        inning: 5,
        homeRuns: 3,
        awayRuns: 0,
        cumulativeScore: { home: 8, away: 4 },
        notableEvents: ['two_run_double', 'bases_loaded_walk'],
      };

      expect(inningScore.inning).toBe(5);
      expect(inningScore.homeRuns).toBe(3);
      expect(inningScore.awayRuns).toBe(0);
      expect(inningScore.cumulativeScore.home).toBe(8);
      expect(inningScore.cumulativeScore.away).toBe(4);
      expect(inningScore.notableEvents).toHaveLength(2);
    });

    it('should handle scoreless innings', () => {
      const scorelessInning: InningScoreDTO = {
        inning: 2,
        homeRuns: 0,
        awayRuns: 0,
        cumulativeScore: { home: 1, away: 1 },
        notableEvents: [],
      };

      expect(scorelessInning.homeRuns).toBe(0);
      expect(scorelessInning.awayRuns).toBe(0);
      expect(scorelessInning.notableEvents).toHaveLength(0);
    });
  });

  describe('SignificantGameEventDTO interface', () => {
    it('should represent significant events correctly', () => {
      const significantEvent: SignificantGameEventDTO = {
        inning: 9,
        half: 'bottom',
        description: 'Walk-off home run by #23',
        impact: 'game_winning',
        playersInvolved: [
          {
            playerId: PlayerId.generate(),
            name: 'Dave Wilson',
            role: 'batter',
          },
        ],
        timestamp: new Date('2024-06-15T21:25:00Z'),
      };

      expect(significantEvent.inning).toBe(9);
      expect(significantEvent.half).toBe('bottom');
      expect(significantEvent.impact).toBe('game_winning');
      expect(significantEvent.playersInvolved).toHaveLength(1);
      expect(significantEvent.playersInvolved[0]!.role).toBe('batter');
    });

    it('should handle multiple players involved', () => {
      const doublePlayEvent: SignificantGameEventDTO = {
        inning: 6,
        half: 'top',
        description: '6-4-3 double play',
        impact: 'significant',
        playersInvolved: [
          { playerId: PlayerId.generate(), name: 'SS Player', role: 'fielder' },
          { playerId: PlayerId.generate(), name: '2B Player', role: 'fielder' },
          { playerId: PlayerId.generate(), name: '1B Player', role: 'fielder' },
        ],
        timestamp: new Date(),
      };

      expect(doublePlayEvent.playersInvolved).toHaveLength(3);
      expect(doublePlayEvent.impact).toBe('significant');
      expect(doublePlayEvent.playersInvolved.every(p => p.role === 'fielder')).toBe(true);
    });
  });

  describe('GameMetricsDTO interface', () => {
    it('should represent game metrics correctly', () => {
      const gameMetrics: GameMetricsDTO = {
        totalRuns: 13,
        totalHits: 21,
        totalErrors: 4,
        largestLead: 5,
        leadChanges: 3,
        ties: 2,
        extraInnings: false,
        competitivenessRating: 7.5,
        runsPerInning: 1.86,
        averageInningDuration: 18.5,
      };

      expect(gameMetrics.totalRuns).toBe(13);
      expect(gameMetrics.totalHits).toBe(21);
      expect(gameMetrics.totalErrors).toBe(4);
      expect(gameMetrics.largestLead).toBe(5);
      expect(gameMetrics.leadChanges).toBe(3);
      expect(gameMetrics.ties).toBe(2);
      expect(gameMetrics.extraInnings).toBe(false);
      expect(gameMetrics.competitivenessRating).toBe(7.5);
      expect(gameMetrics.runsPerInning).toBeCloseTo(1.86);
      expect(gameMetrics.averageInningDuration).toBe(18.5);
    });

    it('should handle extra inning games', () => {
      const extraInningMetrics: GameMetricsDTO = {
        totalRuns: 10,
        totalHits: 18,
        totalErrors: 2,
        largestLead: 3,
        leadChanges: 5,
        ties: 4,
        extraInnings: true,
        competitivenessRating: 9.2,
        runsPerInning: 1.25,
        averageInningDuration: 22.0,
      };

      expect(extraInningMetrics.extraInnings).toBe(true);
      expect(extraInningMetrics.competitivenessRating).toBe(9.2);
      expect(extraInningMetrics.leadChanges).toBe(5);
      expect(extraInningMetrics.ties).toBe(4);
    });

    it('should handle blowout games', () => {
      const blowoutMetrics: GameMetricsDTO = {
        totalRuns: 22,
        totalHits: 28,
        totalErrors: 1,
        largestLead: 15,
        leadChanges: 0,
        ties: 0,
        extraInnings: false,
        competitivenessRating: 3.0,
        runsPerInning: 4.4,
        averageInningDuration: 15.2,
      };

      expect(blowoutMetrics.largestLead).toBe(15);
      expect(blowoutMetrics.leadChanges).toBe(0);
      expect(blowoutMetrics.ties).toBe(0);
      expect(blowoutMetrics.competitivenessRating).toBe(3.0);
      expect(blowoutMetrics.runsPerInning).toBe(4.4);
    });
  });
});
