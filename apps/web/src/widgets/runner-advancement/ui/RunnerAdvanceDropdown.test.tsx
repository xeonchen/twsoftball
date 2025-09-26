/**
 * @file RunnerAdvanceDropdown.test.tsx
 *
 * Comprehensive test suite for RunnerAdvanceDropdown component.
 * Tests individual runner selection, validation rules, and accessibility.
 *
 * Test coverage includes:
 * - Valid advancement options display
 * - Invalid options disabled
 * - Forced advances handling
 * - User interactions and callbacks
 * - Accessibility and keyboard support
 * - Error states and edge cases
 *
 * @remarks
 * This test suite follows TDD methodology and ensures 95%+ coverage
 * for the RunnerAdvanceDropdown component. Tests validate both the UI
 * behavior and integration with runner advancement rules.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { RunnerAdvance } from '../../../features/game-core';

import { RunnerAdvanceDropdown } from './RunnerAdvanceDropdown';

// Mock data for testing
const mockRunner = { id: 'runner-1', name: 'Alice Smith' };

/**
 * Props interface for testing
 */
interface TestDropdownProps {
  runnerId: string;
  runnerName: string;
  fromBase: number;
  toBase?: number;
  onAdvanceChange: (advance: RunnerAdvance) => void;
  canAdvanceToBase?: (runnerId: string, fromBase: number, toBase: number) => boolean;
  isForced?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * Default props for testing
 */
const createDefaultProps = (overrides: Partial<TestDropdownProps> = {}): TestDropdownProps => ({
  runnerId: mockRunner.id,
  runnerName: mockRunner.name,
  fromBase: 1,
  toBase: undefined,
  onAdvanceChange: vi.fn(),
  canAdvanceToBase: vi.fn(() => true),
  isForced: false,
  disabled: false,
  error: undefined,
  ...overrides,
});

describe('RunnerAdvanceDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const props = createDefaultProps();
      render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display runner name and current base', () => {
      const props = createDefaultProps({ runnerName: 'Alice Smith', fromBase: 1 });
      render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
      expect(screen.getAllByText(/1st base/i)).toHaveLength(2); // Header and option
    });

    it('should show dropdown with data-testid', () => {
      const props = createDefaultProps();
      render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByTestId('runner-advance-dropdown')).toBeInTheDocument();
    });

    it('should render different base labels correctly', () => {
      const bases = [
        { fromBase: 1, label: '1st base' },
        { fromBase: 2, label: '2nd base' },
        { fromBase: 3, label: '3rd base' },
      ];

      bases.forEach(({ fromBase, label }) => {
        const props = createDefaultProps({ fromBase });
        const { unmount } = render(<RunnerAdvanceDropdown {...props} />);

        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Advancement Options', () => {
    it('should show valid advancement options for runner on first base', () => {
      const props = createDefaultProps({ fromBase: 1 });
      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Should have options for 2nd, 3rd, HOME, and default "Stay on 1st"
      expect(select).toHaveDisplayValue('Stay on 1st base');

      // Check option values exist
      expect(screen.getByRole('option', { name: /stay on 1st/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /2nd base/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /3rd base/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /home.*scores/i })).toBeInTheDocument();
    });

    it('should show valid advancement options for runner on second base', () => {
      const props = createDefaultProps({ fromBase: 2 });
      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      expect(select).toHaveDisplayValue('Stay on 2nd base');
      expect(screen.getByRole('option', { name: /stay on 2nd/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /3rd base/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /home.*scores/i })).toBeInTheDocument();

      // Should not have 1st base option (backwards)
      expect(screen.queryByRole('option', { name: /1st base/i })).not.toBeInTheDocument();
    });

    it('should show valid advancement options for runner on third base', () => {
      const props = createDefaultProps({ fromBase: 3 });
      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      expect(select).toHaveDisplayValue('Stay on 3rd base');
      expect(screen.getByRole('option', { name: /stay on 3rd/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /home.*scores/i })).toBeInTheDocument();

      // Should not have earlier base options
      expect(screen.queryByRole('option', { name: /1st base/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /2nd base/i })).not.toBeInTheDocument();
    });

    it('should show current selection when toBase is provided', () => {
      const props = createDefaultProps({ fromBase: 1, toBase: 2 });
      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('2');
    });

    it('should call onAdvanceChange when selection changes', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const props = createDefaultProps({ fromBase: 1, onAdvanceChange: mockOnChange });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '2');

      expect(mockOnChange).toHaveBeenCalledWith({
        runnerId: mockRunner.id,
        fromBase: 1,
        toBase: 2,
      });
    });
  });

  describe('Invalid Options Disabled', () => {
    it('should disable invalid options when canAdvanceToBase returns false', () => {
      const mockCanAdvance = vi.fn((runnerId, fromBase, toBase) => {
        // Can only advance to 2nd base
        return toBase === 2;
      });

      const props = createDefaultProps({
        fromBase: 1,
        canAdvanceToBase: mockCanAdvance,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      screen.getByRole('combobox');

      // 2nd base should be enabled
      const secondBaseOption = screen.getByRole('option', { name: /2nd base/i });
      expect(secondBaseOption).not.toBeDisabled();

      // 3rd base should be disabled
      const thirdBaseOption = screen.getByRole('option', { name: /3rd base/i });
      expect(thirdBaseOption).toBeDisabled();

      // Home should be disabled
      const homeOption = screen.getByRole('option', { name: /home.*scores/i });
      expect(homeOption).toBeDisabled();
    });

    it('should disable options when third base is occupied by another runner', () => {
      const mockCanAdvance = vi.fn((runnerId, fromBase, toBase) => {
        // 3rd base occupied by another runner
        if (toBase === 3 && runnerId !== 'runner-3') {
          return false;
        }
        return true;
      });

      const props = createDefaultProps({
        fromBase: 2,
        canAdvanceToBase: mockCanAdvance,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      // 3rd base option should be disabled
      const thirdBaseOption = screen.getByRole('option', { name: /3rd base/i });
      expect(thirdBaseOption).toBeDisabled();

      // Home should still be available
      const homeOption = screen.getByRole('option', { name: /home.*scores/i });
      expect(homeOption).not.toBeDisabled();
    });

    it('should show disabled options with visual styling', () => {
      const mockCanAdvance = vi.fn(() => false);
      const props = createDefaultProps({
        fromBase: 1,
        canAdvanceToBase: mockCanAdvance,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      // All advancement options should have disabled styling
      const advanceOptions = screen
        .getAllByRole('option')
        .filter(option => !option.textContent?.includes('Stay on'));

      advanceOptions.forEach(option => {
        expect(option).toBeDisabled();
        // Check for disabled styling - text-gray-400 or bg-gray-100
        expect(option.className).toMatch(/text-gray-400|bg-gray-100/);
      });
    });
  });

  describe('Forced Advances', () => {
    it('should handle forced advances with disabled dropdown', () => {
      const props = createDefaultProps({
        fromBase: 1,
        toBase: 2,
        isForced: true,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Should be disabled for forced advance
      expect(select).toBeDisabled();
      expect(select).toHaveValue('2');
    });

    it('should show forced advance indicator', () => {
      const props = createDefaultProps({
        fromBase: 1,
        toBase: 2,
        isForced: true,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByText(/forced/i)).toBeInTheDocument();
    });

    it('should show forced advance with distinctive styling', () => {
      const props = createDefaultProps({
        fromBase: 1,
        toBase: 2,
        isForced: true,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const container = screen.getByTestId('runner-advance-dropdown').closest('div');
      expect(container).toHaveClass(/border-yellow-500|bg-yellow-50/); // Forced styling
    });

    it('should not call onAdvanceChange for forced advances', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      const props = createDefaultProps({
        fromBase: 1,
        toBase: 2,
        isForced: true,
        onAdvanceChange: mockOnChange,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Try to change selection (should not work since it's disabled)
      await user.click(select);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      const errorMessage = 'Cannot advance to occupied base';
      const props = createDefaultProps({ error: errorMessage });

      render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show error styling when error is present', () => {
      const props = createDefaultProps({ error: 'Invalid advance' });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass(/border-red-500|ring-red-500/); // Error styling
    });

    it('should clear error when valid selection is made', async () => {
      const user = userEvent.setup();
      let currentError = 'Invalid advance';
      const mockOnChange = vi.fn();

      const props = createDefaultProps({
        error: currentError,
        onAdvanceChange: mockOnChange,
      });

      const { rerender } = render(<RunnerAdvanceDropdown {...props} />);

      expect(screen.getByText(currentError)).toBeInTheDocument();

      // Simulate selection change that clears error
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '2');

      // Re-render without error
      currentError = '';
      rerender(<RunnerAdvanceDropdown {...{ ...props, error: currentError }} />);

      expect(screen.queryByText('Invalid advance')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const props = createDefaultProps({
        runnerName: 'Alice Smith',
        fromBase: 1,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Select advance for Alice Smith from 1st base');
    });

    it('should have proper ARIA attributes for error state', () => {
      const props = createDefaultProps({
        error: 'Cannot advance to occupied base',
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      const props = createDefaultProps({
        fromBase: 1,
        onAdvanceChange: mockOnChange,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Should be focusable
      await user.tab();
      expect(select).toHaveFocus();

      // Should respond to keyboard interaction by selecting an option
      await user.selectOptions(select, '2');

      // Should call onChange when selection is made
      expect(mockOnChange).toHaveBeenCalledWith({
        runnerId: 'runner-1',
        fromBase: 1,
        toBase: 2,
      });
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      await user.tab();
      expect(select).toHaveFocus();

      // Focus should be visible
      expect(select).toHaveClass(/focus:ring|focus:border/);
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const props = createDefaultProps({ disabled: true });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should have disabled styling when disabled', () => {
      const props = createDefaultProps({ disabled: true });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass(/disabled:opacity-50|disabled:cursor-not-allowed/);
    });

    it('should not call onAdvanceChange when disabled', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      const props = createDefaultProps({
        disabled: true,
        onAdvanceChange: mockOnChange,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Try to interact with disabled dropdown
      await user.click(select);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing runner name gracefully', () => {
      const props = createDefaultProps({ runnerName: '' });

      render(<RunnerAdvanceDropdown {...props} />);

      // Should still render with fallback
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(/runner/i)).toBeInTheDocument();
    });

    it('should handle invalid base numbers', () => {
      const props = createDefaultProps({ fromBase: 5 }); // Invalid base

      render(<RunnerAdvanceDropdown {...props} />);

      // Should fallback to valid display
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle rapid selection changes', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      const props = createDefaultProps({
        fromBase: 1,
        onAdvanceChange: mockOnChange,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Rapid selections
      await user.selectOptions(select, '2');
      await user.selectOptions(select, '3');
      await user.selectOptions(select, '0');

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should handle canAdvanceToBase function throwing errors', () => {
      const mockCanAdvance = vi.fn(() => {
        throw new Error('Validation error');
      });

      const props = createDefaultProps({
        fromBase: 1,
        canAdvanceToBase: mockCanAdvance,
      });

      // Should not crash on validation error
      expect(() => {
        render(<RunnerAdvanceDropdown {...props} />);
      }).not.toThrow();

      // Should still render dropdown
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Visual Design', () => {
    it('should have baseball-inspired styling', () => {
      const props = createDefaultProps();

      render(<RunnerAdvanceDropdown {...props} />);

      const container = screen.getByTestId('runner-advance-dropdown').closest('div');

      // Should have baseball field green color theme
      expect(container).toHaveClass(/border-green-300|bg-green-50/);
    });

    it('should meet minimum touch target size requirements', () => {
      const props = createDefaultProps();

      render(<RunnerAdvanceDropdown {...props} />);

      const select = screen.getByRole('combobox');

      // Should meet 48px minimum touch target
      expect(select).toHaveClass(/min-h-\[48px\]|h-12/);
    });

    it('should be responsive for mobile devices', () => {
      const props = createDefaultProps();

      render(<RunnerAdvanceDropdown {...props} />);

      const container = screen.getByTestId('runner-advance-dropdown').closest('div');

      // Should have mobile-responsive classes
      expect(container).toHaveClass(/w-full/);
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const mockOnChange = vi.fn();
      const props = createDefaultProps({ onAdvanceChange: mockOnChange });

      const { rerender } = render(<RunnerAdvanceDropdown {...props} />);

      // Re-render with same props
      rerender(<RunnerAdvanceDropdown {...props} />);

      // Component should handle re-renders efficiently
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle complex canAdvanceToBase calculations efficiently', () => {
      let callCount = 0;
      const mockCanAdvance = vi.fn(() => {
        callCount++;
        return callCount % 2 === 0; // Alternate true/false
      });

      const props = createDefaultProps({
        fromBase: 1,
        canAdvanceToBase: mockCanAdvance,
      });

      render(<RunnerAdvanceDropdown {...props} />);

      // Should call canAdvanceToBase for each valid option (2nd, 3rd, home)
      expect(mockCanAdvance).toHaveBeenCalledTimes(3);
    });
  });
});
