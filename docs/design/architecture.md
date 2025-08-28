# Architecture Guide - DDD + Hexagonal + SOLID

## Overview

This project combines three complementary architectural patterns to create a
maintainable, testable, and extensible codebase:

- **Domain-Driven Design (DDD)**: Focus on business logic and domain modeling
- **Hexagonal Architecture (Ports & Adapters)**: Isolate domain from external
  concerns
- **SOLID Principles**: Ensure code quality and maintainability

## How They Work Together

```
┌───────────────────────────────────────────────────────┐
│                HEXAGONAL ARCHITECTURE                 │
│                                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │            DOMAIN LAYER (DDD)                  │   │
│  │                                                │   │
│  │  • Aggregates (Game)                           │   │
│  │  • Entities (TeamInGame, PlayerInGame)         │   │
│  │  • Value Objects (PlayerId, Score)             │   │
│  │  • Domain Events (GameStarted, AtBatRecorded)  │   │
│  │  • Domain Services (RBICalculator)             │   │
│  │                                                │   │
│  │  SOLID: Single Responsibility + Open/Closed    │   │
│  └────────────────────────────────────────────────┘   │
│                           ▲                           │
│                    No Dependencies                    │
│                           │                           │
│  ┌────────────────────────────────────────────────┐   │
│  │          APPLICATION LAYER (PORTS)             │   │
│  │                                                │   │
│  │  • Use Cases (RecordAtBatUseCase)              │   │
│  │  • Driving Ports (GameCommandService)          │   │
│  │  • Driven Ports (GameRepository, EventStore)   │   │
│  │                                                │   │
│  │  SOLID: Interface Segregation + Dep. Inversion │   │
│  └────────────────────────────────────────────────┘   │
│                           ▲                           │
│                    Implements Ports                   │
│                           │                           │
│  ┌──────────────┬─────────────────┬──────────────┐    │
│  │   ADAPTERS   │    ADAPTERS     │   ADAPTERS   │    │
│  │              │                 │              │    │
│  │   Web UI     │   IndexedDB     │   Console    │    │
│  │ (Controllers)│ (Repositories)  │  (Logger)    │    │
│  │              │                 │              │    │
│  │ SOLID: LSP   │   SOLID: LSP    │  SOLID: LSP  │    │
│  └──────────────┴─────────────────┴──────────────┘    │
└───────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Domain Layer (Pure Business Logic)

**DDD Concepts Applied:**

- **Aggregates**: Game is the only aggregate root
- **Entities**: Have identity, can change state
- **Value Objects**: Immutable, equality by value
- **Domain Events**: What happened in past tense
- **Domain Services**: Stateless business logic

**SOLID Principles Applied:**

- **S**: Each class has single responsibility
- **O**: Open for extension via inheritance/composition
- **L**: Implementations can be substituted
- **I**: Not applicable (no interfaces in domain)
- **D**: No dependencies on other layers

```typescript
// Example: Game aggregate follows SRP
class Game {
  // Single Responsibility: Manage game state
  recordAtBat(command: RecordAtBatCommand): void;
  substitutePlayer(command: SubstitutePlayerCommand): void;
  endInning(): void;

  // Open/Closed: Extensible via events
  private applyEvent(event: DomainEvent): void;
}

// Value Object with equality
class PlayerId {
  equals(other: PlayerId): boolean {
    return this.value === other.value; // Value equality
  }
}
```

### Application Layer (Use Cases + Ports)

**Hexagonal Concepts Applied:**

- **Driving Ports**: Interfaces for external systems to call us
- **Driven Ports**: Interfaces for external systems we depend on
- **Use Cases**: Application-specific business rules

**SOLID Principles Applied:**

- **I**: Interface Segregation - specific, focused interfaces
- **D**: Dependency Inversion - depend on abstractions

```typescript
// Driving Port (Interface Segregation)
interface GameCommandService {
  recordAtBat(command: RecordAtBatCommand): Promise<void>;
  substitutePlayer(command: SubstitutePlayerCommand): Promise<void>;
}

// Driven Port (Dependency Inversion)
interface GameRepository {
  findById(id: GameId): Promise<Game>;
  save(game: Game): Promise<void>;
}

// Use Case (Single Responsibility)
class RecordAtBatUseCase implements GameCommandService {
  constructor(
    private gameRepo: GameRepository, // Depends on abstraction
    private eventStore: EventStore // Not concrete implementation
  ) {}
}
```

### Infrastructure Layer (Adapters)

**Hexagonal Concepts Applied:**

- **Primary Adapters**: Drive the application (Web controllers)
- **Secondary Adapters**: Driven by application (Database repositories)

**SOLID Principles Applied:**

- **L**: Liskov Substitution - any adapter can replace another
- **S**: Single Responsibility - each adapter handles one concern

```typescript
// Primary Adapter (Web Controller)
class GameController {
  constructor(
    private recordAtBat: RecordAtBatUseCase // Uses application port
  ) {}

  async handleAtBatRequest(req: Request): Promise<Response> {
    // Single Responsibility: Handle HTTP concerns only
  }
}

// Secondary Adapter (Database Repository)
class IndexedDBGameRepository implements GameRepository {
  // Liskov Substitution: Can replace any GameRepository
  async findById(id: GameId): Promise<Game> {
    // Single Responsibility: IndexedDB persistence only
  }
}
```

## Event Sourcing Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Command       │    │   Domain        │    │   Event         │
│   Handler       │───▶│   Aggregate     │───▶│   Store         │
│   (Use Case)    │    │   (Game)        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐             │
         │              │  Domain Events   │             │
         │              │  (AtBatRecorded) │             │
         │              └──────────────────┘             │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                              ┌─────────────────┐
│   Read Model    │                              │   Undo/Redo     │
│   (Projections) │◀─────────────────────────────│   System        │
└─────────────────┘                              └─────────────────┘
```

