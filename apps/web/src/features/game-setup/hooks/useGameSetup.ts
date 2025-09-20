/**
 * @file useGameSetup Hook
 * React hook for orchestrating the complete game setup workflow.
 *
 * @remarks
 * This hook provides a comprehensive interface for creating new games from
 * the setup wizard state. It handles all aspects of the game creation process
 * including validation, error handling, loading states, and integration with
 * the application layer through the DI container.
 *
 * **Key Responsibilities**:
 * - Convert UI wizard state to domain commands via mapper
 * - Execute StartNewGame use case through DI container
 * - Manage loading states during async operations
 * - Handle and categorize different types of errors
 * - Provide UI-friendly error messages and validation feedback
 * - Ensure proper cleanup and memory management
 * - Log operations for monitoring and debugging
 *
 * **Error Handling Strategy**:
 * - Domain validation errors → `validationErrors` field (categorized)
 * - Infrastructure errors → `error` field with user-friendly message
 * - Network errors → `error` field with retry guidance
 * - DI container errors → `error` field with app initialization message
 * - Unknown errors → Generic error message with full logging
 *
 * **State Management**:
 * - Uses useState for local state management
 * - Uses useCallback for memoized functions to prevent unnecessary re-renders
 * - Uses useRef for tracking component mount state to prevent memory leaks
 * - Proper cleanup in useEffect to handle component unmounting
 *
 * **Integration Requirements**:
 * - Uses DI container from Phase 1 for accessing use cases
 * - Uses wizard-to-command mapper from Phase 2 for state conversion
 * - Follows React hooks best practices for performance and correctness
 * - Maintains hexagonal architecture compliance
 *
 * @example
 * ```typescript
 * function GameSetupWizard() {
 *   const { startGame, isLoading, error, gameId, validationErrors, clearError } = useGameSetup();
 *   const wizardState = useGameStore(state => state.setupWizard);
 *
 *   const handleStartGame = async () => {
 *     try {
 *       await startGame(wizardState);
 *       if (gameId) {
 *         navigate(`/game/${gameId}`);
 *       }
 *     } catch (err) {
 *       // Error state is managed internally by the hook
 *       console.error('Game setup failed:', err);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {validationErrors?.teams && <ErrorMessage>{validationErrors.teams}</ErrorMessage>}
 *       {validationErrors?.lineup && (
 *         <ul>
 *           {validationErrors.lineup.map(error => <li key={error}>{error}</li>)}
 *         </ul>
 *       )}
 *       {error && <ErrorBanner onDismiss={clearError}>{error}</ErrorBanner>}
 *       <button onClick={handleStartGame} disabled={isLoading}>
 *         {isLoading ? 'Creating Game...' : 'Start Game'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { getContainer } from '../../../shared/api/di';
import { wizardToCommand } from '../../../shared/api/mappers';
import type { SetupWizardState } from '../../../shared/lib/store/gameStore';

/**
 * Validation errors categorized by type for UI-friendly display.
 */
export interface ValidationErrors {
  /** Team-related validation errors (names, selection) */
  teams?: string;
  /** Lineup-related validation errors (players, positions, jersey numbers) */
  lineup?: string[];
  /** General validation errors that don't fit other categories */
  general?: string;
}

/**
 * Return interface for the useGameSetup hook.
 */
export interface UseGameSetupReturn {
  /** Function to start game creation from wizard state */
  startGame: (wizardState: SetupWizardState) => Promise<void>;
  /** Whether a game creation operation is currently in progress */
  isLoading: boolean;
  /** Infrastructure or general error message for user display */
  error: string | null;
  /** Game ID of successfully created game */
  gameId: string | null;
  /** Validation errors categorized by type */
  validationErrors: ValidationErrors | null;
  /** Function to clear current error state */
  clearError: () => void;
  /** Function to reset all state to initial values */
  reset: () => void;
}

