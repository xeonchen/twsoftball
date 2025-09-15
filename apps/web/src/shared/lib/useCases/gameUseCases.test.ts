import { renderHook, act } from '@testing-library/react';

import { useGameStore } from '../store/gameStore';

import { useGameUseCases, setUseCaseDependencies, resetUseCaseDependencies } from './gameUseCases';

/**
 * Game Use Cases Integration Tests
 *
 * Tests the integration layer between web app and domain layer.
 * Following TDD approach to ensure proper adapter functionality.
 *
 * These tests verify:
 * 1. StartGameUseCase integration
 * 2. RecordAtBatUseCase integration
 * 3. SubstitutePlayerUseCase integration
 * 4. Error handling and state management
 * 5. Domain event handling
 *
 * Uses dependency injection for clean testing.
 */

// Mock the game store
vi.mock('../store/gameStore');
const mockUseGameStore = vi.mocked(useGameStore);

// Mock domain layer functions
const mockStartGameUseCase = vi.fn();
const mockRecordAtBatUseCase = vi.fn();
const mockSubstitutePlayerUseCase = vi.fn();

describe('Game Use Cases Integration', () => {
  // Mock store functions
  const mockStartActiveGame = vi.fn();
  const mockSetCurrentBatter = vi.fn();
  const mockSetBaseRunner = vi.fn();
  const mockUpdateScore = vi.fn();
  const mockSetError = vi.fn();
  const mockSetLoading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock dependencies
    setUseCaseDependencies({
      startGameUseCase: mockStartGameUseCase,
      recordAtBatUseCase: mockRecordAtBatUseCase,
      substitutePlayerUseCase: mockSubstitutePlayerUseCase,
    });

    // Setup mock store
    mockUseGameStore.mockReturnValue({
      currentGame: null,
      activeGameState: null,
      isGameActive: false,
      setupWizard: {
        step: null,
        teams: { home: '', away: '', ourTeam: null },
        lineup: [],
        isComplete: false,
      },
      isLoading: false,
      error: null,

      // Mock actions
      startActiveGame: mockStartActiveGame,
      setCurrentBatter: mockSetCurrentBatter,
      setBaseRunner: mockSetBaseRunner,
      updateScore: mockUpdateScore,
      setError: mockSetError,
      setLoading: mockSetLoading,

      // Other required actions (not used in these tests)
      setCurrentGame: vi.fn(),
      reset: vi.fn(),
      setSetupStep: vi.fn(),
      setTeams: vi.fn(),
      setLineup: vi.fn(),
      completeSetup: vi.fn(),
      isSetupStepValid: vi.fn(),
      clearBase: vi.fn(),
      advanceHalfInning: vi.fn(),
      addOut: vi.fn(),
    } as ReturnType<typeof useGameStore>);
  });

  afterEach(() => {
    resetUseCaseDependencies();
  });

  describe('StartGameUseCase Integration', () => {
    it('should start new game with domain layer', async () => {
      const { result } = renderHook(() => useGameUseCases());

      // Create valid lineup with 9 players
      const gameSetup = {
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        ourTeam: 'home' as const,
        lineup: Array.from({ length: 9 }, (_, i) => ({
          id: `player-${i + 1}`,
          name: `Player ${i + 1}`,
          jerseyNumber: `${i + 1}`,
          position: 'P',
          battingOrder: i + 1,
        })),
      };

      // Mock successful domain layer response
      const mockGameData = {
        id: 'game-123',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active' as const,
        homeScore: 0,
        awayScore: 0,
        currentInning: 1,
        isTopHalf: true,
      };

      mockStartGameUseCase.mockResolvedValue(mockGameData);

      // Execute use case
      await act(async () => {
        const gameId = await result.current.startGame(gameSetup);
        expect(gameId).toBe('game-123');
      });

      // Verify domain use case was called
      expect(mockStartGameUseCase).toHaveBeenCalledWith(gameSetup);

      // Verify store was updated
      expect(mockStartActiveGame).toHaveBeenCalledWith(mockGameData);
    });

    it('should handle start game errors', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const gameSetup = {
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        ourTeam: 'home' as const,
        lineup: [], // Intentionally empty to trigger validation error
      };

      // Mock domain error
      const domainError = new Error('Invalid lineup: minimum 9 players required');
      mockStartGameUseCase.mockRejectedValue(domainError);

      // Execute use case
      await act(async () => {
        await expect(result.current.startGame(gameSetup)).rejects.toThrow(domainError);
      });

      // Verify error was set in store
      expect(mockSetError).toHaveBeenCalledWith(domainError.message);
    });

    it('should handle loading states during game start', async () => {
      const { result } = renderHook(() => useGameUseCases());

      // Create valid lineup with 9 players
      const gameSetup = {
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        ourTeam: 'home' as const,
        lineup: Array.from({ length: 9 }, (_, i) => ({
          id: `player-${i + 1}`,
          name: `Player ${i + 1}`,
          jerseyNumber: `${i + 1}`,
          position: 'P',
          battingOrder: i + 1,
        })),
      };

      // Mock delayed response
      mockStartGameUseCase.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  id: 'game-123',
                  homeTeam: 'Warriors',
                  awayTeam: 'Eagles',
                  status: 'active' as const,
                }),
              100
            )
          )
      );

      // Execute use case
      const promise = act(async () => {
        return result.current.startGame(gameSetup);
      });

      // Verify loading was set
      expect(mockSetLoading).toHaveBeenCalledWith(true);

      await promise;

      // Verify loading was cleared
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('RecordAtBatUseCase Integration', () => {
    it('should record at-bat events', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const atBatData = {
        gameId: 'game-123',
        batterId: 'player-1',
        result: 'SINGLE' as const,
        advancement: {
          batter: 'first' as const,
          runners: [{ playerId: 'player-2', from: 'first' as const, to: 'second' as const }],
        },
      };

      // Mock successful at-bat recording
      const mockResult = {
        gameState: {
          bases: { first: { id: 'player-1' }, second: { id: 'player-2' }, third: null },
          score: { home: 1, away: 0 },
        },
        events: ['AtBatCompleted', 'RunScored'],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      // Execute use case
      await act(async () => {
        await result.current.recordAtBat(atBatData);
      });

      // Verify domain use case was called
      expect(mockRecordAtBatUseCase).toHaveBeenCalledWith(atBatData);

      // Verify store updates
      expect(mockSetBaseRunner).toHaveBeenCalledWith('first', {
        id: 'player-1',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
      expect(mockSetBaseRunner).toHaveBeenCalledWith('second', {
        id: 'player-2',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
      expect(mockUpdateScore).toHaveBeenCalledWith({ home: 1, away: 0 });
    });

    it('should handle at-bat recording errors', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const atBatData = {
        gameId: 'game-123',
        batterId: 'player-1',
        result: 'SINGLE' as const,
        advancement: { batter: 'first' as const, runners: [] },
      };

      // Mock domain error
      const domainError = new Error('Invalid game state');
      mockRecordAtBatUseCase.mockRejectedValue(domainError);

      // Execute use case
      await act(async () => {
        await expect(result.current.recordAtBat(atBatData)).rejects.toThrow(domainError);
      });

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith(domainError.message);
    });
  });

  describe('SubstitutePlayerUseCase Integration', () => {
    it('should handle player substitutions', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const substitutionData = {
        gameId: 'game-123',
        playerOut: { id: 'player-1', battingOrder: 4 },
        playerIn: { id: 'player-2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF' },
        position: 'CF',
      };

      // Mock successful substitution
      const mockResult = {
        success: true,
        newLineup: [
          {
            id: 'player-2',
            name: 'Jane Smith',
            jerseyNumber: '8',
            position: 'CF',
            battingOrder: 4,
          },
        ],
      };

      mockSubstitutePlayerUseCase.mockResolvedValue(mockResult);

      // Execute use case
      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      // Verify domain use case was called
      expect(mockSubstitutePlayerUseCase).toHaveBeenCalledWith(substitutionData);
    });

    it('should handle substitution rule violations', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const substitutionData = {
        gameId: 'game-123',
        playerOut: { id: 'player-1', battingOrder: 4 },
        playerIn: { id: 'player-2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF' },
        position: 'CF',
      };

      // Mock rule violation
      const ruleError = new Error('Player already substituted and cannot re-enter');
      mockSubstitutePlayerUseCase.mockRejectedValue(ruleError);

      // Execute use case
      await act(async () => {
        await expect(result.current.substitutePlayer(substitutionData)).rejects.toThrow(ruleError);
      });

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith(ruleError.message);
    });
  });

  describe('Error Handling and State Management', () => {
    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useGameUseCases());

      // Test validation error (empty lineup)
      const validationError = new Error('Invalid lineup: minimum 9 players required');
      mockStartGameUseCase.mockRejectedValue(validationError);

      await act(async () => {
        await expect(
          result.current.startGame({
            homeTeam: 'Warriors',
            awayTeam: 'Eagles',
            ourTeam: 'home',
            lineup: [],
          })
        ).rejects.toThrow(validationError);
      });

      expect(mockSetError).toHaveBeenCalledWith(validationError.message);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useGameUseCases());

      // Create valid lineup with 9 players
      const validLineup = Array.from({ length: 9 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        jerseyNumber: `${i}`,
        position: 'P',
        battingOrder: i + 1,
      }));

      // Mock successful response
      const mockGameData = {
        id: 'game-123',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active' as const,
        homeScore: 0,
        awayScore: 0,
        currentInning: 1,
        isTopHalf: true,
      };
      mockStartGameUseCase.mockResolvedValue(mockGameData);

      await act(async () => {
        await result.current.startGame({
          homeTeam: 'Warriors',
          awayTeam: 'Eagles',
          ourTeam: 'home',
          lineup: validLineup,
        });
      });

      // Should clear any previous errors
      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  describe('Domain Event Handling', () => {
    it('should handle domain events from use cases', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          score: { home: 1, away: 0 },
        },
        events: [
          { type: 'AtBatCompleted', data: { batterId: 'player-1', result: 'SINGLE' } },
          { type: 'RunScored', data: { teamSide: 'home' } },
        ],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'player-1',
          result: 'SINGLE',
          advancement: {
            batter: 'first',
            runners: [{ playerId: 'player-2', from: 'first', to: 'home' }],
          },
        });
      });

      // The score should be updated based on the mock result
      expect(mockUpdateScore).toHaveBeenCalledWith({ home: 1, away: 0 });
    });
  });
});
