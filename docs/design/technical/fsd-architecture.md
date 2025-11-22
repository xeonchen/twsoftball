# Feature-Sliced Design Architecture

> **Note**: This document defines the complete Feature-Sliced Design (FSD)
> architecture for TW Softball PWA, including folder structure, layer
> responsibilities, and integration patterns.

## FSD Overview

### Architecture Philosophy

Feature-Sliced Design is a frontend architecture methodology that structures
code by features and layers, promoting:

1. **Scalability** - Easy to add new features without affecting existing ones
2. **Maintainability** - Clear separation of concerns and dependencies
3. **Team Collaboration** - Multiple developers can work on different features
   simultaneously
4. **Testability** - Isolated layers are easier to unit test
5. **Reusability** - Shared components and utilities across features

### Layer Hierarchy (Bottom-Up)

```
app/         # Application initialization (providers, routing, global styles)
pages/       # Complete screen implementations (routing targets)
widgets/     # Composite UI blocks (header, sidebar, complex components)
features/    # User scenarios and business logic (record at-bat, manage lineup)
entities/    # Business entities (player, game, team, at-bat)
shared/      # Reusable infrastructure (UI kit, utilities, API, config)
```

### Dependency Rules

- **Upper layers** can import from **lower layers**
- **Lower layers** cannot import from **upper layers**
- **Same-level layers** cannot directly import from each other (use shared
  layer)

---

## Complete Folder Structure

