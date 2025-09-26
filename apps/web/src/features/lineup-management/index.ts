/**
 * @file Lineup Management Feature Index
 * Main export point for the lineup management feature following FSD structure
 *
 * This feature provides comprehensive lineup management functionality including:
 * - Team lineup display and editing
 * - Player substitution workflows with eligibility validation
 * - Field position assignment and visualization
 * - Mobile-first responsive design with accessibility support
 */

// Export UI components (primary public interface)
export { LineupEditor, SubstitutionDialog, PositionAssignment } from './ui';

// Export UI component types
export type {
  LineupEditorProps,
  SubstitutionDialogProps,
  PositionAssignmentProps,
  PositionChangeData,
} from './ui';

// Export model layer (hooks and business logic)
export { useLineupManagement } from './model';

// Export model types
export type {
  UseLineupManagementState,
  EligibilityCheck,
  EligibilityResult,
  SubstitutionData,
} from './model';

// Export API layer
export * from './api';

// Export lib layer (utilities)
export * from './lib';
