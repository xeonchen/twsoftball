/**
 * @file Application Services Index
 * Exports for all application layer services providing high-level orchestration.
 *
 * @remarks
 * This module exports all application services that coordinate multiple use cases
 * and provide advanced functionality like event sourcing management. These services
 * represent the highest level of abstraction in the application layer.
 *
 * **Service Categories**:
 * - **GameApplicationService**: Complex game workflow orchestration
 * - **EventSourcingService**: Advanced event sourcing operations
 * - **SnapshotManager**: Snapshot management and optimization
 *
 * All services follow hexagonal architecture principles, depending only on
 * use cases and ports, never directly on infrastructure implementations.
 */

// High-level orchestration services
export * from './GameApplicationService';
export * from './EventSourcingService';
export * from './SnapshotManager';

// Re-export service result types for convenience
export type {
  EventStreamResult,
  EventAppendResult,
  AggregateReconstructionResult,
  SnapshotCreationResult,
  SnapshotLoadResult,
  EventQueryResult,
  EventMigrationResult,
  BatchOperationResult,
  StreamConsistencyResult,
} from './EventSourcingService';
