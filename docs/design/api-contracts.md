# API Contracts and Interface Definitions

> **Note**: This document defines the planned API contracts and interfaces for
> the application. The actual implementation is not yet started (Phases 2-3).
> This serves as the specification for port/adapter development.

## Overview

This document defines all port interfaces, command/query contracts, event
schemas, and data transfer objects for the TW Softball application. These
contracts define the boundaries between layers in our Hexagonal Architecture.

## Layer Boundaries

```
Web Layer (Controllers)
    ↓ uses
Application Layer (Ports & Use Cases)
    ↓ uses
Domain Layer (Aggregates & Events)
    ↑ implements
Infrastructure Layer (Adapters)
```

## Application Layer Ports

### Driving Ports (Inbound)

#### Game Command Service

```typescript
/**
 * Primary port for game recording commands
 * Implemented by: Application Use Cases
 * Used by: Web Controllers, Mobile Controllers
 */
interface GameCommandService {
  startNewGame(command: StartNewGameCommand): Promise<GameStartResult>;
  recordAtBat(command: RecordAtBatCommand): Promise<AtBatResult>;
  substitutePlayer(
    command: SubstitutePlayerCommand
  ): Promise<SubstitutionResult>;
  endInning(command: EndInningCommand): Promise<InningEndResult>;
  endGame(command: EndGameCommand): Promise<GameEndResult>;
  undoLastAction(command: UndoActionCommand): Promise<UndoResult>;
  redoLastAction(command: RedoActionCommand): Promise<RedoResult>;
}
```

#### Game Query Service

```typescript
/**
 * Primary port for game state queries
 * Implemented by: Application Query Handlers
 * Used by: Web Controllers, Mobile Controllers
 */
interface GameQueryService {
  getCurrentGameState(query: GetCurrentGameStateQuery): Promise<GameStateDTO>;
  getGameStatistics(query: GetGameStatisticsQuery): Promise<GameStatisticsDTO>;
  getPlayerStatistics(
    query: GetPlayerStatisticsQuery
  ): Promise<PlayerStatisticsDTO>;
  getGameHistory(query: GetGameHistoryQuery): Promise<GameHistoryDTO>;
  canUndo(query: CanUndoQuery): Promise<boolean>;
  canRedo(query: CanRedoQuery): Promise<boolean>;
}
```

### Driven Ports (Outbound)

#### Game Repository

```typescript
/**
 * Secondary port for game aggregate persistence
 * Implemented by: IndexedDBGameRepository, InMemoryGameRepository
 * Used by: Application Use Cases
 */
interface GameRepository {
  findById(id: GameId): Promise<Game | null>;
  save(game: Game): Promise<void>;
  findByStatus(status: GameStatus): Promise<Game[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Game[]>;
  delete(id: GameId): Promise<void>;
}
```

#### Event Store

```typescript
/**
 * Secondary port for event persistence and retrieval
 * Implemented by: IndexedDBEventStore, InMemoryEventStore
 * Used by: Application Use Cases, Event Sourcing Infrastructure
 */
interface EventStore {
  append(
    streamId: GameId,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
  getEvents(streamId: GameId, fromVersion?: number): Promise<StoredEvent[]>;
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;
  getEventsByType(
    eventType: string,
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;
}
```

#### Snapshot Store

```typescript
/**
 * Secondary port for aggregate snapshot storage
 * Implemented by: IndexedDBSnapshotStore, InMemorySnapshotStore
 * Used by: Event Sourcing Infrastructure
 */
interface SnapshotStore {
  saveSnapshot(streamId: GameId, snapshot: AggregateSnapshot): Promise<void>;
  getSnapshot(streamId: GameId): Promise<AggregateSnapshot | null>;
  deleteSnapshot(streamId: GameId): Promise<void>;
}
```

#### Notification Service

```typescript
/**
 * Secondary port for user notifications
 * Implemented by: BrowserNotificationService, ConsoleNotificationService
 * Used by: Application Use Cases
 */
interface NotificationService {
  notifyGameEvent(event: GameEventNotification): Promise<void>;
  notifyError(error: ErrorNotification): Promise<void>;
  notifyOfflineMode(status: OfflineModeNotification): Promise<void>;
}
```

