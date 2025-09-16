/**
 * @file Infrastructure Package Index Tests
 * Validates that all expected exports are properly accessible through the main entry point.
 *
 * @remarks
 * This test file ensures that the infrastructure package correctly exports all
 * implementations following the hexagonal architecture pattern. It verifies that
 * both persistent (IndexedDB) and in-memory implementations are available for
 * use by consuming applications.
 *
 * Coverage target: Lines 7-8 in index.ts (export statements)
 */

import { describe, it, expect } from 'vitest';

// Import all exports from the main entry point
import * as InfrastructureExports from './index';
// Import specific implementations to verify they're exported
import { InMemoryEventStore, IndexedDBEventStore } from './index';

describe('Infrastructure Package Index', () => {
  describe('Export Validation', () => {
    it('should export InMemoryEventStore from persistence module', () => {
      // Verify the export exists and is a constructor function
      expect(InMemoryEventStore).toBeDefined();
      expect(typeof InMemoryEventStore).toBe('function');

      // Verify it can be instantiated
      const store = new InMemoryEventStore();
      expect(store).toBeInstanceOf(InMemoryEventStore);

      // Verify it implements EventStore interface
      expect(typeof store.append).toBe('function');
      expect(typeof store.getEvents).toBe('function');
      expect(typeof store.getGameEvents).toBe('function');
      expect(typeof store.getAllEvents).toBe('function');
      expect(typeof store.getEventsByType).toBe('function');
      expect(typeof store.getEventsByGameId).toBe('function');
    });

    it('should export IndexedDBEventStore from persistence module', () => {
      // Verify the export exists and is a constructor function
      expect(IndexedDBEventStore).toBeDefined();
      expect(typeof IndexedDBEventStore).toBe('function');

      // Verify it can be instantiated
      const store = new IndexedDBEventStore();
      expect(store).toBeInstanceOf(IndexedDBEventStore);

      // Verify it implements EventStore interface
      expect(typeof store.append).toBe('function');
      expect(typeof store.getEvents).toBe('function');
      expect(typeof store.getGameEvents).toBe('function');
      expect(typeof store.getAllEvents).toBe('function');
      expect(typeof store.getEventsByType).toBe('function');
      expect(typeof store.getEventsByGameId).toBe('function');
    });

    it('should export all persistence implementations through index', () => {
      // Verify all expected exports are present in the module
      expect(InfrastructureExports).toBeDefined();

      // Check that persistence exports are available
      expect(InfrastructureExports.InMemoryEventStore).toBeDefined();
      expect(InfrastructureExports.IndexedDBEventStore).toBeDefined();

      // Verify they are the same references as direct imports
      expect(InfrastructureExports.InMemoryEventStore).toBe(InMemoryEventStore);
      expect(InfrastructureExports.IndexedDBEventStore).toBe(IndexedDBEventStore);
    });

    it('should provide consistent export structure for consuming applications', () => {
      // This test ensures consuming applications can reliably import implementations
      // Test both named and namespace imports work correctly

      const { InMemoryEventStore: NamedInMemoryStore, IndexedDBEventStore: NamedIndexedDBStore } =
        InfrastructureExports;

      expect(NamedInMemoryStore).toBeDefined();
      expect(NamedIndexedDBStore).toBeDefined();

      // Verify they can be used interchangeably (same interface)
      const inMemoryStore = new NamedInMemoryStore();
      const indexedDBStore = new NamedIndexedDBStore();

      // Both should implement the same EventStore interface
      const commonMethods = [
        'append',
        'getEvents',
        'getGameEvents',
        'getAllEvents',
        'getEventsByType',
        'getEventsByGameId',
      ];

      commonMethods.forEach(method => {
        expect(typeof inMemoryStore[method as keyof typeof inMemoryStore]).toBe('function');
        expect(typeof indexedDBStore[method as keyof typeof indexedDBStore]).toBe('function');
      });
    });
  });

  describe('Architecture Compliance', () => {
    it('should only export infrastructure layer implementations', () => {
      // Verify that the index only exports what it should (no domain/application leakage)
      const exportKeys = Object.keys(InfrastructureExports);

      // Should contain persistence implementations
      expect(exportKeys).toContain('InMemoryEventStore');
      expect(exportKeys).toContain('IndexedDBEventStore');

      // Should not leak internal implementation details
      const allowedExports = [
        'InMemoryEventStore',
        'IndexedDBEventStore',
        'EventSourcedGameRepository',
        'EventSourcedTeamLineupRepository',
        'EventSourcedInningStateRepository',
      ];

      exportKeys.forEach(exportKey => {
        expect(allowedExports).toContain(exportKey);
      });
    });

    it('should maintain hexagonal architecture boundaries', () => {
      // Ensure infrastructure exports don't violate architecture boundaries
      // Infrastructure should only provide implementations, not define interfaces

      const inMemoryStore = new InMemoryEventStore();
      const indexedDBStore = new IndexedDBEventStore();

      // Both implementations should be concrete classes (not interfaces)
      expect(inMemoryStore.constructor.name).toBe('InMemoryEventStore');
      expect(indexedDBStore.constructor.name).toBe('IndexedDBEventStore');

      // Verify they provide implementation-specific behavior
      expect(inMemoryStore).not.toBe(indexedDBStore);
      expect(inMemoryStore.constructor).not.toBe(indexedDBStore.constructor);
    });
  });
});
