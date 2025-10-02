/**
 * @file Substitution Workflow E2E Tests
 *
 * End-to-end tests for player substitution workflows.
 * Tests the complete substitution process from initiation to completion.
 *
 * @remarks
 * Test Coverage:
 * - Complete substitution workflow
 * - Player eligibility validation
 * - Position assignment verification
 * - Substitution history tracking
 * - Error handling and edge cases
 * - Accessibility in substitution flows
 *
 * Test Scenarios:
 * - Valid substitution (starter → bench player)
 * - Re-entry substitution (starter returns)
 * - Position change during substitution
 * - Invalid substitution attempts
 * - Substitution cancellation
 * - Multiple substitutions in sequence
 */

import { test, expect, Page } from '@playwright/test';

// Test data for substitution workflows
const SUBSTITUTION_TEST_DATA = {
  activePlayer: {
    id: 'player-active-1',
    name: 'Active Player',
    jersey: 12,
    battingSlot: 3,
    position: 'Third Base',
  },
  benchPlayer: {
    id: 'bench-1',
    name: 'Bench Player',
    jersey: 25,
    isStarter: false,
    hasReentered: false,
  },
  reentryPlayer: {
    id: 'player-starter-2',
    name: 'Former Starter',
    jersey: 8,
    isStarter: true,
    hasReentered: false,
  },
  currentInning: 5,
};

/**
 * Setup test environment with substitution-ready game state
 */
async function setupSubstitutionTest(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="app-ready"]');

  // Setup game state with substitution data
  await page.evaluate(testData => {
    const gameState = {
      gameId: 'substitution-test-game',
      currentInning: testData.currentInning,
      homeTeam: {
        name: 'Home Team',
        activeLineup: [testData.activePlayer],
        bench: [testData.benchPlayer, testData.reentryPlayer],
      },
      substitutionHistory: [],
    };

    sessionStorage.setItem('gameState', JSON.stringify(gameState));
  }, SUBSTITUTION_TEST_DATA);

  await page.goto('/lineup');
  await page.waitForSelector('[data-testid="lineup-editor"]');
}

/**
 * Helper to open substitution dialog for a player
 */
async function openSubstitutionDialog(page: Page, playerSlot: number = 1) {
  const substituteButton = page.locator(
    `[data-testid="lineup-list"] [role="listitem"]:nth-child(${playerSlot}) button[aria-label*="Substitute"]`
  );
  await substituteButton.click();
  await page.waitForSelector('[role="dialog"][aria-modal="true"]');
}

test.describe('Substitution Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupSubstitutionTest(page);
  });

  test('should complete valid substitution workflow', async ({ page }) => {
    // Open substitution dialog
    await openSubstitutionDialog(page);

    // Verify dialog content
    await expect(page.locator('#dialog-title')).toContainText('Make Substitution');
    await expect(page.locator('#dialog-description')).toContainText('Substituting player-active-1');

    // Verify bench players are listed
    const benchPlayerOption = page.locator(
      `input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`
    );
    await expect(benchPlayerOption).toBeVisible();

    // Select bench player
    await benchPlayerOption.click();

    // Verify eligibility indicator appears
    await expect(page.locator('.eligibility-indicator .eligible-icon')).toBeVisible();

    // Verify position selection is available
    await expect(page.locator('#position-select')).toBeVisible();

    // Confirm substitution
    await page.click('button[aria-label*="Confirm substitution"]');

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Verify lineup is updated
    await expect(page.locator('[data-testid="lineup-list"] .player-name').first()).toContainText(
      SUBSTITUTION_TEST_DATA.benchPlayer.name
    );
  });

  test('should handle re-entry substitution', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Select re-entry player
    const reentryPlayer = page.locator(`input[value="${SUBSTITUTION_TEST_DATA.reentryPlayer.id}"]`);
    await reentryPlayer.click();

    // Verify re-entry indication
    await expect(page.locator('.reentry-info')).toContainText('Re-entered');

    // Should still be eligible
    await expect(page.locator('.eligibility-indicator .eligible-icon')).toBeVisible();

    // Complete substitution
    await page.click('button[aria-label*="Confirm substitution"]');

    // Verify success
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  test('should validate player eligibility', async ({ page }) => {
    // Mock ineligible player
    await page.evaluate(() => {
      const gameState = JSON.parse(sessionStorage.getItem('gameState') || '{}');
      gameState.homeTeam.bench[0].ineligible = true;
      gameState.homeTeam.bench[0].ineligibilityReason = 'Already substituted this inning';
      sessionStorage.setItem('gameState', JSON.stringify(gameState));
    });

    await page.reload();
    await openSubstitutionDialog(page);

    // Select ineligible player
    const ineligiblePlayer = page.locator(
      `input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`
    );
    await ineligiblePlayer.click();

    // Verify ineligibility indicator
    await expect(page.locator('.eligibility-indicator .ineligible-icon')).toBeVisible();

    // Verify error message
    await expect(page.locator('[role="alert"].eligibility-error')).toContainText(
      'Already substituted this inning'
    );

    // Confirm button should be disabled
    await expect(page.locator('button[aria-label*="Confirm substitution"]')).toBeDisabled();
  });

  test('should handle position changes during substitution', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Select player
    await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);

    // Change position
    await page.selectOption('#position-select', 'First Base');

    // Verify position change is reflected
    const selectedPosition = await page.locator('#position-select').inputValue();
    expect(selectedPosition).toBe('First Base');

    // Complete substitution
    await page.click('button[aria-label*="Confirm substitution"]');

    // Verify position is updated in lineup
    await expect(page.locator('[data-testid="lineup-list"] .position-name').first()).toContainText(
      'First Base'
    );
  });

  test('should allow substitution cancellation', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Select player
    await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);

    // Cancel substitution
    await page.click('button[aria-label*="Cancel substitution"]');

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Lineup should remain unchanged
    await expect(page.locator('[data-testid="lineup-list"] .player-name').first()).toContainText(
      SUBSTITUTION_TEST_DATA.activePlayer.name
    );
  });

  test('should handle substitution errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/substitution/**', route => {
      void route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Substitution failed due to server error' }),
      });
    });

    await openSubstitutionDialog(page);

    // Select player and attempt substitution
    await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);
    await page.click('button[aria-label*="Confirm substitution"]');

    // Should display error message
    await expect(page.locator('[role="alert"].error-message')).toContainText(
      'Substitution failed due to server error'
    );

    // Dialog should remain open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // User should be able to retry
    await expect(page.locator('button[aria-label*="Confirm substitution"]')).toBeEnabled();
  });
});

