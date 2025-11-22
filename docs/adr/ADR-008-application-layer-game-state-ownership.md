# ADR-008: Application Layer Owns Complete Game State

## Status

**Accepted** - Date: 2025-10-17

## Context

During Phase 5.3 (Core Features) implementation, E2E tests revealed that the Web
layer UI had disabled action buttons because `currentBatter` was always `null`.
Investigation uncovered a fundamental architectural issue: **game application
state was split between Application layer and Web layer**, with no clear owner.

### Current State (Problematic)

```
Application Layer:
├── Use Cases return success/failure only
│   ├── StartNewGame → { success, gameId }
│   ├── RecordAtBat → { success, rbiAwarded }
│   └── EndInning → { success }
└── ❌ No complete game state returned

Web Layer (gameStore):
├── activeGameState {
│   currentBatter: Player | null  ← Web maintaining app state!
│   currentInning: number
│   outs: number
└── ❌ Web layer owns application state
```

**Problems:**

- Web layer maintains application state (violates Hexagonal Architecture)
- No single source of truth for game state
- Automatic batter selection never implemented (currentBatter always null)
- 12 E2E test failures (complete-seven-inning-game.spec.ts)

### What Triggered This

**User observation during architecture review:**

> "The core part (application layer) should be the owner of the data state. Web
> is UI/UX part and should be presenting the data, sending user decisions into
> the core."

This correct observation revealed that:

1. `GameStateDTO` already exists with `currentBatter` field
2. `StartNewGame.ts` already populates `currentBatter` correctly
3. **Web layer wasn't using the provided state!**

## Decision

**Application layer will return complete `GameStateDTO` (including
`currentBatter`) from all use cases. Web layer will consume and display this
state.**

### Why This is NOT UI-Specific Data

Initial analysis incorrectly labeled "currentBatter" as "UI-specific". This was
wrong:

```typescript
// ❌ WRONG ASSUMPTION: "currentBatter is UI data"
// ✅ CORRECT: "currentBatter is APPLICATION STATE"

// These ARE UI concerns (belong in Web layer):
{
  isModalOpen: boolean;
  selectedTab: 'lineup' | 'stats';
  loadingSpinner: boolean;
}

// These are APPLICATION/DOMAIN concerns:
{
  currentBatter: Player; // ← Who is batting? (domain concept!)
  score: {
    (home, away);
  }
  currentInning: number;
  outs: number;
}
```

**"Current batter" is a domain concept**, like score and outs. It belongs in
Application layer.

## Architecture Pattern

### Application Layer Responsibilities

```typescript
// packages/application/src/use-cases/StartNewGame.ts
async execute(command: StartNewGameCommand): Promise<GameStartResult> {
  // 1. Create aggregates
  const { game, homeLineup, awayLineup, inningState } = this.createAggregates(command);

  // 2. Persist
  await this.persist(game, homeLineup, awayLineup, inningState);

  // 3. Build complete game state (Application layer's job!)
  const initialState = this.buildGameStateDTO({
    game,
    homeLineup,
    awayLineup,
    inningState,
  });

  return {
    success: true,
    gameId: command.gameId,
    initialState, // ← Includes currentBatter!
  };
}

private buildGameStateDTO(...): GameStateDTO {
  // Query aggregates to build current state
  const battingTeamLineup = inningState.isTopHalf ? awayLineup : homeLineup;
  const battingSlot = inningState.isTopHalf
    ? inningState.awayBatterSlot
    : inningState.homeBatterSlot;

  const currentBatter = battingTeamLineup.getPlayerAtSlot(battingSlot);

  return {
    gameId: game.id,
    status: game.status,
    score: { home: 0, away: 0 },
    currentInning: inningState.inning,
    isTopHalf: inningState.isTopHalf,
    outs: inningState.outs,
    bases: {...},
    currentBatter, // ← Application layer provides this!
    homeLineup: {...},
    awayLineup: {...},
    lastUpdated: new Date(),
  };
}
```

### Web Layer Responsibilities (Thin Presentation)

```typescript
// apps/web/src/entities/game/model/gameUseCases.ts
const result = await applicationServices.startNewGame.execute(command);

if (result.success && result.initialState) {
  // Web layer just stores what Application provides
  setActiveGameState({
    currentInning: result.initialState.currentInning,
    isTopHalf: result.initialState.isTopHalf,
    currentBatter: result.initialState.currentBatter, // ← Just display it!
    bases: result.initialState.bases,
    outs: result.initialState.outs,
  });
}
```

## Alternatives Considered

### Alternative 1: Web Layer Hook (useAutomaticBatterSelection)

**Approach**: Create a React hook that watches game state and fetches current
batter.

```typescript
// apps/web/src/features/game-core/hooks/useAutomaticBatterSelection.ts
useEffect(() => {
  async function selectBatter() {
    const batter = await getBatterAtSlot(gameId, isTopHalf, currentSlot);
    setCurrentBatter(batter);
  }
  void selectBatter();
}, [gameId, currentInning, isTopHalf]);
```

**Pros:**

- ✅ Fast to implement (1-2 days)
- ✅ Uses React patterns (hooks, effects)
- ✅ Minimal files changed

**Cons:**

- ❌ Web layer maintains application state (architecture violation)
- ❌ Web layer knows about domain structure (InningState + TeamLineup)
- ❌ Extra network calls on every state change
- ❌ Logic scattered across UI layer

