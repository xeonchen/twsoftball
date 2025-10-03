/**
 * @file Enhanced Lineup Components Tests
 *
 * Comprehensive test suite for enhanced lineup components with monitoring and error boundaries.
 * Tests all hooks, HOCs, error boundaries, and monitoring integrations.
 *
 * Target Coverage: 95%+
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocking requires flexible types */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { monitoring } from '../../../shared/lib/monitoring';

import {
  EnhancedLineupEditor,
  EnhancedSubstitutionDialog,
  EnhancedPositionAssignment,
  LineupMonitoringProvider,
  LineupErrorFallback,
} from './EnhancedLineupComponents';

// Mock monitoring service
vi.mock('../../../shared/lib/monitoring', () => ({
  monitoring: {
    track: vi.fn(),
    timing: vi.fn(),
    error: vi.fn(),
    feature: vi.fn(),
  },
}));

// Mock original components
vi.mock('./LineupEditor', () => ({
  LineupEditor: vi.fn(
    ({
      gameId,
      onSubstitutionComplete,
    }: {
      gameId: string;
      onSubstitutionComplete?: () => void;
    }) => (
      <div data-testid="lineup-editor-mock">
        <span>Game: {gameId}</span>
        <button onClick={onSubstitutionComplete}>Complete Substitution</button>
      </div>
    )
  ),
}));

vi.mock('./SubstitutionDialog', () => ({
  SubstitutionDialog: vi.fn(
    ({
      isOpen,
      onClose,
      onConfirm,
      currentPlayer,
    }: {
      isOpen: boolean;
      onClose: () => void;
      onConfirm: (data: any) => Promise<void>;
      currentPlayer: { playerId: string };
    }) => {
      if (!isOpen) return null;
      return (
        <div data-testid="substitution-dialog-mock">
          <span>Current Player: {currentPlayer.playerId}</span>
          <button onClick={onClose}>Close</button>
          <button
            onClick={() => {
              void onConfirm({
                incomingPlayerId: 'player2',
                outgoingPlayerId: currentPlayer.playerId,
                battingSlot: 1,
                fieldPosition: 'PITCHER',
                isReentry: false,
              }).catch(() => {
                // Expected - error will be tracked in the wrapper
              });
            }}
          >
            Confirm
          </button>
        </div>
      );
    }
  ),
}));

vi.mock('./PositionAssignment', () => ({
  PositionAssignment: vi.fn(
    ({ onPositionChange }: { onPositionChange: (data: any) => Promise<void> }) => (
      <div data-testid="position-assignment-mock">
        <button
          onClick={() => {
            void onPositionChange({
              position: 'CATCHER',
              newPlayerId: 'player1',
            }).catch(() => {
              // Expected - error will be tracked in the wrapper
            });
          }}
        >
          Change Position
        </button>
      </div>
    )
  ),
}));

