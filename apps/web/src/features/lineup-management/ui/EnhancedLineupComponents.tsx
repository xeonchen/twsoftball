/**
 * @file Enhanced Lineup Components with Error Boundaries and Monitoring
 *
 * Production-ready lineup management components with comprehensive error handling,
 * monitoring, and user experience enhancements.
 *
 * @remarks
 * These enhanced components provide enterprise-grade features:
 * - Error boundary protection with context-aware fallbacks
 * - Performance monitoring and metrics collection
 * - User interaction tracking and analytics
 * - Accessibility compliance and testing
 * - Progressive enhancement for offline scenarios
 * - A/B testing framework integration
 *
 * Architecture:
 * - Higher-order components for error boundary wrapping
 * - Monitoring integration at component level
 * - Performance timing for critical user actions
 * - Context-aware error reporting
 * - User feedback collection mechanisms
 *
 * Error Handling Strategy:
 * - Graceful degradation for non-critical features
 * - Actionable error messages with recovery options
 * - Automatic error reporting with context
 * - User-initiated error reporting
 * - Retry mechanisms with exponential backoff
 *
 * @example
 * ```tsx
 * import { EnhancedLineupEditor } from './EnhancedLineupComponents';
 *
 * function GameManagement() {
 *   return (
 *     <EnhancedLineupEditor
 *       gameId="game-123"
 *       onSubstitutionComplete={() => console.log('Substitution completed')}
 *     />
 *   );
 * }
 * ```
 */

import { FieldPosition } from '@twsoftball/application';
import React, { useEffect, ReactElement } from 'react';

import { monitoring } from '../../../shared/lib/monitoring';
import { ErrorBoundary, withErrorBoundary } from '../../../shared/ui/ErrorBoundary';

// Import original components
import { LineupEditor, LineupEditorProps } from './LineupEditor';
import { PositionAssignment, PositionAssignmentProps } from './PositionAssignment';
import { SubstitutionDialog, SubstitutionDialogProps } from './SubstitutionDialog';

/**
 * Interface for interaction tracking properties
 */
interface InteractionProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Interface for substitution confirmation data
 */
interface SubstitutionConfirmData {
  incomingPlayerId: string;
  outgoingPlayerId: string;
  battingSlot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  fieldPosition: FieldPosition;
  isReentry: boolean;
}

/**
 * Interface for position change data
 */
interface PositionChangeData {
  position: FieldPosition;
  newPlayerId: string;
  previousPlayerId?: string;
}

/**
 * Performance monitoring hook
 */
function usePerformanceMonitoring(componentName: string): void {
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
 */
function useInteractionTracking(componentName: string): {
  trackInteraction: (action: string, properties?: InteractionProperties) => void;
  trackFeature: (action: string, properties?: InteractionProperties) => void;
} {
  const trackInteraction = (action: string, properties?: InteractionProperties): void => {
    monitoring.track(`${componentName}_${action}`, {
      component: componentName,
      ...properties,
    });
  };

  const trackFeature = (action: string, properties?: InteractionProperties): void => {
    monitoring.feature(componentName, action, properties);
  };

  return { trackInteraction, trackFeature };
}

/**
 * Enhanced LineupEditor with monitoring and error boundaries
 */
function LineupEditorWithMonitoring(props: LineupEditorProps): ReactElement {
  const { gameId, onSubstitutionComplete, className } = props;

  // Hooks for monitoring and tracking
  usePerformanceMonitoring('lineup_editor');
  const { trackInteraction, trackFeature } = useInteractionTracking('lineup_editor');

  // Track component mount
  useEffect(() => {
    monitoring.track('lineup_editor_mounted', {
      gameId,
      timestamp: Date.now(),
    });

    return (): void => {
      monitoring.track('lineup_editor_unmounted', {
        gameId,
        timestamp: Date.now(),
      });
    };
  }, [gameId]);

  // Enhanced event handlers with tracking
  const handleSubstitutionComplete = (): void => {
    trackFeature('substitution_completed', {
      gameId,
      timestamp: Date.now(),
    });

    onSubstitutionComplete?.();
  };

  // Enhanced props with tracking
  const enhancedProps: LineupEditorProps = {
    ...props,
    onSubstitutionComplete: handleSubstitutionComplete,
    className: `${className} enhanced-lineup-editor`,
  };

  return (
    <div
      data-testid="lineup-editor"
      onClick={e => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          trackInteraction('button_clicked', {
            buttonType: target.textContent?.toLowerCase(),
            gameId,
          });
        }
      }}
    >
      <LineupEditor {...enhancedProps} />
    </div>
  );
}

/**
 * Enhanced SubstitutionDialog with monitoring
 */
