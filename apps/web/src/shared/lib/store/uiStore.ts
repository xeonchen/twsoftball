import { create } from 'zustand';

import { Player } from '../types';

/**
 * Notification types for user feedback
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification data structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title?: string | undefined;
  message: string;
  duration?: number; // milliseconds, 0 means persistent
}

/**
 * Runner adjustment modal data structure
 */
export interface RunnerAdjustmentData {
  playType: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN' | 'WALK' | 'ERROR';
  batter: Player;
  runners: Array<{
    player: Player;
    fromBase: 'first' | 'second' | 'third';
    advancement: 'first' | 'second' | 'third' | 'home' | 'out';
  }>;
}

/**
 * Substitution modal data structure
 */
export interface SubstitutionData {
  playerOut: Player;
  availablePlayers: Player[];
}

/**
 * Game recovery modal data structure
 */
export interface GameRecoveryData {
  gameId: string;
  timestamp: string;
  gameInfo: {
    homeTeam: string;
    awayTeam: string;
    score: string;
  };
}

/**
 * Modal states interface
 */
interface ModalStates {
  navigationWarning: boolean;
  runnerAdjustment: boolean;
  substitution: boolean;
  gameRecovery: boolean;
}

/**
 * Modal data interface
 */
interface ModalData {
  runnerAdjustment: RunnerAdjustmentData | null;
  substitution: SubstitutionData | null;
  gameRecovery: GameRecoveryData | null;
}

/**
 * Loading states interface
 */
interface LoadingStates {
  setupWizard: boolean;
  gameSave: boolean;
}

/**
 * UI store state interface
 */
interface UIState {
  modals: ModalStates;
  modalData: ModalData;
  loading: LoadingStates;
  notifications: Notification[];
}

/**
 * UI store actions interface
 */
interface UIActions {
  // Modal actions
  showNavigationWarning: () => void;
  hideNavigationWarning: () => void;
  showRunnerAdjustment: (data: RunnerAdjustmentData) => void;
  hideRunnerAdjustment: () => void;
  showSubstitution: (data: SubstitutionData) => void;
  hideSubstitution: () => void;
  showGameRecovery: (data: GameRecoveryData) => void;
  hideGameRecovery: () => void;
  closeAllModals: () => void;

  // Loading actions
  setSetupLoading: (loading: boolean) => void;
  setGameSaveLoading: (loading: boolean) => void;
  isAnyLoading: () => boolean;

  // Notification actions
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;

  // Utility actions
  reset: () => void;
}

/**
 * Combined store interface
 */
type UIStore = UIState & UIActions;

/**
 * Initial state for the UI store
 */
const initialState: UIState = {
  modals: {
    navigationWarning: false,
    runnerAdjustment: false,
    substitution: false,
    gameRecovery: false,
  },
  modalData: {
    runnerAdjustment: null,
    substitution: null,
    gameRecovery: null,
  },
  loading: {
    setupWizard: false,
    gameSave: false,
  },
  notifications: [],
};

/**
 * Generate unique ID for notifications using cryptographically secure random generation
 */
const generateId = (): string => {
  // Use crypto.randomUUID() for secure random generation
  // This replaces Math.random() to address security concerns
  const uuid = crypto.randomUUID();
  // Extract first 9 characters to match original format
  const randomPart = uuid.replace(/-/g, '').substring(0, 9);
  return `notification-${Date.now()}-${randomPart}`;
};

/**
 * UI State Store
 *
 * Manages all UI-specific state including modals, loading states, and notifications.
 * Separated from game store to maintain clean separation of concerns.
 *
 * Features:
 * - Modal state management for all dialogs
 * - Loading state tracking for async operations
 * - Notification system with multiple types
 * - Helper methods for common UI patterns
 *
 * @example
 * ```typescript
 * const { showNavigationWarning, setSetupLoading, showSuccess } = useUIStore();
 *
 * // Show navigation warning
 * showNavigationWarning();
 *
 * // Set loading state
 * setSetupLoading(true);
 *
 * // Show success notification
 * showSuccess('Game saved successfully');
 * ```
 */
