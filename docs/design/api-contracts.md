# API Contracts and Interface Definitions

> **Note**: This document defines the API contracts and interfaces for the
> application. Phase 2 (Domain Layer) is now COMPLETE with 3 aggregates, 15
> domain events, and 5 domain services. This document has been updated to
> reflect the actual implemented domain layer structure.

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

## Domain Layer Architecture (Phase 2 - COMPLETED)

The domain layer implements a **multi-aggregate design** with clear separation
of concerns:

### Aggregate Root Structure

```
Game (Aggregate Root) - Coordination & Scoring
├── GameId (Value Object)
├── GameStatus (Value Object)
├── GameScore (Value Object)
├── CurrentInning & TopHalf tracking
└── Manages overall game lifecycle and scoring

TeamLineup (Aggregate Root) - Player Management
├── TeamLineupId (Value Object)
├── GameId (Reference to Game)
├── TeamSide (HOME | AWAY)
├── TeamStrategy (DetailedTeam | SimpleTeam pattern)
├── BattingSlots with substitution history
├── FieldPositions mapping
└── Manages player lineups, substitutions, and re-entry rules

InningState (Aggregate Root) - Current Play State
├── InningStateId (Value Object)
├── GameId (Reference to Game)
├── Inning & Half tracking
├── Outs (0-2)
├── BasesState (Value Object - immutable)
├── CurrentBatterSlot
└── Manages detailed inning-level gameplay state
```

### Domain Services (5 Implemented)

```typescript
/**
 * GameCoordinator - Orchestrates multi-aggregate operations
 * Coordinates complex operations across Game, TeamLineup, and InningState aggregates
 */
interface GameCoordinator {
  recordAtBat(
    game: Game,
    inningState: InningState,
    batterId: PlayerId,
    result: AtBatResultType,
    runnerMovements?: RunnerAdvancement[]
  ): AtBatRecordingResult;
}

/**
 * RBICalculator - Calculates RBIs based on game rules
 * Implements complex RBI attribution rules for different hit types and situations
 */
interface RBICalculator {
  calculate(
    result: AtBatResultType,
    runnerMovements: RunnerMovement[],
    basesState: BasesState,
    outs: number
  ): number;
}

/**
 * LineupValidator - Validates roster configurations
 * Ensures lineup constraints, duplicate checking, and position requirements
 */
interface LineupValidator {
  validateLineup(
    players: PlayerInfo[],
    strategy: TeamStrategy
  ): ValidationResult;
}

/**
 * StatisticsCalculator - Computes player and team statistics
 * Calculates batting average, OBP, slugging percentage, and other metrics
 */
interface StatisticsCalculator {
  calculatePlayerStats(atBats: AtBatResult[]): PlayerStats;
  calculateTeamStats(players: PlayerInfo[]): TeamStats;
}

/**
 * SubstitutionValidator - Validates substitution rules
 * Enforces substitution constraints, re-entry rules, and batting slot management
 */
interface SubstitutionValidator {
  canSubstitute(
    lineup: TeamLineup,
    incomingPlayer: PlayerId,
    outgoingPlayer: PlayerId
  ): SubstitutionValidationResult;
}
```

### Configurable Game Rules

```typescript
/**
 * SoftballRules - Core game rule configuration
 */
interface SoftballRules {
  mercyRule: {
    enabled: boolean;
    runsAfter4Innings: number; // Default: 10
    runsAfter5Innings: number; // Default: 7
  };
  gameLength: {
    regularInnings: number; // Default: 7
    timeLimitMinutes: number | null; // Default: 60
  };
  lineup: {
    minimumPlayers: number; // Default: 9
    maximumPlayers: number; // Default: 20
    allowExtraPlayer: boolean; // Default: true
  };
}

/**
 * RuleVariants - Predefined rule configurations
 */
enum RuleVariants {
  STANDARD_LEAGUE = 'standard-league',
  TOURNAMENT_PLAY = 'tournament-play',
  RECREATIONAL = 'recreational',
}
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

#### Aggregate Repositories

```typescript
/**
 * Repository for Game aggregate root - coordination and scoring
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

/**
 * Repository for TeamLineup aggregate root - player management
 * Implemented by: IndexedDBTeamLineupRepository, InMemoryTeamLineupRepository
 * Used by: Application Use Cases
 */
interface TeamLineupRepository {
  findById(id: TeamLineupId): Promise<TeamLineup | null>;
  findByGameId(gameId: GameId): Promise<TeamLineup[]>; // Home & Away lineups
  findByGameIdAndSide(
    gameId: GameId,
    side: 'HOME' | 'AWAY'
  ): Promise<TeamLineup | null>;
  save(lineup: TeamLineup): Promise<void>;
  delete(id: TeamLineupId): Promise<void>;
}

