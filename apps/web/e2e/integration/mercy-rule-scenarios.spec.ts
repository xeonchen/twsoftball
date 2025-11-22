/**
 * @file Mercy Rule Scenarios E2E Test
 *
 * Comprehensive E2E tests verifying mercy rule game completion logic works correctly
 * for various run differential and inning threshold scenarios.
 *
 * @remarks
 * Test Coverage:
 * - 10-run mercy rule after 4th inning (standard rules tier 1)
 * - 7-run mercy rule after 5th inning (standard rules tier 2)
 * - Mercy rule NOT triggered when differential just below threshold
 * - Game completion via mercy rule ends game immediately
 * - Mercy rule applies regardless of which team is ahead
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainable test code
 * - Tests realistic game scenarios with scoring patterns that trigger mercy rules
 * - Validates state at key checkpoints (score differential, inning, game status)
 * - Verifies game completion logic with mercy rule as ending type
 * - Uses full game setup wizard flow (no sessionStorage injection)
 *
 * Architecture Context:
 * - Domain layer: SoftballRules.standard() defines mercy rule tiers
 * - Application layer: EndInning use case checks isGameComplete() via rules
 * - Web layer: Game recording UI completes game when mercy rule triggers
 * - State verification reads from sessionStorage (Zustand persist)
 *
 * Standard Rules Configuration:
 * - mercyRuleTiers: [
 *     { differential: 10, afterInning: 4 },  // Tier 1: 10 runs after 4th inning
 *     { differential: 7, afterInning: 5 }    // Tier 2: 7 runs after 5th inning
 *   ]
 * - totalInnings: 7
 * - mercyRuleEnabled: true
 *
 * @example
 * ```bash
 * # Run mercy rule scenario tests
 * pnpm --filter @twsoftball/web test:e2e mercy-rule-scenarios
 *
 * # Run with UI (headed mode) for debugging
 * pnpm --filter @twsoftball/web test:e2e:headed mercy-rule-scenarios
 * ```
 */

import { expect, test, type Page } from '@playwright/test';

import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';
import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';

