import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, type Player } from '../shared/lib/store/gameStore';
import { Button } from '../shared/ui/button';

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
   * Handle back navigation
   */
  const handleBack = (): void => {
    void navigate('/game/setup/lineup');
  };

  /**
   * Handle starting the game
   */
  const handleStartGame = (): void => {
    // Complete the setup wizard
    completeSetup();

    // Generate a new game ID
    const gameId = `game-${Date.now()}`;

    // Create initial game data
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

    // Start the active game
    startActiveGame(gameData);

    // Navigate to game recording
    void navigate(`/game/${gameId}/record`);
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
        <button className="back-button" onClick={handleBack} aria-label="Go back to lineup">
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
            <div className="validation-error" role="alert">
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
      </main>

      <footer className="setup-footer">
        <div className="footer-actions">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="back-button-footer"
            data-testid="back-button"
          >
            ← BACK
          </Button>
          <Button
            onClick={handleStartGame}
            disabled={!isSetupValid()}
            className="start-game-button"
            size="large"
            data-testid="start-game-button"
          >
            START GAME
          </Button>
        </div>
      </footer>
    </div>
  );
}
