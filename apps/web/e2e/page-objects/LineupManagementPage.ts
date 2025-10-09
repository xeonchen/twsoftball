/**
 * @file LineupManagementPage Page Object Model
 *
 * Page object model for the Lineup Management page.
 * Encapsulates all selectors and interactions for E2E testing.
 *
 * @remarks
 * Page Object Model Pattern:
 * - Encapsulates page structure and interactions
 * - Provides reusable methods for common workflows
 * - Abstracts DOM selectors from test logic
 * - Improves test maintainability and readability
 * - Type-safe interactions with TypeScript
 *
 * Architecture:
 * - Follows Playwright best practices for page objects
 * - Uses data-testid attributes for stable selectors
 * - Provides semantic method names for test clarity
 * - Supports accessibility testing with ARIA selectors
 * - Includes wait strategies for reliable testing
 *
 * Usage Patterns:
 * - Create instance in test setup
 * - Chain method calls for workflows
 * - Use semantic methods for assertions
 * - Leverage TypeScript for type safety
 *
 * @example
 * ```typescript
 * import { LineupManagementPage } from '../page-objects/LineupManagementPage';
 *
 * test('should display lineup', async ({ page }) => {
 *   const lineupPage = new LineupManagementPage(page);
 *   await lineupPage.goto();
 *   await lineupPage.waitForLoad();
 *
 *   const players = await lineupPage.getLineupList();
 *   expect(players).toHaveLength(10);
 * });
 * ```
 */

import type { Locator, Page } from '@playwright/test';

/**
 * Player information returned from lineup list
 */
export interface LineupPlayerInfo {
  /** Player name */
  name: string;
  /** Jersey number */
  jersey: string;
  /** Field position */
  position: string;
  /** Batting slot number */
  battingSlot: string;
}

/**
 * Substitution dialog information
 */
export interface SubstitutionDialogInfo {
  /** Dialog title */
  title: string;
  /** Current player being substituted */
  currentPlayer: string;
  /** Available bench players */
  availablePlayers: string[];
}

/**
 * LineupManagementPage - Page object for lineup management interface
 *
 * @remarks
 * Encapsulates all interactions with the lineup management page,
 * including navigation, lineup viewing, and substitution workflows.
 *
 * Key Responsibilities:
 * - Page navigation and initialization
 * - Lineup data retrieval and validation
 * - Substitution dialog interactions
 * - Loading and error state handling
 * - Accessibility support
 *
 * Design Principles:
 * - Single Responsibility: Each method performs one clear action
 * - Abstraction: Hides implementation details from tests
 * - Reusability: Methods can be composed for complex workflows
 * - Maintainability: Centralized selector management
 */
export class LineupManagementPage {
  // ==================== Core Selectors ====================

  /** Back button */
  private readonly backButton: Locator;

  /** Lineup editor component */
  private readonly lineupEditor: Locator;

  /** Lineup title heading */
  private readonly lineupTitle: Locator;

  /** Lineup list container */
  private readonly lineupList: Locator;

  /** Individual lineup slots (list items) */
  private readonly lineupSlots: Locator;

  /** Loading spinner */
  private readonly loadingSpinner: Locator;

  /** Error container */
  private readonly errorContainer: Locator;

  /** Empty state container */
  private readonly emptyState: Locator;

  // ==================== Substitution Dialog Selectors ====================

  /** Substitution dialog */
  private readonly substitutionDialog: Locator;

  /** Dialog title */
  private readonly dialogTitle: Locator;

  /** Dialog description */
  private readonly dialogDescription: Locator;

  /** Dialog close button */
  private readonly dialogCloseButton: Locator;

  /** Substitution confirm button */
  private readonly confirmButton: Locator;

  /** Substitution cancel button */
  private readonly cancelButton: Locator;

  /** Player selection radio group */
  private readonly playerRadioGroup: Locator;

  /** Position select dropdown */
  private readonly positionSelect: Locator;

