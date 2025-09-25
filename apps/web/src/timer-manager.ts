/**
 * Timer Management System
 * Tracks all setTimeout references to prevent memory leaks
 * Provides cleanup functionality for page unload and visibility change events
 */
export class TimerManager {
  private readonly timers: Set<number> = new Set();

  /**
   * Creates a tracked setTimeout that will be automatically cleaned up
   * @param callback - Function to execute after delay
   * @param delay - Delay in milliseconds
   * @returns Timer ID for manual cleanup if needed
   */
  setTimeout(callback: () => void, delay: number): number {
    const timerId = window.setTimeout(() => {
      // Execute callback and remove from tracking
      callback();
      this.timers.delete(timerId);
    }, delay);

    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Clears a specific timer and removes it from tracking
   * @param timerId - Timer ID to clear
   */
  clearTimeout(timerId: number): void {
    if (this.timers.has(timerId)) {
      window.clearTimeout(timerId);
      this.timers.delete(timerId);
    }
  }

  /**
   * Clears all tracked timers - used for cleanup on page unload/hide
   */
  clearAllTimers(): void {
    for (const timerId of this.timers) {
      window.clearTimeout(timerId);
    }
    this.timers.clear();
  }

  /**
   * Returns the number of active timers (for testing)
   * @returns Number of active timers
   */
  getActiveTimerCount(): number {
    return this.timers.size;
  }
}

// Global timer manager instance
export const timerManager = new TimerManager();

/**
 * Setup cleanup handlers to prevent memory leaks
 * Clears all timers when page is unloaded or becomes hidden
 */
export function setupTimerCleanup(): void {
  // Clear all timers before page unload
  window.addEventListener('beforeunload', () => {
    timerManager.clearAllTimers();
  });

  // Clear all timers when page becomes hidden (mobile/tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      timerManager.clearAllTimers();
    }
  });
}
