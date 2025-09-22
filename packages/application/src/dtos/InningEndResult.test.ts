/**
 * @file InningEndResult Tests
 * Tests for result DTO returned after ending innings/half-innings in a softball game.
 */

import { GameId, GameStatus, TeamLineupId, FieldPosition, PlayerId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { GameStateDTO } from './GameStateDTO.js';
import { InningEndResult, InningHalfState } from './InningEndResult.js';

describe('InningEndResult', () => {
  let mockGameState: GameStateDTO;
  let validResult: InningEndResult;
  let previousHalf: InningHalfState;
  let newHalf: InningHalfState;

  beforeEach(() => {
    const gameId = GameId.generate();

    mockGameState = {
      gameId,
      status: GameStatus.IN_PROGRESS,
      score: {
        home: 3,
        away: 2,
        leader: 'HOME',
        difference: 1,
      },
      gameStartTime: new Date('2024-08-30T14:00:00Z'),
      currentInning: 5,
      isTopHalf: false,
      battingTeam: 'HOME',
      outs: 0, // Reset after inning end
      bases: {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      },
      currentBatterSlot: 1, // Reset to leadoff
      homeLineup: {
        teamLineupId: new TeamLineupId('home-lineup'),
        gameId,
        teamSide: 'HOME',
        teamName: 'Home Team',
        strategy: 'SIMPLE',
        battingSlots: [],
        fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
        benchPlayers: [],
        substitutionHistory: [],
      },
      awayLineup: {
        teamLineupId: new TeamLineupId('away-lineup'),
        gameId,
        teamSide: 'AWAY',
        teamName: 'Away Team',
        strategy: 'SIMPLE',
        battingSlots: [],
        fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
        benchPlayers: [],
        substitutionHistory: [],
      },
      currentBatter: null,
      lastUpdated: new Date(),
    };

    previousHalf = {
      inning: 4,
      isTopHalf: true,
    };

    newHalf = {
      inning: 4,
      isTopHalf: false,
    };

    validResult = {
      success: true,
      gameState: mockGameState,
      transitionType: 'HALF_INNING',
      previousHalf,
      newHalf,
      gameEnded: false,
      endingReason: 'THREE_OUTS',
      finalOuts: 3,
      eventsGenerated: ['HalfInningEnded'],
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid InningEndResult with all required fields', () => {
      const result = validResult;

      expect(typeof result.success).toBe('boolean');
      expect(result.gameState).toBeDefined();
      expect(typeof result.transitionType).toBe('string');
      expect(result.previousHalf).toBeDefined();
      expect(result.newHalf).toBeDefined();
      expect(typeof result.gameEnded).toBe('boolean');
      expect(typeof result.endingReason).toBe('string');
      expect(Array.isArray(result.eventsGenerated)).toBe(true);
    });

    it('should handle minimal required fields for successful result', () => {
      const minimalResult: InningEndResult = {
        success: true,
        gameState: mockGameState,
        transitionType: 'HALF_INNING',
        previousHalf,
        newHalf,
        gameEnded: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded'],
      };

      expect(minimalResult.finalScore).toBeUndefined();
      expect(minimalResult.gameEndingType).toBeUndefined();
      expect(minimalResult.errors).toBeUndefined();
    });

    it('should handle optional fields for game-ending results', () => {
      const gameEndingResult: InningEndResult = {
        ...validResult,
        gameEnded: true,
        finalScore: { home: 8, away: 3 },
        gameEndingType: 'REGULATION',
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(gameEndingResult.finalScore).toBeDefined();
      expect(gameEndingResult.gameEndingType).toBeDefined();
      expect(gameEndingResult.eventsGenerated).toContain('GameCompleted');
    });

    it('should maintain proper data types for all fields', () => {
      const result = validResult;

      expect(typeof result.success).toBe('boolean');
      expect(result.gameState.gameId).toBeInstanceOf(GameId);
      expect(['HALF_INNING', 'FULL_INNING', 'GAME_END', 'FAILED']).toContain(result.transitionType);
      expect(typeof result.previousHalf.inning).toBe('number');
      expect(typeof result.previousHalf.isTopHalf).toBe('boolean');
      expect(['THREE_OUTS', 'MERCY_RULE', 'TIME_LIMIT', 'FORFEIT', 'WALKOFF', 'MANUAL']).toContain(
        result.endingReason
      );
    });
  });

  describe('InningHalfState Structure', () => {
    it('should properly represent inning and half-inning state', () => {
      const halfState: InningHalfState = {
        inning: 6,
        isTopHalf: true,
      };

      expect(halfState.inning).toBe(6);
      expect(halfState.isTopHalf).toBe(true);
      expect(typeof halfState.inning).toBe('number');
      expect(typeof halfState.isTopHalf).toBe('boolean');
    });

    it('should handle various inning numbers and half states', () => {
      const testCases = [
        { inning: 1, isTopHalf: true }, // Start of game
        { inning: 1, isTopHalf: false }, // Bottom 1st
        { inning: 7, isTopHalf: true }, // Top of 7th
        { inning: 7, isTopHalf: false }, // Bottom of 7th (potential game end)
        { inning: 9, isTopHalf: false }, // Extra innings
        { inning: 15, isTopHalf: true }, // Long extra innings
      ];

      testCases.forEach(({ inning, isTopHalf }) => {
        const halfState: InningHalfState = { inning, isTopHalf };

        expect(halfState.inning).toBe(inning);
        expect(halfState.inning >= 1).toBe(true);
        expect(halfState.isTopHalf).toBe(isTopHalf);
      });
    });
  });

  describe('Transition Types', () => {
    const transitionTypes = ['HALF_INNING', 'FULL_INNING', 'GAME_END', 'FAILED'] as const;

    transitionTypes.forEach(transitionType => {
      it(`should handle ${transitionType} transition type`, () => {
        const result: InningEndResult = {
          ...validResult,
          transitionType,
          newHalf: transitionType === 'GAME_END' || transitionType === 'FAILED' ? null : newHalf,
        };

        expect(result.transitionType).toBe(transitionType);
        expect(transitionTypes).toContain(result.transitionType);
      });
    });

    it('should handle half-inning transition (top → bottom)', () => {
      const halfInningResult: InningEndResult = {
        ...validResult,
        transitionType: 'HALF_INNING',
        previousHalf: { inning: 3, isTopHalf: true },
        newHalf: { inning: 3, isTopHalf: false },
        eventsGenerated: ['HalfInningEnded'],
      };

      expect(halfInningResult.transitionType).toBe('HALF_INNING');
      expect(halfInningResult.previousHalf.inning).toBe(halfInningResult.newHalf!.inning);
      expect(halfInningResult.previousHalf.isTopHalf).toBe(true);
      expect(halfInningResult.newHalf!.isTopHalf).toBe(false);
    });

    it('should handle full inning transition (bottom → next top)', () => {
      const fullInningResult: InningEndResult = {
        ...validResult,
        transitionType: 'FULL_INNING',
        previousHalf: { inning: 5, isTopHalf: false },
        newHalf: { inning: 6, isTopHalf: true },
        eventsGenerated: ['HalfInningEnded', 'InningAdvanced'],
      };

      expect(fullInningResult.transitionType).toBe('FULL_INNING');
      expect(fullInningResult.previousHalf.inning + 1).toBe(fullInningResult.newHalf!.inning);
      expect(fullInningResult.previousHalf.isTopHalf).toBe(false);
      expect(fullInningResult.newHalf!.isTopHalf).toBe(true);
    });

    it('should handle game ending transition', () => {
      const gameEndResult: InningEndResult = {
        ...validResult,
        transitionType: 'GAME_END',
        previousHalf: { inning: 7, isTopHalf: false },
        newHalf: null, // No new half - game over
        gameEnded: true,
        finalScore: { home: 8, away: 5 },
        gameEndingType: 'REGULATION',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(gameEndResult.transitionType).toBe('GAME_END');
      expect(gameEndResult.newHalf).toBeNull();
      expect(gameEndResult.gameEnded).toBe(true);
      expect(gameEndResult.finalScore).toBeDefined();
      expect(gameEndResult.gameEndingType).toBeDefined();
    });

    it('should handle failed transition', () => {
      const failedResult: InningEndResult = {
        ...validResult,
        success: false,
        transitionType: 'FAILED',
        newHalf: null, // No transition occurred
        gameEnded: false,
        finalOuts: 3,
        errors: ['Cannot end inning: Game is not in progress'],
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.transitionType).toBe('FAILED');
      expect(failedResult.newHalf).toBeNull();
      expect(failedResult.errors).toBeDefined();
      expect(failedResult.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Ending Reasons', () => {
    const endingReasons = [
      'THREE_OUTS',
      'MERCY_RULE',
      'TIME_LIMIT',
      'FORFEIT',
      'WALKOFF',
      'MANUAL',
    ] as const;

    endingReasons.forEach(reason => {
      it(`should handle ${reason} ending reason`, () => {
        const result: InningEndResult = {
          ...validResult,
          endingReason: reason,
        };

        expect(result.endingReason).toBe(reason);
        expect(endingReasons).toContain(result.endingReason);
      });
    });

    it('should handle three outs ending with proper context', () => {
      const result: InningEndResult = {
        ...validResult,
        endingReason: 'THREE_OUTS',
        gameEnded: false,
        eventsGenerated: ['HalfInningEnded'],
      };

      expect(result.endingReason).toBe('THREE_OUTS');
      expect(result.gameEnded).toBe(false);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
    });

    it('should handle mercy rule ending with game completion', () => {
      const result: InningEndResult = {
        ...validResult,
        endingReason: 'MERCY_RULE',
        finalOuts: 1,
        transitionType: 'GAME_END',
        newHalf: null,
        gameEnded: true,
        finalScore: { home: 15, away: 0 },
        gameEndingType: 'MERCY_RULE',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(result.endingReason).toBe('MERCY_RULE');
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('MERCY_RULE');
    });

    it('should handle walkoff ending scenario', () => {
      const result: InningEndResult = {
        ...validResult,
        endingReason: 'WALKOFF',
        finalOuts: 1,
        transitionType: 'GAME_END',
        previousHalf: { inning: 7, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        finalScore: { home: 6, away: 5 },
        gameEndingType: 'WALKOFF',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(result.endingReason).toBe('WALKOFF');
      expect(result.previousHalf.isTopHalf).toBe(false); // Home team batting
      expect(result.gameEnded).toBe(true);
      expect(result.gameEndingType).toBe('WALKOFF');
    });
  });

  describe('Game Ending Context', () => {
    it('should handle non-game-ending result', () => {
      const result: InningEndResult = {
        ...validResult,
        gameEnded: false,
      };

      expect(result.gameEnded).toBe(false);
      expect(result.finalScore).toBeUndefined();
      expect(result.gameEndingType).toBeUndefined();
      expect(result.newHalf).not.toBeNull();
    });

    it('should handle regulation game completion', () => {
      const result: InningEndResult = {
        ...validResult,
        transitionType: 'GAME_END',
        previousHalf: { inning: 7, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        finalScore: { home: 8, away: 3 },
        gameEndingType: 'REGULATION',
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(result.gameEnded).toBe(true);
      expect(result.previousHalf.inning).toBe(7);
      expect(result.gameEndingType).toBe('REGULATION');
      expect(result.finalScore).toBeDefined();
    });

    it('should handle extra innings completion', () => {
      const result: InningEndResult = {
        ...validResult,
        transitionType: 'GAME_END',
        previousHalf: { inning: 10, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        endingReason: 'WALKOFF',
        finalScore: { home: 7, away: 6 },
        gameEndingType: 'WALKOFF',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(result.gameEnded).toBe(true);
      expect(result.previousHalf.inning).toBeGreaterThan(7);
      expect(result.gameEndingType).toBe('WALKOFF');
    });

    it('should handle different game ending types', () => {
      const gameEndingTypes = [
        'REGULATION',
        'MERCY_RULE',
        'TIME_LIMIT',
        'FORFEIT',
        'WALKOFF',
      ] as const;

      gameEndingTypes.forEach(endingType => {
        const result: InningEndResult = {
          ...validResult,
          transitionType: 'GAME_END',
          newHalf: null,
          gameEnded: true,
          finalScore: { home: 8, away: 5 },
          gameEndingType: endingType,
        };

        expect(result.gameEndingType).toBe(endingType);
        expect(gameEndingTypes).toContain(result.gameEndingType!);
      });
    });
  });

  describe('Events Generated', () => {
    it('should handle single event generation', () => {
      const result: InningEndResult = {
        ...validResult,
        eventsGenerated: ['HalfInningEnded'],
      };

      expect(result.eventsGenerated).toHaveLength(1);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
    });

    it('should handle multiple events for full inning transition', () => {
      const result: InningEndResult = {
        ...validResult,
        transitionType: 'FULL_INNING',
        eventsGenerated: ['HalfInningEnded', 'InningAdvanced'],
      };

      expect(result.eventsGenerated).toHaveLength(2);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
      expect(result.eventsGenerated).toContain('InningAdvanced');
    });

    it('should handle events for game completion', () => {
      const result: InningEndResult = {
        ...validResult,
        transitionType: 'GAME_END',
        gameEnded: true,
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(result.eventsGenerated).toHaveLength(2);
      expect(result.eventsGenerated).toContain('HalfInningEnded');
      expect(result.eventsGenerated).toContain('GameCompleted');
    });

    it('should handle empty events array for failed operations', () => {
      const result: InningEndResult = {
        ...validResult,
        success: false,
        transitionType: 'FAILED',
        eventsGenerated: [],
        errors: ['Validation failed'],
      };

      expect(result.eventsGenerated).toHaveLength(0);
      expect(result.success).toBe(false);
    });

    it('should handle various event combinations', () => {
      const eventCombinations = [
        ['HalfInningEnded'],
        ['HalfInningEnded', 'InningAdvanced'],
        ['HalfInningEnded', 'GameCompleted'],
        ['HalfInningEnded', 'InningAdvanced', 'GameCompleted'],
        [],
      ];

      eventCombinations.forEach(events => {
        const result: InningEndResult = {
          ...validResult,
          eventsGenerated: events,
        };

        expect(result.eventsGenerated).toEqual(events);
        expect(Array.isArray(result.eventsGenerated)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', () => {
      const result: InningEndResult = {
        ...validResult,
        success: false,
        transitionType: 'FAILED',
        newHalf: null,
        gameEnded: false,
        errors: ['Game not found: game-123', 'Cannot end inning: Game is not in progress'],
      };

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0]).toContain('Game not found');
      expect(result.errors![1]).toContain('not in progress');
    });

    it('should handle single error message', () => {
      const result: InningEndResult = {
        ...validResult,
        success: false,
        transitionType: 'FAILED',
        errors: ['Invalid inning state: Expected inning 5 but found 3'],
      };

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain('Invalid inning state');
    });

    it('should handle infrastructure errors', () => {
      const result: InningEndResult = {
        ...validResult,
        success: false,
        transitionType: 'FAILED',
        errors: ['Infrastructure failure: Unable to save game state'],
      };

      expect(result.errors![0]).toContain('Infrastructure failure');
    });

    it('should handle undefined errors for successful operations', () => {
      const result: InningEndResult = {
        ...validResult,
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Specific Game Scenarios', () => {
    it('should handle standard half-inning transition', () => {
      const standardTransition: InningEndResult = {
        success: true,
        gameState: mockGameState,
        transitionType: 'HALF_INNING',
        previousHalf: { inning: 4, isTopHalf: true },
        newHalf: { inning: 4, isTopHalf: false },
        gameEnded: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded'],
      };

      expect(standardTransition.success).toBe(true);
      expect(standardTransition.transitionType).toBe('HALF_INNING');
      expect(standardTransition.gameEnded).toBe(false);
    });

    it('should handle mercy rule game ending', () => {
      const mercyRuleEnd: InningEndResult = {
        success: true,
        gameState: { ...mockGameState, status: GameStatus.COMPLETED },
        transitionType: 'GAME_END',
        previousHalf: { inning: 5, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        endingReason: 'MERCY_RULE',
        finalOuts: 2,
        finalScore: { home: 15, away: 0 },
        gameEndingType: 'MERCY_RULE',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(mercyRuleEnd.gameEnded).toBe(true);
      expect(mercyRuleEnd.gameEndingType).toBe('MERCY_RULE');
      expect(mercyRuleEnd.finalScore!.home - mercyRuleEnd.finalScore!.away).toBe(15);
    });

    it('should handle regulation completion', () => {
      const regulationEnd: InningEndResult = {
        success: true,
        gameState: { ...mockGameState, status: GameStatus.COMPLETED },
        transitionType: 'GAME_END',
        previousHalf: { inning: 7, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        finalScore: { home: 6, away: 4 },
        gameEndingType: 'REGULATION',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(regulationEnd.previousHalf.inning).toBe(7);
      expect(regulationEnd.previousHalf.isTopHalf).toBe(false);
      expect(regulationEnd.gameEndingType).toBe('REGULATION');
    });

    it('should handle walkoff victory', () => {
      const walkoffWin: InningEndResult = {
        success: true,
        gameState: { ...mockGameState, status: GameStatus.COMPLETED },
        transitionType: 'GAME_END',
        previousHalf: { inning: 7, isTopHalf: false },
        newHalf: null,
        gameEnded: true,
        endingReason: 'WALKOFF',
        finalOuts: 1,
        finalScore: { home: 5, away: 4 },
        gameEndingType: 'WALKOFF',
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };

      expect(walkoffWin.endingReason).toBe('WALKOFF');
      expect(walkoffWin.gameEndingType).toBe('WALKOFF');
      expect(walkoffWin.previousHalf.isTopHalf).toBe(false); // Home team batting
    });

    it('should handle extra innings progression', () => {
      const extraInningsTransition: InningEndResult = {
        success: true,
        gameState: { ...mockGameState, currentInning: 9, isTopHalf: true },
        transitionType: 'FULL_INNING',
        previousHalf: { inning: 8, isTopHalf: false },
        newHalf: { inning: 9, isTopHalf: true },
        gameEnded: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded', 'InningAdvanced'],
      };

      expect(extraInningsTransition.newHalf!.inning).toBeGreaterThan(7);
      expect(extraInningsTransition.gameEnded).toBe(false); // Game continues
    });

    it('should handle failed operation with context', () => {
      const failedOperation: InningEndResult = {
        success: false,
        gameState: mockGameState, // Current state for context
        transitionType: 'FAILED',
        previousHalf: { inning: 4, isTopHalf: true },
        newHalf: null,
        gameEnded: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 2,
        eventsGenerated: [],
        errors: ['Cannot end inning: Game is not in progress', 'Invalid inning state transition'],
      };

      expect(failedOperation.success).toBe(false);
      expect(failedOperation.transitionType).toBe('FAILED');
      expect(failedOperation.errors).toHaveLength(2);
      expect(failedOperation.newHalf).toBeNull();
    });
  });

  describe('Domain Integration', () => {
    it('should properly integrate with GameStateDTO', () => {
      const result = validResult;

      expect(result.gameState.gameId).toBeInstanceOf(GameId);
      expect(result.gameState.status).toBeDefined();
      expect(result.gameState.score).toBeDefined();
      expect(result.gameState.currentInning >= 1).toBe(true);
    });

    it('should maintain consistency with inning progression rules', () => {
      const result = validResult;

      // Verify inning numbers are positive integers
      expect(result.previousHalf.inning >= 1).toBe(true);
      expect(Number.isInteger(result.previousHalf.inning)).toBe(true);

      if (result.newHalf) {
        expect(result.newHalf.inning >= 1).toBe(true);
        expect(Number.isInteger(result.newHalf.inning)).toBe(true);
      }

      // Verify transition logic consistency
      if (result.transitionType === 'HALF_INNING') {
        expect(result.previousHalf.inning).toBe(result.newHalf!.inning);
        expect(result.previousHalf.isTopHalf).not.toBe(result.newHalf!.isTopHalf);
      } else if (result.transitionType === 'FULL_INNING') {
        expect(result.previousHalf.inning + 1).toBe(result.newHalf!.inning);
        expect(result.previousHalf.isTopHalf).toBe(false);
        expect(result.newHalf!.isTopHalf).toBe(true);
      }
    });

    it('should maintain event consistency with transition types', () => {
      // Half-inning should generate HalfInningEnded
      const halfInning: InningEndResult = {
        ...validResult,
        transitionType: 'HALF_INNING',
        eventsGenerated: ['HalfInningEnded'],
      };
      expect(halfInning.eventsGenerated).toContain('HalfInningEnded');

      // Full inning should generate both HalfInningEnded and InningAdvanced
      const fullInning: InningEndResult = {
        ...validResult,
        transitionType: 'FULL_INNING',
        eventsGenerated: ['HalfInningEnded', 'InningAdvanced'],
      };
      expect(fullInning.eventsGenerated).toContain('HalfInningEnded');
      expect(fullInning.eventsGenerated).toContain('InningAdvanced');

      // Game end should include GameCompleted
      const gameEnd: InningEndResult = {
        ...validResult,
        transitionType: 'GAME_END',
        gameEnded: true,
        eventsGenerated: ['HalfInningEnded', 'GameCompleted'],
      };
      expect(gameEnd.eventsGenerated).toContain('GameCompleted');
    });
  });
});
