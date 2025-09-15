import { create } from 'zustand';

/**
 * Basic game data structure for Phase 1B
 * This will be expanded in future phases to integrate with Domain layer
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
 * Game store state interface
 */
interface GameState {
  currentGame: GameData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Game store actions interface
 */
interface GameActions {
  setCurrentGame: (game: GameData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateScore: (score: { home: number; away: number }) => void;
  reset: () => void;
}

/**
 * Combined store interface
 */
type GameStore = GameState & GameActions;

/**
 * Initial state for the game store
 */
const initialState: GameState = {
  currentGame: null,
  isLoading: false,
  error: null,
};

/**
 * Zustand store for managing game state
 *
 * This is a basic implementation for Phase 1B to demonstrate Zustand integration.
 * In future phases, this will be refactored to work with the Domain layer's
 * Game aggregate and Event Sourcing patterns.
 *
 * @example
 * ```typescript
 * const { currentGame, setCurrentGame } = useGameStore();
 *
 * // Set a new game
 * setCurrentGame({
 *   id: 'game-1',
 *   homeTeam: 'Warriors',
 *   awayTeam: 'Eagles',
 *   status: 'active'
 * });
 * ```
 */
export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

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

  reset: (): void => {
    set(initialState);
  },
}));
