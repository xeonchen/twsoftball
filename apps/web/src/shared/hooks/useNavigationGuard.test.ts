import { renderHook, act } from '@testing-library/react';

import { useNavigationGuard } from './useNavigationGuard';

/**
 * Navigation Guard Hook Tests
 *
 * Following TDD approach for browser navigation protection during active games.
 * These tests verify that the hook properly:
 * 1. Sets up event listeners when guard is active
 * 2. Prevents browser back navigation
 * 3. Shows beforeunload warnings
 * 4. Handles popstate events correctly
 * 5. Cleans up properly on unmount
 *
 * Reference: docs/design/technical/browser-guards.md
 */

// Mock window methods
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockPushState = vi.fn();

// Store original methods
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
const originalPushState = window.history.pushState;

// Mock console.warn to prevent test noise
const mockConsoleWarn = vi.fn();
// eslint-disable-next-line no-console -- Test setup accessing original console
const originalConsoleWarn = console.warn;

describe('useNavigationGuard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window methods
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;
    window.history.pushState = mockPushState;
    // eslint-disable-next-line no-console -- Test setup replacing console
    console.warn = mockConsoleWarn;

    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://test.com/game/123/record',
        pathname: '/game/123/record',
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original methods
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    window.history.pushState = originalPushState;
    // eslint-disable-next-line no-console -- Test cleanup restoring console
    console.warn = originalConsoleWarn;
  });

  describe('Guard Activation', () => {
    it('should set up event listeners when guard is active', () => {
      renderHook(() => useNavigationGuard(true));

      // Should push initial state to create history entry
      expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.href);

      // Should set up popstate listener
      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));

      // Should set up beforeunload listener
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should not set up listeners when guard is inactive', () => {
      renderHook(() => useNavigationGuard(false));

      // Should not call any window methods
      expect(mockPushState).not.toHaveBeenCalled();
      expect(mockAddEventListener).not.toHaveBeenCalled();
    });

    it('should clean up listeners when guard becomes inactive', () => {
      const { rerender } = renderHook(({ isActive }) => useNavigationGuard(isActive), {
        initialProps: { isActive: true },
      });

      // Initial setup
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);

      // Deactivate guard
      rerender({ isActive: false });

      // Should clean up listeners
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('Browser Back Button Protection', () => {
    it('should handle popstate events by pushing state back', () => {
      const mockShowWarning = vi.fn();

      renderHook(() => useNavigationGuard(true, mockShowWarning));

      // Get the popstate handler
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      expect(popstateHandler).toBeDefined();

      // Simulate popstate event
      act(() => {
        popstateHandler?.(new PopStateEvent('popstate'));
      });

      // Should push state back to maintain position
      expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.href);

      // Should call warning callback
      expect(mockShowWarning).toHaveBeenCalled();
    });

    it('should work without warning callback', () => {
      renderHook(() => useNavigationGuard(true));

      // Get the popstate handler
      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      // Should not throw when no callback provided
      expect(() => {
        act(() => {
          popstateHandler?.(new PopStateEvent('popstate'));
        });
      }).not.toThrow();

      // Should still push state back
      expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.href);
    });
  });

  describe('Page Unload Protection', () => {
    it('should prevent page unload when guard is active', () => {
      renderHook(() => useNavigationGuard(true));

      // Get the beforeunload handler
      const beforeUnloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeUnloadHandler).toBeDefined();

      // Create mock event
      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: '',
      };

      // Simulate beforeunload event
      act(() => {
        const result = beforeUnloadHandler?.(mockEvent as BeforeUnloadEvent);
        expect(result).toBe('Game in progress. Sure you want to leave?');
      });

      // Should prevent default and set return value
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('Game in progress. Sure you want to leave?');
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom warning message';

      renderHook(() => useNavigationGuard(true, undefined, customMessage));

      const beforeUnloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: '',
      };

      act(() => {
        const result = beforeUnloadHandler?.(mockEvent as BeforeUnloadEvent);
        expect(result).toBe(customMessage);
      });

      expect(mockEvent.returnValue).toBe(customMessage);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up listeners on unmount', () => {
      const { unmount } = renderHook(() => useNavigationGuard(true));

      // Verify initial setup
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);

      unmount();

      // Should remove both listeners
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should handle multiple re-renders without duplicate listeners', () => {
      const { rerender } = renderHook(
        ({ message }) => useNavigationGuard(true, undefined, message),
        { initialProps: { message: 'Initial message' } }
      );

      // Initial setup
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);

      // Re-render with different message
      rerender({ message: 'Updated message' });

      // Should clean up old listeners and add new ones
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
      expect(mockAddEventListener).toHaveBeenCalledTimes(4); // 2 initial + 2 new
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid guard state changes', () => {
      const { rerender } = renderHook(({ isActive }) => useNavigationGuard(isActive), {
        initialProps: { isActive: true },
      });

      // Toggle guard rapidly
      rerender({ isActive: false });
      rerender({ isActive: true });
      rerender({ isActive: false });

      // Should have proper cleanup calls
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });

    it('should work with different callback combinations', () => {
      const mockWarning1 = vi.fn();
      const mockWarning2 = vi.fn();

      const { rerender } = renderHook(({ callback }) => useNavigationGuard(true, callback), {
        initialProps: { callback: mockWarning1 },
      });

      // Get initial popstate handler
      let popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      act(() => {
        popstateHandler?.(new PopStateEvent('popstate'));
      });

      expect(mockWarning1).toHaveBeenCalled();
      expect(mockWarning2).not.toHaveBeenCalled();

      // Change callback
      rerender({ callback: mockWarning2 });

      // Get new popstate handler
      popstateHandler = mockAddEventListener.mock.calls
        .slice(-2) // Get last 2 calls
        .find(call => call[0] === 'popstate')?.[1];

      act(() => {
        popstateHandler?.(new PopStateEvent('popstate'));
      });

      expect(mockWarning2).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event listeners gracefully', () => {
      // Mock console.error to capture errors
      const mockConsoleError = vi.fn();
      // eslint-disable-next-line no-console -- Test accessing original console for error handling
      const originalConsoleError = console.error;
      // eslint-disable-next-line no-console -- Test replacing console for error handling
      console.error = mockConsoleError;

      // Mock pushState to throw error
      mockPushState.mockImplementation(() => {
        throw new Error('History API error');
      });

      renderHook(() => useNavigationGuard(true));

      const popstateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      // Should not throw error to the user
      expect(() => {
        act(() => {
          popstateHandler?.(new PopStateEvent('popstate'));
        });
      }).not.toThrow();

      // Restore console.error
      // eslint-disable-next-line no-console -- Test cleanup restoring console for error handling
      console.error = originalConsoleError;
    });
  });
});
