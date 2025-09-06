/**
 * @file Mock Service Factories
 * Factory functions for creating mocked services and ports used in tests.
 *
 * @remarks
 * This module provides factory functions for creating consistently mocked services,
 * ports, and use cases. It helps reduce test setup duplication by centralizing
 * common mock configurations and providing preset behaviors for different test scenarios.
 */

import { GameId } from '@twsoftball/domain';
import { vi, MockedFunction } from 'vitest';

// Use case imports
import { AtBatResult } from '../dtos/AtBatResult';
import { GameStartResult } from '../dtos/GameStartResult';
import { InningEndResult } from '../dtos/InningEndResult';
import { RedoResult } from '../dtos/RedoResult';
import { SubstitutionResult } from '../dtos/SubstitutionResult';
import { UndoResult } from '../dtos/UndoResult';
import { AuthService } from '../ports/out/AuthService';
import { EventStore } from '../ports/out/EventStore';
import { GameRepository } from '../ports/out/GameRepository';
import { Logger, LogLevel, LogContext } from '../ports/out/Logger';
import { NotificationService } from '../ports/out/NotificationService';
import { EndInning } from '../use-cases/EndInning';
import { RecordAtBat } from '../use-cases/RecordAtBat';
import { RedoLastAction } from '../use-cases/RedoLastAction';
import { StartNewGame } from '../use-cases/StartNewGame';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer';
import { UndoLastAction } from '../use-cases/UndoLastAction';

// Port imports

// DTO imports

import { createGameStateDTO } from './dto-factories';

/**
 * Interface defining all mocked use case execute functions.
 */
export interface MockedUseCases {
  startNewGame: {
    execute: MockedFunction<StartNewGame['execute']>;
  };
  recordAtBat: {
    execute: MockedFunction<RecordAtBat['execute']>;
  };
  substitutePlayer: {
    execute: MockedFunction<SubstitutePlayer['execute']>;
  };
  endInning: {
    execute: MockedFunction<EndInning['execute']>;
  };
  undoLastAction: {
    execute: MockedFunction<UndoLastAction['execute']>;
  };
  redoLastAction: {
    execute: MockedFunction<RedoLastAction['execute']>;
  };
}

/**
 * Interface defining all mocked port services.
 */
export interface MockedPorts {
  logger: Logger;
  notificationService: NotificationService;
  authService: AuthService;
  eventStore: EventStore;
  gameRepository: GameRepository;
}

/**
 * Creates a complete set of mocked use cases with standard behaviors.
 */
export function createMockUseCases(): MockedUseCases {
  // Create mock functions
  const mockExecuteStartNewGame = vi.fn();
  const mockExecuteRecordAtBat = vi.fn();
  const mockExecuteSubstitutePlayer = vi.fn();
  const mockExecuteEndInning = vi.fn();
  const mockExecuteUndoLastAction = vi.fn();
  const mockExecuteRedoLastAction = vi.fn();

  // Set default behaviors to prevent test failures
  const defaultGameId = GameId.generate();
  mockExecuteStartNewGame.mockResolvedValue({
    success: true,
    gameId: defaultGameId,
    gameState: createGameStateDTO(defaultGameId),
  } as GameStartResult);

  mockExecuteRecordAtBat.mockResolvedValue({
    success: true,
    gameState: createGameStateDTO(GameId.generate()),
    runsScored: 0,
    rbiAwarded: 0,
    inningEnded: false,
    gameEnded: false,
  } as AtBatResult);

  mockExecuteSubstitutePlayer.mockResolvedValue({
    success: true,
    gameState: createGameStateDTO(GameId.generate()),
    positionChanged: false,
    reentryUsed: false,
  } as SubstitutionResult);

  mockExecuteEndInning.mockResolvedValue({
    success: true,
    gameState: createGameStateDTO(GameId.generate()),
    transitionType: 'HALF_INNING',
    gameEnded: false,
  } as InningEndResult);

  mockExecuteUndoLastAction.mockResolvedValue({
    success: false,
    gameId: GameId.generate(),
    errors: ['No default undo behavior'],
    actionsUndone: 0,
  } as UndoResult);

  mockExecuteRedoLastAction.mockResolvedValue({
    success: false,
    gameId: GameId.generate(),
    errors: ['No default redo behavior'],
    actionsRedone: 0,
  } as RedoResult);

  return {
    startNewGame: {
      execute: mockExecuteStartNewGame,
    },
    recordAtBat: {
      execute: mockExecuteRecordAtBat,
    },
    substitutePlayer: {
      execute: mockExecuteSubstitutePlayer,
    },
    endInning: {
      execute: mockExecuteEndInning,
    },
    undoLastAction: {
      execute: mockExecuteUndoLastAction,
    },
    redoLastAction: {
      execute: mockExecuteRedoLastAction,
    },
  };
}

