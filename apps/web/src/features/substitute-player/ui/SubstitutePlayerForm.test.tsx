/**
 * @file SubstitutePlayerForm Test Suite
 *
 * Comprehensive test coverage for the SubstitutePlayerForm component following TDD principles.
 * Tests form functionality, validation, user interactions, and integration with the useSubstitutePlayer hook.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SubstitutePlayerResult } from '../model/useSubstitutePlayer';

import { SubstitutePlayerForm } from './SubstitutePlayerForm';
import type { SubstitutePlayerFormProps } from './SubstitutePlayerForm';

// Mock the useSubstitutePlayer hook
const mockSubstitutePlayer = vi.fn();
const mockUseSubstitutePlayer = vi.fn();

vi.mock('../model/useSubstitutePlayer', (): { useSubstitutePlayer: () => unknown } => ({
  useSubstitutePlayer: (): unknown => mockUseSubstitutePlayer(),
}));

describe('SubstitutePlayerForm', () => {
  const defaultProps: SubstitutePlayerFormProps = {
    gameId: 'game-123',
    teamLineupId: 'team-456',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementation
    mockUseSubstitutePlayer.mockReturnValue({
      substitutePlayer: mockSubstitutePlayer,
      isLoading: false,
      error: null,
    });
  });

  describe('Form Rendering', () => {
    it('renders all form fields with correct labels', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.getByLabelText(/batting slot/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/inning/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/outgoing player id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incoming player id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incoming player name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jersey number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/field position/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/re-entry substitution/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders submit button with correct initial text', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /execute substitution/i })).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <SubstitutePlayerForm {...defaultProps} className="custom-form-class" />
      );

      expect(container.querySelector('.substitute-player-form')).toHaveClass('custom-form-class');
    });

    it('renders all field position options', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const positionSelect = screen.getByLabelText(/field position/i);
      const positionOptions = Array.from(positionSelect.querySelectorAll('option'));

      expect(positionOptions).toHaveLength(Object.values(FieldPosition).length);

      // Check that all positions are present as options
      Object.values(FieldPosition).forEach(position => {
        expect(positionSelect.querySelector(`option[value="${position}"]`)).toBeInTheDocument();
      });
    });
  });

  describe('Form Initialization', () => {
    it('initializes form with correct default values', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.getByLabelText(/batting slot/i)).toHaveValue(1);
      expect(screen.getByLabelText(/inning/i)).toHaveValue(1);
      expect(screen.getByDisplayValue(FieldPosition.PITCHER)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('clears form after successful submission', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      render(<SubstitutePlayerForm {...defaultProps} />);

      // Fill out form
      fireEvent.change(screen.getByLabelText(/outgoing player id/i), {
        target: { value: 'player-1' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player id/i), {
        target: { value: 'player-2' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/jersey number/i), {
        target: { value: '99' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(mockSubstitutePlayer).toHaveBeenCalled();
      });

      // Verify form is cleared
      expect(screen.getByLabelText(/outgoing player id/i)).toHaveValue('');
      expect(screen.getByLabelText(/incoming player id/i)).toHaveValue('');
      expect(screen.getByLabelText(/incoming player name/i)).toHaveValue('');
      expect(screen.getByLabelText(/jersey number/i)).toHaveValue('');
    });
  });

  describe('Form Input Handling', () => {
    it('handles text input changes correctly', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const outgoingPlayerInput = screen.getByLabelText(/outgoing player id/i);
      fireEvent.change(outgoingPlayerInput, { target: { value: 'player-123' } });

      expect(outgoingPlayerInput).toHaveValue('player-123');
    });

    it('handles number input changes correctly', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const battingSlotInput = screen.getByLabelText(/batting slot/i);
      fireEvent.change(battingSlotInput, { target: { value: '5' } });

      expect(battingSlotInput).toHaveValue(5);
    });

    it('handles select input changes correctly', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const positionSelect = screen.getByLabelText(/field position/i);
      fireEvent.change(positionSelect, { target: { value: FieldPosition.CATCHER } });

      expect(positionSelect).toHaveValue(FieldPosition.CATCHER);
    });

    it('handles checkbox input changes correctly', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const reentryCheckbox = screen.getByLabelText(/re-entry substitution/i);
      fireEvent.click(reentryCheckbox);

      expect(reentryCheckbox).toBeChecked();

      fireEvent.click(reentryCheckbox);
      expect(reentryCheckbox).not.toBeChecked();
    });

    it('validates numeric inputs are within expected ranges', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const battingSlotInput = screen.getByLabelText(/batting slot/i);
      expect(battingSlotInput.min).toBe('1');
      expect(battingSlotInput.max).toBe('30');

      const inningInput = screen.getByLabelText(/inning/i);
      expect(inningInput.min).toBe('1');
    });
  });

  describe('Form Submission', () => {
    const completeFormData = {
      outgoingPlayerId: 'player-1',
      incomingPlayerId: 'player-2',
      incomingPlayerName: 'John Doe',
      jerseyNumber: '99',
      battingSlot: '3',
      inning: '5',
      notes: 'Injury substitution',
    };

    const fillForm = (): void => {
      fireEvent.change(screen.getByLabelText(/outgoing player id/i), {
        target: { value: completeFormData.outgoingPlayerId },
      });
      fireEvent.change(screen.getByLabelText(/incoming player id/i), {
        target: { value: completeFormData.incomingPlayerId },
      });
      fireEvent.change(screen.getByLabelText(/incoming player name/i), {
        target: { value: completeFormData.incomingPlayerName },
      });
      fireEvent.change(screen.getByLabelText(/jersey number/i), {
        target: { value: completeFormData.jerseyNumber },
      });
      fireEvent.change(screen.getByLabelText(/batting slot/i), {
        target: { value: completeFormData.battingSlot },
      });
      fireEvent.change(screen.getByLabelText(/inning/i), {
        target: { value: completeFormData.inning },
      });
      fireEvent.change(screen.getByLabelText(/notes/i), {
        target: { value: completeFormData.notes },
      });
    };

    it('calls substitutePlayer with correct data on form submission', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      render(<SubstitutePlayerForm {...defaultProps} />);

      fillForm();

      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(mockSubstitutePlayer).toHaveBeenCalledWith({
          gameId: 'game-123',
          teamLineupId: 'team-456',
          battingSlot: 3,
          outgoingPlayerId: 'player-1',
          incomingPlayer: {
            id: 'player-2',
            name: 'John Doe',
            jerseyNumber: '99',
            position: FieldPosition.PITCHER,
          },
          inning: 5,
          isReentry: false,
          notes: 'Injury substitution',
        });
      });
    });

    it('calls onSuccess callback on successful substitution', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: true,
        reentryUsed: false,
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Jane Smith',
          battingSlot: 3,
        },
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      const onSuccess = vi.fn();
      render(<SubstitutePlayerForm {...defaultProps} onSuccess={onSuccess} />);

      fillForm();
      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockResult);
      });
    });

    it('calls onError callback when substitution fails', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: false,
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player is not eligible for substitution'],
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      const onError = vi.fn();
      render(<SubstitutePlayerForm {...defaultProps} onError={onError} />);

      fillForm();
      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Player is not eligible for substitution');
      });
    });

    it('calls onError callback when substitution throws exception', async () => {
      const error = new Error('Network connection failed');
      mockSubstitutePlayer.mockRejectedValueOnce(error);

      const onError = vi.fn();
      render(<SubstitutePlayerForm {...defaultProps} onError={onError} />);

      fillForm();
      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network connection failed');
      });
    });

    it('handles unknown errors gracefully', async () => {
      mockSubstitutePlayer.mockRejectedValueOnce('Unknown error');

      const onError = vi.fn();
      render(<SubstitutePlayerForm {...defaultProps} onError={onError} />);

      fillForm();
      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Unknown error occurred');
      });
    });

    it('prevents form submission during loading state', () => {
      mockUseSubstitutePlayer.mockReturnValue({
        substitutePlayer: mockSubstitutePlayer,
        isLoading: true,
        error: null,
      });

      render(<SubstitutePlayerForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/executing substitution/i);
    });

    it('excludes notes from submission data when empty', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      render(<SubstitutePlayerForm {...defaultProps} />);

      // Fill form without notes
      fireEvent.change(screen.getByLabelText(/outgoing player id/i), {
        target: { value: 'player-1' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player id/i), {
        target: { value: 'player-2' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/jersey number/i), {
        target: { value: '99' },
      });

      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(mockSubstitutePlayer).toHaveBeenCalledWith(
          expect.not.objectContaining({
            notes: expect.anything(),
          })
        );
      });
    });
  });

  describe('Error Display', () => {
    it('displays error message when hook returns error', () => {
      mockUseSubstitutePlayer.mockReturnValue({
        substitutePlayer: mockSubstitutePlayer,
        isLoading: false,
        error: 'Failed to connect to server',
      });

      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to connect to server/i)).toBeInTheDocument();
    });

    it('does not display error when error is null', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Form Accessibility', () => {
    it('properly associates labels with form controls', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const battingSlotInput = screen.getByLabelText(/batting slot/i);
      expect(battingSlotInput).toHaveAttribute('id', 'batting-slot');

      const inningInput = screen.getByLabelText(/inning/i);
      expect(inningInput).toHaveAttribute('id', 'inning');

      const outgoingPlayerInput = screen.getByLabelText(/outgoing player id/i);
      expect(outgoingPlayerInput).toHaveAttribute('id', 'outgoing-player');
    });

    it('marks required fields appropriately', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      expect(screen.getByLabelText(/batting slot/i)).toBeRequired();
      expect(screen.getByLabelText(/inning/i)).toBeRequired();
      expect(screen.getByLabelText(/outgoing player id/i)).toBeRequired();
      expect(screen.getByLabelText(/incoming player id/i)).toBeRequired();
      expect(screen.getByLabelText(/incoming player name/i)).toBeRequired();
      expect(screen.getByLabelText(/jersey number/i)).toBeRequired();
      expect(screen.getByLabelText(/field position/i)).toBeRequired();

      // Notes should not be required
      expect(screen.getByLabelText(/notes/i)).not.toBeRequired();
    });

    it('provides appropriate placeholder text for optional fields', () => {
      render(<SubstitutePlayerForm {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveAttribute('placeholder', 'Additional notes about the substitution');
    });
  });

  describe('Component Props', () => {
    it('handles missing optional callbacks gracefully', async () => {
      const mockResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockResult);

      render(
        <SubstitutePlayerForm
          gameId="game-123"
          teamLineupId="team-456"
          // No onSuccess or onError callbacks
        />
      );

      fireEvent.change(screen.getByLabelText(/outgoing player id/i), {
        target: { value: 'player-1' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player id/i), {
        target: { value: 'player-2' },
      });
      fireEvent.change(screen.getByLabelText(/incoming player name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/jersey number/i), {
        target: { value: '99' },
      });

      fireEvent.click(screen.getByRole('button', { name: /execute substitution/i }));

      await waitFor(() => {
        expect(mockSubstitutePlayer).toHaveBeenCalled();
      });

      // Should not throw errors
    });
  });
});