```
apps/web/src/
├── app/                     # Application Layer (Level 6)
│   ├── providers/
│   │   ├── index.ts
│   │   ├── RouterProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── GameStateProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tailwind.css
│   │   └── fonts.css
│   ├── router/
│   │   ├── index.tsx
│   │   ├── routes.ts
│   │   └── guards.ts
│   └── index.tsx
│
├── pages/                   # Pages Layer (Level 5)
│   ├── home/
│   │   ├── index.ts
│   │   └── ui/
│   │       ├── HomePage.tsx
│   │       └── HomePage.test.tsx
│   ├── game-setup/
│   │   ├── index.ts
│   │   └── ui/
│   │       ├── GameSetupTeamsPage.tsx
│   │       ├── GameSetupLineupPage.tsx
│   │       ├── GameSetupConfirmPage.tsx
│   │       └── *.test.tsx
│   ├── game-recording/
│   │   ├── index.ts
│   │   └── ui/
│   │       ├── GameRecordingPage.tsx
│   │       └── GameRecordingPage.test.tsx
│   ├── game-stats/
│   │   ├── index.ts
│   │   └── ui/
│   │       ├── GameStatsPage.tsx
│   │       └── GameStatsPage.test.tsx
│   └── settings/
│       ├── index.ts
│       └── ui/
│           ├── SettingsPage.tsx
│           └── SettingsPage.test.tsx
│
├── widgets/                 # Widgets Layer (Level 4)
│   ├── game-header/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── GameHeader.tsx
│   │   │   └── GameHeader.test.tsx
│   │   └── model/
│   │       └── useGameHeader.ts
│   ├── at-bat-panel/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── AtBatActionPanel.tsx
│   │   │   ├── AtBatActionPanel.test.tsx
│   │   │   ├── ActionButton.tsx
│   │   │   └── ExpandedOptions.tsx
│   │   └── model/
│   │       ├── useBattingActions.ts
│   │       └── types.ts
│   ├── bases-diamond/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── BasesDiamond.tsx
│   │   │   ├── BasesDiamond.test.tsx
│   │   │   ├── Base.tsx
│   │   │   └── RunnerIndicator.tsx
│   │   └── model/
│   │       └── useBasesState.ts
│   ├── error-boundary/
│   │   ├── index.ts
│   │   └── ui/
│   │       ├── ErrorBoundary.tsx
│   │       └── ErrorBoundary.test.tsx
│   └── runner-advancement/
│       ├── index.ts
│       └── ui/
│           ├── RunnerAdvancementModal.tsx
│           └── RunnerAdvancementModal.test.tsx
│
├── features/               # Features Layer (Level 3)
│   ├── game-core/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   └── hooks/
│   │   │       ├── usePerformanceOptimization.ts # Moved from shared layer
│   │   │       ├── useRecordAtBat.ts            # Moved from shared layer
│   │   │       └── useRunnerAdvancement.ts      # Moved from shared layer
│   │   └── lib/
│   │       └── gameUtils.ts
│   ├── record-at-bat/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── AtBatForm.tsx
│   │   │   ├── RunnerAdjustmentModal.tsx
│   │   │   └── ConfirmationDialog.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useRecordAtBat.ts
│   │   ├── api/
│   │   │   └── recordAtBat.ts
│   │   └── lib/
│   │       ├── validation.ts
│   │       └── runnerAdvancement.ts
│   ├── lineup-management/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── LineupEditor.tsx
│   │   │   ├── PlayerSelector.tsx
│   │   │   └── PositionAssignment.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useLineupManagement.ts
│   │   ├── api/
│   │   │   └── updateLineup.ts
│   │   └── lib/
│   │       └── lineupValidation.ts
│   ├── game-setup/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── GameSetupForm.tsx
│   │   │   └── GameSetupWizard.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useGameSetup.ts
│   │   ├── api/
│   │   │   └── createGame.ts
│   │   └── lib/
│   │       └── gameSetupValidation.ts
│   ├── substitute-player/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── SubstitutionWizard.tsx
│   │   │   ├── PlayerSelection.tsx
│   │   │   └── EligibilityCheck.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useSubstitutePlayer.ts
│   │   ├── api/
│   │   │   └── substitutePlayer.ts
│   │   └── lib/
│   │       └── eligibilityRules.ts
│   ├── undo-action/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── UndoButton.tsx
│   │   │   ├── RedoButton.tsx
│   │   │   └── ActionPreview.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useUndoRedo.ts
│   │   ├── api/
│   │   │   └── undoAction.ts
│   │   └── lib/
│   │       └── actionHistory.ts
│   ├── sync-game/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── SyncStatus.tsx
│   │   │   └── SyncIndicator.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useSyncGame.ts
│   │   ├── api/
│   │   │   ├── syncGame.ts
│   │   │   └── queueSync.ts
│   │   └── lib/
│   │       └── offlineQueue.ts
│   └── view-stats/
│       ├── index.ts
│       ├── ui/
│       │   ├── StatsModal.tsx
│       │   ├── PlayerStats.tsx
│       │   └── TeamStats.tsx
│       ├── model/
│       │   ├── store.ts
│       │   ├── types.ts
│       │   └── useViewStats.ts
│       ├── api/
│       │   └── getStats.ts
│       └── lib/
│           └── statsCalculation.ts
│
├── entities/               # Entities Layer (Level 2)
│   ├── game/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── GameCard.tsx
│   │   │   ├── GameSummary.tsx
│   │   │   └── GameStatus.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useGame.ts
│   │   ├── api/
│   │   │   ├── gameApi.ts
│   │   │   ├── createGame.ts
│   │   │   ├── updateGame.ts
│   │   │   └── getGame.ts
│   │   └── lib/
│   │       ├── gameValidation.ts
│   │       └── gameUtils.ts
│   ├── player/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── PlayerAvatar.tsx
│   │   │   └── PlayerStats.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── usePlayer.ts
│   │   ├── api/
│   │   │   ├── playerApi.ts
│   │   │   ├── getPlayer.ts
│   │   │   └── updatePlayer.ts
│   │   └── lib/
│   │       └── playerUtils.ts
│   ├── team/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── TeamCard.tsx
│   │   │   ├── TeamLogo.tsx
│   │   │   └── TeamStats.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── useTeam.ts
│   │   ├── api/
│   │   │   ├── teamApi.ts
│   │   │   ├── getTeam.ts
│   │   │   └── updateTeam.ts
│   │   └── lib/
│   │       └── teamUtils.ts
│   └── at-bat/
│       ├── index.ts
│       ├── ui/
│       │   ├── AtBatResult.tsx
│       │   └── AtBatSummary.tsx
│       ├── model/
│       │   ├── store.ts
│       │   ├── types.ts
│       │   └── useAtBat.ts
│       ├── api/
│       │   ├── atBatApi.ts
│       │   └── recordAtBat.ts
│       └── lib/
│           └── atBatUtils.ts
│
└── shared/                 # Shared Layer (Level 1)
    ├── ui/                 # UI Kit
    │   ├── index.ts        # Barrel exports
    │   ├── Button/
    │   │   ├── index.ts
    │   │   ├── Button.tsx
    │   │   ├── Button.test.tsx
    │   │   └── Button.stories.tsx
    │   ├── Card/
    │   │   ├── index.ts
    │   │   ├── Card.tsx
    │   │   ├── Card.test.tsx
    │   │   └── Card.stories.tsx
    │   ├── Modal/
    │   │   ├── index.ts
    │   │   ├── Modal.tsx
    │   │   ├── ModalProvider.tsx
    │   │   ├── Modal.test.tsx
    │   │   └── Modal.stories.tsx
    │   ├── Form/
    │   │   ├── index.ts
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Checkbox.tsx
    │   │   ├── RadioGroup.tsx
    │   │   └── FormProvider.tsx
    │   ├── Layout/
    │   │   ├── index.ts
    │   │   ├── Container.tsx
    │   │   ├── Stack.tsx
    │   │   ├── Grid.tsx
    │   │   └── Spacer.tsx
    │   ├── Typography/
    │   │   ├── index.ts
    │   │   ├── Heading.tsx
    │   │   ├── Text.tsx
    │   │   └── Link.tsx
    │   ├── Icons/
    │   │   ├── index.ts
    │   │   ├── SportIcons.tsx
    │   │   ├── SystemIcons.tsx
    │   │   └── BaseballIcons.tsx
    │   └── LoadingStates/
    │       ├── index.ts
    │       ├── Skeleton.tsx
    │       ├── Spinner.tsx
    │       └── LoadingOverlay.tsx
    │
    ├── api/                # API Layer
    │   ├── index.ts
    │   ├── client.ts       # API client configuration
    │   ├── types.ts        # API response types
    │   ├── endpoints.ts    # API endpoints
    │   ├── interceptors.ts # Request/response interceptors
    │   └── mock/
    │       ├── handlers.ts # MSW handlers for testing
    │       └── fixtures.ts # Mock data fixtures
    │
    ├── lib/                # Utilities & Libraries
    │   ├── index.ts
    │   ├── hooks/          # Reusable hooks
    │   │   ├── index.ts
    │   │   ├── useLocalStorage.ts
    │   │   ├── useOnlineStatus.ts
    │   │   ├── useKeyboard.ts
    │   │   ├── useDebounce.ts
    │   │   └── useIntersection.ts
    │   ├── utils/          # Pure functions
    │   │   ├── index.ts
    │   │   ├── classNames.ts
    │   │   ├── formatters.ts
    │   │   ├── validators.ts
    │   │   ├── dateUtils.ts
    │   │   └── mathUtils.ts
    │   ├── constants/      # App constants
    │   │   ├── index.ts
    │   │   ├── routes.ts
    │   │   ├── gameRules.ts
    │   │   ├── positions.ts
    │   │   └── atBatResults.ts
    │   ├── types/          # Shared types
    │   │   ├── index.ts
    │   │   ├── api.ts
    │   │   ├── game.ts
    │   │   ├── player.ts
    │   │   └── common.ts
    │   └── errors/         # Error handling
    │       ├── index.ts
    │       ├── ApiError.ts
    │       ├── ValidationError.ts
    │       └── AppError.ts
    │
    ├── config/             # Configuration
    │   ├── index.ts
    │   ├── env.ts          # Environment variables
    │   ├── constants.ts    # Global constants
    │   ├── theme.ts        # Theme configuration
    │   └── routes.ts       # Route definitions
    │
    └── store/              # Global State Management
        ├── index.ts
        ├── rootStore.ts    # Zustand root store
        ├── gameStore.ts    # Global game state
        ├── userStore.ts    # User preferences
        └── syncStore.ts    # Sync/offline state
```