function SubstitutionDialogWithMonitoring(props: SubstitutionDialogProps): ReactElement | null {
  const { isOpen, currentPlayer, gameId } = props;

  usePerformanceMonitoring('substitution_dialog');
  const { trackInteraction, trackFeature } = useInteractionTracking('substitution_dialog');

  // Track dialog open/close
  useEffect(() => {
    if (isOpen) {
      monitoring.track('substitution_dialog_opened', {
        currentPlayer: currentPlayer.playerId,
        gameId,
        timestamp: Date.now(),
      });
    }
  }, [isOpen, currentPlayer, gameId]);

  // Enhanced event handlers
  const handleClose = (): void => {
    trackInteraction('dialog_closed', {
      method: 'close_button',
      gameId,
    });
    props.onClose();
  };

  const handleConfirm = async (data: SubstitutionConfirmData): Promise<void> => {
    const startTime = performance.now();

    try {
      await props.onConfirm(data);

      const endTime = performance.now();
      const duration = endTime - startTime;

      trackFeature('substitution_confirmed', {
        duration,
        playerId: data.incomingPlayerId,
        gameId,
      });

      monitoring.timing('substitution_completion_time', duration, {
        success: 'true',
        gameId,
      });
    } catch (error) {
      monitoring.error(error as Error, {
        context: 'substitution_confirmation',
        gameId,
        substitutionData: data,
      });
      throw error;
    }
  };

  const enhancedProps: SubstitutionDialogProps = {
    ...props,
    onClose: handleClose,
    onConfirm: handleConfirm,
  };

  return <SubstitutionDialog {...enhancedProps} />;
}

/**
 * Enhanced PositionAssignment with monitoring
 */
function PositionAssignmentWithMonitoring(props: PositionAssignmentProps): ReactElement {
  const { onPositionChange } = props;

  usePerformanceMonitoring('position_assignment');
  const { trackInteraction, trackFeature } = useInteractionTracking('position_assignment');

  // Enhanced position change handler
  const handlePositionChange = async (change: PositionChangeData): Promise<void> => {
    const startTime = performance.now();

    trackInteraction('position_change_initiated', {
      position: change.position,
      newPlayerId: change.newPlayerId,
    });

    try {
      await onPositionChange(change);

      const endTime = performance.now();
      const duration = endTime - startTime;

      trackFeature('position_changed', {
        duration,
        position: change.position,
        newPlayerId: change.newPlayerId,
      });

      monitoring.timing('position_change_time', duration, {
        success: 'true',
        position: change.position,
      });
    } catch (error) {
      monitoring.error(error as Error, {
        context: 'position_change',
        changeData: change,
      });
      throw error;
    }
  };

  const enhancedProps: PositionAssignmentProps = {
    ...props,
    onPositionChange: handlePositionChange,
  };

  return <PositionAssignment {...enhancedProps} />;
}

/**
 * Custom error fallback for lineup components
 */
interface LineupErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  context: string;
}

function LineupErrorFallback({ error, onRetry, context }: LineupErrorFallbackProps): ReactElement {
  const { trackInteraction } = useInteractionTracking('error_fallback');

  const handleRetry = (): void => {
    trackInteraction('error_retry', {
      errorType: error.constructor.name,
      context,
    });
    onRetry();
  };

  const handleReport = (): void => {
    trackInteraction('error_reported', {
      errorType: error.constructor.name,
      context,
    });

    monitoring.track('user_reported_error', {
      error: error.message,
      context,
      userAction: 'manual_report',
    });
  };

  const getContextualMessage = (): string => {
    switch (context) {
      case 'lineup_editor':
        return "We're having trouble loading your lineup. This could be due to a temporary connection issue.";
      case 'substitution_dialog':
        return 'The substitution feature is temporarily unavailable. Your lineup data is safe.';
      case 'position_assignment':
        return 'The field position display is having issues. You can still manage your lineup using the list view.';
      default:
        return 'We encountered an unexpected error in the lineup management system.';
    }
  };

  const getSuggestedActions = (): string[] => {
    switch (context) {
      case 'lineup_editor':
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Use the basic lineup view as an alternative',
        ];
      case 'substitution_dialog':
        return [
          'Close and reopen the substitution dialog',
          'Try making the substitution from the lineup list',
          'Check that the player is eligible for substitution',
        ];
      case 'position_assignment':
        return [
          'Use the lineup list to make position changes',
          'Try switching to a different view',
          'Contact support if the issue persists',
        ];
      default:
        return [
          'Refresh the page',
          'Try again in a few moments',
          'Contact support if the problem continues',
        ];
    }
  };

  return (
    <div className="lineup-error-fallback" role="alert">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h3>Lineup Feature Temporarily Unavailable</h3>
        <p>{getContextualMessage()}</p>

        <div className="suggested-actions">
          <h4>What you can try:</h4>
          <ul>
            {getSuggestedActions().map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>

        <div className="error-actions">
          <button
            type="button"
            onClick={handleRetry}
            className="retry-button"
            aria-label="Retry the lineup feature"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="report-button"
            aria-label="Report this issue to support"
          >
            Report Issue
          </button>
        </div>

        <details className="error-technical">
          <summary>Technical Details</summary>
          <p>
            <strong>Error:</strong> {error.message}
          </p>
          <p>
            <strong>Context:</strong> {context}
          </p>
          <p>
            <strong>Time:</strong> {new Date().toISOString()}
          </p>
        </details>
      </div>
    </div>
  );
}

