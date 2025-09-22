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

    it('should process different event types correctly', () => {
      const { result } = renderHook(() => useGameUseCases());

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Test all event type handlers
      act(() => {
        result.current.processDomainEvents([
          { type: 'AtBatCompleted', data: { batterId: 'player-1' } },
          { type: 'RunScored', data: { teamSide: 'home' } },
          { type: 'PlayerSubstituted', data: { playerIn: 'player-2' } },
          { type: 'InningChanged', data: { inning: 2 } },
          { type: 'UnknownEvent', data: { custom: 'data' } },
        ]);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('At-bat completed:', { batterId: 'player-1' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Run scored:', { teamSide: 'home' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Player substituted:', { playerIn: 'player-2' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Inning changed:', { inning: 2 });
      expect(consoleLogSpy).toHaveBeenCalledWith('Unknown domain event:', {
        type: 'UnknownEvent',
        data: { custom: 'data' },
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Helper Functions', () => {
    it('should return current batter', () => {
      const { result } = renderHook(() => useGameUseCases());

      const currentBatter = result.current.getCurrentBatter();

      expect(currentBatter).toEqual({
        id: 'player-1',
        name: 'John Doe',
        jerseyNumber: '12',
        position: 'SS',
        battingOrder: 1,
      });
    });

    it('should return next batter', () => {
      const { result } = renderHook(() => useGameUseCases());

      const nextBatter = result.current.getNextBatter();

      expect(nextBatter).toEqual({
        id: 'player-2',
        name: 'Jane Smith',
        jerseyNumber: '8',
        position: 'CF',
        battingOrder: 2,
      });
    });

    it('should validate substitution (mock implementation)', () => {
      const { result } = renderHook(() => useGameUseCases());

      const isValid = result.current.validateSubstitution({
        gameId: 'game-123',
        playerOut: { id: 'player-1', battingOrder: 4 },
        playerIn: { id: 'player-2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF' },
        position: 'CF',
      });

      expect(isValid).toBe(true);
    });
  });

  describe('Fallback to Mock Implementations', () => {
    beforeEach(() => {
      // Reset dependencies to test fallback behavior
      resetUseCaseDependencies();
    });

    it('should use mock StartGameUseCase when no dependency injected', async () => {
      const { result } = renderHook(() => useGameUseCases());

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

      await act(async () => {
        const gameId = await result.current.startGame(gameSetup);
        expect(gameId).toMatch(/^game-\d+$/); // Should match pattern game-[timestamp]
      });

      expect(mockStartActiveGame).toHaveBeenCalledWith(
        expect.objectContaining({
          homeTeam: 'Warriors',
          awayTeam: 'Eagles',
          status: 'active',
          homeScore: 0,
          awayScore: 0,
          currentInning: 1,
          isTopHalf: true,
        })
      );
    });

    it('should handle mock StartGameUseCase validation error', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const gameSetupWithInvalidLineup = {
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        ourTeam: 'home' as const,
        lineup: [], // Invalid: less than 9 players
      };

      await act(async () => {
        await expect(result.current.startGame(gameSetupWithInvalidLineup)).rejects.toThrow(
          'Invalid lineup: minimum 9 players required'
        );
      });

      expect(mockSetError).toHaveBeenCalledWith('Invalid lineup: minimum 9 players required');
    });

    it('should use mock RecordAtBatUseCase when no dependency injected', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const atBatData = {
        gameId: 'game-123',
        batterId: 'batter-1',
        result: 'SINGLE' as const,
        advancement: {
          batter: 'first' as const,
          runners: [{ playerId: 'runner-1', from: 'first' as const, to: 'second' as const }],
        },
      };

      await act(async () => {
        await result.current.recordAtBat(atBatData);
      });

      // Verify mock implementation behavior - should set bases for SINGLE
      expect(mockSetBaseRunner).toHaveBeenCalledWith('first', {
        id: 'batter-1',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
      expect(mockSetBaseRunner).toHaveBeenCalledWith('second', {
        id: 'runner-1',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
    });

    it('should handle runner scoring in mock RecordAtBatUseCase', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const atBatDataWithRunScoring = {
        gameId: 'game-123',
        batterId: 'batter-1',
        result: 'DOUBLE' as const,
        advancement: {
          batter: 'second' as const,
          runners: [{ playerId: 'runner-1', from: 'third' as const, to: 'home' as const }],
        },
      };

      await act(async () => {
        await result.current.recordAtBat(atBatDataWithRunScoring);
      });

      // Should update score when runner advances to home
      expect(mockUpdateScore).toHaveBeenCalledWith({ home: 1, away: 0 });
    });

    it('should use mock SubstitutePlayerUseCase when no dependency injected', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const substitutionData = {
        gameId: 'game-123',
        playerOut: { id: 'player-1', battingOrder: 4 },
        playerIn: { id: 'player-2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF' },
        position: 'CF',
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Player substitution completed:',
        substitutionData
      );
      consoleLogSpy.mockRestore();
    });

    it('should handle mock SubstitutePlayerUseCase error', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const invalidSubstitution = {
        gameId: 'game-123',
        playerOut: { id: 'player-1', battingOrder: 4 },
        playerIn: {
          id: 'invalid-player',
          name: 'Invalid Player',
          jerseyNumber: '8',
          position: 'CF',
        },
        position: 'CF',
      };

      await act(async () => {
        await expect(result.current.substitutePlayer(invalidSubstitution)).rejects.toThrow(
          'Player already substituted and cannot re-enter'
        );
      });

      expect(mockSetError).toHaveBeenCalledWith('Player already substituted and cannot re-enter');
    });
  });

  describe('Base Runner State Management', () => {
    it('should handle null base states correctly', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          bases: {
            first: null,
            second: { id: 'player-2' },
            third: null,
          },
        },
        events: [],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'player-1',
          result: 'OUT',
          advancement: { batter: 'out', runners: [] },
        });
      });

      // Should set null runners properly
      expect(mockSetBaseRunner).toHaveBeenCalledWith('first', null);
      expect(mockSetBaseRunner).toHaveBeenCalledWith('second', {
        id: 'player-2',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
      expect(mockSetBaseRunner).toHaveBeenCalledWith('third', null);
    });

    it('should handle cases where bases are undefined in game state', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          score: { home: 0, away: 1 },
          // bases is undefined
        },
        events: [],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'player-1',
          result: 'STRIKEOUT',
          advancement: { batter: 'out', runners: [] },
        });
      });

      // Should only update score, not attempt to set base runners
      expect(mockUpdateScore).toHaveBeenCalledWith({ home: 0, away: 1 });
      expect(mockSetBaseRunner).not.toHaveBeenCalled();
    });

    it('should handle partial base state updates', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          bases: {
            first: { id: 'player-1' },
            // second and third are undefined, not null
          },
        },
        events: [],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'player-1',
          result: 'SINGLE',
          advancement: { batter: 'first', runners: [] },
        });
      });

      // Should only update first base since others are undefined
      expect(mockSetBaseRunner).toHaveBeenCalledWith('first', {
        id: 'player-1',
        name: 'Mock Player',
        jerseyNumber: '0',
        position: 'P',
        battingOrder: 1,
      });
      expect(mockSetBaseRunner).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle string errors gracefully', async () => {
      const { result } = renderHook(() => useGameUseCases());

      mockStartGameUseCase.mockRejectedValue('String error message');

      await act(async () => {
        await expect(
          result.current.startGame({
            homeTeam: 'Warriors',
            awayTeam: 'Eagles',
            ourTeam: 'home',
            lineup: [],
          })
        ).rejects.toBe('String error message');
      });

      expect(mockSetError).toHaveBeenCalledWith('Unknown error');
    });

    it('should handle null/undefined errors', async () => {
      const { result } = renderHook(() => useGameUseCases());

      // Test null error
      mockRecordAtBatUseCase.mockRejectedValue(null);

      await act(async () => {
        await expect(
          result.current.recordAtBat({
            gameId: 'game-123',
            batterId: 'player-1',
            result: 'SINGLE',
            advancement: { batter: 'first', runners: [] },
          })
        ).rejects.toBe(null);
      });

      expect(mockSetError).toHaveBeenCalledWith('Unknown error');

      // Test undefined error
      mockSubstitutePlayerUseCase.mockRejectedValue(undefined);

      await act(async () => {
        await expect(
          result.current.substitutePlayer({
            gameId: 'game-123',
            playerOut: { id: 'player-1', battingOrder: 4 },
            playerIn: { id: 'player-2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF' },
            position: 'CF',
          })
        ).rejects.toBe(undefined);
      });

      expect(mockSetError).toHaveBeenCalledWith('Unknown error');
    });

    it('should handle objects without message property', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const errorObject = { code: 500, details: 'Server error' };
      mockStartGameUseCase.mockRejectedValue(errorObject);

      await act(async () => {
        await expect(
          result.current.startGame({
            homeTeam: 'Warriors',
            awayTeam: 'Eagles',
            ourTeam: 'home',
            lineup: [],
          })
        ).rejects.toBe(errorObject);
      });

      expect(mockSetError).toHaveBeenCalledWith('Unknown error');
    });
  });

  describe('Dependency Injection Utilities', () => {
    it('should correctly set and reset dependencies', () => {
      const customDeps = {
        startGameUseCase: vi.fn(),
        recordAtBatUseCase: vi.fn(),
        substitutePlayerUseCase: vi.fn(),
      };

      setUseCaseDependencies(customDeps);
      // Dependencies are set (internal state, hard to verify directly)

      resetUseCaseDependencies();
      // Dependencies are reset (internal state, hard to verify directly)

      // Indirect verification: test that mock implementations are used after reset
      const { result } = renderHook(() => useGameUseCases());
      const currentBatter = result.current.getCurrentBatter();

      expect(currentBatter).toEqual({
        id: 'player-1',
        name: 'John Doe',
        jerseyNumber: '12',
        position: 'SS',
        battingOrder: 1,
      });
    });
  });

  describe('Complex At-Bat Scenarios', () => {
    it('should handle complex runner advancement with no runs scored', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          bases: {
            first: { id: 'batter-1' },
            second: { id: 'runner-1' },
            third: { id: 'runner-2' },
          },
          // No score change
        },
        events: [{ type: 'AtBatCompleted', data: { batterId: 'batter-1', result: 'SINGLE' } }],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'batter-1',
          result: 'SINGLE',
          advancement: {
            batter: 'first',
            runners: [
              { playerId: 'runner-1', from: 'first', to: 'second' },
              { playerId: 'runner-2', from: 'second', to: 'third' },
            ],
          },
        });
      });

      // Should set all bases but not update score
      expect(mockSetBaseRunner).toHaveBeenCalledWith(
        'first',
        expect.objectContaining({ id: 'batter-1' })
      );
      expect(mockSetBaseRunner).toHaveBeenCalledWith(
        'second',
        expect.objectContaining({ id: 'runner-1' })
      );
      expect(mockSetBaseRunner).toHaveBeenCalledWith(
        'third',
        expect.objectContaining({ id: 'runner-2' })
      );
      expect(mockUpdateScore).not.toHaveBeenCalled();
    });

    it('should handle result with only score update and no base changes', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        gameState: {
          score: { home: 3, away: 2 },
          // No bases specified
        },
        events: [{ type: 'RunScored', data: { teamSide: 'home' } }],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'batter-1',
          result: 'HOME_RUN',
          advancement: {
            batter: 'home',
            runners: [],
          },
        });
      });

      // Should update score but not bases
      expect(mockUpdateScore).toHaveBeenCalledWith({ home: 3, away: 2 });
      expect(mockSetBaseRunner).not.toHaveBeenCalled();
    });

    it('should handle empty result from use case', async () => {
      const { result } = renderHook(() => useGameUseCases());

      const mockResult = {
        // Empty game state
        events: [],
      };

      mockRecordAtBatUseCase.mockResolvedValue(mockResult);

      await act(async () => {
        await result.current.recordAtBat({
          gameId: 'game-123',
          batterId: 'batter-1',
          result: 'WALK',
          advancement: {
            batter: 'first',
            runners: [],
          },
        });
      });

      // Should not update anything
      expect(mockUpdateScore).not.toHaveBeenCalled();
      expect(mockSetBaseRunner).not.toHaveBeenCalled();
    });
  });
});