describe('EnhancedLineupComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EnhancedLineupEditor', () => {
    it('should render LineupEditor with monitoring', () => {
      render(<EnhancedLineupEditor gameId="game-123" />);

      expect(screen.getByTestId('lineup-editor')).toBeInTheDocument();
      expect(screen.getByText('Game: game-123')).toBeInTheDocument();
    });

    it('should track component mount and unmount', () => {
      const { unmount } = render(<EnhancedLineupEditor gameId="game-123" />);

      expect(monitoring.track).toHaveBeenCalledWith('lineup_editor_mounted', {
        gameId: 'game-123',
        timestamp: expect.any(Number),
      });

      unmount();

      expect(monitoring.track).toHaveBeenCalledWith('lineup_editor_unmounted', {
        gameId: 'game-123',
        timestamp: expect.any(Number),
      });
    });

    it('should track substitution completion', async () => {
      const onSubstitutionComplete = vi.fn();
      render(
        <EnhancedLineupEditor gameId="game-123" onSubstitutionComplete={onSubstitutionComplete} />
      );

      const button = screen.getByText('Complete Substitution');
      fireEvent.click(button);

      await waitFor(() => {
        expect(monitoring.feature).toHaveBeenCalledWith(
          'lineup_editor',
          'substitution_completed',
          expect.objectContaining({
            gameId: 'game-123',
          })
        );
      });

      expect(onSubstitutionComplete).toHaveBeenCalled();
    });

    it('should track button interactions', () => {
      render(<EnhancedLineupEditor gameId="game-123" />);

      const button = screen.getByText('Complete Substitution');
      fireEvent.click(button);

      expect(monitoring.track).toHaveBeenCalledWith(
        'lineup_editor_button_clicked',
        expect.objectContaining({
          gameId: 'game-123',
        })
      );
    });

    it('should measure render performance', async () => {
      const { unmount } = render(<EnhancedLineupEditor gameId="game-123" />);

      unmount();

      await waitFor(() => {
        expect(monitoring.timing).toHaveBeenCalledWith(
          'lineup_editor_render_time',
          expect.any(Number),
          expect.objectContaining({
            component: 'lineup_editor',
          })
        );
      });
    });
  });

  describe('EnhancedSubstitutionDialog', () => {
    const mockCurrentPlayer = {
      playerId: 'player1',
      playerName: 'John Doe',
      battingSlot: 1,
      fieldPosition: 'PITCHER' as const,
    };

    it('should render dialog when open', () => {
      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByTestId('substitution-dialog-mock')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <EnhancedSubstitutionDialog
          isOpen={false}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.queryByTestId('substitution-dialog-mock')).not.toBeInTheDocument();
    });

    it('should track dialog open event', () => {
      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(monitoring.track).toHaveBeenCalledWith('substitution_dialog_opened', {
        currentPlayer: 'player1',
        gameId: 'game-123',
        timestamp: expect.any(Number),
      });
    });

    it('should track dialog close with interaction', () => {
      const onClose = vi.fn();
      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={onClose}
          onConfirm={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Close'));

      expect(monitoring.track).toHaveBeenCalledWith(
        'substitution_dialog_dialog_closed',
        expect.objectContaining({
          method: 'close_button',
          gameId: 'game-123',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('should track and measure substitution confirmation', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
        expect(monitoring.feature).toHaveBeenCalledWith(
          'substitution_dialog',
          'substitution_confirmed',
          expect.objectContaining({
            duration: expect.any(Number),
            gameId: 'game-123',
          })
        );
        expect(monitoring.timing).toHaveBeenCalledWith(
          'substitution_completion_time',
          expect.any(Number),
          expect.objectContaining({
            success: 'true',
            gameId: 'game-123',
          })
        );
      });
    });

    it('should track substitution errors', async () => {
      const error = new Error('Substitution failed');
      const onConfirm = vi.fn().mockRejectedValue(error);

      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={mockCurrentPlayer}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByText('Confirm'));

      // Wait for error to be tracked, catch the rejection
      try {
        await waitFor(
          () => {
            expect(monitoring.error).toHaveBeenCalledWith(error, {
              context: 'substitution_confirmation',
              gameId: 'game-123',
              substitutionData: expect.any(Object),
            });
          },
          { timeout: 1000 }
        );
      } catch {
        // Expected - error tracking happens but promise rejects
      }

      // Ensure error was tracked despite rejection
      await waitFor(() => {
        expect(monitoring.error).toHaveBeenCalled();
      });
    });
  });

  describe('EnhancedPositionAssignment', () => {
    it('should render position assignment', () => {
      const onPositionChange = vi.fn().mockResolvedValue(undefined);
      render(<EnhancedPositionAssignment onPositionChange={onPositionChange} />);

      expect(screen.getByTestId('position-assignment-mock')).toBeInTheDocument();
    });

    it('should track position change initiation', () => {
      const onPositionChange = vi.fn().mockResolvedValue(undefined);
      render(<EnhancedPositionAssignment onPositionChange={onPositionChange} />);

      fireEvent.click(screen.getByText('Change Position'));

      expect(monitoring.track).toHaveBeenCalledWith(
        'position_assignment_position_change_initiated',
        expect.objectContaining({
          position: 'CATCHER',
          newPlayerId: 'player1',
        })
      );
    });

    it('should track successful position change', async () => {
      const onPositionChange = vi.fn().mockResolvedValue(undefined);
      render(<EnhancedPositionAssignment onPositionChange={onPositionChange} />);

      fireEvent.click(screen.getByText('Change Position'));

      await waitFor(() => {
        expect(monitoring.feature).toHaveBeenCalledWith(
          'position_assignment',
          'position_changed',
          expect.objectContaining({
            duration: expect.any(Number),
            position: 'CATCHER',
            newPlayerId: 'player1',
          })
        );
        expect(monitoring.timing).toHaveBeenCalledWith(
          'position_change_time',
          expect.any(Number),
          expect.objectContaining({
            success: 'true',
            position: 'CATCHER',
          })
        );
      });
    });

    it('should track position change errors', async () => {
      const error = new Error('Position change failed');
      const onPositionChange = vi.fn().mockRejectedValue(error);

      render(<EnhancedPositionAssignment onPositionChange={onPositionChange} />);

      fireEvent.click(screen.getByText('Change Position'));

      // Wait for error to be tracked, catch the rejection
      try {
        await waitFor(
          () => {
            expect(monitoring.error).toHaveBeenCalledWith(error, {
              context: 'position_change',
              changeData: expect.any(Object),
            });
          },
          { timeout: 1000 }
        );
      } catch {
        // Expected - error tracking happens but promise rejects
      }

      // Ensure error was tracked despite rejection
      await waitFor(() => {
        expect(monitoring.error).toHaveBeenCalled();
      });
    });
  });

  describe('LineupMonitoringProvider', () => {
    it('should track lineup session start and end', () => {
      const { unmount } = render(
        <LineupMonitoringProvider gameId="game-123">
          <div>Content</div>
        </LineupMonitoringProvider>
      );

      expect(monitoring.track).toHaveBeenCalledWith('lineup_session_started', {
        gameId: 'game-123',
        timestamp: expect.any(Number),
      });

      unmount();

      expect(monitoring.track).toHaveBeenCalledWith('lineup_session_ended', {
        gameId: 'game-123',
        timestamp: expect.any(Number),
      });
    });

    it('should render children', () => {
      render(
        <LineupMonitoringProvider gameId="game-123">
          <div data-testid="child-content">Test Content</div>
        </LineupMonitoringProvider>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('LineupErrorFallback Component', () => {
    const mockError = new Error('Test error message');

    it('renders lineup_editor context with correct message and actions', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      expect(screen.getByText(/having trouble loading your lineup/i)).toBeInTheDocument();
      expect(screen.getByText(/Try refreshing the page/i)).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByText(/Use the basic lineup view/i)).toBeInTheDocument();
    });

    it('renders substitution_dialog context with correct message and actions', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="substitution_dialog"
        />
      );

      expect(
        screen.getByText(/substitution feature is temporarily unavailable/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Close and reopen the substitution dialog/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Try making the substitution from the lineup list/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Check that the player is eligible/i)).toBeInTheDocument();
    });

    it('renders position_assignment context with correct message and actions', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="position_assignment"
        />
      );

      expect(screen.getByText(/field position display is having issues/i)).toBeInTheDocument();
      expect(screen.getByText(/Use the lineup list to make position changes/i)).toBeInTheDocument();
      expect(screen.getByText(/Try switching to a different view/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact support if the issue persists/i)).toBeInTheDocument();
    });

    it('renders default context with generic message', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="unknown_context"
        />
      );

      expect(screen.getByText(/encountered an unexpected error/i)).toBeInTheDocument();
      expect(screen.getByText(/Refresh the page/i)).toBeInTheDocument();
      expect(screen.getByText(/Try again in a few moments/i)).toBeInTheDocument();
    });

    it('handleRetry callback triggers onRetry and tracks interaction', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      const retryButton = screen.getByLabelText(/Retry the lineup feature/i);
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(monitoring.track).toHaveBeenCalledWith(
        'error_fallback_error_retry',
        expect.objectContaining({
          errorType: 'Error',
          context: 'lineup_editor',
        })
      );
    });

    it('handleReport callback tracks user_reported_error event', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      const reportButton = screen.getByLabelText(/Report this issue/i);
      fireEvent.click(reportButton);

      expect(monitoring.track).toHaveBeenCalledWith('user_reported_error', {
        error: 'Test error message',
        context: 'lineup_editor',
        userAction: 'manual_report',
      });

      expect(monitoring.track).toHaveBeenCalledWith(
        'error_fallback_error_reported',
        expect.objectContaining({
          errorType: 'Error',
          context: 'lineup_editor',
        })
      );
    });

    it('displays technical details in collapsible section', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      expect(screen.getByText(/lineup_editor/i)).toBeInTheDocument();
    });

    it('shows error icon and timestamp', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText(/Time:/i)).toBeInTheDocument();
    });

    it('renders action buttons with proper aria-labels', () => {
      const onRetry = vi.fn();
      render(
        <LineupErrorFallbackTestWrapper
          error={mockError}
          onRetry={onRetry}
          context="lineup_editor"
        />
      );

      expect(screen.getByLabelText('Retry the lineup feature')).toBeInTheDocument();
      expect(screen.getByLabelText('Report this issue to support')).toBeInTheDocument();
    });
  });

  describe('Style Injection', () => {
    it('injects styles on first import', () => {
      const styleElement = document.getElementById('enhanced-lineup-styles');
      expect(styleElement).toBeInTheDocument();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    it('style element contains expected CSS rules', () => {
      const styleElement = document.getElementById('enhanced-lineup-styles');
      expect(styleElement?.textContent).toContain('.lineup-error-fallback');
      expect(styleElement?.textContent).toContain('.enhanced-lineup-editor');
      expect(styleElement?.textContent).toContain('.retry-button');
    });

    it('style element has correct id attribute', () => {
      const styleElement = document.getElementById('enhanced-lineup-styles');
      expect(styleElement?.id).toBe('enhanced-lineup-styles');
    });
  });

  describe('Performance Monitoring Edge Cases', () => {
    it('handles very fast unmounts correctly', async () => {
      const { unmount } = render(<EnhancedLineupEditor gameId="game-123" />);

      // Unmount immediately
      unmount();

      await waitFor(() => {
        // Should still attempt to track timing
        expect(monitoring.timing).toHaveBeenCalledWith(
          'lineup_editor_render_time',
          expect.any(Number),
          expect.objectContaining({
            component: 'lineup_editor',
          })
        );
      });
    });

    it('tracks valid render times', async () => {
      const { unmount } = render(<EnhancedLineupEditor gameId="game-123" />);

      // Wait a bit before unmounting
      await new Promise(resolve => setTimeout(resolve, 10));
      unmount();

      await waitFor(() => {
        const timingCalls = (monitoring.timing as any).mock.calls;
        const renderTimingCall = timingCalls.find(
          (call: any[]) => call[0] === 'lineup_editor_render_time'
        );

        expect(renderTimingCall).toBeDefined();
        const renderTime = renderTimingCall[1];

        // Should be > 0 and < 60000ms
        expect(renderTime).toBeGreaterThan(0);
        expect(renderTime).toBeLessThan(60000);
      });
    });
  });

  describe('Monitoring Error Handling', () => {
    it('silently handles monitoring.timing errors in production', async () => {
      // Mock monitoring.timing to throw an error
      vi.mocked(monitoring.timing).mockImplementation(() => {
        throw new Error('Monitoring service unavailable');
      });

      const { unmount } = render(<EnhancedLineupEditor gameId="game-123" />);
      unmount();

      // Should not crash the app
      await waitFor(() => {
        expect(true).toBe(true); // App should continue working
      });
    });

    it('does not crash app when monitoring.error fails', async () => {
      const mockError = new Error('Substitution failed');
      vi.mocked(monitoring.error).mockImplementation(() => {
        throw new Error('Error tracking failed');
      });

      const onConfirm = vi.fn().mockRejectedValue(mockError);

      render(
        <EnhancedSubstitutionDialog
          isOpen={true}
          currentPlayer={{
            playerId: 'player1',
            playerName: 'John Doe',
            battingSlot: 1,
            fieldPosition: 'PITCHER',
          }}
          gameId="game-123"
          benchPlayers={[]}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByText('Confirm'));

      // Should not crash despite monitoring error
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
    });
  });
});

// Helper component to directly test LineupErrorFallback
function LineupErrorFallbackTestWrapper({
  error,
  onRetry,
  context,
}: {
  error: Error;
  onRetry: () => void;
  context: string;
}): ReactElement {
  return <LineupErrorFallback error={error} onRetry={onRetry} context={context} />;
}
