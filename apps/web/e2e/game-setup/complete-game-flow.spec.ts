/**
 * @file Complete Game Flow E2E Tests
 *
 * End-to-end tests for the complete game setup wizard flow.
 * These tests verify the entire user journey from game setup to game start.
 *
 * @remarks
 * Test Coverage:
 * - Complete game setup wizard flow (teams → lineup → confirm → start)
 * - Lineup validation (minimum 9 players required)
 * - Start Game button enabled/disabled states
 * - Navigation between wizard steps
 * - Error handling and validation feedback
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainability
 * - Tests real user workflows end-to-end
 * - Validates both happy path and error scenarios
 * - Focuses on critical user journeys
 *
 * Bug Reproduction:
 * - These tests are designed to catch the reported bug:
 *   "I can proceed to Review Setup, but 'Start Game' is still disabled"
 * - If the bug exists, test will fail at the assertion checking
 *   that Start Game button is enabled
 *
 * @example
 * ```bash
 * # Run all game setup flow tests
 * pnpm --filter @twsoftball/web test:e2e complete-game-flow
 *
 * # Run with UI (headed mode)
 * pnpm --filter @twsoftball/web test:e2e:headed complete-game-flow
 * ```
 */

import { expect, test } from '@playwright/test';

import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';

test.describe('Complete Game Flow', () => {
  test.describe('Happy Path: Complete Game Setup and Start', () => {
    test('should complete full game setup wizard and start game with 10 players', async ({
      page,
    }) => {
      // Capture browser console logs for debugging
      page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
          console.log(`Browser ${type}:`, msg.text());
        }
      });

      // Capture page errors
      page.on('pageerror', error => {
        console.log('Page error:', error.message);
      });

      // Step 1: Navigate to Teams Page
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.waitForLoad();

      // Step 2: Fill team information
      await teamsPage.fillTeamNames('Warriors', 'Eagles', 'home');

      // Verify form is valid
      expect(await teamsPage.isValid()).toBe(true);
      expect(await teamsPage.getFormProgress()).toBe('3/3');

      // Step 3: Navigate to Lineup Page
      await teamsPage.clickContinue();

      // Step 4: Setup lineup with 10 players
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();

      // Verify we're on the lineup page
      await expect(page).toHaveURL('/game/setup/lineup');

      // Set player count to 10
      await lineupPage.setPlayerCount(10);

      // Add 10 players from available list
      await lineupPage.addFirstNPlayers(10);

      // Wait for validation to complete
      await lineupPage.waitForValidation();

      // Verify progress indicator shows 10 completed players
      const progress = await lineupPage.getProgressIndicator();
      expect(progress).toContain('10');
      expect(progress).toContain('of 9+ completed');

      // Verify continue button is enabled
      expect(await lineupPage.isContinueEnabled()).toBe(true);

      // Step 5: Navigate to Confirm Page
      await lineupPage.clickContinue();

      // Step 6: Review and start game
      const confirmPage = new GameSetupConfirmPage(page);
      await confirmPage.waitForLoad();

      // Verify we're on the confirm page
      await expect(page).toHaveURL('/game/setup/confirm');

      // Verify lineup summary displays all 10 players
      const lineup = await confirmPage.getLineupSummary();
      expect(lineup).toHaveLength(10);

      // Verify first player details
      expect(lineup[0]?.name).toBe('Mike Chen');
      expect(lineup[0]?.jersey).toBe('8');
      expect(lineup[0]?.position).toBe('SS');

      // CRITICAL TEST: Verify Start Game button is ENABLED
      // This is the reported bug - button should be enabled with 10 players
      const isStartGameEnabled = await confirmPage.isStartGameEnabled();
      expect(isStartGameEnabled).toBe(true);

      // Verify no validation errors
      expect(await confirmPage.hasValidationError()).toBe(false);

      // Step 7: Start the game
      await confirmPage.clickStartGame();

      // DIAGNOSTIC: Wait a moment for either success or error
      console.log('🔍 DIAGNOSTIC: Waiting for response after clicking START GAME...');
      await page.waitForTimeout(2000);

      // Check for infrastructure error
      const hasInfraError = await confirmPage.hasInfrastructureError();
      if (hasInfraError) {
        const errorMsg = await confirmPage.getInfrastructureError();
        console.log('🔴 Infrastructure Error Detected:', errorMsg);

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/start-game-infra-error.png' });

        throw new Error(`Game creation failed with infrastructure error: ${errorMsg}`);
      }

      // Check for validation error
      const hasValidationError = await confirmPage.hasValidationError();
      if (hasValidationError) {
        const errorMsg = await confirmPage.getValidationError();
        console.log('🟡 Validation Error Detected:', errorMsg);

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/start-game-validation-error.png' });

        throw new Error(`Game creation failed with validation error: ${errorMsg}`);
      }

      // Check if loading indicator appeared
      const isLoading = await confirmPage.isLoading();
      console.log('📊 Loading indicator visible:', isLoading);

      // Check if success transition appeared
      const hasSuccess = await confirmPage.isSuccessTransitionShown();
      console.log('✅ Success transition visible:', hasSuccess);

      if (!hasSuccess && !hasInfraError && !hasValidationError && !isLoading) {
        // Check if we've already navigated away (success without transition)
        const url = page.url();
        console.log('📍 Current URL:', url);

        // If URL changed to game recording, consider it a success
        if (url.match(/\/game\/.*\/record/)) {
          console.log('✅ Successfully navigated to game recording page');
        } else {
          // Take a screenshot for debugging
          await page.screenshot({ path: 'test-results/start-game-no-response.png' });

          throw new Error(
            'Clicked START GAME but nothing happened - no loading, no error, no success'
          );
        }
      }

      // Step 8: Wait for game to start and navigate to recording page
      await confirmPage.waitForGameStart();

      // Verify we're on the game recording page
      await expect(page).toHaveURL(/\/game\/.*\/record/);
    });

    test('should complete game setup with minimum 9 players', async ({ page }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Thunder', 'Storm', 'away');
      await teamsPage.clickContinue();

      // Setup lineup with exactly 9 players covering all 9 required positions
      // Available players by index: 0(SS), 1(CF), 2(RF), 3(3B), 4(LF), 5(SF), 6(1B), 7(C), 8(2B), 9(P), 10(EP)
      // Required positions: P, C, 1B, 2B, 3B, SS, LF, CF, RF (9 field positions)
      // Select players at indices 0-4, skip 5(SF), select 6-9(P) to cover all required positions
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);

      // Get all "Add" buttons from available players section
      const addButtons = page.locator('[data-testid^="add-player-"]');

      // Add first 5 players (indices 0-4: SS, CF, RF, 3B, LF)
      for (let i = 0; i < 5; i++) {
        await addButtons.nth(i).click();
        await page.waitForTimeout(100);
      }

      // Skip index 5 (SF - Short Fielder, not a required position)
      // Add players at indices 6-9 (1B, C, 2B, P)
      for (let i = 6; i <= 9; i++) {
        await addButtons.nth(i).click();
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(300); // Wait for all updates
      await lineupPage.waitForValidation();

      // Verify progress shows 9 completed
      const progress = await lineupPage.getProgressIndicator();
      expect(progress).toContain('9');

      // Continue to confirm
      await lineupPage.clickContinue();

      // Verify lineup and start game button
      const confirmPage = new GameSetupConfirmPage(page);
      await confirmPage.waitForLoad();

      const lineup = await confirmPage.getLineupSummary();
      expect(lineup).toHaveLength(9);

      // Start Game should be enabled with 9 players (minimum)
      expect(await confirmPage.isStartGameEnabled()).toBe(true);

      // Start game
      await confirmPage.clickStartGame();
      await confirmPage.waitForGameStart();

      // Verify navigation to game recording
      await expect(page).toHaveURL(/\/game\/.*\/record/);
    });

    test('should complete game setup with manual player entry', async ({ page }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Dragons', 'Tigers', 'home');
      await teamsPage.clickContinue();

      // Setup lineup with manual entry
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);

      // Manually fill all 9 players
      await lineupPage.fillPlayerManually(0, 'John Doe', '1', 'P');
      await lineupPage.fillPlayerManually(1, 'Jane Smith', '2', 'C');
      await lineupPage.fillPlayerManually(2, 'Bob Johnson', '3', '1B');
      await lineupPage.fillPlayerManually(3, 'Alice Williams', '4', '2B');
      await lineupPage.fillPlayerManually(4, 'Charlie Brown', '5', '3B');
      await lineupPage.fillPlayerManually(5, 'Diana Davis', '6', 'SS');
      await lineupPage.fillPlayerManually(6, 'Eve Wilson', '7', 'LF');
      await lineupPage.fillPlayerManually(7, 'Frank Miller', '8', 'CF');
      await lineupPage.fillPlayerManually(8, 'Grace Taylor', '9', 'RF');

      await lineupPage.waitForValidation();

      // Verify continue is enabled
      expect(await lineupPage.isContinueEnabled()).toBe(true);

      // Continue to confirm
      await lineupPage.clickContinue();

      // Verify and start game
      const confirmPage = new GameSetupConfirmPage(page);
      await confirmPage.waitForLoad();

      const lineup = await confirmPage.getLineupSummary();
      expect(lineup).toHaveLength(9);
      expect(lineup[0]?.name).toBe('John Doe');

      // Start Game should be enabled
      expect(await confirmPage.isStartGameEnabled()).toBe(true);

      await confirmPage.clickStartGame();
      await confirmPage.waitForGameStart();
      await expect(page).toHaveURL(/\/game\/.*\/record/);
    });
  });

  test.describe('Error Scenarios: Incomplete Lineup', () => {
    test('should prevent starting game with incomplete lineup (less than 9 players)', async ({
      page,
    }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Hawks', 'Panthers', 'home');
      await teamsPage.clickContinue();

      // Setup lineup with only 5 players
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);
      await lineupPage.addFirstNPlayers(5);
      await lineupPage.waitForValidation();

      // Verify progress shows only 5 completed
      const progress = await lineupPage.getProgressIndicator();
      expect(progress).toContain('5');

      // Continue button should be DISABLED
      expect(await lineupPage.isContinueEnabled()).toBe(false);

      // Verify validation feedback is shown
      expect(await lineupPage.hasValidationFeedback()).toBe(true);
      const feedback = await lineupPage.getValidationFeedback();
      // Validation now shows incomplete players count (4 empty slots = 4 incomplete players)
      expect(feedback).toContain('4 player');
      expect(feedback).toContain('missing required fields');
    });

    test('should show validation error on confirm page with incomplete lineup', async ({
      page,
    }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Sharks', 'Dolphins', 'away');
      await teamsPage.clickContinue();

      // Setup incomplete lineup (only 8 players)
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);

      // Add only 8 players (one short of minimum)
      // Use players 1-8 to cover most positions
      await lineupPage.addFirstNPlayers(8);
      await lineupPage.waitForValidation();

      // Continue should be disabled with only 8 players
      expect(await lineupPage.isContinueEnabled()).toBe(false);

      // Validation feedback should indicate incomplete lineup
      expect(await lineupPage.hasValidationFeedback()).toBe(true);
      const feedback = await lineupPage.getValidationFeedback();
      // Should show that 1 player is missing required fields (the 9th empty slot)
      expect(feedback).toContain('1 player');
      expect(feedback).toContain('missing required fields');
    });

    test('should prevent starting game with players missing required fields', async ({ page }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Lions', 'Bears', 'home');
      await teamsPage.clickContinue();

      // Setup lineup with incomplete player data
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);

      // Fill 9 players, but one is missing jersey number
      await lineupPage.fillPlayerManually(0, 'Player 1', '1', 'P');
      await lineupPage.fillPlayerManually(1, 'Player 2', '2', 'C');
      await lineupPage.fillPlayerManually(2, 'Player 3', '3', '1B');
      await lineupPage.fillPlayerManually(3, 'Player 4', '4', '2B');
      await lineupPage.fillPlayerManually(4, 'Player 5', '5', '3B');
      await lineupPage.fillPlayerManually(5, 'Player 6', '6', 'SS');
      await lineupPage.fillPlayerManually(6, 'Player 7', '7', 'LF');
      await lineupPage.fillPlayerManually(7, 'Player 8', '8', 'CF');
      // Player 9 is missing jersey number
      await lineupPage.fillPlayerManually(8, 'Player 9', '', 'RF');

      await lineupPage.waitForValidation();

      // Continue should be disabled due to incomplete player
      expect(await lineupPage.isContinueEnabled()).toBe(false);

      // Validation feedback should show incomplete players
      expect(await lineupPage.hasValidationFeedback()).toBe(true);
      const feedback = await lineupPage.getValidationFeedback();
      expect(feedback).toContain('missing required fields');
    });
  });

  test.describe('Navigation: Back and Forth Between Steps', () => {
    test('should preserve data when navigating back and forth', async ({ page }) => {
      // Step 1: Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Wildcats', 'Bulldogs', 'home');
      await teamsPage.clickContinue();

      // Step 2: Setup lineup
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(10);
      await lineupPage.addFirstNPlayers(10);
      await lineupPage.waitForValidation();
      await lineupPage.clickContinue();

      // Step 3: Verify on confirm page
      const confirmPage = new GameSetupConfirmPage(page);
      await confirmPage.waitForLoad();
      await expect(page).toHaveURL('/game/setup/confirm');

      // Navigate back to lineup
      await confirmPage.goBack();
      await expect(page).toHaveURL('/game/setup/lineup');

      // Verify lineup data is preserved
      const player = await lineupPage.getPlayerAtSlot(0);
      expect(player.name).toBe('Mike Chen');

      // Navigate back to teams
      await lineupPage.goBack();
      await expect(page).toHaveURL('/game/setup/teams');

      // Verify team data is preserved (this depends on store implementation)
      // We can verify by navigating forward again and checking final result

      // Navigate forward to confirm
      await teamsPage.clickContinue();
      await lineupPage.waitForLoad();
      await lineupPage.clickContinue();
      await confirmPage.waitForLoad();

      // Verify we can still start the game
      expect(await confirmPage.isStartGameEnabled()).toBe(true);
    });

    test('should allow editing lineup after reviewing on confirm page', async ({ page }) => {
      // Complete setup
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Eagles', 'Falcons', 'away');
      await teamsPage.clickContinue();

      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);
      await lineupPage.addFirstNPlayers(9);
      await lineupPage.waitForValidation();
      await lineupPage.clickContinue();

      const confirmPage = new GameSetupConfirmPage(page);
      await confirmPage.waitForLoad();

      // Verify initial lineup
      let lineup = await confirmPage.getLineupSummary();
      expect(lineup[0]?.name).toBe('Mike Chen');

      // Go back to edit
      await confirmPage.goBack();
      await lineupPage.waitForLoad();

      // Change first player
      await lineupPage.fillPlayerManually(0, 'New Player', '99', 'P');
      await lineupPage.waitForValidation();

      // Go back to confirm
      await lineupPage.clickContinue();
      await confirmPage.waitForLoad();

      // Verify updated lineup
      lineup = await confirmPage.getLineupSummary();
      expect(lineup[0]?.name).toBe('New Player');
      expect(lineup[0]?.jersey).toBe('99');

      // Should still be able to start game
      expect(await confirmPage.isStartGameEnabled()).toBe(true);
    });
  });

  test.describe('Validation: Form Validation Across Steps', () => {
    test('should validate team names before allowing continue', async ({ page }) => {
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();

      // Try to continue without filling teams
      expect(await teamsPage.isContinueEnabled()).toBe(false);

      // Fill only home team
      await teamsPage.fillHomeTeam('Warriors');
      expect(await teamsPage.isContinueEnabled()).toBe(false);

      // Fill away team with same name (should fail)
      await teamsPage.fillAwayTeam('Warriors');
      await page.waitForTimeout(500);
      expect(await teamsPage.isContinueEnabled()).toBe(false);

      // Fix away team name
      await teamsPage.fillAwayTeam('Eagles');

      // Still need to select our team
      expect(await teamsPage.isContinueEnabled()).toBe(false);

      // Select our team
      await teamsPage.selectOurTeam('home');

      // Now should be valid
      expect(await teamsPage.isContinueEnabled()).toBe(true);
    });

    test('should validate lineup completeness before allowing continue', async ({ page }) => {
      // Setup teams
      const teamsPage = new GameSetupTeamsPage(page);
      await teamsPage.goto();
      await teamsPage.fillTeamNames('Team A', 'Team B', 'home');
      await teamsPage.clickContinue();

      // Test 1: Empty lineup should disable continue
      const lineupPage = new GameSetupLineupPage(page);
      await lineupPage.waitForLoad();
      expect(await lineupPage.isContinueEnabled()).toBe(false);

      // Test 2: 8 players should still disable continue (need 9 minimum)
      await lineupPage.addFirstNPlayers(8);
      await lineupPage.waitForValidation();
      expect(await lineupPage.isContinueEnabled()).toBe(false);

      // Test 3: Go back and restart with 9 players to verify it enables
      await lineupPage.goBack();
      await teamsPage.waitForLoad();
      await teamsPage.clickContinue();
      await lineupPage.waitForLoad();
      await lineupPage.setPlayerCount(9);
      await lineupPage.addFirstNPlayers(9);
      await lineupPage.waitForValidation();
      expect(await lineupPage.isContinueEnabled()).toBe(true);
    });
  });
});
