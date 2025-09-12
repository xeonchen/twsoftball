# Testing Strategy - TW Softball

## Overview

This document defines our testing strategy for the TW Softball application, with
a focus on Test-Driven Development (TDD) and high coverage requirements for
domain-driven design with event sourcing.

## Testing Pyramid

```
    /\
   /  \        E2E Tests (5%)
  /    \       - User workflows
 /      \      - Cross-browser testing
/________\
/        \     Integration Tests (20%)
/          \   - Use case testing
/            \ - Repository testing
/______________\
/              \ Unit Tests (75%)
/                \ - Domain entities
/                  \ - Value objects
/____________________\ - Domain services
```

## Coverage Requirements by Layer

### Domain Layer (99%+ Coverage Target)

- **Entities**: 100% line coverage required
- **Value Objects**: 100% line coverage required
- **Domain Events**: 100% line coverage required
- **Domain Services**: 99%+ line coverage required
- **Aggregates**: 100% business logic coverage required

### Application Layer (90%+ Coverage Target)

- **Use Cases**: 95%+ coverage required
- **Command Handlers**: 90%+ coverage required
- **Query Handlers**: 85%+ coverage required
- **Application Services**: 90%+ coverage required

### Infrastructure Layer (80%+ Coverage Target)

- **Repositories**: 85%+ coverage required
- **Adapters**: 80%+ coverage required
- **External Integrations**: 75%+ coverage required

## TDD Workflow for Domain Layer

### Red-Green-Refactor Cycle

1. **Red**: Write a failing test

   ```bash
   pnpm --filter @twsoftball/domain test:watch
   ```

2. **Green**: Write minimal code to make it pass

   ```typescript
   // Example: Start with simplest implementation
   class GameId {
     constructor(readonly value: string) {
       if (!value) throw new Error('GameId cannot be empty');
     }
   }
   ```

3. **Refactor**: Improve the code while keeping tests green

   ```typescript
   // Refactor: Add validation, improve error messages
   class GameId {
     constructor(readonly value: string) {
       if (!value?.trim()) {
         throw new DomainError('GameId cannot be empty or whitespace');
       }
       if (value.length > 50) {
         throw new DomainError('GameId cannot exceed 50 characters');
       }
     }
   }
   ```

4. **Commit**: Commit with conventional commit message
   ```bash
   git commit -m "feat: implement GameId value object with validation"
   ```

## Testing Patterns for Event Sourcing

### Aggregate Testing Pattern

```typescript
describe('Game Aggregate', () => {
  let game: Game;

  beforeEach(() => {
    game = Game.create(
      new GameId('test-game'),
      'Home Team',
      'Away Team',
      TeamSide.HOME
    );
  });

  describe('recordAtBat', () => {
    it('should record single and advance batter', () => {
      // Arrange
      const command = new RecordAtBatCommand(
        game.getId(),
        new PlayerId('player-1'),
        AtBatResultType.SINGLE
      );

      // Act
      game.recordAtBat(command);

      // Assert
      const events = game.getUncommittedEvents();
      expect(events).toHaveLength(2); // GameStarted + AtBatRecorded

      const atBatEvent = events[1] as AtBatRecorded;
      expect(atBatEvent.result).toBe(AtBatResultType.SINGLE);
      expect(atBatEvent.rbi).toBe(0); // No runners on base
    });

    it('should calculate RBI correctly with runner on third', () => {
      // Arrange: Set up game state with runner on third
      game.recordAtBat(/* get runner on third */);
      game.markEventsAsCommitted();

      const command = new RecordAtBatCommand(
        game.getId(),
        new PlayerId('player-2'),
        AtBatResultType.SACRIFICE_FLY
      );

      // Act
      game.recordAtBat(command);

      // Assert
      const events = game.getUncommittedEvents();
      const atBatEvent = events[0] as AtBatRecorded;
      expect(atBatEvent.rbi).toBe(1); // Sacrifice fly scores runner
    });
  });
});
```

### Event Sourcing Reconstruction Testing

```typescript
describe('Game Event Sourcing', () => {
  it('should reconstruct identical state from events', () => {
    // Arrange: Create game with multiple events
    const originalGame = Game.create(gameId, 'Home', 'Away', TeamSide.HOME);
    originalGame.recordAtBat(atBatCommand1);
    originalGame.recordAtBat(atBatCommand2);
    originalGame.endInning();

    const events = originalGame.getUncommittedEvents();

    // Act: Reconstruct from events
    const reconstructedGame = Game.reconstitute(gameId, events);

    // Assert: States are identical
    expect(reconstructedGame.getScore()).toEqual(originalGame.getScore());
    expect(reconstructedGame.getCurrentInning()).toBe(
      originalGame.getCurrentInning()
    );
    expect(reconstructedGame.getOuts()).toBe(originalGame.getOuts());
  });

  it('should handle event stream with undo/redo', () => {
    // Test event stream manipulation
    const game = Game.create(gameId, 'Home', 'Away', TeamSide.HOME);
    const initialState = game.getState();

    // Record at-bat
    game.recordAtBat(atBatCommand);
    const afterAtBatState = game.getState();

    // Undo
    game.undo();
    expect(game.getState()).toEqual(initialState);

    // Redo
    game.redo();
    expect(game.getState()).toEqual(afterAtBatState);
  });
});
```

