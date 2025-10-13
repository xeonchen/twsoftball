/**
 * @file GameSetupConfirmPage Page Object Model
 *
 * Page object model for the Game Setup Confirm page (Step 3).
 * Encapsulates all selectors and interactions for E2E testing.
 *
 * @remarks
 * Page Object Model Pattern:
 * - Encapsulates page structure and interactions
 * - Provides reusable methods for game confirmation
 * - Abstracts DOM selectors from test logic
 * - Improves test maintainability and readability
 * - Type-safe interactions with TypeScript
 *
 * Architecture:
 * - Follows Playwright best practices for page objects
 * - Uses data-testid attributes for stable selectors
 * - Provides semantic method names for test clarity
 * - Includes wait strategies for reliable testing
 *
 * @example
 * ```typescript
 * import { GameSetupConfirmPage } from '../page-objects/GameSetupConfirmPage';
 *
 * test('should start game', async ({ page }) => {
 *   const confirmPage = new GameSetupConfirmPage(page);
 *   await confirmPage.goto();
 *   expect(await confirmPage.isStartGameEnabled()).toBe(true);
 *   await confirmPage.clickStartGame();
 * });
 * ```
 */

import type { Locator, Page } from '@playwright/test';

/**
 * Lineup player information returned from lineup summary
 */
export interface LineupSummaryPlayer {
  /** Batting order number */
  battingOrder: string;
  /** Jersey number */
  jersey: string;
  /** Player name */
  name: string;
  /** Field position */
  position: string;
}

/**
 * GameSetupConfirmPage - Page object for game setup confirmation (Step 3)
 *
 * @remarks
 * Encapsulates all interactions with the confirmation page,
 * including lineup review, validation checking, and game start.
 *
 * Key Responsibilities:
 * - Page navigation and initialization
 * - Lineup summary retrieval
 * - Validation error checking
 * - Start game button interaction
 * - Navigation to game recording page
 */
export class GameSetupConfirmPage {
  // ==================== Core Selectors ====================

  /** Start game button */
  private readonly startGameButton: Locator;

  /** Back button */
  private readonly backButton: Locator;

  /** Validation error message */
  private readonly validationError: Locator;

  /** Loading indicator */
  private readonly loadingIndicator: Locator;

  /** Success transition message */
  private readonly successTransition: Locator;

  /** Infrastructure error banner */
  private readonly infrastructureErrorBanner: Locator;

  /** Error message */
  private readonly errorMessage: Locator;

  /** Lineup items */
  private readonly lineupItems: Locator;

