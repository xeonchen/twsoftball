// Application Layer - Use Cases and Ports
// This layer depends only on the Domain layer

// Use Cases
export * from './use-cases/RecordAtBat';
export * from './use-cases/StartNewGame';
export * from './use-cases/SubstitutePlayer';
export * from './use-cases/EndInning';
export * from './use-cases/UndoLastAction';
export * from './use-cases/RedoLastAction';

// Ports - Input (Driving) Interfaces
export type { GameCommandService } from './ports/in/GameCommandService';
export type { GameQueryService } from './ports/in/GameQueryService';

// Ports - Output (Driven) Interfaces
export type { GameRepository } from './ports/out/GameRepository';
export type { TeamLineupRepository } from './ports/out/TeamLineupRepository';
export type { InningStateRepository } from './ports/out/InningStateRepository';
export type { EventStore, StoredEvent, StoredEventMetadata } from './ports/out/EventStore';
export type {
  SnapshotStore,
  AggregateSnapshot,
  GameSnapshot,
  TeamLineupSnapshot,
  InningStateSnapshot,
} from './ports/out/SnapshotStore';
export type { Logger, LogLevel, LogContext } from './ports/out/Logger';
export type { NotificationService } from './ports/out/NotificationService';
export type { AuthService } from './ports/out/AuthService';

// Application Services - High-level orchestration and event sourcing
export * from './services/GameApplicationService';
export * from './services/EventSourcingService';

// Application Types
export type { ApplicationConfig, ApplicationServices } from './types/ApplicationTypes';

// Dependency Injection Container
export * from './services/DIContainer';

// Infrastructure Factory Interface
export type {
  InfrastructureFactory,
  InfrastructureConfig,
  InfrastructureServices,
} from './services/InfrastructureFactory';

// Test Utilities - EventStore testing support (not exported in production build)
// Import directly: import { ... } from '@twsoftball/application/test-utils/event-store'

// DTOs - Data Transfer Objects
export type { AtBatResult } from './dtos/AtBatResult';
export type { AtBatResultDTO } from './dtos/AtBatResultDTO';
export type { BasesStateDTO } from './dtos/BasesStateDTO';
export type { EndInningCommand } from './dtos/EndInningCommand';
export type { GameScoreDTO } from './dtos/GameScoreDTO';
export type { GameStartResult } from './dtos/GameStartResult';
export type { GameStateDTO } from './dtos/GameStateDTO';
export type { InningEndResult } from './dtos/InningEndResult';
export type { PlayerInGameDTO } from './dtos/PlayerInGameDTO';
export type { PlayerStatisticsDTO } from './dtos/PlayerStatisticsDTO';
export type { RecordAtBatCommand } from './dtos/RecordAtBatCommand';
export type { RunnerAdvanceDTO } from './dtos/RunnerAdvanceDTO';
export type { StartNewGameCommand } from './dtos/StartNewGameCommand';
export type { SubstitutePlayerCommand } from './dtos/SubstitutePlayerCommand';
export type { SubstitutionResult } from './dtos/SubstitutionResult';
export type { TeamLineupDTO } from './dtos/TeamLineupDTO';
export type { UndoCommand } from './dtos/UndoCommand';
export type { UndoResult } from './dtos/UndoResult';
export type { RedoCommand } from './dtos/RedoCommand';
export type { RedoResult } from './dtos/RedoResult';
export type { CompleteAtBatSequenceCommand } from './dtos/CompleteAtBatSequenceCommand';
export type { CompleteAtBatSequenceResult } from './dtos/CompleteAtBatSequenceResult';
export type { CompleteGameWorkflowCommand } from './dtos/CompleteGameWorkflowCommand';
export type { CompleteGameWorkflowResult } from './dtos/CompleteGameWorkflowResult';

// Domain type exports for presentation layer
export * from './types/domain-exports';

// Error Classes - Application layer errors for presentation layer
export {
  ValidationError,
  ValidationErrorUtils,
  ValidationErrorFactory,
} from './errors/ValidationError';
