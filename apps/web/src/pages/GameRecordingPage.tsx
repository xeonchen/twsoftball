import { type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useNavigationGuard } from '../shared/hooks/useNavigationGuard';
import { useGameStore } from '../shared/lib/store/gameStore';
import { useUIStore } from '../shared/lib/store/uiStore';
import { Button } from '../shared/ui/button';

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
  const { currentGame, activeGameState, isGameActive } = useGameStore();
  const { showNavigationWarning } = useUIStore();

  // Browser navigation protection
  useNavigationGuard(
    isGameActive,
    () => showNavigationWarning(),
    "Game in progress. Your progress will be saved but you'll need to resume manually. Continue?"
  );

  /**
   * Handle action button clicks
   */
  const handleAction = (actionType: string): void => {
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log(`Recording action: ${actionType}`);
    // TODO: Implement actual game recording logic
    // This will integrate with domain layer use cases in the next step
  };

  /**
   * Handle undo action
   */
  const handleUndo = (): void => {
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Undo last action');
    // TODO: Implement undo functionality
  };

  /**
   * Handle redo action
   */
  const handleRedo = (): void => {
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Redo last action');
    // TODO: Implement redo functionality
  };

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

      {/* Scrollable actions area */}
      <main className="actions-area">
        <div className="action-buttons-container">
          {actionButtons.map(button => (
            <button
              key={button.id}
              className={`action-button ${button.priority}-priority`}
              onClick={() => handleAction(button.id)}
              data-testid={`action-${button.id}`}
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