### Read Models and CQRS Strategy

While [ADR-002](../adr/ADR-002-event-sourcing-pattern.md) notes that we have
deferred implementing a full CQRS (Command Query Responsibility Segregation)
pattern to avoid initial complexity, our architecture fully embraces its core
principle: separating the model used for writing data (commands) from the models
used for reading data (queries).

**The Write Model:**

- This is our event-sourced `Game` aggregate.
- It is optimized for consistency and enforcing business rules. It contains all
  the complex logic required to handle commands like `recordAtBat`.
- Querying aggregates directly for complex reads (e.g., "get all-time stats for
  a player") is inefficient, as it would require loading and replaying hundreds
  or thousands of events.

**The Read Model(s):**

- These are simple, denormalized data structures optimized for specific queries
  required by the UI. They are also known as **projections**.
- For example, we will create a `PlayerStats` read model that stores the
  aggregated statistics for each player.
- This read model is updated by an event handler that listens for relevant
  events (like `AtBatRecorded`). When an event occurs, the handler updates the
  `PlayerStats` table.
- When the UI needs to display player statistics, it makes a simple, fast query
  against this read model, providing excellent performance.

This approach gives us the transactional integrity of aggregates on the write
side and the high performance of dedicated read models on the read side, without
the need for a complex CQRS framework at this stage.

### Undo/Redo Implementation

```typescript
class EventStore {
  private events: DomainEvent[] = [];
  private currentPosition: number = -1;

  // Command pattern for undo/redo
  undo(): DomainEvent | null {
    if (this.currentPosition < 0) return null;
    return this.events[this.currentPosition--];
  }

  redo(): DomainEvent | null {
    if (this.currentPosition >= this.events.length - 1) return null;
    return this.events[++this.currentPosition];
  }
}

class Game {
  // State reconstruction from events
  static reconstitute(id: GameId, events: DomainEvent[]): Game {
    const game = Game.empty(id);
    events.forEach(event => game.applyEvent(event));
    return game;
  }
}
```

## Testing Strategy

### Domain Layer Testing (100% Pure)

```typescript
describe('Game', () => {
  it('should calculate RBI correctly for sacrifice fly', () => {
    // No mocks needed - pure domain logic
    const game = Game.create('Red Sox', 'Yankees');
    const result = game.recordAtBat({
      batterId: new PlayerId('williams'),
      result: AtBatResultType.SACRIFICE_FLY,
    });

    expect(result.rbi).toBe(1);
  });
});
```

### Application Layer Testing (Mock Ports)

```typescript
describe('RecordAtBatUseCase', () => {
  it('should save game after recording at-bat', async () => {
    const mockRepo = mock<GameRepository>();
    const useCase = new RecordAtBatUseCase(mockRepo, mockEventStore);

    await useCase.execute(command);

    verify(mockRepo.save(any())).once();
  });
});
```

### Infrastructure Layer Testing (Integration)

```typescript
describe('IndexedDBGameRepository', () => {
  it('should persist and retrieve game correctly', async () => {
    const repo = new IndexedDBGameRepository();
    const game = Game.create('Red Sox', 'Yankees');

    await repo.save(game);
    const retrieved = await repo.findById(game.getId());

    expect(retrieved.getScore()).toEqual(game.getScore());
  });
});
```

## Dependency Flow

```
Presentation Layer (Web UI)
         ↓ (calls)
Application Layer (Use Cases)
         ↓ (calls)
Domain Layer (Business Logic)
         ↑ (implements)
Application Layer (Ports)
         ↑ (implements)
Infrastructure Layer (Adapters)
```

**Key Rules:**

1. Dependencies always point inward
2. Inner layers never depend on outer layers
3. Domain has NO external dependencies
4. All dependencies are on interfaces, not implementations

## Benefits of This Architecture

### DDD Benefits

- **Business Focus**: Code reflects domain concepts
- **Rich Models**: Behavior lives with data
- **Ubiquitous Language**: Shared understanding
- **Event Sourcing**: Perfect audit trail + undo/redo

### Hexagonal Benefits

- **Testability**: Domain can be tested in isolation
- **Flexibility**: Swap databases/UIs without changing domain
- **Independence**: Domain doesn't know about frameworks
- **Clean Boundaries**: Clear separation of concerns

### SOLID Benefits

- **Maintainability**: Easy to modify and extend
- **Testability**: Each class has focused responsibility
- **Flexibility**: Implementations can be substituted
- **Quality**: Follows proven OOP principles

Together, these patterns create a codebase that is:

- ✅ Easy to test (no external dependencies in core)
- ✅ Easy to maintain (clear responsibilities)
- ✅ Easy to extend (open/closed principle)
- ✅ Business-focused (domain-driven design)
- ✅ Technology-agnostic (hexagonal boundaries)

## See Also

- **[ADR-001: DDD + Hexagonal Architecture + SOLID](../adr/ADR-001-ddd-hexagonal-solid.md)** -
  Architectural decision rationale
- **[Domain Model](domain-model.md)** - Detailed domain specification
- **[Event Sourcing Guide](event-sourcing.md)** - Event sourcing implementation
- **[API Contracts](api-contracts.md)** - Interface definitions for all layers
- **[Use Cases](use-cases.md)** - User stories and requirements
- **[Development Guide](../guides/development.md)** - Setup and workflow
  instructions
