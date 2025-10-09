/**
 * @file useUndoRedo Hook Tests
 *
 * Test-first implementation for useUndoRedo hook that manages undo/redo state
 * and operations, connecting UI to Application layer's UndoLastAction/RedoLastAction use cases.
 *
 * @remarks
 * This test file follows TDD methodology to drive the implementation of the useUndoRedo
 * hook. The hook is responsible for:
 * - Managing undo/redo button state (canUndo, canRedo)
 * - Calling GameAdapter.undoLastAction/redoLastAction methods
 * - Handling loading states during async operations
 * - Providing operation results for UI feedback
 * - Syncing with game state changes
 * - Error handling for failed operations
 *
 * Architecture compliance:
 * - Uses GameAdapter from context for application layer access
 * - No direct infrastructure imports
 * - Proper error handling and state management
 * - Type safety across layer boundaries
 */

import { renderHook, act } from '@testing-library/react';
import { GameId } from '@twsoftball/application';
import type { UndoResult, RedoResult } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the context
vi.mock('../../../shared/lib', () => ({
  useAppServicesContext: vi.fn(),
}));

// Mock the game store
vi.mock('../../../entities/game', () => ({
  useGameStore: vi.fn(),
}));

// Import mocked modules
import { useGameStore } from '../../../entities/game';
import { useAppServicesContext } from '../../../shared/lib';

import { useUndoRedo } from './useUndoRedo';

// Cast to mocks for TypeScript
const mockUseAppServicesContext = useAppServicesContext as vi.MockedFunction<
  typeof useAppServicesContext
>;
const mockUseGameStore = useGameStore as vi.MockedFunction<typeof useGameStore>;

// Create persistent mock adapter reference for tests
const mockGameAdapter = {
  undoLastAction: vi.fn(),
  redoLastAction: vi.fn(),
  getGameState: vi.fn(),
};

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
    outs: 0,
  },
};