test.describe('Substitution Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupSubstitutionTest(page);
  });

  test('should maintain focus during substitution workflow', async ({ page }) => {
    // Open dialog
    await openSubstitutionDialog(page);

    // First focusable element should be close button
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Close dialog');

    // Tab through dialog elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('type', 'radio');

    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Close dialog');
  });

  test('should provide proper ARIA announcements', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Dialog should have proper ARIA attributes
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');

    // Radio group should have proper labeling
    const radioGroup = page.locator('[role="radiogroup"]');
    await expect(radioGroup).toHaveAttribute('aria-label', 'Select replacement player');
    await expect(radioGroup).toHaveAttribute('aria-required', 'true');

    // Form fields should have proper labels
    await expect(page.locator('#position-select')).toHaveAttribute(
      'aria-describedby',
      'position-help'
    );
  });

  test('should handle keyboard navigation in substitution dialog', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Escape should close dialog
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // Re-open dialog
    await openSubstitutionDialog(page);

    // Arrow keys should navigate radio options
    await page.keyboard.press('Tab'); // Focus first radio
    await page.keyboard.press('ArrowDown'); // Move to next radio

    const focusedRadio = page.locator(':focus');
    await expect(focusedRadio).toHaveAttribute('type', 'radio');

    // Space should select radio option
    await page.keyboard.press(' ');
    await expect(focusedRadio).toBeChecked();
  });

  test('should provide clear error announcements', async ({ page }) => {
    // Mock validation error
    await page.evaluate(() => {
      const gameState = JSON.parse(sessionStorage.getItem('gameState') || '{}');
      gameState.homeTeam.bench[0].ineligible = true;
      gameState.homeTeam.bench[0].ineligibilityReason = 'Player is injured';
      sessionStorage.setItem('gameState', JSON.stringify(gameState));
    });

    await page.reload();
    await openSubstitutionDialog(page);

    // Select ineligible player
    await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);

    // Error should be announced via live region
    const errorAlert = page.locator('[role="alert"][aria-live="polite"]');
    await expect(errorAlert).toContainText('Substitution not allowed: Player is injured');
  });
});

test.describe('Substitution Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupSubstitutionTest(page);
  });

  test('should work on mobile devices', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Dialog should be mobile-responsive
    const dialog = page.locator('.substitution-dialog');
    await expect(dialog).toBeVisible();

    // Buttons should be touch-friendly
    const confirmButton = page.locator('button[aria-label*="Confirm substitution"]');
    const boundingBox = await confirmButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(48);

    // Player options should be touch-friendly
    const playerOption = page.locator('.player-option').first();
    const optionBox = await playerOption.boundingBox();
    expect(optionBox?.height).toBeGreaterThanOrEqual(48);
  });

  test('should handle touch interactions', async ({ page }) => {
    await openSubstitutionDialog(page);

    // Touch tap should select player
    const playerOption = page.locator(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);
    await playerOption.tap();
    await expect(playerOption).toBeChecked();

    // Touch tap on overlay should close dialog
    await page.locator('.dialog-overlay').tap();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });
});

test.describe('Substitution Performance', () => {
  test('should complete substitution within time budget', async ({ page }) => {
    const startTime = Date.now();

    await setupSubstitutionTest(page);
    await openSubstitutionDialog(page);

    // Complete substitution
    await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);
    await page.click('button[aria-label*="Confirm substitution"]');

    // Wait for completion
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within 3 seconds
    expect(duration).toBeLessThan(3000);
  });

  test('should handle multiple rapid substitutions', async ({ page }) => {
    await setupSubstitutionTest(page);

    // Perform multiple substitutions rapidly
    for (let i = 0; i < 2; i++) {
      await openSubstitutionDialog(page, i + 1);
      await page.click(`input[value="${SUBSTITUTION_TEST_DATA.benchPlayer.id}"]`);
      await page.click('button[aria-label*="Confirm substitution"]');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    }

    // All substitutions should complete successfully
    await expect(page.locator('[data-testid="lineup-list"] [role="listitem"]')).toHaveCount(2);
  });
});
