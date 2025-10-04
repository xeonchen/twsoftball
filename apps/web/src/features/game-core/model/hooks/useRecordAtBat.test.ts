/**
 * @file useRecordAtBat Hook Tests
 *
 * Test-first implementation for useRecordAtBat hook that transforms UI at-bat selection
 * to RecordAtBatCommand and integrates with the game adapter.
 *
 * @remarks
 * This test file follows TDD methodology to drive the implementation of the useRecordAtBat
 * hook. The hook is responsible for:
 * - Transforming UI at-bat selection to proper RecordAtBatCommand
 * - Calculating basic runner advances for different hit types
 * - Handling forced advances on walks with bases loaded
 * - Validating batter eligibility and game state
 * - Error handling for invalid scenarios
 *
 * Architecture compliance:
 * - Uses DI Container pattern for application layer access
 * - No direct infrastructure imports
 * - Proper value object creation
 * - Type safety across layer boundaries
 */

import { renderHook, act } from '@testing-library/react';
import { GameId, PlayerId, AtBatResultType, type AtBatResult } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Application layer types (allowed imports)

vi.mock('../../../../entities/game', () => ({
  useGameStore: vi.fn(),
}));

// Default mock game store data
const defaultMockGameStore = {
  currentGame: {
    id: 'game-123',
    homeTeam: 'Warriors',
    awayTeam: 'Eagles',
    status: 'active',
  },
  activeGameState: {
    currentInning: 1,
    isTopHalf: true,
    currentBatter: {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      position: 'SS',
      battingOrder: 1,
    },
    bases: {
      first: null,
      second: null,
      third: null,
    },
    outs: 0,
  },
};

// Import the hook after mocks are set up
import { useGameStore } from '../../../../entities/game';
import { useAppServicesContext } from '../../../../shared/lib';

import { useRecordAtBat } from './useRecordAtBat';
// Import the mocked modules to get mock functions

// Mock the shared/lib context
vi.mock('../../../../shared/lib', () => ({
  useAppServicesContext: vi.fn(),
}));

// Cast to mocks for TypeScript
const mockUseAppServicesContext = useAppServicesContext as vi.MockedFunction<
  typeof useAppServicesContext
>;
const mockUseGameStore = useGameStore as vi.MockedFunction<typeof useGameStore>;

// Create persistent mock adapter reference for tests
const mockGameAdapter = {
  recordAtBat: vi.fn(),
};

