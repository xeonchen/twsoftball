# Component Specifications

> **Note**: This document provides detailed specifications for all TW Softball
> PWA components, including props, behavior, accessibility, and usage
> guidelines.

## Component Architecture

### Design Principles

1. **Atomic Design** - Build from atoms to templates
2. **Composition over Configuration** - Flexible, composable components
3. **Accessibility First** - WCAG 2.1 AA compliance built-in
4. **TypeScript Strict** - Full type safety with proper interfaces
5. **Performance Optimized** - Minimal re-renders, efficient updates

### Component Categories

```typescript
// Component hierarchy
atoms/       // Basic building blocks (Button, Input, Badge)
molecules/   // Simple combinations (PlayerCard, ScoreDisplay)
organisms/   // Complex components (GameHeader, BasesDiamond)
templates/   // Page layouts (GameRecordingLayout)
pages/       // Complete screens (GameRecordingPage)
```

---

## Atoms

### Button Component

```typescript
interface ButtonProps {
  // Content
  children: React.ReactNode;

  // Behavior
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';

  // Appearance
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;

  // Touch optimization
  touchTarget?: 'minimum' | 'comfortable' | 'large';

  // HTML attributes
  className?: string;
  id?: string;
}

// Usage examples
<Button variant="primary" size="large" touchTarget="large">
  SINGLE
</Button>

<Button variant="secondary" disabled loading>
  Saving...
</Button>
```

#### Button Specifications

- **Touch Target**: Minimum 48x48px, comfortable 56x56px, large 64x64px
- **States**: Default, hover, active, disabled, loading
- **Keyboard**: Full keyboard navigation support
- **Screen Reader**: Proper ARIA labels and descriptions
- **Performance**: Memoized to prevent unnecessary re-renders

#### Button Variants

```scss
// Primary - Main actions (record at-bat, confirm)
.btn-primary {
  background: var(--color-primary);
  color: white;
  min-height: var(--touch-target);
}

// Secondary - Alternative actions (cancel, back)
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

// Danger - Destructive actions (delete, end game)
.btn-danger {
  background: var(--color-error);
  color: white;
}

// Ghost - Minimal actions (settings, help)
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}
```

### Badge Component

```typescript
interface BadgeProps {
  // Content
  children: React.ReactNode;

  // Appearance
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';

  // HTML attributes
  className?: string;
}

// Usage examples
<Badge variant="success">✓</Badge>
<Badge variant="warning">2 Outs</Badge>
<Badge variant="error">Error</Badge>
```

### Input Component

```typescript
interface InputProps {
  // Input properties
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;

  // Validation
  required?: boolean;
  error?: string;

  // Appearance
  size?: 'medium' | 'large';
  fullWidth?: boolean;

  // Accessibility
  label: string;
  'aria-describedby'?: string;

  // HTML attributes
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}
```

---

## Molecules

### ScoreDisplay Component

```typescript
interface ScoreDisplayProps {
  // Score data
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;

  // Game state
  currentInning: number;
  inningHalf: 'top' | 'bottom';

  // Appearance
  size?: 'compact' | 'full';

  // Accessibility
  'aria-label'?: string;
}

// Usage example
<ScoreDisplay
  homeScore={7}
  awayScore={4}
  homeTeam="Warriors"
  awayTeam="Eagles"
  currentInning={6}
  inningHalf="top"
  size="full"
  aria-label="Warriors 7, Eagles 4, top of 6th inning"
/>
```

#### ScoreDisplay Specifications

- **Typography**: Large, bold, tabular numbers for easy scanning
- **Color**: Home team in primary color, away team in neutral
- **Layout**: Responsive, maintains hierarchy
- **Animation**: Score updates with subtle pulse animation
- **Accessibility**: Screen reader announces score changes

### PlayerCard Component

