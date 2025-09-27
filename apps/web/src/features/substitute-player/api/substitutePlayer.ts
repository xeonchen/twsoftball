/**
 * @file substitutePlayer API Function
 *
 * Direct API function for player substitutions that integrates with the DI Container
 * and SubstitutePlayer use case. Provides a clean, functional API for substitution operations.
 *
 * @remarks
 * This API function serves as a direct integration point between external consumers
 * and the SubstitutePlayer use case. It provides:
 * - Direct access to substitution functionality without React hooks
 * - Command construction and validation
 * - Result transformation for API consumers
 * - Error handling and propagation
 * - Type-safe parameter validation
 *
 * The function is designed for use in:
 * - Non-React contexts (utilities, workers, etc.)
 * - Server-side operations
 * - Testing scenarios
 * - Integration with other systems
 *
 * For React components, prefer using the useSubstitutePlayer hook which provides
 * additional state management and lifecycle integration.
 *
 * @example
 * ```typescript
 * // Direct API usage
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

import { getContainer } from '../../../shared/api';

/**
 * UI-friendly incoming player information for API calls
 */
export interface IncomingPlayerAPIInfo {
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
 * Parameters for the substitutePlayer API function
 */
export interface SubstitutePlayerAPIParams {
  /** Game identifier where substitution occurs */
  gameId: string;
  /** Team lineup identifier being modified */
  teamLineupId: string;
  /** Batting slot position (1-30) */
  battingSlot: number;
  /** ID of player being substituted out */
  outgoingPlayerId: string;
  /** Information about player being substituted in */
  incomingPlayer: IncomingPlayerAPIInfo;
  /** Current inning number */
  inning: number;
  /** Whether this is a starter re-entering the game */
  isReentry: boolean;
  /** Optional notes about the substitution */
  notes?: string;
}

/**
 * Result from the substitutePlayer API function
 */
export interface SubstitutePlayerAPIResult {
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
 * Validates API parameters before processing
 * @param params - Parameters to validate
 * @throws Error if validation fails
 */
function validateAPIParams(params: SubstitutePlayerAPIParams): void {
  if (!params.gameId?.trim()) {
    throw new Error('Game ID is required');
  }

  if (!params.teamLineupId?.trim()) {
    throw new Error('Team lineup ID is required');
  }

  if (!Number.isInteger(params.battingSlot) || params.battingSlot < 1 || params.battingSlot > 30) {
    throw new Error('Batting slot must be an integer between 1 and 30');
  }

  if (!params.outgoingPlayerId?.trim()) {
    throw new Error('Outgoing player ID is required');
  }

  if (!params.incomingPlayer?.id?.trim()) {
    throw new Error('Incoming player ID is required');
  }

  if (!params.incomingPlayer?.name?.trim()) {
    throw new Error('Incoming player name is required');
  }

  if (!params.incomingPlayer?.jerseyNumber?.trim()) {
    throw new Error('Incoming player jersey number is required');
  }

  if (!Object.values(FieldPosition).includes(params.incomingPlayer.position)) {
    throw new Error('Valid field position is required');
  }

  if (!Number.isInteger(params.inning) || params.inning < 1) {
    throw new Error('Inning must be a positive integer');
  }

  if (typeof params.isReentry !== 'boolean') {
    throw new Error('Re-entry flag must be a boolean');
  }
}

/**
 * Converts API parameters to Application layer command
 * @param params - API parameters
 * @returns SubstitutePlayerCommand for use case execution
 */
function createCommandFromParams(params: SubstitutePlayerAPIParams): SubstitutePlayerCommand {
  const gameId = new GameId(params.gameId);
  const teamLineupId = new TeamLineupId(params.teamLineupId);
  const outgoingPlayerId = new PlayerId(params.outgoingPlayerId);
  const incomingPlayerId = new PlayerId(params.incomingPlayer.id);
  const jerseyNumber = new JerseyNumber(params.incomingPlayer.jerseyNumber);

  if (params.isReentry) {
    return SubstitutePlayerCommandFactory.createReentry(
      gameId,
      teamLineupId,
      params.battingSlot,
      outgoingPlayerId,
      incomingPlayerId,
      params.incomingPlayer.name,
      jerseyNumber,
      params.incomingPlayer.position,
      params.inning,
      params.notes
    );
  }

  return SubstitutePlayerCommandFactory.createRegular(
    gameId,
    teamLineupId,
    params.battingSlot,
    outgoingPlayerId,
    incomingPlayerId,
    params.incomingPlayer.name,
    jerseyNumber,
    params.incomingPlayer.position,
    params.inning,
    params.notes
  );
}

/**
 * Converts Application layer result to API result
 * @param result - SubstitutionResult from use case
 * @returns API-friendly result
 */
function convertResultForAPI(result: SubstitutionResult): SubstitutePlayerAPIResult {
  const converted: SubstitutePlayerAPIResult = {
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
}

/**
 * Performs a player substitution using the SubstitutePlayer use case
 *
 * @param params - Substitution parameters
 * @returns Promise resolving to substitution result
 * @throws Error for validation failures or infrastructure issues
 *
 * @example
 * ```typescript
 * // Regular substitution
 * const result = await substitutePlayer({
 *   gameId: 'game-123',
 *   teamLineupId: 'team-456',
 *   battingSlot: 1,
 *   outgoingPlayerId: 'starter-pitcher',
 *   incomingPlayer: {
 *     id: 'relief-pitcher',
 *     name: 'Relief Johnson',
 *     jerseyNumber: '99',
 *     position: FieldPosition.PITCHER
 *   },
 *   inning: 5,
 *   isReentry: false
 * });
 *
 * // Re-entry substitution
 * const reentryResult = await substitutePlayer({
 *   gameId: 'game-123',
 *   teamLineupId: 'team-456',
 *   battingSlot: 3,
 *   outgoingPlayerId: 'substitute-player',
 *   incomingPlayer: {
 *     id: 'original-starter',
 *     name: 'John Starter',
 *     jerseyNumber: '12',
 *     position: FieldPosition.FIRST_BASE
 *   },
 *   inning: 8,
 *   isReentry: true,
 *   notes: 'Starter returning for final innings'
 * });
 * ```
 */
export async function substitutePlayer(
  params: SubstitutePlayerAPIParams
): Promise<SubstitutePlayerAPIResult> {
  // Validate input parameters
  validateAPIParams(params);

  // Get SubstitutePlayer use case from DI container
  const container = getContainer();
  const substitutePlayerUseCase = container.substitutePlayer;

  // Create command from parameters
  const command = createCommandFromParams(params);

  // Execute use case
  const result = await substitutePlayerUseCase.execute(command);

  // Convert and return result
  return convertResultForAPI(result);
}
