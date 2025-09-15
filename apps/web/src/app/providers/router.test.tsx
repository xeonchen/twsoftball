import { render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AppRouter } from './router';

// Mock the route components since we're just testing routing logic
vi.mock('../../pages/HomePage', () => ({
  HomePage: (): ReactElement => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../../pages/GamePage', () => ({
  GamePage: (): ReactElement => <div data-testid="game-page">Game Page</div>,
}));

vi.mock('../../pages/NotFoundPage', () => ({
  NotFoundPage: (): ReactElement => <div data-testid="not-found-page">Page Not Found</div>,
}));

describe('Router Configuration', () => {
  it('should render home route correctly', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should render game route correctly', () => {
    render(
      <MemoryRouter initialEntries={['/game/123']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('game-page')).toBeInTheDocument();
  });

  it('should render not found page for invalid routes', () => {
    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
  });

  it('should handle navigation guards (placeholder for future auth)', () => {
    // For Phase 1B, this is a placeholder test
    // In future phases, this will test authentication-based route protection
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    );

    // Currently all routes are public, so home should render
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should handle route parameters correctly', () => {
    render(
      <MemoryRouter initialEntries={['/game/test-game-id']}>
        <AppRouter />
      </MemoryRouter>
    );

    // Game page should render when valid game ID is provided
    expect(screen.getByTestId('game-page')).toBeInTheDocument();
  });
});
