# Domain Model - Softball Game Recording

> **Note**: This document describes the completed domain implementation from
> Phase 2. It reflects the implemented architecture with 3 aggregate roots, 15
> domain events, and comprehensive business logic achieving 99.2% test coverage.

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

### Multiple Aggregate Design

After careful analysis, we've split the domain into three aggregates for better
performance, clearer boundaries, and reduced contention:

```
Game (Aggregate Root) - Coordination & Scoring
├── GameId (Value Object)
├── GameStatus (Value Object)
├── GameScore (Value Object)
├── CurrentInning (Value Object)
└── Events[] (Domain Events)

TeamLineup (Aggregate Root) - Player Management
├── TeamLineupId (Value Object)
├── GameId (Reference)
├── TeamSide (HOME | AWAY)
├── TeamStrategy (DetailedTeam | SimpleTeam)
├── BattingSlots (Map<number, BattingSlot>)
├── FieldPositions (Map<FieldPosition, PlayerId>)
├── BenchPlayers (Set<PlayerId>)
├── SubstitutionHistory[]
└── ReentryTracking (Set<PlayerId>)

InningState (Aggregate Root) - Current Play State
├── InningStateId (Value Object)
├── GameId (Reference)
├── Inning (number)
├── Half (TOP | BOTTOM)
├── Outs (number)
├── AwayTeamBatterSlot (number)
├── HomeTeamBatterSlot (number)
├── BasesState (Value Object - Immutable)
└── CurrentBatterSlot (computed getter)
```

**Aggregate Boundary Rules:**

- Each aggregate has its own repository and can be loaded independently
- Aggregates communicate through domain events
- Eventual consistency between aggregates is acceptable
- Each aggregate enforces its own invariants
- Cross-aggregate references use IDs only

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

// New: Batting slot concept
class BattingSlot {
  constructor(
    readonly position: number,  // 1-based (1, 2, 3...)
    readonly currentPlayer: PlayerId,
    readonly history: SlotHistory[]
  )
}

class SlotHistory {
  constructor(
    readonly playerId: PlayerId,
    readonly enteredInning: number,
    readonly exitedInning?: number,
    readonly wasStarter: boolean,
    readonly isReentry: boolean
  )
}
```

## Domain Events (Event Sourcing)

Using fine-grained events for better flexibility and audit trail. All events
follow past-tense naming convention:

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

// Fine-grained events for better audit trail
class AtBatCompleted extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly batterId: PlayerId,
    readonly battingSlot: number,
    readonly result: AtBatResultType,
    readonly inning: number,
    readonly outs: number
  )
}

class RunnerAdvanced extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly runnerId: PlayerId,
    readonly from: Base | null,
    readonly to: Base | 'HOME' | 'OUT',
    readonly reason: AdvanceReason
  )
}

class RunScored extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly scorerId: PlayerId,
    readonly battingTeam: 'HOME' | 'AWAY',
    readonly rbiCreditedTo: PlayerId | null,
    readonly newScore: { home: number; away: number }
  )
}

class PlayerSubstitutedIntoGame extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly incomingPlayerId: PlayerId,
    readonly outgoingPlayerId: PlayerId,
    readonly battingSlot: number,
    readonly fieldPosition: FieldPosition,
    readonly inning: number,
    readonly isReentry: boolean  // Starter returning to game
  )
}

class FieldPositionChanged extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly playerId: PlayerId,
    readonly fromPosition: FieldPosition,
    readonly toPosition: FieldPosition,
    readonly inning: number
  )
}

class HalfInningEnded extends DomainEvent {
  constructor(
    gameId: GameId,
    readonly inning: number,
    readonly wasTopHalf: boolean,
    readonly finalOuts: number,
    readonly awayTeamBatterSlot: number,
    readonly homeTeamBatterSlot: number
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

### Game (Aggregate Root - Coordination)

```typescript
class Game {
  private constructor(
    private readonly id: GameId,
    private score: GameScore,
    private status: GameStatus,
    private currentInning: number,
    private uncommittedEvents: DomainEvent[]
  )

  // Factory Methods
  static create(id: GameId, homeTeam: string, awayTeam: string): Game
  static reconstitute(id: GameId, events: DomainEvent[]): Game

