/**
 * @file LineupEditor Component
 *
 * Main component for managing team lineup with substitution capabilities.
 * Provides comprehensive lineup management interface with mobile-first design.
 *
 * @remarks
 * This component encapsulates all lineup management UI functionality:
 * - Displaying current active lineup with batting order and positions
 * - Providing substitution interface for each lineup slot
 * - Showing player information and status indicators
 * - Handling loading and error states with proper feedback
 * - Supporting responsive layout for mobile-first design
 * - Managing accessibility features for lineup management
 *
 * Architecture:
 * - Uses Feature-Sliced Design patterns
 * - Integrates with lineup management hook
 * - Follows mobile-first responsive design principles
 * - Provides proper accessibility attributes
 * - Implements touch-friendly interactions
 *
 * @example
 * ```tsx
 * <LineupEditor
 *   gameId="game-123"
 *   onSubstitutionComplete={() => console.log('Substitution completed')}
 *   className="custom-lineup-editor"
 * />
 * ```
 */

import { FieldPosition } from '@twsoftball/application';
import React, { useState, useCallback } from 'react';

import type { PositionAssignment } from '../../../shared/lib/types';
import { useLineupManagement } from '../model/useLineupManagement';
import type { SubstitutionData } from '../model/useLineupManagement';

import { SubstitutionDialog } from './SubstitutionDialog';

/**
 * Props for LineupEditor component
 */
