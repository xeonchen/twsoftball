# Domain Model - Softball Game Recording

> **Note**: This document describes the planned domain implementation. The
> actual domain layer is not yet implemented (Phase 2). This serves as the
> specification for TDD development.

## Bounded Context: Game Recording

### Context Boundaries

- **IN SCOPE**: Recording game events, calculating basic statistics, managing
  lineups, undo/redo functionality
- **OUT OF SCOPE**: League management, season statistics, player profiles,
  scheduling, advanced analytics

### Ubiquitous Language

| Term                     | Definition                                   |
| ------------------------ | -------------------------------------------- |
| **At-Bat**               | A player's turn batting against the pitcher  |
| **RBI (Runs Batted In)** | Credit for causing runs to score             |
| **Sacrifice Fly**        | Out that allows runner to score (RBI counts) |
| **Double Play**          | Two outs in one play (no RBI)                |
| **Triple Play**          | Three outs in one play (no RBI)              |
| **Mercy Rule**           | End game early if score difference too large |
| **Extra Player (EP)**    | Player who bats but doesn't field            |
| **Lineup**               | The batting order of players                 |
| **Substitution**         | Replacing one player with another            |
| **Inning**               | Division where each team bats once           |

## Domain Architecture

### Aggregate Root: Game

```
Game (Aggregate Root)
├── GameState (Entity)
│   ├── TeamInGame (Entity) - Home Team
│   │   └── PlayerInGame[] (Entity)
│   ├── TeamInGame (Entity) - Away Team
│   │   └── PlayerInGame[] (Entity)
│   └── BasesState (Entity)
├── DomainEvent[] (Value Objects)
└── GameRules (Value Object)
```

**Aggregate Boundary Rules:**

- Only `Game` can be directly accessed from outside
- All entities within aggregate are accessed through `Game`
- All changes go through `Game.recordAtBat()` or similar methods
- Events are emitted only by `Game`

## Value Objects

### Identities

```typescript
class PlayerId {
  constructor(readonly value: string)
  equals(other: PlayerId): boolean
}

class TeamId {
  constructor(readonly value: string)
  equals(other: TeamId): boolean
}

class GameId {
  constructor(readonly value: string)
  static generate(): GameId
  equals(other: GameId): boolean
}
```

### Game Values

```typescript
class JerseyNumber {
  constructor(readonly value: string)  // "1" to "99"
  equals(other: JerseyNumber): boolean
}

class Score {
  constructor(readonly runs: number)
  add(runs: number): Score
  equals(other: Score): boolean
}
```

### Play Results

```typescript
enum AtBatResultType {
  // Hits
  SINGLE = '1B',
  DOUBLE = '2B',
  TRIPLE = '3B',
  HOME_RUN = 'HR',

  // On base (not hits)
  WALK = 'BB',
  ERROR = 'E',
  FIELDERS_CHOICE = 'FC',

  // Outs
  STRIKEOUT = 'K',
  GROUND_OUT = 'GO',
  FLY_OUT = 'FO',
  DOUBLE_PLAY = 'DP',
  TRIPLE_PLAY = 'TP',

  // Sacrifice
  SACRIFICE_FLY = 'SF'
}

class RunnerAdvance {
  constructor(
    readonly playerId: PlayerId,
    readonly from: Base | null,  // null = batter
    readonly to: Base | 'HOME' | 'OUT',
    readonly reason: AdvanceReason
  )
}
```

## Domain Events (Event Sourcing)

All events follow past-tense naming convention:

```typescript
abstract class DomainEvent {
  readonly eventId: string
  readonly timestamp: Date
  readonly gameId: GameId
  abstract readonly type: string
}

class GameStarted extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly homeTeamName: string,
    readonly awayTeamName: string,
    readonly ourTeamSide: 'HOME' | 'AWAY'
  )
}

class AtBatRecorded extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly runnerAdvances: RunnerAdvance[],
    readonly rbi: number,
    readonly newScore: { home: number; away: number }
  )
}

class PlayerSubstituted extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly substitutions: SubstitutionAction[]
  )
}

class InningEnded extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly inning: number,
    readonly half: 'TOP' | 'BOTTOM',
    readonly runsScored: number,
    readonly leftOnBase: number
  )
}

class GameCompleted extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly finalScore: { home: number; away: number },
    readonly winner: 'HOME' | 'AWAY' | 'TIE',
    readonly reason: 'COMPLETE' | 'MERCY' | 'TIME_LIMIT'
  )
}
```

## Entities

### Game (Aggregate Root)

```typescript
class Game {
  private constructor(
    private readonly id: GameId,
    private state: GameState,
    private uncommittedEvents: DomainEvent[]
  )

  // Factory Methods (DDD)
  static create(homeTeam: string, awayTeam: string): Game
  static reconstitute(id: GameId, events: DomainEvent[]): Game

  // Commands (change state)
  recordAtBat(command: RecordAtBatCommand): void
  substitutePlayer(command: SubstitutePlayerCommand): void
  endInning(): void

  // Queries (read state)
  getScore(): { home: number; away: number }
  getCurrentBatter(): PlayerId
  canUndo(): boolean
  isGameOver(): boolean

  // Event Sourcing
  getUncommittedEvents(): DomainEvent[]
  markEventsAsCommitted(): void
}
```