```typescript
interface PlayerCardProps {
  // Player data
  player: {
    id: string;
    name: string;
    jerseyNumber: string;
    position: string;
    battingAverage?: number;
    atBats?: number;
    hits?: number;
  };

  // State
  isActive?: boolean;
  status?: 'available' | 'batting' | 'on-base' | 'substituted';

  // Actions
  onClick?: (playerId: string) => void;
  onSubstitute?: (playerId: string) => void;

  // Appearance
  showStats?: boolean;
  compact?: boolean;

  // Accessibility
  'aria-label'?: string;
}

// Usage examples
<PlayerCard
  player={{
    id: '1',
    name: 'Sarah Johnson',
    jerseyNumber: '12',
    position: 'RF',
    battingAverage: 0.333,
    atBats: 3,
    hits: 1
  }}
  isActive={true}
  status="batting"
  showStats={true}
  onClick={handlePlayerClick}
/>
```

### GameStatusBar Component

```typescript
interface GameStatusBarProps {
  // Game state
  inning: number;
  inningHalf: 'top' | 'bottom';
  outs: number;

  // Actions
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Appearance
  compact?: boolean;
}

// Usage example
<GameStatusBar
  inning={6}
  inningHalf="top"
  outs={2}
  onUndo={handleUndo}
  onRedo={handleRedo}
  canUndo={true}
  canRedo={false}
/>
```

---

## Organisms

### BasesDiamond Component

```typescript
interface BaseState {
  playerId?: string;
  playerName?: string;
  jerseyNumber?: string;
}

interface BasesDiamondProps {
  // Base states
  bases: {
    first: BaseState | null;
    second: BaseState | null;
    third: BaseState | null;
  };

  // Interaction
  interactive?: boolean;
  onBaseClick?: (base: 'first' | 'second' | 'third') => void;

  // Appearance
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;

  // Accessibility
  'aria-label'?: string;
}

// Usage example
<BasesDiamond
  bases={{
    first: { playerId: '1', playerName: 'Mike Chen', jerseyNumber: '8' },
    second: null,
    third: { playerId: '2', playerName: 'Lisa Park', jerseyNumber: '5' }
  }}
  interactive={false}
  size="medium"
  showLabels={true}
  aria-label="Bases: Mike Chen on first, Lisa Park on third"
/>
```

#### BasesDiamond Specifications

- **Layout**: Diamond shape with proper positioning
  ```
      ◇ 2B
  3B ◇   ◇ 1B
      ◇ H
  ```
- **Visual States**: Empty (◇) vs Occupied (◆) with player info
- **Responsive**: Scales appropriately on different screen sizes
- **Animation**: Smooth transitions when runners advance
- **Touch**: Each base is at least 32x32px touch target
- **Accessibility**: Screen reader announces runner positions

### AtBatActionPanel Component

```typescript
interface AtBatResult {
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN' | 'WALK' | 'STRIKEOUT' | 'GROUND_OUT' | 'FLY_OUT' | 'ERROR' | 'FIELDERS_CHOICE' | 'SACRIFICE_FLY' | 'DOUBLE_PLAY' | 'TRIPLE_PLAY';
  label: string;
  category: 'hit' | 'walk' | 'out' | 'other';
}

interface AtBatActionPanelProps {
  // Actions
  onResultSelect: (result: AtBatResult) => void;

  // State
  disabled?: boolean;

  // Customization
  primaryActions?: AtBatResult[];
  showExpandedOptions?: boolean;

  // Accessibility
  'aria-label'?: string;
}

// Usage example
<AtBatActionPanel
  onResultSelect={handleAtBatResult}
  disabled={false}
  primaryActions={[
    { type: 'SINGLE', label: 'SINGLE', category: 'hit' },
    { type: 'DOUBLE', label: 'DOUBLE', category: 'hit' },
    { type: 'TRIPLE', label: 'TRIPLE', category: 'hit' },
    { type: 'HOME_RUN', label: 'HOME RUN', category: 'hit' },
    { type: 'WALK', label: 'WALK', category: 'walk' },
    { type: 'OUT', label: 'OUT', category: 'out' }
  ]}
  aria-label="Select at-bat result"
/>
```

#### AtBatActionPanel Specifications

