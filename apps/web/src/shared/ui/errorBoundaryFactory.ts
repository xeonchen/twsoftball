/**
 * @file Error Boundary Factory
 *
 * Provides factory functions to create configured error boundaries with
 * common patterns for lineup components.
 *
 * @remarks
 * This factory consolidates repeated error boundary configurations across
 * lineup management components, reducing code duplication and ensuring
 * consistent error handling behavior.
 *
 * @example
 * ```typescript
 * const EnhancedComponent = createLineupErrorBoundary(MyComponent, {
 *   context: 'my_component',
 *   maxRetries: 3,
 *   fallbackRenderer: (error, onRetry) => (
 *     <ErrorFallback error={error} onRetry={onRetry} />
 *   ),
 * });
 * ```
 */

import React, { type ReactElement } from 'react';

import { monitoring } from '../lib/monitoring';

import { withErrorBoundary } from './ErrorBoundary';

/**
 * Configuration for error boundary behavior
 */
export interface ErrorBoundaryConfig {
  /**
   * Context identifier for error tracking and reporting
   */
  context: string;

  /**
   * Maximum number of retry attempts before showing permanent error
   */
  maxRetries: number;

  /**
   * Function to render error fallback UI
   *
   * @param error - The error that was caught
   * @param onRetry - Callback to trigger retry action
   * @returns React element to display as error fallback
   */
  fallbackRenderer: (error: Error, onRetry: () => void) => ReactElement;
}

/**
 * Creates a configured error boundary HOC with common lineup component settings
 *
 * @param Component - React component to wrap with error boundary
 * @param config - Error boundary configuration
 * @returns Higher-order component with error boundary applied
 *
 * @remarks
 * This factory provides:
 * - Consistent error monitoring integration
 * - Standard retry behavior with configurable attempts
 * - Context-aware error reporting
 * - Reusable fallback rendering pattern
 *
 * The factory automatically:
 * - Reports errors to monitoring service with context
 * - Enables retry functionality
 * - Configures max retry attempts
 * - Sets up error fallback with retry handler
 *
 * **Retry Behavior**: The retry callback is hardcoded to `window.location.reload()`.
 * This ensures a clean slate after errors, clearing any corrupted application state.
 * If custom retry logic is required, use `withErrorBoundary` directly instead of this factory.
 *
 * **Monitoring Integration**: All errors are automatically reported to the monitoring
 * service with the provided context for tracking and analytics.
 *
 * @example
 * ```typescript
 * const EnhancedComponent = createLineupErrorBoundary(MyComponent, {
 *   context: 'my_feature',
 *   maxRetries: 3,
 *   fallbackRenderer: (error, onRetry) => (
 *     <ErrorFallback error={error} onRetry={onRetry} />
 *   ),
 * });
 * ```
 */
export function createLineupErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  config: ErrorBoundaryConfig
): React.ComponentType<P> {
  return withErrorBoundary(Component, {
    fallback: error => config.fallbackRenderer(error, () => window.location.reload()),
    onError: error => {
      monitoring.error(error, {
        context: config.context,
      });
    },
    context: config.context,
    enableRetry: true,
    maxRetries: config.maxRetries,
  });
}
