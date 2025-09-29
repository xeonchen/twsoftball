/**
 * @file BenchManagementWidget Component
 *
 * Main bench management widget that displays bench players with their eligibility status
 * and provides quick substitution actions. Follows FSD widget layer architecture.
 *
 * @remarks
 * This widget provides:
 * - Visual display of all bench players with current status
 * - Eligibility indicators for substitution and re-entry rules
 * - Quick substitution actions integrated with existing features
 * - Accessibility support and responsive design
 * - Real-time updates through feature integration
 *
 * Architecture:
 * - Uses useBenchManagement hook for business logic
 * - Integrates with substitute-player and lineup-management features
 * - Follows FSD principles for widget layer design
 * - Provides proper error handling and loading states
 */

import React, { useState, useCallback } from 'react';

import { useBenchManagement } from '../model/useBenchManagement';

import { BenchPlayerCard } from './BenchPlayerCard';

/**
 * Configuration props for the bench management widget
 */
export interface BenchManagementWidgetProps {
  /** Game identifier for context */
  gameId: string;
  /** Team lineup identifier being managed */
  teamLineupId: string;
  /** Current inning number for substitution context */
  currentInning: number;
  /** Callback when a substitution is completed successfully */
  onSubstitutionComplete?: (result: unknown) => void;
  /** Additional CSS classes for styling */
  className?: string;
  /** ARIA label for the widget */
  'aria-label'?: string;
}

/**
 * BenchManagementWidget Component
 *
 * Displays bench players with eligibility status and quick substitution actions.
 * Integrates with existing lineup management and substitute player features.
 *
 * @example
 * ```tsx
 * <BenchManagementWidget
 *   gameId="game-123"
 *   teamLineupId="team-456"
 *   currentInning={5}
 *   onSubstitutionComplete={(result) => {
 *     console.log('Substitution completed:', result);
 *     refreshGameState();
 *   }}
 * />
 * ```
 */
export const BenchManagementWidget: React.FC<BenchManagementWidgetProps> = ({
  gameId,
  teamLineupId,
  currentInning,
  onSubstitutionComplete,
  className = '',
  'aria-label': ariaLabel = 'Bench management',
}) => {
  const { benchPlayers, isLoading, error, getPlayerEligibility, executeQuickSubstitution } =
    useBenchManagement({
      gameId,
      teamLineupId,
      currentInning,
    });

  // Local state for substitution errors and loading
  const [substitutionError, setSubstitutionError] = useState<string | null>(null);
  const [isSubstituting, setIsSubstituting] = useState<string | null>(null);

  /**
   * Handles quick substitution for a player
   */
  const handleQuickSubstitution = useCallback(
    async (playerId: string): Promise<void> => {
      try {
        setSubstitutionError(null);
        setIsSubstituting(playerId);

        const result = await executeQuickSubstitution(playerId);

        if (result.success) {
          if (onSubstitutionComplete) {
            onSubstitutionComplete(result);
          }
        } else {
          setSubstitutionError('Substitution failed. Please try again.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred during substitution';
        setSubstitutionError(errorMessage);
      } finally {
        setIsSubstituting(null);
      }
    },
    [executeQuickSubstitution, onSubstitutionComplete]
  );

  /**
   * Handle quick substitution callback (non-async wrapper)
   */
  const handleQuickSubstitutionCallback = useCallback(
    (playerId: string): void => {
      void handleQuickSubstitution(playerId);
    },
    [handleQuickSubstitution]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`p-4 ${className}`} role="region" aria-label={ariaLabel}>
        <div className="flex items-center justify-center min-h-[200px]">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            role="status"
            aria-label="Loading bench players"
          />
          <span className="ml-3 text-gray-600">Loading bench players...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 ${className}`} role="region" aria-label={ariaLabel}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Bench Players</h3>
              <div className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (benchPlayers.length === 0) {
    return (
      <div className={`p-4 ${className}`} role="region" aria-label={ariaLabel}>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No players on bench</h3>
          <p className="mt-1 text-sm text-gray-500">
            All players are currently active in the game.
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div
      className={`p-4 bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900" role="heading" aria-level={2}>
          Bench Players
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {benchPlayers.length} player{benchPlayers.length !== 1 ? 's' : ''} available for
          substitution
        </p>
      </div>

      {/* Substitution Error Alert */}
      {substitutionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-4 w-4 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2 flex-1">
              <div className="text-sm text-red-700" role="alert">
                {substitutionError}
              </div>
            </div>
            <div className="ml-2">
              <button
                type="button"
                className="text-red-400 hover:text-red-600"
                onClick={() => setSubstitutionError(null)}
                aria-label="Dismiss error"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="space-y-3">
        <ul role="list" className="space-y-2">
          {benchPlayers.map(player => {
            const eligibility = getPlayerEligibility(player.id);
            const isPlayerSubstituting = isSubstituting === player.id;

            return (
              <BenchPlayerCard
                key={player.id}
                player={player}
                eligibility={eligibility}
                onQuickSubstitution={handleQuickSubstitutionCallback}
                disabled={isLoading || isPlayerSubstituting || !!isSubstituting}
                isLoading={isPlayerSubstituting}
              />
            );
          })}
        </ul>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Quick substitutions follow standard slow-pitch softball rules
        </div>
      </div>
    </div>
  );
};
