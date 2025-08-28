# Event Sourcing Implementation Guide

> **Note**: This document describes the planned Event Sourcing implementation.
> The domain layer using these patterns is not yet implemented (Phase 2). This
> serves as the technical specification for development.

## Overview

Event Sourcing is our primary persistence pattern, where all changes to
application state are stored as a sequence of immutable events. Current state is
derived by replaying events from the beginning of time (or from a snapshot).

This guide provides the technical implementation details for our Event Sourcing
system, complementing the architectural decisions documented in
[ADR-002](../adr/ADR-002-event-sourcing-pattern.md).

## Core Concepts

### Events vs Commands vs Queries

```typescript
// Command: Intent to change state (imperative)
interface RecordAtBatCommand {
  gameId: GameId;
  batterId: PlayerId;
  result: AtBatResultType;
  timestamp: Date;
}

// Event: What actually happened (past tense)
class AtBatRecorded extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly runnerAdvances: RunnerAdvance[],
    readonly rbi: number,
    readonly newScore: GameScore,
    readonly basesAfter: BasesState
  ) {
    super(gameId);
  }
}

// Query: Request for current state (interrogative)
interface GetCurrentGameStateQuery {
  gameId: GameId;
  asOfTimestamp?: Date;
}
```

### Event Design Principles

#### 1. Events Are Immutable

Once created and persisted, events never change:

```typescript
abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly timestamp: Date = new Date();
  readonly version: number = 1;
  abstract readonly type: string;
  abstract readonly gameId: GameId;

  // No setters - object is immutable after construction
}
```

#### 2. Events Are Self-Contained

Each event contains all information needed for processing:

```typescript
class AtBatRecorded extends DomainEvent {
  readonly type = 'AtBatRecorded';

  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly runnerAdvances: RunnerAdvance[],
    readonly rbi: number,
    readonly inning: number,
    readonly outs: number,
    readonly basesStateBefore: BasesState,
    readonly basesStateAfter: BasesState,
    readonly scoreBefore: GameScore,
    readonly scoreAfter: GameScore
  ) {
    super();
    this.gameId = gameId;
  }
}
```

#### 3. Events Use Past-Tense Naming

Events describe what happened, not what should happen:

```typescript
// ✅ Good - Past tense, describes what happened
class GameStarted extends DomainEvent {}
class AtBatRecorded extends DomainEvent {}
class PlayerSubstituted extends DomainEvent {}
class InningEnded extends DomainEvent {}
class GameCompleted extends DomainEvent {}

// ❌ Bad - Present/future tense, sounds like commands
class StartGame extends DomainEvent {}
class RecordAtBat extends DomainEvent {}
class SubstitutePlayer extends DomainEvent {}
```

## Event Store Architecture

### Event Store Interface

```typescript
interface EventStore {
  // Core operations
  append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
  getEvents(streamId: GameId, fromVersion?: number): Promise<StoredEvent[]>;

  // Snapshot support
  saveSnapshot(streamId: GameId, snapshot: AggregateSnapshot): Promise<void>;
  getSnapshot(streamId: GameId): Promise<AggregateSnapshot | null>;

  // Querying
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;
  getEventsByType(eventType: string): Promise<StoredEvent[]>;
}

interface StoredEvent {
  eventId: string;
  streamId: GameId;
  version: number;
  eventType: string;
  eventData: any;
  metadata: EventMetadata;
  timestamp: Date;
}

interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}
```

### IndexedDB Implementation

