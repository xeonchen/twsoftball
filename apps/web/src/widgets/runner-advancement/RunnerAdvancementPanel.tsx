/**
 * @file RunnerAdvancementPanel.tsx
 *
 * Main container component for runner advancement UI.
 * Integrates with useRunnerAdvancement hook and manages runner state.
 *
 * @remarks
 * This component provides the main interface for managing runner advancement
 * during at-bat recording. It integrates with the useRunnerAdvancement hook
 * to provide state management and validation, and displays RunnerAdvanceDropdown
 * components for each runner currently on base.
 *
 * Features:
 * - Integration with useRunnerAdvancement hook from Phase 1
 * - Displays current runners with advancement options
 * - Handles validation and error display
 * - Supports automatic advances and forced advance scenarios
 * - Mobile-first responsive design with accessibility support
 * - Undo/redo functionality for complex scenarios
 * - Baseball-inspired visual design with field green theme
 *
 * @example
 * ```tsx
 * <RunnerAdvancementPanel
 *   currentGameState={gameState}
 *   atBatResult={{ type: AtBatResultType.SINGLE, label: 'Single', category: 'hit' }}
 *   onComplete={handleComplete}
 * />
 * ```
 */

import { AtBatResultType } from '@twsoftball/application';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useRunnerAdvancement } from '../../shared/hooks/useRunnerAdvancement';
import type { RunnerAdvance, ForcedAdvance } from '../../shared/hooks/useRunnerAdvancement';

import { RunnerAdvanceDropdown } from './RunnerAdvanceDropdown';

/**
 * Interface for at-bat result data
 */
export interface AtBatResult {
  type: AtBatResultType;
  label: string;
  category: 'hit' | 'walk' | 'out' | 'other';
}

/**
 * Interface for game state data
 */
export interface GameState {
  currentBatter?: {
    id: string;
    name: string;
  };
  bases?: {
    first?: { id: string; name: string } | null;
    second?: { id: string; name: string } | null;
    third?: { id: string; name: string } | null;
  };
  inning: number;
  isTopOfInning: boolean;
}

/**
 * Props interface for RunnerAdvancementPanel component
 */
