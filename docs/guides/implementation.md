# Implementation Guide - TW Softball

## Overview

This guide provides step-by-step implementation instructions for each phase of
the TW Softball project, following our hexagonal architecture with domain-driven
design and event sourcing.

## Phase-by-Phase Implementation

### Phase 2: Domain Layer Implementation

**Status**: Ready to start - scaffolding complete, comprehensive specs written

#### Prerequisites

- [x] Project setup complete (Phase 0)
- [x] Documentation complete (Phase 1)
- [x] Testing strategy defined

#### Implementation Steps

##### Step 1: Value Objects (Week 1, Days 1-2)

**Order of Implementation** (dependencies flow):

1. `GameId`, `PlayerId`, `TeamId` (no dependencies)
2. `JerseyNumber` (validation rules)
3. `Score`, `GameScore` (scoring logic)

**Implementation Pattern**:

```typescript
// 1. Write failing test
describe('GameId', () => {
  it('should create valid game ID', () => {
    const gameId = new GameId('game-123');
    expect(gameId.value).toBe('game-123');
  });
});

// 2. Implement minimal version
export class GameId {
  constructor(readonly value: string) {
    if (!value) throw new DomainError('GameId cannot be empty');
  }
}

// 3. Add more tests and refine
```

**Commands**:

```bash
cd packages/domain
pnpm test:watch  # Keep running during development

# Create each value object file with co-located test
touch src/value-objects/game-id.ts
touch src/value-objects/game-id.test.ts
```

##### Step 2: Domain Events (Week 1, Days 3-4)

**Order of Implementation**:

1. Base `DomainEvent` class
2. `GameStarted` event (game creation)
3. `AtBatRecorded` event (most complex)
4. `InningEnded`, `GameCompleted` events

**Implementation Pattern**:

```typescript
// Start with base event
export abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly timestamp: Date = new Date();
  abstract readonly type: string;
  abstract readonly gameId: GameId;
}

// Then specific events
export class GameStarted extends DomainEvent {
  readonly type = 'GameStarted';

  constructor(
    readonly gameId: GameId,
    readonly homeTeamName: string,
    readonly awayTeamName: string,
    readonly ourTeamSide: TeamSide
  ) {
    super();
  }
}
```

##### Step 3: Entities (Week 1, Day 5 - Week 2, Day 2)

**Order of Implementation**:

1. `BasesState` (foundational for game state)
2. `PlayerInGame` (individual player data)
3. `TeamInGame` (collection of players)
4. `GameState` (combines everything)
5. `Game` (aggregate root)

**Critical**: Test event sourcing reconstruction for each entity:

```typescript
describe('Game Event Sourcing', () => {
  it('should reconstruct from events', () => {
    const events = [
      /* event sequence */
    ];
    const game = Game.reconstitute(gameId, events);
    expect(game.getScore()).toEqual(expectedScore);
  });
});
```

##### Step 4: Domain Services (Week 2, Days 3-4)

**Order of Implementation**:

1. `RBICalculator` (complex business rules)
2. `LineupValidator` (validation logic)
3. `StatisticsCalculator` (if needed)

##### Step 5: Integration and Refinement (Week 2, Day 5)

**Tasks**:

- Run full test suite: `pnpm --filter @twsoftball/domain test`
- Check coverage: `pnpm --filter @twsoftball/domain test:coverage`
- Validate architecture: `pnpm deps:check`
- Performance test event reconstruction with 100+ events

**Success Criteria**:

- [ ] 99%+ test coverage achieved
- [ ] All domain invariants enforced
- [ ] Event sourcing working correctly
- [ ] No architecture violations
- [ ] All business rules implemented per domain model

### Phase 3: Application Layer Implementation

**Prerequisites**:

- [x] Domain layer complete with 99%+ coverage
- [ ] Domain layer performance validated

#### Implementation Steps

##### Step 1: Port Definitions (Day 1)

**Files to Create**:

```
packages/application/src/ports/
├── in/
│   ├── game-command-service.ts
│   └── game-query-service.ts
└── out/
    ├── game-repository.ts
    ├── event-store.ts
    └── notification-service.ts
```

**Implementation Pattern**:

```typescript
// Define interfaces first, implement later
export interface GameCommandService {
  recordAtBat(command: RecordAtBatCommand): Promise<AtBatResult>;
  startNewGame(command: StartNewGameCommand): Promise<GameStartResult>;
}
```

##### Step 2: DTOs and Commands (Day 2)

**Create all data transfer objects**:

