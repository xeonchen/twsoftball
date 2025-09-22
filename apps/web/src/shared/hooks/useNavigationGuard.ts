import { useEffect, useCallback, useRef } from 'react';

/**
 * Navigation Guard Hook
 *
 * Provides browser navigation protection during active games to prevent
 * accidental data loss. Implements the browser navigation guard strategy
 * from docs/design/technical/browser-guards.md
 *
 * Features:
 * - Browser back/forward button protection
 * - Page refresh/close warnings
 * - Customizable warning messages
 * - Proper cleanup and memory management
 * - Error handling for edge cases
 *
 * @example
 * ```typescript
 * const GameRecordingPage = () => {
 *   const { currentGame } = useGameStore();
 *   const isGameActive = currentGame?.status === 'IN_PROGRESS';
 *
 *   useNavigationGuard(
 *     isGameActive,
 *     () => setShowWarningModal(true),
 *     'Game in progress. Sure you want to leave?'
 *   );
 *
 *   return <div>Game interface</div>;
 * };
 * ```
 */

/**
 * Hook for protecting against accidental browser navigation during active games
 *
 * @param isActive - Whether the navigation guard should be active
 * @param onNavigationAttempt - Callback fired when user attempts to navigate away
 * @param warningMessage - Custom message for browser unload warning
 * @returns void
 */
export function useNavigationGuard(
  isActive: boolean,
  onNavigationAttempt?: () => void,
  warningMessage: string = 'Game in progress. Sure you want to leave?'
): void {
  // Use refs to store the latest callback and message values
  const onNavigationAttemptRef = useRef(onNavigationAttempt);
  const warningMessageRef = useRef(warningMessage);

  // Update refs when props change
  useEffect(() => {
    onNavigationAttemptRef.current = onNavigationAttempt;
    warningMessageRef.current = warningMessage;
  }, [onNavigationAttempt, warningMessage]);

  // Browser back button and history protection
  useEffect(() => {
    if (!isActive) return;

    const handlePopState = (_event: PopStateEvent): void => {
      try {
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);

        // Call the navigation attempt callback if provided
        if (onNavigationAttemptRef.current) {
          onNavigationAttemptRef.current();
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- Error logging for debugging navigation guard
        console.error('Error in popstate handler:', error);
        // Still try to call the callback even if history manipulation fails
        if (onNavigationAttemptRef.current) {
          onNavigationAttemptRef.current();
        }
      }
    };

    try {
      // Push initial state to create a history entry for blocking
      window.history.pushState(null, '', window.location.href);

      // Add popstate listener to handle back button
      window.addEventListener('popstate', handlePopState);

      return (): void => {
        window.removeEventListener('popstate', handlePopState);
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging for debugging navigation guard
      console.error('Error setting up popstate protection:', error);
      return;
    }
  }, [isActive, onNavigationAttempt, warningMessage]);

  // Page unload protection (refresh/close)
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): string => {
      const message = warningMessageRef.current;

      // Prevent the default unload behavior
      event.preventDefault();

      // Set the return value (modern browsers show generic message)
      event.returnValue = message;

      // Return message for older browsers
      return message;
    };

    try {
      window.addEventListener('beforeunload', handleBeforeUnload);

      return (): void => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging for debugging navigation guard
      console.error('Error setting up beforeunload protection:', error);
      return;
    }
  }, [isActive, warningMessage]);
}

/**
 * Extended navigation guard hook with more advanced features
 *
 * This version provides additional functionality for complex navigation scenarios
 * and will be used in future phases for more sophisticated protection.
 *
 * @param options - Configuration options for the navigation guard
 * @returns Hook state and control functions
 */
export interface NavigationGuardOptions {
  /** Whether the guard should be active */
  isActive: boolean;
  /** Custom warning message */
  message?: string;
  /** Callback when navigation is attempted */
  onAttemptedNavigation?: (destination?: string) => void;
  /** Whether to allow navigation after confirmation */
  allowAfterConfirmation?: boolean;
}

export interface NavigationGuardState {
  /** Whether navigation is currently blocked */
  isBlocked: boolean;
  /** Force allow navigation (bypasses guard) */
  allowNavigation: () => void;
  /** Reset guard state */
  resetGuard: () => void;
}

/**
 * Advanced navigation guard hook (for future use)
 *
 * @param options - Configuration options
 * @returns Guard state and control functions
 */
export function useAdvancedNavigationGuard(options: NavigationGuardOptions): NavigationGuardState {
  const { isActive, message, onAttemptedNavigation } = options;

  // State for controlling guard behavior
  const isBlocked = isActive;
  const allowNavigation = useCallback(() => {
    // Implementation for bypassing guard
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Navigation allowed');
  }, []);

  const resetGuard = useCallback(() => {
    // Implementation for resetting guard state
    // eslint-disable-next-line no-console -- Development placeholder logging
    console.log('Guard reset');
  }, []);

  // Use the basic navigation guard
  useNavigationGuard(isActive, onAttemptedNavigation, message);

  return {
    isBlocked,
    allowNavigation,
    resetGuard,
  };
}
