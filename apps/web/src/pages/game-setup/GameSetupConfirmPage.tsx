import { type ReactElement, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameSetup } from '../../features/game-setup';
import { useGameStore, type Player } from '../../shared/lib/store/gameStore';
import { Button } from '../../shared/ui/button';

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
  const { setupWizard, completeSetup, startActiveGame } = useGameStore();
  const { startGame, isLoading, error, gameId, validationErrors, clearError } = useGameSetup();

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
   * Navigate to game recording when game is successfully created
   */
  useEffect(() => {
    if (gameId) {
      // Complete the setup wizard
      completeSetup();

      // Create initial game data for the store
      const gameData = {
        id: gameId,
        homeTeam: setupWizard.teams.home,
        awayTeam: setupWizard.teams.away,
        status: 'active' as const,
        homeScore: 0,
        awayScore: 0,
        currentInning: 1,
        isTopHalf: true,
      };

      // Start the active game in the store
      startActiveGame(gameData);

      // Navigate to game recording
      void navigate(`/game/${gameId}/record`);
    }
  }, [gameId, completeSetup, startActiveGame, setupWizard, navigate]);

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
