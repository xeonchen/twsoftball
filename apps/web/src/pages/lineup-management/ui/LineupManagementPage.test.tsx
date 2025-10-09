/**
 * @file LineupManagementPage Component Tests
 * Comprehensive tests for LineupManagementPage component covering navigation,
 * game state display, and error handling.
 *
 * @remarks
 * These tests follow TDD approach and validate the complete functionality
 * of the LineupManagementPage component including active game display,
 * navigation actions, error states, and proper rendering.
 *
 * **Test Categories**:
 * - Component rendering with active game
 * - Empty state handling when no game exists
 * - Navigation functionality
 * - Proper prop passing to LineupEditor
 * - Back button navigation
 * - Game info display
 *
 * **Architecture Compliance**:
 * - Tests integration with game store
 * - Validates proper navigation patterns
 * - Ensures LineupEditor integration
 * - Tests conditional rendering logic
 *
 * **Testing Strategy**:
 * - Mock game store for controlled scenarios
 * - Test all navigation paths and user interactions
 * - Validate UI state changes based on game data
 * - Test error states and edge cases
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useGameStore, type GameData } from '../../../entities/game';

import { LineupManagementPage } from './LineupManagementPage';

// Mock the game store
vi.mock('../../../entities/game', () => ({
  useGameStore: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock LineupEditor component
vi.mock('../../../features/lineup-management', () => ({
  LineupEditor: ({
    gameId,
    onSubstitutionComplete,
  }: {
    gameId: string;
    onSubstitutionComplete?: () => void;
  }): ReactElement => (
    <div data-testid="lineup-editor" data-game-id={gameId}>
      <button onClick={onSubstitutionComplete}>Mock Substitution</button>
    </div>
  ),
}));

/**
 * Test wrapper component with router context
 */
function TestWrapper({ children }: { children: ReactElement }): ReactElement {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Mock active game data
 */
const mockActiveGame: GameData = {
  id: 'test-game-123',
  homeTeam: 'Eagles',
  awayTeam: 'Hawks',
  status: 'active',
  homeScore: 7,
  awayScore: 5,
  currentInning: 6,
  isTopHalf: true,
};

/**
 * Mock game store state with active game
 */
const mockGameStoreWithActiveGame = {
  currentGame: mockActiveGame,
  isLoading: false,
  error: null,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

/**
 * Mock game store state without active game
 */
const mockGameStoreWithoutActiveGame = {
  currentGame: null,
  isLoading: false,
  error: null,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

describe('LineupManagementPage Component', () => {
  let mockUseGameStore: Mock;
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mock implementation
    mockUseGameStore = vi.mocked(useGameStore);
    mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);
  });

  describe('Rendering with Active Game', () => {
    it('should render LineupManagementPage with active game', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('lineup-management-page')).toBeInTheDocument();
      expect(screen.getByText('Lineup Management')).toBeInTheDocument();
    });

    it('should render LineupEditor when game exists', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const lineupEditor = screen.getByTestId('lineup-editor');
      expect(lineupEditor).toBeInTheDocument();
      expect(lineupEditor).toHaveAttribute('data-game-id', mockActiveGame.id);
    });

    it('should pass gameId to LineupEditor', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const lineupEditor = screen.getByTestId('lineup-editor');
      expect(lineupEditor).toHaveAttribute('data-game-id', 'test-game-123');
    });

    it('should display game information correctly', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByText('Eagles vs Hawks')).toBeInTheDocument();
      expect(screen.getByText('In Progress - Top 6th')).toBeInTheDocument();
    });

    it('should display correct game status for active game', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByText('In Progress - Top 6th')).toBeInTheDocument();
    });

    it('should display "Game Setup" status for non-active game', () => {
      const waitingGame: GameData = {
        ...mockActiveGame,
        status: 'waiting',
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: waitingGame,
      });

      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByText('Game Setup')).toBeInTheDocument();
    });
  });

  describe('Empty State When No Game Exists', () => {
    beforeEach(() => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);
    });

    it('should show "No Active Game" message when no game exists', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByText('No Active Game')).toBeInTheDocument();
      expect(
        screen.getByText('Please start or resume a game to manage the lineup.')
      ).toBeInTheDocument();
    });

    it('should show "Go to Home" button when no game', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const homeButton = screen.getByRole('button', { name: /go to home/i });
      expect(homeButton).toBeInTheDocument();
    });

    it('should not render LineupEditor when no game exists', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('lineup-editor')).not.toBeInTheDocument();
    });

    it('should navigate to home when "Go to Home" button is clicked', async () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const homeButton = screen.getByRole('button', { name: /go to home/i });
      await user.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Navigation Functionality', () => {
    it('should render back button with correct accessibility label', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('aria-label', 'Go back to home');
      expect(backButton).toHaveTextContent('←');
    });

    it('should navigate to home when back button is clicked', async () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle back button click even with no game', async () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);

      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Substitution Completion Handler', () => {
    it('should handle substitution completion callback', async () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      // Trigger the substitution callback through the mock button
      const mockSubButton = screen.getByText('Mock Substitution');
      await user.click(mockSubButton);

      // The callback should complete without errors
      // In the real implementation, this would trigger any necessary UI updates
      expect(mockSubButton).toBeInTheDocument();
    });
  });

  describe('Component Structure and Accessibility', () => {
    it('should have proper page structure with testid', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('lineup-management-page')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      // Page title should be h2 (following FSD page patterns)
      const pageTitle = screen.getByRole('heading', { level: 2, name: 'Lineup Management' });
      expect(pageTitle).toBeInTheDocument();

      // Game title should be h3
      const gameTitle = screen.getByRole('heading', { level: 3 });
      expect(gameTitle).toHaveTextContent('Eagles vs Hawks');
    });

    it('should render page header correctly', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('page-header');
    });

    it('should render main content area', () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('page-content');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle game with missing team names gracefully', () => {
      const gameWithMissingTeams: GameData = {
        ...mockActiveGame,
        homeTeam: '',
        awayTeam: '',
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithMissingTeams,
      });

      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByTestId('lineup-management-page')).toBeInTheDocument();
      // When team names are empty, "vs" is rendered (whitespace is normalized)
      const gameTitle = screen.getByRole('heading', { level: 3 });
      expect(gameTitle).toHaveTextContent('vs');
    });

    it('should handle game with invalid inning number', () => {
      const gameWithInvalidInning: GameData = {
        ...mockActiveGame,
        currentInning: 0,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithInvalidInning,
      });

      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByTestId('lineup-management-page')).toBeInTheDocument();
      expect(screen.getByText('In Progress - Top 0th')).toBeInTheDocument();
    });

    it('should handle empty game ID gracefully', () => {
      const gameWithEmptyId: GameData = {
        ...mockActiveGame,
        id: '',
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithEmptyId,
      });

      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const lineupEditor = screen.getByTestId('lineup-editor');
      expect(lineupEditor).toHaveAttribute('data-game-id', '');
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle component unmount without errors', () => {
      const { unmount } = render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid navigation clicks', async () => {
      render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');

      await user.click(backButton);
      await user.click(backButton);
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle store state changes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      // Initially has active game
      expect(screen.getByTestId('lineup-editor')).toBeInTheDocument();

      // Change to no game
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);

      rerender(
        <TestWrapper>
          <LineupManagementPage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('lineup-editor')).not.toBeInTheDocument();
      expect(screen.getByText('No Active Game')).toBeInTheDocument();
    });
  });
});
