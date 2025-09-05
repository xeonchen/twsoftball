/**
 * @file utils/index.ts
 * Central export point for utility classes that maintain architecture compliance.
 *
 * @remarks
 * This module provides access to utilities that follow hexagonal architecture
 * principles. Some utilities were removed to maintain architecture compliance:
 * - GameStateDTOBuilder and ValidationUtils were removed because they violated
 *   the principle that application layer utilities should not import domain
 *   aggregates directly outside of use cases.
 */

// Error handling utilities - architecture compliant
export { UseCaseErrorHandler } from './UseCaseErrorHandler';
export type { ErrorContext, ErrorResultBuilder } from './UseCaseErrorHandler';

// Logging utilities - architecture compliant
export { UseCaseLogger } from './UseCaseLogger';
export type {
  LogContext,
  OperationContext,
  ErrorContext as LogErrorContext,
  PerformanceMetrics,
} from './UseCaseLogger';
