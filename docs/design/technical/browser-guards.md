# Browser Navigation Guards

> **Note**: This document details the implementation of browser navigation
> protection to prevent accidental data loss during active games in TW Softball
> PWA.

## Problem Statement

During active softball games, users may accidentally:

- Press the browser back button
- Refresh the page
- Navigate to another tab/app
- Close the browser/tab
- Use browser forward/back gestures

These actions can cause **data loss** of the current game state, which is
unacceptable during live game recording.

## Solution Architecture

### Multi-Layer Protection Strategy

1. **Browser Events Prevention** - Intercept browser navigation events
2. **Route Blocking** - Block React Router navigation during games
3. **Unload Warnings** - Show confirmation before leaving page
4. **State Persistence** - Auto-save game state continuously
5. **Recovery Mechanisms** - Restore interrupted games

---

## Implementation

### 1. Browser History Management

```typescript
// shared/lib/hooks/useNavigationGuard.ts
import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

interface NavigationGuardOptions {
  when: boolean; // Should block navigation
  message?: string;
  onBlocked?: (location: Location) => void;
}

export function useNavigationGuard({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onBlocked,
}: NavigationGuardOptions) {
  // Block React Router navigation
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return when && currentLocation.pathname !== nextLocation.pathname;
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!when) return;

    const handlePopState = (event: PopStateEvent) => {
      // Push current state back to maintain position
      window.history.pushState(null, '', window.location.href);

      // Show custom confirmation dialog
      if (onBlocked) {
        onBlocked(window.location);
      } else {
        // Default behavior - show browser confirmation
        if (!window.confirm(message)) {
          return;
        }
        // If user confirms, allow navigation
        window.history.back();
      }
    };

    // Push initial state to create history entry
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [when, message, onBlocked]);

  // Handle page refresh/close
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: blocker.proceed,
    reset: blocker.reset,
    location: blocker.location,
  };
}
```

### 2. Game-Specific Navigation Guard

```typescript
// features/record-at-bat/lib/gameNavigationGuard.ts
import { useNavigationGuard } from 'shared/lib/hooks/useNavigationGuard';
import { useGameStore } from 'shared/store/gameStore';
import { useState, useCallback } from 'react';

export function useGameNavigationGuard() {
  const { currentGameId, gameData } = useGameStore();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<Location | null>(
    null
  );

  // Determine if we should block navigation
  const shouldBlock = Boolean(
    currentGameId && gameData && gameData.status === 'IN_PROGRESS'
  );

  const handleBlocked = useCallback((location: Location) => {
    setPendingNavigation(location);
    setShowWarningModal(true);
  }, []);

  const guard = useNavigationGuard({
    when: shouldBlock,
    message:
      'Game in progress. Your progress will be lost if you leave. Continue?',
    onBlocked: handleBlocked,
  });

  const confirmNavigation = useCallback(() => {
    setShowWarningModal(false);
    setPendingNavigation(null);

    if (guard.proceed) {
      guard.proceed();
    } else {
      // Handle direct browser navigation
      window.location.href = pendingNavigation?.href || '/';
    }
  }, [guard, pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowWarningModal(false);
    setPendingNavigation(null);

    if (guard.reset) {
      guard.reset();
    }
  }, [guard]);

  return {
    isBlocked: guard.isBlocked || showWarningModal,
    showWarningModal,
    pendingLocation: pendingNavigation,
    confirmNavigation,
    cancelNavigation,
  };
}
```

### 3. Navigation Warning Modal

```typescript
// widgets/navigation-guard/NavigationWarningModal.tsx
import { Modal, Button } from 'shared/ui';
import { useGameNavigationGuard } from 'features/record-at-bat/lib/gameNavigationGuard';

interface NavigationWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  destination?: string;
}

export function NavigationWarningModal({
  isOpen,
  onConfirm,
  onCancel,
  destination
}: NavigationWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Game in Progress"
      className="navigation-warning-modal"
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            You're about to leave an active game
          </h3>
          <p className="text-gray-600">
            Your current game progress will be saved, but you'll need to manually
            resume the game when you return.
          </p>
          {destination && (
            <p className="text-sm text-gray-500 mt-2">
              Navigating to: {destination}
            </p>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="text-yellow-600 text-sm">
              💡 <strong>Tip:</strong> Use the "End Game" button to properly finish
              your game before navigating away.
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Stay in Game
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="flex-1"
          >
            Leave Game
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

### 4. Integration with Pages

```typescript
// pages/game-recording/GameRecordingPage.tsx
import { useGameNavigationGuard } from 'features/record-at-bat/lib/gameNavigationGuard';
import { NavigationWarningModal } from 'widgets/navigation-guard';

