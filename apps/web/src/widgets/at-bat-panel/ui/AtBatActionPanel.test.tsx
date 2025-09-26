import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AtBatActionPanel } from './AtBatActionPanel';
import type { AtBatActionPanelProps, AtBatResult } from './AtBatActionPanel';

describe('AtBatActionPanel Component', () => {
  const mockOnAction = vi.fn();

  const defaultProps: AtBatActionPanelProps = {
    onResultSelect: mockOnAction,
  };

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('should render action buttons with 60px height per wireframes for primary actions', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    // Test primary actions are 60px height
    const singleButton = screen.getByRole('button', { name: /single/i });
    expect(singleButton).toBeInTheDocument();
    expect(singleButton).toHaveStyle({ minHeight: '60px' });
  });

  it('should render secondary actions with 48px height', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    // Test secondary actions are 48px height
    const outButton = screen.getByRole('button', { name: /record out/i });
    expect(outButton).toBeInTheDocument();
    expect(outButton).toHaveStyle({ minHeight: '48px' });
  });

  it('should prioritize common actions at top per wireframes', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const buttons = screen.getAllByRole('button');

    // Most common actions should be first
    expect(buttons[0]).toHaveTextContent(/single/i);
    expect(buttons[1]).toHaveTextContent(/out/i);
    expect(buttons[2]).toHaveTextContent(/walk/i);
  });

  it('should handle action selection correctly', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const singleButton = screen.getByRole('button', { name: /single/i });
    fireEvent.click(singleButton);

    expect(mockOnAction).toHaveBeenCalledWith({
      type: 'SINGLE',
      label: 'SINGLE',
      category: 'hit',
    });
  });

  it('should show all required action types', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    // Primary actions
    expect(screen.getByRole('button', { name: /single/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /walk/i })).toBeInTheDocument();

    // Secondary actions
    expect(screen.getByRole('button', { name: /double/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /triple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home run/i })).toBeInTheDocument();
  });

  it('should handle thumb zone optimization with scrollable content', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const container = screen.getByTestId('action-panel-container');
    expect(container).toHaveClass('overflow-y-auto');

    // Primary actions should be prominently displayed
    const singleButton = screen.getByRole('button', { name: /single/i });
    expect(singleButton).toHaveClass('w-full'); // Full width primary action
  });

  it('should support disabled state', () => {
    render(<AtBatActionPanel {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should support custom primary actions', () => {
    const customActions: AtBatResult[] = [
      { type: 'SINGLE', label: 'SINGLE', category: 'hit' },
      { type: 'DOUBLE', label: 'DOUBLE', category: 'hit' },
    ];

    render(<AtBatActionPanel {...defaultProps} primaryActions={customActions} />);

    // Should only show custom primary actions
    expect(screen.getByRole('button', { name: /single/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /double/i })).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const singleButton = screen.getByRole('button', { name: /single/i });

    // Test keyboard interaction
    fireEvent.keyDown(singleButton, { key: 'Enter' });
    expect(mockOnAction).toHaveBeenCalledWith({
      type: 'SINGLE',
      label: 'SINGLE',
      category: 'hit',
    });
  });

  it('should display action buttons in 2-column grid layout', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const gridContainer = screen.getByTestId('actions-grid');
    expect(gridContainer).toHaveClass('grid-cols-2');
  });

  it('should have proper accessibility attributes', () => {
    render(<AtBatActionPanel {...defaultProps} aria-label="Select at-bat result" />);

    const container = screen.getByTestId('action-panel-container');
    expect(container).toHaveAttribute('aria-label', 'Select at-bat result');
    expect(container).toHaveAttribute('role', 'group');
  });

  it('should show expanded options when enabled', () => {
    render(<AtBatActionPanel {...defaultProps} showExpandedOptions={true} />);

    // Should show additional action types
    expect(screen.getByRole('button', { name: /record error/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record fielders choice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record sacrifice fly/i })).toBeInTheDocument();
  });

  it('should handle touch targets properly for mobile', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const buttons = screen.getAllByRole('button');

    // All buttons should have minimum touch target
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(48); // Minimum 48px
    });
  });

  it('should organize actions by category and frequency', () => {
    render(<AtBatActionPanel {...defaultProps} showExpandedOptions={true} />);

    const allButtons = screen.getAllByRole('button');
    const buttonTexts = allButtons.map(btn => btn.textContent?.toLowerCase());

    // Most common actions first
    const commonActions = ['single', 'out', 'walk'];
    commonActions.forEach((action, index) => {
      expect(buttonTexts[index]).toContain(action);
    });
  });

  it('should handle rapid repeated taps efficiently', () => {
    render(<AtBatActionPanel {...defaultProps} />);

    const singleButton = screen.getByRole('button', { name: /single/i });

    // Simulate rapid tapping
    fireEvent.click(singleButton);
    fireEvent.click(singleButton);
    fireEvent.click(singleButton);

    // Should call handler for each click
    expect(mockOnAction).toHaveBeenCalledTimes(3);
  });
});
