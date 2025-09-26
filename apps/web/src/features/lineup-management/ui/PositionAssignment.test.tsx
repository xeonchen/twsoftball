/**
 * @file PositionAssignment Component Tests
 *
 * Test-first implementation for PositionAssignment component that provides
 * field position visualization and management interface.
 *
 * @remarks
 * This test file drives the implementation of the PositionAssignment component following TDD.
 * The component is responsible for:
 * - Displaying visual field layout with player positions
 * - Allowing drag-and-drop position assignments
 * - Showing position conflicts and validation errors
 * - Supporting touch interactions for mobile devices
 * - Providing position-specific details and statistics
 * - Handling defensive formation management
 *
 * Architecture compliance:
 * - Uses Feature-Sliced Design patterns
 * - Follows mobile-first responsive design
 * - Integrates with lineup management state
 * - Provides proper accessibility for position management
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PositionAssignment as PositionData, FieldLayout } from '../../../shared/lib/types';

import { PositionAssignment } from './PositionAssignment';

// Mock data
const mockFieldLayout: FieldLayout = {
  pitcher: { battingSlot: 6, playerId: 'player-6', fieldPosition: FieldPosition.PITCHER },
  catcher: { battingSlot: 5, playerId: 'player-5', fieldPosition: FieldPosition.CATCHER },
  firstBase: { battingSlot: 3, playerId: 'player-3', fieldPosition: FieldPosition.FIRST_BASE },
  secondBase: { battingSlot: 2, playerId: 'player-2', fieldPosition: FieldPosition.SECOND_BASE },
  thirdBase: { battingSlot: 4, playerId: 'player-4', fieldPosition: FieldPosition.THIRD_BASE },
  shortstop: { battingSlot: 1, playerId: 'player-1', fieldPosition: FieldPosition.SHORTSTOP },
  leftField: { battingSlot: 7, playerId: 'player-7', fieldPosition: FieldPosition.LEFT_FIELD },
  centerField: { battingSlot: 8, playerId: 'player-8', fieldPosition: FieldPosition.CENTER_FIELD },
  rightField: { battingSlot: 9, playerId: 'player-9', fieldPosition: FieldPosition.RIGHT_FIELD },
  extraPlayer: {
    battingSlot: 10,
    playerId: 'player-10',
    fieldPosition: FieldPosition.EXTRA_PLAYER,
  },
};

const mockActiveLineup: PositionData[] = [
  ...Object.values(mockFieldLayout),
  // Additional players available for substitution
  { battingSlot: 11, playerId: 'player-11', fieldPosition: FieldPosition.SHORTSTOP },
  { battingSlot: 12, playerId: 'player-12', fieldPosition: FieldPosition.SECOND_BASE },
];

describe('PositionAssignment Component - TDD Implementation', () => {
  const defaultProps = {
    fieldLayout: mockFieldLayout,
    activeLineup: mockActiveLineup,
    onPositionChange: vi.fn(),
    isEditable: true,
  };

  // Mock DataTransfer for drag and drop tests
  const mockDataTransfer = {
    clearData: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    files: [],
    types: [],
    effectAllowed: 'all',
    dropEffect: 'move',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock functions
    mockDataTransfer.clearData.mockClear();
    mockDataTransfer.getData.mockClear();
    mockDataTransfer.setData.mockClear();
    mockDataTransfer.setDragImage.mockClear();
  });

  describe('Field Layout Visualization', () => {
    it('should render field diagram with all positions', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Should have main field container
      expect(screen.getByRole('region', { name: /field positions/i })).toBeInTheDocument();

      // Should show all field positions (abbreviated labels)
      expect(screen.getByText('P')).toBeInTheDocument(); // Pitcher
      expect(screen.getByText('C')).toBeInTheDocument(); // Catcher
      expect(screen.getByText('1B')).toBeInTheDocument(); // First Base
      expect(screen.getByText('2B')).toBeInTheDocument(); // Second Base
      expect(screen.getByText('3B')).toBeInTheDocument(); // Third Base
      expect(screen.getByText('SS')).toBeInTheDocument(); // Shortstop
      expect(screen.getByText('LF')).toBeInTheDocument(); // Left Field
      expect(screen.getByText('CF')).toBeInTheDocument(); // Center Field
      expect(screen.getByText('RF')).toBeInTheDocument(); // Right Field
    });

    it('should display player information at each position', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Should show player IDs (in real implementation, these would be player names)
      expect(screen.getByText('player-1')).toBeInTheDocument(); // Shortstop
      expect(screen.getByText('player-2')).toBeInTheDocument(); // Second base
      expect(screen.getByText('player-3')).toBeInTheDocument(); // First base
      expect(screen.getByText('player-6')).toBeInTheDocument(); // Pitcher
    });

    it('should show batting order numbers for each position', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Should display batting slot numbers
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('#6')).toBeInTheDocument();
    });

    it('should handle extra hitter position display', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Extra player should be displayed separately from field positions
      expect(screen.getByText('EP')).toBeInTheDocument(); // Extra Player abbreviation
      expect(screen.getByText('player-10')).toBeInTheDocument();
      expect(screen.getByText('#10')).toBeInTheDocument();
    });

    it('should display empty positions when no player assigned', () => {
      const layoutWithEmptyPosition = {
        ...mockFieldLayout,
        pitcher: { battingSlot: 0, playerId: '', fieldPosition: FieldPosition.PITCHER },
      } as FieldLayout;

      render(<PositionAssignment {...defaultProps} fieldLayout={layoutWithEmptyPosition} />);

      // Should show placeholder for empty position
      expect(screen.getByText(/no player assigned/i)).toBeInTheDocument();
    });
  });

  describe('Position Editing and Interactions', () => {
    it('should allow clicking positions when editable', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });
      expect(shortStopPosition).toBeInTheDocument();

      fireEvent.click(shortStopPosition);

      // Should trigger position selection
      expect(screen.getByRole('dialog', { name: /edit position/i })).toBeInTheDocument();
    });

    it('should not allow interactions when not editable', () => {
      render(<PositionAssignment {...defaultProps} isEditable={false} />);

      // Positions should not be clickable
      expect(screen.queryByRole('button', { name: /shortstop position/i })).not.toBeInTheDocument();

      // Should have read-only styling
      const fieldContainer = screen.getByRole('region', { name: /field positions/i });
      expect(fieldContainer).toHaveClass('field-readonly');
    });

    it('should handle position change through dialog', async () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });
      fireEvent.click(shortStopPosition);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /edit position/i })).toBeInTheDocument();
      });

      // Select new player for position
      const playerSelect = screen.getByLabelText(/select player/i);
      fireEvent.change(playerSelect, { target: { value: 'player-11' } });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(defaultProps.onPositionChange).toHaveBeenCalledWith({
        position: FieldPosition.SHORTSTOP,
        newPlayerId: 'player-11',
        newBattingSlot: expect.any(Number),
      });
    });

    it('should validate position changes', async () => {
      const onPositionChange = vi.fn().mockRejectedValue(new Error('Invalid position change'));

      render(<PositionAssignment {...defaultProps} onPositionChange={onPositionChange} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });
      fireEvent.click(shortStopPosition);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const playerSelect = screen.getByLabelText(/select player/i);
      fireEvent.change(playerSelect, { target: { value: 'invalid-player' } });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(2); // Dialog + main component
        expect(screen.getAllByText('Invalid position change')).toHaveLength(2); // Shown in both places
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should support dragging players between positions', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPlayer = screen.getByText('player-1');
      expect(shortStopPlayer).toHaveAttribute('draggable', 'true');

      // Start drag
      fireEvent.dragStart(shortStopPlayer, { dataTransfer: mockDataTransfer });

      // Should show drag preview
      expect(screen.getByText(/dragging player-1/i)).toBeInTheDocument();
    });

    it('should highlight valid drop zones during drag', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPlayer = screen.getByText('player-1');
      fireEvent.dragStart(shortStopPlayer, { dataTransfer: mockDataTransfer });

      // All position slots should become drop zones
      const positionSlots = screen.getAllByRole('button', { name: /position/i });
      positionSlots.forEach(slot => {
        expect(slot).toHaveClass('drop-zone-active');
      });
    });

    it('should handle drop operations', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPlayer = screen.getByText('player-1');
      const secondBasePosition = screen.getByRole('button', { name: /second base position/i });

      // Set up mock for the drop operation
      mockDataTransfer.getData.mockReturnValue('player-1');

      fireEvent.dragStart(shortStopPlayer, { dataTransfer: mockDataTransfer });
      fireEvent.dragOver(secondBasePosition, { dataTransfer: mockDataTransfer });
      fireEvent.drop(secondBasePosition, { dataTransfer: mockDataTransfer });

      expect(defaultProps.onPositionChange).toHaveBeenCalledWith({
        position: FieldPosition.SECOND_BASE,
        newPlayerId: 'player-1',
        previousPosition: FieldPosition.SHORTSTOP,
      });
    });

    it('should prevent invalid drops', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPlayer = screen.getByText('player-1');
      const occupiedPosition = screen.getByRole('button', { name: /second base position/i });

      // Set up mock to return empty string (invalid drag data)
      mockDataTransfer.getData.mockReturnValue('');

      fireEvent.dragStart(shortStopPlayer, { dataTransfer: mockDataTransfer });
      fireEvent.dragOver(occupiedPosition, { dataTransfer: mockDataTransfer });

      // Should show drop not allowed indicator
      expect(occupiedPosition).toHaveClass('drop-not-allowed');

      fireEvent.drop(occupiedPosition, { dataTransfer: mockDataTransfer });

      // Should not trigger position change for invalid drop
      expect(defaultProps.onPositionChange).not.toHaveBeenCalled();
    });

    it('should support touch interactions for mobile drag-and-drop', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPlayer = screen.getByText('player-1');

      // Touch start
      fireEvent.touchStart(shortStopPlayer);

      // Should show touch drag interface
      expect(screen.getByText(/touch and hold to move/i)).toBeInTheDocument();
    });
  });

  describe('Position Conflicts and Validation', () => {
    it('should highlight position conflicts', () => {
      const conflictingLayout = {
        ...mockFieldLayout,
        // Two players assigned to different positions but same batting slot
        shortstop: { battingSlot: 1, playerId: 'player-1', fieldPosition: FieldPosition.SHORTSTOP },
        secondBase: {
          battingSlot: 1,
          playerId: 'player-2',
          fieldPosition: FieldPosition.SECOND_BASE,
        },
      };

      render(<PositionAssignment {...defaultProps} fieldLayout={conflictingLayout} />);

      // Should show conflict indicators
      expect(screen.getAllByRole('img', { name: /conflict/i })).toHaveLength(2);
    });

    it('should show validation errors for lineup issues', () => {
      const incompleteLayout = {
        ...mockFieldLayout,
        pitcher: { battingSlot: 0, playerId: '', fieldPosition: FieldPosition.PITCHER },
      } as FieldLayout;

      render(<PositionAssignment {...defaultProps} fieldLayout={incompleteLayout} />);

      // Should show validation message
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/pitcher position must be filled/i)).toBeInTheDocument();
    });

    it('should validate batting order completeness', () => {
      const invalidBattingOrder = {
        ...mockFieldLayout,
        shortstop: { battingSlot: 1, playerId: 'player-1', fieldPosition: FieldPosition.SHORTSTOP },
        secondBase: {
          battingSlot: 3,
          playerId: 'player-2',
          fieldPosition: FieldPosition.SECOND_BASE,
        },
        // Missing batting slot 2
      };

      render(<PositionAssignment {...defaultProps} fieldLayout={invalidBattingOrder} />);

      expect(screen.getByText(/batting order has gaps/i)).toBeInTheDocument();
    });

    it('should show position coverage status', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Should show completion status
      expect(screen.getByText(/all positions covered/i)).toBeInTheDocument();

      // Should have success indicator
      expect(screen.getByRole('img', { name: /complete/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Mobile Support', () => {
    it('should have mobile-optimized field layout', () => {
      render(<PositionAssignment {...defaultProps} />);

      const fieldContainer = screen.getByRole('region', { name: /field positions/i });
      expect(fieldContainer).toHaveClass('field-layout-mobile');
    });

    it('should provide compact position display on small screens', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Should use abbreviated position labels
      expect(screen.getByText('SS')).toBeInTheDocument(); // Shortstop
      expect(screen.getByText('2B')).toBeInTheDocument(); // Second Base
      expect(screen.getByText('1B')).toBeInTheDocument(); // First Base
    });

    it('should support touch gestures for position interaction', () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });

      // Touch interactions should be supported
      expect(shortStopPosition).toHaveClass('touch-interactive');
    });

    it('should provide swipe navigation for field sections', async () => {
      render(<PositionAssignment {...defaultProps} />);

      const fieldContainer = screen.getByRole('region', { name: /field positions/i });

      fireEvent.touchStart(fieldContainer, {
        touches: [{ clientX: 0, clientY: 0 }],
      });
      fireEvent.touchEnd(fieldContainer, {
        changedTouches: [{ clientX: 101, clientY: 0 }],
      });

      // Should navigate to infield/outfield view
      await waitFor(() => {
        expect(screen.getByText(/infield view/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for all positions', () => {
      render(<PositionAssignment {...defaultProps} />);

      expect(screen.getByRole('region', { name: /field positions/i })).toBeInTheDocument();

      // Each position should have descriptive label
      expect(
        screen.getByRole('button', { name: /shortstop position.*player-1/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /pitcher position.*player-6/i })
      ).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<PositionAssignment {...defaultProps} />);

      const positions = screen.getAllByRole('button', { name: /position/i });

      // Should be able to tab through positions (buttons are focusable by default)
      positions.forEach(position => {
        expect(position).toBeVisible();
        expect(position).not.toBeDisabled();
      });

      // Should support basic keyboard navigation (focus first element)
      positions[0].focus();
      expect(positions[0]).toHaveFocus();
    });

    it('should announce position changes to screen readers', async () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });
      fireEvent.click(shortStopPosition);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should have live region for announcements
      expect(screen.getByRole('status', { name: /position changes/i })).toBeInTheDocument();
    });

    it('should provide alternative text for visual elements', () => {
      render(<PositionAssignment {...defaultProps} />);

      // Field diagram should have alt text
      expect(screen.getByRole('img', { name: /softball field diagram/i })).toBeInTheDocument();

      // Position indicators should have descriptions
      const positionMarkers = screen.getAllByRole('img', { name: /position marker/i });
      expect(positionMarkers.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and State Management', () => {
    it('should handle large roster updates efficiently', () => {
      const largeLineup = Array.from({ length: 25 }, (_, i) => ({
        battingSlot: (i % 10) + 1,
        playerId: `player-${i}`,
        fieldPosition: FieldPosition.SHORTSTOP,
      }));

      render(<PositionAssignment {...defaultProps} activeLineup={largeLineup} />);

      // Should render without performance issues
      expect(screen.getByRole('region', { name: /field positions/i })).toBeInTheDocument();
    });

    it('should debounce rapid position changes', async () => {
      render(<PositionAssignment {...defaultProps} />);

      const shortStopPosition = screen.getByRole('button', { name: /shortstop position/i });

      // Multiple rapid clicks
      fireEvent.click(shortStopPosition);
      fireEvent.click(shortStopPosition);
      fireEvent.click(shortStopPosition);

      await waitFor(() => {
        // Should only open one dialog
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
      });
    });

    it('should unmount cleanly without errors', () => {
      const { unmount } = render(<PositionAssignment {...defaultProps} />);

      // Should unmount without throwing errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
