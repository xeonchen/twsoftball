import { renderHook, act } from '@testing-library/react';

import { useUIStore } from './uiStore';

/**
 * UI State Store Tests
 *
 * Tests for managing modal states, loading states, and other UI-specific
 * state that doesn't belong in the game store. Follows TDD approach.
 */

describe('UI State Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.modals.navigationWarning).toBe(false);
      expect(result.current.modals.runnerAdjustment).toBe(false);
      expect(result.current.modals.substitution).toBe(false);
      expect(result.current.modals.gameRecovery).toBe(false);

      expect(result.current.loading.setupWizard).toBe(false);
      expect(result.current.loading.gameSave).toBe(false);

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('Modal State Management', () => {
    it('should manage navigation warning modal', () => {
      const { result } = renderHook(() => useUIStore());

      // Show modal
      act(() => {
        result.current.showNavigationWarning();
      });

      expect(result.current.modals.navigationWarning).toBe(true);

      // Hide modal
      act(() => {
        result.current.hideNavigationWarning();
      });

      expect(result.current.modals.navigationWarning).toBe(false);
    });

    it('should manage runner adjustment modal', () => {
      const { result } = renderHook(() => useUIStore());

      const runnerData = {
        playType: 'SINGLE' as const,
        batter: { id: '1', name: 'John Doe', jerseyNumber: '12', position: 'SS', battingOrder: 1 },
        runners: [
          {
            player: {
              id: '2',
              name: 'Jane Smith',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            },
            fromBase: 'first' as const,
            advancement: 'second' as const,
          },
        ],
      };

      // Show modal
      act(() => {
        result.current.showRunnerAdjustment(runnerData);
      });

      expect(result.current.modals.runnerAdjustment).toBe(true);
      expect(result.current.modalData.runnerAdjustment).toEqual(runnerData);

      // Hide modal
      act(() => {
        result.current.hideRunnerAdjustment();
      });

      expect(result.current.modals.runnerAdjustment).toBe(false);
      expect(result.current.modalData.runnerAdjustment).toBeNull();
    });

    it('should manage substitution modal', () => {
      const { result } = renderHook(() => useUIStore());

      const substitutionData = {
        playerOut: {
          id: '1',
          name: 'John Doe',
          jerseyNumber: '12',
          position: 'SS',
          battingOrder: 1,
        },
        availablePlayers: [
          { id: '2', name: 'Jane Smith', jerseyNumber: '8', position: 'CF', battingOrder: 0 },
        ],
      };

      // Show modal
      act(() => {
        result.current.showSubstitution(substitutionData);
      });

      expect(result.current.modals.substitution).toBe(true);
      expect(result.current.modalData.substitution).toEqual(substitutionData);

      // Hide modal
      act(() => {
        result.current.hideSubstitution();
      });

      expect(result.current.modals.substitution).toBe(false);
      expect(result.current.modalData.substitution).toBeNull();
    });

    it('should manage game recovery modal', () => {
      const { result } = renderHook(() => useUIStore());

      const recoveryData = {
        gameId: 'game-123',
        timestamp: '2025-03-15T10:30:00Z',
        gameInfo: { homeTeam: 'Warriors', awayTeam: 'Eagles', score: '7-4' },
      };

      // Show modal
      act(() => {
        result.current.showGameRecovery(recoveryData);
      });

      expect(result.current.modals.gameRecovery).toBe(true);
      expect(result.current.modalData.gameRecovery).toEqual(recoveryData);

      // Hide modal
      act(() => {
        result.current.hideGameRecovery();
      });

      expect(result.current.modals.gameRecovery).toBe(false);
      expect(result.current.modalData.gameRecovery).toBeNull();
    });

    it('should close all modals at once', () => {
      const { result } = renderHook(() => useUIStore());

      // Show multiple modals
      act(() => {
        result.current.showNavigationWarning();
        result.current.showSubstitution({
          playerOut: { id: '1', name: 'John', jerseyNumber: '1', position: 'P', battingOrder: 1 },
          availablePlayers: [],
        });
      });

      expect(result.current.modals.navigationWarning).toBe(true);
      expect(result.current.modals.substitution).toBe(true);

      // Close all modals
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modals.navigationWarning).toBe(false);
      expect(result.current.modals.substitution).toBe(false);
      expect(result.current.modalData.substitution).toBeNull();
    });
  });

  describe('Loading State Management', () => {
    it('should handle setup wizard loading', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSetupLoading(true);
      });

      expect(result.current.loading.setupWizard).toBe(true);

      act(() => {
        result.current.setSetupLoading(false);
      });

      expect(result.current.loading.setupWizard).toBe(false);
    });

    it('should handle game save loading', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGameSaveLoading(true);
      });

      expect(result.current.loading.gameSave).toBe(true);

      act(() => {
        result.current.setGameSaveLoading(false);
      });

      expect(result.current.loading.gameSave).toBe(false);
    });

    it('should check if any loading is active', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.isAnyLoading()).toBe(false);

      act(() => {
        result.current.setSetupLoading(true);
      });

      expect(result.current.isAnyLoading()).toBe(true);

      act(() => {
        result.current.setSetupLoading(false);
        result.current.setGameSaveLoading(true);
      });

      expect(result.current.isAnyLoading()).toBe(true);

      act(() => {
        result.current.setGameSaveLoading(false);
      });

      expect(result.current.isAnyLoading()).toBe(false);
    });
  });

  describe('Notification Management', () => {
    it('should add and manage notifications', () => {
      const { result } = renderHook(() => useUIStore());

      const notification1 = {
        id: '1',
        type: 'success' as const,
        title: 'Success!',
        message: 'Game saved successfully',
        duration: 3000,
      };

      const notification2 = {
        id: '2',
        type: 'error' as const,
        title: 'Error',
        message: 'Failed to save game',
        duration: 5000,
      };

      // Add notifications
      act(() => {
        result.current.addNotification(notification1);
        result.current.addNotification(notification2);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0]).toEqual(notification1);
      expect(result.current.notifications[1]).toEqual(notification2);

      // Remove notification
      act(() => {
        result.current.removeNotification('1');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('2');

      // Clear all notifications
      act(() => {
        result.current.clearAllNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should have helper methods for common notification types', () => {
      const { result } = renderHook(() => useUIStore());

      // Success notification
      act(() => {
        result.current.showSuccess('Operation successful');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].message).toBe('Operation successful');

      // Error notification
      act(() => {
        result.current.showError('Operation failed');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[1].type).toBe('error');
      expect(result.current.notifications[1].message).toBe('Operation failed');

      // Warning notification
      act(() => {
        result.current.showWarning('Be careful');
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[2].type).toBe('warning');
      expect(result.current.notifications[2].message).toBe('Be careful');

      // Info notification
      act(() => {
        result.current.showInfo('FYI');
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.notifications[3].type).toBe('info');
      expect(result.current.notifications[3].message).toBe('FYI');
    });
  });

  describe('Store Reset', () => {
    it('should reset all UI state to initial values', () => {
      const { result } = renderHook(() => useUIStore());

      // Populate state
      act(() => {
        result.current.showNavigationWarning();
        result.current.setSetupLoading(true);
        result.current.showSuccess('Test message');
      });

      // Verify state is populated
      expect(result.current.modals.navigationWarning).toBe(true);
      expect(result.current.loading.setupWizard).toBe(true);
      expect(result.current.notifications).toHaveLength(1);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset to initial state
      expect(result.current.modals.navigationWarning).toBe(false);
      expect(result.current.loading.setupWizard).toBe(false);
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('State Integration', () => {
    it('should handle complex UI flows', () => {
      const { result } = renderHook(() => useUIStore());

      // Simulate game setup wizard with loading states
      act(() => {
        result.current.setSetupLoading(true);
      });

      // Show navigation warning during setup
      act(() => {
        result.current.showNavigationWarning();
      });

      expect(result.current.loading.setupWizard).toBe(true);
      expect(result.current.modals.navigationWarning).toBe(true);

      // Complete setup, hide warning, show success
      act(() => {
        result.current.setSetupLoading(false);
        result.current.hideNavigationWarning();
        result.current.showSuccess('Game setup completed');
      });

      expect(result.current.loading.setupWizard).toBe(false);
      expect(result.current.modals.navigationWarning).toBe(false);
      expect(result.current.notifications[0].type).toBe('success');
    });
  });
});
