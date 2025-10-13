/**
 * @file GameSetupTeamsPage Page Object Model
 *
 * Page object model for the Game Setup Teams page (Step 1).
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
 * - Includes wait strategies for reliable testing
 *
 * @example
 * ```typescript
 * import { GameSetupTeamsPage } from '../page-objects/GameSetupTeamsPage';
 *
 * test('should complete teams setup', async ({ page }) => {
 *   const teamsPage = new GameSetupTeamsPage(page);
 *   await teamsPage.goto();
 *   await teamsPage.fillTeamNames('Warriors', 'Eagles', 'home');
 *   await teamsPage.clickContinue();
 * });
 * ```
 */

import type { Locator, Page } from '@playwright/test';

/**
 * GameSetupTeamsPage - Page object for game setup teams configuration (Step 1)
 *
 * @remarks
 * Encapsulates all interactions with the teams setup page,
 * including team name input, team selection, and navigation.
 *
 * Key Responsibilities:
 * - Page navigation and initialization
 * - Team name input and validation
 * - Our team selection
 * - Form validation state checking
 * - Navigation to next step
 */
export class GameSetupTeamsPage {
  // ==================== Core Selectors ====================

  /** Home team input field */
  private readonly homeTeamInput: Locator;

  /** Away team input field */
  private readonly awayTeamInput: Locator;

  /** Home team radio button */
  private readonly homeTeamRadio: Locator;

  /** Away team radio button */
  private readonly awayTeamRadio: Locator;

  /** Continue button */
  private readonly continueButton: Locator;

  /** Back button */
  private readonly backButton: Locator;

  /** Validation error message */
  private readonly validationError: Locator;

  /** Home team validation success indicator */
  private readonly homeTeamValidationSuccess: Locator;

  /** Away team validation success indicator */
  private readonly awayTeamValidationSuccess: Locator;

  /** Form completion progress indicator */
  private readonly formCompletionProgress: Locator;

  /**
   * Creates a new GameSetupTeamsPage instance
   *
   * @param page - Playwright page instance
   */
  constructor(private readonly page: Page) {
    // Initialize selectors
    this.homeTeamInput = page.locator('[data-testid="home-team-input"]');
    this.awayTeamInput = page.locator('[data-testid="away-team-input"]');
    this.homeTeamRadio = page.locator('[data-testid="home-team-radio"]');
    this.awayTeamRadio = page.locator('[data-testid="away-team-radio"]');
    this.continueButton = page.locator('[data-testid="continue-button"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.validationError = page.locator('[data-testid="validation-error"]');
    this.homeTeamValidationSuccess = page.locator('[data-testid="home-team-validation-success"]');
    this.awayTeamValidationSuccess = page.locator('[data-testid="away-team-validation-success"]');
    this.formCompletionProgress = page.locator('[data-testid="form-completion-progress"]');
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to the game setup teams page
   *
   * @remarks
   * Navigates to the teams setup page URL and waits for
   * network to be idle before returning.
   *
   * @example
   * ```typescript
   * await teamsPage.goto();
   * ```
   */
  async goto(): Promise<void> {
    await this.page.goto('/game/setup/teams', { waitUntil: 'networkidle' });
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

  // ==================== Form Filling Methods ====================

  /**
   * Fill team names and select our team
   *
   * @param homeTeam - Home team name
   * @param awayTeam - Away team name
   * @param ourTeam - Which team is ours ('home' or 'away')
   *
   * @remarks
   * Fills all required fields on the teams setup page.
   * Use this method for complete form filling in tests.
   *
   * @example
   * ```typescript
   * await teamsPage.fillTeamNames('Warriors', 'Eagles', 'home');
   * ```
   */
  async fillTeamNames(homeTeam: string, awayTeam: string, ourTeam: 'home' | 'away'): Promise<void> {
    // Fill away team first (matches UI order)
    await this.awayTeamInput.fill(awayTeam);

    // Fill home team
    await this.homeTeamInput.fill(homeTeam);

    // Select our team
    if (ourTeam === 'home') {
      await this.homeTeamRadio.check();
    } else {
      await this.awayTeamRadio.check();
    }

    // Wait for validation to complete (debounced at 300ms)
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill home team name
   *
   * @param teamName - Home team name
   */
  async fillHomeTeam(teamName: string): Promise<void> {
    await this.homeTeamInput.fill(teamName);
    await this.page.waitForTimeout(500); // Wait for validation
  }

  /**
   * Fill away team name
   *
   * @param teamName - Away team name
   */
  async fillAwayTeam(teamName: string): Promise<void> {
    await this.awayTeamInput.fill(teamName);
    await this.page.waitForTimeout(500); // Wait for validation
  }

  /**
   * Select our team
   *
   * @param ourTeam - Which team is ours ('home' or 'away')
   */
  async selectOurTeam(ourTeam: 'home' | 'away'): Promise<void> {
    if (ourTeam === 'home') {
      await this.homeTeamRadio.check();
    } else {
      await this.awayTeamRadio.check();
    }
  }

  // ==================== Action Methods ====================

  /**
   * Click the continue button to proceed to next step
   *
   * @remarks
   * Clicks continue and waits for navigation to lineup page.
   *
   * @example
   * ```typescript
   * await teamsPage.clickContinue();
   * await expect(page).toHaveURL('/game/setup/lineup');
   * ```
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.page.waitForURL('**/game/setup/lineup');
  }

  // ==================== Validation Methods ====================

  /**
   * Check if the form is valid
   *
   * @returns True if the continue button is enabled
   *
   * @remarks
   * Checks if the form has passed validation and is ready
   * for submission. The continue button is only enabled
   * when all fields are valid.
   *
   * @example
   * ```typescript
   * const isValid = await teamsPage.isValid();
   * expect(isValid).toBe(true);
   * ```
   */
  async isValid(): Promise<boolean> {
    return await this.continueButton.isEnabled();
  }

  /**
   * Check if continue button is enabled
   *
   * @returns True if button is enabled
   */
  async isContinueEnabled(): Promise<boolean> {
    return await this.continueButton.isEnabled();
  }

  /**
   * Check if there are validation errors
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
   * Check if home team validation is successful
   *
   * @returns True if home team has passed validation
   */
  async isHomeTeamValid(): Promise<boolean> {
    return await this.homeTeamValidationSuccess.isVisible();
  }

  /**
   * Check if away team validation is successful
   *
   * @returns True if away team has passed validation
   */
  async isAwayTeamValid(): Promise<boolean> {
    return await this.awayTeamValidationSuccess.isVisible();
  }

  /**
   * Get form completion progress
   *
   * @returns Progress string (e.g., "3/3")
   */
  async getFormProgress(): Promise<string> {
    return (await this.formCompletionProgress.textContent()) ?? '';
  }

  // ==================== Wait Methods ====================

  /**
   * Wait for page to be fully loaded
   *
   * @remarks
   * Waits for the page to be visible and ready for interaction.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-setup-teams-page"]', { state: 'visible' });
  }
}
