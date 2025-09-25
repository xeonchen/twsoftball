import { useState, useMemo, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useGameStore } from '../shared/lib/store/gameStore';
import { Button } from '../shared/ui/button';

/**
 * Game Statistics Page Component
 *
 * Implements Screen 8: Game Statistics View from wireframes.md
 * Displays comprehensive game statistics with batting and fielding tabs,
 * individual player stats, team totals, and sharing functionality.
 *
 * Features:
 * - Current/final score display with game status
 * - Tabbed interface for batting and fielding stats
 * - Individual player stat cards with expandable details
 * - Team totals and summary statistics
 * - Share functionality for stats export
 * - Player detail modal with complete at-bat history
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 8
 */
export function GameStatsPage(): ReactElement {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { currentGame, setupWizard } = useGameStore();

  // Local state for UI
  const [activeTab, setActiveTab] = useState<'batting' | 'fielding'>('batting');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  /**
   * Game statistics derived from current game state
   * Provides loading and empty states for proper UX
   *
   * @remarks
   * For Phase 5, provides enhanced mock statistics with proper state management
   * while maintaining existing functionality. Future versions will integrate
   * with domain statistics services for real-time calculation.
   */
  const { playerStats, isLoading, isEmpty } = useMemo(() => {
    // Loading state: No game data available yet
    if (!currentGame || !gameId) {
      return { playerStats: [], isLoading: true, isEmpty: false };
    }

    // Empty state: Game exists but no meaningful data to show stats
    if (!setupWizard.lineup.length) {
      return { playerStats: [], isLoading: false, isEmpty: true };
    }

    // For Phase 5: Enhanced mock statistics that reflect actual game structure
    // This provides realistic data patterns while maintaining proper UX flows
    // Future integration with StatisticsCalculator and GameStatisticsDTO will
    // replace this with real-time calculations from domain services
    const stats = setupWizard.lineup.slice(0, 3).map((player, index) => {
      // Generate realistic statistics based on game progression
      const baseStats = [
        {
          batting: { atBats: 3, hits: 2, runs: 1, rbis: 2, average: 0.667, onBasePercentage: 0.75 },
          fielding: { putOuts: 2, assists: 0, errors: 0, fieldingPercentage: 1.0 },
          atBatHistory: [
            { inning: 1, result: 'Single', description: 'RBI single to left' },
            { inning: 3, result: 'Walk', description: 'Full count walk' },
            { inning: 5, result: 'RBI Double', description: 'Two-run double to center' },
          ],
        },
        {
          batting: { atBats: 2, hits: 1, runs: 1, rbis: 0, average: 0.5, onBasePercentage: 0.5 },
          fielding: { putOuts: 3, assists: 4, errors: 1, fieldingPercentage: 0.875 },
          atBatHistory: [
            { inning: 2, result: 'Single', description: 'Infield single' },
            { inning: 4, result: 'Strikeout', description: 'Swinging strikeout' },
          ],
        },
        {
          batting: {
            atBats: 3,
            hits: 1,
            runs: 2,
            rbis: 1,
            average: 0.333,
            onBasePercentage: 0.667,
          },
          fielding: { putOuts: 4, assists: 0, errors: 0, fieldingPercentage: 1.0 },
          atBatHistory: [
            { inning: 1, result: 'Walk', description: 'Lead-off walk' },
            { inning: 3, result: 'Home Run', description: 'Solo home run' },
            { inning: 6, result: 'Ground Out', description: 'Ground out to second' },
          ],
        },
      ];

      const playerData = baseStats[index] || baseStats[0]!;

      return {
        id: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        batting: playerData.batting,
        fielding: playerData.fielding,
        atBatHistory: playerData.atBatHistory,
      };
    });

    return { playerStats: stats, isLoading: false, isEmpty: false };
  }, [currentGame, setupWizard, gameId]);

  /**
   * Loading state component
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-field-green-600"></div>
      </div>
    );
  }

  /**
   * Empty state component
   */
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">No game data available</p>
          <p className="text-gray-500">Start recording a game to see player statistics</p>
        </div>
      </div>
    );
  }

  /**
   * Calculate team totals
   */
  const getTeamTotals = (): { hits: number; runs: number; rbis: number; atBats: number } => {
    return playerStats.reduce(
      (totals, player) => ({
        hits: totals.hits + player.batting.hits,
        runs: totals.runs + player.batting.runs,
        rbis: totals.rbis + player.batting.rbis,
        atBats: totals.atBats + player.batting.atBats,
      }),
      { hits: 0, runs: 0, rbis: 0, atBats: 0 }
    );
  };

  /**
   * Handle back navigation
   */
  const handleBack = (): void => {
    if (currentGame?.status === 'active' && gameId) {
      void navigate(`/game/${gameId}/record`);
    } else {
      void navigate('/');
    }
  };

  /**
   * Handle player detail view
   */
  const handlePlayerClick = (playerId: string): void => {
    setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId);
  };

  /**
   * Handle share stats
   *
   * @remarks
   * Provides user-friendly notification for upcoming feature.
   * Future implementation will integrate with native sharing APIs
   * and export functionality.
   */
  const handleShareStats = (): void => {
    // Use appropriate user feedback for feature coming soon
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Stats sharing functionality will be available in the next release!');
    }
    // Note: Fallback handled by window.alert check - console removed for production
  };

  // If no game data, show error state
  if (!currentGame) {
    return (
      <div className="game-stats-error" data-testid="game-stats-page">
        <h1>Game Not Found</h1>
        <p>No game found with ID: {gameId}</p>
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

  const { homeScore = 0, awayScore = 0, homeTeam, awayTeam, status } = currentGame;
  const teamTotals = getTeamTotals();

  return (
    <div className="game-stats-page" data-testid="game-stats-page">
      <header className="stats-header">
        <button className="back-button" onClick={handleBack} aria-label="Go back">
          ←
        </button>
        <h1>Game Stats</h1>
      </header>

      <main className="stats-content">
        {/* Score and game status */}
        <section className="game-score-section">
          <h2 className="final-score">
            {homeTeam} {homeScore} - {awayTeam} {awayScore}
          </h2>
          <p className="game-status">{status === 'completed' ? 'Final' : 'Top 6th • 2 Outs'}</p>
        </section>

        {/* Tab navigation */}
        <section className="stats-tabs">
          <div className="tab-buttons" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'batting'}
              aria-controls="batting-panel"
              className={`tab-button ${activeTab === 'batting' ? 'active' : ''}`}
              onClick={() => setActiveTab('batting')}
              data-testid="batting-tab"
            >
              BATTING
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'fielding'}
              aria-controls="fielding-panel"
              className={`tab-button ${activeTab === 'fielding' ? 'active' : ''}`}
              onClick={() => setActiveTab('fielding')}
              data-testid="fielding-tab"
            >
              FIELDING
            </button>
          </div>
        </section>

        {/* Player statistics */}
        <section className="player-stats-section">
          <h3>Player Stats:</h3>

          <div
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
            className="stats-panel"
          >
            {playerStats.map(player => (
              <div
                key={player.id}
                className={`player-stat-card ${selectedPlayerId === player.id ? 'expanded' : ''}`}
                onClick={() => handlePlayerClick(player.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handlePlayerClick(player.id);
                  }
                }}
                data-testid={`player-card-${player.id}`}
              >
                <div className="player-summary">
                  <h4 className="player-name">
                    #{player.jerseyNumber} {player.name}
                  </h4>
                  {activeTab === 'batting' ? (
                    <p className="player-stats">
                      {player.batting.hits}-{player.batting.atBats}, {player.batting.rbis} RBI,{' '}
                      {player.batting.runs} R
                      <br />.
                      {Math.floor(player.batting.average * 1000)
                        .toString()
                        .padStart(3, '0')}{' '}
                      AVG
                    </p>
                  ) : (
                    <p className="player-stats">
                      {player.fielding.putOuts} PO, {player.fielding.assists} A,{' '}
                      {player.fielding.errors} E
                      <br />.
                      {Math.floor(player.fielding.fieldingPercentage * 1000)
                        .toString()
                        .padStart(3, '0')}{' '}
                      FLD%
                    </p>
                  )}
                </div>

                {/* Expanded player details */}
                {selectedPlayerId === player.id && (
                  <div className="player-details">
                    <h5>At-Bat Results:</h5>
                    {player.atBatHistory.map((atBat, index) => (
                      <div key={index} className="at-bat-result">
                        <span className="inning">Inning {atBat.inning}:</span>
                        <span className="result">{atBat.result}</span>
                        <span className="description">{atBat.description}</span>
                      </div>
                    ))}

                    <div className="detailed-stats">
                      <h6>Game Totals:</h6>
                      <div className="stats-grid">
                        <div>At-Bats: {player.batting.atBats}</div>
                        <div>Hits: {player.batting.hits}</div>
                        <div>RBI: {player.batting.rbis}</div>
                        <div>Runs: {player.batting.runs}</div>
                        <div>
                          Average: .
                          {Math.floor(player.batting.average * 1000)
                            .toString()
                            .padStart(3, '0')}
                        </div>
                        <div>Position: {player.position}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Team totals */}
        <section className="team-totals-section">
          <h3>Team Totals:</h3>
          <div className="team-stats">
            <span>Hits: {teamTotals.hits}</span>
            <span>Runs: {teamTotals.runs}</span>
            <span>RBIs: {teamTotals.rbis}</span>
            <span>LOB: 8</span>
          </div>
        </section>

        {/* Share functionality */}
        <section className="share-section">
          <Button
            onClick={handleShareStats}
            className="share-button"
            size="large"
            data-testid="share-stats-button"
          >
            SHARE STATS
          </Button>
        </section>
      </main>
    </div>
  );
}
