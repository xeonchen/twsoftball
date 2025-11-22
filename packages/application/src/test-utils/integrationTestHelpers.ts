/**
 * @file Integration Test Helpers
 * Utility functions for setting up and executing integration tests with real implementations.
 *
 * @remarks
 * These helpers provide convenience methods for integration testing that use REAL
 * implementations (no mocks) with in-memory storage. They enable testing complete
 * workflows across multiple aggregates and use cases.
 *
 * **Testing Philosophy:**
 * - Use real Domain aggregates and services
 * - Use real Application use cases
 * - Use in-memory Infrastructure implementations
 * - Test complete workflows, not isolated units
 * - Verify actual business rules and state transitions
 *
 * **Key Utilities:**
 * - createIntegrationTestServices: Sets up complete application services
 * - simulateHalfInning: Plays through a complete half-inning with specified runs
 * - playThroughInnings: Executes multiple innings with scoring patterns
 *
 * @example
 * ```typescript
 * import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
 *
 * // Set up integration test
 * const factory = createMemoryFactory();
 * const services = await createIntegrationTestServices(factory);
 * const result = await services.startNewGame.execute({
 *   homeTeamName: 'Tigers',
 *   awayTeamName: 'Lions'
 * });
 *
 * // Simulate gameplay
 * await playThroughInnings(services, result.gameId, [
 *   [1, 0], // Inning 1: Away 1, Home 0
 *   [0, 1], // Inning 2: Away 1, Home 1
 * ]);
 * ```
 */

import { AtBatResultType, GameId, GameStatus } from '@twsoftball/domain';

import { createApplicationServicesWithContainerAndFactory } from '../services/ApplicationFactory.js';
import type { InfrastructureFactory } from '../services/InfrastructureFactory.js';
import type { ApplicationServices } from '../types/ApplicationTypes.js';

/**
 * Creates application services with in-memory persistence for integration testing.
 *
 * @remarks
 * This factory sets up a complete ApplicationServices instance using:
 * - In-memory event store (no actual database)
 * - Memory-based repositories
 * - Real domain aggregates and services
 * - Real application use cases
 *
 * The resulting services are fully functional for testing complete workflows
 * without requiring external dependencies or mocking.
 *
 * **Testing Configuration:**
 * - Environment: 'test'
 * - Storage: 'memory' (in-memory only)
 * - Debug: false (minimal logging for test clarity)
 *
 * **Architecture Pattern:**
 * This helper follows the Composition Root pattern - the infrastructure factory
 * is injected from the test file (which can import Infrastructure), keeping the
 * Application layer pure with no Infrastructure dependencies.
 *
 * @param factory - Infrastructure factory providing repository implementations
 * @returns ApplicationServices instance with real implementations (no mocks)
 *
 * @example
 * ```typescript
 * import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
 *
 * describe('Integration Tests', () => {
 *   let services: ApplicationServices;
 *
 *   beforeEach(async () => {
 *     const factory = createMemoryFactory();
 *     services = await createIntegrationTestServices(factory);
 *   });
 *
 *   it('should handle complete game workflow', async () => {
 *     const result = await services.startNewGame.execute({...});
 *     expect(result.success).toBe(true);
 *   });
 * });
 * ```
 */
export async function createIntegrationTestServices(
  factory: InfrastructureFactory
): Promise<ApplicationServices> {
  const config = {
    environment: 'test' as const,
    storage: 'memory' as const,
    debug: false,
  };
  return await createApplicationServicesWithContainerAndFactory(config, factory);
}

