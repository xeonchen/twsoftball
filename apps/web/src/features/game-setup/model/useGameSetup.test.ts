/**
 * @file useGameSetup Hook Tests
 * Comprehensive test suite for the useGameSetup React hook.
 *
 * @remarks
 * Tests cover all critical aspects of the game setup hook including:
 * - Successful game creation workflow
 * - Loading state management during async operations
 * - Domain validation error handling and mapping
 * - Infrastructure error handling with user-friendly messages
 * - Error recovery and retry capabilities
 * - Concurrent operation handling
 * - Component unmount cleanup
 * - DI container integration
 *
 * Test Strategy:
 * - Unit tests for hook behavior and state management
 * - Integration tests with DI container and use cases
 * - Error scenario testing for robustness
 * - Performance and memory leak testing
 * - React hooks best practices validation
 */

import { renderHook, act } from '@testing-library/react';
import { GameId } from '@twsoftball/application';
import { vi, describe, it, expect, beforeEach, afterEach, type MockedFunction } from 'vitest';

import { wizardToCommand } from '../../../shared/api';
import { useAppServicesContext } from '../../../shared/lib';
import type { SetupWizardState } from '../../../shared/lib/types';

import { useGameSetup } from './useGameSetup';

// Get mock references from global test setup
interface TestMocks {
  container: unknown;
  useCases: {
    startNewGame: {
      execute: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
  };
  logger: {
    info: MockedFunction<(...args: unknown[]) => void>;
    warn: MockedFunction<(...args: unknown[]) => void>;
    error: MockedFunction<(...args: unknown[]) => void>;
  };
}

const testMocks = (globalThis as { __testMocks: TestMocks }).__testMocks;

// Mock the wizard-to-command mapper at test level
vi.mock('../../../shared/api', () => ({
  wizardToCommand: vi.fn(),
}));

// Mock the app services context
vi.mock('../../../shared/lib', () => ({
  useAppServicesContext: vi.fn(),
}));

const mockWizardToCommand = wizardToCommand as MockedFunction<typeof wizardToCommand>;
const mockUseAppServicesContext = useAppServicesContext as MockedFunction<
  typeof useAppServicesContext
>;

// Local aliases for commonly used mocks
const mockExecute = testMocks.useCases.startNewGame.execute;
const mockLogger = testMocks.logger;

describe('useGameSetup Hook', () => {
  // Sample wizard state for testing
  const validWizardState: SetupWizardState = {
    step: 'confirm',
    teams: {
      home: 'Eagles',
      away: 'Hawks',
      ourTeam: 'home',
    },
    lineup: [
      {
        id: 'player-1',
        name: 'John Doe',
        jerseyNumber: '1',
        position: 'P',
        battingOrder: 1,
      },
      {
        id: 'player-2',
        name: 'Jane Smith',
        jerseyNumber: '2',
        position: 'C',
        battingOrder: 2,
      },
      // Add 7 more players to meet minimum lineup requirement
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `player-${i + 3}`,
        name: `Player ${i + 3}`,
        jerseyNumber: `${i + 3}`,
        position: 'OF',
        battingOrder: i + 3,
      })),
    ],
    isComplete: true,
  };

  const mockGameCommand = {
    gameId: new GameId('test-game-id'),
    homeTeamName: 'Eagles',
    awayTeamName: 'Hawks',
    ourTeamSide: 'HOME' as const,
    gameDate: new Date(),
    initialLineup: [],
  };

  const mockSuccessResult = {
    success: true as const,
    gameId: 'test-game-id',
    initialState: {
      gameId: new GameId('test-game-id'),
      status: 'WAITING_TO_START' as const,
      score: { home: 0, away: 0, leader: 'TIE' as const, difference: 0 },
      gameStartTime: new Date(),
      currentInning: 1,
      isTopHalf: true,
      battingTeam: 'AWAY' as const,
      outs: 0,
      bases: {
        first: null,
        second: null,
        third: null,
        runnersInScoringPosition: [],
        basesLoaded: false,
      },
      currentBatterSlot: 1,
      homeLineup: {} as NonNullable<typeof mockSuccessResult.initialState>['homeLineup'],
      awayLineup: {} as NonNullable<typeof mockSuccessResult.initialState>['awayLineup'],
      currentBatter: null,
      lastUpdated: new Date(),
    },
  };

  // Create persistent mock for startNewGameFromWizard
  const mockStartNewGameFromWizard = vi.fn();

  beforeEach(() => {
    // Clear call history and reset implementations
    vi.clearAllMocks();
    vi.resetAllMocks();

    // Restore default mock implementations
    mockWizardToCommand.mockReturnValue(mockGameCommand);
    mockExecute.mockResolvedValue(mockSuccessResult);
    mockStartNewGameFromWizard.mockResolvedValue(mockSuccessResult);

    // Set up default context mock
    mockUseAppServicesContext.mockReturnValue({
      services: {
        applicationServices: {
          startNewGame: { execute: mockExecute },
        },
        gameAdapter: {
          startNewGameFromWizard: mockStartNewGameFromWizard,
          logger: mockLogger,
        },
      },
      isInitializing: false,
      error: null,
    });
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('Successful Game Creation', () => {
    it('should start game and return gameId on success', async () => {
      const { result } = renderHook(() => useGameSetup());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBe('test-game-id');
      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toBeNull();

      // Verify use case was called with correct command
      expect(mockStartNewGameFromWizard).toHaveBeenCalledTimes(1);
      expect(mockStartNewGameFromWizard).toHaveBeenCalledWith(validWizardState);

      // Verify wizard state was mapped to command
      expect(mockWizardToCommand).toHaveBeenCalledTimes(1);
      expect(mockWizardToCommand).toHaveBeenCalledWith(validWizardState);
    });

    it('should log successful game creation', async () => {
      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Game created successfully',
        expect.objectContaining({
          gameId: 'test-game-id',
          homeTeam: 'Eagles',
          awayTeam: 'Hawks',
        })
      );
    });
  });

  describe('Loading State Management', () => {
    it('should handle loading state during game creation', async () => {
      let resolveUseCase: (value: typeof mockSuccessResult) => void;
      const useCasePromise = new Promise<typeof mockSuccessResult>(resolve => {
        resolveUseCase = resolve;
      });
      mockStartNewGameFromWizard.mockReturnValue(useCasePromise);

      const { result } = renderHook(() => useGameSetup());

      expect(result.current.isLoading).toBe(false);

      // Start the async operation
      act(() => {
        void result.current.startGame(validWizardState);
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);
      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBeNull();

      // Resolve the use case
      await act(async () => {
        resolveUseCase(mockSuccessResult);
        await useCasePromise;
      });

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBe('test-game-id');
    });

    it('should handle multiple concurrent start game calls', async () => {
      const { result } = renderHook(() => useGameSetup());

      // Start multiple concurrent calls (second call should be ignored due to loading state)
      await act(async () => {
        const promise1 = result.current.startGame(validWizardState);
        const promise2 = result.current.startGame(validWizardState);
        await Promise.all([promise1, promise2]);
      });

      // Should result in successful game creation
      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBe('test-game-id');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Domain Validation Error Handling', () => {
    it('should handle validation errors from domain', async () => {
      const domainError = new Error('Lineup must contain at least 9 players');
      mockWizardToCommand.mockImplementationOnce(() => {
        throw domainError;
      });

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBeNull(); // Domain errors go to validationErrors
      expect(result.current.validationErrors).toEqual({
        lineup: ['Lineup must contain at least 9 players'],
      });

      // Verify error was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Game setup validation failed',
        expect.objectContaining({
          error: 'Lineup must contain at least 9 players',
          type: 'validation',
        })
      );
    });

    it('should handle use case validation errors', async () => {
      const validationResult = {
        success: false as const,
        gameId: 'test-game-id',
        errors: ['Team names must be different', 'Jersey number 5 is duplicated'],
      };
      mockStartNewGameFromWizard.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toEqual({
        teams: 'Team names must be different',
        lineup: ['Jersey number 5 is duplicated'],
      });
    });

    it('should provide validation errors in UI-friendly format', async () => {
      const validationResult = {
        success: false as const,
        gameId: 'test-game-id',
        errors: [
          'Home team name cannot be empty',
          'Player name cannot be empty',
          'Duplicate jersey numbers: #1 assigned to multiple players',
          'Missing required field position: CENTER_FIELD',
        ],
      };
      mockStartNewGameFromWizard.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.validationErrors).toEqual({
        teams: 'Home team name cannot be empty',
        lineup: [
          'Player name cannot be empty',
          'Duplicate jersey numbers: #1 assigned to multiple players',
          'Missing required field position: CENTER_FIELD',
        ],
      });
    });
  });

  describe('Infrastructure Error Handling', () => {
    it('should handle infrastructure errors gracefully', async () => {
      const infraError = new Error('Failed to save game state');
      mockStartNewGameFromWizard.mockRejectedValue(infraError);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBe(
        'Unable to save game. Please check your connection and try again.'
      );
      expect(result.current.validationErrors).toBeNull();

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start game',
        infraError,
        expect.objectContaining({
          type: 'infrastructure',
        })
      );
    });

    it('should handle network errors with retry guidance', async () => {
      const networkError = new Error('Network request failed');
      mockStartNewGameFromWizard.mockRejectedValue(networkError);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBe(
        'Network connection failed. Please check your internet connection and try again.'
      );
    });

    it('should handle unknown errors with generic message', async () => {
      const unknownError = new Error('Something unexpected happened');
      mockStartNewGameFromWizard.mockRejectedValue(unknownError);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Error Recovery and State Management', () => {
    it('should clear errors when starting new operation', async () => {
      // First, cause an error
      const error = new Error('Test error');
      mockStartNewGameFromWizard.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBeTruthy();

      // Then, mock a successful response
      mockStartNewGameFromWizard.mockResolvedValueOnce(mockSuccessResult);

      // Start new operation - should clear previous error
      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.gameId).toBe('test-game-id');
    });

    it('should provide clearError function', async () => {
      const error = new Error('Test error');
      mockStartNewGameFromWizard.mockRejectedValue(error);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toBeNull();
    });

    it('should provide reset function', async () => {
      // Set up state with data
      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.gameId).toBe('test-game-id');

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.gameId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('App Services Context Integration', () => {
    it('should integrate with app services context properly', async () => {
      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      // Verify startNewGameFromWizard use case was used
      expect(mockStartNewGameFromWizard).toHaveBeenCalledWith(validWizardState);
    });

    it('should handle app services initialization errors', async () => {
      // Mock the context to return null services
      mockUseAppServicesContext.mockImplementationOnce(() => ({
        services: null,
        isInitializing: false,
        error: null,
      }));

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.error).toBe(
        'Application not properly initialized. Please refresh the page.'
      );
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('should reset state when unmounted', async () => {
      const { result, unmount } = renderHook(() => useGameSetup());

      // Set up some state
      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.gameId).toBe('test-game-id');

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });

    it('should not update state after unmount', async () => {
      let resolveUseCase: (value: typeof mockSuccessResult) => void;
      const useCasePromise = new Promise<typeof mockSuccessResult>(resolve => {
        resolveUseCase = resolve;
      });
      mockStartNewGameFromWizard.mockReturnValue(useCasePromise);

      const { result, unmount } = renderHook(() => useGameSetup());

      // Start async operation
      act(() => {
        void result.current.startGame(validWizardState);
      });

      expect(result.current.isLoading).toBe(true);

      // Unmount before operation completes
      unmount();

      // Complete the operation - should not cause errors
      await act(async () => {
        resolveUseCase(mockSuccessResult);
        await useCasePromise;
      });

      // No errors should occur
    });
  });

  describe('Performance and Memory Considerations', () => {
    it('should memoize startGame function when dependencies are stable', () => {
      // Mock the context hook to return the same services object
      const stableServices = {
        applicationServices: {
          ...testMocks.useCases,
          ...testMocks.repositories,
          eventStore: testMocks.infrastructure.eventStore,
          logger: testMocks.logger,
          config: { environment: 'test', storage: 'memory' },
        },
        gameAdapter: testMocks.infrastructure.gameAdapter,
      };

      // Ensure the mock returns the same object reference
      mockUseAppServicesContext.mockReturnValue({
        services: stableServices,
        isInitializing: false,
        error: null,
      });

      const { result, rerender } = renderHook(() => useGameSetup());

      const firstStartGame = result.current.startGame;

      rerender();

      const secondStartGame = result.current.startGame;

      expect(firstStartGame).toBe(secondStartGame);
    });

    it('should memoize other functions', () => {
      const { result, rerender } = renderHook(() => useGameSetup());

      const firstClearError = result.current.clearError;
      const firstReset = result.current.reset;

      rerender();

      const secondClearError = result.current.clearError;
      const secondReset = result.current.reset;

      expect(firstClearError).toBe(secondClearError);
      expect(firstReset).toBe(secondReset);
    });
  });

  describe('Error Classification and Mapping', () => {
    it('should categorize team validation errors correctly', async () => {
      const validationResult = {
        success: false as const,
        gameId: 'test-game-id',
        errors: ['Home team name cannot be empty', 'Team names must be different'],
      };
      mockStartNewGameFromWizard.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.validationErrors?.teams).toBeTruthy();
    });

    it('should categorize lineup validation errors correctly', async () => {
      const validationResult = {
        success: false as const,
        gameId: 'test-game-id',
        errors: [
          'Player name cannot be empty',
          'Duplicate jersey numbers: #5 assigned to multiple players',
          'Missing required field position: PITCHER',
        ],
      };
      mockStartNewGameFromWizard.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.validationErrors?.lineup).toHaveLength(3);
    });

    it('should handle mixed validation errors', async () => {
      const validationResult = {
        success: false as const,
        gameId: 'test-game-id',
        errors: [
          'Away team name cannot be empty',
          'Player name cannot be empty',
          'General validation error',
        ],
      };
      mockStartNewGameFromWizard.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useGameSetup());

      await act(async () => {
        await result.current.startGame(validWizardState);
      });

      expect(result.current.validationErrors).toEqual({
        teams: 'Away team name cannot be empty',
        lineup: ['Player name cannot be empty'],
        general: 'General validation error',
      });
    });
  });
});
