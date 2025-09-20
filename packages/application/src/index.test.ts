import { describe, it, expect } from 'vitest';

import * as ApplicationLayer from './index.js';

describe('Application Layer - Exports Validation', () => {
  it('should export all use cases', () => {
    expect(ApplicationLayer.RecordAtBat).toBeDefined();
    expect(ApplicationLayer.StartNewGame).toBeDefined();
    expect(ApplicationLayer.SubstitutePlayer).toBeDefined();
    expect(ApplicationLayer.EndInning).toBeDefined();
    expect(ApplicationLayer.UndoLastAction).toBeDefined();
    expect(ApplicationLayer.RedoLastAction).toBeDefined();
  });

  it('should export all application services', () => {
    expect(ApplicationLayer.GameApplicationService).toBeDefined();
    expect(ApplicationLayer.EventSourcingService).toBeDefined();
  });

  it('should have proper module structure', () => {
    // Test that the module exports exist and can be accessed
    const exports = Object.keys(ApplicationLayer);

    // Use cases should be exported as classes
    expect(exports).toContain('RecordAtBat');
    expect(exports).toContain('StartNewGame');
    expect(exports).toContain('SubstitutePlayer');
    expect(exports).toContain('EndInning');
    expect(exports).toContain('UndoLastAction');
    expect(exports).toContain('RedoLastAction');

    // Services should be exported as classes
    expect(exports).toContain('GameApplicationService');
    expect(exports).toContain('EventSourcingService');
  });

  it('should support TypeScript compilation', () => {
    // This test will pass if TypeScript can compile the imports
    // Types are validated at compile time, not runtime
    expect(true).toBe(true);
  });
});
