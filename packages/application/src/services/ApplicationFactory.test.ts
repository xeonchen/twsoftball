/**
 * @file ApplicationFactory Unit Tests
 * Comprehensive test suite for the ApplicationFactory with dynamic infrastructure loading.
 *
 * @remarks
 * These tests ensure the ApplicationFactory correctly creates application services
 * with proper dynamic infrastructure loading, error handling, and architectural
 * compliance. Tests cover success paths, error scenarios, and edge cases to
 * ensure reliable service creation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createTestInfrastructureFactory } from '../test-factories/test-infrastructure-factory.js';
import type { ApplicationConfig } from '../types/ApplicationTypes.js';

import {
  createApplicationServicesWithContainer,
  createApplicationServicesWithContainerAndFactory,
} from './ApplicationFactory.js';
import type { InfrastructureFactory, InfrastructureServices } from './InfrastructureFactory.js';

describe('ApplicationFactory', () => {
  let mockMemoryModule: { createMemoryFactory: () => InfrastructureFactory };
  let mockIndexedDBModule: { createIndexedDBFactory: () => InfrastructureFactory };
  let mockInfrastructureFactory: InfrastructureFactory;

  beforeEach(() => {
    // Create mock infrastructure factory
    mockInfrastructureFactory = createTestInfrastructureFactory();

    // Mock the memory infrastructure module
    mockMemoryModule = {
      createMemoryFactory: vi.fn(() => mockInfrastructureFactory),
    };

    // Mock the IndexedDB infrastructure module
    mockIndexedDBModule = {
      createIndexedDBFactory: vi.fn(() => mockInfrastructureFactory),
    };

    // Mock dynamic imports for infrastructure modules
    vi.doMock('@twsoftball/infrastructure/memory', () => mockMemoryModule);
    vi.doMock('@twsoftball/infrastructure/web', () => mockIndexedDBModule);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock('@twsoftball/infrastructure/memory');
    vi.doUnmock('@twsoftball/infrastructure/web');
  });

  describe('createApplicationServicesWithContainer', () => {
    describe('Success paths', () => {
      it('should create application services with memory storage configuration', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
          debug: false,
        };

        // Act
        const services = await createApplicationServicesWithContainer(config);

        // Assert
        expect(services).toBeDefined();
        expect(services).toHaveProperty('startNewGame');
        expect(services).toHaveProperty('recordAtBat');
        expect(services).toHaveProperty('substitutePlayer');
        expect(services).toHaveProperty('undoLastAction');
        expect(services).toHaveProperty('redoLastAction');
        expect(services).toHaveProperty('endInning');
        expect(services).toHaveProperty('gameRepository');
        expect(services).toHaveProperty('teamLineupRepository');
        expect(services).toHaveProperty('inningStateRepository');
        expect(services).toHaveProperty('eventStore');
        expect(services).toHaveProperty('logger');
        expect(services).toHaveProperty('config');

        expect(services.config).toEqual(config);
        expect(mockMemoryModule.createMemoryFactory).toHaveBeenCalledTimes(1);
      });

      it('should create application services with indexeddb storage configuration', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'production',
          storage: 'indexeddb',
          debug: true,
          storageConfig: { dbName: 'test-db' },
        };

        // Act
        const services = await createApplicationServicesWithContainer(config);

        // Assert
        expect(services).toBeDefined();
        expect(services.config).toEqual(config);
        expect(mockIndexedDBModule.createIndexedDBFactory).toHaveBeenCalledTimes(1);
      });

      it('should verify proper container initialization and service resolution', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'development',
          storage: 'memory',
        };

        // Act
        const services = await createApplicationServicesWithContainer(config);

        // Assert
        // Verify all use cases are properly initialized
        expect(typeof services.startNewGame.execute).toBe('function');
        expect(typeof services.recordAtBat.execute).toBe('function');
        expect(typeof services.substitutePlayer.execute).toBe('function');
        expect(typeof services.undoLastAction.execute).toBe('function');
        expect(typeof services.redoLastAction.execute).toBe('function');
        expect(typeof services.endInning.execute).toBe('function');

        // Verify repositories have expected methods
        expect(typeof services.gameRepository.save).toBe('function');
        expect(typeof services.teamLineupRepository.save).toBe('function');
        expect(typeof services.inningStateRepository.save).toBe('function');
        expect(typeof services.eventStore.append).toBe('function');
        expect(typeof services.logger.info).toBe('function');
      });

      it('should handle development environment with debug enabled', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'development',
          storage: 'memory',
          debug: true,
        };

        // Act
        const services = await createApplicationServicesWithContainer(config);

        // Assert
        expect(services).toBeDefined();
        expect(services.config.debug).toBe(true);
        expect(services.config.environment).toBe('development');
      });

      it('should handle production environment configuration', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'production',
          storage: 'indexeddb',
          debug: false,
          storageConfig: {
            version: 1,
            upgradeNeeded: true,
          },
        };

        // Act
        const services = await createApplicationServicesWithContainer(config);

        // Assert
        expect(services).toBeDefined();
        expect(services.config.environment).toBe('production');
        expect(services.config.storageConfig).toEqual({
          version: 1,
          upgradeNeeded: true,
        });
      });
    });

    describe('Error handling scenarios', () => {
      it('should throw error for unsupported storage type', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'unsupported' as 'memory' | 'indexeddb',
        };

        // Act & Assert
        await expect(createApplicationServicesWithContainer(config)).rejects.toThrow(
          'Unsupported storage: unsupported'
        );
      });

      it('should handle error when sqlite storage is requested', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'sqlite',
        };

        // Act & Assert
        await expect(createApplicationServicesWithContainer(config)).rejects.toThrow(
          'Unsupported storage: sqlite'
        );
      });

      it('should handle error when cloud storage is requested', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'cloud',
        };

        // Act & Assert
        await expect(createApplicationServicesWithContainer(config)).rejects.toThrow(
          'Unsupported storage: cloud'
        );
      });

      it('should propagate factory creation errors', async () => {
        // Arrange
        const failingFactory = {
          createMemoryFactory: vi.fn(() => {
            throw new Error('Memory factory creation failed');
          }),
        };

        vi.doMock('@twsoftball/infrastructure/memory', () => failingFactory);

        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
        };

        // Act & Assert
        await expect(createApplicationServicesWithContainer(config)).rejects.toThrow(
          'Memory factory creation failed'
        );

        vi.doUnmock('@twsoftball/infrastructure/memory');
      });

      it('should handle factory creation errors in container initialization', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
        };

        // Mock a factory that throws during createServices
        const failingInfraFactory = createTestInfrastructureFactory();
        vi.spyOn(failingInfraFactory, 'createServices').mockRejectedValue(
          new Error('Infrastructure initialization failed')
        );

        // Act & Assert
        await expect(
          createApplicationServicesWithContainerAndFactory(config, failingInfraFactory)
        ).rejects.toThrow('Failed to resolve dependencies for service');
      });

      it('should handle error cases during service resolution', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
        };

        // This tests the error handling path when container initialization fails
        const invalidFactory: InfrastructureFactory = {
          createServices: () =>
            Promise.resolve({
              // Missing required services to trigger resolution errors
            } as InfrastructureServices),
          getDescription: () => 'Invalid factory',
          getStorageType: () => 'invalid',
        };

        // Act & Assert
        await expect(
          createApplicationServicesWithContainerAndFactory(config, invalidFactory)
        ).rejects.toThrow();
      });
    });
  });

  describe('createApplicationServicesWithContainerAndFactory', () => {
    describe('Success paths', () => {
      it('should create application services with explicit factory parameter', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
          debug: false,
        };
        const explicitFactory = createTestInfrastructureFactory();

        // Act
        const services = await createApplicationServicesWithContainerAndFactory(
          config,
          explicitFactory
        );

        // Assert
        expect(services).toBeDefined();
        expect(services.config).toEqual(config);
        expect(services).toHaveProperty('startNewGame');
        expect(services).toHaveProperty('recordAtBat');
        expect(services).toHaveProperty('substitutePlayer');
        expect(services).toHaveProperty('undoLastAction');
        expect(services).toHaveProperty('redoLastAction');
        expect(services).toHaveProperty('endInning');
        expect(services).toHaveProperty('gameRepository');
        expect(services).toHaveProperty('teamLineupRepository');
        expect(services).toHaveProperty('inningStateRepository');
        expect(services).toHaveProperty('eventStore');
        expect(services).toHaveProperty('logger');
      });

      it('should verify factory is used correctly', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'development',
          storage: 'indexeddb',
          debug: true,
        };

        // Create a spy on the factory method
        const createServicesSpy = vi.fn();
        const testFactory: InfrastructureFactory = {
          createServices: createServicesSpy.mockImplementation(() =>
            mockInfrastructureFactory.createServices({
              environment: config.environment,
              debug: config.debug,
            })
          ),
          getDescription: () => 'Test factory for verification',
          getStorageType: () => 'test-storage',
        };

        // Act
        const services = await createApplicationServicesWithContainerAndFactory(
          config,
          testFactory
        );

        // Assert
        expect(services).toBeDefined();
        expect(createServicesSpy).toHaveBeenCalledWith({
          environment: 'development',
          debug: true,
          storageConfig: {},
        });
      });

      it('should verify service resolution works with explicit factory', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'production',
          storage: 'indexeddb',
        };
        const explicitFactory = createTestInfrastructureFactory();

        // Act
        const services = await createApplicationServicesWithContainerAndFactory(
          config,
          explicitFactory
        );

        // Assert
        // Verify all services are callable
        expect(typeof services.startNewGame.execute).toBe('function');
        expect(typeof services.recordAtBat.execute).toBe('function');
        expect(typeof services.substitutePlayer.execute).toBe('function');
        expect(typeof services.undoLastAction.execute).toBe('function');
        expect(typeof services.redoLastAction.execute).toBe('function');
        expect(typeof services.endInning.execute).toBe('function');

        // Verify repositories and supporting services
        expect(typeof services.gameRepository.save).toBe('function');
        expect(typeof services.teamLineupRepository.save).toBe('function');
        expect(typeof services.inningStateRepository.save).toBe('function');
        expect(typeof services.eventStore.append).toBe('function');
        expect(typeof services.logger.info).toBe('function');
      });

      it('should handle custom factory with different storage type', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory', // Config storage doesn't need to match factory storage
        };

        const customFactory: InfrastructureFactory = {
          createServices: () =>
            mockInfrastructureFactory.createServices({
              environment: config.environment,
              debug: config.debug,
            }),
          getDescription: () => 'Custom test factory implementation',
          getStorageType: () => 'custom-storage',
        };

        // Act
        const services = await createApplicationServicesWithContainerAndFactory(
          config,
          customFactory
        );

        // Assert
        expect(services).toBeDefined();
        expect(services.config.storage).toBe('memory'); // Config storage preserved
      });
    });

    describe('Error handling scenarios', () => {
      it('should propagate infrastructure factory errors', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
        };

        const failingFactory: InfrastructureFactory = {
          createServices: () => Promise.reject(new Error('Infrastructure service creation failed')),
          getDescription: () => 'Failing factory',
          getStorageType: () => 'failing',
        };

        // Act & Assert
        await expect(
          createApplicationServicesWithContainerAndFactory(config, failingFactory)
        ).rejects.toThrow('Failed to resolve dependencies for service');
      });

      it('should handle factory returning invalid services', async () => {
        // Arrange
        const config: ApplicationConfig = {
          environment: 'test',
          storage: 'memory',
        };

        const invalidFactory: InfrastructureFactory = {
          createServices: () => Promise.resolve({} as InfrastructureServices),
          getDescription: () => 'Invalid factory',
          getStorageType: () => 'invalid',
        };

        // Act & Assert
        // This should fail during container initialization when trying to register services
        await expect(
          createApplicationServicesWithContainerAndFactory(config, invalidFactory)
        ).rejects.toThrow();
      });
    });
  });

  describe('Dynamic import resolution scenarios', () => {
    it('should successfully resolve memory storage dynamic import', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act
      const services = await createApplicationServicesWithContainer(config);

      // Assert
      expect(services).toBeDefined();
      expect(mockMemoryModule.createMemoryFactory).toHaveBeenCalledTimes(1);
      // IndexedDB module should not be called for memory storage
      expect(mockIndexedDBModule.createIndexedDBFactory).not.toHaveBeenCalled();
    });

    it('should successfully resolve indexeddb storage dynamic import', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'indexeddb',
      };

      // Act
      const services = await createApplicationServicesWithContainer(config);

      // Assert
      expect(services).toBeDefined();
      expect(mockIndexedDBModule.createIndexedDBFactory).toHaveBeenCalledTimes(1);
      // Memory module should not be called for IndexedDB storage
      expect(mockMemoryModule.createMemoryFactory).not.toHaveBeenCalled();
    });

    it('should handle module with incorrect export structure', async () => {
      // Arrange
      const malformedModule = {
        wrongExportName: (): InfrastructureFactory => mockInfrastructureFactory,
      };

      vi.doMock('@twsoftball/infrastructure/memory', () => malformedModule);

      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act & Assert
      await expect(createApplicationServicesWithContainer(config)).rejects.toThrow();

      vi.doUnmock('@twsoftball/infrastructure/memory');
    });

    it('should handle module returning undefined factory function', async () => {
      // Arrange
      const moduleWithUndefinedFactory = {
        createMemoryFactory: undefined,
      };

      vi.doMock('@twsoftball/infrastructure/memory', () => moduleWithUndefinedFactory);

      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act & Assert
      await expect(createApplicationServicesWithContainer(config)).rejects.toThrow();

      vi.doUnmock('@twsoftball/infrastructure/memory');
    });
  });

  describe('Integration scenarios', () => {
    it('should create different services with different configurations', async () => {
      // Arrange
      const memoryConfig: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
        debug: false,
      };

      const indexedDBConfig: ApplicationConfig = {
        environment: 'development',
        storage: 'indexeddb',
        debug: true,
        storageConfig: { dbName: 'dev-db' },
      };

      // Act
      const memoryServices = await createApplicationServicesWithContainer(memoryConfig);
      const indexedDBServices = await createApplicationServicesWithContainer(indexedDBConfig);

      // Assert
      expect(memoryServices).toBeDefined();
      expect(indexedDBServices).toBeDefined();
      expect(memoryServices.config.storage).toBe('memory');
      expect(indexedDBServices.config.storage).toBe('indexeddb');
      expect(memoryServices.config.debug).toBe(false);
      expect(indexedDBServices.config.debug).toBe(true);

      // Verify both configurations called appropriate modules
      expect(mockMemoryModule.createMemoryFactory).toHaveBeenCalledTimes(1);
      expect(mockIndexedDBModule.createIndexedDBFactory).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed factory approaches in sequence', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };
      const explicitFactory = createTestInfrastructureFactory();

      // Act
      const servicesWithAutoFactory = await createApplicationServicesWithContainer(config);
      const servicesWithExplicitFactory = await createApplicationServicesWithContainerAndFactory(
        config,
        explicitFactory
      );

      // Assert
      expect(servicesWithAutoFactory).toBeDefined();
      expect(servicesWithExplicitFactory).toBeDefined();
      expect(servicesWithAutoFactory.config).toEqual(config);
      expect(servicesWithExplicitFactory.config).toEqual(config);

      // Verify auto factory approach called dynamic import
      expect(mockMemoryModule.createMemoryFactory).toHaveBeenCalledTimes(1);
    });
  });
});
