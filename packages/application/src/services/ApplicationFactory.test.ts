/**
 * @file ApplicationFactory Unit Tests
 * Comprehensive test suite for the ApplicationFactory with infrastructure loading.
 *
 * @remarks
 * These tests ensure the ApplicationFactory correctly creates application services
 * with proper infrastructure loading, error handling, and architectural
 * compliance. Tests cover success paths, error scenarios, and edge cases to
 * ensure reliable service creation.
 */

import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createTestInfrastructureFactory } from '../test-factories/test-infrastructure-factory.js';
import type { ApplicationConfig } from '../types/ApplicationTypes.js';

import { createApplicationServicesWithContainerAndFactory } from './ApplicationFactory.js';
import type { InfrastructureFactory, InfrastructureServices } from './InfrastructureFactory.js';

// Mock infrastructure modules with static imports
vi.mock('@twsoftball/infrastructure/memory', () => ({
  createMemoryFactory: vi.fn(),
}));

vi.mock('@twsoftball/infrastructure/web', () => ({
  createIndexedDBFactory: vi.fn(),
}));

describe('ApplicationFactory', () => {
  let mockInfrastructureFactory: InfrastructureFactory;

  beforeEach(() => {
    // Create mock infrastructure factory
    mockInfrastructureFactory = createTestInfrastructureFactory();

    // Setup mock implementations
    vi.mocked(createMemoryFactory).mockReturnValue(mockInfrastructureFactory);
    vi.mocked(createIndexedDBFactory).mockReturnValue(mockInfrastructureFactory);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
});
