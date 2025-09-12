/**
 * @file Persistence Utils Index Tests
 * Tests for the persistence utilities index exports
 */

import { describe, it, expect } from 'vitest';

describe('Persistence Utils Index', () => {
  it('should export IndexedDBTransactionManager', async () => {
    const module = await import('./index');
    expect(module.IndexedDBTransactionManager).toBeDefined();
    expect(typeof module.IndexedDBTransactionManager).toBe('function');
  });

  it('should export EventStoreErrorHandler', async () => {
    const module = await import('./index');
    expect(module.EventStoreErrorHandler).toBeDefined();
    expect(typeof module.EventStoreErrorHandler).toBe('function');
  });

  it('should export all expected utilities', async () => {
    const module = await import('./index');
    const exports = Object.keys(module);

    expect(exports).toContain('IndexedDBTransactionManager');
    expect(exports).toContain('EventStoreErrorHandler');
  });
});
