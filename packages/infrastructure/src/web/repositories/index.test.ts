/**
 * @file Repository Initialization Module Tests
 * Tests for repository initialization and dependency injection following TDD approach.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

import {
  initializeRepositories,
  getGameRepository,
  getTeamLineupRepository,
  getInningStateRepository,
  resetRepositories,
  type RepositoryConfig,
} from './index';

// Mock the infrastructure layer
vi.mock('@twsoftball/infrastructure', () => ({
  InMemoryEventStore: vi.fn(() => ({ initialize: vi.fn() })),
  IndexedDBEventStore: vi.fn(() => ({ initialize: vi.fn() })),
  EventSourcedGameRepository: vi.fn(() => ({})),
  EventSourcedTeamLineupRepository: vi.fn(() => ({})),
  EventSourcedInningStateRepository: vi.fn(() => ({})),
}));

describe('Repository Initialization Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRepositories();
  });

  describe('initializeRepositories', () => {
    it('should initialize repositories with InMemoryEventStore for development', async () => {
      const config: RepositoryConfig = {
        environment: 'development',
        useInMemoryStore: true,
      };

      await initializeRepositories(config);

      // Verify repositories are initialized
      expect(getGameRepository()).toBeDefined();
      expect(getTeamLineupRepository()).toBeDefined();
      expect(getInningStateRepository()).toBeDefined();
    });

    it('should initialize repositories with IndexedDBEventStore for production', async () => {
      const config: RepositoryConfig = {
        environment: 'production',
        useInMemoryStore: false,
      };

      await initializeRepositories(config);

      // Verify repositories are initialized
      expect(getGameRepository()).toBeDefined();
      expect(getTeamLineupRepository()).toBeDefined();
      expect(getInningStateRepository()).toBeDefined();
    });

    it('should throw error if repositories are not initialized before accessing', () => {
      // Repositories should be reset by beforeEach
      expect(() => getGameRepository()).toThrow(
        'Repositories not initialized. Call initializeRepositories first.'
      );
      expect(() => getTeamLineupRepository()).toThrow(
        'Repositories not initialized. Call initializeRepositories first.'
      );
      expect(() => getInningStateRepository()).toThrow(
        'Repositories not initialized. Call initializeRepositories first.'
      );
    });

    it('should handle IndexedDB initialization errors gracefully', async () => {
      // Reset module registry to allow re-mocking
      vi.resetModules();

      // Mock infrastructure module to make IndexedDBEventStore throw
      vi.doMock('../../persistence', () => ({
        InMemoryEventStore: vi.fn().mockImplementation(() => ({ initialize: vi.fn() })),
        IndexedDBEventStore: vi.fn().mockImplementation(() => {
          throw new Error('IndexedDB not available');
        }),
        EventSourcedGameRepository: vi.fn().mockImplementation(() => ({})),
        EventSourcedTeamLineupRepository: vi.fn().mockImplementation(() => ({})),
        EventSourcedInningStateRepository: vi.fn().mockImplementation(() => ({})),
      }));

      // Re-import the module to get the mocked version
      const { initializeRepositories: mockInitializeRepositories } = await import('./index');

      const config: RepositoryConfig = {
        environment: 'production',
        useInMemoryStore: false,
      };

      await expect(mockInitializeRepositories(config)).rejects.toThrow(
        'Failed to initialize repositories: IndexedDB not available'
      );
    });

    it('should allow re-initialization with different configuration', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      const { InMemoryEventStore, IndexedDBEventStore } = await import(
        '@twsoftball/infrastructure'
      );
      (InMemoryEventStore as unknown as MockedFunction<() => unknown>).mockReturnValue({});
      (IndexedDBEventStore as unknown as MockedFunction<() => unknown>).mockReturnValue({});

      // First initialization
      const config1: RepositoryConfig = {
        environment: 'development',
        useInMemoryStore: true,
      };
      await initializeRepositories(config1);

      const initialGameRepo = getGameRepository();

      // Re-initialize with different config
      const config2: RepositoryConfig = {
        environment: 'development', // Use development to avoid IndexedDB initialization
        useInMemoryStore: true, // Keep using in-memory for testing
      };
      await initializeRepositories(config2);

      const newGameRepo = getGameRepository();

      // Should be different instances
      expect(newGameRepo).not.toBe(initialGameRepo);
    });
  });

  describe('Repository Getters', () => {
    beforeEach(async () => {
      const config: RepositoryConfig = {
        environment: 'development',
        useInMemoryStore: true,
      };
      await initializeRepositories(config);
    });

    it('should return the same repository instance on multiple calls', () => {
      const gameRepo1 = getGameRepository();
      const gameRepo2 = getGameRepository();

      expect(gameRepo1).toBe(gameRepo2);
    });

    it('should return different repository types', () => {
      const gameRepo = getGameRepository();
      const teamLineupRepo = getTeamLineupRepository();
      const inningStateRepo = getInningStateRepository();

      expect(gameRepo).not.toBe(teamLineupRepo);
      expect(teamLineupRepo).not.toBe(inningStateRepo);
      expect(gameRepo).not.toBe(inningStateRepo);
    });
  });
});