```typescript
class IndexedDBEventStore implements EventStore {
  private db: IDBDatabase;
  private static readonly DB_NAME = 'twsoftball-events';
  private static readonly DB_VERSION = 1;
  private static readonly EVENTS_STORE = 'events';
  private static readonly SNAPSHOTS_STORE = 'snapshots';

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        IndexedDBEventStore.DB_NAME,
        IndexedDBEventStore.DB_VERSION
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Events store
        const eventsStore = db.createObjectStore(
          IndexedDBEventStore.EVENTS_STORE,
          {
            keyPath: 'eventId',
          }
        );
        eventsStore.createIndex('streamId', 'streamId', { unique: false });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventsStore.createIndex('eventType', 'eventType', { unique: false });

        // Snapshots store
        const snapshotsStore = db.createObjectStore(
          IndexedDBEventStore.SNAPSHOTS_STORE,
          {
            keyPath: 'streamId',
          }
        );
      };
    });
  }

  async append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    const transaction = this.db.transaction(
      [IndexedDBEventStore.EVENTS_STORE],
      'readwrite'
    );
    const store = transaction.objectStore(IndexedDBEventStore.EVENTS_STORE);

    // Check optimistic concurrency
    if (expectedVersion !== undefined) {
      const currentVersion = await this.getCurrentVersion(streamId);
      if (currentVersion !== expectedVersion) {
        throw new OptimisticConcurrencyError(
          streamId,
          expectedVersion,
          currentVersion
        );
      }
    }

    // Store events
    let version = expectedVersion ?? (await this.getCurrentVersion(streamId));
    const storedEvents: StoredEvent[] = events.map(event => ({
      eventId: event.eventId,
      streamId: streamId,
      version: ++version,
      eventType: event.type,
      eventData: this.serialize(event),
      metadata: this.extractMetadata(),
      timestamp: event.timestamp,
    }));

    for (const storedEvent of storedEvents) {
      await new Promise((resolve, reject) => {
        const request = store.add(storedEvent);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getEvents(streamId: GameId, fromVersion = 0): Promise<StoredEvent[]> {
    const transaction = this.db.transaction(
      [IndexedDBEventStore.EVENTS_STORE],
      'readonly'
    );
    const store = transaction.objectStore(IndexedDBEventStore.EVENTS_STORE);
    const index = store.index('streamId');

    const events: StoredEvent[] = [];

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(streamId.value));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const storedEvent = cursor.value as StoredEvent;
          if (storedEvent.version > fromVersion) {
            events.push(storedEvent);
          }
          cursor.continue();
        } else {
          // Sort by version to ensure correct order
          events.sort((a, b) => a.version - b.version);
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getCurrentVersion(streamId: GameId): Promise<number> {
    const events = await this.getEvents(streamId);
    return events.length > 0 ? Math.max(...events.map(e => e.version)) : 0;
  }

  private serialize(event: DomainEvent): any {
    return JSON.stringify(event);
  }

  private extractMetadata(): EventMetadata {
    return {
      correlationId: crypto.randomUUID(),
      userAgent: navigator.userAgent,
      timestamp: new Date(),
    };
  }
}
```

### In-Memory Event Store (Testing)

```typescript
class InMemoryEventStore implements EventStore {
  private events: Map<string, StoredEvent[]> = new Map();
  private snapshots: Map<string, AggregateSnapshot> = new Map();

  async append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    const streamKey = streamId.value;
    const existingEvents = this.events.get(streamKey) ?? [];

    // Optimistic concurrency check
    if (
      expectedVersion !== undefined &&
      existingEvents.length !== expectedVersion
    ) {
      throw new OptimisticConcurrencyError(
        streamId,
        expectedVersion,
        existingEvents.length
      );
    }

    // Create stored events
    let version = existingEvents.length;
    const storedEvents = events.map(event => ({
      eventId: event.eventId,
      streamId: streamId,
      version: ++version,
      eventType: event.type,
      eventData: event,
      metadata: {
        correlationId: crypto.randomUUID(),
        timestamp: new Date(),
      },
      timestamp: event.timestamp,
    }));

    this.events.set(streamKey, [...existingEvents, ...storedEvents]);
  }

  async getEvents(streamId: GameId, fromVersion = 0): Promise<StoredEvent[]> {
    const events = this.events.get(streamId.value) ?? [];
    return events.filter(e => e.version > fromVersion);
  }

  async saveSnapshot(
    streamId: GameId,
    snapshot: AggregateSnapshot
  ): Promise<void> {
    this.snapshots.set(streamId.value, snapshot);
  }

  async getSnapshot(streamId: GameId): Promise<AggregateSnapshot | null> {
    return this.snapshots.get(streamId.value) ?? null;
  }

  // Testing utilities
  clear(): void {
    this.events.clear();
    this.snapshots.clear();
  }

  getEventCount(streamId?: GameId): number {
    if (streamId) {
      return this.events.get(streamId.value)?.length ?? 0;
    }
    return Array.from(this.events.values()).reduce(
      (total, events) => total + events.length,
      0
    );
  }
}
```

