import { vi } from 'vitest';

import { render, screen } from '../../../test/utils';

import { Card } from './Card';

describe('Card Component', () => {
  describe('Basic Functionality', () => {
    it('should render children correctly', () => {
      render(<Card>Test content</Card>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render complex children structures', () => {
      render(
        <Card>
          <h2>Game Summary</h2>
          <p>Home: 7, Away: 3</p>
          <button>View Details</button>
        </Card>
      );
      expect(screen.getByText('Game Summary')).toBeInTheDocument();
      expect(screen.getByText('Home: 7, Away: 3')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });

  describe('Visual Variants', () => {
    it('should apply default styling', () => {
      render(<Card data-testid="default-card">Default card</Card>);
      const card = screen.getByTestId('default-card');
      expect(card).toHaveClass('shadow-md');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('p-4');
      expect(card).toHaveClass('bg-white');
    });

    it('should apply elevated variant styling', () => {
      render(
        <Card variant="elevated" data-testid="elevated-card">
          Elevated card
        </Card>
      );
      const card = screen.getByTestId('elevated-card');
      expect(card).toHaveClass('shadow-lg');
    });

    it('should apply outlined variant styling', () => {
      render(
        <Card variant="outlined" data-testid="outlined-card">
          Outlined card
        </Card>
      );
      const card = screen.getByTestId('outlined-card');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-gray-200');
      expect(card).toHaveClass('shadow-sm');
    });

    it('should apply flush variant styling', () => {
      render(
        <Card variant="flush" data-testid="flush-card">
          Flush card
        </Card>
      );
      const card = screen.getByTestId('flush-card');
      expect(card).toHaveClass('shadow-none');
      expect(card).toHaveClass('border-0');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size padding', () => {
      render(
        <Card size="small" data-testid="small-card">
          Small card
        </Card>
      );
      const card = screen.getByTestId('small-card');
      expect(card).toHaveClass('p-3');
    });

    it('should apply medium size padding by default', () => {
      render(<Card data-testid="medium-card">Medium card</Card>);
      const card = screen.getByTestId('medium-card');
      expect(card).toHaveClass('p-4');
    });

    it('should apply large size padding', () => {
      render(
        <Card size="large" data-testid="large-card">
          Large card
        </Card>
      );
      const card = screen.getByTestId('large-card');
      expect(card).toHaveClass('p-6');
    });

    it('should apply extra large size padding', () => {
      render(
        <Card size="xl" data-testid="xl-card">
          Extra large card
        </Card>
      );
      const card = screen.getByTestId('xl-card');
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Interactive Features', () => {
    it('should apply clickable styling when onClick provided', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="clickable-card">
          Clickable card
        </Card>
      );
      const card = screen.getByTestId('clickable-card');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('hover:shadow-lg');
      expect(card).toHaveClass('transition-shadow');
    });

    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="click-card">
          Click me
        </Card>
      );
      const card = screen.getByTestId('click-card');
      card.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have proper keyboard accessibility when clickable', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="keyboard-card">
          Keyboard accessible
        </Card>
      );
      const card = screen.getByTestId('keyboard-card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should handle keyboard events (Enter and Space)', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="keyboard-test-card">
          Keyboard test
        </Card>
      );
      const card = screen.getByTestId('keyboard-test-card');

      // Test Enter key
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(handleClick).toHaveBeenCalledTimes(2);

      // Test other keys (should not trigger)
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Customization', () => {
    it('should support custom className while preserving base styles', () => {
      render(
        <Card className="custom-class" data-testid="custom-card">
          Custom card
        </Card>
      );
      const card = screen.getByTestId('custom-card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg'); // Base class should still be there
    });

    it('should forward additional props', () => {
      render(<Card data-testid="test-card">Props test</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Baseball Theme Integration', () => {
    it('should use consistent design system colors', () => {
      render(
        <Card variant="outlined" data-testid="themed-card">
          Themed card
        </Card>
      );
      const card = screen.getByTestId('themed-card');
      expect(card).toHaveClass('border-gray-200');
      expect(card).toHaveClass('bg-white');
    });

    it('should have proper visual hierarchy for game data', () => {
      render(
        <Card>
          <h3>Team Statistics</h3>
          <div>Runs: 5</div>
        </Card>
      );
      const card = screen.getByText('Team Statistics').closest('div');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('shadow-md');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Card>Accessible content</Card>);
      const card = screen.getByText('Accessible content').parentElement;
      expect(card?.tagName).toBe('DIV');
    });

    it('should maintain focus visibility when interactive', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="focus-card">
          Focus test
        </Card>
      );
      const card = screen.getByTestId('focus-card');
      expect(card).toHaveClass('focus:outline-none');
      expect(card).toHaveClass('focus:ring-2');
      expect(card).toHaveClass('focus:ring-field-green-500');
    });

    it('should not have interactive attributes when not clickable', () => {
      render(<Card data-testid="static-card">Static card</Card>);
      const card = screen.getByTestId('static-card');
      expect(card).not.toHaveAttribute('role');
      expect(card).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Layout and Spacing', () => {
    it('should have full width by default', () => {
      render(<Card data-testid="full-width-card">Full width test</Card>);
      const card = screen.getByTestId('full-width-card');
      expect(card).toHaveClass('w-full');
    });

    it('should handle nested content properly', () => {
      render(
        <Card>
          <div className="space-y-2">
            <h3>Nested Content</h3>
            <p>Paragraph content</p>
          </div>
        </Card>
      );
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
      expect(screen.getByText('Paragraph content')).toBeInTheDocument();
    });
  });
});