/**
 * React hook for orchestrating game setup workflow with comprehensive error handling.
 *
 * @remarks
 * This hook encapsulates all complexity of game creation including:
 * - Async operation management with loading states
 * - Error categorization and user-friendly messaging
 * - Memory leak prevention with proper cleanup
 * - Performance optimization with memoized callbacks
 * - Integration with DI container and application layer
 *
 * The hook follows React best practices:
 * - Pure function with no side effects on render
 * - Memoized callbacks to prevent unnecessary re-renders
 * - Ref-based cleanup to prevent state updates after unmount
 * - Clear separation of concerns between state and operations
 *
 * Error handling is comprehensive:
 * - Domain validation errors are mapped to specific UI categories
 * - Infrastructure errors get user-friendly messages with action guidance
 * - All errors are logged with appropriate context for debugging
 * - Concurrent operations are handled safely
 *
 * @returns Hook interface with game creation function and state
 *
 * @example
 * ```typescript
 * // Basic usage in setup wizard
 * const { startGame, isLoading, error, gameId } = useGameSetup();
 *
 * const handleSubmit = useCallback(async () => {
 *   await startGame(wizardState);
 * }, [startGame, wizardState]);
 *
 * // Advanced usage with error handling
 * const {
 *   startGame,
 *   isLoading,
 *   error,
 *   validationErrors,
 *   clearError,
 *   reset
 * } = useGameSetup();
 *
 * // Handle different error types
 * if (validationErrors?.teams) {
 *   // Show team validation UI
 * }
 * if (validationErrors?.lineup) {
 *   // Show lineup validation UI
 * }
 * if (error) {
 *   // Show general error banner
 * }
 * ```
 */
