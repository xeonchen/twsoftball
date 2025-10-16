/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="@testing-library/jest-dom" />

import type {
  StartNewGame,
  RecordAtBat,
  SubstitutePlayer,
  UndoLastAction,
  RedoLastAction,
  EndInning,
} from '@twsoftball/application';

/**
 * Exposed subset of ApplicationServices for E2E testing.
 *
 * @remarks
 * Following the Principle of Least Privilege, only the 6 use cases
 * needed for E2E testing are exposed to window.__appServices__.
 * Internal services (repositories, eventStore, logger, config) are
 * intentionally excluded to reduce attack surface.
 *
 * **Security Pattern:**
 * - Only available in DEV and TEST modes
 * - Automatically cleaned up when services provider unmounts
 * - No internal implementation details exposed
 * - Self-documenting security boundaries
 *
 * @example
 * ```typescript
 * // In E2E tests, access services via window.__appServices__
 * test('should record at-bat via DI Container', async ({ page }) => {
 *   await page.goto('/game/test-game-e2e/record');
 *
 *   // Verify DI Container exposes only E2EApplicationServices
 *   const hasServices = await page.evaluate(() => {
 *     return window.__appServices__ !== undefined;
 *   });
 *   expect(hasServices).toBe(true);
 *
 *   // Use services directly
 *   await page.evaluate(async () => {
 *     await window.__appServices__!.recordAtBat({
 *       gameId: 'test-game-e2e',
 *       playerId: 'player-1',
 *       result: 'SINGLE'
 *     });
 *   });
 *
 *   // Verify internal services are NOT exposed (security)
 *   const hasInternals = await page.evaluate(() => {
 *     const services = window.__appServices__ as any;
 *     return services?.repositories !== undefined ||
 *            services?.eventStore !== undefined;
 *   });
 *   expect(hasInternals).toBe(false);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Verify all 6 use cases are exposed
 * test('should expose exactly 6 use cases', async ({ page }) => {
 *   await page.goto('/game/test-game-e2e/record');
 *
 *   const exposedKeys = await page.evaluate(() => {
 *     return Object.keys(window.__appServices__ || {});
 *   });
 *
 *   expect(exposedKeys).toEqual([
 *     'startNewGame',
 *     'recordAtBat',
 *     'substitutePlayer',
 *     'undoLastAction',
 *     'redoLastAction',
 *     'endInning'
 *   ]);
 * });
 * ```
 */
export interface E2EApplicationServices {
  readonly startNewGame: StartNewGame;
  readonly recordAtBat: RecordAtBat;
  readonly substitutePlayer: SubstitutePlayer;
  readonly undoLastAction: UndoLastAction;
  readonly redoLastAction: RedoLastAction;
  readonly endInning: EndInning;
}

declare global {
  interface Window {
    __appServices__?: E2EApplicationServices;
  }
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
