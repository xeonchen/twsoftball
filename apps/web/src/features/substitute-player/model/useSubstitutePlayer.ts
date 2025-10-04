/**
 * @file useSubstitutePlayer Hook
 *
 * React hook for managing player substitutions with integration to the SubstitutePlayer use case.
 * Provides UI components with a clean, type-safe API for substitution operations.
 *
 * @remarks
 * This hook serves as the bridge between the web layer and the Application layer's
 * SubstitutePlayer use case. It handles:
 * - Command mapping from UI types to Application layer commands
 * - Loading state management for async substitution operations
 * - Error handling and user-friendly error message extraction
 * - Result transformation for UI consumption
 * - Input validation before calling the use case
 *
 * Architecture:
 * - Uses DI Container pattern to access Application layer services
 * - Maintains proper separation between UI and domain concerns
 * - Follows React hook patterns for state management and side effects
 * - Provides comprehensive error handling and validation
 *
 * The hook transforms UI-friendly substitution data into proper domain commands
 * and returns results in a format optimized for React component consumption.
 *
 * @example
 * ```typescript
 * const {
 *   substitutePlayer,
 *   isLoading,
 *   error,
 *   lastResult
 * } = useSubstitutePlayer();
 *
 * // Perform a substitution
 * const result = await substitutePlayer({
 *   gameId: 'game-123',
 *   teamLineupId: 'team-456',
 *   battingSlot: 3,
 *   outgoingPlayerId: 'player-1',
 *   incomingPlayer: {
 *     id: 'player-2',
 *     name: 'John Substitute',
 *     jerseyNumber: '99',
 *     position: FieldPosition.PITCHER
 *   },
 *   inning: 5,
 *   isReentry: false
 * });
 *
 * if (result.success) {
 *   console.log('Substitution successful!');
 *   updateUIWithNewLineup(result.gameState);
 * } else {
 *   console.error('Substitution failed:', result.errors);
 * }
 * ```
 */

import {
  FieldPosition,
  GameId,
  PlayerId,
  TeamLineupId,
  JerseyNumber,
  SubstitutePlayerCommand,
  SubstitutionResult,
} from '@twsoftball/application';
import { SubstitutePlayerCommandFactory } from '@twsoftball/application/dtos/SubstitutePlayerCommand';
import { useState, useCallback } from 'react';

import { useAppServicesContext } from '../../../shared/lib';

/**
 * UI-friendly data structure for incoming player information
 */
export interface IncomingPlayerInfo {
  /** Unique identifier for the incoming player */
  id: string;
  /** Display name for the incoming player */
  name: string;
  /** Jersey number as string (supports formats like "00", "A1") */
  jerseyNumber: string;
  /** Field position where the player will be assigned */
  position: FieldPosition;
}

/**
 * Input data for player substitution operations
 */
export interface SubstitutePlayerData {
  /** Game identifier where substitution occurs */
  gameId: string;
  /** Team lineup identifier being modified */
  teamLineupId: string;
  /** Batting slot position (1-30) */
  battingSlot: number;
  /** ID of player being substituted out */
  outgoingPlayerId: string;
  /** Information about player being substituted in */
  incomingPlayer: IncomingPlayerInfo;
  /** Current inning number */
  inning: number;
  /** Whether this is a starter re-entering the game */
  isReentry: boolean;
  /** Optional notes about the substitution */
  notes?: string;
}

/**
 * UI-optimized result from substitution operations
 */
export interface SubstitutePlayerResult {
  /** Whether the substitution was successful */
  success: boolean;
  /** Updated game state (for successful substitutions) */
  gameState?: unknown;
  /** Detailed substitution information (for successful substitutions) */
  substitutionDetails?: {
    battingSlot: number;
    outgoingPlayerName: string;
    incomingPlayerName: string;
    newFieldPosition: FieldPosition;
    inning: number;
    wasReentry: boolean;
    timestamp: Date;
  } & {
    previousFieldPosition?: FieldPosition;
    notes?: string;
  };
  /** Whether field position changed during substitution */
  positionChanged: boolean;
  /** Whether this substitution used a starter's re-entry opportunity */
  reentryUsed: boolean;
  /** Error messages (for failed substitutions) */
  errors?: string[];
}

/**
 * Optional configuration for substitute player operations
 */
export interface SubstitutePlayerOptions {
  /** Whether to validate input before executing */
  validateInput?: boolean;
  /** Timeout for the operation in milliseconds */
  timeout?: number;
}

/**
 * Hook state interface for substitute player functionality
 */
export interface UseSubstitutePlayerState {
  /** Function to perform player substitution */
  substitutePlayer: (
    data: SubstitutePlayerData,
    options?: SubstitutePlayerOptions
  ) => Promise<SubstitutePlayerResult>;
  /** Whether a substitution operation is currently in progress */
  isLoading: boolean;
  /** Current error message, null if no error */
  error: string | null;
  /** Result from the last successful substitution */
  lastResult: SubstitutePlayerResult | null;
}

/**
 * Custom hook for managing player substitutions
 *
 * @returns Hook state and actions for substitution management
 */
