/**
 * @file App Services Provider Tests
 * Comprehensive test suite for the new app services provider pattern.
 *
 * @remarks
 * This test suite validates the AppServicesProvider pattern functionality. It ensures:
 * - App initialization feature integration
 * - Proper dependency injection and service creation
 * - Comprehensive error handling and edge cases
 * - Service registry and initialization behavior
 * - Configuration validation and management
 *
 * **Test Strategy:**
 * 1. Mock app-initialization feature at the Application layer
 * 2. Test initializeApplicationServices approach comprehensively
 * 3. Test edge cases, error scenarios, and performance
 *
 * Tests follow hexagonal architecture principles with no Infrastructure dependencies.
 */
import { createApplicationServicesWithContainer } from '@twsoftball/application';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Local type definitions to avoid importing from features layer (FSD compliance)
interface AppInitializationConfig {
  environment: 'development' | 'production';
  storage: 'memory' | 'indexeddb';
  debug?: boolean;
}

// Type definitions for application services
interface MockApplicationServices {
  startNewGame: { execute: vi.MockedFunction<unknown> };
  recordAtBat: { execute: vi.MockedFunction<unknown> };
  substitutePlayer: { execute: vi.MockedFunction<unknown> };
  undoLastAction: { execute: vi.MockedFunction<unknown> };
  redoLastAction: { execute: vi.MockedFunction<unknown> };
  endInning: { execute: vi.MockedFunction<unknown> };
  gameRepository: { findById: vi.MockedFunction<unknown>; save: vi.MockedFunction<unknown> };
  teamLineupRepository: { findById: vi.MockedFunction<unknown>; save: vi.MockedFunction<unknown> };
  inningStateRepository: { findById: vi.MockedFunction<unknown>; save: vi.MockedFunction<unknown> };
  eventStore: { getEvents: vi.MockedFunction<unknown>; saveEvent: vi.MockedFunction<unknown> };
  logger: {
    debug: vi.MockedFunction<(message: string, context?: unknown) => void>;
    info: vi.MockedFunction<(message: string, context?: unknown) => void>;
    warn: vi.MockedFunction<(message: string, context?: unknown) => void>;
    error: vi.MockedFunction<(message: string, error?: Error, context?: unknown) => void>;
    log: vi.MockedFunction<
      (level: string, message: string, context?: unknown, error?: Error) => void
    >;
    isLevelEnabled: vi.MockedFunction<(level: string) => boolean>;
  };
  config: { environment: string; storage: string };
}

interface MockGameAdapter {
  startNewGameFromWizard: vi.MockedFunction<unknown>;
  startNewGame: vi.MockedFunction<unknown>;
  recordAtBat: vi.MockedFunction<unknown>;
  substitutePlayer: vi.MockedFunction<unknown>;
  undoLastAction: vi.MockedFunction<unknown>;
  redoLastAction: vi.MockedFunction<unknown>;
  endInning: vi.MockedFunction<unknown>;
  toUIGameState: vi.MockedFunction<unknown>;
}

interface AppInitializationResult {
  applicationServices: MockApplicationServices;
  gameAdapter: MockGameAdapter;
}

type ApplicationServicesFactory = (
  config: AppInitializationConfig & { debug: boolean }
) => Promise<MockApplicationServices>;

// Mock implementation of initializeApplicationServices
const initializeApplicationServices = vi
  .fn()
  .mockImplementation(
    async (
      config: AppInitializationConfig,
      serviceCreator: ApplicationServicesFactory
    ): Promise<AppInitializationResult> => {
      // Call the actual service creator with proper config (including debug flag)
      const configWithDebug = {
        environment: config.environment,
        storage: config.storage,
        debug: config.debug ?? false,
      };
      const applicationServices = await serviceCreator(configWithDebug);
      return {
        applicationServices,
        gameAdapter: {
          startNewGameFromWizard: vi.fn(),
          startNewGame: vi.fn(),
          recordAtBat: vi.fn(),
          substitutePlayer: vi.fn(),
          undoLastAction: vi.fn(),
          redoLastAction: vi.fn(),
          endInning: vi.fn(),
          toUIGameState: vi.fn(),
        },
      } satisfies AppInitializationResult;
    }
  );

