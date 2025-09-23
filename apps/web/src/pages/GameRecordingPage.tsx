import { AtBatResultType } from '@twsoftball/application';
import { type ReactElement, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useNavigationGuard } from '../shared/hooks/useNavigationGuard';
import { useRecordAtBat } from '../shared/hooks/useRecordAtBat';
import { useRunnerAdvancement } from '../shared/hooks/useRunnerAdvancement';
import { useGameStore } from '../shared/lib/store/gameStore';
import { useUIStore } from '../shared/lib/store/uiStore';
import { Button } from '../shared/ui/button';
import { RunnerAdvancementPanel } from '../widgets/runner-advancement/RunnerAdvancementPanel';

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
  const { currentGame, activeGameState, isGameActive, updateScore } = useGameStore();
  const { showNavigationWarning } = useUIStore();

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

  // Phase 1 hooks integration
  const { recordAtBat, isLoading, error, result, reset } = useRecordAtBat();
  const { runnerAdvances, clearAdvances, isValidAdvancement } = useRunnerAdvancement();

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
    [activeGameState?.bases]
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
    [activeGameState?.currentBatter, activeGameState?.bases]
  );

  /**
   * Handle action button clicks with integration logic
   */
  const handleAction = useCallback(
    async (actionType: string): Promise<void> => {
      // Action recording started
      // eslint-disable-next-line no-console -- Development action logging
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
   * Handle undo action (placeholder for future undo/redo hook integration)
   */
  const handleUndo = (): void => {
    // TODO: Integrate with useUndoRedo hook when available
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Undo last action');
  };

  /**
   * Handle redo action (placeholder for future undo/redo hook integration)
   */
  const handleRedo = (): void => {
    // TODO: Integrate with useUndoRedo hook when available
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Redo last action');
  };

  /**
   * Handle successful at-bat recording result
   */
  useEffect(() => {
    if (result) {
      // Show RBI notification if applicable
      if (result.rbiAwarded && result.rbiAwarded > 0) {
        setRbiNotification(result.rbiAwarded);
        setTimeout(() => setRbiNotification(null), 3000); // Hide after 3 seconds
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
  }, [result, reset, updateScore]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback((): void => {
    reset();
  }, [reset]);

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

  // If no game data, show error state
  if (!currentGame || !activeGameState) {
    return (
      <div className="game-recording-error" data-testid="game-recording-page">
        <h1>Game Not Found</h1>
        <p>No active game found with ID: {gameId}</p>
        <Button
          onClick={() => {
            void navigate('/');
          }}
        >
          Go Home
        </Button>
      </div>
    );
  }

  const { homeScore = 0, awayScore = 0 } = currentGame;
  const { currentInning, isTopHalf, currentBatter, bases, outs } = activeGameState;

  return (
    <div className="game-recording-page" data-testid="game-recording-page">
      {/* Fixed header - always visible */}
      <header className="game-header fixed">
        <div className="score-display">
          <span className="score-text">
            HOME {homeScore} - {awayScore} AWAY
          </span>
        </div>
        <button className="settings-button" onClick={handleSettings} aria-label="Game settings">
          ⚙️
        </button>
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

      {/* Error state notification */}
      {error && (
        <div className="error-notification">
          <div className="error-content">
            <p>Error: {error}</p>
            <button onClick={handleRetry} className="retry-button">
              Retry
            </button>
          </div>
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
          <button className="undo-button" onClick={handleUndo} aria-label="Undo last action">
            ↶
          </button>
          <button className="redo-button" onClick={handleRedo} aria-label="Redo last action">
            ↷
          </button>
        </div>
      </div>

      {/* Base diamond display */}
      <div className="bases-display">
        <div className="base-diamond">
          <div className={`base second-base ${bases.second ? 'occupied' : 'empty'}`}>
            <span className="base-label">2B</span>
            {bases.second && <span className="runner-indicator">◆</span>}
          </div>
          <div className="base-row">
            <div className={`base third-base ${bases.third ? 'occupied' : 'empty'}`}>
              <span className="base-label">3B</span>
              {bases.third && <span className="runner-indicator">◆</span>}
            </div>
            <div className={`base first-base ${bases.first ? 'occupied' : 'empty'}`}>
              <span className="base-label">1B</span>
              {bases.first && <span className="runner-indicator">◆</span>}
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

      {/* Runner advancement panel */}
      {showRunnerAdvancement && (
        <div className="runner-advancement-overlay">
          <div className="runner-advancement-container">
            <RunnerAdvancementPanel
              currentGameState={{
                ...(activeGameState.currentBatter && {
                  currentBatter: {
                    id: activeGameState.currentBatter.id,
                    name: activeGameState.currentBatter.name,
                  },
                }),
                bases: activeGameState.bases,
                inning: activeGameState.currentInning,
                isTopOfInning: activeGameState.isTopHalf,
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
    </div>
  );
}
