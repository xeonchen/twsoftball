import { renderHook, act } from '@testing-library/react';

import { useGameStore } from './gameStore';

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useGameStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameStore());

    expect(result.current.currentGame).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle setting game state', () => {
    const { result } = renderHook(() => useGameStore());

    const gameData = {
      id: 'test-game',
      homeTeam: 'Warriors',
      awayTeam: 'Eagles',
      status: 'active' as const,
    };

    act(() => {
      result.current.setCurrentGame(gameData);
    });

    expect(result.current.currentGame?.homeTeam).toBe('Warriors');
    expect(result.current.currentGame?.awayTeam).toBe('Eagles');
    expect(result.current.currentGame?.id).toBe('test-game');
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useGameStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle error state', () => {
    const { result } = renderHook(() => useGameStore());
    const errorMessage = 'Failed to load game';

    act(() => {
      result.current.setError(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);

    // Error should be cleared when setting new game
    act(() => {
      result.current.setCurrentGame({
        id: 'new-game',
        homeTeam: 'Team1',
        awayTeam: 'Team2',
        status: 'active' as const,
      });
    });

    expect(result.current.error).toBeNull();
  });

  it('should clear game data when reset is called', () => {
    const { result } = renderHook(() => useGameStore());

    // Set some data first
    act(() => {
      result.current.setCurrentGame({
        id: 'test-game',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active' as const,
      });
      result.current.setError('Some error');
    });

    expect(result.current.currentGame).not.toBeNull();
    expect(result.current.error).not.toBeNull();

    // Reset should clear everything
    act(() => {
      result.current.reset();
    });

    expect(result.current.currentGame).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle updating game score', () => {
    const { result } = renderHook(() => useGameStore());

    // Set initial game
    act(() => {
      result.current.setCurrentGame({
        id: 'test-game',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active' as const,
        homeScore: 0,
        awayScore: 0,
      });
    });

    // Update score
    act(() => {
      result.current.updateScore({ home: 3, away: 2 });
    });

    expect(result.current.currentGame?.homeScore).toBe(3);
    expect(result.current.currentGame?.awayScore).toBe(2);
  });
});
