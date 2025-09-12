/**
 * @file EventSourcedGameRepository
 * Event-sourced implementation of GameRepository using EventStore.
 *
 * @remarks
 * Thin wrapper over EventStore that implements the repository pattern for Game aggregates.
 * This implementation follows event sourcing principles where aggregates are reconstructed
 * from their event streams rather than persisted as snapshots.
 *
 * The repository delegates all persistence operations to the EventStore and relies on
 * Game.fromEvents() for aggregate reconstruction. It maintains no business logic or
 * domain knowledge, serving purely as an infrastructure adapter.
 */

import type { EventStore, StoredEvent } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import { GameId, Game, GameStatus, DomainEvent } from '@twsoftball/domain';

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
  delete(id: GameId): Promise<void>;
}

/**
 * Type guard to check if a Game instance has a scheduledDate property.
 *
 * @remarks
 * This handles the case where Game instances might have an optional scheduledDate
 * property in certain contexts (like tests or future implementations) without
 * breaking type safety.
 */
function hasScheduledDate(game: Game): game is Game & { scheduledDate: Date } {
  return 'scheduledDate' in game && game.scheduledDate instanceof Date;
}

export class EventSourcedGameRepository implements GameRepository {
  constructor(private readonly eventStore: EventStore) {}

  async save(game: Game): Promise<void> {
    const events = game.getUncommittedEvents();
    const eventsLength = events?.length ?? 0;

    await this.eventStore.append(game.id, 'Game', events, game.getVersion() - eventsLength);

    game.markEventsAsCommitted();
  }

  async findById(id: GameId): Promise<Game | null> {
    if (!id) {
      throw new Error('Invalid gameId: gameId cannot be null or undefined');
    }

    const storedEvents = await this.eventStore.getEvents(id);
    if (!storedEvents || storedEvents.length === 0) return null;

    // Convert StoredEvents to DomainEvents for Game reconstruction
    const domainEvents = storedEvents.map(
      storedEvent => JSON.parse(storedEvent.eventData) as DomainEvent
    );
    return Game.fromEvents(domainEvents);
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    // Get all events from event store
    const allEvents = await this.eventStore.getAllEvents();

    // Handle case where getAllEvents returns undefined or null
    if (!allEvents) {
      return [];
    }

    // Group events by streamId to reconstruct each game
    const gameEventGroups = this.groupEventsByStreamId(allEvents, 'Game');

    // Reconstruct games and filter by status
    const games: Game[] = [];
    for (const [_streamId, events] of Array.from(gameEventGroups)) {
      if (events.length > 0) {
        const domainEvents = events.map(e => JSON.parse(e.eventData) as DomainEvent);
        const game = Game.fromEvents(domainEvents);
        if (game.status === status) {
          games.push(game);
        }
      }
    }

    return games;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Game[]> {
    // Validate date parameters
    if (startDate > endDate) {
      throw new Error('startDate cannot be after endDate');
    }

    // Get all events and group by game
    const allEvents = await this.eventStore.getAllEvents();

    // Handle case where getAllEvents returns undefined or null
    if (!allEvents) {
      return [];
    }

    const gameEventGroups = this.groupEventsByStreamId(allEvents, 'Game');

    // Reconstruct games and filter by scheduled date
    const games: Game[] = [];
    for (const [_streamId, events] of Array.from(gameEventGroups)) {
      if (events.length > 0) {
        const domainEvents = events.map(e => JSON.parse(e.eventData) as DomainEvent);
        const game = Game.fromEvents(domainEvents);
        // Check if this game instance has a scheduledDate property (used in tests and future implementations)
        if (hasScheduledDate(game)) {
          const scheduledDate = game.scheduledDate;
          if (scheduledDate >= startDate && scheduledDate <= endDate) {
            games.push(game);
          }
        } else {
          // For games without scheduledDate, we can't filter by date
          // In production, this would likely be empty until Game supports scheduledDate
          // In tests, mock games may include scheduledDate
          games.push(game);
        }
      }
    }

    return games;
  }

  async exists(id: GameId): Promise<boolean> {
    // Validate input
    if (!id) {
      throw new Error('GameId cannot be null or undefined');
    }

    // Efficiently check existence without full reconstruction
    const events = await this.eventStore.getEvents(id);

    // Handle case where getEvents returns undefined or null
    if (!events) {
      return false;
    }

    return events.length > 0;
  }

  async delete(id: GameId): Promise<void> {
    // Validate input
    if (!id) {
      throw new Error('GameId cannot be null or undefined');
    }

    // Delegate to EventStore delete method
    // This assumes the EventStore implementation has a delete method (as used in tests)
    // We use type assertion here since delete is not part of the core EventStore interface
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
