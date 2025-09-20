/**
 * @file Services Index Tests
 * Test coverage for the services index module exports.
 *
 * @remarks
 * This test file ensures that all exports from the services index are working
 * correctly and that the module structure follows expected patterns.
 * While simple, these tests provide important coverage for the index file.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  StartNewGame,
  RecordAtBat,
  SubstitutePlayer,
  EndInning,
  UndoLastAction,
  RedoLastAction,
} from '../index.js';

import * as ServicesIndex from './index.js';

// Mock interfaces for proper typing

interface MockGameRepository {
  findById: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  findByStatus: ReturnType<typeof vi.fn>;
  findByDateRange: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockEventStore {
  append: ReturnType<typeof vi.fn>;
  getEvents: ReturnType<typeof vi.fn>;
  getGameEvents: ReturnType<typeof vi.fn>;
  getAllEvents: ReturnType<typeof vi.fn>;
  getEventsByType: ReturnType<typeof vi.fn>;
  getEventsByGameId: ReturnType<typeof vi.fn>;
}

interface MockLogger {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  isLevelEnabled: ReturnType<typeof vi.fn>;
}

interface MockNotificationService {
  sendUserNotification: ReturnType<typeof vi.fn>;
  sendSystemNotification: ReturnType<typeof vi.fn>;
  sendBatchNotifications: ReturnType<typeof vi.fn>;
  updateUserPreferences: ReturnType<typeof vi.fn>;
  getUserPreferences: ReturnType<typeof vi.fn>;
  isChannelAvailable: ReturnType<typeof vi.fn>;
  notifyGameStarted: ReturnType<typeof vi.fn>;
  notifyGameEnded: ReturnType<typeof vi.fn>;
  notifyScoreUpdate: ReturnType<typeof vi.fn>;
}

interface MockAuthService {
  authenticate: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  validateSession: ReturnType<typeof vi.fn>;
  validateToken: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
  getUserProfile: ReturnType<typeof vi.fn>;
  updateUserProfile: ReturnType<typeof vi.fn>;
  hasPermission: ReturnType<typeof vi.fn>;
  hasRole: ReturnType<typeof vi.fn>;
  getUserSessions: ReturnType<typeof vi.fn>;
  terminateSession: ReturnType<typeof vi.fn>;
  terminateAllUserSessions: ReturnType<typeof vi.fn>;
  logSecurityEvent: ReturnType<typeof vi.fn>;
  getSecurityEvents: ReturnType<typeof vi.fn>;
  changePassword: ReturnType<typeof vi.fn>;
  enableTwoFactor: ReturnType<typeof vi.fn>;
  disableTwoFactor: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
}

describe('Services Index', () => {
  describe('Exports', () => {
    it('should export GameApplicationService', () => {
      expect(ServicesIndex.GameApplicationService).toBeDefined();
      expect(typeof ServicesIndex.GameApplicationService).toBe('function');
    });

    it('should export EventSourcingService', () => {
      expect(ServicesIndex.EventSourcingService).toBeDefined();
      expect(typeof ServicesIndex.EventSourcingService).toBe('function');
    });

    it('should have proper module structure', () => {
      const exports = Object.keys(ServicesIndex);

      // Should contain the main service classes
      expect(exports).toContain('GameApplicationService');
      expect(exports).toContain('EventSourcingService');

      // Should have a reasonable number of exports (not too few, not too many)
      expect(exports.length).toBeGreaterThan(1);
      expect(exports.length).toBeLessThan(20);
    });

    it('should be able to instantiate services with proper dependencies', () => {
      // Mock dependencies for instantiation test
      const mockStartNewGame = {
        execute: vi.fn(),
        gameRepository: vi.fn(),
        eventStore: vi.fn(),
        logger: vi.fn(),
        validateCommandInput: vi.fn(),
        recordLineupSetup: vi.fn(),
        setupInitialInning: vi.fn(),
        notifyGameStarted: vi.fn(),
        authenticateUser: vi.fn(),
        authorizeStartGame: vi.fn(),
        generateGameId: vi.fn(),
        validateGameRules: vi.fn(),
        initializeGameState: vi.fn(),
        persistGameCreation: vi.fn(),
        handleGameStartFailure: vi.fn(),
        auditGameStart: vi.fn(),
        publishGameStartedEvent: vi.fn(),
        setupGameInfrastructure: vi.fn(),
      } as Partial<StartNewGame> as StartNewGame;
      const mockRecordAtBat = { execute: vi.fn() } as Partial<RecordAtBat> as RecordAtBat;
      const mockSubstitutePlayer = {
        execute: vi.fn(),
      } as Partial<SubstitutePlayer> as SubstitutePlayer;
      const mockEndInning = { execute: vi.fn() } as Partial<EndInning> as EndInning;
      const mockLogger: MockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
        isLevelEnabled: vi.fn().mockReturnValue(true),
      };
      const mockNotificationService: MockNotificationService = {
        sendUserNotification: vi.fn(),
        sendSystemNotification: vi.fn(),
        sendBatchNotifications: vi.fn(),
        updateUserPreferences: vi.fn(),
        getUserPreferences: vi.fn(),
        isChannelAvailable: vi.fn(),
        notifyGameStarted: vi.fn(),
        notifyGameEnded: vi.fn(),
        notifyScoreUpdate: vi.fn(),
      };
      const mockAuthService: MockAuthService = {
        authenticate: vi.fn(),
        logout: vi.fn(),
        validateSession: vi.fn(),
        validateToken: vi.fn(),
        refreshSession: vi.fn(),
        getUserProfile: vi.fn(),
        updateUserProfile: vi.fn(),
        hasPermission: vi.fn(),
        hasRole: vi.fn(),
        getUserSessions: vi.fn(),
        terminateSession: vi.fn(),
        terminateAllUserSessions: vi.fn(),
        logSecurityEvent: vi.fn(),
        getSecurityEvents: vi.fn(),
        changePassword: vi.fn(),
        enableTwoFactor: vi.fn(),
        disableTwoFactor: vi.fn(),
        getCurrentUser: vi.fn(),
      };

      const mockGameRepository: MockGameRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        findByStatus: vi.fn(),
        findByDateRange: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
      };

      const mockEventStore: MockEventStore = {
        append: vi.fn(),
        getEvents: vi.fn(),
        getGameEvents: vi.fn(),
        getAllEvents: vi.fn(),
        getEventsByType: vi.fn(),
        getEventsByGameId: vi.fn(),
      };

      const mockUndoLastAction = new UndoLastAction(mockGameRepository, mockEventStore, mockLogger);
      const mockRedoLastAction = new RedoLastAction(mockGameRepository, mockEventStore, mockLogger);

      // Test GameApplicationService instantiation
      expect(() => {
        return new ServicesIndex.GameApplicationService(
          mockStartNewGame,
          mockRecordAtBat,
          mockSubstitutePlayer,
          mockEndInning,
          mockUndoLastAction,
          mockRedoLastAction,
          mockLogger,
          mockNotificationService,
          mockAuthService
        );
      }).not.toThrow();

      // Test EventSourcingService instantiation
      expect(() => {
        return new ServicesIndex.EventSourcingService(mockEventStore, mockLogger);
      }).not.toThrow();
    });

    it('should maintain consistent export patterns', () => {
      const exports = Object.keys(ServicesIndex);

      // All main service exports should be PascalCase
      const serviceExports = exports.filter(name => name.endsWith('Service'));
      serviceExports.forEach(serviceName => {
        expect(serviceName).toMatch(/^[A-Z][A-Za-z]*Service$/);
      });
    });
  });
});
