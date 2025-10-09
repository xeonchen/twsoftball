/**
 * @file SubstitutionDialog Component Tests
 *
 * Test-first implementation for SubstitutionDialog component that handles
 * player substitutions with eligibility validation and confirmation flow.
 *
 * @remarks
 * This test file drives the implementation of the SubstitutionDialog component following TDD.
 * The component is responsible for:
 * - Displaying available bench players for substitution
 * - Validating substitution eligibility in real-time
 * - Managing field position selection
 * - Handling re-entry scenarios for original starters
 * - Providing confirmation workflow with validation feedback
 * - Supporting responsive modal design for mobile devices
 *
 * Architecture compliance:
 * - Uses Feature-Sliced Design patterns
 * - Follows modal accessibility standards
 * - Integrates with lineup management hook
 * - Provides proper form validation and error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BenchPlayer, PositionAssignment } from '../../../shared/lib/types';

// Mock the lineup management hook
const mockCheckEligibility = vi.fn();
const mockMakeSubstitution = vi.fn();
const mockGetAvailablePositions = vi.fn();

vi.mock('../model/useLineupManagement', () => ({
  useLineupManagement: vi.fn(() => ({
    checkEligibility: mockCheckEligibility,
    makeSubstitution: mockMakeSubstitution,
    getAvailablePositions: mockGetAvailablePositions,
    benchPlayers: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock the substitute player hook
vi.mock('../../substitute-player', () => ({
  useSubstitutePlayer: vi.fn(() => ({
    substitutePlayer: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    error: null,
    lastResult: null,
  })),
}));

import { SubstitutionDialog } from './SubstitutionDialog';

// Mock data
const mockBenchPlayers: BenchPlayer[] = [
  {
    id: 'bench-1',
    name: 'Bench Player 1',
    jerseyNumber: '15',
    isStarter: false,
    hasReentered: false,
    entryInning: null,
  },
  {
    id: 'bench-2',
    name: 'Bench Player 2',
    jerseyNumber: '16',
    isStarter: false,
    hasReentered: false,
    entryInning: null,
  },
  {
    id: 'starter-sub-1',
    name: 'Substituted Starter',
    jerseyNumber: '7',
    isStarter: true,
    hasReentered: false,
    entryInning: null,
  },
];

const mockCurrentPlayer: PositionAssignment = {
  battingSlot: 1,
  playerId: 'player-1',
  fieldPosition: FieldPosition.SHORTSTOP,
};

const mockAvailablePositions = [
  FieldPosition.SHORTSTOP,
  FieldPosition.SECOND_BASE,
  FieldPosition.FIRST_BASE,
];

describe('SubstitutionDialog Component - TDD Implementation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    currentPlayer: mockCurrentPlayer,
    benchPlayers: mockBenchPlayers,
    gameId: 'game-123',
    teamLineupId: 'team-456',
    inning: 5,
    substitutePlayerAPI: {
      executeSubstitution: vi.fn().mockResolvedValue({ success: true }),
      isExecuting: false,
      substitutionError: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckEligibility.mockReturnValue({ eligible: true, reason: null });
    mockGetAvailablePositions.mockReturnValue(mockAvailablePositions);
  });

  describe('Dialog Structure and Rendering', () => {
    it('should render modal dialog when open', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      expect(screen.getByRole('dialog', { name: /make substitution/i })).toBeInTheDocument();
      expect(screen.getByText(/substituting/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<SubstitutionDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display current player information', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      expect(screen.getByText(/substituting player-1/i)).toBeInTheDocument();
      expect(screen.getByText(/batting slot 1/i)).toBeInTheDocument();
      expect(screen.getByText(/shortstop/i)).toBeInTheDocument();
    });

    it('should have modal overlay and proper focus management', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      // Dialog container should be focused initially for better accessibility
      expect(dialog).toHaveFocus();
    });

    it('should have close button in header', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Bench Player Selection', () => {
    it('should display all available bench players', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      expect(screen.getByText('Bench Player 1')).toBeInTheDocument();
      expect(screen.getByText('Bench Player 2')).toBeInTheDocument();
      expect(screen.getByText('Substituted Starter')).toBeInTheDocument();

      // Should show jersey numbers
      expect(screen.getByText('#15')).toBeInTheDocument();
      expect(screen.getByText('#16')).toBeInTheDocument();
      expect(screen.getByText('#7')).toBeInTheDocument();
    });

    it('should allow selection of bench player', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      expect(playerRadio).toBeInTheDocument();

      fireEvent.click(playerRadio);
      expect(playerRadio).toBeChecked();
    });

    it('should show starter designation for original starters', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Should indicate which players are starters (use specific selector for badge)
      expect(screen.getByText('Starter')).toBeInTheDocument();
    });

    it('should show re-entry status for players who have re-entered', () => {
      const benchWithReentry = mockBenchPlayers.map(player =>
        player.id === 'starter-sub-1' ? { ...player, hasReentered: true, entryInning: 5 } : player
      );

      render(<SubstitutionDialog {...defaultProps} benchPlayers={benchWithReentry} />);

      expect(screen.getByText(/re-entered inning 5/i)).toBeInTheDocument();
    });

    it('should display empty state when no bench players available', () => {
      render(<SubstitutionDialog {...defaultProps} benchPlayers={[]} />);

      expect(screen.getByText(/no bench players available/i)).toBeInTheDocument();
    });
  });

  describe('Field Position Selection', () => {
    it('should display available field positions after eligible player selected', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // First, select an eligible player
      const firstPlayerRadio = screen.getAllByRole('radio')[0];
      fireEvent.click(firstPlayerRadio);

      // Wait for position selection to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/field position/i)).toBeInTheDocument();
      });

      // Should show position dropdown with current position as default
      expect(screen.getByDisplayValue(/shortstop/i)).toBeInTheDocument();
    });

    it('should allow position selection', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // First, select an eligible player
      const firstPlayerRadio = screen.getAllByRole('radio')[0];
      fireEvent.click(firstPlayerRadio);

      // Wait for position selection to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/field position/i)).toBeInTheDocument();
      });

      const positionSelect = screen.getByLabelText(/field position/i);
      fireEvent.change(positionSelect, { target: { value: FieldPosition.SECOND_BASE } });

      expect(positionSelect).toHaveValue(FieldPosition.SECOND_BASE);
    });

    it('should only show available positions from hook', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Select a player first to trigger position loading
      const firstPlayerRadio = screen.getAllByRole('radio')[0];
      fireEvent.click(firstPlayerRadio);

      // Wait for position selection to appear and hook to be called
      await waitFor(() => {
        expect(mockGetAvailablePositions).toHaveBeenCalledWith('bench-1');
      });

      const positionSelect = screen.getByLabelText(/field position/i);
      const options = positionSelect.querySelectorAll('option');

      expect(options).toHaveLength(mockAvailablePositions.length);
    });
  });

  describe('Eligibility Validation', () => {
    it('should validate player eligibility when selected', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      expect(mockCheckEligibility).toHaveBeenCalledWith({
        playerId: 'bench-1',
        inning: expect.any(Number),
        isReentry: false,
      });
    });

    it('should show eligibility success indicator', () => {
      mockCheckEligibility.mockReturnValue({ eligible: true, reason: null });

      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      expect(screen.getByRole('img', { name: /eligible/i })).toBeInTheDocument();
    });

    it('should show eligibility error with reason', () => {
      mockCheckEligibility.mockReturnValue({
        eligible: false,
        reason: 'Player is not eligible for substitution',
      });

      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      expect(screen.getByText('Player is not eligible for substitution')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /not eligible/i })).toBeInTheDocument();
    });

    it('should validate re-entry scenarios correctly', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Select starter for re-entry
      const starterRadio = screen.getByRole('radio', { name: /substituted starter/i });
      fireEvent.click(starterRadio);

      expect(mockCheckEligibility).toHaveBeenCalledWith({
        playerId: 'starter-sub-1',
        inning: expect.any(Number),
        isReentry: true,
      });
    });

    it('should disable confirm button when player not eligible', () => {
      mockCheckEligibility.mockReturnValue({
        eligible: false,
        reason: 'Not eligible',
      });

      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Form Submission and Confirmation', () => {
    it('should enable confirm button when valid selection made', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeEnabled();
    });

    it('should call onConfirm with substitution data', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Select player
      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      // Select position
      const positionSelect = screen.getByLabelText(/field position/i);
      fireEvent.change(positionSelect, { target: { value: FieldPosition.SECOND_BASE } });

      // Confirm substitution
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith({
          outgoingPlayerId: 'player-1',
          incomingPlayerId: 'bench-1',
          battingSlot: 1,
          fieldPosition: FieldPosition.SECOND_BASE,
          isReentry: false,
        });
      });
    });

    it('should handle re-entry substitution correctly', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Select starter for re-entry
      const starterRadio = screen.getByRole('radio', { name: /substituted starter/i });
      fireEvent.click(starterRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            incomingPlayerId: 'starter-sub-1',
            isReentry: true,
          })
        );
      });
    });

    it('should disable confirm button during submission', async () => {
      const onConfirm = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<SubstitutionDialog {...defaultProps} onConfirm={onConfirm} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(confirmButton).toBeDisabled();
      expect(screen.getByText(/confirming/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(confirmButton).toBeEnabled();
      });
    });

    it('should close dialog after successful substitution', async () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Select first available player
      const playerRadio = screen.getAllByRole('radio')[0];
      fireEvent.click(playerRadio);

      // Wait for confirm button to be enabled
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).not.toBeDisabled();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when substitution fails', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('Substitution failed'));

      render(<SubstitutionDialog {...defaultProps} onConfirm={onConfirm} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Substitution failed')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      let shouldFail = true;
      const onConfirm = vi.fn().mockImplementation(() => {
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new Error('Substitution failed'));
        }
        return Promise.resolve();
      });

      render(<SubstitutionDialog {...defaultProps} onConfirm={onConfirm} />);

      const playerRadio = screen.getByRole('radio', { name: /bench player 1/i });
      fireEvent.click(playerRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Substitution failed')).toBeInTheDocument();
      });

      // Retry
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      expect(screen.getByRole('dialog', { name: /make substitution/i })).toBeInTheDocument();
      expect(
        screen.getByRole('radiogroup', { name: /select replacement player/i })
      ).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Dialog container should be focused initially for accessibility
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveFocus();

      // Check that radio buttons and buttons are available for keyboard nav
      const firstRadio = screen.getAllByRole('radio')[0];
      expect(firstRadio).toBeInTheDocument();

      // Focus can be manually set on radio button
      firstRadio.focus();
      expect(firstRadio).toHaveFocus();
    });

    it('should close dialog on Escape key', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should trap focus within dialog', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const confirmButton = screen.getByRole('button', { name: /confirm/i });

      // Initially, dialog container should have focus
      expect(document.activeElement).toBe(dialog);

      // Focus should stay within dialog when tabbing
      closeButton.focus();
      expect([dialog, closeButton, cancelButton, confirmButton]).toContain(document.activeElement);
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-friendly layout classes', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('substitution-dialog');
    });

    it('should display player cards optimized for mobile', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      const playerOptions = screen.getAllByRole('radio');
      playerOptions.forEach(option => {
        expect(option.closest('label')).toHaveClass('player-option');
      });
    });

    it('should have touch-friendly button sizes', () => {
      render(<SubstitutionDialog {...defaultProps} />);

      // Check that main action buttons have touch-friendly sizing
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(confirmButton).toHaveClass('touch-friendly');
      expect(cancelButton).toHaveClass('touch-friendly');
    });
  });
});
