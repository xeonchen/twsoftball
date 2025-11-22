/**
 * @file Combined Edge Cases E2E Test
 *
 * Comprehensive E2E tests verifying game completion logic works correctly when
 * multiple edge case scenarios occur simultaneously (mercy rule + walk-off, etc.).
 *
 * @remarks
 * Test Coverage:
 * - Walk-off prioritized over mercy rule in bottom of 7th
 * - Mercy rule still applies in extra innings (if configured)
 * - Walk-off applies in extra innings (if configured)
 * - Complex scoring patterns with multiple completion conditions
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainable test code
 * - Tests complex game scenarios with overlapping completion conditions
 * - Validates correct precedence of completion rules
 * - Validates state at key checkpoints (score, inning, game status)
 * - Uses full game setup wizard flow (no sessionStorage injection)
 *
 * Architecture Context:
 * - Domain layer: Game aggregate evaluates completion conditions in order
 * - Application layer: RecordAtBat use case checks walk-off before mercy rule
 * - Web layer: Game recording UI handles immediate completion
 * - State verification reads from sessionStorage (Zustand persist)
 *
 * Standard Rules Configuration:
 * - totalInnings: 7
 * - mercyRuleTiers: [
 *     { differential: 10, afterInning: 4 },
 *     { differential: 7, afterInning: 5 }
 *   ]
 * - maxExtraInnings: 0 (no extra innings by default)
 * - allowTieGames: true
 *
 * Completion Rule Precedence:
 * 1. Walk-off (home team takes lead in bottom of final inning or later)
 * 2. Mercy rule (score differential threshold exceeded)
 * 3. Regulation (completed all innings with decisive score)
 * 4. Tie game (tied after regulation with maxExtraInnings: 0)
 *
 * @example
 * ```bash
 * # Run combined edge case tests
 * pnpm --filter @twsoftball/web test:e2e combined-edge-cases
 *
 * # Run with UI (headed mode) for debugging
 * pnpm --filter @twsoftball/web test:e2e:headed combined-edge-cases
 * ```
 */

import { expect, test, type Page } from '@playwright/test';

import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';
import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';

