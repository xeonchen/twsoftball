import { GameId } from '../value-objects/GameId';

/**
 * Abstract base class for all domain events in the softball event sourcing system.
 *
 * @remarks
 * DomainEvent provides the foundation for event sourcing architecture by establishing
 * common properties and patterns that all domain events must follow:
 *
 * **Event Sourcing Pattern**: Every state change in the domain is represented as
 * an immutable event that captures what happened, when it happened, and in which
 * game context.
 *
 * **Common Properties**:
 * - eventId: Unique identifier for this specific event instance
 * - timestamp: When the event occurred (used for event ordering)
 * - version: Event schema version (enables event evolution)
 * - gameId: Associates event with specific game aggregate
 *
 * **Implementation Requirements**:
 * - Subclasses must define readonly `type` property for event identification
 * - All events are immutable once created
 * - Events should contain all data needed to reconstruct state changes
 *
 * **Domain Context**: Events represent facts about what has happened in the game:
 * - AtBatCompleted, RunScored, RunnerAdvanced capture gameplay events
 * - Events are persisted in order and can be replayed to rebuild game state
 * - Event stream provides complete audit trail of all game actions
 *
 * @example
 * ```typescript
 * // Example concrete event implementation
 * class AtBatRecorded extends DomainEvent {
 *   readonly type = 'AtBatRecorded';
 *
 *   constructor(
 *     readonly gameId: GameId,
 *     readonly playerId: PlayerId,
 *     readonly result: AtBatResultType
 *   ) {
 *     super();
 *   }
 * }
 *
 * // Events contain all necessary data for state reconstruction
 * const event = new AtBatRecorded(gameId, playerId, AtBatResultType.SINGLE);
 * console.log(event.eventId);   // Unique UUID
 * console.log(event.timestamp); // When event was created
 * ```
 */
export abstract class DomainEvent {
  /** Unique identifier for this specific event instance */
  readonly eventId: string = crypto.randomUUID();

  /** When this event occurred - used for event ordering in event sourcing */
  readonly timestamp: Date = new Date();

  /** Event schema version - enables event evolution and backward compatibility */
  readonly version: number = 1;

  /** Event type identifier - must be unique across all domain events */
  abstract readonly type: string;

  /** Game aggregate identifier - associates this event with specific game instance */
  abstract readonly gameId: GameId;
}
