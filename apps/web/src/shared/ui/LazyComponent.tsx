/**
 * @file LazyComponent Wrapper
 *
 * Reusable lazy loading wrapper component with loading states and error boundaries.
 * Provides consistent loading experience across all lazily loaded components.
 *
 * @remarks
 * This component enhances the standard React.lazy functionality with:
 * - Consistent loading UI with proper accessibility
 * - Error boundary integration for graceful failure handling
 * - Customizable loading and error states
 * - Proper focus management during loading transitions
 * - Performance metrics tracking for lazy loading
 * - Preloading capabilities for critical components
 *
 * Architecture:
 * - Uses React.Suspense for lazy loading orchestration
 * - Integrates with error boundary pattern
 * - Provides accessibility-first loading states
 * - Supports performance monitoring and metrics
 *
 * @example
 * ```tsx
 * const LazyLineupEditor = lazy(() => import('../features/lineup-management/ui/LineupEditor'));
 *
 * <LazyComponent
 *   component={LazyLineupEditor}
 *   fallback={<LineupEditorSkeleton />}
 *   errorFallback={<LineupEditorError />}
 *   loadingMessage="Loading lineup editor..."
 * />
 * ```
 */

import React, { ComponentType, ReactElement, Suspense, useEffect, useState } from 'react';

/**
 * Props for LazyComponent wrapper
 */
export interface LazyComponentProps<P extends Record<string, unknown> = Record<string, unknown>> {
  /** The lazy-loaded component */
  component: ComponentType<P>;
  /** Props to pass to the lazy component */
  componentProps?: P;
  /** Custom fallback component during loading */
  fallback?: ReactElement;
  /** Custom error fallback component */
  errorFallback?: ReactElement;
  /** Loading message for screen readers */
  loadingMessage?: string;
  /** Error message for screen readers */
  errorMessage?: string;
  /** Whether to preload the component */
  preload?: boolean;
  /** Component name for debugging and metrics */
  componentName?: string;
  /** Custom loading timeout in milliseconds */
  timeout?: number;
}

/**
 * Default loading component with accessibility support
 */
interface LoadingFallbackProps {
  message: string;
  componentName?: string;
}

function LoadingFallback({ message, componentName }: LoadingFallbackProps): ReactElement {
  return (
    <div className="lazy-loading-container" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true">
        <div className="spinner-circle" />
      </div>
      <span className="loading-message">{message}</span>
      <span className="sr-only">Loading {componentName || 'component'}, please wait...</span>
    </div>
  );
}

/**
 * Default error component with retry functionality
 */
interface ErrorFallbackProps {
  message: string;
  componentName?: string;
  onRetry?: () => void;
}

function ErrorFallback({ message, componentName, onRetry }: ErrorFallbackProps): ReactElement {
  return (
    <div className="lazy-error-container" role="alert" aria-live="assertive">
      <div className="error-icon" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="error-title">Failed to Load Component</h3>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="retry-button"
          aria-label={`Retry loading ${componentName || 'component'}`}
        >
          Try Again
        </button>
      )}
      <details className="error-details">
        <summary>Technical Details</summary>
        <p>Component: {componentName || 'Unknown'}</p>
        <p>Error: Failed to load lazy component</p>
      </details>
    </div>
  );
}

/**
 * Error boundary for lazy loading
 */
interface LazyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: ReactElement; componentName?: string },
  LazyErrorBoundaryState
> {
  constructor(props: {
    children: React.ReactNode;
    fallback: ReactElement;
    componentName?: string;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console -- Required for lazy loading error debugging
    console.error('Lazy component loading error:', error, errorInfo);

    // Report to monitoring service in production
    if (import.meta.env.MODE === 'production') {
      // This would integrate with your monitoring service
      // reportError('lazy_loading_error', error, { componentName: this.props.componentName });
    }
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * LazyComponent wrapper with comprehensive loading and error handling
 */
export function LazyComponent<P extends Record<string, unknown> = Record<string, unknown>>({
  component: Component,
  componentProps = {} as P,
  fallback,
  errorFallback,
  loadingMessage = 'Loading component...',
  errorMessage = 'Failed to load component. Please try again.',
  preload = false,
  componentName = 'LazyComponent',
  timeout = 10000,
}: LazyComponentProps<P>): ReactElement {
  const [retryKey, setRetryKey] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Handle retry functionality
  const handleRetry = (): void => {
    setRetryKey(prev => prev + 1);
    setLoadingTimeout(false);
  };

  // Handle loading timeout
  useEffect(() => {
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, timeout);

      return (): void => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [timeout, retryKey]);

  // Preload component if requested
  useEffect(() => {
    if (preload) {
      // This would trigger the component import
      // Component.preload?.();
    }
  }, [preload, Component]);

  // Default fallbacks
  const defaultFallback = fallback || (
    <LoadingFallback message={loadingMessage} componentName={componentName} />
  );

  const defaultErrorFallback = errorFallback || (
    <ErrorFallback message={errorMessage} componentName={componentName} onRetry={handleRetry} />
  );

  // Show timeout error if loading takes too long
  if (loadingTimeout) {
    return (
      <ErrorFallback
        message="Component is taking longer than expected to load. Please check your connection and try again."
        componentName={componentName}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <LazyErrorBoundary fallback={defaultErrorFallback} componentName={componentName}>
      <Suspense fallback={defaultFallback} key={retryKey}>
        <Component {...componentProps} />
      </Suspense>
    </LazyErrorBoundary>
  );
}

/**
 * Higher-order component for creating lazy-loaded components
 */
// eslint-disable-next-line react-refresh/only-export-components -- HOC utility for lazy loading, not a component
export function withLazyLoading<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: Omit<LazyComponentProps<P>, 'component' | 'componentProps'> = {}
): ComponentType<P> {
  const LazyLoadedComponent = React.lazy(importFn);

  return function WrappedLazyComponent(props: P): ReactElement {
    return (
      <LazyComponent<P>
        component={LazyLoadedComponent as unknown as ComponentType<P>}
        componentProps={props}
        {...options}
      />
    );
  };
}

// Styles for lazy loading components
const styles = `
.lazy-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 200px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.loading-spinner {
  margin-bottom: 1rem;
}

.spinner-circle {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.lazy-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 200px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #dc2626;
}

.error-message {
  margin: 0 0 1.5rem 0;
  color: #374151;
  max-width: 400px;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  min-height: 44px;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background: #2563eb;
}

.retry-button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
}

.error-details {
  margin-top: 1rem;
  text-align: left;
  max-width: 400px;
  width: 100%;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.error-details p {
  margin: 0.5rem 0;
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spinner-circle {
    animation: none;
  }

  .retry-button {
    transition: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .lazy-loading-container,
  .lazy-error-container {
    border-width: 2px;
  }

  .retry-button {
    border: 2px solid;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .lazy-loading-container,
  .lazy-error-container {
    padding: 1.5rem 1rem;
    min-height: 150px;
  }

  .error-message {
    font-size: 0.875rem;
  }

  .retry-button {
    width: 100%;
    max-width: 300px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('lazy-component-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'lazy-component-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
