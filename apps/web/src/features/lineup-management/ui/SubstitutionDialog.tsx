/**
 * @file SubstitutionDialog Component
 *
 * Modal dialog component for handling player substitutions with eligibility validation
 * and confirmation flow. Provides comprehensive substitution management interface.
 *
 * @remarks
 * This component handles all aspects of player substitution:
 * - Displaying available bench players for substitution
 * - Validating substitution eligibility in real-time
 * - Managing field position selection and validation
 * - Handling re-entry scenarios for original starters
 * - Providing confirmation workflow with validation feedback
 * - Supporting responsive modal design for mobile devices
 * - Implementing proper accessibility standards
 *
 * Architecture:
 * - Uses Feature-Sliced Design patterns
 * - Follows modal accessibility standards (ARIA, focus management)
 * - Integrates with lineup management hook for validation
 * - Provides comprehensive form validation and error handling
 * - Implements mobile-first responsive design
 *
 * @example
 * ```tsx
 * <SubstitutionDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleSubstitution}
 *   currentPlayer={currentPlayer}
 *   benchPlayers={benchPlayers}
 *   gameId="game-123"
 * />
 * ```
 */

import { FieldPosition } from '@twsoftball/application';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import type { BenchPlayer, PositionAssignment } from '../../../shared/lib/types';
import { useSubstitutePlayer } from '../../substitute-player';
import { useLineupManagement } from '../model/useLineupManagement';
import type { SubstitutionData } from '../model/useLineupManagement';

/**
 * Props for SubstitutionDialog component
 */
export interface SubstitutionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback to confirm substitution */
  onConfirm: (data: SubstitutionData) => Promise<void>;
  /** Current player being substituted */
  currentPlayer: PositionAssignment;
  /** Available bench players */
  benchPlayers: BenchPlayer[];
  /** Game ID for context */
  gameId: string;
  /** Team lineup ID for substitution */
  teamLineupId: string;
  /** Current inning number */
  inning: number;
}

/**
 * Form state for substitution dialog
 */
interface SubstitutionFormState {
  selectedPlayerId: string;
  selectedPosition: FieldPosition;
  isReentry: boolean;
}

/**
 * Helper function to get field position display name
 */
function getPositionDisplayName(position: FieldPosition): string {
  const names: Record<FieldPosition, string> = {
    [FieldPosition.PITCHER]: 'Pitcher',
    [FieldPosition.CATCHER]: 'Catcher',
    [FieldPosition.FIRST_BASE]: 'First Base',
    [FieldPosition.SECOND_BASE]: 'Second Base',
    [FieldPosition.THIRD_BASE]: 'Third Base',
    [FieldPosition.SHORTSTOP]: 'Shortstop',
    [FieldPosition.LEFT_FIELD]: 'Left Field',
    [FieldPosition.CENTER_FIELD]: 'Center Field',
    [FieldPosition.RIGHT_FIELD]: 'Right Field',
    [FieldPosition.SHORT_FIELDER]: 'Short Fielder',
    [FieldPosition.EXTRA_PLAYER]: 'Extra Player',
  };
  return names[position] || position;
}

/**
 * SubstitutionDialog component for managing player substitutions
 */
