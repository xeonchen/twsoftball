/**
 * @file CompleteGameWorkflowResult.test.ts
 * Comprehensive tests for CompleteGameWorkflowResult and WorkflowPerformanceMetrics DTOs.
 */

import { GameId, GameStatus, TeamLineupId, FieldPosition, PlayerId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  CompleteGameWorkflowResult,
  WorkflowPerformanceMetrics,
} from './CompleteGameWorkflowResult';
import { GameStartResult } from './GameStartResult';
import { GameStateDTO } from './GameStateDTO';

describe('CompleteGameWorkflowResult', () => {
  let mockGameId: GameId;
  let mockGameStartResult: GameStartResult;
  let mockFinalGameState: GameStateDTO;
  let mockPerformanceMetrics: WorkflowPerformanceMetrics;

  beforeEach(() => {
    mockGameId = GameId.generate(); // Keep domain GameId.generate() for actual domain objects

    mockGameStartResult = {
      success: true,
      gameId: mockGameId,
      initialState: {
        gameId: mockGameId,
        status: GameStatus.IN_PROGRESS,
        score: {
          home: 0,
          away: 0,
          leader: 'TIE',
          difference: 0,
        },
        gameStartTime: new Date('2024-08-30T14:00:00Z'),
        currentInning: 1,
        isTopHalf: true,
        battingTeam: 'AWAY',
        outs: 0,
        bases: {
          first: null,
          second: null,
          third: null,
          runnersInScoringPosition: [],
          basesLoaded: false,
        },
        currentBatterSlot: 1,
        homeLineup: {
          teamLineupId: TeamLineupId.generate(),
          gameId: mockGameId,
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
          gameId: mockGameId,
          teamSide: 'AWAY',
          teamName: 'Away Hawks',
          strategy: 'DETAILED',
          battingSlots: [],
          fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
          benchPlayers: [],
          substitutionHistory: [],
        },
        currentBatter: null,
        lastUpdated: new Date('2024-08-30T14:00:00Z'),
      },
    };

    mockFinalGameState = {
      gameId: mockGameId,
      status: GameStatus.COMPLETED,
      score: {
        home: 8,
        away: 5,
        leader: 'HOME',
        difference: 3,
      },
      gameStartTime: new Date('2024-08-30T14:00:00Z'),
      currentInning: 7,
      isTopHalf: false,
      battingTeam: 'HOME',
      outs: 3,
      bases: {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      },
      currentBatterSlot: 5,
      homeLineup: {
        teamLineupId: TeamLineupId.generate(),
        gameId: mockGameId,
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
        gameId: mockGameId,
        teamSide: 'AWAY',
        teamName: 'Away Hawks',
        strategy: 'DETAILED',
        battingSlots: [],
        fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
        benchPlayers: [],
        substitutionHistory: [],
      },
      currentBatter: null,
      lastUpdated: new Date('2024-08-30T16:00:00Z'),
    };

    mockPerformanceMetrics = {
      initializationTimeMs: 150,
      averageAtBatTimeMs: 325,
      averageSubstitutionTimeMs: 180,
      inningManagementTimeMs: 450,
      notificationTimeMs: 200,
      errorHandlingTimeMs: 75,
    };
  });

  describe('Successful Workflow Results', () => {
    it('should handle complete successful workflow', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 42,
        successfulAtBats: 42,
        totalRuns: 13,
        totalSubstitutions: 5,
        successfulSubstitutions: 5,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 7200000, // 2 hours in milliseconds
        totalRetryAttempts: 2,
        compensationApplied: false,
        performanceMetrics: mockPerformanceMetrics,
      };

      expect(result.success).toBe(true);
      expect(result.gameId).toEqual(mockGameId);
      expect(result.gameStartResult).toEqual(mockGameStartResult);
      expect(result.finalGameState).toEqual(mockFinalGameState);
      expect(result.totalAtBats).toBe(42);
      expect(result.successfulAtBats).toBe(42);
      expect(result.totalRuns).toBe(13);
      expect(result.totalSubstitutions).toBe(5);
      expect(result.successfulSubstitutions).toBe(5);
      expect(result.completedInnings).toBe(7);
      expect(result.gameCompleted).toBe(true);
      expect(result.executionTimeMs).toBe(7200000);
      expect(result.totalRetryAttempts).toBe(2);
      expect(result.compensationApplied).toBe(false);
      expect(result.performanceMetrics).toEqual(mockPerformanceMetrics);
    });

    it('should handle successful workflow without final game state', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 15,
        successfulAtBats: 15,
        totalRuns: 7,
        totalSubstitutions: 2,
        successfulSubstitutions: 2,
        completedInnings: 3,
        gameCompleted: false, // Early termination
        executionTimeMs: 3600000, // 1 hour
        totalRetryAttempts: 0,
        compensationApplied: false,
      };

      expect(result.success).toBe(true);
      expect(result.finalGameState).toBeUndefined();
      expect(result.gameCompleted).toBe(false);
      expect(result.completedInnings).toBe(3);
      expect(result.totalRetryAttempts).toBe(0);
    });

    it('should handle successful workflow with no substitutions', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 30,
        successfulAtBats: 30,
        totalRuns: 8,
        totalSubstitutions: 0,
        successfulSubstitutions: 0,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 5400000, // 1.5 hours
        totalRetryAttempts: 1,
        compensationApplied: false,
      };

      expect(result.totalSubstitutions).toBe(0);
      expect(result.successfulSubstitutions).toBe(0);
      expect(result.gameCompleted).toBe(true);
    });
  });

  describe('Failed Workflow Results', () => {
    it('should handle workflow failure during game start', () => {
      const failedGameStartResult: GameStartResult = {
        ...mockGameStartResult,
        success: false,
        errors: ['Failed to initialize team lineups'],
      };

      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        gameStartResult: failedGameStartResult,
        totalAtBats: 0,
        successfulAtBats: 0,
        totalRuns: 0,
        totalSubstitutions: 0,
        successfulSubstitutions: 0,
        completedInnings: 0,
        gameCompleted: false,
        executionTimeMs: 500,
        totalRetryAttempts: 3,
        compensationApplied: true,
        errors: ['Game initialization failed', 'Unable to proceed with workflow'],
      };

      expect(result.success).toBe(false);
      expect(result.gameStartResult?.success).toBe(false);
      expect(result.totalAtBats).toBe(0);
      expect(result.completedInnings).toBe(0);
      expect(result.compensationApplied).toBe(true);
      expect(result.errors).toContain('Game initialization failed');
    });

    it('should handle partial workflow completion with failures', () => {
      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 25,
        successfulAtBats: 18,
        totalRuns: 6,
        totalSubstitutions: 3,
        successfulSubstitutions: 1,
        completedInnings: 4,
        gameCompleted: false,
        executionTimeMs: 4200000,
        totalRetryAttempts: 8,
        compensationApplied: true,
        errors: [
          'Multiple at-bat failures detected',
          'Substitution system became unavailable',
          'Game terminated due to excessive errors',
        ],
        warnings: [
          'Performance degraded during execution',
          'High retry rate indicates system issues',
        ],
      };

      expect(result.success).toBe(false);
      expect(result.successfulAtBats).toBeLessThan(result.totalAtBats);
      expect(result.successfulSubstitutions).toBeLessThan(result.totalSubstitutions);
      expect(result.totalRetryAttempts).toBe(8);
      expect(result.compensationApplied).toBe(true);
      expect(result.errors).toHaveLength(3);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('Statistics Validation', () => {
    it('should maintain consistency in at-bat statistics', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 50,
        successfulAtBats: 47,
        totalRuns: 12,
        totalSubstitutions: 4,
        successfulSubstitutions: 4,
        completedInnings: 9,
        gameCompleted: true,
        executionTimeMs: 8100000,
        totalRetryAttempts: 5,
        compensationApplied: false,
      };

      expect(result.successfulAtBats).toBeLessThanOrEqual(result.totalAtBats);
      expect(result.totalAtBats).toBeGreaterThan(0);
      expect(result.successfulAtBats).toBeGreaterThanOrEqual(0);
    });

    it('should maintain consistency in substitution statistics', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 35,
        successfulAtBats: 35,
        totalRuns: 9,
        totalSubstitutions: 6,
        successfulSubstitutions: 4,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 6300000,
        totalRetryAttempts: 3,
        compensationApplied: false,
      };

      expect(result.successfulSubstitutions).toBeLessThanOrEqual(result.totalSubstitutions);
      expect(result.totalSubstitutions).toBeGreaterThanOrEqual(0);
      expect(result.successfulSubstitutions).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero statistics correctly', () => {
      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        totalAtBats: 0,
        successfulAtBats: 0,
        totalRuns: 0,
        totalSubstitutions: 0,
        successfulSubstitutions: 0,
        completedInnings: 0,
        gameCompleted: false,
        executionTimeMs: 250,
        totalRetryAttempts: 0,
        compensationApplied: false,
      };

      expect(result.totalAtBats).toBe(0);
      expect(result.successfulAtBats).toBe(0);
      expect(result.totalRuns).toBe(0);
      expect(result.totalSubstitutions).toBe(0);
      expect(result.successfulSubstitutions).toBe(0);
      expect(result.completedInnings).toBe(0);
    });
  });

  describe('Game Completion Scenarios', () => {
    it('should handle regulation 9-inning game completion', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 54,
        successfulAtBats: 54,
        totalRuns: 11,
        totalSubstitutions: 3,
        successfulSubstitutions: 3,
        completedInnings: 9,
        gameCompleted: true,
        executionTimeMs: 9000000, // 2.5 hours
        totalRetryAttempts: 1,
        compensationApplied: false,
      };

      expect(result.completedInnings).toBe(9);
      expect(result.gameCompleted).toBe(true);
    });

    it('should handle extra-inning game completion', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 68,
        successfulAtBats: 68,
        totalRuns: 15,
        totalSubstitutions: 7,
        successfulSubstitutions: 7,
        completedInnings: 12,
        gameCompleted: true,
        executionTimeMs: 10800000, // 3 hours
        totalRetryAttempts: 4,
        compensationApplied: false,
      };

      expect(result.completedInnings).toBe(12);
      expect(result.gameCompleted).toBe(true);
    });

    it('should handle mercy rule game completion', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 30,
        successfulAtBats: 30,
        totalRuns: 18,
        totalSubstitutions: 2,
        successfulSubstitutions: 2,
        completedInnings: 5,
        gameCompleted: true,
        executionTimeMs: 4500000,
        totalRetryAttempts: 0,
        compensationApplied: false,
        warnings: ['Game ended early due to mercy rule'],
      };

      expect(result.completedInnings).toBe(5);
      expect(result.gameCompleted).toBe(true);
      expect(result.totalRuns).toBe(18);
      expect(result.warnings).toContain('Game ended early due to mercy rule');
    });
  });

  describe('Performance Metrics', () => {
    it('should handle detailed performance metrics', () => {
      const detailedMetrics: WorkflowPerformanceMetrics = {
        initializationTimeMs: 200,
        averageAtBatTimeMs: 400,
        averageSubstitutionTimeMs: 250,
        inningManagementTimeMs: 600,
        notificationTimeMs: 150,
        errorHandlingTimeMs: 300,
      };

      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 40,
        successfulAtBats: 40,
        totalRuns: 10,
        totalSubstitutions: 3,
        successfulSubstitutions: 3,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 7200000,
        totalRetryAttempts: 2,
        compensationApplied: false,
        performanceMetrics: detailedMetrics,
      };

      expect(result.performanceMetrics).toEqual(detailedMetrics);
      expect(result.performanceMetrics?.initializationTimeMs).toBe(200);
      expect(result.performanceMetrics?.averageAtBatTimeMs).toBe(400);
      expect(result.performanceMetrics?.averageSubstitutionTimeMs).toBe(250);
      expect(result.performanceMetrics?.inningManagementTimeMs).toBe(600);
      expect(result.performanceMetrics?.notificationTimeMs).toBe(150);
      expect(result.performanceMetrics?.errorHandlingTimeMs).toBe(300);
    });

    it('should handle workflow without performance metrics', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 20,
        successfulAtBats: 20,
        totalRuns: 5,
        totalSubstitutions: 1,
        successfulSubstitutions: 1,
        completedInnings: 4,
        gameCompleted: false,
        executionTimeMs: 3000000,
        totalRetryAttempts: 0,
        compensationApplied: false,
      };

      expect(result.performanceMetrics).toBeUndefined();
    });
  });

  describe('Error and Warning Handling', () => {
    it('should handle comprehensive error reporting', () => {
      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 12,
        successfulAtBats: 8,
        totalRuns: 3,
        totalSubstitutions: 2,
        successfulSubstitutions: 0,
        completedInnings: 2,
        gameCompleted: false,
        executionTimeMs: 2100000,
        totalRetryAttempts: 15,
        compensationApplied: true,
        errors: [
          'Database connection pool exhausted',
          'Event sourcing store became unavailable',
          'Multiple concurrent workflow conflicts detected',
          'Transaction timeout exceeded maximum threshold',
          'Critical system resources unavailable',
        ],
      };

      expect(result.errors).toHaveLength(5);
      expect(result.errors).toContain('Database connection pool exhausted');
      expect(result.errors).toContain('Event sourcing store became unavailable');
      expect(result.totalRetryAttempts).toBe(15);
      expect(result.compensationApplied).toBe(true);
    });

    it('should handle comprehensive warning reporting', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 45,
        successfulAtBats: 45,
        totalRuns: 12,
        totalSubstitutions: 6,
        successfulSubstitutions: 5,
        completedInnings: 9,
        gameCompleted: true,
        executionTimeMs: 9600000,
        totalRetryAttempts: 7,
        compensationApplied: false,
        warnings: [
          'Workflow execution time exceeded optimal threshold',
          'High retry rate detected during middle innings',
          'One substitution required manual intervention',
          'Notification delivery experienced intermittent delays',
          'Performance degradation detected in final innings',
        ],
      };

      expect(result.warnings).toHaveLength(5);
      expect(result.warnings).toContain('Workflow execution time exceeded optimal threshold');
      expect(result.warnings).toContain('High retry rate detected during middle innings');
      expect(result.totalRetryAttempts).toBe(7);
    });

    it('should handle empty error and warning arrays', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 36,
        successfulAtBats: 36,
        totalRuns: 9,
        totalSubstitutions: 2,
        successfulSubstitutions: 2,
        completedInnings: 9,
        gameCompleted: true,
        executionTimeMs: 7800000,
        totalRetryAttempts: 0,
        compensationApplied: false,
        errors: [],
        warnings: [],
      };

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Compensation and Recovery', () => {
    it('should handle successful compensation application', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 38,
        successfulAtBats: 35,
        totalRuns: 8,
        totalSubstitutions: 4,
        successfulSubstitutions: 3,
        completedInnings: 9,
        gameCompleted: true,
        executionTimeMs: 8400000,
        totalRetryAttempts: 6,
        compensationApplied: true,
        warnings: [
          'Three operations required compensation actions',
          'System recovered successfully from transient failures',
        ],
      };

      expect(result.compensationApplied).toBe(true);
      expect(result.gameCompleted).toBe(true);
      expect(result.warnings).toContain('Three operations required compensation actions');
    });

    it('should handle failed compensation scenarios', () => {
      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 28,
        successfulAtBats: 22,
        totalRuns: 6,
        totalSubstitutions: 5,
        successfulSubstitutions: 2,
        completedInnings: 6,
        gameCompleted: false,
        executionTimeMs: 5100000,
        totalRetryAttempts: 12,
        compensationApplied: true,
        errors: [
          'Compensation actions partially failed',
          'Unable to fully restore consistent state',
          'Manual intervention required for data integrity',
        ],
      };

      expect(result.compensationApplied).toBe(true);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Compensation actions partially failed');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle minimal workflow execution', () => {
      const result: CompleteGameWorkflowResult = {
        success: false,
        gameId: mockGameId,
        totalAtBats: 1,
        successfulAtBats: 0,
        totalRuns: 0,
        totalSubstitutions: 0,
        successfulSubstitutions: 0,
        completedInnings: 0,
        gameCompleted: false,
        executionTimeMs: 100,
        totalRetryAttempts: 0,
        compensationApplied: false,
        errors: ['Workflow terminated immediately due to critical error'],
      };

      expect(result.totalAtBats).toBe(1);
      expect(result.successfulAtBats).toBe(0);
      expect(result.executionTimeMs).toBe(100);
    });

    it('should handle maximum workflow execution', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        finalGameState: mockFinalGameState,
        totalAtBats: 150,
        successfulAtBats: 150,
        totalRuns: 45,
        totalSubstitutions: 25,
        successfulSubstitutions: 25,
        completedInnings: 18,
        gameCompleted: true,
        executionTimeMs: 18000000, // 5 hours
        totalRetryAttempts: 50,
        compensationApplied: true,
        warnings: ['Extremely long game duration detected'],
      };

      expect(result.totalAtBats).toBe(150);
      expect(result.completedInnings).toBe(18);
      expect(result.executionTimeMs).toBe(18000000);
      expect(result.warnings).toContain('Extremely long game duration detected');
    });
  });

  describe('Data Type Validation', () => {
    it('should maintain proper data types for all fields', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        gameStartResult: mockGameStartResult,
        totalAtBats: 42,
        successfulAtBats: 42,
        totalRuns: 13,
        totalSubstitutions: 5,
        successfulSubstitutions: 5,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 7200000,
        totalRetryAttempts: 2,
        compensationApplied: false,
      };

      expect(typeof result.success).toBe('boolean');
      expect(result.gameId).toBeInstanceOf(GameId);
      expect(typeof result.totalAtBats).toBe('number');
      expect(typeof result.successfulAtBats).toBe('number');
      expect(typeof result.totalRuns).toBe('number');
      expect(typeof result.totalSubstitutions).toBe('number');
      expect(typeof result.successfulSubstitutions).toBe('number');
      expect(typeof result.completedInnings).toBe('number');
      expect(typeof result.gameCompleted).toBe('boolean');
      expect(typeof result.executionTimeMs).toBe('number');
      expect(typeof result.totalRetryAttempts).toBe('number');
      expect(typeof result.compensationApplied).toBe('boolean');
    });

    it('should ensure all numeric fields are integers', () => {
      const result: CompleteGameWorkflowResult = {
        success: true,
        gameId: mockGameId,
        totalAtBats: 42,
        successfulAtBats: 42,
        totalRuns: 13,
        totalSubstitutions: 5,
        successfulSubstitutions: 5,
        completedInnings: 7,
        gameCompleted: true,
        executionTimeMs: 7200000,
        totalRetryAttempts: 2,
        compensationApplied: false,
      };

      expect(Number.isInteger(result.totalAtBats)).toBe(true);
      expect(Number.isInteger(result.successfulAtBats)).toBe(true);
      expect(Number.isInteger(result.totalRuns)).toBe(true);
      expect(Number.isInteger(result.totalSubstitutions)).toBe(true);
      expect(Number.isInteger(result.successfulSubstitutions)).toBe(true);
      expect(Number.isInteger(result.completedInnings)).toBe(true);
      expect(Number.isInteger(result.executionTimeMs)).toBe(true);
      expect(Number.isInteger(result.totalRetryAttempts)).toBe(true);
    });
  });
});