### Value Object Testing Pattern

```typescript
describe('Score Value Object', () => {
  describe('construction', () => {
    it('should create valid score', () => {
      const score = new Score(5);
      expect(score.runs).toBe(5);
    });

    it('should reject negative scores', () => {
      expect(() => new Score(-1)).toThrow(DomainError);
    });

    it('should reject non-integer scores', () => {
      expect(() => new Score(2.5)).toThrow(DomainError);
    });
  });

  describe('equality', () => {
    it('should be equal with same runs', () => {
      const score1 = new Score(3);
      const score2 = new Score(3);
      expect(score1.equals(score2)).toBe(true);
    });

    it('should not be equal with different runs', () => {
      const score1 = new Score(3);
      const score2 = new Score(4);
      expect(score1.equals(score2)).toBe(false);
    });
  });

  describe('operations', () => {
    it('should add runs correctly', () => {
      const score = new Score(2);
      const newScore = score.addRuns(3);

      expect(newScore.runs).toBe(5);
      expect(score.runs).toBe(2); // Original unchanged (immutable)
    });
  });
});
```

### Domain Service Testing Pattern

```typescript
describe('RBICalculator', () => {
  describe('calculate', () => {
    it('should award RBI for sacrifice fly with runner on third', () => {
      const basesState = new BasesState();
      basesState.putRunnerOn(Base.THIRD, new PlayerId('runner'));

      const runnerAdvances = [
        new RunnerAdvance(
          new PlayerId('runner'),
          Base.THIRD,
          'HOME',
          AdvanceReason.SACRIFICE_FLY
        ),
      ];

      const rbi = RBICalculator.calculate(
        AtBatResultType.SACRIFICE_FLY,
        runnerAdvances,
        basesState,
        2 // outs
      );

      expect(rbi).toBe(1);
    });

    it('should not award RBI for double play', () => {
      const basesState = new BasesState();
      basesState.putRunnerOn(Base.FIRST, new PlayerId('runner'));

      const runnerAdvances = [
        new RunnerAdvance(
          new PlayerId('runner'),
          Base.FIRST,
          'OUT',
          AdvanceReason.DOUBLE_PLAY
        ),
      ];

      const rbi = RBICalculator.calculate(
        AtBatResultType.DOUBLE_PLAY,
        runnerAdvances,
        basesState,
        0 // outs
      );

      expect(rbi).toBe(0); // No RBI on double play
    });
  });
});
```

## Test Organization

### File Naming Convention

- **Unit Tests**: `[entity-name].test.ts` (co-located with source)
- **Focused Test Modules**: `[entity-name].[focus-area].test.ts` for complex
  components
- **Integration Tests**: `[use-case-name].integration.test.ts`
- **E2E Tests**: `[feature-name].e2e.test.ts`

### Test Module Organization Patterns

For complex components with extensive test suites, we split tests into focused
modules:

#### Aggregate Test Organization

```
packages/domain/src/aggregates/
├── Game.ts
├── Game.core.test.ts              # Basic functionality and state management
├── Game.event-sourcing.test.ts    # Event creation and reconstruction
├── Game.validation.test.ts        # Input validation and business rules
├── InningState.ts
├── InningState.core.test.ts       # Core inning management
├── InningState.event-sourcing.test.ts
└── InningState.runner-management.test.ts  # Runner advancement logic
```

#### Service Test Organization

```
packages/domain/src/services/
├── GameCoordinator.ts
├── GameCoordinator.core.test.ts          # Basic coordination logic
├── GameCoordinator.complex-scenarios.test.ts  # Multi-step game scenarios
└── GameCoordinator.error-handling.test.ts     # Error conditions
```

#### Application Service Test Organization

```
packages/application/src/services/
├── EventSourcingService.ts
├── EventSourcingService.integrity.test.ts     # Data integrity and consistency
├── EventSourcingService.performance.test.ts   # Performance and scalability
├── EventSourcingService.queries.test.ts       # Query operations
├── EventSourcingService.reconstruction.test.ts # Event stream reconstruction
├── EventSourcingService.snapshots.test.ts     # Snapshot functionality
└── EventSourcingService.stream-management.test.ts # Stream operations
```

#### Use Case Test Organization

