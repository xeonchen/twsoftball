import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// Import CSS for testing
import '../index.css';

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

// Comprehensive DI Container Mocking
// Create comprehensive mock implementations for DI container functions
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
};

const mockUseCases = {
  startNewGame: {
    execute: vi.fn(() =>
      Promise.resolve({
        success: true,
        gameId: 'mock-game-id',
        initialState: {
          gameId: 'mock-game-id',
          status: 'WAITING_TO_START',
          score: { home: 0, away: 0, leader: 'TIE', difference: 0 },
          gameStartTime: new Date(),
          currentInning: 1,
          isTopHalf: true,
          battingTeam: 'AWAY',
          outs: 0,
          bases: {
            first: null,
            second: null,
            third: null,
            runnersInScoringPosition: [],
            basesLoaded: false,
          },
          currentBatterSlot: 1,
          homeLineup: {},
          awayLineup: {},
          currentBatter: null,
          lastUpdated: new Date(),
        },
      })
    ),
  },
  recordAtBat: { execute: vi.fn() },
  substitutePlayer: { execute: vi.fn() },
  undoLastAction: { execute: vi.fn() },
  redoLastAction: { execute: vi.fn() },
  endInning: { execute: vi.fn() },
};

const mockRepositories = {
  gameRepository: {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
  },
  teamLineupRepository: {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
  },
  inningStateRepository: {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
  },
};

const mockInfrastructure = {
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
  },
};

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

// Mock DI Container functions for tests
vi.mock('@twsoftball/application', async importOriginal => {
  const original = await importOriginal<typeof import('@twsoftball/application')>();
  return {
    ...original,
    createApplicationServicesWithContainer: vi.fn().mockResolvedValue({
      ...mockUseCases,
      ...mockRepositories,
      eventStore: mockInfrastructure.eventStore,
      logger: mockLogger,
      config: { environment: 'test', storage: 'memory' },
    }),
  };
});

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

// Global debounce mock removed - using selective mocking per test file instead
// This allows debounce utility tests to test the real implementation
// while component tests can use mocked versions as needed

// Mock interfaces for proper typing
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
  };
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  isLevelEnabled: ReturnType<typeof vi.fn>;
}

interface TestMocks {
  logger: MockLogger;
  useCases: MockUseCases;
  repositories: MockRepositories;
  infrastructure: MockInfrastructure;
  container: MockUseCases & MockRepositories & MockInfrastructure & { logger: MockLogger };
  restoreConsole: () => void;
}

// Export mock references for tests that need to override behavior
(globalThis as unknown as { __testMocks: TestMocks }).__testMocks = {
  logger: mockLogger,
  useCases: mockUseCases,
  repositories: mockRepositories,
  infrastructure: mockInfrastructure,
  container: mockContainer,
  restoreConsole: (): void => {
    Object.assign(console, originalConsole);
  },
};

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach((): void => {
  cleanup();
  // Reset all mocks to default implementations
  vi.clearAllMocks();
});
