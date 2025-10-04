/**
 * @file Shared Monitoring Hooks
 *
 * Reusable hooks for performance monitoring and interaction tracking
 * across all components.
 *
 * @remarks
 * These hooks provide standardized monitoring capabilities:
 * - Performance timing for component renders
 * - User interaction tracking with custom properties
 * - Feature usage analytics
 * - Error-safe monitoring that never breaks the UI
 *
 * The hooks are designed to be reusable across all lineup management
 * components while maintaining consistent monitoring patterns and
 * reducing code duplication.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   usePerformanceMonitoring('my_component');
 *   const { trackInteraction } = useInteractionTracking('my_component');
 *
 *   const handleClick = () => {
 *     trackInteraction('button_clicked', { buttonId: 'submit' });
 *   };
 *
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */

import { useEffect, useCallback } from 'react';

import { monitoring } from '../monitoring';

/**
 * Interface for interaction tracking properties
 *
 * @remarks
 * Allows flexible tracking of custom properties for user interactions
 * and feature usage. All values must be JSON-serializable.
 */
export interface InteractionProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Performance monitoring hook
 *
 * Tracks component render time and reports to monitoring service.
 *
 * @param componentName - Unique identifier for the component being monitored
 *
 * @remarks
 * This hook:
 * - Measures time from component mount to unmount
 * - Reports render time to monitoring service
 * - Includes sanity checks to prevent invalid measurements
 * - Handles errors gracefully without breaking the UI
 * - Only logs errors in development mode
 *
 * Performance Monitoring Best Practices:
 * - Use consistent naming conventions for componentName
 * - Avoid monitoring trivial components (< 100ms render)
 * - Monitor critical user journeys and complex UI
 * - Review metrics regularly to identify regressions
 *
 * @example
 * ```typescript
 * function LineupEditor() {
 *   usePerformanceMonitoring('lineup_editor');
 *   // Component renders as normal
 * }
 * ```
 */
export function usePerformanceMonitoring(componentName: string): void {
  useEffect(() => {
    const startTime = performance.now();
    let isMounted = true;

    return (): void => {
      // Prevent timing errors on unmount by checking mounted flag
      if (!isMounted) {
        return;
      }

      isMounted = false;

      try {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Sanity check: render time should be > 0 and < 60000ms (1 minute)
        if (renderTime > 0 && renderTime < 60000) {
          monitoring.timing(`${componentName}_render_time`, renderTime, {
            component: componentName,
          });
        }
      } catch (error) {
        // Silently handle monitoring errors to prevent crashes
        // In production, monitoring failures should not break the app
        if (import.meta.env.MODE === 'development') {
          // eslint-disable-next-line no-console -- Development debugging
          console.warn('Performance monitoring error:', error);
        }
      }
    };
  }, [componentName]);
}

/**
 * User interaction tracking hook
 *
 * Provides functions to track user interactions and feature usage.
 *
 * @param componentName - Unique identifier for the component being monitored
 * @returns Object with tracking functions
 *
 * @remarks
 * This hook provides two tracking methods:
 *
 * **trackInteraction**: General user interactions (clicks, form submissions, etc.)
 * - Automatically prefixes action with component name
 * - Includes component context in properties
 * - Suitable for UI-level interactions
 *
 * **trackFeature**: Business feature usage (substitutions, lineup changes, etc.)
 * - Reports to feature-specific monitoring
 * - Suitable for high-level user actions
 * - Helps track feature adoption and usage patterns
 *
 * Interaction Tracking Best Practices:
 * - Use descriptive action names (e.g., 'button_clicked', not 'click')
 * - Include relevant context in properties
 * - Track user intent, not just technical events
 * - Keep property values simple and JSON-serializable
 *
 * @example
 * ```typescript
 * function SubstitutionDialog() {
 *   const { trackInteraction, trackFeature } = useInteractionTracking('substitution_dialog');
 *
 *   const handleConfirm = () => {
 *     trackInteraction('confirm_clicked', { playerId: '123' });
 *     trackFeature('substitution_completed', { success: true });
 *   };
 * }
 * ```
 */
export function useInteractionTracking(componentName: string): {
  trackInteraction: (action: string, properties?: InteractionProperties) => void;
  trackFeature: (action: string, properties?: InteractionProperties) => void;
} {
  const trackInteraction = useCallback(
    (action: string, properties?: InteractionProperties): void => {
      monitoring.track(`${componentName}_${action}`, {
        component: componentName,
        ...properties,
      });
    },
    [componentName]
  );

  const trackFeature = useCallback(
    (action: string, properties?: InteractionProperties): void => {
      monitoring.feature(componentName, action, properties);
    },
    [componentName]
  );

  return { trackInteraction, trackFeature };
}
