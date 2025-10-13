/**
 * @file GameSetupLineupPage Page Object Model
 *
 * Page object model for the Game Setup Lineup page (Step 2).
 * Encapsulates all selectors and interactions for E2E testing.
 *
 * @remarks
 * Page Object Model Pattern:
 * - Encapsulates page structure and interactions
 * - Provides reusable methods for lineup management
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
 * import { GameSetupLineupPage } from '../page-objects/GameSetupLineupPage';
 *
 * test('should setup lineup', async ({ page }) => {
 *   const lineupPage = new GameSetupLineupPage(page);
 *   await lineupPage.goto();
 *   await lineupPage.setPlayerCount(10);
 *   await lineupPage.addPlayerFromAvailable('1');
 *   await lineupPage.clickContinue();
 * });
 * ```
 */

import type { Locator, Page } from '@playwright/test';

/**
 * GameSetupLineupPage - Page object for game setup lineup configuration (Step 2)
 *
 * @remarks
 * Encapsulates all interactions with the lineup setup page,
 * including player count selection, adding players, and validation.
 *
 * Key Responsibilities:
 * - Page navigation and initialization
 * - Player count selection
 * - Adding players from available list
 * - Manual player input
 * - Lineup validation checking
 * - Navigation to next step
 */
export class GameSetupLineupPage {
  // ==================== Core Selectors ====================

  /** Player count selector dropdown */
  private readonly playerCountSelector: Locator;

  /** Continue button */
  private readonly continueButton: Locator;

  /** Back button */
  private readonly backButton: Locator;

  /** Lineup progress indicator */
  private readonly lineupProgressIndicator: Locator;

  /** Lineup validation feedback */
  private readonly lineupValidationFeedback: Locator;