## Aggregate Event Sourcing

### Event Sourced Aggregate Pattern

```typescript
abstract class EventSourcedAggregate {
  protected id: GameId;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  constructor(id: GameId) {
    this.id = id;
  }

  // State reconstruction from events
  static reconstitute<T extends EventSourcedAggregate>(
    id: GameId,
    events: StoredEvent[],
    createEmpty: (id: GameId) => T
  ): T {
    const aggregate = createEmpty(id);

    events.forEach(storedEvent => {
      const event = this.deserializeEvent(storedEvent);
      aggregate.applyEvent(event);
      aggregate.version = storedEvent.version;
    });

    return aggregate;
  }

  // Apply event to current state
  protected applyEvent(event: DomainEvent): void {
    this.when(event);
    this.uncommittedEvents.push(event);
  }

  // Event application logic (override in concrete aggregates)
  protected abstract when(event: DomainEvent): void;

  // Event sourcing housekeeping
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  getVersion(): number {
    return this.version;
  }

  getId(): GameId {
    return this.id;
  }

  private static deserializeEvent(storedEvent: StoredEvent): DomainEvent {
    // Event deserialization logic
    const EventClass = EVENT_TYPE_REGISTRY[storedEvent.eventType];
    return new EventClass(...storedEvent.eventData);
  }
}
```

### Game Aggregate Implementation

```typescript
class Game extends EventSourcedAggregate {
  private state: GameState;

  private constructor(id: GameId, state?: GameState) {
    super(id);
    this.state = state ?? GameState.initial();
  }

  // Factory methods
  static create(
    id: GameId,
    homeTeamName: string,
    awayTeamName: string,
    ourTeamSide: TeamSide
  ): Game {
    const game = new Game(id);
    const event = new GameStarted(
      id,
      homeTeamName,
      awayTeamName,
      ourTeamSide,
      new Date()
    );
    game.applyEvent(event);
    return game;
  }

  static reconstitute(id: GameId, events: StoredEvent[]): Game {
    return super.reconstitute(id, events, id => new Game(id));
  }

  // Commands (business logic)
  recordAtBat(command: RecordAtBatCommand): void {
    // Business rule validations
    if (this.state.status === GameStatus.COMPLETED) {
      throw new GameAlreadyCompletedError();
    }

    if (this.state.outs >= 3) {
      throw new TooManyOutsError();
    }

    // Calculate derived data
    const runnerAdvances = this.calculateRunnerAdvances(command.result);
    const rbi = RBICalculator.calculate(
      command.result,
      runnerAdvances,
      this.state.bases,
      this.state.outs
    );
    const newScore = this.calculateNewScore(runnerAdvances);

    // Create and apply event
    const event = new AtBatRecorded(
      this.id,
      command.batterId,
      command.result,
      runnerAdvances,
      rbi,
      this.state.inning,
      this.state.outs,
      this.state.bases.clone(),
      this.calculateBasesAfter(runnerAdvances),
      this.state.score.clone(),
      newScore
    );

    this.applyEvent(event);
  }

  // Event application
  protected when(event: DomainEvent): void {
    switch (event.type) {
      case 'GameStarted':
        this.whenGameStarted(event as GameStarted);
        break;
      case 'AtBatRecorded':
        this.whenAtBatRecorded(event as AtBatRecorded);
        break;
      case 'InningEnded':
        this.whenInningEnded(event as InningEnded);
        break;
      case 'GameCompleted':
        this.whenGameCompleted(event as GameCompleted);
        break;
      default:
        throw new UnknownEventTypeError(event.type);
    }
  }

  private whenGameStarted(event: GameStarted): void {
    this.state = GameState.create(
      event.homeTeamName,
      event.awayTeamName,
      event.ourTeamSide
    );
  }

  private whenAtBatRecorded(event: AtBatRecorded): void {
    this.state = this.state
      .advanceRunners(event.runnerAdvances)
      .updateScore(event.scoreAfter)
      .updateBases(event.basesStateAfter)
      .addAtBatToHistory(event.batterId, event.result, event.rbi);
  }

  // Queries
  getScore(): GameScore {
    return this.state.score;
  }

  getCurrentBatter(): PlayerId {
    return this.state.currentBatter;
  }

  isGameOver(): boolean {
    return this.state.status === GameStatus.COMPLETED;
  }

  // Helper methods
  private calculateRunnerAdvances(result: AtBatResultType): RunnerAdvance[] {
    // Complex business logic for determining how runners advance
    // Based on hit type, current bases situation, etc.
  }

  private calculateNewScore(advances: RunnerAdvance[]): GameScore {
    const runsScored = advances.filter(advance => advance.to === 'HOME').length;
    return this.state.score.addRuns(this.state.battingTeam, runsScored);
  }
}
```