/**
 * Simulates a complete half-inning with specified number of runs and outs.
 *
 * @remarks
 * This helper automates the process of playing through a half-inning by:
 * 1. Recording the specified number of home runs to score runs
 * 2. Recording 3 outs to end the half-inning
 *
 * **Simplification Strategy:**
 * - Uses HOME_RUN for runs (simplest way to score without runner complexity)
 * - Uses GROUND_OUT for outs (simplest out type)
 * - Uses ACTUAL player IDs from lineups (critical for RecordAtBat validation)
 * - Automatically progresses to next half-inning after 3 outs
 *
 * **Note:** This helper uses a simplified approach for testing. Real games would
 * have more complex at-bat sequences with various hit types and runner movements.
 *
 * @param appServices - Real application services instance
 * @param gameId - ID of the game to simulate
 * @param runs - Number of runs to score in this half-inning
 *
 * @example
 * ```typescript
 * // Simulate top of 1st with 3 runs
 * await simulateHalfInning(services, gameId, 3);
 *
 * // Simulate bottom of 1st with 0 runs
 * await simulateHalfInning(services, gameId, 0);
 * ```
 */
export async function simulateHalfInning(
  appServices: ApplicationServices,
  gameId: GameId,
  runs: number
): Promise<void> {
  // Determine current batting team from InningState
  const inningState = await appServices.inningStateRepository.findCurrentByGameId(gameId);
  if (!inningState) {
    throw new Error(`InningState not found for game: ${gameId.value}`);
  }

  const battingTeamSide = inningState.isTopHalf ? 'AWAY' : 'HOME';
  const battingLineup = await appServices.teamLineupRepository.findByGameIdAndSide(
    gameId,
    battingTeamSide
  );
  if (!battingLineup) {
    throw new Error(`TeamLineup not found for game ${gameId.value} and side ${battingTeamSide}`);
  }

  // Get current batting slot
  const currentBattingSlot = inningState.isTopHalf
    ? inningState.awayBatterSlot
    : inningState.homeBatterSlot;

  // Get the actual player ID at the current batting slot
  const currentBatterId = battingLineup.getPlayerAtSlot(currentBattingSlot);
  if (!currentBatterId) {
    throw new Error(`No player found at batting slot ${currentBattingSlot}`);
  }

  // Score runs with home runs (simplest approach for testing)
  for (let i = 0; i < runs; i++) {
    // Get fresh lineup/inning state each time (batting order advances)
    const freshInningState = await appServices.inningStateRepository.findCurrentByGameId(gameId);
    if (!freshInningState) {
      throw new Error(`InningState not found for game: ${gameId.value}`);
    }

    const freshBattingSlot = freshInningState.isTopHalf
      ? freshInningState.awayBatterSlot
      : freshInningState.homeBatterSlot;

    const freshBatterId = battingLineup.getPlayerAtSlot(freshBattingSlot);
    if (!freshBatterId) {
      throw new Error(`No player found at batting slot ${freshBattingSlot}`);
    }

    const result = await appServices.recordAtBat.execute({
      gameId,
      batterId: freshBatterId,
      result: AtBatResultType.HOME_RUN,
      runnersAdvanced: [],
    });

    if (!result.success) {
      throw new Error(
        `Failed to record at-bat (home run): ${result.errors?.join(', ') || 'Unknown error'}`
      );
    }

    // Early exit if game ended (walk-off or mercy rule)
    if (result.gameEnded) {
      return;
    }
  }

  // Record 3 outs to end the half-inning
  for (let i = 0; i < 3; i++) {
    // Get fresh lineup/inning state each time (batting order advances)
    const freshInningState = await appServices.inningStateRepository.findCurrentByGameId(gameId);
    if (!freshInningState) {
      throw new Error(`InningState not found for game: ${gameId.value}`);
    }

    const freshBattingSlot = freshInningState.isTopHalf
      ? freshInningState.awayBatterSlot
      : freshInningState.homeBatterSlot;

    const freshBatterId = battingLineup.getPlayerAtSlot(freshBattingSlot);
    if (!freshBatterId) {
      throw new Error(`No player found at batting slot ${freshBattingSlot}`);
    }

    const result = await appServices.recordAtBat.execute({
      gameId,
      batterId: freshBatterId,
      result: AtBatResultType.GROUND_OUT,
      runnersAdvanced: [],
    });

    if (!result.success) {
      throw new Error(
        `Failed to record at-bat (out): ${result.errors?.join(', ') || 'Unknown error'}`
      );
    }

    // Early exit if game ended
    if (result.gameEnded) {
      return;
    }
  }
}

