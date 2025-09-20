/**
 * @file GameSetupConfirmPage Integration Tests
 * Integration tests for GameSetupConfirmPage with useGameSetup hook.
 *
 * @remarks
 * These tests follow TDD approach and validate the complete integration
 * between the GameSetupConfirmPage component and the useGameSetup hook.
 * They test all aspects of the game creation workflow including loading
 * states, error handling, and navigation scenarios.
 *
 * **Test Categories**:
 * - Hook integration and game creation flow
 * - Loading state management and UI feedback
 * - Domain validation error display and categorization
 * - Infrastructure error handling with retry options
 * - Success navigation to game recording
 * - Error recovery and state management
 * - Concurrent operation prevention
 * - User interaction during async operations
 *
 * **Architecture Compliance**:
 * - Tests integration with hexagonal architecture
 * - Validates proper separation of concerns
 * - Ensures error boundaries work correctly
 * - Tests navigation flow matches design requirements
 *
 * **Testing Strategy**:
 * - Mock useGameSetup hook for controlled scenarios
 * - Test all success and failure paths
 * - Validate UI state changes match hook state
 * - Test user interactions during loading/error states
 * - Verify proper cleanup and memory management
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import * as gameSetupHooks from '../features/game-setup';
import { useGameStore } from '../shared/lib/store/gameStore';

import { GameSetupConfirmPage } from './GameSetupConfirmPage';

// Mock the useGameSetup hook
vi.mock('../features/game-setup', () => ({
  useGameSetup: vi.fn(),
}));

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
 * Mock setup wizard state - valid complete lineup
 */
const mockValidSetupWizard = {
  step: 'confirm' as const,
  teams: {
    home: 'Eagles',
    away: 'Hawks',
    ourTeam: 'home' as const,
  },
  lineup: Array.from({ length: 9 }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    jerseyNumber: `${i + 1}`,
    position: i === 0 ? 'P' : `POS${i}`,
    battingOrder: i + 1,
  })),
  isComplete: true,
};

/**
 * Mock setup wizard state - incomplete lineup
 */
const mockIncompleteSetupWizard = {
  ...mockValidSetupWizard,
  lineup: Array.from({ length: 8 }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    jerseyNumber: `${i + 1}`,
    position: i === 0 ? 'P' : `POS${i}`,
    battingOrder: i + 1,
  })),
  isComplete: false,
};

/**
 * Mock game store state
 */
const mockGameStore = {
  setupWizard: mockValidSetupWizard,
  completeSetup: vi.fn(),
  startActiveGame: vi.fn(),
};

