import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GameHeader } from './GameHeader';
import type { GameHeaderProps } from './GameHeader';

describe('GameHeader Component', () => {
  const defaultProps: GameHeaderProps = {
    homeTeam: 'Warriors',
    awayTeam: 'Eagles',
    homeScore: 7,
    awayScore: 4,
  };

  it('should display score prominently per wireframes', () => {
    render(<GameHeader {...defaultProps} />);

    // Check that scores are displayed with team names
    expect(screen.getByText(/Warriors/)).toBeInTheDocument();
    expect(screen.getByText(/Eagles/)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should show HOME and AWAY labels correctly', () => {
    render(<GameHeader {...defaultProps} />);

    // Should show HOME and AWAY indicators
    expect(screen.getByText(/home/i)).toBeInTheDocument();
    expect(screen.getByText(/away/i)).toBeInTheDocument();
  });

  it('should display game status and inning information when provided', () => {
    const propsWithInning: GameHeaderProps = {
      ...defaultProps,
      inning: 3,
      isTopHalf: true,
      outs: 2,
    };

    render(<GameHeader {...propsWithInning} />);

    expect(screen.getByText(/top 3rd/i)).toBeInTheDocument();
    expect(screen.getByText(/2 outs/i)).toBeInTheDocument();
  });

  it('should handle bottom half inning display', () => {
    const propsWithBottomInning: GameHeaderProps = {
      ...defaultProps,
      inning: 5,
      isTopHalf: false,
      outs: 1,
    };

    render(<GameHeader {...propsWithBottomInning} />);

    expect(screen.getByText(/bottom 5th/i)).toBeInTheDocument();
    expect(screen.getByText(/1 out/i)).toBeInTheDocument();
  });

  it('should include back button when enabled', () => {
    const onBackClick = vi.fn();
    const propsWithBack: GameHeaderProps = {
      ...defaultProps,
      showBackButton: true,
      onBackClick,
    };

    render(<GameHeader {...propsWithBack} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });

  it('should include settings button when callback provided', () => {
    const onSettingsClick = vi.fn();
    const propsWithSettings: GameHeaderProps = {
      ...defaultProps,
      onSettingsClick,
    };

    render(<GameHeader {...propsWithSettings} />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();

    fireEvent.click(settingsButton);
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('should include undo/redo buttons per specifications', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const propsWithUndoRedo: GameHeaderProps = {
      ...defaultProps,
      onUndo,
      onRedo,
      canUndo: true,
      canRedo: false,
    };

    render(<GameHeader {...propsWithUndoRedo} />);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });

    expect(undoButton).toBeInTheDocument();
    expect(redoButton).toBeInTheDocument();

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('should use large, bold typography for scores', () => {
    render(<GameHeader {...defaultProps} />);

    const scoreElements = screen.getAllByText(/[0-9]+/);
    scoreElements.forEach(element => {
      expect(element).toHaveClass('text-2xl', 'font-bold');
    });
  });

  it('should have proper accessibility attributes', () => {
    const accessibleProps: GameHeaderProps = {
      ...defaultProps,
      'aria-label': 'Game header: Warriors 7, Eagles 4',
    };

    render(<GameHeader {...accessibleProps} />);

    const header = screen.getByTestId('game-header');
    expect(header).toHaveAttribute('aria-label', 'Game header: Warriors 7, Eagles 4');
    expect(header).toHaveAttribute('role', 'banner');
  });

  it('should handle compact mode for mobile layouts', () => {
    render(<GameHeader {...defaultProps} compact={true} />);

    const header = screen.getByTestId('game-header');
    expect(header).toHaveClass('h-16'); // Compact height
  });

  it('should show live game indicator when game is active', () => {
    const liveProps: GameHeaderProps = {
      ...defaultProps,
      isLive: true,
    };

    render(<GameHeader {...liveProps} />);

    expect(screen.getByText(/live/i)).toBeInTheDocument();
    expect(screen.getByTestId('live-indicator')).toHaveClass('bg-red-500');
  });

  it('should format ordinal numbers correctly', () => {
    const inningProps: GameHeaderProps = {
      ...defaultProps,
      inning: 1,
      isTopHalf: true,
    };

    const { rerender } = render(<GameHeader {...inningProps} />);
    expect(screen.getByText(/1st/i)).toBeInTheDocument();

    rerender(<GameHeader {...inningProps} inning={2} />);
    expect(screen.getByText(/2nd/i)).toBeInTheDocument();

    rerender(<GameHeader {...inningProps} inning={3} />);
    expect(screen.getByText(/3rd/i)).toBeInTheDocument();

    rerender(<GameHeader {...inningProps} inning={4} />);
    expect(screen.getByText(/4th/i)).toBeInTheDocument();
  });

  it('should handle singular vs plural outs correctly', () => {
    const oneOutProps: GameHeaderProps = {
      ...defaultProps,
      outs: 1,
    };

    const { rerender } = render(<GameHeader {...oneOutProps} />);
    expect(screen.getByText(/1 out/i)).toBeInTheDocument();

    rerender(<GameHeader {...oneOutProps} outs={2} />);
    expect(screen.getByText(/2 outs/i)).toBeInTheDocument();
  });

  it('should have fixed position styling for always visible header', () => {
    render(<GameHeader {...defaultProps} />);

    const header = screen.getByTestId('game-header');
    expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-10');
  });

  it('should animate score changes with pulse effect', () => {
    const { rerender } = render(<GameHeader {...defaultProps} />);

    // Change score to trigger animation
    rerender(<GameHeader {...defaultProps} homeScore={8} />);

    const scoreElement = screen.getByText('8');
    expect(scoreElement).toHaveClass('animate-pulse');
  });
});