/**
 * Plays through complete innings with specified scoring pattern.
 *
 * @remarks
 * Automates the execution of multiple complete innings by:
 * 1. Playing top half (away team) with specified runs
 * 2. Playing bottom half (home team) with specified runs
 * 3. Repeating for each inning in the pattern
 *
 * This is the primary helper for setting up complex game scenarios that require
 * specific score progressions over multiple innings.
 *
 * **Use Cases:**
 * - Testing game completion after regulation innings
 * - Setting up mercy rule scenarios
 * - Creating tie game situations
 * - Testing walk-off victory conditions
 *
 * @param appServices - Real application services instance
 * @param gameId - ID of the game to simulate
 * @param scoringPattern - Array of [awayRuns, homeRuns] for each inning
 *
 * @example
 * ```typescript
 * // Play through 3 innings with specific scoring
 * await playThroughInnings(services, gameId, [
 *   [2, 1], // Inning 1: Away 2, Home 1 (cumulative: 2-1)
 *   [1, 3], // Inning 2: Away 1, Home 3 (cumulative: 3-4)
 *   [0, 0], // Inning 3: Away 0, Home 0 (cumulative: 3-4)
 * ]);
 *
 * // Result: After 3 innings, score is 3-4 (Home leads)
 * ```
 */
export async function playThroughInnings(
  appServices: ApplicationServices,
  gameId: GameId,
  scoringPattern: Array<[number, number]>
): Promise<void> {
  for (const [awayRuns, homeRuns] of scoringPattern) {
    // Top half (away team)
    await simulateHalfInning(appServices, gameId, awayRuns);

    // Check if game ended after top half (e.g., away team wins in top of final inning)
    const gameAfterTop = await appServices.gameRepository.findById(gameId);
    if (gameAfterTop?.status === GameStatus.COMPLETED) {
      return; // Game ended, don't play bottom half
    }

    // Bottom half (home team)
    await simulateHalfInning(appServices, gameId, homeRuns);

    // Check if game ended after bottom half (e.g., walk-off, regulation end)
    const gameAfterBottom = await appServices.gameRepository.findById(gameId);
    if (gameAfterBottom?.status === GameStatus.COMPLETED) {
      return; // Game ended, don't continue to next inning
    }
  }
}

/**
 * Debug helper to snapshot game state at a specific point in time.
 *
 * @remarks
 * Used for debugging integration tests - this function is intentionally a no-op
 * to avoid cluttering test output. When debugging, uncomment the implementation
 * below to see detailed game state snapshots.
 *
 * @param _appServices - Application services (unused when disabled)
 * @param _gameId - Game ID (unused when disabled)
 * @param _label - Label for this snapshot (unused when disabled)
 *
 * @example
 * ```typescript
 * await debugGameSnapshot(appServices, gameId, 'After game start');
 * await playThroughInnings(appServices, gameId, [[1, 0]]);
 * await debugGameSnapshot(appServices, gameId, 'After inning 1');
 * ```
 */
export async function debugGameSnapshot(
  _appServices: ApplicationServices,
  _gameId: GameId,
  _label: string
): Promise<void> {
  // No-op by default - uncomment below for debugging
  // const game = await appServices.gameRepository.findById(gameId);
  // const inningState = await appServices.inningStateRepository.findCurrentByGameId(gameId);
  // if (!game || !inningState) {
  //   console.log(`\n=== ${label} ===`);
  //   console.log('ERROR: Game or InningState not found');
  //   return;
  // }
  // console.log(`\n=== ${label} ===`);
  // console.log('Game:', {
  //   status: game.status,
  //   currentInning: inningState.currentInning,
  //   isTopHalf: inningState.isTopHalf,
  //   outs: inningState.outs,
  //   homeScore: game.homeScore.value,
  //   awayScore: game.awayScore.value,
  // });
}
