/**
 * @file PositionAssignment Component
 *
 * Visual field layout component for managing player position assignments.
 * Provides interactive field diagram with drag-and-drop and touch support.
 *
 * @remarks
 * This component provides comprehensive field position management:
 * - Displaying visual field layout with all player positions
 * - Supporting drag-and-drop position assignments
 * - Showing position conflicts and validation errors
 * - Providing touch interactions for mobile devices
 * - Handling position-specific details and statistics
 * - Managing defensive formation visualization
 * - Implementing proper accessibility for position management
 *
 * Architecture:
 * - Uses Feature-Sliced Design patterns
 * - Follows mobile-first responsive design principles
 * - Integrates with lineup management state
 * - Provides comprehensive accessibility features
 * - Implements performant drag-and-drop interactions
 *
 * @example
 * ```tsx
 * <PositionAssignment
 *   fieldLayout={fieldLayout}
 *   activeLineup={activeLineup}
 *   onPositionChange={handlePositionChange}
 *   isEditable={true}
 * />
 * ```
 */

import { FieldPosition } from '@twsoftball/application';
import React, { useState, useCallback } from 'react';

import type { PositionAssignment as PositionData, FieldLayout } from '../../../shared/lib/types';

/**
 * Props for PositionAssignment component
 */
export interface PositionAssignmentProps {
  /** Current field layout with player assignments */
  fieldLayout: FieldLayout;
  /** Active lineup for reference */
  activeLineup: PositionData[];
  /** Callback for position changes */
  onPositionChange: (change: PositionChangeData) => Promise<void>;
  /** Whether positions are editable */
  isEditable: boolean;
}

/**
 * Position change data structure
 */
export interface PositionChangeData {
  /** Field position being changed */
  position: FieldPosition;
  /** New player ID for the position */
  newPlayerId: string;
  /** New batting slot if applicable */
  newBattingSlot?: number;
  /** Previous position if this is a swap */
  previousPosition?: FieldPosition;
}

/**
 * Dialog state for position editing
 */
interface PositionDialogState {
  isOpen: boolean;
  position: FieldPosition | null;
  currentAssignment: PositionData | null;
}

/**
 * Helper function to get position display name
 */
function getPositionDisplayName(position: FieldPosition): string {
  const names: Record<FieldPosition, string> = {
    [FieldPosition.PITCHER]: 'Pitcher',
    [FieldPosition.CATCHER]: 'Catcher',
    [FieldPosition.FIRST_BASE]: 'First Base',
    [FieldPosition.SECOND_BASE]: 'Second Base',
    [FieldPosition.THIRD_BASE]: 'Third Base',
    [FieldPosition.SHORTSTOP]: 'Shortstop',
    [FieldPosition.LEFT_FIELD]: 'Left Field',
    [FieldPosition.CENTER_FIELD]: 'Center Field',
    [FieldPosition.RIGHT_FIELD]: 'Right Field',
    [FieldPosition.SHORT_FIELDER]: 'Short Fielder',
    [FieldPosition.EXTRA_PLAYER]: 'Extra Player',
  };
  return names[position] || position;
}

/**
 * Helper function to get position abbreviation
 */
function getPositionAbbreviation(position: FieldPosition): string {
  const abbreviations: Record<FieldPosition, string> = {
    [FieldPosition.PITCHER]: 'P',
    [FieldPosition.CATCHER]: 'C',
    [FieldPosition.FIRST_BASE]: '1B',
    [FieldPosition.SECOND_BASE]: '2B',
    [FieldPosition.THIRD_BASE]: '3B',
    [FieldPosition.SHORTSTOP]: 'SS',
    [FieldPosition.LEFT_FIELD]: 'LF',
    [FieldPosition.CENTER_FIELD]: 'CF',
    [FieldPosition.RIGHT_FIELD]: 'RF',
    [FieldPosition.SHORT_FIELDER]: 'SF',
    [FieldPosition.EXTRA_PLAYER]: 'EP',
  };
  return abbreviations[position] || position;
}

