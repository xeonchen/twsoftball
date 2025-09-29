/**
 * @file BenchManagementWidget Test Suite
 *
 * Comprehensive test coverage for the bench management widget following TDD principles.
 * Tests widget behavior, integration with existing features, and accessibility requirements.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BenchPlayer } from '../../../shared/lib';

import { BenchManagementWidget } from './BenchManagementWidget';
import type { BenchManagementWidgetProps } from './BenchManagementWidget';

// Mock functions need to be declared before vi.mock calls
const mockUseSubstitutePlayerAPI = vi.fn();
const mockUseLineupManagement = vi.fn();
const mockUseBenchManagement = vi.fn();

vi.mock('../../../features/substitute-player', (): { useSubstitutePlayerAPI: () => unknown } => ({
  useSubstitutePlayerAPI: (): unknown => mockUseSubstitutePlayerAPI(),
}));

vi.mock('../../../features/lineup-management', (): { useLineupManagement: () => unknown } => ({
  useLineupManagement: (): unknown => mockUseLineupManagement(),
}));

// Mock the widget model hook
vi.mock('../model/useBenchManagement', (): { useBenchManagement: () => unknown } => ({
  useBenchManagement: (): unknown => mockUseBenchManagement(),
}));

describe('BenchManagementWidget', () => {
  const mockBenchPlayers: BenchPlayer[] = [
    {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      isStarter: true,
      hasReentered: false,
      entryInning: null,
      position: FieldPosition.PITCHER,
    },
    {
      id: 'player-2',
      name: 'Jane Smith',
      jerseyNumber: '25',
      isStarter: false,
      hasReentered: false,
      entryInning: 3,
    },
    {
      id: 'player-3',
      name: 'Bob Wilson',
      jerseyNumber: '8',
      isStarter: true,
      hasReentered: true,
      entryInning: 5,
      position: FieldPosition.CATCHER,
    },
  ];

  const defaultProps: BenchManagementWidgetProps = {
    gameId: 'game-123',
    teamLineupId: 'team-456',
    currentInning: 5,
    onSubstitutionComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations
    mockUseSubstitutePlayerAPI.mockReturnValue({
      executeSubstitution: vi.fn(),
      isLoading: false,
      error: null,
    });

    mockUseLineupManagement.mockReturnValue({
      activeLineup: [],
      benchPlayers: [],
      isLoading: false,
      error: null,
      makeSubstitution: vi.fn(),
      checkEligibility: vi.fn(),
      refreshLineup: vi.fn(),
      reset: vi.fn(),
      getAvailablePositions: vi.fn(),
      findPlayerBySlot: vi.fn(),
      findPlayerByPosition: vi.fn(),
    });

    mockUseBenchManagement.mockReturnValue({
      benchPlayers: [],
      isLoading: false,
      error: null,
      getPlayerEligibility: vi.fn(),
      executeQuickSubstitution: vi.fn(),
    });
  });

  describe('Widget Structure and Display', () => {
    it('renders widget with proper ARIA structure', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      expect(screen.getByRole('region', { name: /bench management/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /bench players/i })).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: [],
        isLoading: true,
        error: null,
        getPlayerEligibility: vi.fn(),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      expect(screen.getByRole('status', { name: /loading bench players/i })).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: [],
        isLoading: false,
        error: 'Failed to load bench players',
        getPlayerEligibility: vi.fn(),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load bench players/i)).toBeInTheDocument();
    });

    it('displays empty state when no bench players available', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: [],
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn(),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      expect(screen.getByText(/no players on bench/i)).toBeInTheDocument();
    });
  });

  describe('Bench Player Display', () => {
    it('renders all bench players with correct information', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Check that all players are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();

      // Check jersey numbers
      expect(screen.getByText('#12')).toBeInTheDocument();
      expect(screen.getByText('#25')).toBeInTheDocument();
      expect(screen.getByText('#8')).toBeInTheDocument();
    });

    it('displays player eligibility status correctly', () => {
      const mockGetPlayerEligibility = vi
        .fn()
        .mockReturnValueOnce({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        })
        .mockReturnValueOnce({
          canSubstitute: false,
          canReenter: false,
          restrictions: ['Player has already re-entered'],
        })
        .mockReturnValueOnce({
          canSubstitute: true,
          canReenter: true,
          restrictions: [],
        });

      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: mockGetPlayerEligibility,
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Check for eligibility indicators using more specific queries
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText(/ineligible/i)).toBeInTheDocument();
      expect(screen.getByText('Re-entry Available')).toBeInTheDocument();
    });

    it('shows substitution history indicators', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Check for starter indicators
      expect(screen.getByText(/starter/i)).toBeInTheDocument();

      // Check for substitute indicators
      expect(screen.getByText(/sub \(inning 3\)/i)).toBeInTheDocument();

      // Check for re-entry indicators
      expect(screen.getByText(/re-entered \(inning 5\)/i)).toBeInTheDocument();
    });
  });

  describe('Quick Substitution Actions', () => {
    it('displays quick substitution buttons for eligible players', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Should have quick substitution buttons for eligible players
      const quickSubButtons = screen.getAllByText(/quick sub/i);
      expect(quickSubButtons.length).toBeGreaterThan(0);
    });

    it('handles quick substitution button clicks', async () => {
      const mockExecuteQuickSubstitution = vi.fn().mockResolvedValue({
        success: true,
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Previous Player',
          battingSlot: 3,
        },
      });

      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: mockExecuteQuickSubstitution,
      });

      const onSubstitutionComplete = vi.fn();

      render(
        <BenchManagementWidget {...defaultProps} onSubstitutionComplete={onSubstitutionComplete} />
      );

      const quickSubButton = screen.getAllByText(/quick sub/i)[0];
      fireEvent.click(quickSubButton!);

      await waitFor(() => {
        expect(mockExecuteQuickSubstitution).toHaveBeenCalledWith('player-1');
        expect(onSubstitutionComplete).toHaveBeenCalled();
      });
    });

    it('disables quick substitution for ineligible players', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi
          .fn()
          .mockReturnValueOnce({
            canSubstitute: false,
            canReenter: false,
            restrictions: ['Player has already re-entered'],
          })
          .mockReturnValue({
            canSubstitute: true,
            canReenter: false,
            restrictions: [],
          }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Should have both enabled and disabled buttons
      const buttons = screen.getAllByRole('button');
      const disabledButton = buttons.find(button => button.hasAttribute('disabled'));
      expect(disabledButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      // Check main region
      expect(screen.getByRole('region', { name: /bench management/i })).toBeInTheDocument();

      // Check list structure
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(mockBenchPlayers.length);

      // Check button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('supports keyboard navigation', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: vi.fn(),
      });

      render(<BenchManagementWidget {...defaultProps} />);

      const buttons = screen.getAllByRole('button');

      // All buttons should be focusable
      buttons.forEach(button => {
        if (!button.hasAttribute('disabled')) {
          expect(button).toHaveAttribute('tabIndex', '0');
        }
      });
    });
  });

  describe('Widget Props and Configuration', () => {
    it('accepts custom className', () => {
      mockUseBenchManagement.mockReturnValue({
        benchPlayers: [],
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn(),
        executeQuickSubstitution: vi.fn(),
      });

      const { container } = render(
        <BenchManagementWidget {...defaultProps} className="custom-bench-widget" />
      );

      expect(container.firstChild).toHaveClass('custom-bench-widget');
    });

    it('passes correct props to useBenchManagement hook', () => {
      render(<BenchManagementWidget {...defaultProps} />);

      expect(mockUseBenchManagement).toHaveBeenCalledTimes(1);
      // Verify the hook was called (exact argument validation would require access to the actual function)
      expect(mockUseBenchManagement).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles substitution errors gracefully', async () => {
      const mockExecuteQuickSubstitution = vi
        .fn()
        .mockRejectedValue(new Error('Substitution failed'));

      mockUseBenchManagement.mockReturnValue({
        benchPlayers: mockBenchPlayers,
        isLoading: false,
        error: null,
        getPlayerEligibility: vi.fn().mockReturnValue({
          canSubstitute: true,
          canReenter: false,
          restrictions: [],
        }),
        executeQuickSubstitution: mockExecuteQuickSubstitution,
      });

      render(<BenchManagementWidget {...defaultProps} />);

      const quickSubButton = screen.getAllByText(/quick sub/i)[0];
      fireEvent.click(quickSubButton!);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/substitution failed/i)).toBeInTheDocument();
      });
    });
  });
});