  /**
   * Creates a new GameSetupConfirmPage instance
   *
   * @param page - Playwright page instance
   */
  constructor(private readonly page: Page) {
    // Initialize selectors
    this.startGameButton = page.locator('[data-testid="start-game-button"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.validationError = page.locator('[data-testid="validation-error"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.successTransition = page.locator('[data-testid="success-transition"]');
    this.infrastructureErrorBanner = page.locator('[data-testid="infrastructure-error-banner"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.lineupItems = page.locator('[data-testid^="lineup-item-"]');
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to the game setup confirm page
   *
   * @remarks
   * Navigates to the confirm page URL and waits for
   * network to be idle before returning.
   *
   * @example
   * ```typescript
   * await confirmPage.goto();
   * ```
   */
  async goto(): Promise<void> {
    await this.page.goto('/game/setup/confirm', { waitUntil: 'networkidle' });
  }

  /**
   * Navigate back to lineup page
   *
   * @remarks
   * Clicks the back button and waits for navigation to complete.
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL('**/game/setup/lineup');
  }

  // ==================== Lineup Summary Methods ====================

  /**
   * Get the lineup summary from the confirmation page
   *
   * @returns Array of player information objects
   *
   * @remarks
   * Extracts the lineup information displayed on the
   * confirmation page for validation in tests.
   *
   * @example
   * ```typescript
   * const lineup = await confirmPage.getLineupSummary();
   * expect(lineup).toHaveLength(10);
   * expect(lineup[0].name).toBe('Mike Chen');
   * ```
   */
  async getLineupSummary(): Promise<LineupSummaryPlayer[]> {
    const count = await this.lineupItems.count();
    const players: LineupSummaryPlayer[] = [];

    for (let i = 0; i < count; i++) {
      const item = this.lineupItems.nth(i);
      const battingOrder = await item.locator('.batting-order').textContent();
      const jersey = await item.locator('.player-jersey').textContent();
      const name = await item.locator('.player-name').textContent();
      const position = await item.locator('.player-position').textContent();

      players.push({
        battingOrder: battingOrder?.trim().replace('.', '') ?? '',
        jersey: jersey?.trim().replace('#', '') ?? '',
        name: name?.trim() ?? '',
        position: position?.trim() ?? '',
      });
    }

    return players;
  }

  /**
   * Get the number of players in the lineup summary
   *
   * @returns Count of lineup items
   */
  async getLineupCount(): Promise<number> {
    return await this.lineupItems.count();
  }

  // ==================== Validation Methods ====================

  /**
   * Check if the Start Game button is enabled
   *
   * @returns True if button is enabled
   *
   * @remarks
   * This is the key method for detecting the bug reported by the user.
   * The Start Game button should be enabled when there are 9+ valid
   * players in the lineup.
   *
   * @example
   * ```typescript
   * const isEnabled = await confirmPage.isStartGameEnabled();
   * expect(isEnabled).toBe(true);
   * ```
   */
  async isStartGameEnabled(): Promise<boolean> {
    return await this.startGameButton.isEnabled();
  }

  /**
   * Check if there is a validation error
   *
   * @returns True if validation error is visible
   */
  async hasValidationError(): Promise<boolean> {
    return await this.validationError.isVisible();
  }

  /**
   * Get validation error message
   *
   * @returns Error message or null if no error
   */
  async getValidationError(): Promise<string | null> {
    if (await this.hasValidationError()) {
      return await this.validationError.textContent();
    }
    return null;
  }

  /**
   * Check if there is an infrastructure error
   *
   * @returns True if error banner is visible
   */
  async hasInfrastructureError(): Promise<boolean> {
    return await this.infrastructureErrorBanner.isVisible();
  }

  /**
   * Get infrastructure error message
   *
   * @returns Error message or null if no error
   */
  async getInfrastructureError(): Promise<string | null> {
    if (await this.hasInfrastructureError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  // ==================== Action Methods ====================

  /**
   * Click the Start Game button
   *
   * @remarks
   * Clicks the Start Game button and waits for the game
   * to be created. This may trigger navigation to the
   * game recording page or show an error.
   *
   * @example
   * ```typescript
   * await confirmPage.clickStartGame();
   * await confirmPage.waitForGameStart();
   * ```
   */
  async clickStartGame(): Promise<void> {
    await this.startGameButton.click();
  }

  /**
   * Wait for game to start and navigate to recording page
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   *
   * @remarks
   * Waits for successful game creation and navigation to the game recording page.
   *
   * Note: We don't wait for the success-transition element because it appears
   * only briefly (<100ms) before navigation happens. The game creation triggers
   * an immediate navigation via useEffect, making the transition too fast to
   * reliably observe. This is expected behavior - the navigation itself confirms
   * successful game start.
   *
   * @example
   * ```typescript
   * await confirmPage.clickStartGame();
   * await confirmPage.waitForGameStart();
   * expect(page.url()).toContain('/game/');
   * expect(page.url()).toContain('/record');
   * ```
   */
  async waitForGameStart(timeout = 10000): Promise<void> {
    // Wait for navigation to game recording page
    // The successful navigation confirms the game was created
    await this.page.waitForURL('**/game/*/record', { timeout });
  }

  /**
   * Check if the page is in loading state
   *
   * @returns True if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  /**
   * Check if success transition is shown
   *
   * @returns True if success message is visible
   */
  async isSuccessTransitionShown(): Promise<boolean> {
    return await this.successTransition.isVisible();
  }

  // ==================== Wait Methods ====================

  /**
   * Wait for page to be fully loaded
   *
   * @remarks
   * Waits for the page to be visible and ready for interaction.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-setup-confirm-page"]', {
      state: 'visible',
    });
  }

  /**
   * Wait for loading to complete
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   */
  async waitForLoadingComplete(timeout = 10000): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }
}
