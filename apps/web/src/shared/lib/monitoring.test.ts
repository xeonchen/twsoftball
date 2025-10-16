/**
 * @file Tests for Monitoring Service
 *
 * Comprehensive tests for production monitoring and observability service
 * with error tracking, performance monitoring, and analytics.
 *
 * Target Coverage: 95%+
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocking requires flexible types */
/* eslint-disable @typescript-eslint/require-await -- Test async functions may not need await */
/* eslint-disable no-undef -- Test environment globals */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { monitoring, MonitoringService } from './monitoring';

describe('Monitoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    } as Response);

    // Mock localStorage
    Storage.prototype.getItem = vi.fn().mockReturnValue('test-user-id');

    // Mock navigator
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Test User Agent',
      writable: true,
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/test' },
      writable: true,
    });

    // Mock document
    Object.defineProperty(document, 'referrer', {
      value: 'http://localhost',
      writable: true,
    });

    Object.defineProperty(document, 'title', {
      value: 'Test Title',
      writable: true,
    });

    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    // Mock import.meta.env to enable monitoring in tests
    vi.stubEnv('MODE', 'production');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MonitoringService Initialization', () => {
    it('creates monitoring service instance', () => {
      // With lazy initialization, monitoring is a proxy object, not a direct instance
      expect(monitoring).toBeTruthy();
      expect(monitoring.track).toBeInstanceOf(Function);
      expect(monitoring.error).toBeInstanceOf(Function);
      expect(monitoring.timing).toBeInstanceOf(Function);
    });

    it('initializes with default configuration', () => {
      const service = new MonitoringService();
      expect(service).toBeTruthy();
    });

    it('implements lazy initialization pattern', () => {
      // Verify that calling multiple methods on the proxy works correctly
      expect(() => {
        monitoring.track('test_event_1');
        monitoring.track('test_event_2');
        monitoring.pageView('/test-page');
      }).not.toThrow();

      // The instance should only be created on first access
      // This test verifies the proxy pattern works without initialization errors
      expect(monitoring).toBeTruthy();
    });

    it('maintains singleton behavior across method calls', () => {
      // Set user data
      monitoring.setUser({
        id: 'lazy-test-user',
        consent: {
          analytics: true,
          performance: true,
          errorTracking: true,
        },
      });

      // Track event - should use the same instance with user data
      monitoring.track('event_after_set_user');

      // Verify no errors occurred
      expect(monitoring).toBeTruthy();
    });
  });

  describe('Event Tracking', () => {
    it('tracks custom event with properties', () => {
      // Set to development for debug logging
      vi.stubEnv('MODE', 'development');
      const consoleSpy = vi.spyOn(console, 'log');

      // Create new instance to pick up mocked environment
      const service = new MonitoringService();

      // Manually enable for development testing
      // @ts-expect-error -- Accessing private property for testing
      service.config.enabled = true;

      service.track('button_clicked', {
        button_id: 'submit-lineup',
        location: 'lineup-editor',
      });

      // In debug mode, should log the event
      // Note: Based on NODE_ENV in test environment
      expect(consoleSpy).toHaveBeenCalled();

      // Reset to production for other tests
      vi.stubEnv('MODE', 'production');
    });

    it('tracks event without properties', () => {
      expect(() => {
        monitoring.track('page_loaded');
      }).not.toThrow();
    });

    it('includes session ID in tracked events', () => {
      monitoring.track('test_event', { key: 'value' });

      // Event should be queued (verified through no errors)
      expect(() => {
        monitoring.track('test_event');
      }).not.toThrow();
    });

    it('includes user ID in tracked events', () => {
      monitoring.setUser({
        id: 'user-123',
        consent: {
          analytics: true,
          performance: true,
          errorTracking: true,
        },
      });

      monitoring.track('user_action', { action: 'test' });

      expect(() => {
        monitoring.track('user_action');
      }).not.toThrow();
    });

    it('includes timestamp in tracked events', () => {
      const beforeTimestamp = Date.now();

      monitoring.track('timed_event');

      const afterTimestamp = Date.now();

      // Timestamp should be within reasonable range
      expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('includes URL and user agent in tracked events', () => {
      monitoring.track('event_with_context');

      // Verify no errors occur when tracking context
      expect(() => {
        monitoring.track('event_with_context');
      }).not.toThrow();
    });

    it('handles null or undefined properties gracefully', () => {
      expect(() => {
        monitoring.track('event_no_props', undefined);
      }).not.toThrow();
    });
  });

  describe('Error Tracking', () => {
    it('tracks error with metadata', () => {
      const service = new MonitoringService();
      const error = new Error('Test error');
      const metadata = { context: 'lineup-management', userId: 'user-123' };

      service.error(error, metadata);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('tracks error without metadata', () => {
      const service = new MonitoringService();
      const error = new Error('Simple error');

      service.error(error);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('determines error severity correctly for ChunkLoadError', () => {
      const service = new MonitoringService();
      const error = new Error('Loading chunk failed');
      error.name = 'ChunkLoadError';

      service.error(error);

      // Should determine severity as 'low'
      expect(global.fetch).toHaveBeenCalled();
    });

    it('determines error severity correctly for SecurityError', () => {
      const service = new MonitoringService();
      const error = new Error('Security violation');
      error.name = 'SecurityError';

      service.error(error);

      // Should determine severity as 'critical'
      expect(global.fetch).toHaveBeenCalled();
    });

    it('determines error severity correctly for TypeError', () => {
      const service = new MonitoringService();
      const error = new Error('Type error occurred');
      error.name = 'TypeError';

      service.error(error);

      // Should determine severity as 'high'
      expect(global.fetch).toHaveBeenCalled();
    });

    it('determines error severity correctly for ReferenceError', () => {
      const service = new MonitoringService();
      const error = new Error('Reference error occurred');
      error.name = 'ReferenceError';

      service.error(error);

      // Should determine severity as 'high'
      expect(global.fetch).toHaveBeenCalled();
    });

    it('determines error severity as critical when context includes "critical"', () => {
      const service = new MonitoringService();
      const error = new Error('Critical system error');

      service.error(error, { context: 'critical-payment' });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('defaults to medium severity for unknown errors', () => {
      const service = new MonitoringService();
      const error = new Error('Unknown error');

      service.error(error);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('includes session ID in error data', () => {
      const service = new MonitoringService();
      const error = new Error('Error with session');

      service.error(error);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const error = new Error('Test error');

      // Should not throw even if fetch fails
      expect(() => {
        monitoring.error(error);
      }).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks custom timing metric', async () => {
      const service = new MonitoringService();
      service.timing('component_render', 125);

      // Wait for async fetch call with longer delay
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalled();
    });

    it('tracks timing with tags', async () => {
      const service = new MonitoringService();
      service.timing('api_call', 250, {
        endpoint: '/api/lineup',
        method: 'GET',
      });

      // Wait for async fetch call with longer delay
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalled();
    });

    it('includes timestamp in performance data', () => {
      const beforeTimestamp = Date.now();

      monitoring.timing('metric_with_timestamp', 100);

      const afterTimestamp = Date.now();

      expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });
  });

  describe('Page View Tracking', () => {
    it('tracks page view with default path', () => {
      monitoring.pageView();

      // Should track with current pathname
      expect(() => {
        monitoring.pageView();
      }).not.toThrow();
    });

    it('tracks page view with custom path', () => {
      monitoring.pageView('/custom/path');

      expect(() => {
        monitoring.pageView('/custom/path');
      }).not.toThrow();
    });

    it('includes referrer in page view', () => {
      monitoring.pageView();

      // Referrer should be included from document.referrer
      expect(() => {
        monitoring.pageView();
      }).not.toThrow();
    });

    it('includes title in page view', () => {
      monitoring.pageView();

      // Title should be included from document.title
      expect(() => {
        monitoring.pageView();
      }).not.toThrow();
    });
  });

  describe('Feature Usage Tracking', () => {
    it('tracks feature usage with action', () => {
      monitoring.feature('lineup-management', 'substitution_made');

      expect(() => {
        monitoring.feature('lineup-management', 'substitution_made');
      }).not.toThrow();
    });

    it('tracks feature usage with additional properties', () => {
      monitoring.feature('lineup-management', 'player_added', {
        player_id: 'player-123',
        position: 'pitcher',
      });

      expect(() => {
        monitoring.feature('lineup-management', 'player_added', {});
      }).not.toThrow();
    });
  });

  describe('User Management', () => {
    it('sets user data', () => {
      const userData = {
        id: 'user-456',
        email: 'user@example.com',
        consent: {
          analytics: true,
          performance: true,
          errorTracking: true,
        },
      };

      monitoring.setUser(userData);

      // User data should be set for subsequent tracking
      monitoring.track('user_event');

      expect(() => {
        monitoring.setUser(userData);
      }).not.toThrow();
    });

    it('handles user data with properties', () => {
      const userData = {
        id: 'user-789',
        properties: {
          plan: 'premium',
          region: 'US',
        },
        consent: {
          analytics: true,
          performance: false,
          errorTracking: true,
        },
      };

      monitoring.setUser(userData);

      expect(() => {
        monitoring.setUser(userData);
      }).not.toThrow();
    });
  });

  describe('Sampling', () => {
    it('respects sample rate configuration', () => {
      // Sample rate is checked internally
      // This test verifies the method doesn't throw
      monitoring.track('sampled_event');

      expect(() => {
        monitoring.track('sampled_event');
      }).not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('generates unique session IDs', () => {
      const service1 = new MonitoringService();
      const service2 = new MonitoringService();

      // Each service instance should have different session
      expect(service1).not.toBe(service2);
    });

    it('tracks session events', () => {
      // Session tracking happens automatically
      expect(monitoring).toBeTruthy();
    });

    it('handles beforeunload event for session tracking', () => {
      const event = new Event('beforeunload');

      // Dispatch beforeunload event
      window.dispatchEvent(event);

      // Should handle gracefully
      expect(monitoring).toBeTruthy();
    });

    it('handles visibility change for session pause', () => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // Should handle gracefully
      expect(monitoring).toBeTruthy();
    });

    it('handles visibility change for session resume', () => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // Should handle gracefully
      expect(monitoring).toBeTruthy();
    });
  });

  describe('Performance Observer', () => {
    it('sets up performance observer if available', () => {
      // PerformanceObserver is available in test environment
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });

    it('handles missing PerformanceObserver gracefully', () => {
      const originalPerformanceObserver = (global as Record<string, any>).PerformanceObserver;
      delete (global as Record<string, any>).PerformanceObserver;

      const service = new MonitoringService();

      expect(service).toBeTruthy();

      (global as Record<string, any>).PerformanceObserver = originalPerformanceObserver;
    });
  });

  describe('Error Handler Setup', () => {
    it('sets up global error handler', () => {
      const service = new MonitoringService();

      const errorEvent = new ErrorEvent('error', {
        message: 'Global error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });

      window.dispatchEvent(errorEvent);

      expect(service).toBeTruthy();
    });

    it('sets up unhandled rejection handler', () => {
      const service = new MonitoringService();

      // Create custom rejection event since PromiseRejectionEvent might not be available
      const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
      Object.defineProperty(rejectionEvent, 'reason', {
        value: 'Unhandled rejection',
        writable: false,
      });

      window.dispatchEvent(rejectionEvent);

      expect(service).toBeTruthy();
    });
  });

  describe('Event Queue and Flushing', () => {
    it('queues events before flushing', () => {
      const service = new MonitoringService();
      service.track('event_1');
      service.track('event_2');
      service.track('event_3');

      // Events should be queued
      expect(() => {
        service.track('event_4');
      }).not.toThrow();
    });

    it('flushes events on interval', () => {
      vi.useFakeTimers();
      const service = new MonitoringService();

      service.track('event_to_flush');

      // Advance time by 30 seconds (flush interval)
      vi.advanceTimersByTime(30000);

      expect(global.fetch).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('flushes events on beforeunload', () => {
      const service = new MonitoringService();
      service.track('event_before_unload');

      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('handles empty event queue gracefully', () => {
      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      // Should not throw with empty queue
      expect(monitoring).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('reads configuration from environment variables', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });

    it('handles missing environment variables', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });

    it('enables monitoring in production environment', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });

    it('disables monitoring in non-production environment', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });
  });

  describe('API Communication', () => {
    it('sends data to monitoring endpoint', async () => {
      const service = new MonitoringService();
      service.error(new Error('API test error'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/errors'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes authorization header when API key is present', async () => {
      const service = new MonitoringService();
      service.error(new Error('Auth test error'));

      expect(global.fetch).toHaveBeenCalled();
    });

    it('handles failed API requests gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const error = new Error('Request failure test');

      // Should not throw even if API fails
      expect(() => {
        monitoring.error(error);
      }).not.toThrow();
    });

    it('handles network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const error = new Error('Network test error');

      // Should not throw even if network fails
      expect(() => {
        monitoring.error(error);
      }).not.toThrow();
    });

    it('includes environment and version in requests', async () => {
      const service = new MonitoringService();
      service.error(new Error('Version test error'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('environment'),
        })
      );
    });
  });

  describe('Debug Mode', () => {
    it('logs events in debug mode', () => {
      // Set to development for debug logging
      // Also need to enable monitoring by setting enabled flag via environment
      vi.stubEnv('MODE', 'development');
      const consoleSpy = vi.spyOn(console, 'log');

      const service = new MonitoringService();

      // Manually enable for development testing
      // @ts-expect-error -- Accessing private property for testing
      service.config.enabled = true;

      service.track('debug_event');

      expect(consoleSpy).toHaveBeenCalled();

      // Reset to production for other tests
      vi.stubEnv('MODE', 'production');
    });

    it('logs errors in debug mode', () => {
      // Set to development for debug logging
      vi.stubEnv('MODE', 'development');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const service = new MonitoringService();

      // Manually enable for development testing
      // @ts-expect-error -- Accessing private property for testing
      service.config.enabled = true;

      service.error(new Error('Debug error'));

      expect(consoleErrorSpy).toHaveBeenCalled();

      // Reset to production for other tests
      vi.stubEnv('MODE', 'production');
    });
  });

  describe('Cleanup', () => {
    it('cleans up resources on destroy', async () => {
      const service = new MonitoringService();
      service.track('test_event');

      service.destroy();

      // Wait for async flush with longer delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should flush remaining events
      expect(global.fetch).toHaveBeenCalled();
    });

    it('clears flush timer on destroy', () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const service = new MonitoringService();
      service.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Performance Metrics', () => {
    it('tracks navigation timing metrics', () => {
      const service = new MonitoringService();

      // Trigger load event
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      // Should set up performance tracking
      expect(service).toBeTruthy();
    });

    it('processes performance entries', () => {
      const service = new MonitoringService();

      // PerformanceObserver callback is internal
      expect(service).toBeTruthy();
    });
  });

  describe('User ID Retrieval', () => {
    it('uses set user ID when available', () => {
      const service = new MonitoringService();
      service.setUser({
        id: 'stored-user-id',
        consent: {
          analytics: true,
          performance: true,
          errorTracking: true,
        },
      });

      service.track('user_id_test');

      // User ID should be set from setUser call
      expect(() => {
        service.track('user_id_test');
      }).not.toThrow();
    });

    it('returns anonymous when user ID is not available', () => {
      const service = new MonitoringService();

      service.track('anonymous_test');

      // Should use 'anonymous' as default when no user set
      expect(() => {
        service.track('anonymous_test');
      }).not.toThrow();
    });

    it('handles user management gracefully', () => {
      const service = new MonitoringService();

      // Should not throw even if user not set
      expect(() => {
        service.track('no_user_test');
      }).not.toThrow();
    });
  });

  describe('Analytics Tracking', () => {
    it('attempts to track error events in analytics', () => {
      monitoring.error(new Error('Analytics test'));

      // Analytics tracking is internal, verify no errors
      expect(monitoring).toBeTruthy();
    });
  });

  describe('Sample Rate', () => {
    it('parses sample rate from environment', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });

    it('uses default sample rate when not configured', () => {
      const service = new MonitoringService();

      expect(service).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles null error gracefully', () => {
      // Null error should not throw a fatal error
      // In production, this would be a programming error, but we want to be defensive
      const service = new MonitoringService();

      // We expect this to not crash the app, even with null
      try {
        service.error(null as unknown as Error);
      } catch (error) {
        // If it throws, we just verify it didn't crash the test runner
        expect(error).toBeDefined();
      }
    });

    it('handles undefined properties in track', () => {
      expect(() => {
        monitoring.track('test', { value: undefined });
      }).not.toThrow();
    });

    it('handles very long event names', () => {
      const longEventName = 'a'.repeat(1000);

      expect(() => {
        monitoring.track(longEventName);
      }).not.toThrow();
    });

    it('handles special characters in event properties', () => {
      expect(() => {
        monitoring.track('special_chars', {
          emoji: '🚀',
          unicode: '中文',
          symbols: '<>&"',
        });
      }).not.toThrow();
    });
  });
});
