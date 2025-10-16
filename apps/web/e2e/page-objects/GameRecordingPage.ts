/**
 * @file GameRecordingPage Page Object Model
 *
 * Page object model for the Game Recording page.
 * Encapsulates all selectors and interactions for E2E testing of game recording workflows.
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
 * import { GameRecordingPageObject } from '../page-objects/GameRecordingPage';
 *
 * test('should record at-bat', async ({ page }) => {
 *   const gamePageObject = new GameRecordingPageObject(page);
 *   await gamePageObject.goto();
 *   await gamePageObject.startGame({
 *     homeTeamName: 'Warriors',
 *     awayTeamName: 'Eagles'
 *   });
 *   await gamePageObject.recordAtBat({ result: 'SINGLE' });
 *   const score = await gamePageObject.getScore('home');
 *   expect(score).toBe(0);
 * });
 * ```
 */

import type { Locator, Page } from '@playwright/test';

import type { MockGameState } from '../fixtures/gameStateFixtures';

/**
 * Configuration for starting a new game
 */
export interface GameConfig {
  /** Home team name */
  homeTeamName: string;
  /** Away team name */
  awayTeamName: string;
  /** Optional home team lineup (player IDs) */
  homeLineup?: string[];
  /** Optional away team lineup (player IDs) */
  awayLineup?: string[];
}

/**
 * At-bat recording data
 */
export interface AtBatData {
  /** At-bat result type (e.g., 'SINGLE', 'HOMERUN', 'OUT') */
  result: string;
  /** Optional runner advancement data */
  runnersAdvance?: Record<string, string>;
}

/**
 * GameRecordingPageObject - Page object for game recording interface
 *
 * @remarks
 * Encapsulates all interactions with the game recording page,
 * including game setup, at-bat recording, score verification, and state management.
 *
 * Key Responsibilities:
 * - Page navigation and initialization
 * - Game state setup via sessionStorage injection
 * - At-bat recording actions
 * - Score and runner state verification
 * - DI Container introspection for testing
 *
 * Design Principles:
 * - Single Responsibility: Each method performs one clear action
 * - Abstraction: Hides implementation details from tests
 * - Reusability: Methods can be composed for complex workflows
 * - Maintainability: Centralized selector management
 */
export class GameRecordingPageObject {
  // ==================== Core Selectors ====================

  /** Score display */
  private readonly scoreDisplay: Locator;

  /** Home team score */
  private readonly homeScore: Locator;

  /** Away team score */
  private readonly awayScore: Locator;

  /** First base runner indicator */
  private readonly firstBaseRunner: Locator;

  /** Second base runner indicator */
  private readonly secondBaseRunner: Locator;

  /** Third base runner indicator */
  private readonly thirdBaseRunner: Locator;

  /** Outs count display */
  private readonly outsCount: Locator;