/**
 * PositionAssignment component for field layout management
 */
export function PositionAssignment({
  fieldLayout,
  activeLineup,
  onPositionChange,
  isEditable,
}: PositionAssignmentProps): React.JSX.Element {
  // Local state
  const [dialogState, setDialogState] = useState<PositionDialogState>({
    isOpen: false,
    position: null,
    currentAssignment: null,
  });
  const [dragState, setDragState] = useState<{
    dragging: boolean;
    draggedPlayer: string | null;
  }>({
    dragging: false,
    draggedPlayer: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [touchInteraction, setTouchInteraction] = useState<boolean>(false);
  const [swipeState, setSwipeState] = useState<{
    startX: number | null;
    currentView: string | null;
  }>({
    startX: null,
    currentView: null,
  });

  /**
   * Validate field layout for conflicts and completeness
   */
  const validateLayout = useCallback(() => {
    const errors: string[] = [];
    const battingSlots = new Set<number>();
    const positions = new Set<FieldPosition>();

    Object.entries(fieldLayout).forEach(([, assignment]: [string, PositionData]) => {
      if (!assignment.playerId) {
        errors.push(`${getPositionDisplayName(assignment.fieldPosition)} position must be filled`);
        return;
      }

      // Check for duplicate batting slots
      if (battingSlots.has(assignment.battingSlot)) {
        errors.push(`Batting slot ${assignment.battingSlot} is assigned to multiple players`);
      }
      battingSlots.add(assignment.battingSlot);

      // Check for duplicate positions
      if (positions.has(assignment.fieldPosition)) {
        errors.push(
          `${getPositionDisplayName(assignment.fieldPosition)} is assigned to multiple players`
        );
      }
      positions.add(assignment.fieldPosition);
    });

    // Check for gaps in batting order
    const sortedSlots = Array.from(battingSlots).sort((a, b) => a - b);
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];
      if (currentSlot !== undefined && nextSlot !== undefined && nextSlot - currentSlot > 1) {
        errors.push('Batting order has gaps');
        break;
      }
    }

    return errors;
  }, [fieldLayout]);

  const validationErrors = validateLayout();
  const isComplete = validationErrors.length === 0;

  /**
   * Handle position click for editing
   */
  const handlePositionClick = useCallback(
    (position: FieldPosition, assignment: PositionData) => {
      if (!isEditable) return;

      setDialogState({
        isOpen: true,
        position,
        currentAssignment: assignment,
      });
    },
    [isEditable]
  );

  /**
   * Handle dialog close
   */
  const handleDialogClose = useCallback(() => {
    setDialogState({
      isOpen: false,
      position: null,
      currentAssignment: null,
    });
    setError(null);
  }, []);

  /**
   * Handle position change confirmation
   */
  const handlePositionChangeConfirm = useCallback(
    async (newPlayerId: string) => {
      if (!dialogState.position || !dialogState.currentAssignment) return;

      try {
        // Find the selected player in activeLineup to get their correct batting slot
        const selectedPlayer = activeLineup.find(player => player.playerId === newPlayerId);
        const newBattingSlot =
          selectedPlayer?.battingSlot || dialogState.currentAssignment.battingSlot;

        await onPositionChange({
          position: dialogState.position,
          newPlayerId,
          newBattingSlot,
        });
        handleDialogClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Position change failed';
        setError(errorMessage);
      }
    },
    [dialogState, activeLineup, onPositionChange, handleDialogClose]
  );

  // Future enhancement: Drag and drop handlers would be implemented here
  // Currently using click-based position editing instead

  /**
   * Handle drop on position
   */
  const handleDrop = useCallback(
    async (targetPosition: FieldPosition, event: React.DragEvent) => {
      event.preventDefault();

      if (!isEditable) return;

      const draggedPlayerId = event.dataTransfer.getData('text/plain');
      if (!draggedPlayerId) return;

      // Get the target position assignment
      const targetAssignment = (Object.values(fieldLayout) as PositionData[]).find(
        (assignment: PositionData) => assignment.fieldPosition === targetPosition
      );

      // Allow drops on occupied positions (this will be a swap)
      // Only prevent dropping a player on their own current position
      if (targetAssignment?.playerId && targetAssignment.playerId === draggedPlayerId) {
        setDragState({
          dragging: false,
          draggedPlayer: null,
        });
        return;
      }

      // Find the original position of the dragged player
      const foundEntry = Object.entries(fieldLayout).find(
        ([, assignment]: [string, PositionData]) => assignment.playerId === draggedPlayerId
      ) as [string, PositionData] | undefined;
      const originalPosition: FieldPosition | undefined = foundEntry?.[1]?.fieldPosition;

      try {
        const changeData: PositionChangeData = {
          position: targetPosition,
          newPlayerId: draggedPlayerId,
        };

        if (originalPosition !== undefined) {
          changeData.previousPosition = originalPosition;
        }

        await onPositionChange(changeData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Position change failed';
        setError(errorMessage);
      }

      setDragState({
        dragging: false,
        draggedPlayer: null,
      });
    },
    [isEditable, fieldLayout, onPositionChange]
  );

  /**
   * Handle drag over for drop zones
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (isEditable) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },
    [isEditable]
  );

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (event: React.DragEvent, playerId: string) => {
      if (!isEditable) return;

      event.dataTransfer.setData('text/plain', playerId);
      setDragState({
        dragging: true,
        draggedPlayer: playerId,
      });
    },
    [isEditable]
  );

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (_playerId: string) => {
      if (!isEditable) return;

      setTouchInteraction(true);
      // Touch instructions will be visible due to touchInteraction state
    },
    [isEditable]
  );

  /**
   * Handle field container touch start
   */
  const handleFieldTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    const startX = touch ? touch.clientX : null;
    setSwipeState(prevState => ({
      ...prevState,
      startX,
    }));
  }, []);

  /**
   * Handle field container touch end
   */
  const handleFieldTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.changedTouches[0];
      const endX = touch ? touch.clientX : undefined;

      if (swipeState.startX !== null && endX !== undefined) {
        const deltaX = endX - swipeState.startX;

        // Detect swipe (threshold: 100px)
        if (Math.abs(deltaX) > 100) {
          const newView = deltaX > 0 ? 'Infield View' : 'Outfield View';
          setSwipeState(prevState => ({
            ...prevState,
            currentView: newView,
          }));

          // Reset view after a short delay
          setTimeout(() => {
            setSwipeState(prevState => ({
              ...prevState,
              currentView: null,
            }));
          }, 2000);
        }
      }

      setSwipeState(prevState => ({
        ...prevState,
        startX: null,
      }));
    },
    [swipeState.startX]
  );

  /**
   * Render position slot
   */
  const renderPositionSlot = useCallback(
    (position: FieldPosition, assignment: PositionData, className: string = '') => {
      const isEmpty = !assignment.playerId;

      // Check for conflicts: duplicate batting slot or position
      const isConflicted =
        !isEmpty &&
        Object.values(fieldLayout).some(
          (otherAssignment: PositionData) =>
            otherAssignment !== assignment &&
            otherAssignment.playerId &&
            (otherAssignment.battingSlot === assignment.battingSlot ||
              otherAssignment.fieldPosition === assignment.fieldPosition)
        );

      const isOccupied = !isEmpty;
      const isDraggedOver = dragState.dragging && isOccupied;

      const slotClassName = [
        'position-slot',
        className,
        isEmpty && 'empty',
        isConflicted && 'conflict',
        dragState.dragging && 'drop-zone-active',
        isDraggedOver && 'drop-not-allowed',
        !isEditable && 'readonly',
      ]
        .filter(Boolean)
        .join(' ');

      const buttonClassName = [
        'position-button',
        'touch-interactive',
        dragState.dragging && 'drop-zone-active',
        isDraggedOver && 'drop-not-allowed',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div
          key={position}
          className={slotClassName}
          onDragOver={handleDragOver}
          onDrop={e => {
            void handleDrop(position, e);
          }}
        >
          {isEditable && !isEmpty ? (
            <button
              type="button"
              className={buttonClassName}
              onClick={() => handlePositionClick(position, assignment)}
              aria-label={`${getPositionDisplayName(position)} position - ${assignment.playerId}`}
            >
              <PositionContent
                assignment={assignment}
                position={position}
                onDragStart={handleDragStart}
                onTouchStart={handleTouchStart}
                hasConflict={isConflicted}
              />
            </button>
          ) : (
            <div className="position-display">
              <PositionContent assignment={assignment} position={position} />
            </div>
          )}
        </div>
      );
    },
    [
      fieldLayout,
      dragState.dragging,
      isEditable,
      handleDragOver,
      handleDrop,
      handlePositionClick,
      handleDragStart,
      handleTouchStart,
    ]
  );

  return (
    <div className={`position-assignment ${!isEditable ? 'field-readonly' : ''}`}>
      <div
        role="region"
        aria-label="Field positions"
        className={`field-layout field-layout-mobile ${!isEditable ? 'field-readonly' : ''}`}
        onTouchStart={handleFieldTouchStart}
        onTouchEnd={handleFieldTouchEnd}
      >
        {/* Field diagram */}
        <div className="field-diagram" role="img" aria-labelledby="field-description">
          <div id="field-description" className="sr-only">
            Interactive softball field diagram showing player positions. Use Tab to navigate between
            positions and Enter to edit assignments.
          </div>
          <img src="/softball-field.svg" alt="" className="field-background" aria-hidden="true" />

          {/* Infield positions */}
          <div className="infield">
            {renderPositionSlot(FieldPosition.PITCHER, fieldLayout.pitcher, 'pitcher-slot')}
            {renderPositionSlot(FieldPosition.CATCHER, fieldLayout.catcher, 'catcher-slot')}
            {renderPositionSlot(FieldPosition.FIRST_BASE, fieldLayout.firstBase, 'first-base-slot')}
            {renderPositionSlot(
              FieldPosition.SECOND_BASE,
              fieldLayout.secondBase,
              'second-base-slot'
            )}
            {renderPositionSlot(FieldPosition.THIRD_BASE, fieldLayout.thirdBase, 'third-base-slot')}
            {renderPositionSlot(FieldPosition.SHORTSTOP, fieldLayout.shortstop, 'shortstop-slot')}
          </div>

          {/* Outfield positions */}
          <div className="outfield">
            {renderPositionSlot(FieldPosition.LEFT_FIELD, fieldLayout.leftField, 'left-field-slot')}
            {renderPositionSlot(
              FieldPosition.CENTER_FIELD,
              fieldLayout.centerField,
              'center-field-slot'
            )}
            {renderPositionSlot(
              FieldPosition.RIGHT_FIELD,
              fieldLayout.rightField,
              'right-field-slot'
            )}
          </div>

          {/* Extra player */}
          {fieldLayout.extraPlayer && (
            <div className="extra-hitter-section">
              {renderPositionSlot(
                FieldPosition.EXTRA_PLAYER,
                fieldLayout.extraPlayer,
                'extra-hitter-slot'
              )}
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="field-status" role="status" aria-live="polite">
          {isComplete ? (
            <div className="status-success" aria-labelledby="status-success-text">
              <span role="img" aria-label="Complete" className="status-icon">
                ✓
              </span>
              <span id="status-success-text">All positions covered</span>
            </div>
          ) : (
            <div className="status-error" aria-labelledby="status-error-text">
              <span role="img" aria-label="Incomplete" className="status-icon">
                ⚠
              </span>
              <span id="status-error-text">
                {validationErrors.length} issue{validationErrors.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div role="alert" aria-labelledby="validation-title" className="validation-errors">
            <h3 id="validation-title" className="validation-title">
              Position Assignment Issues
            </h3>
            <ul aria-label="List of validation errors">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* General error display */}
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}

        {/* Drag feedback */}
        {dragState.dragging && (
          <div className="drag-feedback" role="status" aria-live="assertive">
            <span>
              Dragging {dragState.draggedPlayer}. Use arrow keys to move or Escape to cancel.
            </span>
          </div>
        )}

        {/* Touch instructions */}
        <div
          className={`touch-instructions ${touchInteraction ? 'visible' : ''}`}
          aria-live="polite"
        >
          Touch and hold to move
        </div>

        {/* Swipe view feedback */}
        {swipeState.currentView && (
          <div className="swipe-view-feedback" aria-live="polite">
            {swipeState.currentView}
          </div>
        )}

        {/* Live region for announcements */}
        <div role="status" aria-label="Position changes" aria-live="polite" className="sr-only">
          {/* Screen reader announcements will be inserted here */}
        </div>
      </div>

      {/* Position edit dialog */}
      {dialogState.isOpen && dialogState.position && dialogState.currentAssignment && (
        <PositionEditDialog
          isOpen={dialogState.isOpen}
          position={dialogState.position}
          currentAssignment={dialogState.currentAssignment}
          availablePlayers={activeLineup}
          onClose={handleDialogClose}
          onConfirm={handlePositionChangeConfirm}
          error={error}
        />
      )}
    </div>
  );
}

/**
 * Position content display component
 */
interface PositionContentProps {
  assignment: PositionData;
  position: FieldPosition;
  onDragStart?: (event: React.DragEvent, playerId: string) => void;
  onTouchStart?: (playerId: string) => void;
  hasConflict?: boolean;
}

function PositionContent({
  assignment,
  position,
  onDragStart,
  onTouchStart,
  hasConflict = false,
}: PositionContentProps): React.JSX.Element {
  if (!assignment.playerId) {
    return (
      <div className="empty-position">
        <div className="position-label">{getPositionAbbreviation(position)}</div>
        <div className="empty-text">No player assigned</div>
      </div>
    );
  }

  const handleDragStart = (event: React.DragEvent): void => {
    if (onDragStart) {
      onDragStart(event, assignment.playerId);
    } else {
      event.stopPropagation();
    }
  };

  const handleTouchStart = (): void => {
    if (onTouchStart) {
      onTouchStart(assignment.playerId);
    }
  };

  return (
    <div className="position-content">
      <div className="position-label">{getPositionAbbreviation(position)}</div>
      <div
        className="player-name"
        draggable={true}
        onDragStart={handleDragStart}
        onTouchStart={handleTouchStart}
      >
        {assignment.playerId}
      </div>
      <div className="batting-order">#{assignment.battingSlot}</div>
      {/* Conflict indicator */}
      <div className="position-markers">
        {hasConflict ? (
          <span
            role="img"
            aria-label="Conflict indicator"
            className="position-marker conflict-marker"
          >
            ⚠️
          </span>
        ) : (
          <span role="img" aria-label="Position marker" className="position-marker">
            📍
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Simple position edit dialog component
 */
interface PositionEditDialogProps {
  isOpen: boolean;
  position: FieldPosition;
  currentAssignment: PositionData;
  availablePlayers: PositionData[];
  onClose: () => void;
  onConfirm: (playerId: string) => Promise<void>;
  error: string | null;
}

function PositionEditDialog({
  isOpen,
  position,
  currentAssignment,
  availablePlayers,
  onClose,
  onConfirm,
  error,
}: PositionEditDialogProps): React.JSX.Element | null {
  const [selectedPlayerId, setSelectedPlayerId] = useState(currentAssignment.playerId);
  const [lastOpenState, setLastOpenState] = useState(isOpen);

  // Reset the selected player when the dialog opens (using a ref pattern to avoid cascading renders)
  if (isOpen !== lastOpenState) {
    setLastOpenState(isOpen);
    if (isOpen) {
      setSelectedPlayerId(currentAssignment.playerId);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div role="dialog" aria-labelledby="edit-dialog-title" className="edit-dialog">
        <div className="dialog-header">
          <h3 id="edit-dialog-title">Edit Position</h3>
          <button type="button" onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="dialog-content">
          <p>Editing {getPositionDisplayName(position)} position</p>

          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}

          <div className="form-section">
            <label htmlFor="player-select" className="form-label">
              Select Player
            </label>
            <select
              id="player-select"
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
              className="player-select"
            >
              <option value="">No player</option>
              {availablePlayers.map(player => (
                <option key={player.playerId} value={player.playerId}>
                  {player.playerId} (#{player.battingSlot})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dialog-footer">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm(selectedPlayerId);
            }}
            className="confirm-button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Basic styles (in a real implementation, these would be more comprehensive)
const styles = `
.position-assignment {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.field-layout-mobile {
  position: relative;
  padding: 1rem;
}

.field-readonly {
  opacity: 0.8;
  pointer-events: none;
}

.field-diagram {
  position: relative;
  width: 100%;
  height: 400px;
  background: #4ade80;
  border-radius: 8px;
  overflow: hidden;
}

.field-background {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.infield, .outfield, .extra-hitter-section {
  position: absolute;
  width: 100%;
  height: 100%;
}

.position-slot {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.position-slot.empty {
  border-style: dashed;
  opacity: 0.6;
}

.position-slot.conflict {
  border-color: #dc2626;
  background: #fef2f2;
}

.position-slot.drop-zone-active {
  border-color: #3b82f6;
  background: #dbeafe;
}

.position-slot.drop-not-allowed {
  border-color: #dc2626;
  background: #fef2f2;
}

.position-button, .position-display {
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

.position-button.touch-interactive {
  min-height: 44px;
  min-width: 44px;
}

.position-content, .empty-position {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.position-label {
  font-size: 0.625rem;
  color: #6b7280;
  margin-bottom: 0.125rem;
}

.player-name {
  font-size: 0.75rem;
  color: #111827;
  margin-bottom: 0.125rem;
}

.batting-order {
  font-size: 0.625rem;
  color: #059669;
  font-weight: 700;
}

.empty-text {
  font-size: 0.625rem;
  color: #9ca3af;
  font-style: italic;
}

.position-markers {
  position: absolute;
  top: -4px;
  right: -4px;
}

.position-marker {
  font-size: 1rem;
}

/* Position-specific positioning */
.pitcher-slot { top: 45%; left: 45%; }
.catcher-slot { top: 80%; left: 45%; }
.first-base-slot { top: 60%; left: 65%; }
.second-base-slot { top: 40%; left: 60%; }
.third-base-slot { top: 60%; left: 25%; }
.shortstop-slot { top: 40%; left: 30%; }
.left-field-slot { top: 20%; left: 15%; }
.center-field-slot { top: 10%; left: 45%; }
.right-field-slot { top: 20%; left: 75%; }
.extra-hitter-slot { top: 85%; right: 1rem; }

.field-status {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.status-success {
  color: #059669;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-error {
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.validation-errors {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.validation-errors ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #dc2626;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
}

.drag-feedback {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  z-index: 1000;
}

.touch-instructions {
  position: absolute;
  top: -1000px;
  left: -1000px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.touch-instructions.visible {
  position: relative;
  top: auto;
  left: auto;
  opacity: 1;
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.swipe-view-feedback {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem 2rem;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Dialog styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-content {
  padding: 1rem;
}

.dialog-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-section {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.player-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.cancel-button, .confirm-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.cancel-button {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.confirm-button {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .position-slot {
    width: 60px;
    height: 60px;
  }

  .position-content, .empty-position {
    font-size: 0.625rem;
  }

  .player-name {
    font-size: 0.625rem;
  }

  .batting-order {
    font-size: 0.5rem;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('position-assignment-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'position-assignment-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
