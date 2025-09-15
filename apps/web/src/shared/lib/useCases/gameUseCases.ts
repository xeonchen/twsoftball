import { useCallback } from 'react';

import { useGameStore, type Player } from '../store/gameStore';

/**
 * Game Use Cases Integration Layer
 *
 * Provides integration between the web application and domain layer use cases.
 * This layer handles:
 * - Domain use case orchestration
 * - State management updates
 * - Error handling and loading states
 * - Domain event processing
 *
 * Currently implemented with mock functionality until domain layer integration
 * is completed. This maintains the proper interface contract for future
 * integration while allowing current development to proceed.
 *
 * @example
 * ```typescript
 * const { startGame, recordAtBat } = useGameUseCases();
 *
 * // Start a new game
 * const gameId = await startGame({
 *   homeTeam: 'Warriors',
 *   awayTeam: 'Eagles',
 *   ourTeam: 'home',
 *   lineup: players
 * });
 *
 * // Record an at-bat
 * await recordAtBat({
 *   gameId,
 *   batterId: 'player-1',
 *   result: 'SINGLE',
 *   advancement: { batter: 'first', runners: [] }
 * });
 * ```
 */

// Domain layer type definitions (will be replaced with actual domain imports)
interface GameSetup {
  homeTeam: string;
  awayTeam: string;
  ourTeam: 'home' | 'away';
  lineup: Player[];
}

interface AtBatData {
  gameId: string;
  batterId: string;
  result: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN' | 'WALK' | 'OUT' | 'STRIKEOUT' | 'ERROR';
  advancement: {
    batter: 'first' | 'second' | 'third' | 'home' | 'out';
    runners: Array<{
      playerId: string;
      from: 'first' | 'second' | 'third';
      to: 'first' | 'second' | 'third' | 'home' | 'out';
    }>;
  };
}

interface SubstitutionData {
  gameId: string;
  playerOut: { id: string; battingOrder: number };
  playerIn: Player;
  position: string;
}

interface DomainEvent {
  type: string;
  data: Record<string, unknown>;
}

interface GameStateResult {
  gameState?: {
    bases?: {
      first?: { id: string } | null;
      second?: { id: string } | null;
      third?: { id: string } | null;
    };
    score?: { home: number; away: number };
  };
  events?: DomainEvent[];
}

/**
 * Dependency injection interface for testing
 */
interface UseCaseDependencies {
  startGameUseCase?: (setup: GameSetup) => Promise<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    status: 'active';
    homeScore: number;
    awayScore: number;
    currentInning: number;
    isTopHalf: boolean;
  }>;
  recordAtBatUseCase?: (data: AtBatData) => Promise<GameStateResult>;
  substitutePlayerUseCase?: (data: SubstitutionData) => Promise<{
    success: boolean;
    newLineup: Player[];
  }>;
}

/**
 * Global dependencies container for testing
 */
let dependencies: UseCaseDependencies = {};

/**
 * Set dependencies for testing (dependency injection)
 */
export function setUseCaseDependencies(deps: UseCaseDependencies): void {
  dependencies = { ...deps };
}

/**
 * Reset dependencies to default state
 */
export function resetUseCaseDependencies(): void {
  dependencies = {};
}

/**
 * Mock domain use case implementations
 * TODO: Replace with actual domain layer imports
 */
class MockStartGameUseCase {
  execute(setup: GameSetup): {
    id: string;
    homeTeam: string;
    awayTeam: string;
    status: 'active';
    homeScore: number;
    awayScore: number;
    currentInning: number;
    isTopHalf: boolean;
  } {
    // Simulate domain logic validation
    if (setup.lineup.length < 9) {
      throw new Error('Invalid lineup: minimum 9 players required');
    }

    // Simulate creating game aggregate
    return {
      id: `game-${Date.now()}`,
      homeTeam: setup.homeTeam,
      awayTeam: setup.awayTeam,
      status: 'active' as const,
      homeScore: 0,
      awayScore: 0,
      currentInning: 1,
      isTopHalf: true,
    };
  }
}

class MockRecordAtBatUseCase {
  execute(data: AtBatData): GameStateResult {
    // Simulate domain logic for at-bat recording
    const gameState: GameStateResult['gameState'] = {};

    // Mock base advancement logic
    if (data.result === 'SINGLE') {
      gameState.bases = {
        first: { id: data.batterId },
        second:
          data.advancement.runners.length > 0 && data.advancement.runners[0]?.playerId
            ? { id: data.advancement.runners[0].playerId }
            : null,
        third: null,
      };
    }

    // Mock scoring logic
    if (data.advancement.runners.some(r => r.to === 'home')) {
      gameState.score = { home: 1, away: 0 };
    }

    return {
      gameState,
      events: [
        { type: 'AtBatCompleted', data: { batterId: data.batterId, result: data.result } },
        ...(gameState.score ? [{ type: 'RunScored', data: { teamSide: 'home' } }] : []),
      ],
    };
  }
}

class MockSubstitutePlayerUseCase {
  execute(data: SubstitutionData): {
    success: boolean;
    newLineup: Player[];
  } {
    // Simulate substitution rule validation
    if (data.playerIn.name === 'Invalid Player') {
      throw new Error('Player already substituted and cannot re-enter');
    }

    return {
      success: true,
      newLineup: [
        {
          ...data.playerIn,
          battingOrder: data.playerOut.battingOrder,
        },
      ],
    };
  }
}

/**
 * Hook for integrating with domain layer use cases
 */