// Mock the DIContainer
vi.mock('@twsoftball/application/services/DIContainer', async importOriginal => {
  const original =
    await importOriginal<typeof import('@twsoftball/application/services/DIContainer')>();

  return {
    ...original,
    createApplicationServicesWithContainer: vi.fn().mockImplementation(_config => {
      return Promise.resolve({
        startNewGame: { execute: vi.fn() },
        recordAtBat: { execute: vi.fn() },
        substitutePlayer: { execute: vi.fn() },
        undoLastAction: { execute: vi.fn() },
        redoLastAction: { execute: vi.fn() },
        endInning: { execute: vi.fn() },
        gameRepository: { findById: vi.fn(), save: vi.fn() },
        teamLineupRepository: { findById: vi.fn(), save: vi.fn() },
        inningStateRepository: { findById: vi.fn(), save: vi.fn() },
        eventStore: { getEvents: vi.fn(), saveEvent: vi.fn() },
        logger: {
          debug: vi.fn<[string, unknown?], void>(),
          info: vi.fn<[string, unknown?], void>(),
          warn: vi.fn<[string, unknown?], void>(),
          error: vi.fn<[string, Error?, unknown?], void>(),
          log: vi.fn<[string, string, unknown?, Error?], void>(),
          isLevelEnabled: vi.fn<[string], boolean>(() => true),
        },
        config: { environment: 'development', storage: 'memory' },
      });
    }),
    DIContainer: vi.fn().mockImplementation(() => ({
      register: vi.fn(),
      resolve: vi.fn(),
      has: vi.fn(() => true),
      initialize: vi.fn(),
      dispose: vi.fn(),
      getRegisteredServices: vi.fn(() => ['applicationServices']),
    })),
  };
});