  /**
   * Creates a new LineupManagementPage instance
   *
   * @param page - Playwright page instance
   */
  constructor(private readonly page: Page) {
    // Initialize core selectors
    this.backButton = page.locator('[data-testid="back-button"]');
    this.lineupEditor = page.locator('[data-testid="lineup-editor"]');
    this.lineupTitle = page.locator('h1#lineup-title');
    this.lineupList = page.locator('[data-testid="lineup-list"]');
    this.lineupSlots = this.lineupList.locator('[role="listitem"]');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.errorContainer = page.locator('.error-container');
    this.emptyState = page.locator('.empty-state');

    // Initialize substitution dialog selectors
    this.substitutionDialog = page.locator('[role="dialog"][aria-modal="true"]');
    this.dialogTitle = page.locator('#dialog-title');
    this.dialogDescription = page.locator('#dialog-description');
    this.dialogCloseButton = page.locator('[aria-label="Close dialog"]');
    this.confirmButton = page.locator('button[aria-label*="Confirm substitution"]');
    this.cancelButton = page.locator('button[aria-label*="Cancel substitution"]');
    this.playerRadioGroup = page.locator('[role="radiogroup"]');
    this.positionSelect = page.locator('#position-select');
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to the lineup management page
   *
   * @param gameId - Optional game ID to navigate to specific game
   *
   * @remarks
   * Navigates to the lineup management page URL and waits for
   * network to be idle before returning.
   *
   * @example
   * ```typescript
   * await lineupPage.goto();
   * // Or with specific game
   * await lineupPage.goto('test-game-123');
   * ```
   */
  async goto(gameId?: string): Promise<void> {
    const url = gameId ? `/lineup?gameId=${gameId}` : '/lineup';
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Navigate back to home page
   *
   * @remarks
   * Clicks the back button and waits for navigation to complete.
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL('**/');
  }

  // ==================== Wait Methods ====================

  /**
   * Wait for the lineup editor to be fully loaded
   *
   * @remarks
   * Waits for the lineup editor component to be visible,
   * loading spinner to disappear, and lineup list to be populated.
   * Use this method after navigation to ensure page is ready for interaction.
   *
   * @example
   * ```typescript
   * await lineupPage.goto();
   * await lineupPage.waitForLoad();
   * // Now safe to interact with lineup
   * ```
   */
  async waitForLoad(): Promise<void> {
    // Wait for lineup editor to be visible
    await this.lineupEditor.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 });

