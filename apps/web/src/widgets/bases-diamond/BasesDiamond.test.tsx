import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { BasesDiamond } from './BasesDiamond';
import type { BasesDiamondProps } from './BasesDiamond';

// Mock player data for testing
const mockRunner1 = {
  id: '1',
  name: 'Mike Chen',
  jerseyNumber: '8',
  position: 'SS',
  battingOrder: 1,
};

const mockRunner2 = {
  id: '2',
  name: 'Lisa Park',
  jerseyNumber: '5',
  position: 'CF',
  battingOrder: 2,
};

describe('BasesDiamond Component', () => {
  const defaultProps: BasesDiamondProps = {
    bases: {
      first: null,
      second: null,
      third: null,
    },
  };

  it('should render with empty bases', () => {
    render(<BasesDiamond {...defaultProps} />);

    // Check that all bases are rendered with proper test IDs
    expect(screen.getByTestId('base-1b')).toBeInTheDocument();
    expect(screen.getByTestId('base-2b')).toBeInTheDocument();
    expect(screen.getByTestId('base-3b')).toBeInTheDocument();
    expect(screen.getByTestId('base-home')).toBeInTheDocument();

    // All bases should be empty (gray background)
    expect(screen.getByTestId('base-1b')).toHaveClass('bg-gray-300');
    expect(screen.getByTestId('base-2b')).toHaveClass('bg-gray-300');
    expect(screen.getByTestId('base-3b')).toHaveClass('bg-gray-300');
    expect(screen.getByTestId('base-home')).toHaveClass('bg-gray-300');
  });

  it('should display correct 4-base layout per wireframes', () => {
    const propsWithRunners: BasesDiamondProps = {
      bases: {
        first: mockRunner1,
        second: null,
        third: mockRunner2,
      },
    };

    render(<BasesDiamond {...propsWithRunners} />);

    // Test corrected diamond layout from Screen 5 wireframes
    // 2B at top, 3B at left, 1B at right, H at bottom
    expect(screen.getByTestId('base-1b')).toHaveClass('bg-warning-500'); // occupied
    expect(screen.getByTestId('base-2b')).toHaveClass('bg-gray-300'); // empty
    expect(screen.getByTestId('base-3b')).toHaveClass('bg-warning-500'); // occupied
    expect(screen.getByTestId('base-home')).toHaveClass('bg-gray-300'); // empty
  });

  it('should maintain aspect ratio on different screen sizes', () => {
    render(<BasesDiamond {...defaultProps} />);

    const container = screen.getByTestId('bases-container');
    expect(container).toHaveStyle({ aspectRatio: '1/1' });
  });

  it('should display player information when base is occupied', () => {
    const propsWithRunners: BasesDiamondProps = {
      bases: {
        first: mockRunner1,
        second: null,
        third: mockRunner2,
      },
    };

    render(<BasesDiamond {...propsWithRunners} />);

    // Check that player names and jersey numbers are displayed
    expect(screen.getByText('M. Chen')).toBeInTheDocument();
    expect(screen.getByText('#8')).toBeInTheDocument();
    expect(screen.getByText('L. Park')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('should handle responsive layout for portrait/landscape', () => {
    render(<BasesDiamond {...defaultProps} size="medium" />);

    const container = screen.getByTestId('bases-container');
    expect(container).toHaveClass('w-64', 'h-64'); // Medium size
  });

  it('should support different sizes', () => {
    const { rerender } = render(<BasesDiamond {...defaultProps} size="small" />);
    let container = screen.getByTestId('bases-container');
    expect(container).toHaveClass('w-48', 'h-48');

    rerender(<BasesDiamond {...defaultProps} size="large" />);
    container = screen.getByTestId('bases-container');
    expect(container).toHaveClass('w-80', 'h-80');
  });

  it('should handle interactive mode with click callbacks', () => {
    const onBaseClick = vi.fn();
    const interactiveProps: BasesDiamondProps = {
      ...defaultProps,
      interactive: true,
      onBaseClick,
    };

    render(<BasesDiamond {...interactiveProps} />);

    // Bases should be clickable when interactive
    const firstBase = screen.getByTestId('base-1b');
    expect(firstBase).toHaveClass('cursor-pointer');

    firstBase.click();
    expect(onBaseClick).toHaveBeenCalledWith('first');
  });

  it('should show labels when enabled', () => {
    render(<BasesDiamond {...defaultProps} showLabels={true} />);

    expect(screen.getByText('1B')).toBeInTheDocument();
    expect(screen.getByText('2B')).toBeInTheDocument();
    expect(screen.getByText('3B')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const accessibleProps: BasesDiamondProps = {
      ...defaultProps,
      'aria-label': 'Bases: empty',
    };

    render(<BasesDiamond {...accessibleProps} />);

    const container = screen.getByTestId('bases-container');
    expect(container).toHaveAttribute('aria-label', 'Bases: empty');
    expect(container).toHaveAttribute('role', 'img');
  });

  it('should announce runner positions to screen readers', () => {
    const propsWithRunners: BasesDiamondProps = {
      bases: {
        first: mockRunner1,
        second: null,
        third: mockRunner2,
      },
      'aria-label': 'Bases: Mike Chen on first, Lisa Park on third',
    };

    render(<BasesDiamond {...propsWithRunners} />);

    const container = screen.getByTestId('bases-container');
    expect(container).toHaveAttribute(
      'aria-label',
      'Bases: Mike Chen on first, Lisa Park on third'
    );
  });

  it('should have minimum touch targets for each base', () => {
    render(<BasesDiamond {...defaultProps} interactive={true} />);

    // Each base should have minimum 32x32px touch target as per specifications
    const bases = [
      screen.getByTestId('base-1b'),
      screen.getByTestId('base-2b'),
      screen.getByTestId('base-3b'),
      screen.getByTestId('base-home'),
    ];

    bases.forEach(base => {
      expect(base).toHaveClass('min-w-8', 'min-h-8'); // 32px minimum
    });
  });

  it('should handle null runners gracefully', () => {
    const propsWithNulls: BasesDiamondProps = {
      bases: {
        first: null,
        second: null,
        third: null,
      },
    };

    expect(() => render(<BasesDiamond {...propsWithNulls} />)).not.toThrow();
  });
});
