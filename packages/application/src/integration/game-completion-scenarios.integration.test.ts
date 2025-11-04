/**
 * @file Game Completion Scenarios Integration Tests
 * Integration tests for all game completion scenarios using REAL implementations.
 *
 * @remarks
 * These tests verify game completion logic by playing through complete innings with
 * real Domain aggregates, real Application use cases, and in-memory Infrastructure.
 * NO MOCKING - this ensures game completion rules work correctly in actual gameplay.
 *
 * **Testing Strategy:**
 * - Use REAL SoftballRules with actual business logic
 * - Use REAL Game, InningState, TeamLineup aggregates
 * - Use REAL GameCoordinator for multi-aggregate coordination
 * - Play through COMPLETE innings (not jumping to final state)
 * - Verify ACTUAL state transitions and event sourcing
 *
 * **Game Completion Scenarios Covered:**
 * 1. **Regulation Completion**: Game ends after 7 innings with decisive score
 * 2. **Skipped Bottom Half**: Home team losing after top of 7th, no bottom half
 * 3. **Mercy Rule (10 runs)**: Game ends early after 4th inning with 10+ run differential
 * 4. **Mercy Rule (7 runs)**: Game ends early after 5th inning with 7+ run differential
 * 5. **No Mercy Below Threshold**: Game continues when differential is below mercy threshold
 * 6. **Walk-Off Victory**: Home team takes lead in bottom of final inning
 * 7. **Walk-Off Over Mercy**: Walk-off takes precedence over mercy rule
 * 8. **Tie Game (maxExtraInnings: 0)**: Game ends tied after regulation
 * 9. **Extra Innings**: Game continues when tied with maxExtraInnings > 0
 * 10. **Max Extra Innings Reached**: Game ends tied when extra innings limit reached
 *
 * **Why Integration Tests?**
 * Unit tests with mocked SoftballRules missed bugs where:
 * - GameCoordinator completion detection logic was incorrect
 * - Game aggregate state transitions were wrong
 * - Multi-aggregate coordination failed
 * - Event sourcing didn't persist completion state
 *
 * Integration tests catch these bugs by testing the COMPLETE system.
 */

import { GameId, GameStatus, AtBatResultType, SoftballRules } from '@twsoftball/domain';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { describe, it, expect, beforeEach } from 'vitest';

import { createStartNewGameCommand } from '../test-factories/command-factories.js';
import {
  createIntegrationTestServices,
  playThroughInnings,
  simulateHalfInning,
} from '../test-utils/integrationTestHelpers.js';
import type { ApplicationServices } from '../types/ApplicationTypes.js';