export function SubstitutionDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPlayer,
  benchPlayers,
  gameId,
  teamLineupId,
  inning,
}: SubstitutionDialogProps): React.JSX.Element | null {
  // Hook state
  const { checkEligibility, getAvailablePositions } = useLineupManagement(gameId);
  const {
    substitutePlayer: executeSubstitution,
    isLoading: isExecuting,
    error: substitutionError,
  } = useSubstitutePlayer();

  // Local state
  const [formState, setFormState] = useState<SubstitutionFormState>({
    selectedPlayerId: '',
    selectedPosition: currentPlayer.fieldPosition,
    isReentry: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Get eligibility for selected player
  const eligibility = useMemo(
    () =>
      formState.selectedPlayerId
        ? checkEligibility({
            playerId: formState.selectedPlayerId,
            inning,
            isReentry: formState.isReentry,
          })
        : { eligible: false, reason: 'No player selected' },
    [formState.selectedPlayerId, formState.isReentry, inning, checkEligibility]
  );

  // Get available positions for selected player
  const availablePositions = formState.selectedPlayerId
    ? getAvailablePositions(formState.selectedPlayerId)
    : [];

  /**
   * Handle form field changes
   */
  const handlePlayerSelection = useCallback(
    (playerId: string) => {
      const player = benchPlayers.find(p => p.id === playerId);
      const isReentry = player?.isStarter && !player?.hasReentered;

      setFormState(prev => ({
        ...prev,
        selectedPlayerId: playerId,
        isReentry: isReentry || false,
      }));
      setError(null);
    },
    [benchPlayers]
  );

  const handlePositionChange = useCallback((position: FieldPosition) => {
    setFormState(prev => ({
      ...prev,
      selectedPosition: position,
    }));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!eligibility.eligible) {
      setError(eligibility.reason || 'Substitution not allowed');
      return;
    }

    const selectedPlayer = benchPlayers.find(p => p.id === formState.selectedPlayerId);
    if (!selectedPlayer) {
      setError('Selected player not found');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the substitute-player feature to execute the substitution
      const result = await executeSubstitution({
        gameId,
        teamLineupId,
        battingSlot: currentPlayer.battingSlot,
        outgoingPlayerId: currentPlayer.playerId,
        incomingPlayer: {
          id: selectedPlayer.id,
          name: selectedPlayer.name,
          jerseyNumber: selectedPlayer.jerseyNumber,
          position: formState.selectedPosition,
        },
        inning,
        isReentry: formState.isReentry,
      });

      if (result.success) {
        // Also call the original onConfirm for backward compatibility
        const substitutionData: SubstitutionData = {
          outgoingPlayerId: currentPlayer.playerId,
          incomingPlayerId: formState.selectedPlayerId,
          battingSlot: currentPlayer.battingSlot,
          fieldPosition: formState.selectedPosition,
          isReentry: formState.isReentry,
        };
        await onConfirm(substitutionData);

        // Close dialog after successful substitution
        onClose();
      } else {
        const errorMessage = result.errors?.[0] || 'Substitution failed';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Substitution failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    eligibility,
    currentPlayer,
    formState,
    benchPlayers,
    executeSubstitution,
    gameId,
    teamLineupId,
    inning,
    onConfirm,
    onClose,
  ]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormState({
        selectedPlayerId: '',
        selectedPosition: currentPlayer.fieldPosition,
        isReentry: false,
      });
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentPlayer]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="substitution-dialog"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Dialog header */}
        <div className="dialog-header">
          <h2 id="dialog-title">Make Substitution</h2>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            className="close-button"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* Current player info */}
        <div className="current-player-info">
          <p>
            <strong>Substituting {currentPlayer.playerId}</strong> in batting slot{' '}
            {currentPlayer.battingSlot}
          </p>
          <p>Current position: {getPositionDisplayName(currentPlayer.fieldPosition)}</p>
        </div>

        {/* Error display */}
        {(error || substitutionError) && (
          <div role="alert" className="error-message">
            {error || substitutionError}
          </div>
        )}

        {/* Form content */}
        <div className="dialog-content">
          {/* Player selection */}
          <div className="form-section">
            <h3>Select Replacement Player</h3>
            {benchPlayers.length === 0 ? (
              <p className="no-players">No bench players available</p>
            ) : (
              <div role="radiogroup" aria-label="Select replacement player" className="player-list">
                {benchPlayers.map(player => (
                  <label key={player.id} className="player-option">
                    <input
                      type="radio"
                      name="selectedPlayer"
                      value={player.id}
                      checked={formState.selectedPlayerId === player.id}
                      onChange={e => handlePlayerSelection(e.target.value)}
                      aria-describedby={`player-${player.id}-details`}
                    />
                    <div className="player-details">
                      <div className="player-header">
                        <span className="player-name">{player.name}</span>
                        <span className="jersey-number">#{player.jerseyNumber}</span>
                      </div>
                      <div id={`player-${player.id}-details`} className="player-meta">
                        {player.isStarter && <span className="starter-badge">Starter</span>}
                        {player.hasReentered && player.entryInning && (
                          <span className="reentry-info">
                            Re-entered inning {player.entryInning}
                          </span>
                        )}
                      </div>
                    </div>
                    {formState.selectedPlayerId === player.id && (
                      <div className="eligibility-indicator">
                        {eligibility.eligible ? (
                          <span role="img" aria-label="Eligible" className="eligible-icon">
                            ✓
                          </span>
                        ) : (
                          <span role="img" aria-label="Not eligible" className="ineligible-icon">
                            ✗
                          </span>
                        )}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Eligibility feedback */}
          {formState.selectedPlayerId && !eligibility.eligible && (
            <div className="eligibility-error">{eligibility.reason}</div>
          )}

          {/* Position selection */}
          {formState.selectedPlayerId && eligibility.eligible && (
            <div className="form-section">
              <label htmlFor="position-select" className="form-label">
                Field Position
              </label>
              <select
                id="position-select"
                value={formState.selectedPosition}
                onChange={e => handlePositionChange(e.target.value as FieldPosition)}
                className="position-select"
              >
                {availablePositions.map(position => (
                  <option key={position} value={position}>
                    {getPositionDisplayName(position)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dialog footer */}
        <div className="dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="cancel-button touch-friendly"
            disabled={isSubmitting || isExecuting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            className="confirm-button touch-friendly"
            disabled={!eligibility.eligible || isSubmitting || isExecuting}
          >
            {isSubmitting || isExecuting ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles (in a real implementation, these would be in a separate CSS/SCSS file)
const styles = `
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.substitution-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.current-player-info {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.current-player-info p {
  margin: 0.25rem 0;
  color: #374151;
  font-size: 0.875rem;
}

.error-message {
  padding: 1rem 1.5rem;
  background: #fef2f2;
  border-left: 4px solid #dc2626;
  color: #dc2626;
  font-size: 0.875rem;
}

.dialog-content {
  padding: 1.5rem;
  flex: 1;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-section h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.no-players {
  color: #6b7280;
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.player-option:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.player-option input[type="radio"] {
  margin: 0;
}

.player-details {
  flex: 1;
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.player-name {
  font-weight: 500;
  color: #111827;
}

.jersey-number {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
}

.player-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.starter-badge {
  font-size: 0.625rem;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
}

.reentry-info {
  font-size: 0.625rem;
  color: #6b7280;
}

.eligibility-indicator {
  display: flex;
  align-items: center;
}

.eligible-icon {
  color: #059669;
  font-weight: bold;
}

.ineligible-icon {
  color: #dc2626;
  font-weight: bold;
}

.eligibility-error {
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.position-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #111827;
  background: white;
}

.position-select:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  border-color: #3b82f6;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.cancel-button,
.confirm-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.touch-friendly {
  min-height: 44px;
  min-width: 80px;
}

.cancel-button {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.cancel-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.confirm-button {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.confirm-button:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.confirm-button:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

/* Mobile responsive design */
@media (max-width: 768px) {
  .dialog-overlay {
    padding: 0.5rem;
  }

  .substitution-dialog {
    max-height: 95vh;
  }

  .dialog-header,
  .dialog-content,
  .dialog-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .player-option {
    padding: 1rem 0.75rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .cancel-button,
  .confirm-button {
    width: 100%;
    padding: 0.75rem;
  }
}
`;

// Inject styles (in a real implementation, this would be handled by the build system)
if (typeof document !== 'undefined' && !document.getElementById('substitution-dialog-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'substitution-dialog-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
