import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// Import CSS for testing
import '../index.css';

// Type interfaces for mocks
interface Logger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
  log: (level: string, message: string, context?: Record<string, unknown>, error?: Error) => void;
  isLevelEnabled: (level: string) => boolean;
}

interface MockUseCases {
  startNewGame: { execute: ReturnType<typeof vi.fn> };
  recordAtBat: { execute: ReturnType<typeof vi.fn> };
  substitutePlayer: { execute: ReturnType<typeof vi.fn> };
  undoLastAction: { execute: ReturnType<typeof vi.fn> };
  redoLastAction: { execute: ReturnType<typeof vi.fn> };
  endInning: { execute: ReturnType<typeof vi.fn> };
}

interface MockRepositories {
  gameRepository: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  teamLineupRepository: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  inningStateRepository: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
}

interface MockInfrastructure {
  eventStore: {
    append: ReturnType<typeof vi.fn>;
    getEvents: ReturnType<typeof vi.fn>;
    getAllEvents: ReturnType<typeof vi.fn>;
  };
  gameAdapter: {
    startNewGame: ReturnType<typeof vi.fn>;
    recordAtBat: ReturnType<typeof vi.fn>;
    substitutePlayer: ReturnType<typeof vi.fn>;
    undoLastAction: ReturnType<typeof vi.fn>;
    redoLastAction: ReturnType<typeof vi.fn>;
    endInning: ReturnType<typeof vi.fn>;
    getTeamLineup: ReturnType<typeof vi.fn>;
    makeSubstitution: ReturnType<typeof vi.fn>;
  };
}

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock IndexedDB globally for all tests since it's not available in Node.js
Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: () => {
      throw new Error('IndexedDB not available');
    },
    deleteDatabase: () => {
      throw new Error('IndexedDB not available');
    },
    databases: () => {
      throw new Error('IndexedDB not available');
    },
  },
  writable: true,
});

// Mock console methods to reduce noise in tests unless explicitly testing logging
const originalConsole = { ...console };
Object.assign(console, {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
});

// Lightweight DI Container Mocking
// Create simpler mock implementations to reduce memory usage
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
});

const createMockUseCases = (): MockUseCases => ({
  startNewGame: {
    execute: vi.fn(() => Promise.resolve({ success: true, gameId: 'mock-game-id' })),
  },
  recordAtBat: { execute: vi.fn() },
  substitutePlayer: {
    execute: vi.fn(() => Promise.resolve({ success: true, gameId: 'mock-game-id' })),
  },
  undoLastAction: { execute: vi.fn() },
  redoLastAction: { execute: vi.fn() },
  endInning: { execute: vi.fn() },
});

