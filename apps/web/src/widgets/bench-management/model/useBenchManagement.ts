/**
 * @file useBenchManagement Hook
 *
 * Model layer hook for bench management widget. Integrates with existing
 * substitute-player and lineup-management features following FSD architecture.
 *
 * @remarks
 * This hook serves as the integration layer between the bench management widget
 * and existing feature functionality. It provides:
 * - Integration with substitute-player feature for quick substitutions
 * - Integration with lineup-management feature for bench player data
 * - Player eligibility checking with business rule validation
 * - Unified error handling and loading states
 * - Type-safe API for widget consumption
 *
 * Architecture:
 * - Follows FSD model layer patterns
 * - Uses composition over inheritance for feature integration
 * - Provides clean separation between widget logic and feature logic
 * - Maintains proper dependency flow (widget → features)
 * - Uses React hooks patterns for state management
 */

import { FieldPosition } from '@twsoftball/application';
import { useCallback, useMemo } from 'react';

import { useLineupManagement } from '../../../features/lineup-management';
import { useSubstitutePlayerAPI } from '../../../features/substitute-player';
import type {
  BenchPlayer,
  SubstitutionRequestData,
  SubstitutionResult,
  PositionAssignment,
} from '../../../shared/lib';
import type { PlayerEligibility } from '../ui/BenchPlayerCard';

/**
 * Configuration for bench management functionality
 */
export interface BenchManagementConfig {
  /** Game identifier for context */
  gameId: string;
  /** Team lineup identifier being managed */
  teamLineupId: string;
  /** Current inning number for substitution context */
  currentInning: number;
}

/**
 * Hook state interface for bench management functionality
 */
