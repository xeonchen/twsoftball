/**
 * @file Outbound Ports Index
 * Barrel export file for all outbound port interfaces in the application layer.
 *
 * @remarks
 * This module consolidates all outbound port interfaces (driven adapters) that
 * define contracts for external dependencies in the hexagonal architecture.
 * These interfaces represent the driven side of the ports and adapters pattern,
 * allowing the application core to depend on abstractions rather than concrete
 * implementations.
 *
 * Outbound ports include:
 * - Repository interfaces for aggregate persistence
 * - Service interfaces for external system integration
 * - Event store interfaces for event sourcing
 * - Infrastructure service contracts
 *
 * All exports maintain the principle of dependency inversion, ensuring that
 * the application layer defines the contracts that infrastructure layer
 * implementations must satisfy.
 */

export type { AuthService } from './AuthService';
export type { EventStore, StoredEvent, StoredEventMetadata } from './EventStore';
export type { GameRepository } from './GameRepository';
export type { InningStateRepository } from './InningStateRepository';
export type { Logger } from './Logger';
export type { NotificationService } from './NotificationService';
export type {
  SnapshotStore,
  AggregateSnapshot,
  GameSnapshot,
  TeamLineupSnapshot,
  InningStateSnapshot,
} from './SnapshotStore';
export type { TeamLineupRepository } from './TeamLineupRepository';
