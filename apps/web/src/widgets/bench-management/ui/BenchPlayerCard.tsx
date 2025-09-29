/**
 * @file BenchPlayerCard Component
 *
 * Individual player card component for the bench management widget.
 * Displays player information, status indicators, and quick action buttons.
 */

import { FieldPosition } from '@twsoftball/application';
import React from 'react';

import type { BenchPlayer } from '../../../shared/lib';
import type { PlayerEligibility } from '../model/types';

/**
 * Props interface for BenchPlayerCard component
 */
export interface BenchPlayerCardProps {
  /** Player information to display */
  player: BenchPlayer;
  /** Current eligibility status for the player */
  eligibility: PlayerEligibility;
  /** Callback when quick substitution is requested */
  onQuickSubstitution: (playerId: string) => void;
  /** Whether the card should be disabled */
  disabled?: boolean;
  /** Whether a substitution operation is in progress */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Gets position abbreviation for display
 */
const getPositionAbbreviation = (position: FieldPosition): string => {
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
};

/**
 * BenchPlayerCard Component
 *
 * Displays a single bench player with status indicators and quick actions.
 * Provides visual cues for eligibility and substitution history.
 *
 * @example
 * ```tsx
 * <BenchPlayerCard
 *   player={benchPlayer}
 *   eligibility={playerEligibility}
 *   onQuickSubstitution={(playerId) => {
 *     performQuickSubstitution(playerId);
 *   }}
 *   disabled={false}
 * />
 * ```
 */
export const BenchPlayerCard: React.FC<BenchPlayerCardProps> = ({
  player,
  eligibility,
  onQuickSubstitution,
  disabled = false,
  isLoading = false,
  className = '',
}) => {
  const cardId = `player-card-${player.id}`;
  const nameId = `player-name-${player.id}`;

  /**
   * Handles click and keyboard events for quick substitution
   */
  const handleQuickSubstitution = (): void => {
    if (!disabled && !isLoading && eligibility.canSubstitute) {
      onQuickSubstitution(player.id);
    }
  };

  /**
   * Handles keyboard events for accessibility
   */
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleQuickSubstitution();
    }
  };

  /**
   * Gets player status display information
   */
  const getPlayerStatus = (): { label: string; className: string; ariaLabel: string } => {
    if (player.hasReentered && player.entryInning) {
      return {
        label: `Re-entered (Inning ${player.entryInning})`,
        className: 'bg-orange-100 text-orange-800',
        ariaLabel: 'Player status: Re-entered after substitution',
      };
    }

    if (!player.isStarter && player.entryInning) {
      return {
        label: `Sub (Inning ${player.entryInning})`,
        className: 'bg-green-100 text-green-800',
        ariaLabel: 'Player status: Substitute player',
      };
    }

    return {
      label: 'Starter',
      className: 'bg-blue-100 text-blue-800',
      ariaLabel: 'Player status: Starter',
    };
  };

  /**
   * Gets eligibility status display information
   */
  const getEligibilityStatus = (): {
    label: string;
    className: string;
    ariaLabel: string;
    title: string;
  } => {
    if (!eligibility.canSubstitute) {
      return {
        label: 'Ineligible',
        className: 'text-red-700',
        ariaLabel: 'Eligibility: Ineligible for substitution',
        title: eligibility.restrictions.join('; '),
      };
    }

    if (eligibility.canReenter) {
      return {
        label: 'Re-entry Available',
        className: 'text-blue-700',
        ariaLabel: 'Eligibility: Re-entry available',
        title: 'Player can re-enter the game',
      };
    }

    return {
      label: 'Available',
      className: 'text-green-700',
      ariaLabel: 'Eligibility: Available for substitution',
      title: 'Player available for substitution',
    };
  };

  const playerStatus = getPlayerStatus();
  const eligibilityStatus = getEligibilityStatus();
  const isSubstitutionDisabled = disabled || isLoading || !eligibility.canSubstitute;

  return (
    <li
      id={cardId}
      className={`
        p-4 bg-white border border-gray-200 rounded-lg
        hover:shadow-md transition-shadow duration-200
        ${disabled ? 'opacity-60' : ''}
        ${className}
      `}
      role="listitem"
      aria-labelledby={nameId}
    >
      <div className="flex items-center justify-between">
        {/* Player Info */}
        <div className="flex items-center space-x-3 flex-1">
          {/* Jersey Number */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">#{player.jerseyNumber}</span>
            </div>
          </div>

          {/* Name and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 id={nameId} className="text-sm font-medium text-gray-900 truncate">
                {player.name}
              </h3>

              {/* Current Position */}
              {player.position && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {getPositionAbbreviation(player.position)}
                </span>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${playerStatus.className}`}
                aria-label={playerStatus.ariaLabel}
              >
                {playerStatus.label}
              </span>

              <span
                className={`text-xs font-medium ${eligibilityStatus.className}`}
                aria-label={eligibilityStatus.ariaLabel}
                title={eligibilityStatus.title}
              >
                {eligibilityStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Substitution Action */}
        <div className="flex-shrink-0 ml-4">
          {isLoading ? (
            <div
              className="flex items-center space-x-2"
              role="status"
              aria-label="Processing substitution"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-xs text-gray-500">Processing...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQuickSubstitution}
              onKeyDown={handleKeyDown}
              disabled={isSubstitutionDisabled}
              aria-label={`Quick substitute ${player.name}`}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  isSubstitutionDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                }
              `}
              tabIndex={isSubstitutionDisabled ? -1 : 0}
            >
              Quick Sub
            </button>
          )}
        </div>
      </div>

      {/* Restrictions Info (if any) */}
      {eligibility.restrictions.length > 0 && !eligibility.canSubstitute && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs text-red-600">
            <ul className="space-y-1">
              {eligibility.restrictions.map((restriction, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
};
