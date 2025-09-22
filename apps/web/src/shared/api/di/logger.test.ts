/**
 * @file ConsoleLogger.test.ts
 * Comprehensive tests for the ConsoleLogger implementation.
 */

import type { LogLevel, LogContext } from '@twsoftball/application/ports/out/Logger';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ConsoleLogger, createLogger } from './logger.js';

// Add global declaration for tests
declare const global: {
  console: Console;
};

describe('ConsoleLogger', () => {
  let mockConsole: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };
  let originalConsole: Console;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    // Store original console and replace with mock
    originalConsole = global.console;
    global.console = mockConsole as unknown as Console;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console
    global.console = originalConsole;
  });

  describe('Constructor', () => {
    it('should create logger with default minimum level (info) and source', () => {
      // Act
      const logger = new ConsoleLogger();

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should create logger with custom minimum level', () => {
      // Act
      const logger = new ConsoleLogger('warn');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should create logger with custom source', () => {
      // Arrange
      const customSource = 'game-service';
      const logger = new ConsoleLogger('debug', customSource);

      // Act
      logger.info('Test message');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(`[${customSource}] Test message`)
      );
    });

    it('should handle invalid log level by defaulting to info', () => {
      // Act
      const logger = new ConsoleLogger('invalid' as LogLevel);

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });
  });

  describe('Level Checking', () => {
    it('should correctly check debug level when enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should correctly check info level when enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('info');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should correctly check warn level when enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should correctly check error level when enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('error');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(false);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should handle invalid log level in isLevelEnabled', () => {
      // Arrange
      const logger = new ConsoleLogger('info');

      // Act & Assert
      expect(logger.isLevelEnabled('invalid' as LogLevel)).toBe(false);
    });
  });

  describe('Debug Logging', () => {
    it('should log debug message when debug level is enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');
      const message = 'Debug test message';

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] \[twsoftball-web\] Debug test message/
        )
      );
    });

    it('should not log debug message when debug level is disabled', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Debug test message';

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should log debug message with context', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');
      const message = 'Debug with context';
      const context: LogContext = {
        gameId: 'game-123',
        playerId: 'player-456',
        operation: 'recordAtBat',
      };

      // Act
      logger.debug(message, context);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug with context'),
        context
      );
    });

    it('should log debug message with empty context object', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');
      const message = 'Debug with empty context';
      const context: LogContext = {};

      // Act
      logger.debug(message, context);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug with empty context')
      );
    });
  });

  describe('Info Logging', () => {
    it('should log info message when info level is enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Info test message';

      // Act
      logger.info(message);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[twsoftball-web\] Info test message/
        )
      );
    });

    it('should not log info message when info level is disabled', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');
      const message = 'Info test message';

      // Act
      logger.info(message);

      // Assert
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should log info message with context', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Info with context';
      const context: LogContext = {
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Act
      logger.info(message, context);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Info with context'),
        context
      );
    });
  });

  describe('Warn Logging', () => {
    it('should log warn message when warn level is enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');
      const message = 'Warning test message';

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] \[twsoftball-web\] Warning test message/
        )
      );
    });

    it('should not log warn message when warn level is disabled', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Warning test message';

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('should log warn message with context', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');
      const message = 'Warning with context';
      const context: LogContext = {
        errorCode: 'W001',
        component: 'GameService',
      };

      // Act
      logger.warn(message, context);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning with context'),
        context
      );
    });
  });

  describe('Error Logging', () => {
    it('should log error message when error level is enabled', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Error test message';

      // Act
      logger.error(message);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] \[twsoftball-web\] Error test message/
        )
      );
    });

    it('should log error message with Error object', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Error with exception';
      const error = new Error('Test error occurred');
      error.stack = 'Error stack trace here';

      // Act
      logger.error(message, error);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(2);
      expect(mockConsole.error).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Error with exception')
      );
      expect(mockConsole.error).toHaveBeenNthCalledWith(2, 'Error:', error);
    });

    it('should log error message with Error object and context', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Error with exception and context';
      const error = new Error('Test error occurred');
      const context: LogContext = {
        gameId: 'game-123',
        operation: 'recordAtBat',
        playerId: 'player-456',
      };

      // Act
      logger.error(message, error, context);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(3);
      expect(mockConsole.error).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Error with exception and context')
      );
      expect(mockConsole.error).toHaveBeenNthCalledWith(2, 'Context:', context);
      expect(mockConsole.error).toHaveBeenNthCalledWith(3, 'Error:', error);
    });

    it('should log error message with context but no Error object', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Error with context only';
      const context: LogContext = {
        validationErrors: ['Invalid jersey number'],
        attemptedValue: 99,
      };

      // Act
      logger.error(message, undefined, context);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error with context only'),
        context
      );
    });
  });

  describe('Generic Log Method', () => {
    it('should log debug via generic log method', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');
      const message = 'Generic debug message';
      const context: LogContext = { operation: 'test' };

      // Act
      logger.log('debug', message, context);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Generic debug message'),
        context
      );
    });

    it('should log info via generic log method', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Generic info message';

      // Act
      logger.log('info', message);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Generic info message')
      );
    });

    it('should log warn via generic log method', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');
      const message = 'Generic warn message';
      const context: LogContext = { warning: 'test' };

      // Act
      logger.log('warn', message, context);

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Generic warn message'),
        context
      );
    });

    it('should log error via generic log method with Error object', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Generic error message';
      const error = new Error('Generic test error');
      const context: LogContext = { errorType: 'generic' };

      // Act
      logger.log('error', message, context, error);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledTimes(3);
      expect(mockConsole.error).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Generic error message')
      );
      expect(mockConsole.error).toHaveBeenNthCalledWith(2, 'Context:', context);
      expect(mockConsole.error).toHaveBeenNthCalledWith(3, 'Error:', error);
    });

    it('should not log when level is disabled via generic log method', () => {
      // Arrange
      const logger = new ConsoleLogger('error');
      const message = 'Disabled level message';

      // Act
      logger.log('debug', message);

      // Assert
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Console Method Fallback', () => {
    it('should fallback to console.log when specific method is unavailable', () => {
      // Arrange
      const partialConsole = {
        ...mockConsole,
        debug: undefined, // Simulate missing debug method
      };
      global.console = partialConsole as unknown as Console;

      const logger = new ConsoleLogger('debug');

      // Act
      logger.debug('Fallback test message');

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Fallback test message')
      );
    });

    it('should use specific console method when available', () => {
      // Arrange
      const logger = new ConsoleLogger('warn');

      // Act
      logger.warn('Specific method test');

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Specific method test')
      );
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling in Log Writing', () => {
    it('should handle logging errors gracefully', () => {
      // Arrange
      const throwingConsole = {
        ...mockConsole,
        info: vi.fn().mockImplementation(() => {
          throw new Error('Console error');
        }),
      };
      global.console = throwingConsole as unknown as Console;

      const logger = new ConsoleLogger('info');

      // Act
      logger.info('This will cause an error');

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[LOG ERROR] Failed to format log entry: This will cause an error',
        expect.any(Error)
      );
    });

    it('should handle JSON serialization errors in context', () => {
      // Arrange
      const circularContext: LogContext = {};
      circularContext.self = circularContext; // Circular reference

      const throwingConsole = {
        ...mockConsole,
        info: vi.fn().mockImplementation(() => {
          throw new Error('JSON serialization error');
        }),
      };
      global.console = throwingConsole as unknown as Console;

      const logger = new ConsoleLogger('info');

      // Act
      logger.info('Message with circular context', circularContext);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[LOG ERROR] Failed to format log entry: Message with circular context',
        expect.any(Error)
      );
    });

    it('should handle missing console object completely', () => {
      // Arrange
      const consoleWithMissingMethods = {
        log: vi.fn(), // Provide fallback log method
      } as unknown as Console;
      global.console = consoleWithMissingMethods;
      const logger = new ConsoleLogger('info');

      // Act & Assert - Should not throw but will use fallback
      expect(() => {
        logger.info('Test message with no console');
      }).not.toThrow();

      // Should successfully log the message using console.log as fallback
      expect(consoleWithMissingMethods.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [twsoftball-web] Test message with no console')
      );
    });
  });

  describe('Message Formatting', () => {
    it('should format timestamp correctly', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Timestamp test';

      // Act
      logger.info(message);

      // Assert
      const call = mockConsole.info.mock.calls[0][0] as string;
      const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
      expect(call).toMatch(timestampRegex);
    });

    it('should format level correctly in uppercase', () => {
      // Arrange
      const logger = new ConsoleLogger('debug');

      // Act
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Assert
      expect(mockConsole.debug.mock.calls[0][0]).toContain('[DEBUG]');
      expect(mockConsole.info.mock.calls[0][0]).toContain('[INFO]');
      expect(mockConsole.warn.mock.calls[0][0]).toContain('[WARN]');
      expect(mockConsole.error.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('should format source correctly in uppercase', () => {
      // Arrange
      const logger = new ConsoleLogger('info', 'custom-source');

      // Act
      logger.info('Source test');

      // Assert
      expect(mockConsole.info.mock.calls[0][0]).toContain('[custom-source]');
    });

    it('should include complete message in formatted output', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const message = 'Complete message test with special characters: !@#$%^&*()';

      // Act
      logger.info(message);

      // Assert
      expect(mockConsole.info.mock.calls[0][0]).toContain(message);
    });
  });

  describe('Context Handling', () => {
    it('should handle complex context objects', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const complexContext: LogContext = {
        gameId: 'game-123',
        players: ['player-1', 'player-2', 'player-3'],
        scores: { home: 5, away: 3 },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
        },
        flags: {
          isPlayoffs: true,
          extraInnings: false,
        },
      };

      // Act
      logger.info('Complex context test', complexContext);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Complex context test'),
        complexContext
      );
    });

    it('should handle null and undefined context values', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const contextWithNulls: LogContext = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroValue: 0,
        falseValue: false,
      };

      // Act
      logger.info('Null context test', contextWithNulls);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Null context test'),
        contextWithNulls
      );
    });

    it('should not log context when object is empty', () => {
      // Arrange
      const logger = new ConsoleLogger('info');
      const emptyContext: LogContext = {};

      // Act
      logger.info('Empty context test', emptyContext);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Empty context test'));
    });
  });

  describe('Performance Considerations', () => {
    it('should not call expensive context operations when level is disabled', () => {
      // Arrange
      const logger = new ConsoleLogger('error'); // Only error level enabled
      const expensiveContext = vi.fn().mockReturnValue({ expensive: 'operation' });

      // Act
      logger.debug('Debug message', expensiveContext() as LogContext);

      // Assert
      expect(expensiveContext).toHaveBeenCalled(); // Context is still evaluated before method call
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should check level before processing in all methods', () => {
      // Arrange
      const logger = new ConsoleLogger('error');

      // Act
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      // Assert
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });
  });
});