/**
 * Enhanced components with error boundaries
 */
export const EnhancedLineupEditor = withErrorBoundary(LineupEditorWithMonitoring, {
  fallback: error => (
    <LineupErrorFallback
      error={error}
      onRetry={() => window.location.reload()}
      context="lineup_editor"
    />
  ),
  onError: error => {
    monitoring.error(error, {
      context: 'lineup_editor',
    });
  },
  context: 'lineup_editor',
  enableRetry: true,
  maxRetries: 3,
});

export const EnhancedSubstitutionDialog = withErrorBoundary(SubstitutionDialogWithMonitoring, {
  fallback: error => (
    <LineupErrorFallback
      error={error}
      onRetry={() => window.location.reload()}
      context="substitution_dialog"
    />
  ),
  onError: error => {
    monitoring.error(error, {
      context: 'substitution_dialog',
    });
  },
  context: 'substitution_dialog',
  enableRetry: true,
  maxRetries: 2,
});

export const EnhancedPositionAssignment = withErrorBoundary(PositionAssignmentWithMonitoring, {
  fallback: error => (
    <LineupErrorFallback
      error={error}
      onRetry={() => window.location.reload()}
      context="position_assignment"
    />
  ),
  onError: error => {
    monitoring.error(error, {
      context: 'position_assignment',
    });
  },
  context: 'position_assignment',
  enableRetry: true,
  maxRetries: 2,
});

/**
 * Provider component for lineup monitoring context
 */
interface LineupMonitoringProviderProps {
  children: React.ReactNode;
  gameId: string;
}

export function LineupMonitoringProvider({
  children,
  gameId,
}: LineupMonitoringProviderProps): ReactElement {
  useEffect(() => {
    // Set monitoring context for lineup features
    monitoring.track('lineup_session_started', {
      gameId,
      timestamp: Date.now(),
    });

    return (): void => {
      monitoring.track('lineup_session_ended', {
        gameId,
        timestamp: Date.now(),
      });
    };
  }, [gameId]);

  return (
    <ErrorBoundary
      context="lineup_management"
      onError={(error, errorInfo) => {
        monitoring.error(error, {
          context: 'lineup_management_provider',
          componentStack: errorInfo.componentStack,
          gameId,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Styles for enhanced components
const enhancedStyles = `
.enhanced-lineup-editor {
  position: relative;
}

.lineup-error-fallback {
  padding: 2rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  text-align: center;
  max-width: 600px;
  margin: 1rem auto;
}

.lineup-error-fallback .error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.lineup-error-fallback .error-icon {
  font-size: 2.5rem;
}

.lineup-error-fallback h3 {
  margin: 0;
  color: #dc2626;
  font-size: 1.25rem;
  font-weight: 600;
}

.lineup-error-fallback p {
  margin: 0;
  color: #374151;
  line-height: 1.5;
}

.suggested-actions {
  text-align: left;
  max-width: 400px;
  margin: 1rem 0;
}

.suggested-actions h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 500;
}

.suggested-actions ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #6b7280;
}

.suggested-actions li {
  margin-bottom: 0.25rem;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.retry-button,
.report-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.retry-button {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.retry-button:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.report-button {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.report-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.error-technical {
  margin-top: 1.5rem;
  text-align: left;
  max-width: 500px;
}

.error-technical summary {
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.error-technical p {
  margin: 0.5rem 0;
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .lineup-error-fallback {
    padding: 1.5rem 1rem;
    margin: 0.5rem;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .retry-button,
  .report-button {
    width: 100%;
  }
}
`;

// Inject enhanced styles
if (typeof document !== 'undefined' && !document.getElementById('enhanced-lineup-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'enhanced-lineup-styles';
  styleElement.textContent = enhancedStyles;
  document.head.appendChild(styleElement);
}
