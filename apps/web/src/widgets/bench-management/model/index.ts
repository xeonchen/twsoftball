/**
 * @file Bench Management Widget Model Layer Exports
 *
 * Public API exports for model layer in the bench management widget.
 * Provides hooks and business logic for widget functionality.
 */

// Export main hook
export { useBenchManagement } from './useBenchManagement';

// Export model types
export type { BenchManagementConfig, UseBenchManagementState } from './useBenchManagement';

// Export business domain types
export type { PlayerEligibility } from './types';