- **Layout**: 2-column grid with primary action (SINGLE) taking full width
- **Touch Targets**: All buttons minimum 48x48px
- **Hierarchy**: Most common results prominently displayed
- **Expansion**: "MORE" button reveals additional options
- **Keyboard**: Full keyboard navigation with logical tab order
- **Performance**: Optimized for rapid repeated taps

### GameHeader Component

```typescript
interface GameHeaderProps {
  // Game data
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;

  // Navigation
  onBackClick?: () => void;
  onSettingsClick?: () => void;

  // State
  showBackButton?: boolean;

  // Accessibility
  'aria-label'?: string;
}

// Usage example
<GameHeader
  homeTeam="Warriors"
  awayTeam="Eagles"
  homeScore={7}
  awayScore={4}
  onBackClick={handleBack}
  onSettingsClick={handleSettings}
  showBackButton={true}
  aria-label="Game header: Warriors 7, Eagles 4"
/>
```

### RunnerAdjustmentModal Component

```typescript
interface RunnerPosition {
  playerId: string;
  playerName: string;
  jerseyNumber: string;
  currentBase: 'first' | 'second' | 'third' | 'home';
  possiblePositions: Array<{
    value: 'first' | 'second' | 'third' | 'home' | 'out';
    label: string;
    isDefault?: boolean;
  }>;
}

interface RunnerAdjustmentModalProps {
  // Modal state
  isOpen: boolean;
  onClose: () => void;

  // At-bat context
  batterName: string;
  atBatResult: string;

  // Runner data
  runners: RunnerPosition[];
  batterAdvancement: {
    to: 'first' | 'second' | 'third' | 'home';
    label: string;
  };

  // Actions
  onConfirm: (adjustments: Record<string, string>) => void;

  // State
  loading?: boolean;
}

// Usage example
<RunnerAdjustmentModal
  isOpen={true}
  onClose={handleClose}
  batterName="Sarah Johnson"
  atBatResult="SINGLE"
  runners={[
    {
      playerId: '1',
      playerName: 'Mike Chen',
      jerseyNumber: '8',
      currentBase: 'first',
      possiblePositions: [
        { value: 'first', label: 'Stays at 1st' },
        { value: 'second', label: 'Advances to 2nd', isDefault: true },
        { value: 'third', label: 'Advances to 3rd' },
        { value: 'home', label: 'Scores' },
        { value: 'out', label: 'Out at 2nd' }
      ]
    }
  ]}
  batterAdvancement={{ to: 'first', label: 'Goes to 1st Base' }}
  onConfirm={handleConfirm}
/>
```

---

## Templates

### GameRecordingLayout Component

```typescript
interface GameRecordingLayoutProps {
  // Header content
  header: React.ReactNode;

  // Main content areas
  gameStatus: React.ReactNode;
  basesDisplay: React.ReactNode;
  currentBatter: React.ReactNode;
  actionPanel: React.ReactNode;

  // Modal content
  modal?: React.ReactNode;

  // State
  loading?: boolean;
}

// Usage example
<GameRecordingLayout
  header={<GameHeader {...headerProps} />}
  gameStatus={<GameStatusBar {...statusProps} />}
  basesDisplay={<BasesDiamond {...basesProps} />}
  currentBatter={<CurrentBatterCard {...batterProps} />}
  actionPanel={<AtBatActionPanel {...actionProps} />}
  modal={showRunnerModal && <RunnerAdjustmentModal {...modalProps} />}
/>
```

#### Layout Specifications

- **Mobile-First**: Optimized for 375px width minimum
- **Thumb Zone**: Critical actions within bottom 120px
- **Header**: Fixed position, always visible
- **Content**: Scrollable if needed, but designed to fit viewport
- **Modal Overlay**: Proper z-index stacking and backdrop

---

## Component States & Variations

### Loading States

```typescript
// Skeleton loading for data-dependent components
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

<Skeleton width="100%" height="48px" />
<Skeleton width="60%" height="24px" />

// Loading buttons
<Button loading disabled>
  Recording...
</Button>
```

### Error States

```typescript
// Error boundary for components
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

<ErrorFallback
  error={error}
  resetError={() => window.location.reload()}
/>

// Form validation errors
<Input
  label="Team Name"
  value={teamName}
  onChange={setTeamName}
  error="Team name is required"
/>
```

