import { create } from 'zustand';

// Import shared types
import type { UIGameState } from '../../../shared/api';
import type { Player, SetupWizardState } from '../../../shared/lib/types';

// Re-export types for external use
export type { SetupWizardState };

/**
 * Enhanced game data structure for Phase 2
 * Integrates with complete game management and recording workflow
 */
export interface GameData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: 'waiting' | 'active' | 'completed';
  homeScore?: number;
  awayScore?: number;
  currentInning?: number;
  isTopHalf?: boolean;
}

/**
 * Active game recording state for live game management
 */
export interface ActiveGameState {
  currentInning: number;
  isTopHalf: boolean;
  currentBatter: Player | null;
  bases: {
    first: Player | null;
    second: Player | null;
    third: Player | null;
  };
  outs: number;
}

/**
 * Enhanced game store state interface
 */
interface GameState {
  // Legacy state (Phase 1B compatibility)
  currentGame: GameData | null;
  isLoading: boolean;
  error: string | null;

  // Phase 2 enhanced state
  setupWizard: SetupWizardState;
  activeGameState: ActiveGameState | null;
  isGameActive: boolean;

  // Phase 5.3.F hydration tracking
  _hasHydrated: boolean;
}

/**
 * Enhanced game store actions interface
 */
interface GameActions {
  // Legacy actions (Phase 1B compatibility)
  setCurrentGame: (game: GameData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateScore: (score: { home: number; away: number }) => void;
  reset: () => void;

  // Phase 2 enhanced actions
  // Setup wizard actions
  setSetupStep: (step: 'teams' | 'lineup' | 'confirm' | null) => void;
  setTeams: (home: string, away: string, ourTeam: 'home' | 'away' | null) => void;
  setLineup: (lineup: Player[]) => void;
  completeSetup: () => void;
  isSetupStepValid: (step: 'teams' | 'lineup' | 'confirm') => boolean;

  // Active game actions
  startActiveGame: (gameData: GameData) => void;
  setCurrentBatter: (player: Player) => void;
  setBaseRunner: (base: 'first' | 'second' | 'third', player: Player | null) => void;
  clearBase: (base: 'first' | 'second' | 'third') => void;
  advanceHalfInning: () => void;
  addOut: () => void;

  // Phase 5.3.F DTO sync
  updateFromDTO: (uiState: UIGameState) => void;
}

/**
 * Combined store interface
 */
type GameStore = GameState & GameActions;

/**
 * Initial state for the enhanced game store
 */
const initialState: GameState = {
  // Legacy state (Phase 1B compatibility)
  currentGame: null,
  isLoading: false,
  error: null,

  // Phase 2 enhanced state
  setupWizard: {
    step: null,
    teams: { home: '', away: '', ourTeam: null },
    lineup: [],
    isComplete: false,
  },
  activeGameState: null,
  isGameActive: false,

  // Phase 5.3.F hydration tracking
  _hasHydrated: true, // No persist middleware yet, so always hydrated
};

/**
 * Enhanced Zustand store for managing complete game state
 *
 * Phase 2 implementation with comprehensive game setup, recording, and statistics.
 * Maintains backward compatibility with Phase 1B while adding:
 * - Complete setup wizard workflow
 * - Active game recording state management
 * - Browser navigation protection support
 * - Enhanced validation and state consistency
 *
 * @example
 * ```typescript
 * // Setup wizard workflow
 * const { setSetupStep, setTeams, setLineup } = useGameStore();
 *
 * setSetupStep('teams');
 * setTeams('Warriors', 'Eagles', 'home');
 * setSetupStep('lineup');
 * setLineup([...players]);
 *
 * // Active game management
 * const { startActiveGame, setCurrentBatter } = useGameStore();
 * startActiveGame(gameData);
 * setCurrentBatter(player);
 * ```
 */
export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // Legacy actions (Phase 1B compatibility)
  setCurrentGame: (game: GameData): void => {
    set({
      currentGame: game,
      error: null, // Clear error when setting new game
    });
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },

  setError: (error: string | null): void => {
    set({ error });
  },

  updateScore: (score: { home: number; away: number }): void => {
    const { currentGame } = get();
    if (currentGame) {
      set({
        currentGame: {
          ...currentGame,
          homeScore: score.home,
          awayScore: score.away,
        },
      });
    }
  },

  // Phase 2 enhanced actions
  // Setup wizard actions
  setSetupStep: (step: 'teams' | 'lineup' | 'confirm' | null): void => {
    set(state => ({
      setupWizard: {
        ...state.setupWizard,
        step,
      },
    }));
  },

  setTeams: (home: string, away: string, ourTeam: 'home' | 'away' | null): void => {
    set(state => ({
      setupWizard: {
        ...state.setupWizard,
        teams: { home, away, ourTeam },
      },
    }));
  },

  setLineup: (lineup: Player[]): void => {
    set(state => ({
      setupWizard: {
        ...state.setupWizard,
        lineup,
      },
    }));
  },

