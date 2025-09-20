/**
 * @file DIContainer Unit Tests
 * Comprehensive test suite for the Dependency Injection Container.
 *
 * @remarks
 * These tests ensure the DIContainer provides reliable dependency injection
 * with proper error handling, circular dependency detection, singleton management,
 * and clean architectural compliance. Tests cover both happy path scenarios
 * and edge cases to ensure enterprise-grade reliability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { ApplicationConfig } from '../types/ApplicationTypes.js';

import {
  DIContainer,
  CircularDependencyError,
  ServiceNotFoundError,
  DependencyResolutionError,
  createInitializedContainer,
  createApplicationServicesWithContainer,
} from './DIContainer.js';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    container.dispose();
  });

  describe('Basic Service Registration and Resolution', () => {
    it('should register and resolve simple services', async () => {
      // Arrange
      const testValue = 'test-service-value';
      container.register('testService', () => testValue);

      // Act
      const result = await container.resolve<string>('testService');

      // Assert
      expect(result).toBe(testValue);
    });

    it('should register and resolve services with dependencies', async () => {
      // Arrange
      const baseValue = 'base';
      const dependentValue = 'dependent';

      container.register('baseService', () => baseValue);
      container.register(
        'dependentService',
        async () => {
          const base = await container.resolve<string>('baseService');
          return `${dependentValue}-${base}`;
        },
        ['baseService']
      );

      // Act
      const result = await container.resolve<string>('dependentService');

      // Assert
      expect(result).toBe('dependent-base');
    });

    it('should resolve complex dependency chains', async () => {
      // Arrange
      container.register('serviceA', () => 'A');
      container.register(
        'serviceB',
        async () => {
          const a = await container.resolve<string>('serviceA');
          return `B-${a}`;
        },
        ['serviceA']
      );
      container.register(
        'serviceC',
        async () => {
          const b = await container.resolve<string>('serviceB');
          return `C-${b}`;
        },
        ['serviceB']
      );

      // Act
      const result = await container.resolve<string>('serviceC');

      // Assert
      expect(result).toBe('C-B-A');
    });
  });

  describe('Singleton Management', () => {
    it('should return same instance for singleton services', async () => {
      // Arrange
      let creationCount = 0;
      container.register('singletonService', () => {
        creationCount++;
        return { id: creationCount };
      });

      // Act
      const instance1 = await container.resolve('singletonService');
      const instance2 = await container.resolve('singletonService');

      // Assert
      expect(instance1).toBe(instance2);
      expect(creationCount).toBe(1);
    });

    it('should create new instances for non-singleton services', async () => {
      // Arrange
      let creationCount = 0;
      container.register(
        'transientService',
        () => {
          creationCount++;
          return { id: creationCount };
        },
        [],
        { isSingleton: false }
      );

      // Act
      const instance1 = await container.resolve('transientService');
      const instance2 = await container.resolve('transientService');

      // Assert
      expect(instance1).not.toBe(instance2);
      expect(creationCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw ServiceNotFoundError for unregistered services', async () => {
      // Act & Assert
      await expect(container.resolve('nonExistentService')).rejects.toThrow(ServiceNotFoundError);
    });

    it('should throw error when registering duplicate service names', () => {
      // Arrange
      container.register('duplicateService', () => Promise.resolve('first'));

      // Act & Assert
      expect(() => {
        container.register('duplicateService', () => Promise.resolve('second'));
      }).toThrow("Service 'duplicateService' is already registered");
    });

    it('should throw DependencyResolutionError when factory fails', async () => {
      // Arrange
      container.register('failingService', () => {
        throw new Error('Factory failed');
      });

      // Act & Assert
      await expect(container.resolve('failingService')).rejects.toThrow(DependencyResolutionError);
    });

    it('should throw error when resolving missing dependency', async () => {
      // Arrange
      container.register(
        'serviceWithMissingDep',
        async () => {
          await container.resolve('missingDependency');
          return 'result';
        },
        ['missingDependency']
      );

      // Act & Assert
      await expect(container.resolve('serviceWithMissingDep')).rejects.toThrow(
        DependencyResolutionError
      );

      try {
        await container.resolve('serviceWithMissingDep');
      } catch (error) {
        expect(error).toBeInstanceOf(DependencyResolutionError);
        expect(error.cause).toBeInstanceOf(ServiceNotFoundError);
      }
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect direct circular dependencies', async () => {
      // Arrange
      container.register(
        'serviceA',
        async () => {
          await container.resolve('serviceB');
          return 'A';
        },
        ['serviceB']
      );
      container.register(
        'serviceB',
        async () => {
          await container.resolve('serviceA');
          return 'B';
        },
        ['serviceA']
      );

      // Act & Assert
      await expect(container.resolve('serviceA')).rejects.toThrow(DependencyResolutionError);

      try {
        await container.resolve('serviceA');
      } catch (error) {
        expect(error).toBeInstanceOf(DependencyResolutionError);
        // The root cause should eventually be a CircularDependencyError
        let cause = error.cause;
        while (cause && !(cause instanceof CircularDependencyError)) {
          cause = cause.cause;
        }
        expect(cause).toBeInstanceOf(CircularDependencyError);
      }
    });

    it('should detect indirect circular dependencies', async () => {
      // Arrange
      container.register(
        'serviceA',
        async () => {
          await container.resolve('serviceB');
          return 'A';
        },
        ['serviceB']
      );
      container.register(
        'serviceB',
        async () => {
          await container.resolve('serviceC');
          return 'B';
        },
        ['serviceC']
      );
      container.register(
        'serviceC',
        async () => {
          await container.resolve('serviceA');
          return 'C';
        },
        ['serviceA']
      );

      // Act & Assert
      await expect(container.resolve('serviceA')).rejects.toThrow(DependencyResolutionError);

      try {
        await container.resolve('serviceA');
      } catch (error) {
        expect(error).toBeInstanceOf(DependencyResolutionError);
        // Find the root CircularDependencyError in the cause chain
        let cause = error.cause;
        while (cause && !(cause instanceof CircularDependencyError)) {
          cause = cause.cause;
        }
        expect(cause).toBeInstanceOf(CircularDependencyError);

        if (cause instanceof CircularDependencyError) {
          expect(cause.dependencyChain).toContain('serviceA');
          expect(cause.dependencyChain).toContain('serviceB');
          expect(cause.dependencyChain).toContain('serviceC');
        }
      }
    });

    it('should prevent infinite resolution with max depth check', async () => {
      // Arrange
      const smallDepthContainer = new DIContainer({ maxResolutionDepth: 3 });

      smallDepthContainer.register(
        'serviceA',
        async () => {
          await smallDepthContainer.resolve('serviceB');
          return 'A';
        },
        ['serviceB']
      );
      smallDepthContainer.register(
        'serviceB',
        async () => {
          await smallDepthContainer.resolve('serviceC');
          return 'B';
        },
        ['serviceC']
      );
      smallDepthContainer.register(
        'serviceC',
        async () => {
          await smallDepthContainer.resolve('serviceD');
          return 'C';
        },
        ['serviceD']
      );
      smallDepthContainer.register('serviceD', () => Promise.resolve('D'));

      // Act & Assert
      await expect(smallDepthContainer.resolve('serviceA')).rejects.toThrow(
        DependencyResolutionError
      );

      try {
        await smallDepthContainer.resolve('serviceA');
      } catch (error) {
        expect(error).toBeInstanceOf(DependencyResolutionError);
        // The max depth error should be somewhere in the cause chain
        let currentError = error;
        let foundMaxDepthError = false;
        while (currentError && !foundMaxDepthError) {
          if (currentError.message?.includes('Maximum resolution depth (3) exceeded')) {
            foundMaxDepthError = true;
          }
          currentError = currentError.cause;
        }
        expect(foundMaxDepthError).toBe(true);
      }

      smallDepthContainer.dispose();
    });
  });

  describe('Container Introspection', () => {
    it('should check if services are registered', () => {
      // Arrange
      container.register('registeredService', () => Promise.resolve('value'));

      // Act & Assert
      expect(container.has('registeredService')).toBe(true);
      expect(container.has('unregisteredService')).toBe(false);
    });

    it('should list all registered services', () => {
      // Arrange
      container.register('service1', () => Promise.resolve('value1'));
      container.register('service2', () => Promise.resolve('value2'));
      container.register('service3', () => Promise.resolve('value3'));

      // Act
      const services = container.getRegisteredServices();

      // Assert
      expect(services).toHaveLength(3);
      expect(services).toContain('service1');
      expect(services).toContain('service2');
      expect(services).toContain('service3');
    });

    it('should provide service information', () => {
      // Arrange
      container.register(
        'testService',
        () => Promise.resolve('value'),
        ['dependency1', 'dependency2'],
        {
          description: 'Test service description',
        }
      );

      // Act
      const info = container.getServiceInfo('testService');

      // Assert
      expect(info).toEqual({
        name: 'testService',
        dependencies: ['dependency1', 'dependency2'],
        isSingleton: true,
        hasInstance: false,
        description: 'Test service description',
      });
    });

    it('should update hasInstance after resolution', async () => {
      // Arrange
      container.register('testService', () => Promise.resolve('value'));

      // Act
      const infoBefore = container.getServiceInfo('testService');
      await container.resolve('testService');
      const infoAfter = container.getServiceInfo('testService');

      // Assert
      expect(infoBefore?.hasInstance).toBe(false);
      expect(infoAfter?.hasInstance).toBe(true);
    });
  });

  describe('Container Lifecycle', () => {
    it('should throw error when using disposed container', async () => {
      // Arrange
      container.dispose();

      // Act & Assert
      expect(() => {
        container.register('service', () => Promise.resolve('value'));
      }).toThrow('DIContainer has been disposed and cannot be used');

      await expect(container.resolve('service')).rejects.toThrow(
        'DIContainer has been disposed and cannot be used'
      );
    });

    it('should handle multiple dispose calls gracefully', () => {
      // Act & Assert
      expect(() => {
        container.dispose();
        container.dispose();
      }).not.toThrow();
    });

    it('should clear all services on disposal', () => {
      // Arrange
      container.register('service1', () => Promise.resolve('value1'));
      container.register('service2', () => Promise.resolve('value2'));

      // Act
      container.dispose();

      // Assert
      // Cannot directly test internal state, but ensure container is unusable
      expect(() => {
        container.getRegisteredServices();
      }).toThrow('DIContainer has been disposed and cannot be used');
    });
  });

  describe('Debug Mode', () => {
    it('should log debug information when enabled', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const debugContainer = new DIContainer({ debug: true });

      // Act
      debugContainer.register('testService', () => Promise.resolve('value'));
      await debugContainer.resolve('testService');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DIContainer] Container created with config:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DIContainer] Registered service 'testService'")
      );

      // Cleanup
      consoleSpy.mockRestore();
      debugContainer.dispose();
    });
  });

  describe('Parallel Resolution', () => {
    it('should handle parallel resolution of same service correctly', async () => {
      // Arrange
      let creationCount = 0;
      container.register('parallelService', async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        creationCount++;
        return { id: creationCount };
      });

      // Act
      const [result1, result2, result3] = await Promise.all([
        container.resolve('parallelService'),
        container.resolve('parallelService'),
        container.resolve('parallelService'),
      ]);

      // Assert
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(creationCount).toBe(1); // Should only create once despite parallel calls
    });

    it('should handle parallel resolution of different services', async () => {
      // Arrange
      container.register('service1', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'value1';
      });
      container.register('service2', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'value2';
      });

      // Act
      const [result1, result2] = await Promise.all([
        container.resolve('service1'),
        container.resolve('service2'),
      ]);

      // Assert
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });
  });
});

describe('Container Factory Functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createInitializedContainer', () => {
    it('should create and initialize container with memory storage', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act
      const container = await createInitializedContainer(config);

      // Assert
      expect(container).toBeInstanceOf(DIContainer);
      expect(container.has('applicationServices')).toBe(true);
      expect(container.has('logger')).toBe(true);
      expect(container.has('startNewGame')).toBe(true);

      // Cleanup
      container.dispose();
    });

    it('should create container with custom container config', async () => {
      // Arrange
      const appConfig: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };
      const containerConfig = {
        debug: true,
        maxResolutionDepth: 10,
      };

      // Act
      const container = await createInitializedContainer(appConfig, containerConfig);

      // Assert
      expect(container).toBeInstanceOf(DIContainer);

      // Cleanup
      container.dispose();
    });
  });

  describe('createApplicationServicesWithContainer', () => {
    it('should create ApplicationServices using DI container', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act
      const services = await createApplicationServicesWithContainer(config);

      // Assert
      expect(services).toBeDefined();
      expect(services.config).toEqual(config);
      expect(services.startNewGame).toBeDefined();
      expect(services.recordAtBat).toBeDefined();
      expect(services.substitutePlayer).toBeDefined();
      expect(services.undoLastAction).toBeDefined();
      expect(services.redoLastAction).toBeDefined();
      expect(services.endInning).toBeDefined();
      expect(services.gameRepository).toBeDefined();
      expect(services.teamLineupRepository).toBeDefined();
      expect(services.inningStateRepository).toBeDefined();
      expect(services.eventStore).toBeDefined();
      expect(services.logger).toBeDefined();
    });

    it('should handle different storage types', async () => {
      // Arrange
      const memoryConfig: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Act
      const services = await createApplicationServicesWithContainer(memoryConfig);

      // Assert
      expect(services).toBeDefined();
      expect(services.config.storage).toBe('memory');
    });

    it('should handle invalid storage type', async () => {
      // Arrange
      const invalidConfig: ApplicationConfig = {
        environment: 'test',
        storage: 'unsupported' as 'memory' | 'indexeddb' | 'sqlite' | 'cloud',
      };

      // Act & Assert
      await expect(createApplicationServicesWithContainer(invalidConfig)).rejects.toThrow(
        'Unsupported storage: unsupported'
      );
    });
  });
});

describe('DIContainer Integration with Real Dependencies', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer({ debug: false });
  });

  afterEach(() => {
    container.dispose();
  });

  it('should initialize and resolve complete application services', async () => {
    // Arrange
    const config: ApplicationConfig = {
      environment: 'test',
      storage: 'memory',
    };

    // Act
    await container.initialize(config);
    const services = await container.resolve('applicationServices');

    // Assert
    expect(services).toBeDefined();
    expect(typeof services.startNewGame.execute).toBe('function');
    expect(typeof services.recordAtBat.execute).toBe('function');
    expect(typeof services.gameRepository.save).toBe('function');
    expect(typeof services.eventStore.append).toBe('function');
    expect(typeof services.logger.info).toBe('function');
  });

  it('should properly resolve use case dependencies', async () => {
    // Arrange
    const config: ApplicationConfig = {
      environment: 'test',
      storage: 'memory',
    };

    // Act
    await container.initialize(config);
    const startNewGame = await container.resolve('startNewGame');
    const gameRepository = await container.resolve('gameRepository');
    const eventStore = await container.resolve('eventStore');
    const logger = await container.resolve('logger');

    // Assert
    // Verify that use case has the same repository instances
    expect(startNewGame).toBeDefined();
    expect(gameRepository).toBeDefined();
    expect(eventStore).toBeDefined();
    expect(logger).toBeDefined();

    // All should be singletons - same instances across resolves
    const gameRepository2 = await container.resolve('gameRepository');
    const eventStore2 = await container.resolve('eventStore');
    expect(gameRepository).toBe(gameRepository2);
    expect(eventStore).toBe(eventStore2);
  });

  it('should handle initialization failure gracefully', async () => {
    // Arrange
    const invalidConfig: ApplicationConfig = {
      environment: 'test',
      storage: 'invalid' as 'memory' | 'indexeddb' | 'sqlite' | 'cloud',
    };

    // Act & Assert
    await expect(container.initialize(invalidConfig)).rejects.toThrow(
      'Failed to initialize DI container'
    );
  });
});

describe('Error Classes', () => {
  describe('CircularDependencyError', () => {
    it('should create error with dependency chain', () => {
      // Arrange
      const chain = ['serviceA', 'serviceB', 'serviceC', 'serviceA'];

      // Act
      const error = new CircularDependencyError(chain);

      // Assert
      expect(error.name).toBe('CircularDependencyError');
      expect(error.dependencyChain).toEqual(chain);
      expect(error.message).toContain('serviceA -> serviceB -> serviceC -> serviceA');
    });

    it('should allow custom error message', () => {
      // Arrange
      const chain = ['serviceA', 'serviceB'];
      const customMessage = 'Custom circular dependency message';

      // Act
      const error = new CircularDependencyError(chain, customMessage);

      // Assert
      expect(error.message).toBe(customMessage);
      expect(error.dependencyChain).toEqual(chain);
    });
  });

  describe('ServiceNotFoundError', () => {
    it('should create error with service name', () => {
      // Arrange
      const serviceName = 'missingService';

      // Act
      const error = new ServiceNotFoundError(serviceName);

      // Assert
      expect(error.name).toBe('ServiceNotFoundError');
      expect(error.serviceName).toBe(serviceName);
      expect(error.message).toContain(serviceName);
    });
  });

  describe('DependencyResolutionError', () => {
    it('should create error with service name and cause', () => {
      // Arrange
      const serviceName = 'problematicService';
      const cause = new Error('Original error');

      // Act
      const error = new DependencyResolutionError(serviceName, cause);

      // Assert
      expect(error.name).toBe('DependencyResolutionError');
      expect(error.serviceName).toBe(serviceName);
      expect(error.cause).toBe(cause);
      expect(error.message).toContain(serviceName);
    });
  });
});