describe('useUndoRedo Hook - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    mockUseGameStore.mockReturnValue(defaultMockGameStore);

    // Set up default context mock
    mockUseAppServicesContext.mockReturnValue({
      services: {
        applicationServices: {} as never,
        gameAdapter: mockGameAdapter,
      },
      isInitializing: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with canUndo=false, canRedo=false when no game loaded', () => {
      mockUseGameStore.mockReturnValue({
        currentGame: null,
        activeGameState: null,
      });

      const { result } = renderHook(() => useUndoRedo());

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastResult).toBeUndefined();
    });

    it('should initialize with canUndo=false, canRedo=false when game loaded but no actions', () => {
      const { result } = renderHook(() => useUndoRedo());

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle undo call gracefully when no game is loaded', async () => {
      mockUseGameStore.mockReturnValue({
        currentGame: null,
        activeGameState: null,
      });

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      // Should not call adapter when no game
      expect(mockGameAdapter.undoLastAction).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle redo call gracefully when no game is loaded', async () => {
      mockUseGameStore.mockReturnValue({
        currentGame: null,
        activeGameState: null,
      });

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      // Should not call adapter when no game
      expect(mockGameAdapter.redoLastAction).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Undo Operations', () => {
    it('should enable undo button when game has undoable actions', async () => {
      // First, simulate a successful undo that reveals there were actions
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoneActionTypes: ['AT_BAT'],
        undoStack: {
          canUndo: true, // Still more to undo
          canRedo: true, // Can redo the action we just undid
          historyPosition: 1,
          totalActions: 2,
        },
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      const { result } = renderHook(() => useUndoRedo());

      // Perform undo
      await act(async () => {
        await result.current.undo();
      });

      // After undo, buttons should reflect the undo stack state
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it('should call GameAdapter.undoLastAction when undo() is invoked', async () => {
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoStack: {
          canUndo: false,
          canRedo: true,
          historyPosition: 0,
          totalActions: 1,
        },
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(mockGameAdapter.undoLastAction).toHaveBeenCalledWith({
        gameId: 'game-123',
      });
    });

    it('should enable redo button after successful undo', async () => {
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoStack: {
          canUndo: false,
          canRedo: true,
          historyPosition: 0,
          totalActions: 1,
        },
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
      expect(result.current.canUndo).toBe(false);
    });

    it('should update undo stack info after each operation', async () => {
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoStack: {
          canUndo: true,
          canRedo: true,
          historyPosition: 2,
          totalActions: 3,
          nextUndoDescription: 'At-bat for Player #5',
        },
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it('should handle undo errors gracefully', async () => {
      const errorResult: UndoResult = {
        success: false,
        gameId: new GameId('game-123'),
        actionsUndone: 0,
        errors: ['No actions available to undo'],
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.lastResult).toEqual(errorResult);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should provide loading states during operations', async () => {
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoStack: {
          canUndo: false,
          canRedo: true,
          historyPosition: 0,
          totalActions: 1,
        },
      };

      // Create a promise we can control
      let resolveUndo: (value: UndoResult) => void;
      const undoPromise = new Promise<UndoResult>(resolve => {
        resolveUndo = resolve;
      });

      mockGameAdapter.undoLastAction.mockReturnValue(undoPromise);

      const { result } = renderHook(() => useUndoRedo());

      // Start the undo operation
      let undoPromiseResult: Promise<void>;
      act(() => {
        undoPromiseResult = result.current.undo();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveUndo(undoResult);
        await undoPromiseResult;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Redo Operations', () => {
    it('should call GameAdapter.redoLastAction when redo() is invoked', async () => {
      const redoResult: RedoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsRedone: 1,
        undoStack: {
          canUndo: true,
          canRedo: false,
          historyPosition: 1,
          totalActions: 1,
        },
      };

      mockGameAdapter.redoLastAction.mockResolvedValue(redoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      expect(mockGameAdapter.redoLastAction).toHaveBeenCalledWith({
        gameId: 'game-123',
      });
    });

    it('should disable redo button after all redos exhausted', async () => {
      const redoResult: RedoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsRedone: 1,
        undoStack: {
          canUndo: true,
          canRedo: false, // No more redos available
          historyPosition: 1,
          totalActions: 1,
        },
      };

      mockGameAdapter.redoLastAction.mockResolvedValue(redoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.canRedo).toBe(false);
      expect(result.current.canUndo).toBe(true);
    });

    it('should handle redo errors gracefully', async () => {
      const errorResult: RedoResult = {
        success: false,
        gameId: new GameId('game-123'),
        actionsRedone: 0,
        errors: ['No undone actions available to redo'],
      };

      mockGameAdapter.redoLastAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.lastResult).toEqual(errorResult);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    it('should only sync on mount and gameId changes, not on activeGameState changes', async () => {
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      const { rerender } = renderHook(() => useUndoRedo());

      // Wait for initial sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Initial call
      expect(mockGameAdapter.getGameState).toHaveBeenCalledTimes(1);

      // Change activeGameState but keep same gameId
      mockUseGameStore.mockReturnValue({
        ...defaultMockGameStore,
        activeGameState: {
          currentInning: 2, // Changed
          isTopHalf: false, // Changed
          outs: 1, // Changed
        },
      });

      rerender();

      // Wait for potential re-sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should NOT call getGameState again (performance optimization)
      expect(mockGameAdapter.getGameState).toHaveBeenCalledTimes(1);
    });

    it('should re-sync when gameId changes', async () => {
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      const { rerender } = renderHook(() => useUndoRedo());

      // Wait for initial sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockGameAdapter.getGameState).toHaveBeenCalledTimes(1);

      // Change gameId
      mockUseGameStore.mockReturnValue({
        currentGame: {
          id: 'game-456', // Different game
          homeTeam: 'Warriors',
          awayTeam: 'Eagles',
          status: 'active',
        },
        activeGameState: {
          currentInning: 1,
          isTopHalf: true,
          outs: 0,
        },
      });

      rerender();

      // Wait for re-sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should call getGameState again for new game
      expect(mockGameAdapter.getGameState).toHaveBeenCalledTimes(2);
      expect(mockGameAdapter.getGameState).toHaveBeenLastCalledWith({
        gameId: 'game-456',
      });
    });
  });

  describe('State Synchronization', () => {
    it('should sync undo/redo state on mount', async () => {
      // Mock getGameState to return undo available
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      const { result } = renderHook(() => useUndoRedo());

      // Wait for initial state sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should have synced state
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should update state after undo operation', async () => {
      const { result } = renderHook(() => useUndoRedo());

      // Initially no actions
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      // Perform an undo to update state
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoStack: {
          canUndo: false,
          canRedo: true,
          historyPosition: 0,
          totalActions: 1,
        },
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      await act(async () => {
        await result.current.undo();
      });

      // State should update based on operation result
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should provide operation results for UI feedback', async () => {
      const undoResult: UndoResult = {
        success: true,
        gameId: new GameId('game-123'),
        actionsUndone: 1,
        undoneActionTypes: ['AT_BAT'],
        undoStack: {
          canUndo: false,
          canRedo: true,
          historyPosition: 0,
          totalActions: 1,
        },
        completionTimestamp: new Date(),
      };

      mockGameAdapter.undoLastAction.mockResolvedValue(undoResult);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.lastResult).toEqual(undoResult);
      expect(result.current.lastResult?.success).toBe(true);
    });
  });

  describe('State Synchronization - Loading States', () => {
    it('should set isSyncing to true during initial state sync', async () => {
      // Delay the getGameState response
      let resolveGetGameState: (value: {
        undoStack: {
          canUndo: boolean;
          canRedo: boolean;
          historyPosition: number;
          totalActions: number;
        };
      }) => void;
      const getGameStatePromise = new Promise(resolve => {
        resolveGetGameState = resolve;
      });
      mockGameAdapter.getGameState.mockReturnValue(getGameStatePromise);

      const { result } = renderHook(() => useUndoRedo());

      // Should be syncing initially
      expect(result.current.isSyncing).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveGetGameState!({
          undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
        });
        await getGameStatePromise;
      });

      // Should finish syncing
      expect(result.current.isSyncing).toBe(false);
    });

    it('should set isSyncing to false after sync completes', async () => {
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      const { result } = renderHook(() => useUndoRedo());

      // Wait for sync to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should finish syncing
      expect(result.current.isSyncing).toBe(false);

      // Should have loaded state
      expect(result.current.canUndo).toBe(true);
    });

    it('should set isSyncing to false on sync error', async () => {
      mockGameAdapter.getGameState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUndoRedo());

      // Wait for sync to fail
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should finish syncing
      expect(result.current.isSyncing).toBe(false);

      // Should have safe defaults
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Error Handling - Infrastructure Failures', () => {
    it('should handle adapter throwing exception during undo', async () => {
      const error = new Error('Network connection lost');
      mockGameAdapter.undoLastAction.mockRejectedValue(error);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.lastResult).toEqual({
        success: false,
        gameId: expect.any(GameId),
        actionsUndone: 0,
        errors: ['Network connection lost'],
      });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle adapter throwing exception during redo', async () => {
      const error = new Error('Game not found');
      mockGameAdapter.redoLastAction.mockRejectedValue(error);

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.lastResult?.success).toBe(false);
      expect(result.current.lastResult?.errors).toContain('Game not found');
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle unknown errors during undo', async () => {
      // Throw non-Error object
      mockGameAdapter.undoLastAction.mockRejectedValue('Strange error');

      const { result } = renderHook(() => useUndoRedo());

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.lastResult?.success).toBe(false);
      expect(result.current.lastResult?.errors).toContain('Unknown error during undo operation');
      expect(result.current.canUndo).toBe(false);
    });

    it('should handle getGameState throwing exception during state sync', async () => {
      mockGameAdapter.getGameState.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useUndoRedo());

      // Wait for state sync attempt
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should disable both buttons on error
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should expose sync error when getGameState fails', async () => {
      mockGameAdapter.getGameState.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useUndoRedo());

      // Wait for state sync attempt
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should expose error to UI
      expect(result.current.syncError).toBe('Network timeout');
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isSyncing).toBe(false);
    });

    it('should clear sync error on successful sync when gameId changes', async () => {
      // First sync fails
      mockGameAdapter.getGameState.mockRejectedValue(new Error('Network timeout'));

      const { result, rerender } = renderHook(() => useUndoRedo());

      // Wait for failed sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.syncError).toBe('Network timeout');

      // Second sync succeeds with different game ID
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      // Simulate game ID change to trigger re-sync
      mockUseGameStore.mockReturnValue({
        currentGame: {
          id: 'game-456', // Different game
          homeTeam: 'Warriors',
          awayTeam: 'Eagles',
          status: 'active',
        },
        activeGameState: {
          currentInning: 1,
          isTopHalf: true,
          outs: 0,
        },
      });

      rerender();

      // Wait for successful sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should clear error
      expect(result.current.syncError).toBeUndefined();
      expect(result.current.canUndo).toBe(true);
    });
  });
});