### GameState (Internal Entity)

```typescript
class GameState {
  constructor(
    readonly homeTeam: TeamInGame,
    readonly awayTeam: TeamInGame,
    readonly currentInning: number,
    readonly battingTeam: 'HOME' | 'AWAY',
    readonly outs: number,
    readonly bases: BasesState
  )

  // State transitions
  apply(event: DomainEvent): GameState
  endInning(): GameState
  switchBattingTeam(): GameState
}
```

### TeamInGame (Internal Entity)

```typescript
class TeamInGame {
  constructor(
    readonly teamId: TeamId | 'OPPONENT',
    readonly name: string,
    readonly players: PlayerInGame[],
    readonly battingOrder: PlayerId[],
    readonly fieldPositions: Map<FieldPosition, PlayerId>,
    readonly runsPerInning: number[]
  )

  // Team operations
  getTotalRuns(): number
  getCurrentBatter(): PlayerId
  getFielder(position: FieldPosition): PlayerId

  // Only for our team
  isOurTeam(): boolean
  validateLineup(): ValidationResult
}
```

### PlayerInGame (Internal Entity)

```typescript
class PlayerInGame {
  constructor(
    readonly playerId: PlayerId,
    readonly name: string,
    readonly jerseyNumber: JerseyNumber,
    readonly positions: FieldPosition[], // Preferred positions
    readonly battingOrderPosition: number,
    readonly currentFieldPosition: FieldPosition,
    readonly plateAppearances: AtBatResult[]
  )

  // Player stats
  getAtBats(): number
  getHits(): number
  getRBIs(): number
  getBattingAverage(): number
}
```

### BasesState (Internal Entity)

```typescript
class BasesState {
  private runners: Map<Base, PlayerId>;

  // Runner management
  putRunnerOn(base: Base, playerId: PlayerId): void;
  getRunner(base: Base): PlayerId | undefined;
  advanceRunners(result: AtBatResultType): RunnerAdvance[];
  clearBases(): void;

  // Queries
  getOccupiedBases(): Base[];
  getRunnersInScoringPosition(): PlayerId[];
  isForceAt(base: Base): boolean;
}
```

## Domain Services

### RBICalculator

```typescript
class RBICalculator {
  static calculate(
    result: AtBatResultType,
    runnerAdvances: RunnerAdvance[],
    baseSituation: BasesState,
    outs: number
  ): number;

  private static isNoRBIResult(result: AtBatResultType): boolean;
  private static countRBIForError(outs: number): boolean;
}
```

### LineupValidator

```typescript
class LineupValidator {
  static validate(lineup: PlayerInGame[]): ValidationResult;

  private static checkDuplicatePlayers(lineup: PlayerInGame[]): string[];
  private static checkDuplicatePositions(lineup: PlayerInGame[]): string[];
  private static checkRequiredPositions(lineup: PlayerInGame[]): string[];
}
```

## Repository Interfaces (Application Layer)

```typescript
// Only aggregate roots have repositories
interface GameRepository {
  findById(id: GameId): Promise<Game>;
  save(game: Game): Promise<void>;
  findByStatus(status: GameStatus): Promise<Game[]>;
}

interface EventStore {
  append(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: GameId, fromVersion?: number): Promise<DomainEvent[]>;
}
```

## Business Rules

### Statistical Rules

1. **At-Bat**: Counts unless it's a walk or sacrifice fly
2. **RBI**: All runs scored except on double plays, triple plays, or errors with
   < 2 outs
3. **Hit**: Single, double, triple, home run only
4. **On-Base**: Hit, walk, error, or fielder's choice

### Game Rules

1. **Mercy Rule**: 10 runs after 4th inning, 7 runs after 5th inning
2. **Time Limit**: 60 minutes default
3. **Lineup**: 9-20 players, no duplicates, all positions filled
4. **Substitution**: Can affect multiple positions simultaneously

### Invariants

- Score can only increase, never decrease
- Game state can only move forward (NOT_STARTED → IN_PROGRESS → COMPLETED)
- Batting order must be maintained
- 3 outs end an inning
- Only our team has detailed player tracking

This domain model provides the foundation for implementing our softball game
recording system using DDD principles within a Hexagonal Architecture.

## See Also

- **[Architecture Guide](architecture.md)** - How DDD, Hexagonal, and SOLID work
  together
- **[Event Sourcing Guide](event-sourcing.md)** - Technical implementation of
  event sourcing
- **[API Contracts](api-contracts.md)** - Interface definitions and DTOs
- **[Use Cases](use-cases.md)** - User stories and acceptance criteria
- **[ADR-001: DDD + Hexagonal](../adr/ADR-001-ddd-hexagonal-solid.md)** -
  Architectural decision rationale
- **[ADR-002: Event Sourcing](../adr/ADR-002-event-sourcing-pattern.md)** -
  Event sourcing decision rationale
