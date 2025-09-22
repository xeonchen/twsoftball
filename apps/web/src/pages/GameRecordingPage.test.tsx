/**
 * @file GameRecordingPage Component Tests
 * Comprehensive tests for GameRecordingPage component covering all user interactions,
 * game state management, navigation protection, and UI behaviors.
 *
 * @remarks
 * These tests follow TDD approach and validate the complete functionality
 * of the GameRecordingPage component including game recording interface,
 * action buttons, undo/redo functionality, navigation protection, and error states.
 *
 * **Test Categories**:
 * - Component rendering with active game state
 * - Error state handling for missing game data
 * - Action button interactions and logging
 * - Undo/redo functionality and controls
 * - Navigation to stats and settings
 * - Base diamond display with runner status
 * - Current batter information and stats
 * - Score display and game status
 * - Navigation protection during active games
 * - Inning display with ordinal formatting
 * - Fixed header and floating action button
 * - Action button priority and organization
 *
 * **Architecture Compliance**:
 * - Tests integration with game store and UI store
 * - Validates navigation guard functionality
 * - Ensures proper separation of concerns
 * - Tests error boundaries and fallbacks
 *
 * **Testing Strategy**:
 * - Mock all store dependencies for controlled scenarios
 * - Test all user interaction paths and console logging
 * - Validate UI state changes and calculations
 * - Test navigation protection and warning systems
 * - Verify proper cleanup and memory management
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useNavigationGuard } from '../shared/hooks/useNavigationGuard';
import { useGameStore } from '../shared/lib/store/gameStore';
import { useUIStore } from '../shared/lib/store/uiStore';

import { GameRecordingPage } from './GameRecordingPage';

// Mock the stores and hooks
vi.mock('../shared/lib/store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../shared/lib/store/uiStore', () => ({
  useUIStore: vi.fn(),
}));

vi.mock('../shared/hooks/useNavigationGuard', () => ({
  useNavigationGuard: vi.fn(),
}));

// Mock react-router-dom navigate and useParams
const mockNavigate = vi.fn();
const mockParams = { gameId: 'test-game-123' };

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
    useParams: (): typeof mockParams => mockParams,
  };
});

// Mock console.log for action logging
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

/**
 * Test wrapper component with router context
 */
