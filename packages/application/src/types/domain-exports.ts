/**
 * @file Domain Type Exports for Presentation Layer
 *
 * This module re-exports domain types that are needed by presentation layers
 * (like the Web UI) while maintaining proper architectural boundaries.
 *
 * @remarks
 * By re-exporting these types through the Application layer, we ensure that:
 * - Web layer doesn't import directly from Domain layer
 * - Domain types remain accessible to presentation code
 * - Architectural dependencies flow correctly (Web → Application → Domain)
 *
 * Only essential domain types needed by presentation layers should be re-exported here.
 * Internal domain types that are purely business logic should remain private to the domain.
 */

// Value Objects - Core identifiers and values needed by presentation
export { GameId, PlayerId, JerseyNumber, TeamLineupId } from '@twsoftball/domain';

// Enums and Constants - Business rules exposed to presentation
export { FieldPosition, AtBatResultType, GameStatus, JERSEY_NUMBERS } from '@twsoftball/domain';

// Error Classes - Domain errors for proper error handling in presentation
export { DomainError } from '@twsoftball/domain';

// Note: Complex domain entities (Game, TeamLineup, etc.) are intentionally NOT re-exported
// as presentation layers should work with DTOs and commands, not domain objects directly
