/**
 * @file useSyncStatus Hook
 * React hook for tracking offline queue sync status in PWA context.
 *
 * @remarks
 * This hook provides real-time tracking of:
 * - Online/offline network status
 * - Pending items count in the offline queue
 * - Sync operation status
 *
 * It integrates with the OfflineQueuePort to provide UI feedback
 * for offline-first operations.
 *
 * @example
 * ```tsx
 * function SyncIndicator() {
 *   const { isOnline, pendingCount, isSyncing } = useSyncStatus();
 *
 *   if (!isOnline) {
 *     return <Badge color="orange">Offline</Badge>;
 *   }
 *
 *   if (isSyncing) {
 *     return <Badge color="blue">Syncing ({pendingCount})</Badge>;
 *   }
 *
 *   if (pendingCount > 0) {
 *     return <Badge color="yellow">Pending ({pendingCount})</Badge>;
 *   }
 *
 *   return <Badge color="green">Synced</Badge>;
 * }
 * ```
 */

import type { OfflineQueuePort } from '@twsoftball/application';
import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Configuration options for useSyncStatus hook.
 */
export interface UseSyncStatusOptions {
  /**
   * Offline queue instance to monitor.
   * If not provided, only online/offline status is tracked.
   */
  offlineQueue?: OfflineQueuePort;

  /**
   * Interval in milliseconds for polling pending count.
   * @default 5000
   */
  pollInterval?: number;

  /**
   * Whether to automatically poll for pending count updates.
   * @default true
   */
  autoPoll?: boolean;
}

/**
 * Return type for useSyncStatus hook.
 */
export interface SyncStatus {
  /**
   * Whether the browser has network connectivity.
   */
  isOnline: boolean;

  /**
   * Number of items pending in the offline queue.
   */
  pendingCount: number;

  /**
   * Whether a sync operation is currently in progress.
   */
  isSyncing: boolean;

  /**
   * Manually trigger a refresh of the pending count.
   */
  refreshPendingCount: () => Promise<void>;

  /**
   * Set the syncing state (used by sync service).
   */
  setSyncing: (syncing: boolean) => void;

  /**
   * Last error that occurred during sync status check.
   */
  error: Error | null;
}

// External store subscription for online status
function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return (): void => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to track offline queue sync status.
 *
 * @param options - Configuration options
 * @returns SyncStatus object with online status, pending count, and sync state
 *
 * @remarks
 * This hook:
 * - Automatically tracks browser online/offline events
 * - Polls the offline queue for pending count (configurable)
 * - Provides manual refresh capability
 * - Handles cleanup on unmount
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOnline, pendingCount, isSyncing } = useSyncStatus({
 *     offlineQueue,
 *     pollInterval: 3000
 *   });
 *
 *   return (
 *     <header>
 *       <NetworkStatus online={isOnline} />
 *       {pendingCount > 0 && <PendingBadge count={pendingCount} />}
 *       {isSyncing && <Spinner />}
 *     </header>
 *   );
 * }
 * ```
 */
export function useSyncStatus(options: UseSyncStatusOptions = {}): SyncStatus {
  const { offlineQueue, pollInterval = 5000, autoPoll = true } = options;

  // Use useSyncExternalStore for online status (avoids setState in effect)
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  // State for pending count, syncing, and error
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup and tracking
  const pollIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const prevIsOnlineRef = useRef<boolean>(isOnline);

  /**
   * Refresh pending count from the offline queue.
   */
  const refreshPendingCount = useCallback(async (): Promise<void> => {
    if (!offlineQueue || !isMountedRef.current) {
      return;
    }

    try {
      const count = await offlineQueue.getPendingCount();
      if (isMountedRef.current) {
        setPendingCount(count);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to get pending count'));
      }
    }
  }, [offlineQueue]);

  /**
   * Set syncing state.
   */
  const setSyncing = useCallback((syncing: boolean): void => {
    if (isMountedRef.current) {
      setIsSyncing(syncing);
    }
  }, []);

  // Poll for pending count - the interval callback calls setState asynchronously
  useEffect(() => {
    if (!offlineQueue || !autoPoll) {
      return;
    }

    // Schedule initial fetch asynchronously
    const timeoutId = window.setTimeout(() => {
      void refreshPendingCount();
    }, 0);

    // Set up polling - setState is called in async callback
    pollIntervalRef.current = window.setInterval(() => {
      void refreshPendingCount();
    }, pollInterval);

    return (): void => {
      window.clearTimeout(timeoutId);
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [offlineQueue, pollInterval, autoPoll, refreshPendingCount]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return (): void => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Refresh when coming back online (only when transitioning from offline to online)
  useEffect(() => {
    // Only refresh when transitioning from offline to online
    const wasOffline = !prevIsOnlineRef.current;
    const isNowOnline = isOnline;
    prevIsOnlineRef.current = isOnline;

    if (wasOffline && isNowOnline && offlineQueue) {
      // Schedule refresh asynchronously to avoid setState in effect body
      const timeoutId = window.setTimeout(() => {
        void refreshPendingCount();
      }, 0);
      return (): void => {
        window.clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [isOnline, offlineQueue, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    refreshPendingCount,
    setSyncing,
    error,
  };
}