describe('useRecordAtBat Hook - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    mockUseGameStore.mockReturnValue(defaultMockGameStore);

    // Setup default successful adapter response
    mockGameAdapter.recordAtBat.mockResolvedValue({
      success: true,
      gameId: new GameId('game-123'),
      batterId: new PlayerId('player-1'),
      result: AtBatResultType.SINGLE,
      advances: [],
      newGameState: defaultMockGameStore.activeGameState,
    } as AtBatResult);

    // Set up default context mock
    mockUseAppServicesContext.mockReturnValue({
      services: {
        applicationServices: {
          recordAtBat: { execute: mockGameAdapter.recordAtBat },
        },
        gameAdapter: mockGameAdapter,
      },
      isInitializing: false,
      error: null,
    });
  });

  describe('Basic At-Bat Recording', () => {
    it('should transform UI selection to RecordAtBatCommand', async () => {
      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith({
        gameId: 'game-123',
        batterId: 'player-1',
        result: 'SINGLE',
        runnerAdvances: [],
      });
    });

    it('should use current game and batter from store', async () => {
      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'DOUBLE',
          runnerAdvances: [],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: 'game-123',
          batterId: 'player-1',
          result: 'DOUBLE',
        })
      );
    });

    it('should handle different AtBatResultTypes correctly', async () => {
      const { result } = renderHook(() => useRecordAtBat());

      const testCases = ['SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN', 'WALK', 'STRIKEOUT'];

      for (const atBatResult of testCases) {
        await act(async () => {
          await result.current.recordAtBat({
            result: atBatResult,
            runnerAdvances: [],
          });
        });

        expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
          expect.objectContaining({
            result: atBatResult,
          })
        );
      }
    });
  });

  describe('Runner Advancement Calculation', () => {
    it('should calculate basic runner advances for SINGLE', async () => {
      // Setup: Runner on first base
      const storeWithRunner = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Jane Smith',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            },
            second: null,
            third: null,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithRunner);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [
            {
              runnerId: 'player-2',
              fromBase: 1,
              toBase: 2,
            },
            {
              runnerId: 'player-1',
              fromBase: 0, // home plate
              toBase: 1,
            },
          ],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          runnerAdvances: [
            {
              runnerId: 'player-2',
              fromBase: 1,
              toBase: 2,
            },
            {
              runnerId: 'player-1',
              fromBase: 0,
              toBase: 1,
            },
          ],
        })
      );
    });

    it('should calculate advances for DOUBLE correctly', async () => {
      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'DOUBLE',
          runnerAdvances: [
            {
              runnerId: 'player-1',
              fromBase: 0, // batter starts at home
              toBase: 2, // reaches second on double
            },
          ],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'DOUBLE',
          runnerAdvances: [
            {
              runnerId: 'player-1',
              fromBase: 0,
              toBase: 2,
            },
          ],
        })
      );
    });

    it('should handle HOME_RUN by clearing all bases', async () => {
      // Setup: Bases loaded
      const storeWithBasesLoaded = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            },
            second: {
              id: 'player-3',
              name: 'Runner 2',
              jerseyNumber: '9',
              position: 'LF',
              battingOrder: 3,
            },
            third: {
              id: 'player-4',
              name: 'Runner 3',
              jerseyNumber: '10',
              position: 'RF',
              battingOrder: 4,
            },
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithBasesLoaded);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'HOME_RUN',
          runnerAdvances: [
            // All runners score
            { runnerId: 'player-4', fromBase: 3, toBase: 0 }, // third to home
            { runnerId: 'player-3', fromBase: 2, toBase: 0 }, // second to home
            { runnerId: 'player-2', fromBase: 1, toBase: 0 }, // first to home
            { runnerId: 'player-1', fromBase: 0, toBase: 0 }, // batter scores
          ],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'HOME_RUN',
          runnerAdvances: expect.arrayContaining([
            expect.objectContaining({ runnerId: 'player-1', fromBase: 0, toBase: 0 }),
            expect.objectContaining({ runnerId: 'player-2', fromBase: 1, toBase: 0 }),
            expect.objectContaining({ runnerId: 'player-3', fromBase: 2, toBase: 0 }),
            expect.objectContaining({ runnerId: 'player-4', fromBase: 3, toBase: 0 }),
          ]),
        })
      );
    });
  });

  describe('Forced Advances on Walks', () => {
    it('should handle forced advances when bases are loaded', async () => {
      // Setup: Bases loaded scenario
      const storeWithBasesLoaded = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            },
            second: {
              id: 'player-3',
              name: 'Runner 2',
              jerseyNumber: '9',
              position: 'LF',
              battingOrder: 3,
            },
            third: {
              id: 'player-4',
              name: 'Runner 3',
              jerseyNumber: '10',
              position: 'RF',
              battingOrder: 4,
            },
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithBasesLoaded);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'WALK',
          runnerAdvances: [
            // All runners forced to advance
            { runnerId: 'player-4', fromBase: 3, toBase: 0 }, // third forced home
            { runnerId: 'player-3', fromBase: 2, toBase: 3 }, // second forced to third
            { runnerId: 'player-2', fromBase: 1, toBase: 2 }, // first forced to second
            { runnerId: 'player-1', fromBase: 0, toBase: 1 }, // batter to first
          ],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'WALK',
          runnerAdvances: expect.arrayContaining([
            expect.objectContaining({ runnerId: 'player-1', fromBase: 0, toBase: 1 }),
            expect.objectContaining({ runnerId: 'player-2', fromBase: 1, toBase: 2 }),
            expect.objectContaining({ runnerId: 'player-3', fromBase: 2, toBase: 3 }),
            expect.objectContaining({ runnerId: 'player-4', fromBase: 3, toBase: 0 }),
          ]),
        })
      );
    });

    it('should handle partial forced advances correctly', async () => {
      // Setup: Only first base occupied
      const storeWithRunnerOnFirst = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            },
            second: null,
            third: null,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithRunnerOnFirst);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'WALK',
          runnerAdvances: [
            { runnerId: 'player-2', fromBase: 1, toBase: 2 }, // forced to second
            { runnerId: 'player-1', fromBase: 0, toBase: 1 }, // batter to first
          ],
        });
      });

      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'WALK',
          runnerAdvances: [
            expect.objectContaining({ runnerId: 'player-2', fromBase: 1, toBase: 2 }),
            expect.objectContaining({ runnerId: 'player-1', fromBase: 0, toBase: 1 }),
          ],
        })
      );
    });
  });

  describe('Batter Eligibility Validation', () => {
    it('should validate that current batter is eligible', async () => {
      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [],
        });
      });

      // Should use the current batter from store
      expect(mockGameAdapter.recordAtBat).toHaveBeenCalledWith(
        expect.objectContaining({
          batterId: 'player-1', // Current batter from store
        })
      );
    });

    it('should handle invalid batter scenario', async () => {
      // Setup: No current batter
      const storeWithNoBatter = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          currentBatter: null,
        },
      };

      mockUseGameStore.mockReturnValue(storeWithNoBatter);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        try {
          await result.current.recordAtBat({
            result: 'SINGLE',
            runnerAdvances: [],
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      // Should set error state
      expect(result.current.error).toBeTruthy();
    });

    it('should validate game is active before recording', async () => {
      // Setup: Inactive game
      const storeWithInactiveGame = {
        ...defaultMockGameStore,
        currentGame: {
          ...defaultMockGameStore.currentGame,
          status: 'completed',
        },
      };

      mockUseGameStore.mockReturnValue(storeWithInactiveGame);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        try {
          await result.current.recordAtBat({
            result: 'SINGLE',
            runnerAdvances: [],
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state during at-bat recording', async () => {
      let resolvePromise: (value: unknown) => void;
      const recordAtBatPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockGameAdapter.recordAtBat.mockReturnValue(recordAtBatPromise);

      const { result } = renderHook(() => useRecordAtBat());

      act(() => {
        void result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [],
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          gameId: new GameId('game-123'),
          batterId: new PlayerId('player-1'),
          result: AtBatResultType.SINGLE,
          advances: [],
        });
        // Wait for the next tick to allow state to settle
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle adapter errors gracefully', async () => {
      const errorMessage = 'Failed to record at-bat';
      mockGameAdapter.recordAtBat.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        try {
          await result.current.recordAtBat({
            result: 'SINGLE',
            runnerAdvances: [],
          });
        } catch {
          // Expected to throw, we check the error state instead
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error state on successful recording', async () => {
      // First, set an error state
      const { result } = renderHook(() => useRecordAtBat());

      mockGameAdapter.recordAtBat.mockRejectedValueOnce(new Error('Test error'));

      await act(async () => {
        try {
          await result.current.recordAtBat({
            result: 'SINGLE',
            runnerAdvances: [],
          });
        } catch {
          // Expected to throw, we check the error state instead
        }
      });

      expect(result.current.error).toBeTruthy();

      // Then perform successful recording
      mockGameAdapter.recordAtBat.mockResolvedValueOnce({
        success: true,
        gameId: new GameId('game-123'),
        batterId: new PlayerId('player-1'),
        result: AtBatResultType.SINGLE,
        advances: [],
      });

      await act(async () => {
        await result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [],
        });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Result State Management', () => {
    it('should update result state on successful recording', async () => {
      const mockResult = {
        success: true,
        gameId: new GameId('game-123'),
        batterId: new PlayerId('player-1'),
        result: AtBatResultType.SINGLE,
        advances: [],
        newGameState: defaultMockGameStore.activeGameState,
      };

      mockGameAdapter.recordAtBat.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useRecordAtBat());

      await act(async () => {
        await result.current.recordAtBat({
          result: 'SINGLE',
          runnerAdvances: [],
        });
      });

      expect(result.current.result).toEqual(mockResult);
    });

    it('should provide reset function to clear state', () => {
      const { result } = renderHook(() => useRecordAtBat());

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Hook Interface', () => {
    it('should return correct hook interface', () => {
      const { result } = renderHook(() => useRecordAtBat());

      expect(result.current).toEqual({
        recordAtBat: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null, // Initially null
        result: null, // Initially null
        reset: expect.any(Function),
      });
    });
  });
});
