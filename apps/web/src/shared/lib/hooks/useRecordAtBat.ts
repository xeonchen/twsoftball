/**
 * @file useRecordAtBat Hook
 *
 * React hook for recording at-bat results with runner advancement management.
 * Transforms UI state to application commands and integrates with the game adapter.
 *
 * @remarks
 * This hook is responsible for:
 * - Transforming UI at-bat selection to proper RecordAtBatCommand
 * - Managing loading, error, and result state during at-bat recording
 * - Validating batter eligibility and game state
 * - Integrating with the DI Container pattern for application layer access
 * - Providing a clean interface for at-bat recording operations
 *
 * Architecture compliance:
 * - Uses DI Container pattern for application layer access
 * - No direct infrastructure imports
 * - Proper value object creation and type safety
 * - Clean separation between UI logic and business rules
 *
 * @example
 * ```typescript
 * const GameRecordingComponent = () => {
 *   const { recordAtBat, isLoading, error, result, reset } = useRecordAtBat();
 *
 *   const handleAtBat = async () => {
 *     await recordAtBat({
 *       result: 'SINGLE',
 *       runnerAdvances: [
 *         { runnerId: 'player-1', fromBase: 0, toBase: 1 }
 *       ]
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       {isLoading && <div>Recording at-bat...</div>}
 *       {error && <div>Error: {error}</div>}
 *       <button onClick={handleAtBat}>Record Single</button>
 *     </div>
 *   );
 * };
 * ```
 */

import type { AtBatResult } from '@twsoftball/application';
import { useState, useCallback } from 'react';

// Application layer types (allowed imports)

// Local imports
import { getContainer } from '../../api/di/container';
import { useGameStore } from '../store';

/**
 * UI interface for runner advance data
 * Maps to RunnerAdvanceDTO in the adapter layer
 */
export interface UIRunnerAdvanceData {
  /** ID of the runner being moved */
  runnerId: string;
  /** Base the runner started from (0 = home plate, 1 = first, 2 = second, 3 = third) */
  fromBase: number;
  /** Base the runner is moving to (0 = home/scores, 1 = first, 2 = second, 3 = third) */
  toBase: number;
}

/**
 * UI interface for at-bat recording data
 */
export interface UIAtBatData {
  /** The at-bat result type (SINGLE, DOUBLE, WALK, etc.) */
  result: string;
  /** Array of runner movements for this at-bat */
  runnerAdvances: UIRunnerAdvanceData[];
}

/**
 * Hook state interface
 */
export interface UseRecordAtBatState {
  /** Function to record an at-bat */
  recordAtBat: (atBatData: UIAtBatData) => Promise<void>;
  /** Whether an at-bat recording operation is in progress */
  isLoading: boolean;
  /** Error message if recording failed */
  error: string | null;
  /** Result of the last successful at-bat recording */
  result: AtBatResult | null;
  /** Function to reset hook state */
  reset: () => void;
}

/**
 * Custom hook for recording at-bat results with comprehensive state management.
 *
 * @remarks
 * This hook encapsulates all the logic needed to record an at-bat, including:
 * - Validation of game state and batter eligibility
 * - Transformation of UI data to application layer commands
 * - Error handling and loading state management
 * - Integration with the game adapter
 *
 * The hook follows the DI Container pattern by using the gameAdapter which
 * internally manages dependency injection for application services.
 *
 * @returns Hook state and functions for at-bat recording
 */
export function useRecordAtBat(): UseRecordAtBatState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtBatResult | null>(null);

  // Get game state from store
  const { currentGame, activeGameState } = useGameStore();

  /**
   * Records an at-bat by transforming UI data to application commands
   * and executing through the game adapter.
   *
   * @param atBatData - At-bat data from the UI
   * @throws Error if validation fails or recording operation fails
   */
  const recordAtBat = useCallback(
    async (atBatData: UIAtBatData): Promise<void> => {
      try {
        // Validate game state
        if (!currentGame) {
          throw new Error('No active game found');
        }

        if (currentGame.status !== 'active') {
          throw new Error('Cannot record at-bat: game is not active');
        }

        // Validate current batter
        if (!activeGameState?.currentBatter) {
          throw new Error('No current batter found');
        }

        // Clear previous error and set loading
        setError(null);
        setIsLoading(true);

        // Transform UI data to adapter format
        const adapterData = {
          gameId: currentGame.id,
          batterId: activeGameState.currentBatter.id,
          result: atBatData.result,
          runnerAdvances: atBatData.runnerAdvances,
        };

        // Execute recording through adapter
        const container = getContainer();
        const recordingResult = await container.gameAdapter.recordAtBat(adapterData);

        // Update result state
        setResult(recordingResult);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to record at-bat';
        setError(errorMessage);
        throw err; // Re-throw for caller handling
      } finally {
        setIsLoading(false);
      }
    },
    [currentGame, activeGameState]
  );

  /**
   * Resets the hook state to initial values
   */
  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  return {
    recordAtBat,
    isLoading,
    error,
    result,
    reset,
  };
}
