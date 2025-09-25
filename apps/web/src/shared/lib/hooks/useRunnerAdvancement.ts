/**
 * @file useRunnerAdvancement Hook
 *
 * React hook for managing runner advancement UI state and validating movement rules.
 * Provides automatic advance calculations and undo/redo functionality for at-bat recording.
 *
 * @remarks
 * This hook is responsible for:
 * - Managing runner advancement UI state during at-bat recording
 * - Calculating automatic advances based on hit types
 * - Validating base movement rules and preventing invalid advances
 * - Providing helper functions for forced advance scenarios
 * - Managing undo/redo state for runner positions
 *
 * Architecture compliance:
 * - Uses game store for current base state
 * - Integrates with domain rules for valid movements
 * - Type safety for runner advance data
 * - Clean separation of UI logic from business rules
 *
 * @example
 * ```typescript
 * const AtBatRecordingComponent = () => {
 *   const {
 *     runnerAdvances,
 *     setRunnerAdvance,
 *     calculateAutomaticAdvances,
 *     clearAdvances,
 *     canAdvanceToBase
 *   } = useRunnerAdvancement();
 *
 *   const handleSingle = () => {
 *     const autoAdvances = calculateAutomaticAdvances(AtBatResultType.SINGLE);
 *     autoAdvances.forEach(advance => setRunnerAdvance(advance));
 *   };
 *
 *   return (
 *     <div>
 *       {runnerAdvances.map(advance => (
 *         <div key={advance.runnerId}>
 *           Runner {advance.runnerId}: {advance.fromBase} → {advance.toBase}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */

import { AtBatResultType } from '@twsoftball/application';
import { useState, useCallback, useMemo } from 'react';

// Application layer types (allowed imports)

// Local imports
import { useGameStore } from '../store';

/**
 * Interface for runner advance data in the UI
 */
export interface RunnerAdvance {
  /** ID of the runner being moved */
  runnerId: string;
  /** Base the runner started from (0 = home plate, 1 = first, 2 = second, 3 = third) */
  fromBase: number;
  /** Base the runner is moving to (0 = home/scores, 1 = first, 2 = second, 3 = third) */
  toBase: number;
}

/**
 * Interface for forced advance data (extends RunnerAdvance)
 */
export interface ForcedAdvance extends RunnerAdvance {
  /** Whether this advance is forced (required) */
  isForced: boolean;
}

/**
 * Hook state interface
 */
export interface UseRunnerAdvancementState {
  /** Current array of runner advances */
  runnerAdvances: RunnerAdvance[];
  /** Function to set or update a runner advance */
  setRunnerAdvance: (advance: RunnerAdvance) => void;
  /** Function to calculate automatic advances for a given at-bat result */
  calculateAutomaticAdvances: (result: AtBatResultType) => RunnerAdvance[];
  /** Function to validate if a movement is allowed */
  validateMovement: (advance: RunnerAdvance) => boolean;
  /** Function to clear all advances */
  clearAdvances: () => void;
  /** Function to get forced advances for a given result */
  getForcedAdvances: (result: AtBatResultType) => ForcedAdvance[];
  /** Function to check if a runner can advance to a specific base */
  canAdvanceToBase: (runnerId: string, fromBase: number, toBase: number) => boolean;
  /** Function to validate if an advancement is valid */
  isValidAdvancement: (advance: RunnerAdvance) => boolean;
  /** Function to undo the last advance */
  undoLastAdvance: () => void;
  /** Function to redo an advance */
  redoAdvance: () => void;
  /** Whether there are advances that can be undone */
  hasUndoableAdvances: boolean;
  /** Whether there are advances that can be redone */
  hasRedoableAdvances: boolean;
}

/**
 * Custom hook for managing runner advancement state and calculations.
 *
 * @remarks
 * This hook encapsulates all the logic needed for runner advancement during
 * at-bat recording, including:
 * - State management for current runner positions
 * - Automatic calculation of advances based on hit types
 * - Validation of movement rules (no backwards movement, base conflicts, etc.)
 * - Undo/redo functionality for complex scenarios
 * - Integration with current game state
 *
 * The hook provides a clean interface for the UI to manage runner movements
 * while ensuring all business rules are followed.
 *
 * @returns Hook state and functions for runner advancement management
 */