/**
 * Creates a complete set of mocked ports with standard behaviors.
 */
export function createMockPorts(): MockedPorts {
  // Create mock functions
  const mockLoggerInfo = vi.fn();
  const mockLoggerDebug = vi.fn();
  const mockLoggerWarn = vi.fn();
  const mockLoggerError = vi.fn();
  const mockNotifyGameStarted = vi.fn();
  const mockNotifyGameEnded = vi.fn();
  const mockNotifyScoreUpdate = vi.fn();
  const mockSendUserNotification = vi.fn();
  const mockSendSystemNotification = vi.fn();
  const mockSendBatchNotifications = vi.fn();
  const mockUpdateUserPreferences = vi.fn();
  const mockGetUserPreferences = vi.fn();
  const mockIsChannelAvailable = vi.fn();
  const mockAuthenticate = vi.fn();
  const mockLogout = vi.fn();
  const mockValidateSession = vi.fn();
  const mockValidateToken = vi.fn();
  const mockRefreshSession = vi.fn();
  const mockGetUserProfile = vi.fn();
  const mockUpdateUserProfile = vi.fn();
  const mockHasPermission = vi.fn();
  const mockHasRole = vi.fn();
  const mockGetUserSessions = vi.fn();
  const mockTerminateSession = vi.fn();
  const mockTerminateAllUserSessions = vi.fn();
  const mockLogSecurityEvent = vi.fn();
  const mockGetSecurityEvents = vi.fn();
  const mockChangePassword = vi.fn();
  const mockEnableTwoFactor = vi.fn();
  const mockDisableTwoFactor = vi.fn();
  const mockGetCurrentUser = vi.fn();
  const mockEventStoreAppend = vi.fn();
  const mockEventStoreGetEvents = vi.fn();
  const mockGameRepositorySave = vi.fn();
  const mockGameRepositoryFindById = vi.fn();

  // Set default behaviors
  mockSendUserNotification.mockResolvedValue({
    notificationId: 'test-notification-id',
    success: true,
    deliveredChannels: ['ui'],
    failedChannels: [],
    timestamp: new Date(),
  });
  mockSendSystemNotification.mockResolvedValue({
    notificationId: 'test-system-notification-id',
    success: true,
    deliveredChannels: ['ui'],
    failedChannels: [],
    timestamp: new Date(),
  });
  mockSendBatchNotifications.mockResolvedValue([]);
  mockUpdateUserPreferences.mockResolvedValue(undefined);
  mockGetUserPreferences.mockResolvedValue(null);
  mockIsChannelAvailable.mockResolvedValue(true);
  mockAuthenticate.mockResolvedValue({
    success: true,
    sessionId: 'test-session-id',
    accessToken: 'test-token',
  });
  mockLogout.mockResolvedValue(undefined);
  mockValidateSession.mockResolvedValue({
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    isValid: true,
  });
  mockValidateToken.mockResolvedValue({
    token: 'test-token',
    userId: 'test-user-id',
    isValid: true,
  });
  mockRefreshSession.mockResolvedValue({
    success: true,
    sessionId: 'test-session-id',
    accessToken: 'test-token',
  });
  mockGetUserProfile.mockResolvedValue(null);
  mockUpdateUserProfile.mockResolvedValue({
    id: 'test-user-id',
    username: 'test-user',
    displayName: 'Test User',
  });
  mockHasPermission.mockResolvedValue(true);
  mockHasRole.mockResolvedValue(true);
  mockGetUserSessions.mockResolvedValue([]);
  mockTerminateSession.mockResolvedValue(undefined);
  mockTerminateAllUserSessions.mockResolvedValue(undefined);
  mockLogSecurityEvent.mockResolvedValue(undefined);
  mockGetSecurityEvents.mockResolvedValue([]);
  mockChangePassword.mockResolvedValue(undefined);
  mockEnableTwoFactor.mockResolvedValue(undefined);
  mockDisableTwoFactor.mockResolvedValue(undefined);
  mockGetCurrentUser.mockResolvedValue({ userId: 'test-user-id' });
  mockEventStoreAppend.mockResolvedValue(undefined);
  mockEventStoreGetEvents.mockResolvedValue([]);
  mockGameRepositorySave.mockResolvedValue(undefined);
  mockGameRepositoryFindById.mockResolvedValue(null);

  // Create mock log function
  const mockLoggerLog = vi.fn();
  mockLoggerLog.mockImplementation(
    (_level: LogLevel, _message: string, _context?: LogContext, _error?: Error) => {
      // Default implementation does nothing
    }
  );

  // Create mock isLevelEnabled function
  const mockLoggerIsLevelEnabled = vi.fn();
  mockLoggerIsLevelEnabled.mockReturnValue(true);

  // Create additional mock event store methods
  const mockEventStoreGetGameEvents = vi.fn();
  const mockEventStoreGetAllEvents = vi.fn();
  const mockEventStoreGetEventsByType = vi.fn();
  const mockEventStoreGetEventsByGameId = vi.fn();

  // Set default behaviors for additional event store methods
  mockEventStoreGetGameEvents.mockResolvedValue([]);
  mockEventStoreGetAllEvents.mockResolvedValue([]);
  mockEventStoreGetEventsByType.mockResolvedValue([]);
  mockEventStoreGetEventsByGameId.mockResolvedValue([]);

  // Create additional mock game repository methods
  const mockGameRepositoryFindByStatus = vi.fn();
  const mockGameRepositoryFindByDateRange = vi.fn();
  const mockGameRepositoryExists = vi.fn();
  const mockGameRepositoryDelete = vi.fn();

  // Set default behaviors for additional game repository methods
  mockGameRepositoryFindByStatus.mockResolvedValue([]);
  mockGameRepositoryFindByDateRange.mockResolvedValue([]);
  mockGameRepositoryExists.mockResolvedValue(false);
  mockGameRepositoryDelete.mockResolvedValue(undefined);

  return {
    logger: {
      info: mockLoggerInfo,
      debug: mockLoggerDebug,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      log: mockLoggerLog,
      isLevelEnabled: mockLoggerIsLevelEnabled,
    },
    notificationService: {
      notifyGameStarted: mockNotifyGameStarted,
      notifyGameEnded: mockNotifyGameEnded,
      notifyScoreUpdate: mockNotifyScoreUpdate,
      sendUserNotification: mockSendUserNotification,
      sendSystemNotification: mockSendSystemNotification,
      sendBatchNotifications: mockSendBatchNotifications,
      updateUserPreferences: mockUpdateUserPreferences,
      getUserPreferences: mockGetUserPreferences,
      isChannelAvailable: mockIsChannelAvailable,
    },
    authService: {
      authenticate: mockAuthenticate,
      logout: mockLogout,
      validateSession: mockValidateSession,
      validateToken: mockValidateToken,
      refreshSession: mockRefreshSession,
      getUserProfile: mockGetUserProfile,
      updateUserProfile: mockUpdateUserProfile,
      hasPermission: mockHasPermission,
      hasRole: mockHasRole,
      getUserSessions: mockGetUserSessions,
      terminateSession: mockTerminateSession,
      terminateAllUserSessions: mockTerminateAllUserSessions,
      logSecurityEvent: mockLogSecurityEvent,
      getSecurityEvents: mockGetSecurityEvents,
      changePassword: mockChangePassword,
      enableTwoFactor: mockEnableTwoFactor,
      disableTwoFactor: mockDisableTwoFactor,
      getCurrentUser: mockGetCurrentUser,
    },
    eventStore: {
      append: mockEventStoreAppend,
      getEvents: mockEventStoreGetEvents,
      getGameEvents: mockEventStoreGetGameEvents,
      getAllEvents: mockEventStoreGetAllEvents,
      getEventsByType: mockEventStoreGetEventsByType,
      getEventsByGameId: mockEventStoreGetEventsByGameId,
    },
    gameRepository: {
      save: mockGameRepositorySave,
      findById: mockGameRepositoryFindById,
      findByStatus: mockGameRepositoryFindByStatus,
      findByDateRange: mockGameRepositoryFindByDateRange,
      exists: mockGameRepositoryExists,
      delete: mockGameRepositoryDelete,
    },
  };
}

