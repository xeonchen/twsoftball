/**
 * @file DTO Mapper Tests
 * Tests for DTO mapper that converts Application DTOs to UI state following TDD approach.
 */

import type {
  GameStateDTO,
  TeamLineupDTO,
  PlayerInGameDTO,
  GameScoreDTO,
  AtBatResultDTO,
  BasesStateDTO,
} from '@twsoftball/application';
import { describe, it, expect } from 'vitest';

import {
  toUIGameState,
  toUITeamLineup,
  toUIPlayerList,
  toUIScore,
  toUIAtBatResult,
  toUIBasesState,
} from './dtoMapper';

describe('DTO Mapper', () => {
  describe('toUIGameState', () => {
    it('should convert GameStateDTO to UI-friendly format', () => {
      const gameStateDTO: GameStateDTO = {
        gameId: { value: 'game-123' },
        status: 'IN_PROGRESS',
        currentInning: 5,
        isTopHalf: false,
        score: { home: 7, away: 4 },
        homeLineup: {
          teamName: 'Eagles',
        },
        awayLineup: {
          teamName: 'Hawks',
        },
        gameStartTime: new Date('2024-09-16T20:00:00Z'),
        lastUpdated: new Date('2024-09-16T21:30:00Z'),
      } as GameStateDTO;

      const uiState = toUIGameState(gameStateDTO);

      expect(uiState).toEqual({
        gameId: 'game-123',
        status: 'IN_PROGRESS',
        inning: {
          number: 5,
          half: 'bottom',
        },
        score: {
          home: 7,
          away: 4,
          total: 11,
        },
        teams: {
          home: {
            name: 'Eagles',
            abbreviation: 'Eagles',
            color: '',
          },
          away: {
            name: 'Hawks',
            abbreviation: 'Hawks',
            color: '',
          },
        },
        timing: {
          created: '2024-09-16T20:00:00.000Z',
          lastModified: '2024-09-16T21:30:00.000Z',
        },
        currentBatter: null,
        bases: {
          first: null,
          second: null,
          third: null,
        },
        outs: 0,
        battingTeam: 'away',
      });
    });

    it('should handle top of inning correctly', () => {
      const gameStateDTO: GameStateDTO = {
        gameId: { value: 'top-inning-game' },
        currentInning: 3,
        isTopHalf: true,
        status: 'IN_PROGRESS',
      } as GameStateDTO;

      const uiState = toUIGameState(gameStateDTO);

      expect(uiState.inning).toEqual({
        number: 3,
        half: 'top',
      });
    });

    it('should handle missing or null fields gracefully', () => {
      const gameStateDTO: GameStateDTO = {
        gameId: { value: 'minimal-game' },
        status: 'NOT_STARTED',
      } as GameStateDTO;

      const uiState = toUIGameState(gameStateDTO);

      expect(uiState).toEqual({
        gameId: 'minimal-game',
        status: 'NOT_STARTED',
        inning: {
          number: 1,
          half: 'bottom',
        },
        score: {
          home: 0,
          away: 0,
          total: 0,
        },
        teams: {
          home: {
            name: '',
            abbreviation: '',
            color: '',
          },
          away: {
            name: '',
            abbreviation: '',
            color: '',
          },
        },
        timing: {
          created: '',
          lastModified: '',
        },
        currentBatter: null,
        bases: {
          first: null,
          second: null,
          third: null,
        },
        outs: 0,
        battingTeam: 'away',
      });
    });

    it('should handle various game statuses', () => {
      const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED'];

      statuses.forEach(status => {
        const dto: GameStateDTO = {
          gameId: { value: 'status-test' },
          status,
        } as GameStateDTO;

        const uiState = toUIGameState(dto);
        expect(uiState.status).toBe(status);
      });
    });
  });

  describe('toUITeamLineup', () => {
    it('should convert TeamLineupDTO to UI format', () => {
      const teamLineupDTO: TeamLineupDTO = {
        teamLineupId: { value: 'team-123' },
        teamName: 'Eagles',
        battingSlots: [
          {
            slotNumber: 1,
            currentPlayer: {
              playerId: { value: 'p1' },
              name: 'John Smith',
              currentFieldPosition: 'CF',
              jerseyNumber: { value: 15 },
            },
            history: [{ playerId: { value: 'p1' }, playerName: 'John Smith', enteredInning: 1 }], // Single history entry = starter
          },
          {
            slotNumber: 2,
            currentPlayer: {
              playerId: { value: 'p2' },
              name: 'Jane Doe',
              currentFieldPosition: 'SS',
              jerseyNumber: { value: 7 },
            },
            history: [{ playerId: { value: 'p2' }, playerName: 'Jane Doe', enteredInning: 1 }], // Single history entry = starter
          },
        ],
        substitutions: [],
      } as TeamLineupDTO;

      const uiLineup = toUITeamLineup(teamLineupDTO);

      expect(uiLineup).toEqual({
        teamId: 'team-123',
        teamName: 'Eagles',
        players: [
          {
            playerId: 'p1',
            name: 'John Smith',
            position: 'CF',
            jerseyNumber: 15,
            battingOrder: 1,
            isActive: true,
            isStarter: true,
          },
          {
            playerId: 'p2',
            name: 'Jane Doe',
            position: 'SS',
            jerseyNumber: 7,
            battingOrder: 2,
            isActive: true,
            isStarter: true,
          },
        ],
        substitutionCount: 0,
      });
    });

    it('should handle empty lineup', () => {
      const teamLineupDTO: TeamLineupDTO = {
        teamId: { value: 'empty-team' },
        teamName: 'Empty Team',
        battingOrder: [],
        substitutions: [],
      } as TeamLineupDTO;

      const uiLineup = toUITeamLineup(teamLineupDTO);

      expect(uiLineup.players).toEqual([]);
      expect(uiLineup.substitutionCount).toBe(0);
    });
  });

  describe('toUIPlayerList', () => {
    it('should convert array of PlayerInGameDTO to UI format', () => {
      const playersDTO: PlayerInGameDTO[] = [
        {
          playerId: { value: 'player-1' },
          name: 'Alice Johnson',
          currentFieldPosition: 'P',
          jerseyNumber: { value: 12 },
          battingOrderPosition: 5,
          isActive: true,
        } as PlayerInGameDTO,
        {
          playerId: { value: 'player-2' },
          name: 'Bob Wilson',
          currentFieldPosition: '1B',
          jerseyNumber: { value: 23 },
          battingOrderPosition: 3,
          // isActive property removed as it's computed in UI
        } as PlayerInGameDTO,
      ];

      const uiPlayers = toUIPlayerList(playersDTO);

      expect(uiPlayers).toEqual([
        {
          playerId: 'player-1',
          name: 'Alice Johnson',
          position: 'P',
          jerseyNumber: 12,
          battingOrder: 5,
          isActive: true,
          isStarter: false,
        },
        {
          playerId: 'player-2',
          name: 'Bob Wilson',
          position: '1B',
          jerseyNumber: 23,
          battingOrder: 3,
          isActive: true,
          isStarter: false,
        },
      ]);
    });

    it('should handle empty player list', () => {
      const uiPlayers = toUIPlayerList([]);
      expect(uiPlayers).toEqual([]);
    });
  });

  describe('toUIScore', () => {
    it('should convert GameScoreDTO to UI format with total', () => {
      const scoreDTO: GameScoreDTO = {
        home: 8,
        away: 5,
        inningScores: [
          { inning: 1, home: 2, away: 0 },
          { inning: 2, home: 1, away: 3 },
          { inning: 3, home: 5, away: 2 },
        ],
      };

      const uiScore = toUIScore(scoreDTO);

      expect(uiScore).toEqual({
        home: 8,
        away: 5,
        total: 13,
        byInning: [],
        differential: 3,
      });
    });

    it('should handle tied games', () => {
      const scoreDTO: GameScoreDTO = {
        home: 4,
        away: 4,
        inningScores: [],
      };

      const uiScore = toUIScore(scoreDTO);

      expect(uiScore.differential).toBe(0);
      expect(uiScore.total).toBe(8);
    });

    it('should handle away team leading', () => {
      const scoreDTO: GameScoreDTO = {
        home: 2,
        away: 6,
        inningScores: [],
      };

      const uiScore = toUIScore(scoreDTO);

      expect(uiScore.differential).toBe(-4);
    });
  });

  describe('toUIAtBatResult', () => {
    it('should convert AtBatResultDTO to UI format', () => {
      const atBatDTO: AtBatResultDTO = {
        batterId: { value: 'batter-1' },
        result: 'DOUBLE',
        rbi: 2,
        runnerAdvances: [
          { playerId: { value: 'runner-1' }, fromBase: 1, toBase: 4 },
          { playerId: { value: 'runner-2' }, fromBase: 2, toBase: 4 },
        ],
      } as AtBatResultDTO;

      const uiAtBat = toUIAtBatResult(atBatDTO);

      expect(uiAtBat).toEqual({
        batterId: 'batter-1',
        result: 'DOUBLE',
        description: 'DOUBLE',
        stats: {
          runsScored: 2,
          rbis: 2,
          basesAdvanced: 2,
          outs: 0,
          pitchCount: 0,
        },
        impact: 'positive',
      });
    });

    it('should determine neutral impact when no runs or rbis', () => {
      const atBatDTO: AtBatResultDTO = {
        batterId: { value: 'batter-2' },
        result: 'STRIKEOUT',
        rbi: 0,
        runnerAdvances: [],
      } as AtBatResultDTO;

      const uiAtBat = toUIAtBatResult(atBatDTO);

      expect(uiAtBat.impact).toBe('neutral');
    });

    it('should determine neutral impact for no runs or outs', () => {
      const atBatDTO: AtBatResultDTO = {
        batterId: { value: 'batter-3' },
        result: 'FOUL_BALL',
        runsScored: 0,
        rbis: 0,
        basesAdvanced: 1,
        outs: 0,
      } as AtBatResultDTO;

      const uiAtBat = toUIAtBatResult(atBatDTO);

      expect(uiAtBat.impact).toBe('neutral');
    });
  });

  describe('toUIBasesState', () => {
    it('should convert BasesStateDTO to UI format', () => {
      const basesDTO: BasesStateDTO = {
        first: { value: 'runner-1' },
        second: null,
        third: { value: 'runner-3' },
        runnersOnBase: [
          { playerId: { value: 'runner-1' }, base: 1 },
          { playerId: { value: 'runner-3' }, base: 3 },
        ],
      } as BasesStateDTO;

      const uiBases = toUIBasesState(basesDTO);

      expect(uiBases).toEqual({
        first: 'runner-1',
        second: null,
        third: 'runner-3',
        runners: [
          { playerId: 'runner-1', base: 1 },
          { playerId: 'runner-3', base: 3 },
        ],
        loadedBases: ['first', 'third'],
        runnerCount: 2,
      });
    });

    it('should handle empty bases', () => {
      const basesDTO: BasesStateDTO = {
        firstBase: null,
        secondBase: null,
        thirdBase: null,
        runnersOnBase: [],
      } as BasesStateDTO;

      const uiBases = toUIBasesState(basesDTO);

      expect(uiBases).toEqual({
        first: null,
        second: null,
        third: null,
        runners: [],
        loadedBases: [],
        runnerCount: 0,
      });
    });

    it('should handle bases loaded scenario', () => {
      const basesDTO: BasesStateDTO = {
        first: { value: 'r1' },
        second: { value: 'r2' },
        third: { value: 'r3' },
        runnersOnBase: [
          { playerId: { value: 'r1' }, base: 1 },
          { playerId: { value: 'r2' }, base: 2 },
          { playerId: { value: 'r3' }, base: 3 },
        ],
      } as BasesStateDTO;

      const uiBases = toUIBasesState(basesDTO);

      expect(uiBases.loadedBases).toEqual(['first', 'second', 'third']);
      expect(uiBases.runnerCount).toBe(3);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null/undefined values gracefully', () => {
      const nullDto = null as GameStateDTO | null;

      expect(() => toUIGameState(nullDto)).not.toThrow();
      expect(() => toUITeamLineup(nullDto)).not.toThrow();
      expect(() => toUIScore(nullDto)).not.toThrow();
    });

    it('should handle missing nested properties', () => {
      const incompleteGameState: GameStateDTO = {
        gameId: { value: 'incomplete' },
      } as GameStateDTO;

      const uiState = toUIGameState(incompleteGameState);

      expect(uiState.gameId).toBe('incomplete');
      expect(uiState.score.total).toBe(0);
    });
  });
});