  // Commands - Coordinating aggregate
  startGame(): void
  updateScore(team: 'HOME' | 'AWAY', runs: number): void
  completeGame(reason: 'COMPLETE' | 'MERCY' | 'TIME_LIMIT'): void

  // Queries
  getScore(): GameScore
  getStatus(): GameStatus
  isGameOver(): boolean
  shouldApplyMercyRule(): boolean

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

### TeamLineup (Aggregate Root - Player Management)

```typescript
class TeamLineup {
  private constructor(
    private readonly id: TeamLineupId,
    private readonly gameId: GameId,
    private readonly teamSide: 'HOME' | 'AWAY',
    private readonly strategy: TeamStrategy,
    private battingSlots: Map<number, BattingSlot>,
    private fieldPositions: Map<FieldPosition, PlayerId>,
    private benchPlayers: Set<PlayerId>,
    private starterPositions: Map<PlayerId, number>,
    private reentryUsed: Set<PlayerId>,
    private substitutionHistory: SubstitutionRecord[]
  )

  // Factory Methods
  static create(
    id: TeamLineupId,
    gameId: GameId,
    teamSide: 'HOME' | 'AWAY',
    strategy: TeamStrategy
  ): TeamLineup

  // Commands
  submitInitialLineup(players: PlayerInGame[], battingOrder: number[]): void
  substitutePlayer(incoming: PlayerId, outgoing: PlayerId, inning: number): void
  changeFieldPosition(playerId: PlayerId, newPosition: FieldPosition): void

  // Queries
  getCurrentBatterSlot(): number
  getPlayerAtSlot(slot: number): PlayerId
  getFielder(position: FieldPosition): PlayerId | undefined
  canPlayerReenter(playerId: PlayerId): boolean
  validateLineup(): ValidationResult

  // Event handling
  apply(event: DomainEvent): void
}
```

### Team Strategy Pattern

```typescript
interface TeamStrategy {
  requiresFullRoster(): boolean;
  requiresPlayerNames(): boolean;
  validateLineup(players: PlayerInGame[]): ValidationResult;
  getMinimumPlayers(): number;
  getMaximumPlayers(): number;
}

class DetailedTeamStrategy implements TeamStrategy {
  requiresFullRoster(): boolean {
    return true;
  }
  requiresPlayerNames(): boolean {
    return true;
  }
  getMinimumPlayers(): number {
    return 10; // Standard 10-player lineup
  }
  getMaximumPlayers(): number {
    return 30; // Supports large rosters
  }

  validateLineup(players: PlayerInGame[]): ValidationResult {
    // Full validation: names, jerseys, positions, etc.
  }
}

class SimpleTeamStrategy implements TeamStrategy {
  requiresFullRoster(): boolean {
    return false;
  }
  requiresPlayerNames(): boolean {
    return false;
  }
  getMinimumPlayers(): number {
    return 0;
  }
  getMaximumPlayers(): number {
    return 0;
  }

  validateLineup(players: PlayerInGame[]): ValidationResult {
    // Minimal validation for opponent team
  }
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

### InningState (Aggregate Root - Play State)

```typescript
class InningState {
  private constructor(
    private readonly id: InningStateId,
    private readonly gameId: GameId,
    private inning: number,
    private half: 'TOP' | 'BOTTOM',
    private outs: number,
    private awayTeamBatterSlot: number,
    private homeTeamBatterSlot: number,
    private bases: BasesState  // Value Object
  )

  // Computed property - not a stored field
  get currentBatterSlot(): number {
    return this.isTopHalf ? this.awayTeamBatterSlot : this.homeTeamBatterSlot;
  }

  // Factory Methods
  static createNew(id: InningStateId, gameId: GameId): InningState
  static fromEvents(events: DomainEvent[]): InningState

  // Commands
  recordAtBat(batterId: PlayerId, battingSlot: number, result: AtBatResultType, inning: number): InningState
  advanceRunners(atBatResult: AtBatResultType, movements: RunnerMovement[]): InningState
  endHalfInning(): InningState

  // Queries
  getCurrentSituation(): InningGameSituation
  getOuts(): number
  get basesState(): BasesState
  isInningComplete(): boolean
}
```

### BasesState (Value Object - Immutable)

```typescript
class BasesState {
  private constructor(
    private readonly runners: ReadonlyMap<Base, PlayerId>
  )

