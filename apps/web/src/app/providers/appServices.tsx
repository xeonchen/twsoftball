/**
 * @file App Services Provider
 * Application-level provider for dependency injection and service initialization.
 *
 * @remarks
 * This provider integrates the app-initialization feature at the app layer level,
 * following Feature-Sliced Design principles. It creates a React context for
 * accessing application services throughout the component tree.
 *
 * **Architecture Compliance**:
 * - Located in app layer (highest in FSD hierarchy)
 * - Can import from features layer (app-initialization)
 * - Provides services to lower layers through context
 * - Maintains proper dependency injection patterns
 *
 * **Key Responsibilities**:
 * - Initialize application services using app-initialization feature
 * - Provide React context for service access
 * - Handle initialization errors gracefully
 * - Ensure services are available before rendering children
 *
 * **Usage Pattern**:
 * ```tsx
 * // In App.tsx
 * <AppServicesProvider config={config}>
 *   <OtherProviders>
 *     <AppRouter />
 *   </OtherProviders>
 * </AppServicesProvider>
 *
 * // In components
 * const services = useAppServices();
 * const result = await services.gameAdapter.startNewGame(data);
 * ```
 */

import type { ApplicationConfig } from '@twsoftball/application';
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application/services/ApplicationFactory';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
import React, { useCallback, useEffect, useState, type ReactNode } from 'react';

// Direct import to avoid circular dependencies

import {
  initializeApplicationServices,
  type AppInitializationConfig,
  type AppInitializationResult as FeatureAppInitializationResult,
} from '../../features/app-initialization';
import { AppServicesContext, type AppInitializationResult } from '../../shared/lib';

/**
 * Props for AppServicesProvider component.
 */
interface AppServicesProviderProps {
  /** Configuration for app initialization */
  config: AppInitializationConfig;
  /** Child components to render */
  children: ReactNode;
}

/**
 * Creates application services factory using composition root pattern.
 *
 * @remarks
 * This function implements the composition root pattern by selecting the
 * infrastructure factory at the Web layer (entry point) instead of having
 * the Application layer import Infrastructure. This eliminates circular
 * dependencies while maintaining hexagonal architecture compliance.
 *
 * **Architecture Benefits**:
 * - Application layer no longer imports Infrastructure (no circular dependency)
 * - Web layer (composition root) wires all dependencies together
 * - Infrastructure selection happens at the highest layer
 * - Maintains clean hexagonal architecture boundaries
 *
 * @returns Factory function for creating ApplicationServices
 */
function createApplicationServicesFactory() {
  return async (
    appConfig: ApplicationConfig
  ): Promise<Awaited<ReturnType<typeof createApplicationServicesWithContainerAndFactory>>> => {
    // Composition root: Select infrastructure factory based on configuration
    const factory =
      appConfig.storage === 'memory' ? createMemoryFactory() : createIndexedDBFactory();

    // Use DI container with explicit factory (no infrastructure import in Application layer)
    return await createApplicationServicesWithContainerAndFactory(appConfig, factory);
  };
}

/**
 * Application services provider component.
 *
 * @remarks
 * Initializes application services using the app-initialization feature and
 * provides them through React context. This follows the proper FSD architecture
 * where the app layer coordinates feature usage.
 *
 * **Initialization Flow**:
 * 1. **Mount**: Start initialization with provided config
 * 2. **Initialize**: Use app-initialization feature to create services
 * 3. **Provide**: Make services available through context
 * 4. **Error Handling**: Display errors if initialization fails
 *
 * **Loading States**:
 * - `isInitializing`: Shows loading spinner during init
 * - `error`: Shows error message if init fails
 * - `services`: Provides access to initialized services
 *
 * @param props - Component props
 * @returns JSX element with services context
 */