#### Export Service

```typescript
/**
 * Secondary port for data export functionality
 * Implemented by: PDFExportService, CSVExportService
 * Used by: Application Use Cases
 */
interface ExportService {
  exportGameSummary(
    gameId: GameId,
    format: ExportFormat
  ): Promise<ExportResult>;
  exportGameDetails(
    gameId: GameId,
    format: ExportFormat
  ): Promise<ExportResult>;
  exportPlayerStatistics(
    playerId: PlayerId,
    format: ExportFormat
  ): Promise<ExportResult>;
}
```

## Command Contracts

### Game Management Commands

```typescript
interface StartNewGameCommand {
  gameId: GameId;
  homeTeamName: string;
  awayTeamName: string;
  ourTeamSide: TeamSide;
  gameDate: Date;
  location?: string;
  initialLineup: LineupPlayerDTO[];
  gameRules?: GameRulesDTO;
}

interface RecordAtBatCommand {
  gameId: GameId;
  batterId: PlayerId;
  result: AtBatResultType;
  runnerAdvances?: RunnerAdvanceDTO[];
  notes?: string;
  timestamp?: Date;
}

interface SubstitutePlayerCommand {
  gameId: GameId;
  substitutions: PlayerSubstitutionDTO[];
  timestamp?: Date;
  reason?: string;
}

interface EndInningCommand {
  gameId: GameId;
  timestamp?: Date;
}

interface EndGameCommand {
  gameId: GameId;
  reason: GameEndReason;
  timestamp?: Date;
}

interface UndoActionCommand {
  gameId: GameId;
}

interface RedoActionCommand {
  gameId: GameId;
}
```

### Supporting Command DTOs

```typescript
interface LineupPlayerDTO {
  playerId: PlayerId;
  name: string;
  jerseyNumber: JerseyNumber;
  battingOrderPosition: number;
  fieldPosition: FieldPosition;
  preferredPositions?: FieldPosition[];
}

interface RunnerAdvanceDTO {
  playerId: PlayerId;
  fromBase: Base | null; // null indicates batter
  toBase: Base | 'HOME' | 'OUT';
  advanceReason: AdvanceReason;
}

interface PlayerSubstitutionDTO {
  outgoingPlayerId: PlayerId;
  incomingPlayer: LineupPlayerDTO;
  positionsAffected: FieldPosition[];
  battingOrderPosition?: number;
}

interface GameRulesDTO {
  mercyRuleEnabled: boolean;
  mercyRuleInning4: number; // Run difference after 4 innings
  mercyRuleInning5: number; // Run difference after 5 innings
  timeLimitMinutes?: number;
  extraPlayerAllowed: boolean;
  maxPlayersInLineup: number;
}
```

## Query Contracts

### Game State Queries

```typescript
interface GetCurrentGameStateQuery {
  gameId: GameId;
  asOfTimestamp?: Date;
}

interface GetGameStatisticsQuery {
  gameId: GameId;
  includeIndividualStats: boolean;
  includeTeamStats: boolean;
}

interface GetPlayerStatisticsQuery {
  playerId: PlayerId;
  gameId?: GameId;
  dateRange?: DateRangeDTO;
}

interface GetGameHistoryQuery {
  gameId: GameId;
  includeEvents: boolean;
  fromTimestamp?: Date;
}

interface CanUndoQuery {
  gameId: GameId;
}

interface CanRedoQuery {
  gameId: GameId;
}
```

### Supporting Query DTOs

```typescript
interface DateRangeDTO {
  startDate: Date;
  endDate: Date;
}
```

## Response Contracts

### Command Results

