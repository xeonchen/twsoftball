/**
 * @file DIContainer Integration Tests
 * Integration test suite verifying DIContainer works correctly with use cases and test infrastructure.
 *
 * @remarks
 * These integration tests ensure the DIContainer properly integrates with
 * application use cases and mock infrastructure services. Tests verify end-to-end functionality
 * and architectural compliance without creating circular dependencies.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createStartNewGameCommand } from '../test-factories/command-factories.js';
import { createTestInfrastructureFactory } from '../test-factories/test-infrastructure-factory.js';
import type { ApplicationConfig, ApplicationServices } from '../types/ApplicationTypes.js';

import { DIContainer, createApplicationServicesWithContainer } from './DIContainer.js';

describe('DIContainer Integration Tests', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    if (container) {
      container.dispose();
    }
  });

  describe('DI Container Application Services Integration', () => {
    it('should provide complete ApplicationServices interface with test infrastructure', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Override infrastructure factory with test implementation
      const testInfraFactory = createTestInfrastructureFactory();
      container.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));

      // Act
      const containerServices = await createApplicationServicesWithContainer(config);

      // Assert - Should have complete interface
      expect(typeof containerServices.startNewGame.execute).toBe('function');
      expect(typeof containerServices.recordAtBat.execute).toBe('function');
      expect(typeof containerServices.substitutePlayer.execute).toBe('function');
      expect(typeof containerServices.undoLastAction.execute).toBe('function');
      expect(typeof containerServices.redoLastAction.execute).toBe('function');
      expect(typeof containerServices.endInning.execute).toBe('function');

      expect(typeof containerServices.gameRepository.save).toBe('function');
      expect(typeof containerServices.teamLineupRepository.save).toBe('function');
      expect(typeof containerServices.inningStateRepository.save).toBe('function');
      expect(typeof containerServices.eventStore.append).toBe('function');
      expect(typeof containerServices.logger.info).toBe('function');

      // Config should match provided config
      expect(containerServices.config).toEqual(config);
    });

    it('should execute StartNewGame use case successfully with test infrastructure', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      // Create a new container for this test
      const testContainer = new DIContainer();
      const testInfraFactory = createTestInfrastructureFactory();
      testContainer.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));

      // Act
      await testContainer.initialize(config);
      const startNewGame = await testContainer.resolve('startNewGame');

      // Use proper command format
      const command = createStartNewGameCommand.standard();

      const result = await startNewGame.execute(command);

      // Assert - Should successfully create a game
      if (!result.success) {
        // More detailed debugging
        console.error('StartNewGame failed with details:', {
          success: result.success,
          gameId: result.gameId,
          errors: result.errors,
          hasInitialState: !!result.initialState,
        });
        // Force test to show the actual error
        throw new Error(`StartNewGame failed: ${JSON.stringify(result.errors)}`);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.initialState).toBeDefined();
        expect(result.initialState?.homeLineup.teamName).toBe('Tigers');
        expect(result.initialState?.awayLineup.teamName).toBe('Lions');
      }

      testContainer.dispose();
    });
  });

  describe('Test Infrastructure Integration', () => {
    it('should properly initialize test infrastructure', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      const testInfraFactory = createTestInfrastructureFactory();
      container.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));

      // Act
      await container.initialize(config);
      const logger = await container.resolve('logger');
      const gameRepository = await container.resolve('gameRepository');
      const eventStore = await container.resolve('eventStore');

      // Assert
      expect(logger).toBeDefined();
      expect(gameRepository).toBeDefined();
      expect(eventStore).toBeDefined();

      // Verify they are functional
      expect(typeof logger.info).toBe('function');
      expect(typeof gameRepository.save).toBe('function');
      expect(typeof eventStore.append).toBe('function');
    });

    it('should handle different environment configurations with test infrastructure', async () => {
      // Test development environment
      const devConfig: ApplicationConfig = {
        environment: 'development',
        storage: 'memory',
        debug: true,
      };

      const testInfraFactory = createTestInfrastructureFactory();
      container.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));

      await container.initialize(devConfig);
      const devServices = await container.resolve<ApplicationServices>('applicationServices');
      expect(devServices.config.environment).toBe('development');
      expect(devServices.config.debug).toBe(true);

      container.dispose();

      // Test production environment with new container
      const prodContainer = new DIContainer();
      const prodConfig: ApplicationConfig = {
        environment: 'production',
        storage: 'memory',
        debug: false,
      };

      prodContainer.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));
      await prodContainer.initialize(prodConfig);
      const prodServices = await prodContainer.resolve<ApplicationServices>('applicationServices');
      expect(prodServices.config.environment).toBe('production');
      expect(prodServices.config.debug).toBe(false);

      prodContainer.dispose();
    });
  });

  describe('Use Case Dependency Injection', () => {
    it('should properly inject dependencies into StartNewGame use case', async () => {
      // Arrange
      const config: ApplicationConfig = {
        environment: 'test',
        storage: 'memory',
      };

      const testInfraFactory = createTestInfrastructureFactory();
      container.register('infrastructureFactory', () => Promise.resolve(testInfraFactory));

      // Act
      await container.initialize(config);
      const startNewGame = await container.resolve('startNewGame');
      const _gameRepository = await container.resolve('gameRepository');
      const _eventStore = await container.resolve('eventStore');
      const _logger = await container.resolve('logger');

      // Assert
      expect(startNewGame).toBeDefined();

      // Verify use case can be executed (indirect test of proper dependency injection)
      const command = createStartNewGameCommand.standard({
        homeTeamName: 'Test Home',
        awayTeamName: 'Test Away',
      });

      // Should not throw (indicates successful dependency injection)
      const result = await startNewGame.execute(command);
      expect(result).toBeDefined();
      if (!result.success) {
        throw new Error(
          `StartNewGame dependency injection test failed: ${JSON.stringify(result.errors)}`
        );
      }
      expect(result.success).toBe(true);
    });
  });
});
