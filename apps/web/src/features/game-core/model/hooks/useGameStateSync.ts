/**
 * @file useGameStateSync Hook
 * Automatically syncs Application layer GameStateDTO to Web layer Zustand store.
 *
 * @remarks
 * This hook implements the Application Layer State Ownership pattern (ADR-008).
 * It provides automatic, complete state synchronization from the Application layer
 * to the Web layer's Zustand store whenever use cases return updated game state.
 *
 * **Key Responsibilities:**
 * - Convert GameStateDTO to UI format using toUIGameState mapper
 * - Update gameStore via updateFromDTO action
 * - Handle null/undefined DTOs gracefully (no-op)
 * - Catch and log conversion errors without throwing
 *
 * **Integration Points:**
 * - Used in components that receive use case results with gameState
 * - Triggers on any GameStateDTO change (score, batter, bases, lineup)
 * - Must be called at component top level (React hooks rules)
 *
 * @example
 * ```tsx
 * function GameRecordingPage() {
 *   const [gameState, setGameState] = useState<GameStateDTO | null>(null);
 *
 *   // Automatic sync at component level
 *   useGameStateSync(gameState);
 *
 *   const handleRecordAtBat = async (data) => {
 *     const result = await recordAtBat(data);
 *     setGameState(result.gameState);  // Triggers sync via useEffect
 *   };
 * }
 * ```
 *
 * @example
 * ```tsx
 * function UndoRedoControls() {
 *   const [restoredState, setRestoredState] = useState<GameStateDTO | null>(null);
 *   useGameStateSync(restoredState);
 *
 *   const handleUndo = async () => {
 *     const result = await undoLastAction();
 *     setRestoredState(result.restoredState);  // Sync restored state
 *   };
 * }
 * ```
 */

import type { GameStateDTO } from '@twsoftball/application';
import { useEffect } from 'react';

import { useGameStore } from '../../../../entities/game';
import { createLogger, toUIGameState } from '../../../../shared/api';

// Create logger for this module
const logger = createLogger('development', 'useGameStateSync');

/**
 * Automatically syncs Application layer GameStateDTO to Web layer Zustand store.
 *
 * @param gameStateDTO - Complete game state from Application layer use cases
 *
 * @remarks
 * This hook converts GameStateDTO to UI format and updates the gameStore
 * automatically whenever the DTO changes. It handles errors gracefully by
 * logging them without throwing, allowing the component to continue rendering.
 *
 * **Usage Pattern:**
 * 1. Create state to hold the DTO at component level
 * 2. Call this hook with that state (top level only!)
 * 3. Update the state in event handlers to trigger sync
 *
 * **Error Handling:**
 * - Catches and logs DTO conversion errors
 * - Does not throw - allows component to continue rendering
 * - Preserves existing store state on conversion failure
 *
 * **Performance:**
 * - Only re-runs when gameStateDTO reference changes
 * - Uses stable updateFromDTO reference from store
 * - No-op if gameStateDTO is null/undefined
 */
export function useGameStateSync(gameStateDTO: GameStateDTO | null | undefined): void {
  const updateFromDTO = useGameStore(state => state.updateFromDTO);

  useEffect(() => {
    if (!gameStateDTO) {
      return;
    }

    try {
      logger.debug('gameStateDTO received', {
        isTopHalf: gameStateDTO.isTopHalf,
        outs: gameStateDTO.outs,
        currentInning: gameStateDTO.currentInning,
      });

      const uiState = toUIGameState(gameStateDTO);

      logger.debug('uiState converted', {
        inning: uiState.inning,
        outs: uiState.outs,
      });

      updateFromDTO(uiState);
      logger.debug('updateFromDTO completed');
    } catch (error) {
      logger.error(
        'Failed to sync game state from DTO',
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't throw - allow component to continue rendering with current state
    }
    // Zustand selectors provide stable references that don't change between renders.
    // Including updateFromDTO in dependencies would cause unnecessary re-renders.
    // The only true dependency is gameStateDTO which triggers the sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateFromDTO is a stable Zustand selector (doesn't change reference)
  }, [gameStateDTO]);
}
