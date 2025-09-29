import {
  type ApplicationServices,
  type ApplicationConfig,
  type StartNewGameCommand,
  type RecordAtBatCommand,
  // type SubstitutePlayerCommand,
  type GameStartResult,
  type AtBatResult,
  // type SubstitutionResult,
  GameId,
  PlayerId,
  JerseyNumber,
  FieldPosition,
  AtBatResultType,
  type Logger,
} from '@twsoftball/application';
// Direct import to avoid circular dependencies
import { createApplicationServicesWithContainer } from '@twsoftball/application/services/ApplicationFactory';
import { useCallback, useEffect, useState } from 'react';

import type { Player } from '../../../shared/lib/types';

import { useGameStore } from './gameStore';

/**
 * Game Use Cases Integration Layer
 *
 * Provides integration between the web application and domain layer use cases
 * through the DI container pattern. This layer handles:
 * - Domain use case orchestration via ApplicationServices
 * - State management updates
 * - Error handling and loading states
 * - Domain event processing
 * - DI container lifecycle management
 *
 * Uses the proper DI container approach to integrate with the application layer,
 * ensuring clean architecture boundaries and proper dependency injection.
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
 *   result: AtBatResultType.SINGLE,
 *   runnerAdvances: []
 * });
 * ```
 */

// Web layer specific types for UI integration
interface GameSetup {
  homeTeam: string;
  awayTeam: string;
  ourTeam: 'home' | 'away';
  lineup: Player[];
}

interface AtBatData {
  gameId: string;
  batterId: string;
  result: AtBatResultType;
  runnerAdvances: Array<{
    playerId: string;
    fromBase: 'FIRST' | 'SECOND' | 'THIRD' | null;
    toBase: 'FIRST' | 'SECOND' | 'THIRD' | 'HOME' | 'OUT';
  }>;
}

interface SubstitutionData {
  gameId: string;
  playerOut: { id: string; battingOrder: number };
  playerIn: Player;
  position: FieldPosition;
}

/**
 * Application services instance
 * Managed by the hook for proper lifecycle
 */
let applicationServices: ApplicationServices | null = null;
let logger: Logger | null = null;

/**
 * Configuration for application services
 */
const APPLICATION_CONFIG: ApplicationConfig = {
  environment:
    globalThis.process?.env?.['NODE_ENV'] === 'production' ? 'production' : 'development',
  storage: 'indexeddb', // Use IndexedDB for web deployment
  debug: globalThis.process?.env?.['NODE_ENV'] !== 'production',
};

/**
 * Initialize application services if not already initialized
 */
async function initializeApplicationServices(): Promise<ApplicationServices> {
  if (!applicationServices) {
    applicationServices = await createApplicationServicesWithContainer(APPLICATION_CONFIG);
    logger = applicationServices.logger;
  }
  return applicationServices;
}

/**
 * Convert web layer Player to domain layer types
 */
function convertPlayerToDomainTypes(player: Player): {
  playerId: PlayerId;
  jerseyNumber: JerseyNumber;
  name: string;
  battingOrderPosition: number;
  fieldPosition: FieldPosition;
  preferredPositions: FieldPosition[];
} {
  return {
    playerId: new PlayerId(player.id),
    jerseyNumber: new JerseyNumber(player.jerseyNumber),
    name: player.name,
    battingOrderPosition: player.battingOrder,
    fieldPosition: player.position as FieldPosition,
    preferredPositions: [player.position as FieldPosition], // Simplified for now
  };
}

// Note: convertAtBatResult function removed as AtBatResultType is now used directly

/**
 * Hook for integrating with domain layer use cases through DI container
 */