- Command DTOs (`RecordAtBatCommand`, `StartNewGameCommand`)
- Result DTOs (`AtBatResult`, `GameStateDTO`)
- Query DTOs (`GetCurrentGameStateQuery`)

##### Step 3: Use Cases Implementation (Days 3-4)

**Order of Implementation**:

1. `StartNewGameUseCase` (simpler, creates new aggregate)
2. `RecordAtBatUseCase` (more complex, modifies existing)
3. `UndoLastActionUseCase`, `RedoLastActionUseCase`
4. `SubstitutePlayerUseCase`, `EndGameUseCase`

**Testing Pattern**:

```typescript
describe('RecordAtBatUseCase', () => {
  it('should record at-bat and save game', async () => {
    // Arrange
    const mockRepo = mock<GameRepository>();
    const mockEventStore = mock<EventStore>();
    const useCase = new RecordAtBatUseCase(mockRepo, mockEventStore);

    // Act
    await useCase.execute(command);

    // Assert
    verify(mockRepo.save(any())).once();
    verify(mockEventStore.append(any(), any())).once();
  });
});
```

##### Step 4: Application Services (Day 5)

**Implementation**:

- `GameApplicationService` (coordinates use cases)
- `QueryHandlers` (for read operations)
- Error handling and validation

**Success Criteria**:

- [ ] 90%+ test coverage achieved
- [ ] All use cases implemented
- [ ] Ports properly defined
- [ ] Integration tests passing

### Phase 4: Infrastructure Layer Implementation

**Prerequisites**:

- [x] Application layer complete
- [x] Port interfaces defined

#### Implementation Steps

##### Step 1: In-Memory Adapters (Testing) (Days 1-2)

**Purpose**: Enable application layer testing and development

**Files to Create**:

```
packages/infrastructure/src/
├── repositories/
│   └── in-memory-game-repository.ts
├── event-stores/
│   └── in-memory-event-store.ts
└── testing/
    └── test-container.ts
```

##### Step 2: IndexedDB Adapters (Production) (Days 3-4)

**Files to Create**:

```
packages/infrastructure/src/
├── repositories/
│   └── indexeddb-game-repository.ts
├── event-stores/
│   └── indexeddb-event-store.ts
└── persistence/
    ├── schema.ts
    └── migrations.ts
```

**IndexedDB Schema**:

```typescript
interface EventStoreSchema {
  events: {
    eventId: string;
    streamId: string;
    version: number;
    eventType: string;
    eventData: string;
    timestamp: Date;
  };
  snapshots: {
    streamId: string;
    version: number;
    data: string;
    timestamp: Date;
  };
}
```

##### Step 3: Dependency Injection (Day 5)

**Create DI Container**:

```typescript
export class DIContainer {
  // Repositories
  private gameRepository: GameRepository;
  private eventStore: EventStore;

  // Use cases
  private recordAtBatUseCase: RecordAtBatUseCase;

  constructor(environment: 'development' | 'production' | 'test') {
    this.setupAdapters(environment);
    this.setupUseCases();
  }
}
```

**Success Criteria**:

- [ ] 80%+ test coverage achieved
- [ ] IndexedDB integration working
- [ ] In-memory adapters for testing
- [ ] DI container properly configured

### Phase 5: Web Application Implementation

**Prerequisites**:

- [x] Infrastructure layer complete
- [x] DI container configured

#### Implementation Steps

##### Step 1: Vite + React Setup (Days 1-2)

**Commands**:

```bash
cd apps/web
npm create vite@latest . -- --template react-ts
pnpm install
```

**Configure**:

- TypeScript with strict mode
- ESLint + Prettier alignment with monorepo
- Import paths to reference workspace packages

##### Step 2: Web Controllers/Adapters (Days 3-4)

**Create Primary Adapters**:

```
apps/web/src/adapters/
├── controllers/
│   ├── game-controller.ts
│   └── stats-controller.ts
├── presenters/
│   ├── game-presenter.ts
│   └── stats-presenter.ts
└── view-models/
    ├── game-view-model.ts
    └── player-view-model.ts
```

##### Step 3: React Components (Days 5-8)

**Component Hierarchy**:

```
src/components/
├── game/
│   ├── GameRecording.tsx
│   ├── ScoreBoard.tsx
│   ├── LineupManager.tsx
│   └── AtBatRecorder.tsx
├── shared/
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── LoadingSpinner.tsx
└── layout/
    ├── Header.tsx
    └── Navigation.tsx
```

##### Step 4: PWA Features (Days 9-10)

