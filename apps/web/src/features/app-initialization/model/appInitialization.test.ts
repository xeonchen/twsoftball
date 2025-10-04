/**
 * @file App Initialization Tests
 * Tests for application initialization logic that was moved from shared/di/container
 */

import type { ApplicationServices } from '@twsoftball/application';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { initializeApplicationServices, type AppInitializationConfig } from './appInitialization';

// Mock the application layer
const mockApplicationServices = {
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
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  config: { environment: 'development', storage: 'memory' },
} as unknown as ApplicationServices;

const mockCreateApplicationServicesWithContainer = vi.fn();

// Mock the wizard to command mapper
const _mockWizardToCommand = vi.fn();

describe('App Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateApplicationServicesWithContainer.mockResolvedValue(mockApplicationServices);
  });

  describe('initializeApplicationServices', () => {
    it('should initialize application services with correct configuration', async () => {
      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
        debug: true,
      };

      const result = await initializeApplicationServices(
        config,
        mockCreateApplicationServicesWithContainer
      );

      expect(mockCreateApplicationServicesWithContainer).toHaveBeenCalledWith({
        environment: 'development',
        storage: 'memory',
        debug: true,
      });

      expect(result).toBeDefined();
      expect(result.applicationServices).toBe(mockApplicationServices);
      expect(result.gameAdapter).toBeDefined();
    });

    it('should handle production configuration', async () => {
      const config: AppInitializationConfig = {
        environment: 'production',
        storage: 'indexeddb',
        debug: false,
      };

      const result = await initializeApplicationServices(
        config,
        mockCreateApplicationServicesWithContainer
      );

      expect(mockCreateApplicationServicesWithContainer).toHaveBeenCalledWith({
        environment: 'production',
        storage: 'indexeddb',
        debug: false,
      });

      expect(result.applicationServices).toBe(mockApplicationServices);
    });

    it('should use default debug value when not provided', async () => {
      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
      };

      await initializeApplicationServices(config, mockCreateApplicationServicesWithContainer);

      expect(mockCreateApplicationServicesWithContainer).toHaveBeenCalledWith({
        environment: 'development',
        storage: 'memory',
        debug: false,
      });
    });

    it('should propagate errors from application services creation', async () => {
      const error = new Error('Failed to initialize infrastructure');
      mockCreateApplicationServicesWithContainer.mockRejectedValue(error);

      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
      };

      await expect(
        initializeApplicationServices(config, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Failed to initialize infrastructure');
    });

    it('should create a GameAdapter with wizard to command mapper', async () => {
      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
      };

      const result = await initializeApplicationServices(
        config,
        mockCreateApplicationServicesWithContainer
      );

      expect(result.gameAdapter).toBeDefined();
      expect(result.gameAdapter.startNewGameFromWizard).toBeDefined();
    });

    it('should validate configuration parameters', async () => {
      const invalidConfig = {
        environment: 'invalid' as const,
        storage: 'memory' as const,
      };

      await expect(
        initializeApplicationServices(invalidConfig, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Invalid environment');
    });

    it('should validate storage type', async () => {
      const invalidConfig = {
        environment: 'development' as const,
        storage: 'invalid' as const,
      };

      await expect(
        initializeApplicationServices(invalidConfig, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Invalid storage type');
    });

    it('should log successful initialization', async () => {
      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
        debug: true,
      };

      await initializeApplicationServices(config, mockCreateApplicationServicesWithContainer);

      expect(mockApplicationServices.logger.info).toHaveBeenCalledWith(
        'App initialization: Application services initialized successfully',
        {
          environment: 'development',
          storage: 'memory',
          debug: true,
        }
      );
    });

    it('should handle initialization with different storage types', async () => {
      const configs: AppInitializationConfig[] = [
        { environment: 'development', storage: 'memory' },
        { environment: 'production', storage: 'indexeddb' },
      ];

      for (const config of configs) {
        vi.clearAllMocks();
        mockCreateApplicationServicesWithContainer.mockResolvedValue(mockApplicationServices);

        const result = await initializeApplicationServices(
          config,
          mockCreateApplicationServicesWithContainer
        );

        expect(result.applicationServices).toBe(mockApplicationServices);
        expect(mockCreateApplicationServicesWithContainer).toHaveBeenCalledWith(
          expect.objectContaining({
            storage: config.storage,
          })
        );
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should reject null configuration', async () => {
      await expect(
        initializeApplicationServices(null as unknown as AppInitializationConfig, vi.fn())
      ).rejects.toThrow('Configuration is required');
    });

    it('should reject undefined configuration', async () => {
      await expect(
        initializeApplicationServices(undefined as unknown as AppInitializationConfig, vi.fn())
      ).rejects.toThrow('Configuration is required');
    });

    it('should reject missing environment', async () => {
      const config = {
        storage: 'memory',
      } as AppInitializationConfig;

      await expect(
        initializeApplicationServices(config, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Invalid environment');
    });

    it('should reject missing storage', async () => {
      const config = {
        environment: 'development',
      } as AppInitializationConfig;

      await expect(
        initializeApplicationServices(config, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Invalid storage type');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error message when application services fail', async () => {
      const originalError = new Error('Database connection failed');
      mockCreateApplicationServicesWithContainer.mockRejectedValue(originalError);

      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
      };

      await expect(
        initializeApplicationServices(config, mockCreateApplicationServicesWithContainer)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle non-Error objects', async () => {
      const nonError = 'String error';
      mockCreateApplicationServicesWithContainer.mockRejectedValue(nonError);

      const config: AppInitializationConfig = {
        environment: 'development',
        storage: 'memory',
      };

      await expect(
        initializeApplicationServices(config, mockCreateApplicationServicesWithContainer)
      ).rejects.toBe(nonError);
    });
  });
});
