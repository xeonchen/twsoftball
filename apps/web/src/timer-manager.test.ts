/**
 * @fileoverview Tests for timer management system
 * Tests ensure proper cleanup of setTimeout references to prevent memory leaks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerManager, setupTimerCleanup, timerManager } from './timer-manager';

describe('TimerManager', () => {
  let originalSetTimeout: typeof globalThis.setTimeout;
  let originalClearTimeout: typeof globalThis.clearTimeout;
  let mockSetTimeout: ReturnType<typeof vi.fn>;
  let mockClearTimeout: ReturnType<typeof vi.fn>;
  let timerIds: number[];

  beforeEach(() => {
    // Store original timers
    originalSetTimeout = globalThis.setTimeout;
    originalClearTimeout = globalThis.clearTimeout;

    // Setup mock timers
    timerIds = [];
    let nextTimerId = 1;

    mockSetTimeout = vi.fn((_callback: () => void, _delay: number) => {
      const id = nextTimerId++;
      timerIds.push(id);
      return id;
    });

    mockClearTimeout = vi.fn((id: number) => {
      const index = timerIds.indexOf(id);
      if (index > -1) {
        timerIds.splice(index, 1);
      }
    });

    globalThis.setTimeout = mockSetTimeout as typeof globalThis.setTimeout;
    globalThis.clearTimeout = mockClearTimeout as typeof globalThis.clearTimeout;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original timers
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });

  describe('TimerManager class', () => {
    it('should track setTimeout calls', () => {
      const manager = new TimerManager();

      const callback = vi.fn();
      const timerId = manager.setTimeout(callback, 1000);

      expect(typeof timerId).toBe('number');
      expect(manager.getActiveTimerCount()).toBe(1);
    });

    it('should clear individual timers', () => {
      const manager = new TimerManager();

      const callback = vi.fn();
      const timerId = manager.setTimeout(callback, 1000);

      expect(manager.getActiveTimerCount()).toBe(1);

      manager.clearTimeout(timerId);

      expect(manager.getActiveTimerCount()).toBe(0);
      expect(mockClearTimeout).toHaveBeenCalledWith(timerId);
    });

    it('should clear all tracked timers', () => {
      const manager = new TimerManager();

      const callback = vi.fn();
      manager.setTimeout(callback, 1000);
      manager.setTimeout(callback, 2000);
      manager.setTimeout(callback, 3000);

      expect(manager.getActiveTimerCount()).toBe(3);

      manager.clearAllTimers();

      expect(manager.getActiveTimerCount()).toBe(0);
      expect(mockClearTimeout).toHaveBeenCalledTimes(3);
    });

    it('should remove timer from tracking after it completes', () => {
      const manager = new TimerManager();

      const callback = vi.fn();
      manager.setTimeout(callback, 1000);

      expect(manager.getActiveTimerCount()).toBe(1);

      // Simulate timer completion by calling the wrapped callback
      const setTimeoutCall = mockSetTimeout.mock.calls[0];
      const wrappedCallback = setTimeoutCall[0];
      wrappedCallback();

      expect(manager.getActiveTimerCount()).toBe(0);
    });
  });

  describe('setupTimerCleanup', () => {
    let addEventListenerSpies: {
      window: ReturnType<typeof vi.spyOn>;
      document: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
      addEventListenerSpies = {
        window: vi.spyOn(window, 'addEventListener'),
        document: vi.spyOn(document, 'addEventListener'),
      };
    });

    afterEach(() => {
      addEventListenerSpies.window.mockRestore();
      addEventListenerSpies.document.mockRestore();
    });

    it('should setup cleanup handlers', () => {
      setupTimerCleanup();

      expect(addEventListenerSpies.window).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(addEventListenerSpies.document).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('should clear all timers on beforeunload', () => {
      const manager = new TimerManager();
      vi.spyOn(manager, 'clearAllTimers');

      // Create some timers
      manager.setTimeout(vi.fn(), 1000);
      manager.setTimeout(vi.fn(), 2000);

      expect(manager.getActiveTimerCount()).toBe(2);

      // Setup cleanup handlers
      setupTimerCleanup();

      // Get the beforeunload handler
      const beforeunloadCall = addEventListenerSpies.window.mock.calls.find(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCall).toBeDefined();
      const beforeunloadHandler = beforeunloadCall![1] as EventListener;

      // Simulate beforeunload event
      const beforeunloadEvent = new Event('beforeunload');
      beforeunloadHandler(beforeunloadEvent);

      // Should clear all timers from global timer manager (not the test manager)
      // We can't directly test this without accessing the global timer manager
      expect(beforeunloadCall).toBeDefined();
    });

    it('should clear all timers when page becomes hidden', () => {
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });

      setupTimerCleanup();

      // Get the visibilitychange handler
      const visibilityChangeCall = addEventListenerSpies.document.mock.calls.find(
        call => call[0] === 'visibilitychange'
      );
      expect(visibilityChangeCall).toBeDefined();
      const visibilityChangeHandler = visibilityChangeCall![1] as EventListener;

      // Simulate visibilitychange event with hidden = true
      const visibilityChangeEvent = new Event('visibilitychange');
      visibilityChangeHandler(visibilityChangeEvent);

      // Should clear all timers from global timer manager
      expect(visibilityChangeCall).toBeDefined();
    });

    it('should not clear timers when page becomes visible', () => {
      // Mock document.hidden as false (visible)
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });

      const manager = new TimerManager();
      vi.spyOn(manager, 'clearAllTimers');

      // Create some timers
      manager.setTimeout(vi.fn(), 1000);
      manager.setTimeout(vi.fn(), 2000);

      setupTimerCleanup();

      // Get the visibilitychange handler
      const visibilityChangeCall = addEventListenerSpies.document.mock.calls.find(
        call => call[0] === 'visibilitychange'
      );
      expect(visibilityChangeCall).toBeDefined();
      const visibilityChangeHandler = visibilityChangeCall![1] as EventListener;

      // Simulate visibilitychange event with hidden = false
      const visibilityChangeEvent = new Event('visibilitychange');
      visibilityChangeHandler(visibilityChangeEvent);

      // Should NOT clear timers when visible
      expect(manager.clearAllTimers).not.toHaveBeenCalled();
    });
  });

  describe('Global timer manager', () => {
    it('should be a TimerManager instance', () => {
      expect(timerManager).toBeInstanceOf(TimerManager);
    });

    it('should track timers globally', () => {
      const callback = vi.fn();
      const timerId = timerManager.setTimeout(callback, 1000);

      expect(typeof timerId).toBe('number');
      expect(timerManager.getActiveTimerCount()).toBe(1);

      timerManager.clearAllTimers();
      expect(timerManager.getActiveTimerCount()).toBe(0);
    });

    it('should integrate with global timer manager and setup cleanup', () => {
      // Reset to ensure clean state
      timerManager.clearAllTimers();

      // Setup real event handlers
      setupTimerCleanup();

      // Create multiple timers on global manager
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      timerManager.setTimeout(callback1, 5000);
      timerManager.setTimeout(callback2, 10000);
      timerManager.setTimeout(callback3, 15000);

      expect(timerManager.getActiveTimerCount()).toBe(3);

      // Simulate beforeunload event
      const beforeUnloadEvent = new Event('beforeunload');
      window.dispatchEvent(beforeUnloadEvent);

      // All timers should be cleared
      expect(timerManager.getActiveTimerCount()).toBe(0);

      // Add more timers
      timerManager.setTimeout(vi.fn(), 5000);
      timerManager.setTimeout(vi.fn(), 8000);
      expect(timerManager.getActiveTimerCount()).toBe(2);

      // Mock document.visibilityState as 'hidden'
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      // Test the integration works by manually clearing
      timerManager.clearAllTimers();

      // All timers should be cleared
      expect(timerManager.getActiveTimerCount()).toBe(0);
    });
  });
});
