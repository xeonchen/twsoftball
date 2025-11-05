/**
 * @file GameStateDTOBuilder
 * Shared utility for building GameStateDTO from aggregates.
 *
 * @remarks
 * This module provides the `buildGameStateDTO` function that orchestrates the
 * construction of complete GameStateDTO objects from multiple domain aggregates
 * (Game, InningState, TeamLineup). By centralizing this orchestration logic,
 * we eliminate duplication across use cases while maintaining consistent
 * DTO structure.
 *
 * This builder was extracted from use cases where the same game state building
 * logic was duplicated across RecordAtBat, EndInning, UndoLastAction, and
 * RedoLastAction use cases.
 *
 * **Key Responsibilities**:
 * - Load required aggregates from repositories
 * - Determine current batter based on inning state
 * - Map domain aggregates to presentation DTOs
 * - Validate domain state completeness
 * - Handle optional parameters for optimization
 *
 * @example
 * ```typescript
 * // In a use case
 * import { GameStateDTOBuilder } from '../utils/GameStateDTOBuilder.js';
 *
 * const gameStateDTO = await GameStateDTOBuilder.buildGameStateDTO(
 *   game,
 *   inningStateRepository,
 *   teamLineupRepository,
 *   updatedInningState,  // optional: skip repository load
 *   currentBattingSlot   // optional: override slot determination
 * );
 * ```
 */

import { Game, InningState } from '@twsoftball/domain';

import { GameStateDTO } from '../dtos/GameStateDTO.js';
import type { InningStateRepository } from '../ports/out/InningStateRepository.js';
import type { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';

import { DTOMappingHelpers } from './DTOMappingHelpers.js';

/**
 * Shared utility for building GameStateDTO from multiple aggregates.
 */
export const GameStateDTOBuilder = {
  /**
   * Builds a complete GameStateDTO by orchestrating multiple repository calls
   * and DTO mappings.
   *
   * @remarks
   * This method performs comprehensive game state DTO construction:
   * 1. Loads InningState (or uses provided one)
   * 2. Loads both team lineups
   * 3. Determines current batter based on inning state
   * 4. Maps all aggregates to DTOs
   * 5. Validates domain state completeness
   *
   * **IMPORTANT**: The `game` aggregate must be pre-loaded by the caller.
   * This builder does NOT load aggregates - it only orchestrates DTO construction.
   *
   * **Performance Optimization**:
   * - `updatedInningState`: Skip repository load if you already have the latest state
   * - `currentBattingSlot`: Override slot determination for showing pre-advancement state
   *
   * **Error Handling**:
   * - Throws if InningState not found
   * - Throws if either team lineup not found
   * - Throws if InningState.isTopHalf is undefined/null (fail-fast validation)
   *
   * @param game - Pre-loaded Game aggregate (NOT a GameId)
   * @param inningStateRepository - Repository for loading InningState
   * @param teamLineupRepository - Repository for loading team lineups
   * @param updatedInningState - Optional: Use this instead of loading from repository
   * @param currentBattingSlot - Optional: Override batting slot (e.g., show pre-advancement)
   * @returns Complete GameStateDTO with all fields populated
   * @throws {Error} When required aggregates not found or state is incomplete
   *
   * @example
   * ```typescript
   * // Basic usage - load everything from repositories
   * const game = await gameRepository.findById(gameId);
   * const dto = await GameStateDTOBuilder.buildGameStateDTO(
   *   game,
   *   inningStateRepository,
   *   teamLineupRepository
   * );
   *
   * // Optimized - provide updated inning state to skip repo load
   * const updatedInning = inningState.recordOut();
   * const dto = await GameStateDTOBuilder.buildGameStateDTO(
   *   game,
   *   inningStateRepository,
   *   teamLineupRepository,
   *   updatedInning  // Skip loading from repository
   * );
   *
   * // Show pre-advancement state (batter who JUST batted)
   * const dto = await GameStateDTOBuilder.buildGameStateDTO(
   *   game,
   *   inningStateRepository,
   *   teamLineupRepository,
   *   updatedInning,
   *   battingSlotBeforeAdvance  // Show batter who just completed their at-bat
   * );
   * ```
   */
  async buildGameStateDTO(
    game: Game,
    inningStateRepository: InningStateRepository,
    teamLineupRepository: TeamLineupRepository,
    updatedInningState?: InningState,
    currentBattingSlot?: number
  ): Promise<GameStateDTO> {
    // Use provided updatedInningState if available, otherwise load from repository
    const inningState =
      updatedInningState || (await inningStateRepository.findCurrentByGameId(game.id));
    if (!inningState) {
      throw new Error(`InningState not found for game: ${game.id.value}`);
    }

    const homeLineup = await teamLineupRepository.findByGameIdAndSide(game.id, 'HOME');
    const awayLineup = await teamLineupRepository.findByGameIdAndSide(game.id, 'AWAY');
    if (!homeLineup || !awayLineup) {
      throw new Error(`Team lineups not found for game: ${game.id.value}`);
    }

    // Determine current batter based on provided slot (pre-advancement) or inning state
    // If currentBattingSlot is provided, use it (shows batter who JUST batted)
    // Otherwise, use inningState's current slot (shows batter who's UP NEXT)
    const battingSlot =
      currentBattingSlot ??
      (inningState.isTopHalf ? inningState.awayBatterSlot : inningState.homeBatterSlot);
    const battingTeamLineup = inningState.isTopHalf ? awayLineup : homeLineup;
    const currentBatterPlayerId = battingTeamLineup.getPlayerAtSlot(battingSlot);

    const currentBatter = currentBatterPlayerId
      ? DTOMappingHelpers.mapPlayerToDTO(battingTeamLineup, currentBatterPlayerId, battingSlot)
      : null;

    // Build complete GameStateDTO
    // [FAIL FAST] Validate Domain layer provided complete state
    if (inningState.isTopHalf === undefined || inningState.isTopHalf === null) {
      throw new Error(
        '[Application] CRITICAL: InningState.isTopHalf is undefined/null. ' +
          `Domain layer must provide complete state. Inning: ${inningState.inning}, Outs: ${inningState.outs}`
      );
    }

    const dto: GameStateDTO = {
      gameId: game.id,
      status: game.status,
      score: game.getScoreDTO(),
      gameStartTime: game.startTime,
      currentInning: inningState.inning,
      isTopHalf: inningState.isTopHalf,
      battingTeam: inningState.isTopHalf ? 'AWAY' : 'HOME',
      outs: inningState.outs,
      bases: inningState.getBases(),
      currentBatterSlot: battingSlot,
      homeLineup: DTOMappingHelpers.mapTeamLineupToDTO(homeLineup, 'HOME'),
      awayLineup: DTOMappingHelpers.mapTeamLineupToDTO(awayLineup, 'AWAY'),
      currentBatter,
      lastUpdated: new Date(),
    };

    return dto;
  },
} as const;
