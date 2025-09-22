/**
 * @file Dependency Injection Module
 * Exports all dependency injection related functionality for the Web layer.
 *
 * @remarks
 * This module provides a clean public API for the dependency injection system,
 * exposing only the necessary interfaces and functions while keeping internal
 * implementation details private.
 *
 * Key Exports:
 * - Container initialization and access functions
 * - Configuration interfaces
 * - Logger implementation
 * - Type definitions for dependency injection
 *
 * Usage:
 * - Import container functions for app initialization
 * - Use type definitions for TypeScript integration
 * - Access logger factory for testing or standalone use
 */

// Core container functionality
export { initializeContainer, getContainer, resetContainer } from './container';
export type { DependencyContainer, ContainerConfig } from './container';

// Logger implementation
export { ConsoleLogger, createLogger } from './logger';

// Re-export Logger types from application layer for convenience
export type {
  Logger,
  LogLevel,
  LogContext,
  LogEntry,
} from '@twsoftball/application/ports/out/Logger';