describe('createLogger Factory Function', () => {
  let mockConsole: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };
  let originalConsole: Console;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };

    // Store original console and replace with mock
    originalConsole = global.console;
    global.console = mockConsole as unknown as Console;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console
    global.console = originalConsole;
  });

  describe('Environment-based Logger Creation', () => {
    it('should create debug-level logger for development environment', () => {
      // Act
      const logger = createLogger('development');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);

      // Verify it can log debug messages
      logger.debug('Development debug message');
      expect(mockConsole.debug).toHaveBeenCalled();
    });

    it('should create info-level logger for production environment', () => {
      // Act
      const logger = createLogger('production');

      // Assert
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);

      // Verify debug is disabled but info is enabled
      logger.debug('Production debug message');
      logger.info('Production info message');
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should create logger with custom source for development', () => {
      // Act
      const logger = createLogger('development', 'custom-dev-service');

      // Act
      logger.info('Custom source message');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[custom-dev-service]')
      );
    });

    it('should create logger with custom source for production', () => {
      // Act
      const logger = createLogger('production', 'custom-prod-service');

      // Act
      logger.info('Custom source message');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[custom-prod-service]')
      );
    });

    it('should use default source when not provided', () => {
      // Act
      const devLogger = createLogger('development');
      const prodLogger = createLogger('production');

      // Act
      devLogger.info('Dev message');
      prodLogger.info('Prod message');

      // Assert
      expect(mockConsole.info).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('[twsoftball-web]')
      );
      expect(mockConsole.info).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('[twsoftball-web]')
      );
    });
  });

  describe('Integration with ConsoleLogger', () => {
    it('should return logger that implements all Logger interface methods', () => {
      // Act
      const logger = createLogger('development');

      // Assert
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.isLevelEnabled).toBe('function');
    });

    it('should create logger that handles all log levels correctly', () => {
      // Arrange
      const logger = createLogger('development');
      const context = { testId: 'integration-test' };
      const error = new Error('Test error');

      // Act
      logger.debug('Debug message', context);
      logger.info('Info message', context);
      logger.warn('Warn message', context);
      logger.error('Error message', error, context);
      logger.log('info', 'Generic log message', context);

      // Assert
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        context
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        context
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warn message'),
        context
      );
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Generic log message'),
        context
      );
    });
  });

  describe('Factory Function Edge Cases', () => {
    it('should handle environment parameter case sensitivity', () => {
      // Act
      const devLogger1 = createLogger('development');
      const devLogger2 = createLogger('development');
      const prodLogger1 = createLogger('production');
      const prodLogger2 = createLogger('production');

      // Assert
      expect(devLogger1.isLevelEnabled('debug')).toBe(true);
      expect(devLogger2.isLevelEnabled('debug')).toBe(true);
      expect(prodLogger1.isLevelEnabled('debug')).toBe(false);
      expect(prodLogger2.isLevelEnabled('debug')).toBe(false);
    });

    it('should create independent logger instances', () => {
      // Act
      const logger1 = createLogger('development', 'service-1');
      const logger2 = createLogger('production', 'service-2');

      logger1.info('Logger 1 message');
      logger2.info('Logger 2 message');

      // Assert
      expect(mockConsole.info).toHaveBeenCalledTimes(2);
      expect(mockConsole.info).toHaveBeenNthCalledWith(1, expect.stringContaining('[service-1]'));
      expect(mockConsole.info).toHaveBeenNthCalledWith(2, expect.stringContaining('[service-2]'));
    });
  });
});