  /**
   * Creates a new GameRecordingPageObject instance
   *
   * @param page - Playwright page instance
   */
  constructor(private readonly page: Page) {
    // Initialize core selectors using data-testid attributes
    this.scoreDisplay = page.locator('.score-display');
    this.homeScore = page.locator('[data-testid="home-score"]');
    this.awayScore = page.locator('[data-testid="away-score"]');
    this.firstBaseRunner = page.locator('[data-testid="first-base-runner"]');
    this.secondBaseRunner = page.locator('[data-testid="second-base-runner"]');
    this.thirdBaseRunner = page.locator('[data-testid="third-base-runner"]');
    this.outsCount = page.locator('[data-testid="outs-count"]');
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to the game recording page
   *
   * @param gameId - Optional game ID to navigate to specific game (defaults to 'test-game-e2e')
   *
   * @remarks
   * Navigates to the game recording page URL and waits for
   * network to be idle before returning.
   *
   * @example
   * ```typescript
   * await gamePageObject.goto();
   * // Or with specific game ID
   * await gamePageObject.goto('test-game-123');
   * ```
   */
  async goto(gameId?: string): Promise<void> {
    const url = `/game/${gameId || 'test-game-e2e'}/record`;
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Reload the page
   *
   * @remarks
   * Performs a full page reload to test state persistence.
   *
   * @example
   * ```typescript
   * await gamePageObject.recordAtBat({ result: 'SINGLE' });
   * await gamePageObject.reload();
   * // State should persist
   * ```
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  // ==================== State Management Methods ====================

  /**
   * Clear all game state from sessionStorage
   *
   * @remarks
   * Clears sessionStorage to ensure clean test isolation.
   * Should be called in test beforeEach hooks.
   *
   * @example
   * ```typescript
   * test.beforeEach(async ({ page }) => {
   *   const gamePageObject = new GameRecordingPageObject(page);
   *   await gamePageObject.goto();
   *   await gamePageObject.clearGameState();
   * });
   * ```
   */
  async clearGameState(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  /**
   * Inject game state directly into sessionStorage
   *
   * @param gameState - Complete game state fixture
   *
   * @remarks
   * Injects a complete game state fixture into sessionStorage
   * and triggers a storage event to update the Zustand store.
   * This allows tests to set up complex game scenarios quickly.
   *
   * @example
   * ```typescript
   * import { mockActiveGame } from '../fixtures/gameStateFixtures';
   *
   * await gamePageObject.injectGameState(mockActiveGame);
   * await gamePageObject.reload();
   * // Game state is now loaded
   * ```
   */
  async injectGameState(gameState: MockGameState): Promise<void> {
    await this.page.evaluate(state => {
      sessionStorage.setItem('game-state', JSON.stringify(state));
      window.dispatchEvent(new Event('storage'));
    }, gameState);
  }

  // ==================== Game Setup Methods ====================

  /**
   * Start a new game with given configuration
   *
   * @param config - Game configuration (team names, lineups)
   *
   * @remarks
   * This method would typically interact with the game setup wizard
   * or inject initial game state. For now, it injects a minimal
   * game state fixture.
   *
   * @example
   * ```typescript
   * await gamePageObject.startGame({
   *   homeTeamName: 'Warriors',
   *   awayTeamName: 'Eagles'
   * });
   * ```
   */
  async startGame(config: GameConfig): Promise<void> {
    // For E2E tests, we inject a basic game state
    const initialGameState: MockGameState = {
      gameId: 'test-game-e2e',
      homeTeam: config.homeTeamName,
      awayTeam: config.awayTeamName,
      status: 'active',
      currentInning: 1,
      isTopHalf: true,
      homeScore: 0,
      awayScore: 0,
      activeLineup: [],
      bench: [],
      outs: 0,
    };

    await this.injectGameState(initialGameState);
  }

  // ==================== Game Action Methods ====================

  /**
   * Record an at-bat result
   *
   * @param data - At-bat data (result type, runner advances)
   *
   * @remarks
   * Clicks the action button corresponding to the at-bat result.
   * Waits for the action to complete before returning.
   *
   * @example
   * ```typescript
   * await gamePageObject.recordAtBat({ result: 'SINGLE' });
   * await gamePageObject.recordAtBat({ result: 'HOMERUN' });
   * await gamePageObject.recordAtBat({ result: 'OUT' });
   * ```
   */
  async recordAtBat(data: AtBatData): Promise<void> {
    const actionButtonSelector = `[data-testid="action-${data.result.toLowerCase()}"]`;
    const actionButton = this.page.locator(actionButtonSelector);
    await actionButton.click();

    // Wait for action to complete (loading spinner to disappear)
    await this.page.waitForTimeout(500); // Give UI time to update
  }

  // ==================== Assertion / Getter Methods ====================

  /**
   * Get the scoreboard locator
   *
   * @returns Locator for scoreboard element
   *
   * @example
   * ```typescript
   * const scoreboard = await gamePageObject.getScoreboard();
   * await expect(scoreboard).toBeVisible();
   * ```
   */
  async getScoreboard(): Promise<Locator> {
    return this.scoreDisplay;
  }

  /**
   * Get runner indicator for a specific base
   *
   * @param base - Base position ('FIRST', 'SECOND', 'THIRD')
   * @returns Locator for runner indicator
   *
   * @example
   * ```typescript
   * const runner = await gamePageObject.getRunnerIndicator('FIRST');
   * await expect(runner).toBeVisible();
   * ```
   */
  async getRunnerIndicator(base: 'FIRST' | 'SECOND' | 'THIRD'): Promise<Locator> {
    switch (base) {
      case 'FIRST':
        return this.firstBaseRunner;
      case 'SECOND':
        return this.secondBaseRunner;
      case 'THIRD':
        return this.thirdBaseRunner;
    }
  }

  /**
   * Get outs count locator
   *
   * @returns Locator for outs count display
   *
   * @example
   * ```typescript
   * const outsCount = await gamePageObject.getOutCount();
   * await expect(outsCount).toHaveText('1 Outs');
   * ```
   */
  async getOutCount(): Promise<Locator> {
    return this.outsCount;
  }

  /**
   * Get current score for a team
   *
   * @param team - Team identifier ('home' or 'away')
   * @returns Current score as a number
   *
   * @example
   * ```typescript
   * const homeScore = await gamePageObject.getScore('home');
   * expect(homeScore).toBe(3);
   * ```
   */
  async getScore(team: 'home' | 'away'): Promise<number> {
    const scoreLocator = team === 'home' ? this.homeScore : this.awayScore;
    const scoreText = await scoreLocator.textContent();
    return parseInt(scoreText?.trim() || '0', 10);
  }

  // ==================== Browser Introspection Methods ====================

  /**
   * Evaluate JavaScript code in the browser context
   *
   * @param fn - Function to execute in browser
   * @returns Result of function execution
   *
   * @remarks
   * This method allows tests to inspect browser-side state,
   * including the DI Container exposed via window.__appServices__.
   *
   * @example
   * ```typescript
   * const services = await gamePageObject.evaluate(() => {
   *   return window.__appServices__;
   * });
   * expect(services).toBeDefined();
   * ```
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return await this.page.evaluate(fn);
  }
}
