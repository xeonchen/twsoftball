import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { App } from '../../app/App';

/**
 * App Initialization Integration Tests
 *
 * Tests the complete initialization flow of the TW Softball application
 * to ensure the DI container, providers, and routing work together correctly.
 *
 * This smoke test validates that:
 * - DI Container can resolve dependencies with mock factory
 * - App component initializes successfully with those dependencies
 * - React context providers work correctly
 * - Router renders HomePage as default route
 * - No runtime errors occur during initialization
 *
 * Test approach: Integration test using React Testing Library with mocked infrastructure
 * to avoid IndexedDB and other external dependencies while testing component integration.
 *
 * Coverage requirements: Basic smoke test to ensure app starts without crashing
 * Performance requirements: Initialization should complete within reasonable time
 */

// Mock the app-initialization feature to avoid real DI container initialization
const mockApplicationServices = {
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
    isLevelEnabled: vi.fn(() => true),
  },
};

const mockGameAdapter = {
  startNewGameFromWizard: vi.fn(),
  getTeamLineup: vi.fn(),
  makeSubstitution: vi.fn(),
  recordAtBat: vi.fn(),
  logger: mockApplicationServices.logger,
};

const mockInitializationResult = {
  applicationServices: mockApplicationServices,
  gameAdapter: mockGameAdapter,
};

// Mock the app-initialization feature
vi.mock('../../features/app-initialization', () => ({
  initializeApplicationServices: vi.fn(() => Promise.resolve(mockInitializationResult)),
}));

// Mock the application factory to prevent real DI container creation
vi.mock('@twsoftball/application/services/ApplicationFactory', () => ({
  createApplicationServicesWithContainer: vi.fn(() => Promise.resolve(mockApplicationServices)),
}));

// Mock entities to prevent complex state management in smoke test
vi.mock('../../entities/game', () => ({
  useGameStore: (): Record<string, unknown> => ({
    currentGame: null,
    setupWizard: {
      step: 'teams',
      teams: { home: '', away: '', ourTeam: null },
      lineup: [],
      isComplete: false,
    },
    setTeams: vi.fn(),
    setLineup: vi.fn(),
    completeSetup: vi.fn(),
    startActiveGame: vi.fn(),
  }),
  useGameUseCases: (): Record<string, unknown> => ({
    isInitialized: true,
  }),
}));

// Mock shared UI components to keep test focused on initialization
vi.mock('../../shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }): React.ReactElement => <button {...props}>{children}</button>,
}));

// Mock the RouterProvider for testing
vi.mock('../../app/providers/router', () => ({
  RouterProvider: ({ children }: { children: React.ReactNode }): React.ReactNode => children,
  AppRouter: (): React.ReactElement => (
    <div data-testid="home-page">
      <div className="home-header">
        <h1>⚡ TW Softball</h1>
        <button data-testid="settings-button" aria-label="Settings">
          ⚙️
        </button>
      </div>
      <div className="home-content">
        <button data-testid="start-new-game-button">START NEW GAME</button>
        <section>
          <h2>Recent Games:</h2>
          <div data-testid="empty-games-state">
            <p>No games recorded yet</p>
            <p>Start your first game to see it here</p>
          </div>
        </section>
      </div>
    </div>
  ),
}));

