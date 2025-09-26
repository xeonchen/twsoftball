/**
 * @file LineupEditor Component Tests
 *
 * Test-first implementation for LineupEditor component that displays and manages
 * the active lineup with substitution capabilities.
 *
 * @remarks
 * This test file drives the implementation of the LineupEditor component following TDD.
 * The component is responsible for:
 * - Displaying the current active lineup with batting order and field positions
 * - Providing substitution interface for each lineup slot
 * - Showing player information and status indicators
 * - Handling responsive layout for mobile-first design
 * - Managing loading and error states
 *
 * Architecture compliance:
 * - Uses Feature-Sliced Design patterns
 * - Follows mobile-first responsive design
 * - Integrates with lineup management hook
 * - Provides proper accessibility attributes
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PositionAssignment, BenchPlayer } from '../../../shared/lib/types';
import { useLineupManagement } from '../model/useLineupManagement';

import { LineupEditor } from './LineupEditor';

// Mock the lineup management hook
vi.mock('../model/useLineupManagement', () => ({
  useLineupManagement: vi.fn(),
}));

// Cast to mock for TypeScript
const mockUseLineupManagement = useLineupManagement as vi.MockedFunction<
  typeof useLineupManagement
>;

// Mock data
const mockActiveLineup: PositionAssignment[] = [
  { battingSlot: 1, playerId: 'player-1', fieldPosition: FieldPosition.SHORTSTOP },
  { battingSlot: 2, playerId: 'player-2', fieldPosition: FieldPosition.SECOND_BASE },
  { battingSlot: 3, playerId: 'player-3', fieldPosition: FieldPosition.FIRST_BASE },
  { battingSlot: 4, playerId: 'player-4', fieldPosition: FieldPosition.THIRD_BASE },
  { battingSlot: 5, playerId: 'player-5', fieldPosition: FieldPosition.CATCHER },
  { battingSlot: 6, playerId: 'player-6', fieldPosition: FieldPosition.PITCHER },
  { battingSlot: 7, playerId: 'player-7', fieldPosition: FieldPosition.LEFT_FIELD },
  { battingSlot: 8, playerId: 'player-8', fieldPosition: FieldPosition.CENTER_FIELD },
  { battingSlot: 9, playerId: 'player-9', fieldPosition: FieldPosition.RIGHT_FIELD },
  { battingSlot: 10, playerId: 'player-10', fieldPosition: FieldPosition.EXTRA_PLAYER },
];

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
];

// Default mock hook return value
const defaultMockHookValue = {
  activeLineup: mockActiveLineup,
  benchPlayers: mockBenchPlayers,
  isLoading: false,
  error: null,
  makeSubstitution: vi.fn(),
  checkEligibility: vi.fn(() => ({ eligible: true, reason: null })),
  refreshLineup: vi.fn(),
  reset: vi.fn(),
  getAvailablePositions: vi.fn(() => [FieldPosition.SHORTSTOP, FieldPosition.FIRST_BASE]),
  findPlayerBySlot: vi.fn(),
  findPlayerByPosition: vi.fn(),
};

describe('LineupEditor Component - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLineupManagement.mockReturnValue(defaultMockHookValue);
  });

  describe('Component Rendering and Structure', () => {
    it('should render lineup editor with proper structure', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should have main container
      expect(screen.getByRole('region', { name: /lineup editor/i })).toBeInTheDocument();

      // Should have title
      expect(screen.getByText('Current Lineup')).toBeInTheDocument();

      // Should have lineup list
      expect(screen.getByRole('list', { name: /batting order/i })).toBeInTheDocument();
    });

    it('should render all batting positions', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should show all 10 batting positions
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`${i}.`)).toBeInTheDocument();
      }
    });

    it('should display player information for each lineup slot', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should show player IDs (in real implementation, these would be player names)
      expect(screen.getByText('player-1')).toBeInTheDocument();
      expect(screen.getByText('player-2')).toBeInTheDocument();
      expect(screen.getByText('player-3')).toBeInTheDocument();
    });

    it('should display field positions for each player', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should show abbreviated position names
      expect(screen.getByText('SS')).toBeInTheDocument(); // Shortstop
      expect(screen.getByText('2B')).toBeInTheDocument(); // Second Base
      expect(screen.getByText('1B')).toBeInTheDocument(); // First Base
      expect(screen.getByText('3B')).toBeInTheDocument(); // Third Base
      expect(screen.getByText('C')).toBeInTheDocument(); // Catcher
      expect(screen.getByText('P')).toBeInTheDocument(); // Pitcher
      expect(screen.getByText('LF')).toBeInTheDocument(); // Left Field
      expect(screen.getByText('CF')).toBeInTheDocument(); // Center Field
      expect(screen.getByText('RF')).toBeInTheDocument(); // Right Field
      expect(screen.getByText('EP')).toBeInTheDocument(); // Extra Player
    });

    it('should render substitution buttons for each lineup slot', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should have substitute buttons for each position
      const substituteButtons = screen.getAllByText(/substitute/i);
      expect(substituteButtons).toHaveLength(10);
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading spinner when loading', () => {
      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        isLoading: true,
        activeLineup: [],
      });

      render(<LineupEditor gameId="game-123" />);

      expect(screen.getByRole('status', { name: /loading lineup/i })).toBeInTheDocument();
    });

    it('should display error message when error occurs', () => {
      const errorMessage = 'Failed to load lineup';
      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        error: errorMessage,
        activeLineup: [],
      });

      render(<LineupEditor gameId="game-123" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display retry button when error occurs', () => {
      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        error: 'Failed to load lineup',
        activeLineup: [],
      });

      render(<LineupEditor gameId="game-123" />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(defaultMockHookValue.refreshLineup).toHaveBeenCalled();
    });

    it('should display empty state when no lineup data', () => {
      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        activeLineup: [],
      });

      render(<LineupEditor gameId="game-123" />);

      expect(screen.getByText(/no lineup data available/i)).toBeInTheDocument();
    });
  });

  describe('Substitution Interactions', () => {
    it('should open substitution dialog when substitute button clicked', async () => {
      render(<LineupEditor gameId="game-123" />);

      const firstSubstituteButton = screen.getAllByText(/substitute/i)[0];
      fireEvent.click(firstSubstituteButton);

      // Should show substitution dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /make substitution/i })).toBeInTheDocument();
      });
    });

    it('should pass correct player data to substitution dialog', async () => {
      render(<LineupEditor gameId="game-123" />);

      const firstSubstituteButton = screen.getAllByText(/substitute/i)[0];
      fireEvent.click(firstSubstituteButton);

      await waitFor(() => {
        // Should show current player being substituted
        expect(screen.getByText(/substituting player-1/i)).toBeInTheDocument();
        // Should show batting slot
        expect(screen.getByText(/batting slot 1/i)).toBeInTheDocument();
        // Should show current position
        expect(screen.getByText(/shortstop/i)).toBeInTheDocument();
      });
    });

    it('should close substitution dialog when cancelled', async () => {
      render(<LineupEditor gameId="game-123" />);

      const firstSubstituteButton = screen.getAllByText(/substitute/i)[0];
      fireEvent.click(firstSubstituteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle substitution completion', async () => {
      const mockMakeSubstitution = vi.fn().mockResolvedValue(undefined);
      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        makeSubstitution: mockMakeSubstitution,
      });

      render(<LineupEditor gameId="game-123" />);

      const firstSubstituteButton = screen.getAllByText(/substitute/i)[0];
      fireEvent.click(firstSubstituteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select a bench player first (required before confirm button is enabled)
      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[0]);

      // Wait for eligibility validation and then click confirm
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).not.toBeDisabled();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockMakeSubstitution).toHaveBeenCalledWith(
          expect.objectContaining({
            outgoingPlayerId: 'player-1',
            battingSlot: 1,
            fieldPosition: FieldPosition.SHORTSTOP,
          })
        );
      });
    });
  });

  describe('Responsive Design and Mobile Layout', () => {
    it('should have proper mobile layout classes', () => {
      render(<LineupEditor gameId="game-123" />);

      const container = screen.getByRole('region', { name: /lineup editor/i });
      expect(container).toHaveClass('lineup-container');

      const list = screen.getByRole('list', { name: /batting order/i });
      expect(list).toHaveClass('lineup-list');
    });

    it('should display compact player information on mobile', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should have mobile-optimized player cards
      const playerCards = screen.getAllByRole('listitem');
      expect(playerCards[0]).toHaveClass('lineup-slot');
    });

    it('should have touch-friendly button sizes', () => {
      render(<LineupEditor gameId="game-123" />);

      const substituteButtons = screen.getAllByText(/substitute/i);
      substituteButtons.forEach(button => {
        expect(button).toHaveClass('substitute-button');
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LineupEditor gameId="game-123" />);

      expect(screen.getByRole('region', { name: /lineup editor/i })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /batting order/i })).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(10);
    });

    it('should have accessible substitute buttons', () => {
      render(<LineupEditor gameId="game-123" />);

      const substituteButtons = screen.getAllByRole('button', { name: /substitute/i });
      expect(substituteButtons).toHaveLength(10);

      // Each button should have proper aria-label
      expect(substituteButtons[0]).toHaveAttribute('aria-label', 'Substitute player in slot 1');
    });

    it('should announce lineup changes to screen readers', () => {
      render(<LineupEditor gameId="game-123" />);

      // Should have live region for announcements
      expect(screen.getByRole('status', { name: /lineup updates/i })).toBeInTheDocument();
    });

    it('should have proper keyboard navigation', () => {
      render(<LineupEditor gameId="game-123" />);

      const substituteButtons = screen.getAllByRole('button', { name: /substitute/i });

      // All substitute buttons should be focusable
      substituteButtons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Component Props and Integration', () => {
    it('should pass gameId to lineup management hook', () => {
      render(<LineupEditor gameId="game-123" />);

      expect(mockUseLineupManagement).toHaveBeenCalledWith('game-123');
    });

    it('should re-render when gameId changes', () => {
      const { rerender } = render(<LineupEditor gameId="game-123" />);

      expect(mockUseLineupManagement).toHaveBeenCalledWith('game-123');

      rerender(<LineupEditor gameId="game-456" />);

      expect(mockUseLineupManagement).toHaveBeenCalledWith('game-456');
    });

    it('should handle optional className prop', () => {
      render(<LineupEditor gameId="game-123" className="custom-class" />);

      const container = screen.getByRole('region', { name: /lineup editor/i });
      expect(container).toHaveClass('lineup-container');

      // Check the actual lineup-editor class on the root element
      const lineupEditor = container.closest('.lineup-editor');
      expect(lineupEditor).toHaveClass('lineup-editor', 'custom-class');
    });

    it('should handle optional onSubstitutionComplete callback', async () => {
      const onSubstitutionComplete = vi.fn();
      const mockMakeSubstitution = vi.fn().mockResolvedValue(undefined);

      mockUseLineupManagement.mockReturnValue({
        ...defaultMockHookValue,
        makeSubstitution: mockMakeSubstitution,
      });

      render(<LineupEditor gameId="game-123" onSubstitutionComplete={onSubstitutionComplete} />);

      const firstSubstituteButton = screen.getAllByText(/substitute/i)[0];
      fireEvent.click(firstSubstituteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select a bench player first (required before confirm button is enabled)
      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[0]);

      // Wait for eligibility validation and then click confirm
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).not.toBeDisabled();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onSubstitutionComplete).toHaveBeenCalled();
      });
    });
  });
});
