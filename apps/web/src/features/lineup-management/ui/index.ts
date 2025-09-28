/**
 * @file UI Components Index for Lineup Management Feature
 * Barrel exports for lineup management UI components following FSD structure
 */

// Export main lineup management components
export { LineupEditor } from './LineupEditor';
export { SubstitutionDialog } from './SubstitutionDialog';
export { PositionAssignment } from './PositionAssignment';

// Export component types
export type { LineupEditorProps } from './LineupEditor';
export type { SubstitutionDialogProps, SubstitutePlayerAPI } from './SubstitutionDialog';
export type { PositionAssignmentProps, PositionChangeData } from './PositionAssignment';
