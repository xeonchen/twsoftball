import { AtBatResultType, FieldPosition } from '@twsoftball/application';
import {
  type ReactElement,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ErrorInfo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useGameStore } from '../../../entities/game';
import {
  useRecordAtBat,
  useRunnerAdvancement,
  useGameWithUndoRedo,
} from '../../../features/game-core';
import {
  LineupEditor,
  SubstitutionDialog,
  SubstitutionHistory,
} from '../../../features/lineup-management';
import { useSubstitutePlayerAPI } from '../../../features/substitute-player';
import { useErrorRecovery, useNavigationGuard, useTimerManager } from '../../../shared/lib/hooks';
import { useUIStore } from '../../../shared/lib/store';
import { debounce } from '../../../shared/lib/utils';
import { BenchManagementWidget } from '../../../widgets/bench-management';
import { ErrorBoundary } from '../../../widgets/error-boundary';
import { RunnerAdvancementPanel } from '../../../widgets/runner-advancement';

/** Duration to show RBI notification in milliseconds */
const RBI_NOTIFICATION_DURATION_MS = 3000;

/**
 * Game Recording Page Component
 *
 * Implements Screen 5: Game Recording (Main Interface) from wireframes.md
 * The primary interface for recording live softball game actions with
 * optimized mobile-first design and navigation protection.
 *
 * Features:
 * - Fixed header with always-visible score
 * - Base diamond display with runner status
 * - Current batter information and next batter preview
 * - Scrollable action buttons with thumb zone optimization
 * - Undo/redo functionality
 * - Browser navigation protection during active games
 * - Auto-save and state persistence
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 5
 */
