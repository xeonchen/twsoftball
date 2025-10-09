/**
 * @file useUndoRedo Hook
 *
 * React hook that manages undo/redo state and operations, connecting UI
 * to the Application layer's UndoLastAction/RedoLastAction use cases.
 *
 * @remarks
 * This hook provides a clean interface for undo/redo functionality in the UI:
 * - Tracks undo/redo button availability (canUndo, canRedo)
 * - Calls GameAdapter methods for undo/redo operations
 * - Manages loading states during async operations
 * - Provides operation results for UI feedback
 * - Syncs with game state changes
 * - Handles errors gracefully
 *
 * Architecture compliance:
 * - Uses GameAdapter from context (no direct infrastructure imports)
 * - Proper state management with React hooks
 * - Type-safe across layer boundaries
 * - Error handling with detailed feedback
 *
 * @example
 * ```tsx
 * function GameControls() {
 *   const { undo, redo, canUndo, canRedo, isLoading } = useUndoRedo();
 *
 *   return (
 *     <div>
 *       <button onClick={undo} disabled={!canUndo || isLoading}>
 *         Undo
 *       </button>
 *       <button onClick={redo} disabled={!canRedo || isLoading}>
 *         Redo
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import type { UndoResult, RedoResult } from '@twsoftball/application';
import { GameId } from '@twsoftball/application';
import { useState, useCallback, useEffect } from 'react';

import { useGameStore } from '../../../entities/game';
import { useAppServicesContext } from '../../../shared/lib';

/**
 * Return type for the useUndoRedo hook.
 */
export interface UseUndoRedoReturn {
  /** Function to undo the last action */
  undo: () => Promise<void>;
  /** Function to redo the last undone action */
  redo: () => Promise<void>;
  /** Whether undo button should be enabled */
  canUndo: boolean;
  /** Whether redo button should be enabled */
  canRedo: boolean;
  /** Whether an operation is currently in progress */
  isLoading: boolean;
  /** Whether initial state synchronization is in progress */
  isSyncing: boolean;
  /** Error message from sync failures (undefined if no error) */
  syncError?: string;
  /** Result of the last undo or redo operation */
  lastResult?: UndoResult | RedoResult | undefined;
}

/**
 * Hook to manage undo/redo operations for the current game.
 *
 * @remarks
 * This hook connects the UI to the Application layer's undo/redo use cases
 * through the GameAdapter. It manages button states, loading indicators,
 * and operation results for optimal user experience.
 *
 * **State Management**:
 * - `canUndo`/`canRedo`: Derived from last operation's undoStack info
 * - `isLoading`: Set during async operations
 * - `lastResult`: Stores complete operation result for UI feedback
 *
 * **Error Handling**:
 * - Failed operations update lastResult with error details
 * - Buttons disabled during loading to prevent concurrent operations
 * - State remains consistent even on errors
 *
 * @returns Undo/redo functions and state
 */
export const useUndoRedo = (): UseUndoRedoReturn => {
  const { services } = useAppServicesContext();
  const { currentGame } = useGameStore();

  // Local state for undo/redo availability
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | undefined>(undefined);
  const [lastResult, setLastResult] = useState<UndoResult | RedoResult | undefined>(undefined);

  // Sync undo/redo state when game changes
  useEffect(() => {
    if (!currentGame?.id || !services?.gameAdapter) {
      setCanUndo(false);
      setCanRedo(false);
      setIsSyncing(false);
      return;
    }

    // Capture services in a const to maintain type narrowing in async function
    const { gameAdapter } = services;
    const gameId = currentGame.id;

    setIsSyncing(true);
    const syncUndoState = async (): Promise<void> => {
      try {
        // Query current undo stack state
        const gameState = await gameAdapter.getGameState({
          gameId,
        });

        if (gameState?.undoStack) {
          setSyncError(undefined); // Clear any previous errors
          setCanUndo(gameState.undoStack.canUndo);
          setCanRedo(gameState.undoStack.canRedo);
        }
      } catch (error) {
        // On error, set error message and disable both buttons
        setSyncError(error instanceof Error ? error.message : 'Failed to sync undo state');
        setCanUndo(false);
        setCanRedo(false);
      } finally {
        setIsSyncing(false);
      }
    };

    void syncUndoState();
    // NOTE: activeGameState intentionally excluded from dependencies to prevent
    // re-sync on every game action. Button states are updated via operation results
    // (lines 164-166, 211-213), so sync is only needed on mount or gameId change.
  }, [currentGame?.id, services]);

  /**
   * Performs an undo operation.
   *
   * @remarks
   * - Calls GameAdapter.undoLastAction with current game ID
   * - Updates button states based on operation result
   * - Handles errors gracefully
   * - Provides loading state during async operation
   */
  const undo = useCallback(async () => {
    if (!currentGame?.id || !services?.gameAdapter) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await services.gameAdapter.undoLastAction({
        gameId: currentGame.id,
      });

      setLastResult(result);

      if (result.success && result.undoStack) {
        setCanUndo(result.undoStack.canUndo);
        setCanRedo(result.undoStack.canRedo);
      } else {
        // On error, disable both buttons
        setCanUndo(false);
        setCanRedo(false);
      }
    } catch (error) {
      // Handle infrastructure failures (network, not found, etc.)
      const errorResult: UndoResult = {
        success: false,
        gameId: new GameId(currentGame.id),
        actionsUndone: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error during undo operation'],
      };
      setLastResult(errorResult);
      setCanUndo(false);
      setCanRedo(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentGame?.id, services?.gameAdapter]);

  /**
   * Performs a redo operation.
   *
   * @remarks
   * - Calls GameAdapter.redoLastAction with current game ID
   * - Updates button states based on operation result
   * - Handles errors gracefully
   * - Provides loading state during async operation
   */
  const redo = useCallback(async () => {
    if (!currentGame?.id || !services?.gameAdapter) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await services.gameAdapter.redoLastAction({
        gameId: currentGame.id,
      });

      setLastResult(result);

      if (result.success && result.undoStack) {
        setCanUndo(result.undoStack.canUndo);
        setCanRedo(result.undoStack.canRedo);
      } else {
        // On error, disable both buttons
        setCanUndo(false);
        setCanRedo(false);
      }
    } catch (error) {
      // Handle infrastructure failures
      const errorResult: RedoResult = {
        success: false,
        gameId: new GameId(currentGame.id),
        actionsRedone: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error during redo operation'],
      };
      setLastResult(errorResult);
      setCanUndo(false);
      setCanRedo(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentGame?.id, services?.gameAdapter]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading,
    isSyncing,
    ...(syncError !== undefined && { syncError }),
    ...(lastResult !== undefined && { lastResult }),
  };
};