test.describe('Combined Edge Cases', () => {
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
    await teamsPage.fillTeamNames('Phoenix', 'Dragon', 'away');
    await teamsPage.clickContinue();

    // Step 2: Setup lineup with 10 players
    const lineupPage = new GameSetupLineupPage(page);
    await lineupPage.waitForLoad();
    await lineupPage.setPlayerCount(10);
    await lineupPage.addFirstNPlayers(10);
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

  test('should prioritize walk-off over mercy rule in bottom of 7th', async ({ page }) => {
    /**
     * Scenario: Away team leads 15-9 entering bottom of 7th (6-run differential, below mercy threshold)
     *           Home team scores 7 runs to win 16-15 (walk-off)
     * Expected: Game ends immediately via walk-off (not waiting for full inning)
     *
     * Rule Context:
     * - Mercy rule tier 2: 7+ run differential after inning 5
     * - Keep differential at 6 runs to avoid mercy rule triggering before inning 7
     * - Home team scoring to take lead in bottom 7th: Walk-off applies
     *
     * Scoring Plan:
     * - Inning 1: Away 3, Home 2 (Away leads 3-2, diff: 1)
     * - Inning 2: Away 2, Home 2 (Away leads 5-4, diff: 1)
     * - Inning 3: Away 3, Home 1 (Away leads 8-5, diff: 3)
     * - Inning 4: Away 2, Home 2 (Away leads 10-7, diff: 3)
     * - Inning 5: Away 2, Home 1 (Away leads 12-8, diff: 4)
     * - Inning 6: Away 3, Home 1 (Away leads 15-9, diff: 6) <- Below 7-run mercy threshold
     * - Inning 7 top: Away 0 (Away leads 15-9, diff: 6)
     * - Inning 7 bottom: Home scores 7 to win 16-15 <- Walk-off (immediate end)
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 3, Home 2
    await gamePageObject.simulateHalfInning({ runs: 3 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 2: Away 2, Home 2
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 3: Away 3, Home 1
    await gamePageObject.simulateHalfInning({ runs: 3 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 4: Away 2, Home 2
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 5: Away 2, Home 1
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 6: Away 3, Home 1
    await gamePageObject.simulateHalfInning({ runs: 3 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 7 top: Away 0
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Verify we're in bottom of 7th (6-run differential, no mercy rule yet)
    expect(await gamePageObject.getCurrentInning()).toBe(7);
    expect(await gamePageObject.isTopOfInning()).toBe(false);

    // Inning 7 bottom: Home scores 7 to win 16-15 (walk-off)
    // Use walkOffOnFinalRun: true since this IS a walk-off scenario - avoids race condition
    // with sessionStorage sync that caused Firefox-specific failures
    await gamePageObject.simulateHalfInning({ runs: 7, walkOffOnFinalRun: true });

    // Verify game ended via walk-off (immediate completion, not mercy rule)
    expect(await gamePageObject.isGameComplete()).toBe(true);
    expect(await gamePageObject.getCurrentInning()).toBe(7);

    // Verify final scores from sessionStorage
    // DEBUG: Log full state for investigation if test fails on CI
    const finalState = await page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) {
        console.log('[walk-off test] ERROR: No game-state in sessionStorage');
        return null;
      }
      const state = JSON.parse(stateJson);
      const result = {
        homeScore: state.state?.currentGame?.homeScore ?? 0,
        awayScore: state.state?.currentGame?.awayScore ?? 0,
        status: state.state?.currentGame?.status ?? 'unknown',
        completionReason: state.state?.currentGame?.completionReason ?? 'N/A',
        currentInning: state.state?.activeGameState?.currentInning ?? 'N/A',
        isTopHalf: state.state?.activeGameState?.isTopHalf ?? 'N/A',
      };
      console.log('[walk-off test] Final state:', JSON.stringify(result, null, 2));
      return result;
    });

    // Log to test output for CI debugging
    console.log(
      `[walk-off test] Asserting: homeScore=${finalState?.homeScore} (expected 16), awayScore=${finalState?.awayScore} (expected 15)`
    );

    expect(finalState?.homeScore).toBe(16);
    expect(finalState?.awayScore).toBe(15);
  });

  test('should handle mercy rule in extra innings (future behavior)', async () => {
    /**
     * TODO: Implement when game rule configuration UI is available
     *
     * Scenario: Game tied after 7, goes to inning 8, team builds 15+ run lead
     * Expected: Mercy rule still applies in extra innings (game ends via mercy)
     *
     * Configuration Needed:
     * - maxExtraInnings: null (unlimited) or > 1
     * - allowTieGames: false
     * - mercyRuleEnabled: true
     *
     * Test Steps:
     * 1. Configure game with extra innings enabled
     * 2. Play through 7 innings with tied score (5-5)
     * 3. Verify game continues to inning 8
     * 4. Top of 8th: Away team scores 10 (Away leads 15-5, 10-run differential)
     * 5. Bottom of 8th: After 3 outs, verify game ends via mercy rule
     * 6. Verify mercy rule applies in extra innings (not just regulation)
     *
     * Expected Behavior:
     * - Mercy rule thresholds still apply in extra innings
     * - Game ends immediately when mercy rule triggered
     * - Ending type: MERCY_RULE, not REGULATION
     *
     * Business Context:
     * - Prevents unnecessarily lopsided extra-inning games
     * - Mercy rule applies throughout entire game, not just regulation
     */
  });

  test('should handle walk-off in extra innings (future behavior)', async () => {
    /**
     * TODO: Implement when game rule configuration UI is available
     *
     * Scenario: Game tied after 7, goes to extras, home team scores in bottom of 10th
     * Expected: Game ends immediately via walk-off in extra innings
     *
     * Configuration Needed:
     * - maxExtraInnings: null (unlimited) or >= 3
     * - allowTieGames: false
     *
     * Test Steps:
     * 1. Configure game with extra innings enabled
     * 2. Play through 7 innings with tied score (6-6)
     * 3. Play inning 8 with no scoring (still 6-6)
     * 4. Play inning 9 with no scoring (still 6-6)
     * 5. Top of 10th: Away scores 1 (Away leads 7-6)
     * 6. Bottom of 10th: Home scores 2 to win 8-7 <- Walk-off in extras
     * 7. Verify game ends immediately (walk-off)
     * 8. Verify home team wins 8-7
     *
     * Expected Behavior:
     * - Walk-off logic applies in all extra innings (not just 7th)
     * - Game ends immediately when home team takes lead in bottom half
     * - Ending type: REGULATION (walk-off treated as regulation completion)
     *
     * Business Context:
     * - Walk-off victories can occur in any extra inning
     * - Home team advantage maintained throughout extras
     * - Common in tournament play and recreation leagues
     */
  });
});
