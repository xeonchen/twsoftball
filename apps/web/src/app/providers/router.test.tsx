import { render, screen, waitFor } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { AppRouter } from './router';

// Mock the route components since we're just testing routing logic
vi.mock('../../pages/home/HomePage', () => ({
  HomePage: (): ReactElement => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../../pages/game/GamePage', () => ({
  GamePage: (): ReactElement => <div data-testid="game-page">Game Page</div>,
}));

vi.mock('../../pages/not-found/NotFoundPage', () => ({
  NotFoundPage: (): ReactElement => <div data-testid="not-found-page">Page Not Found</div>,
}));

// Mock new page components for Phase 2
vi.mock('../../pages/settings/SettingsPage', () => ({
  SettingsPage: (): ReactElement => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock('../../pages/game-setup/GameSetupTeamsPage', () => ({
  GameSetupTeamsPage: (): ReactElement => (
    <div data-testid="game-setup-teams-page">Game Setup Teams</div>
  ),
}));

vi.mock('../../pages/game-setup/GameSetupLineupPage', () => ({
  GameSetupLineupPage: (): ReactElement => (
    <div data-testid="game-setup-lineup-page">Game Setup Lineup</div>
  ),
}));

vi.mock('../../pages/game-setup/GameSetupConfirmPage', () => ({
  GameSetupConfirmPage: (): ReactElement => (
    <div data-testid="game-setup-confirm-page">Game Setup Confirm</div>
  ),
}));

vi.mock('../../pages/game-recording/GameRecordingPage', () => ({
  GameRecordingPage: (): ReactElement => (
    <div data-testid="game-recording-page">Game Recording Page</div>
  ),
}));

vi.mock('../../pages/game-stats/GameStatsPage', () => ({
  GameStatsPage: (): ReactElement => <div data-testid="game-stats-page">Game Stats Page</div>,
}));

describe('Enhanced Router Configuration', () => {
  describe('Core Routes', () => {
    it('should render home route correctly', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should render settings route correctly', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('settings-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should render not found page for invalid routes', () => {
      render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
    });
  });

  describe('Game Setup Wizard Routes', () => {
    it('should handle teams setup route', async () => {
      render(
        <MemoryRouter initialEntries={['/game/setup/teams']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('game-setup-teams-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle lineup setup route', async () => {
      render(
        <MemoryRouter initialEntries={['/game/setup/lineup']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('game-setup-lineup-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle confirm setup route', async () => {
      render(
        <MemoryRouter initialEntries={['/game/setup/confirm']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('game-setup-confirm-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Game Recording Routes', () => {
    it('should handle game recording route with game ID', async () => {
      render(
        <MemoryRouter initialEntries={['/game/test-game-id/record']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('game-recording-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle game stats route with game ID', async () => {
      render(
        <MemoryRouter initialEntries={['/game/test-game-id/stats']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('game-stats-page')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle different game IDs correctly', () => {
      render(
        <MemoryRouter initialEntries={['/game/another-game-123/record']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('game-recording-page')).toBeInTheDocument();
    });
  });

  describe('Route Parameters', () => {
    it('should handle game ID parameters correctly', () => {
      render(
        <MemoryRouter initialEntries={['/game/uuid-123-456-789/stats']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('game-stats-page')).toBeInTheDocument();
    });

    it('should handle special characters in game IDs', () => {
      render(
        <MemoryRouter initialEntries={['/game/game-2025-03-15/record']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('game-recording-page')).toBeInTheDocument();
    });
  });

  describe('Navigation Guards (Browser Protection)', () => {
    it('should be prepared for browser navigation protection', () => {
      // This test validates the routing structure is ready for navigation guards
      // The actual navigation guard implementation will be tested separately
      render(
        <MemoryRouter initialEntries={['/game/active-game/record']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('game-recording-page')).toBeInTheDocument();
    });

    it('should support all routes required for navigation guard scenarios', () => {
      const criticalRoutes = [
        '/',
        '/game/test/record',
        '/game/test/stats',
        '/game/setup/teams',
        '/game/setup/lineup',
        '/game/setup/confirm',
        '/settings',
      ];

      criticalRoutes.forEach(route => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[route]}>
            <AppRouter />
          </MemoryRouter>
        );

        // Should not show 404 for any critical route
        expect(screen.queryByTestId('not-found-page')).not.toBeInTheDocument();
        unmount();
      });
    });
  });
});
