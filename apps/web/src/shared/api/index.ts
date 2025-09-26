/**
 * Shared API Public Interface
 *
 * Provides centralized access to all shared API functionality including
 * dependency injection, mappers, and event management.
 */

// Dependency injection
export * from './di';

// Data mapping utilities
export * from './mappers';

// Event bus
export { EventBus, type EventBusConfig, type DomainEventHandler } from './eventBus';
