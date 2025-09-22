/**
 * @file GameHistoryDTO.test.ts
 * Comprehensive tests for GameHistoryDTO and related interfaces.
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition, AtBatResultType } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import type {
  GameHistoryDTO,
  GameEventDTO,
  AtBatEventDetailsDTO,
  InningEventDetailsDTO,
  // SubstitutionEventDetailsDTO,
  // AdministrativeEventDetailsDTO,
  ScoringPlayDTO,
  SubstitutionEventDTO,
  InningHistoryDTO,
  AdministrativeActionDTO,
  GameOutcomeDTO,
} from './GameHistoryDTO.js';

describe('GameHistoryDTO', () => {
  describe('GameHistoryDTO interface', () => {
    it('should represent complete game history correctly', () => {
      const gameHistory: GameHistoryDTO = {
        gameId: GameId.generate(),
        gameStartTime: new Date('2024-06-15T19:00:00Z'),
        gameEndTime: new Date('2024-06-15T21:30:00Z'),
        events: [],
        scoringPlays: [],
        substitutions: [],
        inningBreakdown: [],
        administrativeActions: [],
        gameOutcome: {
          finalScore: { home: 8, away: 5 },
          winner: 'home',
          endReason: 'regulation',
          totalInnings: 7,
          durationMinutes: 150,
          keyStats: {
            totalRuns: 13,
            totalHits: 21,
            totalErrors: 3,
            largestLead: 5,
            leadChanges: 3,
          },
          mvp: {
            playerId: PlayerId.generate(),
            name: 'John Smith',
            achievement: '3-for-4 with 2 RBIs and game-winning hit',
          },
        },
        generatedAt: new Date(),
      };

      expect(gameHistory.gameId).toBeInstanceOf(GameId);
      expect(gameHistory.gameStartTime).toBeInstanceOf(Date);
      expect(gameHistory.gameEndTime).toBeInstanceOf(Date);
      expect(gameHistory.gameOutcome.winner).toBe('home');
      expect(gameHistory.gameOutcome.finalScore.home).toBe(8);
      expect(gameHistory.gameOutcome.finalScore.away).toBe(5);
      expect(gameHistory.gameOutcome.mvp?.name).toBe('John Smith');
    });

    it('should handle in-progress games', () => {
      const inProgressHistory: GameHistoryDTO = {
        gameId: GameId.generate(),
        gameStartTime: new Date('2024-06-15T19:00:00Z'),
        gameEndTime: null,
        events: [],
        scoringPlays: [],
        substitutions: [],
        inningBreakdown: [],
        administrativeActions: [],
        gameOutcome: {
          finalScore: { home: 4, away: 3 },
          winner: 'home', // Leading team
          endReason: 'regulation', // TBD
          totalInnings: 6, // Current inning
          durationMinutes: 90, // Current duration
          keyStats: {
            totalRuns: 7,
            totalHits: 12,
            totalErrors: 1,
            largestLead: 2,
            leadChanges: 3,
          },
        },
        generatedAt: new Date(),
      };

      expect(inProgressHistory.gameEndTime).toBeNull();
      expect(inProgressHistory.gameOutcome.totalInnings).toBe(6);
    });
  });

  describe('GameEventDTO interface', () => {
    it('should represent at-bat events correctly', () => {
      const atBatEvent: GameEventDTO = {
        eventId: 'event-123',
        timestamp: new Date('2024-06-15T19:15:00Z'),
        eventType: 'at_bat_completed',
        inning: 2,
        half: 'top',
        sequenceInInning: 3,
        description: 'John Smith doubles to left field, scoring 2 runs',
        scoreAfterEvent: { home: 0, away: 2 },
        details: {
          batter: {
            playerId: PlayerId.generate(),
            name: 'John Smith',
            jerseyNumber: JerseyNumber.fromNumber(15),
            battingPosition: 3,
          },
          result: AtBatResultType.DOUBLE,
          location: 'left field',
          outcome: {
            runs: 2,
            rbi: 2,
            batterAdvancedTo: 'SECOND',
          },
          runnerMovements: [
            {
              runnerId: PlayerId.generate(),
              fromBase: 'FIRST',
              toBase: 'HOME',
              scored: true,
            },
            {
              runnerId: PlayerId.generate(),
              fromBase: 'SECOND',
              toBase: 'HOME',
              scored: true,
            },
          ],
          outsRecorded: 0,
          outsAfter: 1,
        } as AtBatEventDetailsDTO,
      };

      expect(atBatEvent.eventType).toBe('at_bat_completed');
      expect(atBatEvent.inning).toBe(2);
      expect(atBatEvent.half).toBe('top');
      expect(atBatEvent.scoreAfterEvent.away).toBe(2);

      const details = atBatEvent.details as AtBatEventDetailsDTO;
      expect(details.batter.name).toBe('John Smith');
      expect(details.result).toBe(AtBatResultType.DOUBLE);
      expect(details.outcome.rbi).toBe(2);
      expect(details.runnerMovements).toHaveLength(2);
      expect(details.runnerMovements.every(rm => rm.scored)).toBe(true);
    });

    it('should represent inning end events correctly', () => {
      const inningEndEvent: GameEventDTO = {
        eventId: 'event-456',
        timestamp: new Date('2024-06-15T19:45:00Z'),
        eventType: 'inning_ended',
        inning: 3,
        half: 'bottom',
        sequenceInInning: 8,
        description: 'End of 3rd inning',
        scoreAfterEvent: { home: 4, away: 2 },
        details: {
          reason: 'three_outs',
          endedInning: 3,
          endedHalf: 'bottom',
          nextInning: 4,
          nextHalf: 'top',
          runsInInning: 2,
          runnersLeftOnBase: 1,
        } as InningEventDetailsDTO,
      };

      expect(inningEndEvent.eventType).toBe('inning_ended');
      const details = inningEndEvent.details as InningEventDetailsDTO;
      expect(details.reason).toBe('three_outs');
      expect(details.runsInInning).toBe(2);
      expect(details.runnersLeftOnBase).toBe(1);
    });
  });

  describe('ScoringPlayDTO interface', () => {
    it('should represent scoring plays correctly', () => {
      const scoringPlay: ScoringPlayDTO = {
        inning: 5,
        half: 'bottom',
        description: 'Mike Johnson home run scores 3',
        runsScored: 3,
        runnersScored: [
          { playerId: PlayerId.generate(), name: 'Runner 1' },
          { playerId: PlayerId.generate(), name: 'Runner 2' },
          { playerId: PlayerId.generate(), name: 'Mike Johnson' },
        ],
        rbiPlayer: {
          playerId: PlayerId.generate(),
          name: 'Mike Johnson',
        },
        timestamp: new Date('2024-06-15T20:15:00Z'),
      };

      expect(scoringPlay.runsScored).toBe(3);
      expect(scoringPlay.runnersScored).toHaveLength(3);
      expect(scoringPlay.rbiPlayer?.name).toBe('Mike Johnson');
      expect(scoringPlay.description).toContain('home run');
    });

    it('should handle scoring without RBI player', () => {
      const wildPitchScoring: ScoringPlayDTO = {
        inning: 7,
        half: 'top',
        description: 'Runner scores on wild pitch',
        runsScored: 1,
        runnersScored: [{ playerId: PlayerId.generate(), name: 'Fast Runner' }],
        timestamp: new Date(),
      };

      expect(wildPitchScoring.runsScored).toBe(1);
      expect(wildPitchScoring.runnersScored).toHaveLength(1);
      expect(wildPitchScoring.rbiPlayer).toBeUndefined();
    });
  });

  describe('SubstitutionEventDTO interface', () => {
    it('should represent substitutions correctly', () => {
      const substitution: SubstitutionEventDTO = {
        inning: 6,
        playerOut: {
          playerId: PlayerId.generate(),
          name: 'Tom Wilson',
        },
        playerIn: {
          playerId: PlayerId.generate(),
          name: 'Dave Brown',
        },
        position: FieldPosition.SHORTSTOP,
        reason: 'injury substitution',
        timestamp: new Date('2024-06-15T20:30:00Z'),
      };

      expect(substitution.inning).toBe(6);
      expect(substitution.playerOut.name).toBe('Tom Wilson');
      expect(substitution.playerIn.name).toBe('Dave Brown');
      expect(substitution.position).toBe(FieldPosition.SHORTSTOP);
      expect(substitution.reason).toContain('injury');
    });
  });

  describe('InningHistoryDTO interface', () => {
    it('should represent inning history correctly', () => {
      const inningHistory: InningHistoryDTO = {
        inning: 5,
        top: {
          runsScored: 2,
          hits: 3,
          keyEvents: ['double', 'RBI single'],
          duration: 18,
        },
        bottom: {
          runsScored: 1,
          hits: 2,
          keyEvents: ['solo home run'],
          duration: 15,
        },
        highlights: ['Back-to-back scoring innings', 'Lead change'],
      };

      expect(inningHistory.inning).toBe(5);
      expect(inningHistory.top.runsScored).toBe(2);
      expect(inningHistory.bottom?.runsScored).toBe(1);
      expect(inningHistory.highlights).toContain('Lead change');
    });

    it('should handle innings without bottom half', () => {
      const finalInning: InningHistoryDTO = {
        inning: 7,
        top: {
          runsScored: 0,
          hits: 1,
          keyEvents: ['three and out'],
          duration: 12,
        },
        bottom: null, // Home team doesn't bat in bottom 7th when winning
        highlights: ['Game ends early - home team wins'],
      };

      expect(finalInning.bottom).toBeNull();
      expect(finalInning.highlights).toContain('Game ends early - home team wins');
    });
  });

  describe('AdministrativeActionDTO interface', () => {
    it('should represent administrative actions correctly', () => {
      const adminAction: AdministrativeActionDTO = {
        timestamp: new Date('2024-06-15T20:45:00Z'),
        actionType: 'undo',
        description: 'Undo last at-bat due to scoring error',
        performer: 'Official Scorekeeper',
        result: 'At-bat successfully reversed, score corrected',
      };

      expect(adminAction.actionType).toBe('undo');
      expect(adminAction.description).toContain('scoring error');
      expect(adminAction.performer).toBe('Official Scorekeeper');
      expect(adminAction.result).toContain('successfully reversed');
    });
  });

  describe('GameOutcomeDTO interface', () => {
    it('should represent regulation game outcomes correctly', () => {
      const outcome: GameOutcomeDTO = {
        finalScore: { home: 7, away: 4 },
        winner: 'home',
        endReason: 'regulation',
        totalInnings: 7,
        durationMinutes: 135,
        keyStats: {
          totalRuns: 11,
          totalHits: 18,
          totalErrors: 2,
          largestLead: 4,
          leadChanges: 2,
        },
        mvp: {
          playerId: PlayerId.generate(),
          name: 'Star Player',
          achievement: 'Game-winning RBI in the 7th',
        },
      };

      expect(outcome.winner).toBe('home');
      expect(outcome.endReason).toBe('regulation');
      expect(outcome.totalInnings).toBe(7);
      expect(outcome.keyStats.totalRuns).toBe(11);
      expect(outcome.mvp?.achievement).toContain('Game-winning RBI');
    });

    it('should handle extra inning games', () => {
      const extraInningOutcome: GameOutcomeDTO = {
        finalScore: { home: 5, away: 4 },
        winner: 'home',
        endReason: 'extra_innings',
        totalInnings: 9,
        durationMinutes: 165,
        keyStats: {
          totalRuns: 9,
          totalHits: 16,
          totalErrors: 1,
          largestLead: 2,
          leadChanges: 4,
        },
      };

      expect(extraInningOutcome.endReason).toBe('extra_innings');
      expect(extraInningOutcome.totalInnings).toBe(9);
      expect(extraInningOutcome.keyStats.leadChanges).toBe(4);
      expect(extraInningOutcome.mvp).toBeUndefined();
    });

    it('should handle mercy rule endings', () => {
      const mercyRuleOutcome: GameOutcomeDTO = {
        finalScore: { home: 15, away: 0 },
        winner: 'home',
        endReason: 'mercy_rule',
        totalInnings: 5,
        durationMinutes: 90,
        keyStats: {
          totalRuns: 15,
          totalHits: 20,
          totalErrors: 0,
          largestLead: 15,
          leadChanges: 0,
        },
      };

      expect(mercyRuleOutcome.endReason).toBe('mercy_rule');
      expect(mercyRuleOutcome.totalInnings).toBe(5);
      expect(mercyRuleOutcome.keyStats.largestLead).toBe(15);
      expect(mercyRuleOutcome.keyStats.leadChanges).toBe(0);
    });

    it('should handle tie games', () => {
      const tieOutcome: GameOutcomeDTO = {
        finalScore: { home: 6, away: 6 },
        winner: 'tie',
        endReason: 'time_limit',
        totalInnings: 7,
        durationMinutes: 120,
        keyStats: {
          totalRuns: 12,
          totalHits: 14,
          totalErrors: 3,
          largestLead: 3,
          leadChanges: 5,
        },
      };

      expect(tieOutcome.winner).toBe('tie');
      expect(tieOutcome.endReason).toBe('time_limit');
      expect(tieOutcome.finalScore.home).toBe(tieOutcome.finalScore.away);
      expect(tieOutcome.keyStats.leadChanges).toBe(5);
    });
  });
});
