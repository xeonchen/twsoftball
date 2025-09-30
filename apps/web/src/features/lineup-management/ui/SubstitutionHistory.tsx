/**
 * @file SubstitutionHistory Component
 *
 * Displays the history of player substitutions for a game with real-time updates.
 * Provides clear visual representation of substitution timeline and player movements.
 *
 * @remarks
 * This component handles:
 * - Chronological display of all substitutions made during the game
 * - Visual indicators for re-entries vs. first-time substitutions
 * - Real-time updates when new substitutions occur
 * - Empty state when no substitutions have been made
 * - Responsive design for mobile and desktop viewing
 *
 * Architecture:
 * - Uses Feature-Sliced Design patterns
 * - Integrates with game state for real-time updates
 * - Provides accessibility support for screen readers
 * - Implements mobile-first responsive design
 *
 * @example
 * ```tsx
 * <SubstitutionHistory
 *   gameId="game-123"
 *   substitutions={substitutionList}
 *   onPlayerClick={handlePlayerClick}
 * />
 * ```
 */

import React from 'react';

import type { SubstitutionRecord } from '../../../shared/lib/types';

/**
 * Props for SubstitutionHistory component
 */
export interface SubstitutionHistoryProps {
  /** Game ID for context */
  gameId: string;
  /** Array of substitution records to display */
  substitutions?: SubstitutionRecord[];
  /** Optional callback when a player in history is clicked */
  onPlayerClick?: (playerId: string) => void;
  /** Additional CSS classes for styling */
  className?: string;
}

/**
 * SubstitutionHistory Component
 *
 * Displays chronological list of player substitutions with visual indicators
 * for re-entries and substitution details.
 */
export function SubstitutionHistory({
  substitutions = [],
  onPlayerClick,
  className = '',
}: SubstitutionHistoryProps): React.ReactElement {
  // If no substitutions, show empty state
  if (substitutions.length === 0) {
    return (
      <div
        className={`substitution-history empty ${className}`}
        data-testid="substitution-history-empty"
        role="region"
        aria-label="Substitution history"
      >
        <div className="empty-state">
          <h3>No substitutions made</h3>
          <p>Substitutions will appear here as they are made during the game.</p>
        </div>
      </div>
    );
  }

  // Sort substitutions by inning and timestamp
  // Filter out invalid entries before sorting to handle edge cases
  const sortedSubstitutions = [...substitutions]
    .filter(s => s.inning != null && s.timestamp instanceof Date && !isNaN(s.timestamp.getTime()))
    .sort((a, b) => {
      if (a.inning !== b.inning) {
        return a.inning - b.inning;
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

  return (
    <div
      className={`substitution-history ${className}`}
      data-testid="substitution-history"
      role="region"
      aria-label="Substitution history"
    >
      <div className="substitution-list">
        {sortedSubstitutions.map(substitution => (
          <div
            key={`${substitution.inning}-${substitution.battingSlot}-${substitution.timestamp.getTime()}`}
            className={`substitution-record ${substitution.isReentry ? 'reentry' : 'first-time'}`}
            data-testid="substitution-record"
          >
            <div className="substitution-inning">
              <span className="inning-label">Inning {substitution.inning}</span>
            </div>

            <div className="substitution-details">
              <div className="batting-slot">
                <span className="slot-number">#{substitution.battingSlot}</span>
              </div>

              <div className="player-change">
                <button
                  className="player-name outgoing"
                  onClick={() => onPlayerClick?.(String(substitution.outgoingPlayer.playerId))}
                  type="button"
                  aria-label={`View details for ${substitution.outgoingPlayer.name}`}
                >
                  {substitution.outgoingPlayer.name}
                </button>

                <span className="change-arrow" aria-hidden="true">
                  →
                </span>

                <button
                  className="player-name incoming"
                  onClick={() => onPlayerClick?.(String(substitution.incomingPlayer.playerId))}
                  type="button"
                  aria-label={`View details for ${substitution.incomingPlayer.name}`}
                >
                  {substitution.incomingPlayer.name}
                </button>

                {substitution.isReentry && (
                  <span className="reentry-badge" aria-label="Re-entry">
                    (Re-entry)
                  </span>
                )}
              </div>

              <div className="substitution-time">
                <time dateTime={substitution.timestamp.toISOString()}>
                  {substitution.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="history-summary">
        <p>
          Total substitutions: {substitutions.length} | Re-entries:{' '}
          {substitutions.filter(s => s.isReentry).length}
        </p>
      </div>
    </div>
  );
}

/**
 * Empty state component for when no substitutions have been made
 */
export function SubstitutionHistoryEmpty(): React.ReactElement {
  return (
    <div
      className="substitution-history-empty"
      data-testid="substitution-history-empty"
      role="region"
      aria-label="No substitutions made"
    >
      <div className="empty-state">
        <h3>No substitutions made</h3>
        <p>Substitutions will appear here as they are made during the game.</p>
      </div>
    </div>
  );
}
