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
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
import { TeamLineupId, TeamLineup, GameId, DomainEvent } from '@twsoftball/domain';

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
  constructor(
    private readonly eventStore: EventStore,
    private readonly gameRepository: GameRepository
  ) {}

  async save(lineup: TeamLineup): Promise<void> {
    const events = lineup.getUncommittedEvents();
    const eventsLength = events?.length ?? 0;

    await this.eventStore.append(
      lineup.id,
      'TeamLineup',
      events,
      lineup.getVersion() - eventsLength
    );

    lineup.markEventsAsCommitted();
  }

  async findById(id: TeamLineupId): Promise<TeamLineup | null> {
    if (!id) {
      throw new Error('Invalid lineupId: lineupId cannot be null or undefined');
    }

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
    for (const [_streamId, events] of Array.from(lineupEventGroups)) {
      if (events.length > 0) {
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

    return groupedEvents;
  }
}