  /**
   * Creates a new GameSetupLineupPage instance
   *
   * @param page - Playwright page instance
   */
  constructor(private readonly page: Page) {
    // Initialize selectors
    this.playerCountSelector = page.locator('[data-testid="player-count-selector"]');
    this.continueButton = page.locator('[data-testid="continue-button"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.lineupProgressIndicator = page.locator('[data-testid="lineup-progress-indicator"]');
    this.lineupValidationFeedback = page.locator('[data-testid="lineup-validation-feedback"]');
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to the game setup lineup page
   *
   * @remarks
   * Navigates to the lineup setup page URL and waits for
   * network to be idle before returning.
   *
   * @example
   * ```typescript
   * await lineupPage.goto();
   * ```
   */
  async goto(): Promise<void> {
    await this.page.goto('/game/setup/lineup', { waitUntil: 'networkidle' });
  }

  /**
   * Navigate back to teams page
   *
   * @remarks
   * Clicks the back button and waits for navigation to complete.
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL('**/game/setup/teams');
  }

  // ==================== Player Count Methods ====================

  /**
   * Set the number of players in the lineup
   *
   * @param count - Number of players (9-15)
   *
   * @remarks
   * Changes the player count selector to the specified value.
   * This will adjust the number of batting slots available.
   *
   * @example
   * ```typescript
   * await lineupPage.setPlayerCount(10);
   * ```
   */
  async setPlayerCount(count: number): Promise<void> {
    await this.playerCountSelector.selectOption(count.toString());
    await this.page.waitForTimeout(300); // Wait for slots to update
  }

  /**
   * Get the current player count setting
   *
   * @returns Current player count
   */
  async getPlayerCount(): Promise<number> {
    const value = await this.playerCountSelector.inputValue();
    return parseInt(value, 10);
  }

  // ==================== Add Player Methods ====================

  /**
   * Add a player from the available list using quick-add button
   *
   * @param playerId - ID of the player to add
   *
   * @remarks
   * Clicks the quick-add (+) button for the specified player.
   * The player will be added to the first empty batting slot.
   *
   * @example
   * ```typescript
   * await lineupPage.addPlayerFromAvailable('1');
   * ```
   */
  async addPlayerFromAvailable(playerId: string): Promise<void> {
    const addButton = this.page.locator(`[data-testid="add-player-${playerId}"]`);
    await addButton.click();
    await this.page.waitForTimeout(100); // Wait for lineup to update
  }

  /**
   * Add multiple players from available list
   *
   * @param playerIds - Array of player IDs to add
   *
   * @remarks
   * Convenience method to add multiple players in sequence.
   *
   * @example
   * ```typescript
   * await lineupPage.addMultiplePlayers(['1', '2', '3', '4', '5']);
   * ```
   */
  async addMultiplePlayers(playerIds: string[]): Promise<void> {
    for (const id of playerIds) {
      await this.addPlayerFromAvailable(id);
    }
    await this.page.waitForTimeout(300); // Wait for all updates
  }

  // ==================== Manual Player Input Methods ====================

  /**
   * Fill player information manually
   *
   * @param index - Batting slot index (0-based)
   * @param name - Player name
   * @param jersey - Jersey number
   * @param position - Field position (e.g., 'P', 'C', '1B')
   *
   * @remarks
   * Manually fills in player information for a specific batting slot.
   * Use this for custom player data that's not in the available list.
   *
   * @example
   * ```typescript
   * await lineupPage.fillPlayerManually(0, 'John Doe', '12', 'P');
   * ```
   */
  async fillPlayerManually(
    index: number,
    name: string,
    jersey: string,
    position: string
  ): Promise<void> {
    // Fill name
    const nameInput = this.page.locator(`[data-testid="player-name-input-${index}"]`);
    await nameInput.fill(name);

    // Fill jersey
    const jerseyInput = this.page.locator(`[data-testid="jersey-input-${index}"]`);
    await jerseyInput.fill(jersey);

    // Select position
    const positionSelect = this.page.locator(`[data-testid="position-select-${index}"]`);
    await positionSelect.selectOption(position);

    // Wait for validation
    await this.page.waitForTimeout(500);
  }

  /**
   * Get player information at a specific slot
   *
   * @param index - Batting slot index (0-based)
   * @returns Player information object
   */
  async getPlayerAtSlot(index: number): Promise<{
    name: string;
    jersey: string;
    position: string;
  }> {
    const nameInput = this.page.locator(`[data-testid="player-name-input-${index}"]`);
    const jerseyInput = this.page.locator(`[data-testid="jersey-input-${index}"]`);
    const positionSelect = this.page.locator(`[data-testid="position-select-${index}"]`);

    return {
      name: (await nameInput.inputValue()) ?? '',
      jersey: (await jerseyInput.inputValue()) ?? '',
      position: (await positionSelect.inputValue()) ?? '',
    };
  }

  // ==================== Validation Methods ====================

  /**
   * Get the progress indicator text
   *
   * @returns Progress text (e.g., "10 of 9+ completed")
   *
   * @remarks
   * Returns the lineup progress indicator showing how many
   * valid players have been added.
   *
   * @example
   * ```typescript
   * const progress = await lineupPage.getProgressIndicator();
   * expect(progress).toContain('10 of 9+ completed');
   * ```
   */
  async getProgressIndicator(): Promise<string> {
    return (await this.lineupProgressIndicator.textContent()) ?? '';
  }

  /**
   * Check if the continue button is enabled
   *
   * @returns True if button is enabled
   *
   * @remarks
   * The continue button is only enabled when the lineup
   * has at least 9 valid players.
   *
   * @example
   * ```typescript
   * const isEnabled = await lineupPage.isContinueEnabled();
   * expect(isEnabled).toBe(true);
   * ```
   */
  async isContinueEnabled(): Promise<boolean> {
    return await this.continueButton.isEnabled();
  }

  /**
   * Check if there is validation feedback
   *
   * @returns True if validation feedback is visible
   */
  async hasValidationFeedback(): Promise<boolean> {
    return await this.lineupValidationFeedback.isVisible();
  }

  /**
   * Get validation feedback message
   *
   * @returns Validation feedback text or null if none
   */
  async getValidationFeedback(): Promise<string | null> {
    if (await this.hasValidationFeedback()) {
      return await this.lineupValidationFeedback.textContent();
    }
    return null;
  }

  /**
   * Check if a specific position is covered
   *
   * @param position - Position code (e.g., 'P', 'C', '1B')
   * @returns True if position is covered
   */
  async isPositionCovered(position: string): Promise<boolean> {
    const positionIndicator = this.page.locator(`[data-testid="position-coverage-${position}"]`);
    const className = await positionIndicator.getAttribute('class');
    return className?.includes('covered') ?? false;
  }

  // ==================== Action Methods ====================

  /**
   * Click the continue button to proceed to next step
   *
   * @remarks
   * Clicks continue and waits for navigation to confirm page.
   *
   * @example
   * ```typescript
   * await lineupPage.clickContinue();
   * await expect(page).toHaveURL('/game/setup/confirm');
   * ```
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.page.waitForURL('**/game/setup/confirm');
  }

  // ==================== Wait Methods ====================

  /**
   * Wait for page to be fully loaded
   *
   * @remarks
   * Waits for the page to be visible and ready for interaction.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-setup-lineup-page"]', {
      state: 'visible',
    });
  }

  /**
   * Wait for lineup validation to complete
   *
   * @remarks
   * Waits for the debounced validation to finish (300ms delay + buffer).
   */
  async waitForValidation(): Promise<void> {
    await this.page.waitForTimeout(500);
  }
}
