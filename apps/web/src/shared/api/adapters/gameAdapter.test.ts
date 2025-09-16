/**
 * @file Game Adapter Tests
 * Tests for Game adapter that integrates use cases following TDD approach.
 */

import type {
  StartNewGame,
  RecordAtBat,
  SubstitutePlayer,
  UndoLastAction,
  RedoLastAction,
  EndInning,
  GameRepository,
  EventStore,
  Logger,
  GameStartResult,
  AtBatResult,
  SubstitutionResult,
  UndoResult,
  RedoResult,
  InningEndResult,
  GameStateDTO,
} from '@twsoftball/application';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

import { GameAdapter, type GameAdapterConfig } from './gameAdapter';

// Mock all use cases
const mockStartNewGame = {
  execute: vi.fn(),
} as unknown as StartNewGame;

const mockRecordAtBat = {
  execute: vi.fn(),
} as unknown as RecordAtBat;

const mockSubstitutePlayer = {
  execute: vi.fn(),
} as unknown as SubstitutePlayer;

const mockUndoLastAction = {
  execute: vi.fn(),
} as unknown as UndoLastAction;

const mockRedoLastAction = {
  execute: vi.fn(),
} as unknown as RedoLastAction;

const mockEndInning = {
  execute: vi.fn(),
} as unknown as EndInning;

const mockGameRepository = {
  findById: vi.fn(),
  save: vi.fn(),
  findByStatus: vi.fn(),
  findByDateRange: vi.fn(),
  exists: vi.fn(),
  delete: vi.fn(),
} as unknown as GameRepository;

const mockEventStore = {
  getEvents: vi.fn(),
  saveEvent: vi.fn(),
  getEventsByAggregateId: vi.fn(),
} as unknown as EventStore;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as Logger;

