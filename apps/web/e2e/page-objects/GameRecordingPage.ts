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
   * Result values must match button IDs (lowercase):
   * - Hits: 'single', 'double', 'triple', 'homerun'
   * - Walks: 'walk'
   * - Outs: 'groundout', 'flyout', 'strikeout', 'doubleplay', 'tripleplay'
   * - Other: 'error', 'fielderschoice', 'sacfly'
   *
   * @example
   * ```typescript
   * await gamePageObject.recordAtBat({ result: 'single' });
   * await gamePageObject.recordAtBat({ result: 'homerun' });
   * await gamePageObject.recordAtBat({ result: 'groundout' });
   * await gamePageObject.recordAtBat({ result: 'strikeout' });
   * ```
   */
  async recordAtBat(data: AtBatData): Promise<void> {
    const actionButtonSelector = `[data-testid="action-${data.result.toLowerCase()}"]`;
    const actionButton = this.page.locator(actionButtonSelector);

    // Click the action button
    await actionButton.click();

    // Wait for the complete async flow to complete:
    // - Use case execution
    // - DTO return
    // - React state update (useEffect triggers)
    // - Store sync (useGameStateSync)
    // - UI re-render with new currentBatter
    // We wait for the button to NOT be disabled (i.e., re-enabled for next action)
    await actionButton.waitFor({ state: 'attached', timeout: 10000 });

    // Wait for the button to be enabled (not have disabled attribute)
    await this.page.waitForFunction(
      selector => {
        const button = document.querySelector(selector);
        return button && !button.hasAttribute('disabled');
      },
      actionButtonSelector,
      { timeout: 10000 }
    );

    // Small buffer to ensure React has fully rendered
    await this.page.waitForTimeout(100);
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

  // ==================== Game Simulation Methods ====================

  /**
   * Simulate a complete half-inning (3 outs)
   *
   * @param options - Scoring options for the half-inning
   * @param options.runs - Number of runs to score (default: 0)
   * @param options.walkOffOnFinalRun - If true, simulate walk-off victory (default: false)
   * @returns Promise that resolves when half-inning is complete
   *
   * @remarks
   * Records at-bats until 3 outs are recorded, simulating a complete half-inning.
   * If runs are specified, records hits that score runs before recording outs.
   * Uses the recordAtBat method to interact with the UI.
   *
   * **Walk-Off Support:**
   * When `walkOffOnFinalRun` is true, simulates a walk-off victory scenario:
   * - Records (runs - 1) homeruns
   * - Records final homerun as the walk-off hit
   * - Game ends immediately (NO 3 outs recorded)
   * - Waits for game completion instead of inning transition
   *
   * **Race Condition Fix:**
   * After recording the 3rd out, we wait for sessionStorage to show outs === 0.
   * This proves that Zustand's persist middleware has completed writing the
   * updated state (after InningState.endHalfInning() resets outs to 0).
   * Without this wait, subsequent assertions may read stale sessionStorage data.
   *
   * **Valid Out Types:**
   * Uses 'groundout' button ID which maps to GROUND_OUT domain enum value.
   * Generic 'OUT' is not a valid domain type - must use specific out types:
   * - GROUND_OUT, FLY_OUT, STRIKEOUT, DOUBLE_PLAY, TRIPLE_PLAY, SACRIFICE_FLY
   *
   * @example
   * ```typescript
   * // Simulate half-inning with 2 runs scored
   * await gamePageObject.simulateHalfInning({ runs: 2 });
   *
   * // Simulate walk-off victory with 2 runs
   * await gamePageObject.simulateHalfInning({ runs: 2, walkOffOnFinalRun: true });
   *
   * // Simulate half-inning with no runs
   * await gamePageObject.simulateHalfInning();
   * ```
   */
  async simulateHalfInning(options?: {
    runs?: number;
    walkOffOnFinalRun?: boolean;
  }): Promise<void> {
    const runsToScore = options?.runs || 0;
    const walkOffOnFinalRun = options?.walkOffOnFinalRun || false;

    // Walk-off scenario: game ends on final run, no 3 outs recorded
    if (walkOffOnFinalRun && runsToScore > 0) {
      // Record (runs - 1) homeruns
      for (let i = 0; i < runsToScore - 1; i++) {
        await this.recordAtBat({ result: 'homerun' });
      }

      // Final homerun is the walk-off hit
      await this.recordAtBat({ result: 'homerun' });

      // Game should end immediately - NO 3 outs recorded
      // Wait for game completion instead of inning transition
      await this.page.waitForFunction(
        () => {
          const state = JSON.parse(sessionStorage.getItem('game-state') || '{}');
          return (state.state?.currentGame?.status || state.status) === 'completed';
        },
        { timeout: 10000 }
      );

      return; // Skip the 3-outs logic below
    }

    // Normal scenario: Record hits to score runs (if specified)
    for (let i = 0; i < runsToScore; i++) {
      await this.recordAtBat({ result: 'homerun' });
    }

    // Record 3 outs to end the half-inning
    // Use 'groundout' button ID which maps to valid GROUND_OUT domain enum
    for (let i = 0; i < 3; i++) {
      await this.recordAtBat({ result: 'groundout' });
    }

    // Wait for Zustand persist middleware to write updated state to sessionStorage
    // After 3rd out, InningState.endHalfInning() resets outs to 0 and flips isTopHalf
    // We poll sessionStorage until we see outs === 0 AND correct isTopHalf value
    // This proves persist completed AND merge finished
    //
    // Special case: After bottom of inning 7, the game advances to top of inning 8
    // (isTopHalf flips true) and then immediately completes. So we wait for EITHER:
    // 1. Normal case: outs === 0 AND isTopHalf flipped
    // 2. Game completion case: outs === 0 AND game status === 'completed'
    const wasTopHalf = await this.isTopOfInning();

    await this.page.waitForFunction(
      expectedIsTopHalf => {
        const stateJson = sessionStorage.getItem('game-state');
        if (!stateJson) {
          console.log('[simulateHalfInning] ❌ No game-state in sessionStorage');
          return false;
        }
        const state = JSON.parse(stateJson);

        // Check both Zustand persist format and flat fixture format
        const outs = state.state?.activeGameState?.outs ?? state.outs ?? -1;
        const isTopHalf = state.state?.activeGameState?.isTopHalf ?? state.isTopHalf ?? true;
        const inning = state.state?.activeGameState?.currentInning ?? state.currentInning ?? -1;
        const status = state.state?.currentGame?.status || state.status;
        const isGameCompleted = status === 'completed';

        // Get additional diagnostic info
        const homeScore = state.state?.activeGameState?.homeScore ?? state.homeScore ?? 0;
        const awayScore = state.state?.activeGameState?.awayScore ?? state.awayScore ?? 0;
        const completionReason =
          state.state?.currentGame?.completionReason || state.completionReason || 'N/A';

        console.log(
          `[simulateHalfInning] 🔍 State check:
          - Inning: ${inning}, isTopHalf: ${isTopHalf} (expected: ${expectedIsTopHalf})
          - Outs: ${outs} (expected: 0)
          - Status: ${status} (completed: ${isGameCompleted})
          - Score: ${homeScore}-${awayScore}
          - Completion Reason: ${completionReason}
          - State Format: ${state.state ? 'Zustand persist' : 'Flat fixture'}`
        );

        // Outs must be reset to 0 in all cases
        if (outs !== 0) {
          console.log(`[simulateHalfInning] ⏳ Waiting for outs to reset (current: ${outs})...`);
          return false;
        }

        // If game is completed, we're done (outs already checked above)
        if (isGameCompleted) {
          console.log(
            `[simulateHalfInning] ✅ Game completed (${completionReason}), half-inning transition done`
          );
          return true;
        }

        // Otherwise, also check that isTopHalf flipped to expected value
        const result = isTopHalf === expectedIsTopHalf;
        console.log(
          `[simulateHalfInning] ${result ? '✅' : '⏳'} isTopHalf check: ${isTopHalf} === ${expectedIsTopHalf} ? ${result}`
        );
        return result;
      },
      !wasTopHalf, // Expect the opposite of what we had
      { timeout: 10000, polling: 100 } // Increased timeout for Firefox compatibility
    );
  }

  /**
   * Get current inning number from game state
   *
   * @returns Current inning (1-7)
   *
   * @remarks
   * Reads the current inning from sessionStorage game state.
   * Supports both flat fixture format and Zustand persist format.
   *
   * @example
   * ```typescript
   * const inning = await gamePageObject.getCurrentInning();
   * expect(inning).toBe(5);
   * ```
   */
  async getCurrentInning(): Promise<number> {
    return await this.page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return 1;
      const state = JSON.parse(stateJson);
      // Check Zustand persist format first, then flat fixture format
      return state.state?.activeGameState?.currentInning || state.currentInning || 1;
    });
  }

  /**
   * Get current half-inning indicator
   *
   * @returns true if top of inning, false if bottom
   *
   * @remarks
   * Reads the isTopHalf flag from sessionStorage game state.
   * Supports both flat fixture format and Zustand persist format.
   *
   * @example
   * ```typescript
   * const isTop = await gamePageObject.isTopOfInning();
   * expect(isTop).toBe(true); // Top of inning
   * ```
   */
  async isTopOfInning(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return true;
      const state = JSON.parse(stateJson);
      // Check Zustand persist format first, then flat fixture format
      const isTopHalf = state.state?.activeGameState?.isTopHalf ?? state.isTopHalf ?? true;
      return isTopHalf !== false;
    });
  }

  /**
   * Check if game is completed
   *
   * @returns true if game status is 'completed'
   *
   * @remarks
   * Checks the game status from sessionStorage game state.
   * Supports both flat fixture format and Zustand persist format.
   *
   * @example
   * ```typescript
   * const isComplete = await gamePageObject.isGameComplete();
   * expect(isComplete).toBe(true);
   * ```
   */
  async isGameComplete(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return false;
      const state = JSON.parse(stateJson);
      // Check Zustand persist format first, then flat fixture format
      const status = state.state?.currentGame?.status || state.status;
      return status === 'completed';
    });
  }

  /**
   * Get current outs count
   *
   * @returns Number of outs (0-3)
   *
   * @remarks
   * Reads the outs count from sessionStorage game state.
   * Supports both flat fixture format and Zustand persist format.
   *
   * @example
   * ```typescript
   * const outs = await gamePageObject.getOuts();
   * expect(outs).toBe(2);
   * ```
   */
  async getOuts(): Promise<number> {
    return await this.page.evaluate(() => {
      const stateJson = sessionStorage.getItem('game-state');
      if (!stateJson) return 0;
      const state = JSON.parse(stateJson);
      // Check Zustand persist format first, then flat fixture format
      return state.state?.activeGameState?.outs ?? state.outs ?? 0;
    });
  }
}