export interface RunnerAdvancementPanelProps {
  /** Current game state with runners on bases */
  currentGameState?: GameState | null;
  /** At-bat result that triggered advancement */
  atBatResult?: AtBatResult;
  /** Callback when advancement is complete */
  onComplete?: (advances: RunnerAdvance[]) => void;
  /** Whether panel is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Interface for runner on base
 */
interface RunnerOnBase {
  id: string;
  name: string;
  base: number;
}

/**
 * RunnerAdvancementPanel Component
 *
 * Main container for managing runner advancement during at-bat recording.
 * Integrates with useRunnerAdvancement hook and displays dropdown components
 * for each runner on base.
 */
export const RunnerAdvancementPanel: React.FC<RunnerAdvancementPanelProps> = ({
  currentGameState,
  atBatResult,
  onComplete: _, // Future use for callback when advancement is complete
  disabled = false,
  className = '',
}) => {
  const {
    runnerAdvances,
    setRunnerAdvance,
    calculateAutomaticAdvances,
    clearAdvances,
    getForcedAdvances,
    canAdvanceToBase,
    isValidAdvancement,
    undoLastAdvance,
    redoAdvance,
    hasUndoableAdvances,
    hasRedoableAdvances,
  } = useRunnerAdvancement();

  /**
   * Get list of runners currently on bases
   */
  const runnersOnBases = useMemo((): RunnerOnBase[] => {
    if (!currentGameState?.bases) return [];

    const runners: RunnerOnBase[] = [];

    const { first, second, third } = currentGameState.bases;

    if (first) {
      runners.push({ id: first.id, name: first.name, base: 1 });
    }
    if (second) {
      runners.push({ id: second.id, name: second.name, base: 2 });
    }
    if (third) {
      runners.push({ id: third.id, name: third.name, base: 3 });
    }

    return runners;
  }, [currentGameState?.bases]);

  /**
   * Get forced advances for current at-bat result
   */
  const forcedAdvances = useMemo((): ForcedAdvance[] => {
    if (!atBatResult) return [];
    return getForcedAdvances(atBatResult.type);
  }, [atBatResult, getForcedAdvances]);

  /**
   * Check if a runner has a forced advance
   */
  const isRunnerForced = useCallback(
    (runnerId: string): boolean => {
      return forcedAdvances.some(advance => advance.runnerId === runnerId && advance.isForced);
    },
    [forcedAdvances]
  );

  /**
   * Get forced advance for a specific runner
   */
  const getForcedAdvanceForRunner = useCallback(
    (runnerId: string): ForcedAdvance | undefined => {
      return forcedAdvances.find(advance => advance.runnerId === runnerId && advance.isForced);
    },
    [forcedAdvances]
  );

  /**
   * Calculate automatic advances when at-bat result changes
   */
  useEffect(() => {
    if (atBatResult && currentGameState) {
      const autoAdvances = calculateAutomaticAdvances(atBatResult.type);

      // Apply automatic advances
      autoAdvances.forEach(advance => {
        setRunnerAdvance(advance);
      });
    }
  }, [atBatResult, currentGameState, calculateAutomaticAdvances, setRunnerAdvance]);

  /**
   * Handle runner advance change
   */
  const handleAdvanceChange = useCallback(
    (advance: RunnerAdvance) => {
      if (disabled) return;
      try {
        setRunnerAdvance(advance);
      } catch (error) {
        // Handle hook errors gracefully - log but don't crash the UI
        // eslint-disable-next-line no-console -- Console error for development debugging
        console.error('Error setting runner advance:', error);
      }
    },
    [disabled, setRunnerAdvance]
  );

  /**
   * Handle clear all advances
   */
  const handleClearAll = useCallback(() => {
    if (disabled) return;
    clearAdvances();
  }, [disabled, clearAdvances]);

  /**
   * Handle undo last advance
   */
  const handleUndo = useCallback(() => {
    if (disabled || !hasUndoableAdvances) return;
    undoLastAdvance();
  }, [disabled, hasUndoableAdvances, undoLastAdvance]);

  /**
   * Handle redo advance
   */
  const handleRedo = useCallback(() => {
    if (disabled || !hasRedoableAdvances) return;
    redoAdvance();
  }, [disabled, hasRedoableAdvances, redoAdvance]);

  /**
   * Validate all current advances
   */
  const validationErrors = useMemo((): string[] => {
    const errors: string[] = [];

    runnerAdvances.forEach(advance => {
      if (!isValidAdvancement(advance)) {
        const runner = runnersOnBases.find(r => r.id === advance.runnerId);
        if (runner) {
          if (advance.toBase === 1 && advance.fromBase > 1) {
            errors.push(`${runner.name} cannot move backwards to 1st base`);
          } else if (advance.toBase > 0 && advance.toBase - advance.fromBase > 1) {
            errors.push(`${runner.name} cannot skip bases`);
          } else {
            errors.push(`Invalid advancement for ${runner.name}`);
          }
        }
      }
    });

    return errors;
  }, [runnerAdvances, isValidAdvancement, runnersOnBases]);

  /**
   * Check if there are any invalid advances
   */
  const hasInvalidAdvances = validationErrors.length > 0;

  /**
   * Generate container CSS classes
   */
  const containerClasses = useMemo(() => {
    const baseClasses = [
      'w-full',
      'flex',
      'flex-col',
      'bg-white',
      'rounded-lg',
      'border-2',
      'border-green-300',
      'p-4',
      'space-y-4',
    ];

    if (disabled) {
      baseClasses.push('opacity-50', 'pointer-events-none');
    }

    return [...baseClasses, className].join(' ');
  }, [disabled, className]);

  // Handle missing or invalid game state
  if (!currentGameState) {
    return (
      <div className={containerClasses} role="region" aria-label="Runner advancement">
        <div className="text-center text-gray-600">
          <p className="text-lg font-semibold">No active game</p>
          <p className="text-sm">Cannot show runner advancement without game state</p>
        </div>
      </div>
    );
  }

  // Handle no runners on base
  if (runnersOnBases.length === 0) {
    return (
      <div className={containerClasses} role="region" aria-label="Runner advancement">
        <div className="text-center text-gray-600">
          <p className="text-lg font-semibold">No runners on base</p>
          <p className="text-sm">Select where each runner advances</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} role="region" aria-label="Runner advancement">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Runner Advancement</h2>
          <p className="text-sm text-gray-600">Select where each runner advances</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {hasUndoableAdvances && (
            <button
              onClick={handleUndo}
              disabled={disabled}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Undo last advancement"
            >
              Undo
            </button>
          )}

          {hasRedoableAdvances && (
            <button
              onClick={handleRedo}
              disabled={disabled}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Redo advancement"
            >
              Redo
            </button>
          )}

          {runnerAdvances.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={disabled}
              className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Clear all advances"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Forced advance notification */}
      {forcedAdvances.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
          <p className="text-sm font-medium text-yellow-800">
            Forced advance - Some runners must advance due to the play
          </p>
        </div>
      )}

      {/* Runner advancement dropdowns */}
      <div className="space-y-3">
        {runnersOnBases.map(runner => {
          const currentAdvance = runnerAdvances.find(adv => adv.runnerId === runner.id);
          const forcedAdvance = getForcedAdvanceForRunner(runner.id);
          const isForced = isRunnerForced(runner.id);

          // Get error message for this runner
          const runnerError = validationErrors.find(error => error.includes(runner.name));
          const specificError =
            runnerError ||
            (currentAdvance && !isValidAdvancement(currentAdvance)
              ? `Cannot advance to ${currentAdvance.toBase === 0 ? 'HOME' : `${currentAdvance.toBase}${currentAdvance.toBase === 1 ? 'st' : currentAdvance.toBase === 2 ? 'nd' : 'rd'} base`}`
              : undefined);

          // Get toBase value with proper type handling
          const selectedToBase = forcedAdvance?.toBase ?? currentAdvance?.toBase;

          const dropdownProps = {
            key: runner.id,
            runnerId: runner.id,
            runnerName: runner.name,
            fromBase: runner.base,
            onAdvanceChange: handleAdvanceChange,
            canAdvanceToBase,
            isForced,
            disabled,
            ...(selectedToBase !== undefined && { toBase: selectedToBase }),
            ...(specificError !== undefined && { error: specificError }),
          };

          return <RunnerAdvanceDropdown {...dropdownProps} />;
        })}
      </div>

      {/* Validation errors summary */}
      {hasInvalidAdvances && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-md">
          <p className="text-sm font-medium text-red-800">Some advances are invalid:</p>
          <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion status */}
      {runnerAdvances.length > 0 && !hasInvalidAdvances && (
        <div className="p-3 bg-green-50 border border-green-300 rounded-md">
          <p className="text-sm font-medium text-green-800">
            ✓ All advances are valid and ready to apply
          </p>
        </div>
      )}
    </div>
  );
};