## Snapshotting Strategy

### When to Create Snapshots

```typescript
interface SnapshotStore {
  saveSnapshot(streamId: GameId, snapshot: AggregateSnapshot): Promise<void>;
  getSnapshot(streamId: GameId): Promise<AggregateSnapshot | null>;
}

interface AggregateSnapshot {
  aggregateId: GameId;
  aggregateType: string;
  version: number;
  data: any;
  timestamp: Date;
}

class SnapshotManager {
  private static readonly SNAPSHOT_FREQUENCY = 100; // Every 100 events

  constructor(
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore
  ) {}

  async shouldCreateSnapshot(streamId: GameId): Promise<boolean> {
    const events = await this.eventStore.getEvents(streamId);
    const lastSnapshot = await this.snapshotStore.getSnapshot(streamId);

    const eventsSinceSnapshot = lastSnapshot
      ? events.filter(e => e.version > lastSnapshot.version).length
      : events.length;

    return eventsSinceSnapshot >= SnapshotManager.SNAPSHOT_FREQUENCY;
  }

  async createSnapshot(aggregate: EventSourcedAggregate): Promise<void> {
    const snapshot: AggregateSnapshot = {
      aggregateId: aggregate.getId(),
      aggregateType: aggregate.constructor.name,
      version: aggregate.getVersion(),
      data: this.serializeAggregate(aggregate),
      timestamp: new Date(),
    };

    await this.snapshotStore.saveSnapshot(aggregate.getId(), snapshot);
  }

  async loadAggregate(id: GameId): Promise<Game> {
    const snapshot = await this.snapshotStore.getSnapshot(id);

    if (snapshot) {
      // Reconstruct from snapshot + subsequent events
      const events = await this.eventStore.getEvents(id, snapshot.version);
      const game = this.deserializeAggregate(snapshot);

      events.forEach(storedEvent => {
        const event = this.deserializeEvent(storedEvent);
        game.applyEvent(event);
      });

      return game;
    } else {
      // Reconstruct from all events
      const events = await this.eventStore.getEvents(id);
      return Game.reconstitute(id, events);
    }
  }
}
```

### Game State Snapshot

```typescript
class GameSnapshot implements AggregateSnapshot {
  constructor(
    readonly aggregateId: GameId,
    readonly aggregateType: string,
    readonly version: number,
    readonly gameState: GameState,
    readonly timestamp: Date = new Date()
  ) {}

  get data(): any {
    return {
      state: this.gameState.serialize(),
      metadata: {
        snapshotVersion: 1,
        createdAt: this.timestamp,
      },
    };
  }

  static fromGame(game: Game): GameSnapshot {
    return new GameSnapshot(
      game.getId(),
      'Game',
      game.getVersion(),
      game.getState()
    );
  }
}
```

