/**
 * @file EndGameCommand.test.ts
 * Comprehensive tests for EndGameCommand and related interfaces.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import type {
  EndGameCommand,
  GameEndReason,
  WeatherConditionsDTO,
  ForfeitDetailsDTO,
} from './EndGameCommand';

describe('EndGameCommand', () => {
  describe('EndGameCommand interface', () => {
    it('should represent mercy rule game ending correctly', () => {
      const mercyRuleCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'mercy_rule',
        description: 'Home team leads by 15 runs after 5 complete innings',
        endTime: new Date('2024-06-15T20:30:00Z'),
        currentInning: 5,
        currentHalf: 'bottom',
        currentOuts: 1,
        finalScore: { home: 18, away: 3 },
        winner: 'home',
        officialGame: true,
        initiatedBy: 'umpire',
        ruleReference: 'Rule 4.10(c) - Mercy Rule',
      };

      expect(mercyRuleCommand.gameId).toBeInstanceOf(GameId);
      expect(mercyRuleCommand.reason).toBe('mercy_rule');
      expect(mercyRuleCommand.description).toContain('15 runs');
      expect(mercyRuleCommand.finalScore.home).toBe(18);
      expect(mercyRuleCommand.finalScore.away).toBe(3);
      expect(mercyRuleCommand.winner).toBe('home');
      expect(mercyRuleCommand.officialGame).toBe(true);
      expect(mercyRuleCommand.ruleReference).toContain('Mercy Rule');
    });

    it('should represent weather cancellation correctly', () => {
      const weatherCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'weather',
        description: 'Game suspended due to lightning in the area',
        endTime: new Date('2024-06-15T19:45:00Z'),
        currentInning: 3,
        currentHalf: 'top',
        currentOuts: 2,
        finalScore: { home: 2, away: 4 },
        winner: null,
        officialGame: false,
        initiatedBy: 'umpire',
        resumptionPossible: true,
        notes: 'Game will resume from current state when conditions improve',
        resumptionContact: 'league.coordinator@example.com',
        weatherConditions: {
          condition: 'lightning',
          temperature: 78,
          windSpeed: 15,
          description: 'Lightning detected within 10 miles of field',
          expectedImprovement: true,
          estimatedClearance: 45,
        },
      };

      expect(weatherCommand.reason).toBe('weather');
      expect(weatherCommand.winner).toBeNull();
      expect(weatherCommand.officialGame).toBe(false);
      expect(weatherCommand.resumptionPossible).toBe(true);
      expect(weatherCommand.weatherConditions?.condition).toBe('lightning');
      expect(weatherCommand.weatherConditions?.estimatedClearance).toBe(45);
      expect(weatherCommand.resumptionContact).toContain('@example.com');
    });

    it('should represent forfeit scenarios correctly', () => {
      const forfeitCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'forfeit',
        description: 'Away team forfeits due to insufficient players',
        endTime: new Date('2024-06-15T20:00:00Z'),
        currentInning: 4,
        currentHalf: 'bottom',
        currentOuts: 0,
        finalScore: { home: 5, away: 3 },
        winner: 'home',
        officialGame: true,
        initiatedBy: 'head_umpire',
        ruleReference: 'Rule 4.17 - Forfeit',
        forfeitDetails: {
          forfeitingTeam: 'away',
          forfeitReason: 'insufficient_players',
          details: 'Away team has only 7 players available after two injuries',
          playersInvolved: ['Player #12', 'Player #8'],
          appealPending: false,
          official: 'Chief Umpire Johnson',
        },
      };

      expect(forfeitCommand.reason).toBe('forfeit');
      expect(forfeitCommand.winner).toBe('home');
      expect(forfeitCommand.forfeitDetails?.forfeitingTeam).toBe('away');
      expect(forfeitCommand.forfeitDetails?.forfeitReason).toBe('insufficient_players');
      expect(forfeitCommand.forfeitDetails?.playersInvolved).toHaveLength(2);
      expect(forfeitCommand.forfeitDetails?.appealPending).toBe(false);
    });

    it('should represent time limit endings correctly', () => {
      const timeLimitCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'time_limit',
        description: 'Game reaches 2.5 hour time limit',
        endTime: new Date('2024-06-15T21:30:00Z'),
        currentInning: 7,
        currentHalf: 'bottom',
        currentOuts: 1,
        finalScore: { home: 6, away: 6 },
        winner: null,
        officialGame: true,
        initiatedBy: 'plate_umpire',
        ruleReference: 'Rule 9.04 - Time Limits',
        notes: 'Game declared official tie due to time constraint',
      };

      expect(timeLimitCommand.reason).toBe('time_limit');
      expect(timeLimitCommand.winner).toBeNull();
      expect(timeLimitCommand.officialGame).toBe(true);
      expect(timeLimitCommand.finalScore.home).toBe(timeLimitCommand.finalScore.away);
      expect(timeLimitCommand.notes).toContain('official tie');
    });

    it('should represent administrative endings correctly', () => {
      const adminCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'administrative',
        description: 'Game ended by league commissioner decision',
        endTime: new Date(),
        currentInning: 2,
        currentHalf: 'top',
        currentOuts: 2,
        finalScore: { home: 1, away: 0 },
        winner: null,
        officialGame: false,
        initiatedBy: 'league_commissioner',
        notes: 'Protest under review - game outcome pending investigation',
        resumptionPossible: true,
      };

      expect(adminCommand.reason).toBe('administrative');
      expect(adminCommand.initiatedBy).toBe('league_commissioner');
      expect(adminCommand.notes).toContain('Protest under review');
      expect(adminCommand.resumptionPossible).toBe(true);
    });

    it('should represent facility issue endings correctly', () => {
      const facilityCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'facility_issue',
        description: 'Field lighting system failure',
        endTime: new Date('2024-06-15T20:45:00Z'),
        currentInning: 6,
        currentHalf: 'top',
        currentOuts: 0,
        finalScore: { home: 4, away: 5 },
        winner: null,
        officialGame: false,
        initiatedBy: 'facility_manager',
        notes: 'Game suspended - will resume tomorrow at same field time',
        resumptionPossible: true,
        resumptionContact: 'facilities@ballpark.com',
      };

      expect(facilityCommand.reason).toBe('facility_issue');
      expect(facilityCommand.description).toContain('lighting system');
      expect(facilityCommand.resumptionContact).toContain('facilities@');
    });
  });

  describe('GameEndReason type', () => {
    it('should include all valid end reasons', () => {
      const validReasons: GameEndReason[] = [
        'mercy_rule',
        'time_limit',
        'weather',
        'forfeit',
        'administrative',
        'mutual_agreement',
        'facility_issue',
        'injury',
        'darkness',
        'curfew',
      ];

      validReasons.forEach(reason => {
        const command: EndGameCommand = {
          gameId: GameId.generate(),
          reason,
          description: `Game ended due to ${reason}`,
          endTime: new Date(),
          currentInning: 5,
          currentHalf: 'top',
          currentOuts: 1,
          finalScore: { home: 3, away: 2 },
          winner: 'home',
          officialGame: true,
          initiatedBy: 'umpire',
        };

        expect(command.reason).toBe(reason);
      });
    });
  });

  describe('WeatherConditionsDTO interface', () => {
    it('should represent lightning conditions correctly', () => {
      const lightning: WeatherConditionsDTO = {
        condition: 'lightning',
        temperature: 82,
        windSpeed: 12,
        description: 'Lightning detected within 8 miles, safety protocol initiated',
        expectedImprovement: true,
        estimatedClearance: 30,
      };

      expect(lightning.condition).toBe('lightning');
      expect(lightning.temperature).toBe(82);
      expect(lightning.expectedImprovement).toBe(true);
      expect(lightning.estimatedClearance).toBe(30);
    });

    it('should represent severe weather conditions correctly', () => {
      const storm: WeatherConditionsDTO = {
        condition: 'heavy_rain',
        temperature: 65,
        windSpeed: 35,
        description: 'Heavy rainfall with 35+ mph winds making play unsafe',
        expectedImprovement: false,
      };

      expect(storm.condition).toBe('heavy_rain');
      expect(storm.windSpeed).toBe(35);
      expect(storm.expectedImprovement).toBe(false);
      expect(storm.estimatedClearance).toBeUndefined();
    });

    it('should handle extreme heat conditions', () => {
      const heat: WeatherConditionsDTO = {
        condition: 'extreme_heat',
        temperature: 105,
        windSpeed: 5,
        description: 'Temperature exceeds safe play threshold of 100°F',
        expectedImprovement: false,
      };

      expect(heat.condition).toBe('extreme_heat');
      expect(heat.temperature).toBe(105);
      expect(heat.expectedImprovement).toBe(false);
    });
  });

  describe('ForfeitDetailsDTO interface', () => {
    it('should represent player shortage forfeits correctly', () => {
      const playerShortage: ForfeitDetailsDTO = {
        forfeitingTeam: 'away',
        forfeitReason: 'insufficient_players',
        details: 'Team has only 6 players available, minimum 9 required',
        playersInvolved: [],
        appealPending: false,
        official: 'Head Umpire Wilson',
      };

      expect(playerShortage.forfeitingTeam).toBe('away');
      expect(playerShortage.forfeitReason).toBe('insufficient_players');
      expect(playerShortage.details).toContain('minimum 9 required');
      expect(playerShortage.appealPending).toBe(false);
    });

    it('should represent ejection forfeits correctly', () => {
      const ejectionForfeit: ForfeitDetailsDTO = {
        forfeitingTeam: 'home',
        forfeitReason: 'multiple_ejections',
        details: 'Three players ejected for unsportsmanlike conduct',
        playersInvolved: ['#15 John Smith', '#22 Mike Johnson', '#8 Dave Wilson'],
        appealPending: true,
        official: 'Chief Umpire Rodriguez',
      };

      expect(ejectionForfeit.forfeitReason).toBe('multiple_ejections');
      expect(ejectionForfeit.playersInvolved).toHaveLength(3);
      expect(ejectionForfeit.appealPending).toBe(true);
      expect(ejectionForfeit.details).toContain('unsportsmanlike conduct');
    });

    it('should represent safety concern forfeits correctly', () => {
      const safetyForfeit: ForfeitDetailsDTO = {
        forfeitingTeam: 'away',
        forfeitReason: 'safety_concerns',
        details: 'Multiple player injuries create unsafe playing conditions',
        playersInvolved: ['#7 Tom Brown', '#12 Steve Davis'],
        appealPending: false,
        official: 'Tournament Director',
      };

      expect(safetyForfeit.forfeitReason).toBe('safety_concerns');
      expect(safetyForfeit.details).toContain('unsafe playing conditions');
      expect(safetyForfeit.playersInvolved).toHaveLength(2);
    });

    it('should handle forfeits with other reasons', () => {
      const otherForfeit: ForfeitDetailsDTO = {
        forfeitingTeam: 'home',
        forfeitReason: 'other',
        details: 'Team bus broke down, unable to field complete lineup',
        appealPending: false,
      };

      expect(otherForfeit.forfeitReason).toBe('other');
      expect(otherForfeit.details).toContain('bus broke down');
      expect(otherForfeit.official).toBeUndefined();
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle games ending in first inning', () => {
      const firstInningEnd: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'weather',
        description: 'Tornado warning issued',
        endTime: new Date(),
        currentInning: 1,
        currentHalf: 'top',
        currentOuts: 0,
        finalScore: { home: 0, away: 0 },
        winner: null,
        officialGame: false,
        initiatedBy: 'emergency_services',
        resumptionPossible: true,
      };

      expect(firstInningEnd.currentInning).toBe(1);
      expect(firstInningEnd.finalScore.home).toBe(0);
      expect(firstInningEnd.finalScore.away).toBe(0);
      expect(firstInningEnd.officialGame).toBe(false);
    });

    it('should handle perfect game scenarios', () => {
      const perfectGameEnd: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'mercy_rule',
        description: 'Perfect game with 21-run lead',
        endTime: new Date(),
        currentInning: 4,
        currentHalf: 'bottom',
        currentOuts: 0,
        finalScore: { home: 21, away: 0 },
        winner: 'home',
        officialGame: true,
        initiatedBy: 'umpire_crew_chief',
        notes: 'Perfect game achieved - historic milestone',
      };

      expect(perfectGameEnd.finalScore.home).toBe(21);
      expect(perfectGameEnd.finalScore.away).toBe(0);
      expect(perfectGameEnd.notes).toContain('Perfect game');
    });
  });
});