**PWA Implementation**:

- Service worker for offline functionality
- Web app manifest
- Install prompts
- Offline sync queue

**Success Criteria**:

- [ ] Game recording UI functional
- [ ] PWA features working
- [ ] Offline capability tested
- [ ] E2E tests passing

### Phase 6: Testing & Quality

**Continuous throughout all phases**

#### Quality Gates

**Domain Layer**:

- 99%+ test coverage
- No architecture violations
- Event sourcing reconstruction tests

**Application Layer**:

- 90%+ test coverage
- All use cases tested with mocks
- Integration tests for workflows

**Infrastructure Layer**:

- 80%+ test coverage
- IndexedDB integration tests
- Performance tests for event stores

**Web Layer**:

- Component testing with React Testing Library
- E2E tests with Playwright
- PWA functionality tests

### Phase 7: MVP Deployment

**Prerequisites**:

- [x] All layers implemented
- [x] Quality gates passed
- [x] E2E tests passing

#### Deployment Steps

1. **Build Configuration**:

   ```bash
   pnpm build  # Build all packages
   ```

2. **Static Site Deployment**:
   - Deploy to Vercel/Netlify/GitHub Pages
   - Configure PWA service worker
   - Set up custom domain

3. **Monitoring Setup**:
   - Error tracking (Sentry)
   - Performance monitoring
   - Usage analytics

## Development Best Practices

### Daily Workflow

1. **Start Development Session**:

   ```bash
   git pull origin main
   pnpm install  # Ensure dependencies are up to date
   pnpm test     # Verify everything works
   ```

2. **Feature Development** (TDD):

   ```bash
   # Run tests in watch mode for the package you're working on
   pnpm --filter @twsoftball/domain test:watch

   # Write failing test
   # Implement minimal code
   # Refactor and improve
   # Commit with conventional commit message
   ```

3. **End Development Session**:
   ```bash
   pnpm lint     # Check code quality
   pnpm typecheck # Check TypeScript
   pnpm deps:check # Check architecture
   git push      # Push changes
   ```

### Architecture Validation

**Before Every Commit**:

```bash
# These run automatically via husky pre-commit hook
pnpm lint                # Code style
pnpm format             # Formatting
pnpm typecheck          # TypeScript errors
pnpm test               # All tests pass
pnpm deps:check         # Architecture violations
```

### Performance Monitoring

**Domain Layer Performance**:

- Aggregate reconstruction should be <10ms for 100 events
- Event application should be <1ms per event

**Application Layer Performance**:

- Use case execution should be <50ms
- Query handling should be <100ms

**Infrastructure Performance**:

- IndexedDB operations should be <20ms
- Event store append should be <10ms

## Troubleshooting Common Issues

### "Module not found" Errors

```bash
rm -rf node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### TypeScript Compilation Issues

```bash
pnpm --filter @twsoftball/domain typecheck
# Fix issues in that specific package
```

### Architecture Violations

```bash
pnpm deps:check --output-type err-long
# Shows detailed violation information
```

### Test Coverage Issues

```bash
pnpm --filter @twsoftball/domain test:coverage
# Shows which lines are not covered
```

## Success Metrics by Phase

### Phase 2 (Domain)

- [ ] 99%+ test coverage
- [ ] All domain model entities implemented
- [ ] Event sourcing reconstruction working
- [ ] Business rules enforced

### Phase 3 (Application)

- [ ] 90%+ test coverage
- [ ] All use cases implemented
- [ ] Port interfaces defined
- [ ] Integration tests passing

### Phase 4 (Infrastructure)

- [ ] 80%+ test coverage
- [ ] IndexedDB persistence working
- [ ] In-memory testing adapters
- [ ] DI container configured

### Phase 5 (Web)

- [ ] Game recording UI functional
- [ ] PWA features implemented
- [ ] Offline functionality working
- [ ] E2E tests covering happy paths

### Phase 7 (Deployment)

- [ ] Application deployed and accessible
- [ ] PWA installation working
- [ ] Performance metrics within targets
- [ ] Error monitoring active

This implementation guide ensures systematic progress through each phase while
maintaining architectural integrity and quality standards.

## See Also

- **[Development Guide](development.md)** - Daily development workflow
- **[Testing Strategy](testing-strategy.md)** - Detailed testing patterns
- **[Architecture Guide](../design/architecture.md)** - Architectural principles
- **[Domain Model](../design/domain-model.md)** - What to implement
- **[Event Sourcing Guide](../design/event-sourcing.md)** - Technical patterns
