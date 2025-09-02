/**
 * @file GameStateDTO Tests
 * Tests for the composite DTO representing complete game state across all aggregates.
 * This DTO combines data from Game, TeamLineup, and InningState aggregates.
 */

import {
  GameId,
  PlayerId,
  TeamLineupId,
  GameStatus,
  JerseyNumber,
  FieldPosition,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { BasesStateDTO } from './BasesStateDTO';
import { GameScoreDTO } from './GameScoreDTO';
import { GameStateDTO } from './GameStateDTO';
import { TeamLineupDTO } from './TeamLineupDTO';

describe('GameStateDTO', () => {
  let validGameStateData: GameStateDTO;
  let homeLineup: TeamLineupDTO;
  let awayLineup: TeamLineupDTO;
  let basesState: BasesStateDTO;
  let gameScore: GameScoreDTO;

  beforeEach(() => {
    // Mock bases state
    basesState = {
      first: PlayerId.generate(),
      second: null,
      third: PlayerId.generate(),
      runnersInScoringPosition: [PlayerId.generate()],
      basesLoaded: false,
    };

    // Mock game score
    gameScore = {
      home: 5,
      away: 3,
      leader: 'HOME',
      difference: 2,
    };

    // Mock team lineups
    homeLineup = {
      teamLineupId: TeamLineupId.generate(),
      gameId: GameId.generate(),
      teamSide: 'HOME',
      teamName: 'Home Team',
      strategy: 'DETAILED',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    };

    awayLineup = {
      teamLineupId: TeamLineupId.generate(),
      gameId: GameId.generate(),
      teamSide: 'AWAY',
      teamName: 'Away Team',
      strategy: 'SIMPLE',
      battingSlots: [],
      fieldPositions: {} as Record<FieldPosition, PlayerId | null>,
      benchPlayers: [],
      substitutionHistory: [],
    };

    // Valid game state data
    validGameStateData = {
      gameId: GameId.generate(),
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
        name: 'John Smith',
        jerseyNumber: JerseyNumber.fromNumber(15),
        battingOrderPosition: 4,
        currentFieldPosition: FieldPosition.FIRST_BASE,
        preferredPositions: [FieldPosition.FIRST_BASE, FieldPosition.LEFT_FIELD],
        plateAppearances: [],
        statistics: {
          playerId: PlayerId.generate(),
          name: 'John Smith',
          jerseyNumber: JerseyNumber.fromNumber(15),
          plateAppearances: 2,
          atBats: 2,
          hits: 1,
          singles: 1,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          walks: 0,
          strikeouts: 1,
          rbi: 1,
          runs: 0,
          battingAverage: 0.5,
          onBasePercentage: 0.5,
          sluggingPercentage: 0.5,
          fielding: {
            positions: [FieldPosition.FIRST_BASE],
            putouts: 3,
            assists: 1,
            errors: 0,
            fieldingPercentage: 1.0,
          },
        },
      },
      lastUpdated: new Date('2024-08-30T15:30:00Z'),
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid GameStateDTO with all required fields', () => {
      const gameState = validGameStateData;

      expect(gameState.gameId).toBeInstanceOf(GameId);
      expect(gameState.status).toBe(GameStatus.IN_PROGRESS);
      expect(gameState.score).toEqual(gameScore);
      expect(gameState.gameStartTime).toBeInstanceOf(Date);
      expect(gameState.currentInning).toBe(3);
      expect(gameState.isTopHalf).toBe(false);
      expect(gameState.battingTeam).toBe('HOME');
      expect(gameState.outs).toBe(1);
      expect(gameState.bases).toEqual(basesState);
      expect(gameState.currentBatterSlot).toBe(4);
      expect(gameState.homeLineup).toEqual(homeLineup);
      expect(gameState.awayLineup).toEqual(awayLineup);
      expect(gameState.currentBatter).toBeDefined();
      expect(gameState.lastUpdated).toBeInstanceOf(Date);
    });

    it('should support null current batter when nobody is batting', () => {
      const gameState = {
        ...validGameStateData,
        currentBatter: null,
      };

      expect(gameState.currentBatter).toBeNull();
    });

    it('should maintain proper types for all fields', () => {
      const gameState = validGameStateData;

      expect(typeof gameState.currentInning).toBe('number');
      expect(typeof gameState.isTopHalf).toBe('boolean');
      expect(typeof gameState.battingTeam).toBe('string');
      expect(typeof gameState.outs).toBe('number');
      expect(typeof gameState.currentBatterSlot).toBe('number');
      expect(gameState.battingTeam).toMatch(/^(HOME|AWAY)$/);
    });
  });

  describe('Aggregate Composition', () => {
    it('should combine data from Game aggregate properly', () => {
      const gameState = validGameStateData;

      // Game aggregate fields
      expect(gameState.gameId).toBeInstanceOf(GameId);
      expect(gameState.status).toBe(GameStatus.IN_PROGRESS);
      expect(gameState.score).toEqual(gameScore);
      expect(gameState.gameStartTime).toBeInstanceOf(Date);
    });

    it('should combine data from InningState aggregate properly', () => {
      const gameState = validGameStateData;

      // InningState aggregate fields
      expect(gameState.currentInning).toBe(3);
      expect(gameState.isTopHalf).toBe(false);
      expect(gameState.battingTeam).toBe('HOME');
      expect(gameState.outs).toBe(1);
      expect(gameState.bases).toEqual(basesState);
      expect(gameState.currentBatterSlot).toBe(4);
    });

    it('should combine data from both TeamLineup aggregates properly', () => {
      const gameState = validGameStateData;

      // TeamLineup aggregates
      expect(gameState.homeLineup).toEqual(homeLineup);
      expect(gameState.awayLineup).toEqual(awayLineup);
      expect(gameState.homeLineup.teamSide).toBe('HOME');
      expect(gameState.awayLineup.teamSide).toBe('AWAY');
    });

    it('should include composite calculated fields', () => {
      const gameState = validGameStateData;

      expect(gameState.currentBatter).toBeDefined();
      expect(gameState.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Game State Scenarios', () => {
    it('should handle beginning of game state', () => {
      const beginningState = {
        ...validGameStateData,
        currentInning: 1,
        isTopHalf: true,
        battingTeam: 'AWAY' as const,
        outs: 0,
        currentBatterSlot: 1,
        bases: {
          first: null,
          second: null,
          third: null,
          runnersInScoringPosition: [],
          basesLoaded: false,
        },
        score: {
          home: 0,
          away: 0,
          leader: 'TIE' as const,
          difference: 0,
        },
      };

      expect(beginningState.currentInning).toBe(1);
      expect(beginningState.isTopHalf).toBe(true);
      expect(beginningState.battingTeam).toBe('AWAY');
      expect(beginningState.outs).toBe(0);
      expect(beginningState.bases.first).toBeNull();
      expect(beginningState.score.leader).toBe('TIE');
    });

    it('should handle bases loaded situation', () => {
      const basesLoadedBases = {
        first: PlayerId.generate(),
        second: PlayerId.generate(),
        third: PlayerId.generate(),
        runnersInScoringPosition: [PlayerId.generate(), PlayerId.generate()],
        basesLoaded: true,
      };

      const basesLoadedState = {
        ...validGameStateData,
        bases: basesLoadedBases,
      };

      expect(basesLoadedState.bases.basesLoaded).toBe(true);
      expect(basesLoadedState.bases.first).toBeInstanceOf(PlayerId);
      expect(basesLoadedState.bases.second).toBeInstanceOf(PlayerId);
      expect(basesLoadedState.bases.third).toBeInstanceOf(PlayerId);
      expect(basesLoadedState.bases.runnersInScoringPosition).toHaveLength(2);
    });

    it('should handle end of inning state (2 outs)', () => {
      const endOfInningState = {
        ...validGameStateData,
        outs: 2,
      };

      expect(endOfInningState.outs).toBe(2);
    });

    it('should handle game completion state', () => {
      const completedGameState = {
        ...validGameStateData,
        status: GameStatus.COMPLETED,
        currentInning: 7,
        isTopHalf: false,
      };

      expect(completedGameState.status).toBe(GameStatus.COMPLETED);
      expect(completedGameState.currentInning).toBe(7);
    });
  });

  describe('Team Side Logic', () => {
    it('should correctly identify battingTeam matches lineup sides', () => {
      const gameState = validGameStateData;

      if (gameState.battingTeam === 'HOME') {
        expect(gameState.homeLineup.teamSide).toBe('HOME');
      } else {
        expect(gameState.awayLineup.teamSide).toBe('AWAY');
      }
    });

    it('should handle top half inning (away team batting)', () => {
      const topHalfState = {
        ...validGameStateData,
        isTopHalf: true,
        battingTeam: 'AWAY' as const,
      };

      expect(topHalfState.isTopHalf).toBe(true);
      expect(topHalfState.battingTeam).toBe('AWAY');
    });

    it('should handle bottom half inning (home team batting)', () => {
      const bottomHalfState = {
        ...validGameStateData,
        isTopHalf: false,
        battingTeam: 'HOME' as const,
      };

      expect(bottomHalfState.isTopHalf).toBe(false);
      expect(bottomHalfState.battingTeam).toBe('HOME');
    });
  });

  describe('Timestamp Handling', () => {
    it('should maintain chronological order of timestamps', () => {
      const gameState = validGameStateData;

      expect(gameState.gameStartTime.getTime()).toBeLessThan(gameState.lastUpdated.getTime());
    });

    it('should handle recent timestamps', () => {
      const recentUpdate = new Date();
      const gameState = {
        ...validGameStateData,
        lastUpdated: recentUpdate,
      };

      expect(gameState.lastUpdated).toEqual(recentUpdate);
    });
  });

  describe('Integration with Domain Types', () => {
    it('should properly use domain value objects', () => {
      const gameState = validGameStateData;

      expect(gameState.gameId).toBeInstanceOf(GameId);
      expect(gameState.homeLineup.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(gameState.awayLineup.teamLineupId).toBeInstanceOf(TeamLineupId);

      if (gameState.currentBatter) {
        expect(gameState.currentBatter.playerId).toBeInstanceOf(PlayerId);
        expect(gameState.currentBatter.jerseyNumber).toBeInstanceOf(JerseyNumber);
      }

      if (gameState.bases.first) {
        expect(gameState.bases.first).toBeInstanceOf(PlayerId);
      }
    });

    it('should maintain domain constraints', () => {
      const gameState = validGameStateData;

      expect(gameState.outs).toBeGreaterThanOrEqual(0);
      expect(gameState.outs).toBeLessThanOrEqual(2); // Can't have 3 outs in middle of inning
      expect(gameState.currentInning).toBeGreaterThan(0);
      expect(gameState.currentBatterSlot).toBeGreaterThan(0);
      expect(gameState.currentBatterSlot).toBeLessThanOrEqual(20); // Max lineup size
    });
  });
});
