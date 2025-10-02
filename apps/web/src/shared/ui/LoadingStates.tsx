/**
 * @file Loading States Components
 *
 * Comprehensive loading state components with accessibility and animation support.
 * Provides consistent loading experience across the application.
 *
 * @remarks
 * This component library provides production-ready loading states:
 * - Skeleton loading patterns for different content types
 * - Progressive loading indicators
 * - Accessibility-compliant loading states
 * - Smooth animations with reduced motion support
 * - Context-aware loading messages
 * - Performance-optimized rendering
 *
 * Loading Patterns:
 * - Skeleton screens for content placeholders
 * - Spinner indicators for quick actions
 * - Progress bars for file uploads/downloads
 * - Shimmer effects for dynamic content
 * - Contextual loading messages
 *
 * Accessibility Features:
 * - Screen reader announcements
 * - ARIA live regions for status updates
 * - Keyboard navigation support
 * - High contrast mode compatibility
 * - Reduced motion preferences
 *
 * @example
 * ```tsx
 * import { SkeletonLoader, SpinnerLoader } from './LoadingStates';
 *
 * // Skeleton for list content
 * <SkeletonLoader variant="list" count={5} />
 *
 * // Spinner for actions
 * <SpinnerLoader message="Saving lineup changes..." />
 * ```
 */

import { ReactElement, ReactNode } from 'react';

/**
 * Common props for loading components
 */
interface LoadingBaseProps {
  /** Loading message for screen readers */
  message?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom CSS class */
  className?: string;
  /** Whether to show text message */
  showMessage?: boolean;
}

/**
 * Skeleton loader props
 */
