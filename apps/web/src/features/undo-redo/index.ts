/**
 * @file Undo/Redo Feature Public API
 *
 * Public exports for the undo-redo feature following FSD architecture.
 *
 * @remarks
 * This feature provides undo/redo functionality for game operations:
 * - React hook for managing undo/redo state and operations
 * - Type-safe interfaces for return values
 * - Integration with GameAdapter through context
 *
 * **Usage**:
 * ```tsx
 * import { useUndoRedo } from 'features/undo-redo';
 *
 * function GameControls() {
 *   const { undo, redo, canUndo, canRedo, isLoading, isSyncing } = useUndoRedo();
 *   // ... use in UI
 * }
 * ```
 */

export { useUndoRedo } from './model/useUndoRedo';
export type { UseUndoRedoReturn } from './model/useUndoRedo';