function TestWrapper({ children }: { children: ReactElement }): ReactElement {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Mock player data for current batter
 */
const mockCurrentBatter = {
  id: 'player-1',
  name: 'Sarah Johnson',
  jerseyNumber: '12',
  position: 'RF',
  battingOrder: 1,
};

/**
 * Mock active game state
 */
const mockActiveGameState = {
  currentInning: 3,
  isTopHalf: true,
  currentBatter: mockCurrentBatter,
  bases: {
    first: {
      id: 'runner-1',
      name: 'Mike Chen',
      jerseyNumber: '8',
      position: 'SS',
      battingOrder: 2,
    },
    second: null,
    third: {
      id: 'runner-3',
      name: 'Lisa Park',
      jerseyNumber: '5',
      position: 'CF',
      battingOrder: 3,
    },
  },
  outs: 1,
};

/**
 * Mock game data
 */
const mockGameData = {
  id: 'test-game-123',
  homeTeam: 'Eagles',
  awayTeam: 'Hawks',
  status: 'active' as const,
  homeScore: 5,
  awayScore: 3,
  currentInning: 3,
  isTopHalf: true,
};

/**
 * Mock game store state with active game
 */
const mockGameStoreWithActiveGame = {
  currentGame: mockGameData,
  activeGameState: mockActiveGameState,
  isGameActive: true,
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
  activeGameState: null,
  isGameActive: false,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

/**
 * Mock UI store
 */
const mockUIStore = {
  showNavigationWarning: vi.fn(),
  dismissNavigationWarning: vi.fn(),
  isNavigationWarningVisible: false,
};

describe('GameRecordingPage Component', () => {
  let mockUseGameStore: Mock;
  let mockUseUIStore: Mock;
  let mockUseNavigationGuard: Mock;
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockConsoleLog.mockClear();

    // Setup default mock implementations
    mockUseGameStore = vi.mocked(useGameStore);
    mockUseUIStore = vi.mocked(useUIStore);
    mockUseNavigationGuard = vi.mocked(useNavigationGuard);

    // Default mock return values
    mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);
    mockUseUIStore.mockReturnValue(mockUIStore);
    mockUseNavigationGuard.mockImplementation(() => {});
  });

  describe('Component Rendering with Active Game State', () => {
    it('should render game recording page with correct structure', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      // Check main page structure
      expect(screen.getByTestId('game-recording-page')).toBeInTheDocument();
      expect(screen.getByText('HOME 5 - 3 AWAY')).toBeInTheDocument();
      expect(screen.getByText('Top 3rd')).toBeInTheDocument();
      expect(screen.getByText('1 Outs')).toBeInTheDocument();
    });

    it('should render fixed header with score display', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('HOME 5 - 3 AWAY')).toBeInTheDocument();
      const settingsButton = screen.getByRole('button', { name: 'Game settings' });
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveTextContent('⚙️');
    });

    it('should render game status bar with inning and controls', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Top 3rd')).toBeInTheDocument();
      expect(screen.getByText('1 Outs')).toBeInTheDocument();

      const undoButton = screen.getByRole('button', { name: 'Undo last action' });
      const redoButton = screen.getByRole('button', { name: 'Redo last action' });
      expect(undoButton).toBeInTheDocument();
      expect(redoButton).toBeInTheDocument();
    });

    it('should render base diamond with correct runner status', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      // Check base labels
      expect(screen.getByText('1B')).toBeInTheDocument();
      expect(screen.getByText('2B')).toBeInTheDocument();
      expect(screen.getByText('3B')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();

      // Check runner indicators - there should be runners on 1st and 3rd
      const runnerIndicators = screen.getAllByText('◆');
      expect(runnerIndicators).toHaveLength(2); // First and third base occupied

      const homeIndicator = screen.getByText('◇');
      expect(homeIndicator).toBeInTheDocument();
    });

    it('should render current batter information', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Now Batting:')).toBeInTheDocument();
      expect(screen.getByText('#12 Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('1st │ RF │ 0-0 today')).toBeInTheDocument();
    });

    it('should render next batter preview', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Next:')).toBeInTheDocument();
      expect(screen.getByText('#8 Mike Chen (SS)')).toBeInTheDocument();
    });

    it('should render stats floating action button', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const statsButton = screen.getByRole('button', { name: 'View game statistics' });
      expect(statsButton).toBeInTheDocument();
      expect(statsButton).toHaveTextContent('📊');
      expect(statsButton).toHaveAttribute('title', 'View Stats');
    });
  });

  describe('Error State Handling for Missing Game Data', () => {
    it('should show error state when no game data available', () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Game Not Found')).toBeInTheDocument();
      expect(screen.getByText('No active game found with ID: test-game-123')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should navigate to home when clicking Go Home in error state', async () => {
      mockUseGameStore.mockReturnValue(mockGameStoreWithoutActiveGame);

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const goHomeButton = screen.getByText('Go Home');
      await user.click(goHomeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should show error when current game exists but no active game state', () => {
      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithoutActiveGame,
        currentGame: mockGameData,
        activeGameState: null,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Game Not Found')).toBeInTheDocument();
    });

    it('should show error when active game state exists but no current game', () => {
      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithoutActiveGame,
        currentGame: null,
        activeGameState: mockActiveGameState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Game Not Found')).toBeInTheDocument();
    });
  });

  describe('Action Button Interactions and Logging', () => {
    it('should render all action buttons with correct priorities', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      // High priority buttons
      expect(screen.getByTestId('action-single')).toBeInTheDocument();
      expect(screen.getByTestId('action-out')).toBeInTheDocument();
      expect(screen.getByTestId('action-walk')).toBeInTheDocument();

      // Medium priority buttons
      expect(screen.getByTestId('action-double')).toBeInTheDocument();
      expect(screen.getByTestId('action-triple')).toBeInTheDocument();
      expect(screen.getByTestId('action-homerun')).toBeInTheDocument();
      expect(screen.getByTestId('action-strikeout')).toBeInTheDocument();

      // Low priority buttons
      expect(screen.getByTestId('action-groundout')).toBeInTheDocument();
      expect(screen.getByTestId('action-flyout')).toBeInTheDocument();
      expect(screen.getByTestId('action-error')).toBeInTheDocument();
      expect(screen.getByTestId('action-fielderschoice')).toBeInTheDocument();

      // Rare priority buttons
      expect(screen.getByTestId('action-sacfly')).toBeInTheDocument();
      expect(screen.getByTestId('action-doubleplay')).toBeInTheDocument();
      expect(screen.getByTestId('action-tripleplay')).toBeInTheDocument();
    });

    it('should log action when action button is clicked', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const singleButton = screen.getByTestId('action-single');
      await user.click(singleButton);

      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: single');
    });

    it('should log different actions for different buttons', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('action-double'));
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: double');

      await user.click(screen.getByTestId('action-out'));
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: out');

      await user.click(screen.getByTestId('action-homerun'));
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: homerun');
    });

    it('should handle rare action button clicks', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('action-tripleplay'));
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: tripleplay');

      await user.click(screen.getByTestId('action-sacfly'));
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: sacfly');
    });

    it('should have correct CSS classes for button priorities', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('action-single')).toHaveClass('high-priority');
      expect(screen.getByTestId('action-double')).toHaveClass('medium-priority');
      expect(screen.getByTestId('action-groundout')).toHaveClass('low-priority');
      expect(screen.getByTestId('action-sacfly')).toHaveClass('rare-priority');
    });
  });

  describe('Undo/Redo Functionality and Controls', () => {
    it('should log undo action when undo button is clicked', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const undoButton = screen.getByRole('button', { name: 'Undo last action' });
      await user.click(undoButton);

      expect(mockConsoleLog).toHaveBeenCalledWith('Undo last action');
    });

    it('should log redo action when redo button is clicked', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const redoButton = screen.getByRole('button', { name: 'Redo last action' });
      await user.click(redoButton);

      expect(mockConsoleLog).toHaveBeenCalledWith('Redo last action');
    });

    it('should have correct aria-labels for undo/redo buttons', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const undoButton = screen.getByRole('button', { name: 'Undo last action' });
      const redoButton = screen.getByRole('button', { name: 'Redo last action' });

      expect(undoButton).toHaveAttribute('aria-label', 'Undo last action');
      expect(redoButton).toHaveAttribute('aria-label', 'Redo last action');
    });

    it('should render undo/redo buttons with correct symbols', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('↶')).toBeInTheDocument(); // Undo symbol
      expect(screen.getByText('↷')).toBeInTheDocument(); // Redo symbol
    });
  });

  describe('Navigation to Stats and Settings', () => {
    it('should navigate to stats when stats button is clicked', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const statsButton = screen.getByRole('button', { name: 'View game statistics' });
      await user.click(statsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/game/test-game-123/stats');
    });

    it('should navigate to settings when settings button is clicked', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const settingsButton = screen.getByRole('button', { name: 'Game settings' });
      await user.click(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should handle stats button click with gameId validation', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const statsButton = screen.getByRole('button', { name: 'View game statistics' });
      await user.click(statsButton);

      // Should navigate since gameId exists in mock
      expect(mockNavigate).toHaveBeenCalledWith('/game/test-game-123/stats');
    });
  });

  describe('Base Diamond Display with Runner Status', () => {
    it('should show bases as occupied when runners are present', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const firstBase = screen.getByText('1B').closest('.base');
      const secondBase = screen.getByText('2B').closest('.base');
      const thirdBase = screen.getByText('3B').closest('.base');

      expect(firstBase).toHaveClass('occupied');
      expect(secondBase).toHaveClass('empty');
      expect(thirdBase).toHaveClass('occupied');
    });

    it('should show all bases as empty when no runners', () => {
      const emptyActiveGameState = {
        ...mockActiveGameState,
        bases: {
          first: null,
          second: null,
          third: null,
        },
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: emptyActiveGameState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const firstBase = screen.getByText('1B').closest('.base');
      const secondBase = screen.getByText('2B').closest('.base');
      const thirdBase = screen.getByText('3B').closest('.base');

      expect(firstBase).toHaveClass('empty');
      expect(secondBase).toHaveClass('empty');
      expect(thirdBase).toHaveClass('empty');
    });

    it('should show correct number of runner indicators', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const runnerIndicators = screen.getAllByText('◆');
      expect(runnerIndicators).toHaveLength(2); // Only first and third bases occupied
    });

    it('should show all bases occupied when runners on all bases', () => {
      const basesLoadedState = {
        ...mockActiveGameState,
        bases: {
          first: { id: 'r1', name: 'Player 1', jerseyNumber: '1', position: 'P', battingOrder: 1 },
          second: {
            id: 'r2',
            name: 'Player 2',
            jerseyNumber: '2',
            position: '2B',
            battingOrder: 2,
          },
          third: { id: 'r3', name: 'Player 3', jerseyNumber: '3', position: '3B', battingOrder: 3 },
        },
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: basesLoadedState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const firstBase = screen.getByText('1B').closest('.base');
      const secondBase = screen.getByText('2B').closest('.base');
      const thirdBase = screen.getByText('3B').closest('.base');

      expect(firstBase).toHaveClass('occupied');
      expect(secondBase).toHaveClass('occupied');
      expect(thirdBase).toHaveClass('occupied');

      const runnerIndicators = screen.getAllByText('◆');
      expect(runnerIndicators).toHaveLength(3);
    });
  });

  describe('Current Batter Information and Stats', () => {
    it('should display current batter with complete information', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('#12 Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('1st │ RF │ 0-0 today')).toBeInTheDocument();
    });

    it('should show placeholder when no current batter', () => {
      const noBatterState = {
        ...mockActiveGameState,
        currentBatter: null,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: noBatterState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Select next batter')).toBeInTheDocument();
    });

    it('should display correct ordinal for batting order', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('1st │ RF │ 0-0 today')).toBeInTheDocument();
    });

    it('should handle different batting order ordinals', () => {
      const secondBatter = {
        ...mockCurrentBatter,
        battingOrder: 2,
      };

      const secondBatterState = {
        ...mockActiveGameState,
        currentBatter: secondBatter,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: secondBatterState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('2nd │ RF │ 0-0 today')).toBeInTheDocument();
    });

    it('should handle third batting order ordinal', () => {
      const thirdBatter = {
        ...mockCurrentBatter,
        battingOrder: 3,
      };

      const thirdBatterState = {
        ...mockActiveGameState,
        currentBatter: thirdBatter,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: thirdBatterState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('3rd │ RF │ 0-0 today')).toBeInTheDocument();
    });

    it('should handle fourth and higher batting order ordinals', () => {
      const fourthBatter = {
        ...mockCurrentBatter,
        battingOrder: 4,
      };

      const fourthBatterState = {
        ...mockActiveGameState,
        currentBatter: fourthBatter,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: fourthBatterState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('4th │ RF │ 0-0 today')).toBeInTheDocument();
    });
  });

  describe('Score Display and Game Status', () => {
    it('should display correct score format', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('HOME 5 - 3 AWAY')).toBeInTheDocument();
    });

    it('should handle missing scores gracefully', () => {
      const gameWithoutScores = {
        ...mockGameData,
        homeScore: undefined,
        awayScore: undefined,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        currentGame: gameWithoutScores,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('HOME 0 - 0 AWAY')).toBeInTheDocument();
    });

    it('should display correct outs count', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('1 Outs')).toBeInTheDocument();
    });

    it('should handle different outs counts', () => {
      const twoOutsState = {
        ...mockActiveGameState,
        outs: 2,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: twoOutsState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('2 Outs')).toBeInTheDocument();
    });
  });

  describe('Navigation Protection During Active Games', () => {
    it('should set up navigation guard with correct parameters', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(mockUseNavigationGuard).toHaveBeenCalledWith(
        true, // isGameActive
        expect.any(Function), // callback function
        "Game in progress. Your progress will be saved but you'll need to resume manually. Continue?"
      );
    });

    it('should call showNavigationWarning when navigation guard triggers', () => {
      let guardCallback: (() => void) | undefined;

      mockUseNavigationGuard.mockImplementation((isActive, callback, _message) => {
        guardCallback = callback;
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      // Simulate navigation guard callback
      if (guardCallback) {
        guardCallback();
      }

      expect(mockUIStore.showNavigationWarning).toHaveBeenCalled();
    });

    it('should not set up navigation guard when game is not active', () => {
      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        isGameActive: false,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(mockUseNavigationGuard).toHaveBeenCalledWith(
        false, // isGameActive
        expect.any(Function),
        expect.any(String)
      );
    });
  });

  describe('Inning Display with Ordinal Formatting', () => {
    it('should display 1st inning correctly', () => {
      const firstInningState = {
        ...mockActiveGameState,
        currentInning: 1,
        isTopHalf: true,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: firstInningState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Top 1st')).toBeInTheDocument();
    });

    it('should display 2nd inning correctly', () => {
      const secondInningState = {
        ...mockActiveGameState,
        currentInning: 2,
        isTopHalf: false,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: secondInningState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Bottom 2nd')).toBeInTheDocument();
    });

    it('should display 3rd inning correctly', () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Top 3rd')).toBeInTheDocument();
    });

    it('should display 4th and higher innings correctly', () => {
      const seventhInningState = {
        ...mockActiveGameState,
        currentInning: 7,
        isTopHalf: false,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: seventhInningState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Bottom 7th')).toBeInTheDocument();
    });

    it('should handle bottom inning display', () => {
      const bottomInningState = {
        ...mockActiveGameState,
        isTopHalf: false,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: bottomInningState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('Bottom 3rd')).toBeInTheDocument();
    });
  });

  describe('Component State Management and Cleanup', () => {
    it('should handle component unmount without errors', () => {
      const { unmount } = render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid action button clicks', async () => {
      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      const singleButton = screen.getByTestId('action-single');

      // Rapid clicks
      await user.click(singleButton);
      await user.click(singleButton);
      await user.click(singleButton);

      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      expect(mockConsoleLog).toHaveBeenCalledWith('Recording action: single');
    });

    it('should handle state changes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      // Change to different game state
      const newState = {
        ...mockActiveGameState,
        outs: 2,
        currentInning: 4,
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: newState,
      });

      rerender(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      expect(screen.getByText('2 Outs')).toBeInTheDocument();
      expect(screen.getByText('Top 4th')).toBeInTheDocument();
    });
  });
});
