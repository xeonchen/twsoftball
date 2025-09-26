/**
 * @file ErrorBoundary Component
 *
 * React error boundary component for catching unhandled component errors,
 * providing fallback UI, error reporting, and recovery mechanisms.
 *
 * @remarks
 * This component implements:
 * - React error boundary functionality
 * - User-friendly fallback UI for different error types
 * - Error reporting with context
 * - Recovery and retry mechanisms
 * - Integration with monitoring services
 */

import React, { ReactNode, ErrorInfo } from 'react';

/**
 * Error boundary state interface
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reportStatus: 'none' | 'reporting' | 'reported' | 'failed';
  reportId: string | null;
}

/**
 * Error report data interface
 */
export interface ErrorReportData {
  error: Error;
  errorInfo: ErrorInfo;
  context: Record<string, unknown>;
}

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReportError?: (data: ErrorReportData) => Promise<{ reportId: string }>;
  enableMonitoring?: boolean;
  context?: Record<string, unknown>;
}

/**
 * React Error Boundary component for catching and handling component errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reportStatus: 'none',
      reportId: null,
    };
  }

  /**
   * Static method to update state when error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Component did catch error - handle error reporting and monitoring
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call onError prop if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (onErrorError) {
        // eslint-disable-next-line no-console -- Critical error boundary fallback requires console
        console.warn('Error in onError callback:', onErrorError);
      }
    }

    // Report to monitoring services if enabled
    if (this.props.enableMonitoring) {
      this.reportToMonitoring(error, errorInfo);
    }

    // Log error details to console
    // eslint-disable-next-line no-console -- Critical error logging requires console for debugging
    console.error('ErrorBoundary caught an error:', error);
    // eslint-disable-next-line no-console -- Critical error logging requires console for debugging
    console.error('Component stack:', errorInfo.componentStack);
  }

  /**
   * Report error to external monitoring service (e.g., Sentry)
   */
  private reportToMonitoring(error: Error, errorInfo: ErrorInfo): void {
    try {
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            component: 'ErrorBoundary',
            errorBoundary: true,
          },
          extra: {
            componentStack: errorInfo.componentStack,
            context: this.props.context,
          },
        });
      }
    } catch (monitoringError) {
      // eslint-disable-next-line no-console -- Monitoring fallback requires console for reliability
      console.warn('Failed to report to monitoring service:', monitoringError);
    }
  }

  /**
   * Determine error type for appropriate UI display
   */
  private getErrorType(error: Error): string {
    if (error.name === 'NetworkError') return 'network';
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'ChunkLoadError') return 'chunk';
    return 'unknown';
  }

  /**
   * Get user-friendly error message based on error type
   */
  private getUserFriendlyMessage(error: Error): {
    title: string;
    description: string;
    suggestion: string;
  } {
    const errorType = this.getErrorType(error);

    switch (errorType) {
      case 'network':
        return {
          title: 'Network Issue',
          description: 'Unable to connect to the server.',
          suggestion: 'Please check your internet connection and try again in a moment.',
        };
      case 'validation':
        return {
          title: 'Validation Issue',
          description: 'There was a problem with the data.',
          suggestion: 'Please check your input and try again.',
        };
      case 'chunk':
        return {
          title: 'Loading Issue',
          description: 'Failed to load application resources.',
          suggestion: 'Please refresh the page to try again.',
        };
      default:
        return {
          title: 'Something went wrong',
          description: error.message || 'An unexpected error occurred.',
          suggestion: 'Please try refreshing the page or contact support if the issue persists.',
        };
    }
  }

  /**
   * Handle retry functionality
   */
  private readonly handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      reportStatus: 'none',
      reportId: null,
    });
  };

  /**
   * Handle page refresh
   */
  private readonly handleRefresh = (): void => {
    window.location.reload();
  };

  /**
   * Handle error reporting
   */
  private readonly handleReportError = async (): Promise<void> => {
    const { onReportError, context = {} } = this.props;
    const { error, errorInfo } = this.state;

    if (!error || !errorInfo || !onReportError) {
      return;
    }

    this.setState({ reportStatus: 'reporting' });

    try {
      const reportData: ErrorReportData = {
        error,
        errorInfo,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      };

      const result = await onReportError(reportData);

      this.setState({
        reportStatus: 'reported',
        reportId: result.reportId,
      });
    } catch (reportError) {
      // eslint-disable-next-line no-console -- Error reporting fallback requires console for reliability
      console.warn('Failed to report error:', reportError);
      this.setState({ reportStatus: 'failed' });
    }
  };

  /**
   * Render error UI or children
   */
  override render(): React.ReactNode {
    const { children, fallback: CustomFallback } = this.props;
    const { hasError, error, reportStatus, reportId } = this.state;

    if (!hasError || !error) {
      return children;
    }

    // Use custom fallback if provided
    if (CustomFallback) {
      return <CustomFallback error={error} retry={this.handleRetry} />;
    }

    // Default fallback UI
    const { title, description, suggestion } = this.getUserFriendlyMessage(error);
    const isDevelopment = import.meta.env.MODE === 'development';

    return (
      <div
        role="alert"
        className="error-boundary-container"
        style={{
          padding: '2rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          margin: '1rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Error Status for Screen Readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {title}: {description}
        </div>

        {/* Main Error Display */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              color: '#d32f2f',
              marginBottom: '0.5rem',
              fontSize: '1.5rem',
              fontWeight: '600',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: '#333',
              marginBottom: '0.5rem',
              fontSize: '1rem',
            }}
          >
            {description}
          </p>
          <p
            style={{
              color: '#666',
              fontSize: '0.9rem',
              lineHeight: '1.4',
            }}
          >
            {suggestion}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <button
            onClick={this.handleRetry}
            aria-label="Retry the failed operation"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Try Again
          </button>

          <button
            onClick={this.handleRefresh}
            aria-label="Refresh the current page"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#388e3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Refresh Page
          </button>

          {this.props.onReportError && (
            <button
              onClick={() => void this.handleReportError()}
              disabled={reportStatus === 'reporting'}
              aria-label="Report this error to support"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: reportStatus === 'reporting' ? '#ccc' : '#f57c00',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: reportStatus === 'reporting' ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {reportStatus === 'reporting' ? 'Reporting...' : 'Report this Error'}
            </button>
          )}
        </div>

        {/* Report Status */}
        {reportStatus === 'reported' && reportId && (
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: '#e8f5e8',
              border: '1px solid #c8e6c9',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: '#2e7d32',
            }}
          >
            Error reported: {reportId}
          </div>
        )}

        {reportStatus === 'failed' && (
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: '#c62828',
            }}
          >
            Failed to report error. Please contact support directly.
          </div>
        )}

        {/* Development Mode Details */}
        {isDevelopment && (
          <details style={{ marginTop: '1rem' }}>
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '0.5rem',
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error.stack}
            </pre>

            {this.state.errorInfo && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Component Stack</h4>
                <pre
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </details>
        )}
      </div>
    );
  }
}

// Global type extension for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context: Record<string, unknown>) => void;
    };
  }
}