## Undo/Redo Implementation

### Command Pattern for Undo/Redo

```typescript
interface UndoRedoManager {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): Promise<void>;
  redo(): Promise<void>;
  executeCommand(command: GameCommand): Promise<void>;
}

class EventSourcingUndoRedoManager implements UndoRedoManager {
  private commandHistory: GameCommand[] = [];
  private currentPosition: number = -1;

  constructor(
    private game: Game,
    private eventStore: EventStore
  ) {}

  async executeCommand(command: GameCommand): Promise<void> {
    // Execute the command
    await this.applyCommand(command);

    // Add to history and update position
    this.commandHistory = this.commandHistory.slice(
      0,
      this.currentPosition + 1
    );
    this.commandHistory.push(command);
    this.currentPosition = this.commandHistory.length - 1;

    // Persist events
    const uncommittedEvents = this.game.getUncommittedEvents();
    await this.eventStore.append(
      this.game.getId(),
      uncommittedEvents,
      this.game.getVersion()
    );
    this.game.markEventsAsCommitted();
  }

  async undo(): Promise<void> {
    if (!this.canUndo()) {
      throw new CannotUndoError();
    }

    this.currentPosition--;
    await this.reconstructGameState();
  }

  async redo(): Promise<void> {
    if (!this.canRedo()) {
      throw new CannotRedoError();
    }

    this.currentPosition++;
    await this.reconstructGameState();
  }

  canUndo(): boolean {
    return this.currentPosition >= 0;
  }

  canRedo(): boolean {
    return this.currentPosition < this.commandHistory.length - 1;
  }

  private async reconstructGameState(): Promise<void> {
    // Get all events up to current position
    const allEvents = await this.eventStore.getEvents(this.game.getId());
    const relevantCommands = this.commandHistory.slice(
      0,
      this.currentPosition + 1
    );

    // Reconstruct game by replaying commands
    const gameId = this.game.getId();
    this.game = Game.create(gameId /* initial params */);

    for (const command of relevantCommands) {
      await this.applyCommand(command);
    }
  }

  private async applyCommand(command: GameCommand): Promise<void> {
    switch (command.type) {
      case 'RecordAtBat':
        this.game.recordAtBat(command as RecordAtBatCommand);
        break;
      case 'SubstitutePlayer':
        this.game.substitutePlayer(command as SubstitutePlayerCommand);
        break;
      // ... other commands
    }
  }
}
```

### Alternative: Event-Based Undo/Redo

```typescript
class EventBasedUndoRedoManager implements UndoRedoManager {
  private eventHistory: StoredEvent[] = [];
  private currentEventIndex: number = -1;

  constructor(
    private gameId: GameId,
    private eventStore: EventStore
  ) {}

  async initialize(): Promise<void> {
    this.eventHistory = await this.eventStore.getEvents(this.gameId);
    this.currentEventIndex = this.eventHistory.length - 1;
  }

  async undo(): Promise<Game> {
    if (this.currentEventIndex < 0) {
      throw new CannotUndoError();
    }

    this.currentEventIndex--;
    return this.reconstructGame();
  }

  async redo(): Promise<Game> {
    if (this.currentEventIndex >= this.eventHistory.length - 1) {
      throw new CannotRedoError();
    }

    this.currentEventIndex++;
    return this.reconstructGame();
  }

  private reconstructGame(): Game {
    const eventsToApply = this.eventHistory.slice(
      0,
      this.currentEventIndex + 1
    );
    return Game.reconstitute(this.gameId, eventsToApply);
  }
}
```

## Event Versioning and Schema Evolution

### Event Schema Versioning