  completeSetup: (): void => {
    set(state => ({
      setupWizard: {
        ...state.setupWizard,
        isComplete: true,
      },
    }));
  },

  isSetupStepValid: (step: 'teams' | 'lineup' | 'confirm'): boolean => {
    const { setupWizard } = get();

    switch (step) {
      case 'teams':
        return (
          setupWizard.teams.home.trim() !== '' &&
          setupWizard.teams.away.trim() !== '' &&
          setupWizard.teams.home !== setupWizard.teams.away &&
          setupWizard.teams.ourTeam !== null
        );

      case 'lineup':
        return (
          setupWizard.lineup.length >= 9 &&
          setupWizard.lineup.every(
            player =>
              player.name.trim() !== '' &&
              player.jerseyNumber.trim() !== '' &&
              player.position.trim() !== ''
          )
        );

      case 'confirm':
        return setupWizard.isComplete;

      default:
        return false;
    }
  },

  // Active game actions
  startActiveGame: (gameData: GameData): void => {
    set({
      currentGame: gameData,
      isGameActive: true,
      activeGameState: {
        currentInning: gameData.currentInning || 1,
        isTopHalf: gameData.isTopHalf ?? true,
        currentBatter: null,
        bases: { first: null, second: null, third: null },
        outs: 0,
      },
      error: null, // Clear any previous errors
    });
  },

  setCurrentBatter: (player: Player): void => {
    set(state => ({
      activeGameState: state.activeGameState
        ? {
            ...state.activeGameState,
            currentBatter: player,
          }
        : null,
    }));
  },

  setBaseRunner: (base: 'first' | 'second' | 'third', player: Player | null): void => {
    set(state => ({
      activeGameState: state.activeGameState
        ? {
            ...state.activeGameState,
            bases: {
              ...state.activeGameState.bases,
              [base]: player,
            },
          }
        : null,
    }));
  },

  clearBase: (base: 'first' | 'second' | 'third'): void => {
    set(state => ({
      activeGameState: state.activeGameState
        ? {
            ...state.activeGameState,
            bases: {
              ...state.activeGameState.bases,
              [base]: null,
            },
          }
        : null,
    }));
  },

  advanceHalfInning: (): void => {
    set(state => {
      if (!state.activeGameState) return state;

      const newIsTopHalf = !state.activeGameState.isTopHalf;
      const newInning = newIsTopHalf
        ? state.activeGameState.currentInning + 1
        : state.activeGameState.currentInning;

      return {
        activeGameState: {
          ...state.activeGameState,
          currentInning: newInning,
          isTopHalf: newIsTopHalf,
          outs: 0, // Reset outs
          bases: { first: null, second: null, third: null }, // Clear bases
        },
        // Update current game state as well
        currentGame: state.currentGame
          ? {
              ...state.currentGame,
              currentInning: newInning,
              isTopHalf: newIsTopHalf,
            }
          : null,
      };
    });
  },

  addOut: (): void => {
    set(state => {
      if (!state.activeGameState) return state;

      const newOuts = state.activeGameState.outs + 1;

      if (newOuts >= 3) {
        // Advance half inning when 3 outs reached
        const newIsTopHalf = !state.activeGameState.isTopHalf;
        const newInning = newIsTopHalf
          ? state.activeGameState.currentInning + 1
          : state.activeGameState.currentInning;

        return {
          activeGameState: {
            ...state.activeGameState,
            currentInning: newInning,
            isTopHalf: newIsTopHalf,
            outs: 0,
            bases: { first: null, second: null, third: null },
          },
          currentGame: state.currentGame
            ? {
                ...state.currentGame,
                currentInning: newInning,
                isTopHalf: newIsTopHalf,
              }
            : null,
        };
      } else {
        return {
          activeGameState: {
            ...state.activeGameState,
            outs: newOuts,
          },
        };
      }
    });
  },

  // Phase 5.3.F DTO sync
  updateFromDTO: (uiState: UIGameState): void => {
    set(state => ({
      currentGame: {
        id: uiState.gameId,
        homeTeam: uiState.teams.home.name,
        awayTeam: uiState.teams.away.name,
        status:
          uiState.status === 'IN_PROGRESS'
            ? 'active'
            : uiState.status === 'COMPLETED'
              ? 'completed'
              : 'waiting',
        homeScore: uiState.score.home,
        awayScore: uiState.score.away,
        currentInning: uiState.inning.number,
        isTopHalf: uiState.inning.half === 'top',
      },
      activeGameState: uiState.currentBatter
        ? {
            currentInning: uiState.inning.number,
            isTopHalf: uiState.inning.half === 'top',
            currentBatter: uiState.currentBatter || null,
            bases: uiState.bases || { first: null, second: null, third: null },
            outs: uiState.outs || 0,
          }
        : state.activeGameState,
      isGameActive: uiState.status === 'IN_PROGRESS',
      error: null,
    }));
  },

  // Enhanced reset that clears all state
  reset: (): void => {
    set(initialState);
  },
}));
