/**
 * @file Tests for LoadingStates Components
 *
 * Comprehensive tests for loading state components with accessibility,
 * animations, and various visual variants.
 *
 * Target Coverage: 90%+
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import {
  SkeletonLoader,
  SpinnerLoader,
  ProgressLoader,
  LoadingOverlay,
  InlineLoader,
} from './LoadingStates';

describe('LoadingStates', () => {
  beforeEach(() => {
    // Clean up any existing style elements for tests
  });

  describe('SkeletonLoader', () => {
    describe('Basic Rendering', () => {
      it('renders skeleton loader with default props', () => {
        const { container } = render(<SkeletonLoader />);
        expect(container.querySelector('.skeleton-container')).toBeInTheDocument();
      });

      it('renders single skeleton by default', () => {
        const { container } = render(<SkeletonLoader />);
        const skeletons = container.querySelectorAll('.skeleton-loader');
        expect(skeletons.length).toBe(1);
      });

      it('renders multiple skeletons based on count prop', () => {
        const { container } = render(<SkeletonLoader count={5} />);
        const skeletons = container.querySelectorAll('.skeleton-loader');
        expect(skeletons.length).toBe(5);
      });
    });

    describe('Variants', () => {
      it('renders text variant', () => {
        const { container } = render(<SkeletonLoader variant="text" />);
        expect(container.querySelector('.skeleton-text')).toBeInTheDocument();
      });

      it('renders circular variant', () => {
        const { container } = render(<SkeletonLoader variant="circular" />);
        expect(container.querySelector('.skeleton-circular')).toBeInTheDocument();
      });

      it('renders rectangular variant', () => {
        const { container } = render(<SkeletonLoader variant="rectangular" />);
        expect(container.querySelector('.skeleton-rectangular')).toBeInTheDocument();
      });

      it('renders list variant', () => {
        const { container } = render(<SkeletonLoader variant="list" count={3} />);
        const listItems = container.querySelectorAll('.skeleton-list-item');
        expect(listItems.length).toBe(3);
      });

      it('renders card variant', () => {
        const { container } = render(<SkeletonLoader variant="card" count={2} />);
        const cards = container.querySelectorAll('.skeleton-card');
        expect(cards.length).toBe(2);
      });

      it('renders table variant', () => {
        const { container } = render(<SkeletonLoader variant="table" count={4} />);
        const rows = container.querySelectorAll('.skeleton-table-row');
        expect(rows.length).toBe(4);
      });
    });

    describe('Sizes', () => {
      it('renders small size', () => {
        render(<SkeletonLoader size="small" />);
        const container = screen.getByRole('status');
        expect(container).toBeInTheDocument();
      });

      it('renders medium size', () => {
        render(<SkeletonLoader size="medium" />);
        const container = screen.getByRole('status');
        expect(container).toBeInTheDocument();
      });

      it('renders large size', () => {
        render(<SkeletonLoader size="large" />);
        const container = screen.getByRole('status');
        expect(container).toBeInTheDocument();
      });
    });

    describe('Animations', () => {
      it('renders pulse animation', () => {
        const { container } = render(<SkeletonLoader animation="pulse" />);
        expect(container.querySelector('.skeleton-pulse')).toBeInTheDocument();
      });

      it('renders wave animation', () => {
        const { container } = render(<SkeletonLoader animation="wave" />);
        expect(container.querySelector('.skeleton-wave')).toBeInTheDocument();
      });

      it('renders without animation', () => {
        const { container } = render(<SkeletonLoader animation="none" />);
        expect(container.querySelector('.skeleton-none')).toBeInTheDocument();
      });
    });

    describe('Custom Dimensions', () => {
      it('accepts custom width', () => {
        const { container } = render(<SkeletonLoader width="300px" />);
        const skeleton = container.querySelector('.skeleton-loader');
        expect(skeleton).toHaveStyle({ width: '300px' });
      });

      it('accepts custom height', () => {
        const { container } = render(<SkeletonLoader height="200px" />);
        const skeleton = container.querySelector('.skeleton-loader');
        expect(skeleton).toHaveStyle({ height: '200px' });
      });

      it('accepts both width and height', () => {
        const { container } = render(<SkeletonLoader width="400px" height="150px" />);
        const skeleton = container.querySelector('.skeleton-loader');
        expect(skeleton).toHaveStyle({ width: '400px', height: '150px' });
      });
    });

    describe('List Variant Structure', () => {
      it('renders list with avatar, content, and action', () => {
        const { container } = render(<SkeletonLoader variant="list" count={1} />);
        expect(container.querySelector('.skeleton-avatar')).toBeInTheDocument();
        expect(container.querySelector('.skeleton-content')).toBeInTheDocument();
        expect(container.querySelector('.skeleton-action')).toBeInTheDocument();
      });

      it('renders list with title and subtitle', () => {
        const { container } = render(<SkeletonLoader variant="list" count={1} />);
        expect(container.querySelector('.skeleton-title')).toBeInTheDocument();
        expect(container.querySelector('.skeleton-subtitle')).toBeInTheDocument();
      });
    });

    describe('Card Variant Structure', () => {
      it('renders card with header, body, and footer', () => {
        const { container } = render(<SkeletonLoader variant="card" count={1} />);
        expect(container.querySelector('.skeleton-card-header')).toBeInTheDocument();
        expect(container.querySelector('.skeleton-card-body')).toBeInTheDocument();
        expect(container.querySelector('.skeleton-card-footer')).toBeInTheDocument();
      });

      it('renders card body with title and text', () => {
        const { container } = render(<SkeletonLoader variant="card" count={1} />);
        expect(container.querySelector('.skeleton-card-title')).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton-card-text').length).toBeGreaterThan(0);
      });
    });

    describe('Table Variant Structure', () => {
      it('renders table rows with multiple cells', () => {
        const { container } = render(<SkeletonLoader variant="table" count={1} />);
        const cells = container.querySelectorAll('.skeleton-table-cell');
        expect(cells.length).toBeGreaterThan(1);
      });
    });

    describe('Accessibility', () => {
      it('has role="status" on container', () => {
        render(<SkeletonLoader />);
        const container = screen.getByRole('status');
        expect(container).toBeInTheDocument();
      });

      it('has aria-label with message', () => {
        render(<SkeletonLoader message="Loading player list..." />);
        const container = screen.getByLabelText('Loading player list...');
        expect(container).toBeInTheDocument();
      });

      it('has aria-live="polite"', () => {
        render(<SkeletonLoader />);
        const container = screen.getByRole('status');
        expect(container).toHaveAttribute('aria-live', 'polite');
      });

      it('skeleton elements are aria-hidden', () => {
        const { container } = render(<SkeletonLoader />);
        const skeleton = container.querySelector('.skeleton-loader');
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });

      it('shows screen reader message when showMessage is true', () => {
        render(<SkeletonLoader showMessage={true} message="Loading content" />);
        const srText = screen.getByText('Loading content');
        expect(srText).toHaveClass('sr-only');
      });
    });
  });

  describe('SpinnerLoader', () => {
    describe('Basic Rendering', () => {
      it('renders spinner loader with default props', () => {
        const { container } = render(<SpinnerLoader />);
        expect(container.querySelector('.spinner-container')).toBeInTheDocument();
      });

      it('renders loading message by default', () => {
        render(<SpinnerLoader message="Loading data..." />);
        const messages = screen.getAllByText('Loading data...');
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    describe('Variants', () => {
      it('renders default circular spinner', () => {
        const { container } = render(<SpinnerLoader variant="default" />);
        expect(container.querySelector('.spinner-default')).toBeInTheDocument();
        expect(container.querySelector('.spinner-circle')).toBeInTheDocument();
      });

      it('renders dots spinner', () => {
        const { container } = render(<SpinnerLoader variant="dots" />);
        expect(container.querySelector('.spinner-dots')).toBeInTheDocument();
        const dots = container.querySelectorAll('.spinner-dot');
        expect(dots.length).toBe(3);
      });

      it('renders bars spinner', () => {
        const { container } = render(<SpinnerLoader variant="bars" />);
        expect(container.querySelector('.spinner-bars')).toBeInTheDocument();
        const bars = container.querySelectorAll('.spinner-bar');
        expect(bars.length).toBe(4);
      });

      it('renders ring spinner', () => {
        const { container } = render(<SpinnerLoader variant="ring" />);
        expect(container.querySelector('.spinner-ring')).toBeInTheDocument();
      });
    });

    describe('Sizes', () => {
      it('renders small spinner', () => {
        const { container } = render(<SpinnerLoader size="small" />);
        expect(container.querySelector('.spinner-small')).toBeInTheDocument();
      });

      it('renders medium spinner', () => {
        const { container } = render(<SpinnerLoader size="medium" />);
        expect(container.querySelector('.spinner-medium')).toBeInTheDocument();
      });

      it('renders large spinner', () => {
        const { container } = render(<SpinnerLoader size="large" />);
        expect(container.querySelector('.spinner-large')).toBeInTheDocument();
      });
    });

    describe('Colors', () => {
      it('renders primary color', () => {
        const { container } = render(<SpinnerLoader color="primary" />);
        expect(container.querySelector('.spinner-primary')).toBeInTheDocument();
      });

      it('renders secondary color', () => {
        const { container } = render(<SpinnerLoader color="secondary" />);
        expect(container.querySelector('.spinner-secondary')).toBeInTheDocument();
      });

      it('renders success color', () => {
        const { container } = render(<SpinnerLoader color="success" />);
        expect(container.querySelector('.spinner-success')).toBeInTheDocument();
      });

      it('renders warning color', () => {
        const { container } = render(<SpinnerLoader color="warning" />);
        expect(container.querySelector('.spinner-warning')).toBeInTheDocument();
      });

      it('renders error color', () => {
        const { container } = render(<SpinnerLoader color="error" />);
        expect(container.querySelector('.spinner-error')).toBeInTheDocument();
      });
    });

    describe('Message Display', () => {
      it('shows message when showMessage is true', () => {
        render(<SpinnerLoader message="Processing..." showMessage={true} />);
        const messages = screen.getAllByText('Processing...');
        expect(messages.length).toBeGreaterThan(0);
      });

      it('hides message when showMessage is false', () => {
        const { container } = render(
          <SpinnerLoader message="Hidden message" showMessage={false} />
        );
        const messageElement = container.querySelector('.spinner-message');
        expect(messageElement).not.toBeInTheDocument();
      });
    });

    describe('Accessibility', () => {
      it('has role="status"', () => {
        render(<SpinnerLoader message="Loading..." />);
        const container = screen.getByRole('status');
        expect(container).toBeInTheDocument();
      });

      it('has aria-label', () => {
        render(<SpinnerLoader message="Loading spinner..." />);
        const container = screen.getByLabelText('Loading spinner...');
        expect(container).toBeInTheDocument();
      });

      it('has aria-live="polite"', () => {
        render(<SpinnerLoader />);
        const container = screen.getByRole('status');
        expect(container).toHaveAttribute('aria-live', 'polite');
      });

      it('includes screen reader text', () => {
        render(<SpinnerLoader message="Loading" />);
        const srTexts = screen.getAllByText('Loading');
        const srText = srTexts.find(el => el.classList.contains('sr-only'));
        expect(srText).toBeInTheDocument();
      });
    });
  });

  describe('ProgressLoader', () => {
    describe('Basic Rendering', () => {
      it('renders progress loader with default props', () => {
        const { container } = render(<ProgressLoader />);
        expect(container.querySelector('.progress-container')).toBeInTheDocument();
      });

      it('renders with specific progress value', () => {
        const { container } = render(<ProgressLoader value={50} />);
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).toHaveStyle({ width: '50%' });
      });
    });

    describe('Progress Values', () => {
      it('clamps value to 0-100 range (above)', () => {
        const { container } = render(<ProgressLoader value={150} />);
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).toHaveStyle({ width: '100%' });
      });

      it('clamps value to 0-100 range (below)', () => {
        const { container } = render(<ProgressLoader value={-10} />);
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).toHaveStyle({ width: '0%' });
      });

      it('handles 0% progress', () => {
        const { container } = render(<ProgressLoader value={0} />);
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).toHaveStyle({ width: '0%' });
      });

      it('handles 100% progress', () => {
        const { container } = render(<ProgressLoader value={100} />);
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).toHaveStyle({ width: '100%' });
      });
    });

    describe('Indeterminate Mode', () => {
      it('renders indeterminate progress', () => {
        const { container } = render(<ProgressLoader indeterminate={true} />);
        const progressBar = container.querySelector('.progress-indeterminate');
        expect(progressBar).toBeInTheDocument();
      });

      it('does not set width style in indeterminate mode', () => {
        const { container } = render(<ProgressLoader indeterminate={true} value={50} />);
        const progressBar = container.querySelector('.progress-bar');
        const style = progressBar?.getAttribute('style');
        if (style === null) {
          expect(style).toBeNull();
        } else {
          expect(style).not.toContain('width');
        }
      });
    });

    describe('Percentage Display', () => {
      it('shows percentage when showPercentage is true', () => {
        render(<ProgressLoader value={75} showPercentage={true} showMessage={true} />);
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      it('hides percentage when showPercentage is false', () => {
        const { container } = render(
          <ProgressLoader value={75} showPercentage={false} showMessage={true} />
        );
        expect(container.querySelector('.progress-percentage')).not.toBeInTheDocument();
      });

      it('does not show percentage in indeterminate mode', () => {
        const { container } = render(
          <ProgressLoader indeterminate={true} showPercentage={true} showMessage={true} />
        );
        expect(container.querySelector('.progress-percentage')).not.toBeInTheDocument();
      });

      it('rounds percentage to whole number', () => {
        render(<ProgressLoader value={75.7} showPercentage={true} showMessage={true} />);
        expect(screen.getByText('76%')).toBeInTheDocument();
      });
    });

    describe('Sizes', () => {
      it('renders small progress bar', () => {
        const { container } = render(<ProgressLoader size="small" />);
        expect(container.querySelector('.progress-small')).toBeInTheDocument();
      });

      it('renders medium progress bar', () => {
        const { container } = render(<ProgressLoader size="medium" />);
        expect(container.querySelector('.progress-medium')).toBeInTheDocument();
      });

      it('renders large progress bar', () => {
        const { container } = render(<ProgressLoader size="large" />);
        expect(container.querySelector('.progress-large')).toBeInTheDocument();
      });
    });

    describe('Colors', () => {
      it('renders primary color', () => {
        const { container } = render(<ProgressLoader color="primary" />);
        expect(container.querySelector('.progress-primary')).toBeInTheDocument();
      });

      it('renders secondary color', () => {
        const { container } = render(<ProgressLoader color="secondary" />);
        expect(container.querySelector('.progress-secondary')).toBeInTheDocument();
      });

      it('renders success color', () => {
        const { container } = render(<ProgressLoader color="success" />);
        expect(container.querySelector('.progress-success')).toBeInTheDocument();
      });

      it('renders warning color', () => {
        const { container } = render(<ProgressLoader color="warning" />);
        expect(container.querySelector('.progress-warning')).toBeInTheDocument();
      });

      it('renders error color', () => {
        const { container } = render(<ProgressLoader color="error" />);
        expect(container.querySelector('.progress-error')).toBeInTheDocument();
      });
    });

    describe('Message Display', () => {
      it('shows message when showMessage is true', () => {
        render(<ProgressLoader message="Uploading file..." showMessage={true} />);
        const messages = screen.getAllByText('Uploading file...');
        expect(messages.length).toBeGreaterThan(0);
      });

      it('hides message when showMessage is false', () => {
        const { container } = render(
          <ProgressLoader message="Hidden message" showMessage={false} />
        );
        expect(container.querySelector('.progress-label')).not.toBeInTheDocument();
      });
    });

    describe('Accessibility', () => {
      it('has role="progressbar"', () => {
        render(<ProgressLoader message="Progress..." />);
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });

      it('has aria-label', () => {
        render(<ProgressLoader message="File upload progress" />);
        const progressBar = screen.getByLabelText('File upload progress');
        expect(progressBar).toBeInTheDocument();
      });

      it('has aria-valuenow for determinate progress', () => {
        render(<ProgressLoader value={60} />);
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      });

      it('has aria-valuemin and aria-valuemax for determinate progress', () => {
        render(<ProgressLoader value={60} />);
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });

      it('does not set aria-value attributes for indeterminate progress', () => {
        render(<ProgressLoader indeterminate={true} />);
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).not.toHaveAttribute('aria-valuenow');
        expect(progressBar).not.toHaveAttribute('aria-valuemin');
        expect(progressBar).not.toHaveAttribute('aria-valuemax');
      });

      it('has aria-live="polite"', () => {
        render(<ProgressLoader />);
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('LoadingOverlay', () => {
    describe('Basic Rendering', () => {
      it('renders nothing when not visible and no children', () => {
        const { container } = render(<LoadingOverlay visible={false} />);
        expect(container.firstChild).toBeNull();
      });

      it('renders children when not visible', () => {
        render(
          <LoadingOverlay visible={false}>
            <div data-testid="child-content">Content</div>
          </LoadingOverlay>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
      });

      it('renders overlay when visible', () => {
        const { container } = render(
          <LoadingOverlay visible={true}>
            <div>Content</div>
          </LoadingOverlay>
        );
        expect(container.querySelector('.loading-overlay')).toBeInTheDocument();
      });

      it('renders children with overlay when visible', () => {
        render(
          <LoadingOverlay visible={true}>
            <div data-testid="child-content">Content</div>
          </LoadingOverlay>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
      });
    });

    describe('Overlay Styling', () => {
      it('applies default backdrop opacity', () => {
        const { container } = render(
          <LoadingOverlay visible={true}>
            <div>Content</div>
          </LoadingOverlay>
        );
        const overlay = container.querySelector('.loading-overlay');
        expect(overlay).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0.5)' });
      });

      it('applies custom backdrop opacity', () => {
        const { container } = render(
          <LoadingOverlay visible={true} backdropOpacity={0.8}>
            <div>Content</div>
          </LoadingOverlay>
        );
        const overlay = container.querySelector('.loading-overlay');
        expect(overlay).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0.8)' });
      });
    });

    describe('Spinner Variants', () => {
      it('renders with default spinner', () => {
        const { container } = render(
          <LoadingOverlay visible={true} message="Loading...">
            <div>Content</div>
          </LoadingOverlay>
        );
        expect(container.querySelector('.spinner-loader')).toBeInTheDocument();
      });

      it('renders with dots spinner variant', () => {
        const { container } = render(
          <LoadingOverlay visible={true} spinnerVariant="dots">
            <div>Content</div>
          </LoadingOverlay>
        );
        expect(container.querySelector('.spinner-dots')).toBeInTheDocument();
      });

      it('renders with bars spinner variant', () => {
        const { container } = render(
          <LoadingOverlay visible={true} spinnerVariant="bars">
            <div>Content</div>
          </LoadingOverlay>
        );
        expect(container.querySelector('.spinner-bars')).toBeInTheDocument();
      });

      it('renders with ring spinner variant', () => {
        const { container } = render(
          <LoadingOverlay visible={true} spinnerVariant="ring">
            <div>Content</div>
          </LoadingOverlay>
        );
        expect(container.querySelector('.spinner-ring')).toBeInTheDocument();
      });
    });

    describe('Messages', () => {
      it('displays custom message', () => {
        render(
          <LoadingOverlay visible={true} message="Processing data...">
            <div>Content</div>
          </LoadingOverlay>
        );
        const messages = screen.getAllByText(/Processing data.../);
        expect(messages.length).toBeGreaterThan(0);
      });

      it('uses default message when not provided', () => {
        render(
          <LoadingOverlay visible={true}>
            <div>Content</div>
          </LoadingOverlay>
        );
        const messages = screen.getAllByText(/Loading.../);
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    describe('Accessibility', () => {
      it('has role="status" on overlay', () => {
        render(
          <LoadingOverlay visible={true} message="Loading overlay...">
            <div>Content</div>
          </LoadingOverlay>
        );
        const overlays = screen.getAllByRole('status');
        const overlay = overlays.find(el => el.classList.contains('loading-overlay'));
        expect(overlay).toBeInTheDocument();
      });

      it('has aria-label', () => {
        render(
          <LoadingOverlay visible={true} message="Loading overlay content">
            <div>Content</div>
          </LoadingOverlay>
        );
        const overlays = screen.getAllByLabelText('Loading overlay content');
        expect(overlays.length).toBeGreaterThan(0);
      });

      it('has aria-live="assertive"', () => {
        const { container } = render(
          <LoadingOverlay visible={true}>
            <div>Content</div>
          </LoadingOverlay>
        );
        const overlay = container.querySelector('.loading-overlay');
        expect(overlay).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('InlineLoader', () => {
    describe('Basic Rendering', () => {
      it('renders inline loader with default props', () => {
        const { container } = render(<InlineLoader />);
        expect(container.querySelector('.inline-loader')).toBeInTheDocument();
      });

      it('renders loading text', () => {
        render(<InlineLoader text="Saving..." />);
        const loader = screen.getByRole('status');
        expect(loader).toHaveTextContent('Saving...');
      });

      it('uses default text when not provided', () => {
        render(<InlineLoader />);
        const loader = screen.getByRole('status');
        expect(loader).toHaveTextContent('Loading...');
      });
    });

    describe('Sizes', () => {
      it('renders small size', () => {
        const { container } = render(<InlineLoader size="small" />);
        expect(container.querySelector('.inline-loader-small')).toBeInTheDocument();
      });

      it('renders medium size', () => {
        const { container } = render(<InlineLoader size="medium" />);
        expect(container.querySelector('.inline-loader')).toBeInTheDocument();
        expect(container.querySelector('.inline-loader-small')).not.toBeInTheDocument();
      });
    });

    describe('Spinner Display', () => {
      it('shows spinner when showSpinner is true', () => {
        const { container } = render(<InlineLoader showSpinner={true} />);
        expect(container.querySelector('.inline-spinner')).toBeInTheDocument();
      });

      it('hides spinner when showSpinner is false', () => {
        const { container } = render(<InlineLoader showSpinner={false} />);
        expect(container.querySelector('.inline-spinner')).not.toBeInTheDocument();
      });
    });

    describe('Accessibility', () => {
      it('has role="status"', () => {
        render(<InlineLoader text="Inline loading..." />);
        const loader = screen.getByRole('status');
        expect(loader).toBeInTheDocument();
      });

      it('has aria-label', () => {
        render(<InlineLoader text="Processing inline" />);
        const loader = screen.getByLabelText('Processing inline');
        expect(loader).toBeInTheDocument();
      });

      it('spinner is aria-hidden', () => {
        const { container } = render(<InlineLoader showSpinner={true} />);
        const spinner = container.querySelector('.inline-spinner');
        expect(spinner).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Style Injection', () => {
    it('injects loading states styles into document', () => {
      const styleElement = document.getElementById('loading-states-styles');
      expect(styleElement).toBeTruthy();
    });

    it('does not inject styles multiple times', () => {
      const styleElements = document.querySelectorAll('#loading-states-styles');
      expect(styleElements.length).toBe(1);
    });
  });
});
