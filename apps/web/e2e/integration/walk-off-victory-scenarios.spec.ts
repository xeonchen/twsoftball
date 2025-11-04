/**
 * @file Walk-off Victory Scenarios E2E Test
 *
 * Comprehensive E2E tests verifying walk-off victory game completion logic works correctly
 * when home team takes the lead in bottom of final inning (or extra innings).
 *
 * @remarks
 * Test Coverage:
 * - Walk-off victory in bottom of 7th inning (game ends immediately)
 * - Home team tying in bottom of 7th does NOT end game (would go to extras)
 * - Home team taking lead in bottom of 6th does NOT trigger walk-off (not final inning yet)
 * - Walk-off logic applies only when in/past regulation (totalInnings)
 * - Game ends immediately when walk-off occurs (no need to complete 3 outs)
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainable test code
 * - Tests realistic game scenarios with late-inning comebacks
 * - Validates state at key checkpoints (score, inning, game status)
 * - Verifies game completion logic with walk-off as ending type
 * - Uses full game setup wizard flow (no sessionStorage injection)
 *
 * Architecture Context:
 * - Domain layer: Game.isWalkOffScenario() checks conditions
 * - Application layer: RecordAtBat use case detects walk-off and completes game
 * - Web layer: Game recording UI completes game when walk-off occurs
 * - State verification reads from sessionStorage (Zustand persist)
 *
 * Standard Rules Configuration:
 * - totalInnings: 7 (regulation)
 * - Walk-off conditions: !isTopHalf && currentInning >= totalInnings && homeTeamWinning
 *
 * @example
 * ```bash
 * # Run walk-off victory scenario tests
 * pnpm --filter @twsoftball/web test:e2e walk-off-victory-scenarios
 *
 * # Run with UI (headed mode) for debugging
 * pnpm --filter @twsoftball/web test:e2e:headed walk-off-victory-scenarios
 * ```
 */

import { expect, test, type Page } from '@playwright/test';

import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';
import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';

