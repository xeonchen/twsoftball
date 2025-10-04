/**
 * @file SubstitutePlayerForm Component
 *
 * A basic form component for standalone player substitution operations.
 * Provides a simple interface for executing substitutions outside of the
 * integrated lineup-management dialog workflow.
 *
 * @remarks
 * This component is designed for:
 * - Standalone substitution scenarios
 * - Testing and development purposes
 * - Integration in custom UI workflows
 * - API demonstration and examples
 *
 * For the main application flow, use the SubstitutionDialog from lineup-management
 * which provides full integration with lineup management and eligibility checking.
 *
 * @example
 * ```tsx
 * <SubstitutePlayerForm
 *   gameId="game-123"
 *   teamLineupId="team-456"
 *   onSuccess={(result) => console.log('Substitution completed', result)}
 *   onError={(error) => console.error('Substitution failed', error)}
 * />
 * ```
 */

import { FieldPosition } from '@twsoftball/application';
import React, { useState, useCallback } from 'react';

import { useSubstitutePlayer } from '../model/useSubstitutePlayer';
import type { SubstitutePlayerData, SubstitutePlayerResult } from '../model/useSubstitutePlayer';

/**
 * Props for SubstitutePlayerForm component
 */
export interface SubstitutePlayerFormProps {
  /** Game ID for the substitution */
  gameId: string;
  /** Team lineup ID for the substitution */
  teamLineupId: string;
  /** Callback called on successful substitution */
  onSuccess?: (result: SubstitutePlayerResult) => void;
  /** Callback called on substitution error */
  onError?: (error: string) => void;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Form state for substitution data
 */
interface FormState {
  battingSlot: number;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  incomingPlayerName: string;
  incomingJerseyNumber: string;
  position: FieldPosition;
  inning: number;
  isReentry: boolean;
  notes: string;
}

/**
 * Initial form state
 */
const initialFormState: FormState = {
  battingSlot: 1,
  outgoingPlayerId: '',
  incomingPlayerId: '',
  incomingPlayerName: '',
  incomingJerseyNumber: '',
  position: FieldPosition.PITCHER,
  inning: 1,
  isReentry: false,
  notes: '',
};

/**
 * SubstitutePlayerForm component for standalone substitution operations
 */
export function SubstitutePlayerForm({
  gameId,
  teamLineupId,
  onSuccess,
  onError,
  className = '',
}: SubstitutePlayerFormProps): React.JSX.Element {
  // Hook state
  const { substitutePlayer, isLoading, error } = useSubstitutePlayer();

  // Local state
  const [formState, setFormState] = useState<FormState>(initialFormState);

  /**
   * Handle form field changes
   */
  const handleChange = useCallback(
    (field: keyof FormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { value, type } = event.target;

        setFormState(prev => ({
          ...prev,
          [field]:
            type === 'checkbox'
              ? (event.target as HTMLInputElement).checked
              : type === 'number'
                ? Number(value)
                : value,
        }));
      },
    []
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      try {
        const substitutionData: SubstitutePlayerData = {
          gameId,
          teamLineupId,
          battingSlot: formState.battingSlot,
          outgoingPlayerId: formState.outgoingPlayerId,
          incomingPlayer: {
            id: formState.incomingPlayerId,
            name: formState.incomingPlayerName,
            jerseyNumber: formState.incomingJerseyNumber,
            position: formState.position,
          },
          inning: formState.inning,
          isReentry: formState.isReentry,
          ...(formState.notes && { notes: formState.notes }),
        };

        const result = await substitutePlayer(substitutionData);

        if (result.success) {
          onSuccess?.(result);
          // Reset form on success
          setFormState(initialFormState);
        } else {
          const errorMessage = result.errors?.[0] || 'Substitution failed';
          onError?.(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        onError?.(errorMessage);
      }
    },
    [gameId, teamLineupId, formState, substitutePlayer, onSuccess, onError]
  );

  /**
   * Handle form submission event
   */
  const handleSubmitEvent = useCallback(
    (event: React.FormEvent): void => {
      void handleSubmit(event);
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmitEvent} className={`substitute-player-form ${className}`.trim()}>
      <div className="form-section">
        <h3>Player Substitution</h3>

        {/* Error display */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Game context */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="batting-slot">Batting Slot:</label>
            <input
              id="batting-slot"
              type="number"
              min="1"
              max="30"
              value={formState.battingSlot}
              onChange={handleChange('battingSlot')}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="inning">Inning:</label>
            <input
              id="inning"
              type="number"
              min="1"
              value={formState.inning}
              onChange={handleChange('inning')}
              required
            />
          </div>
        </div>

        {/* Players */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="outgoing-player">Outgoing Player ID:</label>
            <input
              id="outgoing-player"
              type="text"
              value={formState.outgoingPlayerId}
              onChange={handleChange('outgoingPlayerId')}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="incoming-player-id">Incoming Player ID:</label>
            <input
              id="incoming-player-id"
              type="text"
              value={formState.incomingPlayerId}
              onChange={handleChange('incomingPlayerId')}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="incoming-player-name">Incoming Player Name:</label>
            <input
              id="incoming-player-name"
              type="text"
              value={formState.incomingPlayerName}
              onChange={handleChange('incomingPlayerName')}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="jersey-number">Jersey Number:</label>
            <input
              id="jersey-number"
              type="text"
              value={formState.incomingJerseyNumber}
              onChange={handleChange('incomingJerseyNumber')}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="position">Field Position:</label>
            <select
              id="position"
              value={formState.position}
              onChange={handleChange('position')}
              required
            >
              {Object.values(FieldPosition).map(position => (
                <option key={position} value={position}>
                  {position.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="form-row">
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={formState.isReentry}
                onChange={handleChange('isReentry')}
              />
              Re-entry substitution
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="notes">Notes (optional):</label>
            <input
              id="notes"
              type="text"
              value={formState.notes}
              onChange={handleChange('notes')}
              placeholder="Additional notes about the substitution"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="form-actions">
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Executing Substitution...' : 'Execute Substitution'}
          </button>
        </div>
      </div>
    </form>
  );
}