/**
 * Repository for InningState aggregate root - play state management
 * Implemented by: IndexedDBInningStateRepository, InMemoryInningStateRepository
 * Used by: Application Use Cases
 */
interface InningStateRepository {
  findById(id: InningStateId): Promise<InningState | null>;
  findCurrentByGameId(gameId: GameId): Promise<InningState | null>;
  save(inningState: InningState): Promise<void>;
  delete(id: InningStateId): Promise<void>;
}
```

#### Event Store

```typescript
/**
 * Secondary port for event persistence and retrieval across all aggregates
 * Implemented by: IndexedDBEventStore, InMemoryEventStore
 * Used by: Application Use Cases, Event Sourcing Infrastructure
 */
interface EventStore {
  // Multi-aggregate event storage with type safety
  append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;

  // Get events for specific aggregate instance
  getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]>;

  // Get all events for a game across all aggregates (for reconstruction)
  getGameEvents(gameId: GameId): Promise<StoredEvent[]>;

  // Query capabilities
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;
  getEventsByType(
    eventType: string,
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;

  // Cross-aggregate queries for coordination
  getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;
}
```

#### Snapshot Store

```typescript
/**
 * Secondary port for aggregate snapshot storage across all aggregate types
 * Implemented by: IndexedDBSnapshotStore, InMemorySnapshotStore
 * Used by: Event Sourcing Infrastructure
 */
interface SnapshotStore {
  // Multi-aggregate snapshot support
  saveSnapshot(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    snapshot: AggregateSnapshot
  ): Promise<void>;

  getSnapshot(
    streamId: GameId | TeamLineupId | InningStateId
  ): Promise<AggregateSnapshot | null>;

  deleteSnapshot(
    streamId: GameId | TeamLineupId | InningStateId
  ): Promise<void>;

  // Game-level snapshot cleanup
  deleteGameSnapshots(gameId: GameId): Promise<void>;
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
/**
 * Composite DTO representing complete game state across all aggregates
 * Composed from Game, TeamLineup, and InningState aggregates
 */
interface GameStateDTO {
  // From Game aggregate
  gameId: GameId;
  status: GameStatus;
  score: GameScoreDTO;
  gameStartTime: Date;

  // From InningState aggregate
  currentInning: number;
  isTopHalf: boolean;
  battingTeam: TeamSide;
  outs: number;
  bases: BasesStateDTO;
  currentBatterSlot: number;

  // From TeamLineup aggregates (both home and away)
  homeLineup: TeamLineupDTO;
  awayLineup: TeamLineupDTO;

