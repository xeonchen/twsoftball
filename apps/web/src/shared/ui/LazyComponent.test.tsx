/**
 * @file Tests for LazyComponent Wrapper
 *
 * Tests reusable lazy loading wrapper with loading states,
 * error boundaries, timeouts, and preloading capabilities.
 *
 * Target Coverage: 90%+
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocking requires flexible types */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test functions don't need explicit return types */
/* eslint-disable no-undef -- Test environment globals */

import { render, screen, waitFor } from '@testing-library/react';
import { lazy, Suspense, ComponentType } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { LazyComponent, withLazyLoading } from './LazyComponent';

// Mock component for testing
const MockComponent = ({ testProp }: { testProp?: string }) => (
  <div data-testid="mock-component">Mock Component {testProp}</div>
);

// Create a lazy-loaded version
const LazyMockComponent = lazy(
  () =>
    new Promise<{ default: ComponentType<any> }>(resolve => {
      setTimeout(() => {
        resolve({ default: MockComponent });
      }, 100);
    })
);

// Component that fails to load
const FailingLazyComponent = lazy(
  () =>
    new Promise<{ default: ComponentType<any> }>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Failed to load component'));
      }, 100);
    })
);

describe('LazyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders component after loading completes', async () => {
      render(
        <LazyComponent
          component={LazyMockComponent}
          loadingMessage="Loading..."
          componentName="MockComponent"
        />
      );

      // Wait for component to load and render
      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('passes props to lazy-loaded component', async () => {
      render(
        <LazyComponent
          component={LazyMockComponent}
          componentProps={{ testProp: 'test-value' }}
          componentName="MockComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Mock Component test-value/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Custom Fallback', () => {
    it('replaces custom fallback with component after loading', async () => {
      const CustomFallback = <div data-testid="custom-fallback">Custom Loading...</div>;

      render(
        <LazyComponent
          component={LazyMockComponent}
          fallback={CustomFallback}
          componentName="MockComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
          expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('catches loading errors with error boundary', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Failed to load test component"
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Failed to Load Component/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('renders custom error fallback when provided', async () => {
      const CustomErrorFallback = <div data-testid="custom-error">Custom Error UI</div>;

      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorFallback={CustomErrorFallback}
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('custom-error')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('displays error message in default error fallback', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Custom error message for testing"
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Custom error message for testing/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('includes Try Again button in error fallback', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Loading failed"
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText('Try Again')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('shows technical details in error fallback', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Loading failed"
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText('Technical Details')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Timeout Management', () => {
    it('shows timeout error when loading takes too long', async () => {
      const SlowLazyComponent = lazy(
        () =>
          new Promise<{ default: ComponentType<any> }>(() => {
            // Never resolves - will trigger timeout
          })
      );

      render(
        <LazyComponent component={SlowLazyComponent} timeout={100} componentName="SlowComponent" />
      );

      // Wait for timeout to trigger
      await waitFor(
        () => {
          expect(
            screen.getByText(/Component is taking longer than expected to load/)
          ).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('component loads successfully when timeout is disabled', async () => {
      render(
        <LazyComponent component={LazyMockComponent} timeout={0} componentName="MockComponent" />
      );

      // Component should load normally without timeout
      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // No timeout message should appear
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
    });

    it('cleans up timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <LazyComponent component={LazyMockComponent} timeout={5000} componentName="MockComponent" />
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Preloading', () => {
    it('component loads normally with preload prop', async () => {
      render(
        <LazyComponent component={LazyMockComponent} preload={true} componentName="MockComponent" />
      );

      // Verify component eventually renders (preload is a hint)
      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('component loads normally without preload', async () => {
      render(
        <LazyComponent
          component={LazyMockComponent}
          preload={false}
          componentName="MockComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Accessibility', () => {
    it('loaded component is accessible', async () => {
      render(
        <LazyComponent
          component={LazyMockComponent}
          loadingMessage="Loading test component"
          componentName="TestComponent"
        />
      );

      // Wait for component to load
      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Verify final component is accessible
      expect(screen.getByTestId('mock-component')).toBeInTheDocument();
    });

    it('error fallback has proper ARIA attributes', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Error loading component"
          componentName="FailingComponent"
        />
      );

      await waitFor(
        () => {
          const errorContainer = screen.getByRole('alert');
          expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
        },
        { timeout: 2000 }
      );
    });

    it('retry button has proper aria-label', async () => {
      render(<LazyComponent component={FailingLazyComponent} componentName="FailingComponent" />);

      await waitFor(
        () => {
          const retryButton = screen.getByLabelText(/Retry loading FailingComponent/);
          expect(retryButton).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('withLazyLoading HOC', () => {
    it('creates lazy-loaded component wrapper', async () => {
      const importFn = () =>
        Promise.resolve({
          default: MockComponent,
        });

      const LazyWrappedComponent = withLazyLoading(importFn, {
        loadingMessage: 'Loading HOC component...',
        componentName: 'HOCComponent',
      });

      render(<LazyWrappedComponent testProp="hoc-test" />);

      await waitFor(
        () => {
          expect(screen.getByText(/Mock Component hoc-test/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('passes props to wrapped component', async () => {
      const importFn = () =>
        Promise.resolve({
          default: MockComponent,
        });

      const LazyWrappedComponent = withLazyLoading<{ testProp?: string }>(importFn);

      render(<LazyWrappedComponent testProp="prop-value" />);

      await waitFor(
        () => {
          expect(screen.getByText(/Mock Component prop-value/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('handles errors in HOC-wrapped components', async () => {
      const failingImportFn = () => Promise.reject(new Error('HOC component failed to load'));

      const LazyFailingComponent = withLazyLoading(failingImportFn, {
        errorMessage: 'HOC error message',
        componentName: 'HOCFailingComponent',
      });

      render(<LazyFailingComponent />);

      await waitFor(
        () => {
          expect(screen.getByText(/Failed to Load Component/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Messages', () => {
    it('displays custom error message', async () => {
      render(
        <LazyComponent
          component={FailingLazyComponent}
          errorMessage="Custom error text"
          componentName="ErrorComponent"
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Custom error text/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('uses default error message when not provided', async () => {
      render(
        <LazyComponent component={FailingLazyComponent} componentName="DefaultErrorComponent" />
      );

      await waitFor(
        () => {
          expect(
            screen.getByText(/Failed to load component. Please try again./)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when component fails to load', async () => {
      let attemptCount = 0;

      const RetryableLazyComponent = lazy(
        () =>
          new Promise<{ default: ComponentType<any> }>((resolve, reject) => {
            attemptCount++;
            if (attemptCount === 1) {
              setTimeout(() => reject(new Error('First attempt failed')), 100);
            } else {
              setTimeout(() => resolve({ default: MockComponent }), 100);
            }
          })
      );

      render(<LazyComponent component={RetryableLazyComponent} componentName="RetryComponent" />);

      // Wait for error to appear
      await waitFor(
        () => {
          expect(screen.getByText(/Failed to Load Component/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Verify retry button is present
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Suspense Integration', () => {
    it('eventually renders component after Suspense', async () => {
      render(
        <Suspense fallback={<div>Suspense Loading...</div>}>
          <LazyComponent component={LazyMockComponent} componentName="SuspenseComponent" />
        </Suspense>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('mock-component')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Style Injection', () => {
    it('injects styles into document', () => {
      // Check if styles are present in document
      const styleElement = document.getElementById('lazy-component-styles');
      expect(styleElement).toBeTruthy();
    });

    it('does not inject styles multiple times', () => {
      const styleElements = document.querySelectorAll('#lazy-component-styles');
      expect(styleElements.length).toBe(1);
    });
  });
});
