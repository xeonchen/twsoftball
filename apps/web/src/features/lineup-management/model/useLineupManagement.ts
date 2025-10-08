/**
 * @file useLineupManagement Hook
 *
 * React hook for managing team lineup, player substitutions, and eligibility validation.
 * Provides comprehensive lineup management functionality with proper error handling.
 *
 * @remarks
 * This hook encapsulates all lineup management business logic for the web layer:
 * - Loading and maintaining current lineup state
 * - Managing player substitutions and position changes
 * - Validating substitution eligibility based on game rules
 * - Handling starter re-entry rules and restrictions
 * - Providing utilities for position and player lookups
 *
 * Architecture:
 * - Uses DI Container pattern for application layer access
 * - Transforms domain objects to UI-friendly types
 * - Maintains proper separation of concerns
 * - Follows React hook patterns for state management
 *
 * @example
 * ```typescript
 * const {
 *   activeLineup,
 *   benchPlayers,
 *   makeSubstitution,
 *   checkEligibility,
 *   isLoading,
 *   error
 * } = useLineupManagement('game-123');
 *
 * // Check if substitution is allowed
 * const eligibility = checkEligibility({
 *   playerId: 'bench-1',
 *   inning: 5,
 *   isReentry: false
 * });
 *
 * if (eligibility.eligible) {
 *   await makeSubstitution({
 *     outgoingPlayerId: 'player-1',
 *     incomingPlayerId: 'bench-1',
 *     battingSlot: 1,
 *     fieldPosition: FieldPosition.SHORTSTOP,
 *     isReentry: false
 *   });
 * }
 * ```
 */

import { FieldPosition, GameId } from '@twsoftball/application';
import { useState, useEffect, useCallback } from 'react';

import { useGameStore } from '../../../entities/game';
import { useAppServicesContext } from '../../../shared/lib';
import type {
  BenchPlayer,
  PositionAssignment,
  SubstitutionRecord,
} from '../../../shared/lib/types';

/**
 * Response structure from getTeamLineup API call
 */
interface TeamLineupResponse {
  success: boolean;
  gameId: GameId;
  activeLineup: PositionAssignment[];
  benchPlayers: BenchPlayer[];
  substitutionHistory: SubstitutionRecord[];
}

/**
 * Parameters for checking substitution eligibility
 */
export interface EligibilityCheck {
  /** Player ID to check for substitution */
  playerId: string;
  /** Current inning number */
  inning: number;
  /** Whether this is a starter re-entering */
  isReentry: boolean;
}

/**
 * Result of eligibility validation
 */
export interface EligibilityResult {
  /** Whether the substitution is allowed */
  eligible: boolean;
  /** Reason why substitution is not allowed, null if eligible */
  reason: string | null;
}

/**
 * Parameters for making a player substitution
 */
export interface SubstitutionData {
  /** Player being removed from the game */
  outgoingPlayerId: string;
  /** Player entering the game */
  incomingPlayerId: string;
  /** Batting order position (1-10) */
  battingSlot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Field position for the incoming player */
  fieldPosition: FieldPosition;
  /** Whether this is a starter re-entering */
  isReentry: boolean;
}

/**
 * Hook state interface for lineup management
 */