/**
 * Interface defining the complete return structure of createGameApplicationServiceMocks.
 */
export interface GameApplicationServiceMocks {
  // Use cases
  mockStartNewGame: MockedUseCases['startNewGame'];
  mockRecordAtBat: MockedUseCases['recordAtBat'];
  mockSubstitutePlayer: MockedUseCases['substitutePlayer'];
  mockEndInning: MockedUseCases['endInning'];
  mockUndoLastAction: MockedUseCases['undoLastAction'];
  mockRedoLastAction: MockedUseCases['redoLastAction'];

  // Ports
  mockLogger: Logger;
  mockNotificationService: NotificationService;
  mockAuthService: AuthService;
  mockEventStore: EventStore;
  mockGameRepository: GameRepository;

  // Direct access to mock functions for easy assertion
  functions: {
    // Use case functions
    executeStartNewGame: MockedFunction<StartNewGame['execute']>;
    executeRecordAtBat: MockedFunction<RecordAtBat['execute']>;
    executeSubstitutePlayer: MockedFunction<SubstitutePlayer['execute']>;
    executeEndInning: MockedFunction<EndInning['execute']>;
    executeUndoLastAction: MockedFunction<UndoLastAction['execute']>;
    executeRedoLastAction: MockedFunction<RedoLastAction['execute']>;

    // Port functions
    loggerInfo: MockedFunction<Logger['info']>;
    loggerDebug: MockedFunction<Logger['debug']>;
    loggerWarn: MockedFunction<Logger['warn']>;
    loggerError: MockedFunction<Logger['error']>;
    loggerLog: MockedFunction<Logger['log']>;
    loggerIsLevelEnabled: MockedFunction<Logger['isLevelEnabled']>;
    notifyGameStarted: MockedFunction<NotificationService['notifyGameStarted']>;
    notifyGameEnded: MockedFunction<NotificationService['notifyGameEnded']>;
    notifyScoreUpdate: MockedFunction<NotificationService['notifyScoreUpdate']>;
    sendUserNotification: MockedFunction<NotificationService['sendUserNotification']>;
    sendSystemNotification: MockedFunction<NotificationService['sendSystemNotification']>;
    sendBatchNotifications: MockedFunction<NotificationService['sendBatchNotifications']>;
    updateUserPreferences: MockedFunction<NotificationService['updateUserPreferences']>;
    getUserPreferences: MockedFunction<NotificationService['getUserPreferences']>;
    isChannelAvailable: MockedFunction<NotificationService['isChannelAvailable']>;
    getCurrentUser: MockedFunction<AuthService['getCurrentUser']>;
    hasPermission: MockedFunction<AuthService['hasPermission']>;
    authenticateUser: MockedFunction<AuthService['authenticate']>;
    eventStoreAppend: MockedFunction<EventStore['append']>;
    eventStoreGetEvents: MockedFunction<EventStore['getEvents']>;
    eventStoreGetGameEvents: MockedFunction<EventStore['getGameEvents']>;
    eventStoreGetAllEvents: MockedFunction<EventStore['getAllEvents']>;
    eventStoreGetEventsByType: MockedFunction<EventStore['getEventsByType']>;
    eventStoreGetEventsByGameId: MockedFunction<EventStore['getEventsByGameId']>;
    gameRepositorySave: MockedFunction<GameRepository['save']>;
    gameRepositoryFindById: MockedFunction<GameRepository['findById']>;
    gameRepositoryFindByStatus: MockedFunction<GameRepository['findByStatus']>;
    gameRepositoryFindByDateRange: MockedFunction<GameRepository['findByDateRange']>;
    gameRepositoryExists: MockedFunction<GameRepository['exists']>;
    gameRepositoryDelete: MockedFunction<GameRepository['delete']>;
  };
}

