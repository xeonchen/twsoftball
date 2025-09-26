import { renderHook, act } from '@testing-library/react';

import type { Player } from '../../../shared/lib/types';

import { useGameStore, type GameData } from './gameStore';

describe('Enhanced Game Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useGameStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useGameStore());

      expect(result.current.currentGame).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Enhanced state for Phase 2
      expect(result.current.setupWizard).toEqual({
        step: null,
        teams: { home: '', away: '', ourTeam: null },
        lineup: [],
        isComplete: false,
      });
      expect(result.current.activeGameState).toBeNull();
      expect(result.current.isGameActive).toBe(false);
    });
  });

  describe('Setup Wizard State Management', () => {
    it('should handle complete game setup wizard state', () => {
      const { result } = renderHook(() => useGameStore());

      // Test teams step
      act(() => {
        result.current.setSetupStep('teams');
        result.current.setTeams('Warriors', 'Eagles', 'home');
      });

      expect(result.current.setupWizard.step).toBe('teams');
      expect(result.current.setupWizard.teams).toEqual({
        home: 'Warriors',
        away: 'Eagles',
        ourTeam: 'home',
      });

      // Test lineup step
      const testLineup: Player[] = [
        { id: '1', name: 'John Doe', jerseyNumber: '12', position: 'SS', battingOrder: 1 },
        { id: '2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF', battingOrder: 2 },
      ];

      act(() => {
        result.current.setSetupStep('lineup');
        result.current.setLineup(testLineup);
      });

      expect(result.current.setupWizard.step).toBe('lineup');
      expect(result.current.setupWizard.lineup).toEqual(testLineup);

      // Test confirmation step
      act(() => {
        result.current.setSetupStep('confirm');
        result.current.completeSetup();
      });

      expect(result.current.setupWizard.step).toBe('confirm');
      expect(result.current.setupWizard.isComplete).toBe(true);
    });

    it('should validate team setup correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Invalid: empty team names
      act(() => {
        result.current.setTeams('', '', 'home');
      });
      expect(result.current.isSetupStepValid('teams')).toBe(false);

      // Invalid: same team names
      act(() => {
        result.current.setTeams('Warriors', 'Warriors', 'home');
      });
      expect(result.current.isSetupStepValid('teams')).toBe(false);

      // Invalid: no ourTeam selection
      act(() => {
        result.current.setTeams('Warriors', 'Eagles', null);
      });
      expect(result.current.isSetupStepValid('teams')).toBe(false);

      // Valid setup
      act(() => {
        result.current.setTeams('Warriors', 'Eagles', 'home');
      });
      expect(result.current.isSetupStepValid('teams')).toBe(true);
    });

    it('should validate lineup correctly', () => {
      const { result } = renderHook(() => useGameStore());

      // Empty lineup is invalid
      expect(result.current.isSetupStepValid('lineup')).toBe(false);

      // Minimum 9 players required
      const shortLineup: Player[] = [
        { id: '1', name: 'Player 1', jerseyNumber: '1', position: 'P', battingOrder: 1 },
      ];

      act(() => {
        result.current.setLineup(shortLineup);
      });
      expect(result.current.isSetupStepValid('lineup')).toBe(false);

      // Valid lineup with 9+ players
      const validLineup: Player[] = Array.from({ length: 9 }, (_, i) => ({
        id: String(i + 1),
        name: `Player ${i + 1}`,
        jerseyNumber: String(i + 1),
        position: 'P',
        battingOrder: i + 1,
      }));

      act(() => {
        result.current.setLineup(validLineup);
      });
      expect(result.current.isSetupStepValid('lineup')).toBe(true);
    });

    it('should handle wizard step progression', () => {
      const { result } = renderHook(() => useGameStore());

      // Start with null step
      expect(result.current.setupWizard.step).toBeNull();

      // Progress through steps
      const steps = ['teams', 'lineup', 'confirm'] as const;
      steps.forEach(step => {
        act(() => {
          result.current.setSetupStep(step);
        });
        expect(result.current.setupWizard.step).toBe(step);
      });
    });
  });

  describe('Active Game Recording State', () => {
    it('should manage active game recording state', () => {
      const { result } = renderHook(() => useGameStore());

      const gameData: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
        homeScore: 3,
        awayScore: 2,
        currentInning: 4,
        isTopHalf: true,
      };

      act(() => {
        result.current.startActiveGame(gameData);
      });

      expect(result.current.isGameActive).toBe(true);
      expect(result.current.currentGame).toEqual(gameData);
      expect(result.current.activeGameState).toEqual({
        currentInning: 4,
        isTopHalf: true,
        currentBatter: null,
        bases: { first: null, second: null, third: null },
        outs: 0,
      });
    });

    it('should update current batter and base runners', () => {
      const { result } = renderHook(() => useGameStore());

      const player: Player = {
        id: '1',
        name: 'John Doe',
        jerseyNumber: '12',
        position: 'SS',
        battingOrder: 1,
      };

      const gameData: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
      };

      act(() => {
        result.current.startActiveGame(gameData);
        result.current.setCurrentBatter(player);
      });

      expect(result.current.activeGameState?.currentBatter).toEqual(player);

      // Test base runner management
      act(() => {
        result.current.setBaseRunner('first', player);
      });

      expect(result.current.activeGameState?.bases.first).toEqual(player);

      act(() => {
        result.current.clearBase('first');
      });

      expect(result.current.activeGameState?.bases.first).toBeNull();
    });

    it('should handle inning progression', () => {
      const { result } = renderHook(() => useGameStore());

      const gameData: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
        currentInning: 3,
        isTopHalf: true,
      };

      act(() => {
        result.current.startActiveGame(gameData);
      });

      // Advance half inning
      act(() => {
        result.current.advanceHalfInning();
      });

      expect(result.current.activeGameState?.isTopHalf).toBe(false);
      expect(result.current.activeGameState?.currentInning).toBe(3);
      expect(result.current.activeGameState?.outs).toBe(0); // Should reset outs

      // Advance to next full inning
      act(() => {
        result.current.advanceHalfInning();
      });

      expect(result.current.activeGameState?.isTopHalf).toBe(true);
      expect(result.current.activeGameState?.currentInning).toBe(4);
    });

    it('should handle outs and inning transitions', () => {
      const { result } = renderHook(() => useGameStore());

      const gameData: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
        currentInning: 1,
        isTopHalf: true,
      };

      act(() => {
        result.current.startActiveGame(gameData);
      });

      // Add outs
      act(() => {
        result.current.addOut();
        result.current.addOut();
      });

      expect(result.current.activeGameState?.outs).toBe(2);

      // Third out should advance half inning
      act(() => {
        result.current.addOut();
      });

      expect(result.current.activeGameState?.outs).toBe(0);
      expect(result.current.activeGameState?.isTopHalf).toBe(false);
      expect(result.current.activeGameState?.currentInning).toBe(1);
    });
  });

  describe('Game Statistics State', () => {
    it('should handle game statistics state', () => {
      const { result } = renderHook(() => useGameStore());

      const gameData: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'completed',
        homeScore: 12,
        awayScore: 8,
      };

      act(() => {
        result.current.setCurrentGame(gameData);
      });

      // Should be able to access statistics for completed games
      expect(result.current.currentGame?.status).toBe('completed');
      expect(result.current.currentGame?.homeScore).toBe(12);
      expect(result.current.currentGame?.awayScore).toBe(8);
      expect(result.current.isGameActive).toBe(false); // Completed games are not active
    });
  });

  describe('Legacy Game Management', () => {
    it('should set current game correctly (legacy)', () => {
      const { result } = renderHook(() => useGameStore());

      const gameData: GameData = {
        id: 'test-game',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
      };

      act(() => {
        result.current.setCurrentGame(gameData);
      });

      expect(result.current.currentGame?.homeTeam).toBe('Warriors');
      expect(result.current.currentGame?.awayTeam).toBe('Eagles');
      expect(result.current.currentGame?.id).toBe('test-game');
      expect(result.current.error).toBeNull(); // Should clear any previous errors
    });

    it('should update game score (legacy)', () => {
      const { result } = renderHook(() => useGameStore());

      const initialGame: GameData = {
        id: 'test-game-1',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        status: 'active',
      };

      act(() => {
        result.current.setCurrentGame(initialGame);
      });

      act(() => {
        result.current.updateScore({ home: 10, away: 8 });
      });

      expect(result.current.currentGame).toEqual({
        ...initialGame,
        homeScore: 10,
        awayScore: 8,
      });
    });

    it('should handle loading and error states (legacy)', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);

      // Error handling
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
          status: 'active',
        });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state including new fields', () => {
      const { result } = renderHook(() => useGameStore());

      // Populate all state
      act(() => {
        result.current.setSetupStep('teams');
        result.current.setTeams('Warriors', 'Eagles', 'home');
        result.current.startActiveGame({
          id: 'test',
          homeTeam: 'Warriors',
          awayTeam: 'Eagles',
          status: 'active',
        });
        result.current.setLoading(true);
        result.current.setError('Test error');
      });

      // Verify data is set
      expect(result.current.setupWizard.step).toBe('teams');
      expect(result.current.isGameActive).toBe(true);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');

      // Reset store
      act(() => {
        result.current.reset();
      });

      // Verify reset to initial state
      const state = result.current;
      expect(state.currentGame).toBeNull();
      expect(state.isGameActive).toBe(false);
      expect(state.setupWizard.step).toBeNull();
      expect(state.setupWizard.teams.home).toBe('');
      expect(state.activeGameState).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('State Integration', () => {
    it('should maintain state consistency between setup and active game', () => {
      const { result } = renderHook(() => useGameStore());

      // Complete setup wizard
      act(() => {
        result.current.setSetupStep('teams');
        result.current.setTeams('Warriors', 'Eagles', 'home');
        result.current.setSetupStep('confirm');
        result.current.completeSetup();
      });

      expect(result.current.setupWizard.isComplete).toBe(true);

      // Start game based on setup
      const gameData: GameData = {
        id: 'new-game',
        homeTeam: result.current.setupWizard.teams.home,
        awayTeam: result.current.setupWizard.teams.away,
        status: 'active',
      };

      act(() => {
        result.current.startActiveGame(gameData);
      });

      expect(result.current.currentGame?.homeTeam).toBe('Warriors');
      expect(result.current.currentGame?.awayTeam).toBe('Eagles');
      expect(result.current.isGameActive).toBe(true);
    });
  });
});
