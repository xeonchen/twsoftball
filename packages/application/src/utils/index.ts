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
export { UseCaseErrorHandler } from './UseCaseErrorHandler.js';
export type { ErrorContext, ErrorResultBuilder } from './UseCaseErrorHandler.js';

// Logging utilities - architecture compliant
export { UseCaseLogger } from './UseCaseLogger.js';
export type {
  LogContext,
  OperationContext,
  ErrorContext as LogErrorContext,
  PerformanceMetrics,
} from './UseCaseLogger.js';

// Documentation utilities - architecture compliant
export {
  DESIGN_PATTERNS,
  ERROR_HANDLING_STRATEGY,
  CROSS_AGGREGATE_COORDINATION,
  AUDIT_LOGGING,
  EVENT_SOURCING_DESCRIPTION,
  createBusinessProcessFlow,
  createKeyResponsibilities,
  createJSDocExample,
  createServiceSetupExample,
  createResultHandlingExample,
  createUseCaseFileHeader,
} from './documentation-constants.js';

// DTO mapping utilities - architecture compliant (used within use cases)
export { DTOMappingHelpers } from './DTOMappingHelpers.js';

// Game state DTO orchestration - architecture compliant (used within use cases)
export { GameStateDTOBuilder } from './GameStateDTOBuilder.js';
