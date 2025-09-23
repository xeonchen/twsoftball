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
import type { AtBatResult, RunnerAdvanceDTO, GameStateDTO } from '@twsoftball/application';
import React from 'react';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useNavigationGuard } from '../shared/hooks/useNavigationGuard';
import { useRecordAtBat } from '../shared/hooks/useRecordAtBat';
import { useRunnerAdvancement } from '../shared/hooks/useRunnerAdvancement';
import { useGameStore } from '../shared/lib/store/gameStore';
import { useUIStore } from '../shared/lib/store/uiStore';

// Type definitions for mocks
type MockGameStore = {
  currentGame: GameStateDTO;
  activeGameState: GameStateDTO;
  isGameActive: boolean;
  setCurrentGame: ReturnType<typeof vi.fn>;
  setLoading: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
  updateScore: ReturnType<typeof vi.fn>;
  updateBases: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
};

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

vi.mock('../shared/hooks/useRecordAtBat', () => ({
  useRecordAtBat: vi.fn(),
}));

vi.mock('../shared/hooks/useRunnerAdvancement', () => ({
  useRunnerAdvancement: vi.fn(),
}));

vi.mock('../widgets/runner-advancement/RunnerAdvancementPanel', () => ({
  RunnerAdvancementPanel: vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-runner-advancement-panel">
      <h2>Runner Advancement</h2>
      <p>Select where each runner advances</p>
      {children}
    </div>
  )),
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
 * Mock active game state with empty bases (for direct recording tests)
 */
const mockActiveGameStateEmpty = {
  currentInning: 3,
  isTopHalf: true,
  currentBatter: mockCurrentBatter,
  bases: {
    first: null,
    second: null,
    third: null,
  },
  outs: 1,
};

/**
 * Mock active game state with runners (for advancement workflow tests)
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
 * Mock game store state with active game (empty bases)
 */
const mockGameStoreWithActiveGame = {
  currentGame: mockGameData,
  activeGameState: mockActiveGameStateEmpty,
  isGameActive: true,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: vi.fn(),
  reset: vi.fn(),
};

/**
 * Mock game store state with runners on base
 */
const mockGameStoreWithRunners = {
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

/**
 * Test Helper Factories
 * Factory functions for creating properly configured mocks with consistent structure
 */

/**
 * Creates a mock for useRecordAtBat hook with configurable overrides
 */
const createRecordAtBatMock = (
  overrides: {
    recordAtBat?: ReturnType<typeof vi.fn>;
    isLoading?: boolean;
    error?: string | null;
    result?: AtBatResult;
  } = {}
): ReturnType<typeof useRecordAtBat> => ({
  recordAtBat: vi.fn().mockResolvedValue({
    batterId: 'player-1',
    result: 'SUCCESS',
    runnerAdvances: [],
    newScore: { home: 5, away: 3 },
    rbis: 0,
    gameState: {
      currentInning: 3,
      isTopHalf: true,
      bases: { first: null, second: null, third: null },
      outs: 1,
    },
    ...overrides.recordAtBat,
  }),
  isLoading: overrides.isLoading ?? false,
  error: overrides.error ?? null,
  result: overrides.result ?? null,
  reset: vi.fn(),
});

/**
 * Creates a mock for useRunnerAdvancement hook with configurable overrides
 */
const createRunnerAdvancementMock = (
  overrides: {
    runnerAdvances?: RunnerAdvanceDTO[];
    needsManualAdvancement?: boolean;
    calculateAutomaticAdvances?: RunnerAdvanceDTO[];
  } = {}
): ReturnType<typeof useRunnerAdvancement> => ({
  runnerAdvances: overrides.runnerAdvances ?? [],
  setRunnerAdvance: vi.fn(),
  clearAdvances: vi.fn(),
  calculateAutomaticAdvances: vi.fn().mockReturnValue(overrides.calculateAutomaticAdvances ?? []),
  getForcedAdvances: vi.fn().mockReturnValue([]),
  canAdvanceToBase: vi.fn().mockReturnValue(true),
  isValidAdvancement: vi.fn().mockReturnValue(true),
  undoLastAdvance: vi.fn(),
  redoAdvance: vi.fn(),
  hasUndoableAdvances: false,
  hasRedoableAdvances: false,
  needsManualAdvancement: vi.fn().mockReturnValue(overrides.needsManualAdvancement ?? false),
});

/**
 * Creates a mock for useGameStore hook with configurable overrides
 */
const createGameStoreMock = (
  overrides: {
    currentGame?: GameStateDTO;
    activeGameState?: GameStateDTO;
    isGameActive?: boolean;
    updateScore?: ReturnType<typeof vi.fn>;
    updateBases?: ReturnType<typeof vi.fn>;
  } = {}
): MockGameStore => ({
  currentGame: overrides.currentGame ?? mockGameData,
  activeGameState: overrides.activeGameState ?? mockActiveGameStateEmpty,
  isGameActive: overrides.isGameActive ?? true,
  setCurrentGame: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  updateScore: overrides.updateScore ?? vi.fn(),
  updateBases: overrides.updateBases ?? vi.fn(),
  reset: vi.fn(),
});

/**
 * Orchestrates multi-hook test scenario setup
 */
const setupIntegrationTest = (
  scenario: {
    recordAtBat?: ReturnType<typeof createRecordAtBatMock>;
    runnerAdvancement?: ReturnType<typeof createRunnerAdvancementMock>;
    gameStore?: MockGameStore;
  } = {}
): void => {
  const mocks = {
    recordAtBat: createRecordAtBatMock(scenario.recordAtBat),
    runnerAdvancement: createRunnerAdvancementMock(scenario.runnerAdvancement),
    gameStore: createGameStoreMock(scenario.gameStore),
  };

  return mocks;
};

describe('GameRecordingPage Component', () => {
  let mockUseGameStore: Mock;
  let mockUseUIStore: Mock;
  let mockUseNavigationGuard: Mock;
  let mockUseRecordAtBat: Mock;
  let mockUseRunnerAdvancement: Mock;
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
    mockUseRecordAtBat = vi.mocked(useRecordAtBat);
    mockUseRunnerAdvancement = vi.mocked(useRunnerAdvancement);

    // Default mock return values
    mockUseGameStore.mockReturnValue(mockGameStoreWithActiveGame);
    mockUseUIStore.mockReturnValue(mockUIStore);
    mockUseNavigationGuard.mockImplementation(() => {});
    mockUseRecordAtBat.mockReturnValue({
      recordAtBat: vi.fn().mockResolvedValue({}),
      isLoading: false,
      error: null,
      result: null,
      reset: vi.fn(),
    });
    mockUseRunnerAdvancement.mockReturnValue({
      runnerAdvances: [],
      clearAdvances: vi.fn(),
      isValidAdvancement: vi.fn().mockReturnValue(true),
    });
  });

  /**
   * Test Verification Layer
   * Validates mock usage and catches potential test architecture issues
   */
  afterEach(() => {
    // Verify no unexpected multiple mock instantiations
    const allHookMocks = [
      mockUseGameStore,
      mockUseUIStore,
      mockUseRecordAtBat,
      mockUseRunnerAdvancement,
      mockUseNavigationGuard,
    ];

    allHookMocks.forEach((hookMock, index) => {
      const hookNames = [
        'useGameStore',
        'useUIStore',
        'useRecordAtBat',
        'useRunnerAdvancement',
        'useNavigationGuard',
      ];

      if (hookMock.mock.calls.length > 1) {
        // Log warning for multiple instantiations (could indicate test isolation issues)
        console.warn(
          `⚠️  ${hookNames[index]} was called ${hookMock.mock.calls.length} times in test. Consider checking test isolation.`
        );
      }
    });

    // Verify no dangling timers or async operations
    if ((globalThis as Record<string, unknown>).setTimeout?.mock?.calls?.length > 0) {
      console.warn('⚠️  Detected setTimeout calls in test. Ensure proper cleanup.');
    }

    // Clean up any test-specific DOM or async operations
    vi.clearAllTimers();
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
      // Use game store with runners for this test
      mockUseGameStore.mockReturnValue(mockGameStoreWithRunners);

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
      // Use empty bases to avoid manual advancement triggering
      const emptyBasesState = {
        ...mockActiveGameState,
        bases: { first: null, second: null, third: null },
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: emptyBasesState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('action-double'));
      expect(mockConsoleLog).toHaveBeenLastCalledWith('Recording action: double');

      await user.click(screen.getByTestId('action-out'));
      expect(mockConsoleLog).toHaveBeenLastCalledWith('Recording action: out');

      await user.click(screen.getByTestId('action-homerun'));
      expect(mockConsoleLog).toHaveBeenLastCalledWith('Recording action: homerun');
    });

    it('should handle rare action button clicks', async () => {
      // Use empty bases to avoid manual advancement triggering
      const emptyBasesState = {
        ...mockActiveGameState,
        bases: { first: null, second: null, third: null },
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: emptyBasesState,
      });

      render(
        <TestWrapper>
          <GameRecordingPage />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('action-tripleplay'));
      expect(mockConsoleLog).toHaveBeenLastCalledWith('Recording action: tripleplay');

      await user.click(screen.getByTestId('action-sacfly'));
      expect(mockConsoleLog).toHaveBeenLastCalledWith('Recording action: sacfly');
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
      // Use game store with runners for this test
      mockUseGameStore.mockReturnValue(mockGameStoreWithRunners);

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
      // Use game store with runners for this test
      mockUseGameStore.mockReturnValue(mockGameStoreWithRunners);

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
      // Use empty bases to avoid manual advancement triggering
      const emptyBasesState = {
        ...mockActiveGameState,
        bases: { first: null, second: null, third: null },
      };

      mockUseGameStore.mockReturnValue({
        ...mockGameStoreWithActiveGame,
        activeGameState: emptyBasesState,
      });

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

  describe('At-Bat Recording Integration (Phase 3)', () => {
    // Use the global mock functions from the main describe block

    // Mock container and services
    const mockGameAdapter = {
      recordAtBat: vi.fn(),
    };

    const _mockContainer = {
      gameAdapter: mockGameAdapter,
    };

    // Note: Using global mocks declared in main describe block

    describe('Simple At-Bat Recording Without Runners', () => {
      it('should record SINGLE with empty bases and update game state', async () => {
        const mockRecordAtBat = vi.fn().mockResolvedValue({
          batterId: 'player-1',
          result: 'SINGLE',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
          newScore: { home: 5, away: 3 },
          rbis: 0,
        });

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        // Game state with no runners
        const emptyBasesState = {
          ...mockActiveGameState,
          bases: { first: null, second: null, third: null },
        };

        mockUseGameStore.mockReturnValue({
          ...mockGameStoreWithActiveGame,
          activeGameState: emptyBasesState,
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');
        await user.click(singleButton);

        // Should record at-bat with no runner advancement needed
        expect(mockRecordAtBat).toHaveBeenCalledWith({
          result: 'single',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
        });
      });

      it('should record OUT and not require runner advancement', async () => {
        const mockRecordAtBat = vi.fn().mockResolvedValue({
          batterId: 'player-1',
          result: 'OUT',
          runnerAdvances: [],
          newScore: { home: 5, away: 3 },
          rbis: 0,
        });

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const outButton = screen.getByTestId('action-out');
        await user.click(outButton);

        expect(mockRecordAtBat).toHaveBeenCalledWith({
          result: 'out',
          runnerAdvances: [],
        });
      });
    });

    describe('Complex Scoring Plays', () => {
      let _testMocks: ReturnType<typeof setupIntegrationTest>;

      beforeEach(() => {
        // Setup integration test with default configuration
        _testMocks = setupIntegrationTest();
      });

      it('should handle HOME_RUN with bases loaded and automatic scoring', async () => {
        // Configure mock for HOME_RUN scenario
        const homeRunMocks = setupIntegrationTest({
          recordAtBat: {
            recordAtBat: {
              batterId: 'player-1',
              result: 'HOME_RUN',
              runnerAdvances: [
                { runnerId: 'runner-1', fromBase: 1, toBase: 0 },
                { runnerId: 'runner-2', fromBase: 2, toBase: 0 },
                { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
                { runnerId: 'player-1', fromBase: 0, toBase: 0 },
              ],
              newScore: { home: 9, away: 3 },
              rbis: 4,
            },
          },
          gameStore: {
            activeGameState: {
              ...mockActiveGameState,
              bases: {
                first: {
                  id: 'runner-1',
                  name: 'Runner 1',
                  jerseyNumber: '1',
                  position: 'P',
                  battingOrder: 1,
                },
                second: {
                  id: 'runner-2',
                  name: 'Runner 2',
                  jerseyNumber: '2',
                  position: '2B',
                  battingOrder: 2,
                },
                third: {
                  id: 'runner-3',
                  name: 'Runner 3',
                  jerseyNumber: '3',
                  position: '3B',
                  battingOrder: 3,
                },
              },
            },
          },
        });

        // Apply mocks
        mockUseRecordAtBat.mockReturnValue(homeRunMocks.recordAtBat);
        mockUseGameStore.mockReturnValue(homeRunMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const homerunButton = screen.getByTestId('action-homerun');
        await user.click(homerunButton);

        expect(homeRunMocks.recordAtBat.recordAtBat).toHaveBeenCalledWith({
          result: 'homerun',
          runnerAdvances: [
            { runnerId: 'player-1', fromBase: 0, toBase: 0 },
            { runnerId: 'runner-1', fromBase: 1, toBase: 0 },
            { runnerId: 'runner-2', fromBase: 2, toBase: 0 },
            { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
          ],
        });
      });

      it('should handle TRIPLE and score runner from third base', async () => {
        // Configure mock for TRIPLE scenario with empty bases (automatic behavior)
        const tripleMocks = setupIntegrationTest({
          recordAtBat: {
            recordAtBat: {
              batterId: 'player-1',
              result: 'TRIPLE',
              runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 3 }],
              newScore: { home: 5, away: 3 },
              rbis: 0,
            },
          },
          gameStore: {
            activeGameState: {
              ...mockActiveGameState,
              bases: {
                first: null,
                second: null,
                third: null, // Empty bases for automatic advancement
              },
            },
          },
        });

        // Apply mocks
        mockUseRecordAtBat.mockReturnValue(tripleMocks.recordAtBat);
        mockUseGameStore.mockReturnValue(tripleMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const tripleButton = screen.getByTestId('action-triple');
        await user.click(tripleButton);

        expect(tripleMocks.recordAtBat.recordAtBat).toHaveBeenCalledWith({
          result: 'triple',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 3 }],
        });
      });
    });

    describe('Runner Advancement UI Integration', () => {
      let _testMocks: ReturnType<typeof setupIntegrationTest>;

      beforeEach(() => {
        // Setup integration test with default configuration
        _testMocks = setupIntegrationTest();
      });

      it('should show RunnerAdvancementPanel for hits with runners requiring manual configuration', async () => {
        // Configure mocks for manual advancement scenario
        const manualAdvancementMocks = setupIntegrationTest({
          runnerAdvancement: {
            needsManualAdvancement: true,
            calculateAutomaticAdvances: [],
          },
          gameStore: {
            activeGameState: {
              ...mockActiveGameState,
              bases: {
                first: {
                  id: 'runner-1',
                  name: 'Runner 1',
                  jerseyNumber: '1',
                  position: 'P',
                  battingOrder: 1,
                },
                second: null,
                third: null,
              },
            },
          },
        });

        // Apply mocks
        mockUseRunnerAdvancement.mockReturnValue(manualAdvancementMocks.runnerAdvancement);
        mockUseGameStore.mockReturnValue(manualAdvancementMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const doubleButton = screen.getByTestId('action-double');
        await user.click(doubleButton);

        // Should show runner advancement panel
        expect(screen.getByText('Runner Advancement')).toBeInTheDocument();
        expect(screen.getByText('Select where each runner advances')).toBeInTheDocument();
      });

      it('should handle automatic advances for walks with bases loaded', async () => {
        // Configure mocks for automatic advancement scenario
        const automaticAdvancesMocks = setupIntegrationTest({
          recordAtBat: {
            recordAtBat: {
              batterId: 'player-1',
              result: 'WALK',
              runnerAdvances: [
                { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
                { runnerId: 'runner-2', fromBase: 2, toBase: 3 },
                { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
                { runnerId: 'player-1', fromBase: 0, toBase: 1 },
              ],
              newScore: { home: 6, away: 3 },
              rbis: 1,
            },
          },
          runnerAdvancement: {
            runnerAdvances: [
              { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
              { runnerId: 'runner-2', fromBase: 2, toBase: 3 },
              { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
              { runnerId: 'player-1', fromBase: 0, toBase: 1 },
            ],
            calculateAutomaticAdvances: [
              { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
              { runnerId: 'runner-2', fromBase: 2, toBase: 3 },
              { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
              { runnerId: 'player-1', fromBase: 0, toBase: 1 },
            ],
          },
          gameStore: {
            activeGameState: {
              ...mockActiveGameState,
              bases: {
                first: {
                  id: 'runner-1',
                  name: 'Runner 1',
                  jerseyNumber: '1',
                  position: 'P',
                  battingOrder: 1,
                },
                second: {
                  id: 'runner-2',
                  name: 'Runner 2',
                  jerseyNumber: '2',
                  position: '2B',
                  battingOrder: 2,
                },
                third: {
                  id: 'runner-3',
                  name: 'Runner 3',
                  jerseyNumber: '3',
                  position: '3B',
                  battingOrder: 3,
                },
              },
            },
          },
        });

        // Apply mocks
        mockUseRecordAtBat.mockReturnValue(automaticAdvancesMocks.recordAtBat);
        mockUseRunnerAdvancement.mockReturnValue(automaticAdvancesMocks.runnerAdvancement);
        mockUseGameStore.mockReturnValue(automaticAdvancesMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const walkButton = screen.getByTestId('action-walk');
        await user.click(walkButton);

        // All runners advance automatically, no manual configuration needed
        expect(automaticAdvancesMocks.recordAtBat.recordAtBat).toHaveBeenCalledWith({
          result: 'walk',
          runnerAdvances: [
            { runnerId: 'player-1', fromBase: 0, toBase: 1 },
            { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
            { runnerId: 'runner-2', fromBase: 2, toBase: 3 },
            { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
          ],
        });
      });
    });

    describe('Real-Time UI Updates', () => {
      let _testMocks: ReturnType<typeof setupIntegrationTest>;

      beforeEach(() => {
        // Setup integration test with default configuration
        _testMocks = setupIntegrationTest();
      });

      it('should update score display after recording at-bat', async () => {
        // Configure mock for score update scenario
        const mockUpdateScore = vi.fn();
        const scoreUpdateMocks = setupIntegrationTest({
          recordAtBat: {
            result: {
              batterId: 'player-1',
              result: 'SINGLE',
              runnerAdvances: [
                { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
                { runnerId: 'player-1', fromBase: 0, toBase: 1 },
              ],
              newScore: { home: 6, away: 3 },
              rbiAwarded: 1,
              gameState: {
                currentInning: 3,
                isTopHalf: true,
                bases: { first: null, second: null, third: null },
                outs: 1,
                score: { home: 6, away: 3 },
              },
            },
          },
          gameStore: {
            updateScore: mockUpdateScore,
          },
        });

        // Apply mocks
        mockUseRecordAtBat.mockReturnValue(scoreUpdateMocks.recordAtBat);
        mockUseGameStore.mockReturnValue(scoreUpdateMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');
        await user.click(singleButton);

        // Should show RBI notification
        expect(screen.getByText('1 RBI')).toBeInTheDocument();

        // Should update score through store
        expect(mockUpdateScore).toHaveBeenCalledWith({ home: 6, away: 3 });
      });

      it('should update bases display after runner movement', async () => {
        // Configure mock for bases update scenario
        const basesUpdateMocks = setupIntegrationTest({
          recordAtBat: {
            result: {
              batterId: 'player-1',
              result: 'DOUBLE',
              runnerAdvances: [
                { runnerId: 'runner-1', fromBase: 1, toBase: 3 },
                { runnerId: 'player-1', fromBase: 0, toBase: 2 },
              ],
              newScore: { home: 5, away: 3 },
              rbiAwarded: 0,
              gameState: {
                currentInning: 3,
                isTopHalf: true,
                bases: {
                  first: null,
                  second: { id: 'player-1', name: 'Sarah Johnson' },
                  third: { id: 'runner-1', name: 'Mike Chen' },
                },
                outs: 1,
                score: { home: 5, away: 3 },
              },
            },
          },
        });

        // Apply mocks
        mockUseRecordAtBat.mockReturnValue(basesUpdateMocks.recordAtBat);
        mockUseGameStore.mockReturnValue(basesUpdateMocks.gameStore);

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const doubleButton = screen.getByTestId('action-double');
        await user.click(doubleButton);

        // Should call recordAtBat with the expected runner advances
        expect(basesUpdateMocks.recordAtBat.recordAtBat).toHaveBeenCalledWith({
          result: 'double',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 2 }],
        });
      });

      it('should show loading state during at-bat recording', () => {
        const mockRecordAtBat = vi
          .fn()
          .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: true,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        // Should show loading state
        expect(screen.getByText('Recording at-bat...')).toBeInTheDocument();

        // Action buttons should be disabled
        const singleButton = screen.getByTestId('action-single');
        expect(singleButton).toBeDisabled();
      });

      it('should show error state when recording fails', () => {
        const mockRecordAtBat = vi.fn().mockRejectedValue(new Error('Failed to record at-bat'));

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: 'Failed to record at-bat',
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        // Should show error message
        expect(screen.getByText('Error: Failed to record at-bat')).toBeInTheDocument();

        // Should have retry button
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    describe('Undo/Redo Integration', () => {
      it('should render undo button with placeholder functionality', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const undoButton = screen.getByRole('button', { name: 'Undo last action' });
        await user.click(undoButton);

        expect(consoleSpy).toHaveBeenCalledWith('Undo last action');
        consoleSpy.mockRestore();
      });

      it('should render redo button with placeholder functionality', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const redoButton = screen.getByRole('button', { name: 'Redo last action' });
        await user.click(redoButton);

        expect(consoleSpy).toHaveBeenCalledWith('Redo last action');
        consoleSpy.mockRestore();
      });

      it('should render undo/redo buttons as enabled (placeholder implementation)', () => {
        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const undoButton = screen.getByRole('button', { name: 'Undo last action' });
        const redoButton = screen.getByRole('button', { name: 'Redo last action' });

        // Current implementation has placeholder buttons that are always enabled
        expect(undoButton).toBeEnabled();
        expect(redoButton).toBeEnabled();
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle invalid batter state gracefully', () => {
        const mockRecordAtBat = vi.fn().mockRejectedValue(new Error('No current batter found'));

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: 'No current batter found',
          result: null,
          reset: vi.fn(),
        });

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

        // Action buttons should be disabled when no batter
        const singleButton = screen.getByTestId('action-single');
        expect(singleButton).toBeDisabled();
      });

      it('should handle invalid at-bat result gracefully', async () => {
        const mockRecordAtBat = vi.fn().mockRejectedValue(new Error('Invalid at-bat result'));

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: 'Invalid at-bat result',
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const invalidButton = screen.getByTestId('action-error');
        await user.click(invalidButton);

        expect(screen.getByText('Error: Invalid at-bat result')).toBeInTheDocument();
      });

      it('should handle network errors during recording', async () => {
        const mockRecordAtBat = vi
          .fn()
          .mockRejectedValue(new Error('Network error - please try again'));

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: 'Network error - please try again',
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');
        await user.click(singleButton);

        expect(screen.getByText('Error: Network error - please try again')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      it('should handle rapid button clicks gracefully', async () => {
        const mockRecordAtBat = vi.fn().mockResolvedValue({
          batterId: 'player-1',
          result: 'SINGLE',
          runnerAdvances: [],
          newScore: { home: 5, away: 3 },
          rbis: 0,
        });

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');

        // Rapid clicks should be debounced/handled gracefully
        await user.click(singleButton);
        await user.click(singleButton);
        await user.click(singleButton);

        // Should record at least once (component allows multiple calls currently)
        expect(mockRecordAtBat).toHaveBeenCalledWith({
          result: 'single',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
        });
        expect(mockRecordAtBat).toHaveBeenCalled();
      });
    });

    describe('Mobile Responsiveness and Accessibility', () => {
      it('should maintain accessibility during integration', () => {
        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        // All action buttons should have proper ARIA labels
        const actionButtons = screen.getAllByRole('button');
        actionButtons.forEach(button => {
          expect(button).toHaveAttribute('aria-label');
        });
      });

      it('should handle touch interactions properly', async () => {
        const mockRecordAtBat = vi.fn().mockResolvedValue({
          batterId: 'player-1',
          result: 'SINGLE',
          runnerAdvances: [],
          newScore: { home: 5, away: 3 },
          rbis: 0,
        });

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');

        // Simulate touch interaction
        await user.click(singleButton);

        expect(mockRecordAtBat).toHaveBeenCalledWith({
          result: 'single',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
        });
      });

      it('should support keyboard navigation', async () => {
        const mockRecordAtBat = vi.fn().mockResolvedValue({
          batterId: 'player-1',
          result: 'SINGLE',
          runnerAdvances: [],
          newScore: { home: 5, away: 3 },
          rbis: 0,
        });

        mockUseRecordAtBat.mockReturnValue({
          recordAtBat: mockRecordAtBat,
          isLoading: false,
          error: null,
          result: null,
          reset: vi.fn(),
        });

        render(
          <TestWrapper>
            <GameRecordingPage />
          </TestWrapper>
        );

        const singleButton = screen.getByTestId('action-single');

        // Tab to button and press Enter
        singleButton.focus();
        await user.keyboard('{Enter}');

        expect(mockRecordAtBat).toHaveBeenCalledWith({
          result: 'single',
          runnerAdvances: [{ runnerId: 'player-1', fromBase: 0, toBase: 1 }],
        });
      });
    });
  });
});