const createMockRepositories = (): MockRepositories => ({
  gameRepository: { save: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
  teamLineupRepository: { save: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
  inningStateRepository: { save: vi.fn(), findById: vi.fn(), findAll: vi.fn() },
});

const createMockInfrastructure = (): MockInfrastructure => ({
  eventStore: {
    append: vi.fn(),
    getEvents: vi.fn(() => Promise.resolve([])),
    getAllEvents: vi.fn(() => Promise.resolve([])),
  },
  gameAdapter: {
    startNewGame: vi.fn(),
    recordAtBat: vi.fn(),
    substitutePlayer: vi.fn(),
    undoLastAction: vi.fn(),
    redoLastAction: vi.fn(),
    endInning: vi.fn(),
    getTeamLineup: vi.fn(() => Promise.resolve({ success: true })),
    makeSubstitution: vi.fn(() => Promise.resolve({ success: true })),
  },
});

// Create lightweight instances
const mockLogger = createMockLogger();
const mockUseCases = createMockUseCases();
const mockRepositories = createMockRepositories();
const mockInfrastructure = createMockInfrastructure();

const mockContainer = {
  ...mockUseCases,
  ...mockRepositories,
  ...mockInfrastructure,
  logger: mockLogger,
};

// Mock the DI container module globally
vi.mock('../shared/api/di', () => ({
  getContainer: vi.fn(() => mockContainer),
  initializeContainer: vi.fn(() => Promise.resolve()),
  resetContainer: vi.fn(),
  ConsoleLogger: vi.fn().mockImplementation(() => mockLogger),
  createLogger: vi.fn(() => mockLogger),
}));

// Mock DI Container and infrastructure registration modules
interface WizardState {
  teams?: {
    home?: string;
    away?: string;
    ourTeam?: string;
  };
  lineup?: unknown[];
}

// Mock ApplicationFactory and DI Container functions for tests - simplified to prevent memory leaks
vi.mock('@twsoftball/application/services/ApplicationFactory', () => ({
  createApplicationServicesWithContainer: vi.fn().mockResolvedValue({
    ...mockUseCases,
    ...mockRepositories,
    eventStore: mockInfrastructure.eventStore,
    logger: mockLogger,
    config: { environment: 'test', storage: 'memory' },
  }),
  createApplicationServicesWithContainerAndFactory: vi.fn().mockResolvedValue({
    ...mockUseCases,
    ...mockRepositories,
    eventStore: mockInfrastructure.eventStore,
    logger: mockLogger,
    config: { environment: 'test', storage: 'memory' },
  }),
}));

vi.mock('@twsoftball/application', () => ({
  createApplicationServicesWithContainer: vi.fn().mockResolvedValue({
    ...mockUseCases,
    ...mockRepositories,
    eventStore: mockInfrastructure.eventStore,
    logger: mockLogger,
    config: { environment: 'test', storage: 'memory' },
  }),
  // Add essential exports needed by tests without importing the full module
  FieldPosition: {
    PITCHER: 'P',
    CATCHER: 'C',
    FIRST_BASE: '1B',
    SECOND_BASE: '2B',
    THIRD_BASE: '3B',
    SHORTSTOP: 'SS',
    LEFT_FIELD: 'LF',
    CENTER_FIELD: 'CF',
    RIGHT_FIELD: 'RF',
    SHORT_FIELDER: 'SF',
    EXTRA_PLAYER: 'EP',
  },
  AtBatResultType: {
    SINGLE: '1B',
    DOUBLE: '2B',
    TRIPLE: '3B',
    HOME_RUN: 'HR',
    WALK: 'BB',
    ERROR: 'E',
    FIELDERS_CHOICE: 'FC',
    STRIKEOUT: 'SO',
    GROUND_OUT: 'GO',
    FLY_OUT: 'FO',
    DOUBLE_PLAY: 'DP',
    TRIPLE_PLAY: 'TP',
    SACRIFICE_FLY: 'SF',
  },
  GameId: ((): typeof vi.fn => {
    interface GameIdInstance {
      value: string;
      toString: () => string;
      equals: (other: { value: string }) => boolean;
    }
    const GameIdMock = vi.fn().mockImplementation(function (
      this: GameIdInstance,
      value: string
    ): void {
      this.value = value;
      this.toString = (): string => value;
      this.equals = (other: { value: string }): boolean => value === other.value;
    });
    return GameIdMock;
  })(),
  PlayerId: ((): typeof vi.fn => {
    interface PlayerIdInstance {
      value: string;
      toString: () => string;
      equals: (other: { value: string }) => boolean;
    }
    const PlayerIdMock = vi.fn().mockImplementation(function (
      this: PlayerIdInstance,
      value: string
    ): void {
      this.value = value;
      this.toString = (): string => value;
      this.equals = (other: { value: string }): boolean => value === other.value;
    });
    return PlayerIdMock;
  })(),
  JerseyNumber: ((): typeof vi.fn & { fromNumber: ReturnType<typeof vi.fn> } => {
    interface JerseyNumberInstance {
      value: string;
      toString: () => string;
      equals: (other: { value: string }) => boolean;
    }
    const JerseyNumberMock = vi.fn().mockImplementation(function (
      this: JerseyNumberInstance,
      value: string
    ): void {
      this.value = value;
      this.toString = (): string => value;
      this.equals = (other: { value: string }): boolean => value === other.value;
    });
    JerseyNumberMock.fromNumber = vi.fn().mockImplementation(function (
      num: number
    ): JerseyNumberInstance {
      return new (JerseyNumberMock as new (value: string) => JerseyNumberInstance)(num.toString());
    });
    return JerseyNumberMock;
  })(),
  TeamLineupId: ((): typeof vi.fn => {
    interface TeamLineupIdInstance {
      value: string;
      toString: () => string;
      equals: (other: { value: string }) => boolean;
    }
    const TeamLineupIdMock = vi.fn().mockImplementation(function (
      this: TeamLineupIdInstance,
      value: string
    ): void {
      this.value = value;
      this.toString = (): string => value;
      this.equals = (other: { value: string }): boolean => value === other.value;
    });
    return TeamLineupIdMock;
  })(),
  // Add jersey number constants
  JERSEY_NUMBERS: {
    SUBSTITUTE_START: 50,
    MAX_ALLOWED: 99,
    MIN_ALLOWED: 1,
  },
  // Add Error Classes
  DomainError: vi.fn().mockImplementation((message: string) => ({ message, name: 'DomainError' })),
  ValidationError: vi
    .fn()
    .mockImplementation((message: string) => ({ message, name: 'ValidationError' })),
}));

// Mock web adapters (now in Web layer)
vi.mock('../shared/api/adapters', () => ({
  GameAdapter: vi.fn().mockImplementation(() => mockInfrastructure.gameAdapter),
}));

vi.mock('../shared/api/mappers', () => ({
  wizardToCommand: vi.fn((wizardState: WizardState | undefined) => ({
    gameId: 'mock-game-id',
    homeTeamName: wizardState?.teams?.home || 'Home Team',
    awayTeamName: wizardState?.teams?.away || 'Away Team',
    ourTeamSide: wizardState?.teams?.ourTeam === 'home' ? 'HOME' : 'AWAY',
    gameDate: new Date(),
    initialLineup: wizardState?.lineup || [],
  })),
}));

// Mock infrastructure registration modules to avoid side effects
vi.mock('@twsoftball/infrastructure/web', () => ({}));
vi.mock('@twsoftball/infrastructure/memory', () => ({}));

// Mock the new App Services Context - simplified
vi.mock('../shared/lib/context/appServices', () => ({
  useAppServicesContext: vi.fn(() => ({
    services: {
      applicationServices: mockUseCases,
      gameAdapter: mockInfrastructure.gameAdapter,
    },
    isInitializing: false,
    error: null,
  })),
  AppServicesContext: {
    Provider: ({ children }: { children: unknown }): unknown => children,
  },
}));

// Global debounce mock removed - using selective mocking per test file instead
// This allows debounce utility tests to test the real implementation
// while component tests can use mocked versions as needed

// Export lightweight mock references for tests that need them
interface TestMocks {
  logger: Logger;
  useCases: MockUseCases;
  repositories: MockRepositories;
  infrastructure: MockInfrastructure;
  container: MockUseCases & MockRepositories & MockInfrastructure & { logger: Logger };
  restoreConsole: () => void;
}

declare global {
  var __testMocks: TestMocks;
}

globalThis.__testMocks = {
  logger: mockLogger,
  useCases: mockUseCases,
  repositories: mockRepositories,
  infrastructure: mockInfrastructure,
  container: mockContainer,
  restoreConsole: (): void => Object.assign(console, originalConsole),
};

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach((): void => {
  cleanup();
  // Reset all mocks to default implementations
  vi.clearAllMocks();
});