describe('WorkflowPerformanceMetrics', () => {
  it('should represent detailed performance timing correctly', () => {
    const metrics: WorkflowPerformanceMetrics = {
      initializationTimeMs: 150,
      averageAtBatTimeMs: 325,
      averageSubstitutionTimeMs: 180,
      inningManagementTimeMs: 450,
      notificationTimeMs: 200,
      errorHandlingTimeMs: 75,
    };

    expect(typeof metrics.initializationTimeMs).toBe('number');
    expect(typeof metrics.averageAtBatTimeMs).toBe('number');
    expect(typeof metrics.averageSubstitutionTimeMs).toBe('number');
    expect(typeof metrics.inningManagementTimeMs).toBe('number');
    expect(typeof metrics.notificationTimeMs).toBe('number');
    expect(typeof metrics.errorHandlingTimeMs).toBe('number');

    expect(Number.isInteger(metrics.initializationTimeMs)).toBe(true);
    expect(Number.isInteger(metrics.averageAtBatTimeMs)).toBe(true);
    expect(Number.isInteger(metrics.averageSubstitutionTimeMs)).toBe(true);
    expect(Number.isInteger(metrics.inningManagementTimeMs)).toBe(true);
    expect(Number.isInteger(metrics.notificationTimeMs)).toBe(true);
    expect(Number.isInteger(metrics.errorHandlingTimeMs)).toBe(true);
  });

  it('should handle zero timing values', () => {
    const metrics: WorkflowPerformanceMetrics = {
      initializationTimeMs: 0,
      averageAtBatTimeMs: 0,
      averageSubstitutionTimeMs: 0,
      inningManagementTimeMs: 0,
      notificationTimeMs: 0,
      errorHandlingTimeMs: 0,
    };

    expect(metrics.initializationTimeMs).toBe(0);
    expect(metrics.averageAtBatTimeMs).toBe(0);
    expect(metrics.averageSubstitutionTimeMs).toBe(0);
    expect(metrics.inningManagementTimeMs).toBe(0);
    expect(metrics.notificationTimeMs).toBe(0);
    expect(metrics.errorHandlingTimeMs).toBe(0);
  });

  it('should handle high performance timing values', () => {
    const metrics: WorkflowPerformanceMetrics = {
      initializationTimeMs: 5000,
      averageAtBatTimeMs: 1200,
      averageSubstitutionTimeMs: 800,
      inningManagementTimeMs: 2000,
      notificationTimeMs: 1500,
      errorHandlingTimeMs: 3000,
    };

    expect(metrics.initializationTimeMs).toBe(5000);
    expect(metrics.averageAtBatTimeMs).toBe(1200);
    expect(metrics.averageSubstitutionTimeMs).toBe(800);
    expect(metrics.inningManagementTimeMs).toBe(2000);
    expect(metrics.notificationTimeMs).toBe(1500);
    expect(metrics.errorHandlingTimeMs).toBe(3000);
  });
});