export function useRunnerAdvancement(): UseRunnerAdvancementState {
  const [runnerAdvances, setRunnerAdvances] = useState<RunnerAdvance[]>([]);
  const [undoHistory, setUndoHistory] = useState<RunnerAdvance[][]>([]);
  const [redoHistory, setRedoHistory] = useState<RunnerAdvance[][]>([]);

  // Get current game state
  const { activeGameState } = useGameStore();

  /**
   * Sets or updates a runner advance, replacing any existing advance for the same runner
   */
  const setRunnerAdvance = useCallback((advance: RunnerAdvance) => {
    setRunnerAdvances(prevAdvances => {
      const newAdvances = prevAdvances.filter(a => a.runnerId !== advance.runnerId);
      newAdvances.push(advance);

      // Save to undo history
      setUndoHistory(prev => [...prev, prevAdvances]);
      // Clear redo history when new action is performed
      setRedoHistory([]);

      return newAdvances;
    });
  }, []);

  /**
   * Clears all current advances
   */
  const clearAdvances = useCallback(() => {
    setUndoHistory(prev => [...prev, runnerAdvances]);
    setRedoHistory([]);
    setRunnerAdvances([]);
  }, [runnerAdvances]);

  /**
   * Calculates automatic advances based on the at-bat result type
   */
  const calculateAutomaticAdvances = useCallback(
    (result: AtBatResultType): RunnerAdvance[] => {
      const advances: RunnerAdvance[] = [];
      const currentBatter = activeGameState?.currentBatter;
      const bases = activeGameState?.bases;

      if (!currentBatter || !bases) {
        return advances;
      }

      switch (result) {
        case AtBatResultType.SINGLE:
          // Batter advances to first
          advances.push({
            runnerId: currentBatter.id,
            fromBase: 0,
            toBase: 1,
          });

          // Existing runners typically advance one base on single
          if (bases.first) {
            advances.push({
              runnerId: bases.first.id,
              fromBase: 1,
              toBase: 2,
            });
          }
          if (bases.second) {
            advances.push({
              runnerId: bases.second.id,
              fromBase: 2,
              toBase: 3,
            });
          }
          if (bases.third) {
            advances.push({
              runnerId: bases.third.id,
              fromBase: 3,
              toBase: 0, // scores
            });
          }
          break;

        case AtBatResultType.DOUBLE:
          // Batter advances to second
          advances.push({
            runnerId: currentBatter.id,
            fromBase: 0,
            toBase: 2,
          });

          // Existing runners typically advance two bases on double
          if (bases.first) {
            advances.push({
              runnerId: bases.first.id,
              fromBase: 1,
              toBase: 3,
            });
          }
          if (bases.second) {
            advances.push({
              runnerId: bases.second.id,
              fromBase: 2,
              toBase: 0, // scores
            });
          }
          if (bases.third) {
            advances.push({
              runnerId: bases.third.id,
              fromBase: 3,
              toBase: 0, // scores
            });
          }
          break;

        case AtBatResultType.TRIPLE:
          // Batter advances to third
          advances.push({
            runnerId: currentBatter.id,
            fromBase: 0,
            toBase: 3,
          });

          // All existing runners score on triple
          if (bases.first) {
            advances.push({
              runnerId: bases.first.id,
              fromBase: 1,
              toBase: 0,
            });
          }
          if (bases.second) {
            advances.push({
              runnerId: bases.second.id,
              fromBase: 2,
              toBase: 0,
            });
          }
          if (bases.third) {
            advances.push({
              runnerId: bases.third.id,
              fromBase: 3,
              toBase: 0,
            });
          }
          break;

        case AtBatResultType.HOME_RUN:
          // Batter scores
          advances.push({
            runnerId: currentBatter.id,
            fromBase: 0,
            toBase: 0, // scores
          });

          // All existing runners score
          if (bases.first) {
            advances.push({
              runnerId: bases.first.id,
              fromBase: 1,
              toBase: 0,
            });
          }
          if (bases.second) {
            advances.push({
              runnerId: bases.second.id,
              fromBase: 2,
              toBase: 0,
            });
          }
          if (bases.third) {
            advances.push({
              runnerId: bases.third.id,
              fromBase: 3,
              toBase: 0,
            });
          }
          break;

        case AtBatResultType.WALK:
          // Batter advances to first
          advances.push({
            runnerId: currentBatter.id,
            fromBase: 0,
            toBase: 1,
          });
          // Note: Forced advances are handled by getForcedAdvances
          break;

        case AtBatResultType.STRIKEOUT:
        case AtBatResultType.GROUND_OUT:
        case AtBatResultType.FLY_OUT:
          // No automatic advances on outs
          break;

        default:
          // For other results, no automatic advances
          break;
      }

      return advances;
    },
    [activeGameState]
  );

  /**
   * Gets forced advances for situations like walks with bases loaded
   */
  const getForcedAdvances = useCallback(
    (result: AtBatResultType): ForcedAdvance[] => {
      const forcedAdvances: ForcedAdvance[] = [];
      const currentBatter = activeGameState?.currentBatter;
      const bases = activeGameState?.bases;

      if (!currentBatter || !bases) {
        return forcedAdvances;
      }

      // Only walks create forced advances
      if (result === AtBatResultType.WALK) {
        // Batter is always forced to first on walk
        forcedAdvances.push({
          runnerId: currentBatter.id,
          fromBase: 0,
          toBase: 1,
          isForced: true,
        });

        // Check for forced advances due to bases being occupied
        if (bases.first) {
          // Runner on first is forced to second
          forcedAdvances.push({
            runnerId: bases.first.id,
            fromBase: 1,
            toBase: 2,
            isForced: true,
          });

          if (bases.second) {
            // Runner on second is forced to third
            forcedAdvances.push({
              runnerId: bases.second.id,
              fromBase: 2,
              toBase: 3,
              isForced: true,
            });

            if (bases.third) {
              // Runner on third is forced home
              forcedAdvances.push({
                runnerId: bases.third.id,
                fromBase: 3,
                toBase: 0,
                isForced: true,
              });
            }
          }
        }
      }

      return forcedAdvances;
    },
    [activeGameState]
  );

  /**
   * Validates if a runner can advance to a specific base
   */
  const canAdvanceToBase = useCallback(
    (runnerId: string, fromBase: number, toBase: number): boolean => {
      // Can't stay on same base
      if (fromBase === toBase) {
        return false;
      }

      // Generally can't move backwards (except in special cases like outs)
      if (fromBase > toBase && toBase !== 0) {
        return false;
      }

      // Can't skip bases on normal advancement
      if (fromBase >= 0 && toBase > 0 && toBase - fromBase > 1) {
        return false;
      }

      // Check if target base is already occupied by another runner
      const bases = activeGameState?.bases;
      if (bases) {
        if (toBase === 1 && bases.first && bases.first.id !== runnerId) {
          return false;
        }
        if (toBase === 2 && bases.second && bases.second.id !== runnerId) {
          return false;
        }
        if (toBase === 3 && bases.third && bases.third.id !== runnerId) {
          return false;
        }
      }

      return true;
    },
    [activeGameState]
  );

  /**
   * Validates if an advancement is valid
   */
  const isValidAdvancement = useCallback(
    (advance: RunnerAdvance): boolean => {
      return canAdvanceToBase(advance.runnerId, advance.fromBase, advance.toBase);
    },
    [canAdvanceToBase]
  );

  /**
   * Validates movement (alias for isValidAdvancement for compatibility)
   */
  const validateMovement = useCallback(
    (advance: RunnerAdvance): boolean => {
      return isValidAdvancement(advance);
    },
    [isValidAdvancement]
  );

  /**
   * Undoes the last advance operation
   */
  const undoLastAdvance = useCallback(() => {
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      setRedoHistory(prev => [...prev, runnerAdvances]);
      setRunnerAdvances(lastState || []);
      setUndoHistory(prev => prev.slice(0, -1));
    }
  }, [undoHistory, runnerAdvances]);

  /**
   * Redoes an advance operation
   */
  const redoAdvance = useCallback(() => {
    if (redoHistory.length > 0) {
      const nextState = redoHistory[redoHistory.length - 1];
      setUndoHistory(prev => [...prev, runnerAdvances]);
      setRunnerAdvances(nextState || []);
      setRedoHistory(prev => prev.slice(0, -1));
    }
  }, [redoHistory, runnerAdvances]);

  // Computed properties for undo/redo availability
  const hasUndoableAdvances = useMemo(() => undoHistory.length > 0, [undoHistory]);
  const hasRedoableAdvances = useMemo(() => redoHistory.length > 0, [redoHistory]);

  return {
    runnerAdvances,
    setRunnerAdvance,
    calculateAutomaticAdvances,
    validateMovement,
    clearAdvances,
    getForcedAdvances,
    canAdvanceToBase,
    isValidAdvancement,
    undoLastAdvance,
    redoAdvance,
    hasUndoableAdvances,
    hasRedoableAdvances,
  };
}