/**
 * Creates a complete mocked service setup for GameApplicationService tests.
 */
export function createGameApplicationServiceMocks(): GameApplicationServiceMocks {
  const mockUseCases = createMockUseCases();
  const mockPorts = createMockPorts();

  return {
    // Use cases
    mockStartNewGame: mockUseCases.startNewGame,
    mockRecordAtBat: mockUseCases.recordAtBat,
    mockSubstitutePlayer: mockUseCases.substitutePlayer,
    mockEndInning: mockUseCases.endInning,
    mockUndoLastAction: mockUseCases.undoLastAction,
    mockRedoLastAction: mockUseCases.redoLastAction,

    // Ports
    mockLogger: mockPorts.logger,
    mockNotificationService: mockPorts.notificationService,
    mockAuthService: mockPorts.authService,
    mockEventStore: mockPorts.eventStore,
    mockGameRepository: mockPorts.gameRepository,

    // Direct access to mock functions for easy assertion
    functions: {
      // Use case functions
      executeStartNewGame: mockUseCases.startNewGame.execute,
      executeRecordAtBat: mockUseCases.recordAtBat.execute,
      executeSubstitutePlayer: mockUseCases.substitutePlayer.execute,
      executeEndInning: mockUseCases.endInning.execute,
      executeUndoLastAction: mockUseCases.undoLastAction.execute,
      executeRedoLastAction: mockUseCases.redoLastAction.execute,

      // Port functions
      loggerInfo: mockPorts.logger.info as MockedFunction<Logger['info']>,
      loggerDebug: mockPorts.logger.debug as MockedFunction<Logger['debug']>,
      loggerWarn: mockPorts.logger.warn as MockedFunction<Logger['warn']>,
      loggerError: mockPorts.logger.error as MockedFunction<Logger['error']>,
      loggerLog: mockPorts.logger.log as MockedFunction<Logger['log']>,
      loggerIsLevelEnabled: mockPorts.logger.isLevelEnabled as MockedFunction<
        Logger['isLevelEnabled']
      >,
      notifyGameStarted: mockPorts.notificationService.notifyGameStarted as MockedFunction<
        NotificationService['notifyGameStarted']
      >,
      notifyGameEnded: mockPorts.notificationService.notifyGameEnded as MockedFunction<
        NotificationService['notifyGameEnded']
      >,
      notifyScoreUpdate: mockPorts.notificationService.notifyScoreUpdate as MockedFunction<
        NotificationService['notifyScoreUpdate']
      >,
      sendUserNotification: mockPorts.notificationService.sendUserNotification as MockedFunction<
        NotificationService['sendUserNotification']
      >,
      sendSystemNotification: mockPorts.notificationService
        .sendSystemNotification as MockedFunction<NotificationService['sendSystemNotification']>,
      sendBatchNotifications: mockPorts.notificationService
        .sendBatchNotifications as MockedFunction<NotificationService['sendBatchNotifications']>,
      updateUserPreferences: mockPorts.notificationService.updateUserPreferences as MockedFunction<
        NotificationService['updateUserPreferences']
      >,
      getUserPreferences: mockPorts.notificationService.getUserPreferences as MockedFunction<
        NotificationService['getUserPreferences']
      >,
      isChannelAvailable: mockPorts.notificationService.isChannelAvailable as MockedFunction<
        NotificationService['isChannelAvailable']
      >,
      getCurrentUser: mockPorts.authService.getCurrentUser as MockedFunction<
        AuthService['getCurrentUser']
      >,
      hasPermission: mockPorts.authService.hasPermission as MockedFunction<
        AuthService['hasPermission']
      >,
      authenticateUser: mockPorts.authService.authenticate as MockedFunction<
        AuthService['authenticate']
      >,
      eventStoreAppend: mockPorts.eventStore.append as MockedFunction<EventStore['append']>,
      eventStoreGetEvents: mockPorts.eventStore.getEvents as MockedFunction<
        EventStore['getEvents']
      >,
      eventStoreGetGameEvents: mockPorts.eventStore.getGameEvents as MockedFunction<
        EventStore['getGameEvents']
      >,
      eventStoreGetAllEvents: mockPorts.eventStore.getAllEvents as MockedFunction<
        EventStore['getAllEvents']
      >,
      eventStoreGetEventsByType: mockPorts.eventStore.getEventsByType as MockedFunction<
        EventStore['getEventsByType']
      >,
      eventStoreGetEventsByGameId: mockPorts.eventStore.getEventsByGameId as MockedFunction<
        EventStore['getEventsByGameId']
      >,
      gameRepositorySave: mockPorts.gameRepository.save as MockedFunction<GameRepository['save']>,
      gameRepositoryFindById: mockPorts.gameRepository.findById as MockedFunction<
        GameRepository['findById']
      >,
      gameRepositoryFindByStatus: mockPorts.gameRepository.findByStatus as MockedFunction<
        GameRepository['findByStatus']
      >,
      gameRepositoryFindByDateRange: mockPorts.gameRepository.findByDateRange as MockedFunction<
        GameRepository['findByDateRange']
      >,
      gameRepositoryExists: mockPorts.gameRepository.exists as MockedFunction<
        GameRepository['exists']
      >,
      gameRepositoryDelete: mockPorts.gameRepository.delete as MockedFunction<
        GameRepository['delete']
      >,
    },
  };
}

/**
 * Creates mocks for a specific use case with its common dependencies.
 */
export function createUseCaseMocks<T>(
  useCaseType:
    | 'startNewGame'
    | 'recordAtBat'
    | 'substitutePlayer'
    | 'endInning'
    | 'undoLastAction'
    | 'redoLastAction'
): {
  useCase: T;
  logger: Logger;
  eventStore: EventStore;
  gameRepository: GameRepository;
} {
  const mockPorts = createMockPorts();
  const mockUseCases = createMockUseCases();

  return {
    useCase: mockUseCases[useCaseType] as T,
    logger: mockPorts.logger,
    eventStore: mockPorts.eventStore,
    gameRepository: mockPorts.gameRepository,
  };
}
