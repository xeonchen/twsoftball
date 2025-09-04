/**
 * @file GameStartResult Tests
 * Tests for result DTO returned when starting a new game.
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

import { BasesStateDTO } from './BasesStateDTO';
import { GameScoreDTO } from './GameScoreDTO';
import { GameStartResult } from './GameStartResult';
import { GameStateDTO } from './GameStateDTO';
import { TeamLineupDTO } from './TeamLineupDTO';

describe('GameStartResult', () => {
  let validResult: GameStartResult;
  let gameId: GameId;
  let gameState: GameStateDTO;

  beforeEach(() => {
    gameId = GameId.generate();

    // Mock complete game state for successful start
    const basesState: BasesStateDTO = {
      first: null,
      second: null,
      third: null,
      runnersInScoringPosition: [],
      basesLoaded: false,
    };

    const gameScore: GameScoreDTO = {
      home: 0,
      away: 0,
      leader: 'TIE',
      difference: 0,
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
      currentInning: 1,
      isTopHalf: true,
      battingTeam: 'AWAY',
      outs: 0,
      bases: basesState,
      currentBatterSlot: 1,
      homeLineup,
      awayLineup,
      currentBatter: {
        playerId: PlayerId.generate(),
        name: 'Lead-off Hitter',
        jerseyNumber: JerseyNumber.fromNumber(1),
        battingOrderPosition: 1,
        currentFieldPosition: FieldPosition.CENTER_FIELD,
        preferredPositions: [FieldPosition.CENTER_FIELD],
        plateAppearances: [],
        statistics: {
          playerId: PlayerId.generate(),
          name: 'Lead-off Hitter',
          jerseyNumber: JerseyNumber.fromNumber(1),
          plateAppearances: 0,
          atBats: 0,
          hits: 0,
          singles: 0,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          walks: 0,
          strikeouts: 0,
          rbi: 0,
          runs: 0,
          battingAverage: 0,
          onBasePercentage: 0,
          sluggingPercentage: 0,
          fielding: {
            positions: [],
            putouts: 0,
            assists: 0,
            errors: 0,
            fieldingPercentage: 1.0,
          },
        },
      },
      lastUpdated: new Date('2024-08-30T14:00:00Z'),
    };

    validResult = {
      success: true,
      gameId,
      initialState: gameState,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid GameStartResult for successful game start', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.gameId).toBeInstanceOf(GameId);
      expect(result.initialState).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should handle successful result with proper game state', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.gameId).toEqual(gameId);
      expect(state.status).toBe(GameStatus.IN_PROGRESS);
      expect(state.currentInning).toBe(1);
      expect(state.isTopHalf).toBe(true);
      expect(state.battingTeam).toBe('AWAY');
      expect(state.outs).toBe(0);
      expect(state.score.home).toBe(0);
      expect(state.score.away).toBe(0);
      expect(state.score.leader).toBe('TIE');
    });

    it('should maintain proper data types', () => {
      const result = validResult;

      expect(typeof result.success).toBe('boolean');
      expect(result.gameId).toBeInstanceOf(GameId);
      expect(typeof result.initialState).toBe('object');
    });
  });

  describe('Success Scenarios', () => {
    it('should handle successful game start with complete state', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.initialState).toBeDefined();
      expect(result.initialState!.gameId).toEqual(gameId);
      expect(result.initialState!.status).toBe(GameStatus.IN_PROGRESS);
      expect(result.errors).toBeUndefined();
    });

    it('should include valid initial game state', () => {
      const result = validResult;
      const state = result.initialState!;

      // Game should be in starting position
      expect(state.currentInning).toBe(1);
      expect(state.isTopHalf).toBe(true);
      expect(state.outs).toBe(0);
      expect(state.battingTeam).toBe('AWAY'); // Away team bats first

      // Bases should be empty
      expect(state.bases.first).toBeNull();
      expect(state.bases.second).toBeNull();
      expect(state.bases.third).toBeNull();
      expect(state.bases.basesLoaded).toBe(false);

      // Score should be 0-0
      expect(state.score.home).toBe(0);
      expect(state.score.away).toBe(0);
      expect(state.score.leader).toBe('TIE');
    });

    it('should include both team lineups', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.homeLineup).toBeDefined();
      expect(state.awayLineup).toBeDefined();
      expect(state.homeLineup.teamSide).toBe('HOME');
      expect(state.awayLineup.teamSide).toBe('AWAY');
      expect(state.homeLineup.gameId).toEqual(gameId);
      expect(state.awayLineup.gameId).toEqual(gameId);
    });

    it('should include current batter information', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.currentBatter).toBeDefined();
      expect(state.currentBatter!.battingOrderPosition).toBe(1);
      expect(state.currentBatterSlot).toBe(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle failed game start', () => {
      const failedResult: GameStartResult = {
        success: false,
        gameId,
        errors: [
          'Invalid lineup: Duplicate jersey numbers found',
          'Missing required field positions',
        ],
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.gameId).toEqual(gameId);
      expect(failedResult.initialState).toBeUndefined();
      expect(failedResult.errors).toHaveLength(2);
      expect(failedResult.errors![0]).toContain('Duplicate jersey numbers');
    });

    it('should handle single error', () => {
      const singleErrorResult: GameStartResult = {
        success: false,
        gameId,
        errors: ['Team name cannot be empty'],
      };

      expect(singleErrorResult.success).toBe(false);
      expect(singleErrorResult.errors).toHaveLength(1);
      expect(singleErrorResult.errors![0]).toBe('Team name cannot be empty');
    });

    it('should handle undefined errors for successful result', () => {
      const result = validResult;

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle empty errors array', () => {
      const emptyErrorsResult: GameStartResult = {
        success: false,
        gameId,
        errors: [],
      };

      expect(emptyErrorsResult.success).toBe(false);
      expect(emptyErrorsResult.errors).toHaveLength(0);
    });
  });

  describe('Game State Consistency', () => {
    it('should have consistent game IDs between result and state', () => {
      const result = validResult;

      expect(result.gameId).toEqual(result.initialState!.gameId);
    });

    it('should have proper initial game timing', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.gameStartTime).toBeInstanceOf(Date);
      expect(state.lastUpdated).toBeInstanceOf(Date);
      expect(state.lastUpdated.getTime()).toBeGreaterThanOrEqual(state.gameStartTime.getTime());
    });

    it('should have proper batting team for top of first inning', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.currentInning).toBe(1);
      expect(state.isTopHalf).toBe(true);
      expect(state.battingTeam).toBe('AWAY'); // Away team always bats first
    });

    it('should have clean bases and score for new game', () => {
      const result = validResult;
      const state = result.initialState!;

      // Empty bases
      expect(state.bases.first).toBeNull();
      expect(state.bases.second).toBeNull();
      expect(state.bases.third).toBeNull();
      expect(state.bases.runnersInScoringPosition).toHaveLength(0);

      // Tied score
      expect(state.score.home).toBe(0);
      expect(state.score.away).toBe(0);
      expect(state.score.difference).toBe(0);
      expect(state.score.leader).toBe('TIE');
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const result = validResult;

      expect(result.gameId).toBeInstanceOf(GameId);
      expect(result.initialState!.gameId).toBeInstanceOf(GameId);
      expect(result.initialState!.homeLineup.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(result.initialState!.awayLineup.teamLineupId).toBeInstanceOf(TeamLineupId);
    });

    it('should maintain domain constraints', () => {
      const result = validResult;
      const state = result.initialState!;

      expect(state.outs).toBeGreaterThanOrEqual(0);
      expect(state.outs).toBeLessThanOrEqual(2);
      expect(state.currentInning).toBeGreaterThan(0);
      expect(state.currentBatterSlot).toBeGreaterThan(0);
      expect([GameStatus.NOT_STARTED, GameStatus.IN_PROGRESS, GameStatus.COMPLETED]).toContain(
        state.status
      );
    });
  });

  describe('Result Contract Compliance', () => {
    it('should satisfy successful result contract', () => {
      const result = validResult;

      // Success results must have gameId and initialState
      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      expect(result.initialState).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should satisfy error result contract', () => {
      const errorResult: GameStartResult = {
        success: false,
        gameId,
        errors: ['Validation failed'],
      };

      // Error results must have gameId and errors, initialState is optional
      expect(errorResult.success).toBe(false);
      expect(errorResult.gameId).toBeDefined();
      expect(errorResult.errors).toBeDefined();
      expect(errorResult.errors!.length).toBeGreaterThan(0);
    });

    it('should handle partial success scenarios gracefully', () => {
      // Even if we have warnings, a successful result should not include errors
      const result = validResult;

      if (result.success) {
        expect(result.initialState).toBeDefined();
        expect(result.errors).toBeUndefined();
      }
    });
  });
});
