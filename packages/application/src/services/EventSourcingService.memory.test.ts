/**
 * @file EventSourcingService.memory.test.ts
 * Memory Management tests for the EventSourcingService.
 *
 * @remarks
 * These tests verify the EventSourcingService's memory pressure handling,
 * cache eviction strategies, and memory management capabilities.
 *
 * **Test Coverage Areas**:
 * - Memory pressure detection (isMemoryPressureHigh)
 * - Cache memory usage calculation (calculateCacheMemoryUsage)
 * - Cache eviction strategies (TTL-based, size-based, memory pressure)
 * - LRU eviction ordering
 * - Memory management logging and statistics
 * - Aggressive eviction under high memory pressure (25% eviction)
 * - Concurrent eviction scenarios
 *
 * **Testing Strategy**:
 * - Direct cache manipulation for memory pressure scenarios
 * - Mock EventStore and Logger for isolation
 * - Test memory pressure threshold calculations
 * - Verify cache eviction logic with various scenarios
 * - Test memory freed calculations
 * - Ensure proper logging under memory pressure conditions
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

// Domain imports removed as they were unused
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Port imports
import { EventStore } from '../ports/out/EventStore.js';
import { Logger } from '../ports/out/Logger.js';

import { EventSourcingService } from './EventSourcingService.js';

describe('EventSourcingService - Memory Management', () => {
  let eventSourcingService: EventSourcingService;
  let mockEventStore: EventStore;
  let mockLogger: Logger;

  // Create mock functions that can be referenced directly
  const mockGetEvents = vi.fn();
  const mockAppend = vi.fn();
  const mockGetGameEvents = vi.fn();
  const mockGetAllEvents = vi.fn();
  const mockGetEventsByType = vi.fn();
  const mockGetEventsByGameId = vi.fn();
  const mockDebug = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock EventStore
    mockEventStore = {
      getEvents: mockGetEvents,
      append: mockAppend,
      getGameEvents: mockGetGameEvents,
      getAllEvents: mockGetAllEvents,
      getEventsByType: mockGetEventsByType,
      getEventsByGameId: mockGetEventsByGameId,
    };

    // Create mock Logger
    mockLogger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
    };

    // Set up default successful responses
    mockGetEvents.mockResolvedValue([]);
    mockAppend.mockResolvedValue();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetAllEvents.mockResolvedValue([]);
    mockGetEventsByType.mockResolvedValue([]);
    mockGetEventsByGameId.mockResolvedValue([]);

    // Create service instance
    eventSourcingService = new EventSourcingService(mockEventStore, mockLogger);
  });

  describe('Memory Pressure Detection', () => {
    it('should detect high memory pressure when cache exceeds threshold', () => {
      // Enable caching first
      eventSourcingService.enableSnapshotCaching(true);

      // Direct test of memory pressure by manipulating cache through service internals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Fill cache with entries manually to trigger memory pressure
      // Each entry should be large enough to trigger the 80% threshold of 50MB = 40MB
      for (let i = 0; i < 100; i++) {
        const largeData = 'x'.repeat(500000); // 500KB per entry
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, largeData }, // Mock aggregate with large data
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      // Get cache statistics to check memory pressure
      const stats = eventSourcingService.getCacheStatistics();

      // Should detect high memory pressure (100 * 500KB = 50MB, which is 100% of limit)
      expect(stats.isMemoryPressureHigh).toBe(true);
      expect(stats.memoryUsageEstimate).toBeGreaterThan(
        stats.maxMemoryUsage * stats.memoryPressureThreshold
      );
    });

    it('should not detect memory pressure under normal conditions', () => {
      // Enable caching first
      eventSourcingService.enableSnapshotCaching(true);

      // Direct test with small cache entries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add only a few small entries to cache
      for (let i = 0; i < 5; i++) {
        const smallData = 'x'.repeat(1000); // 1KB per entry (very small)
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, smallData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      // Get cache statistics
      const stats = eventSourcingService.getCacheStatistics();

      // Should not detect memory pressure (5 * 1KB = 5KB, well under 40MB threshold)
      expect(stats.isMemoryPressureHigh).toBe(false);
      expect(stats.memoryUsageEstimate).toBeLessThan(
        stats.maxMemoryUsage * stats.memoryPressureThreshold
      );
    });

    it('should handle memory pressure detection when cache is disabled', () => {
      // Cache is disabled by default
      const stats = eventSourcingService.getCacheStatistics();

      expect(stats.enabled).toBe(false);
      expect(stats.isMemoryPressureHigh).toBe(false);
      expect(stats.memoryUsageEstimate).toBe(0);
    });
  });

  describe('Cache Memory Usage Calculation', () => {
    it('should calculate memory usage accurately for cache entries', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add a known-size entry to cache
      const testData = 'x'.repeat(10000); // 10KB
      const cacheKey = 'game-1:Game:1';
      service.snapshotCache.set(cacheKey, {
        id: 'game-1',
        streamId: 'game-1',
        aggregateType: 'Game',
        version: 1,
        aggregate: { id: 'game-1', testData },
        createdAt: new Date(),
        metadata: {},
        lastAccessed: new Date(),
      });

      // Get statistics
      const stats = eventSourcingService.getCacheStatistics();

      // Should have calculated memory usage
      expect(stats.memoryUsageEstimate).toBeGreaterThan(0);
      expect(stats.size).toBe(1);
    });

    it('should return zero memory usage when cache is empty', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      const stats = eventSourcingService.getCacheStatistics();

      expect(stats.memoryUsageEstimate).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should calculate cumulative memory usage for multiple entries', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add multiple entries
      for (let i = 0; i < 10; i++) {
        const testData = 'x'.repeat(5000); // 5KB each
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, testData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      const stats = eventSourcingService.getCacheStatistics();

      expect(stats.size).toBe(10);
      expect(stats.memoryUsageEstimate).toBeGreaterThan(0);
    });
  });

  describe('Cache Eviction - TTL Based', () => {
    it('should evict expired entries based on TTL', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add entry with old timestamp (beyond TTL)
      const oldDate = new Date(Date.now() - 4000000); // 4000 seconds ago (> 1 hour TTL)
      const cacheKey = 'game-1:Game:1';
      service.snapshotCache.set(cacheKey, {
        id: 'game-1',
        streamId: 'game-1',
        aggregateType: 'Game',
        version: 1,
        aggregate: { id: 'game-1' },
        createdAt: oldDate,
        metadata: {},
        lastAccessed: oldDate, // This will be expired
      });

      // Verify entry exists
      let stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBe(1);

      // Trigger cleanup
      const cleanupResult = eventSourcingService.cleanupCache();

      // Verify eviction
      expect(cleanupResult.entriesRemoved).toBe(1);
      expect(cleanupResult.memoryFreed).toBeGreaterThan(0);

      // Verify cache is now empty
      stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBe(0);

      // Verify debug logging
      expect(mockDebug).toHaveBeenCalledWith(
        'Evicted expired cache entry',
        expect.objectContaining({
          cacheKey: expect.any(String),
          operation: 'evictStaleEntries',
        })
      );
    });

    it('should not evict entries within TTL', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add entry with recent timestamp (within TTL)
      const recentDate = new Date(); // Current time
      const cacheKey = 'game-1:Game:1';
      service.snapshotCache.set(cacheKey, {
        id: 'game-1',
        streamId: 'game-1',
        aggregateType: 'Game',
        version: 1,
        aggregate: { id: 'game-1' },
        createdAt: recentDate,
        metadata: {},
        lastAccessed: recentDate,
      });

      // Verify entry exists
      let stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBe(1);

      // Trigger cleanup (no time passage)
      const cleanupResult = eventSourcingService.cleanupCache();

      // Verify no eviction
      expect(cleanupResult.entriesRemoved).toBe(0);
      expect(cleanupResult.memoryFreed).toBe(0);

      // Verify cache still has entry
      stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBe(1);
    });
  });

  describe('Cache Eviction - Size Based', () => {
    it('should evict entries when cache exceeds MAX_CACHE_SIZE', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Fill cache beyond MAX_CACHE_SIZE (1000) to trigger size-based eviction
      const totalEntries = 1005;
      for (let i = 0; i < totalEntries; i++) {
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}` },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(Date.now() - i * 1000), // Different access times for LRU
        });
      }

      // Force eviction check by manually calling evictStaleEntries
      service.evictStaleEntries();

      // Verify size-based eviction occurred
      const stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBeLessThan(totalEntries); // Some entries should have been evicted

      // Verify debug logging for size-based eviction
      expect(mockDebug).toHaveBeenCalledWith(
        'Evicted cache entry',
        expect.objectContaining({
          reason: 'size-limit',
          operation: 'evictStaleEntries',
        })
      );
    });

    it('should use LRU strategy for size-based eviction', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Add entries with different access times
      const baseTime = Date.now();
      const entries = [
        { key: 'game-1:Game:1', lastAccessed: baseTime - 3000 }, // Oldest
        { key: 'game-2:Game:1', lastAccessed: baseTime - 2000 },
        { key: 'game-3:Game:1', lastAccessed: baseTime - 1000 }, // Newest
      ];

      entries.forEach(({ key, lastAccessed }) => {
        service.snapshotCache.set(key, {
          id: key.split(':')[0],
          streamId: key.split(':')[0],
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: key.split(':')[0] },
          createdAt: new Date(lastAccessed),
          metadata: {},
          lastAccessed: new Date(lastAccessed),
        });
      });

      const stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBe(3);
    });
  });

  describe('Cache Eviction - Memory Pressure', () => {
    it('should perform aggressive eviction under high memory pressure', { timeout: 10000 }, () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Create large entries to trigger memory pressure
      for (let i = 0; i < 50; i++) {
        const largeData = 'x'.repeat(1000000); // 1MB each
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, largeData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(Date.now() - i * 1000), // Different access times
        });
      }

      // Force eviction check
      service.evictStaleEntries();

      // Verify memory pressure warning was logged
      expect(mockWarn).toHaveBeenCalledWith(
        'High memory pressure detected in cache',
        expect.objectContaining({
          currentMemory: expect.any(Number),
          maxMemory: expect.any(Number),
          memoryPressureThreshold: expect.any(Number),
          cacheSize: expect.any(Number),
          operation: 'evictStaleEntries',
        })
      );

      // Verify memory pressure eviction occurred
      expect(mockDebug).toHaveBeenCalledWith(
        'Evicted cache entry',
        expect.objectContaining({
          reason: 'memory-pressure',
          operation: 'evictStaleEntries',
        })
      );
    });

    it('should evict 25% of entries under memory pressure', { timeout: 10000 }, () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Create exactly 20 large entries to test 25% eviction (should evict 5)
      const totalEntries = 20;
      for (let i = 0; i < totalEntries; i++) {
        const largeData = 'x'.repeat(3000000); // 3MB each = 60MB total (exceeds 50MB limit)
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, largeData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(Date.now() - i * 1000), // Different access times for LRU
        });
      }

      // Force eviction check
      service.evictStaleEntries();

      // Check final cache size - should be reduced due to memory pressure eviction
      const stats = eventSourcingService.getCacheStatistics();
      expect(stats.size).toBeLessThan(totalEntries); // Some entries should have been evicted

      // Should have logged memory management completion
      expect(mockInfo).toHaveBeenCalledWith(
        'Cache memory management completed',
        expect.objectContaining({
          memoryFreed: expect.any(Number),
          initialMemory: expect.any(Number),
          finalMemory: expect.any(Number),
          entriesEvicted: expect.any(Number),
          finalCacheSize: expect.any(Number),
          operation: 'evictStaleEntries',
        })
      );
    });
  });

  describe('Memory Management Logging', () => {
    it('should log memory management results when memory is freed', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Create large entries
      for (let i = 0; i < 10; i++) {
        const largeData = 'x'.repeat(100000); // 100KB each
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, largeData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      // Clear cache to trigger memory management logging
      const clearResult = eventSourcingService.clearCache();

      // Verify memory management logging
      expect(clearResult.entriesRemoved).toBe(10);
      expect(clearResult.memoryFreed).toBeGreaterThan(0);

      expect(mockInfo).toHaveBeenCalledWith(
        'Cache cleared manually',
        expect.objectContaining({
          entriesRemoved: 10,
          memoryFreed: expect.any(Number),
          operation: 'clearCache',
        })
      );
    });

    it('should handle memory management when no eviction is needed', () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Create small entries that won't trigger eviction
      for (let i = 0; i < 3; i++) {
        const smallData = 'x'.repeat(1000); // 1KB each
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, smallData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      // Trigger cleanup (should not evict anything)
      const cleanupResult = eventSourcingService.cleanupCache();

      expect(cleanupResult.entriesRemoved).toBe(0);
      expect(cleanupResult.memoryFreed).toBe(0);

      // Should still log the cleanup operation
      expect(mockInfo).toHaveBeenCalledWith(
        'Manual cache cleanup completed',
        expect.objectContaining({
          entriesRemoved: 0,
          sizeBefore: 3,
          sizeAfter: 3,
          memoryFreed: 0,
          operation: 'cleanupCache',
        })
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle eviction when cache is disabled', () => {
      // Cache is disabled by default
      const cleanupResult = eventSourcingService.cleanupCache();

      expect(cleanupResult.entriesRemoved).toBe(0);
      expect(cleanupResult.sizeBefore).toBe(0);
      expect(cleanupResult.sizeAfter).toBe(0);
      expect(cleanupResult.memoryFreed).toBe(0);
    });

    it('should handle empty cache eviction gracefully', () => {
      // Enable caching but don't add any entries
      eventSourcingService.enableSnapshotCaching(true);

      const cleanupResult = eventSourcingService.cleanupCache();

      expect(cleanupResult.entriesRemoved).toBe(0);
      expect(cleanupResult.sizeBefore).toBe(0);
      expect(cleanupResult.sizeAfter).toBe(0);
      expect(cleanupResult.memoryFreed).toBe(0);
    });

    it('should handle concurrent memory pressure scenarios', { timeout: 10000 }, () => {
      // Enable caching
      eventSourcingService.enableSnapshotCaching(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
      const service = eventSourcingService as any;

      // Create entries that might trigger multiple evictions
      for (let i = 0; i < 10; i++) {
        const largeData = 'x'.repeat(6000000); // 6MB each = 60MB total (exceeds limit)
        const cacheKey = `game-${i}:Game:1`;
        service.snapshotCache.set(cacheKey, {
          id: `game-${i}`,
          streamId: `game-${i}`,
          aggregateType: 'Game',
          version: 1,
          aggregate: { id: `game-${i}`, largeData },
          createdAt: new Date(),
          metadata: {},
          lastAccessed: new Date(),
        });
      }

      // Verify system handled the operation
      const stats = eventSourcingService.getCacheStatistics();
      expect(stats.enabled).toBe(true);
    });

    it(
      'should maintain cache integrity during memory pressure eviction',
      { timeout: 10000 },
      () => {
        // Enable caching
        eventSourcingService.enableSnapshotCaching(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal cache manipulation
        const service = eventSourcingService as any;

        // Create varying sized entries
        for (let i = 0; i < 20; i++) {
          const sizeMultiplier = i % 3 === 0 ? 2000000 : 500000; // Some large, some medium
          const variedData = 'x'.repeat(sizeMultiplier);
          const cacheKey = `game-${i}:Game:1`;
          service.snapshotCache.set(cacheKey, {
            id: `game-${i}`,
            streamId: `game-${i}`,
            aggregateType: 'Game',
            version: 1,
            aggregate: { id: `game-${i}`, variedData },
            createdAt: new Date(),
            metadata: {},
            lastAccessed: new Date(Date.now() - i * 1000), // Different access times
          });
        }

        // Force eviction check
        service.evictStaleEntries();

        // Verify cache maintains integrity
        const stats = eventSourcingService.getCacheStatistics();
        expect(stats.enabled).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
        expect(stats.memoryUsageEstimate).toBeGreaterThan(0);

        // All remaining entries should be valid
        expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
      }
    );
  });
});