### Empty States

```typescript
// No data states
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

<EmptyState
  icon={<GameIcon />}
  title="No Games Yet"
  description="Start your first game to begin recording stats"
  action={{
    label: "Start New Game",
    onClick: handleNewGame
  }}
/>
```

---

## Accessibility Implementation

### Screen Reader Support

```typescript
// Proper ARIA labels and descriptions
<Button
  aria-label="Record single hit by current batter"
  aria-describedby="batter-info"
>
  SINGLE
</Button>

<div id="batter-info" className="sr-only">
  Sarah Johnson, batting 4th, RF
</div>
```

### Keyboard Navigation

```typescript
// Custom hook for keyboard navigation
const useKeyboardNavigation = (onAction: (key: string) => void) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Implement keyboard shortcuts
      switch (e.key) {
        case '1':
          onAction('SINGLE');
          break;
        case '2':
          onAction('DOUBLE');
          break;
        case '3':
          onAction('TRIPLE');
          break;
        case 'h':
          onAction('HOME_RUN');
          break;
        case 'w':
          onAction('WALK');
          break;
        case 'o':
          onAction('OUT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onAction]);
};
```

### Focus Management

```typescript
// Focus management for modals
const useModalFocus = (isOpen: boolean) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  return modalRef;
};
```

---

## Performance Optimizations

### Memoization

```typescript
// Memoize expensive components
const MemoizedBasesDiamond = React.memo(
  BasesDiamond,
  (prevProps, nextProps) => {
    return JSON.stringify(prevProps.bases) === JSON.stringify(nextProps.bases);
  }
);

// Memoize callback handlers
const handleAtBatResult = useCallback(
  (result: AtBatResult) => {
    recordAtBat(result);
  },
  [recordAtBat]
);
```

### Lazy Loading

```typescript
// Lazy load heavy components
const StatsModal = lazy(() => import('./StatsModal'));
const SubstitutionModal = lazy(() => import('./SubstitutionModal'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <StatsModal isOpen={showStats} onClose={closeStats} />
</Suspense>
```

### Virtual Scrolling

```typescript
// For large lists (game history, player lists)
interface VirtualListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}

// Only render visible items for performance
```

---

## 🎉 Recent Additions - Phase 5 Performance & UX Enhancements

### New Shared Utilities

#### Performance Hook

- **File**:
  `/apps/web/src/features/game-core/model/hooks/usePerformanceOptimization.ts`
- **Purpose**: Centralized performance management with debouncing and memory
  monitoring
- **Features**: Configurable debounce delays, memory pressure detection, bundle
  optimization

#### Debounce Utility

- **File**: `/apps/web/src/shared/lib/utils/debounce.ts`
- **Purpose**: Prevent rapid-fire button clicks and optimize user interactions
- **Features**: Configurable delays, immediate execution option, proper cleanup

### Updated Components

#### GameRecordingPage Enhancements

- ✅ **Performance Optimization**: Integrated usePerformanceOptimization hook
- ✅ **Responsive UI**: Loading states and button feedback
- ✅ **Accessibility**: Enhanced ARIA labels and interactions
- ✅ **Error Prevention**: Debounced actions to prevent accidental double-clicks

#### GameStatsPage Integration

- ✅ **Data Connection**: Connected to game lineup for realistic statistics
- ✅ **User Experience**: Added notifications for upcoming features
- ✅ **Performance**: Optimized rendering and memory usage

### Development Commands Verified

```bash
# All commands tested and working as of Phase 5 completion
pnpm test                     # ✅ All tests passing (4,246 tests)
pnpm typecheck               # ✅ No TypeScript errors
pnpm lint                    # ✅ No ESLint violations
pnpm format:check            # ✅ Code properly formatted
pnpm --filter @twsoftball/web test  # ✅ Web layer tests passing
```

This component specification provides a complete blueprint for implementing all
UI components with proper TypeScript interfaces, accessibility considerations,
and performance optimizations. **Updated after Phase 5 completion with
enterprise-grade performance enhancements and UX polish.**
