/**
 * @file Lineup Editor E2E Tests
 *
 * End-to-end tests for lineup management functionality.
 * Tests critical user workflows for managing team lineups.
 *
 * @remarks
 * Test Coverage:
 * - Lineup display and navigation
 * - Player substitution workflows
 * - Position management
 * - Error handling and validation
 * - Mobile responsiveness
 * - Accessibility compliance
 *
 * Test Strategy:
 * - Test happy path scenarios
 * - Test edge cases and error conditions
 * - Verify accessibility standards
 * - Test mobile-first responsive design
 * - Performance and loading state validation
 *
 * @example
 * ```bash
 * # Run lineup management tests
 * pnpm exec playwright test lineup-management/lineup-editor.spec.ts
 *
 * # Run with specific browser
 * pnpm exec playwright test lineup-management/lineup-editor.spec.ts --project=chromium
 * ```
 */

import { test, expect, Page } from '@playwright/test';

// Test data and utilities
const TEST_GAME_ID = 'test-game-123';
const TEST_LINEUP_DATA = {
  player1: { id: 'player-1', name: 'John Smith', jersey: 12, position: 'Pitcher' },
  player2: { id: 'player-2', name: 'Jane Doe', jersey: 24, position: 'Catcher' },
  player3: { id: 'player-3', name: 'Mike Johnson', jersey: 7, position: 'First Base' },
  benchPlayer1: { id: 'bench-1', name: 'Tom Wilson', jersey: 15 },
  benchPlayer2: { id: 'bench-2', name: 'Sarah Lee', jersey: 8 },
};

/**
 * Setup test environment with game and lineup data
 */
async function setupTestGame(page: Page) {
  // Navigate to the app
  await page.goto('/');

  // Wait for app to be ready
  await page.waitForSelector('[data-testid="app-ready"]', { timeout: 10000 });

  // Setup test game data
  await page.evaluate(
    gameData => {
      // Mock game data in localStorage or sessionStorage
      const testGameData = {
        gameId: gameData.gameId,
        homeTeam: { name: 'Test Team', players: Object.values(gameData.lineup) },
        visitingTeam: { name: 'Opponent Team' },
        lineup: gameData.lineup,
        bench: gameData.bench,
      };

      sessionStorage.setItem('testGameData', JSON.stringify(testGameData));
    },
    {
      gameId: TEST_GAME_ID,
      lineup: Object.fromEntries(
        Object.entries(TEST_LINEUP_DATA)
          .filter(([key]) => !key.includes('bench'))
          .map(([key, value]) => [key, value])
      ),
      bench: Object.fromEntries(
        Object.entries(TEST_LINEUP_DATA)
          .filter(([key]) => key.includes('bench'))
          .map(([key, value]) => [key, value])
      ),
    }
  );

  // Navigate to lineup management
  await page.click('[data-testid="lineup-management-nav"]');
  await page.waitForURL('**/lineup');
}

/**
 * Helper to wait for component to be fully loaded
 */
async function waitForLineupEditor(page: Page) {
  // Wait for lineup editor to load
  await page.waitForSelector('[data-testid="lineup-editor"]', { timeout: 10000 });

  // Wait for loading spinner to disappear
  await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 5000 });

  // Wait for lineup list to be populated
  await page.waitForSelector('[data-testid="lineup-list"] [role="listitem"]', { timeout: 5000 });
}