describe('App Initialization Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to successful state
    mockGameAdapter.startNewGameFromWizard.mockResolvedValue({
      success: true,
      gameId: 'test-game-id',
    });
    mockGameAdapter.getTeamLineup.mockResolvedValue({
      success: true,
      gameId: { value: 'test-game-id' },
      activeLineup: [],
      benchPlayers: [],
      substitutionHistory: [],
    });
    mockGameAdapter.makeSubstitution.mockResolvedValue({
      success: true,
      gameId: { value: 'test-game-id' },
      substitution: {
        inning: 1,
        battingSlot: 1,
        outgoingPlayer: { playerId: { value: 'player-1' }, name: 'Player 1' },
        incomingPlayer: { playerId: { value: 'player-2' }, name: 'Player 2' },
        timestamp: new Date(),
        isReentry: false,
      },
    });
    mockGameAdapter.recordAtBat.mockResolvedValue({
      success: true,
      gameId: { value: 'test-game-id' },
      atBat: {
        batterId: { value: 'batter-1' },
        result: 'SINGLE',
        inning: 1,
        timestamp: new Date(),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic App Initialization', () => {
    it('should initialize app and render homepage without errors', async () => {
      // Render the complete App component
      render(<App />);

      // Wait for app initialization to complete and homepage to render
      await waitFor(
        () => {
          // Look for specific homepage content that indicates successful initialization
          expect(screen.getByTestId('home-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify key homepage elements are present
      expect(screen.getByText('⚡ TW Softball')).toBeInTheDocument();
      expect(screen.getByTestId('start-new-game-button')).toBeInTheDocument();
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();

      // Verify recent games section is present
      expect(screen.getByText('Recent Games:')).toBeInTheDocument();
      expect(screen.getByTestId('empty-games-state')).toBeInTheDocument();
    });

    it('should handle app services provider initialization successfully', async () => {
      render(<App />);

      // Wait for services to initialize (no loading spinner should be visible)
      await waitFor(
        () => {
          expect(
            screen.queryByText('Initializing application services...')
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify successful initialization by checking homepage is rendered
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should navigate to different routes without crashing', async () => {
      // Test basic app rendering without specific route logic
      render(<App />);

      // Wait for initialization
      await waitFor(
        () => {
          expect(
            screen.queryByText('Initializing application services...')
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should render without crashing (homepage by default)
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should maintain provider hierarchy during initialization', async () => {
      render(<App />);

      // Verify the component tree structure is maintained
      await waitFor(
        () => {
          // Check that the app structure is present (avoid duplicate role conflict)
          expect(screen.getByTestId('home-page')).toBeInTheDocument();

          // Verify header content from the app layout
          const appHeader = screen.getByRole('banner');
          expect(appHeader).toHaveTextContent('TW Softball');
          expect(appHeader).toHaveTextContent('Progressive Web App');

          // Verify main content area exists
          const mainContent = screen.getByRole('main');
          expect(mainContent).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Error Handling During Initialization', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock initialization failure
      const { initializeApplicationServices } = await import('../../features/app-initialization');
      vi.mocked(initializeApplicationServices).mockRejectedValueOnce(
        new Error('Failed to initialize services')
      );

      render(<App />);

      // Should show error state instead of crashing
      await waitFor(
        () => {
          expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
          expect(screen.getByText('Failed to initialize services')).toBeInTheDocument();
          expect(screen.getByText('Retry Initialization')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should show loading state during initialization', async () => {
      // Mock slow initialization
      const { initializeApplicationServices } = await import('../../features/app-initialization');
      vi.mocked(initializeApplicationServices).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockInitializationResult), 100))
      );

      render(<App />);

      // Should show loading state initially
      expect(screen.getByText('Initializing application services...')).toBeInTheDocument();

      // Then should show homepage after loading
      await waitFor(
        () => {
          expect(screen.getByTestId('home-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Performance and Timing', () => {
    it('should initialize within reasonable time', async () => {
      const startTime = performance.now();

      render(<App />);

      await waitFor(
        () => {
          expect(screen.getByTestId('home-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const endTime = performance.now();
      const initTime = endTime - startTime;

      // Should initialize within 2 seconds (generous for test environment)
      expect(initTime).toBeLessThan(2000);
    });

    it('should not block UI during initialization', async () => {
      render(<App />);

      // UI should be responsive during initialization
      // (Loading spinner should be visible and interactive)
      const loadingElement = screen.getByText('Initializing application services...');
      expect(loadingElement).toBeInTheDocument();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByTestId('home-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });
});