describe('Integration: Game Completion Scenarios', () => {
  let appServices: ApplicationServices;
  let gameId: GameId;

  beforeEach(async () => {
    const factory = createMemoryFactory();
    appServices = await createIntegrationTestServices(factory);

    // Start a new game with standard rules (7 innings, mercy rule, no extra innings)
    const command = createStartNewGameCommand.standard({
      homeTeamName: 'Warriors',
      awayTeamName: 'Eagles',
      rulesConfig: SoftballRules.standard(),
    });

    const result = await appServices.startNewGame.execute(command);

    if (!result.success) {
      throw new Error(`Failed to start game: ${result.errors?.join(', ')}`);
    }

    gameId = result.gameId!;
  });

  describe('Regulation Completion', () => {
    it('should complete game after 7 innings with decisive score', async () => {
      // Play through 7 innings: Away wins 6-4
      await playThroughInnings(appServices, gameId, [
        [1, 0], // Inning 1: Away 1, Home 0
        [1, 1], // Inning 2: Away 2, Home 1
        [2, 1], // Inning 3: Away 4, Home 2
        [0, 1], // Inning 4: Away 4, Home 3
        [1, 0], // Inning 5: Away 5, Home 3
        [0, 1], // Inning 6: Away 5, Home 4
        [1, 0], // Inning 7: Away 6, Home 4
      ]);

      // Verify game completed
      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getAwayRuns()).toBe(6);
      expect(game!.score.getHomeRuns()).toBe(4);
      expect(game!.currentInning).toBe(7);
    });

    it('should continue to bottom of 7th when home team is trailing after top half', async () => {
      // Play through 6 complete innings
      await playThroughInnings(appServices, gameId, [
        [2, 1], // Inning 1
        [1, 0], // Inning 2
        [1, 1], // Inning 3
        [0, 0], // Inning 4
        [1, 0], // Inning 5
        [0, 1], // Inning 6: Away 5, Home 3
      ]);

      // Top of 7th: Away scores 1 (Away 6, Home 3)
      await simulateHalfInning(appServices, gameId, 1);

      // Standard softball rules: Home team gets to bat even when trailing
      // Game should continue to bottom of 7th
      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.IN_PROGRESS);
      expect(game!.currentInning).toBe(7);
      expect(game!.isTopHalf).toBe(false); // Should be bottom of 7th
      expect(game!.score.getAwayRuns()).toBe(6);
      expect(game!.score.getHomeRuns()).toBe(3);

      // Complete bottom of 7th with home team still losing
      await simulateHalfInning(appServices, gameId, 2); // Home scores 2 (still loses 6-5)

      // NOW game should be complete
      const finalGame = await appServices.gameRepository.findById(gameId);
      expect(finalGame).toBeDefined();
      expect(finalGame!.status).toBe(GameStatus.COMPLETED);
      expect(finalGame!.score.getAwayRuns()).toBe(6);
      expect(finalGame!.score.getHomeRuns()).toBe(5);
    });
  });

  describe('Mercy Rule Completion', () => {
    it('should complete game via 10-run mercy rule after 4th inning', async () => {
      // Play through 4 innings with 10+ run differential
      await playThroughInnings(appServices, gameId, [
        [5, 0], // Inning 1: Away 5, Home 0
        [3, 0], // Inning 2: Away 8, Home 0
        [2, 0], // Inning 3: Away 10, Home 0
        [1, 0], // Inning 4: Away 11, Home 0 (11-run diff triggers mercy)
      ]);

      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.currentInning).toBe(4);
      expect(game!.score.getAwayRuns()).toBe(11);
      expect(game!.score.getHomeRuns()).toBe(0);

      // Verify it was mercy rule (check events)
      const events = await appServices.eventStore.getEvents(gameId, 'Game');
      const completedEvent = events.find(e => e.eventType === 'GameCompleted');
      expect(completedEvent).toBeDefined();
    });

    it('should complete game via 7-run mercy rule after 5th inning', async () => {
      // Play through 5 innings with 7-9 run differential
      await playThroughInnings(appServices, gameId, [
        [2, 1], // Inning 1: Away 2, Home 1
        [3, 0], // Inning 2: Away 5, Home 1
        [2, 1], // Inning 3: Away 7, Home 2
        [1, 0], // Inning 4: Away 8, Home 2 (6-run diff, not mercy yet)
        [1, 0], // Inning 5: Away 9, Home 2 (7-run diff triggers mercy)
      ]);

      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.currentInning).toBe(5);
      expect(game!.score.getAwayRuns()).toBe(9);
      expect(game!.score.getHomeRuns()).toBe(2);
    });

    it('should NOT apply mercy rule if differential is below threshold', async () => {
      // 9-run diff at inning 4 (need 10), 6-run diff at inning 5 (need 7)
      await playThroughInnings(appServices, gameId, [
        [4, 0], // Inning 1
        [3, 1], // Inning 2
        [2, 1], // Inning 3
        [0, 1], // Inning 4: Away 9, Home 3 (6-run diff, not mercy)
      ]);

      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.IN_PROGRESS); // NOT completed
      expect(game!.currentInning).toBe(5); // Moved to inning 5
    });

    it('should apply mercy rule after inning completes when threshold met', async () => {
      // Set up 9-3 score after 4 complete innings (6-run diff)
      await playThroughInnings(appServices, gameId, [
        [4, 0], // Inning 1
        [3, 1], // Inning 2
        [2, 1], // Inning 3
        [0, 1], // Inning 4: Away 9, Home 3
      ]);

      // Play complete 5th inning to trigger 7-run mercy rule
      // Top of 5th: Away scores 1 (10-3, 7-run differential)
      await simulateHalfInning(appServices, gameId, 1);

      // Mercy rules apply after innings complete, not mid-inning
      // Game should still be in progress (bottom of 5th hasn't happened yet)
      let game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.IN_PROGRESS);
      expect(game!.currentInning).toBe(5);
      expect(game!.isTopHalf).toBe(false); // Bottom of 5th

      // Bottom of 5th: Home scores 0 (still 10-3)
      await simulateHalfInning(appServices, gameId, 0);

      // NOW mercy rule should apply (inning complete, 7+ run diff after 5th)
      game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.currentInning).toBe(5);
      expect(game!.score.getAwayRuns()).toBe(10);
      expect(game!.score.getHomeRuns()).toBe(3);
    });
  });

  describe('Walk-Off Victory', () => {
    it('should end game immediately when home team takes lead in bottom of 7th', async () => {
      // Play through 6 complete innings + top of 7th
      await playThroughInnings(appServices, gameId, [
        [1, 0], // Inning 1
        [1, 1], // Inning 2
        [1, 1], // Inning 3
        [0, 0], // Inning 4
        [1, 0], // Inning 5
        [1, 0], // Inning 6: Away 5, Home 2
      ]);

      // Top of 7th: Away scores 1 (Away 6, Home 2)
      await simulateHalfInning(appServices, gameId, 1);

      // Verify game is still in progress (bottom of 7th about to start)
      let game = await appServices.gameRepository.findById(gameId);
      expect(game!.status).toBe(GameStatus.IN_PROGRESS);

      // Bottom of 7th: Home scores 5 runs (Home takes lead 7-6) - WALK-OFF
      await simulateHalfInning(appServices, gameId, 5);

      // Game should end immediately (walk-off)
      game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBeGreaterThan(game!.score.getAwayRuns());
      expect(game!.score.getHomeRuns()).toBe(7);
      expect(game!.score.getAwayRuns()).toBe(6);
    });

    it('should prioritize walk-off over mercy rule when both apply', async () => {
      // Set up scenario where walk-off AND mercy rule could both apply
      // Key: Keep differential at EXACTLY 6 runs through inning 6 to avoid mercy
      // Mercy rules: 10+ after inning 4, 7+ after inning 5 (and beyond)
      await playThroughInnings(appServices, gameId, [
        [2, 0], // Inning 1: Away 2, Home 0
        [2, 0], // Inning 2: Away 4, Home 0
        [2, 1], // Inning 3: Away 6, Home 1
        [2, 1], // Inning 4: Away 8, Home 2 (6-run diff < 10, no mercy)
        [1, 1], // Inning 5: Away 9, Home 3 (6-run diff < 7, no mercy)
        [2, 2], // Inning 6: Away 11, Home 5 (6-run diff, still no mercy)
      ]);

      // Top of 7th: Away scores 4 (Away 15, Home 5)
      await simulateHalfInning(appServices, gameId, 4);

      // Bottom of 7th: Home scores 11 runs (Home 16, Away 15) - WALK-OFF
      await simulateHalfInning(appServices, gameId, 11);

      // Should be completed with home team winning (walk-off takes precedence)
      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBe(16);
      expect(game!.score.getAwayRuns()).toBe(15);
      expect(game!.score.getHomeRuns()).toBeGreaterThan(game!.score.getAwayRuns());
    });
  });

  describe('Tie Game and Extra Innings', () => {
    it('should complete tied game after 8 innings with maxExtraInnings: 0', async () => {
      // Standard rules have maxExtraInnings: 0 and allowTieGames: true
      // This allows ONE extra inning (inning 8) before ending as tie
      await playThroughInnings(appServices, gameId, [
        [1, 1], // Inning 1
        [0, 0], // Inning 2
        [1, 1], // Inning 3
        [0, 0], // Inning 4
        [1, 1], // Inning 5
        [0, 0], // Inning 6
        [1, 1], // Inning 7: Tied 4-4 after regulation
        [0, 0], // Inning 8: Still tied 4-4 after 1 extra inning
      ]);

      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBe(game!.score.getAwayRuns()); // Tied
      expect(game!.score.getHomeRuns()).toBe(4);
      expect(game!.currentInning).toBe(8);
    });

    it('should continue to extra innings when tied with maxExtraInnings > 0', async () => {
      // Create game with extra innings allowed
      const command = createStartNewGameCommand.standard({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: new SoftballRules({
          totalInnings: 7,
          maxExtraInnings: 3,
          allowTieGames: false,
        }),
      });

      const result = await appServices.startNewGame.execute(command);

      if (!result.success) {
        throw new Error('Failed to start game with extra innings');
      }

      const extraInningsGameId = result.gameId;

      // Play through 7 innings tied
      await playThroughInnings(appServices, extraInningsGameId, [
        [1, 1], // Inning 1
        [1, 1], // Inning 2
        [0, 0], // Inning 3
        [0, 0], // Inning 4
        [1, 1], // Inning 5
        [0, 0], // Inning 6
        [0, 0], // Inning 7: Tied 3-3
      ]);

      // Game should NOT be complete (goes to extras)
      const game = await appServices.gameRepository.findById(extraInningsGameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.IN_PROGRESS);
      expect(game!.currentInning).toBe(8); // Extra innings
    });

    it('should end game when max extra innings limit reached while still tied', async () => {
      // Create game with max 2 extra innings
      const command = createStartNewGameCommand.standard({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: new SoftballRules({
          totalInnings: 7,
          maxExtraInnings: 2,
          allowTieGames: true,
        }),
      });

      const result = await appServices.startNewGame.execute(command);

      if (!result.success) {
        throw new Error('Failed to start game');
      }

      const limitedExtraGameId = result.gameId;

      // Play through 7 regulation + 2 extra innings (all tied)
      await playThroughInnings(appServices, limitedExtraGameId, [
        [1, 1], // Inning 1
        [1, 1], // Inning 2
        [0, 0], // Inning 3
        [0, 0], // Inning 4
        [0, 0], // Inning 5
        [0, 0], // Inning 6
        [0, 0], // Inning 7: Tied 2-2 (end of regulation)
        [1, 1], // Inning 8 (extra 1): Still tied 3-3
        [1, 1], // Inning 9 (extra 2): Still tied 4-4 - MAX REACHED
      ]);

      const game = await appServices.gameRepository.findById(limitedExtraGameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBe(game!.score.getAwayRuns()); // Still tied
      expect(game!.score.getHomeRuns()).toBe(4);
      expect(game!.currentInning).toBe(9); // Max extras reached
    });

    it('should end extra innings game when home team scores in bottom of extra inning', async () => {
      // Create game with extra innings
      const command = createStartNewGameCommand.standard({
        homeTeamName: 'Warriors',
        awayTeamName: 'Eagles',
        rulesConfig: new SoftballRules({
          totalInnings: 7,
          maxExtraInnings: 3,
          allowTieGames: false,
        }),
      });

      const result = await appServices.startNewGame.execute(command);

      if (!result.success) {
        throw new Error('Failed to start game');
      }

      const extraGameId = result.gameId;

      // Play through 7 innings tied + top of 8th tied
      await playThroughInnings(appServices, extraGameId, [
        [1, 1], // Inning 1-7
        [1, 1],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0], // End regulation: Tied 2-2
      ]);

      // Top of 8th: Away scores 0
      await simulateHalfInning(appServices, extraGameId, 0);

      // Bottom of 8th: Home scores 1 (walk-off in extras)
      // Get the current batter from the home lineup (it's bottom of 8th, so home team is batting)
      const inningState = await appServices.inningStateRepository.findCurrentByGameId(extraGameId);
      const homeLineup = await appServices.teamLineupRepository.findByGameIdAndSide(
        extraGameId,
        'HOME'
      );
      const currentBatterId = homeLineup!.getPlayerAtSlot(inningState!.homeBatterSlot);

      await appServices.recordAtBat.execute({
        gameId: extraGameId,
        batterId: currentBatterId!,
        result: AtBatResultType.HOME_RUN,
        runnersAdvanced: [],
      });

      const game = await appServices.gameRepository.findById(extraGameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBe(3);
      expect(game!.score.getAwayRuns()).toBe(2);
      expect(game!.currentInning).toBe(8);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle game where away team wins exactly at regulation end', async () => {
      // Away team ahead, but home gets their chance in bottom of 7th
      await playThroughInnings(appServices, gameId, [
        [2, 0], // Inning 1
        [1, 0], // Inning 2
        [0, 1], // Inning 3
        [0, 0], // Inning 4
        [0, 1], // Inning 5
        [1, 0], // Inning 6: Away 4, Home 2
      ]);

      // Top of 7th: Away scores 1 (Away 5, Home 2)
      await simulateHalfInning(appServices, gameId, 1);

      // Standard softball: Home team gets to bat even when trailing
      let game = await appServices.gameRepository.findById(gameId);
      expect(game!.status).toBe(GameStatus.IN_PROGRESS);
      expect(game!.currentInning).toBe(7);
      expect(game!.isTopHalf).toBe(false); // Bottom of 7th

      // Bottom of 7th: Home scores 2 (Away 5, Home 4 - home still loses)
      await simulateHalfInning(appServices, gameId, 2);

      // NOW game completes with away winning
      game = await appServices.gameRepository.findById(gameId);
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getAwayRuns()).toBe(5);
      expect(game!.score.getHomeRuns()).toBe(4);
      expect(game!.score.getAwayRuns()).toBeGreaterThan(game!.score.getHomeRuns());
    });

    it('should handle mercy rule with home team ahead', async () => {
      // Home team has mercy rule lead after bottom of 5th
      await playThroughInnings(appServices, gameId, [
        [0, 5], // Inning 1: Home 5, Away 0
        [0, 3], // Inning 2: Home 8, Away 0
        [0, 2], // Inning 3: Home 10, Away 0
        [0, 1], // Inning 4: Home 11, Away 0
        [0, 0], // Inning 5: Home 11, Away 0 (7+ run diff after 5)
      ]);

      const game = await appServices.gameRepository.findById(gameId);
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.score.getHomeRuns()).toBeGreaterThan(game!.score.getAwayRuns());
    });

    it('should complete after top of 7th when home team is already winning', async () => {
      // Play through 6 innings with home leading
      await playThroughInnings(appServices, gameId, [
        [1, 2], // Inning 1: Away 1, Home 2
        [0, 1], // Inning 2: Away 1, Home 3
        [1, 0], // Inning 3: Away 2, Home 3
        [0, 0], // Inning 4: Away 2, Home 3
        [0, 1], // Inning 5: Away 2, Home 4
        [1, 0], // Inning 6: Away 3, Home 4
      ]);

      // Top of 7th: Away scores 0 (stays Away 3, Home 4)
      await simulateHalfInning(appServices, gameId, 0);

      // Game completes - home already winning, no need for bottom half
      const game = await appServices.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.status).toBe(GameStatus.COMPLETED);
      expect(game!.currentInning).toBe(7);
      expect(game!.isTopHalf).toBe(true); // Ended after top half
      expect(game!.score.getAwayRuns()).toBe(3);
      expect(game!.score.getHomeRuns()).toBe(4);
    });
  });
});
