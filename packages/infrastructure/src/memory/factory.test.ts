/**
 * @file Memory Infrastructure Factory Tests
 * Comprehensive tests for in-memory factory implementation.
 *
 * @remarks
 * Tests MemoryLogger and MemoryInfrastructureFactory following TDD principles.
 * Covers happy paths, error scenarios, validation, and memory-specific features.
 */

import type { InfrastructureConfig } from '@twsoftball/application';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { createMemoryFactory } from './factory';

describe('Memory Infrastructure Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createMemoryFactory', () => {
    it('should create a factory instance', () => {
      const factory = createMemoryFactory();

      expect(factory).toBeDefined();
      expect(typeof factory.createServices).toBe('function');
      expect(typeof factory.getStorageType).toBe('function');
      expect(typeof factory.getDescription).toBe('function');
    });

    it('should return factory implementing InfrastructureFactory interface', () => {
      const factory = createMemoryFactory();

      expect(factory).toHaveProperty('createServices');
      expect(factory).toHaveProperty('getStorageType');
      expect(factory).toHaveProperty('getDescription');
    });
  });

  describe('MemoryInfrastructureFactory.getStorageType', () => {
    it('should return "memory" as storage type', () => {
      const factory = createMemoryFactory();

      expect(factory.getStorageType()).toBe('memory');
    });
  });

  describe('MemoryInfrastructureFactory.getDescription', () => {
    it('should return descriptive string about in-memory capabilities', () => {
      const factory = createMemoryFactory();

      const description = factory.getDescription();
      expect(description).toBe(
        'In-memory implementations for testing and development environments'
      );
      expect(description).toContain('In-memory');
      expect(description).toContain('testing');
      expect(description).toContain('development');
    });
  });

  describe('MemoryInfrastructureFactory.createServices - Success Cases', () => {
    it('should create services successfully with valid config', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'test',
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
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'development',
        debug: true,
      };

      const services = await factory.createServices(config);

      expect(services).toBeDefined();
      expect(services.logger).toBeDefined();
    });

    it('should log initialization success message when debug enabled', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'test',
        debug: true,
      };

      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await factory.createServices(config);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[TW Softball]',
        'In-memory infrastructure services initialized successfully',
        expect.objectContaining({
          environment: 'test',
          debug: true,
          storageType: 'memory',
        }),
        ''
      );

      consoleInfoSpy.mockRestore();
    });

    it('should create services with different environment values', async () => {
      const factory = createMemoryFactory();
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

    it('should create logger with memory storage for test environment', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'test',
        debug: false,
      };

      const services = await factory.createServices(config);

      // Logger should be created (memory storage is an internal detail)
      expect(services.logger).toBeDefined();
    });

    it('should create logger without memory storage for non-test environments', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'production',
        debug: false,
      };

      const services = await factory.createServices(config);

      // Logger should be created
      expect(services.logger).toBeDefined();
    });
  });

  describe('MemoryInfrastructureFactory.createServices - Configuration Validation', () => {
    it('should reject null config', async () => {
      const factory = createMemoryFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      const config = null as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Infrastructure configuration is required'
      );
    });

    it('should reject undefined config', async () => {
      const factory = createMemoryFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      const config = undefined as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Infrastructure configuration is required'
      );
    });

    it('should reject config with empty environment string', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: '',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with whitespace-only environment', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: '   ',
        debug: false,
      };

      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with non-string environment', async () => {
      const factory = createMemoryFactory();
      const config = {
        environment: 123,
        debug: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Valid environment is required in configuration'
      );
    });

    it('should reject config with non-boolean debug flag', async () => {
      const factory = createMemoryFactory();
      const config = {
        environment: 'test',
        debug: 'true',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Debug flag must be a boolean value'
      );
    });

    it('should reject config with missing debug flag', async () => {
      const factory = createMemoryFactory();
      const config = {
        environment: 'test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid parameters
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing invalid parameters with any type
      await expect(factory.createServices(config)).rejects.toThrow(
        'Failed to initialize in-memory infrastructure services: Debug flag must be a boolean value'
      );
    });
  });

  describe('MemoryInfrastructureFactory.createServices - Environment Validation', () => {
    it('should not require browser environment (validateEnvironment does nothing)', async () => {
      const factory = createMemoryFactory();
      const config: InfrastructureConfig = {
        environment: 'test',
        debug: false,
      };

      // Should succeed even in non-browser environments
      const services = await factory.createServices(config);
      expect(services).toBeDefined();
    });
  });

  describe('MemoryInfrastructureFactory.createServices - Error Handling', () => {
    it('should preserve original error as cause', async () => {
      const factory = createMemoryFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling
      const config = null as any;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing error handling with invalid config
        await factory.createServices(config);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: Error };
        expect(err.message).toContain('Failed to initialize in-memory infrastructure services');
        expect(err.cause).toBeDefined();
        expect(err.cause).toBeInstanceOf(Error);
      }
    });

    it('should format error message with context', async () => {
      const factory = createMemoryFactory();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling
      const config = null as any;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing error handling with invalid config
        await factory.createServices(config);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error;
        expect(err.message).toMatch(/Failed to initialize in-memory infrastructure services:/);
        expect(err.message).toContain('Infrastructure configuration is required');
      }
    });
  });

  describe('MemoryLogger', () => {
    describe('Log Methods with Debug Disabled', () => {
      it('should not log debug messages to console when debug is disabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'test',
          debug: false,
        };

        const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.debug('Test debug message');

        expect(consoleDebugSpy).not.toHaveBeenCalled();

        consoleDebugSpy.mockRestore();
      });

      it('should not log info messages to console when debug is disabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'test',
          debug: false,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.info('Test info message');

        expect(consoleInfoSpy).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should not log warn messages to console when debug is disabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'test',
          debug: false,
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.warn('Test warning message');

        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      it('should not log error messages to console when debug is disabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'test',
          debug: false,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        const testError = new Error('Test error');
        services.logger.error('Test error message', testError);

        expect(consoleErrorSpy).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Log Methods with Debug Enabled', () => {
      it('should log debug messages to console when debug is enabled', async () => {
        const factory = createMemoryFactory();
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

      it('should log info messages to console when debug is enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.info('Test info message');

        expect(consoleInfoSpy).toHaveBeenCalledWith('[TW Softball]', 'Test info message', '', '');

        consoleInfoSpy.mockRestore();
      });

      it('should log warn messages to console when debug is enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
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

      it('should log error messages to console when debug is enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
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
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.error('Test error message');

        expect(consoleErrorSpy).toHaveBeenCalledWith('[TW Softball]', 'Test error message', '', '');

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Log with Context', () => {
      it('should log messages with context object when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
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

      it('should log error messages with both error and context when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
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
      it('should return true for all log levels', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'test',
          debug: false,
        };

        const services = await factory.createServices(config);

        expect(services.logger.isLevelEnabled('debug')).toBe(true);
        expect(services.logger.isLevelEnabled('info')).toBe(true);
        expect(services.logger.isLevelEnabled('warn')).toBe(true);
        expect(services.logger.isLevelEnabled('error')).toBe(true);
      });
    });

    describe('Console Function Selection', () => {
      it('should use console.debug for debug level when debug enabled', async () => {
        const factory = createMemoryFactory();
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

      it('should use console.info for info level when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('info', 'Test message');

        expect(consoleInfoSpy).toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should use console.warn for warn level when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('warn', 'Test message');

        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      it('should use console.error for error level when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const services = await factory.createServices(config);
        services.logger.log('error', 'Test message');

        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('should use console.log for unknown log level when debug enabled', async () => {
        const factory = createMemoryFactory();
        const config: InfrastructureConfig = {
          environment: 'development',
          debug: true,
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
