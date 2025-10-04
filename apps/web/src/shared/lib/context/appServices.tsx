/**
 * @file App Services Context
 * Shared context for accessing application services throughout the component tree.
 *
 * @remarks
 * This context provides a bridge between the app layer initialization and
 * feature-level components while maintaining FSD compliance. The shared layer
 * can provide this context, and features can consume it without violating
 * the architecture hierarchy.
 *
 * **Architecture Compliance**:
 * - Located in shared layer (can be imported by features, widgets, pages)
 * - Provides type-safe access to application services
 * - Maintains separation between initialization (app layer) and consumption (feature layer)
 * - Follows dependency injection patterns
 *
 * **Usage Pattern**:
 * ```tsx
 * // In app layer (initialization)
 * <AppServicesContextProvider value={services}>
 *   <YourApp />
 * </AppServicesContextProvider>
 *
 * // In features (consumption)
 * const services = useAppServicesContext();
 * const result = await services.gameAdapter.startNewGame(data);
 * ```
 */

import type { ApplicationServices, AtBatResult, FieldPosition } from '@twsoftball/application';
import { createContext, useContext } from 'react';

// Import proper types to avoid unknown types
import type { SetupWizardState } from '../types';

// Generic game adapter interface that doesn't violate FSD
export interface GameAdapterInterface {
  startNewGameFromWizard: (
    wizardState: SetupWizardState
  ) => Promise<{ success: boolean; gameId?: string; errors?: string[] }>;
  getTeamLineup: (uiData: { gameId: string }) => Promise<{
    success: boolean;
    gameId: { value: string }; // GameId value object structure
    activeLineup: Array<{
      battingSlot: number;
      playerId: string;
      fieldPosition: FieldPosition;
    }>;
    benchPlayers: unknown[];
    substitutionHistory: unknown[];
  }>;
  makeSubstitution: (uiData: {
    gameId: string;
    outgoingPlayerId: string;
    incomingPlayerId: string;
    battingSlot: number;
    fieldPosition: FieldPosition;
    isReentry: boolean;
  }) => Promise<{
    success: boolean;
    gameId: { value: string }; // GameId value object structure
    substitution: {
      inning: number;
      battingSlot: number;
      outgoingPlayer: { playerId: { value: string }; name: string };
      incomingPlayer: { playerId: { value: string }; name: string };
      timestamp: Date;
      isReentry: boolean;
    };
  }>;
  recordAtBat: (uiData: {
    gameId: string;
    batterId: string;
    result: string;
    runnerAdvances: Array<{
      runnerId: string;
      fromBase: number;
      toBase: number;
    }>;
  }) => Promise<AtBatResult>;
  logger: ApplicationServices['logger'];
}

// Re-export the exact interface from app-initialization feature to avoid type mismatches
export interface AppInitializationResult {
  applicationServices: ApplicationServices;
  gameAdapter: GameAdapterInterface;
}

/**
 * Context type for application services.
 */
export interface AppServicesContextType {
  /** Initialization result containing services and adapters */
  services: AppInitializationResult | null;
  /** Whether services are currently being initialized */
  isInitializing: boolean;
  /** Initialization error if any */
  error: Error | null;
}

/**
 * React context for application services.
 */
export const AppServicesContext = createContext<AppServicesContextType | null>(null);

/**
 * Hook to access application services from context.
 *
 * @remarks
 * Provides type-safe access to initialized application services and adapters.
 * Must be used within a component tree that has the AppServicesContext provided.
 *
 * **Available Services**:
 * - `services.applicationServices`: Core application services
 * - `services.gameAdapter`: Web-layer game adapter
 * - `isInitializing`: Loading state indicator
 * - `error`: Error state if initialization failed
 *
 * @throws Error if used outside of AppServicesContext
 * @returns Application services context
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { services, isInitializing, error } = useAppServicesContext();
 *
 *   if (isInitializing) return <Loading />;
 *   if (error) return <Error error={error} />;
 *   if (!services) return <NotInitialized />;
 *
 *   const handleStartGame = async () => {
 *     const result = await services.gameAdapter.startNewGame(gameData);
 *     console.log('Game started:', result.gameId);
 *   };
 *
 *   return <button onClick={handleStartGame}>Start Game</button>;
 * }
 * ```
 */
export const useAppServicesContext = (): AppServicesContextType => {
  const context = useContext(AppServicesContext);

  if (!context) {
    throw new Error(
      'useAppServicesContext must be used within an AppServicesContext provider. ' +
        'Make sure your component is wrapped with the context provider.'
    );
  }

  return context;
};