  // Composite calculated fields
  currentBatter: PlayerInGameDTO | null;
  lastUpdated: Date;
}

/**
 * DTO representing a team's lineup state
 */
interface TeamLineupDTO {
  teamLineupId: TeamLineupId;
  gameId: GameId;
  teamSide: 'HOME' | 'AWAY';
  teamName: string;
  strategy: 'DETAILED' | 'SIMPLE';
  battingSlots: BattingSlotDTO[];
  fieldPositions: Record<FieldPosition, PlayerId | null>;
  benchPlayers: PlayerInGameDTO[];
  substitutionHistory: SubstitutionRecordDTO[];
}

/**
 * DTO representing a batting slot with its history
 */
interface BattingSlotDTO {
  slotNumber: number;
  currentPlayer: PlayerInGameDTO | null;
  history: SlotHistoryDTO[];
}

/**
 * DTO representing the history of a batting slot
 */
interface SlotHistoryDTO {
  playerId: PlayerId;
  playerName: string;
  enteredInning: number;
  exitedInning?: number;
  wasStarter: boolean;
  isReentry: boolean;
}

/**
 * DTO representing a substitution record
 */
interface SubstitutionRecordDTO {
  incomingPlayerId: PlayerId;
  outgoingPlayerId: PlayerId;
  incomingPlayerName: string;
  outgoingPlayerName: string;
  battingSlot: number;
  inning: number;
  isReentry: boolean;
  timestamp: Date;
}

// Note: TeamInGameDTO is replaced by TeamLineupDTO above for better aggregate alignment

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

### Domain Events (15 Implemented)

The domain layer uses fine-grained events for better audit trails and
flexibility:

```typescript
// Game Aggregate Events (5)
interface GameCreatedEvent extends DomainEventContract {
  eventType: 'GameCreated';
  gameId: GameId;
  homeTeamName: string;
  awayTeamName: string;
}

interface GameStartedEvent extends DomainEventContract {
  eventType: 'GameStarted';
  gameId: GameId;
  timestamp: Date;
}

interface GameCompletedEvent extends DomainEventContract {
  eventType: 'GameCompleted';
  gameId: GameId;
  finalScore: GameScore;
  completionReason: 'REGULATION' | 'WALKOFF' | 'MERCY_RULE';
}

interface ScoreUpdatedEvent extends DomainEventContract {
  eventType: 'ScoreUpdated';
  gameId: GameId;
  teamSide: 'HOME' | 'AWAY';
  runsAdded: number;
  newHomeScore: number;
  newAwayScore: number;
}

interface InningAdvancedEvent extends DomainEventContract {
  eventType: 'InningAdvanced';
  gameId: GameId;
  newInning: number;
  newTopHalf: boolean;
}

// TeamLineup Aggregate Events (3)
interface TeamLineupCreatedEvent extends DomainEventContract {
  eventType: 'TeamLineupCreated';
  teamLineupId: TeamLineupId;
  gameId: GameId;
  teamSide: 'HOME' | 'AWAY';
  strategyType: 'DETAILED' | 'SIMPLE';
}

interface PlayerAddedToLineupEvent extends DomainEventContract {
  eventType: 'PlayerAddedToLineup';
  teamLineupId: TeamLineupId;
  gameId: GameId;
  playerId: PlayerId;
  battingSlot: number;
  fieldPosition: FieldPosition;
}

interface PlayerSubstitutedIntoGameEvent extends DomainEventContract {
  eventType: 'PlayerSubstitutedIntoGame';
  teamLineupId: TeamLineupId;
  gameId: GameId;
  incomingPlayerId: PlayerId;
  outgoingPlayerId: PlayerId;
  battingSlot: number;
  inning: number;
  isReentry: boolean;
}

interface FieldPositionChangedEvent extends DomainEventContract {
  eventType: 'FieldPositionChanged';
  teamLineupId: TeamLineupId;
  gameId: GameId;
  playerId: PlayerId;
  fromPosition: FieldPosition;
  toPosition: FieldPosition;
}

// InningState Aggregate Events (6)
interface InningStateCreatedEvent extends DomainEventContract {
  eventType: 'InningStateCreated';
  inningStateId: InningStateId;
  gameId: GameId;
  startingInning: number;
  startingTopHalf: boolean;
}

interface AtBatCompletedEvent extends DomainEventContract {
  eventType: 'AtBatCompleted';
  inningStateId: InningStateId;
  gameId: GameId;
  batterId: PlayerId;
  battingSlot: number;
  result: AtBatResultType;
  inning: number;
  outs: number;
}

interface RunnerAdvancedEvent extends DomainEventContract {
  eventType: 'RunnerAdvanced';
  inningStateId: InningStateId;
  gameId: GameId;
  runnerId: PlayerId;
  fromBase: Base | null; // null for batter
  toBase: Base | 'HOME';
  advanceReason: string;
}

interface RunScoredEvent extends DomainEventContract {
  eventType: 'RunScored';
  inningStateId: InningStateId;
  gameId: GameId;
  scoringPlayerId: PlayerId;
  battingTeam: 'HOME' | 'AWAY';
  rbiCreditedTo: PlayerId | null;
  inning: number;
}

interface HalfInningEndedEvent extends DomainEventContract {
  eventType: 'HalfInningEnded';
  inningStateId: InningStateId;
  gameId: GameId;
  completedInning: number;
  completedHalf: 'TOP' | 'BOTTOM';
  runsScored: number;
  outsRecorded: number;
}

interface CurrentBatterChangedEvent extends DomainEventContract {
  eventType: 'CurrentBatterChanged';
  inningStateId: InningStateId;
  gameId: GameId;
  previousBatterSlot: number;
  newBatterSlot: number;
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

## Phase 2 Status: COMPLETED ✅

**Domain Layer Implementation Summary:**

- ✅ **3 Aggregate Roots**: Game, TeamLineup, InningState with clear boundaries
- ✅ **15 Domain Events**: Fine-grained events for complete audit trails
- ✅ **5 Domain Services**: GameCoordinator, RBICalculator, LineupValidator,
  StatisticsCalculator, SubstitutionValidator
- ✅ **11 Value Objects**: GameId, PlayerId, GameScore, JerseyNumber, Score,
  BasesState, BattingSlot, etc.
- ✅ **3 Rule Systems**: SoftballRules, RuleVariants, TeamStrategy patterns
- ✅ **99.19% Test Coverage**: 1,143 comprehensive tests validating all business
  logic
- ✅ **Event Sourcing**: Full event sourcing implementation with aggregate
  reconstruction

**Ready for Phase 3 - Application Layer:** The domain layer provides a solid
foundation for implementing the application layer (use cases, ports, and
adapters). The multi-aggregate design enables better performance, clearer
boundaries, and more maintainable code as we move into application services and
infrastructure implementation.

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
