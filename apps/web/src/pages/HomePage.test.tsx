/**
 * @file HomePage Component Tests
 * Comprehensive tests for HomePage component covering all user interactions,
 * game state management, navigation, and UI behaviors.
 *
 * @remarks
 * These tests follow TDD approach and validate the complete functionality
 * of the HomePage component including active game display, game history,
 * navigation actions, and empty states.
 *
 * **Test Categories**:
 * - Component rendering and initial state
 * - Active game card display and resume functionality
 * - Start new game navigation
 * - Settings navigation
 * - Game history display and interaction
 * - Empty state handling for no games
 * - Game score and status formatting
 * - Keyboard accessibility for interactive elements
 * - Active game detection and conditional rendering
 * - Game card click navigation
 *
 * **Architecture Compliance**:
 * - Tests integration with game store
 * - Validates proper navigation patterns
 * - Ensures accessibility standards
 * - Tests conditional rendering logic
 *
 * **Testing Strategy**:
 * - Mock game store for controlled scenarios
 * - Test all navigation paths and user interactions
 * - Validate UI state changes based on game data
 * - Test keyboard navigation and accessibility
 * - Verify proper cleanup and memory management
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useGameStore, type GameData } from '../shared/lib/store/gameStore';

import { HomePage } from './HomePage';

// Mock the game store
vi.mock('../shared/lib/store/gameStore', () => ({
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
  id: 'active-game-123',
  homeTeam: 'Eagles',
  awayTeam: 'Hawks',
  status: 'active',
  homeScore: 7,
  awayScore: 5,
  currentInning: 6,
  isTopHalf: true,
};

/**
 * Mock completed game data
 */
const mockCompletedGame: GameData = {
  id: 'completed-game-456',
  homeTeam: 'Lions',
  awayTeam: 'Tigers',
  status: 'completed',
  homeScore: 12,
  awayScore: 8,
  currentInning: 7,
  isTopHalf: false,
};

/**
 * Mock waiting game data
 */
