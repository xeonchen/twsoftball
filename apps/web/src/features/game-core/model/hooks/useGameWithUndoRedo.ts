/**
 * @file useGameWithUndoRedo Composite Hook
 *
 * React hook that combines game state management with undo/redo functionality,
 * providing a unified interface for game operations with full undo/redo support.
 *
 * @remarks
 * This composite hook integrates two key pieces of functionality:
 * 1. Game State Management - from gameStore (entities layer)
 * 2. Undo/Redo Operations - from useUndoRedo hook (features/undo-redo)
 *
 * Architecture compliance:
 * - Follows FSD architecture (features layer combining entities + features)
 * - Clean separation of concerns (composition over inheritance)
 * - Type-safe across all layer boundaries
 * - Proper integration with DI Container pattern
 *
 * Benefits:
 * - Single hook provides all game state + undo/redo state
 * - Automatic synchronization between game actions and undo stack
 * - Simplified component code (one hook instead of two)
 * - Consistent state management pattern
 *
 * @example
 * ```tsx
 * function GameRecordingPage() {
 *   const {
 *     currentGame,
 *     activeGameState,
 *     canUndo,
 *     canRedo,
 *     undo,
 *     redo,
 *     isUndoRedoLoading
 *   } = useGameWithUndoRedo();
 *
 *   return (
 *     <div>
 *       <GameInfo game={currentGame} />
 *       <UndoRedoControls
 *         onUndo={undo}
 *         onRedo={redo}
 *         canUndo={canUndo}
 *         canRedo={canRedo}
 *         isLoading={isUndoRedoLoading}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import type { UndoResult, RedoResult } from '@twsoftball/application';
import { useMemo } from 'react';

import type { GameData, ActiveGameState } from '../../../../entities/game';
import { useGameStore } from '../../../../entities/game';
import { useUndoRedo } from '../../../undo-redo';

/**
 * Return type for the useGameWithUndoRedo composite hook.
 *
 * @remarks
 * Combines all game state properties with undo/redo state and operations,
 * providing a complete interface for game management with full undo/redo support.
 */
export interface UseGameWithUndoRedoReturn {
  // ========== Game State Properties ==========
  /** Current game data (null if no game active) */
  currentGame: GameData | null;

  /** Active game recording state (null if game not started) */
  activeGameState: ActiveGameState | null;

  /** Whether game data is being loaded */
  loading: boolean;

  /** Error message from game operations (null if no error) */
  error: string | null;

  /** Whether a game is currently active */
  isGameActive: boolean;

  // ========== Undo/Redo State ==========
  /** Whether undo button should be enabled */
  canUndo: boolean;

  /** Whether redo button should be enabled */
  canRedo: boolean;

  /** Whether an undo/redo operation is currently in progress */
  isUndoRedoLoading: boolean;

  /** Result of the last undo or redo operation */
  lastUndoRedoResult?: UndoResult | RedoResult | undefined;

  // ========== Action Functions ==========
  /** Function to undo the last action */
  undo: () => Promise<void>;

  /** Function to redo the last undone action */
  redo: () => Promise<void>;
}

/**
 * Composite hook combining game state management with undo/redo functionality.
 *
 * @remarks
 * This hook follows the Composite Hook pattern (Option B from design):
 * - Calls useGameStore() for game state
 * - Calls useUndoRedo() for undo/redo functionality
 * - Combines results into unified return object
 * - Memoizes return value for performance
 *
 * **Integration Approach**:
 * - Game state comes from Zustand store (entities/game)
 * - Undo/redo comes from dedicated hook (features/undo-redo)
 * - Both automatically sync via activeGameState dependency
 * - UI gets single source of truth for all game + undo/redo state
 *
 * **State Synchronization**:
 * - useUndoRedo internally watches activeGameState
 * - When game actions occur, activeGameState updates
 * - This triggers useUndoRedo to re-sync undo/redo availability
 * - UI automatically re-renders with latest state
 *
 * **Performance Optimization**:
 * - Return object is memoized to prevent unnecessary re-renders
 * - Only updates when underlying state actually changes
 * - Functions are stable references from useUndoRedo
 *
 * @returns Combined game state and undo/redo state with action functions
 *
 * @example
 * ```tsx
 * // Basic usage in a component
 * function GameControls() {
 *   const {
 *     currentGame,
 *     canUndo,
 *     canRedo,
 *     undo,
 *     redo,
 *     isUndoRedoLoading
 *   } = useGameWithUndoRedo();
 *
 *   if (!currentGame) {
 *     return <div>No game active</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h2>{currentGame.homeTeam} vs {currentGame.awayTeam}</h2>
 *       <button
 *         onClick={undo}
 *         disabled={!canUndo || isUndoRedoLoading}
 *       >
 *         Undo
 *       </button>
 *       <button
 *         onClick={redo}
 *         disabled={!canRedo || isUndoRedoLoading}
 *       >
 *         Redo
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGameWithUndoRedo(): UseGameWithUndoRedoReturn {
  // Get game state from entities layer
  const { currentGame, activeGameState, isLoading, error, isGameActive } = useGameStore();

  // Get undo/redo state and actions from features/undo-redo
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading: isUndoRedoOperationLoading,
    isSyncing,
    lastResult,
  } = useUndoRedo();

  // Combine into unified return object
  // Memoize to prevent unnecessary re-renders when reference changes
  const combinedState = useMemo(
    () => ({
      // Game state properties
      currentGame,
      activeGameState,
      loading: isLoading,
      error,
      isGameActive,

      // Undo/redo state
      canUndo,
      canRedo,
      isUndoRedoLoading: isUndoRedoOperationLoading || isSyncing,
      lastUndoRedoResult: lastResult,

      // Action functions (already memoized in useUndoRedo)
      undo,
      redo,
    }),
    [
      currentGame,
      activeGameState,
      isLoading,
      error,
      isGameActive,
      canUndo,
      canRedo,
      isUndoRedoOperationLoading,
      isSyncing,
      lastResult,
      undo,
      redo,
    ]
  );

  return combinedState;
}
