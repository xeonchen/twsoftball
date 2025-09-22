import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PlayerCard } from './PlayerCard';
import type { PlayerCardProps } from './PlayerCard';

// Mock player data for testing
const mockPlayer = {
  id: '1',
  name: 'Sarah Johnson',
  jerseyNumber: '12',
  position: 'RF',
  battingOrder: 4,
};

describe('PlayerCard Component', () => {
  const defaultProps: PlayerCardProps = {
    player: mockPlayer,
  };

  it('should display player information with jersey number', () => {
    render(<PlayerCard {...defaultProps} />);

    expect(screen.getByText('#12 Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('RF')).toBeInTheDocument();
  });

  it('should support drag-and-drop functionality', () => {
    const onDragStart = vi.fn();
    const draggableProps: PlayerCardProps = {
      ...defaultProps,
      draggable: true,
      onDragStart,
    };

    render(<PlayerCard {...draggableProps} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('should show drag handle with 60px width for easier grabbing', () => {
    render(<PlayerCard {...defaultProps} draggable={true} />);

    const dragHandle = screen.getByTestId('drag-handle');
    expect(dragHandle).toBeInTheDocument();
    expect(dragHandle).toHaveStyle({ width: '60px' });
  });

  it('should handle touch targets for mobile (48px minimum)', () => {
    render(<PlayerCard {...defaultProps} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('min-h-12'); // 48px minimum
  });

  it('should display player stats when provided', () => {
    const playerWithStats = {
      ...mockPlayer,
      battingAverage: 0.333,
      atBats: 3,
      hits: 1,
    };

    render(<PlayerCard player={playerWithStats} showStats={true} />);

    expect(screen.getByText(/0.333/)).toBeInTheDocument();
    expect(screen.getByText(/1-3/)).toBeInTheDocument(); // hits-atBats format
  });

  it('should show player status indicators', () => {
    const activeProps: PlayerCardProps = {
      ...defaultProps,
      isActive: true,
      status: 'batting',
    };

    render(<PlayerCard {...activeProps} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('ring-2', 'ring-blue-500'); // Active styling
    expect(screen.getByText(/batting/i)).toBeInTheDocument();
  });

  it('should handle different status types', () => {
    const statuses: Array<'available' | 'batting' | 'on-base' | 'substituted'> = [
      'available',
      'batting',
      'on-base',
      'substituted',
    ];

    statuses.forEach(status => {
      const { rerender } = render(<PlayerCard {...defaultProps} status={status} />);

      expect(screen.getByText(status.replace('-', ' ').toUpperCase())).toBeInTheDocument();

      // Clean up for next iteration
      rerender(<div />);
    });
  });

  it('should support compact mode', () => {
    render(<PlayerCard {...defaultProps} compact={true} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('p-2'); // Reduced padding in compact mode
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<PlayerCard {...defaultProps} onClick={onClick} />);

    const card = screen.getByTestId('player-card');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith(mockPlayer.id);
  });

  it('should handle substitution callback', () => {
    const onSubstitute = vi.fn();
    render(<PlayerCard {...defaultProps} onSubstitute={onSubstitute} />);

    const substituteButton = screen.getByRole('button', { name: /substitute/i });
    fireEvent.click(substituteButton);

    expect(onSubstitute).toHaveBeenCalledWith(mockPlayer.id);
  });

  it('should support drag events', () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <PlayerCard
        {...defaultProps}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );

    const card = screen.getByTestId('player-card');

    fireEvent.dragStart(card);
    expect(onDragStart).toHaveBeenCalled();

    fireEvent.dragEnd(card);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    const accessibleProps: PlayerCardProps = {
      ...defaultProps,
      'aria-label': 'Player card for Sarah Johnson',
    };

    render(<PlayerCard {...accessibleProps} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveAttribute('aria-label', 'Player card for Sarah Johnson');
  });

  it('should show batting order when provided', () => {
    render(<PlayerCard {...defaultProps} showBattingOrder={true} />);

    expect(screen.getByText('4th')).toBeInTheDocument();
  });

  it('should handle keyboard navigation for drag and drop', () => {
    const onDragStart = vi.fn();
    render(<PlayerCard {...defaultProps} draggable={true} onDragStart={onDragStart} />);

    const card = screen.getByTestId('player-card');

    // Test keyboard interaction for accessibility
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    // Should handle keyboard events for drag operations
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('should show visual feedback during drag operations', () => {
    render(<PlayerCard {...defaultProps} draggable={true} isDragging={true} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('opacity-50', 'transform', 'scale-95');
  });

  it('should handle drop zone highlighting', () => {
    render(<PlayerCard {...defaultProps} isDropTarget={true} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('ring-2', 'ring-dashed', 'ring-blue-400');
  });

  it('should display position conflicts when detected', () => {
    render(<PlayerCard {...defaultProps} hasPositionConflict={true} />);

    const card = screen.getByTestId('player-card');
    expect(card).toHaveClass('ring-2', 'ring-red-500');
    expect(screen.getByText(/conflict/i)).toBeInTheDocument();
  });

  it('should handle long player names gracefully', () => {
    const playerWithLongName = {
      ...mockPlayer,
      name: 'Sarah Elizabeth Johnson-Rodriguez',
    };

    render(<PlayerCard player={playerWithLongName} />);

    // Should truncate or handle long names
    const card = screen.getByTestId('player-card');
    expect(card).toBeInTheDocument();
  });
});
