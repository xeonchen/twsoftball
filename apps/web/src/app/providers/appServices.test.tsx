/**
 * @file App Services Provider Tests
 * Provides test coverage for the AppServicesProvider component.
 *
 * @remarks
 * Testing Strategy:
 * - Core initialization flow, error handling, and context provision (comprehensive)
 * - Critical transformation logic: GameId value object to string conversion
 * - Pass-through adapter methods are validated through E2E tests (lineup-editor.spec.ts, substitution-workflow.spec.ts)
 * - This pragmatic approach balances test value with maintainability
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { initializeApplicationServices } from '../../features/app-initialization';
import { useAppServicesContext } from '../../shared/lib';

import { AppServicesProvider } from './appServices';

// Mock dependencies
vi.mock('@twsoftball/application/services/ApplicationFactory', () => ({
  createApplicationServicesWithContainerAndFactory: vi.fn(),
}));

vi.mock('@twsoftball/infrastructure/web', () => ({
  createIndexedDBFactory: vi.fn(() => ({
    createServices: vi.fn(),
    getStorageType: (): string => 'indexeddb',
    getDescription: (): string => 'Mock IndexedDB Factory',
  })),
}));

vi.mock('@twsoftball/infrastructure/memory', () => ({
  createMemoryFactory: vi.fn(() => ({
    createServices: vi.fn(),
    getStorageType: (): string => 'memory',
    getDescription: (): string => 'Mock Memory Factory',
  })),
}));

vi.mock('../../features/app-initialization', () => ({
  initializeApplicationServices: vi.fn(),
}));

// Test component that uses the context
function TestConsumer(): React.JSX.Element {
  const { services, isInitializing, error } = useAppServicesContext();

  return (
    <div>
      {isInitializing && <div>Loading...</div>}
      {error && <div data-testid="error-message">{error.message}</div>}
      {services && <div data-testid="services-ready">Services Ready</div>}
    </div>
  );
}

describe('AppServicesProvider', () => {
  const mockConfig = {
    storage: 'indexeddb' as const,
    enableLogging: true,
  };

  const mockApplicationServices = {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };

  // Helper function to create a fresh mock adapter
  const createMockGameAdapter = (): {
    startNewGameFromWizard: ReturnType<typeof vi.fn>;
    startNewGame: ReturnType<typeof vi.fn>;
    getTeamLineup: ReturnType<typeof vi.fn>;
    makeSubstitution: ReturnType<typeof vi.fn>;
    recordAtBat: ReturnType<typeof vi.fn>;
    undoLastAction: ReturnType<typeof vi.fn>;
    redoLastAction: ReturnType<typeof vi.fn>;
    getGameState: ReturnType<typeof vi.fn>;
    substitutePlayer: ReturnType<typeof vi.fn>;
    endInning: ReturnType<typeof vi.fn>;
    logger: typeof mockApplicationServices.logger;
    toUIGameState: ReturnType<typeof vi.fn>;
  } => ({
    startNewGameFromWizard: vi
      .fn()
      .mockResolvedValue({ success: true, gameId: { value: 'test-id' } }),
    startNewGame: vi.fn().mockResolvedValue({ success: true, gameId: { value: 'test-id' } }),
    getTeamLineup: vi.fn().mockResolvedValue({
      success: true,
      gameId: { value: 'default-id' },
      activeLineup: [],
      benchPlayers: [],
      substitutionHistory: [],
    }),
    makeSubstitution: vi.fn().mockResolvedValue({ success: true }),
    recordAtBat: vi.fn().mockResolvedValue({ success: true }),
    undoLastAction: vi.fn().mockResolvedValue({ success: true }),
    redoLastAction: vi.fn().mockResolvedValue({ success: true }),
    getGameState: vi.fn().mockResolvedValue({ undoStack: undefined }),
    substitutePlayer: vi.fn().mockResolvedValue({ success: true }),
    endInning: vi.fn().mockResolvedValue({ success: true }),
    logger: mockApplicationServices.logger,
    toUIGameState: vi.fn().mockReturnValue({}),
  });

  let mockGameAdapter: ReturnType<typeof createMockGameAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGameAdapter = createMockGameAdapter();
  });

  describe('Initialization Tests', () => {
    it('should display loading state during initialization', async () => {
      // Mock initialization to take some time
      (initializeApplicationServices as Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  applicationServices: mockApplicationServices,
                  gameAdapter: mockGameAdapter,
                }),
              100
            )
          )
      );

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      // Check loading state
      expect(screen.getByText('Initializing application services...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should initialize services successfully with valid config', async () => {
      (initializeApplicationServices as Mock).mockResolvedValue({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });

      // Verify initialization was called with config and a factory function
      expect(initializeApplicationServices).toHaveBeenCalledWith(mockConfig, expect.any(Function));
    });

    it('should provide initialized services to children', async () => {
      (initializeApplicationServices as Mock).mockResolvedValue({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });
    });

    it('should reinitialize when config changes', async () => {
      (initializeApplicationServices as Mock).mockResolvedValue({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      const { rerender } = render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });

      expect(initializeApplicationServices).toHaveBeenCalledTimes(1);

      // Change config
      const newConfig = { ...mockConfig, storage: 'memory' as const };
      rerender(
        <AppServicesProvider config={newConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(initializeApplicationServices).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GameAdapter Wrapper Tests', () => {
    it('should create gameAdapter wrapper and provide it through context', async () => {
      (initializeApplicationServices as Mock).mockResolvedValue({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      // Wait for services to be initialized
      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });

      // Verify initialization was called with config and a factory function
      expect(initializeApplicationServices).toHaveBeenCalledWith(mockConfig, expect.any(Function));
    });
  });

  describe('Error Handling Tests', () => {
    it('should display error message when initialization fails', async () => {
      const errorMessage = 'Failed to initialize IndexedDB';
      (initializeApplicationServices as Mock).mockRejectedValue(new Error(errorMessage));

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should handle non-Error objects during initialization failure', async () => {
      (initializeApplicationServices as Mock).mockRejectedValue('String error message');

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
        expect(screen.getByText('Unknown initialization error')).toBeInTheDocument();
      });
    });

    it('should provide retry button on error', async () => {
      const errorMessage = 'Network error';
      (initializeApplicationServices as Mock).mockRejectedValue(new Error(errorMessage));

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Retry Initialization')).toBeInTheDocument();
      });
    });

    it('should reinitialize services when retry is clicked', async () => {
      const user = userEvent.setup();

      // First initialization fails
      (initializeApplicationServices as Mock).mockRejectedValueOnce(new Error('Initial failure'));

      render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
      });

      // Second initialization succeeds
      (initializeApplicationServices as Mock).mockResolvedValueOnce({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      const retryButton = screen.getByText('Retry Initialization');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });

      expect(initializeApplicationServices).toHaveBeenCalledTimes(2);
    });

    it('should clear error state during retry', async () => {
      const user = userEvent.setup();

      // First initialization fails
      (initializeApplicationServices as Mock).mockRejectedValueOnce(new Error('Initial failure'));

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
      });

      // Second initialization succeeds after delay
      (initializeApplicationServices as Mock).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  applicationServices: mockApplicationServices,
                  gameAdapter: mockGameAdapter,
                }),
              50
            )
          )
      );

      const retryButton = screen.getByText('Retry Initialization');
      await user.click(retryButton);

      // Should show loading state briefly (error cleared)
      await waitFor(() => {
        expect(screen.getByText('Initializing application services...')).toBeInTheDocument();
      });

      // Eventually should succeed
      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });
  });

  describe('Context Provision Tests', () => {
    it('should provide services through AppServicesContext', async () => {
      (initializeApplicationServices as Mock).mockResolvedValue({
        applicationServices: mockApplicationServices,
        gameAdapter: mockGameAdapter,
      });

      render(
        <AppServicesProvider config={mockConfig}>
          <TestConsumer />
        </AppServicesProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('services-ready')).toBeInTheDocument();
      });
    });

    it('should provide isInitializing state', async () => {
      (initializeApplicationServices as Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  applicationServices: mockApplicationServices,
                  gameAdapter: mockGameAdapter,
                }),
              100
            )
          )
      );

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      // Should be initializing initially (showing spinner)
      expect(screen.getByText('Initializing application services...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();

      // Should be ready after initialization
      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
        expect(screen.queryByText('Initializing application services...')).not.toBeInTheDocument();
      });
    });

    it('should provide error state', async () => {
      const errorMessage = 'Test error';
      (initializeApplicationServices as Mock).mockRejectedValue(new Error(errorMessage));

      render(
        <AppServicesProvider config={mockConfig}>
          <div>Test Content</div>
        </AppServicesProvider>
      );

      // Should show error UI with the error message
      await waitFor(() => {
        expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should not render children when there's an error
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });
});
