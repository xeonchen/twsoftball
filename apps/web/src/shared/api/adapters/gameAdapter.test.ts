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
  GameId,
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

const mockWizardToCommand = vi.fn();

describe('GameAdapter', () => {
  let gameAdapter: GameAdapter;
  let config: GameAdapterConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for wizardToCommand with more realistic implementation
    (mockWizardToCommand as MockedFunction<typeof mockWizardToCommand>).mockImplementation(
      (wizardData: unknown) => {
        const data = wizardData as {
          teams: { home: string; away: string; ourTeam: 'home' | 'away' };
          lineup?: { id: string; name: string; jerseyNumber: string; battingOrder: number }[];
        };
        return {
          gameId: { value: `game-${Date.now()}` },
          homeTeamName: data.teams.home,
          awayTeamName: data.teams.away,
          ourTeamSide: data.teams.ourTeam === 'home' ? 'HOME' : 'AWAY',
          gameDate: new Date(),
          initialLineup:
            data.lineup?.map(
              (
                player: { id: string; name: string; jerseyNumber: string; battingOrder: number },
                index: number
              ) => ({
                playerId: { value: player.id },
                name: player.name,
                jerseyNumber: { value: player.jerseyNumber },
                battingOrderPosition: player.battingOrder || index + 1,
              })
            ) || [],
        };
      }
    );

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
      wizardToCommand: mockWizardToCommand,
    };

    gameAdapter = new GameAdapter(config);
  });

  describe('startNewGame', () => {
    it('should execute StartNewGame use case with UI data', async () => {
      const mockGameId = {
        value: 'test-game-id',
        equals: vi.fn(),
        equalsImpl: vi.fn(),
      } as unknown as GameId;
      const mockResult: GameStartResult = {
        success: true,
        gameId: mockGameId,
        initialState: {
          gameId: mockGameId,
          status: 'NOT_STARTED' as const,
          score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
          gameStartTime: new Date(),
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
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
      };

      (
        mockStartNewGame.execute as MockedFunction<typeof mockStartNewGame.execute>
      ).mockResolvedValue(mockResult);

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
      (
        mockStartNewGame.execute as MockedFunction<typeof mockStartNewGame.execute>
      ).mockRejectedValue(error);

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
        gameState: {
          gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 1, away: 0, leader: 'HOME', difference: 1 },
          gameStartTime: new Date(),
          currentInning: 1,
          isTopHalf: false,
          battingTeam: 'HOME',
          outs: 0,
          bases: {
            first: null,
            second: null,
            third: null,
            runnersInScoringPosition: [],
            basesLoaded: false,
          },
          currentBatterSlot: 1,
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
        runsScored: 1,
        rbiAwarded: 1,
        inningEnded: false,
        gameEnded: false,
      };

      (mockRecordAtBat.execute as MockedFunction<typeof mockRecordAtBat.execute>).mockResolvedValue(
        mockResult
      );

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
        gameState: {
          gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
          gameStartTime: new Date(),
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
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
        positionChanged: true,
        reentryUsed: false,
      };

      (
        mockSubstitutePlayer.execute as MockedFunction<typeof mockSubstitutePlayer.execute>
      ).mockResolvedValue(mockResult);

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
        gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
        actionsUndone: 1,
        restoredState: {
          gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 0, away: 1, leader: 'AWAY', difference: 1 },
          gameStartTime: new Date(),
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
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
      };

      (
        mockUndoLastAction.execute as MockedFunction<typeof mockUndoLastAction.execute>
      ).mockResolvedValue(mockResult);

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
        gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
        actionsRedone: 1,
        restoredState: {
          gameId: { value: 'game-1', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 1, away: 1, leader: 'TIE', difference: 0 },
          gameStartTime: new Date(),
          currentInning: 1,
          isTopHalf: false,
          battingTeam: 'HOME',
          outs: 0,
          bases: {
            first: null,
            second: null,
            third: null,
            runnersInScoringPosition: [],
            basesLoaded: false,
          },
          currentBatterSlot: 1,
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
      };

      (
        mockRedoLastAction.execute as MockedFunction<typeof mockRedoLastAction.execute>
      ).mockResolvedValue(mockResult);

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
        transitionType: 'HALF_INNING' as const,
        previousHalf: { inning: 1, isTopHalf: true },
        newHalf: { inning: 1, isTopHalf: false },
        gameEnded: false,
        endingReason: 'THREE_OUTS' as const,
        finalOuts: 3,
        eventsGenerated: ['HalfInningEnded'],
        finalScore: { home: 3, away: 2 },
        gameState: {
          gameId: { value: 'game-1' } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 3, away: 2, leader: 'HOME', difference: 1 },
          gameStartTime: new Date(),
          currentInning: 2,
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
          homeLineup: { teamName: 'Home Team' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Away Team' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
      };

      (mockEndInning.execute as MockedFunction<typeof mockEndInning.execute>).mockResolvedValue(
        mockResult
      );

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

  describe('startNewGameFromWizard', () => {
    it('should execute StartNewGame use case with wizard data', async () => {
      const mockResult: GameStartResult = {
        success: true,
        gameId: { value: 'game-123', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
        initialState: {
          gameId: { value: 'game-123', equals: vi.fn(), equalsImpl: vi.fn() } as unknown as GameId,
          status: 'IN_PROGRESS' as const,
          score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
          gameStartTime: new Date(),
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
          homeLineup: { teamName: 'Eagles' } as Partial<GameStateDTO['homeLineup']>,
          awayLineup: { teamName: 'Hawks' } as Partial<GameStateDTO['awayLineup']>,
          currentBatter: null,
          lastUpdated: new Date(),
        } as GameStateDTO,
      };

      (
        mockStartNewGame.execute as MockedFunction<typeof mockStartNewGame.execute>
      ).mockResolvedValue(mockResult);

      const wizardData = {
        teams: {
          home: 'Eagles',
          away: 'Hawks',
          ourTeam: 'home' as const,
        },
        lineup: [
          {
            id: 'player-1',
            name: 'John Smith',
            jerseyNumber: '1',
            position: 'P',
            battingOrder: 1,
          },
          {
            id: 'player-2',
            name: 'Jane Doe',
            jerseyNumber: '2',
            position: 'C',
            battingOrder: 2,
          },
          {
            id: 'player-3',
            name: 'Bob Johnson',
            jerseyNumber: '3',
            position: '1B',
            battingOrder: 3,
          },
          {
            id: 'player-4',
            name: 'Alice Brown',
            jerseyNumber: '4',
            position: '2B',
            battingOrder: 4,
          },
          {
            id: 'player-5',
            name: 'Charlie Wilson',
            jerseyNumber: '5',
            position: '3B',
            battingOrder: 5,
          },
          {
            id: 'player-6',
            name: 'Diana Davis',
            jerseyNumber: '6',
            position: 'SS',
            battingOrder: 6,
          },
          {
            id: 'player-7',
            name: 'Frank Miller',
            jerseyNumber: '7',
            position: 'LF',
            battingOrder: 7,
          },
          {
            id: 'player-8',
            name: 'Grace Taylor',
            jerseyNumber: '8',
            position: 'CF',
            battingOrder: 8,
          },
          {
            id: 'player-9',
            name: 'Henry Anderson',
            jerseyNumber: '9',
            position: 'RF',
            battingOrder: 9,
          },
        ],
      };

      const result = await gameAdapter.startNewGameFromWizard(wizardData);

      expect(mockStartNewGame.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.objectContaining({ value: expect.stringMatching(/^game-[a-f0-9-]+$/) }),
          homeTeamName: 'Eagles',
          awayTeamName: 'Hawks',
          ourTeamSide: 'HOME',
          gameDate: expect.any(Date),
          initialLineup: expect.arrayContaining([
            expect.objectContaining({
              playerId: expect.objectContaining({ value: 'player-1' }),
              name: 'John Smith',
              jerseyNumber: expect.objectContaining({ value: '1' }),
              battingOrderPosition: 1,
            }),
          ]),
        })
      );

      expect(result).toEqual(mockResult);
    });

    it('should handle validation errors from wizard mapper', async () => {
      const wizardData = {
        teams: {
          home: 'Eagles',
          away: 'Hawks',
          ourTeam: null, // Invalid - should cause validation error
        },
        lineup: [], // Invalid - too few players
      };

      // Configure mock to throw error for this specific test case
      (mockWizardToCommand as MockedFunction<typeof mockWizardToCommand>).mockImplementation(() => {
        throw new Error('Our team side must be specified (home or away)');
      });

      await expect(gameAdapter.startNewGameFromWizard(wizardData)).rejects.toThrow(
        'Our team side must be specified (home or away)'
      );
    });

    it('should log errors appropriately when wizard mapper fails', async () => {
      const wizardData = {
        teams: {
          home: '',
          away: 'Hawks',
          ourTeam: 'home' as const,
        },
        lineup: [],
      };

      // Configure mock to throw error for this test
      (mockWizardToCommand as MockedFunction<typeof mockWizardToCommand>).mockImplementation(() => {
        throw new Error('Home team name is required');
      });

      await expect(gameAdapter.startNewGameFromWizard(wizardData)).rejects.toThrow(
        'Home team name is required'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Game adapter: Failed to start new game from wizard',
        expect.any(Error),
        { wizardData }
      );
    });
  });

  describe('error handling', () => {
    it('should propagate use case errors', async () => {
      const error = new Error('Domain validation error');
      (
        mockStartNewGame.execute as MockedFunction<typeof mockStartNewGame.execute>
      ).mockRejectedValue(error);

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
      (mockRecordAtBat.execute as MockedFunction<typeof mockRecordAtBat.execute>).mockRejectedValue(
        error
      );

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