```typescript
abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly timestamp: Date = new Date();
  readonly version: number; // Schema version, not aggregate version
  abstract readonly type: string;
  abstract readonly gameId: GameId;

  constructor(version: number = 1) {
    this.version = version;
  }
}

// Version 1
class AtBatRecordedV1 extends DomainEvent {
  readonly type = 'AtBatRecorded';

  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType
  ) {
    super(1);
    this.gameId = gameId;
  }
}

// Version 2 - Added RBI calculation
class AtBatRecordedV2 extends DomainEvent {
  readonly type = 'AtBatRecorded';

  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly rbi: number // New field
  ) {
    super(2);
    this.gameId = gameId;
  }
}
```

### Event Upcasting

```typescript
interface EventUpcaster {
  canUpcast(storedEvent: StoredEvent): boolean;
  upcast(storedEvent: StoredEvent): StoredEvent;
}

class AtBatRecordedUpcaster implements EventUpcaster {
  canUpcast(storedEvent: StoredEvent): boolean {
    return (
      storedEvent.eventType === 'AtBatRecorded' &&
      storedEvent.eventData.version === 1
    );
  }

  upcast(storedEvent: StoredEvent): StoredEvent {
    const v1Data = storedEvent.eventData;

    // Calculate RBI based on v1 data + business rules
    const rbi = this.calculateRBIFromV1Data(v1Data);

    return {
      ...storedEvent,
      eventData: {
        ...v1Data,
        rbi,
        version: 2,
      },
    };
  }

  private calculateRBIFromV1Data(v1Data: any): number {
    // Business logic to derive RBI from original event data
    // This might require additional context or reasonable defaults
    return v1Data.result === AtBatResultType.HOME_RUN ? 1 : 0;
  }
}

class EventUpcasterService {
  private upcasters: EventUpcaster[] = [
    new AtBatRecordedUpcaster(),
    // ... other upcasters
  ];

  upcastEvent(storedEvent: StoredEvent): StoredEvent {
    for (const upcaster of this.upcasters) {
      if (upcaster.canUpcast(storedEvent)) {
        storedEvent = upcaster.upcast(storedEvent);
      }
    }
    return storedEvent;
  }

  upcastEvents(storedEvents: StoredEvent[]): StoredEvent[] {
    return storedEvents.map(event => this.upcastEvent(event));
  }
}
```

### Handling Business Rule Changes

A key advantage of event sourcing is the separation of immutable facts (events)
from their interpretation (projections). Business rules, especially for derived
data like statistics, may change over time or contain bugs that need fixing.

Our strategy for handling these changes is as follows:

1.  **Events are Immutable**: The historical log of events will never be
    altered. An `AtBatRecorded` event from last season will always contain the
    exact data that was captured at that time.

2.  **Projections are Re-creatable**: All derived data, such as player
    statistics, team leaderboards, or other analytics, are stored in separate
    read models (projections). These projections are considered disposable and
    can be rebuilt at any time.

**Scenario: A Bug in RBI Calculation**

Imagine we discover a bug in our `RBICalculator` that incorrectly awarded RBIs
in certain situations.

**Incorrect Approach:** Go back and modify all historical `AtBatRecorded` events
to fix the RBI value. This violates the immutability of events and corrupts the
audit trail.

**Correct Approach:**

1.  **Fix the Code**: Correct the bug in the `RBICalculator` domain service or
    in the projection logic that generates the statistics.
2.  **Drop the Projection**: Delete the existing, incorrect statistics
    projection (e.g., clear the `player_stats` table).
3.  **Replay the Events**: Process the entire event stream from the beginning.
    The corrected logic will be applied to the historical events, generating a
    new, accurate projection.

This approach ensures that our source of truth remains pure while giving us the
flexibility to evolve and correct our interpretation of that truth over time. It
allows us to answer the question "What does our data look like with the new
rules?" without losing the answer to "What did the data look like with the old
rules?".

## Error Handling and Recovery

### Concurrency Control

```typescript
class OptimisticConcurrencyError extends Error {
  constructor(
    readonly streamId: GameId,
    readonly expectedVersion: number,
    readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict for stream ${streamId.value}. Expected version ${expectedVersion}, got ${actualVersion}`
    );
  }
}