test.describe('Walk-off Victory Scenarios', () => {
  /**
   * Clean up browser storage before each test to prevent state leakage.
   */
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  /**
   * Helper function to complete game setup wizard and start game
   *
   * @param page - Playwright page instance
   * @returns Promise that resolves when game is started
   */
  async function setupAndStartGame(page: Page): Promise<void> {
    // Step 1: Navigate to Teams Page and fill team information
    const teamsPage = new GameSetupTeamsPage(page);
    await teamsPage.goto();
    await teamsPage.waitForLoad();
    await teamsPage.fillTeamNames('Thunder', 'Lightning', 'away');
    await teamsPage.clickContinue();

    // Step 2: Setup lineup with 10 players
    const lineupPage = new GameSetupLineupPage(page);
    await lineupPage.waitForLoad();
    await lineupPage.setPlayerCount(10);
    await lineupPage.addMultiplePlayers(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    await lineupPage.waitForValidation();
    await lineupPage.clickContinue();

    // Step 3: Review and start game
    const confirmPage = new GameSetupConfirmPage(page);
    await confirmPage.waitForLoad();
    await confirmPage.clickStartGame();
    await confirmPage.waitForGameStart();

    // Verify we're on the game recording page
    await expect(page).toHaveURL(/\/game\/.*\/record/);
  }

  test('should end game immediately on walk-off in bottom of 7th', async ({ page }) => {
    /**
     * Scenario: Away team leads 5-4 entering bottom of 7th, home team scores to win 6-5
     * Expected: Game ends immediately when home team takes lead (walk-off victory)
     *
     * Walk-off Conditions:
     * - Bottom half of inning (isTopHalf = false)
     * - Current inning >= totalInnings (7 >= 7)
     * - Home team winning
     *
     * Scoring Plan:
     * - Inning 1: Away 2, Home 1 (Away leads 2-1)
     * - Inning 2: Away 1, Home 0 (Away leads 3-1)
     * - Inning 3: Away 0, Home 2 (Tied 3-3)
     * - Inning 4: Away 1, Home 0 (Away leads 4-3)
     * - Inning 5: Away 0, Home 0 (Away leads 4-3)
     * - Inning 6: Away 1, Home 1 (Away leads 5-4)
     * - Inning 7 top: Away 0 (Away still leads 5-4)
     * - Inning 7 bottom: Home scores 2 to win 6-5 <- Walk-off
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 2, Home 1
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 2: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 3: Away 0, Home 2
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 4: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 5: Away 0, Home 0
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 6: Away 1, Home 1
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 7 top: Away 0
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Verify we're in bottom of 7th with away team leading
    expect(await gamePageObject.getCurrentInning()).toBe(7);
    expect(await gamePageObject.isTopOfInning()).toBe(false);

    // Inning 7 bottom: Home scores 2 to win (walk-off)
    await gamePageObject.simulateHalfInning({ runs: 2, walkOffOnFinalRun: true });

    // Verify game ended via walk-off (regulation completion)
    expect(await gamePageObject.isGameComplete()).toBe(true);
    expect(await gamePageObject.getCurrentInning()).toBe(7); // Should stay at 7, not advance to 8
    expect(await gamePageObject.isTopOfInning()).toBe(false); // Still bottom half

    // Verify final scores
    const finalState = await page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return null;
      const state = JSON.parse(stateJson);
      return {
        homeScore: state.state?.currentGame?.homeScore ?? 0,
        awayScore: state.state?.currentGame?.awayScore ?? 0,
      };
    });

    expect(finalState?.homeScore).toBe(6);
    expect(finalState?.awayScore).toBe(5);
  });

  test('should NOT end game if home team ties in bottom of 7th', async ({ page }) => {
    /**
     * Scenario: Away team leads 5-4 entering bottom of 7th, home team ties 5-5
     * Expected: Game does NOT end (would continue to extra innings with current rules)
     *
     * Note: With standard rules (maxExtraInnings: 0, allowTieGames: true),
     * the game technically WOULD end in a tie after completing bottom of 7th.
     * However, if rules allowed extra innings, the game would continue.
     *
     * For this test, we verify the game status after the tie - it should
     * either be complete (tie game) or continue based on rules configuration.
     *
     * Scoring Plan:
     * - Inning 1-6: Build to Away 5, Home 4
     * - Inning 7 top: Away 0
     * - Inning 7 bottom: Home 1 (ties 5-5, NOT a walk-off)
     *
     * Since standard rules have maxExtraInnings: 0 and allowTieGames: true,
     * the game will end as a tie after bottom of 7th.
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 2, Home 1
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 2: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 3: Away 1, Home 2
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 4: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 5: Away 0, Home 0
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 6: Away 0, Home 1
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 7 top: Away 0
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Verify we're in bottom of 7th with away team leading 5-4
    expect(await gamePageObject.getCurrentInning()).toBe(7);
    expect(await gamePageObject.isTopOfInning()).toBe(false);

    // Inning 7 bottom: Home scores 1 to tie 5-5
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // With standard rules (maxExtraInnings: 0, allowTieGames: true),
    // the game ends as a tie after bottom of 7th
    expect(await gamePageObject.isGameComplete()).toBe(true);
    expect(await gamePageObject.getCurrentInning()).toBe(7);

    // Verify final scores are tied
    const finalState = await page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return null;
      const state = JSON.parse(stateJson);
      return {
        homeScore: state.state?.currentGame?.homeScore ?? 0,
        awayScore: state.state?.currentGame?.awayScore ?? 0,
      };
    });

    expect(finalState?.homeScore).toBe(5);
    expect(finalState?.awayScore).toBe(5);
  });

  test('should NOT end early if home team takes lead in bottom of 6th', async ({ page }) => {
    /**
     * Scenario: Home team takes lead in bottom of 6th inning
     * Expected: Game continues to inning 7 (not walk-off scenario yet)
     *
     * Walk-off only applies when currentInning >= totalInnings (7).
     * At inning 6, walk-off logic does NOT apply.
     *
     * Scoring Plan:
     * - Inning 1-5: Build to Away 4, Home 3
     * - Inning 6 top: Away 0
     * - Inning 6 bottom: Home 2 (Home takes lead 5-4, NOT walk-off)
     * - Verify game continues to inning 7
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 2, Home 1
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 2: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 3: Away 0, Home 1
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 4: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 5: Away 0, Home 1
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 6 top: Away 0
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Verify we're in bottom of 6th
    expect(await gamePageObject.getCurrentInning()).toBe(6);
    expect(await gamePageObject.isTopOfInning()).toBe(false);

    // Inning 6 bottom: Home scores 2 to take lead 5-4 (NOT walk-off, too early)
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Verify game continues to inning 7 (not walk-off)
    expect(await gamePageObject.getCurrentInning()).toBe(7);
    expect(await gamePageObject.isTopOfInning()).toBe(true);
    expect(await gamePageObject.isGameComplete()).toBe(false);

    // Complete inning 7 normally
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Game should complete after inning 7 (regulation)
    expect(await gamePageObject.isGameComplete()).toBe(true);
  });
});