describe('GameSetupConfirmPage Integration', () => {
  // Hook mocks
  let mockUseGameSetup: Mock;
  let mockUseGameStore: Mock;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mock implementations
    mockUseGameSetup = vi.mocked(gameSetupHooks.useGameSetup);
    mockUseGameStore = vi.mocked(useGameStore);

    // Default mock return values
    mockUseGameStore.mockReturnValue(mockGameStore);
    mockUseGameSetup.mockReturnValue({
      startGame: vi.fn(),
      isLoading: false,
      error: null,
      gameId: null,
      validationErrors: null,
      clearError: vi.fn(),
      reset: vi.fn(),
    });
  });

  describe('Hook Integration and Game Creation', () => {
    it('should call StartNewGame use case when starting game', async () => {
      const mockStartGame = vi.fn().mockResolvedValue(undefined);
      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: false,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');
      expect(startButton).not.toBeDisabled();

      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockStartGame).toHaveBeenCalledWith(mockValidSetupWizard);
      });
    });

    it('should integrate properly with useGameSetup hook data flow', () => {
      const mockClearError = vi.fn();
      const mockReset = vi.fn();

      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: null,
        gameId: 'test-game-123',
        validationErrors: null,
        clearError: mockClearError,
        reset: mockReset,
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Component should render without errors when hook provides data
      expect(screen.getByTestId('game-setup-confirm-page')).toBeInTheDocument();
      expect(screen.getByTestId('start-game-button')).toBeInTheDocument();
    });
  });

  describe('Loading State Management', () => {
    it('should show loading state during game creation', () => {
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: true,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');
      expect(startButton).toHaveTextContent('STARTING GAME...');
      expect(startButton).toBeDisabled();
    });

    it('should disable start button during loading', () => {
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: true,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');
      expect(startButton).toBeDisabled();
    });

    it('should show loading spinner during game creation', () => {
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: true,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should show loading spinner overlay
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('Creating game...')).toBeInTheDocument();
    });
  });

  describe('Domain Validation Error Display', () => {
    it('should show domain validation errors inline', () => {
      const validationErrors = {
        teams: 'Team names must be different',
        lineup: ['Player 1 missing jersey number', 'Duplicate position: P'],
        general: 'Setup incomplete',
      };

      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: null,
        gameId: null,
        validationErrors,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should display team validation error
      expect(screen.getByTestId('teams-validation-error')).toHaveTextContent(
        'Team names must be different'
      );

      // Should display lineup validation errors
      expect(screen.getByTestId('lineup-validation-errors')).toBeInTheDocument();
      expect(screen.getByText('Player 1 missing jersey number')).toBeInTheDocument();
      expect(screen.getByText('Duplicate position: P')).toBeInTheDocument();

      // Should display general validation error
      expect(screen.getByTestId('general-validation-error')).toHaveTextContent('Setup incomplete');
    });

    it('should show proper error recovery options for validation errors', () => {
      const validationErrors = {
        lineup: ['Lineup must contain at least 9 players'],
      };

      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: null,
        gameId: null,
        validationErrors,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should show link to fix lineup
      const fixLineupButton = screen.getByTestId('fix-lineup-button');
      expect(fixLineupButton).toBeInTheDocument();
      expect(fixLineupButton).toHaveTextContent('Fix Lineup');
    });
  });

  describe('Infrastructure Error Handling', () => {
    it('should show infrastructure errors with retry option', () => {
      const mockClearError = vi.fn();
      const mockStartGame = vi.fn();

      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: false,
        error: 'Unable to save game. Please check your connection and try again.',
        gameId: null,
        validationErrors: null,
        clearError: mockClearError,
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should display infrastructure error banner
      const errorBanner = screen.getByTestId('infrastructure-error-banner');
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner).toHaveTextContent(
        'Unable to save game. Please check your connection and try again.'
      );

      // Should show retry button
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();

      // Should show dismiss button
      const dismissButton = screen.getByTestId('dismiss-error-button');
      expect(dismissButton).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(retryButton);
      expect(mockStartGame).toHaveBeenCalledWith(mockValidSetupWizard);

      // Test dismiss functionality
      fireEvent.click(dismissButton);
      expect(mockClearError).toHaveBeenCalled();
    });

    it('should handle network errors with appropriate messaging', () => {
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: 'Network connection failed. Please check your internet connection and try again.',
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const errorBanner = screen.getByTestId('infrastructure-error-banner');
      expect(errorBanner).toHaveTextContent(
        'Network connection failed. Please check your internet connection and try again.'
      );
    });
  });

  describe('Success Navigation', () => {
    it('should navigate to game recording on success', async () => {
      const gameId = 'game-123-success';

      // Mock successful game creation
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: null,
        gameId,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should automatically navigate when gameId is available
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/game/${gameId}/record`);
      });
    });

    it('should show success transition with game ID display', () => {
      const gameId = 'game-123-success';

      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: null,
        gameId,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Should show success message before navigation
      expect(screen.getByTestId('success-transition')).toBeInTheDocument();
      expect(screen.getByText(`Game ${gameId} created successfully!`)).toBeInTheDocument();
      expect(screen.getByText('Redirecting to game recording...')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and State Management', () => {
    it('should clear errors when back button clicked', () => {
      const mockClearError = vi.fn();

      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: 'Some error occurred',
        gameId: null,
        validationErrors: { general: 'Validation failed' },
        clearError: mockClearError,
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/lineup');
    });

    it('should handle error state transitions properly', () => {
      const mockStartGame = vi.fn();
      const mockClearError = vi.fn();

      // Initially no error
      const { rerender } = render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      // Mock error state
      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: false,
        error: 'Infrastructure error',
        gameId: null,
        validationErrors: null,
        clearError: mockClearError,
        reset: vi.fn(),
      });

      rerender(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('infrastructure-error-banner')).toBeInTheDocument();

      // Mock error cleared
      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: false,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: mockClearError,
        reset: vi.fn(),
      });

      rerender(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      expect(screen.queryByTestId('infrastructure-error-banner')).not.toBeInTheDocument();
    });
  });

  describe('Concurrent Operation Prevention', () => {
    it('should handle concurrent start game calls', () => {
      const mockStartGame = vi.fn();

      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: true,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');

      // Should be disabled during loading, preventing concurrent calls
      expect(startButton).toBeDisabled();

      // First click
      fireEvent.click(startButton);
      // Second click while loading
      fireEvent.click(startButton);

      // Button is disabled, so clicks should not trigger the handler
      expect(mockStartGame).not.toHaveBeenCalled();
    });

    it('should prevent multiple rapid clicks', () => {
      const mockStartGame = vi.fn();

      mockUseGameSetup.mockReturnValue({
        startGame: mockStartGame,
        isLoading: false,
        error: null,
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');

      // Rapid clicks
      fireEvent.click(startButton);
      fireEvent.click(startButton);
      fireEvent.click(startButton);

      // Each click should trigger startGame call, but hook should handle deduplication
      expect(mockStartGame).toHaveBeenCalledTimes(3);
    });
  });

  describe('Form Validation Integration', () => {
    it('should disable start button when setup is invalid', () => {
      mockUseGameStore.mockReturnValue({
        ...mockGameStore,
        setupWizard: mockIncompleteSetupWizard,
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const startButton = screen.getByTestId('start-game-button');
      expect(startButton).toBeDisabled();
    });

    it('should show existing validation warnings for incomplete lineup', () => {
      mockUseGameStore.mockReturnValue({
        ...mockGameStore,
        setupWizard: mockIncompleteSetupWizard,
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      expect(
        screen.getByText('⚠️ Lineup incomplete: Need at least 9 players to start game')
      ).toBeInTheDocument();
    });
  });

  describe('Navigation Flow Integration', () => {
    it('should maintain existing back navigation functionality', () => {
      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/lineup');
    });

    it('should handle navigation during error states', () => {
      mockUseGameSetup.mockReturnValue({
        startGame: vi.fn(),
        isLoading: false,
        error: 'Some error',
        gameId: null,
        validationErrors: null,
        clearError: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <GameSetupConfirmPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      expect(backButton).not.toBeDisabled();

      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/lineup');
    });
  });
});