export interface UseBenchManagementState {
  /** Array of bench players available for substitution */
  benchPlayers: BenchPlayer[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Current error message, null if no error */
  error: string | null;
  /** Function to get eligibility status for a specific player */
  getPlayerEligibility: (playerId: string) => PlayerEligibility;
  /** Function to execute quick substitution for a player */
  executeQuickSubstitution: (playerId: string) => Promise<SubstitutionResult>;
}

/**
 * Type guard to check if lineup management has required methods
 */
function hasRequiredLineupManagementMethods(lineupManagement: unknown): lineupManagement is {
  activeLineup: PositionAssignment[];
  benchPlayers: BenchPlayer[];
  isLoading: boolean;
  error: string | null;
  checkEligibility: (check: { playerId: string; inning: number; isReentry: boolean }) => {
    eligible: boolean;
    reason: string | null;
  };
  findPlayerByPosition: (position: FieldPosition) => PositionAssignment | null;
} {
  if (!lineupManagement || typeof lineupManagement !== 'object') {
    return false;
  }

  const obj = lineupManagement as Record<string, unknown>;
  return (
    Array.isArray(obj['activeLineup']) &&
    Array.isArray(obj['benchPlayers']) &&
    typeof obj['isLoading'] === 'boolean' &&
    (typeof obj['error'] === 'string' || obj['error'] === null) &&
    typeof obj['checkEligibility'] === 'function' &&
    typeof obj['findPlayerByPosition'] === 'function'
  );
}

/**
 * Type guard to check if substitute player API has required methods
 */
function hasRequiredSubstitutePlayerMethods(api: unknown): api is {
  executeSubstitution: (data: SubstitutionRequestData) => Promise<SubstitutionResult>;
  isLoading: boolean;
  error: string | null;
} {
  if (!api || typeof api !== 'object') {
    return false;
  }

  const obj = api as Record<string, unknown>;
  return (
    typeof obj['executeSubstitution'] === 'function' &&
    typeof obj['isLoading'] === 'boolean' &&
    (typeof obj['error'] === 'string' || obj['error'] === null)
  );
}

/**
 * Custom hook for bench management functionality
 *
 * Integrates with existing substitute-player and lineup-management features
 * to provide a unified API for bench management widgets.
 *
 * @param config - Configuration object with game and team context
 * @returns Hook state and actions for bench management
 *
 * @example
 * ```typescript
 * const {
 *   benchPlayers,
 *   isLoading,
 *   error,
 *   getPlayerEligibility,
 *   executeQuickSubstitution
 * } = useBenchManagement({
 *   gameId: 'game-123',
 *   teamLineupId: 'team-456',
 *   currentInning: 5
 * });
 *
 * // Check if a player is eligible for substitution
 * const eligibility = getPlayerEligibility('player-1');
 * if (eligibility.canSubstitute) {
 *   await executeQuickSubstitution('player-1');
 * }
 * ```
 */
export function useBenchManagement(config: BenchManagementConfig): UseBenchManagementState {
  const { gameId, teamLineupId, currentInning } = config;

  // Integrate with substitute player feature
  const substitutePlayerAPI = useSubstitutePlayerAPI();

  // Integrate with lineup management feature
  const lineupManagement = useLineupManagement(gameId);

  // Validate that the integrated features have the required interface
  if (!hasRequiredLineupManagementMethods(lineupManagement)) {
    throw new Error('Lineup management feature does not have required methods');
  }

  if (!hasRequiredSubstitutePlayerMethods(substitutePlayerAPI)) {
    throw new Error('Substitute player API does not have required methods');
  }

  /**
   * Combines loading states from integrated features
   */
  const isLoading = useMemo(() => {
    return substitutePlayerAPI.isLoading || lineupManagement.isLoading;
  }, [substitutePlayerAPI.isLoading, lineupManagement.isLoading]);

  /**
   * Combines error states from integrated features
   * Prioritizes substitution errors over lineup errors
   */
  const error = useMemo(() => {
    return substitutePlayerAPI.error || lineupManagement.error;
  }, [substitutePlayerAPI.error, lineupManagement.error]);

  /**
   * Gets bench players from lineup management
   */
  const benchPlayers = useMemo(() => {
    return lineupManagement.benchPlayers || [];
  }, [lineupManagement.benchPlayers]);

  /**
   * Gets player eligibility status with error handling
   */
  const getPlayerEligibility = useCallback(
    (playerId: string): PlayerEligibility => {
      try {
        // Find the player in bench players
        const player = benchPlayers.find(p => p.id === playerId);
        if (!player) {
          return {
            canSubstitute: false,
            canReenter: false,
            restrictions: ['Player not found'],
          };
        }

        // Use lineup management's eligibility checking for substitution
        const substitutionEligibility = lineupManagement.checkEligibility({
          playerId,
          inning: currentInning,
          isReentry: false,
        });

        // Check if player can re-enter (only starters who haven't re-entered)
        const reentryEligibility = lineupManagement.checkEligibility({
          playerId,
          inning: currentInning,
          isReentry: true,
        });

        // Determine final eligibility status
        const canSubstitute = substitutionEligibility.eligible;
        const canReenter = player.isStarter && !player.hasReentered && reentryEligibility.eligible;

        const restrictions: string[] = [];
        if (!substitutionEligibility.eligible && substitutionEligibility.reason) {
          restrictions.push(substitutionEligibility.reason);
        }
        if (player.isStarter && player.hasReentered) {
          restrictions.push('Starter has already re-entered');
        }

        return {
          canSubstitute,
          canReenter,
          restrictions,
        };
      } catch (_err) {
        // Use structured logging instead of console.error in production
        // console.error('Error checking player eligibility:', err);
        return {
          canSubstitute: false,
          canReenter: false,
          restrictions: ['Error checking eligibility'],
        };
      }
    },
    [lineupManagement, currentInning, benchPlayers]
  );

  /**
   * Executes quick substitution for a bench player
   *
   * This function handles the logic of determining substitution parameters
   * and integrating with the substitute player feature.
   */
  const executeQuickSubstitution = useCallback(
    async (playerId: string): Promise<SubstitutionResult> => {
      // Find the player in bench players
      const player = benchPlayers.find(p => p.id === playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      // Check player eligibility
      const eligibility = getPlayerEligibility(playerId);
      if (!eligibility.canSubstitute) {
        throw new Error(
          `Player not eligible for substitution: ${eligibility.restrictions.join(', ')}`
        );
      }

      // Determine if this is a re-entry
      const isReentry = eligibility.canReenter && player.isStarter;

      // Get current lineup to determine substitution strategy
      const currentLineup = lineupManagement.activeLineup;
      if (currentLineup.length === 0) {
        throw new Error('No active lineup found');
      }

      // Strategy for quick substitution:
      // 1. If player has a previous position, try to substitute someone in that position
      // 2. Otherwise, substitute the first available player (batting slot 1)
      // 3. Use the player's previous position or default to their natural position

      let targetSlot = 1; // Default to first batting slot
      let outgoingPlayerId = currentLineup[0]?.playerId || '';
      let fieldPosition = player.position || FieldPosition.PITCHER;

      // If player has a previous position, try to find someone playing that position
      if (player.position) {
        const playerInPosition = lineupManagement.findPlayerByPosition(player.position);
        if (playerInPosition) {
          targetSlot = playerInPosition.battingSlot;
          outgoingPlayerId = playerInPosition.playerId;
          fieldPosition = player.position;
        }
      }

      // Validate that we have a valid outgoing player
      if (!outgoingPlayerId) {
        throw new Error('No suitable player found for substitution');
      }

      // Validate batting slot is within valid range
      if (targetSlot < 1 || targetSlot > 10) {
        throw new Error(`Invalid batting slot: ${targetSlot}`);
      }

      // Prepare substitution data
      const substitutionData: SubstitutionRequestData = {
        gameId,
        teamLineupId,
        battingSlot: targetSlot,
        outgoingPlayerId,
        incomingPlayer: {
          id: player.id,
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          position: fieldPosition,
        },
        inning: currentInning,
        isReentry,
      };

      // Execute the substitution through the substitute player API
      const result = await substitutePlayerAPI.executeSubstitution(substitutionData);

      // Return the result from the substitute player API
      // The API should already include proper substitution details
      return result;
    },
    [
      benchPlayers,
      getPlayerEligibility,
      gameId,
      teamLineupId,
      currentInning,
      substitutePlayerAPI,
      lineupManagement,
    ]
  );

  return {
    benchPlayers,
    isLoading,
    error,
    getPlayerEligibility,
    executeQuickSubstitution,
  };
}