export interface LineupEditorProps {
  /** Game ID for lineup management */
  gameId: string;
  /** Optional callback when substitution is completed */
  onSubstitutionComplete?: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * State for substitution dialog management
 */
interface SubstitutionDialogState {
  isOpen: boolean;
  currentPlayer: PositionAssignment | null;
}

/**
 * Helper function to convert field position to abbreviated display
 */
function getPositionAbbreviation(position: FieldPosition): string {
  const abbreviations: Record<FieldPosition, string> = {
    [FieldPosition.PITCHER]: 'P',
    [FieldPosition.CATCHER]: 'C',
    [FieldPosition.FIRST_BASE]: '1B',
    [FieldPosition.SECOND_BASE]: '2B',
    [FieldPosition.THIRD_BASE]: '3B',
    [FieldPosition.SHORTSTOP]: 'SS',
    [FieldPosition.LEFT_FIELD]: 'LF',
    [FieldPosition.CENTER_FIELD]: 'CF',
    [FieldPosition.RIGHT_FIELD]: 'RF',
    [FieldPosition.SHORT_FIELDER]: 'SF',
    [FieldPosition.EXTRA_PLAYER]: 'EP',
  };
  return abbreviations[position] || position;
}

/**
 * Helper function to convert field position to full name display
 */
function getPositionFullName(position: FieldPosition): string {
  const fullNames: Record<FieldPosition, string> = {
    [FieldPosition.PITCHER]: 'Pitcher',
    [FieldPosition.CATCHER]: 'Catcher',
    [FieldPosition.FIRST_BASE]: 'First Base',
    [FieldPosition.SECOND_BASE]: 'Second Base',
    [FieldPosition.THIRD_BASE]: 'Third Base',
    [FieldPosition.SHORTSTOP]: 'Shortstop',
    [FieldPosition.LEFT_FIELD]: 'Left Field',
    [FieldPosition.CENTER_FIELD]: 'Center Field',
    [FieldPosition.RIGHT_FIELD]: 'Right Field',
    [FieldPosition.SHORT_FIELDER]: 'Short Field',
    [FieldPosition.EXTRA_PLAYER]: 'Extra Player',
  };
  return fullNames[position] || position;
}

/**
 * LineupEditor component for managing team lineup and substitutions
 */
export function LineupEditor({
  gameId,
  onSubstitutionComplete,
  className = '',
}: LineupEditorProps): React.JSX.Element {
  // Hook state
  const { activeLineup, benchPlayers, isLoading, error, refreshLineup } =
    useLineupManagement(gameId);

  // Local state for dialog management
  const [substitutionDialog, setSubstitutionDialog] = useState<SubstitutionDialogState>({
    isOpen: false,
    currentPlayer: null,
  });

  /**
   * Handle opening substitution dialog for a player
   */
  const handleSubstituteClick = useCallback((player: PositionAssignment) => {
    setSubstitutionDialog({
      isOpen: true,
      currentPlayer: player,
    });
  }, []);

  /**
   * Handle closing substitution dialog
   */
  const handleDialogClose = useCallback(() => {
    setSubstitutionDialog({
      isOpen: false,
      currentPlayer: null,
    });
  }, []);

  /**
   * Handle substitution confirmation - SubstitutionDialog now handles the actual substitution
   */
  const handleSubstitutionConfirm = useCallback(
    async (_data: SubstitutionData): Promise<void> => {
      // SubstitutionDialog has already executed the substitution via substitute-player feature
      // This callback is now just for UI state updates and notifications
      handleDialogClose();
      onSubstitutionComplete?.();
      // Refresh lineup to get the latest state
      await refreshLineup();
    },
    [handleDialogClose, onSubstitutionComplete, refreshLineup]
  );

  /**
   * Handle retry when error occurs
   */
  const handleRetry = useCallback(() => {
    void refreshLineup();
  }, [refreshLineup]);

  // Loading state
  if (isLoading && activeLineup.length === 0) {
    return (
      <div className={`lineup-editor ${className}`}>
        <div role="status" aria-label="Loading lineup" className="loading-spinner">
          <div className="spinner" aria-hidden="true" />
          <span id="loading-text">Loading lineup...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && activeLineup.length === 0) {
    return (
      <div className={`lineup-editor ${className}`}>
        <div
          role="alert"
          aria-labelledby="error-title"
          aria-describedby="error-description"
          className="error-container"
        >
          <h2 id="error-title">Error Loading Lineup</h2>
          <p id="error-description">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="retry-button"
            aria-label="Retry loading lineup"
            aria-describedby="error-description"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (activeLineup.length === 0) {
    return (
      <div className={`lineup-editor ${className}`}>
        <div
          className="empty-state"
          role="status"
          aria-labelledby="empty-title"
          aria-describedby="empty-description"
        >
          <h2 id="empty-title">No Lineup Data Available</h2>
          <p id="empty-description">Please set up your lineup to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`lineup-editor ${className}`} data-testid="lineup-editor">
      <div role="region" aria-label="Lineup editor" className="lineup-container">
        {/* Header */}
        <div className="lineup-header">
          <h1 id="lineup-title">Current Lineup</h1>
          {isLoading && (
            <div role="status" aria-label="Updating lineup" className="inline-spinner">
              <div className="small-spinner" aria-hidden="true" />
              <span className="sr-only">Loading updated lineup data</span>
            </div>
          )}
        </div>

        {/* Batting Order Text (for test compatibility) */}
        <div className="batting-order-label" data-testid="batting-order-label">
          <h3>Batting Order</h3>
        </div>

        {/* Error display */}
        {error && (
          <div role="alert" aria-live="assertive" className="inline-error">
            <span id="inline-error-text">{error}</span>
          </div>
        )}

        {/* Lineup list */}
        <div
          role="list"
          aria-labelledby="lineup-title"
          aria-describedby="batting-order-description"
          className="lineup-list"
          data-testid="lineup-list"
        >
          <div id="batting-order-description" className="sr-only">
            Current batting order with {activeLineup.length} players. Use Tab to navigate and Enter
            or Space to substitute players.
          </div>
          {activeLineup
            .sort((a, b) => a.battingSlot - b.battingSlot)
            .map(player => (
              <div
                key={`${player.battingSlot}-${player.playerId}`}
                role="listitem"
                className="lineup-slot"
                aria-labelledby={`player-${player.battingSlot}-name`}
                aria-describedby={`player-${player.battingSlot}-details`}
              >
                <div className="slot-info">
                  <span
                    className="batting-number"
                    aria-label={`Batting position ${player.battingSlot}`}
                  >
                    {player.battingSlot}.
                  </span>
                  <div className="player-info">
                    <span id={`player-${player.battingSlot}-name`} className="player-name">
                      Player {player.playerId}
                    </span>
                    <span className="position-name">
                      {getPositionFullName(player.fieldPosition)}
                    </span>
                    <span
                      className="position-badge"
                      aria-label={`Position ${getPositionFullName(player.fieldPosition)}`}
                    >
                      {getPositionAbbreviation(player.fieldPosition)}
                    </span>
                  </div>
                  <div id={`player-${player.battingSlot}-details`} className="sr-only">
                    Player {player.playerId} is batting {player.battingSlot} and playing{' '}
                    {getPositionFullName(player.fieldPosition)}.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubstituteClick(player)}
                  className="substitute-button"
                  aria-label={`Substitute Player ${player.playerId} in batting slot ${player.battingSlot}, currently playing ${getPositionFullName(player.fieldPosition)}`}
                  aria-describedby={`player-${player.battingSlot}-details`}
                  tabIndex={0}
                >
                  Substitute
                </button>
              </div>
            ))}
        </div>

        {/* Live region for announcements */}
        <div
          id="lineup-announcements"
          role="status"
          aria-label="Lineup updates"
          aria-live="polite"
          className="sr-only"
        >
          {/* Screen reader announcements will be inserted here */}
        </div>

        {/* Skip link for keyboard navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
      </div>

      {/* Substitution dialog */}
      {substitutionDialog.currentPlayer && (
        <SubstitutionDialog
          isOpen={substitutionDialog.isOpen}
          onClose={handleDialogClose}
          onConfirm={handleSubstitutionConfirm}
          currentPlayer={substitutionDialog.currentPlayer}
          benchPlayers={benchPlayers}
          gameId={gameId}
        />
      )}
    </div>
  );
}

// Styles (in a real implementation, these would be in a separate CSS/SCSS file)
const styles = `
.lineup-editor {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.lineup-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.lineup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 1rem;
}

.lineup-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.batting-order-label {
  margin: 1rem 0;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.batting-order-label h3 {
  margin: 0;
  color: #374151;
  font-size: 1.125rem;
  font-weight: 500;
}

.loading-spinner,
.inline-spinner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner,
.small-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.small-spinner {
  width: 16px;
  height: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container,
.inline-error {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.retry-button:hover {
  background: #2563eb;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.lineup-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lineup-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.lineup-slot:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.slot-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.batting-number {
  font-weight: 700;
  font-size: 1.25rem;
  color: #374151;
  min-width: 2rem;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-name {
  font-weight: 500;
  color: #111827;
  font-size: 1rem;
}

.position-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.125rem;
}

.position-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  background: #e5e7eb;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  width: fit-content;
}

.substitute-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  min-height: 44px; /* Touch-friendly size */
  transition: background-color 0.2s ease;
}

.substitute-button:hover {
  background: #2563eb;
}

.substitute-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.substitute-button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
  box-shadow: 0 0 0 1px #fff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip link for accessibility */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 100;
  font-size: 14px;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .lineup-slot {
    border: 2px solid;
  }

  .substitute-button {
    border: 2px solid;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spinner,
  .small-spinner {
    animation: none;
  }

  .lineup-slot {
    transition: none;
  }

  .substitute-button {
    transition: none;
  }
}

/* Focus indicators with better contrast */
.substitute-button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
  box-shadow: 0 0 0 1px #fff;
}

.retry-button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
  box-shadow: 0 0 0 1px #fff;
}

/* Mobile responsive design */
@media (max-width: 768px) {
  .lineup-editor {
    padding: 0.5rem;
  }

  .lineup-container {
    padding: 1rem;
  }

  .lineup-header h2 {
    font-size: 1.25rem;
  }

  .lineup-slot {
    padding: 0.75rem;
  }

  .slot-info {
    gap: 0.75rem;
  }

  .batting-number {
    font-size: 1.125rem;
  }

  .player-name {
    font-size: 0.875rem;
  }

  .substitute-button {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
}
`;

// Inject styles (in a real implementation, this would be handled by the build system)
if (typeof document !== 'undefined' && !document.getElementById('lineup-editor-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'lineup-editor-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