class ConcurrencyHandler {
  async handleConcurrencyConflict(
    error: OptimisticConcurrencyError,
    command: GameCommand,
    retryAttempts = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        // Reload latest state
        const game = await this.gameRepository.findById(error.streamId);

        // Retry command with latest version
        await this.executeCommand(game, command);
        return;
      } catch (e) {
        if (
          e instanceof OptimisticConcurrencyError &&
          attempt < retryAttempts - 1
        ) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 100);
          continue;
        }
        throw e;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Event Store Recovery

```typescript
class EventStoreRecovery {
  constructor(
    private primaryStore: EventStore,
    private backupStore: EventStore
  ) {}

  async validateEventStream(streamId: GameId): Promise<ValidationResult> {
    const primaryEvents = await this.primaryStore.getEvents(streamId);
    const backupEvents = await this.backupStore.getEvents(streamId);

    const issues: string[] = [];

    // Check event count
    if (primaryEvents.length !== backupEvents.length) {
      issues.push(
        `Event count mismatch: primary ${primaryEvents.length}, backup ${backupEvents.length}`
      );
    }

    // Check event integrity
    for (
      let i = 0;
      i < Math.min(primaryEvents.length, backupEvents.length);
      i++
    ) {
      const primary = primaryEvents[i];
      const backup = backupEvents[i];

      if (primary.eventId !== backup.eventId) {
        issues.push(
          `Event ID mismatch at index ${i}: ${primary.eventId} vs ${backup.eventId}`
        );
      }

      if (primary.version !== backup.version) {
        issues.push(
          `Version mismatch at index ${i}: ${primary.version} vs ${backup.version}`
        );
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  async repairEventStream(streamId: GameId): Promise<void> {
    const validation = await this.validateEventStream(streamId);

    if (validation.isValid) {
      return;
    }

    // Implement recovery logic based on validation results
    // This might involve reconstructing from backup, manual intervention, etc.
  }
}
```

## Testing Event Sourced Systems

### Unit Testing Events

```typescript
describe('Game Event Sourcing', () => {
  let game: Game;
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    game = Game.create(
      new GameId('test-game'),
      'Red Sox',
      'Yankees',
      TeamSide.HOME
    );
  });

  it('should record at-bat and generate correct event', () => {
    const command: RecordAtBatCommand = {
      gameId: game.getId(),
      batterId: new PlayerId('williams'),
      result: AtBatResultType.SINGLE,
      timestamp: new Date(),
    };

    game.recordAtBat(command);

    const events = game.getUncommittedEvents();
    expect(events).toHaveLength(2); // GameStarted + AtBatRecorded

    const atBatEvent = events[1] as AtBatRecorded;
    expect(atBatEvent.type).toBe('AtBatRecorded');
    expect(atBatEvent.batterId).toEqual(command.batterId);
    expect(atBatEvent.result).toBe(AtBatResultType.SINGLE);
  });

  it('should reconstruct identical state from events', async () => {
    // Arrange: Create game with multiple events
    game.recordAtBat({
      /* ... */
    });
    game.endInning();
    game.recordAtBat({
      /* ... */
    });

    // Persist events
    const events = game.getUncommittedEvents();
    await eventStore.append(game.getId(), events);

    // Act: Reconstruct from events
    const storedEvents = await eventStore.getEvents(game.getId());
    const reconstructedGame = Game.reconstitute(game.getId(), storedEvents);

    // Assert: States are identical
    expect(reconstructedGame.getScore()).toEqual(game.getScore());
    expect(reconstructedGame.getCurrentBatter()).toEqual(
      game.getCurrentBatter()
    );
    expect(reconstructedGame.isGameOver()).toBe(game.isGameOver());
  });
});
```

### Integration Testing

