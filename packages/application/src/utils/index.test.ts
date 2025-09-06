/**
 * @file index.test.ts
 * Tests for utils module exports to ensure proper module structure.
 */

import { describe, it, expect } from 'vitest';

import { UseCaseErrorHandler, UseCaseLogger } from './index';

describe('utils/index', () => {
  it('should export UseCaseErrorHandler', () => {
    expect(UseCaseErrorHandler).toBeDefined();
    expect(typeof UseCaseErrorHandler).toBe('function');
  });

  it('should export UseCaseLogger', () => {
    expect(UseCaseLogger).toBeDefined();
    expect(typeof UseCaseLogger).toBe('function');
  });

  it('should export modules without errors', () => {
    // This test ensures the module can be imported without issues
    expect(typeof UseCaseErrorHandler).toBe('function');
    expect(typeof UseCaseLogger).toBe('function');
  });
});
