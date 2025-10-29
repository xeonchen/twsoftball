import { type ReactElement, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../../../entities/game';
import { useGameSetup } from '../../../features/game-setup';
import { toUIGameState } from '../../../shared/api';
import type { Player } from '../../../shared/lib/types';
import { Button } from '../../../shared/ui/button';

/**
 * Game Setup Confirm Page Component
 *
 * Implements Screen 4: Game Setup Wizard - Step 3 (Confirm) from wireframes.md
 * Final step of the game setup wizard where users review and confirm their
 * game configuration before starting.
 *
 * Features:
 * - Complete game summary display
 * - Team matchup confirmation
 * - Full lineup review with positions
 * - Warning about making changes during game
 * - Start game functionality
 * - Back navigation for final edits
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 4
 */
export function GameSetupConfirmPage(): ReactElement {
  const navigate = useNavigate();
  const { setupWizard, completeSetup, updateFromDTO } = useGameStore();
  const {
    startGame,
    isLoading,
    error,
    gameId,
    initialGameState,
    validationErrors,
    clearError,
    reset,
  } = useGameSetup();

  // Ref to track if we've already processed this gameId
  const processedGameIdRef = useRef<string | null>(null);

  /**
   * Sync state and navigate when game is successfully created.
   *
   * @remarks
   * This single effect handles BOTH state sync AND navigation to eliminate
   * the race condition. The flow:
   *
   * 1. initialGameState changes (game created)
   * 2. Convert DTO to UI state
   * 3. Call updateFromDTO (synchronous Zustand update)
   * 4. Zustand persist middleware writes to sessionStorage (synchronous)
   * 5. Complete setup wizard
   * 6. Navigate to game recording page
   *
   * By handling sync and navigation in ONE effect, we guarantee that navigation
   * only happens AFTER state is persisted. No separate effects = no race condition.
   *
   * Clean architectural solution: Single Responsibility within the effect scope.
   */
  useEffect(() => {
    // Only process when we have BOTH gameId AND initialGameState
    // AND we haven't already processed this specific gameId
    if (!gameId || !initialGameState || processedGameIdRef.current === gameId) {
      return;
    }

    // Mark as processed BEFORE doing anything to prevent any re-runs
    processedGameIdRef.current = gameId;

    try {
      // Convert DTO to UI state and sync to Zustand store
      const uiState = toUIGameState(initialGameState);
      updateFromDTO(uiState);

      // Zustand v5 persist middleware is synchronous with sessionStorage
      // State is now persisted - safe to navigate
      completeSetup();
      void navigate(`/game/${gameId}/record`);
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging for debugging
      console.error('[GameSetupConfirmPage] Failed to sync state before navigation:', error);
      // Reset processed ref so user can retry
      processedGameIdRef.current = null;
      // Don't navigate if sync failed
    }

    // Zustand functions (completeSetup, navigate, updateFromDTO) are stable
    // Only depend on gameId (primitive) to avoid re-triggering on object reference changes
    // initialGameState is read from closure but not in deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps -- See comment above
  }, [gameId]);

  /**
   * Format current date and time
   */
  const getCurrentDateTime = (): string => {
    const now = new Date();
    return (
      now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) +
      ' • ' +
      now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    );
  };

  /**
   * Get our team name
   */
  const getOurTeamName = (): string => {
    return setupWizard.teams.ourTeam === 'home' ? setupWizard.teams.home : setupWizard.teams.away;
  };

  /**
   * Get lineup with only filled positions
   */
  const getValidLineup = (): Player[] => {
    return setupWizard.lineup.filter(player => player.name.trim() !== '');
  };

  /**
   * Reset gameId state when component unmounts to prevent state leakage
   *
   * @remarks
   * This cleanup prevents the following issues:
   * - E2E tests: gameId persisting between test runs causing auto-navigation
   * - Production: Back button returning to confirm page with stale gameId
   * - Multiple game setups: Previous gameId triggering unintended navigation
   *
   * The reset() function clears all useGameSetup state including gameId,
   * ensuring clean state for the next game setup workflow.
   */
  useEffect(() => {
    return (): void => {
      reset(); // Clean up gameId when leaving confirm page
    };
  }, [reset]);

  /**
   * Handle starting the game using the useGameSetup hook
   */
  const handleStartGame = async (): Promise<void> => {
    try {
      await startGame(setupWizard);

      // Navigation will happen automatically via gameId change in useEffect
    } catch (_err) {
      // Errors are handled by the hook
    }
  };

  /**
   * Handle back navigation with error cleanup
   */
  const handleBackNavigation = (): void => {
    clearError();
    void navigate('/game/setup/lineup');
  };

  /**
   * Check if setup is valid for starting game
   */
  const isSetupValid = (): boolean => {
    const validLineup = getValidLineup();
    return (
      setupWizard.teams.home.trim() !== '' &&
      setupWizard.teams.away.trim() !== '' &&
      setupWizard.teams.ourTeam !== null &&
      validLineup.length >= 9
    );
  };

  const validLineup = getValidLineup();
  const ourTeamName = getOurTeamName();

  return (
    <div className="game-setup-confirm-page" data-testid="game-setup-confirm-page">
      <header className="setup-header">
        <button
          className="back-button"
          onClick={handleBackNavigation}
          aria-label="Go back to lineup"
        >
          ←
        </button>
        <h1>Review Setup</h1>
        <div className="progress-indicator">3/3</div>
      </header>

      <main className="setup-content">
        <section className="game-summary">
          <h2>Game Summary</h2>

          <div className="matchup">
            <h3 className="matchup-teams">
              {setupWizard.teams.away} @ {setupWizard.teams.home}
            </h3>
            <p className="game-details">{getCurrentDateTime()}</p>
          </div>
        </section>

        <section className="lineup-review">
          <h2>{ourTeamName} Lineup:</h2>
          <div className="lineup-list">
            {validLineup.map((player, index) => (
              <div key={player.id} className="lineup-item" data-testid={`lineup-item-${index}`}>
                <span className="batting-order">{player.battingOrder}.</span>
                <span className="player-jersey">#{player.jerseyNumber}</span>
                <span className="player-name">{player.name}</span>
                <span className="player-position">{player.position}</span>
              </div>
            ))}
          </div>

          {validLineup.length < 9 && (
            <div className="validation-error" data-testid="validation-error" role="alert">
              ⚠️ Lineup incomplete: Need at least 9 players to start game
            </div>
          )}
        </section>

        <section className="warning-section">
          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Make sure this is correct</strong> - you can make substitutions during the
              game
            </div>
          </div>
        </section>

        {/* Validation Errors Section */}
        {validationErrors && (
          <section className="validation-errors-section">
            {validationErrors.teams && (
              <div
                className="validation-error teams-error"
                data-testid="teams-validation-error"
                role="alert"
              >
                🚫 {validationErrors.teams}
              </div>
            )}

            {validationErrors.lineup && validationErrors.lineup.length > 0 && (
              <div
                className="validation-error lineup-errors"
                data-testid="lineup-validation-errors"
                role="alert"
              >
                <div className="error-title">Lineup Issues:</div>
                <ul>
                  {validationErrors.lineup.map((lineupError, index) => (
                    <li key={index}>{lineupError}</li>
                  ))}
                </ul>
                <Button
                  onClick={() => void navigate('/game/setup/lineup')}
                  variant="secondary"
                  size="small"
                  className="fix-lineup-button"
                  data-testid="fix-lineup-button"
                >
                  Fix Lineup
                </Button>
              </div>
            )}

            {validationErrors.general && (
              <div
                className="validation-error general-error"
                data-testid="general-validation-error"
                role="alert"
              >
                ⚠️ {validationErrors.general}
              </div>
            )}
          </section>
        )}

        {/* Infrastructure Error Banner */}
        {error && (
          <section className="infrastructure-error-section">
            <div className="error-banner" data-testid="infrastructure-error-banner" role="alert">
              <div className="error-content">
                <div className="error-icon">❌</div>
                <div className="error-message" data-testid="error-message">
                  {error}
                </div>
              </div>
              <div className="error-actions">
                <Button
                  onClick={() => void handleStartGame()}
                  variant="secondary"
                  size="small"
                  className="retry-button"
                  data-testid="retry-button"
                  disabled={isLoading}
                >
                  Retry
                </Button>
                <Button
                  onClick={clearError}
                  variant="secondary"
                  size="small"
                  className="dismiss-button"
                  data-testid="dismiss-error-button"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Success Transition */}
        {gameId && (
          <section className="success-transition-section">
            <div className="success-banner" data-testid="success-transition">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <div className="success-message">
                  <div className="success-title">Game {gameId} created successfully!</div>
                  <div className="success-subtitle">Redirecting to game recording...</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="loading-overlay" data-testid="loading-indicator">
          <div className="loading-content">
            <div className="spinner" />
            <div className="loading-text">Creating game...</div>
          </div>
        </div>
      )}

      <footer className="setup-footer">
        <div className="footer-actions">
          <Button
            onClick={handleBackNavigation}
            variant="secondary"
            className="back-button-footer"
            data-testid="back-button"
          >
            ← BACK
          </Button>
          <Button
            onClick={() => void handleStartGame()}
            disabled={!isSetupValid() || isLoading}
            className="start-game-button"
            size="large"
            data-testid="start-game-button"
          >
            {isLoading ? 'STARTING GAME...' : 'START GAME'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