export function useGameUseCases(): {
  startGame: (setup: GameSetup) => Promise<string>;
  recordAtBat: (data: AtBatData) => Promise<void>;
  substitutePlayer: (data: SubstitutionData) => Promise<void>;
  getCurrentBatter: () => Player | null;
  getNextBatter: () => Player | null;
  validateSubstitution: (data: SubstitutionData) => boolean;
  processDomainEvents: (events: unknown[]) => void;
  isInitialized: boolean;
} {
  const { startActiveGame, setError, setLoading } = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize application services on mount
  useEffect(() => {
    let mounted = true;

    async function initialize(): Promise<void> {
      try {
        await initializeApplicationServices();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        if (mounted) {
          setError('Failed to initialize application services');
          logger?.error('Failed to initialize application services', error as Error);
        }
      }
    }

    void initialize();

    return (): void => {
      mounted = false;
    };
  }, [setError]);

  /**
   * Process domain events from use case results
   */
  const processDomainEvents = useCallback((events: unknown[]): void => {
    events.forEach((event: unknown) => {
      const eventObj = event as { type?: string; data?: unknown };
      switch (eventObj.type) {
        case 'AtBatCompleted':
          logger?.debug('At-bat completed', { event: eventObj.data });
          break;

        case 'RunScored':
          logger?.info('Run scored', { event: eventObj.data });
          break;

        case 'PlayerSubstituted':
          logger?.info('Player substituted', { event: eventObj.data });
          break;

        case 'InningChanged':
          logger?.info('Inning changed', { event: eventObj.data });
          break;

        default:
          logger?.debug('Domain event processed', {
            eventType: eventObj.type,
            data: eventObj.data,
          });
      }
    });
  }, []);

  /**
   * Start a new game using domain layer logic through DI container
   */
  const startGame = useCallback(
    async (setup: GameSetup): Promise<string> => {
      if (!isInitialized || !applicationServices) {
        throw new Error('Application services not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        // Convert web layer types to domain types
        const gameId = GameId.generate();
        const domainPlayers = setup.lineup.map(convertPlayerToDomainTypes);

        const command: StartNewGameCommand = {
          gameId,
          homeTeamName: setup.homeTeam,
          awayTeamName: setup.awayTeam,
          ourTeamSide: setup.ourTeam.toUpperCase() as 'HOME' | 'AWAY',
          gameDate: new Date(),
          location: 'Game Location', // Would be configurable in full implementation
          initialLineup: domainPlayers,
        };

        const result: GameStartResult = await applicationServices.startNewGame.execute(command);

        if (result.success && result.initialState) {
          // Update application state
          startActiveGame({
            id: result.gameId.value,
            homeTeam: setup.homeTeam,
            awayTeam: setup.awayTeam,
            status: 'active' as const,
            homeScore: result.initialState.score.home,
            awayScore: result.initialState.score.away,
            currentInning: result.initialState.currentInning,
            isTopHalf: result.initialState.isTopHalf,
          });

          logger?.info('Game started successfully', {
            gameId: result.gameId.value,
            teams: `${setup.homeTeam} vs ${setup.awayTeam}`,
          });

          return result.gameId.value;
        } else {
          throw new Error(result.errors?.join(', ') || 'Failed to start game');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        logger?.error('Failed to start game', error as Error, { setup });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [startActiveGame, setError, setLoading, isInitialized]
  );

  /**
   * Record an at-bat using domain layer logic through DI container
   */
  const recordAtBat = useCallback(
    async (data: AtBatData): Promise<void> => {
      if (!isInitialized || !applicationServices) {
        throw new Error('Application services not initialized');
      }

      setError(null);

      try {
        const command: RecordAtBatCommand = {
          gameId: new GameId(data.gameId),
          batterId: new PlayerId(data.batterId),
          result: data.result,
          runnerAdvances: data.runnerAdvances.map(advance => ({
            playerId: new PlayerId(advance.playerId),
            fromBase: advance.fromBase,
            toBase: advance.toBase,
            advanceReason: 'BATTED_BALL' as const, // Simplified for now
          })),
        };

        const result: AtBatResult = await applicationServices.recordAtBat.execute(command);

        if (result.success) {
          // Process successful at-bat result
          // Note: The actual AtBatResult interface may differ from what's being accessed
          // This would be updated based on the actual domain DTO structure

          logger?.info('At-bat recorded successfully', {
            gameId: data.gameId,
            batterId: data.batterId,
            result: data.result,
            runsScored: result.runsScored || 0,
            rbiAwarded: result.rbiAwarded || 0,
          });

          // Update UI state based on result
          // In full implementation, this would process domain events from the result
        } else {
          throw new Error(result.errors?.join(', ') || 'Failed to record at-bat');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        logger?.error('Failed to record at-bat', error as Error, { data });
        throw error;
      }
    },
    [setError, isInitialized]
  );

  /**
   * Substitute a player using domain layer logic through DI container
   */
  const substitutePlayer = useCallback(
    (data: SubstitutionData): Promise<void> => {
      if (!isInitialized || !applicationServices) {
        return Promise.reject(new Error('Application services not initialized'));
      }

      setError(null);

      return Promise.resolve().then(() => {
        try {
          // Player substitution functionality is not fully implemented yet
          // This would require proper TeamLineupId and complete command structure
          // For now, just log the substitution intent
          logger?.info('Player substitution requested', {
            gameId: data.gameId,
            playerOut: data.playerOut.id,
            playerIn: data.playerIn.id,
            position: data.position,
          });

          // TODO: Implement proper substitution logic when domain interface is complete
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(errorMessage);
          logger?.error('Failed to substitute player', error as Error, { data });
          throw error;
        }
      });
    },
    [setError, isInitialized]
  );

  /**
   * Get current batter from game state
   * Implementation would query the current game state through DI container
   */
  const getCurrentBatter = useCallback((): Player | null => {
    // This would be implemented to query the current game state
    // For now, return null until game state integration is complete
    if (!isInitialized) {
      return null;
    }

    // TODO: Query current game state to get actual current batter
    // This would use applicationServices.gameRepository to get current game state
    return null;
  }, [isInitialized]);

  /**
   * Get next batter in batting order
   * Implementation would query the current game state through DI container
   */
  const getNextBatter = useCallback((): Player | null => {
    // This would be implemented to query the current game state
    // For now, return null until game state integration is complete
    if (!isInitialized) {
      return null;
    }

    // TODO: Query current game state to get next batter
    // This would use applicationServices.gameRepository to get current game state
    return null;
  }, [isInitialized]);

  /**
   * Validate if a substitution is legal using domain rules
   * Implementation would use domain validation through DI container
   */
  const validateSubstitution = useCallback(
    (data: SubstitutionData): boolean => {
      if (!isInitialized) {
        return false;
      }

      // Basic validation - would be replaced with domain validation
      return Boolean(data.gameId && data.playerOut.id && data.playerIn.id && data.position);
    },
    [isInitialized]
  );

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

    // Status
    isInitialized,
  };
}