```typescript
interface GameStartResult {
  success: boolean;
  gameId: GameId;
  initialState: GameStateDTO;
  errors?: string[];
}

interface AtBatResult {
  success: boolean;
  gameState: GameStateDTO;
  runsScored: number;
  rbiAwarded: number;
  inningEnded: boolean;
  gameEnded: boolean;
  errors?: string[];
}

interface SubstitutionResult {
  success: boolean;
  gameState: GameStateDTO;
  substitutionsSummary: string[];
  errors?: string[];
}

interface InningEndResult {
  success: boolean;
  gameState: GameStateDTO;
  runsScoredInInning: number;
  gameEnded: boolean;
  errors?: string[];
}

interface GameEndResult {
  success: boolean;
  finalScore: GameScoreDTO;
  winner: TeamSide | 'TIE';
  gameSummary: GameSummaryDTO;
  errors?: string[];
}

interface UndoResult {
  success: boolean;
  gameState: GameStateDTO;
  actionUndone: string;
  canUndoMore: boolean;
  canRedo: boolean;
  errors?: string[];
}

interface RedoResult {
  success: boolean;
  gameState: GameStateDTO;
  actionRedone: string;
  canRedoMore: boolean;
  canUndo: boolean;
  errors?: string[];
}
```

### Query Results (DTOs)

```typescript
interface GameStateDTO {
  gameId: GameId;
  status: GameStatus;
  homeTeam: TeamInGameDTO;
  awayTeam: TeamInGameDTO;
  currentInning: number;
  battingTeam: TeamSide;
  outs: number;
  bases: BasesStateDTO;
  score: GameScoreDTO;
  currentBatter: PlayerInGameDTO;
  gameStartTime: Date;
  lastUpdated: Date;
}

interface TeamInGameDTO {
  teamId: TeamId | 'OPPONENT';
  name: string;
  side: TeamSide;
  isOurTeam: boolean;
  players: PlayerInGameDTO[];
  battingOrder: PlayerId[];
  fieldPositions: Record<FieldPosition, PlayerId>;
  runsPerInning: number[];
  totalRuns: number;
}

interface PlayerInGameDTO {
  playerId: PlayerId;
  name: string;
  jerseyNumber: JerseyNumber;
  battingOrderPosition: number;
  currentFieldPosition: FieldPosition;
  preferredPositions: FieldPosition[];
  plateAppearances: AtBatResultDTO[];
  statistics: PlayerStatisticsDTO;
}

interface BasesStateDTO {
  first: PlayerId | null;
  second: PlayerId | null;
  third: PlayerId | null;
  runnersInScoringPosition: PlayerId[];
  basesLoaded: boolean;
}

interface GameScoreDTO {
  home: number;
  away: number;
  leader: TeamSide | 'TIE';
  difference: number;
}

interface AtBatResultDTO {
  batterId: PlayerId;
  result: AtBatResultType;
  inning: number;
  rbi: number;
  runnerAdvances: RunnerAdvanceDTO[];
  timestamp: Date;
}
```

### Statistics DTOs

```typescript
interface GameStatisticsDTO {
  gameId: GameId;
  teamStatistics: TeamStatisticsDTO;
  playerStatistics: PlayerStatisticsDTO[];
  gameEvents: GameEventSummaryDTO[];
}

interface TeamStatisticsDTO {
  teamName: string;
  runs: number;
  hits: number;
  errors: number;
  leftOnBase: number;
  battingAverage: number;
  onBasePercentage: number;
  runsPerInning: number[];
}

interface PlayerStatisticsDTO {
  playerId: PlayerId;
  name: string;
  jerseyNumber: JerseyNumber;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  strikeouts: number;
  rbi: number;
  runs: number;
  battingAverage: number;
  onBasePercentage: number;
  sluggingPercentage: number;
  fielding: FieldingStatisticsDTO;
}

interface FieldingStatisticsDTO {
  positions: FieldPosition[];
  putouts: number;
  assists: number;
  errors: number;
  fieldingPercentage: number;
}

interface GameEventSummaryDTO {
  eventType: string;
  timestamp: Date;
  inning: number;
  description: string;
  impact: string; // "No runs", "1 run scored", etc.
}

interface GameHistoryDTO {
  gameId: GameId;
  events: GameEventDetailDTO[];
  timeline: TimelineEventDTO[];
}

interface GameEventDetailDTO {
  eventId: string;
  eventType: string;
  timestamp: Date;
  inning: number;
  battingTeam: TeamSide;
  playerInvolved: PlayerId;
  eventData: any;
  resultingGameState: GameStateSnapshotDTO;
}

interface TimelineEventDTO {
  timestamp: Date;
  description: string;
  scoreAfter: GameScoreDTO;
  significantPlay: boolean;
}

interface GameStateSnapshotDTO {
  score: GameScoreDTO;
  inning: number;
  outs: number;
  bases: BasesStateDTO;
}
```