export function useGameUseCases(): {
  startGame: (setup: GameSetup) => Promise<string>;
  recordAtBat: (data: AtBatData) => Promise<void>;
  substitutePlayer: (data: SubstitutionData) => Promise<void>;
  getCurrentBatter: () => Player | null;
  getNextBatter: () => Player | null;
  validateSubstitution: (data: SubstitutionData) => boolean;
  processDomainEvents: (events: DomainEvent[]) => void;
} {
  const { startActiveGame, setBaseRunner, updateScore, setError, setLoading } = useGameStore();

  /**
   * Process domain events from use case results
   */
  const processDomainEvents = useCallback((events: DomainEvent[]): void => {
    events.forEach(event => {
      switch (event.type) {
        case 'AtBatCompleted':
          // eslint-disable-next-line no-console -- Mock implementation logging for development
          console.log('At-bat completed:', event.data);
          break;

        case 'RunScored':
          // eslint-disable-next-line no-console -- Mock implementation logging for development
          console.log('Run scored:', event.data);
          break;

        case 'PlayerSubstituted':
          // eslint-disable-next-line no-console -- Mock implementation logging for development
          console.log('Player substituted:', event.data);
          break;

        case 'InningChanged':
          // eslint-disable-next-line no-console -- Mock implementation logging for development
          console.log('Inning changed:', event.data);
          break;

        default:
          // eslint-disable-next-line no-console -- Mock implementation logging for development
          console.log('Unknown domain event:', event);
      }
    });
  }, []);

  /**
   * Start a new game using domain layer logic
   */
  const startGame = useCallback(
    async (setup: GameSetup): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        // Use injected dependency if available, otherwise fallback to mock
        if (dependencies.startGameUseCase) {
          const gameData = await dependencies.startGameUseCase(setup);
          // Update application state
          startActiveGame(gameData);
          return gameData.id;
        } else {
          const useCase = new MockStartGameUseCase();
          const gameData = await Promise.resolve(useCase.execute(setup));
          // Update application state
          startActiveGame(gameData);
          return gameData.id;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [startActiveGame, setError, setLoading]
  );

  /**
   * Record an at-bat using domain layer logic
   */
  const recordAtBat = useCallback(
    async (data: AtBatData): Promise<void> => {
      setError(null);

      try {
        // Use injected dependency if available, otherwise fallback to mock
        let result: GameStateResult;
        if (dependencies.recordAtBatUseCase) {
          result = await dependencies.recordAtBatUseCase(data);
        } else {
          const useCase = new MockRecordAtBatUseCase();
          result = await Promise.resolve(useCase.execute(data));
        }

        // Process game state updates
        if (result.gameState?.bases) {
          const { bases } = result.gameState;
          if (bases.first !== undefined) {
            const player = bases.first
              ? ({
                  id: bases.first.id,
                  name: 'Mock Player',
                  jerseyNumber: '0',
                  position: 'P',
                  battingOrder: 1,
                } as Player)
              : null;
            setBaseRunner('first', player);
          }
          if (bases.second !== undefined) {
            const player = bases.second
              ? ({
                  id: bases.second.id,
                  name: 'Mock Player',
                  jerseyNumber: '0',
                  position: 'P',
                  battingOrder: 1,
                } as Player)
              : null;
            setBaseRunner('second', player);
          }
          if (bases.third !== undefined) {
            const player = bases.third
              ? ({
                  id: bases.third.id,
                  name: 'Mock Player',
                  jerseyNumber: '0',
                  position: 'P',
                  battingOrder: 1,
                } as Player)
              : null;
            setBaseRunner('third', player);
          }
        }

        if (result.gameState?.score) {
          updateScore(result.gameState.score);
        }

        // Process domain events
        if (result.events) {
          processDomainEvents(result.events);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      }
    },
    [setBaseRunner, updateScore, setError, processDomainEvents]
  );

  /**
   * Substitute a player using domain layer logic
   */
  const substitutePlayer = useCallback(
    async (data: SubstitutionData): Promise<void> => {
      setError(null);

      try {
        // Use injected dependency if available, otherwise fallback to mock
        if (dependencies.substitutePlayerUseCase) {
          await dependencies.substitutePlayerUseCase(data);
        } else {
          const useCase = new MockSubstitutePlayerUseCase();
          await Promise.resolve(useCase.execute(data));
        }

        // Update lineup in store (placeholder - actual implementation depends on domain events)
        // eslint-disable-next-line no-console -- Mock implementation logging for development
        console.log('Player substitution completed:', data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      }
    },
    [setError]
  );

  /**
   * Get current batter from lineup
   * TODO: This should come from domain layer game state
   */
  const getCurrentBatter = useCallback((): Player | null => {
    // Mock implementation - return first player
    return {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      position: 'SS',
      battingOrder: 1,
    };
  }, []);

  /**
   * Get next batter in order
   * TODO: This should come from domain layer game state
   */
  const getNextBatter = useCallback((): Player | null => {
    // Mock implementation - return second player
    return {
      id: 'player-2',
      name: 'Jane Smith',
      jerseyNumber: '8',
      position: 'CF',
      battingOrder: 2,
    };
  }, []);

  /**
   * Validate if a substitution is legal
   * TODO: This should use domain layer validation rules
   */
  const validateSubstitution = useCallback((_data: SubstitutionData): boolean => {
    // Mock validation - always return true for now
    return true;
  }, []);

  return {
    // Primary use cases
    startGame,
    recordAtBat,
    substitutePlayer,

    // Helper functions
    getCurrentBatter,
    getNextBatter,
    validateSubstitution,
    processDomainEvents,
  };
}