    // Wait for lineup list to be populated
    await this.lineupSlots.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for loading spinner to appear
   *
   * @remarks
   * Useful for testing loading states and ensuring UI feedback
   * is shown during async operations.
   */
  async waitForLoadingSpinner(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for error state to be displayed
   *
   * @remarks
   * Waits for error container to become visible.
   * Use this when testing error scenarios.
   */
  async waitForError(): Promise<void> {
    await this.errorContainer.waitFor({ state: 'visible', timeout: 5000 });
  }

  // ==================== Lineup Data Methods ====================

  /**
   * Get the list of players currently in the lineup
   *
   * @returns Array of player information objects
   *
   * @remarks
   * Extracts player data from the lineup list for validation.
   * Each player object contains name, jersey, position, and batting slot.
   *
   * @example
   * ```typescript
   * const players = await lineupPage.getLineupList();
   * expect(players[0].name).toBe('John Smith');
   * expect(players[0].battingSlot).toBe('1');
   * ```
   */
  async getLineupList(): Promise<LineupPlayerInfo[]> {
    const count = await this.lineupSlots.count();
    const players: LineupPlayerInfo[] = [];

    for (let i = 0; i < count; i++) {
      const slot = this.lineupSlots.nth(i);
      const name = await slot.locator('.player-name').textContent();
      const jersey = await slot.locator('.jersey-number').textContent();
      const position = await slot.locator('.position-name').textContent();
      const battingSlot = await slot.locator('.batting-number').textContent();

      players.push({
        name: name?.trim() ?? '',
        jersey: jersey?.trim() ?? '',
        position: position?.trim() ?? '',
        battingSlot: battingSlot?.trim().replace('.', '') ?? '',
      });
    }

    return players;
  }

  /**
   * Get the number of players in the lineup
   *
   * @returns Count of lineup slots
   *
   * @example
   * ```typescript
   * const count = await lineupPage.getLineupCount();
   * expect(count).toBe(10);
   * ```
   */
  async getLineupCount(): Promise<number> {
    return await this.lineupSlots.count();
  }

  /**
   * Get player information by batting slot
   *
   * @param slot - Batting slot number (1-based)
   * @returns Player information or null if not found
   *
   * @example
   * ```typescript
   * const leadoff = await lineupPage.getPlayerBySlot(1);
   * expect(leadoff?.name).toBe('John Smith');
   * ```
   */
  async getPlayerBySlot(slot: number): Promise<LineupPlayerInfo | null> {
    const players = await this.getLineupList();
    return players.find(p => p.battingSlot === slot.toString()) ?? null;
  }

  /**
   * Get player information by name
   *
   * @param name - Player name to search for
   * @returns Player information or null if not found
   *
   * @example
   * ```typescript
   * const player = await lineupPage.getPlayerByName('John Smith');
   * expect(player?.position).toBe('Pitcher');
   * ```
   */
  async getPlayerByName(name: string): Promise<LineupPlayerInfo | null> {
    const players = await this.getLineupList();
    return players.find(p => p.name.includes(name)) ?? null;
  }

  // ==================== Substitution Methods ====================

  /**
   * Click substitute button for a player by name
   *
   * @param playerName - Name of player to substitute
   *
   * @remarks
   * Finds the player in the lineup and clicks their substitute button.
   * Opens the substitution dialog.
   *
   * @example
   * ```typescript
   * await lineupPage.clickSubstitute('John Smith');
   * // Substitution dialog should now be open
   * ```
   */
  async clickSubstitute(playerName: string): Promise<void> {
    // Find the player slot containing the name
    const playerSlot = this.lineupSlots.filter({
      has: this.page.locator('.player-name', { hasText: playerName }),
    });

    // Click the substitute button within that slot
    const substituteButton = playerSlot.locator('button[aria-label*="Substitute"]');
    await substituteButton.click();
  }

  /**
   * Click substitute button by batting slot
   *
   * @param slot - Batting slot number (1-based)
   *
   * @remarks
   * Clicks the substitute button for the player at the specified slot.
   *
   * @example
   * ```typescript
   * await lineupPage.clickSubstituteBySlot(1);
   * ```
   */
  async clickSubstituteBySlot(slot: number): Promise<void> {
    const slotElement = this.lineupSlots.nth(slot - 1);
    const substituteButton = slotElement.locator('button[aria-label*="Substitute"]');
    await substituteButton.click();
  }

  /**
   * Get all substitute buttons
   *
   * @returns Array of substitute button locators
   *
   * @remarks
   * Useful for testing that all lineup slots have substitute buttons.
   */
  getSubstituteButtons(): Locator {
    return this.lineupSlots.locator('button[aria-label*="Substitute"]');
  }

  // ==================== Substitution Dialog Methods ====================

  /**
   * Wait for substitution dialog to open
   *
   * @remarks
   * Waits for the modal dialog to become visible.
   * Use after clicking a substitute button.
   *
   * @example
   * ```typescript
   * await lineupPage.clickSubstitute('John Smith');
   * await lineupPage.waitForSubstitutionDialog();
   * ```
   */
  async waitForSubstitutionDialog(): Promise<void> {
    await this.substitutionDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for substitution dialog to close
   *
   * @remarks
   * Waits for the modal dialog to be hidden.
   * Use after confirming or canceling a substitution.
   */
  async waitForDialogClose(): Promise<void> {
    await this.substitutionDialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Get substitution dialog information
   *
   * @returns Dialog information including title and available players
   *
   * @remarks
   * Extracts dialog content for validation in tests.
   *
   * @example
   * ```typescript
   * const dialogInfo = await lineupPage.getSubstitutionDialogInfo();
   * expect(dialogInfo.title).toBe('Make Substitution');
   * expect(dialogInfo.availablePlayers).toContain('Tom Wilson');
   * ```
   */
  async getSubstitutionDialogInfo(): Promise<SubstitutionDialogInfo> {
    const title = (await this.dialogTitle.textContent())?.trim() ?? '';
    const currentPlayer = (await this.dialogDescription.textContent())?.trim() ?? '';

    // Get available players from radio options
    const radioInputs = this.playerRadioGroup.locator('input[type="radio"]');
    const count = await radioInputs.count();
    const availablePlayers: string[] = [];

    for (let i = 0; i < count; i++) {
      const label = await radioInputs.nth(i).locator('..').textContent();
      if (label) {
        availablePlayers.push(label.trim());
      }
    }

    return {
      title,
      currentPlayer,
      availablePlayers,
    };
  }

  /**
   * Select a player for substitution by player ID
   *
   * @param playerId - ID of the player to select
   *
   * @remarks
   * Clicks the radio button for the specified player.
   *
   * @example
   * ```typescript
   * await lineupPage.selectPlayerForSubstitution('bench-1');
   * ```
   */
  async selectPlayerForSubstitution(playerId: string): Promise<void> {
    const radio = this.page.locator(`input[value="${playerId}"]`);
    await radio.click();
  }

  /**
   * Select a player for substitution by name
   *
   * @param playerName - Name of the player to select
   *
   * @remarks
   * Finds and clicks the radio button for the player with matching name.
   */
  async selectPlayerByName(playerName: string): Promise<void> {
    const radio = this.playerRadioGroup.locator('label', { hasText: playerName });
    await radio.click();
  }

  /**
   * Select a position for the substitution
   *
   * @param position - Field position name
   *
   * @remarks
   * Selects the specified position from the position dropdown.
   *
   * @example
   * ```typescript
   * await lineupPage.selectPosition('First Base');
   * ```
   */
  async selectPosition(position: string): Promise<void> {
    await this.positionSelect.selectOption(position);
  }

  /**
   * Get the currently selected position
   *
   * @returns Selected position value
   */
  async getSelectedPosition(): Promise<string> {
    return await this.positionSelect.inputValue();
  }

  /**
   * Confirm the substitution
   *
   * @remarks
   * Clicks the confirm button and waits for dialog to close.
   *
   * @example
   * ```typescript
   * await lineupPage.selectPlayerForSubstitution('bench-1');
   * await lineupPage.confirmSubstitution();
   * await lineupPage.waitForDialogClose();
   * ```
   */
  async confirmSubstitution(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Cancel the substitution
   *
   * @remarks
   * Clicks the cancel button and waits for dialog to close.
   */
  async cancelSubstitution(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Close the substitution dialog using the close button
   *
   * @remarks
   * Clicks the X button to close the dialog without making changes.
   */
  async closeDialog(): Promise<void> {
    await this.dialogCloseButton.click();
  }

  /**
   * Check if confirm button is enabled
   *
   * @returns True if button is enabled, false otherwise
   *
   * @remarks
   * Useful for validating that substitution is allowed.
   */
  async isConfirmButtonEnabled(): Promise<boolean> {
    return await this.confirmButton.isEnabled();
  }

  // ==================== State Verification Methods ====================

  /**
   * Check if page is in loading state
   *
   * @returns True if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Check if page is showing error state
   *
   * @returns True if error container is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorContainer.isVisible();
  }

  /**
   * Get error message text
   *
   * @returns Error message or null if no error
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorContainer.textContent();
    }
    return null;
  }

  /**
   * Check if page is showing empty state
   *
   * @returns True if empty state is visible
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if substitution dialog is open
   *
   * @returns True if dialog is visible
   */
  async isSubstitutionDialogOpen(): Promise<boolean> {
    return await this.substitutionDialog.isVisible();
  }

  // ==================== Accessibility Methods ====================

  /**
   * Get page heading text
   *
   * @returns Heading text content
   *
   * @remarks
   * Verifies the main page heading for accessibility and content validation.
   */
  async getHeadingText(): Promise<string> {
    return (await this.lineupTitle.textContent())?.trim() ?? '';
  }

  /**
   * Verify page has proper ARIA landmarks
   *
   * @returns True if all required landmarks are present
   *
   * @remarks
   * Checks that page has proper accessibility structure.
   */
  async hasProperLandmarks(): Promise<boolean> {
    const region = await this.page
      .locator('[role="region"][aria-label="Lineup editor"]')
      .isVisible();
    const list = await this.page
      .locator('[role="list"][aria-labelledby="lineup-title"]')
      .isVisible();

    return region && list;
  }

  /**
   * Get all ARIA labels from substitute buttons
   *
   * @returns Array of ARIA label values
   *
   * @remarks
   * Useful for verifying proper accessibility labeling.
   */
  async getSubstituteButtonLabels(): Promise<string[]> {
    const buttons = this.getSubstituteButtons();
    const count = await buttons.count();
    const labels: string[] = [];

    for (let i = 0; i < count; i++) {
      const label = await buttons.nth(i).getAttribute('aria-label');
      if (label) {
        labels.push(label);
      }
    }

    return labels;
  }
}
