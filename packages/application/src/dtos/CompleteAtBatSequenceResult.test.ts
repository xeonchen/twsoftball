/**
 * @file CompleteAtBatSequenceResult.test.ts
 * Comprehensive tests for CompleteAtBatSequenceResult DTO interface.
 */

import { PlayerId, GameId, GameStatus, TeamLineupId, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { AtBatResult } from './AtBatResult.js';
import { CompleteAtBatSequenceResult } from './CompleteAtBatSequenceResult.js';
import { InningEndResult } from './InningEndResult.js';
import { SubstitutionResult } from './SubstitutionResult.js';

describe('CompleteAtBatSequenceResult', () => {
  let mockAtBatResult: AtBatResult;
  let mockInningEndResult: InningEndResult;
  let mockSubstitutionResult: SubstitutionResult;

  beforeEach(() => {
    mockAtBatResult = {
      success: true,
      gameState: {
        gameId: GameId.generate(),
        status: GameStatus.IN_PROGRESS,
        score: {
          home: 3,
          away: 2,
          leader: 'HOME',
          difference: 1,
        },
        gameStartTime: new Date('2024-08-30T14:00:00Z'),
        currentInning: 3,
        isTopHalf: false,
        battingTeam: 'HOME',
        outs: 1,
        bases: {
          first: null,
          second: null,
          third: null,
          runnersInScoringPosition: [],
          basesLoaded: false,
        },
        currentBatterSlot: 3,
        homeLineup: {
          teamLineupId: TeamLineupId.generate(),
          gameId: GameId.generate(),
          teamSide: 'HOME',
          teamName: 'Home Eagles',
          strategy: 'DETAILED',
          battingSlots: [],
          fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
          benchPlayers: [],
          substitutionHistory: [],
        },
        awayLineup: {
          teamLineupId: TeamLineupId.generate(),
          gameId: GameId.generate(),
          teamSide: 'AWAY',
          teamName: 'Away Hawks',
          strategy: 'DETAILED',
          battingSlots: [],
          fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
          benchPlayers: [],
          substitutionHistory: [],
        },
        currentBatter: null,
        lastUpdated: new Date('2024-08-30T15:15:00Z'),
      },
      runsScored: 1,
      rbiAwarded: 1,
      inningEnded: false,
      gameEnded: false,
    };

    mockInningEndResult = {
      success: true,
      gameState: mockAtBatResult.gameState,
      transitionType: 'HALF_INNING',
      previousHalf: { inning: 3, isTopHalf: false },
      newHalf: { inning: 4, isTopHalf: true },
      gameEnded: false,
      endingReason: 'THREE_OUTS',
      finalOuts: 3,
      eventsGenerated: ['HalfInningEnded'],
    };

    mockSubstitutionResult = {
      success: true,
      gameState: mockAtBatResult.gameState,
      substitutionDetails: {
        battingSlot: 1,
        outgoingPlayerName: 'John Starter',
        incomingPlayerName: 'Relief Johnson',
        newFieldPosition: FieldPosition.PITCHER,
        inning: 3,
        wasReentry: false,
        timestamp: new Date('2024-08-30T15:16:00Z'),
      },
      positionChanged: true,
      reentryUsed: false,
    };
  });

  describe('Successful Sequence Results', () => {
    it('should handle simple successful at-bat without follow-up actions', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 0,
        executionTimeMs: 125,
      };

      expect(result.success).toBe(true);
      expect(result.atBatResult).toEqual(mockAtBatResult);
      expect(result.inningEndResult).toBeUndefined();
      expect(result.substitutionResults).toHaveLength(0);
      expect(result.scoreUpdateSent).toBe(false);
      expect(result.retryAttemptsUsed).toBe(0);
      expect(result.executionTimeMs).toBe(125);
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should handle successful sequence with inning end', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        inningEndResult: mockInningEndResult,
        substitutionResults: [],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 200,
      };

      expect(result.success).toBe(true);
      expect(result.atBatResult).toEqual(mockAtBatResult);
      expect(result.inningEndResult).toEqual(mockInningEndResult);
      expect(result.substitutionResults).toHaveLength(0);
      expect(result.scoreUpdateSent).toBe(true);
      expect(result.retryAttemptsUsed).toBe(0);
      expect(result.executionTimeMs).toBe(200);
    });

    it('should handle successful sequence with substitutions', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [mockSubstitutionResult],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 250,
      };

      expect(result.success).toBe(true);
      expect(result.atBatResult).toEqual(mockAtBatResult);
      expect(result.inningEndResult).toBeUndefined();
      expect(result.substitutionResults).toHaveLength(1);
      expect(result.substitutionResults[0]).toEqual(mockSubstitutionResult);
      expect(result.scoreUpdateSent).toBe(true);
      expect(result.executionTimeMs).toBe(250);
    });

    it('should handle complete successful sequence with all operations', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        inningEndResult: mockInningEndResult,
        substitutionResults: [mockSubstitutionResult],
        scoreUpdateSent: true,
        retryAttemptsUsed: 1,
        executionTimeMs: 350,
        warnings: ['Notification delivery was delayed by 2 seconds'],
      };

      expect(result.success).toBe(true);
      expect(result.atBatResult).toEqual(mockAtBatResult);
      expect(result.inningEndResult).toEqual(mockInningEndResult);
      expect(result.substitutionResults).toHaveLength(1);
      expect(result.scoreUpdateSent).toBe(true);
      expect(result.retryAttemptsUsed).toBe(1);
      expect(result.executionTimeMs).toBe(350);
      expect(result.warnings).toContain('Notification delivery was delayed by 2 seconds');
    });
  });

  describe('Failed Sequence Results', () => {
    it('should handle failed at-bat with no follow-up actions', () => {
      const failedAtBatResult: AtBatResult = {
        ...mockAtBatResult,
        success: false,
        errors: ['Invalid player state for at-bat'],
      };

      const result: CompleteAtBatSequenceResult = {
        success: false,
        atBatResult: failedAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 3,
        executionTimeMs: 500,
        errors: ['At-bat recording failed after maximum retry attempts'],
      };

      expect(result.success).toBe(false);
      expect(result.atBatResult.success).toBe(false);
      expect(result.atBatResult.errors).toContain('Invalid player state for at-bat');
      expect(result.inningEndResult).toBeUndefined();
      expect(result.substitutionResults).toHaveLength(0);
      expect(result.scoreUpdateSent).toBe(false);
      expect(result.retryAttemptsUsed).toBe(3);
      expect(result.errors).toContain('At-bat recording failed after maximum retry attempts');
    });

    it('should handle successful at-bat with failed follow-up actions', () => {
      const failedSubstitutionResult: SubstitutionResult = {
        ...mockSubstitutionResult,
        success: false,
        errors: ['Player not eligible for substitution'],
      };

      const result: CompleteAtBatSequenceResult = {
        success: true, // Sequence success depends on core at-bat
        atBatResult: mockAtBatResult,
        substitutionResults: [failedSubstitutionResult],
        scoreUpdateSent: false,
        retryAttemptsUsed: 2,
        executionTimeMs: 400,
        warnings: ['Substitution failed but at-bat was successful'],
      };

      expect(result.success).toBe(true);
      expect(result.atBatResult.success).toBe(true);
      expect(result.substitutionResults).toHaveLength(1);
      expect(result.substitutionResults[0]!.success).toBe(false);
      expect(result.scoreUpdateSent).toBe(false);
      expect(result.retryAttemptsUsed).toBe(2);
      expect(result.warnings).toContain('Substitution failed but at-bat was successful');
    });
  });

  describe('Multiple Substitutions', () => {
    it('should handle multiple successful substitutions', () => {
      const substitution2: SubstitutionResult = {
        success: true,
        gameState: mockAtBatResult.gameState,
        substitutionDetails: {
          battingSlot: 2,
          outgoingPlayerName: 'Another Starter',
          incomingPlayerName: 'Second Relief',
          newFieldPosition: FieldPosition.FIRST_BASE,
          inning: 3,
          wasReentry: false,
          timestamp: new Date('2024-08-30T15:17:00Z'),
        },
        positionChanged: false,
        reentryUsed: false,
      };

      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [mockSubstitutionResult, substitution2],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 300,
      };

      expect(result.substitutionResults).toHaveLength(2);
      expect(result.substitutionResults[0]).toEqual(mockSubstitutionResult);
      expect(result.substitutionResults[1]).toEqual(substitution2);
      expect(result.substitutionResults.every(s => s.success)).toBe(true);
    });

    it('should handle mixed success/failure in substitutions', () => {
      const failedSubstitution: SubstitutionResult = {
        success: false,
        gameState: mockAtBatResult.gameState,
        positionChanged: false,
        reentryUsed: false,
        errors: ['Bench player not available'],
      };

      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [mockSubstitutionResult, failedSubstitution],
        scoreUpdateSent: true,
        retryAttemptsUsed: 1,
        executionTimeMs: 280,
        warnings: ['One substitution failed but core operations succeeded'],
      };

      expect(result.substitutionResults).toHaveLength(2);
      expect(result.substitutionResults[0]!.success).toBe(true);
      expect(result.substitutionResults[1]!.success).toBe(false);
      expect(result.substitutionResults[1]!.errors).toContain('Bench player not available');
    });
  });

  describe('Performance and Retry Metrics', () => {
    it('should track retry attempts accurately', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 5,
        executionTimeMs: 1200,
        warnings: ['Multiple retry attempts were required'],
      };

      expect(result.retryAttemptsUsed).toBe(5);
      expect(result.executionTimeMs).toBe(1200);
      expect(result.warnings).toContain('Multiple retry attempts were required');
    });

    it('should handle zero retry attempts for fast operations', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 50,
      };

      expect(result.retryAttemptsUsed).toBe(0);
      expect(result.executionTimeMs).toBe(50);
    });

    it('should handle high execution times', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        inningEndResult: mockInningEndResult,
        substitutionResults: [mockSubstitutionResult],
        scoreUpdateSent: true,
        retryAttemptsUsed: 3,
        executionTimeMs: 5000,
        warnings: ['Sequence execution exceeded performance threshold'],
      };

      expect(result.executionTimeMs).toBe(5000);
      expect(result.warnings).toContain('Sequence execution exceeded performance threshold');
    });
  });

  describe('Score Notification Scenarios', () => {
    it('should handle successful score notification', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 150,
      };

      expect(result.scoreUpdateSent).toBe(true);
    });

    it('should handle failed score notification', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 2,
        executionTimeMs: 300,
        warnings: ['Score notification failed but sequence completed successfully'],
      };

      expect(result.scoreUpdateSent).toBe(false);
      expect(result.warnings).toContain(
        'Score notification failed but sequence completed successfully'
      );
    });

    it('should handle disabled notifications', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 0,
        executionTimeMs: 120,
      };

      expect(result.scoreUpdateSent).toBe(false);
    });
  });

  describe('Error and Warning Handling', () => {
    it('should handle multiple errors', () => {
      const result: CompleteAtBatSequenceResult = {
        success: false,
        atBatResult: { ...mockAtBatResult, success: false },
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 3,
        executionTimeMs: 800,
        errors: [
          'Database connection timeout',
          'Event store write failure',
          'Transaction rollback failed',
        ],
      };

      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Database connection timeout');
      expect(result.errors).toContain('Event store write failure');
      expect(result.errors).toContain('Transaction rollback failed');
    });

    it('should handle multiple warnings', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [mockSubstitutionResult],
        scoreUpdateSent: true,
        retryAttemptsUsed: 2,
        executionTimeMs: 450,
        warnings: [
          'Notification service response was slow',
          'Substitution processing took longer than expected',
          'Performance threshold exceeded for sequence execution',
        ],
      };

      expect(result.warnings).toHaveLength(3);
      expect(result.warnings).toContain('Notification service response was slow');
      expect(result.warnings).toContain('Substitution processing took longer than expected');
      expect(result.warnings).toContain('Performance threshold exceeded for sequence execution');
    });

    it('should handle empty error and warning arrays', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 100,
        errors: [],
        warnings: [],
      };

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle minimal execution time', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 0,
        executionTimeMs: 1,
      };

      expect(result.executionTimeMs).toBe(1);
    });

    it('should handle maximum retry attempts', () => {
      const result: CompleteAtBatSequenceResult = {
        success: false,
        atBatResult: { ...mockAtBatResult, success: false },
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 10,
        executionTimeMs: 3000,
        errors: ['Maximum retry attempts exceeded'],
      };

      expect(result.retryAttemptsUsed).toBe(10);
      expect(result.errors).toContain('Maximum retry attempts exceeded');
    });

    it('should handle sequence with undefined optional fields', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 0,
        executionTimeMs: 150,
        // inningEndResult intentionally undefined
        // errors intentionally undefined
        // warnings intentionally undefined
      };

      expect(result.inningEndResult).toBeUndefined();
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('Data Type Validation', () => {
    it('should maintain proper boolean types', () => {
      const result: CompleteAtBatSequenceResult = {
        success: false,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 200,
      };

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.scoreUpdateSent).toBe('boolean');
    });

    it('should maintain proper number types', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [],
        scoreUpdateSent: false,
        retryAttemptsUsed: 5,
        executionTimeMs: 1500,
      };

      expect(typeof result.retryAttemptsUsed).toBe('number');
      expect(typeof result.executionTimeMs).toBe('number');
      expect(Number.isInteger(result.retryAttemptsUsed)).toBe(true);
      expect(Number.isInteger(result.executionTimeMs)).toBe(true);
    });

    it('should maintain proper array types', () => {
      const result: CompleteAtBatSequenceResult = {
        success: true,
        atBatResult: mockAtBatResult,
        substitutionResults: [mockSubstitutionResult],
        scoreUpdateSent: true,
        retryAttemptsUsed: 0,
        executionTimeMs: 200,
        errors: ['Some error'],
        warnings: ['Some warning'],
      };

      expect(Array.isArray(result.substitutionResults)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