**Rejected**: Violates clean architecture by placing application logic in
presentation layer.

### Alternative 2: GameRecordingPage Component Logic

**Approach**: Component directly queries for current batter.

**Pros:**

- ✅ Simplest implementation
- ✅ Easy to debug

**Cons:**

- ❌ Component already 1,429 lines (too large!)
- ❌ Not reusable
- ❌ Violates Single Responsibility Principle
- ❌ FSD violation (page layer calling domain)

**Rejected**: Creates component bloat and architectural debt.

### Alternative 3: gameStore Automatic Selection

**Approach**: Zustand store auto-selects batter on state changes.

**Pros:**

- ✅ Centralized state management

**Cons:**

- ❌ Zustand not designed for async actions in setters
- ❌ FSD violation (entities importing infrastructure)
- ❌ Store depends on DI container
- ❌ Testing complexity

**Rejected**: Architectural violations and async complexity.

## Implementation

### Phase 1: Application Layer (Use Cases)

**Files Modified:**

1. `/packages/application/src/use-cases/RecordAtBat.ts` - Add
   `buildGameStateDTO()` helper
2. `/packages/application/src/use-cases/EndInning.ts` - Add
   `buildGameStateDTO()` helper
3. `/packages/application/src/use-cases/UndoLastAction.ts` - Return actual state
4. `/packages/application/src/use-cases/RedoLastAction.ts` - Return actual state

**Pattern:**

```typescript
private async buildGameStateDTO(gameId: GameId): Promise<GameStateDTO> {
  // 1. Load aggregates
  const game = await this.gameRepository.findById(gameId);
  const inningState = await this.inningStateRepository.findCurrentByGameId(gameId);
  const homeLineup = await this.teamLineupRepository.findByGameIdAndSide(gameId, 'HOME');
  const awayLineup = await this.teamLineupRepository.findByGameIdAndSide(gameId, 'AWAY');

  // 2. Determine current batter
  const battingSlot = inningState.isTopHalf
    ? inningState.awayBatterSlot
    : inningState.homeBatterSlot;
  const battingTeamLineup = inningState.isTopHalf ? awayLineup : homeLineup;
  const currentBatter = battingTeamLineup.getPlayerAtSlot(battingSlot);

  // 3. Build complete state
  return { gameId, status, score, currentBatter, ... };
}
```

### Phase 2: Web Layer (Consumption)

**Files Modified:**

1. `/apps/web/src/entities/game/model/gameUseCases.ts` - Consume GameStateDTO
2. `/apps/web/src/entities/game/model/gameStore.ts` - Update from Application
   results

**TODOs Removed:**

- ❌ `getCurrentBatter()` method (lines 373-383) - No longer needed
- ❌ `getNextBatter()` method (lines 389-399) - No longer needed

## Consequences

### Positive

- ✅ **Single Source of Truth**: Application layer owns application state
- ✅ **Clean Architecture**: Web layer is thin presentation (as it should be)
- ✅ **Consistency**: Every use case returns current game state
- ✅ **No State Sync Issues**: Web always has latest state from domain
- ✅ **Testability**: Clear boundaries between layers
- ✅ **Future-Proof**: Easy to add read models (CQRS) later

### Negative

- ❌ **Cross-Aggregate Queries**: Use cases load multiple aggregates
- ❌ **Performance**: 3+ repository calls per operation
- ❌ **Implementation Time**: 25 hours (3 days) vs. 12 hours for hook approach

### Technical Debt Acknowledged

**Cross-Aggregate Query Pattern** is a temporary solution:

- **Now**: Use cases query InningState + TeamLineup to get current batter
- **Future**: Implement CQRS read models (projected from events)
- **Migration Path**: Change `buildGameStateDTO()` implementation, Web layer
  unchanged

```typescript
// Future: CQRS Read Model
class CurrentGameViewProjection {
  async onHalfInningEnded(event: HalfInningEnded) {
    const nextBatter = this.getBatterFromLineup(...);
    await this.db.currentGameView.update({
      gameId: event.gameId,
      currentBatter: nextBatter, // ← Pre-computed!
    });
  }
}

// Use case becomes simpler:
private async buildGameStateDTO(gameId: GameId): Promise<GameStateDTO> {
  return await this.gameViewRepository.findByGameId(gameId); // ← One call!
}
```

## Compliance and Monitoring

### How to Validate Adherence

1. **All use cases return GameStateDTO** with `currentBatter` populated
2. **Web layer NEVER computes game state** - only displays Application results
3. **Test coverage** - buildGameStateDTO() has 90%+ coverage
4. **E2E tests pass** - All 252 tests (12 failures fixed)

### Success Metrics

- ✅ All use cases return complete GameStateDTO
- ✅ Web layer `activeGameState` syncs from Application results
- ✅ Zero TODOs for "get current batter" in Web layer
- ✅ E2E tests pass with automatic batter selection working

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Application Layer in DDD](https://enterprisecraftsmanship.com/posts/what-is-application-layer-in-ddd/)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- Issue: 12 E2E test failures in `complete-seven-inning-game.spec.ts`
- Related: ADR-001 (DDD + Hexagonal Architecture)
- Related: ADR-002 (Event Sourcing Pattern)

---

**Decision made by**: Development Team **Approved by**: Product Owner (after
architectural review) **Review date**: 2025-11-17 (1 month)