---

## Layer Responsibilities

### App Layer (Level 6)

**Purpose**: Application-wide configuration and initialization

```typescript
// apps/web/src/app/index.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'app/router';
import { GameStateProvider } from './providers/GameStateProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import './styles/globals.css';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GameStateProvider>
          <Router />
        </GameStateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

**Responsibilities:**

- Application initialization and root providers
- Global routing configuration
- Global styles and theme setup
- Error boundaries and fallbacks
- PWA configuration and service worker registration

### Pages Layer (Level 5)

**Purpose**: Complete screen implementations that users can navigate to

```typescript
// pages/game-recording/ui/GameRecordingPage.tsx
import { GameHeader } from 'widgets/game-header';
import { AtBatActionPanel } from 'widgets/at-bat-panel';
import { BasesDiamond } from 'widgets/bases-diamond';
import { useGameRecording } from 'features/game-core';

export function GameRecordingPage() {
  return (
    <div className="game-recording-layout">
      <GameHeader />
      <BasesDiamond />
      <AtBatActionPanel />
    </div>
  );
}
```

**Responsibilities:**

- Complete screen implementations
- Layout and composition of widgets
- Page-level state management
- Route parameter handling
- SEO meta tags (for web)

### Widgets Layer (Level 4)

**Purpose**: Complex, composite UI blocks that combine multiple features

```typescript
// widgets/at-bat-panel/ui/AtBatActionPanel.tsx
import { useRecordAtBat } from 'features/record-at-bat';
import { Button } from 'shared/ui';