```
packages/application/src/use-cases/
├── StartNewGame.ts
├── StartNewGame.core.test.ts          # Happy path scenarios
├── StartNewGame.error-handling.test.ts # Error conditions and recovery
└── StartNewGame.validation.test.ts    # Input validation and constraints
```

### Directory Structure

```
packages/domain/src/
├── aggregates/
│   ├── Game.ts
│   ├── Game.core.test.ts
│   ├── Game.event-sourcing.test.ts
│   ├── Game.validation.test.ts
│   ├── InningState.ts
│   ├── InningState.core.test.ts
│   ├── InningState.event-sourcing.test.ts
│   └── InningState.runner-management.test.ts
├── value-objects/
│   ├── game-id.ts
│   ├── game-id.test.ts
│   ├── score.ts
│   └── score.test.ts
└── services/
    ├── GameCoordinator.ts
    ├── GameCoordinator.core.test.ts
    ├── GameCoordinator.complex-scenarios.test.ts
    └── GameCoordinator.error-handling.test.ts
```

### Test Module Focus Areas

#### Core Tests (`*.core.test.ts`)

- Primary functionality and business logic
- Basic state management and operations
- Most common use cases and scenarios

#### Event Sourcing Tests (`*.event-sourcing.test.ts`)

- Event creation and validation
- Aggregate reconstruction from events
- Event stream consistency and integrity

#### Validation Tests (`*.validation.test.ts`)

- Input validation and constraint checking
- Business rule enforcement
- Error conditions and edge cases

#### Error Handling Tests (`*.error-handling.test.ts`)

- Exception scenarios and recovery
- System boundary conditions
- Resilience and fault tolerance

#### Complex Scenarios Tests (`*.complex-scenarios.test.ts`)

- Multi-step workflows and processes
- Integration between multiple components
- End-to-end business scenarios

#### Performance Tests (`*.performance.test.ts`)

- Load testing and scalability
- Resource usage and optimization
- Response time and throughput metrics

This organization pattern improves test maintainability by grouping related test
cases and makes it easier to focus on specific aspects of functionality during
development and debugging.

## Test Commands

### Development Workflow

```bash
# Run tests in watch mode during development
pnpm --filter @twsoftball/domain test:watch

# Run all tests with coverage
pnpm --filter @twsoftball/domain test:coverage

# Run specific test file
pnpm --filter @twsoftball/domain test -- game.test.ts

# Run tests matching pattern
pnpm --filter @twsoftball/domain test -- --grep "should record at-bat"
```

### CI/CD Integration

```bash
# All tests must pass
pnpm test

# Coverage requirements enforced
pnpm test:coverage

# Architecture validation
pnpm deps:check
```

## Mock Strategy

### Domain Layer (No Mocks)

- Pure domain logic requires no mocking
- Use real value objects and entities in tests
- Test behavior, not implementation

### Application Layer (Mock Ports)

```typescript
const mockGameRepository = {
  findById: vi.fn(),
  save: vi.fn(),
} as GameRepository;

const mockEventStore = {
  append: vi.fn(),
  getEvents: vi.fn(),
} as EventStore;
```

### Infrastructure Layer (Integration Tests)

```typescript
// Use real IndexedDB with test database
const eventStore = new IndexedDBEventStore('test-db');
await eventStore.initialize();

// Clean up after tests
afterEach(async () => {
  await eventStore.clear();
});
```

## Performance Testing

### Event Sourcing Performance

- Measure aggregate reconstruction time
- Test with large event streams (1000+ events)
- Validate snapshot performance

### Target Metrics

- Aggregate reconstruction: <10ms for 100 events
- Event append: <5ms per event
- Query performance: <50ms for typical queries

## Common Testing Pitfalls to Avoid

1. **Testing Implementation Details**: Test behavior, not internal methods
2. **Tightly Coupled Tests**: Each test should be independent
3. **Over-Mocking**: Use real objects when possible in domain tests
4. **Weak Assertions**: Test specific outcomes, not just "no errors"
5. **Ignoring Edge Cases**: Test boundary conditions and error scenarios

## Quality Gates

### Pre-commit

- All tests must pass
- Coverage thresholds must be met
- No architecture violations

### Pull Request

- New code must include tests
- Coverage cannot decrease
- All quality checks pass

### Main Branch

- Full test suite runs
- E2E tests pass
- Performance benchmarks met

This testing strategy ensures high-quality, maintainable code that supports our
event-sourced, domain-driven architecture.

## See Also

- **[Development Guide](development.md)** - Setup and workflow
- **[Domain Model](../design/domain-model.md)** - Entities to test
- **[Event Sourcing Guide](../design/event-sourcing.md)** - Event sourcing
  patterns
- **[Architecture Guide](../design/architecture.md)** - Overall system design
