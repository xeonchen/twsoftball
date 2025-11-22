/**
 * @file Extra Innings Scenarios E2E Test
 *
 * Comprehensive E2E tests verifying extra innings behavior when game is tied after regulation.
 *
 * @remarks
 * **IMPORTANT - Standard Rules Configuration:**
 * SoftballRules.standard() has maxExtraInnings: 0 and allowTieGames: true,
 * which means tied games end as ties after regulation (no extra innings).
 *
 * These tests document the EXPECTED behavior once extra innings are enabled
 * in game configuration. With current standard rules, tied games end immediately.
 *
 * Test Coverage:
 * - Game ending as tie when tied after regulation (current behavior with maxExtraInnings: 0)
 * - Game continuing to extra innings when tied (future behavior with maxExtraInnings > 0)
 * - Extra innings ending when team takes lead
 * - maxExtraInnings limit enforced (if configured)
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainable test code
 * - Tests realistic game scenarios with tied scores after regulation
 * - Validates state at key checkpoints (score, inning, game status)
 * - Documents both current and future expected behaviors
 * - Uses full game setup wizard flow (no sessionStorage injection)
 *
 * Architecture Context:
 * - Domain layer: SoftballRules.isGameComplete() checks extra innings config
 * - Application layer: EndInning use case detects tie games and extra innings
 * - Web layer: Game recording UI handles extra innings transitions
 * - State verification reads from sessionStorage (Zustand persist)
 *
 * Standard Rules Configuration (Current):
 * - totalInnings: 7
 * - maxExtraInnings: 0 (no extra innings)
 * - allowTieGames: true (ties allowed)
 *
 * Future Configuration (For Extra Innings):
 * - maxExtraInnings: null (unlimited) or 2-3 (tournament play)
 * - allowTieGames: false (continue until decided) or true (tie after max extras)
 *
 * @example
 * ```bash
 * # Run extra innings scenario tests
 * pnpm --filter @twsoftball/web test:e2e extra-innings-scenarios
 *
 * # Run with UI (headed mode) for debugging
 * pnpm --filter @twsoftball/web test:e2e:headed extra-innings-scenarios
 * ```
 */

import { expect, test, type Page } from '@playwright/test';

import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';
import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';

test.describe('Extra Innings Scenarios', () => {
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
    await teamsPage.fillTeamNames('Rockets', 'Comets', 'away');
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

  test('should end game as tie when tied after regulation (standard rules)', async ({ page }) => {
    /**
     * Scenario: Game tied 4-4 after bottom of 7th inning
     * Expected: Game ends as tie (standard rules: maxExtraInnings: 0, allowTieGames: true)
     *
     * Standard Rules Behavior:
     * - maxExtraInnings: 0 means no extra innings allowed
     * - allowTieGames: true means tied games are accepted
     * - Result: Game ends immediately after regulation if tied
     *
     * Scoring Plan:
     * - Inning 1: Away 2, Home 1 (Away leads 2-1)
     * - Inning 2: Away 0, Home 1 (Tied 2-2)
     * - Inning 3: Away 1, Home 1 (Tied 3-3)
     * - Inning 4: Away 0, Home 0 (Tied 3-3)
     * - Inning 5: Away 1, Home 0 (Away leads 4-3)
     * - Inning 6: Away 0, Home 0 (Away leads 4-3)
     * - Inning 7: Away 0, Home 1 (Tied 4-4) <- Game ends as tie
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 2, Home 1
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 2: Away 0, Home 1
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 3: Away 1, Home 1
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 4: Away 0, Home 0
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 5: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 6: Away 0, Home 0
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 7: Away 0, Home 1 (ties game 4-4)
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Verify game ended as tie (maxExtraInnings: 0)
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

    expect(finalState?.homeScore).toBe(4);
    expect(finalState?.awayScore).toBe(4);
  });

  test('should continue to extra innings when tied after regulation (future behavior)', async () => {
    /**
     * TODO: Implement when game rule configuration UI is available
     *
     * Scenario: Game tied after regulation with maxExtraInnings > 0
     * Expected: Game continues to inning 8 (extra innings)
     *
     * Configuration Needed:
     * - maxExtraInnings: null (unlimited) or > 0 (limited)
     * - allowTieGames: false (continue until decided)
     *
     * Test Steps:
     * 1. Configure game with extra innings enabled
     * 2. Play through 7 innings with tied score
     * 3. Verify game continues to inning 8
     * 4. Verify game status remains 'active'
     * 5. Play inning 8 until team takes lead
     * 6. Verify game completes when lead is established
     *
     * Expected Behavior:
     * - After bottom of 7th with tie, game advances to inning 8
     * - Extra innings continue until someone leads after complete inning
     * - Walk-off logic applies in extra innings (home team can win in bottom half)
     */
  });

  test('should end extra innings game when team takes lead (future behavior)', async () => {
    /**
     * TODO: Implement when game rule configuration UI is available
     *
     * Scenario: Game tied after 7, away team scores in top of 8th, home team doesn't tie
     * Expected: Game ends after bottom of 8th with away team winning
     *
     * Configuration Needed:
     * - maxExtraInnings: null or > 0
     * - allowTieGames: false
     *
     * Test Steps:
     * 1. Configure game with extra innings enabled
     * 2. Play through 7 innings with tied score (5-5)
     * 3. Verify game continues to inning 8
     * 4. Top of 8th: Away team scores 2 (Away leads 7-5)
     * 5. Bottom of 8th: Home team scores 0 (Away still leads 7-5)
     * 6. Verify game ends after bottom of 8th
     * 7. Verify away team wins 7-5
     *
     * Expected Behavior:
     * - Extra inning completes fully (top and bottom)
     * - Game ends when lead is maintained after complete inning
     * - No walk-off (away team won, not home team)
     */
  });

  test('should respect maxExtraInnings limit if configured (future behavior)', async () => {
    /**
     * TODO: Implement when game rule configuration UI is available
     *
     * Scenario: Game with maxExtraInnings: 2, still tied after inning 9
     * Expected: Game ends as tie after max extra innings reached
     *
     * Configuration Needed:
     * - maxExtraInnings: 2
     * - allowTieGames: true
     *
     * Test Steps:
     * 1. Configure game with maxExtraInnings: 2
     * 2. Play through 7 innings with tied score (3-3)
     * 3. Play inning 8 (extra inning 1) with no scoring (still 3-3)
     * 4. Play inning 9 (extra inning 2) with no scoring (still 3-3)
     * 5. Verify game ends as tie after inning 9
     * 6. Verify maxExtraInnings limit enforced
     *
     * Expected Behavior:
     * - Extra innings limited to configured maximum
     * - Game can end in tie if allowTieGames: true
     * - Game does NOT continue to inning 10 (exceeds maxExtraInnings)
     *
     * Tournament Use Case:
     * - Tournaments often limit extra innings (2-3 max)
     * - Prevents games from running indefinitely
     * - Manages schedule constraints
     */
  });
});
