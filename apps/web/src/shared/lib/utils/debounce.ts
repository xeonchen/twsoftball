/**
 * @file debounce Utility
 *
 * Utility function for debouncing rapid function calls to improve performance
 * and prevent duplicate operations in user interactions.
 *
 * Phase 5: Performance & Polish - TDD Implementation
 *
 * Performance targets:
 * - Configurable delay periods (default 100ms for at-bat actions)
 * - Immediate execution option for critical actions
 * - Proper cleanup to prevent memory leaks
 * - Memory efficient with single timer per debounced function
 *
 * @remarks
 * This utility provides:
 * - Delayed execution with configurable timing
 * - Cancellation of previous pending calls
 * - Immediate execution mode for first call
 * - Cleanup methods for memory management
 * - Type safety with proper generic typing
 *
 * Used for:
 * - At-bat action button debouncing
 * - Search input debouncing
 * - Resize event handling
 * - API call rate limiting
 */

/**
 * Options for debounce function
 */
export interface DebounceOptions {
  /** Execute the function immediately on first call */
  immediate?: boolean;
}

/**
 * Debounced function interface with cancel and flush methods
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

/**
 * Creates a debounced version of the provided function that delays its execution
 * until after the specified delay has passed since the last time it was invoked.
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @param options - Configuration options
 * @returns A debounced version of the function with cancel and flush methods
 *
 * @example
 * ```typescript
 * const debouncedSave = debounce(saveData, 500);
 *
 * // Multiple rapid calls will only result in one execution after 500ms
 * debouncedSave('data1');
 * debouncedSave('data2');
 * debouncedSave('data3'); // Only this will execute after 500ms
 *
 * // Cancel pending execution
 * debouncedSave.cancel();
 *
 * // Force immediate execution
 * debouncedSave.flush();
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let result: ReturnType<T> | undefined;
  let lastCallTime = 0;

  const { immediate = false } = options;

  function invokeFunc(): ReturnType<T> | undefined {
    if (lastArgs !== null) {
      result = func.apply(lastThis, lastArgs) as ReturnType<T>;
      lastArgs = null;
      lastThis = null;
    }
    return result;
  }

  function shouldInvokeImmediately(): boolean {
    if (!immediate) return false;

    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // If enough time has passed since last call, allow immediate execution
    return timeoutId === null || timeSinceLastCall >= delay;
  }

  function leadingEdge(): ReturnType<T> | undefined {
    lastCallTime = Date.now();
    timeoutId = setTimeout(timerExpired, delay);
    return immediate ? invokeFunc() : result;
  }

  function timerExpired(): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < delay) {
      // Not enough time has passed, reschedule
      timeoutId = setTimeout(timerExpired, delay - timeSinceLastCall);
    } else {
      // Time has passed, invoke function
      timeoutId = null;
      if (!immediate || lastArgs !== null) {
        result = invokeFunc();
      }
    }
  }

  function cancel(): void {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastCallTime = 0;
    lastArgs = null;
    lastThis = null;
    result = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
      return invokeFunc();
    }
    return result;
  }

  function debounced(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const isInvoking = shouldInvokeImmediately();

    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- Necessary for debounce context preservation
    lastThis = this;
    lastCallTime = now;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge();
      }
      if (immediate) {
        // Immediate mode but timer is active, reset timer and return previous result
        timeoutId = setTimeout(timerExpired, delay);
        return result;
      }
    }

    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, Math.max(0, delay));
    }

    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced as DebouncedFunction<T>;
}