```typescript
describe('Event Store Integration', () => {
  let eventStore: IndexedDBEventStore;

  beforeEach(async () => {
    eventStore = new IndexedDBEventStore();
    await eventStore.initialize();
  });

  it('should persist and retrieve events correctly', async () => {
    const gameId = new GameId('integration-test');
    const events = [
      new GameStarted(gameId, 'Home', 'Away', TeamSide.HOME),
      new AtBatRecorded(
        gameId,
        new PlayerId('player1'),
        AtBatResultType.SINGLE,
        [],
        0 /* ... */
      ),
    ];

    // Persist events
    await eventStore.append(gameId, events);

    // Retrieve events
    const storedEvents = await eventStore.getEvents(gameId);

    expect(storedEvents).toHaveLength(2);
    expect(storedEvents[0].eventType).toBe('GameStarted');
    expect(storedEvents[1].eventType).toBe('AtBatRecorded');
  });

  it('should handle optimistic concurrency correctly', async () => {
    const gameId = new GameId('concurrency-test');
    const event1 = new GameStarted(gameId, 'Home', 'Away', TeamSide.HOME);

    // First write
    await eventStore.append(gameId, [event1], 0);

    // Concurrent write with wrong expected version
    const event2 = new AtBatRecorded(gameId /* ... */);

    await expect(
      eventStore.append(gameId, [event2], 0) // Wrong expected version
    ).rejects.toThrow(OptimisticConcurrencyError);
  });
});
```

## Performance Considerations

### Fine-Grained Event Volume Impact

With our fine-grained event approach, expect higher event volume:

```
Typical 7-inning game:
- ~140 at-bats (20 per inning average)
- ~3-5 events per at-bat = ~420-700 play events
- ~40 substitution/position change events
- ~14 inning transition events
- Total: ~474-754 events per game (vs ~154 with coarse events)
```

### Event Stream Optimization

```typescript
class OptimizedEventStore extends IndexedDBEventStore {
  private static readonly BATCH_SIZE = 50;

  async appendBatch(streamId: GameId, events: DomainEvent[]): Promise<void> {
    // Process events in batches to avoid memory issues
    for (let i = 0; i < events.length; i += OptimizedEventStore.BATCH_SIZE) {
      const batch = events.slice(i, i + OptimizedEventStore.BATCH_SIZE);
      await super.append(streamId, batch);
    }
  }

  async getEventsStreaming(
    streamId: GameId,
    onEvent: (event: StoredEvent) => void
  ): Promise<void> {
    // Stream events to avoid loading all into memory at once
    const transaction = this.db.transaction(
      [IndexedDBEventStore.EVENTS_STORE],
      'readonly'
    );
    const store = transaction.objectStore(IndexedDBEventStore.EVENTS_STORE);
    const index = store.index('streamId');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(streamId.value));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          onEvent(cursor.value as StoredEvent);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}
```

### Projection Performance

```typescript
class IncrementalProjectionBuilder {
  private lastProcessedVersion: number = 0;

  async updateProjection(streamId: GameId): Promise<void> {
    // Only process new events since last update
    const newEvents = await this.eventStore.getEvents(
      streamId,
      this.lastProcessedVersion
    );

    for (const event of newEvents) {
      await this.processEvent(event);
      this.lastProcessedVersion = event.version;
    }
  }

  private async processEvent(event: StoredEvent): Promise<void> {
    switch (event.eventType) {
      case 'AtBatRecorded':
        await this.updateBattingStatistics(event);
        break;
      case 'GameCompleted':
        await this.updateGameSummary(event);
        break;
    }
  }
}
```

This technical guide provides the implementation foundation for Event Sourcing
in our softball recording application. The patterns and examples shown here
support the architectural decisions made in ADR-002 and provide concrete
guidance for development teams implementing the event-sourced domain model.

## See Also

- **[ADR-002: Event Sourcing Pattern](../adr/ADR-002-event-sourcing-pattern.md)** -
  Decision rationale and benefits
- **[Domain Model](domain-model.md)** - Updated with multi-aggregate design and
  fine-grained events
- **[Architecture Guide](architecture.md)** - Overall system architecture
- **[API Contracts](api-contracts.md)** - Event contracts and interfaces
- **[Development Guide](../guides/development.md)** - TDD workflow and testing
  strategy
