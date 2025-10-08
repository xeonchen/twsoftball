/**
 * @file LineupManagementPage Component
 *
 * Main page component for managing team lineup with substitution capabilities.
 * Provides a dedicated interface for lineup management separate from the game recording flow.
 *
 * @remarks
 * This page provides a standalone interface for lineup management operations:
 * - Viewing current active lineup with batting order and positions
 * - Making player substitutions through an intuitive interface
 * - Managing player positions and batting order
 * - Accessing substitution history
 *
 * Architecture:
 * - Follows Feature-Sliced Design page layer patterns
 * - Uses LineupEditor component from features layer
 * - Integrates with lineup management hooks
 * - Provides proper loading and error states
 * - Supports mobile-first responsive design
 *
 * @example
 * ```tsx
 * // Routed page at /lineup
 * <Route path="/lineup" element={<LineupManagementPage />} />
 * ```
 */

import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../../../entities/game';
import { LineupEditor } from '../../../features/lineup-management';
import { Button } from '../../../shared/ui/button';

/**
 * LineupManagementPage - Dedicated page for managing team lineup
 *
 * Provides a standalone interface for viewing and editing the team lineup,
 * making substitutions, and managing player positions. This page is accessible
 * from the home page and provides a focused environment for lineup management
 * separate from the live game recording interface.
 *
 * Features:
 * - Current lineup display with batting order
 * - Player substitution interface
 * - Position management
 * - Back navigation to home
 * - Loading and error states
 * - Mobile-optimized layout
 *
 * Reference: E2E test requirements for lineup management navigation
 */
export function LineupManagementPage(): ReactElement {
  const navigate = useNavigate();
  const { currentGame } = useGameStore();

  /**
   * Navigate back to home page
   */
  const handleBack = (): void => {
    void navigate('/');
  };

  /**
   * Handle successful substitution
   */
  const handleSubstitutionComplete = (): void => {
    // Substitution completed - could show notification in future
    // For now, just maintain the page state
  };

  // If no active game, show error state
  if (!currentGame) {
    return (
      <div className="lineup-management-page" data-testid="lineup-management-page">
        <header className="page-header">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Go back to home"
            data-testid="back-button"
          >
            ←
          </button>
          <h2>Lineup Management</h2>
        </header>

        <main className="page-content">
          <div className="error-state">
            <h3>No Active Game</h3>
            <p>Please start or resume a game to manage the lineup.</p>
            <Button onClick={handleBack} size="large">
              Go to Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="lineup-management-page" data-testid="lineup-management-page">
      <header className="page-header">
        <button
          className="back-button"
          onClick={handleBack}
          aria-label="Go back to home"
          data-testid="back-button"
        >
          ←
        </button>
        <h2>Lineup Management</h2>
      </header>

      <main className="page-content">
        <div className="game-info">
          <h3 className="game-title">
            {currentGame.homeTeam} vs {currentGame.awayTeam}
          </h3>
          <p className="game-status">
            {currentGame.status === 'active'
              ? `In Progress - Top ${currentGame.currentInning}th`
              : 'Game Setup'}
          </p>
        </div>

        <LineupEditor gameId={currentGame.id} onSubstitutionComplete={handleSubstitutionComplete} />
      </main>
    </div>
  );
}
