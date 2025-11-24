/**
 * @file PageErrorFallback Component Tests
 *
 * Tests for the page-specific error fallback component used with ErrorBoundary
 * to provide user-friendly error states for lazy-loaded route pages.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { type Mock, vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { PageErrorFallback } from './PageErrorFallback';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('PageErrorFallback', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (ui: ReactElement): ReturnType<typeof render> => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  describe('Rendering', () => {
    it('should render with the correct page name', () => {
      renderWithRouter(<PageErrorFallback pageName="Game Recording" />);

      expect(screen.getByText(/Game Recording/)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render the error title', () => {
      renderWithRouter(<PageErrorFallback pageName="Settings" />);

      expect(screen.getByText('Unable to Load Page')).toBeInTheDocument();
    });

    it('should render Try Again and Go to Home buttons', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      expect(screen.getByTestId('page-error-retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('page-error-home-button')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go to Home')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" className="custom-class" />);

      const container = screen.getByTestId('page-error-fallback');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Error Details', () => {
    it('should show error details in development mode when showDetails is true', () => {
      const error = new Error('Test error message');
      error.name = 'TestError';

      renderWithRouter(<PageErrorFallback pageName="Test Page" error={error} showDetails={true} />);

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('TestError')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should not show error details when showDetails is false', () => {
      const error = new Error('Test error message');

      renderWithRouter(
        <PageErrorFallback pageName="Test Page" error={error} showDetails={false} />
      );

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });

    it('should not show error details when no error is provided', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" showDetails={true} />);

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });

    it('should show error stack trace when available', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at TestComponent';

      renderWithRouter(<PageErrorFallback pageName="Test Page" error={error} showDetails={true} />);

      expect(screen.getByText(/at TestComponent/)).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onRetry when Try Again is clicked and onRetry is provided', () => {
      const mockOnRetry = vi.fn();

      renderWithRouter(<PageErrorFallback pageName="Test Page" onRetry={mockOnRetry} />);

      fireEvent.click(screen.getByTestId('page-error-retry-button'));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should reload the page when Try Again is clicked and no onRetry is provided', () => {
      const mockReload = vi.fn();
      const originalLocation = window.location;

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: mockReload },
        writable: true,
      });

      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      fireEvent.click(screen.getByTestId('page-error-retry-button'));

      expect(mockReload).toHaveBeenCalledTimes(1);

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should navigate to home when Go to Home is clicked', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      fireEvent.click(screen.getByTestId('page-error-home-button'));

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive" for urgent announcements', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have descriptive button text', () => {
      renderWithRouter(<PageErrorFallback pageName="Test Page" />);

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
    });
  });

  describe('Test IDs', () => {
    it('should have correct test IDs for automation', () => {
      const error = new Error('Test error');

      renderWithRouter(<PageErrorFallback pageName="Test Page" error={error} showDetails={true} />);

      expect(screen.getByTestId('page-error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('page-error-retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('page-error-home-button')).toBeInTheDocument();
      expect(screen.getByTestId('page-error-details')).toBeInTheDocument();
    });
  });
});
