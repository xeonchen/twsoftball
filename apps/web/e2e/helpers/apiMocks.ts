/**
 * @file API Mocking Helpers
 *
 * Provides Playwright route interception helpers for E2E testing.
 * Enables clean testing by mocking API responses without modifying production code.
 *
 * @remarks
 * API Mocking Strategy:
 * - Uses Playwright's route interception API for request mocking
 * - Supports both success and error scenarios
 * - Provides type-safe mock data injection
 * - Enables testing of error handling and edge cases
 * - No production code changes required
 *
 * Key Features:
 * - Mock game state with custom data
 * - Mock lineup data for various scenarios
 * - Simulate API errors and timeouts
 * - Mock substitution operations
 * - Support for partial data updates
 *
 * Architecture:
 * - Integrates with gameStateFixtures.ts for consistent test data
 * - Works with page object models for complete E2E workflows
 * - Follows Playwright best practices for route interception
 *
 * @example
 * ```typescript
 * import { mockGameState, mockLineupData } from '../helpers/apiMocks';
 * import { mockActiveGame, mockLineup } from '../fixtures/gameStateFixtures';
 *
 * test('should display active game', async ({ page }) => {
 *   await mockGameState(page, mockActiveGame);
 *   await page.goto('/lineup');
 *   // Test assertions...
 * });
 * ```
 */

import type { Page, Route } from '@playwright/test';

import type {
  MockGameState,
  MockLineup,
  MockPlayer,
  MockSubstitution,
} from '../fixtures/gameStateFixtures';

/**
 * API error response structure
 *
 * @remarks
 * Standard error format for API responses, matching
 * the application's error handling expectations.
 */
export interface ApiError {
  /** Error type identifier */
  readonly error: string;
  /** Human-readable error message */
  readonly message: string;
  /** HTTP status code */
  readonly status: number;
  /** Additional error details (optional) */
  readonly details?: Record<string, unknown>;
}

/**
 * Mock configuration options
 *
 * @remarks
 * Allows customization of mock behavior for different test scenarios.
 */
export interface MockOptions {
  /** Delay response by specified milliseconds (simulates network latency) */
  delay?: number;
  /** Fail the request with specified error */
  error?: ApiError;
  /** Timeout the request (abort after delay) */
  timeout?: boolean;
}

// ==================== Game State Mocking ====================

/**
 * Mock game state API responses
 *
 * @param page - Playwright page instance
 * @param gameState - Mock game state data to return
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts API calls for game state and returns mock data.
 * Supports both success and error scenarios.
 *
 * Routes intercepted:
 * - GET /api/game/:gameId - Get game state
 * - GET /api/game/:gameId/state - Get detailed game state
 *
 * @example
 * ```typescript
 * // Mock successful game state
 * await mockGameState(page, mockActiveGame);
 *
 * // Mock game state with delay
 * await mockGameState(page, mockActiveGame, { delay: 1000 });
 *
 * // Mock game state error
 * await mockGameState(page, mockActiveGame, {
 *   error: {
 *     error: 'GameNotFound',
 *     message: 'Game not found',
 *     status: 404
 *   }
 * });
 * ```
 */
export async function mockGameState(
  page: Page,
  gameState: MockGameState,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/game/**', async (route: Route) => {
    // Handle timeout scenario
    if (options.timeout) {
      await new Promise(resolve => setTimeout(resolve, options.delay ?? 5000));
      await route.abort('timedout');
      return;
    }

    // Handle error scenario
    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify(options.error),
      });
      return;
    }

    // Simulate network delay if specified
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    // Return mock game state
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(gameState),
    });
  });
}

/**
 * Mock game list API responses (for home page)
 *
 * @param page - Playwright page instance
 * @param games - Array of mock game states
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts API calls for game list and returns mock data.
 * Useful for testing game selection and navigation.
 *
 * @example
 * ```typescript
 * // Mock list of games
 * await mockGameList(page, [mockActiveGame, mockGameStart]);
 * ```
 */
export async function mockGameList(
  page: Page,
  games: MockGameState[],
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/games', async (route: Route) => {
    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify(options.error),
      });
      return;
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ games }),
    });
  });
}

// ==================== Lineup Data Mocking ====================

/**
 * Mock lineup data API responses
 *
 * @param page - Playwright page instance
 * @param lineup - Mock lineup data to return
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts API calls for lineup data and returns mock information.
 * Supports testing lineup editor and player management workflows.
 *
 * Routes intercepted:
 * - GET /api/lineup/:gameId - Get lineup for game
 * - GET /api/lineup/:gameId/active - Get active lineup
 * - GET /api/lineup/:gameId/bench - Get bench players
 *
 * @example
 * ```typescript
 * // Mock lineup data
 * await mockLineupData(page, mockLineup);
 *
 * // Mock lineup with loading delay
 * await mockLineupData(page, mockLineup, { delay: 500 });
 *
 * // Mock lineup error
 * await mockLineupData(page, mockLineup, {
 *   error: {
 *     error: 'LineupNotFound',
 *     message: 'Lineup not configured',
 *     status: 404
 *   }
 * });
 * ```
 */
