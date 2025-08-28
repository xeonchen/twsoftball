# ADR-001: Adopt DDD + Hexagonal Architecture + SOLID Principles

## Status

**Accepted** - Date: 2025-08-27

## Context

We're building a softball game recording PWA that needs to:

- Support complex business rules (RBI calculation, mercy rules, substitutions)
- Provide undo/redo functionality for user actions
- Work offline with eventual network sync capability
- Be highly testable and maintainable
- Support future extensions (mobile apps, real-time collaboration)

We evaluated several architectural patterns:

1. **MVC Pattern**: Simple but leads to anemic domain models
2. **Layered Architecture**: Better separation but tight coupling
3. **Clean Architecture**: Good separation but complex setup
4. **Event Sourcing + CQRS**: Perfect for undo/redo but complex
5. **DDD + Hexagonal + SOLID**: Best of all worlds

## Decision

We will combine **Domain-Driven Design**, **Hexagonal Architecture**, and
**SOLID Principles** for the following reasons:

### Why DDD (Domain-Driven Design)?

**Benefits:**

- **Rich Domain Models**: Business logic lives with data (not in services)
- **Ubiquitous Language**: Shared terminology between developers and domain
  experts
- **Event Sourcing Support**: Natural fit for game recording with audit trail
- **Aggregate Boundaries**: Clear consistency boundaries around `Game`
- **Business Focus**: Code reflects real-world softball concepts

**Example:**

```typescript
// Rich domain model (not anemic)
class Game {
  recordAtBat(command: RecordAtBatCommand): void {
    // Business rules enforced here
    if (this.state.isGameOver()) {
      throw new GameAlreadyCompletedError();
    }

    const rbi = this.calculateRBI(command);
    const event = new AtBatRecorded(/*...*/);
    this.applyEvent(event);
  }
}
```

### Why Hexagonal Architecture?

**Benefits:**

- **Testability**: Domain can be tested without databases/frameworks
- **Technology Independence**: Easy to swap React → Vue, IndexedDB → SQLite
- **Clear Boundaries**: Explicit separation between business logic and
  infrastructure
- **Port & Adapter Pattern**: Interfaces define contracts

**Example:**

```typescript
// Domain never depends on infrastructure
class RecordAtBatUseCase {
  constructor(
    private gameRepo: GameRepository, // Port (interface)
    private eventStore: EventStore // Port (interface)
  ) {}
}

// Infrastructure implements the ports
class IndexedDBGameRepository implements GameRepository {
  // Adapter for specific technology
}
```

### Why SOLID Principles?

**Benefits:**

- **S (Single Responsibility)**: Each class has one reason to change
- **O (Open/Closed)**: Easy to extend without modifying existing code
- **L (Liskov Substitution)**: Can swap implementations seamlessly
- **I (Interface Segregation)**: Clients depend only on needed interfaces
- **D (Dependency Inversion)**: Depend on abstractions, not concretions

**Example:**

```typescript
// Single Responsibility
class RBICalculator {
  // Only responsible for RBI calculation logic
  static calculate(result: AtBatResultType, situation: BasesState): number;
}

// Dependency Inversion
class Game {
  constructor(
    private scoringRules: ScoringRules // Abstraction
  ) {}
}
```

## Alternatives Considered

### Alternative 1: Simple MVC

- **Pros**: Easy to understand, fast development
- **Cons**: Anemic domain models, business logic scattered in controllers
- **Rejected**: Doesn't handle complex softball rules well

### Alternative 2: Layered Architecture

- **Pros**: Clear separation, familiar pattern
- **Cons**: Tight coupling between layers, hard to test
- **Rejected**: Domain depends on infrastructure

### Alternative 3: Microservices

- **Pros**: High scalability, independent deployment
- **Cons**: Overkill for single-team app, complex coordination
- **Rejected**: Unnecessary complexity for current scope

## Implementation Strategy

### Phase 1: Domain Layer

```typescript
packages/domain/
├── aggregates/game/         # Game aggregate
├── value-objects/          # PlayerId, Score, etc.
├── events/                 # AtBatRecorded, GameStarted
├── services/               # RBICalculator, LineupValidator
└── specifications/         # MercyRuleSpec
```

### Phase 2: Application Layer

```typescript
packages/application/
├── ports/
│   ├── in/                # Use case interfaces
│   └── out/               # Repository interfaces
└── use-cases/             # RecordAtBatUseCase
```

### Phase 3: Infrastructure Layer

```typescript
packages/infrastructure/
├── persistence/           # IndexedDB repositories
├── web/                  # HTTP controllers
└── messaging/            # Event bus
```

## Consequences

### Positive

- ✅ **High Testability**: Domain can be tested without external dependencies
- ✅ **Maintainability**: Clear boundaries and single responsibilities
- ✅ **Extensibility**: Easy to add new features without breaking existing code
- ✅ **Technology Flexibility**: Can swap databases, frameworks, UI libraries
- ✅ **Business Alignment**: Code reflects domain concepts naturally
- ✅ **Event Sourcing Support**: Perfect foundation for undo/redo functionality

### Negative

- ❌ **Initial Complexity**: More setup than simple MVC
- ❌ **Learning Curve**: Team needs to understand DDD concepts
- ❌ **Over-engineering Risk**: May be overkill for very simple features

### Risks and Mitigation

**Risk**: Team unfamiliarity with DDD

- **Mitigation**: Create comprehensive documentation and examples

**Risk**: Over-engineering simple features

- **Mitigation**: Start with essential aggregates (Game only), add complexity as
  needed

**Risk**: Performance concerns with event sourcing

- **Mitigation**: Implement snapshots, measure performance, optimize as needed

## Compliance and Monitoring

### How to Validate Adherence

1. **Architecture Tests**: Verify dependency flow with ArchUnit-style tests
2. **Code Reviews**: Check for proper boundary separation
3. **Test Coverage**: Ensure domain has >90% coverage without mocks
4. **Documentation**: Keep domain glossary and aggregate maps updated

### Success Metrics

- Domain layer has zero external dependencies
- > 90% test coverage on domain layer
- Use cases have <10 lines of code (just orchestration)
- Can swap infrastructure adapters without changing application/domain

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://kalele.io/books/)
- [Hexagonal Architecture by Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html)

---

**Decision made by**: Development Team  
**Review date**: 2025-09-27 (1 month)
