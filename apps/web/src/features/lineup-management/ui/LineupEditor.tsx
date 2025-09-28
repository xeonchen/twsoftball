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

import { SubstitutionDialog, type SubstitutePlayerAPI } from './SubstitutionDialog';

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
  /** Substitute player API functionality (injected by widget) */
  substitutePlayerAPI: SubstitutePlayerAPI;
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
 * LineupEditor component for managing team lineup and substitutions
 */
export function LineupEditor({
  gameId,
  onSubstitutionComplete,
  className = '',
  substitutePlayerAPI,
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
          <div className="spinner" />
          <span>Loading lineup...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && activeLineup.length === 0) {
    return (
      <div className={`lineup-editor ${className}`}>
        <div role="alert" className="error-container">
          <h2>Error Loading Lineup</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="retry-button"
            aria-label="Retry loading lineup"
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
        <div className="empty-state">
          <h2>No Lineup Data Available</h2>
          <p>Please set up your lineup to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`lineup-editor ${className}`}>
      <div role="region" aria-label="Lineup editor" className="lineup-container">
        {/* Header */}
        <div className="lineup-header">
          <h2>Current Lineup</h2>
          {isLoading && (
            <div role="status" aria-label="Loading" className="inline-spinner">
              <div className="small-spinner" />
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div role="alert" className="inline-error">
            <span>{error}</span>
          </div>
        )}

        {/* Lineup list */}
        <div role="list" aria-label="Batting order" className="lineup-list">
          {activeLineup
            .sort((a, b) => a.battingSlot - b.battingSlot)
            .map(player => (
              <div
                key={`${player.battingSlot}-${player.playerId}`}
                role="listitem"
                className="lineup-slot"
              >
                <div className="slot-info">
                  <span className="batting-number">{player.battingSlot}.</span>
                  <div className="player-info">
                    <span className="player-name">{player.playerId}</span>
                    <span className="position-badge">
                      {getPositionAbbreviation(player.fieldPosition)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubstituteClick(player)}
                  className="substitute-button"
                  aria-label={`Substitute player in slot ${player.battingSlot}`}
                  tabIndex={0}
                >
                  Substitute
                </button>
              </div>
            ))}
        </div>

        {/* Live region for announcements */}
        <div role="status" aria-label="Lineup updates" aria-live="polite" className="sr-only">
          {/* Screen reader announcements will be inserted here */}
        </div>
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
          substitutePlayerAPI={substitutePlayerAPI}
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