export function GameRecordingPage() {
  const {
    showWarningModal,
    pendingLocation,
    confirmNavigation,
    cancelNavigation,
  } = useGameNavigationGuard();

  return (
    <div className="game-recording-page">
      {/* Game recording UI */}

      {/* Navigation warning modal */}
      <NavigationWarningModal
        isOpen={showWarningModal}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        destination={pendingLocation?.pathname}
      />
    </div>
  );
}
```

---

## State Persistence Strategy

### Auto-Save Implementation

```typescript
// shared/lib/hooks/useAutoSave.ts
import { useEffect, useRef } from 'react';
import { useGameStore } from 'shared/store/gameStore';

interface AutoSaveOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoSave({
  interval = 5000, // 5 seconds
  enabled = true,
}: AutoSaveOptions = {}) {
  const { gameData, currentGameId } = useGameStore();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();

  useEffect(() => {
    if (!enabled || !gameData || !currentGameId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    const saveGame = () => {
      const currentGameState = JSON.stringify(gameData);

      // Only save if state has changed
      if (currentGameState !== lastSavedRef.current) {
        try {
          // Save to localStorage as backup
          localStorage.setItem(`game-${currentGameId}`, currentGameState);
          localStorage.setItem('last-game-id', currentGameId);
          lastSavedRef.current = currentGameState;

          console.log('Game auto-saved at', new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Failed to auto-save game:', error);
        }
      }
    };

    // Initial save
    saveGame();

    // Set up interval
    intervalRef.current = setInterval(saveGame, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameData, currentGameId, interval, enabled]);
}
```

### Game Recovery System

```typescript
// shared/lib/gameRecovery.ts
import { Game } from '@twsoftball/domain';

export class GameRecoveryService {
  private static readonly RECOVERY_KEY = 'game-recovery';
  private static readonly LAST_GAME_KEY = 'last-game-id';

  static saveRecoveryPoint(game: Game): void {
    try {
      const recoveryData = {
        game,
        timestamp: new Date().toISOString(),
        url: window.location.pathname,
      };

      localStorage.setItem(
        `${this.RECOVERY_KEY}-${game.id}`,
        JSON.stringify(recoveryData)
      );
      localStorage.setItem(this.LAST_GAME_KEY, game.id);
    } catch (error) {
      console.error('Failed to save recovery point:', error);
    }
  }

  static getLastGameId(): string | null {
    return localStorage.getItem(this.LAST_GAME_KEY);
  }

  static getRecoveryData(gameId: string): {
    game: Game;
    timestamp: string;
    url: string;
  } | null {
    try {
      const data = localStorage.getItem(`${this.RECOVERY_KEY}-${gameId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get recovery data:', error);
      return null;
    }
  }

  static clearRecoveryData(gameId: string): void {
    localStorage.removeItem(`${this.RECOVERY_KEY}-${gameId}`);

    // Clear last game ID if it matches
    if (this.getLastGameId() === gameId) {
      localStorage.removeItem(this.LAST_GAME_KEY);
    }
  }

  static hasRecoverableGame(): boolean {
    const lastGameId = this.getLastGameId();
    return lastGameId ? this.getRecoveryData(lastGameId) !== null : false;
  }
}
```

### Recovery Modal

```typescript
// widgets/game-recovery/GameRecoveryModal.tsx
import { useEffect, useState } from 'react';
import { Modal, Button } from 'shared/ui';
import { GameRecoveryService } from 'shared/lib/gameRecovery';
import { useGameStore } from 'shared/store/gameStore';
import { useNavigate } from 'react-router-dom';

export function GameRecoveryModal() {
  const [recoveryData, setRecoveryData] = useState<{
    game: Game;
    timestamp: string;
    url: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { setCurrentGame } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recoverable game on app startup
    if (GameRecoveryService.hasRecoverableGame()) {
      const lastGameId = GameRecoveryService.getLastGameId();
      if (lastGameId) {
        const data = GameRecoveryService.getRecoveryData(lastGameId);
        if (data) {
          setRecoveryData(data);
          setShowModal(true);
        }
      }
    }
  }, []);

  const handleRecover = () => {
    if (recoveryData) {
      setCurrentGame(recoveryData.game);
      navigate(recoveryData.url);
      setShowModal(false);
    }
  };

  const handleDiscard = () => {
    if (recoveryData) {
      GameRecoveryService.clearRecoveryData(recoveryData.game.id);
      setRecoveryData(null);
      setShowModal(false);
    }
  };

  if (!recoveryData) return null;

  const timeSinceLastSave = new Date().getTime() - new Date(recoveryData.timestamp).getTime();
  const minutesAgo = Math.floor(timeSinceLastSave / (1000 * 60));

  return (
    <Modal
      isOpen={showModal}
      onClose={handleDiscard}
      title="Resume Previous Game?"
      className="game-recovery-modal"
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Interrupted Game Found
          </h3>
          <p className="text-gray-600 mb-4">
            We found a game that was in progress. Would you like to resume where you left off?
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="text-sm text-blue-800">
              <div><strong>Teams:</strong> {recoveryData.game.homeTeam} vs {recoveryData.game.awayTeam}</div>
              <div><strong>Score:</strong> {recoveryData.game.homeScore}-{recoveryData.game.awayScore}</div>
              <div><strong>Last saved:</strong> {minutesAgo} minutes ago</div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleDiscard}
            className="flex-1"
          >
            Start Fresh
          </Button>
          <Button
            variant="primary"
            onClick={handleRecover}
            className="flex-1"
          >
            Resume Game
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Testing Strategy

### Navigation Guard Tests

```typescript
// shared/lib/hooks/__tests__/useNavigationGuard.test.ts
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard } from '../useNavigationGuard';

// Mock window.history
const mockPushState = jest.spyOn(window.history, 'pushState');
const mockAddEventListener = jest.spyOn(window, 'addEventListener');
const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener');

describe('useNavigationGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets up popstate listener when guard is active', () => {
    renderHook(() =>
      useNavigationGuard({
        when: true,
        message: 'Test message',
      })
    );

    expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.href);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('does not set up listeners when guard is inactive', () => {
    renderHook(() =>
      useNavigationGuard({
        when: false,
        message: 'Test message',
      })
    );

    expect(mockPushState).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useNavigationGuard({
        when: true,
        message: 'Test message',
      })
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function)
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });
});
```

### Integration Tests

```typescript
// __tests__/navigationGuard.integration.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameRecordingPage } from 'pages/game-recording/GameRecordingPage';
import { useGameStore } from 'shared/store/gameStore';

// Mock game store
jest.mock('shared/store/gameStore');
const mockUseGameStore = useGameStore as jest.MockedFunction<typeof useGameStore>;

describe('Navigation Guard Integration', () => {
  beforeEach(() => {
    // Setup active game state
    mockUseGameStore.mockReturnValue({
      currentGameId: 'game-1',
      gameData: {
        id: 'game-1',
        status: 'IN_PROGRESS',
        homeTeam: 'Warriors',
        awayTeam: 'Eagles',
        homeScore: 3,
        awayScore: 2,
      },
      setCurrentGame: jest.fn(),
      updateGameState: jest.fn(),
      clearGame: jest.fn(),
    });
  });

  it('shows warning modal when user tries to navigate during game', async () => {
    render(
      <BrowserRouter>
        <GameRecordingPage />
      </BrowserRouter>
    );

    // Simulate browser back button
    const popstateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popstateEvent);

    // Should show warning modal
    expect(screen.getByText('Game in Progress')).toBeInTheDocument();
    expect(screen.getByText('Stay in Game')).toBeInTheDocument();
    expect(screen.getByText('Leave Game')).toBeInTheDocument();
  });

  it('allows navigation when user confirms', async () => {
    render(
      <BrowserRouter>
        <GameRecordingPage />
      </BrowserRouter>
    );

    // Trigger navigation warning
    const popstateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popstateEvent);

    // Click "Leave Game"
    fireEvent.click(screen.getByText('Leave Game'));

    // Modal should close
    expect(screen.queryByText('Game in Progress')).not.toBeInTheDocument();
  });

  it('cancels navigation when user declines', async () => {
    render(
      <BrowserRouter>
        <GameRecordingPage />
      </BrowserRouter>
    );

    // Trigger navigation warning
    const popstateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popstateEvent);

    // Click "Stay in Game"
    fireEvent.click(screen.getByText('Stay in Game'));

    // Modal should close, user stays on page
    expect(screen.queryByText('Game in Progress')).not.toBeInTheDocument();
  });
});
```

---

## Performance Considerations

### Optimized Event Handling

```typescript
// Throttle popstate events to prevent excessive handler calls
import { throttle } from 'shared/lib/utils';

const throttledPopstateHandler = throttle((event: PopStateEvent) => {
  handlePopState(event);
}, 100); // Maximum once per 100ms

window.addEventListener('popstate', throttledPopstateHandler);
```

### Memory Management

```typescript
// Properly clean up event listeners and intervals
useEffect(() => {
  const controller = new AbortController();

  window.addEventListener('popstate', handlePopState, {
    signal: controller.signal,
  });

  return () => {
    controller.abort(); // Removes all listeners at once
  };
}, []);
```

### Storage Optimization

```typescript
// Compress game state for localStorage
import { compress, decompress } from 'shared/lib/compression';

const saveGameState = (game: Game) => {
  const compressed = compress(JSON.stringify(game));
  localStorage.setItem(`game-${game.id}`, compressed);
};

const loadGameState = (gameId: string): Game | null => {
  const compressed = localStorage.getItem(`game-${gameId}`);
  if (!compressed) return null;

  const decompressed = decompress(compressed);
  return JSON.parse(decompressed);
};
```

This browser navigation guard system ensures users never lose game data due to
accidental navigation while maintaining a smooth user experience.
