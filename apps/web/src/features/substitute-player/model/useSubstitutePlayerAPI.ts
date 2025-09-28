/**
 * @file useSubstitutePlayerAPI Hook
 *
 * React hook that implements the shared SubstitutePlayerAPI interface.
 * This provides FSD-compliant access to substitute player functionality.
 *
 * @remarks
 * This hook serves as an adapter between the shared API interface and the
 * substitute-player feature's internal implementation. It enables composition
 * at widget/page level while maintaining proper FSD layer separation.
 *
 * Architecture:
 * - Implements shared/lib/types SubstitutePlayerAPI interface
 * - Wraps the internal useSubstitutePlayer hook
 * - Converts between shared types and internal types
 * - Maintains feature encapsulation while enabling composition
 *
 * @example
 * ```typescript
 * // In a widget that composes features
 * const substituteAPI = useSubstitutePlayerAPI();
 *
 * // Use the standardized interface
 * const result = await substituteAPI.executeSubstitution({
 *   gameId: 'game-123',
 *   teamLineupId: 'team-456',
 *   battingSlot: 3,
 *   outgoingPlayerId: 'player-1',
 *   incomingPlayer: { id: 'player-2', name: 'John', jerseyNumber: '99', position: FieldPosition.PITCHER },
 *   inning: 5,
 *   isReentry: false
 * });
 * ```
 */

import { useCallback } from 'react';

import type {
  SubstitutePlayerAPI,
  SubstitutionRequestData,
  SubstitutionResult,
} from '../../../shared/lib/types';

import { useSubstitutePlayer } from './useSubstitutePlayer';
import type {
  SubstitutePlayerData,
  SubstitutePlayerResult,
  IncomingPlayerInfo,
} from './useSubstitutePlayer';

/**
 * Custom hook that implements the shared SubstitutePlayerAPI interface
 *
 * @returns Standardized substitute player API for composition
 */
export function useSubstitutePlayerAPI(): SubstitutePlayerAPI {
  const { substitutePlayer, isLoading, error } = useSubstitutePlayer();

  /**
   * Converts shared types to internal feature types
   */
  const convertToInternalData = useCallback(
    (data: SubstitutionRequestData): SubstitutePlayerData => {
      const incomingPlayer: IncomingPlayerInfo = {
        id: data.incomingPlayer.id,
        name: data.incomingPlayer.name,
        jerseyNumber: data.incomingPlayer.jerseyNumber,
        position: data.incomingPlayer.position,
      };

      const result: SubstitutePlayerData = {
        gameId: data.gameId,
        teamLineupId: data.teamLineupId,
        battingSlot: data.battingSlot,
        outgoingPlayerId: data.outgoingPlayerId,
        incomingPlayer,
        inning: data.inning,
        isReentry: data.isReentry,
      };

      if (data.notes !== undefined) {
        result.notes = data.notes;
      }

      return result;
    },
    []
  );

  /**
   * Converts internal result types to shared types
   */
  const convertToSharedResult = useCallback(
    (result: SubstitutePlayerResult): SubstitutionResult => {
      const converted: SubstitutionResult = {
        success: result.success,
        positionChanged: result.positionChanged,
        reentryUsed: result.reentryUsed,
      };

      if (result.gameState !== undefined) {
        converted.gameState = result.gameState;
      }

      if (result.substitutionDetails !== undefined) {
        converted.substitutionDetails = result.substitutionDetails;
      }

      if (result.errors !== undefined) {
        converted.errors = result.errors;
      }

      return converted;
    },
    []
  );

  /**
   * Execute substitution using shared interface
   */
  const executeSubstitution = useCallback(
    async (data: SubstitutionRequestData): Promise<SubstitutionResult> => {
      const internalData = convertToInternalData(data);
      const internalResult = await substitutePlayer(internalData);
      return convertToSharedResult(internalResult);
    },
    [substitutePlayer, convertToInternalData, convertToSharedResult]
  );

  return {
    executeSubstitution,
    isLoading,
    error,
  };
}
