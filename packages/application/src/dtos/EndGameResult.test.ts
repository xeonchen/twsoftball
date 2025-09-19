/**
 * @file EndGameResult.test.ts
 * Comprehensive tests for EndGameResult and related interfaces.
 */

import { GameId, GameStatus } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import type {
  EndGameResult,
  FinalGameStateDTO,
  GameEndStatisticsDTO,
  NotificationSummaryDTO,
  FollowUpActionDTO,
  EndGameErrorDTO,
  EndGameErrorCode,
} from './EndGameResult.js';

describe('EndGameResult', () => {
  describe('EndGameResult interface', () => {
    it('should represent successful mercy rule ending correctly', () => {
      const successResult: EndGameResult = {
        success: true,
        gameId: GameId.generate(),
        timestamp: new Date('2024-06-15T20:30:00Z'),
        finalState: {
          finalScore: { home: 18, away: 3 },
          winner: 'home',
          gameStatus: GameStatus.COMPLETED,
          officialGame: true,
          totalInnings: 5,
          totalOuts: 15,
          gameDurationMinutes: 125,
          playersParticipated: 18,
          finalBattingOrder: {
            home: ['Player 1', 'Player 2', 'Player 3'],
            away: ['Player A', 'Player B', 'Player C'],
          },
          specialConditions: ['mercy_rule_applied'],
        },
        endReason: 'mercy_rule',
        endedAt: new Date('2024-06-15T20:30:00Z'),
        statistics: {
          totalRuns: 21,
          totalHits: 28,
          totalErrors: 2,
          totalAtBats: 42,
          gameDuration: 125,
          teamStats: {
            home: { runs: 18, hits: 20, errors: 1, leftOnBase: 3 },
            away: { runs: 3, hits: 8, errors: 1, leftOnBase: 7 },
          },
          individualAchievements: [
            {
              playerId: 'player-123',
              playerName: 'John Smith',
              achievement: 'cycle',
              value: 1,
            },
          ],
          gameRecords: ['most_runs_in_5_innings'],
          seasonStatsUpdated: true,
        },
        eventsGenerated: ['GameCompleted', 'MercyRuleApplied', 'FinalStatisticsCalculated'],
        notifications: {
          playersNotified: 18,
          coachesNotified: 4,
          officialsNotified: 2,
          deliveryResults: { successful: 24, failed: 0, pending: 0 },
          channelsUsed: ['app', 'email'],
        },
        metadata: {
          operationDuration: 1250,
          eventsStored: 3,
          statisticsCalculated: true,
          notificationsSent: 24,
        },
      };

      expect(successResult.success).toBe(true);
      expect(successResult.gameId).toBeInstanceOf(GameId);
      expect(successResult.finalState?.winner).toBe('home');
      expect(successResult.finalState?.officialGame).toBe(true);
      expect(successResult.statistics?.totalRuns).toBe(21);
      expect(successResult.eventsGenerated).toContain('MercyRuleApplied');
      expect(successResult.notifications?.playersNotified).toBe(18);
    });

    it('should represent failed ending attempt correctly', () => {
      const errorResult: EndGameResult = {
        success: false,
        gameId: GameId.generate(),
        timestamp: new Date(),
        error: {
          code: 'GAME_ALREADY_COMPLETED',
          message: 'Cannot end game that has already been completed',
          currentGameState: {
            status: GameStatus.COMPLETED,
            inning: 7,
            outs: 3,
            lastActionTime: new Date('2024-06-15T21:30:00Z'),
          },
          details: {
            completedAt: '2024-06-15T21:30:00Z',
            winner: 'home',
            finalScore: { home: 8, away: 5 },
          },
          suggestedActions: ['Verify game status', 'Check for data synchronization issues'],
          retryable: false,
          supportContact: 'support@twsoftball.com',
        },
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error?.code).toBe('GAME_ALREADY_COMPLETED');
      expect(errorResult.error?.currentGameState?.status).toBe(GameStatus.COMPLETED);
      expect(errorResult.error?.retryable).toBe(false);
      expect(errorResult.error?.suggestedActions).toHaveLength(2);
    });

    it('should represent weather suspension correctly', () => {
      const weatherResult: EndGameResult = {
        success: true,
        gameId: GameId.generate(),
        timestamp: new Date(),
        finalState: {
          finalScore: { home: 2, away: 4 },
          winner: null,
          gameStatus: GameStatus.COMPLETED,
          officialGame: false,
          totalInnings: 3,
          totalOuts: 9,
          gameDurationMinutes: 45,
          playersParticipated: 18,
          finalBattingOrder: {
            home: ['Player 1', 'Player 2'],
            away: ['Player A', 'Player B'],
          },
          specialConditions: ['weather_suspension', 'resumption_scheduled'],
        },
        endReason: 'weather',
        endedAt: new Date(),
        followUpActions: [
          {
            actionType: 'schedule_makeup',
            description: 'Schedule resumption of suspended game',
            assignedTo: 'League Scheduler',
            dueDate: new Date('2024-06-16T09:00:00Z'),
            priority: 'high',
            instructions: 'Game will resume from top of 4th inning with current score',
            contactInfo: 'scheduler@league.com',
          },
        ],
      };

      expect(weatherResult.finalState?.gameStatus).toBe(GameStatus.COMPLETED);
      expect(weatherResult.finalState?.officialGame).toBe(false);
      expect(weatherResult.followUpActions).toHaveLength(1);
      expect(weatherResult.followUpActions?.[0]?.actionType).toBe('schedule_makeup');
    });
  });

  describe('FinalGameStateDTO interface', () => {
    it('should represent completed game state correctly', () => {
      const finalState: FinalGameStateDTO = {
        finalScore: { home: 7, away: 4 },
        winner: 'home',
        gameStatus: GameStatus.COMPLETED,
        officialGame: true,
        totalInnings: 7,
        totalOuts: 21,
        gameDurationMinutes: 135,
        playersParticipated: 20,
        finalBattingOrder: {
          home: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'],
          away: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'],
        },
      };

      expect(finalState.winner).toBe('home');
      expect(finalState.gameStatus).toBe(GameStatus.COMPLETED);
      expect(finalState.officialGame).toBe(true);
      expect(finalState.totalInnings).toBe(7);
      expect(finalState.finalBattingOrder.home).toHaveLength(9);
      expect(finalState.finalBattingOrder.away).toHaveLength(9);
    });

    it('should handle suspended games correctly', () => {
      const suspendedState: FinalGameStateDTO = {
        finalScore: { home: 3, away: 3 },
        winner: null,
        gameStatus: GameStatus.COMPLETED,
        officialGame: false,
        totalInnings: 4,
        totalOuts: 12,
        gameDurationMinutes: 75,
        playersParticipated: 18,
        finalBattingOrder: {
          home: ['H1', 'H2', 'H3'],
          away: ['A1', 'A2', 'A3'],
        },
        specialConditions: ['weather_delay', 'resumption_pending'],
      };

      expect(suspendedState.winner).toBeNull();
      expect(suspendedState.gameStatus).toBe(GameStatus.COMPLETED);
      expect(suspendedState.officialGame).toBe(false);
      expect(suspendedState.specialConditions).toContain('resumption_pending');
    });
  });

  describe('GameEndStatisticsDTO interface', () => {
    it('should represent comprehensive game statistics correctly', () => {
      const stats: GameEndStatisticsDTO = {
        totalRuns: 13,
        totalHits: 21,
        totalErrors: 3,
        totalAtBats: 56,
        gameDuration: 150,
        teamStats: {
          home: { runs: 8, hits: 12, errors: 1, leftOnBase: 6 },
          away: { runs: 5, hits: 9, errors: 2, leftOnBase: 8 },
        },
        individualAchievements: [
          {
            playerId: 'player-456',
            playerName: 'Mike Johnson',
            achievement: 'grand_slam',
            value: 1,
          },
          {
            playerId: 'player-789',
            playerName: 'Sarah Wilson',
            achievement: 'perfect_fielding',
            value: 1,
          },
        ],
        gameRecords: ['longest_game_this_season'],
        seasonStatsUpdated: true,
      };

      expect(stats.totalRuns).toBe(13);
      expect(stats.teamStats.home.runs + stats.teamStats.away.runs).toBe(stats.totalRuns);
      expect(stats.individualAchievements).toHaveLength(2);
      expect(stats.gameRecords).toContain('longest_game_this_season');
      expect(stats.seasonStatsUpdated).toBe(true);
    });

    it('should handle games with no individual achievements', () => {
      const basicStats: GameEndStatisticsDTO = {
        totalRuns: 6,
        totalHits: 10,
        totalErrors: 1,
        totalAtBats: 42,
        gameDuration: 105,
        teamStats: {
          home: { runs: 3, hits: 5, errors: 0, leftOnBase: 4 },
          away: { runs: 3, hits: 5, errors: 1, leftOnBase: 3 },
        },
        individualAchievements: [],
        seasonStatsUpdated: false,
      };

      expect(basicStats.individualAchievements).toHaveLength(0);
      expect(basicStats.gameRecords).toBeUndefined();
      expect(basicStats.seasonStatsUpdated).toBe(false);
    });
  });

  describe('NotificationSummaryDTO interface', () => {
    it('should represent successful notification delivery correctly', () => {
      const notifications: NotificationSummaryDTO = {
        playersNotified: 18,
        coachesNotified: 4,
        officialsNotified: 3,
        spectatorsNotified: 50,
        deliveryResults: {
          successful: 73,
          failed: 2,
          pending: 0,
        },
        channelsUsed: ['email', 'sms', 'app'],
        notificationIssues: [
          {
            recipient: 'player.smith@email.com',
            channel: 'email',
            error: 'Invalid email address',
          },
          {
            recipient: '+1-555-0123',
            channel: 'sms',
            error: 'SMS delivery failed',
          },
        ],
      };

      expect(notifications.playersNotified).toBe(18);
      expect(notifications.deliveryResults.successful).toBe(73);
      expect(notifications.deliveryResults.failed).toBe(2);
      expect(notifications.channelsUsed).toContain('app');
      expect(notifications.notificationIssues).toHaveLength(2);
    });

    it('should handle perfect notification delivery', () => {
      const perfectNotifications: NotificationSummaryDTO = {
        playersNotified: 16,
        coachesNotified: 2,
        officialsNotified: 2,
        deliveryResults: {
          successful: 20,
          failed: 0,
          pending: 0,
        },
        channelsUsed: ['app'],
      };

      expect(perfectNotifications.deliveryResults.failed).toBe(0);
      expect(perfectNotifications.notificationIssues).toBeUndefined();
    });
  });

  describe('FollowUpActionDTO interface', () => {
    it('should represent various follow-up actions correctly', () => {
      const actions: FollowUpActionDTO[] = [
        {
          actionType: 'submit_report',
          description: 'Submit official game report to league office',
          assignedTo: 'Head Umpire',
          dueDate: new Date('2024-06-16T09:00:00Z'),
          priority: 'high',
          instructions: 'Include weather documentation and field conditions',
        },
        {
          actionType: 'update_standings',
          description: 'Update league standings with game result',
          assignedTo: 'League Administrator',
          priority: 'normal',
        },
        {
          actionType: 'handle_appeal',
          description: 'Process forfeit appeal from away team',
          assignedTo: 'League Commissioner',
          dueDate: new Date('2024-06-18T17:00:00Z'),
          priority: 'urgent',
          contactInfo: 'commissioner@league.com',
        },
      ];

      expect(actions).toHaveLength(3);
      expect(actions[0]?.actionType).toBe('submit_report');
      expect(actions[0]?.priority).toBe('high');
      expect(actions[1]?.dueDate).toBeUndefined();
      expect(actions[2]?.priority).toBe('urgent');
    });
  });

  describe('EndGameErrorDTO interface', () => {
    it('should represent various error conditions correctly', () => {
      const errors: EndGameErrorDTO[] = [
        {
          code: 'GAME_NOT_FOUND',
          message: 'Specified game could not be found',
          retryable: false,
          suggestedActions: ['Verify game ID', 'Check system status'],
        },
        {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have permission to end games',
          retryable: false,
          suggestedActions: ['Contact system administrator', 'Verify user role'],
        },
        {
          code: 'STATISTICS_CALCULATION_FAILED',
          message: 'Failed to calculate final game statistics',
          currentGameState: {
            status: GameStatus.IN_PROGRESS,
            inning: 7,
            outs: 2,
            lastActionTime: new Date(),
          },
          retryable: true,
          suggestedActions: ['Retry operation', 'Contact technical support if issue persists'],
        },
      ];

      expect(errors[0]?.code).toBe('GAME_NOT_FOUND');
      expect(errors[0]?.retryable).toBe(false);
      expect(errors[1]?.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(errors[2]?.retryable).toBe(true);
      expect(errors[2]?.currentGameState?.status).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('EndGameErrorCode type', () => {
    it('should include all valid error codes', () => {
      const validCodes: EndGameErrorCode[] = [
        'GAME_NOT_FOUND',
        'GAME_ALREADY_COMPLETED',
        'GAME_NOT_STARTED',
        'INSUFFICIENT_PERMISSIONS',
        'INVALID_END_REASON',
        'GAME_STATE_CONFLICT',
        'STATISTICS_CALCULATION_FAILED',
        'EVENT_STORAGE_FAILED',
        'NOTIFICATION_FAILED',
        'VALIDATION_FAILED',
        'SYSTEM_ERROR',
      ];

      validCodes.forEach(code => {
        const error: EndGameErrorDTO = {
          code,
          message: `Error: ${code}`,
          retryable: false,
        };

        expect(error.code).toBe(code);
      });
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle games ending with zero score', () => {
      const zeroScoreResult: EndGameResult = {
        success: true,
        gameId: GameId.generate(),
        timestamp: new Date(),
        finalState: {
          finalScore: { home: 0, away: 0 },
          winner: null,
          gameStatus: GameStatus.COMPLETED,
          officialGame: true,
          totalInnings: 7,
          totalOuts: 21,
          gameDurationMinutes: 120,
          playersParticipated: 18,
          finalBattingOrder: {
            home: ['H1', 'H2'],
            away: ['A1', 'A2'],
          },
          specialConditions: ['scoreless_tie'],
        },
        statistics: {
          totalRuns: 0,
          totalHits: 8,
          totalErrors: 0,
          totalAtBats: 42,
          gameDuration: 120,
          teamStats: {
            home: { runs: 0, hits: 4, errors: 0, leftOnBase: 8 },
            away: { runs: 0, hits: 4, errors: 0, leftOnBase: 6 },
          },
          individualAchievements: [],
          seasonStatsUpdated: true,
        },
      };

      expect(zeroScoreResult.finalState?.finalScore.home).toBe(0);
      expect(zeroScoreResult.finalState?.finalScore.away).toBe(0);
      expect(zeroScoreResult.finalState?.winner).toBeNull();
      expect(zeroScoreResult.statistics?.totalRuns).toBe(0);
    });

    it('should handle extremely long games', () => {
      const longGameResult: EndGameResult = {
        success: true,
        gameId: GameId.generate(),
        timestamp: new Date(),
        finalState: {
          finalScore: { home: 15, away: 14 },
          winner: 'home',
          gameStatus: GameStatus.COMPLETED,
          officialGame: true,
          totalInnings: 12,
          totalOuts: 36,
          gameDurationMinutes: 240,
          playersParticipated: 22,
          finalBattingOrder: {
            home: ['H1', 'H2', 'H3'],
            away: ['A1', 'A2', 'A3'],
          },
          specialConditions: ['extra_innings', 'marathon_game'],
        },
        statistics: {
          totalRuns: 29,
          totalHits: 45,
          totalErrors: 5,
          totalAtBats: 96,
          gameDuration: 240,
          teamStats: {
            home: { runs: 15, hits: 23, errors: 2, leftOnBase: 12 },
            away: { runs: 14, hits: 22, errors: 3, leftOnBase: 15 },
          },
          individualAchievements: [],
          gameRecords: ['longest_game_in_league_history'],
          seasonStatsUpdated: true,
        },
      };

      expect(longGameResult.finalState?.totalInnings).toBe(12);
      expect(longGameResult.finalState?.gameDurationMinutes).toBe(240);
      expect(longGameResult.statistics?.gameRecords).toContain('longest_game_in_league_history');
    });
  });
});