test.describe('Lineup Editor', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestGame(page);
  });

  test('should display lineup editor with current lineup', async ({ page }) => {
    await waitForLineupEditor(page);

    // Verify lineup editor is displayed
    await expect(page.locator('[data-testid="lineup-editor"]')).toBeVisible();

    // Verify lineup title (use specific h1 with id)
    await expect(page.locator('h1#lineup-title')).toContainText('Current Lineup');

    // Verify batting order is displayed
    await expect(page.locator('[data-testid="batting-order-label"]')).toContainText(
      'Batting Order'
    );

    // Verify all lineup slots are displayed
    const lineupSlots = page.locator('[data-testid="lineup-list"] [role="listitem"]');
    await expect(lineupSlots).toHaveCount(3); // Based on test data

    // Verify first player information
    const firstPlayer = lineupSlots.first();
    await expect(firstPlayer.locator('.batting-number')).toContainText('1.');
    await expect(firstPlayer.locator('.player-name')).toContainText('Player player-1');
    await expect(firstPlayer.locator('.position-name')).toContainText('Pitcher');
  });

  test('should handle loading states properly', async ({ page }) => {
    // Start navigation
    await page.goto('/lineup');

    // Should show loading spinner initially
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('[role="status"][aria-label*="Loading"]')).toBeVisible();

    // Wait for loading to complete
    await waitForLineupEditor(page);

    // Loading spinner should be hidden
    await expect(page.locator('.loading-spinner')).toBeHidden();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/lineup/**', route => {
      void route.abort('failed');
    });

    await page.goto('/lineup');

    // Should display error state
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('.error-container')).toContainText('Error Loading Lineup');

    // Should have retry button
    const retryButton = page.locator('button[aria-label*="Retry"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
  });

  test('should open substitution dialog when substitute button is clicked', async ({ page }) => {
    await waitForLineupEditor(page);

    // Click substitute button for first player
    const firstSubstituteButton = page.locator('[data-testid="lineup-list"] button').first();
    await expect(firstSubstituteButton).toContainText('Substitute');

    await firstSubstituteButton.click();

    // Verify substitution dialog opens
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
    await expect(page.locator('#dialog-title')).toContainText('Make Substitution');

    // Verify current player information is displayed
    await expect(page.locator('.current-player-info')).toContainText('Substituting player-1');

    // Verify dialog can be closed
    await page.click('[aria-label="Close dialog"]');
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  test('should display empty state when no lineup data', async ({ page }) => {
    // Clear test data
    await page.evaluate(() => {
      sessionStorage.clear();
    });

    await page.goto('/lineup');

    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('#empty-title')).toContainText('No Lineup Data Available');
    await expect(page.locator('#empty-description')).toContainText(
      'Please set up your lineup to continue'
    );
  });

  test('should be keyboard navigable', async ({ page }) => {
    await waitForLineupEditor(page);

    // Focus should start at first substitute button
    await page.keyboard.press('Tab');

    // Verify focus is on substitute button
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('aria-label', /Substitute Player/);

    // Navigate through all substitute buttons
    for (let i = 1; i < 3; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      await expect(currentFocus).toHaveAttribute('aria-label', /Substitute Player/);
    }

    // Enter should open substitution dialog
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Escape should close dialog
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });
});

test.describe('Lineup Editor Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestGame(page);
  });

  test('should meet accessibility standards', async ({ page }) => {
    await waitForLineupEditor(page);

    // Check for proper ARIA roles and labels
    await expect(page.locator('[role="region"][aria-label="Lineup editor"]')).toBeVisible();
    await expect(page.locator('[role="list"][aria-labelledby="lineup-title"]')).toBeVisible();

    // Check for proper heading hierarchy (only one h1 on the page)
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1);
    await expect(h1Elements).toHaveAttribute('id', 'lineup-title');

    // Check for proper button labels
    const substituteButtons = page.locator('button[aria-label*="Substitute"]');
    const buttonCount = await substituteButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = substituteButtons.nth(i);
      await expect(button).toHaveAttribute('aria-label');
      await expect(button).toHaveAttribute('aria-describedby');
    }

    // Check for live regions
    await expect(page.locator('[role="status"][aria-live="polite"]')).toBeVisible();
  });

  test('should work with screen reader announcements', async ({ page }) => {
    await waitForLineupEditor(page);

    // Check for screen reader content
    const srOnlyElements = page.locator('.sr-only');
    await expect(srOnlyElements.first()).toContainText(/Use Tab to navigate/);

    // Check for proper descriptions
    const playerDetails = page.locator('[id*="player-"][id*="-details"]').first();
    await expect(playerDetails).toContainText(/is batting/);
    await expect(playerDetails).toContainText(/playing/);
  });

  test('should handle focus management', async ({ page }) => {
    await waitForLineupEditor(page);

    // Test focus trap in substitution dialog
    const firstSubstituteButton = page.locator('button[aria-label*="Substitute"]').first();
    await firstSubstituteButton.click();

    // Dialog should be focused
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeFocused();

    // Tab should cycle through dialog elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Close dialog');

    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Close dialog');
  });
});

test.describe('Lineup Editor Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test.beforeEach(async ({ page }) => {
    await setupTestGame(page);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await waitForLineupEditor(page);

    // Verify mobile layout
    const lineupEditor = page.locator('[data-testid="lineup-editor"]');
    await expect(lineupEditor).toBeVisible();

    // Check that buttons are touch-friendly (min 44px)
    const substituteButtons = page.locator('.substitute-button');
    const buttonCount = await substituteButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = substituteButtons.nth(i);
      const boundingBox = await button.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    }

    // Check responsive text sizing
    const playerNames = page.locator('.player-name');
    for (let i = 0; i < (await playerNames.count()); i++) {
      await expect(playerNames.nth(i)).toBeVisible();
    }
  });

  test('should handle touch interactions', async ({ page }) => {
    await waitForLineupEditor(page);

    // Test touch tap on substitute button
    const firstSubstituteButton = page.locator('button[aria-label*="Substitute"]').first();

    // Simulate touch tap
    await firstSubstituteButton.tap();

    // Dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Test touch tap on overlay to close
    await page.locator('.dialog-overlay').tap();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });
});

test.describe('Lineup Editor Performance', () => {
  test('should load within performance budgets', async ({ page }) => {
    // Start performance measurement
    await page.goto('/lineup', { waitUntil: 'networkidle' });

    // Measure key performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance
          .getEntriesByType('paint')
          .find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance
          .getEntriesByType('paint')
          .find(entry => entry.name === 'first-contentful-paint')?.startTime,
      };
    });

    // Verify performance budgets
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // 1.5s

    console.log('Performance metrics:', performanceMetrics);
  });

  test('should handle lazy loading efficiently', async ({ page }) => {
    await page.goto('/lineup');

    // Verify lazy loading skeleton appears first
    await expect(page.locator('.lineup-editor-skeleton')).toBeVisible();

    // Wait for actual component to load
    await waitForLineupEditor(page);

    // Skeleton should be hidden
    await expect(page.locator('.lineup-editor-skeleton')).toBeHidden();

    // Component should be fully functional
    await expect(page.locator('[data-testid="lineup-editor"]')).toBeVisible();
  });
});
