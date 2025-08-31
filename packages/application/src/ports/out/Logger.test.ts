/**
 * @file Logger Tests
 * Tests for the outbound port interface for application logging capabilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LogLevel, LogContext, LogEntry } from './Logger';

// Mock implementation for testing the interface contract
class MockLogger implements Logger {
  private readonly logs: LogEntry[] = [];
  private readonly config: {
    minLevel: LogLevel;
    includeContext: boolean;
    includeTimestamp: boolean;
    includeStackTrace: boolean;
  } = {
    minLevel: 'debug',
    includeContext: true,
    includeTimestamp: true,
    includeStackTrace: false,
  };

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.logs.push(this.createLogEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.logs.push(this.createLogEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.logs.push(this.createLogEntry('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.logs.push(this.createLogEntry('error', message, context, error));
    }
  }

  log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(level)) {
      this.logs.push(this.createLogEntry(level, message, context, error));
    }
  }

  isLevelEnabled(level: LogLevel): boolean {
    const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.config.minLevel);
    const requestedLevelIndex = levelOrder.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  // Test utility methods
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs.length = 0;
  }

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isLevelEnabled(level);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    if (error) {
      return {
        level,
        message,
        timestamp: new Date(),
        context: context || {},
        error,
        source: 'test-logger',
      };
    }

    return {
      level,
      message,
      timestamp: new Date(),
      context: context || {},
      source: 'test-logger',
    };
  }
}

describe('Logger Interface', () => {
  let logger: Logger;
  let mockLogger: MockLogger;
  let testContext: LogContext;
  let testError: Error;

  beforeEach(() => {
    mockLogger = new MockLogger();
    logger = mockLogger;
    testContext = {
      gameId: 'game-123',
      operation: 'recordAtBat',
      userId: 'user-456',
      sessionId: 'session-789',
    };
    testError = new Error('Test error message');
    mockLogger.clearLogs();
  });

  describe('Interface Contract', () => {
    it('should define all required methods', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.isLevelEnabled).toBe('function');
    });

    it('should have correct method signatures', () => {
      expect(logger.debug.length).toBe(2); // message, context?
      expect(logger.info.length).toBe(2); // message, context?
      expect(logger.warn.length).toBe(2); // message, context?
      expect(logger.error.length).toBe(3); // message, error?, context?
      expect(logger.log.length).toBe(4); // level, message, context?, error?
      expect(logger.isLevelEnabled.length).toBe(1); // level
    });

    it('should handle void return types for logging methods', () => {
      expect(logger.debug('test')).toBeUndefined();
      expect(logger.info('test')).toBeUndefined();
      expect(logger.warn('test')).toBeUndefined();
      expect(logger.error('test')).toBeUndefined();
      expect(logger.log('info', 'test')).toBeUndefined();
    });

    it('should return boolean for isLevelEnabled', () => {
      expect(typeof logger.isLevelEnabled('debug')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('info')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('warn')).toBe('boolean');
      expect(typeof logger.isLevelEnabled('error')).toBe('boolean');
    });
  });

  describe('Log Level Methods', () => {
    describe('debug Method', () => {
      it('should log debug messages', () => {
        logger.debug('Debug message');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('debug');
        expect(logs[0]?.message).toBe('Debug message');
      });

      it('should log debug messages with context', () => {
        logger.debug('Debug with context', testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.context).toEqual(testContext);
      });

      it('should handle undefined context gracefully', () => {
        logger.debug('Debug without context', undefined);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.context).toEqual({});
      });
    });

    describe('info Method', () => {
      it('should log info messages', () => {
        logger.info('Info message');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('info');
        expect(logs[0]?.message).toBe('Info message');
      });

      it('should log info messages with context', () => {
        logger.info('Info with context', testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.context).toEqual(testContext);
      });
    });

    describe('warn Method', () => {
      it('should log warning messages', () => {
        logger.warn('Warning message');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('warn');
        expect(logs[0]?.message).toBe('Warning message');
      });

      it('should log warning messages with context', () => {
        logger.warn('Warning with context', testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.context).toEqual(testContext);
      });
    });

    describe('error Method', () => {
      it('should log error messages', () => {
        logger.error('Error message');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('error');
        expect(logs[0]?.message).toBe('Error message');
      });

      it('should log error messages with Error object', () => {
        logger.error('Error with exception', testError);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.error).toBe(testError);
      });

      it('should log error messages with context', () => {
        logger.error('Error with context', undefined, testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.context).toEqual(testContext);
      });

      it('should log error messages with both error and context', () => {
        logger.error('Error with both', testError, testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.error).toBe(testError);
        expect(logs[0]?.context).toEqual(testContext);
      });
    });

    describe('log Method (Generic)', () => {
      it('should log messages with specified level', () => {
        logger.log('info', 'Generic log message');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('info');
        expect(logs[0]?.message).toBe('Generic log message');
      });

      it('should log messages with context', () => {
        logger.log('warn', 'Generic with context', testContext);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('warn');
        expect(logs[0]?.context).toEqual(testContext);
      });

      it('should log messages with error', () => {
        logger.log('error', 'Generic with error', undefined, testError);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('error');
        expect(logs[0]?.error).toBe(testError);
      });

      it('should log messages with both context and error', () => {
        logger.log('error', 'Generic with both', testContext, testError);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]?.level).toBe('error');
        expect(logs[0]?.context).toEqual(testContext);
        expect(logs[0]?.error).toBe(testError);
      });

      it('should handle all log levels', () => {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

        levels.forEach(level => {
          logger.log(level, `Message at ${level} level`);
        });

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(4);
        logs.forEach((log, index) => {
          expect(log.level).toBe(levels[index]);
        });
      });
    });
  });

  describe('Log Level Management', () => {
    describe('isLevelEnabled Method', () => {
      it('should return true for enabled levels', () => {
        mockLogger.setMinLevel('info');

        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(true);
        expect(logger.isLevelEnabled('warn')).toBe(true);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });

      it('should respect level hierarchy', () => {
        mockLogger.setMinLevel('warn');

        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(false);
        expect(logger.isLevelEnabled('warn')).toBe(true);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });

      it('should handle debug level (most permissive)', () => {
        mockLogger.setMinLevel('debug');

        expect(logger.isLevelEnabled('debug')).toBe(true);
        expect(logger.isLevelEnabled('info')).toBe(true);
        expect(logger.isLevelEnabled('warn')).toBe(true);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });

      it('should handle error level (most restrictive)', () => {
        mockLogger.setMinLevel('error');

        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(false);
        expect(logger.isLevelEnabled('warn')).toBe(false);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });
    });

    it('should respect minimum log level for all methods', () => {
      mockLogger.setMinLevel('warn');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]?.level).toBe('warn');
      expect(logs[1]?.level).toBe('error');
    });
  });

  describe('Structured Logging', () => {
    it('should handle complex context objects', () => {
      const complexContext = {
        gameId: 'game-123',
        operation: 'recordAtBat',
        player: {
          id: 'player-456',
          name: 'John Doe',
          position: 'SS',
        },
        gameState: {
          inning: 3,
          outs: 1,
          runners: ['first', 'third'],
        },
        metadata: {
          timestamp: new Date(),
          source: 'web-app',
          version: '1.2.3',
        },
      };

      logger.info('Complex context test', complexContext);

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.context).toEqual(complexContext);
    });

    it('should handle nested objects in context', () => {
      const nestedContext = {
        level1: {
          level2: {
            level3: {
              value: 'deep nested value',
              array: [1, 2, 3],
              boolean: true,
            },
          },
        },
      };

      logger.debug('Nested context test', nestedContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(nestedContext);
    });

    it('should handle arrays in context', () => {
      const contextWithArrays = {
        players: ['player1', 'player2', 'player3'],
        scores: [1, 2, 3, 4, 5],
        games: [
          { id: 'game1', status: 'active' },
          { id: 'game2', status: 'completed' },
        ],
      };

      logger.info('Array context test', contextWithArrays);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(contextWithArrays);
    });

    it('should handle undefined and null values in context', () => {
      const contextWithNulls = {
        definedValue: 'defined',
        undefinedValue: undefined,
        nullValue: null,
        emptyString: '',
        zeroValue: 0,
        falseValue: false,
      };

      logger.warn('Context with nulls test', contextWithNulls);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(contextWithNulls);
    });
  });

  describe('Error Handling', () => {
    it('should handle different Error types', () => {
      const standardError = new Error('Standard error');
      const typeError = new TypeError('Type error');
      const rangeError = new RangeError('Range error');
      const customError = new (class extends Error {
        code = 'CUSTOM_ERROR';
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      })('Custom error');

      logger.error('Standard error', standardError);
      logger.error('Type error', typeError);
      logger.error('Range error', rangeError);
      logger.error('Custom error', customError);

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs[0]?.error).toBe(standardError);
      expect(logs[1]?.error).toBe(typeError);
      expect(logs[2]?.error).toBe(rangeError);
      expect(logs[3]?.error).toBe(customError);
    });

    it('should preserve error properties', () => {
      interface ErrorWithProperties extends Error {
        code: string;
        statusCode: number;
        details: { field: string };
      }

      const errorWithProps = new Error('Error with properties') as ErrorWithProperties;
      errorWithProps.code = 'ERR_TEST';
      errorWithProps.statusCode = 500;
      errorWithProps.details = { field: 'value' };

      logger.error('Error with properties', errorWithProps);

      const logs = mockLogger.getLogs();
      const loggedError = logs[0]?.error as ErrorWithProperties;
      expect(loggedError).toBe(errorWithProps);
      expect(loggedError.code).toBe('ERR_TEST');
      expect(loggedError.statusCode).toBe(500);
      expect(loggedError.details).toEqual({ field: 'value' });
    });

    it('should handle error stack traces', () => {
      const errorWithStack = new Error('Error with stack');
      expect(errorWithStack.stack).toBeDefined();

      logger.error('Stack trace test', errorWithStack);

      const logs = mockLogger.getLogs();
      const loggedError = logs[0]?.error;
      expect(loggedError?.stack).toBeDefined();
    });
  });

  describe('Business Domain Integration', () => {
    it('should support game-specific logging context', () => {
      const gameContext = {
        gameId: 'game-abc123',
        homeTeam: 'Dragons',
        awayTeam: 'Tigers',
        inning: 5,
        outs: 2,
        score: { home: 3, away: 2 },
        currentBatter: 'player-789',
      };

      logger.info('At-bat recorded successfully', gameContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(gameContext);
      expect(logs[0]?.message).toBe('At-bat recorded successfully');
    });

    it('should support player action logging', () => {
      const playerContext = {
        playerId: 'player-456',
        playerName: 'Jane Smith',
        action: 'substitute',
        previousPosition: 'LF',
        newPosition: 'CF',
        inning: 7,
      };

      logger.info('Player substitution completed', playerContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(playerContext);
    });

    it('should support error logging in business operations', () => {
      const businessError = new Error('Invalid at-bat result: batter already out');
      const businessContext = {
        operation: 'recordAtBat',
        gameId: 'game-123',
        playerId: 'player-456',
        result: 'SINGLE',
        validation: 'failed',
        reason: 'batter_already_out',
      };

      logger.error('Business rule validation failed', businessError, businessContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.error).toBe(businessError);
      expect(logs[0]?.context).toEqual(businessContext);
    });

    it('should support performance monitoring context', () => {
      const performanceContext = {
        operation: 'calculateGameStatistics',
        duration: 1250, // milliseconds
        gameId: 'game-123',
        playersProcessed: 18,
        eventsProcessed: 47,
        memoryUsage: 'high',
      };

      logger.warn('Operation took longer than expected', performanceContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(performanceContext);
    });

    it('should support audit trail logging', () => {
      const auditContext = {
        userId: 'user-789',
        action: 'updateScore',
        resource: 'game-123',
        changes: {
          before: { home: 2, away: 1 },
          after: { home: 3, away: 1 },
        },
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
      };

      logger.info('Score updated by user', auditContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(auditContext);
    });
  });

  describe('LogLevel Type Safety', () => {
    it('should accept all valid log levels', () => {
      const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

      validLevels.forEach(level => {
        expect(() => logger.log(level, 'test message')).not.toThrow();
        expect(typeof logger.isLevelEnabled(level)).toBe('boolean');
      });
    });

    it('should maintain type safety for log level parameter', () => {
      // This test ensures TypeScript compilation would catch invalid levels
      // In runtime, we test that the mock handles the valid levels correctly
      const level: LogLevel = 'info';
      logger.log(level, 'Type safe message');

      const logs = mockLogger.getLogs();
      expect(logs[0]?.level).toBe('info');
    });
  });

  describe('LogContext Type Safety', () => {
    it('should handle empty context objects', () => {
      const emptyContext: LogContext = {};
      logger.info('Empty context test', emptyContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual({});
    });

    it('should maintain context type flexibility', () => {
      // Test that LogContext can contain various types
      const flexibleContext: LogContext = {
        stringValue: 'text',
        numberValue: 42,
        booleanValue: true,
        dateValue: new Date(),
        objectValue: { nested: 'value' },
        arrayValue: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      logger.debug('Flexible context test', flexibleContext);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(flexibleContext);
    });
  });

  describe('Logging Integration Patterns', () => {
    it('should support method entry/exit logging', () => {
      const methodContext = {
        class: 'GameApplicationService',
        method: 'recordAtBat',
        parameters: { gameId: 'game-123', playerId: 'player-456' },
      };

      logger.debug('Method entry', { ...methodContext, event: 'entry' });

      // Simulate method execution
      const result = { success: true, eventId: 'event-789' };

      logger.debug('Method exit', {
        ...methodContext,
        event: 'exit',
        result,
        duration: 150,
      });

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]?.context.event).toBe('entry');
      expect(logs[1]?.context.event).toBe('exit');
    });

    it('should support correlation ID tracking', () => {
      const correlationId = 'corr-123456';
      const baseContext = { correlationId };

      logger.info('Request started', { ...baseContext, step: 'start' });
      logger.debug('Processing game state', { ...baseContext, step: 'processing' });
      logger.info('Request completed', { ...baseContext, step: 'complete' });

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(3);
      logs.forEach(log => {
        expect(log.context.correlationId).toBe(correlationId);
      });
    });

    it('should support request ID and user context', () => {
      const requestContext = {
        requestId: 'req-789',
        userId: 'user-123',
        sessionId: 'sess-456',
      };

      logger.info('User action initiated', {
        ...requestContext,
        action: 'startNewGame',
      });

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toMatchObject(requestContext);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle extremely long messages', () => {
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Message with 特殊字符 and émojis 🎮⚾ and\nnewlines\tand\ttabs';
      logger.info(specialMessage);

      const logs = mockLogger.getLogs();
      expect(logs[0]?.message).toBe(specialMessage);
    });

    it('should handle circular references in context gracefully', () => {
      interface CircularContext extends LogContext {
        name: string;
        self?: CircularContext;
      }

      const circularContext: CircularContext = { name: 'test' };
      circularContext.self = circularContext;

      // The implementation should handle this gracefully
      expect(() => {
        logger.info('Circular reference test', circularContext);
      }).not.toThrow();
    });

    it('should handle very large context objects', () => {
      const largeContext = {
        largeArray: new Array(1000).fill(0).map((_, i) => ({ index: i, data: `item-${i}` })),
        largeString: 'X'.repeat(5000),
        metadata: {
          processed: true,
          timestamp: new Date(),
        },
      };

      expect(() => {
        logger.info('Large context test', largeContext);
      }).not.toThrow();

      const logs = mockLogger.getLogs();
      expect(logs[0]?.context).toEqual(largeContext);
    });
  });

  describe('Mock Implementation Validation', () => {
    it('should properly implement the Logger interface', () => {
      // Verify that our mock implementation satisfies the interface
      const implementation: Logger = new MockLogger();
      expect(implementation).toBeDefined();

      // Test that it has all required methods
      expect(typeof implementation.debug).toBe('function');
      expect(typeof implementation.info).toBe('function');
      expect(typeof implementation.warn).toBe('function');
      expect(typeof implementation.error).toBe('function');
      expect(typeof implementation.log).toBe('function');
      expect(typeof implementation.isLevelEnabled).toBe('function');
    });

    it('should maintain log entry structure consistency', () => {
      logger.info('Structure test', { test: true });

      const logs = mockLogger.getLogs();
      const entry = logs[0]!;

      // Verify LogEntry structure
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('context');
      expect(entry).toHaveProperty('source');

      expect(typeof entry.level).toBe('string');
      expect(typeof entry.message).toBe('string');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(typeof entry.context).toBe('object');
      expect(typeof entry.source).toBe('string');
    });
  });
});