export function AtBatActionPanel() {
  const { recordAtBat, isLoading } = useRecordAtBat();

  return (
    <div className="at-bat-action-panel">
      <Button
        size="large"
        onClick={() => recordAtBat('SINGLE')}
        disabled={isLoading}
      >
        SINGLE
      </Button>
      {/* Other action buttons */}
    </div>
  );
}
```

**Responsibilities:**

- Complex UI compositions
- Integration of multiple features
- Widget-specific state management
- Business logic coordination
- User interaction handling

### Features Layer (Level 3)

**Purpose**: Complete user scenarios and business logic

```typescript
// features/record-at-bat/model/useRecordAtBat.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordAtBat as recordAtBatApi } from './api/recordAtBat';
import { useGameStore } from 'shared/store';

export function useRecordAtBat() {
  const queryClient = useQueryClient();
  const { currentGameId, updateGameState } = useGameStore();

  const mutation = useMutation({
    mutationFn: recordAtBatApi,
    onSuccess: updatedGame => {
      updateGameState(updatedGame);
      queryClient.invalidateQueries(['game', currentGameId]);
    },
  });

  return {
    recordAtBat: mutation.mutate,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
```

**Responsibilities:**

- Complete user workflows
- Business logic implementation
- API integration for specific features
- Feature-specific state management
- Input validation and error handling

### Entities Layer (Level 2)

**Purpose**: Business entities and domain concepts

```typescript
// entities/player/model/types.ts
export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: Position;
  battingStats: BattingStats;
  fieldingStats: FieldingStats;
  isActive: boolean;
}

// entities/player/ui/PlayerCard.tsx
import { Card } from 'shared/ui';

interface PlayerCardProps {
  player: Player;
  onClick?: (player: Player) => void;
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  return (
    <Card onClick={() => onClick?.(player)}>
      <div className="player-info">
        <span className="jersey-number">{player.jerseyNumber}</span>
        <span className="player-name">{player.name}</span>
        <span className="position">{player.position}</span>
      </div>
    </Card>
  );
}
```

**Responsibilities:**

- Domain entity definitions
- Entity-specific UI components
- Entity state management
- Entity CRUD operations
- Entity validation and utilities

### Shared Layer (Level 1)

**Purpose**: Reusable infrastructure used across all layers

```typescript
// shared/ui/Button/Button.tsx
import { forwardRef } from 'react';
import { cn } from 'shared/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  className?: string;
  // ... other props
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn',
          `btn-${variant}`,
          `btn-${size}`,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

**Responsibilities:**

- Reusable UI components
- Utility functions and hooks
- API client and configuration
- Global constants and types
- Error handling utilities

---

## Import Rules & Examples

### ✅ Allowed Imports

```typescript
// Pages can import from widgets, features, entities, shared
// pages/game-recording/ui/GameRecordingPage.tsx
import { GameHeader } from 'widgets/game-header';
import { useRecordAtBat } from 'features/record-at-bat';
import { useGameRecording } from 'features/game-core';
import { PlayerCard } from 'entities/player';
import { Button } from 'shared/ui';

// Widgets can import from features, entities, shared
// widgets/at-bat-panel/ui/AtBatActionPanel.tsx
import { useRecordAtBat } from 'features/record-at-bat';
import { AtBatResult } from 'entities/at-bat';
import { Button } from 'shared/ui';

// Features can import from entities, shared
// features/record-at-bat/ui/AtBatForm.tsx
import { Player } from 'entities/player';
import { Button, Modal } from 'shared/ui';
import { validateAtBat } from 'shared/lib/validators';

// Entities can import from shared only
// entities/player/ui/PlayerCard.tsx
import { Card, Avatar } from 'shared/ui';
import { formatName } from 'shared/lib/formatters';

// Shared can only import from within shared
// shared/ui/Modal/Modal.tsx
import { cn } from 'shared/lib/utils';
import { Button } from 'shared/ui/Button';
```

### ❌ Forbidden Imports

```typescript
// ❌ Lower layers cannot import from higher layers
// entities/player/model/Player.ts
import { useRecordAtBat } from 'features/record-at-bat'; // ❌

// ❌ Same-level layers cannot import from each other directly
// features/record-at-bat/ui/Form.tsx
import { useSubstitutePlayer } from 'features/substitute-player'; // ❌

// ❌ Shared cannot import from any other layer
// shared/ui/Button/Button.tsx
import { Player } from 'entities/player'; // ❌
```

---

## State Management Architecture

### Zustand Stores (Global State)

```typescript
// shared/store/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  currentGameId: string | null;
  gameData: Game | null;
  isLoading: boolean;
  error: string | null;
}

interface GameActions {
  setCurrentGame: (game: Game) => void;
  updateGameState: (updates: Partial<Game>) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      // State
      currentGameId: null,
      gameData: null,
      isLoading: false,
      error: null,

      // Actions
      setCurrentGame: game => set({ gameData: game, currentGameId: game.id }),
      updateGameState: updates =>
        set(state => ({
          gameData: state.gameData ? { ...state.gameData, ...updates } : null,
        })),
      clearGame: () =>
        set({
          currentGameId: null,
          gameData: null,
          error: null,
        }),
    }),
    {
      name: 'game-store',
      partialize: state => ({
        currentGameId: state.currentGameId,
        gameData: state.gameData,
      }),
    }
  )
);
```

### Feature-Specific State

```typescript
// features/record-at-bat/model/store.ts
import { create } from 'zustand';

interface AtBatState {
  pendingAtBat: AtBatData | null;
  showRunnerModal: boolean;
  runnerAdjustments: Record<string, string>;
}

export const useAtBatStore = create<AtBatState>()(set => ({
  pendingAtBat: null,
  showRunnerModal: false,
  runnerAdjustments: {},

  setPendingAtBat: atBat => set({ pendingAtBat: atBat }),
  showRunnerAdjustment: () => set({ showRunnerModal: true }),
  hideRunnerAdjustment: () =>
    set({
      showRunnerModal: false,
      runnerAdjustments: {},
    }),
  updateRunnerAdjustment: (runnerId, position) =>
    set(state => ({
      runnerAdjustments: {
        ...state.runnerAdjustments,
        [runnerId]: position,
      },
    })),
}));
```

---

## Integration with Domain Layer

### Connecting to Application Layer

```typescript
// features/record-at-bat/api/recordAtBat.ts
import { RecordAtBatUseCase } from '@twsoftball/application';
import { GameRepository } from '@twsoftball/infrastructure';

// Initialize domain services
const gameRepository = new GameRepository();
const recordAtBatUseCase = new RecordAtBatUseCase(gameRepository);

export async function recordAtBat(atBatData: AtBatData) {
  try {
    const command = {
      gameId: atBatData.gameId,
      playerId: atBatData.playerId,
      result: atBatData.result,
      runnerAdjustments: atBatData.runnerAdjustments,
    };

    const result = await recordAtBatUseCase.execute(command);
    return result;
  } catch (error) {
    console.error('Failed to record at-bat:', error);
    throw error;
  }
}
```

### Domain Event Handling

```typescript
// shared/api/eventBus.ts
import { EventEmitter } from 'events';
import { DomainEvent } from '@twsoftball/domain';

class EventBus extends EventEmitter {
  publishDomainEvent(event: DomainEvent) {
    this.emit(event.type, event);
  }

  subscribeToDomainEvent<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => void
  ) {
    this.on(eventType, handler);
  }
}

export const eventBus = new EventBus();

// Usage in features
// features/sync-game/model/useGameEvents.ts
import { eventBus } from 'shared/api/eventBus';

export function useGameEvents() {
  useEffect(() => {
    const handleAtBatCompleted = (event: AtBatCompletedEvent) => {
      // Update UI state
      // Trigger sync if online
      // Show notifications
    };

    eventBus.subscribeToDomainEvent('AtBatCompleted', handleAtBatCompleted);

    return () => {
      eventBus.off('AtBatCompleted', handleAtBatCompleted);
    };
  }, []);
}
```

---

## File Naming Conventions

### General Rules

- **Folders**: kebab-case (`record-at-bat`, `game-header`)
- **React Components**: PascalCase (`GameHeader.tsx`, `PlayerCard.tsx`)
- **Hooks**: camelCase starting with 'use' (`useGameState.ts`,
  `useRecordAtBat.ts`)
- **Utilities**: camelCase (`formatDate.ts`, `validateInput.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`, `GAME_RULES.ts`)
- **Types**: PascalCase (`GameState.ts`, `PlayerData.ts`)

### Index Files (Barrel Exports)

```typescript
// widgets/game-header/index.ts
export { GameHeader } from './ui/GameHeader';
export { useGameHeader } from './model/useGameHeader';
export type { GameHeaderProps } from './ui/GameHeader';

// shared/ui/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';
export { Input, Select, Checkbox } from './Form';

// features/record-at-bat/index.ts
export { AtBatForm } from './ui/AtBatForm';
export { useRecordAtBat } from './model/useRecordAtBat';
export type { AtBatData, AtBatResult } from './model/types';

// features/game-core/index.ts
export { useGameState, useGameSetup, useGameRecording } from './model';
```

---

## Testing Strategy per Layer

### Shared Layer Testing

```typescript
// shared/ui/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct variant styles', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Feature Layer Testing

```typescript
// features/record-at-bat/model/useRecordAtBat.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useRecordAtBat } from './useRecordAtBat';

describe('useRecordAtBat', () => {
  it('records at-bat successfully', async () => {
    const { result } = renderHook(() => useRecordAtBat());

    result.current.recordAtBat({
      gameId: 'game-1',
      playerId: 'player-1',
      result: 'SINGLE',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify state updates
  });
});
```

### Widget Layer Testing

```typescript
// widgets/at-bat-panel/ui/AtBatActionPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { AtBatActionPanel } from './AtBatActionPanel';

describe('AtBatActionPanel', () => {
  it('renders all primary action buttons', () => {
    render(<AtBatActionPanel />);

    expect(screen.getByText('SINGLE')).toBeInTheDocument();
    expect(screen.getByText('DOUBLE')).toBeInTheDocument();
    expect(screen.getByText('TRIPLE')).toBeInTheDocument();
  });
});
```

---

## Recent Architectural Changes (Phase 5.3.C)

### Key Refactoring Changes

- **UI Structure Migration**: All components moved to `ui/` subfolders for FSD
  compliance
- **Layer Index Removal**: Deleted layer-level index files (entities/index.ts,
  features/index.ts, shared/index.ts)
- **Game Hooks Migration**: Moved game-related hooks from `shared/` to
  `features/game-core/` slice
- **Public API Enforcement**: Enabled `fsd/public-api` rule globally via steiger
  configuration
- **Widget Restructuring**: Consolidated at-bat-panel and bases-diamond widgets
  with proper structure

### Steiger Configuration & Exceptions

Architecture compliance validated via `steiger.config.ts`:

#### Enabled Rules

- **`fsd/public-api`**: Enforced globally to ensure proper barrel exports
- **`fsd/forbidden-imports`**: Prevents layer dependency violations

#### Documented Exceptions

- **Pending Features (Phase 5.3.D-F)**: Temporarily exempt from
  `insignificant-slice` rule:
  - `widgets/at-bat-panel`, `widgets/bases-diamond`, `widgets/game-header`
  - `features/lineup-management`, `features/record-at-bat`, `entities/player`
- **Single-Reference Slices**: Acceptable architectural patterns:
  - `features/game-setup` (used only in pages/game-setup)
  - `features/game-core` (used only in pages/game-recording)
  - `widgets/error-boundary`, `widgets/runner-advancement` (single usage
    patterns)

#### Architectural Debt

- **DI Container Import Warning**: `shared/api/di/container.ts` imports from
  entities layer
  - Status: Documented for future refactoring to features layer
  - Impact: Warning level, does not block builds

### Migration Benefits

- **Improved Scalability**: Clear slice boundaries and dependency rules
- **Better Team Collaboration**: Isolated features for parallel development
- **Enhanced Maintainability**: Predictable import patterns and public APIs
- **Architecture Validation**: Automated compliance checking via steiger

---

This FSD architecture provides a scalable, maintainable foundation for the TW
Softball PWA while maintaining clear separation of concerns and dependency
rules.
