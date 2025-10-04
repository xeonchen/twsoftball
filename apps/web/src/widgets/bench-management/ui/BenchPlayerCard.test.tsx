/**
 * @file BenchPlayerCard Test Suite
 *
 * Tests for individual bench player card component, including status indicators,
 * eligibility display, and quick action buttons.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BenchPlayer } from '../../../shared/lib';

import { BenchPlayerCard } from './BenchPlayerCard';
import type { BenchPlayerCardProps, PlayerEligibility } from './BenchPlayerCard';

describe('BenchPlayerCard', () => {
  const mockPlayer: BenchPlayer = {
    id: 'player-1',
    name: 'John Doe',
    jerseyNumber: '12',
    isStarter: true,
    hasReentered: false,
    entryInning: null,
    position: FieldPosition.PITCHER,
  };

  const mockEligibility: PlayerEligibility = {
    canSubstitute: true,
    canReenter: false,
    restrictions: [],
  };

  const defaultProps: BenchPlayerCardProps = {
    player: mockPlayer,
    eligibility: mockEligibility,
    onQuickSubstitution: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Player Information Display', () => {
    it('displays player name and jersey number', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('#12')).toBeInTheDocument();
    });

    it('displays current field position for active players', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      expect(screen.getByText('P')).toBeInTheDocument(); // Pitcher abbreviation
    });

    it('displays no position for bench players', () => {
      const benchPlayer = { ...mockPlayer, position: undefined };
      render(<BenchPlayerCard {...defaultProps} player={benchPlayer} />);

      expect(screen.queryByText('P')).not.toBeInTheDocument();
    });
  });

  describe('Player Status Indicators', () => {
    it('displays starter status correctly', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      expect(screen.getByText(/starter/i)).toBeInTheDocument();
      expect(screen.queryByText(/sub \(inning/i)).not.toBeInTheDocument();
    });

    it('displays substitute status with entry inning', () => {
      const substitutePlayer = {
        ...mockPlayer,
        isStarter: false,
        entryInning: 3,
      };

      render(<BenchPlayerCard {...defaultProps} player={substitutePlayer} />);

      expect(screen.getByText(/sub \(inning 3\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/^starter$/i)).not.toBeInTheDocument();
    });

    it('displays re-entry status correctly', () => {
      const reenteredPlayer = {
        ...mockPlayer,
        hasReentered: true,
        entryInning: 5,
      };

      render(<BenchPlayerCard {...defaultProps} player={reenteredPlayer} />);

      expect(screen.getByText(/re-entered \(inning 5\)/i)).toBeInTheDocument();
    });

    it('shows appropriate status badge colors', () => {
      const { rerender } = render(<BenchPlayerCard {...defaultProps} />);

      // Starter should have primary color
      expect(screen.getByText(/starter/i)).toHaveClass('bg-blue-100');

      // Substitute should have secondary color
      const substitutePlayer = {
        ...mockPlayer,
        isStarter: false,
        entryInning: 3,
      };
      rerender(<BenchPlayerCard {...defaultProps} player={substitutePlayer} />);
      expect(screen.getByText(/sub \(inning 3\)/i)).toHaveClass('bg-green-100');

      // Re-entered should have warning color
      const reenteredPlayer = {
        ...mockPlayer,
        hasReentered: true,
        entryInning: 5,
      };
      rerender(<BenchPlayerCard {...defaultProps} player={reenteredPlayer} />);
      expect(screen.getByText(/re-entered/i)).toHaveClass('bg-orange-100');
    });
  });

  describe('Eligibility Status Display', () => {
    it('shows available status for eligible players', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      expect(screen.getByText(/available/i)).toBeInTheDocument();
      expect(screen.getByText(/available/i)).toHaveClass('text-green-700');
    });

    it('shows ineligible status with restrictions', () => {
      const ineligibleEligibility = {
        canSubstitute: false,
        canReenter: false,
        restrictions: ['Player has already re-entered'],
      };

      render(<BenchPlayerCard {...defaultProps} eligibility={ineligibleEligibility} />);

      expect(screen.getByText(/ineligible/i)).toBeInTheDocument();
      expect(screen.getByText(/ineligible/i)).toHaveClass('text-red-700');
    });

    it('shows re-entry available status', () => {
      const reentryEligibility = {
        canSubstitute: true,
        canReenter: true,
        restrictions: [],
      };

      render(<BenchPlayerCard {...defaultProps} eligibility={reentryEligibility} />);

      expect(screen.getByText(/re-entry available/i)).toBeInTheDocument();
      expect(screen.getByText(/re-entry available/i)).toHaveClass('text-blue-700');
    });

    it('displays restriction tooltips on hover', () => {
      const restrictedEligibility = {
        canSubstitute: false,
        canReenter: false,
        restrictions: ['Player has already re-entered', 'Inning limit reached'],
      };

      render(<BenchPlayerCard {...defaultProps} eligibility={restrictedEligibility} />);

      const eligibilityStatus = screen.getByText(/ineligible/i);
      expect(eligibilityStatus).toHaveAttribute(
        'title',
        'Player has already re-entered; Inning limit reached'
      );
    });
  });

  describe('Quick Substitution Actions', () => {
    it('displays quick substitution button for eligible players', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      const quickSubButton = screen.getByRole('button', { name: /quick substitute john doe/i });
      expect(quickSubButton).toBeInTheDocument();
      expect(quickSubButton).toBeEnabled();
    });

    it('disables quick substitution button for ineligible players', () => {
      const ineligibleEligibility = {
        canSubstitute: false,
        canReenter: false,
        restrictions: ['Player has already re-entered'],
      };

      render(<BenchPlayerCard {...defaultProps} eligibility={ineligibleEligibility} />);

      const quickSubButton = screen.getByRole('button', { name: /quick substitute john doe/i });
      expect(quickSubButton).toBeDisabled();
    });

    it('calls onQuickSubstitution when button is clicked', () => {
      const onQuickSubstitution = vi.fn();

      render(<BenchPlayerCard {...defaultProps} onQuickSubstitution={onQuickSubstitution} />);

      const quickSubButton = screen.getByRole('button', { name: /quick substitute john doe/i });
      fireEvent.click(quickSubButton);

      expect(onQuickSubstitution).toHaveBeenCalledWith('player-1');
    });

    it('handles keyboard activation of quick substitution', () => {
      const onQuickSubstitution = vi.fn();

      render(<BenchPlayerCard {...defaultProps} onQuickSubstitution={onQuickSubstitution} />);

      const quickSubButton = screen.getByRole('button', { name: /quick substitute john doe/i });

      fireEvent.keyDown(quickSubButton, { key: 'Enter' });
      expect(onQuickSubstitution).toHaveBeenCalledWith('player-1');

      fireEvent.keyDown(quickSubButton, { key: ' ' });
      expect(onQuickSubstitution).toHaveBeenCalledTimes(2);
    });

    it('disables all actions when card is disabled', () => {
      render(<BenchPlayerCard {...defaultProps} disabled={true} />);

      const quickSubButton = screen.getByRole('button', { name: /quick substitute john doe/i });
      expect(quickSubButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      // Card should be a listitem
      expect(screen.getByRole('listitem')).toBeInTheDocument();

      // Button should have descriptive aria-label
      const quickSubButton = screen.getByRole('button');
      expect(quickSubButton).toHaveAttribute('aria-label', 'Quick substitute John Doe');

      // Status elements should be properly labeled
      expect(screen.getByText(/starter/i)).toHaveAttribute('aria-label', 'Player status: Starter');
      expect(screen.getByText(/available/i)).toHaveAttribute(
        'aria-label',
        'Eligibility: Available for substitution'
      );
    });

    it('supports screen reader navigation', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      const card = screen.getByRole('listitem');
      expect(card).toHaveAttribute('aria-labelledby');

      const playerName = screen.getByText('John Doe');
      expect(playerName).toHaveAttribute('id');
    });

    it('provides appropriate focus management', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      const quickSubButton = screen.getByRole('button');
      expect(quickSubButton).toHaveAttribute('tabIndex', '0');

      quickSubButton.focus();
      expect(quickSubButton).toHaveFocus();
    });
  });

  describe('Visual States', () => {
    it('applies hover states correctly', () => {
      render(<BenchPlayerCard {...defaultProps} />);

      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('hover:shadow-md');
    });

    it('applies disabled state styling', () => {
      render(<BenchPlayerCard {...defaultProps} disabled={true} />);

      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('opacity-60');
    });

    it('shows loading state when substitution is in progress', () => {
      render(<BenchPlayerCard {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('status', { name: /processing substitution/i })).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Button should not be present during loading state
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <BenchPlayerCard {...defaultProps} className="custom-player-card" />
      );

      expect(container.firstChild).toHaveClass('custom-player-card');
    });

    it('maintains base styling with custom className', () => {
      const { container } = render(<BenchPlayerCard {...defaultProps} className="custom-class" />);

      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('p-4'); // Base styling should be preserved
    });
  });
});
