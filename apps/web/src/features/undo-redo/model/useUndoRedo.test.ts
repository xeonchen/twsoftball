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

  describe('State Synchronization', () => {
    it('should sync undo/redo state with game state changes', async () => {
      const { result, rerender } = renderHook(() => useUndoRedo());

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

      // State should update
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);

      // Simulate game state change (new at-bat recorded elsewhere)
      // This would happen when the game store updates
      rerender();

      // State should remain consistent based on last operation
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

    it('should sync undo/redo state when game state changes', async () => {
      // Mock getGameState to return undo available
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: false, historyPosition: 1, totalActions: 1 },
      });

      const { result, rerender } = renderHook(() => useUndoRedo());

      // Wait for initial state sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should have synced state
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);

      // Simulate game state change (new action recorded)
      mockUseGameStore.mockReturnValue({
        ...defaultMockGameStore,
        activeGameState: {
          currentInning: 1,
          isTopHalf: true,
          outs: 1, // Changed
        },
      });

      // Mock getGameState to return different state
      mockGameAdapter.getGameState.mockResolvedValue({
        undoStack: { canUndo: true, canRedo: true, historyPosition: 2, totalActions: 2 },
      });

      rerender();

      // Wait for state sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
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
  });
});
