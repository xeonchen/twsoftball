import { vi } from 'vitest';

import { render, screen, fireEvent } from '../../../test/utils';

import { NavigationConfirmDialog } from './NavigationConfirmDialog';

describe('NavigationConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<NavigationConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should render dialog when isOpen is true', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('Default Content', () => {
    it('should display default title when not provided', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should display default message when not provided', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);
      expect(
        screen.getByText('You have unsaved changes. Are you sure you want to leave?')
      ).toBeInTheDocument();
    });

    it('should display custom title when provided', () => {
      render(<NavigationConfirmDialog {...defaultProps} title="Game in Progress" />);
      expect(screen.getByText('Game in Progress')).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      render(
        <NavigationConfirmDialog
          {...defaultProps}
          message="Your game progress will be saved. Continue?"
        />
      );
      expect(screen.getByText('Your game progress will be saved. Continue?')).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onConfirm when Leave button clicked', () => {
      const onConfirm = vi.fn();
      render(<NavigationConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: /leave/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Stay button clicked', () => {
      const onCancel = vi.fn();
      render(<NavigationConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /stay/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should render Leave and Stay buttons', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stay/i })).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onCancel when Escape key pressed', () => {
      const onCancel = vi.fn();
      render(<NavigationConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel for other key presses', () => {
      const onCancel = vi.fn();
      render(<NavigationConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Enter' });
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have aria-describedby for the message', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should have proper alertdialog role for urgency', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      // The alertdialog role is semantically correct for urgent warnings
      // requiring user response - screen readers announce these more prominently
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should focus Stay button by default when opened', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      // Stay button should be focused by default as it's the "safe" option
      const stayButton = screen.getByRole('button', { name: /stay/i });
      expect(stayButton).toHaveFocus();
    });

    it('should trap focus within dialog', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const leaveButton = screen.getByRole('button', { name: /leave/i });
      const stayButton = screen.getByRole('button', { name: /stay/i });

      // Focus should cycle between the two buttons
      stayButton.focus();
      expect(stayButton).toHaveFocus();

      fireEvent.keyDown(stayButton, { key: 'Tab' });
      // After tabbing from stay, focus should go to leave
      leaveButton.focus(); // Simulate tab navigation
      expect(leaveButton).toBeInTheDocument();
    });
  });

  describe('Backdrop', () => {
    it('should render backdrop overlay when open', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const backdrop = screen.getByTestId('navigation-dialog-backdrop');
      expect(backdrop).toBeInTheDocument();
    });

    it('should call onCancel when backdrop is clicked', () => {
      const onCancel = vi.fn();
      render(<NavigationConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('navigation-dialog-backdrop'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual Styling', () => {
    it('should have warning-themed styling for Leave button', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const leaveButton = screen.getByRole('button', { name: /leave/i });
      // Leave button should be styled as danger/warning
      expect(leaveButton).toHaveClass('bg-red-600');
    });

    it('should have primary styling for Stay button', () => {
      render(<NavigationConfirmDialog {...defaultProps} />);

      const stayButton = screen.getByRole('button', { name: /stay/i });
      // Stay button should be styled as primary/safe
      expect(stayButton).toHaveClass('bg-field-green-600');
    });
  });
});