### Export DTOs

```typescript
interface ExportResult {
  success: boolean;
  data?: Blob | string;
  fileName: string;
  mimeType: string;
  errors?: string[];
}

enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  SCOREBOOK = 'scorebook',
}
```

### Notification DTOs

```typescript
interface GameEventNotification {
  type: 'game-event';
  title: string;
  message: string;
  gameId: GameId;
  eventType: string;
  urgency: NotificationUrgency;
}

interface ErrorNotification {
  type: 'error';
  title: string;
  message: string;
  errorCode?: string;
  urgency: NotificationUrgency;
  actionRequired: boolean;
}

interface OfflineModeNotification {
  type: 'offline-mode';
  isOffline: boolean;
  queuedActionsCount?: number;
  lastSyncTime?: Date;
}

enum NotificationUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

## Event Contracts

### Domain Events Schema

```typescript
/**
 * Base event interface - all domain events extend this
 */
interface DomainEventContract {
  eventId: string;
  eventType: string;
  aggregateId: GameId;
  version: number;
  timestamp: Date;
  metadata?: EventMetadata;
}

interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  source: string; // 'web-app', 'mobile-app', etc.
  version: number; // Schema version
}
```

### Game Events

```typescript
interface GameStartedEvent extends DomainEventContract {
  eventType: 'GameStarted';
  homeTeamName: string;
  awayTeamName: string;
  ourTeamSide: TeamSide;
  gameDate: Date;
  location?: string;
  initialLineup: LineupPlayerDTO[];
  gameRules: GameRulesDTO;
}

interface AtBatRecordedEvent extends DomainEventContract {
  eventType: 'AtBatRecorded';
  batterId: PlayerId;
  result: AtBatResultType;
  inning: number;
  outs: number;
  runnerAdvances: RunnerAdvanceDTO[];
  rbi: number;
  basesStateBefore: BasesStateDTO;
  basesStateAfter: BasesStateDTO;
  scoreBefore: GameScoreDTO;
  scoreAfter: GameScoreDTO;
}

interface PlayerSubstitutedEvent extends DomainEventContract {
  eventType: 'PlayerSubstituted';
  substitutions: PlayerSubstitutionDTO[];
  inning: number;
  reason?: string;
}

interface InningEndedEvent extends DomainEventContract {
  eventType: 'InningEnded';
  inning: number;
  half: InningHalf;
  runsScored: number;
  leftOnBase: number;
  battingTeamStats: InningStatsDTO;
}

interface GameCompletedEvent extends DomainEventContract {
  eventType: 'GameCompleted';
  finalScore: GameScoreDTO;
  winner: TeamSide | 'TIE';
  endReason: GameEndReason;
  totalInnings: number;
  gameDuration: number; // minutes
  finalStatistics: GameStatisticsDTO;
}
```

### Supporting Event DTOs

```typescript
interface InningStatsDTO {
  runs: number;
  hits: number;
  errors: number;
  leftOnBase: number;
  battingOrderPosition: number; // Where we'll start next inning
}

enum GameEndReason {
  COMPLETE = 'complete', // 9 innings finished
  MERCY_RULE = 'mercy', // Mercy rule applied
  TIME_LIMIT = 'time-limit', // Time limit reached
  FORFEIT = 'forfeit', // Team forfeited
  WEATHER = 'weather', // Weather cancellation
  MANUAL = 'manual', // Manually ended by user
}

