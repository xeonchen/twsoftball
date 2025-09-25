import { type ReactElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, type GameData } from '../../shared/lib/store/gameStore';
import { useGameUseCases } from '../../shared/lib/useCases/gameUseCases';
import { Button } from '../../shared/ui/button';

/**
 * Home Page Component
 *
 * Implements Screen 1: Home / Game List from wireframes.md
 * The main landing page with game list interface featuring:
 * - Active game resume functionality
 * - Start new game CTA
 * - Recent games history
 * - Settings access
 *
 * Mobile-first design with 48px minimum touch targets and thumb zone optimization.
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 1
 */
export const HomePage = (): ReactElement => {
  const navigate = useNavigate();
  const { currentGame } = useGameStore();
  const { isInitialized } = useGameUseCases();

  // Game history state with proper persistence integration
  const [gameHistory, setGameHistory] = useState<GameData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Load game history from persistent storage
  useEffect(() => {
    function loadGameHistory(): void {
      if (!isInitialized) return;

      try {
        setIsLoadingHistory(true);
        setHistoryError(null);

        // Load game history from browser storage
        const storedHistory = globalThis.localStorage?.getItem('tw-softball-game-history');
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory) as GameData[];
          // Sort by most recent first (assuming game IDs contain timestamp)
          const sortedHistory = parsedHistory.sort((a, b) => b.id.localeCompare(a.id));
          setGameHistory(sortedHistory.slice(0, 10)); // Show only last 10 games
        }

        // In a full implementation, this would query through the DI container:
        // const gameRepository = await applicationServices.gameRepository;
        // const recentGames = await gameRepository.findRecentGames(10);
        // setGameHistory(recentGames);
      } catch (_error) {
        setHistoryError('Failed to load game history');
        // Error would be logged through DI container logger in full implementation
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadGameHistory();
  }, [isInitialized]);

  // Save completed games to history
  useEffect(() => {
    function saveCompletedGame(): void {
      if (currentGame && currentGame.status === 'completed') {
        try {
          const existingHistory = globalThis.localStorage?.getItem('tw-softball-game-history');
          const history: GameData[] = existingHistory
            ? (JSON.parse(existingHistory) as GameData[])
            : [];

          // Check if game already exists in history
          const existingGameIndex = history.findIndex(game => game.id === currentGame.id);

          if (existingGameIndex >= 0) {
            // Update existing game
            history[existingGameIndex] = currentGame;
          } else {
            // Add new game to history
            history.unshift(currentGame);
          }

          // Keep only last 50 games in storage
          const trimmedHistory = history.slice(0, 50);
          globalThis.localStorage?.setItem(
            'tw-softball-game-history',
            JSON.stringify(trimmedHistory)
          );

          // Update local state
          setGameHistory(trimmedHistory.slice(0, 10));
        } catch (_error) {
          // Error would be logged through DI container logger in full implementation
          setHistoryError('Failed to save game to history');
        }
      }
    }

    saveCompletedGame();
  }, [currentGame]);

  /**
   * Navigate to settings page
   */
  const handleSettings = (): void => {
    void navigate('/settings');
  };

  /**
   * Start a new game
   */
  const handleStartNewGame = (): void => {
    void navigate('/game/setup/teams');
  };

  /**
   * Resume active game
   */
  const handleResumeGame = (): void => {
    if (currentGame?.id) {
      void navigate(`/game/${currentGame.id}/record`);
    }
  };

  /**
   * View game stats
   */
  const handleViewGameStats = (gameId: string): void => {
    void navigate(`/game/${gameId}/stats`);
  };

  // Check if there's an active game in progress
  const hasActiveGame = currentGame?.status === 'active';

  return (
    <div className="home-page" data-testid="home-page">
      {/* Header */}
      <header className="home-header">
        <h1 className="app-title">⚡ TW Softball</h1>
        <button
          className="settings-button"
          onClick={handleSettings}
          aria-label="Settings"
          data-testid="settings-button"
        >
          ⚙️
        </button>
      </header>

      <main className="home-content">
        {/* Active Game Card (if game in progress) */}
        {hasActiveGame && currentGame && (
          <div className="active-game-card" data-testid="active-game-card">
            <div className="game-status">
              <span className="status-indicator">🟢 LIVE GAME</span>
            </div>
            <div className="game-matchup">
              {currentGame.homeTeam} vs {currentGame.awayTeam}
            </div>
            <div className="game-score">
              {currentGame.homeScore}-{currentGame.awayScore} • Top {currentGame.currentInning}th
            </div>
            <Button
              onClick={handleResumeGame}
              className="resume-game-button"
              size="large"
              data-testid="resume-game-button"
            >
              RESUME GAME
            </Button>
          </div>
        )}

        {/* Start New Game CTA */}
        <Button
          onClick={handleStartNewGame}
          className="start-new-game-button"
          size="large"
          variant="primary"
          data-testid="start-new-game-button"
          aria-label="Start New Game"
        >
          START NEW GAME
        </Button>

        {/* Recent Games Section */}
        <section className="recent-games-section">
          <h2 className="section-header">Recent Games:</h2>

          {isLoadingHistory ? (
            <div className="loading-history" data-testid="loading-history">
              <p>Loading game history...</p>
            </div>
          ) : historyError ? (
            <div className="history-error" data-testid="history-error">
              <p className="error-message">{historyError}</p>
              <Button onClick={() => window.location.reload()} variant="secondary" size="small">
                Retry
              </Button>
            </div>
          ) : gameHistory.length > 0 ? (
            <div className="games-list">
              {gameHistory.map(game => (
                <div
                  key={game.id}
                  className="game-history-card"
                  onClick={() => handleViewGameStats(game.id)}
                  data-testid={`game-card-${game.id}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleViewGameStats(game.id);
                    }
                  }}
                >
                  <div className="game-result">
                    {game.homeTeam} {game.homeScore || 0}-{game.awayScore || 0} {game.awayTeam}
                  </div>
                  <div className="game-date">
                    {/* Extract date from game ID if it contains timestamp, or use current date */}
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="game-status">
                    <span className="status-dot">●</span>{' '}
                    {game.status === 'completed' ? 'Completed' : 'In Progress'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-games-state" data-testid="empty-games-state">
              <p className="empty-message">No games recorded yet</p>
              <p className="empty-subtitle">Start your first game to see it here</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
