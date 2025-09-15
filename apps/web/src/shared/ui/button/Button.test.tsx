import { vi } from 'vitest';

import { render, screen } from '../../../test/utils';

import { Button } from './Button';

describe('Button Component', () => {
  describe('Accessibility Requirements', () => {
    it('should render with minimum 48px height for touch targets', () => {
      render(<Button>Play Ball</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-touch');
    });

    it('should render with minimum 48px width for touch targets', () => {
      render(<Button>Play Ball</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-w-touch');
    });

    it('should have proper focus ring for keyboard navigation', () => {
      render(<Button>Start Game</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-offset-2');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Start Game</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Visual Variants', () => {
    it('should apply baseball-themed primary variant by default', () => {
      render(<Button>Start Game</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-field-green-600');
      expect(button).toHaveClass('hover:bg-field-green-700');
      expect(button).toHaveClass('text-white');
    });

    it('should apply secondary variant styling', () => {
      render(<Button variant="secondary">Cancel</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-dirt-brown-100');
      expect(button).toHaveClass('hover:bg-dirt-brown-200');
      expect(button).toHaveClass('text-dirt-brown-700');
    });

    it('should apply danger variant styling', () => {
      render(<Button variant="danger">Delete Game</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
      expect(button).toHaveClass('hover:bg-red-700');
      expect(button).toHaveClass('text-white');
    });
  });

  describe('Size Variants', () => {
    it('should apply medium size by default while maintaining 48px minimum', () => {
      render(<Button>Medium Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-base');
    });

    it('should apply small size while maintaining 48px minimum', () => {
      render(<Button size="small">Small Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-sm');
    });

    it('should apply large size', () => {
      render(<Button size="large">Large Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
      expect(button).toHaveClass('text-lg');
    });
  });

  describe('States and Interactions', () => {
    it('should handle disabled state correctly', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      button.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      const button = screen.getByRole('button');
      button.click();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Content and Structure', () => {
    it('should render children correctly', () => {
      render(<Button>Button Text</Button>);
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('should support custom className while preserving base styles', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('min-h-touch'); // Base class should still be there
    });

    it('should forward HTML button attributes', () => {
      render(
        <Button type="submit" data-testid="submit-btn">
          Submit
        </Button>
      );
      const button = screen.getByTestId('submit-btn');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Baseball Theme Integration', () => {
    it('should use field green colors for primary variant', () => {
      render(<Button variant="primary">Play Ball</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-field-green-600');
      expect(button).toHaveClass('focus:ring-field-green-500');
    });

    it('should have proper visual hierarchy with softball context', () => {
      render(<Button>Record At-Bat</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('font-medium');
      expect(button).toHaveClass('rounded-lg');
      expect(button).toHaveClass('transition-colors');
    });
  });
});
