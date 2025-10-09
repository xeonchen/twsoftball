/**
 * @file IndexedDB Infrastructure Factory Tests
 * Comprehensive tests for IndexedDB-based factory implementation.
 *
 * @remarks
 * Tests ConsoleLogger and IndexedDBInfrastructureFactory following TDD principles.
 * Covers happy paths, error scenarios, validation, and environment checks.
 */

import type { InfrastructureConfig } from '@twsoftball/application';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { createMockIndexedDB } from '../test-utils/indexeddb';

import { createIndexedDBFactory } from './factory';

describe('IndexedDB Infrastructure Factory', () => {
  // Store original globals
  let originalIndexedDB: IDBFactory;
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save original globals
    originalIndexedDB = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    originalWindow = globalThis.window;

    // Mock IndexedDB
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
  });

  afterEach(() => {
    // Restore original globals
    (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = originalIndexedDB;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('createIndexedDBFactory', () => {
    it('should create a factory instance', () => {
      const factory = createIndexedDBFactory();

      expect(factory).toBeDefined();
      expect(typeof factory.createServices).toBe('function');
      expect(typeof factory.getStorageType).toBe('function');
      expect(typeof factory.getDescription).toBe('function');
    });

    it('should return factory implementing InfrastructureFactory interface', () => {
      const factory = createIndexedDBFactory();

      expect(factory).toHaveProperty('createServices');
      expect(factory).toHaveProperty('getStorageType');
      expect(factory).toHaveProperty('getDescription');
    });
  });

  describe('IndexedDBInfrastructureFactory.getStorageType', () => {
    it('should return "indexeddb" as storage type', () => {
      const factory = createIndexedDBFactory();

      expect(factory.getStorageType()).toBe('indexeddb');
    });
  });

  describe('IndexedDBInfrastructureFactory.getDescription', () => {
    it('should return descriptive string about IndexedDB capabilities', () => {
      const factory = createIndexedDBFactory();

      const description = factory.getDescription();
      expect(description).toBe(
        'IndexedDB-based persistence for web browsers with offline-first capabilities'
      );
      expect(description).toContain('IndexedDB');
      expect(description).toContain('offline');
    });
  });

  describe('IndexedDBInfrastructureFactory.createServices - Success Cases', () => {
    it('should create services successfully with valid config', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: false,
      };

      const services = await factory.createServices(config);

      expect(services).toBeDefined();
      expect(services.gameRepository).toBeDefined();
      expect(services.teamLineupRepository).toBeDefined();
      expect(services.inningStateRepository).toBeDefined();
      expect(services.eventStore).toBeDefined();
      expect(services.logger).toBeDefined();
    });

    it('should create services with debug enabled', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'development',
        debug: true,
      };

      const services = await factory.createServices(config);

      expect(services).toBeDefined();
      expect(services.logger).toBeDefined();
    });

    it('should log initialization success message', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: true, // Enable debug to verify logging works
      };

      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await factory.createServices(config);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[TW Softball]',
        'IndexedDB infrastructure services initialized successfully',
        expect.objectContaining({
          environment: 'production',
          debug: true,
          storageType: 'indexeddb',
        }),
        ''
      );

      consoleInfoSpy.mockRestore();
    });

    it('should create services with different environment values', async () => {
      const factory = createIndexedDBFactory();
      const environments = ['development', 'test', 'staging', 'production'];

      for (const environment of environments) {
        const config: InfrastructureConfig = {
          environment,
          debug: false,
        };

        const services = await factory.createServices(config);
        expect(services).toBeDefined();
      }
    });
  });

  describe('IndexedDBInfrastructureFactory.createServices - Configuration Validation', () => {
    it('should reject null config', async () => {
      const factory = createIndexedDBFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      const config = null as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Infrastructure configuration is required'
      );
    });

    it('should reject undefined config', async () => {
      const factory = createIndexedDBFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      const config = undefined as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Infrastructure configuration is required'
      );
    });

    it('should reject config with empty environment string', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: '',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with whitespace-only environment', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: '   ',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with non-string environment', async () => {
      const factory = createIndexedDBFactory();
      const config = {
        environment: 123,
        debug: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with non-boolean debug flag', async () => {
      const factory = createIndexedDBFactory();
      const config = {
        environment: 'production',
        debug: 'true',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Debug flag must be a boolean value'
      );
    });

    it('should reject config with missing debug flag', async () => {
      const factory = createIndexedDBFactory();
      const config = {
        environment: 'production',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Debug flag must be a boolean value'
      );
    });
  });

  describe('IndexedDBInfrastructureFactory.createServices - Environment Validation', () => {
    it('should reject when IndexedDB is not available', async () => {
      // Reset mocks and delete IndexedDB before creating factory
      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB =
        undefined as unknown as IDBFactory;

      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: IndexedDB is not available in this environment'
      );

      // Restore IndexedDB for other tests
      (globalThis as { indexedDB: typeof globalThis.indexedDB }).indexedDB = createMockIndexedDB();
    });

    it('should reject when window object is not available', async () => {
      // Save and remove window before creating factory
      const savedWindow = globalThis.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing environment validation
      delete (globalThis as any).window;

      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize IndexedDB infrastructure services: Window object is not available - IndexedDB requires a browser environment'
      );

      // Restore window for other tests
      globalThis.window = savedWindow;
    });
  });

  describe('IndexedDBInfrastructureFactory.createServices - Error Handling', () => {
    it('should preserve original error as cause', async () => {
      const factory = createIndexedDBFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: false,
      };

      // Remove IndexedDB to trigger error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling
      delete (globalThis as any).indexedDB;

      try {
        await factory.createServices(config);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: Error };
        expect(err.message).toContain('Failed to initialize IndexedDB infrastructure services');
        expect(err.cause).toBeDefined();
        expect(err.cause).toBeInstanceOf(Error);
      }
    });

    it('should format error message with context', async () => {
      const factory = createIndexedDBFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling
      const config = null as any;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing error handling with invalid config
        await factory.createServices(config);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error;
        expect(err.message).toMatch(/Failed to initialize IndexedDB infrastructure services:/);
        expect(err.message).toContain('Infrastructure configuration is required');
      }
    });
  });

  describe('ConsoleLogger', () => {
    describe('Log Methods', () => {
      it('should log debug messages when debug is enabled', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.debug('Test debug message');

        expect(consoleDebugSpy).toHaveBeenCalledWith('[TW Softball]', 'Test debug message', '', '');

        consoleDebugSpy.mockRestore();
      });

      it('should not log debug messages when debug is disabled', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.debug('Test debug message');

        expect(consoleDebugSpy).not.toHaveBeenCalled();

        consoleDebugSpy.mockRestore();
      });

      it('should log info messages', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.info('Test info message');

        expect(consoleInfoSpy).toHaveBeenCalledWith('[TW Softball]', 'Test info message', '', '');

        consoleInfoSpy.mockRestore();
      });

      it('should log warn messages', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.warn('Test warning message');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[TW Softball]',
          'Test warning message',
          '',
          ''
        );

        consoleWarnSpy.mockRestore();
      });

      it('should log error messages', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        const testError = new Error('Test error');
        services.logger.error('Test error message', testError);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[TW Softball]',
          'Test error message',
          '',
          testError
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error messages without error object', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.error('Test error message');

        expect(consoleErrorSpy).toHaveBeenCalledWith('[TW Softball]', 'Test error message', '', '');

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Log with Context', () => {
      it('should log messages with context object', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        const context = { userId: '123', action: 'test' };
        services.logger.info('Test with context', context);

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          '[TW Softball]',
          'Test with context',
          context,
          ''
        );

        consoleInfoSpy.mockRestore();
      });

      it('should log error messages with both error and context', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        const testError = new Error('Test error');
        const context = { operation: 'test' };
        services.logger.error('Error with context', testError, context);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[TW Softball]',
          'Error with context',
          context,
          testError
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe('isLevelEnabled', () => {
      it('should return false for debug level when debug is disabled', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('debug')).toBe(false);
      });

      it('should return true for debug level when debug is enabled', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('debug')).toBe(true);
      });

      it('should return true for info level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('info')).toBe(true);
      });

      it('should return true for warn level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('warn')).toBe(true);
      });

      it('should return true for error level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('error')).toBe(true);
      });
    });

    describe('Console Function Selection', () => {
      it('should use console.debug for debug level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('debug', 'Test message');

        expect(consoleDebugSpy).toHaveBeenCalled();

        consoleDebugSpy.mockRestore();
      });

      it('should use console.info for info level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('info', 'Test message');

        expect(consoleInfoSpy).toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should use console.warn for warn level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('warn', 'Test message');

        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      it('should use console.error for error level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('error', 'Test message');

        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('should use console.log for unknown log level', async () => {
        const factory = createIndexedDBFactory();
        const config: InfrastructureConfig = {
          environment: 'production',
          debug: false,
        };

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const services = await factory.createServices(config);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- Testing with any type for unknown level
        services.logger.log('unknown' as any, 'Test message');

        expect(consoleLogSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
      });
    });
  });
});
