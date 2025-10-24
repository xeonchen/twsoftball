/**
 * @file EventSourcedTeamLineupRepository
 * Event-sourced implementation of TeamLineupRepository using EventStore.
 *
 * @remarks
 * Thin wrapper over EventStore that implements the repository pattern for TeamLineup aggregates.
 * This implementation follows event sourcing principles where aggregates are reconstructed
 * from their event streams rather than persisted as snapshots.
 *
 * The repository delegates all persistence operations to the EventStore and relies on
 * TeamLineup.fromEvents() for aggregate reconstruction. It maintains no business logic or
 * domain knowledge, serving purely as an infrastructure adapter.
 */

import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import type { SnapshotStore } from '@twsoftball/application/ports/out/SnapshotStore';
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
import { SnapshotManager } from '@twsoftball/application/services/SnapshotManager';
import { TeamLineupId, TeamLineup, GameId, DomainEvent } from '@twsoftball/domain';

interface EventSourcedAggregate {
  getId(): TeamLineupId;
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
  delete(id: TeamLineupId | GameId): Promise<void>;
}

export class EventSourcedTeamLineupRepository implements TeamLineupRepository {
  private readonly snapshotManager?: SnapshotManager;

  constructor(
    private readonly eventStore: EventStore,
    private readonly gameRepository: GameRepository,
    snapshotStore?: SnapshotStore
  ) {
    // Create SnapshotManager only when SnapshotStore is provided for backward compatibility
    if (snapshotStore) {
      this.snapshotManager = new SnapshotManager(eventStore, snapshotStore);
    }
  }

  async save(lineup: TeamLineup): Promise<void> {
    const events = lineup.getUncommittedEvents();
    const eventsLength = events?.length ?? 0;

    // Save events to event store first
    await this.eventStore.append(
      lineup.id,
      'TeamLineup',
      events,
      lineup.getVersion() - eventsLength
    );

    // Mark events as committed
    lineup.markEventsAsCommitted();

    // Create snapshot if SnapshotManager is available and threshold is reached
    if (this.snapshotManager) {
      try {
        const shouldCreateSnapshot = await this.snapshotManager.shouldCreateSnapshot(lineup.id);

        if (shouldCreateSnapshot) {
          // Create a wrapper that implements EventSourcedAggregate interface
          const aggregateWrapper = this.createAggregateWrapper(lineup);
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
   * Creates a wrapper that adapts TeamLineup aggregate to EventSourcedAggregate interface.
   */
  private createAggregateWrapper(lineup: TeamLineup): EventSourcedAggregate {
    return {
      getId: () => lineup.id,
      getVersion: () => lineup.getVersion(),
      getAggregateType: () => 'TeamLineup' as const,
      getState: () => ({
        id: lineup.id.value,
        gameId: lineup.gameId.value,
        teamName: lineup.teamName,
        version: lineup.getVersion(),
      }),
      applyEvents: (): void => {
        // This method is required by interface but not used in snapshot creation
        throw new Error('applyEvents not supported in this context');
      },
    };
  }

  async findById(id: TeamLineupId): Promise<TeamLineup | null> {
    if (!id) {
      throw new Error('Invalid lineupId: lineupId cannot be null or undefined');
    }

    // Use snapshot optimization when SnapshotManager is available
    if (this.snapshotManager) {
      try {
        const loadResult = await this.snapshotManager.loadAggregate(id, 'TeamLineup');

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
          // In a full implementation, we would have TeamLineup.fromSnapshot(data, events)
          if (subsequentDomainEvents.length > 0) {
            return TeamLineup.fromEvents(subsequentDomainEvents);
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
        return TeamLineup.fromEvents(allDomainEvents);
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
  private async findByIdFromEvents(id: TeamLineupId): Promise<TeamLineup | null> {
    const storedEvents = await this.eventStore.getEvents(id);
    if (!storedEvents || storedEvents.length === 0) return null;

    // Convert StoredEvents to DomainEvents for TeamLineup reconstruction
    const domainEvents = storedEvents.map(
      storedEvent => JSON.parse(storedEvent.eventData) as DomainEvent
    );
    return TeamLineup.fromEvents(domainEvents);
  }

  async findByGameId(gameId: GameId): Promise<TeamLineup[]> {
    // Get all events from event store
    const allEvents = await this.eventStore.getAllEvents();

    // Handle case where getAllEvents returns undefined or null
    if (!allEvents) {
      return [];
    }

    // Group events by streamId to reconstruct each lineup
    const lineupEventGroups = this.groupEventsByStreamId(allEvents, 'TeamLineup');

    // Reconstruct lineups and filter by gameId
    const lineups: TeamLineup[] = [];
    for (const [streamId, events] of Array.from(lineupEventGroups)) {
      if (events.length > 0) {
        // [FAIL FAST] Validate first event is TeamLineupCreated
        if (events[0]?.eventType !== 'TeamLineupCreated') {
          throw new Error(
            `[Repository.findByGameId] Event ordering violation: streamId ${streamId} starts with ${events[0]?.eventType} instead of TeamLineupCreated. ` +
              `This indicates events are being grouped incorrectly or stored with wrong streamId.`
          );
        }

        const domainEvents = events.map(e => JSON.parse(e.eventData) as DomainEvent);
        const lineup = TeamLineup.fromEvents(domainEvents);
        if (lineup.gameId.equals(gameId)) {
          lineups.push(lineup);
        }
      }
    }

    return lineups;
  }

  async findByGameIdAndSide(gameId: GameId, side: 'HOME' | 'AWAY'): Promise<TeamLineup | null> {
    // Get all lineups for the game
    const gameLineups = await this.findByGameId(gameId);
    if (gameLineups.length === 0) {
      return null;
    }

    // Get game to determine home/away team names
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      return null;
    }

    // Find lineup by comparing team name with game's home/away team names
    return (
      gameLineups.find(lineup => {
        if (side === 'HOME') {
          return lineup.teamName === game.homeTeamName;
        } else {
          return lineup.teamName === game.awayTeamName;
        }
      }) ?? null
    );
  }

  async delete(id: TeamLineupId): Promise<void> {
    // Validate input
    if (!id) {
      throw new Error('TeamLineupId cannot be null or undefined');
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

    // [FIX] Sort events within each stream by timestamp to ensure correct order
    // IndexedDB's openCursor() does not guarantee order, so we must sort explicitly
    for (const [streamId, events] of groupedEvents.entries()) {
      events.sort((a, b) => {
        // Primary sort: streamVersion (ensures creation event comes first)
        if (a.streamVersion !== b.streamVersion) {
          return a.streamVersion - b.streamVersion;
        }
        // Secondary sort: timestamp (for events with same version)
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      // [FAIL FAST] Validate first event
      const firstEvent = events[0];
      if (!firstEvent || firstEvent.eventType !== 'TeamLineupCreated') {
        throw new Error(
          `[Repository] CRITICAL: First event in stream ${streamId} is "${firstEvent?.eventType ?? 'undefined'}", expected "TeamLineupCreated". ` +
            `All events: ${events.map(e => `${e.eventType}(v${e.streamVersion})`).join(', ')}`
        );
      }

      groupedEvents.set(streamId, events);
    }

    return groupedEvents;
  }
}
