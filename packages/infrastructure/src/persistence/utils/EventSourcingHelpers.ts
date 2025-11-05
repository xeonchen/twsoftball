/**
 * @file EventSourcingHelpers
 * Shared utilities for event-sourced repository implementations.
 *
 * @remarks
 * This module provides common helper functions used across multiple event-sourced
 * repositories. Centralizing these utilities eliminates code duplication and ensures
 * consistent event processing logic throughout the infrastructure layer.
 *
 * **Key Functions:**
 * - `groupEventsByStreamId`: Groups stored events by their stream identifier for
 *   aggregate reconstruction. Handles filtering by aggregate type and ensures correct
 *   event ordering via explicit sorting.
 *
 * **IndexedDB Event Ordering:**
 * IndexedDB's openCursor() does not guarantee event order, so explicit sorting is
 * required for correct aggregate reconstruction. Events are sorted by:
 * 1. Primary: streamVersion (ensures creation events come first)
 * 2. Secondary: timestamp (for events with the same version)
 *
 * @example
 * ```typescript
 * import { EventSourcingHelpers } from './utils/EventSourcingHelpers.js';
 *
 * // In a repository's findAll() method
 * const allEvents = await this.eventStore.getAllEvents();
 * const gameEventGroups = EventSourcingHelpers.groupEventsByStreamId(
 *   allEvents,
 *   'Game'
 * );
 *
 * // Reconstruct aggregates from grouped events
 * const games: Game[] = [];
 * for (const [streamId, events] of gameEventGroups.entries()) {
 *   const domainEvents = events.map(e => deserializeEvent(e));
 *   const game = Game.fromEvents(domainEvents);
 *   games.push(game);
 * }
 * ```
 */

import type { StoredEvent } from '@twsoftball/application/ports/out/EventStore';

/**
 * Groups stored events by stream identifier for aggregate reconstruction.
 *
 * @remarks
 * This function filters events by aggregate type and groups them by streamId,
 * enabling efficient batch reconstruction of multiple aggregates. Events within
 * each stream are explicitly sorted to ensure correct ordering for event sourcing.
 *
 * **Sorting Strategy:**
 * - Primary sort: streamVersion (ensures creation events are first)
 * - Secondary sort: timestamp (for events with the same version)
 *
 * This explicit sorting is required because IndexedDB's openCursor() does not
 * guarantee order, which would break aggregate reconstruction if events are
 * applied out of sequence.
 *
 * @param allEvents - Array of all stored events from the event store
 * @param aggregateType - Type of aggregate to filter for (e.g., 'Game', 'TeamLineup')
 * @returns Map of streamId to sorted array of events for that stream
 *
 * @example
 * ```typescript
 * const allEvents = await eventStore.getAllEvents();
 * const gameEvents = EventSourcingHelpers.groupEventsByStreamId(allEvents, 'Game');
 *
 * // gameEvents is a Map<string, StoredEvent[]>
 * for (const [streamId, events] of gameEvents.entries()) {
 *   console.log(`Stream ${streamId}: ${events.length} events`);
 *   // Events are sorted: version 1, 2, 3... with timestamps as tiebreaker
 * }
 * ```
 */
export function groupEventsByStreamId(
  allEvents: StoredEvent[],
  aggregateType: string
): Map<string, StoredEvent[]> {
  const groupedEvents = new Map<string, StoredEvent[]>();

  // Filter and group events by streamId
  for (const event of allEvents) {
    if (event.aggregateType === aggregateType) {
      const streamId = event.streamId;
      if (!groupedEvents.has(streamId)) {
        groupedEvents.set(streamId, []);
      }
      groupedEvents.get(streamId)!.push(event);
    }
  }

  // Sort events within each stream to ensure correct order
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
    groupedEvents.set(streamId, events);
  }

  return groupedEvents;
}

/**
 * Exports for convenience.
 */
export const EventSourcingHelpers = {
  groupEventsByStreamId,
} as const;
