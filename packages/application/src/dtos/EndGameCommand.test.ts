/**
 * @file EndGameCommand.test.ts
 * Comprehensive tests for EndGameCommand and related interfaces.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { createEndGameCommand } from '../test-factories/command-factories';

import {
  EndGameCommand,
  GameEndReason,
  WeatherConditionsDTO,
  ForfeitDetailsDTO,
  EndGameCommandValidator,
  EndGameCommandValidationError,
  EndGameCommandFactory,
} from './EndGameCommand';

describe('EndGameCommand', () => {
  describe('EndGameCommand interface', () => {
    it('should represent mercy rule game ending correctly', () => {
      const mercyRuleCommand = createEndGameCommand.mercyRule();

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
      const weatherCommand = createEndGameCommand.weather({
        finalScore: { home: 2, away: 4 },
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
      });

      expect(weatherCommand.reason).toBe('weather');
      expect(weatherCommand.winner).toBeNull();
      expect(weatherCommand.officialGame).toBe(false);
      expect(weatherCommand.resumptionPossible).toBe(true);
      expect(weatherCommand.weatherConditions?.condition).toBe('lightning');
      expect(weatherCommand.weatherConditions?.estimatedClearance).toBe(45);
      expect(weatherCommand.resumptionContact).toContain('@example.com');
    });

    it('should represent forfeit scenarios correctly', () => {
      const forfeitCommand = createEndGameCommand.forfeit({
        finalScore: { home: 5, away: 3 },
        forfeitDetails: {
          forfeitingTeam: 'away',
          forfeitReason: 'insufficient_players',
          details: 'Away team has only 7 players available after two injuries',
        } as ForfeitDetailsDTO,
      });

      expect(forfeitCommand.reason).toBe('forfeit');
      expect(forfeitCommand.winner).toBe('home');
      expect(forfeitCommand.forfeitDetails?.forfeitingTeam).toBe('away');
      expect(forfeitCommand.forfeitDetails?.details).toContain(
        'Away team has only 7 players available'
      );
      expect(forfeitCommand.forfeitDetails?.forfeitReason).toBe('insufficient_players');
    });

    it('should represent time limit endings correctly', () => {
      const timeLimitCommand = createEndGameCommand.timeLimit({
        finalScore: { home: 6, away: 6 },
        winner: null,
        notes: 'Game declared official tie due to time constraint',
      });

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

  describe('Validation - EndGameCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should require gameId', () => {
        const command = {
          gameId: null as unknown as GameId,
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          EndGameCommandValidationError
        );
        expect(() => EndGameCommandValidator.validate(command)).toThrow('gameId is required');
      });

      it('should require description', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: '',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'description is required and cannot be empty'
        );
      });

      it('should limit description length to 500 characters', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'a'.repeat(501),
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'description cannot exceed 500 characters'
        );
      });

      it('should require valid endTime', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date('invalid'),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'endTime must be a valid Date object'
        );
      });

      it('should require initiatedBy', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: '',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'initiatedBy is required and cannot be empty'
        );
      });

      it('should limit initiatedBy length to 50 characters', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'a'.repeat(51),
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'initiatedBy cannot exceed 50 characters'
        );
      });

      it('should require officialGame to be boolean', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: 'true' as unknown as boolean,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'officialGame must be a boolean'
        );
      });
    });

    describe('Game State Validation', () => {
      it('should require positive integer inning', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 0,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'currentInning must be a positive integer'
        );
      });

      it('should limit inning to maximum of 20', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 21,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'currentInning cannot exceed 20'
        );
      });

      it('should require valid currentHalf', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'middle' as unknown as 'top' | 'bottom',
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'currentHalf must be either "top" or "bottom"'
        );
      });

      it('should validate outs between 0 and 3', () => {
        const invalidOuts = [-1, 4];

        invalidOuts.forEach(outs => {
          const command = {
            gameId: GameId.generate(),
            reason: 'mercy_rule' as GameEndReason,
            description: 'Test',
            endTime: new Date(),
            currentInning: 1,
            currentHalf: 'top' as const,
            currentOuts: outs,
            finalScore: { home: 0, away: 0 },
            winner: null,
            officialGame: false,
            initiatedBy: 'test',
          };

          expect(() => EndGameCommandValidator.validate(command)).toThrow(
            'currentOuts must be an integer between 0 and 3'
          );
        });
      });
    });

    describe('End Reason Validation', () => {
      it('should validate end reason', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'invalid_reason' as unknown as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow('reason must be one of:');
      });

      it('should require forfeitDetails when reason is forfeit', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'forfeit' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'forfeitDetails is required when reason is forfeit'
        );
      });

      it('should require weatherConditions when reason is weather', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'weather' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 0, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'weatherConditions is required when reason is weather'
        );
      });

      it('should warn about mercy rule games not being official', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 1,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 15, away: 0 },
          winner: 'home' as const,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'mercy rule games should typically be official'
        );
      });
    });

    describe('Score Validation', () => {
      it('should require non-negative integer scores', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'administrative' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 5,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: -1, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'finalScore.home must be a non-negative integer'
        );
      });

      it('should limit scores to maximum of 100', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'administrative' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 5,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 101, away: 0 },
          winner: null,
          officialGame: false,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'scores cannot exceed 100 runs'
        );
      });

      it('should validate winner consistency with score for official games', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'mercy_rule' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 5,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 5, away: 10 },
          winner: 'home' as const,
          officialGame: true,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow(
          'winner cannot be "home" if away team has higher score'
        );
      });

      it('should validate winner consistency for tied games', () => {
        const command = {
          gameId: GameId.generate(),
          reason: 'administrative' as GameEndReason,
          description: 'Test',
          endTime: new Date(),
          currentInning: 5,
          currentHalf: 'top' as const,
          currentOuts: 0,
          finalScore: { home: 5, away: 5 },
          winner: 'home' as const,
          officialGame: true,
          initiatedBy: 'test',
        };

        expect(() => EndGameCommandValidator.validate(command)).toThrow('winner cannot be "home"');
      });
    });

    describe('Weather Conditions Validation', () => {
      it('should validate weather condition types', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'invalid_condition' as unknown as WeatherConditionsDTO['condition'],
          description: 'Test weather',
        };

        expect(() => EndGameCommandValidator.validateWeatherConditions(weather)).toThrow(
          'weather.condition must be one of:'
        );
      });

      it('should require weather description', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: '',
        };

        expect(() => EndGameCommandValidator.validateWeatherConditions(weather)).toThrow(
          'weather.description is required and cannot be empty'
        );
      });

      it('should validate temperature range', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: 'Test',
          temperature: 200,
        };

        expect(() => EndGameCommandValidator.validateWeatherConditions(weather)).toThrow(
          'weather.temperature must be between -50 and 150 degrees'
        );
      });

      it('should validate wind speed range', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: 'Test',
          windSpeed: 250,
        };

        expect(() => EndGameCommandValidator.validateWeatherConditions(weather)).toThrow(
          'weather.windSpeed must be between 0 and 200 mph'
        );
      });

      it('should validate estimated clearance range', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: 'Test',
          estimatedClearance: 2000,
        };

        expect(() => EndGameCommandValidator.validateWeatherConditions(weather)).toThrow(
          'weather.estimatedClearance must be between 0 and 1440 minutes'
        );
      });
    });

    describe('Forfeit Details Validation', () => {
      it('should validate forfeiting team', () => {
        const forfeit: ForfeitDetailsDTO = {
          forfeitingTeam: 'middle' as unknown as 'home' | 'away',
          forfeitReason: 'insufficient_players',
          details: 'Test forfeit',
        };

        expect(() => EndGameCommandValidator.validateForfeitDetails(forfeit)).toThrow(
          'forfeit.forfeitingTeam must be "home" or "away"'
        );
      });

      it('should validate forfeit reason', () => {
        const forfeit: ForfeitDetailsDTO = {
          forfeitingTeam: 'home',
          forfeitReason: 'invalid_reason' as unknown as ForfeitDetailsDTO['forfeitReason'],
          details: 'Test forfeit',
        };

        expect(() => EndGameCommandValidator.validateForfeitDetails(forfeit)).toThrow(
          'forfeit.forfeitReason must be one of:'
        );
      });

      it('should require forfeit details', () => {
        const forfeit: ForfeitDetailsDTO = {
          forfeitingTeam: 'home',
          forfeitReason: 'insufficient_players',
          details: '',
        };

        expect(() => EndGameCommandValidator.validateForfeitDetails(forfeit)).toThrow(
          'forfeit.details is required and cannot be empty'
        );
      });

      it('should limit forfeit details length', () => {
        const forfeit: ForfeitDetailsDTO = {
          forfeitingTeam: 'home',
          forfeitReason: 'insufficient_players',
          details: 'a'.repeat(1001),
        };

        expect(() => EndGameCommandValidator.validateForfeitDetails(forfeit)).toThrow(
          'forfeit.details cannot exceed 1000 characters'
        );
      });
    });

    describe('Optional Fields Validation', () => {
      it('should validate rule reference length', () => {
        expect(() => EndGameCommandValidator.validateRuleReference('a'.repeat(101))).toThrow(
          'ruleReference cannot exceed 100 characters'
        );
      });

      it('should not allow whitespace-only rule reference', () => {
        expect(() => EndGameCommandValidator.validateRuleReference('   ')).toThrow(
          'ruleReference cannot be only whitespace'
        );
      });

      it('should validate notes length', () => {
        expect(() => EndGameCommandValidator.validateNotes('a'.repeat(1001))).toThrow(
          'notes cannot exceed 1000 characters'
        );
      });

      it('should not allow whitespace-only notes', () => {
        expect(() => EndGameCommandValidator.validateNotes('   ')).toThrow(
          'notes cannot be only whitespace'
        );
      });

      it('should allow empty string notes', () => {
        expect(() => EndGameCommandValidator.validateNotes('')).not.toThrow();
      });
    });
  });

  describe('Factory Functions - EndGameCommandFactory', () => {
    describe('createMercyRule', () => {
      it('should create valid mercy rule command', () => {
        const gameId = GameId.generate();
        const command = EndGameCommandFactory.createMercyRule(
          gameId,
          5,
          'bottom',
          1,
          { home: 18, away: 3 },
          'umpire'
        );

        expect(command.reason).toBe('mercy_rule');
        expect(command.gameId).toBe(gameId);
        expect(command.winner).toBe('home');
        expect(command.officialGame).toBe(true);
        expect(command.description).toContain('15 run difference');
      });

      it('should include rule reference when provided', () => {
        const command = EndGameCommandFactory.createMercyRule(
          GameId.generate(),
          5,
          'bottom',
          1,
          { home: 18, away: 3 },
          'umpire',
          'Rule 4.10(c)'
        );

        expect(command.ruleReference).toBe('Rule 4.10(c)');
      });
    });

    describe('createWeatherEnding', () => {
      it('should create valid weather ending command', () => {
        const gameId = GameId.generate();
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: 'Lightning detected',
        };

        const command = EndGameCommandFactory.createWeatherEnding(
          gameId,
          3,
          'top',
          2,
          { home: 2, away: 4 },
          weather,
          'umpire'
        );

        expect(command.reason).toBe('weather');
        expect(command.weatherConditions).toBe(weather);
        expect(command.winner).toBeNull();
        expect(command.officialGame).toBe(false);
        expect(command.resumptionPossible).toBe(true);
      });

      it('should handle official weather games', () => {
        const weather: WeatherConditionsDTO = {
          condition: 'lightning',
          description: 'Lightning detected',
        };

        const command = EndGameCommandFactory.createWeatherEnding(
          GameId.generate(),
          6,
          'top',
          2,
          { home: 5, away: 3 },
          weather,
          'umpire',
          true,
          false
        );

        expect(command.officialGame).toBe(true);
        expect(command.winner).toBe('home');
        expect(command.resumptionPossible).toBe(false);
      });
    });

    describe('createForfeit', () => {
      it('should create valid forfeit command', () => {
        const gameId = GameId.generate();
        const forfeitDetails: ForfeitDetailsDTO = {
          forfeitingTeam: 'away',
          forfeitReason: 'insufficient_players',
          details: 'Only 7 players available',
        };

        const command = EndGameCommandFactory.createForfeit(
          gameId,
          4,
          'bottom',
          0,
          { home: 5, away: 3 },
          forfeitDetails,
          'umpire'
        );

        expect(command.reason).toBe('forfeit');
        expect(command.winner).toBe('home');
        expect(command.officialGame).toBe(true);
        expect(command.forfeitDetails).toBe(forfeitDetails);
      });

      it('should include rule reference when provided', () => {
        const forfeitDetails: ForfeitDetailsDTO = {
          forfeitingTeam: 'home',
          forfeitReason: 'insufficient_players',
          details: 'Test',
        };

        const command = EndGameCommandFactory.createForfeit(
          GameId.generate(),
          4,
          'bottom',
          0,
          { home: 3, away: 5 }, // Away team winning so forfeit makes sense
          forfeitDetails,
          'umpire',
          'Rule 4.17'
        );

        expect(command.ruleReference).toBe('Rule 4.17');
        expect(command.winner).toBe('away');
      });
    });

    describe('createTimeLimit', () => {
      it('should create valid time limit command', () => {
        const gameId = GameId.generate();
        const command = EndGameCommandFactory.createTimeLimit(
          gameId,
          7,
          'bottom',
          1,
          { home: 6, away: 6 },
          'umpire',
          120
        );

        expect(command.reason).toBe('time_limit');
        expect(command.winner).toBeNull();
        expect(command.officialGame).toBe(true);
        expect(command.description).toContain('120-minute time limit');
        expect(command.ruleReference).toBe('Time Limit Rule');
      });

      it('should determine winner when scores differ', () => {
        const command = EndGameCommandFactory.createTimeLimit(
          GameId.generate(),
          7,
          'bottom',
          1,
          { home: 8, away: 6 },
          'umpire',
          120
        );

        expect(command.winner).toBe('home');
      });

      it('should mark games before 5 innings as unofficial', () => {
        const command = EndGameCommandFactory.createTimeLimit(
          GameId.generate(),
          4,
          'bottom',
          1,
          { home: 8, away: 6 },
          'umpire',
          120
        );

        expect(command.officialGame).toBe(false);
      });
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

    it('should pass validation for valid commands', () => {
      const validCommand: EndGameCommand = {
        gameId: GameId.generate(),
        reason: 'mercy_rule',
        description: 'Valid mercy rule ending',
        endTime: new Date(),
        currentInning: 5,
        currentHalf: 'bottom',
        currentOuts: 1,
        finalScore: { home: 15, away: 0 },
        winner: 'home',
        officialGame: true,
        initiatedBy: 'umpire',
      };

      expect(() => EndGameCommandValidator.validate(validCommand)).not.toThrow();
    });
  });
});
