import { useEffect, useRef } from 'react';

import { timerManager } from '../../timer-manager';

/**
 * React hook for managing timers with automatic cleanup on component unmount.
 *
 * Provides a timerManager instance that automatically cleans up all timers
 * when the component unmounts, preventing memory leaks.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const timers = useTimerManager();
 *
 *   const handleClick = () => {
 *     timers.setTimeout(() => {
 *       console.log('This timer will be cleaned up on unmount');
 *     }, 1000);
 *   };
 *
 *   return <button onClick={handleClick}>Start Timer</button>;
 * }
 * ```
 *
 * @returns Timer manager instance with automatic cleanup
 */
export function useTimerManager(): {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timerId: number) => void;
  clearAllTimers: () => void;
} {
  const timerIdsRef = useRef<Set<number>>(new Set());

  const componentTimerManager = useRef({
    setTimeout: (callback: () => void, delay: number): number => {
      const timerId = timerManager.setTimeout(callback, delay);
      timerIdsRef.current.add(timerId);
      return timerId;
    },

    clearTimeout: (timerId: number): void => {
      timerManager.clearTimeout(timerId);
      timerIdsRef.current.delete(timerId);
    },

    clearAllTimers: (): void => {
      timerIdsRef.current.forEach(timerId => {
        timerManager.clearTimeout(timerId);
      });
      timerIdsRef.current.clear();
    },
  });

  // Clean up all component timers on unmount
  useEffect((): (() => void) => {
    const manager = componentTimerManager.current;
    return (): void => {
      manager.clearAllTimers();
    };
  }, []);

  return componentTimerManager.current;
}