describe('GameAdapter', () => {
  let gameAdapter: GameAdapter;
  let config: GameAdapterConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      startNewGame: mockStartNewGame,
      recordAtBat: mockRecordAtBat,
      substitutePlayer: mockSubstitutePlayer,
      undoLastAction: mockUndoLastAction,
      redoLastAction: mockRedoLastAction,
      endInning: mockEndInning,
      gameRepository: mockGameRepository,
      eventStore: mockEventStore,
      logger: mockLogger,
    };

    gameAdapter = new GameAdapter(config);
  });

  describe('startNewGame', () => {
    it('should execute StartNewGame use case with UI data', async () => {
      const mockResult: GameStartResult = {
        success: true,
        gameId: { value: 'test-game-id' },
        initialState: {
          status: 'NOT_STARTED',
          score: { homeScore: 0, awayScore: 0 },
          currentInning: 1,
          topOfInning: true,
        },
      } as GameStartResult;

      (mockStartNewGame.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'test-game-id',
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        homeLineup: [{ playerId: 'p1', name: 'Player 1', position: 'P', jerseyNumber: 1 }],
        awayLineup: [{ playerId: 'p2', name: 'Player 2', position: 'C', jerseyNumber: 2 }],
      };

      const result = await gameAdapter.startNewGame(uiData);

      expect(mockStartNewGame.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'test-game-id' }),
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
        })
      );

      expect(result).toEqual(mockResult);
    });

    it('should handle use case errors gracefully', async () => {
      const error = new Error('Game already exists');
      (mockStartNewGame.execute as MockedFunction<unknown>).mockRejectedValue(error);

      const uiData = {
        gameId: 'duplicate-game-id',
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        homeLineup: [{ playerId: 'p1', name: 'Player 1', position: 'P', jerseyNumber: 1 }],
        awayLineup: [{ playerId: 'p2', name: 'Player 2', position: 'C', jerseyNumber: 2 }],
      };

      await expect(gameAdapter.startNewGame(uiData)).rejects.toThrow('Game already exists');
    });
  });

  describe('recordAtBat', () => {
    it('should execute RecordAtBat use case with UI data', async () => {
      const mockResult: AtBatResult = {
        success: true,
        atBatSequenceId: 'seq-1',
        batterId: { value: 'player-1' },
        result: 'SINGLE',
        runsScored: 1,
        updatedGameState: {
          gameId: { value: 'game-1' },
          status: 'IN_PROGRESS',
          score: { home: 1, away: 0 },
          currentInning: 1,
          isTopHalf: false,
          homeLineup: { teamName: 'Home Team' },
          awayLineup: { teamName: 'Away Team' },
        } as GameStateDTO,
      };

      (mockRecordAtBat.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'game-1',
        batterId: 'player-1',
        result: 'SINGLE',
        runnerAdvances: [],
      };

      const result = await gameAdapter.recordAtBat(uiData);

      expect(mockRecordAtBat.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'game-1' }),
          batterId: expect.objectContaining({ value: 'player-1' }),
        })
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('substitutePlayer', () => {
    it('should execute SubstitutePlayer use case with UI data', async () => {
      const mockResult: SubstitutionResult = {
        success: true,
        substitutionId: 'sub-1',
        updatedLineup: [],
      };

      (mockSubstitutePlayer.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'game-1',
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'player-2',
        newPosition: 'RF',
      };

      const result = await gameAdapter.substitutePlayer(uiData);

      expect(mockSubstitutePlayer.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'game-1' }),
          outgoingPlayerId: expect.objectContaining({ value: 'player-1' }),
          incomingPlayerId: expect.objectContaining({ value: 'player-2' }),
        })
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('undoLastAction', () => {
    it('should execute UndoLastAction use case', async () => {
      const mockResult: UndoResult = {
        success: true,
        actionUndone: 'AT_BAT',
        updatedGameState: {
          gameId: { value: 'game-1' },
          status: 'IN_PROGRESS',
          score: { home: 0, away: 1 },
          currentInning: 1,
          isTopHalf: true,
          homeLineup: { teamName: 'Home Team' },
          awayLineup: { teamName: 'Away Team' },
        } as GameStateDTO,
      };

      (mockUndoLastAction.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'game-1',
      };

      const result = await gameAdapter.undoLastAction(uiData);

      expect(mockUndoLastAction.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'game-1' }),
        })
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('redoLastAction', () => {
    it('should execute RedoLastAction use case', async () => {
      const mockResult: RedoResult = {
        success: true,
        actionRedone: 'AT_BAT',
        updatedGameState: {
          gameId: { value: 'game-1' },
          status: 'IN_PROGRESS',
          score: { home: 1, away: 1 },
          currentInning: 1,
          isTopHalf: false,
          homeLineup: { teamName: 'Home Team' },
          awayLineup: { teamName: 'Away Team' },
        } as GameStateDTO,
      };

      (mockRedoLastAction.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'game-1',
      };

      const result = await gameAdapter.redoLastAction(uiData);

      expect(mockRedoLastAction.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'game-1' }),
        })
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('endInning', () => {
    it('should execute EndInning use case', async () => {
      const mockResult: InningEndResult = {
        success: true,
        inningNumber: 1,
        finalScore: { homeScore: 3, awayScore: 2 },
        updatedGameState: {
          gameId: { value: 'game-1' },
          status: 'IN_PROGRESS',
          score: { home: 3, away: 2 },
          currentInning: 2,
          isTopHalf: true,
          homeLineup: { teamName: 'Home Team' },
          awayLineup: { teamName: 'Away Team' },
        } as GameStateDTO,
      };

      (mockEndInning.execute as MockedFunction<unknown>).mockResolvedValue(mockResult);

      const uiData = {
        gameId: 'game-1',
      };

      const result = await gameAdapter.endInning(uiData);

      expect(mockEndInning.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: 'game-1' }),
        })
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('toUIGameState', () => {
    it('should convert application DTOs to UI state format', () => {
      const applicationState = {
        gameId: { value: 'game-1' },
        status: 'IN_PROGRESS',
        score: { home: 5, away: 3 },
        currentInning: 7,
        isTopHalf: false,
        homeLineup: { teamName: 'Home Team' },
        awayLineup: { teamName: 'Away Team' },
      } as GameStateDTO;

      const uiState = gameAdapter.toUIGameState(applicationState);

      expect(uiState).toEqual({
        gameId: 'game-1',
        status: 'IN_PROGRESS',
        score: {
          home: 5,
          away: 3,
        },
        inning: {
          number: 7,
          half: 'bottom',
        },
        teams: {
          home: { name: 'Home Team' },
          away: { name: 'Away Team' },
        },
      });
    });

    it('should handle top of inning correctly', () => {
      const applicationState = {
        gameId: { value: 'game-1' },
        currentInning: 3,
        isTopHalf: true,
      } as GameStateDTO;

      const uiState = gameAdapter.toUIGameState(applicationState);

      expect(uiState.inning).toEqual({
        number: 3,
        half: 'top',
      });
    });
  });

  describe('error handling', () => {
    it('should propagate use case errors', async () => {
      const error = new Error('Domain validation error');
      (mockStartNewGame.execute as MockedFunction<unknown>).mockRejectedValue(error);

      const uiData = {
        gameId: 'invalid-game',
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        homeLineup: [{ playerId: 'p1', name: 'Player 1', position: 'P', jerseyNumber: 1 }],
        awayLineup: [{ playerId: 'p2', name: 'Player 2', position: 'C', jerseyNumber: 2 }],
      };

      await expect(gameAdapter.startNewGame(uiData)).rejects.toThrow('Domain validation error');
    });

    it('should log errors appropriately', async () => {
      const error = new Error('Infrastructure error');
      (mockRecordAtBat.execute as MockedFunction<unknown>).mockRejectedValue(error);

      const uiData = {
        gameId: 'game-1',
        batterId: 'player-1',
        result: 'SINGLE',
        runnerAdvances: [],
      };

      await expect(gameAdapter.recordAtBat(uiData)).rejects.toThrow('Infrastructure error');
    });
  });
});