export function GameRecordingPage(): ReactElement {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    currentGame,
    activeGameState,
    isGameActive,
    canUndo,
    canRedo,
    isUndoRedoLoading,
    undo,
    redo,
    lastUndoRedoResult,
    error: gameError,
  } = useGameWithUndoRedo();

  // Keep updateScore from original useGameStore for score updates
  const { updateScore } = useGameStore();
  const { showNavigationWarning, showInfo } = useUIStore();
  const timers = useTimerManager();

  // Browser navigation protection
  useNavigationGuard(
    isGameActive,
    () => showNavigationWarning(),
    "Game in progress. Your progress will be saved but you'll need to resume manually. Continue?"
  );

  // Integration state
  const [showRunnerAdvancement, setShowRunnerAdvancement] = useState(false);
  const [pendingAtBatResult, setPendingAtBatResult] = useState<string | null>(null);
  const [rbiNotification, setRbiNotification] = useState<number | null>(null);

  // Phase 5: Lineup Management state
  const [showLineupInterface, setShowLineupInterface] = useState(false);
  const [showLineupEditor, setShowLineupEditor] = useState(false);
  const [showSubstitutionHistory, setShowSubstitutionHistory] = useState(false);
  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
  const [selectedPlayerForSubstitution, setSelectedPlayerForSubstitution] = useState<{
    playerId: string;
    battingSlot: number;
    playerName: string;
  } | null>(null);

  // Phase 1 hooks integration
  const { recordAtBat, isLoading, error, result, reset } = useRecordAtBat();
  const { runnerAdvances, clearAdvances, isValidAdvancement } = useRunnerAdvancement();

  // Phase 5: Substitute player integration
  const substitutePlayerAPI = useSubstitutePlayerAPI();

  // Phase 4: Error handling and recovery
  const errorRecovery = useErrorRecovery();

  // Destructure methods from errorRecovery to get stable references
  const { preserveUserInput, reset: resetErrorRecovery } = errorRecovery;

  // Preserve user input during errors
  useEffect(() => {
    if (pendingAtBatResult) {
      preserveUserInput({
        atBatResult: pendingAtBatResult,
        runnerAdvances,
        gameState: activeGameState,
      });
    }
  }, [pendingAtBatResult, runnerAdvances, activeGameState, preserveUserInput]);

  // Reset error recovery when game state changes significantly
  useEffect(() => {
    if (gameId && !isLoading) {
      reset(); // Clear stale gameId from previous operation
    }
  }, [gameId, isLoading, reset]);

  // Cleanup error recovery on component unmount
  useEffect(() => {
    return (): void => {
      resetErrorRecovery();
      reset(); // Also reset useRecordAtBat state
    };
  }, [resetErrorRecovery, reset]);

  // Sync errors from useRecordAtBat with error recovery
  const { setError: setErrorRecovery } = errorRecovery;
  useEffect(() => {
    if (error) {
      const errorObj = new Error(error);

      // Determine error type from message content
      if (error.includes('timeout') || error.includes('timed out')) {
        errorObj.name = 'TimeoutError';
      } else if (error.includes('network') || error.includes('connection')) {
        errorObj.name = 'NetworkError';
      } else if (error.includes('validation') || error.includes('invalid')) {
        errorObj.name = 'ValidationError';
      } else if (error.includes('batter') || error.includes('lineup')) {
        errorObj.name = 'ValidationError';
      } else if (error.includes('modified') || error.includes('conflict')) {
        errorObj.name = 'ConcurrencyError';
      } else if (error.includes('completed') || error.includes('game')) {
        errorObj.name = 'GameStateError';
      }

      setErrorRecovery(errorObj);
    } else {
      resetErrorRecovery();
    }
  }, [error, setErrorRecovery, resetErrorRecovery]);

  /**
   * Map action button IDs to domain at-bat result types
   */
  const mapActionToAtBatResult = (actionType: string): AtBatResultType => {
    const actionMap: Record<string, AtBatResultType> = {
      single: AtBatResultType.SINGLE,
      double: AtBatResultType.DOUBLE,
      triple: AtBatResultType.TRIPLE,
      homerun: AtBatResultType.HOME_RUN,
      walk: AtBatResultType.WALK,
      out: AtBatResultType.GROUND_OUT, // Default 'out' to ground out
      strikeout: AtBatResultType.STRIKEOUT,
      groundout: AtBatResultType.GROUND_OUT,
      flyout: AtBatResultType.FLY_OUT,
      error: AtBatResultType.ERROR,
      fielderschoice: AtBatResultType.FIELDERS_CHOICE,
      sacfly: AtBatResultType.SACRIFICE_FLY,
      doubleplay: AtBatResultType.DOUBLE_PLAY,
      tripleplay: AtBatResultType.TRIPLE_PLAY,
    };
    return actionMap[actionType] || (actionType.toUpperCase() as AtBatResultType);
  };

  /**
   * Determine if an at-bat result requires manual runner advancement
   */
  const needsManualAdvancement = useCallback(
    (atBatResult: AtBatResultType): boolean => {
      if (!activeGameState?.bases) return false;

      const hasRunners = !!(
        activeGameState.bases.first ||
        activeGameState.bases.second ||
        activeGameState.bases.third
      );
      if (!hasRunners) return false;

      // Automatic advancement scenarios (no manual input needed)
      const automaticResults = [
        AtBatResultType.HOME_RUN,
        AtBatResultType.WALK,
        AtBatResultType.DOUBLE_PLAY,
        AtBatResultType.TRIPLE_PLAY,
      ];
      if (automaticResults.includes(atBatResult)) return false;

      // Manual advancement needed for hits with runners
      const hitsRequiringAdvancement = [
        AtBatResultType.SINGLE,
        AtBatResultType.DOUBLE,
        AtBatResultType.TRIPLE,
        AtBatResultType.SACRIFICE_FLY,
      ];
      return hitsRequiringAdvancement.includes(atBatResult);
    },
    [activeGameState]
  );

  /**
   * Get automatic runner advances for at-bat result
   */
  const getAutomaticAdvances = useCallback(
    (
      atBatResult: AtBatResultType
    ): Array<{ runnerId: string; fromBase: number; toBase: number }> => {
      if (!activeGameState?.currentBatter) return [];

      const advances: Array<{ runnerId: string; fromBase: number; toBase: number }> = [];
      const batter = activeGameState.currentBatter;

      switch (atBatResult) {
        case AtBatResultType.SINGLE:
          advances.push({ runnerId: batter.id, fromBase: 0, toBase: 1 });
          break;
        case AtBatResultType.DOUBLE:
          advances.push({ runnerId: batter.id, fromBase: 0, toBase: 2 });
          break;
        case AtBatResultType.TRIPLE:
          advances.push({ runnerId: batter.id, fromBase: 0, toBase: 3 });
          // Auto-score runners on second and third
          if (activeGameState.bases?.second) {
            advances.push({ runnerId: activeGameState.bases.second.id, fromBase: 2, toBase: 0 });
          }
          if (activeGameState.bases?.third) {
            advances.push({ runnerId: activeGameState.bases.third.id, fromBase: 3, toBase: 0 });
          }
          break;
        case AtBatResultType.HOME_RUN:
          advances.push({ runnerId: batter.id, fromBase: 0, toBase: 0 });
          // All runners score
          if (activeGameState.bases?.first) {
            advances.push({ runnerId: activeGameState.bases.first.id, fromBase: 1, toBase: 0 });
          }
          if (activeGameState.bases?.second) {
            advances.push({ runnerId: activeGameState.bases.second.id, fromBase: 2, toBase: 0 });
          }
          if (activeGameState.bases?.third) {
            advances.push({ runnerId: activeGameState.bases.third.id, fromBase: 3, toBase: 0 });
          }
          break;
        case AtBatResultType.WALK:
          advances.push({ runnerId: batter.id, fromBase: 0, toBase: 1 });
          // Force advances if bases loaded
          if (
            activeGameState.bases?.first &&
            activeGameState.bases?.second &&
            activeGameState.bases?.third
          ) {
            advances.push({ runnerId: activeGameState.bases.first.id, fromBase: 1, toBase: 2 });
            advances.push({ runnerId: activeGameState.bases.second.id, fromBase: 2, toBase: 3 });
            advances.push({ runnerId: activeGameState.bases.third.id, fromBase: 3, toBase: 0 });
          } else if (activeGameState.bases?.first && activeGameState.bases?.second) {
            advances.push({ runnerId: activeGameState.bases.first.id, fromBase: 1, toBase: 2 });
            advances.push({ runnerId: activeGameState.bases.second.id, fromBase: 2, toBase: 3 });
          } else if (activeGameState.bases?.first) {
            advances.push({ runnerId: activeGameState.bases.first.id, fromBase: 1, toBase: 2 });
          }
          break;
        // OUT, STRIKEOUT, etc. - no advances
      }

      return advances;
    },
    [activeGameState]
  );

  /**
   * Handle action button clicks with integration logic (internal implementation)
   */
  const handleActionInternal = useCallback(
    async (actionType: string): Promise<void> => {
      // Action recording started - would be logged via DI container logger in full implementation
      // eslint-disable-next-line no-console -- Required for action logging in tests
      console.log(`Recording action: ${actionType}`);

      if (isLoading || !activeGameState?.currentBatter) return;

      const atBatResult = mapActionToAtBatResult(actionType);

      // Check if manual runner advancement is needed
      if (needsManualAdvancement(atBatResult)) {
        // Show runner advancement panel
        setPendingAtBatResult(actionType);
        setShowRunnerAdvancement(true);
        return;
      }

      // Get automatic advances and record immediately
      const advances = getAutomaticAdvances(atBatResult);

      try {
        await recordAtBat({
          result: actionType,
          runnerAdvances: advances,
        });
      } catch (_err) {
        // Error handled by hook state
      }
    },
    [
      isLoading,
      activeGameState?.currentBatter,
      recordAtBat,
      needsManualAdvancement,
      getAutomaticAdvances,
    ]
  );

  /**
   * Debounced version of handleAction to prevent rapid-fire button clicks
   * Performance target: 100ms debounce to prevent duplicate submissions
   */
  const handleAction = useMemo(() => {
    return debounce(handleActionInternal as (...args: unknown[]) => unknown, 100);
  }, [handleActionInternal]);

  // Cleanup debounced function on component unmount
  useEffect(() => {
    return (): void => {
      handleAction.cancel();
    };
  }, [handleAction]);

  /**
   * Handle completion of runner advancement
   */
  const handleRunnerAdvancementComplete = useCallback(async (): Promise<void> => {
    if (!pendingAtBatResult) return;

    // Validate all advances
    const invalidAdvances = runnerAdvances.filter(advance => !isValidAdvancement(advance));
    if (invalidAdvances.length > 0) {
      // Show validation errors in the panel
      return;
    }

    try {
      await recordAtBat({
        result: pendingAtBatResult,
        runnerAdvances,
      });

      // Reset advancement state
      setShowRunnerAdvancement(false);
      setPendingAtBatResult(null);
      clearAdvances();
    } catch (_err) {
      // Error handled by hook state
    }
  }, [pendingAtBatResult, runnerAdvances, isValidAdvancement, recordAtBat, clearAdvances]);

  /**
   * Handle canceling runner advancement
   */
  const handleRunnerAdvancementCancel = useCallback((): void => {
    setShowRunnerAdvancement(false);
    setPendingAtBatResult(null);
    clearAdvances();
  }, [clearAdvances]);

  /**
   * Handle undo action with error handling and fallback notification
   */
  const handleUndo = useCallback(async (): Promise<void> => {
    if (!canUndo || isUndoRedoLoading) return;

    try {
      await undo();
      // Success feedback handled by lastUndoRedoResult
    } catch (error) {
      // Hook should handle error state, but provide fallback notification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during undo';

      // eslint-disable-next-line no-console -- Error logging is necessary for debugging
      console.error('Undo failed:', error);

      // Fallback: show error notification if hook doesn't provide lastUndoRedoResult
      // The error notification UI will display if lastUndoRedoResult updates,
      // but this ensures users always see something if hook fails to update state
      if (!lastUndoRedoResult || lastUndoRedoResult.success) {
        showInfo(`Undo failed: ${errorMessage}`, 'Error');
      }
    }
  }, [canUndo, isUndoRedoLoading, undo, lastUndoRedoResult, showInfo]);

  /**
   * Handle redo action with error handling and fallback notification
   */
  const handleRedo = useCallback(async (): Promise<void> => {
    if (!canRedo || isUndoRedoLoading) return;

    try {
      await redo();
      // Success feedback handled by lastUndoRedoResult
    } catch (error) {
      // Hook should handle error state, but provide fallback notification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during redo';

      // eslint-disable-next-line no-console -- Error logging is necessary for debugging
      console.error('Redo failed:', error);

      // Fallback: show error notification if hook doesn't provide lastUndoRedoResult
      // The error notification UI will display if lastUndoRedoResult updates,
      // but this ensures users always see something if hook fails to update state
      if (!lastUndoRedoResult || lastUndoRedoResult.success) {
        showInfo(`Redo failed: ${errorMessage}`, 'Error');
      }
    }
  }, [canRedo, isUndoRedoLoading, redo, lastUndoRedoResult, showInfo]);

  /**
   * Handle successful at-bat recording result
   */
  useEffect(() => {
    const handleResult = (): void => {
      if (result) {
        // Show RBI notification if applicable
        if (result.rbiAwarded && result.rbiAwarded > 0) {
          setRbiNotification(result.rbiAwarded);
          timers.setTimeout(() => setRbiNotification(null), RBI_NOTIFICATION_DURATION_MS);
        }

        // Update game state through store
        if (result.gameState) {
          updateScore({
            home: result.gameState.score.home,
            away: result.gameState.score.away,
          });
        }

        // Reset recording state
        reset();
      }
    };
    handleResult();
  }, [result, reset, updateScore, timers]);

  /**
   * Handle retry after error with enhanced recovery
   */
  const handleRetry = useCallback((): void => {
    reset();
    resetErrorRecovery();

    // Restore preserved user input if available
    if (errorRecovery.hasPreservedInput) {
      errorRecovery.restoreUserInput();
      const restored = errorRecovery.restoredInput as { atBatResult?: string };
      if (restored?.atBatResult) {
        setPendingAtBatResult(restored.atBatResult);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- errorRecovery properties are accessed directly for conditional logic
  }, [reset, resetErrorRecovery]);

  /**
   * Handle refresh page for concurrency errors
   */
  const handleRefreshPage = useCallback((): void => {
    void navigate(0); // React Router v6 way to refresh current route
  }, [navigate]);

  /**
   * Handle error reporting
   */
  const handleReportError = useCallback((): void => {
    void errorRecovery.reportError(
      data => {
        // In a real app, this would send to error tracking service
        // eslint-disable-next-line no-console -- Error reporting requires console output for debugging
        console.error('Error Report:', data);
        return Promise.resolve({ reportId: `ERR-${Date.now()}` });
      },
      {
        userContext: 'Recording at-bat',
        gameId: gameId || 'unknown',
        phase: 'Phase 4 - Error Handling',
        batterId: activeGameState?.currentBatter?.id,
        inning: activeGameState?.currentInning,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- errorRecovery.reportError is accessed directly, activeGameState is accessed for context
  }, [gameId]);

  /**
   * Enhanced error handler for component-level errors
   */
  const handleComponentError = useCallback(
    (error: Error, errorInfo: ErrorInfo) => {
      // eslint-disable-next-line no-console -- Error logging is necessary for debugging
      console.error('GameRecordingPage component error:', error, errorInfo);

      // Handle nullable componentStack from React's ErrorInfo
      const componentStack = errorInfo.componentStack || 'Unknown component';

      // Preserve current state before error
      preserveUserInput({
        atBatResult: pendingAtBatResult,
        runnerAdvances,
        gameState: activeGameState,
        timestamp: new Date().toISOString(),
        componentStack, // Include component stack for debugging
      });
    },
    [preserveUserInput, pendingAtBatResult, runnerAdvances, activeGameState]
  );

  /**
   * Navigate to game statistics
   */
  const handleViewStats = (): void => {
    if (gameId) {
      void navigate(`/game/${gameId}/stats`);
    }
  };

  /**
   * Navigate to settings
   */
  const handleSettings = (): void => {
    void navigate('/settings');
  };

  /**
   * Phase 5: Lineup Management Handlers
   */

  /**
   * Toggle lineup interface visibility
   */
  const handleToggleLineupInterface = useCallback((): void => {
    setShowLineupInterface(prev => !prev);
    // Close other modals when opening lineup interface
    if (!showLineupInterface) {
      setShowLineupEditor(false);
      setShowSubstitutionHistory(false);
      setShowSubstitutionDialog(false);
    }
  }, [showLineupInterface]);

  /**
   * Open lineup editor modal
   */
  const handleOpenLineupEditor = useCallback((): void => {
    setShowLineupEditor(true);
    setShowSubstitutionHistory(false);
  }, []);

  /**
   * Close lineup editor modal
   */
  const handleCloseLineupEditor = useCallback((): void => {
    setShowLineupEditor(false);
    setShowSubstitutionDialog(false);
    setSelectedPlayerForSubstitution(null);
  }, []);

  /**
   * Toggle substitution history display
   */
  const handleToggleSubstitutionHistory = useCallback((): void => {
    setShowSubstitutionHistory(prev => !prev);
    setShowLineupEditor(false);
  }, []);

  /**
   * Handle retry for substitution errors
   */
  const handleRetrySubstitution = useCallback((): void => {
    // Close the substitution dialog to reset the state
    setShowSubstitutionDialog(false);
    setSelectedPlayerForSubstitution(null);

    // The error will be cleared when the user attempts a new substitution
    // This is better than window.location.reload() as it preserves the game state
  }, []);

  /**
   * Handle substitution completion
   */
  const handleSubstitutionComplete = useCallback(
    (data?: unknown): void => {
      try {
        // Process substitution data if provided
        if (data) {
          // Log substitution data for debugging in development
          // eslint-disable-next-line no-console -- Required for debugging substitution data
          console.log('Substitution completed with data:', data);
        }

        // Close dialogs
        setShowSubstitutionDialog(false);
        setSelectedPlayerForSubstitution(null);

        // Show success notification
        showInfo('Player substitution completed successfully', 'Substitution Complete');

        // The game state will be updated automatically through the store
      } catch (error) {
        // Error handling is managed by the substitute player feature
        // eslint-disable-next-line no-console -- Error logging is necessary for debugging
        console.error('Substitution completion error:', error);
      }
    },
    [showInfo]
  );

  /**
   * Handle substitution cancellation
   */
  const handleSubstitutionCancel = useCallback((): void => {
    setShowSubstitutionDialog(false);
    setSelectedPlayerForSubstitution(null);
  }, []);

  // Action buttons configuration with priority ordering
  const actionButtons = [
    // Always visible (most common)
    { id: 'single', label: 'SINGLE', priority: 'high' },
    { id: 'out', label: 'OUT', priority: 'high' },
    { id: 'walk', label: 'WALK', priority: 'high' },

    // Scroll zone (common)
    { id: 'double', label: 'DOUBLE', priority: 'medium' },
    { id: 'triple', label: 'TRIPLE', priority: 'medium' },
    { id: 'homerun', label: 'HOME RUN', priority: 'medium' },
    { id: 'strikeout', label: 'STRIKEOUT', priority: 'medium' },

    // Deep scroll (less common)
    { id: 'groundout', label: 'GROUND OUT', priority: 'low' },
    { id: 'flyout', label: 'FLY OUT', priority: 'low' },
    { id: 'error', label: 'ERROR', priority: 'low' },
    { id: 'fielderschoice', label: 'FIELD CHOICE', priority: 'low' },

    // Rare plays (bottom)
    { id: 'sacfly', label: 'SAC FLY', priority: 'rare' },
    { id: 'doubleplay', label: 'DOUBLE PLAY', priority: 'rare' },
    { id: 'tripleplay', label: 'TRIPLE PLAY', priority: 'rare' },
  ];

  // Handle data corruption and error states from store - use single useGameStore call
  const gameStoreError = gameError;

  // Check for error states but maintain consistent component structure
  const hasError = gameStoreError || !currentGame || !activeGameState;
  const errorMessage = hasError
    ? gameStoreError || (gameId ? `No active game found with ID: ${gameId}` : 'Game data error')
    : null;

  const { homeScore = 0, awayScore = 0 } = currentGame || {};
  const { currentInning, isTopHalf, currentBatter, bases, outs } = activeGameState || {};

  return (
    <ErrorBoundary
      onError={handleComponentError}
      context={{
        gameId: gameId || 'unknown',
        page: 'GameRecordingPage',
        batterId: activeGameState?.currentBatter?.id,
        inning: activeGameState?.currentInning,
        phase: 'Phase 4 - Error Handling',
      }}
      enableMonitoring={true}
    >
      <div className="game-recording-page" data-testid="game-recording-page">
        {/* Fixed header - always visible */}
        <header className="game-header fixed">
          <div className="score-display">
            <span className="score-text">
              HOME {homeScore} - {awayScore} AWAY
            </span>
          </div>
          <div className="header-actions">
            <button
              className={`lineup-button ${showLineupInterface ? 'active' : ''} ${currentGame && activeGameState ? 'mobile-optimized' : ''}`}
              onClick={handleToggleLineupInterface}
              disabled={
                !currentGame ||
                !activeGameState ||
                (gameError?.toLowerCase().includes('lineup') ?? false)
              }
              aria-label={
                gameError?.toLowerCase().includes('lineup')
                  ? 'Lineup unavailable'
                  : currentGame && activeGameState
                    ? 'Open lineup management'
                    : 'Lineup unavailable'
              }
            >
              👥
            </button>
            <button className="settings-button" onClick={handleSettings} aria-label="Game settings">
              ⚙️
            </button>
          </div>
        </header>

        {/* Loading state overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner">⚾</div>
              <p>Recording at-bat...</p>
            </div>
          </div>
        )}

        {/* Enhanced Error State with Recovery Options */}
        {(error || errorRecovery.error) && (
          <div
            role="alert"
            className="error-notification"
            style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              margin: '1rem 0',
            }}
          >
            <div role="status" aria-live="polite" className="sr-only">
              Error occurred: {errorRecovery.userFriendlyMessage || error || 'An error occurred'}
            </div>

            <div className="error-content">
              <h3 style={{ color: '#d32f2f', marginBottom: '0.5rem' }}>
                {(errorRecovery.errorType === 'network' ||
                  errorRecovery.errorType === 'timeout' ||
                  (error && (error.includes('timeout') || error.includes('network')))) &&
                  'Network Issue'}
                {errorRecovery.errorType === 'validation' && 'Invalid Data'}
                {errorRecovery.errorType === 'concurrency' && 'Game Modified'}
                {errorRecovery.errorType === 'domain' && 'Rule Violation'}
                {!errorRecovery.errorType &&
                  !(error && (error.includes('timeout') || error.includes('network'))) &&
                  'Error'}
              </h3>

              {/* Error message with proper formatting for tests */}
              <p style={{ marginBottom: '1rem' }}>
                {errorRecovery.userFriendlyMessage ||
                  (error?.includes('modified') || error?.includes('conflict')
                    ? 'This game has been modified by another user. Please refresh the page to get the latest changes.'
                    : error?.includes('CONN_REFUSED') ||
                        error?.includes('Connection refused') ||
                        error?.includes('network')
                      ? 'Unable to connect to the server. Please check your internet connection.'
                      : error?.includes('jersey number')
                        ? `${error}. Please contact your team administrator for assistance.`
                        : error && error.startsWith('Error:')
                          ? error
                          : `Error: ${error || 'Unknown error occurred'}`)}
              </p>

              {/* Additional user-friendly explanations for server errors */}
              {error && error.includes('server error') && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  The server encountered an issue. Please try again in a few moments.
                </p>
              )}
              {(error && error.includes('invalid') && error.includes('jersey')) ||
              (errorRecovery.errorType === 'domain' &&
                errorRecovery.userFriendlyMessage?.includes('jersey')) ? (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  Please contact your team administrator for assistance with jersey number issues.
                </p>
              ) : null}

              {/* Error-specific guidance */}
              {(errorRecovery.errorType === 'network' || (error && error.includes('network'))) && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  Unable to connect to the server. Please check your internet connection.
                </p>
              )}
              {(errorRecovery.errorType === 'timeout' || (error && error.includes('timeout'))) && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  The request timed out. Please try again in a moment.
                </p>
              )}
              {errorRecovery.errorType === 'concurrency' && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  Another user has modified this game. Please refresh the page to get the latest
                  changes.
                </p>
              )}
              {(errorRecovery.errorType === 'validation' &&
                (error?.includes('batter') ||
                  errorRecovery.userFriendlyMessage?.includes('batter'))) ||
              (error && error.includes('Batter not in current lineup')) ? (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  Please check the current batter selection and try again.
                </p>
              ) : null}
              {errorRecovery.errorType === 'domain' &&
                !errorRecovery.userFriendlyMessage?.includes('jersey') && (
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                    This action violates game rules. Please contact your team administrator if you
                    need assistance.
                  </p>
                )}

              {/* Recovery Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(errorRecovery.recoveryOptions.canRetry || error) && (
                  <button
                    onClick={handleRetry}
                    className="retry-button"
                    aria-label="Retry the failed operation"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}

                {(errorRecovery.recoveryOptions.canRefresh ||
                  errorRecovery.errorType === 'concurrency' ||
                  errorRecovery.errorType === 'network' ||
                  errorRecovery.errorType === 'timeout' ||
                  (error &&
                    (error.includes('timeout') ||
                      error.includes('network') ||
                      error.includes('concurrency') ||
                      error.includes('modified')))) && (
                  <button
                    onClick={handleRefreshPage}
                    className="refresh-button"
                    aria-label="Refresh the page to get latest changes"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#388e3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {errorRecovery.errorType === 'concurrency' ||
                    error?.includes('modified') ||
                    error?.includes('conflict')
                      ? 'Refresh'
                      : 'Refresh Page'}
                  </button>
                )}

                {(errorRecovery.recoveryOptions.canReport || error) && (
                  <button
                    onClick={handleReportError}
                    className="report-button"
                    aria-label="Report this error to support"
                    disabled={errorRecovery.errorReportId !== null}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: errorRecovery.errorReportId ? '#ccc' : '#f57c00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: errorRecovery.errorReportId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {errorRecovery.errorReportId ? 'Reported' : 'Report Issue'}
                  </button>
                )}
              </div>

              {/* Report Status */}
              {errorRecovery.errorReportId && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#e8f5e8',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#2e7d32',
                  }}
                >
                  Error reported: {errorRecovery.errorReportId}
                </div>
              )}

              {/* Progressive escalation for repeated failures */}
              {errorRecovery.attemptCount > 2 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#fff3e0',
                    border: '1px solid #ff9800',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#e65100',
                  }}
                >
                  Having trouble? Contact support if this issue persists.
                  <button
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Contact Support
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Error State - player not eligible for substitution */}
        {(hasError ||
          (gameError && (gameError.includes('Corrupted') || gameError.includes('Essential')))) && (
          <div
            role="alert"
            className="game-error-notification"
            style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              margin: '1rem 0',
            }}
          >
            <h1>Game Not Found</h1>
            <p>{errorMessage}</p>
            {errorMessage?.toLowerCase().includes('corrupted') && (
              <>
                <p>
                  The game data has been corrupted. You can try to restore the game or refresh the
                  page.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#388e3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={() => void navigate('/')}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Restore Game
                  </button>
                </div>
              </>
            )}
            {errorMessage?.toLowerCase().includes('essential') && (
              <>
                <p>Essential game data is missing. Please initialize a new game.</p>
                <button
                  onClick={() => void navigate('/new-game')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '1rem',
                  }}
                >
                  Initialize New Game
                </button>
              </>
            )}
            {gameId && !gameStoreError && (
              <>
                <button
                  onClick={() => void navigate('/')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '1rem',
                  }}
                >
                  Go Home
                </button>
              </>
            )}
          </div>
        )}

        {/* Substitution Error State - player not eligible */}
        {substitutePlayerAPI.substitutionError && (
          <div
            role="alert"
            className="substitution-error-notification"
            style={{
              padding: '1rem',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '8px',
              margin: '1rem 0',
            }}
          >
            <h3 style={{ color: '#f57c00', marginBottom: '0.5rem' }}>Substitution Error</h3>
            <p style={{ marginBottom: '1rem' }}>
              {substitutePlayerAPI.substitutionError.includes('not eligible')
                ? 'Player not eligible'
                : substitutePlayerAPI.substitutionError}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleRetrySubstitution}
                aria-label="Retry"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
              <button
                onClick={() => {
                  setShowSubstitutionDialog(false);
                  setSelectedPlayerForSubstitution(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Undo/Redo Error State */}
        {lastUndoRedoResult && !lastUndoRedoResult.success && (
          <div
            role="alert"
            className="undo-redo-error-notification"
            style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              margin: '1rem 0',
            }}
          >
            <h3 style={{ color: '#d32f2f', marginBottom: '0.5rem' }}>
              {'actionsUndone' in lastUndoRedoResult ? 'Undo Failed' : 'Redo Failed'}
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              {lastUndoRedoResult.errors?.[0] || 'An error occurred while processing your request.'}
            </p>
            <button
              onClick={() => {
                if ('actionsUndone' in lastUndoRedoResult) {
                  void handleUndo();
                } else {
                  void handleRedo();
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Undo/Redo Success State - Accessibility Announcement */}
        {lastUndoRedoResult && lastUndoRedoResult.success && (
          <div role="status" aria-live="polite" className="sr-only">
            {'actionsUndone' in lastUndoRedoResult
              ? `Undo successful. ${lastUndoRedoResult.actionsUndone} action${lastUndoRedoResult.actionsUndone === 1 ? '' : 's'} undone.`
              : `Redo successful. ${lastUndoRedoResult.actionsRedone} action${lastUndoRedoResult.actionsRedone === 1 ? '' : 's'} restored.`}
          </div>
        )}

        {/* RBI notification */}
        {rbiNotification && (
          <div className="rbi-notification">
            <p>{rbiNotification} RBI</p>
          </div>
        )}

        {/* Game status bar */}
        <div className="game-status-bar">
          <span className="inning-info">
            {isTopHalf ? 'Top' : 'Bottom'} {currentInning}
            {currentInning === 1
              ? 'st'
              : currentInning === 2
                ? 'nd'
                : currentInning === 3
                  ? 'rd'
                  : 'th'}
          </span>
          <span className="outs-info">{outs} Outs</span>
          <div className="undo-redo-controls">
            <button
              className="undo-button"
              onClick={() => void handleUndo()}
              disabled={!canUndo || isUndoRedoLoading}
              aria-label={
                isUndoRedoLoading
                  ? 'Processing undo...'
                  : canUndo
                    ? 'Undo last action'
                    : 'No actions to undo'
              }
              style={{
                opacity: !canUndo || isUndoRedoLoading ? 0.5 : 1,
                cursor: !canUndo || isUndoRedoLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isUndoRedoLoading ? '⟳' : '↶'}
            </button>
            <button
              className="redo-button"
              onClick={() => void handleRedo()}
              disabled={!canRedo || isUndoRedoLoading}
              aria-label={
                isUndoRedoLoading
                  ? 'Processing redo...'
                  : canRedo
                    ? 'Redo last action'
                    : 'No actions to redo'
              }
              style={{
                opacity: !canRedo || isUndoRedoLoading ? 0.5 : 1,
                cursor: !canRedo || isUndoRedoLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isUndoRedoLoading ? '⟳' : '↷'}
            </button>
          </div>
        </div>

        {/* Base diamond display */}
        <div className="bases-display">
          <div className="base-diamond">
            <div className={`base second-base ${bases?.second ? 'occupied' : 'empty'}`}>
              <span className="base-label">2B</span>
              {bases?.second && <span className="runner-indicator">◆</span>}
            </div>
            <div className="base-row">
              <div className={`base third-base ${bases?.third ? 'occupied' : 'empty'}`}>
                <span className="base-label">3B</span>
                {bases?.third && <span className="runner-indicator">◆</span>}
              </div>
              <div className={`base first-base ${bases?.first ? 'occupied' : 'empty'}`}>
                <span className="base-label">1B</span>
                {bases?.first && <span className="runner-indicator">◆</span>}
              </div>
            </div>
            <div className="home-plate">
              <span className="base-label">H</span>
              <span className="runner-indicator">◇</span>
            </div>
          </div>
        </div>

        {/* Current batter section */}
        <div className="current-batter-section">
          <div className="batter-info">
            <h2>Now Batting:</h2>
            {currentBatter ? (
              <div className="batter-details">
                <span className="player-name">
                  #{currentBatter.jerseyNumber} {currentBatter.name}
                </span>
                <span className="player-stats">
                  {currentBatter.battingOrder}
                  {currentBatter.battingOrder === 1
                    ? 'st'
                    : currentBatter.battingOrder === 2
                      ? 'nd'
                      : currentBatter.battingOrder === 3
                        ? 'rd'
                        : 'th'}{' '}
                  │ {currentBatter.position} │ 0-0 today
                </span>
              </div>
            ) : (
              <div className="no-batter">
                <span className="placeholder-text">Select next batter</span>
              </div>
            )}
          </div>

          <div className="next-batter-preview">
            <span className="next-batter-label">Next: </span>
            <span className="next-batter-info">#8 Mike Chen (SS)</span>
          </div>
        </div>

        {/* Phase 5: Bench Management Widget */}
        {showLineupInterface && (
          <div className="lineup-interface-overlay">
            <div className="lineup-interface-container">
              <div className="lineup-interface-actions">
                <button
                  onClick={handleOpenLineupEditor}
                  className="manage-lineup-button"
                  aria-label="Open detailed lineup editor"
                >
                  Manage Lineup
                </button>
                <button
                  onClick={handleToggleSubstitutionHistory}
                  className="substitution-history-button"
                >
                  Substitution History
                </button>
                <button
                  onClick={handleToggleLineupInterface}
                  className="close-lineup-button"
                  aria-label="Close lineup management"
                >
                  Close
                </button>
              </div>

              <BenchManagementWidget
                gameId={gameId || ''}
                teamLineupId={gameId || ''}
                currentInning={activeGameState?.currentInning || 1}
                onSubstitutionComplete={data => handleSubstitutionComplete(data)}
                aria-label="Bench players management"
              />

              {/* Substitution History Display */}
              {showSubstitutionHistory && (
                <div className="substitution-history-section">
                  <h3>Substitution History</h3>
                  <SubstitutionHistory
                    gameId={gameId || ''}
                    substitutions={[]} // This would be populated from game state
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Runner advancement panel */}
        {showRunnerAdvancement && (
          <div className="runner-advancement-overlay">
            <div className="runner-advancement-container">
              <RunnerAdvancementPanel
                currentGameState={{
                  ...(activeGameState?.currentBatter && {
                    currentBatter: {
                      id: activeGameState.currentBatter.id,
                      name: activeGameState.currentBatter.name,
                    },
                  }),
                  bases: activeGameState?.bases || { first: null, second: null, third: null },
                  inning: activeGameState?.currentInning || 1,
                  isTopOfInning: activeGameState?.isTopHalf || true,
                }}
                {...(pendingAtBatResult && {
                  atBatResult: {
                    type: pendingAtBatResult as AtBatResultType,
                    label: pendingAtBatResult,
                    category: 'hit' as const,
                  },
                })}
              />
              <div className="runner-advancement-controls">
                <button onClick={handleRunnerAdvancementCancel} className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleRunnerAdvancementComplete();
                  }}
                  className="complete-button"
                  disabled={runnerAdvances.some(advance => !isValidAdvancement(advance))}
                >
                  Complete At-Bat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable actions area */}
        <main className="actions-area">
          <div className="action-buttons-container">
            {actionButtons.map(button => (
              <button
                key={button.id}
                className={`action-button ${button.priority}-priority`}
                onClick={() => void handleAction(button.id)}
                disabled={isLoading || !currentBatter || showRunnerAdvancement}
                data-testid={`action-${button.id}`}
                aria-label={`Record ${button.label}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </main>

        {/* Quick access floating button */}
        <button
          className="stats-fab"
          onClick={handleViewStats}
          aria-label="View game statistics"
          title="View Stats"
        >
          📊
        </button>

        {/* Phase 5: Lineup Editor Modal */}
        {showLineupEditor && (
          <div className="lineup-editor-overlay">
            <div
              className="lineup-editor-modal"
              data-testid="lineup-editor-modal"
              role="dialog"
              aria-labelledby="lineup-editor-title"
            >
              <div className="modal-header">
                <h2 id="lineup-editor-title">Lineup Management</h2>
                <button
                  onClick={handleCloseLineupEditor}
                  className="close-modal-button"
                  aria-label="Close lineup editor"
                >
                  ✕
                </button>
              </div>
              <div className="modal-content">
                <LineupEditor
                  gameId={gameId || ''}
                  onSubstitutionComplete={() => handleSubstitutionComplete()}
                />
              </div>
            </div>
          </div>
        )}

        {/* Phase 5: Substitution Dialog */}
        {showSubstitutionDialog && selectedPlayerForSubstitution && (
          <div className="substitution-dialog-overlay">
            <SubstitutionDialog
              isOpen={showSubstitutionDialog}
              onClose={handleSubstitutionCancel}
              onConfirm={data => Promise.resolve(handleSubstitutionComplete(data))}
              gameId={gameId || ''}
              currentPlayer={{
                playerId: selectedPlayerForSubstitution.playerId,
                battingSlot: Math.min(
                  10,
                  Math.max(1, selectedPlayerForSubstitution.battingSlot)
                ) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
                fieldPosition: FieldPosition.PITCHER, // Default field position
              }}
              benchPlayers={[]} // This would be populated from game state
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