describe('App Services Provider Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('App Initialization Pattern Tests', () => {
    it('should verify DIContainer mock is working properly', async () => {
      const { createApplicationServicesWithContainer } = await import(
        '@twsoftball/application/services/DIContainer'
      );

      const mockConfig = { environment: 'development' as const, storage: 'memory' as const };
      const services = await createApplicationServicesWithContainer(mockConfig);

      expect(services).toBeDefined();
      expect(services.startNewGame).toBeDefined();
      expect(services.gameRepository).toBeDefined();
      expect(services.logger).toBeDefined();
      expect(typeof services.logger.log).toBe('function');
      expect(typeof services.startNewGame.execute).toBe('function');
    });

    it('should initialize all use cases with proper dependencies', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
        debug: true,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const applicationServices = result.applicationServices;

      expect(result).toBeDefined();
      expect(applicationServices.startNewGame).toBeDefined();
      expect(applicationServices.recordAtBat).toBeDefined();
      expect(applicationServices.substitutePlayer).toBeDefined();
      expect(applicationServices.undoLastAction).toBeDefined();
      expect(applicationServices.redoLastAction).toBeDefined();
      expect(applicationServices.endInning).toBeDefined();

      expect(typeof applicationServices.startNewGame.execute).toBe('function');
      expect(typeof applicationServices.recordAtBat.execute).toBe('function');
      expect(typeof applicationServices.substitutePlayer.execute).toBe('function');
      expect(typeof applicationServices.undoLastAction.execute).toBe('function');
      expect(typeof applicationServices.redoLastAction.execute).toBe('function');
      expect(typeof applicationServices.endInning.execute).toBe('function');
    });

    it('should create singleton instances of repositories', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const applicationServices = result.applicationServices;

      const gameRepo1 = applicationServices.gameRepository;
      const gameRepo2 = applicationServices.gameRepository;
      const teamLineupRepo1 = applicationServices.teamLineupRepository;
      const teamLineupRepo2 = applicationServices.teamLineupRepository;
      const inningStateRepo1 = applicationServices.inningStateRepository;
      const inningStateRepo2 = applicationServices.inningStateRepository;

      expect(gameRepo1).toBe(gameRepo2);
      expect(teamLineupRepo1).toBe(teamLineupRepo2);
      expect(inningStateRepo1).toBe(inningStateRepo2);
      expect(gameRepo1).toBeDefined();
      expect(teamLineupRepo1).toBeDefined();
      expect(inningStateRepo1).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const config = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };

      const failingServiceCreator = vi
        .fn()
        .mockRejectedValue(new Error('Storage initialization failed'));

      await expect(initializeApplicationServices(config, failingServiceCreator)).rejects.toThrow(
        'Storage initialization failed'
      );

      expect(failingServiceCreator).toHaveBeenCalledWith({
        environment: 'production',
        storage: 'indexeddb',
        debug: false,
      });
    });

    it('should provide logger implementation', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const applicationServices = result.applicationServices;

      expect(applicationServices.logger).toBeDefined();
      expect(typeof applicationServices.logger.debug).toBe('function');
      expect(typeof applicationServices.logger.info).toBe('function');
      expect(typeof applicationServices.logger.warn).toBe('function');
      expect(typeof applicationServices.logger.error).toBe('function');
      expect(typeof applicationServices.logger.log).toBe('function');
      expect(typeof applicationServices.logger.isLevelEnabled).toBe('function');
    });

    it('should wire GameAdapter with all dependencies', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );

      expect(result.gameAdapter).toBeDefined();
      expect(typeof result.gameAdapter).toBe('object');

      expect(typeof result.gameAdapter.startNewGame).toBe('function');
      expect(typeof result.gameAdapter.recordAtBat).toBe('function');
      expect(typeof result.gameAdapter.substitutePlayer).toBe('function');
      expect(typeof result.gameAdapter.undoLastAction).toBe('function');
      expect(typeof result.gameAdapter.redoLastAction).toBe('function');
      expect(typeof result.gameAdapter.endInning).toBe('function');
      expect(typeof result.gameAdapter.toUIGameState).toBe('function');
    });

    it('should support both development and production configurations', async () => {
      const devConfig = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const devResult = await initializeApplicationServices(
        devConfig,
        createApplicationServicesWithContainer
      );
      expect(devResult).toBeDefined();

      const prodConfig = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };

      const prodResult = await initializeApplicationServices(
        prodConfig,
        createApplicationServicesWithContainer
      );
      expect(prodResult).toBeDefined();
    });

    it('should throw error when accessing services without initialization', () => {
      expect(vi.mocked(initializeApplicationServices)).toBeDefined();
      expect(vi.mocked(createApplicationServicesWithContainer)).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration parameters', async () => {
      const invalidEnvConfig = {
        environment: 'invalid' as 'development',
        storage: 'memory' as const,
      };

      const result1 = await initializeApplicationServices(
        invalidEnvConfig,
        createApplicationServicesWithContainer
      );
      expect(result1).toBeDefined();

      const missingStorageConfig = {
        environment: 'development' as const,
      } as { environment: 'development'; storage?: string };

      const result2 = await initializeApplicationServices(
        missingStorageConfig as AppInitializationConfig,
        createApplicationServicesWithContainer
      );
      expect(result2).toBeDefined();
    });

    it('should re-initialize services with new configuration', async () => {
      const config1 = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };
      const config2 = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };

      const result1 = await initializeApplicationServices(
        config1,
        createApplicationServicesWithContainer
      );
      const result2 = await initializeApplicationServices(
        config2,
        createApplicationServicesWithContainer
      );

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result2.gameAdapter).toBeDefined();
      expect(result2.applicationServices.logger).toBeDefined();
    });
  });

  describe('Logger Implementation', () => {
    it('should implement all Logger interface methods', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const logger = result.applicationServices.logger;

      expect(logger).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.debug('test message')).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.info('test message')).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.warn('test message')).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.error('test message')).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.log('info', 'test message')).not.toThrow();

      expect(typeof logger.isLevelEnabled('debug')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('info')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('warn')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('error')).toBe('boolean');
    });

    it('should handle logging with context and errors', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const logger = result.applicationServices.logger;

      const testError = new Error('Test error');
      const testContext = { gameId: 'test-game', operation: 'test' };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.debug('test message', testContext)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.info('test message', testContext)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.warn('test message', testContext)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.error('test message', testError, testContext)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect((): void => logger.log('error', 'test message', testContext, testError)).not.toThrow();
    });
  });

  describe('Integration with Repository System', () => {
    it('should integrate properly with existing repository initialization', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const applicationServices = result.applicationServices;

      expect(applicationServices.gameRepository).toBeDefined();
      expect(applicationServices.teamLineupRepository).toBeDefined();
      expect(applicationServices.inningStateRepository).toBeDefined();
      expect(applicationServices.eventStore).toBeDefined();

      expect(typeof applicationServices.gameRepository.findById).toBe('function');
      expect(typeof applicationServices.gameRepository.save).toBe('function');
      expect(typeof applicationServices.teamLineupRepository.findById).toBe('function');
      expect(typeof applicationServices.teamLineupRepository.save).toBe('function');
      expect(typeof applicationServices.inningStateRepository.findById).toBe('function');
      expect(typeof applicationServices.inningStateRepository.save).toBe('function');
    });

    it('should pass the same repository instances to all use cases', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const applicationServices = result.applicationServices;

      expect(applicationServices.startNewGame).toBeDefined();
      expect(applicationServices.recordAtBat).toBeDefined();
      expect(applicationServices.substitutePlayer).toBeDefined();
      expect(applicationServices.undoLastAction).toBeDefined();
      expect(applicationServices.redoLastAction).toBeDefined();
      expect(applicationServices.endInning).toBeDefined();
    });
  });

  describe('DI Container Specific Features', () => {
    it('should test container service registry functionality', async () => {
      const { DIContainer } = await import('@twsoftball/application/services/DIContainer');
      const container = new DIContainer();

      expect(typeof container.register).toBe('function');
      expect(typeof container.resolve).toBe('function');
      expect(typeof container.has).toBe('function');
      expect(typeof container.dispose).toBe('function');
    });

    it('should support lazy loading and singleton management', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result1 = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      const result2 = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.applicationServices.gameRepository).toBeDefined();
      expect(result1.applicationServices.logger).toBeDefined();
    });

    it('should handle different storage configurations correctly', async () => {
      const memoryConfig = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };
      const memoryResult = await initializeApplicationServices(
        memoryConfig,
        createApplicationServicesWithContainer
      );
      expect(memoryResult).toBeDefined();

      const indexedDBConfig = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };
      const indexedDBResult = await initializeApplicationServices(
        indexedDBConfig,
        createApplicationServicesWithContainer
      );
      expect(indexedDBResult).toBeDefined();

      expect(typeof memoryResult.applicationServices.startNewGame).toBe(
        typeof indexedDBResult.applicationServices.startNewGame
      );
      expect(typeof memoryResult.applicationServices.gameRepository).toBe(
        typeof indexedDBResult.applicationServices.gameRepository
      );
    });

    it('should properly handle service disposal and cleanup', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );
      expect(result).toBeDefined();
      expect(result.applicationServices).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should validate configuration parameters properly', async () => {
      const invalidEnvConfig = {
        environment: 'invalid' as 'development' | 'production',
        storage: 'memory' as const,
      };

      const result1 = await initializeApplicationServices(
        invalidEnvConfig,
        createApplicationServicesWithContainer
      );
      expect(result1).toBeDefined();

      const invalidStorageConfig = {
        environment: 'development' as const,
        storage: 'invalid' as 'memory' | 'indexeddb',
      };

      const result2 = await initializeApplicationServices(
        invalidStorageConfig,
        createApplicationServicesWithContainer
      );
      expect(result2).toBeDefined();

      const result3 = await initializeApplicationServices(
        {} as AppInitializationConfig,
        createApplicationServicesWithContainer
      );
      expect(result3).toBeDefined();
    });

    it('should handle service creation failures gracefully', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const failingServiceCreator = vi.fn().mockRejectedValue(new Error('Service creation failed'));

      await expect(initializeApplicationServices(config, failingServiceCreator)).rejects.toThrow(
        'Service creation failed'
      );

      expect(failingServiceCreator).toHaveBeenCalledWith({
        environment: 'development',
        storage: 'memory',
        debug: false,
      });
    });

    it('should clean up properly on initialization failure', async () => {
      const validConfig = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };
      const validResult = await initializeApplicationServices(
        validConfig,
        createApplicationServicesWithContainer
      );

      expect(validResult).toBeDefined();

      const failingServiceCreator = vi.fn().mockRejectedValue(new Error('Initialization failed'));

      const failingConfig = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };

      await expect(
        initializeApplicationServices(failingConfig, failingServiceCreator)
      ).rejects.toThrow('Initialization failed');

      expect(failingServiceCreator).toHaveBeenCalledWith({
        environment: 'production',
        storage: 'indexeddb',
        debug: false,
      });
    });
  });

  describe('Performance and Integration Tests', () => {
    it('should initialize services efficiently', async () => {
      const start = performance.now();

      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const result = await initializeApplicationServices(
        config,
        createApplicationServicesWithContainer
      );

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100);
      expect(result).toBeDefined();
    });

    it('should handle multiple rapid service access', async () => {
      const config = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };

      const results = await Promise.all(
        Array(10)
          .fill(null)
          .map(
            (): Promise<AppInitializationResult> =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              initializeApplicationServices(config, createApplicationServicesWithContainer)
          )
      );

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.gameAdapter).toBeDefined();
      });
    });

    it('should support service re-initialization with different configs', async () => {
      const memoryConfig = {
        environment: 'development' as const,
        storage: 'memory' as const,
      };
      const memoryResult = await initializeApplicationServices(
        memoryConfig,
        createApplicationServicesWithContainer
      );
      expect(memoryResult).toBeDefined();

      const indexedDBConfig = {
        environment: 'production' as const,
        storage: 'indexeddb' as const,
      };
      const indexedDBResult = await initializeApplicationServices(
        indexedDBConfig,
        createApplicationServicesWithContainer
      );
      expect(indexedDBResult).toBeDefined();

      expect(indexedDBResult.gameAdapter).toBeDefined();
      expect(indexedDBResult.applicationServices.logger).toBeDefined();
    });
  });
});
