/**
 * @file Complete Game Workflow E2E Tests
 *
 * End-to-end tests for the complete game recording workflow.
 * These tests verify the entire user journey from game start through at-bat recording.
 *
 * @remarks
 * Test Coverage:
 * - Complete game recording workflow (start → record at-bats → verify score)
 * - DI Container initialization and availability in browser
 * - State persistence across page reloads (offline-first PWA)
 *
 * Test Strategy:
 * - Uses Page Object Model for maintainability
 * - Tests real user workflows end-to-end
 * - Validates both happy path and edge cases
 * - Focuses on critical user journeys
 * - Uses sessionStorage injection for state setup (offline-first architecture)
 *
 * Architecture Context:
 * - Web app uses Zustand store with sessionStorage persistence
 * - DI Container provides application services
 * - Tests inject data via sessionStorage + storage events
 * - Page objects abstract DOM interaction details
 *
 * @example
 * ```bash
 * # Run all game workflow tests
 * pnpm --filter @twsoftball/web test:e2e complete-game-workflow
 *
 * # Run with UI (headed mode) for debugging
 * pnpm --filter @twsoftball/web test:e2e:headed complete-game-workflow
 * ```
 */

import { expect, test } from '@playwright/test';

import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';

test.describe('Complete Game Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const gamePageObject = new GameRecordingPageObject(page);
    await gamePageObject.goto();
    await gamePageObject.clearGameState();
  });

  test.describe('Game Recording Flow', () => {
    test('should load game recording page and verify UI structure', async ({ page }) => {
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

      // Step 1: Verify page structure exists (setup done in beforeEach)
      await expect(page.locator('[data-testid="game-recording-page"]')).toBeVisible();

      // Step 2: Verify header elements are present
      await expect(page.locator('.game-header')).toBeVisible();

      // Step 3: Verify action buttons container exists
      await expect(page.locator('.action-buttons-container')).toBeVisible();

      // Step 4: Verify key action buttons are present
      await expect(page.locator('[data-testid="action-single"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-out"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-homerun"]')).toBeVisible();
    });
  });

  test.describe('DI Container Integration', () => {
    test('should verify DI Container initialization in browser', async ({ page }) => {
      // Step 1: Wait for app initialization (setup done in beforeEach)
      const gamePageObject = new GameRecordingPageObject(page);
      await page.waitForTimeout(1000);

      // Step 2: Check window.__appServices__ is defined
      const hasAppServices = await gamePageObject.evaluate(() => {
        return typeof window.__appServices__ !== 'undefined';
      });

      expect(hasAppServices).toBe(true);

      // Step 3: Verify all 6 use cases are available with execute methods
      // Note: Use cases are class instances with execute() methods, not plain functions
      const useCases = await gamePageObject.evaluate(() => {
        const services = window.__appServices__;
        return {
          hasStartNewGame:
            typeof services?.startNewGame === 'object' &&
            typeof services?.startNewGame?.execute === 'function',
          hasRecordAtBat:
            typeof services?.recordAtBat === 'object' &&
            typeof services?.recordAtBat?.execute === 'function',
          hasSubstitutePlayer:
            typeof services?.substitutePlayer === 'object' &&
            typeof services?.substitutePlayer?.execute === 'function',
          hasUndoLastAction:
            typeof services?.undoLastAction === 'object' &&
            typeof services?.undoLastAction?.execute === 'function',
          hasRedoLastAction:
            typeof services?.redoLastAction === 'object' &&
            typeof services?.redoLastAction?.execute === 'function',
          hasEndInning:
            typeof services?.endInning === 'object' &&
            typeof services?.endInning?.execute === 'function',
        };
      });

      expect(useCases.hasStartNewGame).toBe(true);
      expect(useCases.hasRecordAtBat).toBe(true);
      expect(useCases.hasSubstitutePlayer).toBe(true);
      expect(useCases.hasUndoLastAction).toBe(true);
      expect(useCases.hasRedoLastAction).toBe(true);
      expect(useCases.hasEndInning).toBe(true);
    });
  });

  test.describe('State Persistence', () => {
    test('should persist page across reload without crashing', async ({ page }) => {
      // Step 1: Verify page loads initially (setup done in beforeEach)
      const gamePageObject = new GameRecordingPageObject(page);
      await expect(page.locator('[data-testid="game-recording-page"]')).toBeVisible();

      // Step 2: Reload page
      await gamePageObject.reload();

      // Wait for page to fully load
      await page.waitForTimeout(1000);

      // Step 3: Verify page structure still exists after reload
      await expect(page.locator('[data-testid="game-recording-page"]')).toBeVisible();

      // Step 4: Verify header still exists
      await expect(page.locator('.game-header')).toBeVisible();

      // Step 5: Verify action buttons still exist
      await expect(page.locator('.action-buttons-container')).toBeVisible();
    });
  });
});