const mockWaitingGame: GameData = {
  id: 'waiting-game-789',
  homeTeam: 'Bears',
  awayTeam: 'Wolves',
  status: 'waiting',
  homeScore: 0,
  awayScore: 0,
  currentInning: 1,
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

/**
 * Mock game store state with completed game
 */
const mockGameStoreWithCompletedGame = {
  currentGame: mockCompletedGame,
  isLoading: false,
  error: null,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

/**
 * Mock game store state with waiting game
 */
const mockGameStoreWithWaitingGame = {
  currentGame: mockWaitingGame,
  isLoading: false,
  error: null,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

describe('HomePage Component', () => {
  let mockUseGameStore: Mock;
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mock implementations
    mockUseGameStore = vi.mocked(useGameStore);
    mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);
  });

  describe('Component Rendering and Initial State', () => {
    it('should render home page with correct structure', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check main page structure
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('⚡ TW Softball')).toBeInTheDocument();
      expect(screen.getByText('Recent Games:')).toBeInTheDocument();
    });

    it('should render header with app title and settings button', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('⚡ TW Softball')).toBeInTheDocument();
      const settingsButton = screen.getByTestId('settings-button');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('aria-label', 'Settings');
      expect(settingsButton).toHaveTextContent('⚙️');
    });

    it('should render start new game button', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-new-game-button');
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveTextContent('START NEW GAME');
      expect(startButton).toHaveAttribute('aria-label', 'Start New Game');
    });

    it('should render recent games section', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('Recent Games:')).toBeInTheDocument();
    });
  });

  describe('Active Game Card Display and Resume Functionality', () => {
    it('should display active game card when game is active', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const activeGameCard = screen.getByTestId('active-game-card');
      expect(activeGameCard).toBeInTheDocument();
      expect(screen.getByText('🟢 LIVE GAME')).toBeInTheDocument();
      expect(screen.getByText('Eagles vs Hawks')).toBeInTheDocument();
      expect(screen.getByText('7-5 • Top 6th')).toBeInTheDocument();
    });

    it('should display resume game button for active game', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const resumeButton = screen.getByTestId('resume-game-button');
      expect(resumeButton).toBeInTheDocument();
      expect(resumeButton).toHaveTextContent('RESUME GAME');
    });

    it('should navigate to game recording when resume button is clicked', async () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const resumeButton = screen.getByTestId('resume-game-button');
      await user.click(resumeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/game/active-game-123/record');
    });

    it('should not display active game card when no game is active', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
      expect(screen.queryByText('🟢 LIVE GAME')).not.toBeInTheDocument();
    });

    it('should not display active game card when game status is not active', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithCompletedGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
    });

    it('should not display active game card when game status is waiting', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithWaitingGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
    });

    it('should handle missing score data in active game', () => {
      const gameWithoutScores = {
        ...mockActiveGame,
        homeScore: undefined,
        awayScore: undefined,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithoutScores,
      });

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // When scores are undefined, they render as empty strings, so the text is "- • Top 6th"
      expect(screen.getByText('- • Top 6th')).toBeInTheDocument();
    });

    it('should handle resume game when no game ID', async () => {
      const gameWithoutId = {
        ...mockActiveGame,
        id: '',
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithoutId,
      });

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const resumeButton = screen.getByTestId('resume-game-button');
      await user.click(resumeButton);

      // Should not navigate if no ID
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Start New Game Navigation', () => {
    it('should navigate to game setup when start new game button is clicked', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-new-game-button');
      await user.click(startButton);

      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/teams');
    });

    it('should handle multiple clicks on start new game button', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-new-game-button');
      await user.click(startButton);
      await user.click(startButton);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/teams');
    });

    it('should have correct button properties for start new game', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-new-game-button');
      expect(startButton).toHaveClass('start-new-game-button');
      // Note: size="large" and variant="primary" would be passed to Button component
    });
  });

  describe('Settings Navigation', () => {
    it('should navigate to settings when settings button is clicked', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const settingsButton = screen.getByTestId('settings-button');
      await user.click(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should handle keyboard interaction for settings button', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const settingsButton = screen.getByTestId('settings-button');
      settingsButton.focus();
      await user.keyboard('{Enter}');

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should have correct accessibility attributes for settings button', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const settingsButton = screen.getByTestId('settings-button');
      expect(settingsButton).toHaveAttribute('aria-label', 'Settings');
    });
  });

  describe('Game History Display and Interaction', () => {
    it('should show empty state when no game history', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const emptyState = screen.getByTestId('empty-games-state');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('No games recorded yet')).toBeInTheDocument();
      expect(screen.getByText('Start your first game to see it here')).toBeInTheDocument();
    });

    it('should handle empty game history gracefully', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Should show empty state and not crash
      expect(screen.getByTestId('empty-games-state')).toBeInTheDocument();
      expect(screen.queryByTestId(/game-card-/)).not.toBeInTheDocument();
    });

    // Note: Game history functionality is stubbed as empty array in current implementation
    // These tests validate the empty state behavior which is the current functionality
    it('should render recent games section header even with no games', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('Recent Games:')).toBeInTheDocument();
    });

    it('should maintain consistent layout with empty game history', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();

      const recentGamesSection = screen.getByText('Recent Games:').closest('section');
      expect(recentGamesSection).toBeInTheDocument();
    });
  });

  describe('Empty State Handling for No Games', () => {
    it('should display empty state message correctly', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('No games recorded yet')).toBeInTheDocument();
      expect(screen.getByText('Start your first game to see it here')).toBeInTheDocument();
    });

    it('should have correct CSS classes for empty state', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const emptyState = screen.getByTestId('empty-games-state');
      expect(emptyState).toHaveClass('empty-games-state');

      const emptyMessage = screen.getByText('No games recorded yet');
      expect(emptyMessage).toHaveClass('empty-message');

      const emptySubtitle = screen.getByText('Start your first game to see it here');
      expect(emptySubtitle).toHaveClass('empty-subtitle');
    });

    it('should provide clear call to action in empty state', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('Start your first game to see it here')).toBeInTheDocument();
    });
  });

  describe('Game Score and Status Formatting', () => {
    it('should format active game score correctly', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('7-5 • Top 6th')).toBeInTheDocument();
    });

    it('should format team matchup correctly', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('Eagles vs Hawks')).toBeInTheDocument();
    });

    it('should display live game indicator', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('🟢 LIVE GAME')).toBeInTheDocument();
    });

    it('should handle different inning numbers', () => {
      const gameInning9 = {
        ...mockActiveGame,
        currentInning: 9,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameInning9,
      });

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('7-5 • Top 9th')).toBeInTheDocument();
    });

    it('should handle different scores correctly', () => {
      const highScoringGame = {
        ...mockActiveGame,
        homeScore: 15,
        awayScore: 12,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: highScoringGame,
      });

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('15-12 • Top 6th')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const mainTitle = screen.getByRole('heading', { level: 1 });
      expect(mainTitle).toHaveTextContent('⚡ TW Softball');

      const sectionTitle = screen.getByRole('heading', { level: 2 });
      expect(sectionTitle).toHaveTextContent('Recent Games:');
    });

    it('should support keyboard navigation for interactive elements', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const settingsButton = screen.getByTestId('settings-button');
      const startGameButton = screen.getByTestId('start-new-game-button');

      // Should be focusable
      settingsButton.focus();
      expect(document.activeElement).toBe(settingsButton);

      await user.tab();
      expect(document.activeElement).toBe(startGameButton);
    });

    it('should have correct ARIA labels', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByTestId('settings-button')).toHaveAttribute('aria-label', 'Settings');
      expect(screen.getByTestId('start-new-game-button')).toHaveAttribute(
        'aria-label',
        'Start New Game'
      );
    });

    it('should handle focus management correctly', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const resumeButton = screen.getByTestId('resume-game-button');
      resumeButton.focus();

      expect(document.activeElement).toBe(resumeButton);
    });
  });

  describe('Active Game Detection and Conditional Rendering', () => {
    it('should correctly detect active game status', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByTestId('active-game-card')).toBeInTheDocument();
    });

    it('should not show active game card for completed games', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithCompletedGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
    });

    it('should not show active game card for waiting games', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithWaitingGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
    });

    it('should handle null currentGame gracefully', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);

      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();
      expect(screen.getByTestId('start-new-game-button')).toBeInTheDocument();
    });
  });

  describe('Component State Management and Cleanup', () => {
    it('should handle component unmount without errors', () => {
      const { unmount } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid navigation clicks', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-new-game-button');

      await user.click(startButton);
      await user.click(startButton);
      await user.click(startButton);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/teams');
    });

    it('should handle store state changes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Initially no active game
      expect(screen.queryByTestId('active-game-card')).not.toBeInTheDocument();

      // Change to active game
      mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);

      rerender(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByTestId('active-game-card')).toBeInTheDocument();
    });

    it('should maintain consistent rendering across re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('⚡ TW Softball')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('⚡ TW Softball')).toBeInTheDocument();
    });
  });
});