export function useSubstitutePlayer(): UseSubstitutePlayerState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SubstitutePlayerResult | null>(null);

  // Get services from context at the top level
  const { services } = useAppServicesContext();

  /**
   * Validates substitution data before processing
   */
  const validateSubstitutionData = useCallback((data: SubstitutePlayerData): void => {
    if (!data.gameId?.trim()) {
      throw new Error('Game ID is required');
    }

    if (!data.teamLineupId?.trim()) {
      throw new Error('Team lineup ID is required');
    }

    if (!Number.isInteger(data.battingSlot) || data.battingSlot < 1 || data.battingSlot > 30) {
      throw new Error('Batting slot must be an integer between 1 and 30');
    }

    if (!data.outgoingPlayerId?.trim()) {
      throw new Error('Outgoing player ID is required');
    }

    if (!data.incomingPlayer?.id?.trim()) {
      throw new Error('Incoming player ID is required');
    }

    if (!data.incomingPlayer?.name?.trim()) {
      throw new Error('Incoming player name is required');
    }

    if (!data.incomingPlayer?.jerseyNumber?.trim()) {
      throw new Error('Incoming player jersey number is required');
    }

    if (!Object.values(FieldPosition).includes(data.incomingPlayer.position)) {
      throw new Error('Valid field position is required');
    }

    if (!Number.isInteger(data.inning) || data.inning < 1) {
      throw new Error('Inning must be a positive integer');
    }

    if (typeof data.isReentry !== 'boolean') {
      throw new Error('Re-entry flag must be a boolean');
    }
  }, []);

  /**
   * Converts UI data to Application layer command
   */
  const createSubstitutionCommand = useCallback(
    (data: SubstitutePlayerData): SubstitutePlayerCommand => {
      const gameId = new GameId(data.gameId);
      const teamLineupId = new TeamLineupId(data.teamLineupId);
      const outgoingPlayerId = new PlayerId(data.outgoingPlayerId);
      const incomingPlayerId = new PlayerId(data.incomingPlayer.id);
      const jerseyNumber = new JerseyNumber(data.incomingPlayer.jerseyNumber);

      if (data.isReentry) {
        return SubstitutePlayerCommandFactory.createReentry(
          gameId,
          teamLineupId,
          data.battingSlot,
          outgoingPlayerId,
          incomingPlayerId,
          data.incomingPlayer.name,
          jerseyNumber,
          data.incomingPlayer.position,
          data.inning,
          data.notes
        );
      }

      return SubstitutePlayerCommandFactory.createRegular(
        gameId,
        teamLineupId,
        data.battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        data.incomingPlayer.name,
        jerseyNumber,
        data.incomingPlayer.position,
        data.inning,
        data.notes
      );
    },
    []
  );

  /**
   * Converts Application layer result to UI result
   */
  const convertResult = useCallback((result: SubstitutionResult): SubstitutePlayerResult => {
    const converted: SubstitutePlayerResult = {
      success: result.success,
      gameState: result.gameState,
      positionChanged: result.positionChanged,
      reentryUsed: result.reentryUsed,
    };

    if (result.errors) {
      converted.errors = result.errors;
    }

    if (result.substitutionDetails) {
      converted.substitutionDetails = {
        battingSlot: result.substitutionDetails.battingSlot,
        outgoingPlayerName: result.substitutionDetails.outgoingPlayerName,
        incomingPlayerName: result.substitutionDetails.incomingPlayerName,
        newFieldPosition: result.substitutionDetails.newFieldPosition,
        inning: result.substitutionDetails.inning,
        wasReentry: result.substitutionDetails.wasReentry,
        timestamp: result.substitutionDetails.timestamp,
        ...(result.substitutionDetails.previousFieldPosition && {
          previousFieldPosition: result.substitutionDetails.previousFieldPosition,
        }),
        ...(result.substitutionDetails.notes && { notes: result.substitutionDetails.notes }),
      };
    }

    return converted;
  }, []);

  /**
   * Extracts user-friendly error message from result
   */
  const extractErrorMessage = useCallback((result: SubstitutionResult): string => {
    if (result.errors && result.errors.length > 0) {
      return result.errors[0]!; // Return first error for hook state
    }
    return 'Substitution failed with unknown error';
  }, []);

  /**
   * Main substitution function
   */
  const substitutePlayer = useCallback(
    async (
      data: SubstitutePlayerData,
      options: SubstitutePlayerOptions = {}
    ): Promise<SubstitutePlayerResult> => {
      const { validateInput = true } = options;

      setIsLoading(true);
      setError(null);

      try {
        // Input validation
        if (validateInput) {
          validateSubstitutionData(data);
        }

        // Get use case from app services context
        if (!services?.applicationServices) {
          throw new Error('Application services not available');
        }

        const substitutePlayerUseCase = services.applicationServices.substitutePlayer;

        // Create command
        const command = createSubstitutionCommand(data);

        // Execute use case
        const result = await substitutePlayerUseCase.execute(command);

        // Convert and store result
        const convertedResult = convertResult(result);

        if (result.success) {
          setLastResult(convertedResult);
          setError(null);
        } else {
          const errorMessage = extractErrorMessage(result);
          setError(errorMessage);
        }

        return convertedResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      validateSubstitutionData,
      createSubstitutionCommand,
      convertResult,
      extractErrorMessage,
      services,
    ]
  );

  return {
    substitutePlayer,
    isLoading,
    error,
    lastResult,
  };
}
