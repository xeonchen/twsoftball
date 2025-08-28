# ADR-002: Adopt Event Sourcing Pattern

## Status

**Accepted** - Date: 2025-08-27

## Context

We're building a softball game recording application that needs to:

- Provide complete undo/redo functionality for all user actions
- Maintain a perfect audit trail of all game events
- Support offline-first operation with eventual consistency
- Enable time-travel debugging and replay capabilities
- Calculate derived statistics from historical game data
- Handle complex business rules around scoring, substitutions, and game state

Traditional CRUD (Create, Read, Update, Delete) approaches have significant
limitations for our use case:

1. **Lost History**: Updates overwrite previous state, losing valuable
   information
2. **Limited Undo**: Only current state is available, making undo/redo complex
3. **Audit Trail Gaps**: Changes aren't naturally tracked with full context
4. **Concurrency Issues**: Multiple users editing same state leads to conflicts
5. **Performance**: Complex aggregations require expensive joins and
   calculations

We evaluated several state management patterns:

1. **Traditional CRUD + Audit Log**: Dual-write complexity, consistency issues
2. **Command Pattern**: Good for undo/redo, but no persistence strategy
3. **Memento Pattern**: Memory-intensive, doesn't scale
4. **Event Sourcing**: Perfect fit for our requirements
5. **CQRS + Event Sourcing**: Overkill for current scope

## Decision

We will adopt **Event Sourcing** as our primary state persistence pattern for
the following reasons:

### Core Benefits for Softball Recording

#### 1. Perfect Undo/Redo Functionality

Event sourcing naturally provides undo/redo by maintaining the complete sequence
of events:

```typescript
class EventStore {
  private events: DomainEvent[] = [];
  private currentPosition: number = -1;

  undo(): DomainEvent | null {
    if (this.currentPosition < 0) return null;
    const event = this.events[this.currentPosition--];
    return this.createCompensatingEvent(event);
  }

  redo(): DomainEvent | null {
    if (this.currentPosition >= this.events.length - 1) return null;
    return this.events[++this.currentPosition];
  }
}
```

#### 2. Complete Audit Trail

Every action is stored as an immutable event with full context:

```typescript
class AtBatRecorded extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly runnerAdvances: RunnerAdvance[],
    readonly rbi: number,
    readonly baseSituation: BasesState,
    readonly timestamp: Date
  )
}
```

#### 3. Time-Travel and Replay

Reconstruct game state at any point in time:

```typescript
class Game {
  static reconstitute(id: GameId, events: DomainEvent[]): Game {
    const game = Game.empty(id);
    events.forEach(event => game.applyEvent(event));
    return game;
  }

  // Replay game up to specific event
  static replayToEvent(
    id: GameId,
    events: DomainEvent[],
    targetEventId: string
  ): Game {
    const relevantEvents = events.filter(e => e.eventId <= targetEventId);
    return this.reconstitute(id, relevantEvents);
  }
}
```

#### 4. Offline-First with Eventual Consistency

Events can be queued locally and synchronized later:

```typescript
class OfflineEventStore implements EventStore {
  private pendingEvents: DomainEvent[] = [];

  async append(events: DomainEvent[]): Promise<void> {
    // Store locally first
    this.pendingEvents.push(...events);
    await this.persistLocally(events);

    // Sync when online
    if (navigator.onLine) {
      await this.syncWithServer();
    }
  }
}
```

### Event Sourcing Implementation Strategy

#### Event Design Principles

1. **Past Tense Naming**: Events describe what happened (`AtBatRecorded`, not
   `RecordAtBat`)
2. **Immutable**: Events never change once created
3. **Self-Contained**: Include all context needed for processing
4. **Versioned**: Support schema evolution over time

```typescript
abstract class DomainEvent {
  readonly eventId: string = uuid();
  readonly timestamp: Date = new Date();
  readonly version: number = 1;
  abstract readonly type: string;
  abstract readonly aggregateId: GameId;
}
```

#### State Reconstruction

Current state is derived by replaying events in order:

```typescript
class GameState {
  apply(event: DomainEvent): GameState {
    switch (event.type) {
      case 'GameStarted':
        return this.applyGameStarted(event as GameStarted);
      case 'AtBatRecorded':
        return this.applyAtBatRecorded(event as AtBatRecorded);
      case 'InningEnded':
        return this.applyInningEnded(event as InningEnded);
      default:
        throw new UnknownEventTypeError(event.type);
    }
  }
}
```

#### Snapshot Strategy

To avoid performance issues with long event streams:

```typescript
interface GameSnapshot {
  gameId: GameId;
  version: number;
  state: GameState;
  lastEventId: string;
}

class SnapshotStore {
  private static readonly SNAPSHOT_FREQUENCY = 100;

  async saveSnapshotIfNeeded(game: Game, eventCount: number): Promise<void> {
    if (eventCount % SnapshotStore.SNAPSHOT_FREQUENCY === 0) {
      await this.saveSnapshot(game.createSnapshot());
    }
  }
}
```

## Alternatives Considered

### Alternative 1: Traditional CRUD + Audit Log

**Pros:**

- Familiar pattern
- Simple queries for current state
- Standard ORM support

**Cons:**

- Dual-write complexity (state + audit)
- Consistency issues between tables
- Limited undo/redo capabilities
- Performance overhead for audit queries

**Rejected:** Doesn't provide the audit trail and undo/redo capabilities we
need.

### Alternative 2: Command Pattern Only

**Pros:**

- Excellent undo/redo support
- Clear command/handler separation
- Testable command logic

**Cons:**

- No persistence strategy
- Commands lost on application restart
- No audit trail beyond memory
- Doesn't solve offline scenarios

**Rejected:** Lacks persistence and offline capabilities.

### Alternative 3: CQRS + Event Sourcing

**Pros:**

- Complete separation of reads and writes
- Optimized read models
- Scales to complex scenarios

**Cons:**

- Significant complexity overhead
- Multiple data stores to maintain
- Over-engineered for current scope
- Steep learning curve

**Rejected:** Too complex for current requirements. Can be added later if
needed.

### Alternative 4: Memento Pattern

**Pros:**

- Direct state snapshots
- Simple implementation
- Easy rollback to previous states

**Cons:**

- Memory intensive
- No fine-grained history
- Doesn't provide audit context
- Poor performance for frequent changes

**Rejected:** Doesn't scale and lacks detailed audit information.

## Implementation Details

### Event Store Interface

```typescript
interface EventStore {
  append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
  getEvents(streamId: GameId, fromVersion?: number): Promise<DomainEvent[]>;
  getSnapshot(streamId: GameId): Promise<GameSnapshot | null>;
  saveSnapshot(snapshot: GameSnapshot): Promise<void>;
}
```

### Event Stream Management

```typescript
class Game {
  private uncommittedEvents: DomainEvent[] = [];

  recordAtBat(command: RecordAtBatCommand): void {
    // Business logic validation
    this.validateAtBatCommand(command);

    // Create event
    const event = new AtBatRecorded(/* ... */);

    // Apply to current state
    this.applyEvent(event);

    // Track for persistence
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }
}
```

### Concurrency Control

Using optimistic concurrency with event versions:

```typescript
class OptimisticConcurrencyError extends Error {
  constructor(
    readonly streamId: GameId,
    readonly expectedVersion: number,
    readonly actualVersion: number
  ) {
    super(`Concurrency conflict for stream ${streamId}`);
  }
}

class IndexedDBEventStore implements EventStore {
  async append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    const currentVersion = await this.getCurrentVersion(streamId);

    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new OptimisticConcurrencyError(
        streamId,
        expectedVersion,
        currentVersion
      );
    }

    // Append events with incremented versions
    await this.persistEvents(streamId, events, currentVersion);
  }
}
```

## Consequences

### Positive

#### ✅ Perfect Undo/Redo Support

- Every action can be precisely undone or redone
- No loss of user work due to mistakes
- Enhanced user experience for game recording

#### ✅ Complete Audit Trail

- Full visibility into what happened and when
- Support for debugging and troubleshooting
- Compliance with any future audit requirements

#### ✅ Time-Travel Debugging

