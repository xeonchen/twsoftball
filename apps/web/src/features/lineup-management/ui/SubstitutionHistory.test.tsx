/**
 * @file SubstitutionHistory Component Tests
 *
 * Comprehensive test suite for SubstitutionHistory component covering:
 * - Empty state rendering
 * - Substitution list display
 * - Sorting by inning and timestamp
 * - Invalid data filtering
 * - Player click callbacks
 * - Re-entry badge display
 * - History summary calculation
 * - Time formatting
 * - Accessibility attributes
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import type { SubstitutionRecord } from '../../../shared/lib/types';

import { SubstitutionHistory, SubstitutionHistoryEmpty } from './SubstitutionHistory';

describe('SubstitutionHistory', () => {
  describe('Empty State', () => {
    it('renders empty state when no substitutions provided', () => {
      render(<SubstitutionHistory gameId="game-123" substitutions={[]} />);

      const emptyState = screen.getByTestId('substitution-history-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('No substitutions made')).toBeInTheDocument();
      expect(
        screen.getByText('Substitutions will appear here as they are made during the game.')
      ).toBeInTheDocument();
    });

    it('renders empty state with proper ARIA labels', () => {
      render(<SubstitutionHistory gameId="game-123" />);

      const emptyState = screen.getByTestId('substitution-history-empty');
      expect(emptyState).toHaveAttribute('role', 'region');
      expect(emptyState).toHaveAttribute('aria-label', 'Substitution history');
    });

    it('applies custom className to empty state', () => {
      render(<SubstitutionHistory gameId="game-123" substitutions={[]} className="custom-class" />);

      const emptyState = screen.getByTestId('substitution-history-empty');
      expect(emptyState).toHaveClass('substitution-history', 'empty', 'custom-class');
    });
  });

  describe('Substitution List Rendering', () => {
    const mockSubstitutions: SubstitutionRecord[] = [
      {
        inning: 3,
        battingSlot: 5,
        outgoingPlayer: { playerId: 'player-1', name: 'John Doe' },
        incomingPlayer: { playerId: 'player-2', name: 'Jane Smith' },
        timestamp: new Date('2024-01-15T14:30:00'),
        isReentry: false,
      },
      {
        inning: 5,
        battingSlot: 2,
        outgoingPlayer: { playerId: 'player-3', name: 'Mike Johnson' },
        incomingPlayer: { playerId: 'player-1', name: 'John Doe' },
        timestamp: new Date('2024-01-15T15:00:00'),
        isReentry: true,
      },
    ];

    it('renders substitution list with data', () => {
      render(<SubstitutionHistory gameId="game-123" substitutions={mockSubstitutions} />);

      const historyContainer = screen.getByTestId('substitution-history');
      expect(historyContainer).toBeInTheDocument();
      expect(historyContainer).toHaveAttribute('role', 'region');
      expect(historyContainer).toHaveAttribute('aria-label', 'Substitution history');

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(2);
    });

    it('displays substitution details correctly', () => {
      render(<SubstitutionHistory gameId="game-123" substitutions={mockSubstitutions} />);

      const records = screen.getAllByTestId('substitution-record');

      // Check first substitution (Inning 3)
      const firstRecord = records[0];
      expect(within(firstRecord).getByText('Inning 3')).toBeInTheDocument();
      expect(within(firstRecord).getByText('#5')).toBeInTheDocument();
      expect(within(firstRecord).getByLabelText('View details for John Doe')).toBeInTheDocument();
      expect(within(firstRecord).getByLabelText('View details for Jane Smith')).toBeInTheDocument();

      // Check second substitution (Inning 5)
      const secondRecord = records[1];
      expect(within(secondRecord).getByText('Inning 5')).toBeInTheDocument();
      expect(within(secondRecord).getByText('#2')).toBeInTheDocument();
      expect(
        within(secondRecord).getByLabelText('View details for Mike Johnson')
      ).toBeInTheDocument();
      expect(within(secondRecord).getByLabelText('View details for John Doe')).toBeInTheDocument();
    });

    it('applies custom className to history container', () => {
      render(
        <SubstitutionHistory
          gameId="game-123"
          substitutions={mockSubstitutions}
          className="custom-history"
        />
      );

      const historyContainer = screen.getByTestId('substitution-history');
      expect(historyContainer).toHaveClass('substitution-history', 'custom-history');
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts substitutions by inning ascending', () => {
      const unorderedSubs: SubstitutionRecord[] = [
        {
          inning: 5,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Player 1' },
          incomingPlayer: { playerId: 'p2', name: 'Player 2' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 2,
          battingSlot: 3,
          outgoingPlayer: { playerId: 'p3', name: 'Player 3' },
          incomingPlayer: { playerId: 'p4', name: 'Player 4' },
          timestamp: new Date('2024-01-15T13:00:00'),
          isReentry: false,
        },
        {
          inning: 7,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p5', name: 'Player 5' },
          incomingPlayer: { playerId: 'p6', name: 'Player 6' },
          timestamp: new Date('2024-01-15T15:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={unorderedSubs} />);

      const records = screen.getAllByTestId('substitution-record');
      const inningLabels = records.map(
        record => within(record).getByText(/Inning \d+/).textContent
      );

      expect(inningLabels).toEqual(['Inning 2', 'Inning 5', 'Inning 7']);
    });

    it('sorts substitutions by timestamp within same inning', () => {
      const sameInningSubs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 5,
          outgoingPlayer: { playerId: 'p1', name: 'First Sub' },
          incomingPlayer: { playerId: 'p2', name: 'Second Sub' },
          timestamp: new Date('2024-01-15T14:30:00'),
          isReentry: false,
        },
        {
          inning: 3,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'Third Sub' },
          incomingPlayer: { playerId: 'p4', name: 'Fourth Sub' },
          timestamp: new Date('2024-01-15T14:15:00'), // Earlier time
          isReentry: false,
        },
        {
          inning: 3,
          battingSlot: 7,
          outgoingPlayer: { playerId: 'p5', name: 'Fifth Sub' },
          incomingPlayer: { playerId: 'p6', name: 'Sixth Sub' },
          timestamp: new Date('2024-01-15T14:45:00'), // Latest time
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={sameInningSubs} />);

      const records = screen.getAllByTestId('substitution-record');
      const playerNames = records.map(
        record => within(record).getAllByRole('button')[0].textContent
      );

      // All in inning 3, sorted by timestamp
      expect(playerNames).toEqual(['Third Sub', 'First Sub', 'Fifth Sub']);
    });
  });

  describe('Invalid Data Filtering', () => {
    it('filters out substitutions with null inning', () => {
      const subsWithNull: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Valid Player' },
          incomingPlayer: { playerId: 'p2', name: 'Valid Sub' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        // @ts-expect-error Testing invalid data
        {
          inning: null,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'Invalid Player' },
          incomingPlayer: { playerId: 'p4', name: 'Invalid Sub' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subsWithNull} />);

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(1);
      expect(screen.getByText('Valid Player')).toBeInTheDocument();
      expect(screen.queryByText('Invalid Player')).not.toBeInTheDocument();
    });

    it('filters out substitutions with invalid timestamp', () => {
      const subsWithInvalidDate: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Valid Player' },
          incomingPlayer: { playerId: 'p2', name: 'Valid Sub' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 4,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'Invalid Date Player' },
          incomingPlayer: { playerId: 'p4', name: 'Invalid Date Sub' },
          timestamp: new Date('invalid-date'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subsWithInvalidDate} />);

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(1);
      expect(screen.getByText('Valid Player')).toBeInTheDocument();
      expect(screen.queryByText('Invalid Date Player')).not.toBeInTheDocument();
    });

    it('filters out substitutions with undefined inning', () => {
      const subsWithUndefined: SubstitutionRecord[] = [
        {
          inning: 5,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Good Player' },
          incomingPlayer: { playerId: 'p2', name: 'Good Sub' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        // @ts-expect-error Testing invalid data
        {
          inning: undefined,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'Bad Player' },
          incomingPlayer: { playerId: 'p4', name: 'Bad Sub' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subsWithUndefined} />);

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(1);
      expect(screen.getByText('Good Player')).toBeInTheDocument();
      expect(screen.queryByText('Bad Player')).not.toBeInTheDocument();
    });
  });

  describe('Player Click Callbacks', () => {
    const mockSubstitution: SubstitutionRecord = {
      inning: 3,
      battingSlot: 5,
      outgoingPlayer: { playerId: 'player-1', name: 'Outgoing Player' },
      incomingPlayer: { playerId: 'player-2', name: 'Incoming Player' },
      timestamp: new Date('2024-01-15T14:30:00'),
      isReentry: false,
    };

    it('calls onPlayerClick with outgoing player ID when clicked', async () => {
      const user = userEvent.setup();
      const handlePlayerClick = vi.fn();

      render(
        <SubstitutionHistory
          gameId="game-123"
          substitutions={[mockSubstitution]}
          onPlayerClick={handlePlayerClick}
        />
      );

      const outgoingButton = screen.getByLabelText('View details for Outgoing Player');
      await user.click(outgoingButton);

      expect(handlePlayerClick).toHaveBeenCalledWith('player-1');
      expect(handlePlayerClick).toHaveBeenCalledTimes(1);
    });

    it('calls onPlayerClick with incoming player ID when clicked', async () => {
      const user = userEvent.setup();
      const handlePlayerClick = vi.fn();

      render(
        <SubstitutionHistory
          gameId="game-123"
          substitutions={[mockSubstitution]}
          onPlayerClick={handlePlayerClick}
        />
      );

      const incomingButton = screen.getByLabelText('View details for Incoming Player');
      await user.click(incomingButton);

      expect(handlePlayerClick).toHaveBeenCalledWith('player-2');
      expect(handlePlayerClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onPlayerClick is undefined', async () => {
      const user = userEvent.setup();

      render(<SubstitutionHistory gameId="game-123" substitutions={[mockSubstitution]} />);

      const outgoingButton = screen.getByLabelText('View details for Outgoing Player');
      await expect(user.click(outgoingButton)).resolves.not.toThrow();
    });

    it('includes proper ARIA labels for player buttons', () => {
      render(<SubstitutionHistory gameId="game-123" substitutions={[mockSubstitution]} />);

      const outgoingButton = screen.getByLabelText('View details for Outgoing Player');
      const incomingButton = screen.getByLabelText('View details for Incoming Player');

      expect(outgoingButton).toBeInTheDocument();
      expect(incomingButton).toBeInTheDocument();
      expect(outgoingButton).toHaveAttribute('type', 'button');
      expect(incomingButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Re-entry Badge Display', () => {
    it('displays re-entry badge for re-entry substitutions', () => {
      const reentrySub: SubstitutionRecord = {
        inning: 5,
        battingSlot: 3,
        outgoingPlayer: { playerId: 'p1', name: 'Player 1' },
        incomingPlayer: { playerId: 'p2', name: 'Player 2' },
        timestamp: new Date('2024-01-15T14:30:00'),
        isReentry: true,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[reentrySub]} />);

      const badge = screen.getByLabelText('Re-entry');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('(Re-entry)');
      expect(badge).toHaveClass('reentry-badge');
    });

    it('does not display re-entry badge for first-time substitutions', () => {
      const firstTimeSub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 2,
        outgoingPlayer: { playerId: 'p1', name: 'Player 1' },
        incomingPlayer: { playerId: 'p2', name: 'Player 2' },
        timestamp: new Date('2024-01-15T14:30:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[firstTimeSub]} />);

      const badge = screen.queryByLabelText('Re-entry');
      expect(badge).not.toBeInTheDocument();
    });

    it('applies correct CSS class for re-entry records', () => {
      const reentrySub: SubstitutionRecord = {
        inning: 5,
        battingSlot: 3,
        outgoingPlayer: { playerId: 'p1', name: 'Player 1' },
        incomingPlayer: { playerId: 'p2', name: 'Player 2' },
        timestamp: new Date('2024-01-15T14:30:00'),
        isReentry: true,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[reentrySub]} />);

      const record = screen.getByTestId('substitution-record');
      expect(record).toHaveClass('substitution-record', 'reentry');
    });

    it('applies correct CSS class for first-time records', () => {
      const firstTimeSub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 2,
        outgoingPlayer: { playerId: 'p1', name: 'Player 1' },
        incomingPlayer: { playerId: 'p2', name: 'Player 2' },
        timestamp: new Date('2024-01-15T14:30:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[firstTimeSub]} />);

      const record = screen.getByTestId('substitution-record');
      expect(record).toHaveClass('substitution-record', 'first-time');
    });
  });

  describe('History Summary Calculation', () => {
    it('calculates total substitutions correctly', () => {
      const subs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'P1' },
          incomingPlayer: { playerId: 'p2', name: 'P2' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 4,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'P3' },
          incomingPlayer: { playerId: 'p4', name: 'P4' },
          timestamp: new Date('2024-01-15T14:30:00'),
          isReentry: true,
        },
        {
          inning: 5,
          battingSlot: 3,
          outgoingPlayer: { playerId: 'p5', name: 'P5' },
          incomingPlayer: { playerId: 'p6', name: 'P6' },
          timestamp: new Date('2024-01-15T15:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subs} />);

      expect(screen.getByText(/Total substitutions: 3/)).toBeInTheDocument();
    });

    it('calculates re-entries correctly', () => {
      const subs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'P1' },
          incomingPlayer: { playerId: 'p2', name: 'P2' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 4,
          battingSlot: 2,
          outgoingPlayer: { playerId: 'p3', name: 'P3' },
          incomingPlayer: { playerId: 'p4', name: 'P4' },
          timestamp: new Date('2024-01-15T14:30:00'),
          isReentry: true,
        },
        {
          inning: 5,
          battingSlot: 3,
          outgoingPlayer: { playerId: 'p5', name: 'P5' },
          incomingPlayer: { playerId: 'p6', name: 'P6' },
          timestamp: new Date('2024-01-15T15:00:00'),
          isReentry: true,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subs} />);

      expect(screen.getByText(/Re-entries: 2/)).toBeInTheDocument();
    });

    it('shows zero re-entries when none exist', () => {
      const subs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'P1' },
          incomingPlayer: { playerId: 'p2', name: 'P2' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={subs} />);

      expect(screen.getByText(/Re-entries: 0/)).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats time using toLocaleTimeString with correct options', () => {
      const timestamp = new Date('2024-01-15T14:30:00');
      const sub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 1,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp,
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveAttribute('dateTime', timestamp.toISOString());
      // toLocaleTimeString should format as HH:MM
      expect(timeElement.textContent).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('includes ISO timestamp in dateTime attribute', () => {
      const timestamp = new Date('2024-06-15T09:45:30');
      const sub: SubstitutionRecord = {
        inning: 2,
        battingSlot: 5,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp,
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('dateTime', timestamp.toISOString());
    });
  });

  describe('Accessibility Attributes', () => {
    it('includes proper role and aria-label for history container', () => {
      const sub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 1,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp: new Date('2024-01-15T14:00:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const container = screen.getByTestId('substitution-history');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Substitution history');
    });

    it('hides change arrow from screen readers', () => {
      const sub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 1,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp: new Date('2024-01-15T14:00:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const arrow = screen.getByText('→');
      expect(arrow).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles single substitution correctly', () => {
      const singleSub: SubstitutionRecord[] = [
        {
          inning: 1,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Only Out' },
          incomingPlayer: { playerId: 'p2', name: 'Only In' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={singleSub} />);

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(1);
      expect(screen.getByText(/Total substitutions:\s*1/)).toBeInTheDocument();
    });

    it('handles multiple substitutions in same inning correctly', () => {
      const multiSameSubs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'Sub1 Out' },
          incomingPlayer: { playerId: 'p2', name: 'Sub1 In' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 3,
          battingSlot: 5,
          outgoingPlayer: { playerId: 'p3', name: 'Sub2 Out' },
          incomingPlayer: { playerId: 'p4', name: 'Sub2 In' },
          timestamp: new Date('2024-01-15T14:05:00'),
          isReentry: false,
        },
        {
          inning: 3,
          battingSlot: 8,
          outgoingPlayer: { playerId: 'p5', name: 'Sub3 Out' },
          incomingPlayer: { playerId: 'p6', name: 'Sub3 In' },
          timestamp: new Date('2024-01-15T14:10:00'),
          isReentry: false,
        },
      ];

      render(<SubstitutionHistory gameId="game-123" substitutions={multiSameSubs} />);

      const records = screen.getAllByTestId('substitution-record');
      expect(records).toHaveLength(3);

      // All should show same inning
      records.forEach(record => {
        expect(within(record).getByText('Inning 3')).toBeInTheDocument();
      });
    });

    it('generates unique keys for substitutions', () => {
      const subs: SubstitutionRecord[] = [
        {
          inning: 3,
          battingSlot: 1,
          outgoingPlayer: { playerId: 'p1', name: 'P1' },
          incomingPlayer: { playerId: 'p2', name: 'P2' },
          timestamp: new Date('2024-01-15T14:00:00'),
          isReentry: false,
        },
        {
          inning: 3,
          battingSlot: 1, // Same slot, different time
          outgoingPlayer: { playerId: 'p3', name: 'P3' },
          incomingPlayer: { playerId: 'p4', name: 'P4' },
          timestamp: new Date('2024-01-15T14:05:00'),
          isReentry: false,
        },
      ];

      const { container } = render(<SubstitutionHistory gameId="game-123" substitutions={subs} />);

      const records = container.querySelectorAll('[data-testid="substitution-record"]');
      expect(records).toHaveLength(2);
    });
  });

  describe('Prop Variations', () => {
    it('works without className prop', () => {
      const sub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 1,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp: new Date('2024-01-15T14:00:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const container = screen.getByTestId('substitution-history');
      expect(container).toHaveClass('substitution-history');
      expect(container.className).toBe('substitution-history ');
    });

    it('works without onPlayerClick callback', () => {
      const sub: SubstitutionRecord = {
        inning: 3,
        battingSlot: 1,
        outgoingPlayer: { playerId: 'p1', name: 'P1' },
        incomingPlayer: { playerId: 'p2', name: 'P2' },
        timestamp: new Date('2024-01-15T14:00:00'),
        isReentry: false,
      };

      render(<SubstitutionHistory gameId="game-123" substitutions={[sub]} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveAttribute('type', 'button');
    });

    it('handles undefined substitutions prop', () => {
      render(<SubstitutionHistory gameId="game-123" />);

      const emptyState = screen.getByTestId('substitution-history-empty');
      expect(emptyState).toBeInTheDocument();
    });
  });
});

describe('SubstitutionHistoryEmpty', () => {
  it('renders empty state component', () => {
    render(<SubstitutionHistoryEmpty />);

    const emptyState = screen.getByTestId('substitution-history-empty');
    expect(emptyState).toBeInTheDocument();
  });

  it('displays correct empty state message', () => {
    render(<SubstitutionHistoryEmpty />);

    expect(screen.getByText('No substitutions made')).toBeInTheDocument();
    expect(
      screen.getByText('Substitutions will appear here as they are made during the game.')
    ).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<SubstitutionHistoryEmpty />);

    const emptyState = screen.getByTestId('substitution-history-empty');
    expect(emptyState).toHaveAttribute('role', 'region');
    expect(emptyState).toHaveAttribute('aria-label', 'No substitutions made');
  });

  it('has correct CSS class', () => {
    render(<SubstitutionHistoryEmpty />);

    const emptyState = screen.getByTestId('substitution-history-empty');
    expect(emptyState).toHaveClass('substitution-history-empty');
  });
});
