/**
 * @file Page Error Fallback Component
 *
 * A page-specific error fallback component designed for use with ErrorBoundary
 * to provide user-friendly error states for lazy-loaded route pages.
 *
 * @remarks
 * This component provides:
 * - Page-specific error messaging with context
 * - Retry functionality via page reload
 * - Navigation option to return home
 * - Accessible error presentation
 * - Consistent styling with the application design system
 *
 * Use this component as a fallback for ErrorBoundary wrapping lazy-loaded pages
 * to provide a graceful degradation experience when page components fail to load
 * or encounter runtime errors.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<PageErrorFallback pageName="Game Recording" />}
 *   context="game-recording"
 * >
 *   <GameRecordingPage />
 * </ErrorBoundary>
 * ```
 */

import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Props for the PageErrorFallback component
 */
export interface PageErrorFallbackProps {
  /** The name of the page that failed to load */
  pageName: string;
  /** Optional error object for detailed error display */
  error?: Error;
  /** Optional retry callback. If not provided, uses page reload */
  onRetry?: () => void;
  /** Whether to show technical error details (dev mode) */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page error fallback component for lazy-loaded routes
 *
 * Provides a user-friendly error state when a page component fails to render.
 * Includes options to retry loading, return to home, or reload the page.
 */
export function PageErrorFallback({
  pageName,
  error,
  onRetry,
  showDetails = import.meta.env.MODE === 'development',
  className = '',
}: PageErrorFallbackProps): ReactElement {
  const navigate = useNavigate();

  const handleRetry = (): void => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = (): void => {
    void navigate('/');
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`page-error-fallback ${className}`}
      data-testid="page-error-fallback"
    >
      <div className="page-error-content">
        <div className="page-error-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="page-error-title">Unable to Load Page</h1>

        <p className="page-error-description">
          We encountered a problem loading the <strong>{pageName}</strong> page. This could be due
          to a network issue or a temporary problem.
        </p>

        <div className="page-error-actions">
          <button
            type="button"
            onClick={handleRetry}
            className="page-error-button page-error-button-primary"
            data-testid="page-error-retry-button"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="page-error-button page-error-button-secondary"
            data-testid="page-error-home-button"
          >
            Go to Home
          </button>
        </div>

        {showDetails && error && (
          <details className="page-error-details" data-testid="page-error-details">
            <summary>Technical Details</summary>
            <div className="page-error-details-content">
              <p>
                <strong>Error:</strong> {error.name}
              </p>
              <p>
                <strong>Message:</strong> {error.message}
              </p>
              {error.stack && <pre className="page-error-stack">{error.stack}</pre>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// Inject styles
const styles = `
.page-error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: #f9fafb;
}

.page-error-content {
  max-width: 28rem;
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.page-error-icon {
  color: #ef4444;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.page-error-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.page-error-description {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.625;
}

.page-error-description strong {
  color: #374151;
}

.page-error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 400px) {
  .page-error-actions {
    flex-direction: row;
    justify-content: center;
  }
}

.page-error-button {
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;
  border: none;
}

.page-error-button-primary {
  background: #16a34a;
  color: white;
}

.page-error-button-primary:hover {
  background: #15803d;
}

.page-error-button-primary:focus {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}

.page-error-button-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.page-error-button-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.page-error-button-secondary:focus {
  outline: 2px solid #6b7280;
  outline-offset: 2px;
}

.page-error-details {
  margin-top: 1.5rem;
  text-align: left;
  background: #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.page-error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  user-select: none;
}

.page-error-details-content {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #4b5563;
}

.page-error-details-content p {
  margin: 0 0 0.5rem 0;
  word-break: break-word;
}

.page-error-stack {
  margin: 0;
  padding: 0.5rem;
  background: #e5e7eb;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .page-error-button {
    transition: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-error-content {
    border: 2px solid #000;
  }

  .page-error-button {
    border-width: 2px;
  }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .page-error-fallback {
    padding: 1rem;
  }

  .page-error-content {
    padding: 1.5rem;
  }

  .page-error-title {
    font-size: 1.25rem;
  }

  .page-error-icon svg {
    width: 48px;
    height: 48px;
  }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('page-error-fallback-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'page-error-fallback-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