export interface SkeletonLoaderProps extends LoadingBaseProps {
  /** Skeleton variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'list' | 'card' | 'table';
  /** Number of skeleton elements */
  count?: number;
  /** Custom width */
  width?: string | number;
  /** Custom height */
  height?: string | number;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Spinner loader props
 */
export interface SpinnerLoaderProps extends LoadingBaseProps {
  /** Spinner variant */
  variant?: 'default' | 'dots' | 'bars' | 'ring';
  /** Color theme */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

/**
 * Progress loader props
 */
export interface ProgressLoaderProps extends LoadingBaseProps {
  /** Progress value (0-100) */
  value?: number;
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Progress bar color theme */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

/**
 * Skeleton loader component
 */
export function SkeletonLoader({
  variant = 'rectangular',
  count = 1,
  width,
  height,
  animation = 'pulse',
  size = 'medium',
  message = 'Loading content...',
  className = '',
  showMessage = false,
}: SkeletonLoaderProps): ReactElement {
  const getSkeletonDimensions = (): {
    width: string | number;
    height: string | number;
    borderRadius?: string;
  } => {
    const sizeMap = {
      small: { width: width || '100px', height: height || '16px' },
      medium: { width: width || '200px', height: height || '20px' },
      large: { width: width || '300px', height: height || '24px' },
    };

    switch (variant) {
      case 'text':
        return sizeMap[size];
      case 'circular': {
        const circularSize = size === 'small' ? '32px' : size === 'large' ? '64px' : '48px';
        return { width: circularSize, height: circularSize, borderRadius: '50%' };
      }
      case 'rectangular':
        return { width: width || '100%', height: height || '100px' };
      case 'list':
        return { width: '100%', height: '60px' };
      case 'card':
        return { width: '100%', height: '200px' };
      case 'table':
        return { width: '100%', height: '40px' };
      default:
        return sizeMap[size];
    }
  };

  const dimensions = getSkeletonDimensions();
  const skeletonClass = `skeleton-loader skeleton-${variant} skeleton-${animation} ${className}`;

  const renderSkeleton = (index: number): ReactElement => (
    <div key={index} className={skeletonClass} style={dimensions} aria-hidden="true" />
  );

  const renderListSkeleton = (index: number): ReactElement => (
    <div key={index} className={`skeleton-list-item ${className}`} aria-hidden="true">
      <div className="skeleton-avatar" />
      <div className="skeleton-content">
        <div className="skeleton-title" />
        <div className="skeleton-subtitle" />
      </div>
      <div className="skeleton-action" />
    </div>
  );

  const renderCardSkeleton = (index: number): ReactElement => (
    <div key={index} className={`skeleton-card ${className}`} aria-hidden="true">
      <div className="skeleton-card-header" />
      <div className="skeleton-card-body">
        <div className="skeleton-card-title" />
        <div className="skeleton-card-text" />
        <div className="skeleton-card-text short" />
      </div>
      <div className="skeleton-card-footer" />
    </div>
  );

  const renderTableSkeleton = (index: number): ReactElement => (
    <div key={index} className={`skeleton-table-row ${className}`} aria-hidden="true">
      <div className="skeleton-table-cell" />
      <div className="skeleton-table-cell" />
      <div className="skeleton-table-cell" />
      <div className="skeleton-table-cell short" />
    </div>
  );

  const renderSkeletonByVariant = (index: number): ReactElement => {
    switch (variant) {
      case 'list':
        return renderListSkeleton(index);
      case 'card':
        return renderCardSkeleton(index);
      case 'table':
        return renderTableSkeleton(index);
      default:
        return renderSkeleton(index);
    }
  };

  return (
    <div className="skeleton-container" role="status" aria-label={message} aria-live="polite">
      {Array.from({ length: count }, (_, index) => renderSkeletonByVariant(index))}
      {showMessage && <span className="sr-only">{message}</span>}
    </div>
  );
}

/**
 * Spinner loader component
 */
export function SpinnerLoader({
  variant = 'default',
  size = 'medium',
  color = 'primary',
  message = 'Loading...',
  className = '',
  showMessage = true,
}: SpinnerLoaderProps): ReactElement {
  const spinnerClass = `spinner-loader spinner-${variant} spinner-${size} spinner-${color} ${className}`;

  const renderSpinnerVariant = (): ReactElement => {
    switch (variant) {
      case 'dots':
        return (
          <div className={spinnerClass}>
            <div className="spinner-dot" />
            <div className="spinner-dot" />
            <div className="spinner-dot" />
          </div>
        );
      case 'bars':
        return (
          <div className={spinnerClass}>
            <div className="spinner-bar" />
            <div className="spinner-bar" />
            <div className="spinner-bar" />
            <div className="spinner-bar" />
          </div>
        );
      case 'ring':
        return (
          <div className={spinnerClass}>
            <div className="spinner-ring" />
          </div>
        );
      default:
        return (
          <div className={spinnerClass}>
            <div className="spinner-circle" />
          </div>
        );
    }
  };

  return (
    <div className="spinner-container" role="status" aria-label={message} aria-live="polite">
      {renderSpinnerVariant()}
      {showMessage && <span className="spinner-message">{message}</span>}
      <span className="sr-only">{message}</span>
    </div>
  );
}

/**
 * Progress loader component
 */
export function ProgressLoader({
  value = 0,
  indeterminate = false,
  showPercentage = false,
  size = 'medium',
  color = 'primary',
  message = 'Processing...',
  className = '',
  showMessage = true,
}: ProgressLoaderProps): ReactElement {
  const progressClass = `progress-loader progress-${size} progress-${color} ${className}`;
  const progressValue = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className="progress-container"
      role="progressbar"
      aria-label={message}
      aria-valuenow={indeterminate ? undefined : progressValue}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-live="polite"
    >
      {showMessage && (
        <div className="progress-label">
          <span>{message}</span>
          {showPercentage && !indeterminate && (
            <span className="progress-percentage">{Math.round(progressValue)}%</span>
          )}
        </div>
      )}
      <div className={progressClass}>
        <div
          className={`progress-bar ${indeterminate ? 'progress-indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${progressValue}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading overlay component
 */
export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Loading message */
  message?: string;
  /** Spinner variant */
  spinnerVariant?: SpinnerLoaderProps['variant'];
  /** Backdrop opacity */
  backdropOpacity?: number;
  /** Children to render underneath overlay */
  children?: ReactNode;
}

export function LoadingOverlay({
  visible,
  message = 'Loading...',
  spinnerVariant = 'default',
  backdropOpacity = 0.5,
  children,
}: LoadingOverlayProps): ReactElement {
  if (!visible && !children) {
    return <></>;
  }

  return (
    <div className="loading-overlay-container">
      {children}
      {visible && (
        <div
          className="loading-overlay"
          style={{ backgroundColor: `rgba(255, 255, 255, ${backdropOpacity})` }}
          role="status"
          aria-label={message}
          aria-live="assertive"
        >
          <div className="loading-overlay-content">
            <SpinnerLoader
              variant={spinnerVariant}
              message={message}
              size="large"
              showMessage={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline loading component for small spaces
 */
export interface InlineLoaderProps {
  /** Loading text */
  text?: string;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Show spinner */
  showSpinner?: boolean;
}

export function InlineLoader({
  text = 'Loading...',
  size = 'small',
  showSpinner = true,
}: InlineLoaderProps): ReactElement {
  return (
    <span className={`inline-loader inline-loader-${size}`} role="status" aria-label={text}>
      {showSpinner && <span className="inline-spinner" aria-hidden="true" />}
      <span>{text}</span>
    </span>
  );
}

// Loading states styles
const loadingStyles = `
/* Base skeleton styles */
.skeleton-loader {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
}

.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-wave {
  animation: skeleton-wave 1.5s linear infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes skeleton-wave {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

/* Skeleton variants */
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  width: 100%;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.skeleton-title {
  height: 16px;
  width: 70%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-subtitle {
  height: 12px;
  width: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-action {
  width: 80px;
  height: 32px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-card {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  width: 100%;
}

.skeleton-card-header {
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-card-title {
  height: 20px;
  width: 60%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-card-text {
  height: 14px;
  width: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-card-text.short {
  width: 75%;
}

.skeleton-card-footer {
  height: 40px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-table-row {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-table-cell {
  height: 16px;
  flex: 1;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  border-radius: 4px;
  animation: skeleton-wave 1.5s linear infinite;
}

.skeleton-table-cell.short {
  flex: 0.5;
}

/* Spinner styles */
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.spinner-loader {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-small { width: 16px; height: 16px; }
.spinner-medium { width: 32px; height: 32px; }
.spinner-large { width: 48px; height: 48px; }

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spinner-spin 1s linear infinite;
}

.spinner-primary .spinner-circle { border-top-color: #3b82f6; }
.spinner-secondary .spinner-circle { border-top-color: #6b7280; }
.spinner-success .spinner-circle { border-top-color: #10b981; }
.spinner-warning .spinner-circle { border-top-color: #f59e0b; }
.spinner-error .spinner-circle { border-top-color: #ef4444; }

@keyframes spinner-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Spinner dots variant */
.spinner-dots {
  display: flex;
  gap: 0.25rem;
}

.spinner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  animation: spinner-dot-bounce 1.4s ease-in-out infinite;
}

.spinner-dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes spinner-dot-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Spinner bars variant */
.spinner-bars {
  display: flex;
  gap: 0.125rem;
  align-items: end;
  height: 20px;
}

.spinner-bar {
  width: 3px;
  background: #3b82f6;
  animation: spinner-bar-scale 1.2s ease-in-out infinite;
}

.spinner-bar:nth-child(1) { animation-delay: -1.1s; }
.spinner-bar:nth-child(2) { animation-delay: -1.0s; }
.spinner-bar:nth-child(3) { animation-delay: -0.9s; }
.spinner-bar:nth-child(4) { animation-delay: -0.8s; }

@keyframes spinner-bar-scale {
  0%, 40%, 100% { height: 4px; }
  20% { height: 20px; }
}

/* Spinner ring variant */
.spinner-ring {
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spinner-spin 1s linear infinite;
}

/* Progress styles */
.progress-container {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.progress-percentage {
  font-weight: 500;
}

.progress-loader {
  width: 100%;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-small { height: 4px; }
.progress-medium { height: 8px; }
.progress-large { height: 12px; }

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: inherit;
}

.progress-primary .progress-bar { background: #3b82f6; }
.progress-secondary .progress-bar { background: #6b7280; }
.progress-success .progress-bar { background: #10b981; }
.progress-warning .progress-bar { background: #f59e0b; }
.progress-error .progress-bar { background: #ef4444; }

.progress-indeterminate {
  width: 30% !important;
  animation: progress-indeterminate 2s linear infinite;
}

@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* Loading overlay */
.loading-overlay-container {
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(2px);
}

.loading-overlay-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

/* Inline loader */
.inline-loader {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.inline-loader-small {
  font-size: 0.75rem;
  gap: 0.25rem;
}

.inline-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spinner-spin 1s linear infinite;
}

.inline-loader-small .inline-spinner {
  width: 10px;
  height: 10px;
  border-width: 1px;
}

/* Screen reader only */
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
  .skeleton-pulse,
  .skeleton-wave,
  .spinner-circle,
  .spinner-ring,
  .spinner-dot,
  .spinner-bar,
  .progress-indeterminate,
  .inline-spinner {
    animation: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .skeleton-loader,
  .skeleton-avatar,
  .skeleton-title,
  .skeleton-subtitle,
  .skeleton-action,
  .skeleton-card-header,
  .skeleton-card-title,
  .skeleton-card-text,
  .skeleton-card-footer,
  .skeleton-table-cell {
    background: #666;
  }

  .spinner-circle,
  .spinner-ring {
    border-color: #000;
    border-top-color: #000;
  }

  .progress-loader {
    border: 1px solid #000;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .spinner-container {
    padding: 0.75rem;
  }

  .loading-overlay-content {
    padding: 1.5rem 1rem;
    margin: 1rem;
  }

  .skeleton-list-item {
    padding: 0.5rem;
    gap: 0.75rem;
  }

  .skeleton-card-body {
    padding: 0.75rem;
  }
}
`;

// Inject loading styles
if (typeof document !== 'undefined' && !document.getElementById('loading-states-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'loading-states-styles';
  styleElement.textContent = loadingStyles;
  document.head.appendChild(styleElement);
}