export const useUIStore = create<UIStore>((set, get) => ({
  ...initialState,

  // Modal actions
  showNavigationWarning: (): void => {
    set(state => ({
      modals: { ...state.modals, navigationWarning: true },
    }));
  },

  hideNavigationWarning: (): void => {
    set(state => ({
      modals: { ...state.modals, navigationWarning: false },
    }));
  },

  showRunnerAdjustment: (data: RunnerAdjustmentData): void => {
    set(state => ({
      modals: { ...state.modals, runnerAdjustment: true },
      modalData: { ...state.modalData, runnerAdjustment: data },
    }));
  },

  hideRunnerAdjustment: (): void => {
    set(state => ({
      modals: { ...state.modals, runnerAdjustment: false },
      modalData: { ...state.modalData, runnerAdjustment: null },
    }));
  },

  showSubstitution: (data: SubstitutionData): void => {
    set(state => ({
      modals: { ...state.modals, substitution: true },
      modalData: { ...state.modalData, substitution: data },
    }));
  },

  hideSubstitution: (): void => {
    set(state => ({
      modals: { ...state.modals, substitution: false },
      modalData: { ...state.modalData, substitution: null },
    }));
  },

  showGameRecovery: (data: GameRecoveryData): void => {
    set(state => ({
      modals: { ...state.modals, gameRecovery: true },
      modalData: { ...state.modalData, gameRecovery: data },
    }));
  },

  hideGameRecovery: (): void => {
    set(state => ({
      modals: { ...state.modals, gameRecovery: false },
      modalData: { ...state.modalData, gameRecovery: null },
    }));
  },

  closeAllModals: (): void => {
    set({
      modals: {
        navigationWarning: false,
        runnerAdjustment: false,
        substitution: false,
        gameRecovery: false,
      },
      modalData: {
        runnerAdjustment: null,
        substitution: null,
        gameRecovery: null,
      },
    });
  },

  // Loading actions
  setSetupLoading: (loading: boolean): void => {
    set(state => ({
      loading: { ...state.loading, setupWizard: loading },
    }));
  },

  setGameSaveLoading: (loading: boolean): void => {
    set(state => ({
      loading: { ...state.loading, gameSave: loading },
    }));
  },

  isAnyLoading: (): boolean => {
    const { loading } = get();
    return Object.values(loading).some(isLoading => isLoading);
  },

  // Notification actions
  addNotification: (notification: Notification): void => {
    set(state => ({
      notifications: [...state.notifications, notification],
    }));
  },

  removeNotification: (id: string): void => {
    set(state => ({
      notifications: state.notifications.filter(notification => notification.id !== id),
    }));
  },

  clearAllNotifications: (): void => {
    set({ notifications: [] });
  },

  showSuccess: (message: string, title?: string, duration = 3000): void => {
    const notification: Notification = {
      id: generateId(),
      type: 'success',
      title,
      message,
      duration,
    };

    get().addNotification(notification);
  },

  showError: (message: string, title?: string, duration = 5000): void => {
    const notification: Notification = {
      id: generateId(),
      type: 'error',
      title,
      message,
      duration,
    };

    get().addNotification(notification);
  },

  showWarning: (message: string, title?: string, duration = 4000): void => {
    const notification: Notification = {
      id: generateId(),
      type: 'warning',
      title,
      message,
      duration,
    };

    get().addNotification(notification);
  },

  showInfo: (message: string, title?: string, duration = 3000): void => {
    const notification: Notification = {
      id: generateId(),
      type: 'info',
      title,
      message,
      duration,
    };

    get().addNotification(notification);
  },

  // Utility actions
  reset: (): void => {
    set(initialState);
  },
}));