export function useGameSetup(): UseGameSetupReturn {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  // Ref to track component mount state for cleanup
  const isMountedRef = useRef(true);
  // AbortController ref for cancelling async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect((): (() => void) => {
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Clears all error state.
   */
  const clearError = useCallback(() => {
    setError(null);
    setValidationErrors(null);
  }, []);

  /**
   * Resets all state to initial values.
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setGameId(null);
    setValidationErrors(null);
  }, []);

  /**
   * Maps use case validation errors to UI-friendly validation error structure.
   *
   * @param errors - Array of validation error messages from use case
   * @returns Categorized validation errors for UI display
   */
  const mapValidationErrors = useCallback((errors: string[]): ValidationErrors => {
    const result: ValidationErrors = {};
    const lineupErrors: string[] = [];

    for (const error of errors) {
      const lowerError = error.toLowerCase();

      // Categorize team-related errors
      if (
        lowerError.includes('team name') ||
        lowerError.includes('team names') ||
        lowerError.includes('home team') ||
        lowerError.includes('away team')
      ) {
        // Take first team error as primary message
        if (!result.teams) {
          result.teams = error;
        }
      }
      // Categorize lineup-related errors
      else if (
        lowerError.includes('player') ||
        lowerError.includes('lineup') ||
        lowerError.includes('jersey') ||
        lowerError.includes('position') ||
        lowerError.includes('batting')
      ) {
        lineupErrors.push(error);
      }
      // General errors
      else {
        result.general = error;
      }
    }

    if (lineupErrors.length > 0) {
      result.lineup = lineupErrors;
    }

    return result;
  }, []);

  /**
   * Maps infrastructure and other errors to user-friendly messages.
   *
   * @param error - The error that occurred
   * @returns User-friendly error message with action guidance
   */
  const mapInfrastructureError = useCallback((error: unknown): string => {
    if (!(error instanceof Error)) {
      return 'An unexpected error occurred. Please try again.';
    }

    const message = error.message.toLowerCase();

    // Database/persistence errors
    if (message.includes('save') || message.includes('database') || message.includes('storage')) {
      return 'Unable to save game. Please check your connection and try again.';
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    // DI container errors
    if (
      message.includes('container') ||
      message.includes('initialized') ||
      message.includes('dependency')
    ) {
      return 'Application not properly initialized. Please refresh the page.';
    }

    // Event store errors
    if (message.includes('event') || message.includes('store')) {
      return 'Unable to record game events. Please try again.';
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }, []);

  /**
   * Starts the game creation process from the provided wizard state.
   *
   * @remarks
   * This function orchestrates the complete game creation workflow:
   * 1. Validates component is still mounted (prevents memory leaks)
   * 2. Checks for concurrent operations (prevents duplicate calls)
   * 3. Clears previous error state for clean retry experience
   * 4. Maps wizard state to domain command via mapper
   * 5. Executes StartNewGame use case through DI container
   * 6. Handles success/failure scenarios with appropriate state updates
   * 7. Logs all operations for monitoring and debugging
   *
   * Error handling is comprehensive:
   * - Wizard mapping errors → validation errors (domain validation)
   * - Use case validation failures → validation errors (categorized)
   * - Infrastructure failures → general error with user-friendly message
   * - Unknown errors → generic error with full logging context
   *
   * @param wizardState - Complete wizard state from the setup flow
   * @throws Never throws - all errors are handled internally and set in state
   */
  const startGame = useCallback(
    async (wizardState: SetupWizardState): Promise<void> => {
      // Early return if component unmounted
      if (!isMountedRef.current) {
        return;
      }

      // Prevent concurrent operations
      if (isLoading) {
        return;
      }

      // Cancel any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this operation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Clear previous errors and set loading state
        clearError();
        setIsLoading(true);

        // Get dependencies from DI container
        const container = getContainer();
        const { startNewGame: startNewGameUseCase, logger } = container;

        logger.debug('Starting game creation process', {
          homeTeam: wizardState.teams.home,
          awayTeam: wizardState.teams.away,
          ourTeam: wizardState.teams.ourTeam,
          lineupSize: wizardState.lineup.length,
          step: wizardState.step,
          isComplete: wizardState.isComplete,
        });

        // Map wizard state to domain command
        let command;
        try {
          command = wizardToCommand(wizardState);
        } catch (mappingError) {
          const errorMessage =
            mappingError instanceof Error ? mappingError.message : 'Invalid wizard state';

          logger.warn('Game setup validation failed', {
            error: errorMessage,
            type: 'validation',
            wizardState: {
              step: wizardState.step,
              teamsValid: Boolean(wizardState.teams.home && wizardState.teams.away),
              lineupSize: wizardState.lineup.length,
            },
          });

          // Domain validation errors go to validationErrors
          if (isMountedRef.current && !signal.aborted) {
            setValidationErrors(mapValidationErrors([errorMessage]));
            setIsLoading(false);
          }
          return;
        }

        // Check for abort before async operation
        if (signal.aborted) {
          return;
        }

        // Execute use case
        const result = await startNewGameUseCase.execute(command);

        // Check mount state and abort signal before updating (prevent memory leaks)
        if (!isMountedRef.current || signal.aborted) {
          return;
        }

        if (result.success) {
          // Success path
          setGameId(result.gameId.value);
          setIsLoading(false);

          logger.info('Game created successfully', {
            gameId: result.gameId.value,
            homeTeam: wizardState.teams.home,
            awayTeam: wizardState.teams.away,
            ourTeam: wizardState.teams.ourTeam,
            lineupSize: wizardState.lineup.length,
          });
        } else {
          // Validation failure from use case
          const validationErrors = mapValidationErrors(result.errors || []);
          setValidationErrors(validationErrors);
          setIsLoading(false);

          logger.warn('Game creation failed due to validation errors', {
            errors: result.errors,
            gameId: result.gameId.value,
            validationErrorCategories: Object.keys(validationErrors),
          });
        }
      } catch (infrastructureError) {
        // Infrastructure or unexpected errors
        try {
          const container = getContainer();
          container.logger.error('Failed to start game', infrastructureError as Error, {
            type: 'infrastructure',
            homeTeam: wizardState.teams.home,
            awayTeam: wizardState.teams.away,
            lineupSize: wizardState.lineup.length,
          });
        } catch (logError) {
          // Fallback logging to console if DI container fails
          // eslint-disable-next-line no-console -- Fallback logging when DI container fails
          console.error('Failed to start game:', infrastructureError);
          // eslint-disable-next-line no-console -- Fallback logging when DI container fails
          console.error('Logger error:', logError);
        }

        if (isMountedRef.current && !signal.aborted) {
          const userFriendlyMessage = mapInfrastructureError(infrastructureError);
          setError(userFriendlyMessage);
          setIsLoading(false);
        }
      }
    },
    [isLoading, clearError, mapValidationErrors, mapInfrastructureError, isMountedRef]
  );

  // Return hook interface
  return {
    startGame,
    isLoading,
    error,
    gameId,
    validationErrors,
    clearError,
    reset,
  };
}
