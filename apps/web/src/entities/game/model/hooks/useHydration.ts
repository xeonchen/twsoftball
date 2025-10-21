import { useSyncExternalStore } from 'react';

import { useGameStore } from '../gameStore';

/**
 * Hook to wait for Zustand persist hydration to complete.
 *
 * @returns true when store has been hydrated from sessionStorage
 *
 * @remarks
 * Zustand persist middleware hydrates asynchronously AFTER first render.
 * This hook allows components to wait for hydration before accessing persisted state.
 *
 * The hook subscribes to the `_hasHydrated` flag in the store, which is set to true
 * by the `onRehydrateStorage` callback when rehydration completes.
 *
 * Uses React's useSyncExternalStore for optimal integration with Zustand.
 *
 * @example
 * ```typescript
 * const hasHydrated = useHydration();
 *
 * if (!hasHydrated) {
 *   return <div>Loading...</div>;
 * }
 *
 * // Safe to access persisted state now
 * const currentBatter = useGameStore(state => state.activeGameState?.currentBatter);
 * ```
 */
export function useHydration(): boolean {
  return useSyncExternalStore(
    useGameStore.subscribe,
    () => useGameStore.getState()._hasHydrated,
    () => false // Server-side snapshot (always false during SSR)
  );
}