  // Factory methods returning new instances
  static empty(): BasesState
  withRunnerOn(base: Base, playerId: PlayerId): BasesState
  withRunnerAdvanced(from: Base, to: Base | 'HOME'): BasesState
  withBasesCleared(): BasesState

  // Queries (no mutations)
  getRunner(base: Base): PlayerId | undefined
  getOccupiedBases(): Base[]
  getRunnersInScoringPosition(): PlayerId[]
  isForceAt(base: Base): boolean

  // Value object equality
  equals(other: BasesState): boolean
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
   < 2 outs (handled by RBICalculator domain service)
3. **Hit**: Single, double, triple, home run only
4. **On-Base**: Hit, walk, error, or fielder's choice

### Game Rules

1. **Mercy Rule**: 10 runs after 4th inning, 7 runs after 5th inning
2. **Time Limit**: 60 minutes default
3. **Lineup**: 10-12 players is standard (10-player is the standard version,
   11-player with EP and 12-player with 2 EPs are common). 9-player (without SF)
   and 13+ players are valid but less frequent boundary cases
4. **Field Positions**: 10 fielders for standard play (including Short Field),
   with extra players (EP) who bat but don't field in 11+ player games
5. **Substitution**: Players can change field positions anytime
6. **Re-entry**: Starters can re-enter once to their original batting slot
7. **Batting Order**: Fixed slots at game start, players flow through slots via
   substitution
8. **Bench Players**: Have no batting slot until substituted in

### Invariants

- Score can only increase, never decrease
- Game state can only move forward (NOT_STARTED → IN_PROGRESS → COMPLETED)
- Batting order SLOTS are immutable once game starts
- Players can only re-enter to their original batting slot
- Starters can re-enter only once
- 3 outs end an inning
- Every active player must have exactly one field position (including
  EXTRA_PLAYER)
- A batting slot can only have one active player at a time
- BasesState is immutable (replaced, not mutated)

This domain model provides the foundation for implementing our softball game
recording system using DDD principles within a Hexagonal Architecture.

## Batter Selection and Automatic Advancement

One of the core behavioral aspects of the domain is how the system manages
batting order progression. This section clarifies the automatic batter selection
behavior that is fundamental to the game recording workflow.

### Core Principle: Deterministic Batting Order

The batting order in softball is **legally binding** once submitted to the
umpire. Teams must follow the order sequentially throughout the game. The system
models this constraint through automatic batter selection and advancement—there
is no manual "select next batter" step in the normal flow.

### Automatic Initialization at Game Start

**When**: `StartNewGame` use case completes **Behavior**: System automatically
initializes the first batter **Implementation**: `StartNewGame.ts:816-819`,
`StartNewGame.ts:842`

```typescript
// First batter is automatically set to away team's slot #1 player
const firstBattingSlot = awayLineupDTO.battingSlots.find(
  slot => slot.slotNumber === 1
);
const currentBatter = firstBattingSlot?.currentPlayer || null;
// ...
currentBatterSlot: 1,  // Always starts at slot 1
isTopHalf: true,       // Away team bats first
```

**Business Rule**: In softball, the away team always bats first (top of the
inning), and the leadoff hitter (slot #1) is always the first batter. This is
not a user choice—it's a rule of the game.

**Expected Behavior**: After game initialization, the UI should immediately show
the current batter and enable action buttons. No "select batter" step required.

### Automatic Advancement After Each At-Bat

**When**: After any at-bat is recorded (via `RecordAtBat` use case)
**Behavior**: System automatically advances to next batting slot
**Implementation**: `InningState.ts:1486-1520`

```typescript
advanceBattingOrder(): void {
  const totalSlots = this.teamLineup.getTotalBattingSlots();
  this.currentBatterSlot = (this.currentBatterSlot % totalSlots) + 1;
  this.emitCurrentBatterChanged();
}
```

**Advancement Sequence**: 1 → 2 → 3 → 4 → ... → N → 1 (circular sequence)

**Business Rule**: Batting order advances sequentially after each at-bat,
regardless of the at-bat outcome (hit, walk, out, etc.). The order wraps around
after the last slot.

### Batting Order Persistence Across Innings

**When**: Half-inning ends (3 outs recorded) **Behavior**: Batting order
continues where it left off **Implementation**: `InningState.ts:730`

```typescript
endHalfInning(): void {
  // currentBatterSlot is NOT reset to 1
  // Slot position is maintained for when this team bats again
}
```

**Example Flow**:

- Top of 1st: Away team bats slots 1, 2, 3 (slot #3 makes 3rd out)
- Bottom of 1st: Home team starts from slot #1 (their first time batting)
- Top of 2nd: Away team resumes from **slot #4** (not slot #1)
- Bottom of 2nd: Home team continues from where they left off

**Business Rule**: The batting order is a continuous sequence across all
innings. It doesn't reset at the beginning of each inning—teams pick up where
they left off.

### Half-Inning Transitions

**When**: Teams switch between batting and fielding **Behavior**: System
automatically selects the appropriate next batter

When a half-inning ends:

1. Outs reset to 0
2. Bases cleared
3. Batting team switches (away ↔ home)
4. **currentBatterSlot** loads from the new batting team's state
5. **currentBatter** automatically set to the player in that slot

**Implementation Note**: Each team (HOME and AWAY) maintains its own
`currentBatterSlot` value independently in the `TeamLineup` aggregate. The
`InningState` tracks which team is currently batting and references their
current slot.

### Domain Events for Batter Transitions

**CurrentBatterChanged Event**: Emitted after each at-bat completion to track
batting order progression.

```typescript
export class CurrentBatterChanged extends DomainEvent {
  constructor(
    readonly gameId: GameId,
    readonly previousBatterId: PlayerId | null,
    readonly currentBatterId: PlayerId,
    readonly previousBattingSlot: number,
    readonly currentBattingSlot: number,
    readonly inning: number,
    readonly half: 'TOP' | 'BOTTOM'
  )
}
```

**Documentation**: See `packages/domain/src/events/CurrentBatterChanged.ts` for
comprehensive JSDoc (65 lines) explaining all business rules around batter
advancement, including:

- Sequential slot progression (1 → 2 → 3 → ...)
- Wraparound behavior (slot N → slot 1)
- Away team always bats first
- Cross-inning persistence

### Substitution Integration

**When**: User initiates player substitution **Behavior**: Replaces player in
current batter's slot, automatic advancement resumes

**Key Points**:

- Substitution replaces the **player** in a **slot**, not the slot itself
- The batting slot number remains unchanged
- After substitution, automatic advancement continues normally
- Example: If slot #5 player is substituted, the new player occupies slot #5 and
  will bat when slot #5 comes up in the order

**Implementation**: `PlayerSubstitutedIntoGame` event records the slot number
and player change, maintaining batting order continuity.

### Invariants Related to Batter Selection

- **currentBatterSlot** must always be between 1 and N (total batting slots)
- **currentBatter** must always be a valid PlayerId when game is IN_PROGRESS
- Each team maintains its own **currentBatterSlot** independently
- Batting slot advancement is the only way to change the current batter (except
  substitutions)
- No "skip batter" or "go back" operations exist in normal game flow
- Undo/redo operations restore exact batter state from events

### UI State Management

**Critical Integration Point**: The Web layer must correctly reflect the
domain's automatic batter initialization.

**Common Bug Pattern**: UI shows "Select next batter" when game starts, even
though domain has already set `currentBatter` in the game state.

**Root Cause**: UI not reading initialized `currentBatter` from game state after
`StartNewGame` completes.

**Expected UI Behavior**:

- After game starts: Display current batter name, enable action buttons
- After at-bat recorded: Display next batter automatically (no user action)
- No manual "next batter" button needed in normal flow
- "Select next batter" message should NEVER appear during normal game play

**Fix**: Web layer should read `currentBatter` from game state and enable action
buttons when `currentBatter` is not null. See `/docs/design/game-flow.md` for
complete game lifecycle and state transition specifications.

### Reference Implementation

| Component                           | Location                                                          | Purpose                                       |
| ----------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `StartNewGame` use case             | `packages/application/src/use-cases/StartNewGame.ts:816-819, 842` | Sets first batter at game initialization      |
| `InningState.advanceBattingOrder()` | `packages/domain/src/aggregates/InningState.ts:1486-1520`         | Advances to next slot after at-bat            |
| `InningState.endHalfInning()`       | `packages/domain/src/aggregates/InningState.ts:730`               | Preserves slot position across innings        |
| `CurrentBatterChanged` event        | `packages/domain/src/events/CurrentBatterChanged.ts`              | Tracks all batter transitions (65-line JSDoc) |
| `TeamLineup` aggregate              | `packages/domain/src/aggregates/TeamLineup.ts`                    | Stores batting slots and player assignments   |

### See Also

- **[Game Flow](game-flow.md)** - Complete game lifecycle with state transition
  diagrams
- **[Use Cases](use-cases.md)** - UC-001 (Start Game) and UC-002 (Record At-Bat)
  specify automatic behavior
- **[CurrentBatterChanged Event](../../packages/domain/src/events/CurrentBatterChanged.ts)** -
  Comprehensive documentation of batter advancement rules

## Implementation Examples

### Value Object Implementation Pattern

```typescript
// Example: GameId value object
export class GameId {
  constructor(readonly value: string) {
    if (!value?.trim()) {
      throw new DomainError('GameId cannot be empty or whitespace');
    }
    if (value.length > 50) {
      throw new DomainError('GameId cannot exceed 50 characters');
    }
  }

  equals(other: GameId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static generate(): GameId {
    return new GameId(crypto.randomUUID());
  }
}

// Example: Score value object with business rules
export class Score {
  constructor(readonly runs: number) {
    if (!Number.isInteger(runs) || runs < 0) {
      throw new DomainError('Score must be a non-negative integer');
    }
  }

  equals(other: Score): boolean {
    return this.runs === other.runs;
  }

  addRuns(additionalRuns: number): Score {
    if (!Number.isInteger(additionalRuns) || additionalRuns < 0) {
      throw new DomainError('Additional runs must be a non-negative integer');
    }
    return new Score(this.runs + additionalRuns);
  }
}
```

### Domain Event Implementation Pattern

```typescript
// Base event class
export abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly timestamp: Date = new Date();
  readonly version: number = 1;
  abstract readonly type: string;
  abstract readonly gameId: GameId;
}

// Specific domain event
export class AtBatRecorded extends DomainEvent {
  readonly type = 'AtBatRecorded';

  constructor(
    readonly gameId: GameId,
    readonly batterId: PlayerId,
    readonly result: AtBatResultType,
    readonly inning: number,
    readonly outs: number,
    readonly runnerAdvances: RunnerAdvance[],
    readonly rbi: number,
    readonly basesStateBefore: BasesState,
    readonly basesStateAfter: BasesState,
    readonly scoreBefore: GameScore,
    readonly scoreAfter: GameScore
  ) {
    super();
  }
}
```

### Entity Implementation Pattern

```typescript
// Example: BasesState entity
export class BasesState {
  private runners: Map<Base, PlayerId> = new Map();

  putRunnerOn(base: Base, playerId: PlayerId): void {
    this.runners.set(base, playerId);
  }

  getRunner(base: Base): PlayerId | undefined {
    return this.runners.get(base);
  }

  advanceRunners(result: AtBatResultType): RunnerAdvance[] {
    const advances: RunnerAdvance[] = [];

    // Business logic for runner advancement based on at-bat result
    switch (result) {
      case AtBatResultType.SINGLE:
        // Runners advance one base
        for (const [base, playerId] of this.runners.entries()) {
          const newBase = this.getNextBase(base);
          advances.push(
            new RunnerAdvance(playerId, base, newBase, AdvanceReason.HIT)
          );
        }
        break;

      case AtBatResultType.HOME_RUN:
        // All runners score
        for (const [base, playerId] of this.runners.entries()) {
          advances.push(
            new RunnerAdvance(playerId, base, 'HOME', AdvanceReason.HIT)
          );
        }
        break;

      // ... other cases
    }

    return advances;
  }

  getOccupiedBases(): Base[] {
    return Array.from(this.runners.keys());
  }

  clone(): BasesState {
    const clone = new BasesState();
    clone.runners = new Map(this.runners);
    return clone;
  }

  private getNextBase(current: Base): Base | 'HOME' {
    switch (current) {
      case Base.FIRST:
        return Base.SECOND;
      case Base.SECOND:
        return Base.THIRD;
      case Base.THIRD:
        return 'HOME';
      default:
        throw new DomainError(`Invalid base: ${current}`);
    }
  }
}
```

### Aggregate Root Implementation Pattern

```typescript
// Example: Game aggregate (simplified)
export class Game {
  private uncommittedEvents: DomainEvent[] = [];
  private version: number = 0;

  private constructor(
    private readonly id: GameId,
    private state: GameState
  ) {}

  // Factory method for new games
  static create(
    id: GameId,
    homeTeamName: string,
    awayTeamName: string,
    ourTeamSide: TeamSide
  ): Game {
    const game = new Game(id, GameState.initial());

    const event = new GameStarted(id, homeTeamName, awayTeamName, ourTeamSide);

    game.applyEvent(event);
    return game;
  }

  // Event sourcing reconstruction
  static reconstitute(id: GameId, events: DomainEvent[]): Game {
    const game = new Game(id, GameState.initial());

    events.forEach(event => {
      game.applyEvent(event, false); // Don't add to uncommitted events
      game.version++;
    });

    return game;
  }

  // Command handling with business rules
  recordAtBat(command: RecordAtBatCommand): void {
    // Business rule validation
    if (this.state.status === GameStatus.COMPLETED) {
      throw new GameAlreadyCompletedError();
    }

    if (this.state.outs >= 3) {
      throw new TooManyOutsError();
    }

    // Calculate derived data using domain services
    const runnerAdvances = this.state.bases.advanceRunners(command.result);
    const rbi = RBICalculator.calculate(
      command.result,
      runnerAdvances,
      this.state.bases,
      this.state.outs
    );

    // Create and apply event
    const event = new AtBatRecorded(
      this.id,
      command.batterId,
      command.result,
      this.state.currentInning,
      this.state.outs,
      runnerAdvances,
      rbi,
      this.state.bases.clone(),
      this.calculateNewBasesState(runnerAdvances),
      this.state.score.clone(),
      this.calculateNewScore(runnerAdvances)
    );

    this.applyEvent(event);
  }

  // Event application
  private applyEvent(
    event: DomainEvent,
    addToUncommitted: boolean = true
  ): void {
    this.state = this.state.apply(event);

    if (addToUncommitted) {
      this.uncommittedEvents.push(event);
    }
  }

  // Event sourcing methods
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  // Queries
  getScore(): GameScore {
    return this.state.score;
  }

  getCurrentBatter(): PlayerId {
    return this.state.currentBatter;
  }

  getId(): GameId {
    return this.id;
  }
}
```

### Domain Service Implementation Pattern

```typescript
// Example: RBICalculator domain service
export class RBICalculator {
  static calculate(
    result: AtBatResultType,
    runnerAdvances: RunnerAdvance[],
    baseSituation: BasesState,
    outs: number
  ): number {
    // Business rule: No RBI on double play or triple play
    if (this.isNoRBIResult(result)) {
      return 0;
    }

    // Business rule: Errors don't count as RBI unless 2 outs
    if (result === AtBatResultType.ERROR && outs < 2) {
      return 0;
    }

    // Count runs scored due to this at-bat
    return runnerAdvances.filter(advance => advance.to === 'HOME').length;
  }

  private static isNoRBIResult(result: AtBatResultType): boolean {
    return [AtBatResultType.DOUBLE_PLAY, AtBatResultType.TRIPLE_PLAY].includes(
      result
    );
  }
}
```

### Testing Examples

```typescript
// Value object testing
describe('GameId', () => {
  it('should create valid game ID', () => {
    const gameId = new GameId('game-123');
    expect(gameId.value).toBe('game-123');
  });

  it('should reject empty game ID', () => {
    expect(() => new GameId('')).toThrow(DomainError);
  });

  it('should support equality comparison', () => {
    const id1 = new GameId('same-id');
    const id2 = new GameId('same-id');
    expect(id1.equals(id2)).toBe(true);
  });
});

// Aggregate testing with event sourcing
describe('Game', () => {
  it('should record at-bat and generate correct event', () => {
    const game = Game.create(
      new GameId('test'),
      'Red Sox',
      'Yankees',
      TeamSide.HOME
    );

    game.recordAtBat(
      new RecordAtBatCommand(
        game.getId(),
        new PlayerId('williams'),
        AtBatResultType.SINGLE
      )
    );

    const events = game.getUncommittedEvents();
    expect(events).toHaveLength(2); // GameStarted + AtBatRecorded

    const atBatEvent = events[1] as AtBatRecorded;
    expect(atBatEvent.result).toBe(AtBatResultType.SINGLE);
  });

  it('should reconstruct identical state from events', () => {
    const originalGame = Game.create(/* ... */);
    originalGame.recordAtBat(/* ... */);

    const events = originalGame.getUncommittedEvents();
    const reconstructedGame = Game.reconstitute(originalGame.getId(), events);

    expect(reconstructedGame.getScore()).toEqual(originalGame.getScore());
  });
});
```

These implementation examples demonstrate the key patterns for implementing the
domain model using TypeScript with strict type safety, proper encapsulation, and
event sourcing support.

## Team Aggregate (Standalone Roster Management)

### Context

The Team aggregate manages player rosters independently of games. Unlike
TeamLineup (which requires a GameId), Team persists across games and can
optionally be used to pre-populate game lineups during game setup.

This aggregate is planned for Phase 6 implementation. See
[ADR-009](../adr/ADR-009-team-aggregate-design.md) for the design decision
rationale.

### Relationship with TeamLineup

```
Team (game-independent)          TeamLineup (game-bound)
├── TeamId                       ├── TeamLineupId
├── teamName                     ├── gameId (required)
├── RosterPlayers[]              ├── teamName
└── createdAt/updatedAt          ├── ActivePlayers[]
                                 └── BenchPlayers[]
```

**Workflow**:

1. User creates Team roster (one-time setup)
2. When starting a game, user optionally selects Team
3. System creates TeamLineup from Team's roster players (copy)
4. TeamLineup is bound to the new Game
5. Changes to TeamLineup do NOT affect original Team roster

### Team Entity

```typescript
class Team {
  readonly id: TeamId;
  readonly teamName: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // Factory Methods
  static create(id: TeamId, teamName: string): Team;
  static reconstitute(id: TeamId, events: DomainEvent[]): Team;

  // Commands
  addPlayer(player: RosterPlayer): Team;
  updatePlayer(playerId: RosterPlayerId, updates: Partial<RosterPlayer>): Team;
  removePlayer(playerId: RosterPlayerId): Team;
  renameTeam(newName: string): Team;

  // Queries
  getPlayers(): RosterPlayer[];
  getActivePlayers(): RosterPlayer[];
  getPlayerByJersey(jerseyNumber: JerseyNumber): RosterPlayer | undefined;
}
```

### RosterPlayer Entity

```typescript
interface RosterPlayer {
  readonly id: RosterPlayerId;
  readonly playerId: PlayerId;
  readonly name: string;
  readonly jerseyNumber: JerseyNumber;
  readonly preferredPositions: FieldPosition[];
  readonly isActive: boolean;
  readonly notes?: string;
}
```

### Value Objects

```typescript
class TeamId {
  constructor(readonly value: string);
  static generate(): TeamId;
  equals(other: TeamId): boolean;
}

class RosterPlayerId {
  constructor(readonly value: string);
  static generate(): RosterPlayerId;
  equals(other: RosterPlayerId): boolean;
}
```

### Domain Events

| Event                     | Purpose                  |
| ------------------------- | ------------------------ |
| `TeamCreated`             | Team roster initialized  |
| `PlayerAddedToRoster`     | Player added to team     |
| `PlayerRemovedFromRoster` | Player removed from team |
| `PlayerUpdatedOnRoster`   | Player info updated      |
| `TeamRenamed`             | Team name changed        |
| `TeamDeleted`             | Team roster deleted      |

### Invariants

1. Team names must be unique (case-insensitive)
2. Jersey numbers must be unique within a team
3. Player names are required (1-100 characters)
4. Maximum 30 players per roster (configurable via SoftballRules)
5. At least one player must remain in roster (cannot empty a team)

### Repository Interface

```typescript
interface TeamRepository {
  findById(id: TeamId): Promise<Team | null>;
  findByName(name: string): Promise<Team | null>;
  findAll(): Promise<Team[]>;
  save(team: Team): Promise<void>;
  delete(id: TeamId): Promise<void>;
}
```

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
