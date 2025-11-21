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

import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
import type { SnapshotStore } from '@twsoftball/application/ports/out/SnapshotStore';
import { SnapshotManager } from '@twsoftball/application/services/SnapshotManager';
import { InningStateId, InningState, GameId, DomainEvent } from '@twsoftball/domain';

import { EventSourcingHelpers } from './utils/EventSourcingHelpers.js';

interface EventSourcedAggregate {
  getId(): InningStateId;
  getVersion(): number;
  getAggregateType(): 'Game' | 'TeamLineup' | 'InningState';
  getState(): unknown;
  applyEvents(): void;
}

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
  private readonly snapshotManager?: SnapshotManager;

  constructor(
    private readonly eventStore: EventStore,
    snapshotStore?: SnapshotStore
  ) {
    // Create SnapshotManager only when SnapshotStore is provided for backward compatibility
    if (snapshotStore) {
      this.snapshotManager = new SnapshotManager(eventStore, snapshotStore);
    }
  }

  async save(inningState: InningState): Promise<void> {
    const events = inningState.getUncommittedEvents();
    const eventsLength = events?.length ?? 0;

    // Save events to event store first
    await this.eventStore.append(
      inningState.id,
      'InningState',
      events,
      inningState.getVersion() - eventsLength
    );

    // Mark events as committed
    inningState.markEventsAsCommitted();

    // Create snapshot if SnapshotManager is available and threshold is reached
    if (this.snapshotManager) {
      try {
        const shouldCreateSnapshot = await this.snapshotManager.shouldCreateSnapshot(
          inningState.id
        );

        if (shouldCreateSnapshot) {
          // Create a wrapper that implements EventSourcedAggregate interface
          const aggregateWrapper = this.createAggregateWrapper(inningState);
          await this.snapshotManager.createSnapshot(aggregateWrapper);
        }
      } catch (_error) {
        // Snapshot creation errors should not affect the save operation
        // In production, this would be logged to a proper logging service
        // For now, we silently ignore snapshot creation errors
      }
    }
  }

  /**
   * Creates a wrapper that adapts InningState aggregate to EventSourcedAggregate interface.
   */
  private createAggregateWrapper(inningState: InningState): EventSourcedAggregate {
    return {
      getId: () => inningState.id,
      getVersion: () => inningState.getVersion(),
      getAggregateType: () => 'InningState' as const,
      getState: () => ({
        id: inningState.id.value,
        gameId: inningState.gameId.value,
        inning: inningState.inning,
        isTopHalf: inningState.isTopHalf,
        outs: inningState.outs,
        currentBattingSlot: inningState.currentBattingSlot,
        basesState: {
          first: inningState.basesState.getRunner('FIRST')?.value || null,
          second: inningState.basesState.getRunner('SECOND')?.value || null,
          third: inningState.basesState.getRunner('THIRD')?.value || null,
        },
        version: inningState.getVersion(),
      }),
      applyEvents: (): void => {
        // This method is required by interface but not used in snapshot creation
        throw new Error('applyEvents not supported in this context');
      },
    };
  }

  async findById(id: InningStateId): Promise<InningState | null> {
    if (!id) {
      throw new Error('Invalid inningStateId: inningStateId cannot be null or undefined');
    }

    // Use snapshot optimization when SnapshotManager is available
    if (this.snapshotManager) {
      try {
        const loadResult = await this.snapshotManager.loadAggregate(id, 'InningState');

        // Return null if no data exists
        if (loadResult.version === 0 && loadResult.subsequentEvents.length === 0) {
          return null;
        }

        // Reconstruct from snapshot + subsequent events when snapshot is available
        if (loadResult.reconstructedFromSnapshot && loadResult.data) {
          const subsequentDomainEvents = loadResult.subsequentEvents.map(
            storedEvent => JSON.parse(storedEvent.eventData) as DomainEvent
          );

          // If we have subsequent events, reconstruct only from those for now
          // In a full implementation, we would have InningState.fromSnapshot(data, events)
          if (subsequentDomainEvents.length > 0) {
            return InningState.fromEvents(subsequentDomainEvents);
          }

          // If no events since snapshot, fall back to traditional event sourcing for the entire stream
          // This ensures we get a properly reconstructed aggregate
          return this.findByIdFromEvents(id);
        }

        // Fallback to event-only reconstruction when no snapshot available
        const allDomainEvents = loadResult.subsequentEvents.map(
          storedEvent => JSON.parse(storedEvent.eventData) as DomainEvent
        );

        if (allDomainEvents.length === 0) return null;
        return InningState.fromEvents(allDomainEvents);
      } catch (_error) {
        // Graceful fallback to event-only loading on snapshot errors
        return this.findByIdFromEvents(id);
      }
    }

    // Traditional event-only loading when no SnapshotManager available
    return this.findByIdFromEvents(id);
  }

  /**
   * Traditional event-only reconstruction method for backward compatibility.
   */
  private async findByIdFromEvents(id: InningStateId): Promise<InningState | null> {
    const storedEvents = await this.eventStore.getEvents(id);

    if (!storedEvents || storedEvents.length === 0) {
      return null;
    }

    // Convert StoredEvents to DomainEvents for InningState reconstruction
    const domainEvents = storedEvents.map(storedEvent => {
      const domainEvent = JSON.parse(storedEvent.eventData) as DomainEvent;
      return domainEvent;
    });
    const reconstructedInningState = InningState.fromEvents(domainEvents);

    return reconstructedInningState;
  }

  async findCurrentByGameId(gameId: GameId): Promise<InningState | null> {
    // Get all events from event store
    const allEvents = await this.eventStore.getAllEvents();

    // Handle case where getAllEvents returns undefined or null
    if (!allEvents) {
      return null;
    }

    // Group events by streamId to reconstruct each inning state
    const inningStateEventGroups = EventSourcingHelpers.groupEventsByStreamId(
      allEvents,
      'InningState'
    );

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
}