export async function mockLineupData(
  page: Page,
  lineup: MockLineup,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/lineup/**', async (route: Route) => {
    if (options.timeout) {
      await new Promise(resolve => setTimeout(resolve, options.delay ?? 5000));
      await route.abort('timedout');
      return;
    }

    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify(options.error),
      });
      return;
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(lineup),
    });
  });
}

/**
 * Mock player data API responses
 *
 * @param page - Playwright page instance
 * @param players - Array of mock players
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts API calls for player data and returns mock information.
 * Useful for testing player selection and substitution dialogs.
 *
 * @example
 * ```typescript
 * // Mock available players
 * await mockPlayerData(page, mockBenchPlayers);
 * ```
 */
export async function mockPlayerData(
  page: Page,
  players: MockPlayer[],
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/players/**', async (route: Route) => {
    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify(options.error),
      });
      return;
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ players }),
    });
  });
}

// ==================== Substitution Operation Mocking ====================

/**
 * Mock substitution API responses
 *
 * @param page - Playwright page instance
 * @param success - Whether substitution should succeed
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts substitution API calls and returns mock responses.
 * Supports testing both successful and failed substitution workflows.
 *
 * Routes intercepted:
 * - POST /api/substitution - Create substitution
 * - PUT /api/substitution/:id - Update substitution
 *
 * @example
 * ```typescript
 * // Mock successful substitution
 * await mockSubstitution(page, true);
 *
 * // Mock substitution failure
 * await mockSubstitution(page, false, {
 *   error: {
 *     error: 'SubstitutionInvalid',
 *     message: 'Player is not eligible for substitution',
 *     status: 400
 *   }
 * });
 *
 * // Mock substitution with delay (simulate processing)
 * await mockSubstitution(page, true, { delay: 1000 });
 * ```
 */
export async function mockSubstitution(
  page: Page,
  success: boolean,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/substitution/**', async (route: Route) => {
    if (options.timeout) {
      await new Promise(resolve => setTimeout(resolve, options.delay ?? 5000));
      await route.abort('timedout');
      return;
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    if (!success || options.error) {
      const error =
        options.error ??
        ({
          error: 'SubstitutionFailed',
          message: 'Substitution failed due to server error',
          status: 500,
        } as ApiError);

      await route.fulfill({
        status: error.status,
        contentType: 'application/json',
        body: JSON.stringify(error),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Substitution completed successfully',
      }),
    });
  });
}

/**
 * Mock substitution history API responses
 *
 * @param page - Playwright page instance
 * @param substitutions - Array of mock substitution records
 * @param options - Optional mock configuration
 *
 * @remarks
 * Intercepts API calls for substitution history and returns mock data.
 * Useful for testing substitution tracking and reporting features.
 *
 * @example
 * ```typescript
 * // Mock substitution history
 * await mockSubstitutionHistory(page, mockSubstitutions);
 * ```
 */
export async function mockSubstitutionHistory(
  page: Page,
  substitutions: MockSubstitution[],
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/substitution/history/**', async (route: Route) => {
    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify(options.error),
      });
      return;
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ substitutions }),
    });
  });
}

// ==================== Helper Functions ====================

/**
 * Clear all mocked routes
 *
 * @param page - Playwright page instance
 *
 * @remarks
 * Removes all route interceptions to restore normal API behavior.
 * Useful for cleanup between tests or switching test scenarios.
 *
 * @example
 * ```typescript
 * test.afterEach(async ({ page }) => {
 *   await clearMocks(page);
 * });
 * ```
 */
export async function clearMocks(page: Page): Promise<void> {
  await page.unroute('**/api/**');
}

/**
 * Mock all API endpoints with provided data
 *
 * @param page - Playwright page instance
 * @param data - Complete mock data set
 *
 * @remarks
 * Convenience function to set up all common mocks at once.
 * Reduces boilerplate in test setup.
 *
 * @example
 * ```typescript
 * // Setup all mocks at once
 * await mockAllApis(page, {
 *   gameState: mockActiveGame,
 *   lineup: mockLineup,
 *   substitutionSuccess: true
 * });
 * ```
 */
export async function mockAllApis(
  page: Page,
  data: {
    gameState: MockGameState;
    lineup: MockLineup;
    substitutionSuccess?: boolean;
    options?: MockOptions;
  }
): Promise<void> {
  await mockGameState(page, data.gameState, data.options);
  await mockLineupData(page, data.lineup, data.options);
  if (data.substitutionSuccess !== undefined) {
    await mockSubstitution(page, data.substitutionSuccess, data.options);
  }
}

/**
 * Create a standard API error for testing
 *
 * @param type - Error type identifier
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 *
 * @returns Formatted API error object
 *
 * @example
 * ```typescript
 * // Create 404 error
 * const notFoundError = createApiError(
 *   'GameNotFound',
 *   'The requested game does not exist',
 *   404
 * );
 *
 * await mockGameState(page, mockActiveGame, { error: notFoundError });
 * ```
 */
export function createApiError(
  type: string,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): ApiError {
  return {
    error: type,
    message,
    status,
    ...(details && { details }),
  };
}

// ==================== Common Error Scenarios ====================

/**
 * Pre-configured common error scenarios for convenience
 */
export const CommonErrors = {
  /** Network timeout error */
  Timeout: {
    timeout: true,
    delay: 5000,
  } as MockOptions,

  /** Game not found error */
  GameNotFound: {
    error: createApiError('GameNotFound', 'The requested game does not exist', 404),
  } as MockOptions,

  /** Lineup not configured error */
  LineupNotConfigured: {
    error: createApiError('LineupNotConfigured', 'Lineup has not been set up', 404),
  } as MockOptions,

  /** Player ineligible error */
  PlayerIneligible: {
    error: createApiError('SubstitutionInvalid', 'Player is not eligible for substitution', 400),
  } as MockOptions,

  /** Server error */
  ServerError: {
    error: createApiError('InternalServerError', 'An unexpected error occurred', 500),
  } as MockOptions,

  /** Validation error */
  ValidationError: {
    error: createApiError('ValidationError', 'Invalid request data', 400),
  } as MockOptions,
} as const;
