/**
 * @file Web Mappers Index
 * Web layer mappers for data transformations.
 *
 * @remarks
 * This module exports mappers that transform UI data structures into
 * Application layer commands and DTOs. These mappers belong in the
 * Web layer because they:
 * - Define the interface between UI and Application layers
 * - Import from Application, Infrastructure, and Domain layers
 * - Transform UI primitives to domain value objects
 * - Handle validation and business rule enforcement
 * - Provide web-specific data transformation logic
 *
 * **Key Components:**
 * - wizardToCommand: Transforms setup wizard state to StartNewGameCommand
 * - commandMapper: Transforms commands between layers
 * - dtoMapper: Transforms DTOs for UI consumption
 *
 * **Architectural Compliance:**
 * - Located in Web layer (can import from any layer)
 * - Provides pure functions with no side effects
 * - Implements comprehensive validation
 * - Maintains clear separation of concerns
 *
 * **Usage:**
 * ```typescript
 * import { wizardToCommand } from '../shared/api/mappers';
 *
 * const command = wizardToCommand(wizardState);
 * await startNewGameUseCase.execute(command);
 * ```
 */

export * from './wizardToCommand.js';
export * from './commandMapper.js';
export * from './dtoMapper.js';