- Replay exact sequence that led to bugs
- Test different scenarios from historical states
- Enhanced development and testing capabilities

#### ✅ Offline-First Architecture

- Events queue locally when offline
- Automatic synchronization when online
- No data loss due to connectivity issues

#### ✅ Performance for Complex Queries

- Pre-computed projections from events
- Fast statistical calculations
- Optimized read models for specific use cases

#### ✅ Scalability

- Events are immutable (cache-friendly)
- Horizontal scaling of read models
- Clear separation of concerns

### Negative

#### ❌ Learning Curve

- Team needs to understand event sourcing concepts
- Different mindset from CRUD operations
- Requires careful event design

**Mitigation:**

- Comprehensive documentation and examples
- Start with simple events, add complexity gradually
- Pair programming during initial implementation

#### ❌ Storage Overhead

- All events must be preserved forever
- Storage grows linearly with usage
- No data deletion (only logical deletion via events)

**Mitigation:**

- Implement snapshotting to improve query performance
- Use compression for old events
- Consider archiving very old events if needed

#### ❌ Query Complexity

- No direct SQL queries on current state
- Must think in terms of event projections
- Complex queries require specialized read models

**Mitigation:**

- Implement common query patterns as projections
- Use CQRS for complex read scenarios if needed
- Provide helper methods for common state access

#### ❌ Event Schema Evolution

- Breaking changes to events affect entire history
- Must maintain backward compatibility
- Careful versioning strategy required

**Mitigation:**

- Include version field in all events
- Use event upcasting for schema migrations
- Design events to be additive when possible

### Risk Mitigation

**Risk:** Performance degradation with large event streams

- **Mitigation:** Implement snapshotting every 100 events
- **Monitoring:** Track event stream sizes and query performance

**Risk:** Storage costs from event accumulation

- **Mitigation:** Compress and archive old events
- **Monitoring:** Storage usage alerts and cleanup policies

**Risk:** Complexity in debugging distributed events

- **Mitigation:** Comprehensive logging and event tracing
- **Monitoring:** Event correlation IDs and timeline visualization

**Risk:** Data consistency across event boundaries

- **Mitigation:** Strong aggregate boundaries and transaction semantics
- **Monitoring:** Event ordering validation and consistency checks

## Compliance and Monitoring

### Success Metrics

- Undo/redo operations complete in <100ms
- Event storage overhead <2x equivalent CRUD storage
- 100% audit trail coverage for business operations
- Zero data loss during offline operations
- Event stream reconstruction time <500ms for typical games

### Architecture Tests

```typescript
describe('Event Sourcing Architecture', () => {
  it('should reconstruct identical state from events', () => {
    const events = [
      /* ... */
    ];
    const game1 = Game.reconstitute(gameId, events);
    const game2 = Game.reconstitute(gameId, events);
    expect(game1.getScore()).toEqual(game2.getScore());
  });

  it('should support undo/redo operations', () => {
    const game = Game.create(homeTeam, awayTeam);
    const initialState = game.getState();

    game.recordAtBat(atBatCommand);
    game.undo();

    expect(game.getState()).toEqual(initialState);
  });
});
```

### Monitoring Strategy

- Event append rates and latencies
- Snapshot creation frequency
- State reconstruction performance
- Storage usage patterns
- Concurrency conflict rates

## Migration Strategy

### Phase 1: Foundation (Current)

- ✅ Domain events defined
- ✅ Event sourcing in Game aggregate
- ✅ Basic event application logic

### Phase 2: Storage (Next)

- Implement IndexedDBEventStore
- Add snapshot support
- Build event versioning system

### Phase 3: Advanced Features

- Implement undo/redo UI
- Add event-based projections
- Build offline synchronization

### Phase 4: Optimization

- Performance tuning
- Storage optimization
- Advanced querying capabilities

## References

- [Event Sourcing by Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS by Greg Young](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Event Store Design Patterns](https://eventstore.com/blog/what-is-event-sourcing/)

---

**Decision made by**: Development Team  
**Review date**: 2025-09-27 (1 month) **Dependencies**: ADR-001 (DDD + Hexagonal
Architecture)
