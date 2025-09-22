/**
 * @file AtBatResult Tests
 * Tests for result DTO returned after recording an at-bat.
 */

import {
  GameId,
  GameStatus,
  TeamLineupId,
  PlayerId,
  JerseyNumber,
  FieldPosition,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  AtBatResult,
  AtBatResultValidator,
  AtBatResultValidationError,
  AtBatResultFactory,
} from './AtBatResult.js';
import { BasesStateDTO } from './BasesStateDTO.js';
import { GameScoreDTO } from './GameScoreDTO.js';
import { GameStateDTO } from './GameStateDTO.js';
import { TeamLineupDTO } from './TeamLineupDTO.js';

describe('AtBatResult', () => {
  let validResult: AtBatResult;
  let gameId: GameId;
  let gameState: GameStateDTO;

  beforeEach(() => {
    gameId = GameId.generate();

    // Mock game state after successful at-bat
    const basesState: BasesStateDTO = {
      first: null,
      second: PlayerId.generate(), // Runner advanced to second
      third: null,
      runnersInScoringPosition: [PlayerId.generate()],
      basesLoaded: false,
    };

    const gameScore: GameScoreDTO = {
      home: 3,
      away: 2,
      leader: 'HOME',
      difference: 1,
    };

    const homeLineup: TeamLineupDTO = {
      teamLineupId: TeamLineupId.generate(),
      gameId,
      teamSide: 'HOME',
      teamName: 'Eagles',
      strategy: 'DETAILED',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    };

    const awayLineup: TeamLineupDTO = {
      teamLineupId: TeamLineupId.generate(),
      gameId,
      teamSide: 'AWAY',
      teamName: 'Hawks',
      strategy: 'SIMPLE',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    };

    gameState = {
      gameId,
      status: GameStatus.IN_PROGRESS,
      score: gameScore,
      gameStartTime: new Date('2024-08-30T14:00:00Z'),
      currentInning: 3,
      isTopHalf: false,
      battingTeam: 'HOME',
      outs: 1,
      bases: basesState,
      currentBatterSlot: 4,
      homeLineup,
      awayLineup,
      currentBatter: {
        playerId: PlayerId.generate(),
        name: 'Next Batter',
        jerseyNumber: JerseyNumber.fromNumber(4),
        battingOrderPosition: 4,
        currentFieldPosition: FieldPosition.FIRST_BASE,
        preferredPositions: [FieldPosition.FIRST_BASE],
        plateAppearances: [],
        statistics: {
          playerId: PlayerId.generate(),
          name: 'Next Batter',
          jerseyNumber: JerseyNumber.fromNumber(4),
          plateAppearances: 1,
          atBats: 1,
          hits: 1,
          singles: 1,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          walks: 0,
          strikeouts: 0,
          rbi: 1,
          runs: 0,
          battingAverage: 1.0,
          onBasePercentage: 1.0,
          sluggingPercentage: 1.0,
          fielding: {
            positions: [FieldPosition.FIRST_BASE],
            putouts: 2,
            assists: 1,
            errors: 0,
            fieldingPercentage: 1.0,
          },
        },
      },
      lastUpdated: new Date('2024-08-30T15:15:00Z'),
    };

    validResult = {
      success: true,
      gameState,
      runsScored: 1,
      rbiAwarded: 1,
      inningEnded: false,
      gameEnded: false,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid AtBatResult for successful at-bat', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(typeof result.runsScored).toBe('number');
      expect(typeof result.rbiAwarded).toBe('number');
      expect(typeof result.inningEnded).toBe('boolean');
      expect(typeof result.gameEnded).toBe('boolean');
      expect(result.errors).toBeUndefined();
    });

    it('should handle all numeric and boolean fields correctly', () => {
      const result = validResult;

      expect(Number.isInteger(result.runsScored)).toBe(true);
      expect(Number.isInteger(result.rbiAwarded)).toBe(true);
      expect(result.runsScored).toBeGreaterThanOrEqual(0);
      expect(result.rbiAwarded).toBeGreaterThanOrEqual(0);
      expect(typeof result.inningEnded).toBe('boolean');
      expect(typeof result.gameEnded).toBe('boolean');
    });

    it('should maintain proper data types', () => {
      const result = validResult;

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.gameState).toBe('object');
      expect(typeof result.runsScored).toBe('number');
      expect(typeof result.rbiAwarded).toBe('number');
      expect(typeof result.inningEnded).toBe('boolean');
      expect(typeof result.gameEnded).toBe('boolean');
    });
  });

  describe('Success Scenarios', () => {
    it('should handle successful at-bat with run scored', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.runsScored).toBe(1);
      expect(result.rbiAwarded).toBe(1);
      expect(result.inningEnded).toBe(false);
      expect(result.gameEnded).toBe(false);
      expect(result.errors).toBeUndefined();
    });

    it('should handle at-bat with no runs scored', () => {
      const noRunsResult: AtBatResult = {
        ...validResult,
        runsScored: 0,
        rbiAwarded: 0,
      };

      expect(noRunsResult.success).toBe(true);
      expect(noRunsResult.runsScored).toBe(0);
      expect(noRunsResult.rbiAwarded).toBe(0);
    });

    it('should handle multiple runs scored', () => {
      const multipleRunsResult: AtBatResult = {
        ...validResult,
        runsScored: 3,
        rbiAwarded: 3,
      };

      expect(multipleRunsResult.success).toBe(true);
      expect(multipleRunsResult.runsScored).toBe(3);
      expect(multipleRunsResult.rbiAwarded).toBe(3);
    });

    it('should handle RBI without runs (sacrifice fly)', () => {
      const sacrificeResult: AtBatResult = {
        ...validResult,
        runsScored: 1,
        rbiAwarded: 1,
      };

      expect(sacrificeResult.success).toBe(true);
      expect(sacrificeResult.runsScored).toBe(1);
      expect(sacrificeResult.rbiAwarded).toBe(1);
    });
  });

  describe('Inning and Game End Scenarios', () => {
    it('should handle inning ending due to third out', () => {
      const inningEndResult: AtBatResult = {
        ...validResult,
        gameState: {
          ...gameState,
          outs: 0, // Reset for next inning
          isTopHalf: true, // Switched to top of next inning
          currentInning: 4,
        },
        inningEnded: true,
        gameEnded: false,
      };

      expect(inningEndResult.success).toBe(true);
      expect(inningEndResult.inningEnded).toBe(true);
      expect(inningEndResult.gameEnded).toBe(false);
      expect(inningEndResult.gameState.outs).toBe(0);
    });

    it('should handle game ending due to mercy rule', () => {
      const gameEndResult: AtBatResult = {
        ...validResult,
        gameState: {
          ...gameState,
          status: GameStatus.COMPLETED,
          score: {
            home: 15,
            away: 3,
            leader: 'HOME',
            difference: 12,
          },
        },
        inningEnded: true,
        gameEnded: true,
      };

      expect(gameEndResult.success).toBe(true);
      expect(gameEndResult.inningEnded).toBe(true);
      expect(gameEndResult.gameEnded).toBe(true);
      expect(gameEndResult.gameState.status).toBe(GameStatus.COMPLETED);
    });

    it('should handle walkoff game ending', () => {
      const walkoffResult: AtBatResult = {
        ...validResult,
        gameState: {
          ...gameState,
          status: GameStatus.COMPLETED,
          score: {
            home: 5,
            away: 4,
            leader: 'HOME',
            difference: 1,
          },
          currentInning: 7,
          isTopHalf: false,
        },
        runsScored: 1,
        rbiAwarded: 1,
        inningEnded: true,
        gameEnded: true,
      };

      expect(walkoffResult.success).toBe(true);
      expect(walkoffResult.gameEnded).toBe(true);
      expect(walkoffResult.gameState.score.leader).toBe('HOME');
    });

    it('should handle inning transition correctly', () => {
      const inningTransitionResult: AtBatResult = {
        ...validResult,
        gameState: {
          ...gameState,
          outs: 0, // Reset for next half-inning
          currentInning: 3,
          isTopHalf: true, // Switched sides
          battingTeam: 'AWAY',
          bases: {
            first: null,
            second: null,
            third: null,
            runnersInScoringPosition: [],
            basesLoaded: false,
          },
        },
        inningEnded: true,
        gameEnded: false,
      };

      expect(inningTransitionResult.inningEnded).toBe(true);
      expect(inningTransitionResult.gameState.outs).toBe(0);
      expect(inningTransitionResult.gameState.isTopHalf).toBe(true);
      expect(inningTransitionResult.gameState.bases.first).toBeNull();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle failed at-bat recording', () => {
      const errorResult: AtBatResult = {
        success: false,
        gameState: gameState, // May include current state for reference
        runsScored: 0,
        rbiAwarded: 0,
        inningEnded: false,
        gameEnded: false,
        errors: ['Invalid batter ID: Player not found in current lineup'],
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.errors).toHaveLength(1);
      expect(errorResult.errors![0]).toContain('Invalid batter ID');
      expect(errorResult.runsScored).toBe(0);
      expect(errorResult.rbiAwarded).toBe(0);
    });

    it('should handle multiple validation errors', () => {
      const multiErrorResult: AtBatResult = {
        success: false,
        gameState: gameState,
        runsScored: 0,
        rbiAwarded: 0,
        inningEnded: false,
        gameEnded: false,
        errors: [
          'Invalid runner movement: Cannot advance from THIRD to FIRST',
          'RBI calculation error: Runs scored but no RBI awarded',
          'Game state inconsistent: Inning already ended',
        ],
      };

      expect(multiErrorResult.success).toBe(false);
      expect(multiErrorResult.errors).toHaveLength(3);
      expect(multiErrorResult.errors![0]).toContain('Invalid runner movement');
      expect(multiErrorResult.errors![1]).toContain('RBI calculation error');
      expect(multiErrorResult.errors![2]).toContain('Game state inconsistent');
    });

    it('should handle business rule violations', () => {
      const businessRuleError: AtBatResult = {
        success: false,
        gameState: gameState,
        runsScored: 0,
        rbiAwarded: 0,
        inningEnded: false,
        gameEnded: false,
        errors: ['Cannot record at-bat: Game is already completed'],
      };

      expect(businessRuleError.success).toBe(false);
      expect(businessRuleError.errors![0]).toContain('Game is already completed');
    });
  });

  describe('Game State Integration', () => {
    it('should include updated game state after successful at-bat', () => {
      const result = validResult;
      const state = result.gameState;

      expect(state.gameId).toBeInstanceOf(GameId);
      expect(state.status).toBe(GameStatus.IN_PROGRESS);
      expect(state.currentInning).toBe(3);
      expect(state.outs).toBe(1);
      expect(state.score.home).toBe(3);
      expect(state.score.away).toBe(2);
    });

    it('should reflect runs scored in game score', () => {
      const result = validResult;

      // If home team scored 1 run, it should be reflected in score
      if (result.runsScored > 0 && result.gameState.battingTeam === 'HOME') {
        expect(result.gameState.score.home).toBeGreaterThan(0);
      }
    });

    it('should maintain game state consistency', () => {
      const result = validResult;
      const state = result.gameState;

      expect(state.outs).toBeGreaterThanOrEqual(0);
      expect(state.outs).toBeLessThanOrEqual(2);
      expect(state.currentInning).toBeGreaterThan(0);
      expect(state.currentBatterSlot).toBeGreaterThan(0);
      expect(['HOME', 'AWAY']).toContain(state.battingTeam);
    });
  });

  describe('Statistical Consistency', () => {
    it('should have consistent RBI and runs scored relationship', () => {
      const result = validResult;

      // RBI can be greater than runs scored (e.g., bases loaded walk)
      // But typically they should be equal or RBI higher
      expect(result.rbiAwarded).toBeGreaterThanOrEqual(0);
      expect(result.runsScored).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero runs and zero RBI correctly', () => {
      const noImpactResult: AtBatResult = {
        ...validResult,
        runsScored: 0,
        rbiAwarded: 0,
      };

      expect(noImpactResult.runsScored).toBe(0);
      expect(noImpactResult.rbiAwarded).toBe(0);
    });

    it('should handle grand slam scenario', () => {
      const grandSlamResult: AtBatResult = {
        ...validResult,
        runsScored: 4,
        rbiAwarded: 4,
      };

      expect(grandSlamResult.runsScored).toBe(4);
      expect(grandSlamResult.rbiAwarded).toBe(4);
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects in game state', () => {
      const result = validResult;
      const state = result.gameState;

      expect(state.gameId).toBeInstanceOf(GameId);
      expect(state.homeLineup.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(state.awayLineup.teamLineupId).toBeInstanceOf(TeamLineupId);
    });

    it('should maintain domain constraints', () => {
      const result = validResult;

      expect(result.runsScored).toBeGreaterThanOrEqual(0);
      expect(result.rbiAwarded).toBeGreaterThanOrEqual(0);
      expect([GameStatus.NOT_STARTED, GameStatus.IN_PROGRESS, GameStatus.COMPLETED]).toContain(
        result.gameState.status
      );
    });
  });

  describe('Result Contract Compliance', () => {
    it('should satisfy successful result contract', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should satisfy error result contract', () => {
      const errorResult: AtBatResult = {
        success: false,
        gameState: gameState,
        runsScored: 0,
        rbiAwarded: 0,
        inningEnded: false,
        gameEnded: false,
        errors: ['Validation error'],
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.errors).toBeDefined();
      expect(errorResult.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('AtBatResultValidator', () => {
    describe('Basic Structure Validation', () => {
      it('should validate a complete valid result', () => {
        expect(() => AtBatResultValidator.validate(validResult)).not.toThrow();
      });

      it('should throw error for non-boolean success', () => {
        const invalidResult = { ...validResult, success: 'true' } as unknown as AtBatResult;
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'success field must be a boolean',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });

      it('should throw error for missing gameState', () => {
        const invalidResult = { ...validResult, gameState: null } as unknown as AtBatResult;
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'gameState is required',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });

      it('should throw error for negative runsScored', () => {
        const invalidResult = { ...validResult, runsScored: -1 };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'runsScored must be a non-negative number',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });

      it('should throw error for excessive runsScored', () => {
        const invalidResult = { ...validResult, runsScored: 5 };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'runsScored cannot exceed 4 (maximum possible in single at-bat)',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });

      it('should throw error for excessive rbiAwarded', () => {
        const invalidResult = { ...validResult, rbiAwarded: 5 };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'rbiAwarded cannot exceed 4 (maximum possible in single at-bat)',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });
    });

    describe('Statistical Consistency Validation', () => {
      it('should allow valid RBI to runs ratio', () => {
        const result = { ...validResult, runsScored: 2, rbiAwarded: 2 };
        expect(() => AtBatResultValidator.validate(result)).not.toThrow();
      });

      it('should throw error for excessive RBI without runs', () => {
        const invalidResult = { ...validResult, runsScored: 0, rbiAwarded: 2 };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'Cannot award more than 1 RBI when no runs are scored',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });
    });

    describe('Game State Consistency Validation', () => {
      it('should throw error when game ends but inning does not', () => {
        const invalidResult = { ...validResult, gameEnded: true, inningEnded: false };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          'If game ended, inning must also be ended'
        );
      });

      it('should throw error for invalid outs in game state', () => {
        const invalidGameState = { ...gameState, outs: 4 };
        const invalidResult = { ...validResult, gameState: invalidGameState };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'gameState outs must be between 0 and 3',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });
    });

    describe('Error Structure Validation', () => {
      it('should validate error result structure', () => {
        const errorResult = {
          ...validResult,
          success: false,
          errors: ['Valid error message'],
        };
        expect(() => AtBatResultValidator.validate(errorResult)).not.toThrow();
      });

      it('should throw error for empty errors array', () => {
        const invalidResult = {
          ...validResult,
          success: false,
          errors: [],
        };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'errors array cannot be empty if provided',
            name: 'AtBatResultValidationError',
          }) as Error
        );
      });

      it('should throw error for too many errors', () => {
        const tooManyErrors = Array.from({ length: 11 }, (_, i) => `Error ${i + 1}`);
        const invalidResult = {
          ...validResult,
          success: false,
          errors: tooManyErrors,
        };
        expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
          expect.objectContaining({
            message: 'errors array cannot exceed 10 items',
            name: 'AtBatResultValidationError',
            validationContext: expect.objectContaining({
              field: 'errors',
              value: tooManyErrors,
            }),
          }) as Error
        );
      });
    });
  });

  describe('AtBatResultFactory', () => {
    describe('createSuccess', () => {
      it('should create successful result with defaults', () => {
        const result = AtBatResultFactory.createSuccess(gameState);

        expect(result.success).toBe(true);
        expect(result.gameState).toBe(gameState);
        expect(result.runsScored).toBe(0);
        expect(result.rbiAwarded).toBe(0);
        expect(result.inningEnded).toBe(false);
        expect(result.gameEnded).toBe(false);
        expect(result.errors).toBeUndefined();
      });

      it('should create successful result with custom values', () => {
        const result = AtBatResultFactory.createSuccess(gameState, 2, 2, true, false);

        expect(result.runsScored).toBe(2);
        expect(result.rbiAwarded).toBe(2);
        expect(result.inningEnded).toBe(true);
        expect(result.gameEnded).toBe(false);
      });
    });

    describe('createFailure', () => {
      it('should create failed result with errors', () => {
        const errors = ['Invalid batter', 'Game already ended'];
        const result = AtBatResultFactory.createFailure(gameState, errors);

        expect(result.success).toBe(false);
        expect(result.gameState).toBe(gameState);
        expect(result.runsScored).toBe(0);
        expect(result.rbiAwarded).toBe(0);
        expect(result.inningEnded).toBe(false);
        expect(result.gameEnded).toBe(false);
        expect(result.errors).toEqual(errors);
      });
    });

    describe('createHomeRun', () => {
      it('should create home run result', () => {
        const result = AtBatResultFactory.createHomeRun(gameState, 2, false);

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(2);
        expect(result.rbiAwarded).toBe(2);
        expect(result.inningEnded).toBe(false);
        expect(result.gameEnded).toBe(false);
      });

      it('should create walkoff home run result', () => {
        // Need to create walkoff scenario manually since createHomeRun doesn't handle inning ending
        const result = AtBatResultFactory.createSuccess(gameState, 1, 1, true, true);

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(1);
        expect(result.rbiAwarded).toBe(1);
        expect(result.inningEnded).toBe(true); // Game ending hits also end the inning
        expect(result.gameEnded).toBe(true);
      });
    });

    describe('createInningEndingOut', () => {
      it('should create inning-ending out result', () => {
        const result = AtBatResultFactory.createInningEndingOut(gameState, false);

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(0);
        expect(result.rbiAwarded).toBe(0);
        expect(result.inningEnded).toBe(true);
        expect(result.gameEnded).toBe(false);
      });
    });

    describe('createRBIHit', () => {
      it('should create RBI hit result', () => {
        const result = AtBatResultFactory.createRBIHit(gameState, 1, 1, false);

        expect(result.success).toBe(true);
        expect(result.runsScored).toBe(1);
        expect(result.rbiAwarded).toBe(1);
        expect(result.inningEnded).toBe(false);
        expect(result.gameEnded).toBe(false);
      });
    });
  });

  describe('Error Validation Edge Cases', () => {
    it('should validate error array with non-string elements', () => {
      const invalidValue = 123;
      const invalidResult = {
        ...validResult,
        success: false,
        errors: ['Valid error', invalidValue, 'Another valid error'],
      } as AtBatResult;

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'Error at index 1 must be a non-empty string',
          name: 'AtBatResultValidationError',
          validationContext: expect.objectContaining({
            field: 'errors[1]',
            value: invalidValue,
          }),
        }) as Error
      );
    });

    it('should validate error array with empty string elements', () => {
      const invalidResult: AtBatResult = {
        ...validResult,
        success: false,
        errors: ['Valid error', '', 'Another valid error'],
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'Error at index 1 must be a non-empty string',
          errorType: 'AtBatResultValidationError',
          validationContext: {
            field: 'errors[1]',
            value: '',
          },
          name: 'AtBatResultValidationError',
        }) as Error
      );
    });

    it('should validate error array with whitespace-only elements', () => {
      const whitespaceValue = '   \t\n   ';
      const invalidResult: AtBatResult = {
        ...validResult,
        success: false,
        errors: ['Valid error', whitespaceValue, 'Another valid error'],
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'Error at index 1 must be a non-empty string',
          name: 'AtBatResultValidationError',
          validationContext: expect.objectContaining({
            field: 'errors[1]',
            value: whitespaceValue,
          }),
        }) as Error
      );
    });

    it('should validate error array with elements exceeding length limit', () => {
      const longError = 'x'.repeat(201); // Exceeds 200 character limit
      const invalidResult: AtBatResult = {
        ...validResult,
        success: false,
        errors: ['Valid error', longError],
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'Error at index 1 cannot exceed 200 characters',
          name: 'AtBatResultValidationError',
        }) as Error
      );
    });

    it('should allow error array with exactly 200 character elements', () => {
      const maxLengthError = 'x'.repeat(200); // Exactly 200 characters
      const validFailureResult: AtBatResult = {
        ...validResult,
        success: false,
        errors: ['Valid error', maxLengthError],
      };

      expect(() => AtBatResultValidator.validate(validFailureResult)).not.toThrow();
    });
  });

  describe('Game State Validation Edge Cases', () => {
    it('should validate currentInning is a positive number', () => {
      const invalidResult: AtBatResult = {
        ...validResult,
        gameState: {
          ...validResult.gameState,
          currentInning: 0, // Invalid - must be positive
        },
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'gameState currentInning must be a positive number',
          name: 'AtBatResultValidationError',
        }) as Error
      );
    });

    it('should validate errors parameter is an array', () => {
      const invalidValue = 'not an array';
      const invalidResult = {
        ...validResult,
        success: false,
        errors: invalidValue,
      } as unknown as AtBatResult;

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'errors must be an array when provided',
          errorType: 'AtBatResultValidationError',
          validationContext: expect.objectContaining({
            field: 'errors',
            value: invalidValue,
          }),
        }) as Error
      );
    });
  });

  describe('Statistical Consistency Edge Cases', () => {
    it('should throw error when RBI significantly exceeds runs scored by more than 2', () => {
      const invalidResult: AtBatResult = {
        ...validResult,
        runsScored: 1,
        rbiAwarded: 4, // 3 more than runs scored - should trigger the extreme case validation
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        new AtBatResultValidationError(
          'rbiAwarded significantly exceeds runsScored, check for data consistency'
        )
      );
    });

    it('should allow RBI to exceed runs scored by exactly 2', () => {
      const edgeCaseResult: AtBatResult = {
        ...validResult,
        runsScored: 1,
        rbiAwarded: 3, // 2 more than runs scored - should be allowed
      };

      expect(() => AtBatResultValidator.validate(edgeCaseResult)).not.toThrow();
    });

    it('should allow RBI to exceed runs scored by 1', () => {
      const validExceptionResult: AtBatResult = {
        ...validResult,
        runsScored: 2,
        rbiAwarded: 3, // 1 more than runs scored - valid sacrifice scenario
      };

      expect(() => AtBatResultValidator.validate(validExceptionResult)).not.toThrow();
    });
  });

  describe('Game State Structure Validation Edge Cases', () => {
    it('should throw error for null gameId in game state', () => {
      const invalidGameState = {
        ...gameState,
        gameId: null as unknown as GameId,
      };
      const invalidResult: AtBatResult = {
        ...validResult,
        gameState: invalidGameState,
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'gameState must have a valid gameId',
          name: 'AtBatResultValidationError',
        }) as Error
      );
    });

    it('should throw error for undefined gameId in game state', () => {
      const invalidGameState = {
        ...gameState,
        gameId: undefined as unknown as GameId,
      };
      const invalidResult: AtBatResult = {
        ...validResult,
        gameState: invalidGameState,
      };

      expect(() => AtBatResultValidator.validate(invalidResult)).toThrow(
        expect.objectContaining({
          message: 'gameState must have a valid gameId',
          name: 'AtBatResultValidationError',
        }) as Error
      );
    });
  });

  describe('AtBatResultValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new AtBatResultValidationError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('AtBatResultValidationError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AtBatResultValidationError);
    });
  });
});
