/**
 * @file EventSourcedInningStateRepository
 * Event-sourced implementation of InningStateRepository using EventStore.
 *
 * @remarks
 * Thin wrapper over EventStore that implements the repository pattern for InningState aggregates.
 * This implementation follows event sourcing principles where aggregates are reconstructed
 * from their event streams rather than persisted as snapshots.
 *
 * The repository delegates all persistence operations to the EventStore and relies on
 * InningState.fromEvents() for aggregate reconstruction. It maintains no business logic or
 * domain knowledge, serving purely as an infrastructure adapter.
 */

import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
import { InningStateId, InningState, GameId, DomainEvent } from '@twsoftball/domain';

/**
 * Extended EventStore interface that includes delete operations.
 *
 * @remarks
 * This interface extends the base EventStore with additional methods needed
 * for testing and administrative operations. The delete method is not part
 * of the core EventStore interface as it's not typically needed in production
 * event sourcing scenarios.
 */
interface EventStoreWithDelete extends EventStore {
  delete(id: InningStateId | GameId): Promise<void>;
}

export class EventSourcedInningStateRepository implements InningStateRepository {
  constructor(private readonly eventStore: EventStore) {}

  async save(inningState: InningState): Promise<void> {
    const events = inningState.getUncommittedEvents();
    const eventsLength = events?.length ?? 0;

    await this.eventStore.append(
      inningState.id,
      'InningState',
      events,
      inningState.getVersion() - eventsLength
    );

    inningState.markEventsAsCommitted();
  }

  async findById(id: InningStateId): Promise<InningState | null> {
    if (!id) {
      throw new Error('Invalid inningStateId: inningStateId cannot be null or undefined');
    }

    const storedEvents = await this.eventStore.getEvents(id);
    if (!storedEvents || storedEvents.length === 0) return null;

    // Convert StoredEvents to DomainEvents for InningState reconstruction
    const domainEvents = storedEvents.map(
      storedEvent => JSON.parse(storedEvent.eventData) as DomainEvent
    );
    return InningState.fromEvents(domainEvents);
  }

  async findCurrentByGameId(gameId: GameId): Promise<InningState | null> {
    // Get all events from event store
    const allEvents = await this.eventStore.getAllEvents();

    // Handle case where getAllEvents returns undefined or null
    if (!allEvents) {
      return null;
    }

    // Group events by streamId to reconstruct each inning state
    const inningStateEventGroups = this.groupEventsByStreamId(allEvents, 'InningState');

    // Reconstruct inning states and filter by gameId
    const inningStates: InningState[] = [];
    for (const [_streamId, events] of Array.from(inningStateEventGroups)) {
      if (events.length > 0) {
        const domainEvents = events.map(e => JSON.parse(e.eventData) as DomainEvent);
        const inningState = InningState.fromEvents(domainEvents);
        if (inningState.gameId.equals(gameId)) {
          inningStates.push(inningState);
        }
      }
    }

    // Return the latest inning state (simple chronological order)
    // Let calling code determine what "current" means based on business rules
    return inningStates.length > 0 ? (inningStates[inningStates.length - 1] ?? null) : null;
  }

  async delete(id: InningStateId): Promise<void> {
    // Validate input
    if (!id) {
      throw new Error('InningStateId cannot be null or undefined');
    }

    // Use properly typed EventStore interface extension
    const eventStoreWithDelete = this.eventStore as EventStoreWithDelete;
    await eventStoreWithDelete.delete(id);
  }

  /**
   * Groups events by streamId for a specific aggregate type
   */
  private groupEventsByStreamId(
    allEvents: StoredEvent[],
    aggregateType: string
  ): Map<string, StoredEvent[]> {
    const groupedEvents = new Map<string, StoredEvent[]>();

    for (const event of allEvents) {
      if (event.aggregateType === aggregateType) {
        const streamId = event.streamId;
        if (!groupedEvents.has(streamId)) {
          groupedEvents.set(streamId, []);
        }
        groupedEvents.get(streamId)!.push(event);
      }
    }

    return groupedEvents;
  }
}