test.describe('Mercy Rule Scenarios', () => {
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
    await teamsPage.fillTeamNames('Titans', 'Spartans', 'away');
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

  test('should end game via 10-run mercy rule after 4th inning', async ({ page }) => {
    /**
     * Scenario: Away team builds 10+ run lead by end of 4th inning
     * Expected: Game ends immediately via mercy rule (doesn't continue to 5th inning)
     *
     * Standard Rules Tier 1: differential >= 10 at inning >= 4
     *
     * Scoring Plan:
     * - Inning 1: Away 5, Home 0 (differential: 5)
     * - Inning 2: Away 3, Home 0 (differential: 8)
     * - Inning 3: Away 2, Home 0 (differential: 10)
     * - Inning 4: Away 1, Home 0 (differential: 11) <- Mercy rule triggers
     */

    // DIAGNOSTIC: Capture console logs from browser
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (
        text.includes('[StartNewGame]') ||
        text.includes('[useGameSetup]') ||
        text.includes('[gameStore]') ||
        text.includes('[sessionStorage]') ||
        text.includes('[GameRecordingPage]') ||
        text.includes('[getAutomaticAdvances]') ||
        text.includes('[useRecordAtBat]') ||
        text.includes('[gameAdapter')
      ) {
        consoleLogs.push(text);
        console.log('BROWSER CONSOLE:', text);
      }
    });

    await setupAndStartGame(page);

    // Print captured logs
    console.log('\n=== CAPTURED CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== END CONSOLE LOGS ===\n');

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Verify initial state
    expect(await gamePageObject.getCurrentInning()).toBe(1);
    expect(await gamePageObject.isTopOfInning()).toBe(true);

    // Inning 1: Away 5, Home 0
    await gamePageObject.simulateHalfInning({ runs: 5 });
    expect(await gamePageObject.isTopOfInning()).toBe(false);
    await gamePageObject.simulateHalfInning({ runs: 0 });
    expect(await gamePageObject.getCurrentInning()).toBe(2);

    // Inning 2: Away 3, Home 0
    await gamePageObject.simulateHalfInning({ runs: 3 });
    await gamePageObject.simulateHalfInning({ runs: 0 });
    expect(await gamePageObject.getCurrentInning()).toBe(3);

    // Inning 3: Away 2, Home 0
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 0 });
    expect(await gamePageObject.getCurrentInning()).toBe(4);

    // Inning 4: Away 1, Home 0 (triggers 10-run mercy rule)
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // STEP 2: Capture sessionStorage state after bottom of 4th
    const gameState = await page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return null;
      const state = JSON.parse(stateJson);
      return {
        status: state.state?.currentGame?.status,
        currentInning:
          state.state?.currentGame?.currentInning || state.state?.activeGameState?.currentInning,
        isTopHalf: state.state?.activeGameState?.isTopHalf,
        outs: state.state?.activeGameState?.outs,
        homeScore: state.state?.currentGame?.homeScore ?? 0,
        awayScore: state.state?.currentGame?.awayScore ?? 0,
        hasCurrentBatter: !!state.state?.activeGameState?.currentBatter,
        fullState: state, // Capture everything for analysis
      };
    });
    console.log(
      '[STEP 2 DIAGNOSTIC] Game state after bottom of 4th:',
      JSON.stringify(gameState, null, 2)
    );

    // Verify game ended via mercy rule
    expect(await gamePageObject.isGameComplete()).toBe(true);
    expect(await gamePageObject.getCurrentInning()).toBe(4);

    // Verify final scores in sessionStorage
    const finalState = await page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return null;
      const state = JSON.parse(stateJson);
      return {
        homeScore: state.state?.currentGame?.homeScore ?? 0,
        awayScore: state.state?.currentGame?.awayScore ?? 0,
      };
    });

    expect(finalState?.awayScore).toBe(11);
    expect(finalState?.homeScore).toBe(0);
  });

  test('should end game via 7-run mercy rule after 5th inning', async ({ page }) => {
    /**
     * Scenario: Home team builds exactly 7-run lead by end of 5th inning
     * Expected: Game ends immediately via mercy rule (second tier)
     *
     * Standard Rules Tier 2: differential >= 7 at inning >= 5
     *
     * Scoring Plan:
     * - Inning 1: Away 0, Home 2 (differential: 2)
     * - Inning 2: Away 0, Home 2 (differential: 4)
     * - Inning 3: Away 1, Home 1 (differential: 4)
     * - Inning 4: Away 0, Home 1 (differential: 5)
     * - Inning 5: Away 0, Home 2 (differential: 7) <- Mercy rule triggers
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 0, Home 2
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 2: Away 0, Home 2
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Inning 3: Away 1, Home 1
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 4: Away 0, Home 1
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 1 });

    // Inning 5: Away 0, Home 2 (triggers 7-run mercy rule at inning 5)
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 2 });

    // Verify game ended via mercy rule
    expect(await gamePageObject.isGameComplete()).toBe(true);
    expect(await gamePageObject.getCurrentInning()).toBe(5);

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

    expect(finalState?.homeScore).toBe(8);
    expect(finalState?.awayScore).toBe(1);
  });

  test('should NOT trigger mercy rule if differential not met', async ({ page }) => {
    /**
     * Scenario: 6-run differential after inning 5 (just below 7-run tier 2 threshold)
     * Expected: Game continues to next inning (mercy rule NOT triggered)
     *
     * Standard Rules:
     * - Tier 1: 10+ runs at inning 4+
     * - Tier 2: 7+ runs at inning 5+
     *
     * This test verifies 6-run differential at inning 5 does NOT trigger mercy rule
     * (needs 7+ runs at inning 5 for tier 2, or 10+ runs at inning 4 for tier 1)
     *
     * Scoring Plan:
     * - Inning 1: Away 2, Home 0 (differential: 2)
     * - Inning 2: Away 1, Home 0 (differential: 3)
     * - Inning 3: Away 1, Home 0 (differential: 4)
     * - Inning 4: Away 1, Home 0 (differential: 5)
     * - Inning 5: Away 1, Home 0 (differential: 6) <- Below 7-run tier 2 threshold
     * - Verify game continues to inning 6
     */
    await setupAndStartGame(page);

    const gamePageObject = new GameRecordingPageObject(page);
    await page.waitForTimeout(2000);

    // Inning 1: Away 2, Home 0
    await gamePageObject.simulateHalfInning({ runs: 2 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 2: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 3: Away 1, Home 0
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 4: Away 1, Home 0 (differential: 5, NOT enough for 10-run mercy tier 1)
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Inning 5: Away 1, Home 0 (differential: 6, NOT enough for 7-run mercy tier 2)
    await gamePageObject.simulateHalfInning({ runs: 1 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Verify game continues to inning 6 (mercy rule NOT triggered)
    expect(await gamePageObject.getCurrentInning()).toBe(6);
    expect(await gamePageObject.isTopOfInning()).toBe(true);
    expect(await gamePageObject.isGameComplete()).toBe(false);

    // Continue to complete the game normally through inning 7
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });
    await gamePageObject.simulateHalfInning({ runs: 0 });

    // Game should complete after inning 7 (regulation)
    expect(await gamePageObject.isGameComplete()).toBe(true);
  });
});
