/**
 * @file Model Layer Index for Lineup Management Feature
 * Exports hooks and state management for lineup management following FSD structure
 */

// Export lineup management hooks
export { useLineupManagement } from './useLineupManagement';

// Export hook types
export type {
  UseLineupManagementState,
  EligibilityCheck,
  EligibilityResult,
  SubstitutionData,
} from './useLineupManagement';