export function AppServicesProvider({
  config,
  children,
}: AppServicesProviderProps): React.JSX.Element {
  const [state, setState] = useState<{
    services: AppInitializationResult | null;
    isInitializing: boolean;
    error: Error | null;
  }>({
    services: null,
    isInitializing: true,
    error: null,
  });

  /**
   * Initialize application services.
   */
  const initializeServices = useCallback(
    async (initConfig: AppInitializationConfig): Promise<void> => {
      setState(prev => ({
        ...prev,
        isInitializing: true,
        error: null,
      }));

      try {
        // Use the app-initialization feature to create services
        // Composition root: Infrastructure selection happens here at the Web layer
        const serviceFactory = createApplicationServicesFactory();
        const featureServices: FeatureAppInitializationResult = await initializeApplicationServices(
          initConfig,
          serviceFactory
        );

        // Map feature result to shared context type
        const services: AppInitializationResult = {
          applicationServices: featureServices.applicationServices,
          gameAdapter: {
            startNewGameFromWizard: async wizardState => {
              const result = await featureServices.gameAdapter.startNewGameFromWizard(wizardState);
              return {
                success: result.success,
                gameId: result.gameId.value, // Convert GameId to string for shared context
                ...(result.errors && { errors: result.errors }),
              };
            },
            getTeamLineup: async uiData => {
              return await featureServices.gameAdapter.getTeamLineup(uiData);
            },
            makeSubstitution: async uiData => {
              return await featureServices.gameAdapter.makeSubstitution(uiData);
            },
            recordAtBat: async uiData => {
              return await featureServices.gameAdapter.recordAtBat(uiData);
            },
            undoLastAction: async uiData => {
              return await featureServices.gameAdapter.undoLastAction(uiData);
            },
            redoLastAction: async uiData => {
              return await featureServices.gameAdapter.redoLastAction(uiData);
            },
            getGameState: async uiData => {
              return await featureServices.gameAdapter.getGameState(uiData);
            },
            logger: featureServices.applicationServices.logger,
          },
        };

        setState({
          services,
          isInitializing: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error : new Error('Unknown initialization error');
        setState({
          services: null,
          isInitializing: false,
          error: errorMessage,
        });
      }
    },
    []
  );

  /**
   * Reinitialize services with new configuration.
   */
  const reinitialize = async (newConfig: AppInitializationConfig): Promise<void> => {
    await initializeServices(newConfig);
  };

  // Initialize services on mount and config changes
  useEffect(() => {
    // Define async initialization inside effect to satisfy react-hooks/set-state-in-effect
    const performInitialization = async (): Promise<void> => {
      await initializeServices(config);
    };
    void performInitialization();
  }, [config, initializeServices]);

  // Expose application services to window for E2E testing
  useEffect(() => {
    if (state.services?.applicationServices) {
      if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
        // Principle of Least Privilege: Only expose what E2E tests need
        // E2E tests only need the 6 use cases, not repositories/eventStore/logger/config
        window.__appServices__ = {
          startNewGame: state.services.applicationServices.startNewGame,
          recordAtBat: state.services.applicationServices.recordAtBat,
          substitutePlayer: state.services.applicationServices.substitutePlayer,
          undoLastAction: state.services.applicationServices.undoLastAction,
          redoLastAction: state.services.applicationServices.redoLastAction,
          endInning: state.services.applicationServices.endInning,
          // DO NOT expose: repositories, eventStore, logger, config
        };
      }
    }

    return (): void => {
      if (window.__appServices__) {
        delete window.__appServices__;
      }
    };
  }, [state.services]);

  // Context value (providing only what the shared context expects)
  const contextValue = {
    services: state.services,
    isInitializing: state.isInitializing,
    error: state.error,
  };

  // Handle loading state
  if (state.isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-field-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application services...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initialization Failed</h2>
          <p className="text-gray-600 mb-4">{state.error.message}</p>
          <button
            onClick={() => {
              void reinitialize(config);
            }}
            className="px-4 py-2 bg-field-green-600 text-white rounded hover:bg-field-green-700"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  // Provide services to children
  return <AppServicesContext.Provider value={contextValue}>{children}</AppServicesContext.Provider>;
}

// Note: For extended functionality like reinitialize, handle it within the provider component
// Features should use useAppServicesContext from shared/lib for basic service access