export interface UseLineupManagementState {
  /** Current active lineup with batting order and positions */
  activeLineup: PositionAssignment[];
  /** Players available on the bench for substitution */
  benchPlayers: BenchPlayer[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if operations fail */
  error: string | null;
  /** Make a player substitution */
  makeSubstitution: (data: SubstitutionData) => Promise<void>;
  /** Check if a substitution is eligible */
  checkEligibility: (check: EligibilityCheck) => EligibilityResult;
  /** Refresh lineup data from the server */
  refreshLineup: () => Promise<void>;
  /** Reset hook state to initial values */
  reset: () => void;
  /** Get all available field positions */
  getAvailablePositions: (playerId: string) => FieldPosition[];
  /** Find player assignment by batting slot */
  findPlayerBySlot: (slot: number) => PositionAssignment | null;
  /** Find player assignment by field position */
  findPlayerByPosition: (position: FieldPosition) => PositionAssignment | null;
}

/**
 * Custom hook for managing team lineup and player substitutions
 *
 * @param gameId - Unique identifier for the game
 * @returns Hook state and actions for lineup management
 */
export function useLineupManagement(gameId: string): UseLineupManagementState {
  // State management
  const [activeLineup, setActiveLineup] = useState<PositionAssignment[]>([]);
  const [benchPlayers, setBenchPlayers] = useState<BenchPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with true to show initial loading state
  const [error, setError] = useState<string | null>(null);

  // Game store for current game state
  const gameStore = useGameStore();

  // App services context for accessing game adapter
  const { services } = useAppServicesContext();

  /**
   * Load lineup data from the application layer
   */
  const loadLineupData = useCallback(async () => {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!services) {
        throw new Error('Application services not initialized');
      }

      // Call getTeamLineup method from GameAdapter
      const response = await services.gameAdapter.getTeamLineup({ gameId });
      const result = validateTeamLineupResponse(response);

      if (result.success) {
        setActiveLineup(result.activeLineup || []);
        setBenchPlayers(result.benchPlayers || []);
      } else {
        throw new Error('Failed to load lineup data');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      // Set empty arrays on error to maintain consistent state
      setActiveLineup([]);
      setBenchPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, services]);

  // Load data on mount and when gameId changes
  useEffect(() => {
    void loadLineupData();
  }, [loadLineupData]);

  /**
   * Check if a player substitution is eligible based on game rules
   */
  const checkEligibility = useCallback(
    (check: EligibilityCheck): EligibilityResult => {
      const { playerId, isReentry } = check;

      // Find the player in bench or lineup
      const benchPlayer = benchPlayers.find(p => p.id === playerId);
      const activePlayer = activeLineup.find(p => p.playerId === playerId);

      // Player is currently active in lineup
      if (activePlayer) {
        return {
          eligible: false,
          reason: 'Player is currently active in the lineup',
        };
      }

      // For re-entry attempts
      if (isReentry) {
        if (!benchPlayer || !benchPlayer.isStarter) {
          return {
            eligible: false,
            reason: 'Only original starters can re-enter the game',
          };
        }

        if (benchPlayer.hasReentered) {
          return {
            eligible: false,
            reason: 'Starter can only re-enter once per game',
          };
        }
      }

      // All checks passed
      return {
        eligible: true,
        reason: null,
      };
    },
    [benchPlayers, activeLineup]
  );

  /**
   * Perform a player substitution
   */
  const makeSubstitution = useCallback(
    async (data: SubstitutionData): Promise<void> => {
      const { outgoingPlayerId, incomingPlayerId, fieldPosition, isReentry } = data;

      // Validate substitution data
      if (outgoingPlayerId === incomingPlayerId) {
        const error = new Error('Cannot substitute player with themselves');
        setError(error.message);
        throw error;
      }

      // Check eligibility
      const eligibility = checkEligibility({
        playerId: incomingPlayerId,
        inning: gameStore.activeGameState?.currentInning || 1,
        isReentry,
      });

      if (!eligibility.eligible) {
        const error = new Error(eligibility.reason || 'Substitution not allowed');
        setError(error.message);
        throw error;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!services) {
          throw new Error('Application services not initialized');
        }

        // Use makeSubstitution method from GameAdapter
        await services.gameAdapter.makeSubstitution({
          gameId,
          outgoingPlayerId,
          incomingPlayerId,
          battingSlot: data.battingSlot,
          fieldPosition,
          isReentry,
        });

        // Reload lineup data to get updated state
        await loadLineupData();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, checkEligibility, gameStore.activeGameState?.currentInning, loadLineupData, services]
  );

  /**
   * Get all available field positions for a player
   */
  const getAvailablePositions = useCallback((_playerId: string): FieldPosition[] => {
    // Return all possible field positions (9 field positions + EP)
    return [
      FieldPosition.PITCHER,
      FieldPosition.CATCHER,
      FieldPosition.FIRST_BASE,
      FieldPosition.SECOND_BASE,
      FieldPosition.THIRD_BASE,
      FieldPosition.SHORTSTOP,
      FieldPosition.LEFT_FIELD,
      FieldPosition.CENTER_FIELD,
      FieldPosition.RIGHT_FIELD,
      FieldPosition.EXTRA_PLAYER, // EP position
    ];
  }, []);

  /**
   * Find player assignment by batting slot
   */
  const findPlayerBySlot = useCallback(
    (slot: number): PositionAssignment | null => {
      return activeLineup.find(player => player.battingSlot === slot) || null;
    },
    [activeLineup]
  );

  /**
   * Find player assignment by field position
   */
  const findPlayerByPosition = useCallback(
    (position: FieldPosition): PositionAssignment | null => {
      return activeLineup.find(player => player.fieldPosition === position) || null;
    },
    [activeLineup]
  );

  /**
   * Reset hook state to initial values
   */
  const reset = useCallback(() => {
    setActiveLineup([]);
    setBenchPlayers([]);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    // Data
    activeLineup,
    benchPlayers,

    // State
    isLoading,
    error,

    // Actions
    makeSubstitution,
    checkEligibility,
    refreshLineup: loadLineupData,
    reset,

    // Utilities
    getAvailablePositions,
    findPlayerBySlot,
    findPlayerByPosition,
  };
}

/**
 * Validates the response from getTeamLineup API call with proper runtime type checking
 *
 * @param response - Unknown response from the API
 * @returns Validated TeamLineupResponse
 * @throws Error if response format is invalid
 */
function validateTeamLineupResponse(response: unknown): TeamLineupResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response format from getTeamLineup');
  }

  const obj = response as Record<string, unknown>;

  // Validate required properties
  if (typeof obj['success'] !== 'boolean') {
    throw new Error('Invalid response: missing or invalid success field');
  }

  if (!obj['gameId']) {
    throw new Error('Invalid response: missing gameId field');
  }

  if (!Array.isArray(obj['activeLineup'])) {
    throw new Error('Invalid response: missing or invalid activeLineup field');
  }

  if (!Array.isArray(obj['benchPlayers'])) {
    throw new Error('Invalid response: missing or invalid benchPlayers field');
  }

  return response as TeamLineupResponse;
}

// Types are already exported above as part of their interface definitions
