/**
 * @file ErrorBoundary Component Tests
 *
 * Tests for React error boundary component that catches unhandled errors,
 * provides fallback UI, error reporting, and recovery mechanisms.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { type JSX } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }): JSX.Element => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>Normal rendering</div>;
};

// Component that throws different types of errors
const ErrorTypeComponent = ({ errorType }: { errorType: string }): JSX.Element => {
  switch (errorType) {
    case 'render':
      throw new Error('Render error');
    case 'async':
      setTimeout(() => {
        throw new Error('Async error');
      }, 0);
      return <div>Async component</div>;
    case 'network': {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    case 'validation': {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      throw validationError;
    }
    default:
      return <div>No error</div>;
  }
};

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  describe('Error Catching', () => {
    it('should catch React component errors and show fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/test component error/i)[0]).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry the failed operation/i })
      ).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal rendering')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should catch errors from nested components', () => {
      render(
        <ErrorBoundary>
          <div>
            <div>
              <ThrowingComponent shouldThrow={true} />
            </div>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();
    });

    it('should display different UI for different error types', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ErrorTypeComponent errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/network issue/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();

      unmount();

      render(
        <ErrorBoundary>
          <ErrorTypeComponent errorType="validation" />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/validation issue/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/please check your input/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow error recovery with retry button', async () => {
      let shouldThrow = true;

      const RetryableComponent = (): JSX.Element => {
        if (shouldThrow) {
          throw new Error('Retriable error');
        }
        return <div>Recovery successful</div>;
      };

      render(
        <ErrorBoundary>
          <RetryableComponent />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();

      // Simulate fix
      shouldThrow = false;

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Recovery successful')).toBeInTheDocument();
      });
    });

    it('should reset error state on retry', () => {
      const mockOnError = vi.fn();
      let shouldThrow = true;

      const ThrowingComponentWithState = (): JSX.Element => {
        if (shouldThrow) {
          throw new Error('Test component error');
        }
        return <div>Normal rendering</div>;
      };

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowingComponentWithState />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();

      // Fix the error condition before retry
      shouldThrow = false;

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      fireEvent.click(retryButton);

      expect(screen.getByText('Normal rendering')).toBeInTheDocument();
    });

    it('should provide refresh option for persistent errors', () => {
      const mockRefresh = vi.fn();

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: mockRefresh },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh the current page/i });
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    it('should provide error reporting functionality', async () => {
      const mockReportError = vi.fn().mockResolvedValue({ reportId: 'ERR-123' });

      render(
        <ErrorBoundary onReportError={mockReportError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report this error to support/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockReportError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(Error),
            errorInfo: expect.objectContaining({
              componentStack: expect.any(String),
            }),
            context: expect.objectContaining({
              timestamp: expect.any(String),
              userAgent: expect.any(String),
            }),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/error reported: ERR-123/i)).toBeInTheDocument();
      });
    });

    it('should handle error reporting failures gracefully', async () => {
      const mockReportError = vi.fn().mockRejectedValue(new Error('Reporting failed'));

      render(
        <ErrorBoundary onReportError={mockReportError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report this error to support/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to report error/i)).toBeInTheDocument();
      });
    });

    it('should include additional context in error reports', async () => {
      const mockReportError = vi.fn().mockResolvedValue({ reportId: 'ERR-456' });
      const additionalContext = {
        gameId: 'game-123',
        phase: 'recording-at-bat',
        userRole: 'scorer',
      };

      render(
        <ErrorBoundary onReportError={mockReportError} context={additionalContext}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /report this error to support/i });
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockReportError).toHaveBeenCalledWith({
          error: expect.any(Error),
          errorInfo: expect.any(Object),
          context: expect.objectContaining(additionalContext),
        });
      });
    });
  });

  describe('Error Information Display', () => {
    it('should show detailed error information in development mode', () => {
      const originalEnv = import.meta.env.MODE;
      // @ts-expect-error - Mocking environment for testing
      import.meta.env.MODE = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error details/i)).toBeInTheDocument();
      expect(screen.getByText(/component stack/i)).toBeInTheDocument();

      // @ts-expect-error - Restoring environment for testing
      import.meta.env.MODE = originalEnv;
    });

    it('should hide detailed error information in production mode', () => {
      const originalEnv = import.meta.env.MODE;
      // @ts-expect-error - Mocking environment for testing
      import.meta.env.MODE = 'production';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/component stack/i)).not.toBeInTheDocument();

      // @ts-expect-error - Restoring environment for testing
      import.meta.env.MODE = originalEnv;
    });

    it('should provide user-friendly error messages', () => {
      render(
        <ErrorBoundary>
          <ErrorTypeComponent errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/network issue/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByText(/try again in a moment/i)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback UI', () => {
    it('should support custom fallback components', () => {
      const CustomFallback = ({
        error,
        retry,
      }: {
        error: Error;
        retry: () => void;
      }): JSX.Element => (
        <div>
          <h2>Custom Error UI</h2>
          <p>Error: {error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /custom retry/i })).toBeInTheDocument();
    });

    it('should pass error and retry function to custom fallback', () => {
      const _mockRetry = vi.fn();
      const CustomFallback = ({
        error,
        retry,
      }: {
        error: Error;
        retry: () => void;
      }): JSX.Element => (
        <div>
          <span>Error: {error.message}</span>
          <button onClick={retry} data-testid="custom-retry">
            Retry
          </button>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByTestId('custom-retry');
      fireEvent.click(retryButton);

      // The retry functionality should work
      expect(screen.getByText('Error: Test component error')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Nesting', () => {
    it('should handle nested error boundaries correctly', () => {
      render(
        <ErrorBoundary>
          <div>Outer boundary</div>
          <ErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();
      expect(screen.getByText('Outer boundary')).toBeInTheDocument();
    });

    it('should isolate errors to nearest boundary', () => {
      render(
        <ErrorBoundary>
          <div>Outer content should remain</div>
          <ErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </ErrorBoundary>
          <div>More outer content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer content should remain')).toBeInTheDocument();
      expect(screen.getByText('More outer content')).toBeInTheDocument();
      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();
    });
  });

  describe('Integration with Monitoring', () => {
    it('should integrate with error monitoring services', async () => {
      const mockSentryCapture = vi.fn();

      // Mock Sentry
      window.Sentry = {
        captureException: mockSentryCapture,
      };

      render(
        <ErrorBoundary enableMonitoring={true}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockSentryCapture).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            tags: expect.any(Object),
            extra: expect.any(Object),
          })
        );
      });

      // Cleanup
      delete window.Sentry;
    });

    it('should handle monitoring service failures gracefully', () => {
      const mockSentryCapture = vi.fn().mockImplementation(() => {
        throw new Error('Sentry failed');
      });

      window.Sentry = {
        captureException: mockSentryCapture,
      };

      render(
        <ErrorBoundary enableMonitoring={true}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error boundary UI despite monitoring failure
      expect(screen.getAllByText(/something went wrong/i)[0]).toBeInTheDocument();

      // Cleanup
      delete window.Sentry;
    });
  });
});