enum InningHalf {
  TOP = 'top',
  BOTTOM = 'bottom',
}
```

## Stored Event Contract

```typescript
/**
 * How events are persisted in event store
 */
interface StoredEvent {
  eventId: string;
  streamId: string; // GameId value
  eventType: string;
  eventData: string; // Serialized event JSON
  eventVersion: number; // Event schema version
  streamVersion: number; // Position in stream
  timestamp: Date;
  metadata: StoredEventMetadata;
}

interface StoredEventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  source: string;
  createdAt: Date;
}
```

## Error Contracts

### Application Errors

```typescript
abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly timestamp: Date = new Date();

  constructor(
    message: string,
    readonly context?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class GameNotFoundError extends ApplicationError {
  readonly code = 'GAME_NOT_FOUND';
  readonly httpStatus = 404;
}

class InvalidCommandError extends ApplicationError {
  readonly code = 'INVALID_COMMAND';
  readonly httpStatus = 400;

  constructor(
    message: string,
    readonly validationErrors: string[]
  ) {
    super(message, { validationErrors });
  }
}

class ConcurrencyError extends ApplicationError {
  readonly code = 'CONCURRENCY_CONFLICT';
  readonly httpStatus = 409;

  constructor(
    readonly expectedVersion: number,
    readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict: expected version ${expectedVersion}, got ${actualVersion}`
    );
  }
}

class BusinessRuleViolationError extends ApplicationError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;

  constructor(ruleName: string, message: string) {
    super(`Business rule '${ruleName}' violated: ${message}`);
  }
}
```

### Error Response Contract

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: Date;
    context?: any;
  };
  validationErrors?: string[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

## Validation Contracts

### Command Validation

```typescript
interface CommandValidator<T> {
  validate(command: T): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Example validators
interface StartNewGameCommandValidator
  extends CommandValidator<StartNewGameCommand> {
  validateTeamNames(command: StartNewGameCommand): ValidationError[];
  validateLineup(lineup: LineupPlayerDTO[]): ValidationError[];
  validateGameRules(rules: GameRulesDTO): ValidationError[];
}

interface RecordAtBatCommandValidator
  extends CommandValidator<RecordAtBatCommand> {
  validateGameState(gameId: GameId): Promise<ValidationError[]>;
  validateBatter(
    batterId: PlayerId,
    gameId: GameId
  ): Promise<ValidationError[]>;
  validateResult(result: AtBatResultType): ValidationError[];
}
```

## Adapter Contracts

### Repository Implementation Contracts

```typescript
/**
 * Concrete implementations must satisfy these contracts
 */
interface GameRepositoryAdapter extends GameRepository {
  // Connection management
  initialize(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;

  // Health checks
  ping(): Promise<boolean>;

  // Batch operations
  saveAll(games: Game[]): Promise<void>;
  findAll(): Promise<Game[]>;
}

interface EventStoreAdapter extends EventStore {
  // Connection management
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Stream management
  createStream(streamId: GameId): Promise<void>;
  deleteStream(streamId: GameId): Promise<void>;
  streamExists(streamId: GameId): Promise<boolean>;

  // Event querying
  getEventCount(streamId: GameId): Promise<number>;
  getLastEvent(streamId: GameId): Promise<StoredEvent | null>;
}
```

These contracts define the boundaries and interfaces for our hexagonal
architecture, ensuring loose coupling between layers while providing type safety
and clear expectations for implementers.

## See Also

- **[Architecture Guide](architecture.md)** - How ports and adapters work in
  hexagonal architecture
- **[Domain Model](domain-model.md)** - Domain entities and events used in
  contracts
- **[Use Cases](use-cases.md)** - User stories that drive these contract
  requirements
- **[Event Sourcing Guide](event-sourcing.md)** - Event contracts implementation
  details
- **[ADR-001: Hexagonal Architecture](../adr/ADR-001-ddd-hexagonal-solid.md)** -
  Ports and adapters decision rationale
